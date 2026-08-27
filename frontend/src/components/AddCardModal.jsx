import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { MagnifyingGlass, Sparkle, Upload, ArrowLeft, Heart } from "@phosphor-icons/react";
import { searchCards, getCardDetail, addCollection, uploadPhoto, addWishlist, currency } from "../lib/api";

const CONDITIONS = ["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"];

export default function AddCardModal({ open, onOpenChange, onAdded, mode = "collection" }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [condition, setCondition] = useState("Near Mint");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSpecial, setIsSpecial] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(false);

  const pickCard = async (c) => {
    setSelected(c);
    setLoadingDetail(true);
    try {
      const d = await getCardDetail(c.id);
      setSelected((prev) => ({ ...prev, ...d }));
    } catch { /* keep basic */ }
    finally { setLoadingDetail(false); }
  };

  useEffect(() => {
    if (!open) {
      setQ(""); setResults([]); setSelected(null); setCondition("Near Mint");
      setQuantity(1); setPurchasePrice(""); setNotes(""); setIsSpecial(false);
      setPhoto(null); setMaxPrice("");
    }
  }, [open]);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchCards(q);
        setResults(data.cards || []);
      } catch (e) {
        toast.error("Search failed. Try a different query.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const isHighValue = useMemo(() => (selected?.market_price ?? 0) >= 50, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      if (mode === "wishlist") {
        await addWishlist({
          card_id: selected.id,
          card_name: selected.name,
          set_name: selected.set_name,
          image_small: selected.image_small,
          market_price: selected.market_price,
          rarity: selected.rarity,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
        });
        toast.success("Added to wishlist");
      } else {
        let photoPath = null;
        if (photo) {
          const up = await uploadPhoto(photo);
          photoPath = up.path;
        }
        await addCollection({
          card_id: selected.id,
          card_name: selected.name,
          set_name: selected.set_name,
          set_id: selected.set_id,
          card_number: selected.card_number,
          rarity: selected.rarity,
          image_small: selected.image_small,
          image_large: selected.image_large,
          market_price: selected.market_price,
          tcgplayer_url: selected.tcgplayer_url,
          condition,
          quantity: parseInt(quantity) || 1,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          notes: notes || null,
          is_special: isSpecial || isHighValue,
          photo_path: photoPath,
        });
        toast.success(`${selected.name} added to collection`);
      }
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl bg-[#0f0f14] border-[#23232b] text-white p-0 overflow-hidden"
        data-testid="add-card-modal"
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/5">
          <DialogTitle className="text-2xl font-black flex items-center gap-2 tracking-tight">
            {selected && (
              <button onClick={() => setSelected(null)} className="p-1 rounded-full hover:bg-white/5" data-testid="back-to-search-btn">
                <ArrowLeft size={20} />
              </button>
            )}
            {mode === "wishlist" ? <Heart size={22} weight="duotone" className="accent-gold" /> : <Sparkle size={22} weight="fill" className="accent-gold" />}
            {selected ? selected.name : mode === "wishlist" ? "Add to Wishlist" : "Add a Card to Your Vault"}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="p-6 space-y-4">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by card name (e.g. Charizard, Mewtwo, Pikachu)"
                className="pl-10 bg-[#151519] border-[#23232b] h-11"
                data-testid="card-search-input"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1" data-testid="search-results">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2.5/3.5] rounded-lg bg-[#161620] animate-pulse" />
              ))}
              {!loading && results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCard(c)}
                  className="group text-left card-tilt rounded-lg overflow-hidden bg-[#161620] border border-[#22222c]"
                  data-testid={`search-result-${c.id}`}
                >
                  <div className="aspect-[2.5/3.5] overflow-hidden bg-black">
                    {c.image_small ? (
                      <img src={c.image_small} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-zinc-600 text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-zinc-500 truncate">#{c.card_number || "—"}</div>
                  </div>
                </button>
              ))}
              {!loading && q.length >= 2 && results.length === 0 && (
                <div className="col-span-full text-center py-10 text-zinc-500 text-sm">No cards found for "{q}"</div>
              )}
              {q.length < 2 && (
                <div className="col-span-full text-center py-10 text-zinc-500 text-sm">Type at least 2 letters to search the Pokémon TCG database</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              <div className={`relative rounded-xl overflow-hidden ${isHighValue ? "holo-border" : "border border-[#23232b]"}`}>
                {selected.image_large ? (
                  <img src={selected.image_large} alt={selected.name} className="w-full" />
                ) : (
                  <div className="aspect-[2.5/3.5] grid place-items-center text-zinc-600">No image</div>
                )}
              </div>
              <div className="surface-elevated p-4 space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider">
                  <span>Set</span><span>{selected.set_name || (loadingDetail ? "..." : "—")}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider">
                  <span>Number</span><span>#{selected.card_number || "—"}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider">
                  <span>Rarity</span><span>{selected.rarity || (loadingDetail ? "..." : "—")}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-end">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Market</span>
                  <span className="mono text-2xl accent-gold font-semibold">
                    {loadingDetail ? "..." : currency(selected.market_price)}
                  </span>
                </div>
                {selected.tcgplayer_url && (
                  <a href={selected.tcgplayer_url} target="_blank" rel="noreferrer" className="block text-[11px] text-cyan-400 hover:text-cyan-300 mt-2">
                    View recent sales on TCGPlayer →
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {mode === "wishlist" ? (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-500">Max price you'd pay</Label>
                  <Input type="number" step="0.01" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Optional target price"
                    className="bg-[#151519] border-[#23232b] mono mt-1"
                    data-testid="wishlist-maxprice-input" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Condition</Label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="bg-[#151519] border-[#23232b] mt-1" data-testid="condition-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121215] border-[#23232b] text-white">
                          {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Quantity</Label>
                      <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                        className="bg-[#151519] border-[#23232b] mono mt-1" data-testid="quantity-input" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-zinc-500">Purchase price (per card)</Label>
                    <Input type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="What did you pay?"
                      className="bg-[#151519] border-[#23232b] mono mt-1" data-testid="purchase-price-input" />
                  </div>

                  <div className="flex items-center justify-between surface-elevated px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span className="holo-text font-bold">Special / Misprint</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">Mark rare misprints or special variants to highlight</div>
                    </div>
                    <Switch checked={isSpecial} onCheckedChange={setIsSpecial} data-testid="is-special-switch" />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-zinc-500">Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Grade, print details, memory..."
                      className="bg-[#151519] border-[#23232b] mt-1" data-testid="notes-input" />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-zinc-500">Upload photo of your card</Label>
                    <label className="mt-1 flex items-center gap-3 border border-dashed border-[#33333d] rounded-lg px-4 py-3 cursor-pointer hover:border-yellow-400/40 transition-colors" data-testid="photo-upload-label">
                      <Upload size={20} className="text-zinc-500" />
                      <span className="text-sm text-zinc-400 truncate">{photo ? photo.name : "Click to upload (JPG, PNG, WebP, max 8MB)"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        data-testid="photo-upload-input" />
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:bg-white/5" data-testid="cancel-add-btn">
                  Cancel
                </Button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-gold text-sm flex items-center gap-2 disabled:opacity-60"
                  data-testid="save-card-btn"
                >
                  {saving ? "Saving..." : mode === "wishlist" ? "Add to Wishlist" : "Add to Collection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
