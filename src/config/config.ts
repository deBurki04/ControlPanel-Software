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
    kiosk: isProduction,

    monitor: {
      enabled: isProduction,
      nameIncludes: ["GC8", "Poly"],
      preferredResolution: {
        width: 1280,
        height: 800,
      },
      fallback: "secondary",
    },

    alwaysOnTop: false,
    hideDecorationsInKiosk: true,
    enableHotkeys: true,
  },

  calendar: {
    enabled: true,
    maxEvents: 4,
  },
} as const;
