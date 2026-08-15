import type { HomeAssistantConnectionStatus } from "../../types/homeassistant";
import "./ConnectionBadge.css";

interface ConnectionBadgeProps {
  status: HomeAssistantConnectionStatus;
  error: string | null;
}

const labels: Record<HomeAssistantConnectionStatus, string> = {
  idle: "Bereit",
  connecting: "Verbinde",
  authenticating: "Authentifiziere",
  connected: "Verbunden",
  reconnecting: "Verbinde neu",
  auth_error: "Auth Fehler",
  error: "Fehler",
};

export function ConnectionBadge({ status, error }: ConnectionBadgeProps) {
  return (
    <div className={`connection-badge connection-badge--${status}`}>
      <span className="connection-badge__dot" />
      <span>{labels[status]}</span>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
