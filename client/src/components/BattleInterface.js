// === INTÉGRATION BATTLEINTERFACE DANS VOTRE SYSTÈME ===
// Solution complète pour remplacer le système défaillant

// 1. ===== CLASSE BATTLEINTERFACE CORRIGÉE =====
class WorkingBattleInterface {
  constructor(gameManager, battleData) {
    this.gameManager = gameManager;
    this.battleData = battleData || {};
    this.root = null;
    this.isOpen = false;
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    
    // UIManager compatibility
    this.moduleType = 'battleInterface';
    this.uiManagerState = {
      visible: false,
      enabled: true,
      initialized: false
    };
    
    console.log('✅ [WorkingBattleInterface] Créé avec succès');
  }
  
  // ===== CRÉATION INTERFACE =====
  async createInterface() {
    if (this.root) {
      this.destroy();
    }
    
    console.log('🏗️ [WorkingBattleInterface] Création interface...');
    
    this.root = document.createElement('div');
    this.root.id = 'working-battle-interface';
    this.root.className = 'working-battle-interface';
    this.root.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      height: 500px;
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
      border: 4px solid #FFD700;
      border-radius: 15px;
      color: white;
      font-family: 'Arial', sans-serif;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    this.updateInterface();
    document.body.appendChild(this.root);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
      this.root.style.opacity = '1';
      this.root.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Événements
    this.setupEvents();
    
    this.isOpen = true;
    this.uiManagerState.visible = true;
    this.uiManagerState.initialized = true;
    
    console.log('✅ [WorkingBattleInterface] Interface créée');
    return this.root;
  }
  
  // ===== MISE À JOUR CONTENU =====
  updateInterface() {
    if (!this.root) return;
    
    const playerPokemon = this.battleData.playerPokemon || { name: 'Pikachu', level: 25, hp: 80, maxHp: 100 };
    const opponentPokemon = this.battleData.opponentPokemon || { name: 'Rattata Sauvage', level: 15, hp: 60, maxHp: 75 };
    
    this.root.innerHTML = `
      <!-- En-tête combat -->
      <div style="width: 100%; text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #FFD700; font-size: 24px;">⚔️ Combat Pokémon</h2>
        <p style="margin: 10px 0; font-size: 16px; opacity: 0.9;">
          <strong style="color: #4CAF50;">${playerPokemon.name}</strong> vs 
          <strong style="color: #f44336;">${opponentPokemon.name}</strong>
        </p>
      </div>
      
      <!-- Barres de vie -->
      <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 30px;">
        <!-- Pokémon joueur -->
        <div style="flex: 1; margin-right: 20px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #4CAF50;">
            ${playerPokemon.name} (Niv. ${playerPokemon.level})
          </div>
          <div style="background: #333; border-radius: 10px; padding: 3px; margin-bottom: 5px;">
            <div style="background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 8px; border-radius: 7px; width: ${(playerPokemon.hp / playerPokemon.maxHp) * 100}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 12px; text-align: center;">${playerPokemon.hp}/${playerPokemon.maxHp} HP</div>
        </div>
        
        <!-- Pokémon adversaire -->
        <div style="flex: 1; margin-left: 20px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #f44336;">
            ${opponentPokemon.name} (Niv. ${opponentPokemon.level})
          </div>
          <div style="background: #333; border-radius: 10px; padding: 3px; margin-bottom: 5px;">
            <div style="background: linear-gradient(90deg, #f44336, #FF5722); height: 8px; border-radius: 7px; width: ${(opponentPokemon.hp / opponentPokemon.maxHp) * 100}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 12px; text-align: center;">${opponentPokemon.hp}/${opponentPokemon.maxHp} HP</div>
        </div>
      </div>
      
      <!-- Zone de contenu principal -->
      <div id="battle-content" style="flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        ${this.getMenuContent()}
      </div>
      
      <!-- Instructions -->
      <div style="text-align: center; margin-top: 20px; font-size: 12px; opacity: 0.7;">
        Utilisez les flèches ou cliquez • Entrée pour sélectionner • Échap pour retour
      </div>
    `;
  }
  
  // ===== CONTENU DES MENUS =====
  getMenuContent() {
    switch (this.currentMenu) {
      case 'main':
        return this.getMainMenu();
      case 'attacks':
        return this.getAttacksMenu();
      case 'bag':
        return this.getBagMenu();
      case 'pokemon':
        return this.getPokemonMenu();
      default:
        return this.getMainMenu();
    }
  }
  
