const isProduction = import.meta.env.PROD;

export const config = {
  homeAssistant: {
    url: "http://192.168.1.23:8123",
  },

  entities: {
    spotify: "media_player.spotify_joel_burki",
    temperature: "sensor.thermostat_gamezimmer_temperature",
    outdoorTemperature: "sensor.hue_outdoor_motion_sensor_1_temperature",
    phoneNotification: "sensor.s25_remote_last_notification",
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
    enabled: false,
    title: "Nächste Termine",
    maxEvents: 4,
    refreshMinutes: 10,
    lookAheadDays: 60,
  },

  discord: {
    enabled: true,
    title: "Discord Voice",
    guildId: "1077872923395764265",
    userId: "270115300047847434",
    gatewayUrl: "wss://gateway.discord.gg/?v=10&encoding=json",
    restBaseUrl: "https://discord.com/api/v10",
    maxVisibleMembers: 8,
    reconnectSeconds: 8,
  },
} as const;
