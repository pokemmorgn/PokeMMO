// client/src/components/BattleInterface.js
// ✅ VERSION CORRIGÉE - Fix iconElement getter/setter

export class BattleInterface {
  constructor(gameManager, battleData) {
    this.gameManager = gameManager;
    this.battleData = battleData;
    this.root = null;
    this._iconElement = null; // ✅ CORRECTION: Propriété privée

    // === UIManager integration
    this.moduleType = 'battleInterface';
    this.isUIManagerMode = true;
    this.uiManagerState = {
      visible: false,
      enabled: true,
      initialized: false
    };
    this.responsiveConfig = {
      mobile: {
        scaleFactor: 0.8,
        simplifiedLayout: true,
        hiddenElements: ['.battle-breadcrumb']
      },
      tablet: {
        scaleFactor: 0.9,
        simplifiedLayout: false
      },
      desktop: {
        scaleFactor: 1.0,
        simplifiedLayout: false
      }
    };

    // === State
    this.menuStack = ['main'];
    this.selectedIndices = { main: 0, attacks: 0, bag: 0, pokemon: 0 };
    this.buttonRefs = [];
    this.isOpen = false;

    // Binding event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleAction = this.handleAction.bind(this);
    
    console.log('✅ [BattleInterface] Constructeur terminé');
  }

  // ✅ CORRECTION: Getter ET Setter pour iconElement
  get iconElement() {
    return this._iconElement || this.root;
  }

  set iconElement(value) {
    this._iconElement = value;
  }

