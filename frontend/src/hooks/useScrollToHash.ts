import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();

  useEffect(() => {
    if (!ready || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, ready]);
}
