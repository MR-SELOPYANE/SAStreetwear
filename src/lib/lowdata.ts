import { useEffect, useState } from "react";

const KEY = "sa-streetwear-lowdata";
const EVT = "sa-lowdata-change";

export function useLowData() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(localStorage.getItem(KEY) === "1");
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  const toggle = () => {
    localStorage.setItem(KEY, on ? "0" : "1");
    window.dispatchEvent(new Event(EVT));
  };
  return { lowData: on, toggle };
}

export const waNumber = (phone: string) => phone.replace(/\D/g, "").replace(/^0/, "27");
export const mapLink = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ", South Africa")}`;

/** Shrink a photo before upload so it uses less data for everyone. */
export async function compressImage(file: File, max = 900, quality = 0.7): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}
