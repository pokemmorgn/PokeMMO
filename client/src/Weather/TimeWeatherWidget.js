// ui/TimeWeatherWidget.js - Style Pokémon Moderne
import { POKEMON_WEATHER_STYLES } from './PokemonWeatherStyles.js';

export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right';
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear', temperature: '22°C' };
    this.location = 'Village';
    this.weatherIntensity = 75;
    this.gameplayBonus = { active: true, text: '+15% XP Pokémon Eau', type: 'water' };
    
    // 🎮 Icônes météo Pokémon thématiques
    this.pokemonWeatherIcons = {
      clear: { 
        icon: '☀️', 
        pokemon: '🔥', 
        gradient: 'linear-gradient(135deg, #ff9a56 0%, #ffcc33 100%)',
        particles: '✨',
        bonus: 'Feu',
        color: '#ff9a56'
      },
      rain: { 
        icon: '🌧️', 
        pokemon: '💧', 
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #64748b 100%)',
        particles: '💧',
        bonus: 'Eau',
        color: '#3b82f6'
      },
      storm: { 
        icon: '⚡', 
        pokemon: '⚡', 
        gradient: 'linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%)',
        particles: '⚡',
        bonus: 'Électrik',
        color: '#6366f1'
      },
      snow: { 
        icon: '❄️', 
        pokemon: '🧊', 
        gradient: 'linear-gradient(135deg, #60a5fa 0%, #f8fafc 100%)',
        particles: '❄️',
        bonus: 'Glace',
        color: '#60a5fa'
      },
      fog: { 
        icon: '🌫️', 
        pokemon: '👻', 
        gradient: 'linear-gradient(135deg, #9ca3af 0%, #f3f4f6 100%)',
        particles: '🌫️',
        bonus: 'Spectre',
        color: '#9ca3af'
      },
      cloudy: { 
        icon: '☁️', 
        pokemon: '🌪️', 
        gradient: 'linear-gradient(135deg, #6b7280 0%, #d1d5db 100%)',
        particles: '☁️',
        bonus: 'Vol',
        color: '#6b7280'
      }
    };
    
    // États pour UIManager
    this.isVisible = true;
    this.isEnabled = true;
    this.initialized = false;
    
    // Animation states
    this.isAnimating = false;
    this.animationFrame = null;
    this.syncInterval = null;
    this.stateCheckInterval = null;
    this.particleAnimationFrame = null;
    
    // Tracking temps réel
    this.lastRealTimeUpdate = 0;
    
    // UIManager control
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    this.onPositioned = this.onPositioned.bind(this);
    console.log('🎮 [PokémonWeatherWidget] Instance créée - Style Pokémon Moderne');
  }

  // === 🎨 CRÉATION DU WIDGET POKÉMON ===
  createIcon() {
    console.log('🎮 [PokémonWeatherWidget] createIcon() - Style Pokémon Moderne');
    
    const existing = document.getElementById(this.id);
    if (existing) existing.remove();
    
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'pokemon-weather-widget ui-icon';
    el.innerHTML = `
      <!-- Pokéball Background -->
      <div class="pokeball-background">
        <div class="pokeball-top"></div>
        <div class="pokeball-bottom"></div>
        <div class="pokeball-center">
          <div class="pokeball-button"></div>
        </div>
      </div>
      
      <!-- Weather Particles -->
      <div class="weather-particles">
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
      </div>
      
      <!-- Main Widget Content -->
      <div class="widget-glass-container">
        <div class="widget-content">
          <!-- Header avec Zone -->
          <div class="header-section">
            <div class="zone-badge" id="${this.id}-zone">
              <span class="zone-icon">📍</span>
              <span class="zone-text">Village</span>
            </div>
          </div>
          
          <!-- Section Temps et Météo -->
          <div class="main-section">
            <div class="time-section">
              <div class="time-display">
                <div class="time-icon" id="${this.id}-time-icon">🕐</div>
                <div class="time-text">
                  <div class="time-main" id="${this.id}-time">12:00</div>
                  <div class="time-period" id="${this.id}-period">PM</div>
                </div>
              </div>
            </div>
            
            <div class="weather-section">
              <div class="weather-display">
                <div class="weather-icon-container">
                  <div class="weather-icon" id="${this.id}-weather-icon">☀️</div>
                  <div class="pokemon-type-icon" id="${this.id}-pokemon-icon">🔥</div>
                </div>
                <div class="weather-text">
                  <div class="weather-main" id="${this.id}-weather">Ciel dégagé</div>
                  <div class="weather-temp" id="${this.id}-temp">22°C</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Section Intensité Météo -->
          <div class="intensity-section">
            <div class="intensity-label">Intensité</div>
            <div class="intensity-bar">
              <div class="intensity-fill" id="${this.id}-intensity"></div>
            </div>
            <div class="intensity-value" id="${this.id}-intensity-value">75%</div>
          </div>
          
          <!-- Section Bonus Gameplay -->
          <div class="bonus-section" id="${this.id}-bonus">
            <div class="bonus-icon">🎮</div>
            <div class="bonus-text">+15% XP Pokémon Eau</div>
            <div class="bonus-type-icon">💧</div>
          </div>
        </div>
      </div>
      
      <!-- Glow Effects -->
      <div class="widget-glow" id="${this.id}-glow"></div>
    `;
    
    document.body.appendChild(el);
    this.element = el;
    
    this.injectStyles();
    this.connectToGlobalWeatherManager();
    
    // Mise à jour initiale
    this.updateTime(this.currentHour, this.isDayTime);
    this.updateWeather(this.weather.weather, this.weather.displayName, this.weather.temperature);
    this.updateZone(this.location);
    this.updateWeatherIntensity(this.weatherIntensity);
    this.updateGameplayBonus(this.gameplayBonus);
    
    this.startAnimations();
    this.startParticleAnimation();
    
    setTimeout(() => {
      this.forceImmediateSync();
      setTimeout(() => {
        this.updateCurrentZone();
      }, 200);
    }, 100);
    
    this.initialized = true;
    
    console.log('✨ [PokémonWeatherWidget] Widget Pokémon créé avec succès');
    return el;
  }

  // === 🌐 CONNEXION GLOBALE + ZONE MAPPING ===
  connectToGlobalWeatherManager() {
    this.initializeZoneMapping();
    
    if (window.globalWeatherManager && window.globalWeatherManager.isInitialized) {
      this.subscribeToWeatherUpdates();
      const currentTime = window.globalWeatherManager.getCurrentTime();
      const currentWeather = window.globalWeatherManager.getCurrentWeather();
      
      if (currentTime) {
        this.updateTime(currentTime.hour, currentTime.isDayTime);
      }
      if (currentWeather) {
        this.updateWeather(currentWeather.weather, currentWeather.displayName, '22°C');
      }
      
      this.updateCurrentZone();
    } else {
      setTimeout(() => this.connectToGlobalWeatherManager(), 100);
    }
  }

  // === 🗺️ INITIALISATION DU MAPPING DES ZONES ===
  initializeZoneMapping() {
    if (window.ZoneMapping && window.ZoneMapping.config) {
      this.zoneMapping = window.ZoneMapping;
      console.log('🗺️ [PokémonWeatherWidget] ZoneMapping connecté');
    } else {
      console.warn('⚠️ [PokémonWeatherWidget] ZoneMapping non disponible');
    }
  }

  // === 📍 MISE À JOUR DE LA ZONE ACTUELLE ===
  updateCurrentZone() {
    let currentZone = 'Village';
    
    try {
      // Méthode 1: Via Phaser scene manager
      if (window.game && window.game.scene && window.game.scene.getScenes) {
        const activeScenes = window.game.scene.getScenes(true);
        if (activeScenes.length > 0) {
          const currentScene = activeScenes[0];
          const sceneName = currentScene.constructor.name;
          
          if (this.zoneMapping && this.zoneMapping.sceneToZone) {
            const zoneName = this.zoneMapping.sceneToZone(sceneName);
            const zoneConfig = this.zoneMapping.getZoneConfig(zoneName);
            
            if (zoneConfig && zoneConfig.displayName) {
              currentZone = zoneConfig.displayName;
              console.log(`🎯 [PokémonWeatherWidget] Zone détectée: ${currentZone} (${sceneName})`);
            }
          }
        }
      }
      
      // Méthode 2: Via GlobalNetworkManager
      if (currentZone === 'Village' && window.globalNetworkManager && window.globalNetworkManager.room) {
        const room = window.globalNetworkManager.room;
        if (room.state && room.state.currentZone) {
          const serverZone = room.state.currentZone;
          
          if (this.zoneMapping && this.zoneMapping.getZoneConfig) {
            const zoneConfig = this.zoneMapping.getZoneConfig(serverZone);
            if (zoneConfig && zoneConfig.displayName) {
              currentZone = zoneConfig.displayName;
              console.log(`🌐 [PokémonWeatherWidget] Zone serveur: ${currentZone}`);
            }
          }
        }
      }
      
      // Méthode 3: Via PlayerManager
      if (currentZone === 'Village' && window.playerManager && window.playerManager.currentZone) {
        const playerZone = window.playerManager.currentZone;
        
        if (this.zoneMapping && this.zoneMapping.getZoneConfig) {
          const zoneConfig = this.zoneMapping.getZoneConfig(playerZone);
          if (zoneConfig && zoneConfig.displayName) {
            currentZone = zoneConfig.displayName;
            console.log(`👤 [PokémonWeatherWidget] Zone joueur: ${currentZone}`);
          }
        }
      }
      
    } catch (error) {
      console.warn('⚠️ [PokémonWeatherWidget] Erreur détection zone:', error);
    }
    
    this.updateZone(currentZone);
  }

  forceImmediateSync() {
    if (window.globalWeatherManager && window.globalWeatherManager.isInitialized) {
      const currentTime = window.globalWeatherManager.getCurrentTime();
      const currentWeather = window.globalWeatherManager.getCurrentWeather();
      
      if (currentTime) {
        this.updateTime(currentTime.hour, currentTime.isDayTime);
      }
      if (currentWeather) {
        this.updateWeather(currentWeather.weather, currentWeather.displayName, '22°C');
      }
    }
    
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      const room = window.globalNetworkManager.room;
      const serverTime = { hour: room.state.gameHour, isDayTime: room.state.isDayTime };
      const serverWeather = { weather: room.state.weather, displayName: this.getWeatherDisplayName(room.state.weather) };
      
      this.updateTime(serverTime.hour, serverTime.isDayTime);
      this.updateWeather(serverWeather.weather, serverWeather.displayName, '22°C');
    }
  }

  subscribeToWeatherUpdates() {
    if (window.globalWeatherManager && typeof window.globalWeatherManager.onTimeChange === 'function') {
      window.globalWeatherManager.onTimeChange((hour, isDayTime) => {
        this.updateTime(hour, isDayTime);
        this.lastRealTimeUpdate = Date.now();
      });
      
      window.globalWeatherManager.onWeatherChange((weather, displayName) => {
        this.updateWeather(weather, displayName, '22°C');
        this.lastRealTimeUpdate = Date.now();
      });
    }
    
    this.startIntelligentPolling();
  }

  startIntelligentPolling() {
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      const room = window.globalNetworkManager.room;
      let lastState = {
        gameHour: room.state.gameHour,
        isDayTime: room.state.isDayTime,
        weather: room.state.weather,
        currentZone: room.state.currentZone || null
      };
      
      this.stateCheckInterval = setInterval(() => {
        const currentState = {
          gameHour: room.state.gameHour,
          isDayTime: room.state.isDayTime,
          weather: room.state.weather,
          currentZone: room.state.currentZone || null
        };
        
        if (currentState.gameHour !== lastState.gameHour || currentState.isDayTime !== lastState.isDayTime) {
          this.updateTime(currentState.gameHour, currentState.isDayTime);
        }
        
        if (currentState.weather !== lastState.weather) {
          const displayName = this.getWeatherDisplayName(currentState.weather);
          this.updateWeather(currentState.weather, displayName, '22°C');
        }
        
        if (currentState.currentZone !== lastState.currentZone && currentState.currentZone) {
          this.updateCurrentZone();
        }
        
        lastState = currentState;
      }, 500);
    }
  }

  getWeatherDisplayName(weatherName) {
    const weatherNames = {
      'clear': 'Ciel dégagé',
      'rain': 'Pluie',
      'storm': 'Orage',
      'snow': 'Neige',
      'fog': 'Brouillard',
      'cloudy': 'Nuageux'
    };
    return weatherNames[weatherName] || weatherName;
  }

  // === 🎮 MÉTHODES DE MISE À JOUR POKÉMON ===
  updateTime(hour, isDayTime) {
    this.currentHour = hour;
    this.isDayTime = isDayTime;
    if (!this.element) return;
    
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'AM' : 'PM';
    
    const timeIcons = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    const timeIcon = timeIcons[h12 - 1] || '🕐';
    
    const timeElement = this.element.querySelector('.time-main');
    const periodElement = this.element.querySelector('.time-period');
    const timeIconElement = this.element.querySelector('.time-icon');
    
    if (timeElement) timeElement.textContent = `${h12}:00`;
    if (periodElement) periodElement.textContent = period;
    if (timeIconElement) timeIconElement.textContent = timeIcon;
    
    this.updateDayNightTheme(isDayTime);
  }

  updateWeather(weather, displayName, temperature = '22°C') {
    this.weather = { weather, displayName, temperature };
    if (!this.element) return;
    
    const pokemonWeather = this.pokemonWeatherIcons[weather] || this.pokemonWeatherIcons.clear;
    
    const weatherElement = this.element.querySelector('.weather-main');
    const tempElement = this.element.querySelector('.weather-temp');
    const weatherIconElement = this.element.querySelector('.weather-icon');
    const pokemonIconElement = this.element.querySelector('.pokemon-type-icon');
    const glassContainer = this.element.querySelector('.widget-glass-container');
    
    if (weatherElement) weatherElement.textContent = displayName;
    if (tempElement) tempElement.textContent = temperature;
    if (weatherIconElement) weatherIconElement.textContent = pokemonWeather.icon;
    if (pokemonIconElement) pokemonIconElement.textContent = pokemonWeather.pokemon;
    
    if (glassContainer) {
      glassContainer.style.background = pokemonWeather.gradient;
    }
    
    this.updateWeatherParticles(pokemonWeather.particles);
    this.updateWeatherGlow(pokemonWeather.color);
    
    this.updateGameplayBonus({
      active: true,
      text: `+15% XP Pokémon ${pokemonWeather.bonus}`,
      type: weather
    });
  }

  updateZone(zoneName) {
    this.location = zoneName;
    const zoneElement = this.element?.querySelector('.zone-text');
    if (zoneElement) zoneElement.textContent = zoneName;
  }

  updateWeatherIntensity(intensity) {
    this.weatherIntensity = Math.max(0, Math.min(100, intensity));
    
    const intensityFill = this.element?.querySelector('.intensity-fill');
    const intensityValue = this.element?.querySelector('.intensity-value');
    
    if (intensityFill) {
      intensityFill.style.width = `${this.weatherIntensity}%`;
      
      const color = this.weatherIntensity < 30 ? '#10b981' : 
                   this.weatherIntensity < 70 ? '#f59e0b' : '#ef4444';
      intensityFill.style.background = `linear-gradient(90deg, ${color}, ${color}aa)`;
    }
    
    if (intensityValue) {
      intensityValue.textContent = `${this.weatherIntensity}%`;
    }
  }

  updateGameplayBonus(bonus) {
    this.gameplayBonus = bonus;
    const bonusSection = this.element?.querySelector('.bonus-section');
    const bonusText = this.element?.querySelector('.bonus-text');
    const bonusTypeIcon = this.element?.querySelector('.bonus-type-icon');
    
    if (bonusSection) {
      bonusSection.style.display = bonus.active ? 'flex' : 'none';
    }
    
    if (bonusText) bonusText.textContent = bonus.text;
    if (bonusTypeIcon && bonus.type) {
      const typeIcon = this.pokemonWeatherIcons[bonus.type]?.pokemon || '🎮';
      bonusTypeIcon.textContent = typeIcon;
    }
  }

  updateDayNightTheme(isDayTime) {
    if (!this.element) return;
    
    const widget = this.element;
    if (isDayTime) {
      widget.classList.remove('night-theme');
      widget.classList.add('day-theme');
    } else {
      widget.classList.remove('day-theme');
      widget.classList.add('night-theme');
    }
  }

  updateWeatherParticles(particleType) {
    const particles = this.element?.querySelectorAll('.particle');
    particles?.forEach(particle => {
      particle.textContent = particleType;
    });
  }

  updateWeatherGlow(color) {
    const glowElement = this.element?.querySelector('.widget-glow');
    if (glowElement) {
      glowElement.style.background = `radial-gradient(circle at 50% 50%, ${color}33 0%, transparent 70%)`;
    }
  }

  // === ✨ ANIMATIONS POKÉMON ===
  startAnimations() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animateElements();
  }

  animateElements() {
    if (!this.element || !this.isAnimating) return;
    
    const timeIcon = this.element.querySelector('.time-icon');
    const weatherIcon = this.element.querySelector('.weather-icon');
    const pokemonIcon = this.element.querySelector('.pokemon-type-icon');
    const pokeball = this.element.querySelector('.pokeball-background');
    
    const time = Date.now() * 0.001;
    
    if (timeIcon) {
      const rotation = Math.sin(time) * 3;
      timeIcon.style.transform = `rotate(${rotation}deg)`;
    }
    
    if (weatherIcon) {
      const scale = 1 + Math.sin(time * 1.5) * 0.05;
      weatherIcon.style.transform = `scale(${scale})`;
    }
    
    if (pokemonIcon) {
      const bounce = Math.sin(time * 2) * 0.03;
      pokemonIcon.style.transform = `translateY(${bounce}px) scale(${1 + bounce})`;
    }
    
    if (pokeball) {
      const rotation = (time * 10) % 360;
      pokeball.style.transform = `rotate(${rotation}deg)`;
    }
    
    this.animationFrame = requestAnimationFrame(() => this.animateElements());
  }

  startParticleAnimation() {
    if (!this.element) return;
    
    const particles = this.element.querySelectorAll('.particle');
    
    const animateParticles = () => {
      const time = Date.now() * 0.001;
      
      particles.forEach((particle, index) => {
        const delay = index * 0.5;
        const x = Math.sin(time + delay) * 20;
        const y = Math.cos(time * 0.8 + delay) * 15;
        const opacity = 0.3 + Math.sin(time + delay) * 0.2;
        
        particle.style.transform = `translate(${x}px, ${y}px)`;
        particle.style.opacity = opacity;
      });
      
      this.particleAnimationFrame = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
  }

  stopAnimations() {
    this.isAnimating = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.particleAnimationFrame) {
      cancelAnimationFrame(this.particleAnimationFrame);
      this.particleAnimationFrame = null;
    }
  }

  // === 🎛️ MÉTHODES UIMANAGER ===
  show() {
    this.isVisible = true;
    if (this.element) {
      this.element.classList.remove('ui-hidden', 'hidden');
      this.element.classList.add('ui-fade-in');
      this.element.style.display = 'flex';
      this.element.style.visibility = 'visible';
      this.element.style.opacity = '1';
      
      this.startAnimations();
      this.startParticleAnimation();
      
      setTimeout(() => this.element.classList.remove('ui-fade-in'), 500);
    }
    return true;
  }

  hide() {
    this.isVisible = false;
    if (this.element) {
      this.element.classList.add('ui-fade-out');
      this.stopAnimations();
      
      setTimeout(() => {
        this.element.classList.add('ui-hidden');
        this.element.classList.remove('ui-fade-out');
        this.element.style.display = 'none';
      }, 300);
    }
    return true;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (this.element) {
      if (enabled) {
        this.element.classList.remove('ui-disabled', 'disabled');
        this.element.style.opacity = '1';
        this.element.style.pointerEvents = 'auto';
        this.startAnimations();
        this.startParticleAnimation();
      } else {
        this.element.classList.add('ui-disabled');
        this.element.style.opacity = '0.5';
        this.element.style.pointerEvents = 'none';
        this.stopAnimations();
      }
    }
    return true;
  }

  onPositioned(position) {
    if (this.element) {
      this.element.setAttribute('data-positioned-by', 'uimanager');
      this.element.setAttribute('data-position', JSON.stringify(position));
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
        console.warn('⚠️ Position data invalide');
      }
    }
    
    const computed = window.getComputedStyle(this.element);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }

  // === 🎨 INJECTION DES STYLES CSS ===
  injectStyles() {
    if (document.getElementById('pokemon-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'pokemon-weather-widget-css';
    style.textContent = POKEMON_WEATHER_STYLES;
    document.head.appendChild(style);
    console.log('🎨 [PokémonWeatherWidget] Styles Pokémon injectés depuis fichier séparé');
  }

  // === 🧹 DESTRUCTION ===
  destroy() {
    this.stopAnimations();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    const style = document.getElementById('pokemon-weather-widget-css');
    if (style) {
      style.remove();
    }
    
    this.element = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.initialized = false;
    
    console.log('🧹 [PokémonWeatherWidget] Widget Pokémon détruit');
  }

  // === 🐛 DEBUG ===
  debugInfo() {
    return {
      id: this.id,
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      initialized: this.initialized,
      isAnimating: this.isAnimating,
      hasElement: !!this.element,
      elementInDOM: this.element ? document.contains(this.element) : false,
      positioningMode: this.positioningMode,
      uiManagerControlled: this.uiManagerControlled,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      currentTime: `${this.currentHour}:00 ${this.isDayTime ? 'Day' : 'Night'}`,
      currentWeather: this.weather,
      weatherIntensity: this.weatherIntensity,
      location: this.location,
      gameplayBonus: this.gameplayBonus,
      theme: this.isDayTime ? 'day' : 'night',
      pokemonWeatherData: this.pokemonWeatherIcons[this.weather.weather],
      elementStyles: this.element ? {
        position: this.element.style.position,
        left: this.element.style.left,
        top: this.element.style.top,
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