  getMainMenu() {
    const actions = [
      { id: 'attack', label: '⚡ Attaquer', color: '#e74c3c', enabled: true },
      { id: 'bag', label: '🎒 Sac', color: '#3498db', enabled: this.battleData.canUseBag !== false },
      { id: 'pokemon', label: '🎮 Pokémon', color: '#9b59b6', enabled: true },
      { id: 'flee', label: '🏃 Fuir', color: '#95a5a6', enabled: this.battleData.canFlee !== false }
    ];
    
    return `
      <h3 style="margin: 0 0 20px 0; color: #FFD700;">Que veux-tu faire ?</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; max-width: 400px;">
        ${actions.map((action, index) => `
          <button 
            class="battle-action-btn" 
            data-action="${action.id}" 
            data-index="${index}"
            style="
              padding: 20px 15px; 
              background: ${action.color}; 
              color: white; 
              border: none; 
              border-radius: 10px; 
              cursor: ${action.enabled ? 'pointer' : 'not-allowed'}; 
              font-size: 16px; 
              font-weight: bold; 
              transition: all 0.2s ease;
              opacity: ${action.enabled ? '1' : '0.5'};
              ${this.selectedIndex === index ? 'box-shadow: 0 0 10px rgba(255,215,0,0.8); transform: scale(1.05);' : ''}
            "
            ${!action.enabled ? 'disabled' : ''}
          >
            ${action.label}
          </button>
        `).join('')}
      </div>
    `;
  }
  
