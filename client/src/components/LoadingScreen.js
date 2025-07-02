// client/src/components/LoadingScreen.js - Système d'écran de chargement joueur

export class LoadingScreen {
  constructor(options = {}) {
    // ✅ Configuration avec possibilité de désactiver
    this.enabled = options.enabled !== false; // Par défaut activé
    this.fastMode = options.fastMode || false; // Mode rapide pour debug
    this.theme = options.theme || 'player'; // 'player', 'zone', 'battle', etc.
    
    // Éléments DOM
    this.overlay = null;
    this.textElement = null;
    this.progressElement = null;
    this.dotsTimer = null;
    
    // État
    this.isVisible = false;
    this.currentStep = 0;
    this.stepCount = 0;
    this.stepTexts = [];
    
    // Thèmes prédéfinis
    this.themes = {
      player: {
        title: 'Préparation du personnage',
        steps: [
          "Connexion au serveur...",
          "Chargement des données joueur...",
          "Positionnement du personnage...",
          "Configuration de la caméra...",
          "Finalisation..."
        ],
        icon: '👤',
        color: 'rgba(74, 144, 226, 0.8)',
        stepDelay: 300
      },
      zone: {
        title: 'Chargement de la zone',
        steps: [
          "Chargement de la carte...",
          "Initialisation des objets...",
          "Connexion au serveur...",
          "Synchronisation...",
          "Finalisation..."
        ],
        icon: '🗺️',
        color: 'rgba(34, 197, 94, 0.8)',
        stepDelay: 200
      },
      battle: {
        title: 'Préparation du combat',
        steps: [
          "Chargement des Pokémon...",
          "Initialisation du terrain...",
          "Configuration de la bataille...",
          "Synchronisation...",
          "Début du combat..."
        ],
        icon: '⚔️',
        color: 'rgba(239, 68, 68, 0.8)',
        stepDelay: 250
      },
      shop: {
        title: 'Ouverture de la boutique',
        steps: [
          "Connexion au marchand...",
          "Chargement du catalogue...",
          "Vérification des prix...",
          "Finalisation..."
        ],
        icon: '🏪',
        color: 'rgba(245, 158, 11, 0.8)',
        stepDelay: 200
      },
      // ✅ NOUVEAU: Thème pour initialisation UI
      uiInit: {
        title: 'Initialisation de l\'interface',
        steps: [
          "Démarrage du système UI...",
          "Configuration des modules...",
          "Chargement de l'inventaire...",
          "Chargement de l'équipe...",
          "Chargement des quêtes...",
          "Finalisation de l'interface...",
          "Interface prête !"
        ],
        icon: '🎮',
        color: 'rgba(139, 69, 19, 0.8)',
        stepDelay: 400
      }
    };
    
    if (this.enabled) {
      this.createStyles();
    }
  }

