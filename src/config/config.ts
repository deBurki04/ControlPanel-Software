export const config = {
  homeAssistant: {
    url: "http://192.168.1.23:8123",
  },

  entities: {
    spotify: "media_player.spotify_joel_burki",
    temperature: "sensor.thermostat_gamezimmer_temperature",
  },

  display: {
    fullscreen: false,
    alwaysOnTop: false,
  },

  calendar: {
    enabled: true,
    maxEvents: 4,
  },
} as const;
