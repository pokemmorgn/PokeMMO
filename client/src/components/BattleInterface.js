// client/src/components/BattleInterface.js
// ✅ VERSION COMPLÈTE avec intégration UIManager

export class BattleInterface {
  /**
   * @param {GameManager} gameManager - Référence au gestionnaire principal du jeu
   * @param {object} battleData - Données de combat à afficher
   */
  constructor(gameManager, battleData) {
    this.gameManager = gameManager;
    this.battleData = battleData;
    this.root = null;

    // === UIManager integration
    this.moduleType = 'battleInterface';
    this.iconElement = null; // Sera le root de l'UI
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
  }

  // === UTILITAIRE CSS CHARGEMENT ===
  static ensureCSSLoaded() {
    if (document.querySelector('#battle-interface-styles')) {
      // Déjà chargé
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = 'battle-interface-styles';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '/css/battle-interface.css';
      link.onload = () => {
        console.log('✅ CSS BattleInterface chargé !');
        resolve();
      };
      link.onerror = (e) => {
        console.error('❌ Erreur chargement CSS BattleInterface', e);
        // Si tu veux, ajoute ici un fallback : this.addInlineStyles()
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  /** Crée et insère l'interface */
  async createInterface() {
    if (this.root) this.destroy();

    // 👇 Important : charger CSS AVANT tout
    await this.constructor.ensureCSSLoaded();

    this.root = document.createElement('div');
    this.root.className = 'battle-interface-container';
    this.root.tabIndex = -1; // for focus
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Battle Interface');
    this.root.style.display = 'none';

    document.body.appendChild(this.root);
    setTimeout(() => { this.root.style.display = ''; }, 60);

    this.isOpen = true;
    this.iconElement = this.root;
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
      
      // Cleanup existant
      window.removeEventListener('keydown', this.handleKeyDown);
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      
      // Reset state
      this.root = null;
      this.iconElement = null;
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
    menu.style.display = 'grid';
    menu.style.gridTemplateColumns = '1fr 1fr';
    menu.style.gap = '14px 22px';

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
    const gridCols = 2, gridRows = 2;

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
    // TODO: Intégration réseau avec NetworkManager / Colyseus
    console.log('⚔️ [BattleInterface] Action émise:', action);
    if (window.onBattleAction) window.onBattleAction(action);
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
      if (!this.root) this.createInterface();
      
      this.root.classList.remove('ui-hidden', 'ui-fade-out');
      this.root.style.display = '';
      this.isOpen = true;
      this.uiManagerState.visible = true;
      
      // Appliquer config responsive si fournie
      if (options.device) {
        this.applyResponsiveConfig(options.device);
      }
      
      // Animation UIManager
      if (options.animated !== false) {
        this.root.classList.add('ui-fade-in');
        setTimeout(() => this.root.classList.remove('ui-fade-in'), 400);
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
          this.root.classList.add('ui-fade-out');
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
      // Appliquer scaling
      if (config.scaleFactor !== 1.0) {
        this.root.style.transform = `scale(${config.scaleFactor})`;
        this.root.style.transformOrigin = 'center center';
      }
      
      // Layout simplifié sur mobile
      if (config.simplifiedLayout) {
        this.root.classList.add('mobile-layout');
      } else {
        this.root.classList.remove('mobile-layout');
      }
      
      // Masquer éléments si nécessaire
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

  // === NOUVELLES MÉTHODES UIMANAGER ===

  _dispatchUIEvent(eventType, detail) {
    try {
      if (window.pokemonUISystem) {
        window.pokemonUISystem.uiManager?._dispatchEvent?.(eventType, detail);
      }
      
      // Événement DOM alternatif
      window.dispatchEvent(new CustomEvent(eventType, { detail }));
    } catch (error) {
      console.warn(`[BattleInterface] Erreur dispatch événement ${eventType}:`, error);
    }
  }

  handleError(error, context) {
    console.error(`[BattleInterface] Error in ${context}:`, error);
    
    // Notifier UIManager de l'erreur
    this._dispatchUIEvent('battleInterfaceError', { 
      error: error.message, 
      context,
      critical: this._isCriticalError(error)
    });
    
    // Recovery automatique si possible
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
          // Retry après délai
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

  // Adapter l'iconElement pour UIManager
  get iconElement() {
    return this.root;
  }
}
