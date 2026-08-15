import type { StateChangedEvent } from "../../types/homeassistant";

export type HAMessage =
  | { type: "auth_required"; ha_version: string }
  | { type: "auth_ok"; ha_version: string }
  | { type: "auth_invalid"; message: string }
  | {
      id: number;
      type: "result";
      success: boolean;
      result?: unknown;
      error?: {
        code: string;
        message: string;
      };
    }
  | {
      id: number;
      type: "event";
      event: StateChangedEvent;
    };

export interface PendingCommand<T> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
}