  // ✅ Création des styles cohérents avec votre projet
  createStyles() {
    if (document.querySelector('#loading-screen-styles')) return;

    const style = document.createElement('style');
    style.id = 'loading-screen-styles';
    style.textContent = `
      .loading-screen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      .loading-screen-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .loading-screen-container {
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98));
        border: 2px solid rgba(100, 149, 237, 0.8);
        border-radius: 20px;
        padding: 40px 50px;
        text-align: center;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        min-width: 300px;
        max-width: 450px;
        transform: scale(0.9);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .loading-screen-overlay.visible .loading-screen-container {
        transform: scale(1);
      }

      .loading-screen-icon {
        font-size: 48px;
        margin-bottom: 20px;
        animation: loadingPulse 2s ease-in-out infinite;
      }

      .loading-screen-title {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 10px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      .loading-screen-progress {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 30px;
        min-height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loading-screen-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 20px;
        position: relative;
      }

      .loading-screen-fill {
        height: 100%;
        background: linear-gradient(90deg, 
          rgba(74, 144, 226, 0.8) 0%, 
          rgba(100, 149, 237, 1) 50%, 
          rgba(135, 206, 250, 0.8) 100%);
        border-radius: 3px;
        width: 0%;
        transition: width 0.5s ease;
        position: relative;
      }

      .loading-screen-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.4), 
          transparent);
        animation: loadingShimmer 2s ease-in-out infinite;
      }

      .loading-screen-step {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
        margin-bottom: 15px;
      }

      .loading-screen-footer {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

      /* Animations */
      @keyframes loadingPulse {
        0%, 100% { 
          transform: scale(1); 
          opacity: 0.8; 
        }
        50% { 
          transform: scale(1.1); 
          opacity: 1; 
        }
      }

      @keyframes loadingShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      @keyframes stepTransition {
        0% { 
          opacity: 0; 
          transform: translateY(10px); 
        }
        100% { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }

      .loading-screen-step.new {
        animation: stepTransition 0.3s ease;
      }

      /* Variants de thème */
      .loading-screen-container.theme-player .loading-screen-fill {
        background: linear-gradient(90deg, 
          rgba(74, 144, 226, 0.8) 0%, 
          rgba(100, 149, 237, 1) 50%, 
          rgba(135, 206, 250, 0.8) 100%);
      }

      .loading-screen-container.theme-zone .loading-screen-fill {
        background: linear-gradient(90deg, 
          rgba(34, 197, 94, 0.8) 0%, 
          rgba(74, 222, 128, 1) 50%, 
          rgba(134, 239, 172, 0.8) 100%);
      }

      .loading-screen-container.theme-battle .loading-screen-fill {
        background: linear-gradient(90deg, 
          rgba(239, 68, 68, 0.8) 0%, 
          rgba(248, 113, 113, 1) 50%, 
          rgba(252, 165, 165, 0.8) 100%);
      }

      .loading-screen-container.theme-shop .loading-screen-fill {
        background: linear-gradient(90deg, 
          rgba(245, 158, 11, 0.8) 0%, 
          rgba(251, 191, 36, 1) 50%, 
          rgba(253, 224, 71, 0.8) 100%);
      }

      /* Mode rapide */
      .loading-screen-overlay.fast-mode {
        transition: opacity 0.1s ease;
      }

      .loading-screen-overlay.fast-mode .loading-screen-container {
        transition: transform 0.1s ease;
      }

      .loading-screen-overlay.fast-mode .loading-screen-fill {
        transition: width 0.1s ease;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .loading-screen-container {
          padding: 30px 40px;
          margin: 20px;
          min-width: 280px;
        }

        .loading-screen-icon {
          font-size: 40px;
          margin-bottom: 15px;
        }

        .loading-screen-title {
          font-size: 20px;
        }

        .loading-screen-progress {
          font-size: 14px;
        }
      }

      /* Mode désactivé */
      .loading-screen-overlay.disabled {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  // ✅ Afficher l'écran de chargement
  show(themeOrSteps = 'player', options = {}) {
    if (!this.enabled) {
      console.log('📱 LoadingScreen désactivé, skip');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Configuration du thème
      const theme = typeof themeOrSteps === 'string' ? 
        this.themes[themeOrSteps] || this.themes.player : 
        { 
          title: options.title || 'Chargement...',
          steps: Array.isArray(themeOrSteps) ? themeOrSteps : ['Chargement...'],
          icon: options.icon || '⏳',
          color: options.color || 'rgba(74, 144, 226, 0.8)',
          stepDelay: options.stepDelay || 300
        };

      this.stepTexts = theme.steps;
      this.stepCount = theme.steps.length;
      this.currentStep = 0;

      // Créer l'overlay
      this.createOverlay(theme);
      
      // Ajouter au DOM
      document.body.appendChild(this.overlay);
      
      // Animation d'entrée
      setTimeout(() => {
        this.overlay.classList.add('visible');
        this.isVisible = true;
        
        // Démarrer la séquence d'étapes
        this.startStepSequence(theme.stepDelay, resolve);
      }, 50);
    });
  }

  // ✅ Créer l'overlay DOM
  createOverlay(theme) {
    this.overlay = document.createElement('div');
    this.overlay.className = `loading-screen-overlay theme-${this.theme}`;
    
    if (this.fastMode) {
      this.overlay.classList.add('fast-mode');
    }

this.overlay.innerHTML = `
  <div class="loading-screen-container theme-${this.theme}">
    <div class="loading-screen-icon">${theme.icon}</div>
    <div class="loading-screen-title">${theme.title}</div>
    <div class="loading-screen-progress" id="loading-progress-text">${theme.steps[0]}</div>
    <div class="loading-screen-bar">
      <div class="loading-screen-fill" id="loading-progress-bar"></div>
    </div>
    <div class="loading-screen-step" id="loading-step-indicator">Step 1/${this.stepCount}</div>
    <div class="loading-screen-footer">Please wait... (Wild Pokémon may appear!)</div>
  </div>
`;


    this.textElement = this.overlay.querySelector('#loading-progress-text');
    this.progressElement = this.overlay.querySelector('#loading-progress-bar');
    this.stepIndicator = this.overlay.querySelector('#loading-step-indicator');
  }

  // ✅ Démarrer la séquence d'étapes
  startStepSequence(stepDelay, onComplete) {
    const actualDelay = this.fastMode ? 50 : stepDelay;
    
    const processNextStep = () => {
      if (this.currentStep < this.stepCount) {
        this.updateStep(this.currentStep);
        this.currentStep++;
        
        setTimeout(() => {
          if (this.isVisible) { // Vérifier si toujours visible
            processNextStep();
          }
        }, actualDelay);
      } else {
        // Séquence terminée
        setTimeout(() => {
          if (this.isVisible) {
            this.hide().then(onComplete);
          } else {
            onComplete();
          }
        }, actualDelay);
      }
    };

    processNextStep();
  }

  // ✅ Mettre à jour une étape
  updateStep(stepIndex) {
    if (!this.isVisible || stepIndex >= this.stepTexts.length) return;

    const stepText = this.stepTexts[stepIndex];
    const progress = ((stepIndex + 1) / this.stepCount) * 100;

    // Animation du texte
    if (this.textElement) {
      this.textElement.classList.add('new');
      this.textElement.textContent = stepText;
      setTimeout(() => {
        if (this.textElement) {
          this.textElement.classList.remove('new');
        }
      }, 300);
    }

    // Progression de la barre
    if (this.progressElement) {
      this.progressElement.style.width = `${progress}%`;
    }

    // Indicateur d'étape
    if (this.stepIndicator) {
      this.stepIndicator.textContent = `Étape ${stepIndex + 1}/${this.stepCount}`;
    }

    console.log(`📱 LoadingScreen: Étape ${stepIndex + 1}/${this.stepCount} - ${stepText}`);
  }

  // ✅ Masquer l'écran de chargement
hide() {
  if (!this.isVisible || !this.overlay) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    this.isVisible = false;

    // Animation de sortie
    this.overlay.classList.remove('visible');

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.cleanup();

      // === FLAG GLOBAL À LA FIN DU LOADING ===
      window.loadingScreenClosed = true;
      if (window.playerSpawned && !window.playerReady) {
        window.playerReady = true;
        console.log('[GLOBAL] playerReady = true (fin loading + joueur OK)');
      }

      resolve();
    }, this.fastMode ? 100 : 400);
  });
}


  // ✅ Nettoyage
  cleanup() {
    if (this.dotsTimer) {
      clearInterval(this.dotsTimer);
      this.dotsTimer = null;
    }
    
    this.overlay = null;
    this.textElement = null;
    this.progressElement = null;
    this.stepIndicator = null;
    this.currentStep = 0;
  }

  // ✅ Méthodes utilitaires
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`📱 LoadingScreen ${enabled ? 'activé' : 'désactivé'}`);
  }

  setFastMode(fastMode) {
    this.fastMode = fastMode;
    console.log(`📱 LoadingScreen mode ${fastMode ? 'rapide' : 'normal'}`);
  }

  setTheme(theme) {
    this.theme = theme;
  }

  isActive() {
    return this.isVisible;
  }

  // ✅ Méthodes pour différents contextes
  showPlayerLoading() {
    return this.show('player');
  }

  showZoneLoading() {
    return this.show('zone');
  }

  showBattleLoading() {
    return this.show('battle');
  }
  
  // ✅ NOUVEAU: Méthode pour chargement UI
  showUIInitLoading() {
    return this.show('uiInit');
  }
  
  showShopLoading() {
    return this.show('shop');
  }
  showCustomLoading(steps, options = {}) {
    return this.show(steps, options);
  }

  // ✅ Méthodes avancées pour contrôle manuel
showManual(title, icon = '⏳') {
  if (!this.enabled) return Promise.resolve();

  // ✅ FIX: Créer un thème minimal avec AU MOINS une étape
  const theme = {
    title,
    steps: [title], // ← AJOUTER AU MOINS UNE ÉTAPE
    icon,
    color: 'rgba(74, 144, 226, 0.8)',
    stepDelay: 0
  };

  // ✅ FIX: Configurer stepTexts et stepCount correctement
  this.stepTexts = theme.steps;
  this.stepCount = theme.steps.length; // ← MAINTENANT = 1 au lieu de 0
  this.currentStep = 0;

  this.createOverlay(theme);
  document.body.appendChild(this.overlay);
  
  setTimeout(() => {
    this.overlay.classList.add('visible');
    this.isVisible = true;
  }, 50);

  return Promise.resolve();
}

// ✅ BONUS: Ajouter une méthode pour finir manuellement
finishManualLoading() {
  if (this.isVisible && this.overlay) {
    return this.hide();
  }
  return Promise.resolve();
}

  updateManual(text, progress = null) {
    if (!this.isVisible || !this.textElement) return;

    this.textElement.textContent = text;
    
    if (progress !== null && this.progressElement) {
      this.progressElement.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  // ✅ Méthodes statiques pour utilisation globale
  static create(options = {}) {
    return new LoadingScreen(options);
  }

  static createGlobal(options = {}) {
    if (!window.globalLoadingScreen) {
      window.globalLoadingScreen = new LoadingScreen(options);
    }
    return window.globalLoadingScreen;
  }

  static getGlobal() {
    return window.globalLoadingScreen || LoadingScreen.createGlobal();
  }

  // ✅ Méthodes de configuration avancée
  addCustomTheme(name, config) {
    this.themes[name] = {
      title: config.title || 'Chargement...',
      steps: config.steps || ['Chargement...'],
      icon: config.icon || '⏳',
      color: config.color || 'rgba(74, 144, 226, 0.8)',
      stepDelay: config.stepDelay || 300
    };
  }

  // ✅ Mode de débogage
  debug() {
    console.log('🔍 LoadingScreen Debug Info:', {
      enabled: this.enabled,
      fastMode: this.fastMode,
      theme: this.theme,
      isVisible: this.isVisible,
      currentStep: this.currentStep,
      stepCount: this.stepCount,
      availableThemes: Object.keys(this.themes)
    });
  }

  // ✅ Nettoyage complet
  destroy() {
    this.hide();
    
    // Supprimer les styles si c'est la dernière instance
    const style = document.querySelector('#loading-screen-styles');
    if (style) {
      style.remove();
    }

    // Nettoyer la référence globale si c'est cette instance
    if (window.globalLoadingScreen === this) {
      window.globalLoadingScreen = null;
    }

    console.log('📱 LoadingScreen détruit');
  }
}

// ✅ Configuration par défaut exportée
export const LoadingScreenConfig = {
  // Activation globale
  ENABLED: true,
  
  // Mode rapide pour développement
  FAST_MODE: false,
  
  // Thème par défaut
  DEFAULT_THEME: 'player',
  
  // Durées par défaut
  DEFAULT_STEP_DELAY: 300,
  FAST_STEP_DELAY: 50,
  
  // Messages par défaut
  DEFAULT_MESSAGES: {
    PLAYER_READY: "Préparation du personnage...",
    ZONE_LOADING: "Chargement de la zone...",
    BATTLE_PREP: "Préparation du combat...",
    SHOP_OPENING: "Ouverture de la boutique..."
  }
};

// ✅ Utilitaires d'usage rapide
export const QuickLoading = {
  player: () => LoadingScreen.getGlobal().showPlayerLoading(),
  zone: () => LoadingScreen.getGlobal().showZoneLoading(),
  battle: () => LoadingScreen.getGlobal().showBattleLoading(),
  shop: () => LoadingScreen.getGlobal().showShopLoading(),
  uiInit: () => LoadingScreen.getGlobal().showUIInitLoading(),
  custom: (steps, options) => LoadingScreen.getGlobal().showCustomLoading(steps, options),
  hide: () => LoadingScreen.getGlobal().hide()
};
