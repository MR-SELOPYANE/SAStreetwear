import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const inIframe = window.self !== window.top;
    const isPreview = location.hostname.startsWith("id-preview--") || location.hostname === "localhost";
    if ("serviceWorker" in navigator) {
      if (inIframe || isPreview) {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-secondary px-4 py-2 text-sm text-secondary-foreground">
      <WifiOff className="h-4 w-4" />
      No data connection — showing items saved on your phone. Ordering and the Stylist need data.
    </div>
  );
}