  getAttacksMenu() {
    const moves = this.battleData.playerPokemon?.moves || [
      { name: 'Tonnerre', pp: 15, maxPp: 15, type: 'electric', power: 90 },
      { name: 'Vive-Attaque', pp: 30, maxPp: 30, type: 'normal', power: 40 },
      { name: 'Queue de Fer', pp: 15, maxPp: 15, type: 'steel', power: 100 },
      { name: 'Charme', pp: 20, maxPp: 20, type: 'fairy', power: 0 }
    ];
    
    const typeColors = {
      electric: '#f4d03f', normal: '#a8a878', fire: '#f08030',
      water: '#6890f0', grass: '#78c850', steel: '#b8b8d0', fairy: '#ee99ac'
    };
    
    return `
      <h3 style="margin: 0 0 20px 0; color: #FFD700;">Sélectionne une attaque</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; max-width: 500px;">
        ${moves.map((move, index) => `
          <button 
            class="battle-action-btn" 
            data-action="useAttack" 
            data-move-index="${index}"
            style="
              padding: 15px; 
              background: ${move.pp > 0 ? '#4a90e2' : '#666'}; 
              color: white; 
              border: none; 
              border-radius: 10px; 
              cursor: ${move.pp > 0 ? 'pointer' : 'not-allowed'}; 
              font-size: 14px; 
              font-weight: bold; 
              transition: all 0.2s ease;
              text-align: left;
              ${this.selectedIndex === index ? 'box-shadow: 0 0 10px rgba(255,215,0,0.8); transform: scale(1.05);' : ''}
            "
            ${move.pp <= 0 ? 'disabled' : ''}
          >
            <div style="font-size: 16px; margin-bottom: 5px;">${move.name}</div>
            <div style="font-size: 11px; opacity: 0.8;">PP: ${move.pp}/${move.maxPp}</div>
            <div style="
              display: inline-block; 
              font-size: 9px; 
              padding: 2px 6px; 
              border-radius: 4px; 
              background: ${typeColors[move.type] || '#666'}; 
              color: ${move.type === 'electric' ? '#000' : '#fff'};
              margin-top: 5px;
            ">
              ${move.type.toUpperCase()}
            </div>
            ${move.power > 0 ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">Puissance: ${move.power}</div>` : ''}
          </button>
        `).join('')}
      </div>
      <button 
        class="battle-back-btn" 
        style="
          margin-top: 20px; 
          padding: 10px 20px; 
          background: #e74c3c; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px;
        "
      >
        ← Retour
      </button>
    `;
  }
  
  getBagMenu() {
    const items = this.battleData.bag || [
      { name: 'Potion', quantity: 5, description: 'Restaure 20 HP' },
      { name: 'Super Potion', quantity: 2, description: 'Restaure 50 HP' },
      { name: 'Poké Ball', quantity: 10, description: 'Capture un Pokémon' },
      { name: 'Antidote', quantity: 3, description: 'Soigne empoisonnement' }
    ];
    
    return `
      <h3 style="margin: 0 0 20px 0; color: #FFD700;">Sélectionne un objet</h3>
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 400px;">
        ${items.map((item, index) => `
          <button 
            class="battle-action-btn" 
            data-action="useItem" 
            data-item-index="${index}"
            style="
              padding: 15px; 
              background: ${item.quantity > 0 ? '#2ecc71' : '#666'}; 
              color: white; 
              border: none; 
              border-radius: 10px; 
              cursor: ${item.quantity > 0 ? 'pointer' : 'not-allowed'}; 
              font-size: 14px; 
              font-weight: bold; 
              transition: all 0.2s ease;
              text-align: left;
              display: flex;
              justify-content: space-between;
              align-items: center;
              ${this.selectedIndex === index ? 'box-shadow: 0 0 10px rgba(255,215,0,0.8); transform: scale(1.05);' : ''}
            "
            ${item.quantity <= 0 ? 'disabled' : ''}
          >
            <div>
              <div style="font-size: 16px; margin-bottom: 2px;">${item.name}</div>
              <div style="font-size: 11px; opacity: 0.8;">${item.description}</div>
            </div>
            <div style="font-size: 14px; font-weight: bold;">×${item.quantity}</div>
          </button>
        `).join('')}
      </div>
      <button 
        class="battle-back-btn" 
        style="
          margin-top: 20px; 
          padding: 10px 20px; 
          background: #e74c3c; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px;
        "
      >
        ← Retour
      </button>
    `;
  }
  
  getPokemonMenu() {
    const team = this.battleData.team || [
      { name: 'Pikachu', level: 25, hp: 80, maxHp: 100, active: true },
      { name: 'Salamèche', level: 20, hp: 65, maxHp: 70, active: false },
      { name: 'Carapuce', level: 18, hp: 0, maxHp: 68, active: false },
      { name: 'Bulbizarre', level: 22, hp: 75, maxHp: 80, active: false }
    ];
    
    return `
      <h3 style="margin: 0 0 20px 0; color: #FFD700;">Change de Pokémon</h3>
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 450px;">
        ${team.map((pokemon, index) => `
          <button 
            class="battle-action-btn" 
            data-action="switchPokemon" 
            data-pokemon-index="${index}"
            style="
              padding: 15px; 
              background: ${pokemon.active ? '#34495e' : (pokemon.hp > 0 ? '#9b59b6' : '#7f8c8d')}; 
              color: white; 
              border: none; 
              border-radius: 10px; 
              cursor: ${!pokemon.active && pokemon.hp > 0 ? 'pointer' : 'not-allowed'}; 
              font-size: 14px; 
              font-weight: bold; 
              transition: all 0.2s ease;
              text-align: left;
              opacity: ${pokemon.active ? '0.6' : '1'};
              ${this.selectedIndex === index ? 'box-shadow: 0 0 10px rgba(255,215,0,0.8); transform: scale(1.05);' : ''}
            "
            ${pokemon.active || pokemon.hp <= 0 ? 'disabled' : ''}
          >
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 16px; margin-bottom: 5px;">
                  ${pokemon.name} ${pokemon.active ? '(Actif)' : ''} ${pokemon.hp <= 0 ? '(K.O.)' : ''}
                </div>
                <div style="font-size: 12px; opacity: 0.8;">Niveau ${pokemon.level}</div>
                <div style="background: #333; border-radius: 5px; padding: 2px; margin-top: 5px; width: 150px;">
                  <div style="background: ${pokemon.hp > pokemon.maxHp * 0.5 ? '#4CAF50' : pokemon.hp > pokemon.maxHp * 0.2 ? '#FF9800' : '#f44336'}; height: 4px; border-radius: 3px; width: ${(pokemon.hp / pokemon.maxHp) * 100}%; transition: width 0.3s ease;"></div>
                </div>
              </div>
              <div style="text-align: right; font-size: 12px;">
                ${pokemon.hp}/${pokemon.maxHp} HP
              </div>
            </div>
          </button>
        `).join('')}
      </div>
      <button 
        class="battle-back-btn" 
        style="
          margin-top: 20px; 
          padding: 10px 20px; 
          background: #e74c3c; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px;
        "
      >
        ← Retour
      </button>
    `;
  }
  
  // ===== ÉVÉNEMENTS =====
  setupEvents() {
    // Clic sur les boutons
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('.battle-action-btn');
      const backBtn = e.target.closest('.battle-back-btn');
      
      if (btn && !btn.disabled) {
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index) || 0;
        const moveIndex = parseInt(btn.dataset.moveIndex);
        const itemIndex = parseInt(btn.dataset.itemIndex);
        const pokemonIndex = parseInt(btn.dataset.pokemonIndex);
        
        this.handleAction(action, { index, moveIndex, itemIndex, pokemonIndex });
      } else if (backBtn) {
        this.goBack();
      }
    });
    
    // Navigation clavier
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  handleKeyDown(e) {
    if (!this.isOpen) return;
    
    const buttons = this.root.querySelectorAll('.battle-action-btn:not([disabled])');
    const maxIndex = buttons.length - 1;
    
    let handled = true;
    
    switch (e.key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - 2);
        break;
      case 'ArrowDown':
        this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 2);
        break;
      case 'ArrowLeft':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        break;
      case 'ArrowRight':
        this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 1);
        break;
      case 'Enter':
      case ' ':
        if (buttons[this.selectedIndex]) {
          buttons[this.selectedIndex].click();
        }
        break;
      case 'Escape':
        this.goBack();
        break;
      default:
        handled = false;
    }
    
    if (handled) {
      e.preventDefault();
      this.updateInterface();
    }
  }
  
  // ===== ACTIONS =====
  handleAction(action, data = {}) {
    console.log(`⚔️ [WorkingBattleInterface] Action: ${action}`, data);
    
    switch (action) {
      case 'attack':
        this.currentMenu = 'attacks';
        this.selectedIndex = 0;
        this.updateInterface();
        break;
        
      case 'bag':
        this.currentMenu = 'bag';
        this.selectedIndex = 0;
        this.updateInterface();
        break;
        
      case 'pokemon':
        this.currentMenu = 'pokemon';
        this.selectedIndex = 0;
        this.updateInterface();
        break;
        
      case 'flee':
        this.emitBattleAction({ type: 'flee' });
        this.close();
        break;
        
      case 'useAttack':
        const move = this.battleData.playerPokemon?.moves?.[data.moveIndex];
        this.emitBattleAction({ type: 'attack', moveIndex: data.moveIndex, move });
        this.close();
        break;
        
      case 'useItem':
        const item = this.battleData.bag?.[data.itemIndex];
        this.emitBattleAction({ type: 'item', itemIndex: data.itemIndex, item });
        this.close();
        break;
        
      case 'switchPokemon':
        const pokemon = this.battleData.team?.[data.pokemonIndex];
        this.emitBattleAction({ type: 'switch', pokemonIndex: data.pokemonIndex, pokemon });
        this.close();
        break;
    }
  }
  
  goBack() {
    if (this.currentMenu === 'main') {
      this.close();
    } else {
      this.currentMenu = 'main';
      this.selectedIndex = 0;
      this.updateInterface();
    }
  }
  
  emitBattleAction(action) {
    console.log('🎯 [WorkingBattleInterface] Action émise:', action);
    
    // Notification
    this.showNotification(this.getActionMessage(action));
    
    // Callbacks
    if (window.onBattleAction) {
      window.onBattleAction(action);
    }
    
    // Événement custom
    window.dispatchEvent(new CustomEvent('battleAction', { detail: action }));
    
    // Si vous avez un NetworkManager pour Colyseus
    if (this.gameManager?.sendBattleAction) {
      this.gameManager.sendBattleAction(action);
    }
  }
  
  getActionMessage(action) {
    switch (action.type) {
      case 'attack':
        return `⚡ ${action.move?.name || 'Attaque'} utilisé!`;
      case 'item':
        return `🎒 ${action.item?.name || 'Objet'} utilisé!`;
      case 'switch':
        return `🎮 Changement vers ${action.pokemon?.name || 'Pokémon'}!`;
      case 'flee':
        return `🏃 Fuite du combat!`;
      default:
        return `✅ Action: ${action.type}`;
    }
  }
  
  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2ecc71;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10001;
      transform: translateX(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animation
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // Suppression
    setTimeout(() => {
      notification.style.transform = 'translateX(100px)';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // ===== MÉTHODES UIMANAGER =====
  show(options = {}) {
    if (!this.root) {
      return this.createInterface();
    }
    
    this.root.style.display = 'flex';
    this.root.style.opacity = '1';
    this.isOpen = true;
    this.uiManagerState.visible = true;
    
    return true;
  }
  
  hide(options = {}) {
    if (this.root) {
      this.root.style.opacity = '0';
      setTimeout(() => {
        if (this.root) this.root.style.display = 'none';
      }, 300);
    }
    
    this.isOpen = false;
    this.uiManagerState.visible = false;
    
    return true;
  }
  
  close() {
    this.hide();
    setTimeout(() => this.destroy(), 300);
  }
  
  destroy() {
    if (this.root) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.root.remove();
      this.root = null;
    }
    
    this.isOpen = false;
    this.uiManagerState.visible = false;
    this.uiManagerState.initialized = false;
    
    console.log('✅ [WorkingBattleInterface] Interface détruite');
  }
  
  setEnabled(enabled) {
    this.uiManagerState.enabled = enabled;
    if (this.root) {
      this.root.style.opacity = enabled ? '1' : '0.5';
      this.root.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    return true;
  }
  
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      hasRoot: !!this.root,
      isOpen: this.isOpen,
      currentMenu: this.currentMenu,
      selectedIndex: this.selectedIndex
    };
  }
  
  get iconElement() {
    return this.root;
  }
}

