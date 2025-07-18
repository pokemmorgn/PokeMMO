// ui/TimeWeatherWidget.js - 100% UIManager CONTROL, NO MANUAL POSITION
export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right';
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear' };
    this.icons = {
      clear: '☀️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️', cloudy: '☁️'
    };
    
    // États pour UIManager
    this.isVisible = true;
    this.isEnabled = true;
    this.initialized = false;
    
    // === UIManager CONTROL FLAGS ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    // Callback position
    this.onPositioned = this.onPositioned.bind(this);
    console.log('⏰ [TimeWeatherWidget] Instance créée - UIManager contrôle TOTAL');
  }

  // === 🔧 MÉTHODE CREATEICON POUR UIMANAGER ===
  createIcon() {
    console.log('🎨 [TimeWeatherWidget] createIcon() appelée par UIManager');
    
    // Supprimer l'ancien élément s'il existe
    const existing = document.getElementById(this.id);
    if (existing) {
      existing.remove();
    }
    
    // Créer l'élément
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'time-weather-widget ui-icon';
    el.innerHTML = `
      <div class="tw-time" id="${this.id}-time"></div>
      <div class="tw-sep"></div>
      <div class="tw-weather" id="${this.id}-weather"></div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(el);
    this.element = el;
    
    // Injecter les styles
    this.injectStyles();
    
    // Mettre à jour le contenu
    this.updateTime(this.currentHour, this.isDayTime);
    this.updateWeather(this.weather.weather, this.weather.displayName);
    
    // Marquer comme initialisé
    this.initialized = true;
    
    console.log('✅ [TimeWeatherWidget] Élément créé et retourné à UIManager');
    return el;
  }

  // === MÉTHODES DE MISE À JOUR ===
  updateTime(hour, isDayTime) {
    this.currentHour = hour;
    this.isDayTime = isDayTime;
    if (!this.element) return;
    
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'AM' : 'PM';
    const icon = isDayTime ? '☀️' : '🌙';
    
    const timeElement = this.element.querySelector('.tw-time');
    if (timeElement) {
      timeElement.textContent = `${h12}:00 ${period} ${icon}`;
    }
  }

  updateWeather(weather, displayName) {
    this.weather = { weather, displayName };
    if (!this.element) return;
    
    const icon = this.icons[weather] || '☀️';
    const weatherElement = this.element.querySelector('.tw-weather');
    if (weatherElement) {
      weatherElement.textContent = `${icon} ${displayName}`;
    }
  }

  // === MÉTHODES POUR UIMANAGER ===
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
    console.log('👁️ [TimeWeatherWidget] Widget affiché');
    return true;
  }

  hide() {
    this.isVisible = false;
    if (this.element) {
      this.element.classList.add('ui-fade-out');
      setTimeout(() => {
        this.element.classList.add('ui-hidden');
        this.element.classList.remove('ui-fade-out');
        this.element.style.display = 'none';
      }, 200);
    }
    console.log('👻 [TimeWeatherWidget] Widget caché');
    return true;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (this.element) {
      if (enabled) {
        this.element.classList.remove('ui-disabled', 'disabled');
        this.element.style.opacity = '1';
        this.element.style.pointerEvents = 'auto';
      } else {
        this.element.classList.add('ui-disabled');
        this.element.style.opacity = '0.5';
        this.element.style.pointerEvents = 'none';
      }
    }
    console.log(`🔧 [TimeWeatherWidget] Widget ${enabled ? 'activé' : 'désactivé'}`);
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
        /* AUCUNE position fixe - UIManager gère tout */
        z-index: 500;
      }
      
      .time-weather-widget .tw-time {
        font-weight: 700;
        letter-spacing: 1px;
        min-width: 82px;
        text-align: right;
      }
      
      .time-weather-widget .tw-sep {
        width: 1px; 
        height: 24px;
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
      
      .time-weather-widget.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-20px);
      }
      
      .time-weather-widget.ui-fade-in {
        animation: fadeInUp 0.3s ease-out;
      }
      
      .time-weather-widget.ui-fade-out {
        animation: fadeOutUp 0.2s ease-in;
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeOutUp {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-20px);
        }
      }
      
      @media (max-width: 800px) {
        .time-weather-widget.ui-icon {
          font-size: 15px;
          width: 150px;
          min-width: 140px;
          height: 36px;
          padding: 0 7px;
        }
        
        .time-weather-widget .tw-time {
          min-width: 70px;
        }
        
        .time-weather-widget .tw-weather {
          min-width: 60px;
        }
      }
      
      /* Indicateur de positionnement UIManager */
      .time-weather-widget[data-positioned-by="uimanager"]::after {
        content: "⏰";
        position: absolute;
        top: -10px;
        right: -10px;
        font-size: 8px;
        opacity: 0.7;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TimeWeatherWidget] Styles injectés');
  }

  // === DESTRUCTION ===
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Supprimer les styles
    const style = document.getElementById('time-weather-widget-css');
    if (style) {
      style.remove();
    }
    
    this.element = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.initialized = false;
    
    console.log('🧹 [TimeWeatherWidget] Détruit');
  }

  // === DEBUG ===
  debugInfo() {
    return {
      id: this.id,
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      initialized: this.initialized,
      hasElement: !!this.element,
      elementInDOM: this.element ? document.contains(this.element) : false,
      positioningMode: this.positioningMode,
      uiManagerControlled: this.uiManagerControlled,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      currentTime: `${this.currentHour}:00 ${this.isDayTime ? 'AM' : 'PM'}`,
      currentWeather: this.weather,
      elementStyles: this.element ? {
        position: this.element.style.position,
        left: this.element.style.left,
        top: this.element.style.top,
        right: this.element.style.right,
        bottom: this.element.style.bottom,
        display: this.element.style.display,
        visibility: this.element.style.visibility,
        opacity: this.element.style.opacity,
        zIndex: this.element.style.zIndex
      } : null,
      boundingRect: this.element ? this.element.getBoundingClientRect() : null
    };
  }
}

export default TimeWeatherWidget;
