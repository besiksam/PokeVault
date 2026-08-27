from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent Object Storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "pokevault")
_storage_key: Optional[str] = None

# TCGdex is open, free, no key. Provides tcgplayer + cardmarket pricing per card detail.
POKEMON_API_BASE = "https://api.tcgdex.net/v2/en"

DEFAULT_USER_ID = "default"

app = FastAPI(title="PokeVault API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger("pokevault")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ---------- Storage helpers ----------
def init_storage(force: bool = False) -> Optional[str]:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set; storage disabled")
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------- Models ----------
class CollectionItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    card_id: str
    card_name: str
    set_name: str
    set_id: Optional[str] = None
    card_number: Optional[str] = None
    rarity: Optional[str] = None
    image_small: Optional[str] = None
    image_large: Optional[str] = None
    market_price: Optional[float] = None
    tcgplayer_url: Optional[str] = None
    condition: str = "Near Mint"
    quantity: int = 1
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    is_special: bool = False
    photo_path: Optional[str] = None


class CollectionItem(CollectionItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CollectionItemUpdate(BaseModel):
    condition: Optional[str] = None
    quantity: Optional[int] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    is_special: Optional[bool] = None


class WishlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER_ID
    card_id: str
    card_name: str
    set_name: str
    image_small: Optional[str] = None
    market_price: Optional[float] = None
    rarity: Optional[str] = None
    max_price: Optional[float] = None
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WishlistCreate(BaseModel):
    card_id: str
    card_name: str
    set_name: str
    image_small: Optional[str] = None
    market_price: Optional[float] = None
    rarity: Optional[str] = None
    max_price: Optional[float] = None


# ---------- Pokemon TCG API proxy ----------
async def _pokemon_get(path: str, params: dict) -> Any:
    async with httpx.AsyncClient(timeout=20) as client_:
        r = await client_.get(f"{POKEMON_API_BASE}{path}", params=params)
    if r.status_code == 404:
        raise HTTPException(404, "Not found")
    if r.status_code == 429:
        raise HTTPException(503, "Upstream rate limited, try again shortly")
    r.raise_for_status()
    return r.json()


def _extract_market(variants_detailed):
    """Extract best-guess market price (USD preferred) from tcgdex variants_detailed."""
    if not variants_detailed:
        return None, None
    for v in variants_detailed:
        pricing = v.get("pricing") or {}
        tp = pricing.get("tcgplayer") or {}
        for k in ("holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil", "unlimited"):
            if isinstance(tp.get(k), dict):
                mp = tp[k].get("marketPrice") or tp[k].get("midPrice")
                if mp:
                    return float(mp), "USD"
        cm = pricing.get("cardmarket") or {}
        if cm.get("trend"):
            return float(cm["trend"]), cm.get("unit", "EUR")
        if cm.get("avg30"):
            return float(cm["avg30"]), cm.get("unit", "EUR")
    return None, None


def _card_image(base_url, size="low"):
    if not base_url:
        return None
    return f"{base_url}/{size}.png"


@api_router.get("/cards/search")
async def search_cards(q: str = Query(..., min_length=1, max_length=80)):
    safe = q.strip()
    data = await _pokemon_get("/cards", {"name": f"like:{safe}"})
    # data is a list of {id, localId, name, image?}
    cards = []
    for c in (data or [])[:30]:
        img = c.get("image")
        cards.append({
            "id": c["id"],
            "name": c["name"],
            "set_name": None,   # not present in list view
            "set_id": None,
            "card_number": c.get("localId"),
            "rarity": None,
            "image_small": _card_image(img, "low"),
            "image_large": _card_image(img, "high"),
            "market_price": None,
            "tcgplayer_url": None,
        })
    return {"cards": cards, "total_count": len(cards)}


@api_router.get("/cards/{card_id:path}")
async def card_detail(card_id: str):
    c = await _pokemon_get(f"/cards/{card_id}", {})
    if not c or "id" not in c:
        raise HTTPException(404, "Card not found")
    img = c.get("image")
    market, currency_ = _extract_market(c.get("variants_detailed"))
    set_ = c.get("set") or {}
    return {
        "id": c["id"],
        "name": c["name"],
        "set_name": set_.get("name"),
        "set_id": set_.get("id"),
        "card_number": c.get("localId"),
        "rarity": c.get("rarity"),
        "image_small": _card_image(img, "low"),
        "image_large": _card_image(img, "high"),
        "market_price": market,
        "market_currency": currency_,
        "illustrator": c.get("illustrator"),
        "hp": c.get("hp"),
        "types": c.get("types"),
        "variants": c.get("variants"),
        "variants_detailed": c.get("variants_detailed"),
        "raw": c,
    }


# ---------- Collection endpoints ----------
def _clean(doc):
    doc.pop("_id", None)
    return doc


@api_router.get("/collection", response_model=List[CollectionItem])
async def list_collection():
    items = await db.collection.find({"user_id": DEFAULT_USER_ID}, {"_id": 0}).sort("added_at", -1).to_list(2000)
    return items


@api_router.post("/collection", response_model=CollectionItem)
async def add_to_collection(item: CollectionItemBase):
    obj = CollectionItem(**item.model_dump())
    doc = obj.model_dump()
    await db.collection.insert_one(doc)
    return obj


@api_router.patch("/collection/{item_id}", response_model=CollectionItem)
async def update_collection(item_id: str, update: CollectionItemUpdate):
    changes = {k: v for k, v in update.model_dump().items() if v is not None}
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.collection.find_one_and_update(
        {"id": item_id, "user_id": DEFAULT_USER_ID},
        {"$set": changes},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Item not found")
    return _clean(result)


@api_router.delete("/collection/{item_id}")
async def delete_collection(item_id: str):
    r = await db.collection.delete_one({"id": item_id, "user_id": DEFAULT_USER_ID})
    if r.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


# ---------- Wishlist endpoints ----------
@api_router.get("/wishlist", response_model=List[WishlistItem])
async def list_wishlist():
    items = await db.wishlist.find({"user_id": DEFAULT_USER_ID}, {"_id": 0}).sort("added_at", -1).to_list(1000)
    return items


@api_router.post("/wishlist", response_model=WishlistItem)
async def add_wishlist(item: WishlistCreate):
    obj = WishlistItem(**item.model_dump())
    await db.wishlist.insert_one(obj.model_dump())
    return obj


@api_router.delete("/wishlist/{item_id}")
async def delete_wishlist(item_id: str):
    r = await db.wishlist.delete_one({"id": item_id, "user_id": DEFAULT_USER_ID})
    if r.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


# ---------- Dashboard stats ----------
@api_router.get("/dashboard/stats")
async def dashboard_stats():
    items = await db.collection.find({"user_id": DEFAULT_USER_ID}, {"_id": 0}).to_list(5000)
    total_value = 0.0
    total_cost = 0.0
    total_qty = 0
    unique_cards = len(items)
    top_cards = []
    special_cards = []
    by_rarity = {}
    by_set = {}
    for it in items:
        qty = it.get("quantity") or 0
        market = it.get("market_price") or 0
        cost = it.get("purchase_price") or 0
        total_qty += qty
        total_value += market * qty
        total_cost += cost * qty
        rarity = it.get("rarity") or "Unknown"
        by_rarity[rarity] = by_rarity.get(rarity, 0) + qty
        set_name = it.get("set_name") or "Unknown"
        by_set[set_name] = by_set.get(set_name, 0) + qty
        if it.get("is_special"):
            special_cards.append(it)
    # Top 5 valuable cards (by market * qty)
    items_sorted = sorted(items, key=lambda x: (x.get("market_price") or 0) * (x.get("quantity") or 0), reverse=True)
    top_cards = items_sorted[:6]
    special_cards = sorted(special_cards, key=lambda x: (x.get("market_price") or 0), reverse=True)[:6]
    profit = total_value - total_cost
    profit_pct = (profit / total_cost * 100) if total_cost > 0 else None
    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "profit": round(profit, 2),
        "profit_pct": round(profit_pct, 2) if profit_pct is not None else None,
        "total_quantity": total_qty,
        "unique_cards": unique_cards,
        "top_cards": top_cards,
        "special_cards": special_cards,
        "by_rarity": [{"name": k, "value": v} for k, v in sorted(by_rarity.items(), key=lambda x: -x[1])],
        "by_set": [{"name": k, "value": v} for k, v in sorted(by_set.items(), key=lambda x: -x[1])[:8]],
    }


# ---------- Photo upload ----------
@api_router.post("/uploads/photo")
async def upload_photo(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Only JPEG, PNG, or WebP images allowed")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    path = f"{APP_NAME}/photos/{DEFAULT_USER_ID}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8MB)")
    result = put_object(path, data, file.content_type)
    return {"path": result["path"], "size": result.get("size"), "content_type": file.content_type}


@api_router.get("/uploads/photo/{path:path}")
async def get_photo(path: str):
    data, content_type = get_object(path)
    return Response(content=data, media_type=content_type)


@api_router.get("/")
async def root():
    return {"message": "PokeVault API is running"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    init_storage()
    logger.info("PokeVault backend started")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
