// ui/TimeWeatherWidget.js - Style Pokémon Moderne avec Particules Dynamiques
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
    this.gameplayBonus = { active: true, text: '+15% XP Pokémon Eau', type: 'water' };
      this.lastWeatherSent = null; // 🔥 NOUVEAU: Pour éviter les doubles updates

    // 🎮 Configuration météo Pokémon avec particules
    this.pokemonWeatherConfig = {
      clear: { 
        icon: '☀️', 
        pokemon: '🔥', 
        gradient: 'linear-gradient(135deg, #ff9a56 0%, #ffcc33 100%)',
        particles: '✨',
        bonus: 'Feu',
        color: '#ff9a56',
        particleCount: 6
      },
      rain: { 
        icon: '🌧️', 
        pokemon: '💧', 
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #64748b 100%)',
        particles: '💧',
        bonus: 'Eau',
        color: '#3b82f6',
        particleCount: 8
      },
      storm: { 
        icon: '⚡', 
        pokemon: '⚡', 
        gradient: 'linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%)',
        particles: '⚡',
        bonus: 'Électrik',
        color: '#6366f1',
        particleCount: 10
      },
      snow: { 
        icon: '❄️', 
        pokemon: '🧊', 
        gradient: 'linear-gradient(135deg, #60a5fa 0%, #f8fafc 100%)',
        particles: '❄️',
        bonus: 'Glace',
        color: '#60a5fa',
        particleCount: 12
      },
      fog: { 
        icon: '🌫️', 
        pokemon: '👻', 
        gradient: 'linear-gradient(135deg, #9ca3af 0%, #f3f4f6 100%)',
        particles: '🌫️',
        bonus: 'Spectre',
        color: '#9ca3af',
        particleCount: 5
      },
      cloudy: { 
        icon: '☁️', 
        pokemon: '🌪️', 
        gradient: 'linear-gradient(135deg, #6b7280 0%, #d1d5db 100%)',
        particles: '☁️',
        bonus: 'Vol',
        color: '#6b7280',
        particleCount: 4
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
    
    console.log('🎮 [PokémonWeatherWidget] Instance créée avec particules dynamiques');
  }

  // === 🎨 CRÉATION DU WIDGET ===
  createIcon() {
    console.log('🎮 [PokémonWeatherWidget] Création du widget avec particules');
    
    // Nettoyage
    const existing = document.getElementById(this.id);
    if (existing) existing.remove();
    
    // Création de l'élément principal
    const el = document.createElement('div');
    el.id = this.id;
    el.className = 'pokemon-weather-widget ui-icon';
    el.innerHTML = this.generateWidgetHTML();
    
    document.body.appendChild(el);
    this.element = el;
    
    // Initialisation
    this.injectStyles();
    this.initializeConnections();
    this.updateInitialContent();
    this.startAllAnimations();
    
    // Synchronisation différée
    setTimeout(() => {
      this.forceImmediateSync();
      setTimeout(() => this.updateCurrentZone(), 200);
    }, 100);
    
    this.initialized = true;
    console.log('✅ [PokémonWeatherWidget] Widget Pokémon créé avec succès');
    return el;
  }

  generateWidgetHTML() {
    return `
      <!-- Pokéball Background -->
      <div class="pokeball-background">
        <div class="pokeball-top"></div>
        <div class="pokeball-bottom"></div>
        <div class="pokeball-center">
          <div class="pokeball-button"></div>
        </div>
      </div>
      
      <!-- Weather Particles Container -->
      <div class="weather-particles" id="${this.id}-particles">
        ${this.generateParticlesHTML()}
      </div>
      
      <!-- Main Widget Content -->
      <div class="widget-glass-container">
        <div class="widget-content">
          <!-- Header avec Zone -->
          <div class="header-section" style="margin-top: -22px; position: relative; top: -22px;">
            <div class="zone-badge" id="${this.id}-zone">
              <span class="zone-icon">📍</span>
              <span class="zone-text">Village</span>
            </div>
          </div>
          
          <!-- Section Temps et Météo -->
          <div class="main-section" style="margin-top: -22px; position: relative; top: -22px;">
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
          
          <!-- Section Bonus Gameplay -->
          <div class="bonus-section" id="${this.id}-bonus" style="margin-top: -22px; position: relative; top: -22px;">
            <div class="bonus-icon">🎮</div>
            <div class="bonus-text">+15% XP Pokémon Eau</div>
            <div class="bonus-type-icon">💧</div>
          </div>
        </div>
      </div>
      
      <!-- Glow Effects -->
      <div class="widget-glow" id="${this.id}-glow"></div>
    `;
  }

  generateParticlesHTML() {
    const particleCount = this.pokemonWeatherConfig[this.weather.weather]?.particleCount || 6;
    let particlesHTML = '';
    
    for (let i = 1; i <= particleCount; i++) {
      const delay = i * 0.3;
      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      
      particlesHTML += `
        <div class="particle particle-${i}" 
             style="left: ${randomX}%; top: ${randomY}%; animation-delay: ${delay}s;">
          ✨
        </div>
      `;
    }
    
    return particlesHTML;
  }

  // === 🌐 CONNEXIONS ET SYNCHRONISATION ===
  initializeConnections() {
    this.initializeZoneMapping();
    this.connectToGlobalWeatherManager();
  }

  initializeZoneMapping() {
    if (window.ZoneMapping && window.ZoneMapping.config) {
      this.zoneMapping = window.ZoneMapping;
      console.log('🗺️ [PokémonWeatherWidget] ZoneMapping connecté');
    } else {
      console.warn('⚠️ [PokémonWeatherWidget] ZoneMapping non disponible');
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
    
    console.log('✅ [PokémonWeatherWidget] Polling intelligent démarré');
  }

  forceImmediateSync() {
    console.log('🚀 [PokémonWeatherWidget] Synchronisation immédiate');
    
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
      console.warn('⚠️ [PokémonWeatherWidget] Erreur détection zone:', error);
    }
    
    this.updateZone(currentZone);
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

  // === 🎮 MÉTHODES DE MISE À JOUR ===
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
  }

updateWeather(weather, displayName, temperature = '22°C') {
 this.weather = { weather, displayName, temperature };
 if (!this.element) return;
 
 const config = this.pokemonWeatherConfig[weather] || this.pokemonWeatherConfig.clear;
 
 // Mise à jour DOM optimisée
 const updates = [
   ['.weather-main', displayName],
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
 
 // 🔥 NOUVEAU: Forcer la mise à jour immédiate du weather system
 if (window.globalWeatherManager && weather !== this.lastWeatherSent) {
   console.log(`🔥 FORCE WEATHER SYSTEM UPDATE: ${weather}`);
   
   // Forcer la mise à jour immédiate du weather system
   window.globalWeatherManager.currentWeather = {
     weather: weather,
     displayName: displayName
   };
   
   // Déclencher immédiatement les effets visuels dans le jeu
   if (typeof window.globalWeatherManager.updateAllScenes === 'function') {
     window.globalWeatherManager.updateAllScenes('widget-force-update');
   }
   
   this.lastWeatherSent = weather;
 }
 
 // Mise à jour des effets visuels du widget
 this.updateWeatherEffects(config);
 this.updateWeatherParticles(config);
 this.updateGameplayBonus({
   active: true,
   text: `+15% XP Pokémon ${config.bonus}`,
   type: weather
 });
 
 console.log(`🌤️ Météo mise à jour: ${displayName} avec ${config.particleCount} particules`);
}
  updateWeatherEffects(config) {
    const glassContainer = this.element?.querySelector('.widget-glass-container');
    const glowElement = this.element?.querySelector('.widget-glow');
    
    if (glassContainer) {
      glassContainer.style.background = config.gradient;
    }
    
    if (glowElement) {
      glowElement.style.background = `radial-gradient(circle at 50% 50%, ${config.color}33 0%, transparent 70%)`;
    }
  }

  updateWeatherParticles(config) {
    const particleContainer = this.element?.querySelector('.weather-particles');
    if (!particleContainer) return;
    
    // Régénérer les particules avec le bon nombre
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
      bonusText.textContent = bonus.text;
    }
    
    if (bonusTypeIcon && bonus.type) {
      const typeIcon = this.pokemonWeatherConfig[bonus.type]?.pokemon || '🎮';
      if (bonusTypeIcon.textContent !== typeIcon) {
        bonusTypeIcon.textContent = typeIcon;
      }
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

  // === ✨ ANIMATIONS OPTIMISÉES ===
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
      pokemonIcon: this.element.querySelector('.pokemon-type-icon'),
      pokeball: this.element.querySelector('.pokeball-background')
    };
    
    // Animations optimisées
    if (elements.timeIcon) {
      elements.timeIcon.style.transform = `rotate(${Math.sin(time) * 3}deg)`;
    }
    
    if (elements.weatherIcon) {
      elements.weatherIcon.style.transform = `scale(${1 + Math.sin(time * 1.5) * 0.05})`;
    }
    
    if (elements.pokemonIcon) {
      const bounce = Math.sin(time * 2) * 0.03;
      elements.pokemonIcon.style.transform = `translateY(${bounce}px) scale(${1 + bounce})`;
    }
    
    if (elements.pokeball) {
      elements.pokeball.style.transform = `rotate(${(time * 10) % 360}deg)`;
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
        
        // Animation selon le type de météo
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
          default:
            this.animateDefaultParticle(particle, time, delay);
        }
      });
      
      this.particleAnimationFrame = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
  }

  animateRainParticle(particle, time, delay) {
    const x = Math.sin(time + delay) * 5;
    const y = ((time * 60 + delay * 100) % 250) - 50;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = y > 180 ? 0 : 0.8;
  }

  animateStormParticle(particle, time, delay) {
    const x = Math.sin(time * 3 + delay) * 40;
    const y = Math.cos(time * 2 + delay) * 25;
    const flash = Math.sin(time * 8 + delay) > 0.6 ? 1 : 0.3;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = flash;
  }

  animateSnowParticle(particle, time, delay) {
    const x = Math.sin(time * 0.5 + delay) * 30;
    const y = ((time * 25 + delay * 80) % 220) - 40;
    const rotation = (time * 50 + delay * 100) % 360;
    particle.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    particle.style.opacity = y > 160 ? 0 : 0.7;
  }

  animateFogParticle(particle, time, delay) {
    const x = Math.sin(time * 0.3 + delay) * 50;
    const y = Math.cos(time * 0.2 + delay) * 20;
    const opacity = 0.2 + Math.sin(time + delay) * 0.3;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    particle.style.opacity = Math.max(0.1, opacity);
  }

  animateDefaultParticle(particle, time, delay) {
    const x = Math.sin(time + delay) * 20;
    const y = Math.cos(time * 0.8 + delay) * 15;
    const opacity = 0.3 + Math.sin(time + delay) * 0.2;
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

  // === 🎛️ MÉTHODES UIMANAGER ===
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
    return { left: computed.left, top: computed.top, source: 'computed' };
  }

  // === 🎨 INJECTION DES STYLES ===
  injectStyles() {
    if (document.getElementById('pokemon-weather-widget-css')) return;
    
    const style = document.createElement('style');
    style.id = 'pokemon-weather-widget-css';
    style.textContent = POKEMON_WEATHER_STYLES;
    document.head.appendChild(style);
    console.log('🎨 [PokémonWeatherWidget] Styles Pokémon injectés');
  }

  // === 🧹 DESTRUCTION ===
  destroy() {
    this.stopAnimations();
    
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
    
    console.log('🧹 [PokémonWeatherWidget] Widget détruit avec particules');
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
      location: this.location,
      gameplayBonus: this.gameplayBonus,
      theme: this.isDayTime ? 'day' : 'night',
      weatherConfig: this.pokemonWeatherConfig[this.weather.weather],
      particleCount: this.pokemonWeatherConfig[this.weather.weather]?.particleCount || 0,
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
