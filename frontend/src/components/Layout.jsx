import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getConfig } from "../lib/api";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WhatsAppPopout } from "./WhatsAppPopout";

export function Layout() {
  const [waNumber, setWaNumber] = useState("628125559681");
  const location = useLocation();

  useEffect(() => {
    getConfig().then((c) => c?.whatsapp_number && setWaNumber(c.whatsapp_number)).catch(() => {});
  }, []);

  // Scroll ke atas setiap ganti halaman
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet context={{ waNumber }} />
      </main>
      <Footer />
      <WhatsAppPopout number={waNumber} />
    </div>
  );
}
