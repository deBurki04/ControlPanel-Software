export type HomeAssistantConnectionStatus =
  | "idle"
  | "connecting"
  | "authenticating"
  | "connected"
  | "reconnecting"
  | "auth_error"
  | "error";

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface StateChangedEvent {
  event_type: "state_changed";
  data: {
    entity_id: string;
    old_state: HomeAssistantEntity | null;
    new_state: HomeAssistantEntity | null;
  };
  origin: string;
  time_fired: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}
