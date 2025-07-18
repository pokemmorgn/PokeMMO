// ui/TimeWeatherWidget.js - Modern MMO Style Weather Widget
export class TimeWeatherWidget {
  constructor(options = {}) {
    this.id = options.id || 'time-weather-widget';
    this.anchor = options.anchor || 'top-right';
    this.element = null;
    this.currentHour = 12;
    this.isDayTime = true;
    this.weather = { weather: 'clear', displayName: 'Clear', temperature: '22°C' };
    this.location = 'Pallet Town';
    
    // Icônes météo modernes avec effets
    this.icons = {
      clear: { icon: '☀️', color: '#FFD700', glow: '#FFE55C' },
      rain: { icon: '🌧️', color: '#4A90E2', glow: '#7BB3F0' },
      storm: { icon: '⛈️', color: '#8B5CF6', glow: '#A78BFA' },
      snow: { icon: '❄️', color: '#E0F7FA', glow: '#B2EBF2' },
      fog: { icon: '🌫️', color: '#9E9E9E', glow: '#BDBDBD' },
      cloudy: { icon: '☁️', color: '#78909C', glow: '#90A4AE' }
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
    
    // Tracking temps réel
    this.lastRealTimeUpdate = 0;
    
    // === UIManager CONTROL FLAGS ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    // Callback position
    this.onPositioned = this.onPositioned.bind(this);
    console.log('⏰ [TimeWeatherWidget] Instance créée - Style MMO Moderne');
  }

  // === 🔧 MÉTHODE CREATEICON POUR UIMANAGER ===
  createIcon() {
    console.log('🎨 [TimeWeatherWidget] createIcon() - Style MMO Moderne');
    
    // Supprimer l'ancien élément s'il existe
    const existing = document.getElementById(this.id);
    if (existing) {
      existing.remove();
    }
    
    // Créer l'élément avec structure moderne
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'time-weather-widget ui-icon modern-mmo';
    el.innerHTML = `
      <div class="widget-background"></div>
      <div class="widget-border"></div>
      <div class="widget-content">
        <div class="time-section">
          <div class="time-icon" id="${this.id}-time-icon">🕐</div>
          <div class="time-text">
            <div class="time-main" id="${this.id}-time">12:00</div>
            <div class="time-period" id="${this.id}-period">PM</div>
          </div>
        </div>
        <div class="separator"></div>
        <div class="weather-section">
          <div class="weather-icon" id="${this.id}-weather-icon">☀️</div>
          <div class="weather-text">
            <div class="weather-main" id="${this.id}-weather">Clear</div>
            <div class="weather-temp" id="${this.id}-temp">22°C</div>
          </div>
        </div>
      </div>
      <div class="widget-glow"></div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(el);
    this.element = el;
    
    // Injecter les styles
    this.injectStyles();
    
    // 🔥 NOUVEAU: Connexion automatique au GlobalWeatherManager
    this.connectToGlobalWeatherManager();
    
    // Mettre à jour le contenu avec les données actuelles
    this.updateTime(this.currentHour, this.isDayTime);
    this.updateWeather(this.weather.weather, this.weather.displayName, this.weather.temperature);
    
    // Démarrer les animations
    this.startAnimations();
    
    // 🔥 NOUVEAU: FORCER LA SYNC IMMÉDIATE
    setTimeout(() => {
      this.forceImmediateSync();
    }, 100); // ← DÉLAI MINIMAL POUR LAISSER LE DOM
    
    // Marquer comme initialisé
    this.initialized = true;
    
    console.log('✅ [TimeWeatherWidget] Widget MMO moderne créé et connecté');
    return el;
  }

  // === 🌐 CONNEXION AU GLOBALWEATHERMANAGER ===
  connectToGlobalWeatherManager() {
    console.log('🔗 [TimeWeatherWidget] Connexion au GlobalWeatherManager...');
    
    // Vérifier si le GlobalWeatherManager est disponible
    if (window.globalWeatherManager && window.globalWeatherManager.isInitialized) {
      console.log('✅ [TimeWeatherWidget] GlobalWeatherManager trouvé');
      
      // ✅ S'ABONNER AUX CALLBACKS EN PREMIER
      this.subscribeToWeatherUpdates();
      
      // Obtenir les données actuelles du serveur APRÈS l'abonnement
      const currentTime = window.globalWeatherManager.getCurrentTime();
      const currentWeather = window.globalWeatherManager.getCurrentWeather();
      
      console.log('📡 [TimeWeatherWidget] Données serveur reçues:', {
        time: currentTime,
        weather: currentWeather
      });
      
      // Mettre à jour avec les données du serveur
      if (currentTime) {
        this.updateTime(currentTime.hour, currentTime.isDayTime);
      }
      
      if (currentWeather) {
        this.updateWeather(currentWeather.weather, currentWeather.displayName, '22°C');
      }
      
    } else {
      console.warn('⚠️ [TimeWeatherWidget] GlobalWeatherManager non disponible, retry...');
      
      // Retry dans 100ms au lieu de 2 secondes
      setTimeout(() => {
        this.connectToGlobalWeatherManager();
      }, 100);
    }
  }

  // === 🚀 NOUVELLE MÉTHODE: SYNCHRONISATION IMMÉDIATE ===
  forceImmediateSync() {
    console.log('🚀 [TimeWeatherWidget] SYNC IMMÉDIATE FORCÉE');
    
    // ✅ PRIORITÉ 1: Callbacks directs GlobalWeatherManager
    if (window.globalWeatherManager && window.globalWeatherManager.isInitialized) {
      console.log('⚡ [TimeWeatherWidget] Récupération état GlobalWeatherManager');
      
      const currentTime = window.globalWeatherManager.getCurrentTime();
      const currentWeather = window.globalWeatherManager.getCurrentWeather();
      
      // ✅ APPLIQUER IMMÉDIATEMENT
      if (currentTime) {
        this.updateTime(currentTime.hour, currentTime.isDayTime);
        console.log(`🕐 [TimeWeatherWidget] Temps GlobalWeatherManager: ${currentTime.hour}h`);
      }
      
      if (currentWeather) {
        this.updateWeather(currentWeather.weather, currentWeather.displayName, '22°C');
        console.log(`🌤️ [TimeWeatherWidget] Météo GlobalWeatherManager: ${currentWeather.displayName}`);
      }
      
      // ✅ S'ASSURER QUE LES CALLBACKS SONT BIEN ENREGISTRÉS
      const callbacksCount = {
        time: window.globalWeatherManager.timeChangeCallbacks ? window.globalWeatherManager.timeChangeCallbacks.length : 0,
        weather: window.globalWeatherManager.weatherChangeCallbacks ? window.globalWeatherManager.weatherChangeCallbacks.length : 0
      };
      
      console.log(`📊 [TimeWeatherWidget] Callbacks enregistrés:`, callbacksCount);
      
      if (callbacksCount.time === 0 || callbacksCount.weather === 0) {
        console.warn('⚠️ [TimeWeatherWidget] Callbacks manquants, re-enregistrement...');
        setTimeout(() => {
          this.subscribeToWeatherUpdates();
        }, 100);
      }
    }
    
    // ✅ PRIORITÉ 2: État serveur direct (fallback)
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      const room = window.globalNetworkManager.room;
      
      // ✅ RÉCUPÉRER L'ÉTAT BRUT DU SERVEUR
      const serverTime = {
        hour: room.state.gameHour,
        isDayTime: room.state.isDayTime
      };
      
      const serverWeather = {
        weather: room.state.weather,
        displayName: this.getWeatherDisplayName(room.state.weather)
      };
      
      console.log('📡 [TimeWeatherWidget] État serveur direct:', {
        time: serverTime,
        weather: serverWeather
      });
      
      // ✅ APPLIQUER L'ÉTAT SERVEUR DIRECTEMENT
      this.updateTime(serverTime.hour, serverTime.isDayTime);
      this.updateWeather(serverWeather.weather, serverWeather.displayName, '22°C');
    }
  }

  // === 📡 ABONNEMENT AUX MISES À JOUR (APPROCHE HYBRIDE OPTIMALE) ===
  subscribeToWeatherUpdates() {
    console.log('📡 [TimeWeatherWidget] Abonnement hybride optimal...');
    
    // === MÉTHODE DIRECTE: Callbacks via GlobalWeatherManager ===
    if (window.globalWeatherManager && typeof window.globalWeatherManager.onTimeChange === 'function') {
      
      window.globalWeatherManager.onTimeChange((hour, isDayTime) => {
        console.log(`⚡ [TimeWeatherWidget] Temps CALLBACK DIRECT: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
        this.updateTime(hour, isDayTime);
        this.lastRealTimeUpdate = Date.now();
      });
      
