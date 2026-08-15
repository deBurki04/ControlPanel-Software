import { config } from "../config/config";

export function getAttribute<T>(
  attributes: Record<string, unknown> | undefined,
  key: string,
  fallback: T,
): T {
  if (!attributes) return fallback;

  const value = attributes[key];

  if (value === null || value === undefined) return fallback;

  return value as T;
}

export function absoluteHaUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = config.homeAssistant.url.replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${base}${path}`;
}

export function formatTemperature(value: string | number | undefined) {
  if (value === undefined || value === null) return "--";

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  if (Number.isNaN(parsed)) return String(value);

  return parsed.toFixed(1).replace(".", ",");
}
