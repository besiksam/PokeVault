import { useEffect, useState } from "react";
import { dashboardStats, currency } from "../lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coins, TrendUp, TrendDown, Stack, Sparkle, ChartPieSlice } from "@phosphor-icons/react";
import CardTile from "../components/CardTile";

const RARITY_COLORS = ["#FACC15", "#06B6D4", "#3B82F6", "#D946EF", "#22C55E", "#F97316", "#A855F7", "#EF4444"];

function StatCard({ label, value, sub, icon: Icon, accent = "gold", testid }) {
  const accentClass = accent === "green" ? "price-up" : accent === "red" ? "price-down" : "accent-gold";
  return (
    <div className="surface-elevated p-6 relative overflow-hidden" data-testid={testid}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
          <div className={`mono text-3xl mt-2 font-semibold ${accentClass}`}>{value}</div>
          {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
        </div>
        <Icon size={24} weight="duotone" className="text-zinc-600" />
      </div>
    </div>
  );
}

export default function Dashboard({ onAdd }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setStats(await dashboardStats()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="dashboard-loading">
        <div className="h-8 w-64 rounded bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 surface animate-pulse" />)}
        </div>
      </div>
    );
  }

  const isEmpty = stats.unique_cards === 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" data-testid="dashboard-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Your Portfolio</div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Total Vault Value <span className="holo-text">${stats.total_value.toLocaleString()}</span>
          </h1>
          <div className="text-zinc-400 mt-2 text-sm">
            {stats.unique_cards} unique cards · {stats.total_quantity} total
          </div>
        </div>
        <button onClick={onAdd} className="btn-gold text-sm" data-testid="dashboard-add-card-btn">+ Add card</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Market Value" value={currency(stats.total_value)} icon={Coins} testid="stat-market-value" />
        <StatCard label="Total Invested" value={currency(stats.total_cost)} icon={Stack} accent="mute" testid="stat-invested" />
        <StatCard
          label="Unrealized P/L"
          value={currency(stats.profit)}
          sub={stats.profit_pct != null ? `${stats.profit >= 0 ? "+" : ""}${stats.profit_pct}%` : "No cost data yet"}
          icon={stats.profit >= 0 ? TrendUp : TrendDown}
          accent={stats.profit >= 0 ? "green" : "red"}
          testid="stat-profit"
        />
        <StatCard label="Cards Tracked" value={stats.total_quantity} icon={Sparkle} testid="stat-count" />
      </div>

      {isEmpty ? (
        <div className="surface-elevated p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(https://images.pexels.com/photos/14866072/pexels-photo-14866072.jpeg)", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="relative">
            <h2 className="text-3xl font-black">Your vault is empty</h2>
            <p className="text-zinc-400 mt-2 max-w-md mx-auto">Search for your first card from the Pokémon TCG database and start tracking its real-market value.</p>
            <button onClick={onAdd} className="btn-gold mt-6" data-testid="empty-add-btn">Add your first card</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 surface-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Top Valuable Cards</div>
                <h3 className="text-xl font-bold mt-1">Where your money lives</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.top_cards.map((c) => <CardTile key={c.id} item={c} />)}
            </div>
          </div>

          <div className="surface-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 flex items-center gap-2 mb-1">
              <ChartPieSlice size={12} /> Breakdown by Rarity
            </div>
            <h3 className="text-xl font-bold mb-4">Rarity mix</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.by_rarity.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {stats.by_rarity.slice(0, 8).map((_, i) => <Cell key={i} fill={RARITY_COLORS[i % RARITY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#101015", border: "1px solid #23232b", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-3 max-h-40 overflow-y-auto scrollbar-thin">
              {stats.by_rarity.slice(0, 8).map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <span className="w-2 h-2 rounded-full" style={{ background: RARITY_COLORS[i % RARITY_COLORS.length] }} />
                    {r.name}
                  </span>
                  <span className="mono text-zinc-500">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stats.special_cards.length > 0 && (
        <div className="relative surface-elevated p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(https://images.pexels.com/photos/4021530/pexels-photo-4021530.jpeg)", backgroundSize: "cover", filter: "hue-rotate(90deg)" }} />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 flex items-center gap-1"><Sparkle size={12} weight="fill" /> Special Cards & Misprints</div>
            <h3 className="text-2xl font-bold mt-1 holo-text inline-block">The Chase Vault</h3>
            <p className="text-xs text-zinc-500 mb-4 mt-1">Your rarest holdings and market anomalies.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {stats.special_cards.map((c) => <CardTile key={c.id} item={c} />)}
            </div>
          </div>
        </div>
      )}

      {stats.by_set.length > 0 && (
        <div className="surface-elevated p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">By Set</div>
          <h3 className="text-xl font-bold mt-1 mb-4">Distribution across expansions</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.by_set} margin={{ top: 10, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22222c" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} angle={-15} textAnchor="end" height={60} interval={0} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ background: "#101015", border: "1px solid #23232b", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#FACC15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
