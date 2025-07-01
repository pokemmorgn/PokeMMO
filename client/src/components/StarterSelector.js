// ✅ Système de sélection de starter CORRIGÉ pour PokéMon MMO

export class StarterSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedStarterId = null;
    this.networkManager = null;
    
    // Elements HTML
    this.overlay = null;
    this.container = null;
    
    // Charger le CSS de manière asynchrone
    this._initAsync();
    
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
    
    // État de sélection
    this.currentlySelectedIndex = -1;
    this.isAnimating = false;
    this.starterOptions = [];
    
    console.log("🎯 [StarterSelector] Initialisé pour la scène:", scene.scene.key);
  }

  async _initAsync() {
    await this.loadCSS();
    console.log("✅ [StarterSelector] CSS chargé et prêt");
  }

  async loadCSS() {
    if (document.querySelector('#starter-selector-styles')) {
      console.log('🎨 CSS StarterSelector déjà chargé');
      return;
    }

    try {
      const link = document.createElement('link');
      link.id = 'starter-selector-styles';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '/css/starterSelector.css';
      
      return new Promise((resolve, reject) => {
        link.onload = () => {
          console.log('✅ CSS StarterSelector chargé !');
          resolve();
        };
        link.onerror = () => {
          console.error('❌ Erreur chargement CSS StarterSelector');
          this.addInlineStyles();
          resolve();
        };
        
        document.head.appendChild(link);
      });
    } catch (err) {
      console.error('❌ Erreur lors du chargement du CSS:', err);
      this.addInlineStyles();
    }
  }

  addInlineStyles() {
    if (document.querySelector('#starter-selector-fallback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'starter-selector-fallback-styles';
    style.textContent = `
      .starter-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.8) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 10000 !important;
        backdrop-filter: blur(5px) !important;
        opacity: 1 !important;
        transition: opacity 0.3s ease !important;
      }

      .starter-overlay.hidden {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      .starter-container {
        width: 90% !important;
        max-width: 600px !important;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
        border: 3px solid #4a90e2 !important;
        border-radius: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        color: white !important;
        font-family: 'Segoe UI', Arial, sans-serif !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important;
        transform: scale(1) !important;
        transition: transform 0.3s ease !important;
        position: relative !important;
        overflow: hidden !important;
      }

      .starter-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important;
        padding: 20px 25px !important;
        border-radius: 17px 17px 0 0 !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        border-bottom: 2px solid #357abd !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .starter-title {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 5px !important;
        z-index: 1 !important;
      }

      .starter-main-title {
        font-size: 24px !important;
        font-weight: bold !important;
        color: #FFD700 !important;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5) !important;
        text-align: center !important;
      }

      .starter-subtitle {
        font-size: 14px !important;
        opacity: 0.9 !important;
        font-style: italic !important;
        color: #E2E8F0 !important;
        text-align: center !important;
      }

      .starter-content {
        padding: 40px 30px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 30px !important;
        position: relative !important;
        z-index: 1 !important;
        min-height: 300px !important;
      }

      .starter-pokeballs {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 40px !important;
        width: 100% !important;
        flex-wrap: wrap !important;
      }

      .starter-pokeball-slot {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 15px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        position: relative !important;
        padding: 20px !important;
        border-radius: 15px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 2px solid rgba(255, 255, 255, 0.1) !important;
        min-width: 120px !important;
      }

      .starter-pokeball-slot:hover {
        background: rgba(74, 144, 226, 0.1) !important;
        border-color: rgba(74, 144, 226, 0.3) !important;
        transform: translateY(-5px) !important;
        box-shadow: 0 10px 30px rgba(74, 144, 226, 0.2) !important;
      }

      .starter-pokeball-slot.selected {
        background: rgba(74, 144, 226, 0.2) !important;
        border-color: #4a90e2 !important;
        box-shadow: 0 0 30px rgba(74, 144, 226, 0.5) !important;
        transform: translateY(-5px) scale(1.05) !important;
      }

      .starter-pokeball {
        width: 64px !important;
        height: 64px !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.3)) !important;
        transition: all 0.3s ease !important;
        flex-shrink: 0 !important;
      }

      .starter-pokeball-slot:hover .starter-pokeball {
        transform: scale(1.1) !important;
        filter: drop-shadow(3px 3px 10px rgba(0,0,0,0.5)) brightness(1.1) !important;
      }

      .starter-pokeball-slot.selected .starter-pokeball {
        transform: scale(1.2) !important;
        filter: drop-shadow(3px 3px 15px rgba(0,0,0,0.7)) brightness(1.2) !important;
      }

      .starter-name {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #ecf0f1 !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
        transition: color 0.3s ease !important;
        text-align: center !important;
      }

      .starter-pokeball-slot:hover .starter-name {
        color: #87ceeb !important;
      }

      .starter-pokeball-slot.selected .starter-name {
        color: #FFD700 !important;
      }

      .starter-type {
        font-size: 12px !important;
        padding: 4px 8px !important;
        border-radius: 8px !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
        color: white !important;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5) !important;
        transition: transform 0.2s ease !important;
      }

      .starter-type.plante { background: #78C850 !important; }
      .starter-type.feu { background: #F08030 !important; }
      .starter-type.eau { background: #6890F0 !important; }

      .starter-info-section {
        width: 100% !important;
        max-width: 500px !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 2px solid rgba(74, 144, 226, 0.3) !important;
        border-radius: 15px !important;
        padding: 20px !important;
        text-align: center !important;
        min-height: 80px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        transition: all 0.3s ease !important;
      }

      .starter-info-title {
        font-size: 18px !important;
        font-weight: bold !important;
        color: #4a90e2 !important;
        margin-bottom: 8px !important;
      }

      .starter-info-description {
        font-size: 14px !important;
        color: #bdc3c7 !important;
        line-height: 1.4 !important;
        font-style: italic !important;
      }

      .starter-info-empty {
        color: #95a5a6 !important;
        font-style: italic !important;
        font-size: 14px !important;
      }

      .starter-footer {
        background: rgba(0, 0, 0, 0.3) !important;
        padding: 20px 25px !important;
        border-top: 2px solid #357abd !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        border-radius: 0 0 17px 17px !important;
        z-index: 1 !important;
        position: relative !important;
      }

      .starter-confirm-btn {
        background: linear-gradient(145deg, #059669, #047857) !important;
        border: none !important;
        color: white !important;
        padding: 12px 30px !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 16px !important;
        font-weight: bold !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        opacity: 0 !important;
        transform: scale(0.9) !important;
        pointer-events: none !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        border: 2px solid #10B981 !important;
      }

      .starter-confirm-btn.visible {
        opacity: 1 !important;
        transform: scale(1) !important;
        pointer-events: auto !important;
      }

      .starter-confirm-btn:hover {
        background: linear-gradient(145deg, #10B981, #059669) !important;
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4) !important;
        border-color: #34D399 !important;
      }

      .starter-container.confirming {
        animation: confirmationFlash 0.5s ease !important;
      }

      @keyframes confirmationFlash {
        0% { background: rgba(255, 255, 255, 0) !important; }
        50% { background: rgba(255, 255, 255, 0.3) !important; }
        100% { background: rgba(255, 255, 255, 0) !important; }
      }

      @media (max-width: 768px) {
        .starter-container {
          width: 95% !important;
          margin: 20px !important;
        }

        .starter-pokeballs {
          flex-direction: column !important;
          gap: 20px !important;
        }

        .starter-pokeball-slot {
          flex-direction: row !important;
          gap: 20px !important;
          padding: 15px 20px !important;
          width: 100% !important;
          max-width: 300px !important;
        }

        .starter-main-title {
          font-size: 20px !important;
        }

        .starter-content {
          padding: 30px 20px !important;
          gap: 25px !important;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('🔄 Styles StarterSelector fallback chargés');
  }

  // ✅ MÉTHODE PRINCIPALE: Initialiser avec le NetworkManager
  initialize(networkManager) {
    this.networkManager = networkManager;
    
    if (this.networkManager?.room) {
      this.setupNetworkListeners();
    }
    
    console.log("✅ [StarterSelector] Initialisé avec NetworkManager");
    return this;
  }

  // ✅ SETUP DES LISTENERS RÉSEAU
  setupNetworkListeners() {
    if (!this.networkManager?.room) return;

    // Écouter la demande de sélection de starter du serveur
    this.networkManager.room.onMessage("showStarterSelection", (data) => {
      console.log("📥 [StarterSelector] Demande de sélection reçue:", data);
      this.show(data.availableStarters || this.starterConfig);
    });

    // Écouter la confirmation de sélection
    this.networkManager.room.onMessage("starterSelected", (data) => {
      console.log("✅ [StarterSelector] Starter confirmé:", data);
      this.onStarterConfirmed(data);
    });

    // ✅ NOUVEAU: Écouter la réponse du starter
  this.networkManager.room.onMessage("starterReceived", (data) => {
    this.isAnimating = false; // Débloquer l'UI
    
    if (data.success) {
      this.showNotification(`${data.pokemon.name} ajouté à votre équipe !`, 'success');
      this.hide(); // Fermer la sélection
    } else {
      this.showNotification(data.message, 'error');
      this.resetSelection(); // Permettre une nouvelle sélection
    }
  });

    
    // Écouter les erreurs de sélection
    this.networkManager.room.onMessage("starterSelectionError", (data) => {
      console.error("❌ [StarterSelector] Erreur sélection:", data);
      this.showError(data.message || "Erreur lors de la sélection");
    });

    console.log("📡 [StarterSelector] Listeners réseau configurés");
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
        // Ne pas fermer - sélection obligatoire
        this.showNotification("Vous devez choisir un Pokémon !", 'warning');
      }
    });
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
    if (this.isAnimating) return;
    
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
  if (!this.selectedStarterId || this.isAnimating) return;
  
  console.log("📤 Demande starter sécurisée:", this.selectedStarterId);
  this.isAnimating = true;

  if (this.networkManager?.room) {
    this.networkManager.room.send("giveStarterChoice", {
      pokemonId: this.getStarterPokemonId(this.selectedStarterId)
    });
  }
}

getStarterPokemonId(starterId) {
  return { 'bulbasaur': 1, 'charmander': 4, 'squirtle': 7 }[starterId] || 1;
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

  // ✅ MÉTHODE: Starter confirmé par le serveur
  onStarterConfirmed(data) {
    console.log("✅ [StarterSelector] Starter confirmé par le serveur:", data);
    
    const starter = this.starterOptions.find(s => s.id === data.starterId);
    
    // Notification de succès
    this.showNotification(
      `${starter?.name || data.starterId} ajouté à votre équipe !`,
      'success'
    );

    // Fermer après sélection
    setTimeout(() => {
      this.hide();
    }, 2000);
  }

  // ✅ MÉTHODE: Afficher une erreur
  showError(message) {
    console.error("❌ [StarterSelector] Erreur:", message);
    
    this.showNotification(`Erreur: ${message}`, 'error');

    // Permettre une nouvelle sélection
    this.isAnimating = false;
    this.resetSelection();
  }

  // ✅ MÉTHODE: Réinitialiser la sélection
  resetSelection() {
    this.currentlySelectedIndex = -1;
    this.selectedStarterId = null;
    
    // Réinitialiser l'affichage
    const slots = this.overlay?.querySelectorAll('.starter-pokeball-slot');
    slots?.forEach(slot => {
      slot.classList.remove('selected');
    });

    // Masquer le bouton de confirmation
    const confirmBtn = this.overlay?.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.remove('visible');
    }

    // Réinitialiser les infos
    this.hideStarterInfo();
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

  // ✅ MÉTHODE: Bloquer/débloquer les inputs du joueur
  blockPlayerInput(block) {
    console.log(`${block ? '🔒' : '🔓'} [StarterSelector] ${block ? 'Blocage' : 'Déblocage'} inputs...`);
    
    // Flag simple pour le système
    window._starterSelectionActive = block;
    
    // Essayer le MovementBlockHandler si disponible
    if (window.movementBlockHandler && typeof window.movementBlockHandler.requestBlock === 'function') {
      try {
        if (block) {
          window.movementBlockHandler.requestBlock('starter_selection', 'Choix du starter en cours');
        } else {
          window.movementBlockHandler.requestUnblock('starter_selection');
        }
      } catch (error) {
        console.warn(`⚠️ [StarterSelector] Erreur MovementBlockHandler:`, error.message);
      }
    }
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
    this.isAnimating = false;
    this.starterOptions = [];

    console.log("✅ [StarterSelector] Nettoyage terminé");
  }

  // ✅ MÉTHODE: Détruire complètement
  destroy() {
    console.log("💀 [StarterSelector] Destruction...");

    // Nettoyer les listeners réseau
    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("showStarterSelection");
      this.networkManager.room.removeAllListeners("starterSelected");
      this.networkManager.room.removeAllListeners("starterSelectionError");
    }

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

// ✅ GESTIONNAIRE GLOBAL
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

  getCurrentSelection() {
    return this.activeSelector?.getCurrentSelection() || null;
  }
}

// ✅ INSTANCE GLOBALE
export const globalStarterManager = new StarterSelectionManager();

// ✅ FONCTION D'INTÉGRATION
export function integrateStarterSelectorToScene(scene, networkManager) {
  console.log(`🎯 [StarterIntegration] Intégration à la scène: ${scene.scene.key}`);

  const selector = globalStarterManager.initialize(scene, networkManager);

  scene.showStarterSelection = (availableStarters = null) => {
    return globalStarterManager.show(scene, availableStarters);
  };

  scene.hideStarterSelection = () => {
    globalStarterManager.hide();
  };

  scene.isStarterSelectionActive = () => {
    return globalStarterManager.isActive();
  };

  console.log(`✅ [StarterIntegration] Intégration terminée pour ${scene.scene.key}`);
  return selector;
}

// ✅ UTILITAIRES GLOBAUX
export const StarterUtils = {
  showSelection: (availableStarters = null) => {
    const activeScene = window.game?.scene?.getScenes(true)[0];
    if (activeScene && activeScene.showStarterSelection) {
      return activeScene.showStarterSelection(availableStarters);
    } else {
      console.warn("⚠️ [StarterUtils] Aucune scène active avec starter system");
      return null;
    }
  },

  hideSelection: () => {
    globalStarterManager.hide();
  },

  isActive: () => {
    return globalStarterManager.isActive();
  },

  test: () => {
    console.log("🧪 [StarterUtils] Test du système de sélection de starter...");
    
    // Créer une scène factice pour le test
    const mockScene = {
      scene: { key: 'test' },
      add: {
        graphics: () => ({ 
          fillStyle: () => {}, 
          fillCircle: () => {}, 
          destroy: () => {} 
        })
      }
    };
    
    const testStarters = [
      { id: 'bulbasaur', name: 'Bulbizarre', type: 'Plante', description: 'Un Pokémon Graine docile et loyal.', color: '#4CAF50' },
      { id: 'charmander', name: 'Salamèche', type: 'Feu', description: 'Un Pokémon Lézard fougueux et brave.', color: '#FF5722' },
      { id: 'squirtle', name: 'Carapuce', type: 'Eau', description: 'Un Pokémon Minitortue calme et sage.', color: '#2196F3' }
    ];
    
    const selector = new StarterSelector(mockScene);
    selector.show(testStarters);
    return selector;
  }
};

// ✅ FONCTION DE TEST GLOBALE
window.testStarterSelection = StarterUtils.test;

console.log("🎯 [StarterSelector] Module corrigé chargé et prêt !");
console.log("✅ Utilisez window.testStarterSelection() pour tester");
