// ✅ StarterSelector COMPLETE - With instant team update fix
export class StarterSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedStarterId = null;
    this.networkManager = null;
    
    // HTML Elements
    this.overlay = null;
    this.container = null;
    
    // Starter configuration
    this.starterConfig = [
      {
        id: 'bulbasaur',
        name: 'Bulbasaur',
        type: 'Grass',
        description: 'A docile and loyal Seed Pokémon.',
        color: '#4CAF50'
      },
      {
        id: 'charmander', 
        name: 'Charmander',
        type: 'Fire',
        description: 'A fierce and brave Lizard Pokémon.',
        color: '#FF5722'
      },
      {
        id: 'squirtle',
        name: 'Squirtle', 
        type: 'Water',
        description: 'A calm and wise Tiny Turtle Pokémon.',
        color: '#2196F3'
      }
    ];
    
    this.currentlySelectedIndex = -1;
    this.starterOptions = [];
    
    console.log("🎯 [StarterSelector] Version with instant team fix initialized");
  }

  // ✅ SIMPLE: Store NetworkManager + CSS FIX
  initialize(networkManager) {
    this.networkManager = networkManager;
    
    // ✅ FIX: Force CSS loading immediately
    this.ensureCSS();
    
    // ✅ FIX: Ensure starterConfig is never null
    if (!this.starterConfig) {
      this.starterConfig = this.getDefaultStarters();
    }
    
    // ✅ NEW: Setup server listeners WITH TEAM FIX
    this.setupServerMessageListeners();
    
    console.log("✅ [StarterSelector] Initialized with instant team fix");
    return this;
  }

  // ✅ SERVER LISTENERS WITH INSTANT TEAM FIX
  setupServerMessageListeners() {
    if (!this.networkManager?.room) {
      console.warn("⚠️ [StarterSelector] Missing NetworkManager or room");
      return;
    }

    console.log("📡 [StarterSelector] Setting up server listeners with team fix...");

    // ✅ LISTENER: Server response after selection
    this.networkManager.room.onMessage("starterReceived", (data) => {
      console.log("📥 [StarterSelector] starterReceived:", data);
      
      if (data.success) {
        this.showNotification(data.message || "Pokémon received successfully!", 'success');
        setTimeout(() => {
          this.hide();
        }, 2000);
      } else {
        this.showNotification(data.message || "Error during selection", 'error');
        const confirmBtn = this.overlay?.querySelector('.starter-confirm-btn');
        if (confirmBtn) {
          confirmBtn.classList.remove('disabled');
          confirmBtn.textContent = '⚡ Confirm';
        }
      }
    });

    // ✅ MAIN FIX: Listen to teamData sent automatically by server
    this.networkManager.room.onMessage("teamData", (data) => {
      console.log("📥 [StarterSelector] teamData received automatically:", data);
      
      if (data.success && data.team && data.team.length > 0) {
        console.log("🎉 [StarterSelector] Team update detected, notifying Team systems");
        
        // Forward directly to existing Team systems
        this.notifyTeamSystems(data);
      }
    });
  }

  // ✅ NEW METHOD: Notify existing Team systems
  notifyTeamSystems(teamData) {
    console.log("🔄 [StarterSelector] Notifying Team systems");
    
    // 1. ✅ Update TeamIcon if exists
    if (window.teamSystemGlobal && window.teamSystemGlobal.icon) {
      console.log("⚔️ [StarterSelector] Updating TeamIcon via teamSystemGlobal");
      window.teamSystemGlobal.icon.updateStats({
        totalPokemon: teamData.team.length,
        alivePokemon: teamData.stats?.alivePokemon || teamData.team.length,
        canBattle: teamData.stats?.canBattle || true
      });
    }
    
    // 2. ✅ Update TeamUI if exists and visible
    if (window.teamSystemGlobal && window.teamSystemGlobal.ui) {
      console.log("📱 [StarterSelector] Updating TeamUI via teamSystemGlobal");
      window.teamSystemGlobal.ui.updateTeamData(teamData);
    }
    
    // 3. ✅ Update TeamManager if exists
    if (window.teamSystemGlobal && window.teamSystemGlobal.manager) {
      console.log("🧠 [StarterSelector] Notifying TeamManager via teamSystemGlobal");
      if (window.teamSystemGlobal.manager.onTeamDataUpdate) {
        window.teamSystemGlobal.manager.onTeamDataUpdate(teamData);
      }
    }
    
    // 4. ✅ Update via DOM element if TeamIcon exists
    const teamIconElement = document.querySelector('#team-icon');
    if (teamIconElement) {
      console.log("🎯 [StarterSelector] Updating TeamIcon DOM element");
      const countElement = teamIconElement.querySelector('.team-count');
      if (countElement) {
        countElement.textContent = teamData.team.length;
      }
      
      // Add animation
      teamIconElement.classList.add('team-updated');
      setTimeout(() => {
        teamIconElement.classList.remove('team-updated');
      }, 600);
    }
    
    // 5. ✅ Trigger custom event for other systems
    window.dispatchEvent(new CustomEvent('teamUpdated', { 
      detail: { 
        teamData,
        source: 'starter-selector',
        timestamp: Date.now()
      }
    }));
    
    console.log("✅ [StarterSelector] All Team systems notified");
  }
  
  // ✅ NEW METHOD: Ensure CSS is loaded
  ensureCSS() {
    if (document.querySelector('#starter-selector-manual-styles, #starter-selector-fallback-styles, #starter-selector-styles')) {
      return; // CSS already present
    }

    console.log("🎨 [StarterSelector] Adding fallback CSS...");
    
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
      .starter-type.grass { background: #78C850 !important; } .starter-type.fire { background: #F08030 !important; } .starter-type.water { background: #6890F0 !important; }
      .starter-info-section { width: 100% !important; background: rgba(255, 255, 255, 0.08) !important; border: 2px solid rgba(74, 144, 226, 0.3) !important; border-radius: 15px !important; padding: 20px !important; text-align: center !important; }
      .starter-footer { background: rgba(0, 0, 0, 0.3) !important; padding: 20px 25px !important; text-align: center !important; border-radius: 0 0 17px 17px !important; }
      .starter-confirm-btn { background: linear-gradient(145deg, #059669, #047857) !important; border: none !important; color: white !important; padding: 12px 30px !important; border-radius: 12px !important; cursor: pointer !important; font-size: 16px !important; font-weight: bold !important; opacity: 0 !important; transition: all 0.3s ease !important; }
      .starter-confirm-btn.visible { opacity: 1 !important; }
      .starter-confirm-btn:hover { background: linear-gradient(145deg, #10B981, #059669) !important; transform: translateY(-2px) !important; }
    `;
    document.head.appendChild(style);
  }

  // ✅ NEW METHOD: Default configuration
  getDefaultStarters() {
    return [
      {
        id: 'bulbasaur',
        name: 'Bulbasaur',
        type: 'Grass',
        description: 'A docile and loyal Seed Pokémon.',
        color: '#4CAF50'
      },
      {
        id: 'charmander', 
        name: 'Charmander',
        type: 'Fire',
        description: 'A fierce and brave Lizard Pokémon.',
        color: '#FF5722'
      },
      {
        id: 'squirtle',
        name: 'Squirtle', 
        type: 'Water',
        description: 'A calm and wise Tiny Turtle Pokémon.',
        color: '#2196F3'
      }
    ];
  }

  // ✅ MAIN METHOD: Show selection (FIXED)
  show(availableStarters = null) {
    if (this.isVisible) {
      console.warn("⚠️ [StarterSelector] Already visible");
      return;
    }

    console.log("🎯 [StarterSelector] Showing selection...");
    
    // ✅ FIX: Ensure starterConfig exists
    if (!this.starterConfig) {
      this.starterConfig = this.getDefaultStarters();
    }
    
    // ✅ FIX: Use provided starters or guaranteed non-null default config
    this.starterOptions = availableStarters || this.starterConfig || this.getDefaultStarters();
    
    // Create interface
    this.createHTMLInterface();
    
    // Mark as visible
    this.isVisible = true;
    
    // Entry animation
    this.animateIn();
    
    // Notification
    this.showNotification("Choose your starter Pokémon!", 'info');
  }

  // ✅ METHOD: Create pokeball SVG
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

  // ✅ METHOD: Create HTML interface
  createHTMLInterface() {
    // Remove old interface if exists
    if (this.overlay) {
      this.overlay.remove();
    }

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'starter-overlay hidden';
    
    // Main container
    this.container = document.createElement('div');
    this.container.className = 'starter-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'starter-header';
    header.innerHTML = `
      <div class="starter-title">
        <div class="starter-main-title">Choose your Pokémon</div>
        <div class="starter-subtitle">Your companion for life</div>
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
      
      // Event listeners for slot
      slot.addEventListener('click', () => this.selectStarter(starter, index));
      slot.addEventListener('mouseenter', () => this.showStarterInfo(starter, index));
      slot.addEventListener('mouseleave', () => this.hideStarterInfo());
      
      pokeballs.appendChild(slot);
    });
    
    // Info section
    const infoSection = document.createElement('div');
    infoSection.className = 'starter-info-section';
    infoSection.innerHTML = `
      <div class="starter-info-empty">Hover over a Pokémon to see its details</div>
    `;
    
    content.appendChild(pokeballs);
    content.appendChild(infoSection);
    
    // Footer with button
    const footer = document.createElement('div');
    footer.className = 'starter-footer';
    footer.innerHTML = `
      <button class="starter-confirm-btn">
        <span>⚡</span> Confirm
      </button>
    `;
    
    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(content);
    this.container.appendChild(footer);
    this.overlay.appendChild(this.container);
    
    // Add to DOM
    document.body.appendChild(this.overlay);
    
    // Event listeners
    this.setupHTMLEvents();
  }

  // ✅ METHOD: Setup HTML events
  setupHTMLEvents() {
    // Confirmation button
    const confirmBtn = this.overlay.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.selectedStarterId) {
          this.confirmSelection();
        }
      });
    }

    // Prevent closing by clicking on overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.showNotification("You must choose a Pokémon!", 'warning');
      }
    });
  }

  // ✅ METHOD: Show starter info
  showStarterInfo(starter, index) {
    const infoSection = this.overlay.querySelector('.starter-info-section');
    if (infoSection) {
      infoSection.innerHTML = `
        <div class="starter-info-title">${starter.name}</div>
        <div class="starter-info-description">${starter.description}</div>
      `;
    }
  }

  // ✅ METHOD: Hide info
  hideStarterInfo() {
    if (this.currentlySelectedIndex === -1) {
      const infoSection = this.overlay.querySelector('.starter-info-section');
      if (infoSection) {
        infoSection.innerHTML = `
          <div class="starter-info-empty">Hover over a Pokémon to see its details</div>
        `;
      }
    }
  }

  // ✅ METHOD: Select starter
  selectStarter(starter, index) {
    console.log("🎯 [StarterSelector] Starter selected:", starter.name);
    
    this.currentlySelectedIndex = index;
    this.selectedStarterId = starter.id;

    // Update display
    const slots = this.overlay.querySelectorAll('.starter-pokeball-slot');
    slots.forEach((slot, i) => {
      slot.classList.remove('selected');
      if (i === index) {
        slot.classList.add('selected');
      }
    });

    // Show selected starter info
    this.showStarterInfo(starter, index);

    // Show confirmation button
    const confirmBtn = this.overlay.querySelector('.starter-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('visible');
    }
  }

  // ✅ METHOD: Confirm selection
  confirmSelection() {
    if (!this.selectedStarterId) return;
    
    console.log("📤 [StarterSelector] Sending selection to server:", this.selectedStarterId);
    
    if (this.networkManager?.room) {
      // Disable button during sending
      const confirmBtn = this.overlay?.querySelector('.starter-confirm-btn');
      if (confirmBtn) {
        confirmBtn.classList.add('disabled');
        confirmBtn.textContent = '⏳ Sending...';
      }
      
      this.networkManager.room.send("giveStarterChoice", {
        pokemonId: this.getStarterPokemonId(this.selectedStarterId)
      });
      
      // Confirmation animation
      this.animateConfirmation();
      
      // Sending notification
      this.showNotification("Selection sent to server...", 'info');
    } else {
      this.showNotification("Server connection error", 'error');
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

  // ✅ METHOD: Confirmation animation
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

  // ✅ METHOD: Entry animation
  animateIn() {
    if (this.overlay) {
      // Force reflow
      this.overlay.offsetHeight;
      
      // Remove hidden class to trigger CSS animation
      this.overlay.classList.remove('hidden');
    }
  }

  // ✅ METHOD: Hide selection
  hide() {
    if (!this.isVisible) {
      console.warn("⚠️ [StarterSelector] Already hidden");
      return;
    }

    console.log("🚫 [StarterSelector] Hiding selection...");

    // Exit animation
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    
    this.isVisible = false;

    // Cleanup after animation
    setTimeout(() => {
      this.cleanup();
    }, 300);
  }

  // ✅ METHOD: Show notification
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

  // ✅ METHOD: Cleanup
  cleanup() {
    console.log("🧹 [StarterSelector] Cleaning up...");

    // Remove overlay from DOM
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Reset variables
    this.container = null;
    this.selectedStarterId = null;
    this.currentlySelectedIndex = -1;
    this.starterOptions = [];

    console.log("✅ [StarterSelector] Cleanup completed");
  }

  // ✅ METHOD: Destroy completely
  destroy() {
    console.log("💀 [StarterSelector] Destroying...");

    // Hide if visible
    if (this.isVisible) {
      this.hide();
    } else {
      this.cleanup();
    }

    // Null all references
    this.scene = null;
    this.networkManager = null;
    this.starterConfig = null;
  }

  // ✅ UTILITY METHODS
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

// ✅ SIMPLIFIED GLOBAL MANAGER
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

// ✅ GLOBAL INSTANCE
export const globalStarterManager = new StarterSelectionManager();

// ✅ ULTRA-SIMPLIFIED INTEGRATION FUNCTION
export function integrateStarterSelectorToScene(scene, networkManager) {
  console.log(`🎯 [StarterIntegration] Ultra-simple integration to: ${scene.scene.key}`);

  const selector = globalStarterManager.initialize(scene, networkManager);

  // ✅ ONLY NECESSARY METHODS
  scene.showStarterSelection = (availableStarters = null) => {
    return globalStarterManager.show(scene, availableStarters);
  };

  scene.hideStarterSelection = () => {
    globalStarterManager.hide();
  };

  console.log(`✅ [StarterIntegration] Ultra-simple integration completed`);
  return selector;
}

// ✅ SIMPLIFIED GLOBAL UTILITIES
export const StarterUtils = {
  showSelection: (availableStarters = null) => {
    const activeScene = window.game?.scene?.getScenes(true)[0];
    if (activeScene && activeScene.showStarterSelection) {
      return activeScene.showStarterSelection(availableStarters);
    }
    console.warn("⚠️ [StarterUtils] No active scene with starter system");
    return null;
  },

  hideSelection: () => {
    globalStarterManager.hide();
  },

  isActive: () => {
    return globalStarterManager.isActive();
  }
};

console.log("🎯 [StarterSelector] Complete module with instant team update loaded and ready!");
