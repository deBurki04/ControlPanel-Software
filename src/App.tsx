import { useEffect } from "react";

import { haClient } from "./services/homeassistant/Client";
import { useHomeAssistantStore } from "./store/homeassistant";
import { useDisplayMode } from "./hooks/useDisplayMode";

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

  useDisplayMode();

  useEffect(() => {
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
