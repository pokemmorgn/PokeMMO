// ✅ Système de sélection de starter CORRIGÉ avec détection de proximité

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
    
    // ✅ NOUVEAU: Système de proximité
    this.proximityCheckEnabled = true;
    this.lastProximityCheck = 0;
    this.proximityCheckInterval = 1000; // Vérifier toutes les 1 seconde
    
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
    style.id = 'starter