// 2. ===== REMPLACEMENT DANS LE SYSTÈME =====
function replaceWorkingBattleInterface() {
  console.log('🔄 [WorkingBattleInterface] Remplacement du système défaillant...');
  
  // Créer une version fonctionnelle
  const workingWrapper = {
    moduleType: 'battleInterface',
    originalModule: null,
    iconElement: null,
    isInitialized: false,
    
    create: function(gameManager, battleData) {
      console.log('🏗️ [WorkingWrapper] Création instance...');
      
      if (this.originalModule) {
        this.originalModule.destroy();
      }
      
      this.originalModule = new WorkingBattleInterface(gameManager, battleData);
      this.iconElement = this.originalModule.root;
      this.isInitialized = true;
      
      console.log('✅ [WorkingWrapper] Instance créée');
      return this.originalModule;
    },
    
    startBattle: function(battleData) {
      console.log('⚔️ [WorkingWrapper] Démarrage combat:', battleData);
      
      if (!this.originalModule) {
        const gameManager = window.globalNetworkManager || window.gameManager || window;
        this.create(gameManager, battleData);
      }
      
      if (this.originalModule) {
        this.originalModule.battleData = battleData;
        return this.originalModule.show({ animated: true });
      }
      
      return false;
    },
    
    endBattle: function() {
      console.log('🏁 [WorkingWrapper] Fin de combat');
      
      if (this.originalModule) {
        this.originalModule.close();
        return true;
      }
      
      return false;
    },
    
    show: function(options = {}) {
      if (this.originalModule) {
        return this.originalModule.show(options);
      }
      return false;
    },
    
    hide: function(options = {}) {
      if (this.originalModule) {
        return this.originalModule.hide(options);
      }
      return false;
    },
    
    setEnabled: function(enabled) {
      if (this.originalModule) {
        return this.originalModule.setEnabled(enabled);
      }
      return false;
    },
    
    getState: function() {
      if (this.originalModule) {
        return this.originalModule.getUIManagerState();
      }
      return { initialized: false, visible: false, enabled: false };
    },
    
    destroy: function() {
      if (this.originalModule) {
        this.originalModule.destroy();
        this.originalModule = null;
      }
      this.iconElement = null;
      this.isInitialized = false;
    }
  };
  
  // Remplacer dans le système
  if (window.pokemonUISystem) {
    window.pokemonUISystem.moduleInstances.set('battleInterface', workingWrapper);
    
    if (window.pokemonUISystem.uiManager?.modules?.has('battleInterface')) {
      window.pokemonUISystem.uiManager.modules.get('battleInterface').instance = workingWrapper;
    }
    
    console.log('✅ [WorkingBattleInterface] Système remplacé');
  }
  
  return workingWrapper;
}

