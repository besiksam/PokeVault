import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { getCardDetail, deleteCollection, photoUrl, currency } from "../lib/api";
import { Sparkle, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { toast } from "sonner";

const fmt = (v, unit) => {
  if (v == null) return "—";
  const symbol = unit === "EUR" ? "€" : "$";
  return `${symbol}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

function PriceRow({ label, value, unit, highlight }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-b-0">
      <span className="text-zinc-500">{label}</span>
      <span className={`mono ${highlight ? "accent-gold font-semibold" : "text-zinc-200"}`}>{fmt(value, unit)}</span>
    </div>
  );
}

export default function CardDetailDrawer({ item, onClose, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) { setDetail(null); return; }
    (async () => {
      setLoading(true);
      try { setDetail(await getCardDetail(item.card_id)); }
      catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [item]);

  const variants = detail?.variants_detailed || [];

  const handleDelete = async () => {
    if (!item) return;
    if (!window.confirm(`Remove ${item.card_name}?`)) return;
    try {
      await deleteCollection(item.id);
      toast.success("Removed");
      onDeleted?.();
      onClose();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-[#0f0f14] border-[#23232b] text-white w-full sm:max-w-lg overflow-y-auto scrollbar-thin" data-testid="card-detail-drawer">
        <SheetHeader>
          <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            {item?.is_special && <Sparkle size={20} weight="fill" className="accent-gold" />}
            {item?.card_name}
          </SheetTitle>
        </SheetHeader>

        {item && (
          <div className="mt-4 space-y-5">
            <div className={`rounded-xl overflow-hidden ${item.is_special ? "holo-border" : "border border-[#23232b]"}`}>
              {(item.image_large || item.image_small) && (
                <img src={item.image_large || item.image_small} alt={item.card_name} className="w-full" />
              )}
            </div>

            <div className="surface-elevated p-4 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Set</div><div>{item.set_name || detail?.set_name || "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Number</div><div className="mono">#{item.card_number || "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Rarity</div><div>{item.rarity || detail?.rarity || "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Condition</div><div>{item.condition}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Quantity</div><div className="mono">{item.quantity}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Bought at</div><div className="mono">{item.purchase_price != null ? currency(item.purchase_price) : "—"}</div></div>
            </div>

            <div className="surface-elevated p-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-2">Live Market Pricing</div>
              {loading ? (
                <div className="h-24 animate-pulse bg-white/5 rounded" />
              ) : variants.length === 0 ? (
                <div className="text-xs text-zinc-500">No price data available for this card yet.</div>
              ) : (
                variants.map((v, idx) => {
                  const tp = v.pricing?.tcgplayer || {};
                  const cm = v.pricing?.cardmarket || {};
                  const tpUnit = tp.unit || "USD";
                  const cmUnit = cm.unit || "EUR";
                  const tpBucket = tp.holofoil || tp.normal || tp.reverseHolofoil || tp["1stEditionHolofoil"] || tp.unlimited || {};
                  return (
                    <div key={idx} className="mb-4">
                      <div className="text-xs font-semibold text-zinc-300 mb-1 capitalize flex items-center gap-2">
                        <span className="holo-text">{v.type || "variant"}</span>
                        {v.subtype && <span className="text-zinc-500">· {v.subtype}</span>}
                      </div>
                      {Object.keys(tpBucket).length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 mt-2">TCGPlayer</div>
                          <PriceRow label="Market" value={tpBucket.marketPrice} unit={tpUnit} highlight />
                          <PriceRow label="Low" value={tpBucket.lowPrice} unit={tpUnit} />
                          <PriceRow label="Mid" value={tpBucket.midPrice} unit={tpUnit} />
                          <PriceRow label="High" value={tpBucket.highPrice} unit={tpUnit} />
                          <PriceRow label="Direct Low" value={tpBucket.directLowPrice} unit={tpUnit} />
                        </div>
                      )}
                      {Object.keys(cm).length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] uppercase text-zinc-500">Cardmarket (EU)</div>
                          <PriceRow label="Trend" value={cm.trend} unit={cmUnit} highlight />
                          <PriceRow label="Avg 30d" value={cm.avg30} unit={cmUnit} />
                          <PriceRow label="Avg 7d" value={cm.avg7} unit={cmUnit} />
                          <PriceRow label="Avg 1d" value={cm.avg1} unit={cmUnit} />
                          <PriceRow label="Low" value={cm.low} unit={cmUnit} />
                        </div>
                      )}
                      {cm.updated && (
                        <div className="text-[10px] text-zinc-600 mono mt-2">Updated {new Date(cm.updated).toLocaleDateString()}</div>
                      )}
                    </div>
                  );
                })
              )}
              <a href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(item.card_name)}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2">
                Recent sales on TCGPlayer <ArrowSquareOut size={12} />
              </a>
            </div>

            {item.photo_path && (
              <div className="surface-elevated p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-2">Your photo</div>
                <img src={photoUrl(item.photo_path)} alt="your card" className="rounded-lg border border-[#23232b]" />
              </div>
            )}

            {item.notes && (
              <div className="surface-elevated p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-2">Notes</div>
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{item.notes}</div>
              </div>
            )}

            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              data-testid="detail-delete-btn"
            >
              <Trash size={14} /> Remove from collection
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
