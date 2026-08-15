import { Thermometer, Trees } from "lucide-react";
import { config } from "../../config/config";
import { useHAEntity } from "../../store/homeassistant";
import { formatTemperature, getAttribute } from "../../utils/entities";
import "./TemperatureWidget.css";

export function TemperatureWidget() {
  const indoorEntity = useHAEntity(config.entities.temperature);
  const outdoorEntity = useHAEntity(config.entities.outdoorTemperature);

  const indoorUnit = getAttribute<string>(
    indoorEntity?.attributes,
    "unit_of_measurement",
    "°C",
  );

  const outdoorUnit = getAttribute<string>(
    outdoorEntity?.attributes,
    "unit_of_measurement",
    "°C",
  );

  const indoorValue = formatTemperature(indoorEntity?.state);
  const outdoorValue = formatTemperature(outdoorEntity?.state);

  return (
    <div className="temperature-widget">
      <section className="temperature-widget__row temperature-widget__row--main">
        <div className="temperature-widget__icon">
          <Thermometer size={32} />
        </div>

        <div className="temperature-widget__content">
          <div className="temperature-widget__value">
            {indoorValue}
            <span>{indoorUnit}</span>
          </div>
          <div className="temperature-widget__label">Gamezimmer</div>
        </div>
      </section>

      <section className="temperature-widget__row temperature-widget__row--secondary">
        <div className="temperature-widget__icon temperature-widget__icon--outdoor">
          <Trees size={25} />
        </div>

        <div className="temperature-widget__content">
          <div className="temperature-widget__value temperature-widget__value--small">
            {outdoorValue}
            <span>{outdoorUnit}</span>
          </div>
          <div className="temperature-widget__label temperature-widget__label--small">
            Aussentemperatur
          </div>
        </div>
      </section>
    </div>
  );
}
