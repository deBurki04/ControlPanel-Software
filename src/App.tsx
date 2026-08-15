import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { config } from "./config/config";
import { haClient } from "./services/homeassistant/Client";
import { useHomeAssistantStore } from "./store/homeassistant";

import { DashboardShell } from "./components/Layout/DashboardShell";
import { SpotifyWidget } from "./components/Spotify/SpotifyWidget";
import { ClockWidget } from "./components/Clock/ClockWidget";
import { TemperatureWidget } from "./components/Temperature/TemperatureWidget";
import { CalendarWidget } from "./components/Calendar/CalendarWidget";
import { ConnectionBadge } from "./components/Common/ConnectionBadge";

import "./App.css";

export default function App() {
  const status = useHomeAssistantStore((state) => state.status);
  const error = useHomeAssistantStore((state) => state.error);

  useEffect(() => {
    if (config.display.fullscreen) {
      getCurrentWindow().setFullscreen(true).catch(console.warn);
    }

    if (config.display.alwaysOnTop) {
      getCurrentWindow().setAlwaysOnTop(true).catch(console.warn);
    }

    haClient.connect();

    return () => {
      haClient.disconnect();
    };
  }, []);

  return (
    <main className="app-root">
      <ConnectionBadge status={status} error={error} />

      <DashboardShell
        spotify={<SpotifyWidget />}
        clock={<ClockWidget />}
        temperature={<TemperatureWidget />}
        calendar={<CalendarWidget />}
      />
    </main>
  );
}
