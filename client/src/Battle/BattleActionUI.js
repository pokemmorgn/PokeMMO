// client/src/Battle/BattleActionUI.js - ÉTAPE 1 : Ajout de l'affichage des attaques
// Interface d'actions de combat modernisée pour Phaser, style Switch/Pokémon moderne

export class BattleActionUI {
  constructor(scene, battleManager) {
    this.scene = scene;
    this.battleManager = battleManager;

    // Containers
    this.mainActionContainer = null;
    this.movesContainer = null;
    this.bagContainer = null;
    this.pokemonContainer = null;

    // État
    this.currentMenu = 'main';
    this.selectedAction = null;
    this.isVisible = false;
    this.waitingForInput = false;

    // ✅ ÉTAPE 1: Nouvelles propriétés pour les attaques
    this.currentPokemonMoves = [];
    this.moveButtons = [];

    // Layout responsive (en % de la scène)
    this.layout = {
      mainMenu: { x: 0.5, y: 0.82, width: 460, height: 130 },
      subMenu: { x: 0.5, y: 0.68, width: 440, height: 210 }
    };
  }

  // === CRÉATION DE L'INTERFACE ===

  create() {
    const { width, height } = this.scene.cameras.main;

    // Créer le menu principal
    this.createMainActionMenu(width, height);
    this.createMovesMenu(width, height);
    this.createBagMenu(width, height);
    this.createPokemonMenu(width, height);

    // Masquer tous les panels par défaut
    this.hideAll();
  }

  // === MENU PRINCIPAL (FIGHT/BAG/POKEMON/RUN) ===

  createMainActionMenu(width, height) {
    const x = width * this.layout.mainMenu.x;
    const y = height * this.layout.mainMenu.y;
    const W = this.layout.mainMenu.width;
    const H = this.layout.mainMenu.height;

    this.mainActionContainer = this.scene.add.container(x, y).setDepth(200);

    // Background moderne (dégradé, ombre, arrondi)
    const bg = this.scene.add.graphics();
    this.drawModernPanel(bg, -W/2, -H/2, W, H, 20, 0x22456a, 0x315d96, 0.96, true);
    this.mainActionContainer.add(bg);

    // Créer les 4 boutons en 2x2
    const buttons = [
      { key: 'fight',    text: 'ATTAQUER', icon: '⚔️', pos: { x: -W/4, y: -H/6 }, color: 0x48b0f7 },
      { key: 'bag',      text: 'SAC',      icon: '🎒', pos: { x:  W/4, y: -H/6 }, color: 0x8a65d1 },
      { key: 'pokemon',  text: 'ÉQUIPE',   icon: '👥', pos: { x: -W/4, y:  H/6 }, color: 0x5bc088 },
      { key: 'run',      text: 'FUITE',    icon: '🏃', pos: { x:  W/4, y:  H/6 }, color: 0xf57b51 }
    ];
    this.actionButtons = [];

    buttons.forEach(config => {
      const btn = this.createActionButton(config);
      this.mainActionContainer.add(btn.container);
      this.actionButtons.push(btn);
    });
  }

  createActionButton({key, text, icon, pos, color}) {
    const container = this.scene.add.container(pos.x, pos.y);

    // Background arrondi, effet de survol, ombre
    const W = 170, H = 54, R = 12;
    const bg = this.scene.add.graphics();
    this.drawModernButton(bg, -W/2, -H/2, W, H, R, color, 0.83);
    container.add(bg);

    // Halo de survol
    const hoverBg = this.scene.add.graphics();
    hoverBg.fillStyle(0xffffff, 0.18);
    hoverBg.fillRoundedRect(-W/2, -H/2, W, H, R);
    hoverBg.setVisible(false);
    container.add(hoverBg);

    // Icône
    const iconText = this.scene.add.text(-40, 2, icon, {
      fontFamily: 'Segoe UI Emoji, Segoe UI, Arial',
      fontSize: '32px'
    }).setOrigin(0.5);

    // Texte bouton
    const label = this.scene.add.text(20, 2, text, {
      fontFamily: 'Montserrat, Arial',
      fontSize: '17px',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#222',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 2, color: '#000', blur: 4, fill: true }
    }).setOrigin(0, 0.5);

    container.add([iconText, label]);

    // Zone interactive invisible
    const hitArea = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover/Click effet
    hitArea.on('pointerover', () => {
      hoverBg.setVisible(true);
      this.scene.tweens.add({ targets: container, scale: 1.07, duration: 130 });
    });
    hitArea.on('pointerout', () => {
      hoverBg.setVisible(false);
      this.scene.tweens.add({ targets: container, scale: 1, duration: 130 });
    });
    hitArea.on('pointerdown', () => this.onActionButtonClicked(key));

    return {
      container, key, hitArea,
      setEnabled: enabled => {
        hitArea.setInteractive(enabled);
        container.setAlpha(enabled ? 1 : 0.45);
      }
    };
  }

