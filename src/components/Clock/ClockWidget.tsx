import dayjs from "dayjs";
import "dayjs/locale/de";
import { CalendarDays } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import "./ClockWidget.css";

dayjs.locale("de");

export function ClockWidget() {
  const now = useNow(1000);
  const date = dayjs(now);
  const weekday = capitalize(date.format("dddd"));

  return (
    <div className="clock-widget">
      <div className="clock-widget__time">{date.format("HH:mm")}</div>

      <div className="clock-widget__date">
        <CalendarDays size={26} />
        <div>
          <strong>{weekday}</strong>
          <span>{date.format("D. MMMM YYYY")}</span>
        </div>
      </div>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
