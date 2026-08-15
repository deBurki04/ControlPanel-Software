import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { config } from "../config/config";
import { localConfig } from "../config/config.local";

export function useHaImage(pathOrUrl?: string | null) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!pathOrUrl) {
        setSrc(null);
        return;
      }

      try {
        const url = pathOrUrl.startsWith("http")
          ? pathOrUrl
          : `${config.homeAssistant.url}${pathOrUrl}`;

        const image = await invoke<string>("fetch_ha_image_base64", {
          url,
          token: localConfig.homeAssistant.token,
        });

        if (!cancelled) {
          setSrc(image);
        }
      } catch (error) {
        console.warn("HA Bild konnte nicht geladen werden:", error);

        if (!cancelled) {
          setSrc(null);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  return { src };
}
