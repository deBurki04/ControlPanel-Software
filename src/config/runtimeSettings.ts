import { localConfig } from "./config.local";

const storageKey = "gc8-companion-settings-v1";

export interface RuntimeSettings {
  discordBotToken: string;
}

function cleanToken(value: unknown) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();

  if (trimmed.toLowerCase().startsWith("bot ")) {
    return trimmed.slice(4).trim();
  }

  return trimmed;
}

function getFallbackSettings(): RuntimeSettings {
  return {
    discordBotToken: cleanToken(localConfig.discord.botToken),
  };
}

export function getRuntimeSettings(): RuntimeSettings {
  const fallback = getFallbackSettings();

  try {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<RuntimeSettings>;
    const savedToken = cleanToken(parsed.discordBotToken);

    return {
      discordBotToken: savedToken || fallback.discordBotToken,
    };
  } catch {
    return fallback;
  }
}

export function saveRuntimeSettings(settings: RuntimeSettings) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      discordBotToken: cleanToken(settings.discordBotToken),
    }),
  );

  window.dispatchEvent(new CustomEvent("gc8-settings-changed"));
}

export function getDiscordBotToken() {
  return getRuntimeSettings().discordBotToken;
}
