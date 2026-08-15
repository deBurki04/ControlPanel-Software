import { Music, Pause, Play, Radio } from "lucide-react";
import { config } from "../../config/config";
import { useNow } from "../../hooks/useNow";
import { useHaImage } from "../../hooks/useHaImage";
import { useHAEntity } from "../../store/homeassistant";
import { formatSeconds, getSpotifyDisplayState } from "../../utils/spotify";
import "./SpotifyWidget.css";

export function SpotifyWidget() {
  const entity = useHAEntity(config.entities.spotify);
  const now = useNow(1000);
  const spotify = getSpotifyDisplayState(entity, now);
  const { src } = useHaImage(spotify.entityPicture);

  const statusIcon =
    spotify.status === "playing" ? (
      <Play size={18} />
    ) : spotify.status === "paused" ? (
      <Pause size={18} />
    ) : (
      <Radio size={18} />
    );

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
