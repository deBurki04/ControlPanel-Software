import { useState } from "react";
import {
  Music,
  Pause,
  Play,
  Radio,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { config } from "../../config/config";
import { useNow } from "../../hooks/useNow";
import { useHaImage } from "../../hooks/useHaImage";
import { useHAEntity } from "../../store/homeassistant";
import { callHomeAssistantService } from "../../services/homeassistant/callService";
import { formatSeconds, getSpotifyDisplayState } from "../../utils/spotify";
import "./SpotifyWidget.css";

type SpotifyAction =
  | "media_previous_track"
  | "media_play_pause"
  | "media_next_track";

export function SpotifyWidget() {
  const entity = useHAEntity(config.entities.spotify);
  const now = useNow(1000);
  const spotify = getSpotifyDisplayState(entity, now);
  const { src } = useHaImage(spotify.entityPicture);
  const [pendingAction, setPendingAction] = useState<SpotifyAction | null>(null);

  const statusIcon =
    spotify.status === "playing" ? (
      <Play size={18} />
    ) : spotify.status === "paused" ? (
      <Pause size={18} />
    ) : (
      <Radio size={18} />
    );

  async function handleControl(service: SpotifyAction) {
    if (pendingAction) return;

    try {
      setPendingAction(service);

      await callHomeAssistantService("media_player", service, {
        entity_id: config.entities.spotify,
      });
    } catch (error) {
      console.warn("Spotify Steuerung fehlgeschlagen:", error);
    } finally {
      setPendingAction(null);
    }
  }

  const controlsDisabled =
    Boolean(pendingAction) ||
    spotify.status === "unknown";

  return (
    <div className="spotify-widget">
      <div className="spotify-widget__cover">
        {src ? (
          <img src={src} alt="Albumcover" />
        ) : (
          <div className="spotify-widget__coverFallback">
            <Music size={96} />
          </div>
        )}
      </div>

      <div className="spotify-widget__content">
        <div className="spotify-widget__status">
          {statusIcon}
          <span>{statusLabel(spotify.status)}</span>
        </div>

        <h1>{spotify.title}</h1>
        <h2>{spotify.artist}</h2>

        {spotify.album ? <p className="spotify-widget__album">{spotify.album}</p> : null}

        <div className="spotify-widget__progress">
          <div className="spotify-widget__progressBar">
            <span style={{ width: `${spotify.progress}%` }} />
          </div>

          <div className="spotify-widget__times">
            <span>{formatSeconds(spotify.position)}</span>
            <span>{formatSeconds(spotify.duration)}</span>
          </div>
        </div>

        <div className="spotify-widget__controls">
          <button
            type="button"
            aria-label="Vorheriger Titel"
            disabled={controlsDisabled}
            onClick={() => handleControl("media_previous_track")}
          >
            <SkipBack size={28} />
          </button>

          <button
            type="button"
            className="spotify-widget__controlMain"
            aria-label={spotify.status === "playing" ? "Pause" : "Wiedergabe"}
            disabled={controlsDisabled}
            onClick={() => handleControl("media_play_pause")}
          >
            {spotify.status === "playing" ? <Pause size={34} /> : <Play size={34} />}
          </button>

          <button
            type="button"
            aria-label="Nächster Titel"
            disabled={controlsDisabled}
            onClick={() => handleControl("media_next_track")}
          >
            <SkipForward size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "playing") return "Läuft gerade";
  if (status === "paused") return "Pausiert";
  if (status === "idle") return "Nichts läuft";
  if (status === "off") return "Spotify aus";
  return "Warte auf Spotify";
}

