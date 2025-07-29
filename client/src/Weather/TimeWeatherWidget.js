// ui/TimeWeatherWidget.js - Style UNIFIÉ avec traductions temps réel
// 🎯 Palette cohérente + effets météo subtils + 🌐 TRADUCTIONS AUTOMATIQUES
import { POKEMON_WEATHER_STYLES } from './PokemonWeatherStyles.js';
import { t } from '../managers/LocalizationManager.js';

export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right';
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear', temperature: '22°C' };
    this.location = 'Village';
    this.gameplayBonus = { active: true, text: '+15% XP Pokémon Eau', type: 'water' };
    this.lastWeatherSent = null;

    // 🌐 NOUVEAU: Support traductions
    this.optionsManager = options.optionsManager || null;
    this.languageListeners = [];
    this.translationsReady = false;

    // 🎨 CONFIGURATION MÉTÉO UNIFIÉE AVEC ACCENTS PRONONCÉS
    this.pokemonWeatherConfig = {
      clear: { 
        icon: '☀️', 
        pokemon: '🔥', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)', // Base uniforme
        particles: '✨',
        bonus: 'fire', // ← Changé pour clé de traduction
        color: '#ffd700', // Doré vif
        particleCount: 6,
        accentColor: '#ffb347',
        glowColor: 'rgba(255, 215, 0, 0.8)',
        borderColor: '#ffd700'
      },
      rain: { 
        icon: '🌧️', 
        pokemon: '💧', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)',
        particles: '💧',
        bonus: 'water', // ← Changé pour clé de traduction
        color: '#3b82f6',
        particleCount: 8,
        accentColor: '#60a5fa',
        glowColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6'
      },
      storm: { 
        icon: '⚡', 
        pokemon: '⚡', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)',
        particles: '⚡',
        bonus: 'electric', // ← Changé pour clé de traduction
        color: '#8b5cf6',
        particleCount: 10,
        accentColor: '#a78bfa',
        glowColor: 'rgba(139, 92, 246, 1)',
        borderColor: '#8b5cf6'
      },
      snow: { 
        icon: '❄️', 
        pokemon: '🧊', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)',
        particles: '❄️',
        bonus: 'ice', // ← Changé pour clé de traduction
        color: '#60a5fa',
        particleCount: 12,
        accentColor: '#93c5fd',
        glowColor: 'rgba(96, 165, 250, 0.8)',
        borderColor: '#60a5fa'
      },
      fog: { 
        icon: '🌫️', 
        pokemon: '👻', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)',
        particles: '🌫️',
        bonus: 'ghost', // ← Changé pour clé de traduction
        color: '#9ca3af',
        particleCount: 5,
        accentColor: '#d1d5db',
        glowColor: 'rgba(156, 163, 175, 0.5)',
        borderColor: '#9ca3af'
      },
      cloudy: { 
        icon: '☁️', 
        pokemon: '🌪️', 
        gradient: 'linear-gradient(145deg, #2a3f5f, #1e2d42)',
        particles: '☁️',
        bonus: 'flying', // ← Changé pour clé de traduction
        color: '#6b7280',
        particleCount: 4,
        accentColor: '#9ca3af',
        glowColor: 'rgba(107, 114, 128, 0.5)',
        borderColor: '#6b7280'
      }
    };
    
    // États UIManager
    this.isVisible = true;
    this.isEnabled = true;
    this.initialized = false;
    
    // Animation et synchronisation
    this.isAnimating = false;
    this.animationFrame = null;
    this.particleAnimationFrame = null;
    this.syncInterval = null;
    this.stateCheckInterval = null;
    this.lastRealTimeUpdate = 0;
    
    // Configuration UIManager
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    this.onPositioned = this.onPositioned.bind(this);
    
    console.log('🎮 [WeatherWidget] Instance créée avec support traductions');
  }

  // === 🌐 NOUVEAUX MÉTODES TRADUCTIONS ===
  
  /**
   * Configurer le support des langues (appelé après création DOM)
   */
  setupLanguageSupport() {
    console.log('🌐 [WeatherWidget] Setup support traductions...');
    
    if (!this.optionsManager) {
      console.warn('⚠️ [WeatherWidget] OptionsManager manquant - pas de traductions');
      return false;
    }
    
    // Vérifier si les traductions sont prêtes
    this.checkTranslationsReady();
    
    // Setup des listeners
    this.setupLanguageListeners();
    
    return true;
  }
  
  /**
   * Vérifier si les traductions sont disponibles (avec retry)
   */
  checkTranslationsReady() {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Test de base: clé timeweather
      const testTranslation = this.safeTranslate('timeweather.weather.conditions.sunny', 'Sunny');
      const isReady = testTranslation !== 'timeweather.weather.conditions.sunny';
      
      if (isReady) {
        console.log(`✅ [WeatherWidget] Traductions prêtes (tentative ${attempts})`);
        this.translationsReady = true;
        clearInterval(checkInterval);
        
        // Mise à jour immédiate
        this.updateLanguage();
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.warn(`⚠️ [WeatherWidget] Traductions non trouvées après ${maxAttempts} tentatives`);
        clearInterval(checkInterval);
        return;
      }
      
      console.log(`🔄 [WeatherWidget] Attente traductions... (${attempts}/${maxAttempts})`);
    }, 500);
  }
  
  /**
   * Écouter les changements de langue
   */
  setupLanguageListeners() {
    console.log('👂 [WeatherWidget] Setup listeners traductions...');
    
    if (!this.optionsManager) return;
    
    // Listener 1: Changement de langue via Options
    if (this.optionsManager.on) {
      const languageListener = (event) => {
        console.log('🌐 [WeatherWidget] Langue changée:', event.detail);
        setTimeout(() => this.updateLanguage(), 100);
      };
      
      this.optionsManager.on('languageChanged', languageListener);
      this.languageListeners.push(() => {
        this.optionsManager.off('languageChanged', languageListener);
      });
    }
    
    // Listener 2: Événement global window
    const globalLanguageListener = (event) => {
      console.log('🌐 [WeatherWidget] Langue globale changée:', event.detail);
      setTimeout(() => this.updateLanguage(), 100);
    };
    
    window.addEventListener('languageChanged', globalLanguageListener);
    this.languageListeners.push(() => {
      window.removeEventListener('languageChanged', globalLanguageListener);
    });
    
    // Listener 3: Mise à jour modules LocalizationManager
    const modulesUpdatedListener = (event) => {
      if (event.detail.newModules?.includes('timeweather')) {
        console.log('📦 [WeatherWidget] Module timeweather chargé dynamiquement');
        setTimeout(() => {
          this.translationsReady = true;
          this.updateLanguage();
        }, 200);
      }
    };
    
    window.addEventListener('localizationModulesUpdated', modulesUpdatedListener);
    this.languageListeners.push(() => {
      window.removeEventListener('localizationModulesUpdated', modulesUpdatedListener);
    });
    
    console.log(`✅ [WeatherWidget] ${this.languageListeners.length} listeners configurés`);
  }
  
  /**
   * Traduction sécurisée avec fallback
   */
  safeTranslate(key, fallback = null) {
    try {
      const translation = t(key);
      return (translation && translation !== key) ? translation : (fallback || key);
    } catch (error) {
      console.warn(`⚠️ [WeatherWidget] Erreur traduction "${key}":`, error);
      return fallback || key;
    }
  }
  
  /**
   * Mettre à jour toutes les traductions du widget
   */
  updateLanguage() {
    if (!this.translationsReady) {
      console.log('⏳ [WeatherWidget] Traductions pas encore prêtes');
      return;
    }
    
    if (!this.element) {
      console.log('⏳ [WeatherWidget] Widget pas encore initialisé');
      return;
    }
    
    console.log('🔄 [WeatherWidget] Mise à jour traductions...');
    
    try {
      // 1. Traduire condition météo actuelle
      this.translateCurrentWeather();
      
      // 2. Traduire période de temps
      this.translateTimePeriod();
      
      // 3. Traduire localisation
      this.translateLocation();
      
      // 4. Traduire bonus gameplay
      this.translateGameplayBonus();
      
      // 5. Mettre à jour tooltips si présents
      this.translateTooltips();
      
      console.log('✅ [WeatherWidget] Traductions mises à jour');
      
    } catch (error) {
      console.error('❌ [WeatherWidget] Erreur mise à jour traductions:', error);
    }
  }
  
  /**
   * Traduire la condition météo actuelle
   */
  translateCurrentWeather() {
    if (!this.weather || !this.weather.weather) return;
    
    const weatherCondition = this.weather.weather;
    const translatedCondition = this.safeTranslate(
      `timeweather.weather.conditions.${weatherCondition}`,
      this.weather.displayName
    );
    
    const weatherElement = this.element.querySelector('.weather-main');
    if (weatherElement && weatherElement.textContent !== translatedCondition) {
      weatherElement.textContent = translatedCondition;
      console.log(`🌤️ [WeatherWidget] Météo traduite: ${weatherCondition} → ${translatedCondition}`);
    }
  }
  
  /**
   * Traduire période de temps (AM/PM)
   */
  translateTimePeriod() {
    const periodElement = this.element.querySelector('.time-period');
    if (!periodElement) return;
    
    const currentPeriod = periodElement.textContent.toLowerCase();
    if (currentPeriod === 'am' || currentPeriod === 'pm') {
      const translatedPeriod = this.safeTranslate(
        `timeweather.time.periods.${currentPeriod}`,
        currentPeriod.toUpperCase()
      );
      
      if (periodElement.textContent !== translatedPeriod) {
        periodElement.textContent = translatedPeriod;
        console.log(`⏰ [WeatherWidget] Période traduite: ${currentPeriod} → ${translatedPeriod}`);
      }
    }
  }
  
  /**
   * Traduire nom de localisation
   */
  translateLocation() {
    const zoneElement = this.element.querySelector('.zone-text');
    if (!zoneElement) return;
    
    const currentLocation = zoneElement.textContent;
    
    // Mapping des noms de lieux vers les clés de traduction
    const locationMapping = {
      'Village': 'village',
      'Pallet Town': 'pallet_town',
      'Viridian City': 'viridian_city',
      'Pewter City': 'pewter_city',
      'Cerulean City': 'cerulean_city',
      'Vermilion City': 'vermilion_city',
      'Lavender Town': 'lavender_town',
      'Celadon City': 'celadon_city',
      'Fuchsia City': 'fuchsia_city',
      'Saffron City': 'saffron_city',
      'Cinnabar Island': 'cinnabar_island',
      'Indigo Plateau': 'indigo_plateau'
    };
    
    const locationKey = locationMapping[currentLocation];
    if (locationKey) {
      const translatedLocation = this.safeTranslate(
        `timeweather.locations.${locationKey}`,
        currentLocation
      );
      
      if (zoneElement.textContent !== translatedLocation) {
        zoneElement.textContent = translatedLocation;
        console.log(`📍 [WeatherWidget] Lieu traduit: ${currentLocation} → ${translatedLocation}`);
      }
    }
  }
  
  /**
   * Traduire bonus gameplay
   */
  translateGameplayBonus() {
    const bonusElement = this.element.querySelector('.bonus-text');
    if (!bonusElement) return;
    
    if (!this.gameplayBonus || !this.gameplayBonus.active) return;
    
    const bonusType = this.gameplayBonus.type;
    if (!bonusType) return;
    
    // Traduire le type Pokémon
    const translatedType = this.safeTranslate(
      `timeweather.bonus.types.${bonusType}`,
      bonusType
    );
    
    // Formatter le message de bonus avec la traduction
    const bonusTemplate = this.safeTranslate(
      'timeweather.bonus.xp_boost',
      '+{0}% XP {1} Pokémon'
    );
    
    const bonusText = bonusTemplate
      .replace('{0}', '15')
      .replace('{1}', translatedType);
    
    if (bonusElement.textContent !== bonusText) {
      bonusElement.textContent = bonusText;
      console.log(`🎮 [WeatherWidget] Bonus traduit: ${translatedType}`);
    }
  }
  
  /**
   * Traduire tooltips (si présents)
   */
  translateTooltips() {
    const tooltipElements = this.element.querySelectorAll('[title], [data-tooltip]');
    
    tooltipElements.forEach(element => {
      const currentTooltip = element.title || element.dataset.tooltip;
      if (!currentTooltip) return;
      
      // Mapping des tooltips vers les clés de traduction
      const tooltipMapping = {
        'Current weather': 'current_weather',
        'Local time': 'local_time',
        'Temperature': 'temperature',
        'Weather intensity': 'weather_intensity',
        'Pokémon type bonus': 'pokemon_bonus'
      };
      
      const tooltipKey = tooltipMapping[currentTooltip];
      if (tooltipKey) {
        const translatedTooltip = this.safeTranslate(
          `timeweather.tooltips.${tooltipKey}`,
          currentTooltip
        );
        
        if (element.title) {
          element.title = translatedTooltip;
        }
        if (element.dataset.tooltip) {
          element.dataset.tooltip = translatedTooltip;
        }
      }
    });
  }

  // === 🛡️ PROTECTION CONTRE UIMANAGER (INCHANGÉE) ===
  protectFromUIManagerInterference() {
    if (!this.element) return;
    
    console.log('🛡️ [WeatherWidget] Protection contre UIManager...');
    
    // Supprimer toute classe UIManager
    this.element.classList.remove('ui-icon');
    this.element.classList.add('ui-standalone-widget');
    
    // Protéger nos dimensions
    this.element.style.width = '360px !important';
    this.element.style.height = '160px !important';
    this.element.style.minWidth = '360px !important';
    this.element.style.maxWidth = '360px !important';
    this.element.style.minHeight = '160px !important';
    this.element.style.maxHeight = '160px !important';
    
    // Position autonome
    this.element.style.position = 'fixed';
    this.element.style.top = '20px';
    this.element.style.right = '20px';
    this.element.style.zIndex = '1000';
    
    // Marquer comme widget autonome
    this.element.setAttribute('data-positioned-by', 'standalone-widget');
    this.element.setAttribute('data-uimanager-exempt', 'true');
    
    console.log('✅ [WeatherWidget] Protection appliquée - dimensions: 360x160px');
  }

  // === 🎨 CRÉATION DU WIDGET (MODIFIÉE POUR TRADUCTIONS) ===
  createIcon() {
    console.log('🎮 [WeatherWidget] Création widget avec traductions...');
    
    // Nettoyage
    const existing = document.getElementById(this.id);
    if (existing) existing.remove();
    
    // Création de l'élément principal
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'pokemon-weather-widget ui-standalone-widget';
    el.setAttribute('data-widget-type', 'standalone');
    el.setAttribute('data-custom-size', 'true');
    el.innerHTML = this.generateWidgetHTML();
    
    document.body.appendChild(el);
    this.element = el;
    
    // Initialisation
    this.injectStyles();
    this.protectFromUIManagerInterference();
    this.initializeConnections();
    this.updateInitialContent();
    this.startAllAnimations();
    
    // 🌐 NOUVEAU: Setup traductions après création DOM
    if (this.optionsManager) {
      setTimeout(() => {
        this.setupLanguageSupport();
      }, 500);
    }
    
    // Synchronisation différée
    setTimeout(() => {
      this.forceImmediateSync();
      setTimeout(() => this.updateCurrentZone(), 200);
    }, 100);
    
    this.initialized = true;
    console.log('✅ [WeatherWidget] Widget créé avec support traductions');
    return el;
  }

  generateWidgetHTML() {
    return `
      <!-- Weather Particles Container -->
      <div class="weather-particles" id="${this.id}-particles">
        ${this.generateParticlesHTML()}
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
                  <div class="weather-main" id="${this.id}-weather">Clear</div>
                  <div class="weather-temp" id="${this.id}-temp">22°C</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Section Bonus Gameplay -->
          <div class="bonus-section" id="${this.id}-bonus">
            <div class="bonus-icon">🎮</div>
            <div class="bonus-text">+15% XP Water Pokémon</div>
            <div class="bonus-type-icon type-water">💧</div>
          </div>
        </div>
      </div>
    `;
  }

  generateParticlesHTML() {
    const config = this.pokemonWeatherConfig[this.weather.weather] || this.pokemonWeatherConfig.clear;
    let particlesHTML = '';
    
    for (let i = 1; i <= config.particleCount; i++) {
      const delay = i * 0.3;
      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      
      particlesHTML += `
        <div class="particle particle-${i}" 
             style="left: ${randomX}%; top: ${randomY}%; animation-delay: ${delay}s;">
          ${config.particles}
        </div>
      `;
    }
    
    return particlesHTML;
  }

  // === 🌐 CONNEXIONS ET SYNCHRONISATION (inchangées) ===
  initializeConnections() {
    this.initializeZoneMapping();
    this.connectToGlobalWeatherManager();
  }

  initializeZoneMapping() {
    if (window.ZoneMapping && window.ZoneMapping.config) {
      this.zoneMapping = window.ZoneMapping;
      console.log('🗺️ [WeatherWidget] ZoneMapping connecté');
    } else {
      console.warn('⚠️ [WeatherWidget] ZoneMapping non disponible');
    }
  }

  connectToGlobalWeatherManager() {
    if (window.globalWeatherManager && window.globalWeatherManager.isInitialized) {
      this.subscribeToWeatherUpdates();
      
      // Récupération des données actuelles
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

  subscribeToWeatherUpdates() {
    // PRIORITÉ 1: Callbacks directs (instantanés)
    if (window.globalWeatherManager) {
      if (typeof window.globalWeatherManager.onTimeChange === 'function') {
        window.globalWeatherManager.onTimeChange((hour, isDayTime) => {
          this.updateTime(hour, isDayTime);
          this.lastRealTimeUpdate = Date.now();
        });
      }
      
      if (typeof window.globalWeatherManager.onWeatherChange === 'function') {
        window.globalWeatherManager.onWeatherChange((weather, displayName) => {
          this.updateWeather(weather, displayName, '22°C');
          this.lastRealTimeUpdate = Date.now();
        });
      }
    }
    
    // PRIORITÉ 2: Fallback via timeWeatherManager
    if (window.globalWeatherManager?.timeWeatherManager) {
      const manager = window.globalWeatherManager.timeWeatherManager;
      
      if (typeof manager.onTimeChange === 'function') {
        manager.onTimeChange((hour, isDayTime) => {
          this.updateTime(hour, isDayTime);
        });
      }
      
      if (typeof manager.onWeatherChange === 'function') {
        manager.onWeatherChange((weather, displayName) => {
          this.updateWeather(weather, displayName, '22°C');
        });
      }
    }
    
    // PRIORITÉ 3: Polling de backup (500ms seulement)
    this.startIntelligentPolling();
  }

  startIntelligentPolling() {
    if (!window.globalNetworkManager?.room) return;
    
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
      
      // Vérification des changements
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
    
    console.log('✅ [WeatherWidget] Polling intelligent démarré');
  }

  forceImmediateSync() {
    console.log('🚀 [WeatherWidget] Synchronisation immédiate');
    
    // Sync GlobalWeatherManager
    if (window.globalWeatherManager?.isInitialized) {
      const currentTime = window.globalWeatherManager.getCurrentTime();
      const currentWeather = window.globalWeatherManager.getCurrentWeather();
      
      if (currentTime) this.updateTime(currentTime.hour, currentTime.isDayTime);
      if (currentWeather) this.updateWeather(currentWeather.weather, currentWeather.displayName, '22°C');
    }
    
    // Sync serveur direct
    if (window.globalNetworkManager?.room) {
      const room = window.globalNetworkManager.room;
      const serverTime = { hour: room.state.gameHour, isDayTime: room.state.isDayTime };
      const serverWeather = { weather: room.state.weather, displayName: this.getWeatherDisplayName(room.state.weather) };
      
      this.updateTime(serverTime.hour, serverTime.isDayTime);
      this.updateWeather(serverWeather.weather, serverWeather.displayName, '22°C');
    }
  }

  // === 📍 GESTION DES ZONES ===
  updateCurrentZone() {
    let currentZone = 'Village';
    
    try {
      // Méthode 1: Phaser scene manager
      if (window.game?.scene?.getScenes) {
        const activeScenes = window.game.scene.getScenes(true);
        if (activeScenes.length > 0) {
          const sceneName = activeScenes[0].constructor.name;
          
          if (this.zoneMapping?.sceneToZone) {
            const zoneName = this.zoneMapping.sceneToZone(sceneName);
            const zoneConfig = this.zoneMapping.getZoneConfig(zoneName);
            
            if (zoneConfig?.displayName) {
              currentZone = zoneConfig.displayName;
              console.log(`🎯 Zone détectée: ${currentZone} (${sceneName})`);
            }
          }
        }
      }
      
      // Méthode 2: GlobalNetworkManager
      if (currentZone === 'Village' && window.globalNetworkManager?.room?.state?.currentZone) {
        const serverZone = window.globalNetworkManager.room.state.currentZone;
        const zoneConfig = this.zoneMapping?.getZoneConfig(serverZone);
        
        if (zoneConfig?.displayName) {
          currentZone = zoneConfig.displayName;
          console.log(`🌐 Zone serveur: ${currentZone}`);
        }
      }
      
      // Méthode 3: PlayerManager
      if (currentZone === 'Village' && window.playerManager?.currentZone) {
        const zoneConfig = this.zoneMapping?.getZoneConfig(window.playerManager.currentZone);
        
        if (zoneConfig?.displayName) {
          currentZone = zoneConfig.displayName;
          console.log(`👤 Zone joueur: ${currentZone}`);
        }
      }
      
    } catch (error) {
      console.warn('⚠️ [WeatherWidget] Erreur détection zone:', error);
    }
    
    this.updateZone(currentZone);
  }

  getWeatherDisplayName(weatherName) {
    // 🌐 NOUVEAU: Fonction qui sera utilisée mais les noms seront traduits par translateCurrentWeather()
    const weatherNames = {
      'clear': 'Clear',
      'rain': 'Rain',
      'storm': 'Storm',
      'snow': 'Snow',
      'fog': 'Fog',
      'cloudy': 'Cloudy'
    };
    return weatherNames[weatherName] || weatherName;
  }

  // === 🎮 MÉTHODES DE MISE À JOUR (MODIFIÉES POUR TRADUCTIONS) ===
  updateInitialContent() {
    this.updateTime(this.currentHour, this.isDayTime);
    this.updateWeather(this.weather.weather, this.weather.displayName, this.weather.temperature);
    this.updateZone(this.location);
    this.updateGameplayBonus(this.gameplayBonus);
  }

  updateTime(hour, isDayTime) {
    this.currentHour = hour;
    this.isDayTime = isDayTime;
    if (!this.element) return;
    
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'AM' : 'PM';
    const timeIcons = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    const timeIcon = timeIcons[h12 - 1] || '🕐';
    
    // Mise à jour DOM optimisée
    const updates = [
      ['.time-main', `${h12}:00`],
      ['.time-period', period],
      ['.time-icon', timeIcon]
    ];
    
    updates.forEach(([selector, content]) => {
      const element = this.element.querySelector(selector);
      if (element && element.textContent !== content) {
        element.textContent = content;
      }
    });
    
    this.updateDayNightTheme(isDayTime);
    
    // 🌐 NOUVEAU: Re-traduire après mise à jour
    if (this.translationsReady) {
      setTimeout(() => this.translateTimePeriod(), 100);
    }
  }

  updateWeather(weather, displayName, temperature = '22°C') {
    this.weather = { weather, displayName, temperature };
    if (!this.element) return;
    
    const config = this.pokemonWeatherConfig[weather] || this.pokemonWeatherConfig.clear;
    
    // Mise à jour DOM optimisée
    const updates = [
      ['.weather-main', displayName], // Sera traduit par translateCurrentWeather()
      ['.weather-temp', temperature],
      ['.weather-icon', config.icon],
      ['.pokemon-type-icon', config.pokemon]
    ];
    
    updates.forEach(([selector, content]) => {
      const element = this.element.querySelector(selector);
      if (element && element.textContent !== content) {
        element.textContent = content;
      }
    });
    
    // Mise à jour de la classe météo pour les effets CSS
    this.updateWeatherClass(weather);
    
    // Forcer la mise à jour immédiate du weather system
    if (window.globalWeatherManager && weather !== this.lastWeatherSent) {
      console.log(`🔥 FORCE WEATHER SYSTEM UPDATE: ${weather}`);
      
      window.globalWeatherManager.currentWeather = {
        weather: weather,
        displayName: displayName
      };
      
      if (typeof window.globalWeatherManager.updateAllScenes === 'function') {
        window.globalWeatherManager.updateAllScenes('widget-force-update');
      }
      
      this.lastWeatherSent = weather;
    }
    
    // Mise à jour des effets visuels du widget
    this.updateWeatherParticles(config);
    this.updateGameplayBonus({
      active: true,
      text: `+15% XP ${config.bonus} Pokémon`, // Sera traduit par translateGameplayBonus()
      type: config.bonus // ← Utilise maintenant les clés de traduction
    });
    
    // 🌐 NOUVEAU: Re-traduire après mise à jour
    if (this.translationsReady) {
      setTimeout(() => {
        this.translateCurrentWeather();
        this.translateGameplayBonus();
      }, 100);
    }
    
    console.log(`🌤️ Météo mise à jour avec traductions: ${displayName}`);
  }

  updateWeatherClass(weather) {
    if (!this.element) return;
    
    // Supprimer toutes les classes météo existantes
    const weatherClasses = ['weather-clear', 'weather-rain', 'weather-storm', 'weather-snow', 'weather-fog', 'weather-cloudy'];
    weatherClasses.forEach(cls => this.element.classList.remove(cls));
    
    // Ajouter la nouvelle classe météo
    this.element.classList.add(`weather-${weather}`);
    
    console.log(`🎨 Classe météo appliquée: weather-${weather}`);
  }

  updateWeatherParticles(config) {
    const particleContainer = this.element?.querySelector('.weather-particles');
    if (!particleContainer) return;
    
    // Régénérer les particules avec la nouvelle météo
    particleContainer.innerHTML = '';
    
    for (let i = 1; i <= config.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = `particle particle-${i} ${this.weather.weather}-particle`;
      particle.textContent = config.particles;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${i * 0.2}s`;
      
      particleContainer.appendChild(particle);
    }
    
    console.log(`✨ ${config.particleCount} particules ${config.particles} générées`);
  }

  updateZone(zoneName) {
    this.location = zoneName;
    const zoneElement = this.element?.querySelector('.zone-text');
    if (zoneElement && zoneElement.textContent !== zoneName) {
      zoneElement.textContent = zoneName;
      
      // 🌐 NOUVEAU: Re-traduire après mise à jour
      if (this.translationsReady) {
        setTimeout(() => this.translateLocation(), 100);
      }
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
    
    if (bonusText && bonusText.textContent !== bonus.text) {
      bonusText.textContent = bonus.text; // Sera traduit par translateGameplayBonus()
    }
    
    if (bonusTypeIcon && bonus.type) {
      const config = this.pokemonWeatherConfig[Object.keys(this.pokemonWeatherConfig).find(key => 
        this.pokemonWeatherConfig[key].bonus === bonus.type
      )];
      const typeIcon = config?.pokemon || '🎮';
      
      if (bonusTypeIcon.textContent !== typeIcon) {
        bonusTypeIcon.textContent = typeIcon;
      }
      
      // Ajouter classe de type pour les couleurs unifiées
      bonusTypeIcon.className = `bonus-type-icon type-${bonus.type}`;
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

  // === ✨ ANIMATIONS OPTIMISÉES (inchangées) ===
  startAllAnimations() {
    this.startAnimations();
    this.startParticleAnimation();
  }

  startAnimations() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animateElements();
  }

  animateElements() {
    if (!this.element || !this.isAnimating) return;
    
    const time = Date.now() * 0.001;
    const elements = {
      timeIcon: this.element.querySelector('.time-icon'),
      weatherIcon: this.element.querySelector('.weather-icon'),
      pokemonIcon: this.element.querySelector('.pokemon-type-icon')
    };
    
    // Animations plus subtiles pour le style unifié
    if (elements.timeIcon) {
      elements.timeIcon.style.transform = `rotate(${Math.sin(time) * 2}deg)`;
    }
    
    if (elements.weatherIcon) {
      elements.weatherIcon.style.transform = `scale(${1 + Math.sin(time * 1.5) * 0.03})`;
    }
    
    if (elements.pokemonIcon) {
      const bounce = Math.sin(time * 2) * 0.02;
      elements.pokemonIcon.style.transform = `translateY(${bounce}px) scale(${1 + bounce})`;
    }
    
    this.animationFrame = requestAnimationFrame(() => this.animateElements());
  }

  startParticleAnimation() {
    if (!this.element) return;
    
    const animateParticles = () => {
      if (!this.element || !this.isAnimating) return;
      
      const particles = this.element.querySelectorAll('.particle');
      const time = Date.now() * 0.001;
      
      particles.forEach((particle, index) => {
        const delay = index * 0.3;
        
        // Animation selon le type de météo (plus subtiles)
        switch (this.weather.weather) {
          case 'rain':
            this.animateRainParticle(particle, time, delay);
            break;
          case 'storm':
            this.animateStormParticle(particle, time, delay);
            break;
          case 'snow':
            this.animateSnowParticle(particle, time, delay);
            break;
          case 'fog':
            this.animateFogParticle(particle, time, delay);
            break;
          case 'cloudy':
            this.animateCloudyParticle(particle, time, delay);
            break;
          default:
            this.animateDefaultParticle(particle, time, delay);
        }
      });
      
      this.particleAnimationFrame = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
  }

  // Animations particules plus subtiles (inchangées)
  animateRainParticle(particle, time, delay) {
    const x = Math.sin(time + delay) * 3;
    const y = ((time * 50 + delay * 80) % 200) - 40;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = y > 160 ? 0 : 0.4;
  }

  animateStormParticle(particle, time, delay) {
    const x = Math.sin(time * 2 + delay) * 20;
    const y = Math.cos(time * 1.5 + delay) * 15;
    const flash = Math.sin(time * 6 + delay) > 0.7 ? 0.6 : 0.2;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = flash;
  }

  animateSnowParticle(particle, time, delay) {
    const x = Math.sin(time * 0.4 + delay) * 20;
    const y = ((time * 20 + delay * 60) % 180) - 30;
    const rotation = (time * 30 + delay * 80) % 360;
    particle.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    particle.style.opacity = y > 140 ? 0 : 0.4;
  }

  animateFogParticle(particle, time, delay) {
    const x = Math.sin(time * 0.2 + delay) * 30;
    const y = Math.cos(time * 0.15 + delay) * 10;
    const opacity = 0.1 + Math.sin(time + delay) * 0.15;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = Math.max(0.05, opacity);
  }

  animateCloudyParticle(particle, time, delay) {
    const x = Math.sin(time * 0.3 + delay) * 25;
    const y = Math.cos(time * 0.25 + delay) * 12;
    const opacity = 0.15 + Math.sin(time + delay) * 0.15;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = Math.max(0.1, opacity);
  }

  animateDefaultParticle(particle, time, delay) {
    const x = Math.sin(time + delay) * 15;
    const y = Math.cos(time * 0.6 + delay) * 10;
    const opacity = 0.2 + Math.sin(time + delay) * 0.15;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = opacity;
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

  // === 🎛️ MÉTHODES UIMANAGER (inchangées) ===
  show() {
    this.isVisible = true;
    if (this.element) {
      this.element.classList.remove('ui-hidden', 'hidden');
      this.element.classList.add('ui-fade-in');
      this.element.style.display = 'flex';
      this.element.style.visibility = 'visible';
      this.element.style.opacity = '1';
      
      this.startAllAnimations();
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
        this.startAllAnimations();
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
      this.element.setAttribute('data-positioned-by', 'standalone-widget');
      this.element.setAttribute('data-position', JSON.stringify(position));
      console.log('📍 [WeatherWidget] Position autonome enregistrée:', position);
    }
  }

  isPositionedByUIManager() {
    return false;
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
      source: 'standalone-computed',
      type: 'autonomous-widget'
    };
  }

  // === 🎨 INJECTION DES STYLES (inchangée) ===
  injectStyles() {
    if (document.getElementById('pokemon-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'pokemon-weather-widget-css';
    style.textContent = POKEMON_WEATHER_STYLES;
    document.head.appendChild(style);
    console.log('🎨 [WeatherWidget] Styles unifiés avec accents météo injectés');
  }

  // === 🧹 DESTRUCTION (MODIFIÉE POUR CLEANUP TRADUCTIONS) ===
  destroy() {
    this.stopAnimations();
    
    // 🌐 NOUVEAU: Cleanup des listeners de langue
    this.languageListeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('⚠️ [WeatherWidget] Erreur cleanup listener:', error);
      }
    });
    this.languageListeners = [];
    
    // Nettoyage des intervalles
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    
    // Suppression du DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Suppression des styles
    const style = document.getElementById('pokemon-weather-widget-css');
    if (style) {
      style.remove();
    }
    
    // Reset des états
    this.element = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.initialized = false;
    this.optionsManager = null;
    this.translationsReady = false;
    
    console.log('🧹 [WeatherWidget] Widget détruit avec cleanup traductions');
  }

  // === 🐛 DEBUG (AMÉLIORÉ POUR TRADUCTIONS) ===
  debugInfo() {
    // Test quelques traductions si prêtes
    const translationTests = this.translationsReady ? {
      sunny: this.safeTranslate('timeweather.weather.conditions.sunny', 'TEST'),
      morning: this.safeTranslate('timeweather.time.periods.morning', 'TEST'),
      village: this.safeTranslate('timeweather.locations.village', 'TEST'),
      fire: this.safeTranslate('timeweather.bonus.types.fire', 'TEST')
    } : {};
    
    return {
      id: this.id,
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      initialized: this.initialized,
      isAnimating: this.isAnimating,
      hasElement: !!this.element,
      elementInDOM: this.element ? document.contains(this.element) : false,
      positioningMode: 'standalone',
      uiManagerControlled: false,
      isPositionedByUIManager: false,
      currentPosition: this.getCurrentPosition(),
      currentTime: `${this.currentHour}:00 ${this.isDayTime ? 'Day' : 'Night'}`,
      currentWeather: this.weather,
      location: this.location,
      gameplayBonus: this.gameplayBonus,
      theme: this.isDayTime ? 'day' : 'night',
      weatherConfig: this.pokemonWeatherConfig[this.weather.weather],
      particleCount: this.pokemonWeatherConfig[this.weather.weather]?.particleCount || 0,
      weatherClass: `weather-${this.weather.weather}`,
      
      // 🌐 NOUVEAU: Infos traductions
      translations: {
        ready: this.translationsReady,
        hasOptionsManager: !!this.optionsManager,
        listenersCount: this.languageListeners.length,
        currentLanguage: this.optionsManager?.getCurrentLanguage?.() || 'unknown',
        tests: translationTests
      },
      
      unifiedStyle: true,
      weatherAccents: true,
      truncationFixed: true,
      standaloneWidget: true,
      uiManagerExempt: true,
      translationSupport: true, // 🌐 NOUVEAU
      
      animationFrames: {
        main: !!this.animationFrame,
        particles: !!this.particleAnimationFrame
      },
      intervals: {
        sync: !!this.syncInterval,
        stateCheck: !!this.stateCheckInterval
      },
      elementStyles: this.element ? {
        position: this.element.style.position,
        left: this.element.style.left,
        top: this.element.style.top,
        display: this.element.style.display,
        visibility: this.element.style.visibility,
        opacity: this.element.style.opacity,
        zIndex: this.element.style.zIndex
      } : null,
      boundingRect: this.element ? this.element.getBoundingClientRect() : null,
      particlesInDOM: this.element ? this.element.querySelectorAll('.particle').length : 0
    };
  }
}

export default TimeWeatherWidget;
