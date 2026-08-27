import { useEffect, useState } from "react";
import { listWishlist, deleteWishlist, currency } from "../lib/api";
import { Heart, Trash, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import AddCardModal from "../components/AddCardModal";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await listWishlist()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totalTarget = items.reduce((s, i) => s + (i.max_price ?? i.market_price ?? 0), 0);

  const handleDelete = async (item) => {
    try {
      await deleteWishlist(item.id);
      toast.success("Removed from wishlist");
      load();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="wishlist-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2 flex items-center gap-2">
            <Heart size={12} weight="fill" className="text-pink-400" /> The chase
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Wishlist</h1>
          <div className="text-zinc-400 mt-2 text-sm mono">
            {items.length} card{items.length !== 1 ? "s" : ""} · Target budget <span className="accent-gold">{currency(totalTarget)}</span>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-gold text-sm" data-testid="wishlist-add-btn">+ Add to wishlist</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2.5/3.5] rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-elevated p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(https://images.pexels.com/photos/7809125/pexels-photo-7809125.jpeg)", backgroundSize: "cover" }} />
          <div className="relative">
            <h2 className="text-2xl font-bold">Nothing on the chase list yet</h2>
            <p className="text-zinc-400 mt-2 text-sm">Add cards you want to buy and get a running budget target.</p>
            <button onClick={() => setOpen(true)} className="btn-gold mt-6" data-testid="wishlist-empty-add-btn">Add your first wish</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" data-testid="wishlist-grid">
          {items.map((it) => {
            const overBudget = it.max_price != null && it.market_price != null && it.market_price > it.max_price;
            return (
              <div key={it.id} className="card-tilt group relative rounded-xl overflow-hidden bg-[#121218] border border-[#22222c]" data-testid={`wishlist-item-${it.id}`}>
                <div className="aspect-[2.5/3.5] bg-black">
                  {it.image_small && <img src={it.image_small} alt={it.card_name} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-sm font-semibold truncate">{it.card_name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{it.set_name}</div>
                  <div className="flex items-end justify-between pt-1">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-zinc-500">Market</div>
                      <div className="mono text-sm accent-gold font-semibold">{currency(it.market_price)}</div>
                    </div>
                    {it.max_price != null && (
                      <div className={`text-[11px] mono ${overBudget ? "price-down" : "price-up"}`}>
                        <div className="text-[9px] uppercase text-zinc-500">Target</div>
                        {currency(it.max_price)}
                      </div>
                    )}
                  </div>
                  {overBudget && <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1"><Sparkle size={10} /> Over budget</div>}
                </div>
                <button
                  onClick={() => handleDelete(it)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  data-testid={`delete-wishlist-${it.id}`}
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AddCardModal open={open} onOpenChange={setOpen} onAdded={load} mode="wishlist" />
    </div>
  );
}