// 3. ===== FONCTIONS DE TEST ET INTÉGRATION =====

// Test avec interface complète
function testWorkingBattleInterface() {
  console.log('🧪 [WorkingBattleInterface] Test interface complète...');
  
  const battleData = {
    playerPokemon: {
      name: 'Pikachu',
      level: 25,
      hp: 80,
      maxHp: 100,
      moves: [
        { name: 'Tonnerre', pp: 15, maxPp: 15, type: 'electric', power: 90 },
        { name: 'Vive-Attaque', pp: 30, maxPp: 30, type: 'normal', power: 40 },
        { name: 'Queue de Fer', pp: 15, maxPp: 15, type: 'steel', power: 100 },
        { name: 'Charme', pp: 20, maxPp: 20, type: 'fairy', power: 0 }
      ]
    },
    opponentPokemon: {
      name: 'Rattata Sauvage',
      level: 15,
      hp: 60,
      maxHp: 75
    },
    bag: [
      { name: 'Potion', quantity: 5, description: 'Restaure 20 HP' },
      { name: 'Super Potion', quantity: 2, description: 'Restaure 50 HP' },
      { name: 'Poké Ball', quantity: 10, description: 'Capture un Pokémon' },
      { name: 'Antidote', quantity: 3, description: 'Soigne empoisonnement' }
    ],
    team: [
      { name: 'Pikachu', level: 25, hp: 80, maxHp: 100, active: true },
      { name: 'Salamèche', level: 20, hp: 65, maxHp: 70, active: false },
      { name: 'Carapuce', level: 18, hp: 0, maxHp: 68, active: false },
      { name: 'Bulbizarre', level: 22, hp: 75, maxHp: 80, active: false }
    ],
    canUseBag: true,
    canFlee: true
  };
  
  // Créer l'interface
  const battleInterface = new WorkingBattleInterface(window.gameManager || window, battleData);
  
  // Lancer l'interface
  battleInterface.createInterface();
  
  // Auto-fermeture après 15 secondes
  setTimeout(() => {
    if (battleInterface.isOpen) {
      console.log('⏰ Auto-fermeture test après 15 secondes');
      battleInterface.close();
    }
  }, 15000);
  
  console.log('✅ [WorkingBattleInterface] Test lancé - Interface complète affichée');
  
  return battleInterface;
}

