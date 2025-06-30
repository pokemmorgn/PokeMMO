// ✅ Système de sélection de starter CORRIGÉ avec styles intégrés

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

  // ✅ MÉTHODE: Injecter les styles CSS
  injectStyles() {
    // Vérifier si les styles sont déjà injectés
    if (document.getElementById('starter-selector-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'starter-selector-styles';
    style.textContent = `
      .starter-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
        opacity: 1;
        transition: opacity 0.3s ease;
      }

      .starter-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .starter-container {
        width: 90%;
        max-width: 600px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        transform: scale(1);
        transition: transform 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .starter-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 20px 25px;
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: center;
        align-items: center;
        border-bottom: 2px solid #357abd;
        position: relative;
        z-index: 1;
      }

      .starter-title {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        z-index: 1;
      }

      .starter-main-title {
        font-size: 24px;
        font-weight: bold;
        color: #FFD700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        text-align: center;
      }

      .starter-subtitle {
        font-size: 14px;
        opacity: 0.9;
        font-style: italic;
        color: #E2E8F0;
        text-align: center;
      }

      .starter-content {
        padding: 40px 30px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
        position: relative;
        z-index: 1;
        min-height: 300px;
      }

      .starter-pokeballs {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 40px;
        width: 100%;
        flex-wrap: wrap;
      }

      .starter-pokeball-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        padding: 20px;
        border-radius: 15px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        min-width: 120px;
      }

      .starter-pokeball-slot:hover {
        background: rgba(74, 144, 226, 0.1);
        border-color: rgba(74, 144, 226, 0.3);
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(74, 144, 226, 0.2);
      }

      .starter-pokeball-slot.selected {
        background: rgba(74, 144, 226, 0.2);
        border-color: #4a90e2;
        box-shadow: 0 0 30px rgba(74, 144, 226, 0.5);
        transform: translateY(-5px) scale(1.05);
      }

      .starter-pokeball {
        width: 64px;
        height: 64px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.3));
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .starter-pokeball-slot:hover .starter-pokeball {
        transform: scale(1.1);
        filter: drop-shadow(3px 3px 10px rgba(0,0,0,0.5)) brightness(1.1);
      }

      .starter-pokeball-slot.selected .starter-pokeball {
        transform: scale(1.2);
        filter: drop-shadow(3px 3px 15px rgba(0,0,0,0.7)) brightness(1.2);
      }

      .starter-name {
        font-size: 16px;
        font-weight: bold;
        color: #ecf0f1;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        transition: color 0.3s ease;
        text-align: center;
      }

      .starter-pokeball-slot:hover .starter-name {
        color: #87ceeb;
      }

      .starter-pokeball-slot.selected .starter-name {
        color: #FFD700;
      }

      .starter-type {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: bold;
        text-transform: uppercase;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        transition: transform 0.2s ease;
      }

      .starter-type.plante { background: #78C850; }
      .starter-type.feu { background: #F08030; }
      .starter-type.eau { background: #6890F0; }

      .starter-info-section {
        width: 100%;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(74, 144, 226, 0.3);
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        min-height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .starter-info-title {
        font-size: 18px;
        font-weight: bold;
        color: #4a90e2;
        margin-bottom: 8px;
      }

      .starter-info-description {
        font-size: 14px;
        color: #bdc3c7;
        line-height: 1.4;
        font-style: italic;
      }

      .starter-info-empty {
        color: #95a5a6;
        font-style: italic;
        font-size: 14px;
      }

      .starter-footer {
        background: rgba(0, 0, 0, 0.3);
        padding: 20px 25px;
        border-top: 2px solid #357abd;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 0 0 17px 17px;
        z-index: 1;
        position: relative;
      }

      .starter-confirm-btn {
        background: linear-gradient(145deg, #059669, #047857);
        border: none;
        color: white;
        padding: 12px 30px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: scale(0.9);
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 2px solid #10B981;
      }

      .starter-confirm-btn.visible {
        opacity: 1;
        transform: scale(1);
        pointer-events: auto;
      }

      .starter-confirm-btn:hover {
        background: linear-gradient(145deg, #10B981, #059669);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
        border-color: #34D399;
      }

      .starter-container.confirming {
        animation: confirmationFlash 0.5s ease;
      }

      @keyframes confirmationFlash {
        0% { background: rgba(255, 255, 255, 0); }
        50% { background: rgba(255, 255, 255, 0.3); }
        100% { background: rgba(255, 255, 255, 0); }
      }

      @media (max-width: 768px) {
        .starter-container {
          width: 95%;
          margin: 20px;
        }

        .starter-pokeballs {
          flex-direction: column;
          gap: 20px;
        }

        .starter-pokeball-slot {
          flex-direction: row;
          gap: 20px;
          padding: 15px 20px;
          width: 100%;
          max-width: 300px;
        }

        .starter-main-title {
          font-size: 20px;
        }

        .starter-content {
          padding: 30px 20px;
          gap: 25px;
        }
      }
    `;
    document.head.appendChild(style);
    console.log("✅ Styles CSS injectés");
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

    this.networkManager.room.onMessage("showStarterSelection", (data) => {
      console.log("📥 [StarterSelector] Demande de sélection reçue:", data);
      this.show(data.availableStarters || this.starterConfig);
    });

    this.networkManager.room.onMessage("starterSelected", (data) => {
      console.log("✅ [StarterSelector] Starter confirmé:", data);
      this.onStarterConfirmed(data);
    });

    this.networkManager.room.onMessage("starterSelectionError", (data) => {
      console.error("❌ [StarterSelector] Erreur sélection:", data);
      this.showError(data.message || "Erreur lors de la sélection");
    });