  // === CSS CHARGEMENT ===
  static ensureCSSLoaded() {
    if (document.querySelector('#battle-interface-styles')) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.id = 'battle-interface-styles';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '/css/battle-interface.css';
      link.onload = () => {
        console.log('✅ CSS BattleInterface chargé !');
        resolve();
      };
      link.onerror = () => {
        console.warn('⚠️ CSS BattleInterface non trouvé, utilisation styles inline');
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  // ✅ CORRECTION: Styles inline si CSS externe échoue
  addInlineStyles() {
    if (document.querySelector('#battle-interface-inline-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'battle-interface-inline-styles';
    style.textContent = `
      .battle-interface-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        height: 400px;
        background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
        border: 4px solid #FFD700;
        border-radius: 15px;
        color: white;
        font-family: 'Arial', sans-serif;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        box-shadow: 0 0 30px rgba(0,0,0,0.8);
        opacity: 0;
        transition: all 0.3s ease;
      }

      .battle-interface-container.visible {
        opacity: 1;
      }

      .battle-breadcrumb {
        color: #FFD700;
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .battle-menu-main {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 300px;
      }

      .battle-menu-attacks {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px 22px;
        width: 100%;
        max-width: 400px;
      }

      .battle-menu-bag,
      .battle-menu-pokemon {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 300px;
      }

      .battle-action-button {
        padding: 12px 20px;
        background: #4a90e2;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }

      .battle-action-button:hover {
        background: #357abd;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
      }

      .battle-action-button:active {
        transform: translateY(0);
      }

      .battle-action-button:disabled {
        background: #666;
        cursor: not-allowed;
        opacity: 0.5;
      }

      .battle-action-button.selected {
        background: #FFD700;
        color: #1a472a;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      }

      .battle-menu-back {
        position: absolute;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        background: #e24a4a;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }

      .battle-menu-back:hover {
        background: #c73e3e;
      }

      .battle-pp-indicator {
        display: block;
        font-size: 10px;
        opacity: 0.8;
        margin-top: 2px;
      }

      .battle-move-type {
        display: inline-block;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 4px;
        background: #666;
        margin-top: 4px;
      }

      .battle-move-type[data-type="electric"] { background: #f4d03f; color: #000; }
      .battle-move-type[data-type="normal"] { background: #a8a878; }
      .battle-move-type[data-type="fire"] { background: #f08030; }
      .battle-move-type[data-type="water"] { background: #6890f0; }
      .battle-move-type[data-type="grass"] { background: #78c850; }
      .battle-move-type[data-type="steel"] { background: #b8b8d0; }
      .battle-move-type[data-type="fairy"] { background: #ee99ac; }

      @media (max-width: 768px) {
        .battle-interface-container {
          width: 90%;
          height: 80%;
          transform: translate(-50%, -50%) scale(0.9);
        }
        
        .battle-breadcrumb {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('✅ [BattleInterface] Styles inline ajoutés');
  }

  /** Crée et insère l'interface */
  async createInterface() {
    if (this.root) this.destroy();

    console.log('🏗️ [BattleInterface] Création interface...');

    // Charger CSS ou utiliser inline
    try {
      await this.constructor.ensureCSSLoaded();
    } catch (error) {
      console.warn('⚠️ CSS externe échoué, utilisation styles inline');
      this.addInlineStyles();
    }

    this.root = document.createElement('div');
    this.root.className = 'battle-interface-container';
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Battle Interface');

    // ✅ CORRECTION: Mettre à jour iconElement
    this._iconElement = this.root;

    document.body.appendChild(this.root);

    // Animation d'entrée
    requestAnimationFrame(() => {
      this.root.classList.add('visible');
    });

    this.isOpen = true;
    this.uiManagerState.initialized = true;

    this.showMainMenu();

    // Events
    window.addEventListener('keydown', this.handleKeyDown);
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
    this.root.focus();
    
    console.log('✅ [BattleInterface] Interface créée et UIManager ready');
  }

  destroy() {
    try {
      this._dispatchUIEvent('battleInterfaceDestroying');
      
      window.removeEventListener('keydown', this.handleKeyDown);
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      
      this.root = null;
      this._iconElement = null; // ✅ CORRECTION
      this.isOpen = false;
      this.uiManagerState.visible = false;
      this.uiManagerState.initialized = false;
      
      this._dispatchUIEvent('battleInterfaceDestroyed');
      
      console.log('✅ [BattleInterface] Interface détruite');
      
    } catch (error) {
      console.error('[BattleInterface] Erreur destroy:', error);
    }
  }

  /** Affiche le menu principal */
  showMainMenu() {
    this.menuStack = ['main'];
    this.render();
  }
  showAttacksMenu() { this.menuStack = ['main', 'attacks']; this.render(); }
  showBagMenu()     { this.menuStack = ['main', 'bag'];    this.render(); }
  showPokemonMenu() { this.menuStack = ['main', 'pokemon']; this.render(); }
  goBack() {
    if (this.menuStack.length > 1) {
      this.menuStack.pop();
      this.render();
    }
  }

  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    // Breadcrumb
    const bc = document.createElement('div');
    bc.className = 'battle-breadcrumb';
    bc.textContent = this.getBreadcrumbLabel();
    this.root.appendChild(bc);

    // Menus
    const current = this.menuStack.at(-1);
    this.buttonRefs = [];
    if (current === 'main')     this.renderMainMenu();
    else if (current === 'attacks') this.renderAttacksMenu();
    else if (current === 'bag')     this.renderBagMenu();
    else if (current === 'pokemon') this.renderPokemonMenu();

    // Bouton retour (sauf menu principal)
    if (this.menuStack.length > 1) {
      const backBtn = document.createElement('button');
      backBtn.className = 'battle-menu-back';
      backBtn.textContent = 'Retour';
      backBtn.onclick = () => this.goBack();
      backBtn.tabIndex = 0;
      this.root.appendChild(backBtn);
    }
  }

  renderMainMenu() {
    const menu = document.createElement('div');
    menu.className = 'battle-menu-main';
    const actions = [
      { key: 'attack', label: 'Attaquer', enabled: true },
      { key: 'bag', label: 'Sac', enabled: !!this.battleData.canUseBag },
      { key: 'pokemon', label: 'Pokémon', enabled: true },
      { key: 'flee', label: 'Fuir', enabled: !!this.battleData.canFlee }
    ];
    actions.forEach((action, i) => {
      const btn = document.createElement('button');
      btn.className = 'battle-action-button';
      btn.textContent = action.label;
      if (!action.enabled) btn.disabled = true;
      btn.setAttribute('data-action', action.key);
      if (this.selectedIndices.main === i) btn.setAttribute('aria-selected', 'true');
      btn.onclick = () => this.handleAction(action.key);
      this.buttonRefs.push(btn);
      menu.appendChild(btn);
    });
    this.root.appendChild(menu);
    this.updateButtonSelection('main');
  }

  renderAttacksMenu() {
    const menu = document.createElement('div');
    menu.className = 'battle-menu-attacks';

    const moves = this.battleData.playerPokemon.moves || [];
    for (let i = 0; i < 4; i++) {
      const move = moves[i];
      const btn = document.createElement('button');
      btn.className = 'battle-action-button';
      btn.setAttribute('data-action', 'attack');
      btn.setAttribute('data-index', i);
      if (move) {
        btn.innerHTML = `
          ${move.name}
          <span class="battle-pp-indicator">${move.pp}/${move.maxPp} PP</span>
          <span class="battle-move-type" data-type="${move.type}">${move.type}</span>
        `;
        if (move.pp <= 0) btn.disabled = true;
      } else {
        btn.textContent = '—';
        btn.disabled = true;
      }
      if (this.selectedIndices.attacks === i) btn.setAttribute('aria-selected', 'true');
      btn.onclick = () => this.handleAction('attack', { moveIndex: i, move: move });
      this.buttonRefs.push(btn);
      menu.appendChild(btn);
    }
    this.root.appendChild(menu);
    this.updateButtonSelection('attacks');
  }

  renderBagMenu() {
    const menu = document.createElement('div');
    menu.className = 'battle-menu-bag';
    const items = [
      { name: 'Potion', id: 'potion', enabled: true },
      { name: 'Poké Ball', id: 'pokeball', enabled: true }
    ];
    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'battle-action-button';
      btn.textContent = item.name;
      btn.disabled = !item.enabled;
      btn.onclick = () => this.handleAction('bag', { itemId: item.id });
      if (this.selectedIndices.bag === i) btn.setAttribute('aria-selected', 'true');
      this.buttonRefs.push(btn);
      menu.appendChild(btn);
    });
    this.root.appendChild(menu);
    this.updateButtonSelection('bag');
  }

  renderPokemonMenu() {
    const menu = document.createElement('div');
    menu.className = 'battle-menu-pokemon';
    const team = [
      { name: this.battleData.playerPokemon.name, current: true },
      { name: 'Salamèche', current: false }
    ];
    team.forEach((poke, i) => {
      const btn = document.createElement('button');
      btn.className = 'battle-action-button';
      btn.textContent = poke.name + (poke.current ? " (Actif)" : "");
      btn.disabled = poke.current;
      btn.onclick = () => this.handleAction('pokemon', { pokemonIndex: i });
      if (this.selectedIndices.pokemon === i) btn.setAttribute('aria-selected', 'true');
      this.buttonRefs.push(btn);
      menu.appendChild(btn);
    });
    this.root.appendChild(menu);
    this.updateButtonSelection('pokemon');
  }

  // === NAVIGATION CLAVIER ===
  handleKeyDown(e) {
    if (!this.isOpen) return;
    const current = this.menuStack.at(-1);
    let idx = this.selectedIndices[current] || 0;
    const maxIdx = this.buttonRefs.length - 1;
    const isGrid = (current === 'attacks');

    let handled = true;
    switch (e.key) {
      case 'ArrowRight': if (isGrid) idx = (idx + 1) % 4; else idx = Math.min(idx + 1, maxIdx); break;
      case 'ArrowLeft':  if (isGrid) idx = (idx + 3) % 4; else idx = Math.max(idx - 1, 0); break;
      case 'ArrowUp':    if (isGrid) idx = (idx + 2) % 4; else idx = Math.max(idx - 1, 0); break;
      case 'ArrowDown':  if (isGrid) idx = (idx + 2) % 4; else idx = Math.min(idx + 1, maxIdx); break;
      case 'Enter': case ' ':
        if (this.buttonRefs[idx] && !this.buttonRefs[idx].disabled) this.buttonRefs[idx].click();
        break;
      case 'Escape': this.goBack(); break;
      case 'Tab': idx = (idx + 1) % (maxIdx + 1); break;
      default: handled = false;
    }
    if (handled) {
      this.selectedIndices[current] = idx;
      this.updateButtonSelection(current);
      e.preventDefault();
    }
  }

  updateButtonSelection(menuKey) {
    this.buttonRefs.forEach((btn, i) => {
      if (i === (this.selectedIndices[menuKey] || 0)) {
        btn.classList.add('selected');
        btn.setAttribute('aria-selected', 'true');
        btn.focus();
      } else {
        btn.classList.remove('selected');
        btn.removeAttribute('aria-selected');
      }
    });
  }

  // === ACTIONS ===
  handleAction(actionType, actionData = {}) {
    console.log(`⚔️ [BattleInterface] Action: ${actionType}`, actionData);
    
    switch (actionType) {
      case 'attack':
        if (this.menuStack.at(-1) === 'main')      { this.showAttacksMenu(); }
        else if (this.menuStack.at(-1) === 'attacks') {
          this.emitBattleAction({ type: 'attack', ...actionData });
          this.close();
        }
        break;
      case 'bag':
        if (this.menuStack.at(-1) === 'main')      { this.showBagMenu(); }
        else {
          this.emitBattleAction({ type: 'bag', ...actionData });
          this.close();
        }
        break;
      case 'pokemon':
        if (this.menuStack.at(-1) === 'main')      { this.showPokemonMenu(); }
        else {
          this.emitBattleAction({ type: 'pokemon', ...actionData });
          this.close();
        }
        break;
      case 'flee':
        this.emitBattleAction({ type: 'flee' });
        this.close();
        break;
    }
  }

  emitBattleAction(action) {
    console.log('⚔️ [BattleInterface] Action émise:', action);
    
    // Notification utilisateur
    if (window.showGameNotification) {
      let message = '';
      switch (action.type) {
        case 'attack':
          message = action.move ? `${action.move.name} sélectionné !` : 'Attaque sélectionnée !';
          break;
        case 'bag':
          message = action.itemId ? `${action.itemId} utilisé !` : 'Objet utilisé !';
          break;
        case 'pokemon':
          message = 'Changement de Pokémon !';
          break;
        case 'flee':
          message = 'Fuite du combat !';
          break;
      }
      
      window.showGameNotification(message, 'info', { duration: 2000 });
    }
    
    // Callbacks
    if (window.onBattleAction) {
      window.onBattleAction(action);
    }
    
    // Événement custom
    window.dispatchEvent(new CustomEvent('battleAction', { detail: action }));
  }

  close() {
    this.hide({ animated: true });
    setTimeout(() => this.destroy(), 300);
  }

  /** Libellé du breadcrumb selon le menu */
  getBreadcrumbLabel() {
    if (this.menuStack.length === 1) return "Que veux-tu faire ?";
    const last = this.menuStack.at(-1);
    switch (last) {
      case 'attacks': return "Sélectionne une attaque";
      case 'bag':     return "Sélectionne un objet";
      case 'pokemon': return "Change de Pokémon";
      default:        return '';
    }
  }

  // ============ UIManager required methods ==============

  show(options = {}) {
    try {
      if (!this.root) {
        this.createInterface();
      }
      
      this.root.classList.remove('ui-hidden', 'ui-fade-out');
      this.root.style.display = 'flex';
      this.isOpen = true;
      this.uiManagerState.visible = true;
      
      // Appliquer config responsive si fournie
      if (options.device) {
        this.applyResponsiveConfig(options.device);
      }
      
      // Animation UIManager
      if (options.animated !== false) {
        requestAnimationFrame(() => {
          this.root.classList.add('visible');
        });
      } else {
        this.root.classList.add('visible');
      }
      
      this.root.focus?.();
      
      // Déclencher événement UIManager
      this._dispatchUIEvent('battleInterfaceShown', { 
        animated: options.animated,
        device: options.device 
      });
      
      console.log('✅ [BattleInterface] Interface affichée');
      return true;
      
    } catch (error) {
      this.handleError(error, 'show');
      return false;
    }
  }

  hide(options = {}) {
    try {
      if (this.root) {
        if (options.animated !== false) {
          this.root.classList.remove('visible');
          setTimeout(() => {
            this.root.classList.add('ui-hidden');
            this.root.style.display = 'none';
          }, 300);
        } else {
          this.root.classList.add('ui-hidden');
          this.root.style.display = 'none';
        }
        
        this.isOpen = false;
        this.uiManagerState.visible = false;
      }
      
      this._dispatchUIEvent('battleInterfaceHidden', { 
        animated: options.animated 
      });
      
      console.log('✅ [BattleInterface] Interface masquée');
      return true;
      
    } catch (error) {
      this.handleError(error, 'hide');
      return false;
    }
  }

  setEnabled(enabled) {
    try {
      this.uiManagerState.enabled = enabled;
      if (this.root) {
        this.root.classList.toggle('ui-disabled', !enabled);
        Array.from(this.root.querySelectorAll('button')).forEach(btn => {
          btn.disabled = !enabled;
        });
      }
      
      console.log(`✅ [BattleInterface] État enabled: ${enabled}`);
      return true;
      
    } catch (error) {
      this.handleError(error, 'setEnabled');
      return false;
    }
  }

  applyResponsiveConfig(device) {
    if (!this.root || !this.responsiveConfig[device]) return;
    
    const config = this.responsiveConfig[device];
    
    try {
      if (config.scaleFactor !== 1.0) {
        this.root.style.transform = `translate(-50%, -50%) scale(${config.scaleFactor})`;
        this.root.style.transformOrigin = 'center center';
      }
      
      if (config.simplifiedLayout) {
        this.root.classList.add('mobile-layout');
      } else {
        this.root.classList.remove('mobile-layout');
      }
      
      if (config.hiddenElements) {
        config.hiddenElements.forEach(selector => {
          const elements = this.root.querySelectorAll(selector);
          elements.forEach(el => el.style.display = 'none');
        });
      }
      
      console.log(`✅ [BattleInterface] Config responsive appliquée: ${device}`);
      
    } catch (error) {
      this.handleError(error, 'applyResponsiveConfig');
    }
  }

  // === MÉTHODES UIMANAGER ===

  _dispatchUIEvent(eventType, detail) {
    try {
      if (window.pokemonUISystem) {
        window.pokemonUISystem.uiManager?._dispatchEvent?.(eventType, detail);
      }
      
      window.dispatchEvent(new CustomEvent(eventType, { detail }));
    } catch (error) {
      console.warn(`[BattleInterface] Erreur dispatch événement ${eventType}:`, error);
    }
  }

  handleError(error, context) {
    console.error(`[BattleInterface] Error in ${context}:`, error);
    
    this._dispatchUIEvent('battleInterfaceError', { 
      error: error.message, 
      context,
      critical: this._isCriticalError(error)
    });
    
    if (this._canRecover(error)) {
      this._attemptRecovery(context);
    }
  }

  _attemptRecovery(context) {
    console.log(`[BattleInterface] Attempting recovery for: ${context}`);
    
    try {
      switch (context) {
        case 'render':
          this.render();
          break;
        case 'navigation':
          this.resetNavigation();
          break;
        case 'interface':
          this.recreateInterface();
          break;
        case 'show':
        case 'hide':
          setTimeout(() => {
            if (context === 'show') this.show({ animated: false });
            else this.hide({ animated: false });
          }, 100);
          break;
      }
      
      console.log(`✅ [BattleInterface] Recovery réussi pour: ${context}`);
      
    } catch (recoveryError) {
      console.error(`[BattleInterface] Recovery failed for ${context}:`, recoveryError);
    }
  }

  _isCriticalError(error) {
    return error.message.includes('Cannot read') || 
           error.message.includes('is not a function') ||
           error.message.includes('null');
  }

  _canRecover(error) {
    const recoverablePatterns = [
      /render/i,
      /navigation/i,
      /button/i,
      /element/i,
      /display/i,
      /style/i
    ];
    return recoverablePatterns.some(pattern => pattern.test(error.message));
  }

  resetNavigation() {
    this.menuStack = ['main'];
    this.selectedIndices = { main: 0, attacks: 0, bag: 0, pokemon: 0 };
    this.render();
  }

  recreateInterface() {
    if (this.root) {
      this.destroy();
    }
    this.createInterface();
  }

  // API pour UIManager state
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      hasRoot: !!this.root,
      isOpen: this.isOpen,
      currentMenu: this.menuStack.at(-1),
      selectedIndex: this.selectedIndices[this.menuStack.at(-1)] || 0,
      battling: !!this.battleData
    };
  }
}

console.log('✅ [BattleInterface] Classe corrigée chargée avec iconElement getter/setter');