  // ✅ ÉTAPE 1: MENU ATTAQUES MODIFIÉ - Réutilise l'espace des 4 boutons
  createMovesMenu(width, height) {
    // Utiliser la même position et taille que le menu principal
    const x = width * this.layout.mainMenu.x;
    const y = height * this.layout.mainMenu.y;
    const W = this.layout.mainMenu.width;
    const H = this.layout.mainMenu.height;
    
    this.movesContainer = this.scene.add.container(x, y).setDepth(210);

    const bg = this.scene.add.graphics();
    this.drawModernPanel(bg, -W/2, -H/2, W, H, 18, 0x1b2940, 0x3962b7, 0.96, true);
    this.movesContainer.add(bg);

    // Titre plus petit
    const title = this.scene.add.text(0, -H/2 + 15, 'Sélectionnez une attaque', {
      fontFamily: 'Montserrat, Arial', fontSize: '14px',
      color: '#7fd7fc', fontStyle: 'bold', stroke: '#13294b', strokeThickness: 2
    }).setOrigin(0.5);

    this.movesContainer.add(title);

    // ✅ ÉTAPE 1: Créer 4 emplacements pour les attaques (même layout que les boutons principaux)
    this.createMoveButtonSlots(W, H);

    // Bouton retour plus petit
    this.createBackButton(this.movesContainer, 0, H/2 - 20, () => this.showMainMenu());
  }

  // ✅ ÉTAPE 1: Créer les emplacements pour les attaques
  createMoveButtonSlots(W, H) {
    // Même positions que les 4 boutons principaux
    const positions = [
      { x: -W/4, y: -H/6 + 10 },  // Position du bouton ATTAQUER
      { x:  W/4, y: -H/6 + 10 },  // Position du bouton SAC
      { x: -W/4, y:  H/6 - 10 },  // Position du bouton ÉQUIPE  
      { x:  W/4, y:  H/6 - 10 }   // Position du bouton FUITE
    ];

    this.moveButtons = [];

    positions.forEach((pos, index) => {
      const moveButton = this.createMoveButtonSlot(pos, index);
      this.movesContainer.add(moveButton.container);
      this.moveButtons.push(moveButton);
    });
  }

