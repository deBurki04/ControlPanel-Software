import { config } from "../config/config";
import { useHAEntity } from "../store/homeassistant";

export interface PhoneNotification {
  id: string;
  app: string;
  title: string;
  text: string;
  timeLabel: string;
  isAvailable: boolean;
}

const blockedExactPackages = [
  "com.android.systemui",
  "com.samsung.android.app.smartcapture",
  "com.samsung.android.service.aircommand",
  "com.samsung.android.bixby.agent",
];

const blockedTitleParts = [
  "edge lighting",
  "android system",
  "system-ui",
  "systemui",
  "usb",
  "screenshot",
  "bildschirmaufnahme",
];

export function usePhoneNotification(): PhoneNotification {
  const entity = useHAEntity(config.entities.phoneNotification);
  const attributes = entity?.attributes ?? {};

  if (
    !entity ||
    entity.state === "unknown" ||
    entity.state === "unavailable" ||
    entity.state === ""
  ) {
    return getEmptyNotification();
  }

  const rawApp =
    readString(attributes, [
      "package",
      "android.package",
      "app_package",
      "app",
      "application",
      "source",
      "app_name",
    ]) || entity.state;

  const app = getFriendlyAppName(rawApp);

  const title =
    readString(attributes, [
      "title",
      "android.title",
      "notification_title",
      "sender",
    ]) || app;

  const text =
    readString(attributes, [
      "text",
      "android.text",
      "message",
      "notification_text",
      "big_text",
      "body",
      "sub_text",
    ]) ||
    readString(attributes, ["ticker", "summary"]) ||
    "";

  if (isBlockedNotification(rawApp, title, text)) {
    return {
      id: `blocked-${rawApp}-${title}-${text}`,
      app: "S25",
      title: "Keine relevante Benachrichtigung",
      text: "Systembenachrichtigungen werden ausgeblendet.",
      timeLabel: "",
      isAvailable: false,
    };
  }

  const timestamp =
    readTimestamp(attributes, [
      "post_time",
      "postTime",
      "post_time_ms",
      "when",
      "timestamp",
    ]) ?? parseDate(entity.last_changed);

  const id = [
    rawApp,
    title,
    text,
    timestamp ?? entity.last_changed ?? entity.state,
  ].join("|");

  return {
    id,
    app,
    title,
    text: text || "Neue Benachrichtigung",
    timeLabel: timestamp ? formatRelativeTime(timestamp) : "",
    isAvailable: true,
  };
}

export function getDismissedPhoneNotification(): PhoneNotification {
  return {
    id: "dismissed",
    app: "S25",
    title: "Benachrichtigung ausgeblendet",
    text: "Neue Handy-Benachrichtigungen erscheinen automatisch wieder.",
    timeLabel: "",
    isAvailable: false,
  };
}

function getEmptyNotification(): PhoneNotification {
  return {
    id: "empty",
    app: "S25",
    title: "Keine Benachrichtigung",
    text: "Noch keine Android-Benachrichtigung empfangen.",
    timeLabel: "",
    isAvailable: false,
  };
}

function isBlockedNotification(rawApp: string, title: string, text: string) {
  const normalizedApp = rawApp.toLowerCase().trim();
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedText = text.toLowerCase().trim();

  const isSystemPackage =
    blockedExactPackages.includes(normalizedApp) ||
    normalizedApp.includes("systemui");

  if (isSystemPackage) {
    return true;
  }

  const combined = `${normalizedTitle} ${normalizedText}`;

  /**
   * Titel/Text-Filter nur für echte Systembenachrichtigungen anwenden.
   * Wichtig: NICHT allgemein "android" blockieren, sonst fliegt Snapchat raus.
   */
  if (
    normalizedApp.includes("com.android") ||
    normalizedApp.includes("com.samsung.android.system")
  ) {
    return blockedTitleParts.some((blocked) => combined.includes(blocked));
  }

  return false;
}

function readString(attributes: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = attributes[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function readTimestamp(attributes: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = attributes[key];

    if (typeof value === "number") {
      return value > 10_000_000_000 ? value : value * 1000;
    }

    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        return numeric > 10_000_000_000 ? numeric : numeric * 1000;
      }

      const parsed = Date.parse(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function parseDate(value?: string) {
  if (!value) return null;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFriendlyAppName(value: string) {
  if (!value || value === "unknown" || value === "unavailable") return "Android";

  const normalized = value.toLowerCase();

  const knownApps: Record<string, string> = {
    "com.snapchat.android": "Snapchat",
    "com.whatsapp": "WhatsApp",
    "com.discord": "Discord",
    "com.google.android.gm": "Gmail",
    "com.google.android.calendar": "Google Kalender",
    "com.samsung.android.messaging": "Nachrichten",
    "com.google.android.apps.messaging": "Nachrichten",
    "com.samsung.android.dialer": "Telefon",
    "com.google.android.dialer": "Telefon",
    "com.android.systemui": "Android System",
  };

  if (knownApps[normalized]) return knownApps[normalized];

  const parts = normalized.split(".");
  const lastPart = parts[parts.length - 1] || value;

  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes === 1) return "vor 1 Min";
  if (diffMinutes < 60) return `vor ${diffMinutes} Min`;

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours === 1) return "vor 1 Std";
  if (diffHours < 24) return `vor ${diffHours} Std`;

  return new Date(timestamp).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}
