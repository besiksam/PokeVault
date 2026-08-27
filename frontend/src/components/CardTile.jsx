import { currency } from "../lib/api";
import { Sparkle, Trash } from "@phosphor-icons/react";

export default function CardTile({ item, onDelete, onOpen }) {
  const value = (item.market_price ?? 0) * (item.quantity ?? 1);
  const cost = (item.purchase_price ?? 0) * (item.quantity ?? 1);
  const profit = cost > 0 ? value - cost : null;
  const special = item.is_special || (item.market_price ?? 0) >= 50;

  return (
    <div
      className={`card-tilt group relative rounded-xl overflow-hidden bg-[#121218] border border-[#22222c] cursor-pointer`}
      onClick={() => onOpen?.(item)}
      data-testid={`card-tile-${item.id}`}
    >
      {special && <div className="holo-border absolute inset-0 rounded-xl pointer-events-none z-10" />}
      <div className="aspect-[2.5/3.5] bg-black overflow-hidden relative">
        {item.image_small ? (
          <img src={item.image_small} alt={item.card_name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-zinc-600 text-xs">No image</div>
        )}
        {item.quantity > 1 && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-full text-[11px] mono">
            ×{item.quantity}
          </div>
        )}
        {special && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 holo-text font-bold">
            <Sparkle size={10} weight="fill" /> RARE
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm font-semibold truncate">{item.card_name}</div>
        <div className="text-[11px] text-zinc-500 truncate">{item.set_name} · #{item.card_number || "—"}</div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">Value</div>
            <div className="mono text-sm accent-gold font-semibold">{currency(value)}</div>
          </div>
          {profit != null && (
            <div className={`text-[11px] mono ${profit >= 0 ? "price-up" : "price-down"}`}>
              {profit >= 0 ? "+" : ""}{currency(profit)}
            </div>
          )}
        </div>
        <div className="text-[10px] text-zinc-500">{item.condition}</div>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item); }}
          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
          data-testid={`delete-card-${item.id}`}
        >
          <Trash size={14} />
        </button>
      )}
    </div>
  );
}
