const isProduction = import.meta.env.PROD;

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
     * Entwicklungsmodus:
     * - npm run tauri dev
     * - normales verschiebbares Fenster
     *
     * Release/Kiosk:
     * - npm run tauri build
     * - automatisch Vollbild
     */
    kiosk: isProduction,

    /**
     * Für ein festes GC8-Display kann das später auf true.
     * Im Moment bleibt es false, damit andere Fenster nicht blockiert werden.
     */
    alwaysOnTop: false,

    hideDecorationsInKiosk: true,

    /**
     * F11 = Vollbild umschalten
     * Escape = Vollbild verlassen
     * Strg+R = neu laden
     */
    enableHotkeys: true,
  },

  calendar: {
    enabled: true,
    maxEvents: 4,
  },
} as const;
