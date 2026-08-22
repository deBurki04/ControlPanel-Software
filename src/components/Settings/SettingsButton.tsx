import { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCcw, Save, Settings, X } from "lucide-react";
import {
  getRuntimeSettings,
  saveRuntimeSettings,
} from "../../config/runtimeSettings";
import "./SettingsButton.css";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [discordBotToken, setDiscordBotToken] = useState("");

  useEffect(() => {
    const settings = getRuntimeSettings();
    setDiscordBotToken(settings.discordBotToken);
  }, [open]);

  function save() {
    saveRuntimeSettings({
      discordBotToken,
    });

    window.location.reload();
  }

  function clearToken() {
    setDiscordBotToken("");
  }

  return (
    <>
      <button
        className="settings-button"
        type="button"
        aria-label="Einstellungen öffnen"
        onClick={() => setOpen(true)}
      >
        <Settings size={22} />
      </button>

      {open ? (
        <div className="settings-modal">
          <div className="settings-modal__panel">
            <header className="settings-modal__header">
              <div>
                <span>GC8 Companion</span>
                <h2>Einstellungen</h2>
              </div>

              <button type="button" onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </header>

            <section className="settings-modal__section">
              <label htmlFor="discord-token">Discord Bot Token</label>

              <div className="settings-modal__tokenRow">
                <input
                  id="discord-token"
                  type={showToken ? "text" : "password"}
                  value={discordBotToken}
                  placeholder="Bot Token einfügen"
                  onChange={(event) => setDiscordBotToken(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showToken ? "Token verstecken" : "Token anzeigen"}
                  onClick={() => setShowToken((value) => !value)}
                >
                  {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p>
                Token ohne „Bot “ einfügen. Er wird lokal auf diesem Windows-Gerät
                gespeichert.
              </p>
            </section>

            <footer className="settings-modal__actions">
              <button type="button" className="settings-modal__secondary" onClick={clearToken}>
                <RotateCcw size={18} />
                Leeren
              </button>

              <button type="button" className="settings-modal__primary" onClick={save}>
                <Save size={18} />
                Speichern
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