  // ✅ ÉTAPE 1: Créer un emplacement pour une attaque
  createMoveButtonSlot(pos, index) {
    const container = this.scene.add.container(pos.x, pos.y);
    
    // Taille réduite par rapport aux boutons principaux
    const W = 160, H = 45, R = 10;
    
    // Background
    const bg = this.scene.add.graphics();
    this.drawModernButton(bg, -W/2, -H/2, W, H, R, 0x666666, 0.5); // Gris par défaut
    container.add(bg);

    // Halo de survol
    const hoverBg = this.scene.add.graphics();
    hoverBg.fillStyle(0xffffff, 0.15);
    hoverBg.fillRoundedRect(-W/2, -H/2, W, H, R);
    hoverBg.setVisible(false);
    container.add(hoverBg);

    // Nom de l'attaque
    const nameText = this.scene.add.text(0, -8, '---', {
      fontFamily: 'Montserrat, Arial', 
      fontSize: '14px',
      color: '#ffffff', 
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Type et PP
    const infoText = this.scene.add.text(0, 8, '', {
      fontFamily: 'Montserrat, Arial', 
      fontSize: '10px',
      color: '#cccccc'
    }).setOrigin(0.5);

    container.add([nameText, infoText]);

    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Événements (pour l'instant désactivés)
    hitArea.setInteractive(false);

    return {
      container,
      bg,
      nameText,
      infoText,
      hitArea,
      hoverBg,
      index,
      moveData: null,
      setEnabled: (enabled) => {
        hitArea.setInteractive(enabled);
        container.setAlpha(enabled ? 1 : 0.5);
      }
    };
  }

  // ✅ ÉTAPE 1: Méthode pour charger les attaques du Pokémon actuel
  loadCurrentPokemonMoves() {
    console.log('📋 [BattleActionUI] Chargement des attaques...');

    // Pour l'instant, utiliser des attaques par défaut (à remplacer par les vraies données)
    const defaultMoves = [
      { id: 'tackle', name: 'Charge', type: 'normal', pp: 35, maxPP: 35, power: 40 },
      { id: 'growl', name: 'Grondement', type: 'normal', pp: 40, maxPP: 40, power: 0 },
      { id: 'thunder_shock', name: 'Éclair', type: 'electric', pp: 30, maxPP: 30, power: 40 },
      { id: 'quick_attack', name: 'Vive-Attaque', type: 'normal', pp: 30, maxPP: 30, power: 40 }
    ];

    this.currentPokemonMoves = defaultMoves;
    this.displayMoves();
  }

  // ✅ ÉTAPE 1: Afficher les attaques dans les emplacements
  displayMoves() {
    console.log('🎮 [BattleActionUI] Affichage des attaques...');

    for (let i = 0; i < 4; i++) {
      const button = this.moveButtons[i];
      const move = this.currentPokemonMoves[i];

      if (move) {
        this.populateMoveButton(button, move);
      } else {
        this.clearMoveButton(button);
      }
    }
  }

  // ✅ ÉTAPE 1: Remplir un bouton d'attaque avec les données
  populateMoveButton(button, move) {
    button.moveData = move;

    // Nom de l'attaque
    button.nameText.setText(move.name);
    button.nameText.setStyle({ color: '#ffffff' });

    // Type et PP
    const ppColor = move.pp <= 5 ? '#ff6666' : move.pp <= 15 ? '#ffaa66' : '#66ff66';
    button.infoText.setText(`${move.type.toUpperCase()} • PP ${move.pp}/${move.maxPP}`);
    button.infoText.setStyle({ color: ppColor });

    // Couleur du background selon le type
    const typeColor = this.getTypeColor(move.type);
    this.drawModernButton(button.bg, -80, -22.5, 160, 45, 10, typeColor, 0.8);

    // Activer l'interactivité
    button.setEnabled(true);
    button.hitArea.on('pointerover', () => {
      button.hoverBg.setVisible(true);
      this.scene.tweens.add({ targets: button.container, scale: 1.05, duration: 100 });
    });
    button.hitArea.on('pointerout', () => {
      button.hoverBg.setVisible(false);
      this.scene.tweens.add({ targets: button.container, scale: 1, duration: 100 });
    });
    button.hitArea.on('pointerdown', () => this.onMoveSelected(move.id));

    console.log(`📝 [BattleActionUI] Attaque configurée: ${move.name}`);
  }

  // ✅ ÉTAPE 1: Vider un bouton d'attaque
  clearMoveButton(button) {
    button.moveData = null;
    button.nameText.setText('---');
    button.nameText.setStyle({ color: '#666666' });
    button.infoText.setText('');
    
    // Remettre le background gris
    this.drawModernButton(button.bg, -80, -22.5, 160, 45, 10, 0x666666, 0.5);
    
    // Désactiver l'interactivité
    button.setEnabled(false);
    button.hitArea.removeAllListeners();
  }

  // === MÉTHODES EXISTANTES (inchangées) ===

  createBagMenu(width, height) {
    const x = width * this.layout.subMenu.x;
    const y = height * this.layout.subMenu.y;
    const W = this.layout.subMenu.width, H = this.layout.subMenu.height;
    this.bagContainer = this.scene.add.container(x, y).setDepth(210);

    const bg = this.scene.add.graphics();
    this.drawModernPanel(bg, -W/2, -H/2, W, H, 18, 0x283e5b, 0x4b73ad, 0.95, true);
    this.bagContainer.add(bg);

    const title = this.scene.add.text(0, -H/2 + 28, 'Sac en combat', {
      fontFamily: 'Montserrat, Arial', fontSize: '18px',
      color: '#ffd96a', fontStyle: 'bold', stroke: '#153455', strokeThickness: 3
    }).setOrigin(0.5);

    this.bagContainer.add(title);
    this.itemButtons = [];

    this.createBackButton(this.bagContainer, 0, H/2 - 32, () => this.showMainMenu());
  }

  createPokemonMenu(width, height) {
    const x = width * this.layout.subMenu.x;
    const y = height * this.layout.subMenu.y;
    const W = this.layout.subMenu.width, H = this.layout.subMenu.height;
    this.pokemonContainer = this.scene.add.container(x, y).setDepth(210);

    const bg = this.scene.add.graphics();
    this.drawModernPanel(bg, -W/2, -H/2, W, H, 18, 0x28436b, 0x4474b7, 0.94, true);
    this.pokemonContainer.add(bg);

    const title = this.scene.add.text(0, -H/2 + 28, 'Changer de Pokémon', {
      fontFamily: 'Montserrat, Arial', fontSize: '18px',
      color: '#ffb96a', fontStyle: 'bold', stroke: '#13395b', strokeThickness: 3
    }).setOrigin(0.5);

    this.pokemonContainer.add(title);

    const msg = this.scene.add.text(0, 10, "Changement d'équipe non dispo pour l'instant.", {
      fontFamily: 'Montserrat, Arial', fontSize: '14px',
      color: '#ececec', align: 'center'
    }).setOrigin(0.5);

    this.pokemonContainer.add(msg);

    this.createBackButton(this.pokemonContainer, 0, H/2 - 32, () => this.showMainMenu());
  }

  createBackButton(container, x, y, callback) {
    const backBtn = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    this.drawModernButton(bg, -60, -18, 120, 36, 9, 0x637ca2, 0.89);
    backBtn.add(bg);

    const label = this.scene.add.text(0, 1, 'Retour', {
      fontFamily: 'Montserrat, Arial', fontSize: '15px',
      color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    backBtn.add(label);

    const hitArea = this.scene.add.rectangle(0, 0, 120, 36, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    backBtn.add(hitArea);

    hitArea.on('pointerover', () => bg.setAlpha(1));
    hitArea.on('pointerout', () => bg.setAlpha(0.89));
    hitArea.on('pointerdown', callback);

    container.add(backBtn);
  }

  // === DRAW HELPERS ===

  drawModernPanel(g, x, y, w, h, r, colorA, colorB, alpha = 1, shadow = true) {
    if (shadow) {
      g.fillStyle(0x000000, 0.23);
      g.fillRoundedRect(x + 7, y + 8, w, h, r + 8);
    }
    g.fillStyle(colorA, alpha * 0.95);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(3, colorB, 0.27);
    g.strokeRoundedRect(x, y, w, h, r + 1);
  }

  drawModernButton(g, x, y, w, h, r, color, alpha = 1) {
    g.clear();
    g.fillStyle(color, alpha);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRoundedRect(x, y, w, h, r);
  }

  // === SHOW/HIDE/MENU MGMT ===

  hideAll() {
    this.hideAllSubMenus();
    if (this.mainActionContainer) this.mainActionContainer.setVisible(false);
    this.isVisible = false;
    this.waitingForInput = false;
  }

  hideAllSubMenus() {
    if (this.movesContainer) this.movesContainer.setVisible(false);
    if (this.bagContainer) this.bagContainer.setVisible(false);
    if (this.pokemonContainer) this.pokemonContainer.setVisible(false);
  }

  showMainMenu() {
    this.currentMenu = 'main';
    this.hideAllSubMenus();
    if (this.mainActionContainer) {
      this.mainActionContainer.setVisible(true);
      this.mainActionContainer.setAlpha(0); 
      this.mainActionContainer.setScale(0.9);
      this.scene.tweens.add({
        targets: this.mainActionContainer, 
        alpha: 1, scaleX: 1, scaleY: 1, 
        duration: 200, ease: 'Back'
      });
    }
    this.isVisible = true;
    this.waitingForInput = true;
  }

  // ✅ ÉTAPE 1: Méthode showMovesMenu modifiée
  showMovesMenu() {
    this.currentMenu = 'moves';
    this.hideAllSubMenus();
    
    // Charger les attaques avant d'afficher
    this.loadCurrentPokemonMoves();
    
    if (this.movesContainer) {
      this.movesContainer.setVisible(true);
      this.movesContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.movesContainer, 
        alpha: 1, 
        duration: 180
      });
    }
  }

  showBagMenu() {
    this.currentMenu = 'bag';
    this.hideAllSubMenus();
    if (this.bagContainer) {
      this.bagContainer.setVisible(true);
      this.bagContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.bagContainer, alpha: 1, duration: 180
      });
    }
  }

  showPokemonMenu() {
    this.currentMenu = 'pokemon';
    this.hideAllSubMenus();
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(true);
      this.pokemonContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.pokemonContainer, alpha: 1, duration: 180
      });
    }
  }

  hide() {
    const toHide = [
      this.mainActionContainer,
      this.movesContainer,
      this.bagContainer,
      this.pokemonContainer
    ].filter(c => c && c.visible);
    
    if (toHide.length === 0) {
      this.isVisible = false;
      this.waitingForInput = false;
      return;
    }
    
    this.scene.tweens.add({
      targets: toHide, 
      alpha: 0, scaleX: 0.95, scaleY: 0.95, 
      duration: 200, 
      onComplete: () => this.hideAll()
    });
  }

  show() { 
    this.showMainMenu(); 
  }

  // === EVENTS LOGIC ===

  onActionButtonClicked(action) {
    this.selectedAction = action;
    switch (action) {
      case 'fight':   return this.showMovesMenu();
      case 'bag':     return this.showBagMenu();
      case 'pokemon': return this.showPokemonMenu();
      case 'run':     return this.onRunSelected();
    }
  }

  // ✅ ÉTAPE 1: Gestion de la sélection d'attaque
  onMoveSelected(moveId) {
    console.log(`⚔️ [BattleActionUI] Attaque sélectionnée: ${moveId}`);
    
    this.hide();
    
    // Notifier le battleManager
    if (this.battleManager?.selectMove) {
      this.battleManager.selectMove(moveId);
    }
    
    // Émettre l'événement
    this.scene.events.emit('battleActionSelected', { 
      type: 'move', 
      moveId: moveId 
    });
  }

  onItemSelected(itemId) {
    this.hide();
    this.battleManager?.useItem(itemId);
    this.scene.events.emit('battleActionSelected', { type: 'item', itemId });
  }

  onRunSelected() {
    this.hide();
    this.battleManager?.attemptRun();
    this.scene.events.emit('battleActionSelected', { type: 'run' });
  }

  // === UTILS ===

  getTypeColor(type) {
    const typeColors = {
      normal: 0xBBBBAA, fire: 0xF08030, water: 0x6890F0, electric: 0xF8D030,
      grass: 0x78C850, ice: 0x98D8D8, fighting: 0xC03028, poison: 0xA040A0,
      ground: 0xE0C068, flying: 0xA890F0, psychic: 0xF85888, bug: 0xA8B820,
      rock: 0xB8A038, ghost: 0x705898, dragon: 0x7038F8, dark: 0x705848,
      steel: 0xB8B8D0, fairy: 0xEE99AC
    };
    return typeColors[type?.toLowerCase?.()] || 0xBBBBAA;
  }

  setEnabled(enabled) { 
    this.actionButtons?.forEach(btn => btn.setEnabled(enabled)); 
    this.waitingForInput = enabled; 
  }

  isWaitingForInput() { 
    return this.waitingForInput && this.isVisible; 
  }

  getCurrentMenu() { 
    return this.currentMenu; 
  }

  // === NETTOYAGE ===

  destroy() {
    [this.mainActionContainer, this.movesContainer, this.bagContainer, this.pokemonContainer]
      .forEach(c => { if (c) c.destroy(); });
    this.mainActionContainer = this.movesContainer = this.bagContainer = this.pokemonContainer = null;
    this.actionButtons = this.moveButtons = this.itemButtons = [];
    if (this.scene && this.scene.input) this.scene.input.keyboard.removeAllListeners();
  }
}

console.log('✅ [BattleActionUI] Interface moderne prête avec attaques intégrées - ÉTAPE 1 !');
