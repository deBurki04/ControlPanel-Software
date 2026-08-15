import { config } from "../../config/config";
import { localConfig } from "../../config/config.local";
import type { HomeAssistantEntity, StateChangedEvent } from "../../types/homeassistant";
import { useHomeAssistantStore } from "../../store/homeassistant";
import type { HAMessage, PendingCommand } from "./Types";

const COMMAND_TIMEOUT_MS = 15000;
const RECONNECT_DELAY_MS = 3000;

class HomeAssistantClient {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCommand<unknown>>();
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;

  connect() {
    this.shouldReconnect = true;
    this.clearReconnect();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    useHomeAssistantStore.getState().setStatus("connecting", null);

    const wsUrl = this.createWebSocketUrl(config.homeAssistant.url);

    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.addEventListener("message", this.handleMessage);
      this.socket.addEventListener("close", this.handleClose);
      this.socket.addEventListener("error", this.handleError);
    } catch (error) {
      useHomeAssistantStore.getState().setStatus("error", String(error));
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnect();
    this.rejectAllPending("Home Assistant client disconnected");

    if (this.socket) {
      this.socket.removeEventListener("message", this.handleMessage);
      this.socket.removeEventListener("close", this.handleClose);
      this.socket.removeEventListener("error", this.handleError);
      this.socket.close();
      this.socket = null;
    }

    useHomeAssistantStore.getState().setStatus("idle", null);
  }

  async getStates(): Promise<HomeAssistantEntity[]> {
    return this.sendCommand<HomeAssistantEntity[]>("get_states");
  }

  private createWebSocketUrl(baseUrl: string) {
    const normalized = baseUrl.replace(/\/$/, "");
    return normalized.replace(/^http/i, "ws") + "/api/websocket";
  }

  private handleMessage = async (event: MessageEvent) => {
    const message = JSON.parse(event.data) as HAMessage;

    if (message.type === "auth_required") {
      useHomeAssistantStore.getState().setStatus("authenticating", null);
      this.sendRaw({
        type: "auth",
        access_token: localConfig.homeAssistant.token,
      });
      return;
    }

    if (message.type === "auth_ok") {
      useHomeAssistantStore.getState().setStatus("connected", null);
      await this.bootstrap();
      return;
    }

    if (message.type === "auth_invalid") {
      useHomeAssistantStore.getState().setStatus("auth_error", message.message);
      this.disconnect();
      return;
    }

    if (message.type === "result") {
      const pending = this.pending.get(message.id);
      if (!pending) return;

      window.clearTimeout(pending.timeout);
      this.pending.delete(message.id);

      if (message.success) {
        pending.resolve(message.result);
      } else {
        pending.reject(message.error?.message ?? "Home Assistant command failed");
      }

      return;
    }

    if (message.type === "event") {
      this.handleEvent(message.event);
    }
  };

  private handleClose = () => {
    this.socket = null;
    this.rejectAllPending("Home Assistant socket closed");

    if (!this.shouldReconnect) return;

    useHomeAssistantStore
      .getState()
      .setStatus("reconnecting", "Verbindung zu Home Assistant wurde getrennt.");

    this.scheduleReconnect();
  };

  private handleError = () => {
    useHomeAssistantStore.getState().setStatus("error", "WebSocket-Fehler.");
  };

  private async bootstrap() {
    try {
      const states = await this.getStates();

      console.log("HA states geladen:", states.length);
      console.log(
        "Spotify Entity:",
        states.find((entity) => entity.entity_id === config.entities.spotify),
      );
      console.log(
        "Temperature Entity:",
        states.find((entity) => entity.entity_id === config.entities.temperature),
      );

      useHomeAssistantStore.getState().setEntities(states);

      await this.sendCommand("subscribe_events", {
        event_type: "state_changed",
      });
   } catch (error) {
     console.error("HA bootstrap error:", error);
     useHomeAssistantStore.getState().setStatus("error", String(error));
   }
  }

  private handleEvent(event: StateChangedEvent) {
    if (event.event_type !== "state_changed") return;

    const entity = event.data.new_state;

    if (entity) {
      useHomeAssistantStore.getState().setEntity(entity);
    }
  }

  private sendCommand<T>(
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    const id = this.nextId++;

    return new Promise<T>((resolve, reject) => {
      const socket = this.socket;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Home Assistant socket is not connected"));
        return;
      }

      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Home Assistant command timed out: ${type}`));
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.sendRaw({
        id,
        type,
        ...payload,
      });
    });
  }

  private sendRaw(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private rejectAllPending(reason: string) {
    for (const [id, pending] of this.pending.entries()) {
      window.clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private scheduleReconnect() {
    this.clearReconnect();

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const haClient = new HomeAssistantClient();
