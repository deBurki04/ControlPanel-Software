export const config = {
  homeAssistant: {
    url: "http://192.168.1.23:8123",
  },

  entities: {
    spotify: "media_player.spotify_joel_burki",
    temperature: "sensor.thermostat_gamezimmer_temperature",
  },

  display: {
    /**
     * false = Entwicklungsmodus:
     * - normales Fenster
     * - verschiebbar
     * - Titelleiste sichtbar
     *
     * true = GC8/Kiosk-Modus:
     * - Vollbild
     * - optional immer im Vordergrund
     * - optional ohne Fensterrahmen
     */
    kiosk: false,

    alwaysOnTop: false,

    hideDecorationsInKiosk: true,

    enableHotkeys: true,
  },

  calendar: {
    enabled: true,
    maxEvents: 4,
  },
} as const;
