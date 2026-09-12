import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  return (
    <button
      data-testid="pwa-install-button"
      onClick={install}
      className="flex items-center gap-2 rounded-full bg-[#FF2E2E] px-4 py-2 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform"
    >
      <Download className="h-4 w-4" /> Pasang App
    </button>
  );
}
