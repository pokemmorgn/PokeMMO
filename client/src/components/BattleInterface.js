// client/src/components/BattleInterface.js
import './../../../public/css/battle-interface.css';

/**
 * BattleInterface
 * Module UIManager-compatible pour le menu de combat Pokémon.
 */
export class BattleInterface {
  /**
   * @param {GameManager} gameManager - Référence au gestionnaire principal du jeu
   * @param {object} battleData - Données de combat à afficher
   */
  constructor(gameManager, battleData) {
    this.gameManager = gameManager;
    this.battleData = battleData;
    this.root = null;

    // Navigation state
    this.menuStack = ['main'];
    this.selectedIndices = {
      main: 0,
      attacks: 0,
      bag: 0,
      pokemon: 0
    };

    this.buttonRefs = [];
    this.isOpen = false;

    // UIManager state
    this.uiManagerState = {
      visible: false,
      enabled: true,
      initialized: false
    };

    // Binding event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleAction = this.handleAction.bind(this);
  }

  /** Crée et insère l'interface */
  createInterface() {
    if (this.root) this.destroy();

    this.root = document.createElement('div');
    this.root.className = 'battle-interface-container';
    this.root.tabIndex = -1; // for focus
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Battle Interface');
    this.root.style.display = 'none';

    document.body.appendChild(this.root);
    setTimeout(() => { this.root.style.display = ''; }, 60);

    this.isOpen = true;
    this.uiManagerState.initialized = true;
    this.showMainMenu();

    window.addEventListener('keydown', this.handleKeyDown);
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
    this.root.focus();
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.isOpen = false;
    this.uiManagerState.visible = false;
    this.uiManagerState.initialized = false;
  }

  // =========== UIManager API ===========

  /** Afficher l'interface (UIManager) */
  show() {
    if (!this.root) this.createInterface();
    this.root.classList.remove('ui-hidden');
    this.root.style.display = '';
    this.isOpen = true;
    this.uiManagerState.visible = true;
    this.root.focus?.();
  }

  /** Cacher l'interface (UIManager) */
  hide() {
    if (this.root) {
      this.root.classList.add('ui-hidden');
      this.root.style.display = 'none';
      this.isOpen = false;
      this.uiManagerState.visible = false;
    }
  }

  /** Activer/désactiver (UIManager) */
  setEnabled(enabled) {
    this.uiManagerState.enabled = enabled;
    if (this.root) {
      this.root.classList.toggle('ui-disabled', !enabled);
      Array.from(this.root.querySelectorAll('button')).forEach(btn => {
        btn.disabled = !enabled;
      });
    }
  }

  /** MAJ dynamique (optionnel pour UIManager) */
  update(data) {
    if (data?.type === 'state') {
      if (data.visible !== undefined) data.visible ? this.show() : this.hide();
      if (data.enabled !== undefined) this.setEnabled(data.enabled);
    }
    // Tu peux traiter d'autres updates ici...
  }

  /** Optionnel : retourne l'état UIManager */
  getUIManagerState() {
    return { ...this.uiManagerState, hasRoot: !!this.root, isOpen: this.isOpen };
  }

  // =========== BattleInterface logique existante ===========

  showMainMenu() {
    this.menuStack = ['main'];
    this.render();
  }

  showAttacksMenu() {
    this.menuStack = ['main', 'attacks'];
    this.render();
  }

  showBagMenu() {
    this.menuStack = ['main', 'bag'];
    this.render();
  }

  showPokemonMenu() {
    this.menuStack = ['main', 'pokemon'];
    this.render();
  }

  goBack() {
    if (this.menuStack.length > 1) {
      this.menuStack.pop();
      this.render();
    }
  }

  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    // Breadcrumb (état de navigation)
    const bc = document.createElement('div');
    bc.className = 'battle-breadcrumb';
    bc.textContent = this.getBreadcrumbLabel();
    this.root.appendChild(bc);

    // Menus selon l'état
    const current = this.menuStack[this.menuStack.length - 1];
    this.buttonRefs = [];

    if (current === 'main') this.renderMainMenu();
    else if (current === 'attacks') this.renderAttacksMenu();
    else if (current === 'bag') this.renderBagMenu();
    else if (current === 'pokemon') this.renderPokemonMenu();

    // Affiche le bouton retour (sauf sur menu principal)
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

    // À implémenter: Récupérer items du sac (exemple statique)
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

    // À implémenter: Récupérer équipe du joueur (exemple statique)
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

