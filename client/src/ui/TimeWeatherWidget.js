// ui/TimeWeatherWidget.js - 100% UIManager CONTROL, NO MANUAL POSITION
export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right'; // UIManager gère l'ancrage
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear' };
    this.icons = {
      clear: '☀️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️', cloudy: '☁️'
    };
    // === UIManager CONTROL FLAGS ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    // Callback position
    this.onPositioned = this.onPositioned.bind(this);
    console.log('⏰ [TimeWeatherWidget] Instance créée - UIManager contrôle TOTAL');
  }

  // === CRÉATION SANS POSITION ===
  createIcon() {
    const existing = document.getElementById(this.id);
    if (existing) {
      existing.remove();
    }
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'time-weather-widget ui-icon';
    el.innerHTML = `
      <div class="tw-time" id="${this.id}-time"></div>
      <div class="tw-sep"></div>
      <div class="tw-weather" id="${this.id}-weather"></div>
    `;
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
    this.isVisible = true;
    if (this.element) {
      this.element.classList.remove('ui-hidden', 'hidden');
      this.element.classList.add('ui-fade-in');
      this.element.style.display = 'flex';
      this.element.style.visibility = 'visible';
      this.element.style.opacity = '1';
      setTimeout(() => {
        this.element.classList.remove('ui-fade-in');
      }, 300);
    }
    return true;
  }

  hide() {
    this.isVisible = false;
    if (this.element) {
      this.element.classList.add('ui-fade-out');
      setTimeout(() => {
        this.element.classList.add('ui-hidden');
        this.element.classList.remove('ui-fade-out');
      }, 200);
    }
    return true;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (this.element) {
      if (enabled) {
        this.element.classList.remove('ui-disabled', 'disabled');
      } else {
        this.element.classList.add('ui-disabled');
      }
    }
    return true;
  }

  // === 📍 CALLBACK UIManager ===
  onPositioned(position) {
    if (this.element) {
      this.element.setAttribute('data-positioned-by', 'uimanager');
      this.element.setAttribute('data-position', JSON.stringify(position));
      console.log('✅ [TimeWeatherWidget] Position UIManager confirmée', position);
    }
  }

  isPositionedByUIManager() {
    return this.element?.getAttribute('data-positioned-by') === 'uimanager';
  }

  getCurrentPosition() {
    if (!this.element) return null;
    const positionData = this.element.getAttribute('data-position');
    if (positionData) {
      try {
        return JSON.parse(positionData);
      } catch (error) {
        console.warn('⚠️ [TimeWeatherWidget] Position data invalide');
      }
    }
    const computed = window.getComputedStyle(this.element);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }

  // === STYLES SANS POSITION ===
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
        font-family: 'Montserrat', Arial, sans-serif;
        user-select: none;
        transition: opacity 0.2s;
        /* AUCUNE position fixe (top, right, etc) */
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
          padding: 0 7px;
        }
      }
      .time-weather-widget[data-positioned-by="uimanager"]::after {
        content: "⏰";
        position: absolute;
        top: -10px;
        left: -10px;
        font-size: 8px;
        opacity: 0.7;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    console.log('🎨 [TimeWeatherWidget] Styles sans position fixe appliqués');
  }

  // === DESTRUCTION
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.isVisible = false;
    this.isEnabled = false;
    console.log('🧹 [TimeWeatherWidget] Détruit');
  }

  // === DEBUG
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.element,
      elementInDOM: this.element ? document.contains(this.element) : false,
      positioningMode: this.positioningMode,
      uiManagerControlled: this.uiManagerControlled,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      elementStyles: this.element ? {
        position: this.element.style.position,
        left: this.element.style.left,
        top: this.element.style.top,
        right: this.element.style.right,
        bottom: this.element.style.bottom,
        zIndex: this.element.style.zIndex,
        display: this.element.style.display,
        visibility: this.element.style.visibility,
        opacity: this.element.style.opacity
      } : null,
      boundingRect: this.element ? this.element.getBoundingClientRect() : null
    };
  }
}

export default TimeWeatherWidget;

/* === NOTES ===
❌ SUPPRIMÉ :
• Toute position CSS (fixed, top, right, etc)
• Toute position JS
• setFallbackPosition()

✅ AJOUTÉ :
• uiManagerControlled flag
• onPositioned() callback pour UIManager
• Styles sans position
• debugInfo()
• Destroy strict

RÉSULTAT : UIManager gère 100% du positionnement et du layout. */
