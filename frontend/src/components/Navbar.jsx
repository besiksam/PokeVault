import { NavLink } from "react-router-dom";
import { CardsThree, ChartLineUp, Heart, Sparkle } from "@phosphor-icons/react";

const links = [
  { to: "/", label: "Dashboard", icon: ChartLineUp, testid: "nav-dashboard" },
  { to: "/collection", label: "Collection", icon: CardsThree, testid: "nav-collection" },
  { to: "/wishlist", label: "Wishlist", icon: Heart, testid: "nav-wishlist" },
];

export default function Navbar({ onAdd }) {
  return (
    <header className="glass sticky top-0 z-40" data-testid="app-navbar">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl holo-border relative flex items-center justify-center" style={{ background: "#0e0e13" }}>
            <Sparkle size={20} weight="fill" className="accent-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-black text-lg tracking-tight">Poké<span className="accent-gold">Vault</span></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Collection Tracker</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              data-testid={l.testid}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <l.icon size={18} weight="duotone" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onAdd}
          className="btn-gold text-sm flex items-center gap-2"
          data-testid="open-add-card-btn"
        >
          <Sparkle size={16} weight="fill" /> Add Card
        </button>
      </div>

      <div className="md:hidden flex justify-center gap-2 pb-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `text-xs px-3 py-1.5 rounded-full ${isActive ? "bg-white/10 text-white" : "text-zinc-400"}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}
