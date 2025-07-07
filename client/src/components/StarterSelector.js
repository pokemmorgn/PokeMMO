// ✅ StarterSelector ULTRA-SIMPLIFIÉ - Juste l'UI, InteractionManager gère le reste
export class StarterSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedStarterId = null;
    this.networkManager = null;
    
    // Elements HTML
    this.overlay = null;
    this.container = null;
    
    // Configuration des starters
    this.starterConfig = [
      {
        id: 'bulbasaur',
        name: 'Bulbizarre',
        type: 'Plante',
        description: 'Un Pokémon Graine docile et loyal.',
        color: '#4CAF50'
      },
      {
        id: 'charmander', 
        name: 'Salamèche',
        type: 'Feu',
        description: 'Un Pokémon Lézard fougueux et brave.',
        color: '#FF5722'
      },
      {
        id: 'squirtle',
        name: 'Carapuce', 
        type: 'Eau',
        description: 'Un Pokémon Minitortue calme et sage.',
        color: '#2196F3'
      }
    ];
    
    this.currentlySelectedIndex = -1;
    this.starterOptions = [];
    
    console.log("🎯 [StarterSelector] Version ultra-simplifiée initialisée");
  }

  // ✅ SIMPLE: Juste stocker NetworkManager + FIX CSS
initialize(networkManager) {
  this.networkManager = networkManager;
  
  // ✅ FIX: Forcer le chargement du CSS immédiatement
  this.ensureCSS();
  
  // ✅ FIX: S'assurer que starterConfig n'est jamais null
  if (!this.starterConfig) {
    this.starterConfig = this.getDefaultStarters();
  }
  
  // ✅ NOUVEAU: Setup des listeners serveur
  this.setupServerMessageListeners();
  
  console.log("✅ [StarterSelector] Initialisé (ultra-simple + fixes + listeners)");
  return this;
}

  setupServerMessageListeners() {
  if (!this.networkManager?.room) {
    console.warn("⚠️ [StarterSelector] NetworkManager ou room manquant");
    return;
  }

  console.log("📡 [StarterSelector] Setup des listeners serveur...");

  // ✅ LISTENER: Réponse du serveur après sélection
  this.networkManager.room.onMessage("starterReceived", (data) => {
    console.log("📥 [StarterSelector] starterReceived:", data);
    
    if (data.success) {
      // Succès : fermer l'UI après un délai pour voir la confirmation
      this.showNotification(data.message || "Pokémon reçu avec succès !", 'success');
      setTimeout(() => {
        this.hide();
      }, 2000);
    } else {
      // Erreur : afficher le message et permettre une nouvelle sélection
      this.showNotification(data.message || "Erreur lors de la sélection", 'error');
      // Réactiver le bouton de confirmation
      const confirmBtn = this.overlay?.querySelector('.starter-confirm-btn');
      if (confirmBtn) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.textContent = '⚡ Confirmer';
      }
    }
  });
}
  
  // ✅ NOUVELLE MÉTHODE: S'assurer que le CSS est chargé
  ensureCSS() {
    if (document.querySelector('#starter-selector-manual-styles, #starter-selector-fallback-styles, #starter-selector-styles')) {
      return; // CSS déjà présent
    }

    console.log("🎨 [StarterSelector] Ajout CSS de secours...");
    
    const style = document.createElement('style');
    style.id = 'starter-selector-fallback-styles';
    style.textContent = `
      .starter-overlay {
        position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        background: rgba(0, 0, 0, 0.8) !important; display: flex !important; justify-content: center !important;
        align-items: center !important; z-index: 9999 !important; backdrop-filter: blur(5px) !important; opacity: 1 !important;
      }
      .starter-overlay.hidden { opacity: 0 !important; pointer-events: none !important; }
      .starter-container {
        width: 90% !important; max-width: 600px !important; background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
        border: 3px solid #4a90e2 !important; border-radius: 20px !important; display: flex !important;
        flex-direction: column !important; color: white !important; font-family: 'Segoe UI', Arial, sans-serif !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important; transform: scale(1) !important;
      }
      .starter-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important; padding: 20px 25px !important;
        border-radius: 17px 17px 0 0 !important; text-align: center !important;
      }
      .starter-main-title { font-size: 24px !important; font-weight: bold !important; color: #FFD700 !important; margin: 0 !important; }
      .starter-subtitle { font-size: 14px !important; color: #E2E8F0 !important; margin: 5px 0 0 0 !important; }
      .starter-content { padding: 40px 30px !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 30px !important; }
      .starter-pokeballs { display: flex !important; justify-content: center !important; gap: 40px !important; width: 100% !important; }
      .starter-pokeball-slot {
        display: flex !important; flex-direction: column !important; align-items: center !important; gap: 15px !important;
        cursor: pointer !important; padding: 20px !important; border-radius: 15px !important;
        background: rgba(255, 255, 255, 0.05) !important; border: 2px solid rgba(255, 255, 255, 0.1) !important;
        transition: all 0.3s ease !important;
      }
      .starter-pokeball-slot:hover { background: rgba(74, 144, 226, 0.1) !important; transform: translateY(-5px) !important; }
      .starter-pokeball-slot.selected { background: rgba(74, 144, 226, 0.2) !important; border-color: #4a90e2 !important; }
      .starter-pokeball { width: 64px !important; height: 64px !important; background-size: contain !important; background-repeat: no-repeat !important; }
      .starter-name { font-size: 16px !important; font-weight: bold !important; color: #ecf0f1 !important; }
      .starter-type { font-size: 12px !important; padding: 4px 8px !important; border-radius: 8px !important; font-weight: bold !important; color: white !important; }
      .starter-type.plante { background: #78C850 !important; } .starter-type.feu { background: #F08030 !important; } .starter-type.eau { background: #6890F0 !important; }
      .starter-info-section { width: 100% !important; background: rgba(255, 255, 255, 0.08) !important; border: 2px solid rgba(74, 144, 226, 0.3) !important; border-radius: 15px !important; padding: 20px !important; text-align: center !important; }
      .starter-footer { background: rgba(0, 0, 0, 0.3) !important; padding: 20px 25px !important; text-align: center !important; border-radius: 0 0 17px 17px !important; }
      .starter-confirm-btn { background: linear-gradient(145deg, #059669, #047857) !important; border: none !important; color: white !important; padding: 12px 30px !important; border-radius: 12px !important; cursor: pointer !important; font-size: 16px !important; font-weight: bold !important; opacity: 0 !important; transition: all 0.3s ease !important; }
      .starter-confirm-btn.visible { opacity: 1 !important; }
      .starter-confirm-btn:hover { background: linear-gradient(145deg, #10B981, #059669) !important; transform: translateY(-2px) !important; }
    `;
    document.head.appendChild(style);
  }

  // ✅ NOUVELLE MÉTHODE: Configuration par défaut
  getDefaultStarters() {
    return [
      {
        id: 'bulbasaur',
        name: 'Bulbizarre',
        type: 'Plante',
        description: 'Un Pokémon Graine docile et loyal.',
        color: '#4CAF50'
      },
      {
        id: 'charmander', 
        name: 'Salamèche',
        type: 'Feu',
        description: 'Un Pokémon Lézard fougueux et brave.',
        color: '#FF5722'
      },
      {
        id: 'squirtle',
        name: 'Carapuce', 
        type: 'Eau',
        description: 'Un Pokémon Minitortue calme et sage.',
        color: '#2196F3'
      }
    ];
  }

  // ✅ MÉTHODE PRINCIPALE: Afficher la sélection (FIXÉE)
  show(availableStarters = null) {
    if (this.isVisible) {
      console.warn("⚠️ [StarterSelector] Déjà visible");
      return;
    }

    console.log("🎯 [StarterSelector] Affichage de la sélection...");
    
    // ✅ FIX: S'assurer que starterConfig existe
    if (!this.starterConfig) {
      this.starterConfig = this.getDefaultStarters();
    }
    
    // ✅ FIX: Utiliser les starters fournis ou la config par défaut (garantie non-null)
    this.starterOptions = availableStarters || this.starterConfig || this.getDefaultStarters();
    
    // Créer l'interface
    this.createHTMLInterface();
    
    // Marquer comme visible
    this.isVisible = true;
    
    // Animation d'entrée
    this.animateIn();
    
    // Notification
    this.showNotification("Choisissez votre starter Pokémon !", 'info');
  }

  // ✅ MÉTHODE: Créer SVG de pokéball
  getPokeballSVG() {
    return encodeURIComponent(`
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="topGrad" cx="30%" cy="30%">
            <stop offset="0%" style="stop-color:#ff6b6b"/>
            <stop offset="100%" style="stop-color:#dc3545"/>
          </radialGradient>
          <radialGradient id="bottomGrad" cx="30%" cy="70%">
            <stop offset="0%" style="stop-color:#ffffff"/>
            <stop offset="100%" style="stop-color:#f8f9fa"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#topGrad)"/>
        <path d="M 2 32 A 30 30 0 0 0 62 32 Z" fill="url(#bottomGrad)"/>
        <line x1="2" y1="32" x2="62" y2="32" stroke="#000" stroke-width="3"/>
        <circle cx="32" cy="32" r="8" fill="#000"/>
        <circle cx="32" cy="32" r="6" fill="#fff"/>
        <circle cx="32" cy="32" r="3" fill="#ddd"/>
        <ellipse cx="26" cy="26" rx="4" ry="6" fill="#fff" opacity="0.4"/>
      </svg>
    `);
  }

  // ✅ MÉTHODE: Créer l'interface HTML
  createHTMLInterface() {
    // Supprimer l'ancienne interface si elle existe
    if (this.overlay) {
      this.overlay.remove();
    }

    // Créer l'overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'starter-overlay hidden';
    
    // Container principal
    this.container = document.createElement('div');
    this.container.className = 'starter-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'starter-header';
    header.innerHTML = `
      <div class="starter-title">
        <div class="starter-main-title">Choisissez votre Pokémon</div>
        <div class="starter-subtitle">Votre compagnon pour la vie</div>
      </div>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'starter-content';
    
    // Pokéballs
    const pokeballs = document.createElement('div');
    pokeballs.className = 'starter-pokeballs';
    
    this.starterOptions.forEach((starter, index) => {
      const slot = document.createElement('div');
      slot.className = `starter-pokeball-slot ${starter.id}`;
      slot.innerHTML = `
        <div class="starter-pokeball" style="background-image: url('data:image/svg+xml,${this.getPokeballSVG()}')"></div>
        <div class="starter-name">${starter.name}</div>
        <div class="starter-type ${starter.type.toLowerCase()}">${starter.type}</div>
      `;
      
      // Event listeners pour le slot
      slot.addEventListener('click', () => this.selectStarter(starter, index));
      slot.addEventListener('mouseenter', () => this.showStarterInfo(starter, index));
      slot.addEventListener('mouseleave', () => this.hideStarterInfo());
      
      pokeballs.appendChild(slot);
    });
    
    // Section info
    const infoSection = document.createElement('div');
    infoSection.className = 'starter-info-section';
    infoSection.innerHTML = `
      <div class="starter-info-empty">Survolez un Pokémon pour voir ses détails</div>
    `;
    
    content.appendChild(pokeballs);
    content.appendChild(infoSection);
    
    // Footer avec bouton
    const footer = document.createElement('div');
    footer.className = 'starter-footer';
    footer.innerHTML = `
      <button class="starter-confirm-btn">
        <span>⚡</span> Confirmer
      </button>
    `;
    
    // Assembler
    this.container.appendChild(header);
    this.container.appendChild(content);
    this.container.appendChild(footer);
    this.overlay.appendChild(this.container);
    
    // Ajouter au DOM
    document.body.appendChild(this.overlay);
    
    // Event listeners
    this.setupHTMLEvents();
  }

  // ✅ MÉTHODE: Setup des événements HTML
  setupHTMLEvents() {
    // Bouton de confirmation
    const confirmBtn = this.overlay.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.selectedStarterId) {
          this.confirmSelection();
        }
      });
    }

    // Empêcher la fermeture par clic sur l'overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.showNotification("Vous devez choisir un Pokémon !", 'warning');
      }
    });
  }

  // ✅ MÉTHODE: Afficher les infos d'un starter
  showStarterInfo(starter, index) {
    const infoSection = this.overlay.querySelector('.starter-info-section');
    if (infoSection) {
      infoSection.innerHTML = `
        <div class="starter-info-title">${starter.name}</div>
        <div class="starter-info-description">${starter.description}</div>
      `;
    }
  }

  // ✅ MÉTHODE: Masquer les infos
  hideStarterInfo() {
    if (this.currentlySelectedIndex === -1) {
      const infoSection = this.overlay.querySelector('.starter-info-section');
      if (infoSection) {
        infoSection.innerHTML = `
          <div class="starter-info-empty">Survolez un Pokémon pour voir ses détails</div>
        `;
      }
    }
  }

  // ✅ MÉTHODE: Sélectionner un starter
  selectStarter(starter, index) {
    console.log("🎯 [StarterSelector] Starter sélectionné:", starter.name);
    
    this.currentlySelectedIndex = index;
    this.selectedStarterId = starter.id;

    // Mettre à jour l'affichage
    const slots = this.overlay.querySelectorAll('.starter-pokeball-slot');
    slots.forEach((slot, i) => {
      slot.classList.remove('selected');
      if (i === index) {
        slot.classList.add('selected');
      }
    });

    // Afficher les infos du starter sélectionné
    this.showStarterInfo(starter, index);

    // Afficher le bouton de confirmation
    const confirmBtn = this.overlay.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('visible');
    }
  }

  // ✅ MÉTHODE: Confirmer la sélection
  confirmSelection() {
  if (!this.selectedStarterId) return;
  
  console.log("📤 [StarterSelector] Envoi sélection au serveur:", this.selectedStarterId);
  
  if (this.networkManager?.room) {
    // Désactiver le bouton pendant l'envoi
    const confirmBtn = this.overlay?.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('disabled');
      confirmBtn.textContent = '⏳ Envoi...';
    }
    
    this.networkManager.room.send("giveStarterChoice", {
      pokemonId: this.getStarterPokemonId(this.selectedStarterId)
    });
    
    // Animation de confirmation
    this.animateConfirmation();
    
    // Notification d'envoi
    this.showNotification("Sélection envoyée au serveur...", 'info');
  } else {
    this.showNotification("Erreur de connexion serveur", 'error');
  }
}

  getStarterPokemonId(starterId) {
    const mapping = {
      'bulbasaur': 1,
      'charmander': 4,
      'squirtle': 7
    };
    return mapping[starterId] || 1;
  }

  // ✅ MÉTHODE: Animation de confirmation
  animateConfirmation() {
    if (this.container) {
      this.container.classList.add('confirming');
      setTimeout(() => {
        if (this.container) {
          this.container.classList.remove('confirming');
        }
      }, 500);
    }
  }

  // ✅ MÉTHODE: Animation d'entrée
  animateIn() {
    if (this.overlay) {
      // Forcer un reflow
      this.overlay.offsetHeight;
      
      // Retirer la classe hidden pour déclencher l'animation CSS
      this.overlay.classList.remove('hidden');
    }
  }

  // ✅ MÉTHODE: Masquer la sélection
  hide() {
    if (!this.isVisible) {
      console.warn("⚠️ [StarterSelector] Déjà masqué");
      return;
    }

    console.log("🚫 [StarterSelector] Masquage de la sélection...");

    // Animation de sortie
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    
    this.isVisible = false;

    // Nettoyage après animation
    setTimeout(() => {
      this.cleanup();
    }, 300);
  }

  // ✅ MÉTHODE: Afficher une notification
  showNotification(message, type = 'info') {
    if (window.showGameNotification) {
      window.showGameNotification(message, type, { 
        duration: 3000, 
        position: 'top-center' 
      });
    } else {
      console.log(`📢 [StarterSelector] ${type.toUpperCase()}: ${message}`);
    }
  }

  // ✅ MÉTHODE: Nettoyage
  cleanup() {
    console.log("🧹 [StarterSelector] Nettoyage...");

    // Supprimer l'overlay du DOM
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Réinitialiser les variables
    this.container = null;
    this.selectedStarterId = null;
    this.currentlySelectedIndex = -1;
    this.starterOptions = [];

    console.log("✅ [StarterSelector] Nettoyage terminé");
  }

  // ✅ MÉTHODE: Détruire complètement
  destroy() {
    console.log("💀 [StarterSelector] Destruction...");

    // Masquer si visible
    if (this.isVisible) {
      this.hide();
    } else {
      this.cleanup();
    }

    // Null toutes les références
    this.scene = null;
    this.networkManager = null;
    this.starterConfig = null;
  }

  // ✅ MÉTHODES UTILITAIRES
  isSelectionVisible() {
    return this.isVisible;
  }

  getCurrentSelection() {
    return this.selectedStarterId;
  }

  getAvailableStarters() {
    return this.starterOptions;
  }
}

// ✅ GESTIONNAIRE GLOBAL SIMPLIFIÉ
export class StarterSelectionManager {
  constructor() {
    this.activeSelector = null;
    this.currentScene = null;
  }

  getSelector(scene) {
    if (!this.activeSelector || this.currentScene !== scene) {
      if (this.activeSelector) {
        this.activeSelector.destroy();
      }
      this.activeSelector = new StarterSelector(scene);
      this.currentScene = scene;
    }
    return this.activeSelector;
  }

  initialize(scene, networkManager) {
    const selector = this.getSelector(scene);
    return selector.initialize(networkManager);
  }

  show(scene, availableStarters = null) {
    const selector = this.getSelector(scene);
    selector.show(availableStarters);
    return selector;
  }

  hide() {
    if (this.activeSelector) {
      this.activeSelector.hide();
    }
  }

  cleanup() {
    if (this.activeSelector) {
      this.activeSelector.destroy();
      this.activeSelector = null;
      this.currentScene = null;
    }
  }

  isActive() {
    return this.activeSelector?.isSelectionVisible() || false;
  }
}

// ✅ INSTANCE GLOBALE
export const globalStarterManager = new StarterSelectionManager();

// ✅ FONCTION D'INTÉGRATION ULTRA-SIMPLIFIÉE
export function integrateStarterSelectorToScene(scene, networkManager) {
  console.log(`🎯 [StarterIntegration] Intégration ultra-simple à: ${scene.scene.key}`);

  const selector = globalStarterManager.initialize(scene, networkManager);

  // ✅ SEULES MÉTHODES NÉCESSAIRES
  scene.showStarterSelection = (availableStarters = null) => {
    return globalStarterManager.show(scene, availableStarters);
  };

  scene.hideStarterSelection = () => {
    globalStarterManager.hide();
  };

  console.log(`✅ [StarterIntegration] Intégration ultra-simple terminée`);
  return selector;
}

// ✅ UTILITAIRES GLOBAUX SIMPLIFIÉS
export const StarterUtils = {
  showSelection: (availableStarters = null) => {
    const activeScene = window.game?.scene?.getScenes(true)[0];
    if (activeScene && activeScene.showStarterSelection) {
      return activeScene.showStarterSelection(availableStarters);
    }
    console.warn("⚠️ [StarterUtils] Aucune scène active avec starter system");
    return null;
  },

  hideSelection: () => {
    globalStarterManager.hide();
  },

  isActive: () => {
    return globalStarterManager.isActive();
  }
};

console.log("🎯 [StarterSelector] Module ultra-simplifié chargé et prêt !");
