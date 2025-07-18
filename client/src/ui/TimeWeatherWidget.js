// ui/TimeWeatherWidget.js - version DOM/UIManager-compatible
export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right'; // Compatible avec UIManager
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear' };
    this.icons = {
      clear: '☀️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️', cloudy: '☁️'
    };
  }

  createIcon() {
    // Empêche doublon
    if (document.getElementById(this.id)) {
      this.element = document.getElementById(this.id);
      return this.element;
    }
    // Conteneur principal
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'time-weather-widget ui-icon'; // Compatible UIManager
    el.innerHTML = `
      <div class="tw-time" id="${this.id}-time"></div>
      <div class="tw-sep"></div>
      <div class="tw-weather" id="${this.id}-weather"></div>
    `;
    // Appliquer état initial
    this.updateTime(this.currentHour, this.isDayTime);
    this.updateWeather(this.weather.weather, this.weather.displayName);

    document.body.appendChild(el);
    this.element = el;
    this.injectStyles();
    return el;
  }

  updateTime(hour, isDayTime) {
    this.currentHour = hour;
    this.isDayTime = isDayTime;
    if (!this.element) return;
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'AM' : 'PM';
    const icon = isDayTime ? '☀️' : '🌙';
    this.element.querySelector('.tw-time').textContent = `${h12}:00 ${period} ${icon}`;
  }

  updateWeather(weather, displayName) {
    this.weather = { weather, displayName };
    if (!this.element) return;
    const icon = this.icons[weather] || '☀️';
    this.element.querySelector('.tw-weather').textContent = `${icon} ${displayName}`;
  }

  show() {
    if (this.element) this.element.style.display = '';
  }

  hide() {
    if (this.element) this.element.style.display = 'none';
  }

  setEnabled(enabled) {
    if (!this.element) return;
    this.element.classList.toggle('ui-disabled', !enabled);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  injectStyles() {
    if (document.getElementById('time-weather-widget-css')) return;
    const style = document.createElement('style');
    style.id = 'time-weather-widget-css';
    style.textContent = `
      .time-weather-widget.ui-icon {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        width: 195px;
        min-width: 180px;
        max-width: 220px;
        height: 42px;
        padding: 0 12px;
        background: rgba(24,30,50,0.92);
        border-radius: 15px;
        font-size: 17px;
        color: #fff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.09);
        border: 1px solid #3a4a68;
        position: fixed;
        top: 22px; right: 22px;
        z-index: 2222;
        font-family: 'Montserrat', Arial, sans-serif;
        user-select: none;
        transition: opacity 0.2s;
      }
      .time-weather-widget .tw-time {
        font-weight: 700;
        letter-spacing: 1px;
        min-width: 82px;
        text-align: right;
      }
      .time-weather-widget .tw-sep {
        width: 1px; height: 24px;
        background: #55608044;
        margin: 0 8px;
        border-radius: 1px;
      }
      .time-weather-widget .tw-weather {
        font-weight: 500;
        letter-spacing: 0.5px;
        min-width: 72px;
        text-align: left;
        opacity: 0.9;
        white-space: nowrap;
      }
      .time-weather-widget.ui-disabled {
        opacity: 0.55;
        filter: grayscale(60%);
        pointer-events: none;
      }
      @media (max-width: 800px) {
        .time-weather-widget.ui-icon {
          font-size: 15px;
          width: 150px;
          height: 36px;
          top: 14px; right: 10px;
          padding: 0 7px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
export default TimeWeatherWidget;
