// client/src/ui/WeatherIcon.js
export class WeatherIcon {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.weatherIconElement = null;
    this.isVisible = true;
    this.isEnabled = true;
    
    this.init();
  }

  init() {
    console.log(`🌤️ [WeatherIcon] Initialisation...`);
    
    this.createWeatherIconElement();
    this.addWeatherIconStyles();
    this.setupWeatherIconEvents();
    
    console.log(`✅ [WeatherIcon] Initialisé`);
  }

  createWeatherIconElement() {
    // Supprimer l'ancien s'il existe
    const existing = document.querySelector('#weather-icon');
    if (existing) {
        existing.remove();
    }
    
    const icon = document.createElement('div');
    icon.id = 'weather-icon';
    icon.className = 'weather-icon ui-icon';
    
    icon.innerHTML = `
        <div class="icon-background">
            <div class="icon-content">
                <span class="icon-emoji">☀️</span>
                <div class="weather-time">
                    <span class="time-indicator">12:00</span>
                </div>
            </div>
            <div class="icon-label">Weather</div>
        </div>
    `;
    
    // Position fixe
    icon.style.cssText = `
        position: fixed;
        top: ${this.y}px;
        right: ${window.innerWidth - this.x}px;
        width: 70px;
        height: 80px;
        z-index: 1000;
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
    `;
    
    document.body.appendChild(icon);
    this.weatherIconElement = icon;
  }

  addWeatherIconStyles() {
    if (document.querySelector('#weather-icon-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'weather-icon-styles';
    style.textContent = `
        .weather-icon .icon-background {
            width: 100%;
            height: 70px;
            background: linear-gradient(145deg, #2a3f5f, #1e2d42);
            border: 2px solid #4a90e2;
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            position: relative;
            transition: all 0.3s ease;
        }

        .weather-icon:hover {
            transform: scale(1.1);
        }

        .weather-icon:hover .icon-background {
            background: linear-gradient(145deg, #3a4f6f, #2e3d52);
            border-color: #5aa0f2;
            box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
        }

        .weather-icon .icon-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }

        .weather-icon .icon-emoji {
            font-size: 24px;
            transition: transform 0.3s ease;
            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        .weather-icon:hover .icon-emoji {
            transform: scale(1.2);
        }

        .weather-time {
            display: flex;
            align-items: center;
            font-size: 10px;
            font-weight: bold;
            color: #87ceeb;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .weather-icon .icon-label {
            font-size: 11px;
            color: #87ceeb;
            font-weight: 600;
            text-align: center;
            padding: 4px 0;
            background: rgba(74, 144, 226, 0.2);
            width: 100%;
            border-radius: 0 0 13px 13px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }

        .weather-icon.weather-changed .icon-emoji {
            animation: weatherBounce 0.6s ease;
        }

        @keyframes weatherBounce {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.3) rotate(-5deg); }
            50% { transform: scale(1.1) rotate(5deg); }
            75% { transform: scale(1.2) rotate(-2deg); }
        }
    `;
    
    document.head.appendChild(style);
  }

  setupWeatherIconEvents() {
    if (!this.weatherIconElement) return;
    
    this.weatherIconElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🌤️ [WeatherIcon] Clic détecté');
    });
  }

  setWeather(weather) {
    const icons = {
        clear: '☀️',
        sunny: '☀️', 
        rain: '🌧️', 
        storm: '⛈️',
        snow: '❄️',
        fog: '🌫️'
    };
    
    const emoji = this.weatherIconElement?.querySelector('.icon-emoji');
    if (emoji) {
        emoji.textContent = icons[weather] || '☀️';
        
        // Animation
        this.weatherIconElement.classList.add('weather-changed');
        setTimeout(() => {
            this.weatherIconElement.classList.remove('weather-changed');
        }, 600);
    }
    
    console.log(`🌤️ Icône météo changée: ${weather} → ${icons[weather] || '☀️'}`);
  }

  setTime(time) {
    const timeIndicator = this.weatherIconElement?.querySelector('.time-indicator');
    if (timeIndicator) {
        timeIndicator.textContent = time;
    }
  }

  connectToGlobalWeather(globalWeatherManager) {
    if (!globalWeatherManager?.isInitialized) {
        console.warn(`⚠️ [WeatherIcon] Système météo global pas prêt`);
        return;
    }
    
    // Écouter les changements
    globalWeatherManager.getTimeWeatherManager().onWeatherChange((weather, displayName) => {
        this.setWeather(weather);
    });
    
    globalWeatherManager.getTimeWeatherManager().onTimeChange((hour, isDayTime) => {
        this.setTime(`${hour}:00`);
    });
    
    // Appliquer l'état actuel
    const currentWeather = globalWeatherManager.getCurrentWeather();
    const currentTime = globalWeatherManager.getCurrentTime();
    
    this.setWeather(currentWeather.weather);
    this.setTime(`${currentTime.hour}:00`);
    
    console.log(`🔗 [WeatherIcon] Connecté au système météo global`);
  }

  destroy() {
    if (this.weatherIconElement && this.weatherIconElement.parentNode) {
        this.weatherIconElement.parentNode.removeChild(this.weatherIconElement);
    }
    this.weatherIconElement = null;
    console.log(`🧹 [WeatherIcon] Détruit`);
  }
}
