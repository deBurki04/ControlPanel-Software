import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export interface CalendarEvent {
  title: string;
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}

export function parseIcsEvents(raw: string): CalendarEvent[] {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const chunks = unfolded.split("BEGIN:VEVENT").slice(1);

  return chunks
    .map((chunk) => {
      const title = readIcsValue(chunk, "SUMMARY") ?? "Ohne Titel";
      const dtStart =
        readIcsValue(chunk, "DTSTART") ??
        readIcsValue(chunk, "DTSTART;VALUE=DATE");

      const dtEnd =
        readIcsValue(chunk, "DTEND") ??
        readIcsValue(chunk, "DTEND;VALUE=DATE");

      if (!dtStart) return null;

      const start = parseIcsDate(dtStart);
      const end = dtEnd ? parseIcsDate(dtEnd) : start.add(1, "hour");

      if (!start.isValid()) return null;

      return {
        title: decodeIcsText(title),
        start,
        end: end.isValid() ? end : start.add(1, "hour"),
      };
    })
    .filter((event): event is CalendarEvent => event !== null)
    .sort((a, b) => a.start.valueOf() - b.start.valueOf());
}

function readIcsValue(chunk: string, key: string) {
  const lines = chunk.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith(`${key}:`)) {
      return line.slice(key.length + 1).trim();
    }

    if (line.startsWith(`${key};`)) {
      const index = line.indexOf(":");
      if (index !== -1) return line.slice(index + 1).trim();
    }
  }

  return null;
}

function parseIcsDate(value: string) {
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return dayjs(value, "YYYYMMDDTHHmmss[Z]");
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    return dayjs(value, "YYYYMMDDTHHmmss");
  }

  if (/^\d{8}$/.test(value)) {
    return dayjs(value, "YYYYMMDD");
  }

  return dayjs(value);
}

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}
