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

  // ✅ SIMPLE: Juste stocker NetworkManager
  initialize(networkManager) {
    this.networkManager = networkManager;
    console.log("✅ [StarterSelector] Initialisé (ultra-simple)");
    return this;
  }

  // ✅ MÉTHODE PRINCIPALE: Afficher la sélection
  show(availableStarters = null) {
    if (this.isVisible) {
      console.warn("⚠️ [StarterSelector] Déjà visible");
      return;
    }

    console.log("🎯 [StarterSelector] Affichage de la sélection...");
    
    // Utiliser les starters fournis ou la config par défaut
    this.starterOptions = availableStarters || this.starterConfig;
    
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