  // ===========================
  // === NAVIGATION CLAVIER ====
  // ===========================
  handleKeyDown(e) {
    if (!this.isOpen) return;

    const current = this.menuStack[this.menuStack.length - 1];
    let idx = this.selectedIndices[current] || 0;
    const maxIdx = this.buttonRefs.length - 1;

    // Layout (pour attacks: 2x2)
    const isGrid = (current === 'attacks');
    const gridCols = 2;
    const gridRows = 2;

    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
        if (isGrid) idx = (idx + 1) % 4;
        else idx = Math.min(idx + 1, maxIdx);
        break;
      case 'ArrowLeft':
        if (isGrid) idx = (idx + 3) % 4;
        else idx = Math.max(idx - 1, 0);
        break;
      case 'ArrowUp':
        if (isGrid) idx = (idx + 2) % 4;
        else idx = Math.max(idx - 1, 0);
        break;
      case 'ArrowDown':
        if (isGrid) idx = (idx + 2) % 4;
        else idx = Math.min(idx + 1, maxIdx);
        break;
      case 'Enter':
      case ' ':
        if (this.buttonRefs[idx] && !this.buttonRefs[idx].disabled) this.buttonRefs[idx].click();
        break;
      case 'Escape':
        this.goBack();
        break;
      case 'Tab': // Navigation circulaire
        idx = (idx + 1) % (maxIdx + 1);
        break;
      default:
        handled = false;
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

  // ===========================
  // === GESTION DES ACTIONS ===
  // ===========================
  handleAction(actionType, actionData = {}) {
    switch (actionType) {
      case 'attack':
        if (this.menuStack.at(-1) === 'main') {
          this.showAttacksMenu();
        } else if (this.menuStack.at(-1) === 'attacks') {
          // Envoie l'action d'attaque sélectionnée
          this.emitBattleAction({ type: 'attack', ...actionData });
          this.close();
        }
        break;
      case 'bag':
        if (this.menuStack.at(-1) === 'main') {
          this.showBagMenu();
        } else {
          this.emitBattleAction({ type: 'bag', ...actionData });
          this.close();
        }
        break;
      case 'pokemon':
        if (this.menuStack.at(-1) === 'main') {
          this.showPokemonMenu();
        } else {
          this.emitBattleAction({ type: 'pokemon', ...actionData });
          this.close();
        }
        break;
      case 'flee':
        this.emitBattleAction({ type: 'flee' });
        this.close();
        break;
      default:
        // console.warn('[BattleInterface] Action inconnue:', actionType, actionData);
        break;
    }
  }

  emitBattleAction(action) {
    // TODO: Intégration réseau avec NetworkManager / Colyseus
    if (window.onBattleAction) window.onBattleAction(action);
  }

  close() {
    this.hide();
    setTimeout(() => this.destroy(), 200); // Optionnel : délai pour animation de sortie
  }

  /** Libellé du breadcrumb selon le menu */
  getBreadcrumbLabel() {
    if (this.menuStack.length === 1) return "Que veux-tu faire ?";
    const last = this.menuStack.at(-1);
    switch (last) {
      case 'attacks': return "Sélectionne une attaque";
      case 'bag': return "Sélectionne un objet";
      case 'pokemon': return "Change de Pokémon";
      default: return '';
    }
  }

  // Optionnel, pour homogénéité UIManager (utilisé pour .iconElement dans d'autres modules)
  get iconElement() { return this.root; }
}

// === FONCTION DE TEST ===
window.testBattleInterface = (battleData) => {
  const gm = window.gameManager || {};
  const data = battleData || {
    playerPokemon: {
      name: "Pikachu",
      level: 25,
      currentHp: 45,
      maxHp: 60,
      moves: [
        { id: "thunder_shock", name: "Éclair", type: "electric", pp: 30, maxPp: 30 },
        { id: "growl", name: "Rugissement", type: "normal", pp: 40, maxPp: 40 },
        { id: "quick_attack", name: "Vive-Attaque", type: "normal", pp: 30, maxPp: 30 },
        { id: "thunder_wave", name: "Cage Éclair", type: "electric", pp: 20, maxPp: 20 }
      ]
    },
    opponentPokemon: {
      name: "Rattata",
      level: 3,
      currentHp: 15,
      maxHp: 15
    },
    canFlee: true,
    canUseBag: true
  };
  const iface = new BattleInterface(gm, data);
  iface.createInterface();
  window._battleInterface = iface;
  return iface;
};
