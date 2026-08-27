import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Collection from "./pages/Collection";
import Wishlist from "./pages/Wishlist";
import AddCardModal from "./components/AddCardModal";

export default function App() {
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="App">
      <BrowserRouter>
        <Navbar onAdd={() => setAddOpen(true)} />
        <main className="pb-24">
          <Routes>
            <Route path="/" element={<Dashboard onAdd={() => setAddOpen(true)} key={`dash-${refreshKey}`} />} />
            <Route path="/collection" element={<Collection onAdd={() => setAddOpen(true)} refreshSignal={refreshKey} />} />
            <Route path="/wishlist" element={<Wishlist />} />
          </Routes>
        </main>
        <AddCardModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdded={bump}
        />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: { background: "#101015", border: "1px solid #23232b", color: "#fafafa" },
          }}
        />
      </BrowserRouter>
    </div>
  );
}
