import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { localConfig } from "../config/config.local";
import { absoluteHaUrl } from "../utils/entities";

const cache = new Map<string, string>();

export function useHaImage(pathOrUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const url = absoluteHaUrl(pathOrUrl);

    if (!url) {
      setSrc(null);
      return;
    }

    const cached = cache.get(url);
    if (cached) {
      setSrc(cached);
      return;
    }

    invoke<string>("fetch_ha_image_base64", {
      url,
      token: localConfig.homeAssistant.token,
    })
      .then((dataUrl) => {
        if (cancelled) return;
        cache.set(url, dataUrl);
        setSrc(dataUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Albumcover konnte nicht geladen werden:", err);
        setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  return { src };
}
