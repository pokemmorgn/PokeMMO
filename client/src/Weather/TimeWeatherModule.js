// client/src/Weather/TimeWeatherModule.js
import { TimeWeatherWidget } from './weather/TimeWeatherWidget.js';

export function createTimeWeatherModule() {
  const widget = new TimeWeatherWidget({ id: 'time-weather-widget', anchor: 'top-right' });
  widget.createIcon();
  return {
    iconElement: widget.element,
    widget,
    show: () => widget.show(),
    hide: () => widget.hide(),
    setEnabled: (enabled) => widget.setEnabled(enabled),
    destroy: () => widget.destroy()
  };
}