// Intégration avec votre système Colyseus
function integrateBattleWithColyseus() {
  console.log('🔗 [WorkingBattleInterface] Intégration Colyseus...');
  
  // Hook pour les actions de combat
  window.onBattleAction = (action) => {
    console.log('🎯 [Colyseus] Action de combat reçue:', action);
    
    // Envoyer au serveur Colyseus
    if (window.currentGameRoom) {
      try {
        window.currentGameRoom.send('battleAction', action);
        console.log('📤 [Colyseus] Action envoyée au serveur');
      } catch (error) {
        console.error('❌ [Colyseus] Erreur envoi action:', error);
      }
    } else {
      console.warn('⚠️ [Colyseus] Pas de room active');
    }
    
    // Simulation de réponse serveur (pour test)
    setTimeout(() => {
      simulateBattleResponse(action);
    }, 1000);
  };
  
  // Simulation réponse serveur
  function simulateBattleResponse(action) {
    console.log('🎭 [Simulation] Réponse serveur pour:', action.type);
    
    let message = '';
    let type = 'info';
    
    switch (action.type) {
      case 'attack':
        message = `${action.move?.name || 'Attaque'} inflige 45 dégâts!`;
        type = 'success';
        break;
      case 'item':
        message = `${action.item?.name || 'Objet'} utilisé avec succès!`;
        type = 'success';
        break;
      case 'switch':
        message = `${action.pokemon?.name || 'Pokémon'} entre en combat!`;
        type = 'info';
        break;
      case 'flee':
        message = 'Fuite réussie!';
        type = 'warning';
        break;
    }
    
    // Notification utilisateur
    if (window.showGameNotification) {
      window.showGameNotification(message, type, { duration: 3000 });
    }
  }
  
  console.log('✅ [WorkingBattleInterface] Intégration Colyseus configurée');
}

// 4. ===== FONCTIONS GLOBALES =====

// Remplacer le système défaillant
window.replaceWorkingBattleInterface = () => {
  return replaceWorkingBattleInterface();
};

// Test interface complète
window.testWorkingBattleInterface = () => {
  return testWorkingBattleInterface();
};

// Test rapide avec données minimales
window.quickBattleTest = () => {
  console.log('⚡ [WorkingBattleInterface] Test rapide...');
  
  const minimalData = {
    playerPokemon: { name: 'Pikachu', level: 25 },
    opponentPokemon: { name: 'Rattata', level: 15 }
  };
  
  const battleInterface = new WorkingBattleInterface(window, minimalData);
  battleInterface.createInterface();
  
  return battleInterface;
};

