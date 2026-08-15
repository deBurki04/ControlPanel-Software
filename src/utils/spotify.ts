import type { HomeAssistantEntity } from "../types/homeassistant";
import { getAttribute } from "./entities";

export interface SpotifyDisplayState {
  status: "playing" | "paused" | "idle" | "off" | "unknown";
  title: string;
  artist: string;
  album: string;
  duration: number;
  position: number;
  progress: number;
  entityPicture: string | null;
}

export function getSpotifyDisplayState(
  entity: HomeAssistantEntity | undefined,
  now: number,
): SpotifyDisplayState {
  if (!entity) {
    return {
      status: "unknown",
      title: "Spotify",
      artist: "Warte auf Home Assistant",
      album: "",
      duration: 0,
      position: 0,
      progress: 0,
      entityPicture: null,
    };
  }

  const duration = getAttribute<number>(entity.attributes, "media_duration", 0);
  const basePosition = getAttribute<number>(entity.attributes, "media_position", 0);
  const updatedAt = getAttribute<string | null>(
    entity.attributes,
    "media_position_updated_at",
    null,
  );

  let position = basePosition;

  if (entity.state === "playing" && updatedAt) {
    const updatedMs = Date.parse(updatedAt);
    if (!Number.isNaN(updatedMs)) {
      position += Math.max(0, (now - updatedMs) / 1000);
    }
  }

  position = Math.min(position, duration || position);

  return {
    status: normalizeStatus(entity.state),
    title: getAttribute<string>(entity.attributes, "media_title", "Nichts läuft"),
    artist: getAttribute<string>(entity.attributes, "media_artist", "Spotify"),
    album: getAttribute<string>(entity.attributes, "media_album_name", ""),
    duration,
    position,
    progress: duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0,
    entityPicture: getAttribute<string | null>(entity.attributes, "entity_picture", null),
  };
}

function normalizeStatus(state: string): SpotifyDisplayState["status"] {
  if (state === "playing") return "playing";
  if (state === "paused") return "paused";
  if (state === "idle") return "idle";
  if (state === "off") return "off";
  return "unknown";
}

export function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
