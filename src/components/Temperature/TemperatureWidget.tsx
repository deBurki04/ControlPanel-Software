import { Thermometer } from "lucide-react";
import { config } from "../../config/config";
import { useHAEntity } from "../../store/homeassistant";
import { formatTemperature, getAttribute } from "../../utils/entities";
import "./TemperatureWidget.css";

export function TemperatureWidget() {
  const entity = useHAEntity(config.entities.temperature);
  const unit = getAttribute<string>(entity?.attributes, "unit_of_measurement", "°C");
  const value = formatTemperature(entity?.state);

  return (
    <div className="temperature-widget">
      <div className="temperature-widget__icon">
        <Thermometer size={34} />
      </div>

      <div>
        <div className="temperature-widget__value">
          {value}
          <span>{unit}</span>
        </div>
        <div className="temperature-widget__label">Gamezimmer</div>
      </div>
    </div>
  );
}
