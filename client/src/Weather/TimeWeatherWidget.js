// === 🎨 STYLES POKÉMON (IMPORT DU CSS SÉPARÉ) ===
  injectStyles() {
    if (document.getElementById('pokemon-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'pokemon-weather-widget-css';
    style.textContent = POKEMON_WEATHER_STYLES;
    document.head.appendChild(style);
    console.log('🎨 [PokémonWeatherWidget] Styles Pokémon injectés depuis fichier séparé');
  }// ui/TimeWeatherWidget.js - Style Pokémon Moderne
import { POKEMON_WEATHER_STYLES } from './PokemonWeatherStyles.js';

export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right';
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear', temperature: '22°C' };
    this.location = 'Village'; // Zone par défaut
    this.weatherIntensity = 75; // 0-100%
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
    
    setTimeout(() => this.forceImmediateSync(), 100);
    this.initialized = true;
    
    console.log('✨ [PokémonWeatherWidget] Widget Pokémon créé avec succès');
    return el;
  }

  // === 🌐 CONNEXION GLOBALE + ZONE MAPPING ===
  connectToGlobalWeatherManager() {
    // Import du mapping des zones
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
      
      // 🎯 RÉCUPÉRER LA ZONE ACTUELLE
      this.updateCurrentZone();
    } else {
      setTimeout(() => this.connectToGlobalWeatherManager(), 100);
    }
  }

  // === 🗺️ INITIALISATION DU MAPPING DES ZONES ===
  initializeZoneMapping() {
    // Vérifier si le ZoneMapping est disponible
    if (window.ZoneMapping && window.ZoneMapping.config) {
      this.zoneMapping = window.ZoneMapping;
      console.log('🗺️ [PokémonWeatherWidget] ZoneMapping connecté');
    } else {
      console.warn('⚠️ [PokémonWeatherWidget] ZoneMapping non disponible');
    }
  }

  // === 📍 MISE À JOUR DE LA ZONE ACTUELLE ===
  updateCurrentZone() {
    let currentZone = 'Village'; // Fallback
    
    try {
      // Méthode 1: Via Phaser scene manager
      if (window.game && window.game.scene && window.game.scene.getScenes) {
        const activeScenes = window.game.scene.getScenes(true);
        if (activeScenes.length > 0) {
          const currentScene = activeScenes[0];
          const sceneName = currentScene.constructor.name;
          
          // Convertir le nom de scène en zone avec le mapping
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
    
    // Mettre à jour la zone affichée
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
        
        // 🎯 NOUVEAU: Vérifier les changements de zone
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

  // === 🎮 NOUVELLES MÉTHODES DE MISE À JOUR POKÉMON ===
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
    
    // Mise à jour du gradient dynamique
    if (glassContainer) {
      glassContainer.style.background = pokemonWeather.gradient;
    }
    
    // Mise à jour des particules
    this.updateWeatherParticles(pokemonWeather.particles);
    this.updateWeatherGlow(pokemonWeather.color);
    
    // Mise à jour du bonus
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
      
      // Couleur dynamique selon intensité
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
    
    // Animation subtile des icônes
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
    
    // Rotation de la Pokéball
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

  // === 🎛️ MÉTHODES UIMANAGER (identiques) ===
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

  // === 🎨 STYLES CSS POKÉMON ===
  injectStyles() {
    if (document.getElementById('pokemon-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'pokemon-weather-widget-css';
    style.textContent = this.getPokemonStyles();
    document.head.appendChild(style);
  }

  getPokemonStyles() {
    return `
      .pokemon-weather-widget.ui-icon {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 340px !important;
        height: 140px !important;
        min-width: 340px !important;
        max-width: 340px !important;
        min-height: 140px !important;
        max-height: 140px !important;
        background: transparent;
        border: none;
        border-radius: 0;
        font-family: 'Segoe UI', 'Roboto', sans-serif;
        user-select: none;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
        margin-top: 20px;
        margin-right: 20px;
        overflow: hidden;
      }
      
      /* === 🎮 POKÉBALL BACKGROUND === */
      .pokemon-weather-widget .pokeball-background {
        position: absolute;
        top: -20px;
        right: -20px;
        width: 80px;
        height: 80px;
        opacity: 0.1;
        z-index: 1;
        animation: pokeball-spin 20s linear infinite;
      }
      
      .pokemon-weather-widget .pokeball-top {
        width: 100%;
        height: 50%;
        background: linear-gradient(to bottom, #ff4444, #cc3333);
        border-radius: 40px 40px 0 0;
        position: relative;
      }
      
      .pokemon-weather-widget .pokeball-bottom {
        width: 100%;
        height: 50%;
        background: linear-gradient(to top, #ffffff, #f0f0f0);
        border-radius: 0 0 40px 40px;
      }
      
      .pokemon-weather-widget .pokeball-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: #333;
        border-radius: 50%;
        border: 3px solid #555;
      }
      
      .pokemon-weather-widget .pokeball-button {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
      }
      
      /* === ✨ WEATHER PARTICLES === */
      .pokemon-weather-widget .weather-particles {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 2;
      }
      
      .pokemon-weather-widget .particle {
        position: absolute;
        font-size: 12px;
        opacity: 0.4;
        animation: particle-float 3s ease-in-out infinite;
      }
      
      .pokemon-weather-widget .particle-1 {
        top: 20%;
        left: 15%;
        animation-delay: 0s;
      }
      
      .pokemon-weather-widget .particle-2 {
        top: 60%;
        right: 20%;
        animation-delay: 1s;
      }
      
      .pokemon-weather-widget .particle-3 {
        bottom: 30%;
        left: 70%;
        animation-delay: 2s;
      }
      
      /* === 🌟 GLASSMORPHISM CONTAINER === */
      .pokemon-weather-widget .widget-glass-container {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #ff9a56 0%, #ffcc33 100%);
        backdrop-filter: blur(15px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1);
        z-index: 3;
        transition: all 0.5s ease;
      }
      
      .pokemon-weather-widget .widget-content {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 16px;
        gap: 12px;
        z-index: 4;
      }
      
      /* === 📍 HEADER SECTION === */
      .pokemon-weather-widget .header-section {
        display: flex;
        justify-content: center;
        margin-bottom: 4px;
      }
      
      .pokemon-weather-widget .zone-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        padding: 4px 12px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .pokemon-weather-widget .zone-icon {
        font-size: 12px;
      }
      
      .pokemon-weather-widget .zone-text {
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      /* === ⏰ MAIN SECTION === */
      .pokemon-weather-widget .main-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex: 1;
      }
      
      .pokemon-weather-widget .time-section {
        flex: 1;
      }
      
      .pokemon-weather-widget .weather-section {
        flex: 1;
      }
      
      .pokemon-weather-widget .time-display,
      .pokemon-weather-widget .weather-display {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .pokemon-weather-widget .weather-display {
        justify-content: flex-end;
      }
      
      .pokemon-weather-widget .time-icon,
      .pokemon-weather-widget .weather-icon {
        font-size: 28px;
        transition: transform 0.3s ease;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
      }
      
      .pokemon-weather-widget .weather-icon-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .pokemon-weather-widget .pokemon-type-icon {
        position: absolute;
        bottom: -5px;
        right: -5px;
        font-size: 16px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        padding: 2px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        animation: pokemon-bounce 2s ease-in-out infinite;
      }
      
      .pokemon-weather-widget .time-text,
      .pokemon-weather-widget .weather-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .pokemon-weather-widget .time-main,
      .pokemon-weather-widget .weather-main {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      
      .pokemon-weather-widget .time-period,
      .pokemon-weather-widget .weather-temp {
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        letter-spacing: 0.25px;
        white-space: nowrap;
      }
      
      /* === 📊 INTENSITY SECTION === */
      .pokemon-weather-widget .intensity-section {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        padding: 6px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .pokemon-weather-widget .intensity-label {
        font-size: 10px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        min-width: 45px;
      }
      
      .pokemon-weather-widget .intensity-bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .pokemon-weather-widget .intensity-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #10b981aa);
        border-radius: 3px;
        transition: all 0.5s ease;
        animation: intensity-pulse 2s ease-in-out infinite;
      }
      
      .pokemon-weather-widget .intensity-value {
        font-size: 10px;
        font-weight: 600;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        min-width: 25px;
        text-align: right;
      }
      
      /* === 🎮 BONUS SECTION === */
      .pokemon-weather-widget .bonus-section {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        padding: 6px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        animation: bonus-glow 3s ease-in-out infinite;
      }
      
      .pokemon-weather-widget .bonus-icon {
        font-size: 14px;
        animation: bonus-spin 4s linear infinite;
      }
      
      .pokemon-weather-widget .bonus-text {
        flex: 1;
        font-size: 11px;
        font-weight: 600;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      .pokemon-weather-widget .bonus-type-icon {
        font-size: 14px;
        animation: type-pulse 2s ease-in-out infinite;
      }
      
      /* === 🌟 GLOW EFFECTS === */
      .pokemon-weather-widget .widget-glow {
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        background: radial-gradient(circle at 50% 50%, rgba(255, 154, 86, 0.3) 0%, transparent 70%);
        border-radius: 25px;
        z-index: -1;
        opacity: 0.8;
        transition: all 0.5s ease;
      }
      
      /* === 🌙 THEMES JOUR/NUIT === */
      .pokemon-weather-widget.day-theme .widget-glass-container {
        border: 1px solid rgba(255, 215, 0, 0.4);
        box-shadow: 
          0 8px 32px rgba(255, 215, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1);
      }
      
      .pokemon-weather-widget.night-theme .widget-glass-container {
        border: 1px solid rgba(139, 92, 246, 0.4);
        box-shadow: 
          0 8px 32px rgba(139, 92, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      }
      
      .pokemon-weather-widget.day-theme .zone-badge,
      .pokemon-weather-widget.day-theme .intensity-section,
      .pokemon-weather-widget.day-theme .bonus-section {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 215, 0, 0.3);
      }
      
      .pokemon-weather-widget.night-theme .zone-badge,
      .pokemon-weather-widget.night-theme .intensity-section,
      .pokemon-weather-widget.night-theme .bonus-section {
        background: rgba(0, 0, 0, 0.4);
        border-color: rgba(139, 92, 246, 0.3);
      }
      
      /* === 🎭 ÉTATS UI === */
      .pokemon-weather-widget.ui-disabled {
        opacity: 0.4;
        filter: grayscale(80%);
        pointer-events: none;
      }
      
      .pokemon-weather-widget.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-20px) scale(0.9);
      }
      
      .pokemon-weather-widget.ui-fade-in {
        animation: pokemon-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .pokemon-weather-widget.ui-fade-out {
        animation: pokemon-fade-out 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* === ✨ ANIMATIONS POKÉMON === */
      @keyframes pokeball-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes particle-float {
        0%, 100% {
          transform: translateY(0px);
          opacity: 0.3;
        }
        50% {
          transform: translateY(-10px);
          opacity: 0.6;
        }
      }
      
      @keyframes pokemon-bounce {
        0%, 100% {
          transform: scale(1) translateY(0px);
        }
        50% {
          transform: scale(1.1) translateY(-2px);
        }
      }
      
      @keyframes intensity-pulse {
        0%, 100% {
          box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.2);
        }
        50% {
          box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.4);
        }
      }
      
      @keyframes bonus-glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
        }
        50% {
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
        }
      }
      
      @keyframes bonus-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes type-pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.2);
        }
      }
      
      @keyframes pokemon-fade-in {
        0% {
          opacity: 0;
          transform: translateY(-30px) scale(0.8) rotateX(20deg);
        }
        100% {
          opacity: 1;
          transform: translateY(0px) scale(1) rotateX(0deg);
        }
      }
      
      @keyframes pokemon-fade-out {
        0% {
          opacity: 1;
          transform: translateY(0px) scale(1) rotateX(0deg);
        }
        100% {
          opacity: 0;
          transform: translateY(-20px) scale(0.9) rotateX(-10deg);
        }
      }
      
      /* === 🎮 HOVER EFFECTS === */
      .pokemon-weather-widget:hover {
        transform: translateY(-3px);
      }
      
      .pokemon-weather-widget:hover .widget-glow {
        opacity: 1;
        transform: scale(1.05);
      }
      
      .pokemon-weather-widget:hover .time-icon,
      .pokemon-weather-widget:hover .weather-icon {
        transform: scale(1.1) rotate(5deg);
      }
      
      .pokemon-weather-widget:hover .pokemon-type-icon {
        animation: pokemon-bounce 0.6s ease-in-out infinite;
      }
      
      .pokemon-weather-widget:hover .pokeball-background {
        opacity: 0.2;
        animation-duration: 10s;
      }
      
      .pokemon-weather-widget:hover .particle {
        opacity: 0.7;
        animation-duration: 2s;
      }
      
      /* === 📱 RESPONSIVE === */
      @media (max-width: 800px) {
        .pokemon-weather-widget.ui-icon {
          width: 280px !important;
          height: 120px !important;
          min-width: 280px !important;
          max-width: 280px !important;
          min-height: 120px !important;
          max-height: 120px !important;
        }
        
        .pokemon-weather-widget .widget-content {
          padding: 12px;
          gap: 8px;
        }
        
        .pokemon-weather-widget .time-icon,
        .pokemon-weather-widget .weather-icon {
          font-size: 24px;
        }
        
        .pokemon-weather-widget .pokemon-type-icon {
          font-size: 14px;
        }
        
        .pokemon-weather-widget .time-main,
        .pokemon-weather-widget .weather-main {
          font-size: 14px;
        }
        
        .pokemon-weather-widget .time-period,
        .pokemon-weather-widget .weather-temp {
          font-size: 10px;
        }
        
        .pokemon-weather-widget .zone-text {
          font-size: 11px;
        }
        
        .pokemon-weather-widget .bonus-text {
          font-size: 10px;
        }
        
        .pokemon-weather-widget .pokeball-background {
          width: 60px;
          height: 60px;
          top: -15px;
          right: -15px;
        }
      }
      
      /* === ⚡ INDICATEUR UIMANAGER === */
      .pokemon-weather-widget[data-positioned-by="uimanager"]::before {
        content: "⚡";
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 14px;
        opacity: 0.8;
        pointer-events: none;
        animation: sparkle 2s ease-in-out infinite;
        z-index: 10;
        background: rgba(255, 215, 0, 0.2);
        border-radius: 50%;
        padding: 2px;
      }
      
      @keyframes sparkle {
        0%, 100% {
          opacity: 0.8;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.3);
        }
      }
      
      /* === 🌈 GRADIENTS MÉTÉO SPÉCIAUX === */
      .pokemon-weather-widget.weather-rain .widget-glass-container {
        background: linear-gradient(135deg, #3b82f6 0%, #64748b 100%) !important;
      }
      
      .pokemon-weather-widget.weather-storm .widget-glass-container {
        background: linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%) !important;
      }
      
      .pokemon-weather-widget.weather-snow .widget-glass-container {
        background: linear-gradient(135deg, #60a5fa 0%, #f8fafc 100%) !important;
      }
      
      .pokemon-weather-widget.weather-fog .widget-glass-container {
        background: linear-gradient(135deg, #9ca3af 0%, #f3f4f6 100%) !important;
      }
      
      .pokemon-weather-widget.weather-cloudy .widget-glass-container {
        background: linear-gradient(135deg, #6b7280 0%, #d1d5db 100%) !important;
      }
    `;
  }

      
      /* === 📱 RESPONSIVE === */
      @media (max-width: 800px) {
        .pokemon-weather-widget.ui-icon {
          width: 280px !important;
          height: 120px !important;
          min-width: 280px !important;
          max-width: 280px !important;
          min-height: 120px !important;
          max-height: 120px !important;
          margin-right: 80px;
        }
        
        .pokemon-weather-widget .widget-content {
          padding: 12px;
          gap: 8px;
        }
        
        .pokemon-weather-widget .time-icon,
        .pokemon-weather-widget .weather-icon {
          font-size: 24px;
        }
        
        .pokemon-weather-widget .pokemon-type-icon {
          font-size: 14px;
        }
        
        .pokemon-weather-widget .time-main,
        .pokemon-weather-widget .weather-main {
          font-size: 14px;
        }
        
        .pokemon-weather-widget .time-period,
        .pokemon-weather-widget .weather-temp {
          font-size: 10px;
        }
        
        .pokemon-weather-widget .zone-text {
          font-size: 11px;
        }
        
        .pokemon-weather-widget .bonus-text {
          font-size: 10px;
        }
        
        .pokemon-weather-widget .intensity-label,
        .pokemon-weather-widget .intensity-value {
          font-size: 9px;
        }
        
        .pokemon-weather-widget .pokeball-background {
          width: 60px;
          height: 60px;
          top: -15px;
          right: -15px;
        }
      }
      
      @media (max-width: 480px) {
        .pokemon-weather-widget.ui-icon {
          width: 240px !important;
          height: 100px !important;
          min-width: 240px !important;
          max-width: 240px !important;
          min-height: 100px !important;
          max-height: 100px !important;
          margin-right: 40px;
        }
        
        .pokemon-weather-widget .widget-content {
          padding: 10px;
          gap: 6px;
        }
        
        .pokemon-weather-widget .time-icon,
        .pokemon-weather-widget .weather-icon {
          font-size: 20px;
        }
        
        .pokemon-weather-widget .time-main,
        .pokemon-weather-widget .weather-main {
          font-size: 12px;
        }
        
        .pokemon-weather-widget .intensity-section,
        .pokemon-weather-widget .bonus-section {
          padding: 4px 8px;
        }
      }
      
      /* === ⚡ INDICATEUR UIMANAGER === */
      .pokemon-weather-widget[data-positioned-by="uimanager"]::before {
        content: "⚡";
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 14px;
        opacity: 0.8;
        pointer-events: none;
        animation: sparkle 2s ease-in-out infinite;
        z-index: 10;
        background: rgba(255, 215, 0, 0.2);
        border-radius: 50%;
        padding: 2px;
      }
      
      @keyframes sparkle {
        0%, 100% {
          opacity: 0.8;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.3);
        }
      }
      
      /* === 🌟 EFFETS SPÉCIAUX MÉTÉO === */
      .pokemon-weather-widget.weather-rain .particle {
        color: #3b82f6;
        animation: rain-drop 2s linear infinite;
      }
      
      .pokemon-weather-widget.weather-storm .particle {
        color: #6366f1;
        animation: lightning-flash 1s ease-in-out infinite;
      }
      
      .pokemon-weather-widget.weather-snow .particle {
        color: #60a5fa;
        animation: snow-fall 4s linear infinite;
      }
      
      @keyframes rain-drop {
        0% {
          transform: translateY(-20px);
          opacity: 0;
        }
        50% {
          opacity: 0.8;
        }
        100% {
          transform: translateY(20px);
          opacity: 0;
        }
      }
      
      @keyframes lightning-flash {
        0%, 90%, 100% {
          opacity: 0.3;
        }
        5%, 85% {
          opacity: 1;
          text-shadow: 0 0 10px #6366f1;
        }
      }
      
      @keyframes snow-fall {
        0% {
          transform: translateY(-20px) rotate(0deg);
          opacity: 0;
        }
        50% {
          opacity: 0.8;
        }
        100% {
          transform: translateY(20px) rotate(360deg);
          opacity: 0;
        }
      }
      
      /* === 🎯 FOCUS & ACCESSIBILITY === */
      .pokemon-weather-widget:focus-within {
        outline: 2px solid rgba(59, 130, 246, 0.5);
        outline-offset: 4px;
      }
      
      .pokemon-weather-widget button:focus {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
      }
      
      /* === 🌈 COULEURS TYPES POKÉMON === */
      .pokemon-weather-widget .bonus-type-icon.type-fire {
        color: #ff6666;
        text-shadow: 0 0 8px #ff6666;
      }
      
      .pokemon-weather-widget .bonus-type-icon.type-water {
        color: #6666ff;
        text-shadow: 0 0 8px #6666ff;
      }
      
      .pokemon-weather-widget .bonus-type-icon.type-electric {
        color: #ffff66;
        text-shadow: 0 0 8px #ffff66;
      }
      
      .pokemon-weather-widget .bonus-type-icon.type-ice {
        color: #66ffff;
        text-shadow: 0 0 8px #66ffff;
      }
      
      .pokemon-weather-widget .bonus-type-icon.type-ghost {
        color: #9966ff;
        text-shadow: 0 0 8px #9966ff;
      }
      
      .pokemon-weather-widget .bonus-type-icon.type-flying {
        color: #cccccc;
        text-shadow: 0 0 8px #cccccc;
      }
      
      /* === 🎮 GAMING PERFORMANCE OPTIMIZATIONS === */
      .pokemon-weather-widget {
        will-change: transform, opacity;
        backface-visibility: hidden;
        perspective: 1000px;
      }
      
      .pokemon-weather-widget .pokeball-background,
      .pokemon-weather-widget .particle,
      .pokemon-weather-widget .time-icon,
      .pokemon-weather-widget .weather-icon,
      .pokemon-weather-widget .pokemon-type-icon {
        will-change: transform;
        backface-visibility: hidden;
      }
      
      /* === 🌙 DARK MODE OVERRIDES === */
      @media (prefers-color-scheme: dark) {
        .pokemon-weather-widget .widget-glass-container {
          backdrop-filter: blur(20px);
        }
        
        .pokemon-weather-widget .zone-badge,
        .pokemon-weather-widget .intensity-section,
        .pokemon-weather-widget .bonus-section {
          background: rgba(0, 0, 0, 0.5);
        }
      }
      
      /* === 🎊 EASTER EGGS === */
      .pokemon-weather-widget.shiny {
        animation: shiny-sparkle 3s ease-in-out infinite;
      }
      
      @keyframes shiny-sparkle {
        0%, 100% {
          filter: hue-rotate(0deg) brightness(1);
        }
        25% {
          filter: hue-rotate(90deg) brightness(1.2);
        }
        50% {
          filter: hue-rotate(180deg) brightness(1.4);
        }
        75% {
          filter: hue-rotate(270deg) brightness(1.2);
        }
      }
    `;
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

export default TimeWeatherWidget
