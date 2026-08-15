import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { config } from "../config/config";

export function useDisplayMode() {
  useEffect(() => {
    const appWindow = getCurrentWindow();

    async function applyInitialMode() {
      try {
        if (config.display.kiosk) {
          await appWindow.setFullscreen(true);

          if (config.display.hideDecorationsInKiosk) {
            await appWindow.setDecorations(false);
          }

          if (config.display.alwaysOnTop) {
            await appWindow.setAlwaysOnTop(true);
          }
        } else {
          await appWindow.setFullscreen(false);
          await appWindow.setDecorations(true);
          await appWindow.setAlwaysOnTop(false);
        }
      } catch (error) {
        console.warn("Display-Modus konnte nicht angewendet werden:", error);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!config.display.enableHotkeys) return;

      if (event.key === "F11") {
        event.preventDefault();

        appWindow
          .isFullscreen()
          .then((isFullscreen) => appWindow.setFullscreen(!isFullscreen))
          .catch(console.warn);
      }

      if (event.key === "Escape") {
        event.preventDefault();

        appWindow
          .setFullscreen(false)
          .then(() => appWindow.setDecorations(true))
          .catch(console.warn);
      }

      if (event.ctrlKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        window.location.reload();
      }
    }

    applyInitialMode();

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}