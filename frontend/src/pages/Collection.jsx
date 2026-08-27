import { useEffect, useMemo, useState } from "react";
import { listCollection, deleteCollection, currency } from "../lib/api";
import CardTile from "../components/CardTile";
import CardDetailDrawer from "../components/CardDetailDrawer";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Collection({ onAdd, refreshSignal }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await listCollection()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [refreshSignal]);

  const filtered = useMemo(() => {
    let list = items;
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((i) => i.card_name?.toLowerCase().includes(s) || i.set_name?.toLowerCase().includes(s));
    }
    if (filter === "special") list = list.filter((i) => i.is_special || (i.market_price ?? 0) >= 50);
    if (filter === "high") list = list.filter((i) => (i.market_price ?? 0) >= 20);
    if (sort === "value") list = [...list].sort((a, b) => ((b.market_price ?? 0) * (b.quantity ?? 1)) - ((a.market_price ?? 0) * (a.quantity ?? 1)));
    if (sort === "name") list = [...list].sort((a, b) => a.card_name.localeCompare(b.card_name));
    return list;
  }, [items, q, sort, filter]);

  const totalValue = useMemo(() => filtered.reduce((s, i) => s + (i.market_price ?? 0) * (i.quantity ?? 1), 0), [filtered]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove ${item.card_name} from your collection?`)) return;
    try {
      await deleteCollection(item.id);
      toast.success("Removed from collection");
      load();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="collection-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Your Vault</div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Collection</h1>
          <div className="text-zinc-400 mt-2 text-sm mono">
            {filtered.length} card{filtered.length !== 1 ? "s" : ""} · <span className="accent-gold">{currency(totalValue)}</span>
          </div>
        </div>
        <button onClick={onAdd} className="btn-gold text-sm" data-testid="collection-add-btn">+ Add card</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Filter your collection..."
            className="pl-10 bg-[#151519] border-[#23232b]"
            data-testid="collection-search-input"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] bg-[#151519] border-[#23232b]" data-testid="filter-select">
            <Funnel size={14} className="mr-1" /> <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#121215] border-[#23232b] text-white">
            <SelectItem value="all">All cards</SelectItem>
            <SelectItem value="special">Special / Misprints</SelectItem>
            <SelectItem value="high">High value ($20+)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] bg-[#151519] border-[#23232b]" data-testid="sort-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#121215] border-[#23232b] text-white">
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="value">Highest value</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" data-testid="collection-loading">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2.5/3.5] rounded-xl bg-[#141420] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <h2 className="text-2xl font-bold">No cards {items.length === 0 ? "yet" : "match"}</h2>
          <p className="text-zinc-400 mt-2 text-sm">{items.length === 0 ? "Add your first card to start tracking real-market value." : "Try clearing filters or searching a different name."}</p>
          {items.length === 0 && <button onClick={onAdd} className="btn-gold mt-6" data-testid="collection-empty-add-btn">Add a card</button>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" data-testid="collection-grid">
          {filtered.map((item) => (
            <CardTile key={item.id} item={item} onDelete={handleDelete} onOpen={setDetail} />
          ))}
        </div>
      )}

      <CardDetailDrawer item={detail} onClose={() => setDetail(null)} onDeleted={load} />
    </div>
  );
}
