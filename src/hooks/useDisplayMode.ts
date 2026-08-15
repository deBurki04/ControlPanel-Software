import { useEffect } from "react";
import {
  availableMonitors,
  getCurrentWindow,
  PhysicalPosition,
  PhysicalSize,
  primaryMonitor,
} from "@tauri-apps/api/window";
import { config } from "../config/config";

type MonitorInfo = Awaited<ReturnType<typeof availableMonitors>>[number];

export function useDisplayMode() {
  useEffect(() => {
    const appWindow = getCurrentWindow();

    async function moveToTargetMonitor() {
      if (!config.display.monitor.enabled) return;

      try {
        const targetMonitor = await getTargetMonitor();

        if (!targetMonitor) {
          console.warn("Kein Zielmonitor gefunden.");
          return;
        }

        console.info("GC8 Zielmonitor:", describeMonitor(targetMonitor));

        /**
         * Erst aus Fullscreen raus, dann verschieben.
         * Windows entscheidet Fullscreen meistens anhand der aktuellen Fensterposition.
         */
        await appWindow.setFullscreen(false);

        if (config.display.hideDecorationsInKiosk) {
          await appWindow.setDecorations(false);
        }

        await appWindow.setPosition(
          new PhysicalPosition(targetMonitor.position.x, targetMonitor.position.y),
        );

        await appWindow.setSize(
          new PhysicalSize(targetMonitor.size.width, targetMonitor.size.height),
        );

        await appWindow.setFocus();

        /**
         * Kleine Pause, damit Windows die neue Monitorposition sicher übernimmt,
         * bevor Vollbild aktiviert wird.
         */
        await sleep(250);
      } catch (error) {
        console.warn("Fenster konnte nicht auf Zielmonitor verschoben werden:", error);
      }
    }

    async function applyInitialMode() {
      try {
        await moveToTargetMonitor();

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

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();

        moveToTargetMonitor()
          .then(() => {
            if (config.display.kiosk) return appWindow.setFullscreen(true);
            return Promise.resolve();
          })
          .catch(console.warn);
      }
    }

    applyInitialMode();

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}

async function getTargetMonitor() {
  const monitors = await availableMonitors();

  console.info(
    "Gefundene Monitore:",
    monitors.map((monitor) => describeMonitor(monitor)),
  );

  if (monitors.length === 0) return null;

  const primary = await primaryMonitor();

  const nameParts = config.display.monitor.nameIncludes.map((part) =>
    part.toLowerCase(),
  );

  const byName = monitors.find((monitor) => {
    const name = monitor.name?.toLowerCase() ?? "";
    return nameParts.some((part) => name.includes(part));
  });

  if (byName) return byName;

  const preferred = config.display.monitor.preferredResolution;

  const byResolution = monitors.find((monitor) => {
    return (
      monitor.size.width === preferred.width &&
      monitor.size.height === preferred.height
    );
  });

  if (byResolution) return byResolution;

  const byRotatedResolution = monitors.find((monitor) => {
    return (
      monitor.size.width === preferred.height &&
      monitor.size.height === preferred.width
    );
  });

  if (byRotatedResolution) return byRotatedResolution;

  if (config.display.monitor.fallback === "secondary") {
    const secondary = monitors.find((monitor) => !sameMonitor(monitor, primary));

    if (secondary) return secondary;
  }

  return primary ?? monitors[0];
}

function sameMonitor(left: MonitorInfo, right: MonitorInfo | null) {
  if (!right) return false;

  return (
    left.position.x === right.position.x &&
    left.position.y === right.position.y &&
    left.size.width === right.size.width &&
    left.size.height === right.size.height
  );
}

function describeMonitor(monitor: MonitorInfo) {
  return {
    name: monitor.name,
    position: `${monitor.position.x},${monitor.position.y}`,
    size: `${monitor.size.width}x${monitor.size.height}`,
    scaleFactor: monitor.scaleFactor,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
