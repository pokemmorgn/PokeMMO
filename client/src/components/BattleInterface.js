// client/src/components/BattleInterface.js
import './../../../public/css/battle-interface.css';

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
    this.menuStack = ['main'];   // breadcrumb (ex: ['main'], ['main', 'attacks'])
    this.selectedIndices = {     // mémorise le dernier bouton sélectionné dans chaque menu
      main: 0,
      attacks: 0,
      bag: 0,
      pokemon: 0
    };

    // Reference to all button nodes for keyboard navigation
    this.buttonRefs = [];
    this.isOpen = false;

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
    this.showMainMenu();

    // Events
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
  }

  /** Affiche le menu principal */
  showMainMenu() {
    this.menuStack = ['main'];
    this.render();
  }

  /** Affiche le menu des attaques */
  showAttacksMenu() {
    this.menuStack = ['main', 'attacks'];
    this.render();
  }

  /** Affiche le menu Sac */
  showBagMenu() {
    this.menuStack = ['main', 'bag'];
    this.render();
  }

  /** Affiche le menu Pokémon */
  showPokemonMenu() {
    this.menuStack = ['main', 'pokemon'];
    this.render();
  }

  /** Retour au menu précédent */
  goBack() {
    if (this.menuStack.length > 1) {
      this.menuStack.pop();
      this.render();
    }
  }

  /** Affiche le menu en fonction de l'état courant */
  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    // Breadcrumb (état de navigation)
    const crumb = this.menuStack.join(' ⟩ ');
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

  /** Menu principal : Attaquer / Sac / Pokémon / Fuir */
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

  /** Menu des attaques (grille 2x2) */
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
        if (move.pp <= 0) {
          btn.disabled = true;
        }
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

  /** Menu Sac (placeholder, exemple) */
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

  /** Menu Changement de Pokémon (placeholder, exemple) */
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
    // Ex: this.gameManager.network.emit('battle:action', action);
    if (window.onBattleAction) window.onBattleAction(action);
  }

  close() {
    this.destroy();
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
}

// === FONCTIONS DE TEST ===
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
