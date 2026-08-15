import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { CalendarClock } from "lucide-react";
import { config } from "../../config/config";
import { localConfig } from "../../config/config.local";
import { parseIcsEvents, type CalendarEvent } from "../../services/calendar/ics";
import "./CalendarWidget.css";

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      const icsUrl = localConfig.calendar.icsUrl?.trim();

      if (!icsUrl) {
        setEvents(getFallbackEvents());
        return;
      }

      try {
        const response = await fetch(icsUrl);
        const text = await response.text();

        if (cancelled) return;

        const parsed = parseIcsEvents(text)
          .filter((event) => event.end.isAfter(dayjs()))
          .slice(0, config.calendar.maxEvents);

        setEvents(parsed);
      } catch (error) {
        console.warn("Kalender konnte nicht geladen werden:", error);
        if (!cancelled) setEvents(getFallbackEvents());
      }
    }

    loadCalendar();

    const timer = window.setInterval(loadCalendar, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="calendar-widget">
      <header>
        <div>
          <span>Agenda</span>
          <h2>Nächste Termine</h2>
        </div>
        <CalendarClock size={34} />
      </header>

      <div className="calendar-widget__events">
        {events.length === 0 ? (
          <div className="calendar-widget__empty">Keine Termine gefunden.</div>
        ) : (
          events.map((event) => (
            <article
              className="calendar-widget__event"
              key={`${event.start.toISOString()}-${event.title}`}
            >
              <time>{event.start.format("HH:mm")}</time>
              <div>
                <strong>{event.title}</strong>
                <span>{formatEventDate(event.start)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function formatEventDate(date: dayjs.Dayjs) {
  if (date.isSame(dayjs(), "day")) return "Heute";
  if (date.isSame(dayjs().add(1, "day"), "day")) return "Morgen";
  return date.format("dd, D. MMM");
}

function getFallbackEvents(): CalendarEvent[] {
  return [
    {
      title: "TimeTree/ICS noch nicht verbunden",
      start: dayjs().hour(14).minute(0).second(0),
      end: dayjs().hour(14).minute(30).second(0),
    },
  ];
}