      window.globalWeatherManager.onWeatherChange((weather, displayName) => {
        console.log(`⚡ [TimeWeatherWidget] Météo CALLBACK DIRECT: ${displayName}`);
        this.updateWeather(weather, displayName, '22°C');
        this.lastRealTimeUpdate = Date.now();
      });
      
      console.log('✅ [TimeWeatherWidget] Callbacks directs GlobalWeatherManager configurés');
      
    } else {
      console.warn('⚠️ [TimeWeatherWidget] Callbacks directs non disponibles, fallback...');
      
      // === FALLBACK: Ancien système via timeWeatherManager ===
      if (window.globalWeatherManager && window.globalWeatherManager.timeWeatherManager) {
        const timeWeatherManager = window.globalWeatherManager.timeWeatherManager;
        
        // Callback pour les changements de temps
        if (typeof timeWeatherManager.onTimeChange === 'function') {
          timeWeatherManager.onTimeChange((hour, isDayTime) => {
            console.log(`⚡ [TimeWeatherWidget] Temps FALLBACK: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
            this.updateTime(hour, isDayTime);
            this.lastRealTimeUpdate = Date.now();
          });
        }
        
        // Callback pour les changements de météo
        if (typeof timeWeatherManager.onWeatherChange === 'function') {
          timeWeatherManager.onWeatherChange((weather, displayName) => {
            console.log(`⚡ [TimeWeatherWidget] Météo FALLBACK: ${displayName}`);
            this.updateWeather(weather, displayName, '22°C');
            this.lastRealTimeUpdate = Date.now();
          });
        }
        
        console.log('✅ [TimeWeatherWidget] Callbacks fallback configurés');
      }
    }
    
    // === MÉTHODE 2: Polling intelligent (backup adaptatif) ===
    this.startIntelligentPolling();
  }

  // === 🧠 POLLING INTELLIGENT ===
  startIntelligentPolling() {
    if (window.globalNetworkManager && window.globalNetworkManager.room) {
      const room = window.globalNetworkManager.room;
      
      // Sauvegarder l'état précédent
      let lastState = {
        gameHour: room.state.gameHour,
        isDayTime: room.state.isDayTime,
        weather: room.state.weather
      };
      
      this.stateCheckInterval = setInterval(() => {
        const currentState = {
          gameHour: room.state.gameHour,
          isDayTime: room.state.isDayTime,
          weather: room.state.weather
        };
        
        // Vérifier si les callbacks temps réel fonctionnent
        const timeSinceLastRealTime = Date.now() - (this.lastRealTimeUpdate || 0);
        const realTimeWorking = timeSinceLastRealTime < 60000; // Moins de 1 minute
        
        // ✅ TOUJOURS vérifier les changements, même si temps réel fonctionne
        // (double sécurité)
        
        // Vérifier les changements de temps
        if (currentState.gameHour !== lastState.gameHour || 
            currentState.isDayTime !== lastState.isDayTime) {
          
          if (realTimeWorking) {
            console.log('🔄 [TimeWeatherWidget] Temps via polling (double sécurité):', currentState);
          } else {
            console.log('🔄 [TimeWeatherWidget] Temps via polling (backup):', currentState);
          }
          this.updateTime(currentState.gameHour, currentState.isDayTime);
        }
        
        // Vérifier les changements de météo
        if (currentState.weather !== lastState.weather) {
          if (realTimeWorking) {
            console.log('🔄 [TimeWeatherWidget] Météo via polling (double sécurité):', currentState.weather);
          } else {
            console.log('🔄 [TimeWeatherWidget] Météo via polling (backup):', currentState.weather);
          }
          const displayName = this.getWeatherDisplayName(currentState.weather);
          this.updateWeather(currentState.weather, displayName, '22°C');
        }
        
        lastState = currentState;
        
      }, 500); // ✅ RÉDUIT de 2s à 500ms
      
      console.log('✅ [TimeWeatherWidget] Polling intelligent démarré (500ms)');
    }
  }

  // === 🌤️ CONVERSION NOMS MÉTÉO ===
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

  // === 🔄 SYNCHRONISATION PÉRIODIQUE ===
  startPeriodicSync() {
    // Synchronisation de backup moins fréquente
    this.syncInterval = setInterval(() => {
      this.syncWithServer();
    }, 2000); // ✅ 2 secondes au lieu de 5
    
    console.log('🔄 [TimeWeatherWidget] Synchronisation périodique démarrée (2s)');
  }

  syncWithServer() {
    if (!window.globalNetworkManager || !window.globalNetworkManager.room) {
      return;
    }
    
    const room = window.globalNetworkManager.room;
    
    // Obtenir l'état actuel du serveur
    const serverTime = {
      hour: room.state.gameHour,
      isDayTime: room.state.isDayTime
    };
    
    const serverWeather = {
      weather: room.state.weather,
      displayName: this.getWeatherDisplayName(room.state.weather)
    };
    
    // Vérifier si on est désynchronisé
    if (serverTime.hour !== this.currentHour || serverTime.isDayTime !== this.isDayTime) {
      console.log('🔄 [TimeWeatherWidget] Resync temps:', serverTime);
      this.updateTime(serverTime.hour, serverTime.isDayTime);
    }
    
    if (serverWeather.weather !== this.weather.weather) {
      console.log('🔄 [TimeWeatherWidget] Resync météo:', serverWeather);
      this.updateWeather(serverWeather.weather, serverWeather.displayName, '22°C');
    }
  }

  // === MÉTHODES DE MISE À JOUR ===
  updateTime(hour, isDayTime) {
    this.currentHour = hour;
    this.isDayTime = isDayTime;
    if (!this.element) return;
    
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'AM' : 'PM';
    
    // Icônes d'horloge selon l'heure
    const timeIcons = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
    const timeIcon = timeIcons[h12 - 1] || '🕐';
    
    const timeElement = this.element.querySelector('.time-main');
    const periodElement = this.element.querySelector('.time-period');
    const timeIconElement = this.element.querySelector('.time-icon');
    
    if (timeElement) timeElement.textContent = `${h12}:00`;
    if (periodElement) periodElement.textContent = period;
    if (timeIconElement) timeIconElement.textContent = timeIcon;
    
    // Mise à jour du style selon jour/nuit
    this.updateDayNightTheme(isDayTime);
  }

  updateWeather(weather, displayName, temperature = '22°C') {
    this.weather = { weather, displayName, temperature };
    if (!this.element) return;
    
    const weatherData = this.icons[weather] || this.icons.clear;
    
    const weatherElement = this.element.querySelector('.weather-main');
    const tempElement = this.element.querySelector('.weather-temp');
    const weatherIconElement = this.element.querySelector('.weather-icon');
    
    if (weatherElement) weatherElement.textContent = displayName;
    if (tempElement) tempElement.textContent = temperature;
    if (weatherIconElement) {
      weatherIconElement.textContent = weatherData.icon;
      weatherIconElement.style.color = weatherData.color;
      weatherIconElement.style.textShadow = `0 0 10px ${weatherData.glow}`;
    }
    
    // Mise à jour de l'effet de lueur
    this.updateWeatherGlow(weatherData);
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

  updateWeatherGlow(weatherData) {
    if (!this.element) return;
    
    const glowElement = this.element.querySelector('.widget-glow');
    if (glowElement) {
      glowElement.style.background = `radial-gradient(circle at 80% 50%, ${weatherData.glow}33 0%, transparent 70%)`;
    }
  }

  // === ANIMATIONS ===
  startAnimations() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.animateElements();
  }

  animateElements() {
    if (!this.element || !this.isAnimating) return;
    
    const timeIcon = this.element.querySelector('.time-icon');
    const weatherIcon = this.element.querySelector('.weather-icon');
    
    // Animation subtile des icônes
    if (timeIcon) {
      const rotation = Math.sin(Date.now() * 0.001) * 5;
      timeIcon.style.transform = `rotate(${rotation}deg)`;
    }
    
    if (weatherIcon) {
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
      weatherIcon.style.transform = `scale(${scale})`;
    }
    
    this.animationFrame = requestAnimationFrame(() => this.animateElements());
  }

  stopAnimations() {
    this.isAnimating = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
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
      
      this.startAnimations();
      
      setTimeout(() => {
        this.element.classList.remove('ui-fade-in');
      }, 500);
    }
    console.log('👁️ [TimeWeatherWidget] Widget MMO affiché');
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
    console.log('👻 [TimeWeatherWidget] Widget MMO caché');
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
      } else {
        this.element.classList.add('ui-disabled');
        this.element.style.opacity = '0.5';
        this.element.style.pointerEvents = 'none';
        this.stopAnimations();
      }
    }
    console.log(`🔧 [TimeWeatherWidget] Widget MMO ${enabled ? 'activé' : 'désactivé'}`);
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

  // === STYLES MODERNES MMO ===
  injectStyles() {
    if (document.getElementById('time-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'time-weather-widget-css';
    style.textContent = `
      .time-weather-widget.ui-icon.modern-mmo {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 320px !important;
        height: 70px !important;
        min-width: 320px !important;
        max-width: 320px !important;
        min-height: 70px !important;
        max-height: 70px !important;
        background: transparent;
        border: none;
        border-radius: 0;
        font-family: 'Segoe UI', 'Roboto', sans-serif;
        user-select: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
        margin-top: 20px;
        margin-right: 20px;
        overflow: hidden;
      }
      
      .time-weather-widget .widget-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
          rgba(15, 23, 42, 0.95) 0%, 
          rgba(30, 41, 59, 0.95) 50%, 
          rgba(15, 23, 42, 0.95) 100%);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        z-index: -2;
      }
      
      .time-weather-widget .widget-border {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
          rgba(148, 163, 184, 0.3) 0%, 
          rgba(71, 85, 105, 0.3) 50%, 
          rgba(148, 163, 184, 0.3) 100%);
        border-radius: 16px;
        z-index: -1;
        animation: borderPulse 3s ease-in-out infinite;
      }
      
      .time-weather-widget .widget-glow {
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        background: radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
        border-radius: 20px;
        z-index: -3;
        opacity: 0.8;
      }
      
      .time-weather-widget .widget-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0 24px;
        z-index: 1;
      }
      
      .time-weather-widget .time-section,
      .time-weather-widget .weather-section {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
      }
      
      .time-weather-widget .time-icon,
      .time-weather-widget .weather-icon {
        font-size: 24px;
        transition: transform 0.3s ease;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
      }
      
      .time-weather-widget .time-text,
      .time-weather-widget .weather-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .time-weather-widget .time-main,
      .time-weather-widget .weather-main {
        font-size: 18px;
        font-weight: 700;
        color: #f1f5f9;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      
      .time-weather-widget .time-period,
      .time-weather-widget .weather-temp {
        font-size: 13px;
        font-weight: 500;
        color: #cbd5e1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        letter-spacing: 0.25px;
        white-space: nowrap;
      }
      
      .time-weather-widget .separator {
        width: 2px;
        height: 35px;
        background: linear-gradient(to bottom, 
          transparent 0%, 
          rgba(148, 163, 184, 0.4) 20%, 
          rgba(148, 163, 184, 0.6) 50%, 
          rgba(148, 163, 184, 0.4) 80%, 
          transparent 100%);
        border-radius: 1px;
        margin: 0 8px;
      }
      
      /* Thèmes jour/nuit */
      .time-weather-widget.day-theme .widget-background {
        background: linear-gradient(135deg, 
          rgba(59, 130, 246, 0.9) 0%, 
          rgba(147, 197, 253, 0.9) 50%, 
          rgba(59, 130, 246, 0.9) 100%);
      }
      
      .time-weather-widget.night-theme .widget-background {
        background: linear-gradient(135deg, 
          rgba(30, 27, 75, 0.95) 0%, 
          rgba(88, 28, 135, 0.95) 50%, 
          rgba(30, 27, 75, 0.95) 100%);
      }
      
      .time-weather-widget.day-theme .widget-border {
        background: linear-gradient(135deg, 
          rgba(251, 191, 36, 0.4) 0%, 
          rgba(245, 158, 11, 0.4) 50%, 
          rgba(251, 191, 36, 0.4) 100%);
      }
      
      .time-weather-widget.night-theme .widget-border {
        background: linear-gradient(135deg, 
          rgba(139, 92, 246, 0.4) 0%, 
          rgba(168, 85, 247, 0.4) 50%, 
          rgba(139, 92, 246, 0.4) 100%);
      }
      
      /* États */
      .time-weather-widget.ui-disabled {
        opacity: 0.4;
        filter: grayscale(80%);
        pointer-events: none;
      }
      
      .time-weather-widget.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-20px) scale(0.9);
      }
      
      .time-weather-widget.ui-fade-in {
        animation: modernFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .time-weather-widget.ui-fade-out {
        animation: modernFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Animations */
      @keyframes modernFadeIn {
        0% {
          opacity: 0;
          transform: translateY(-30px) scale(0.8);
        }
        100% {
          opacity: 0;
          transform: translateY(-20px) scale(0.9);
        }
      }
      
      @keyframes borderPulse {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.6;
        }
      }
      
      /* Hover effects */
      .time-weather-widget:hover {
        transform: translateY(-2px);
      }
      
      .time-weather-widget:hover .widget-glow {
        opacity: 1;
      }
      
      .time-weather-widget:hover .time-icon,
      .time-weather-widget:hover .weather-icon {
        transform: scale(1.1);
      }
      
      /* Responsive */
      @media (max-width: 800px) {
        .time-weather-widget.ui-icon.modern-mmo {
          width: 220px !important;
          height: 55px !important;
          min-width: 220px !important;
          max-width: 220px !important;
          min-height: 55px !important;
          max-height: 55px !important;
        }
        
        .time-weather-widget .widget-content {
          padding: 0 15px;
        }
        
        .time-weather-widget .time-icon,
        .time-weather-widget .weather-icon {
          font-size: 20px;
        }
        
        .time-weather-widget .time-main,
        .time-weather-widget .weather-main {
          font-size: 14px;
        }
        
        .time-weather-widget .time-period,
        .time-weather-widget .weather-temp {
          font-size: 11px;
        }
      }
      
      /* Indicateur UIManager */
      .time-weather-widget[data-positioned-by="uimanager"]::after {
        content: "⚡";
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 12px;
        opacity: 0.7;
        pointer-events: none;
        animation: sparkle 2s ease-in-out infinite;
      }
      
      @keyframes sparkle {
        0%, 100% {
          opacity: 0.7;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TimeWeatherWidget] Styles MMO modernes injectés');
  }

  // === DESTRUCTION ===
  destroy() {
    this.stopAnimations();
    
    // Arrêter toutes les synchronisations
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
    
    // Supprimer les styles
    const style = document.getElementById('time-weather-widget-css');
    if (style) {
      style.remove();
    }
    
    this.element = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.initialized = false;
    
    console.log('🧹 [TimeWeatherWidget] Widget MMO détruit');
  }

  // === DEBUG ===
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
      theme: this.isDayTime ? 'day' : 'night',
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