// Intégration complète
window.setupBattleIntegration = () => {
  console.log('🚀 [WorkingBattleInterface] Setup intégration complète...');
  
  // 1. Remplacer le système défaillant
  const workingModule = replaceWorkingBattleInterface();
  
  // 2. Intégrer avec Colyseus
  integrateBattleWithColyseus();
  
  // 3. Test
  setTimeout(() => {
    testWorkingBattleInterface();
  }, 1000);
  
  console.log('✅ [WorkingBattleInterface] Intégration complète terminée');
  
  return workingModule;
};

// Fix pour transitions UI
window.fixBattleTransitions = () => {
  console.log('🎬 [WorkingBattleInterface] Fix transitions...');
  
  // Corriger setGameState si nécessaire
  if (window.pokemonUISystem?.uiManager) {
    const originalSetGameState = window.pokemonUISystem.uiManager.setGameState;
    
    window.pokemonUISystem.uiManager.setGameState = function(stateName, options = {}) {
      console.log(`🎮 [FixedUIManager] Transition: ${this.currentGameState} → ${stateName}`);
      
      // Gestion spéciale pour battle
      if (stateName === 'battle') {
        // Masquer UI exploration
        const iconsToHide = [
          '#inventory-icon', '#team-icon', '#quest-icon', 
          '.ui-icon', '.game-icon', '#questTracker'
        ];
        
        iconsToHide.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
          });
        });
        
        console.log('👻 [FixedUIManager] UI exploration masquée');
      } else if (stateName === 'exploration') {
        // Réafficher UI exploration
        const iconsToShow = [
          '#inventory-icon', '#team-icon', '#quest-icon', 
          '.ui-icon', '.game-icon', '#questTracker'
        ];
        
        iconsToShow.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.style.display = '';
          });
        });
        
        console.log('👁️ [FixedUIManager] UI exploration réaffichée');
      }
      
      // Appeler la méthode originale si elle existe
      if (originalSetGameState) {
        try {
          return originalSetGameState.call(this, stateName, options);
        } catch (error) {
          console.warn('⚠️ [FixedUIManager] Erreur méthode originale:', error);
        }
      }
      
      // Fallback
      this.currentGameState = stateName;
      return true;
    };
    
    console.log('✅ [WorkingBattleInterface] Transitions corrigées');
    return true;
  }
  
  console.log('⚠️ [WorkingBattleInterface] UIManager non trouvé pour correction');
  return false;
};

// 5. ===== INSTRUCTIONS COMPLÈTES =====
console.log(`
🎮 === WORKING BATTLEINTERFACE INTÉGRÉ ===

🚀 UTILISATION IMMÉDIATE:

1. 🧪 TEST INTERFACE COMPLÈTE:
   window.testWorkingBattleInterface()
   
2. ⚡ TEST RAPIDE:
   window.quickBattleTest()
   
3. 🔄 REMPLACER SYSTÈME DÉFAILLANT:
   window.replaceWorkingBattleInterface()
   
4. 🎬 CORRIGER TRANSITIONS:
   window.fixBattleTransitions()
   
5. 🚀 SETUP COMPLET:
   window.setupBattleIntegration()

✨ FONCTIONNALITÉS:

• Interface complète avec menus:
  - Menu principal (4 actions)
  - Menu attaques (avec PP, types, puissance)
  - Menu sac (objets avec quantités)
  - Menu Pokémon (équipe avec HP)

• Navigation:
  - Clic souris + hover effects
  - Navigation clavier (flèches + entrée)
  - Retour avec Échap
  - Sélection visuelle

• Intégration système:
  - Compatible UIManager
  - Callbacks Colyseus
  - Notifications visuelles
  - Gestion d'état

• Design Pokémon:
  - Barres de vie colorées
  - Types d'attaques colorés
  - Animations fluides
  - Interface responsive

🎯 RECOMMANDATION:
window.setupBattleIntegration()
`);

// Auto-setup si demandé
if (typeof window !== 'undefined' && window.location?.search?.includes('setup-battle')) {
  console.log('🚀 Auto-setup BattleInterface détecté...');
  setTimeout(() => {
    window.setupBattleIntegration();
  }, 2000);
}
