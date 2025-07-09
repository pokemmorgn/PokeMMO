// client/src/components/BattleInventoryUI.js
// Inventaire spécialisé pour les combats - Hérite d'InventoryUI

import { InventoryUI } from './InventoryUI.js';

export class BattleInventoryUI extends InventoryUI {
  constructor(gameRoom, battleContext) {
    super(gameRoom);
    
    // ✅ Contexte de combat
    this.battleContext = battleContext; // { battleScene, networkHandler, battleRoomId }
    this.isBattleMode = true;
    
    // ✅ Configuration spécialisée combat
    this.battlePockets = ['balls', 'medicine', 'battle_items'];
    this.autoCloseAfterAction = true;
    this.defaultPocket = 'balls'; // Focus sur capture
    
    // ✅ Override CSS selector pour styles combat
    this.cssId = 'battle-inventory-styles';
    this.overlayClass = 'battle-inventory-overlay';
    
    console.log('⚔️ BattleInventoryUI initialisé avec contexte:', battleContext);
  }

  // === OVERRIDE: INTERFACE COMPACTE POUR COMBAT ===
  
  createInventoryInterface() {
    // Créer le conteneur principal avec classe spécialisée
    const overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = `${this.overlayClass} hidden`;

    overlay.innerHTML = `
      <div class="battle-inventory-container">
        <!-- Header compact pour combat -->
        <div class="battle-inventory-header">
          <div class="battle-inventory-title">
            <span>⚔️ Combat - Objets</span>
          </div>
          <div class="battle-inventory-controls">
            <button class="battle-inventory-close-btn">✕</button>
          </div>
        </div>

        <div class="battle-inventory-content">
          <!-- Tabs horizontaux compacts -->
          <div class="battle-pocket-tabs">
            <div class="battle-pocket-tab active" data-pocket="balls">
              <div class="battle-pocket-icon">⚪</div>
              <span>Poké Balls</span>
            </div>
            <div class="battle-pocket-tab" data-pocket="medicine">
              <div class="battle-pocket-icon">💊</div>
              <span>Soins</span>
            </div>
            <div class="battle-pocket-tab" data-pocket="battle_items">
              <div class="battle-pocket-icon">⚡</div>
              <span>Boost</span>
            </div>
          </div>

          <!-- Zone principale d'affichage -->
          <div class="battle-inventory-main">
            <!-- Grille d'objets compacte -->
            <div class="battle-items-grid" id="items-grid">
              <!-- Les objets seront générés ici -->
            </div>
          </div>
        </div>

        <!-- Footer simplifié -->
        <div class="battle-inventory-footer">
          <div class="battle-pocket-info">
            <span id="pocket-count">0 objets</span>
          </div>
          <div class="battle-inventory-actions">
            <button class="battle-inventory-btn primary" id="use-item-btn" disabled>
              <span id="action-text">Utiliser</span>
            </button>
            <button class="battle-inventory-btn secondary" id="cancel-btn">Annuler</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.addBattleStyles();
  }

  // === OVERRIDE: STYLES SPÉCIALISÉS COMBAT ===
  
  addBattleStyles() {
    if (document.querySelector(`#${this.cssId}`)) return;

    const style = document.createElement('style');
    style.id = this.cssId;
    style.textContent = `
      /* === STYLES COMBAT SPÉCIALISÉS === */
      
      .battle-inventory-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1500; /* Plus élevé que l'inventaire normal */
        backdrop-filter: blur(3px);
        transition: opacity 0.2s ease; /* Plus rapide */
      }

      .battle-inventory-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .battle-inventory-container {
        width: 600px; /* Plus compact */
        height: 500px; /* Plus petit */
        background: linear-gradient(145deg, #3d1a1a, #2a0f0f); /* Thème rouge combat */
        border: 3px solid #e74c3c; /* Rouge combat */
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 15px 40px rgba(231, 76, 60, 0.4); /* Lueur rouge */
        transform: scale(0.95);
        transition: transform 0.2s ease;
      }

      .battle-inventory-overlay:not(.hidden) .battle-inventory-container {
        transform: scale(1);
      }

      .battle-inventory-header {
        background: linear-gradient(90deg, #e74c3c, #c0392b); /* Rouge dégradé */
        padding: 12px 20px; /* Plus compact */
        border-radius: 13px 13px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #c0392b;
      }

      .battle-inventory-title {
        font-size: 18px; /* Plus petit */
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .battle-inventory-close-btn {
        background: rgba(220, 53, 69, 0.9);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .battle-inventory-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
      }

      .battle-inventory-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* === TABS HORIZONTAUX === */
      
      .battle-pocket-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 2px solid #c0392b;
        padding: 0;
      }

      .battle-pocket-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-bottom: 3px solid transparent;
        font-size: 14px;
        font-weight: 500;
      }

      .battle-pocket-tab:hover {
        background: rgba(231, 76, 60, 0.2);
        border-bottom-color: #e74c3c;
      }

      .battle-pocket-tab.active {
        background: rgba(231, 76, 60, 0.4);
        border-bottom-color: #f39c12;
        color: #f39c12;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
      }

      .battle-pocket-icon {
        font-size: 18px;
      }

      /* === GRILLE D'OBJETS COMPACTE === */
      
      .battle-inventory-main {
        flex: 1;
        overflow: hidden;
        padding: 15px;
      }

      .battle-items-grid {
        height: 100%;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); /* Plus compact */
        gap: 10px;
        align-content: start;
      }

      .battle-items-grid .item-slot {
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        padding: 10px 6px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease; /* Plus rapide */
        min-height: 85px; /* Plus compact */
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
      }

      .battle-items-grid .item-slot:hover {
        background: rgba(231, 76, 60, 0.3);
        border-color: #e74c3c;
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
      }

      .battle-items-grid .item-slot.selected {
        background: rgba(231, 76, 60, 0.5);
        border-color: #f39c12;
        box-shadow: 0 0 20px rgba(243, 156, 18, 0.6);
        transform: scale(1.05);
      }

      .battle-items-grid .item-slot.capture-ready {
        border-color: #2ecc71;
        box-shadow: 0 0 15px rgba(46, 204, 113, 0.5);
        animation: captureReady 1.5s ease-in-out infinite;
      }

      @keyframes captureReady {
        0%, 100% { box-shadow: 0 0 15px rgba(46, 204, 113, 0.5); }
        50% { box-shadow: 0 0 25px rgba(46, 204, 113, 0.8); }
      }

      .battle-items-grid .item-icon {
        font-size: 22px;
        margin-bottom: 4px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .battle-items-grid .item-name {
        font-size: 10px;
        font-weight: 500;
        line-height: 1.1;
        max-height: 2.2em;
        overflow: hidden;
      }

      .battle-items-grid .item-quantity {
        position: absolute;
        bottom: 4px;
        right: 6px;
        background: rgba(243, 156, 18, 0.95);
        color: #000;
        font-size: 9px;
        font-weight: bold;
        padding: 1px 5px;
        border-radius: 8px;
        min-width: 14px;
        text-align: center;
      }

      /* === FOOTER ACTIONS === */
      
      .battle-inventory-footer {
        background: rgba(0, 0, 0, 0.4);
        padding: 12px 20px;
        border-top: 2px solid #c0392b;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 13px 13px;
      }

      .battle-pocket-info {
        color: #bbb;
        font-size: 13px;
      }

      .battle-inventory-actions {
        display: flex;
        gap: 10px;
      }

      .battle-inventory-btn {
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
        min-width: 80px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .battle-inventory-btn.primary {
        background: linear-gradient(45deg, #e74c3c, #c0392b);
        box-shadow: 0 3px 10px rgba(231, 76, 60, 0.4);
      }

      .battle-inventory-btn.primary:hover:not(:disabled) {
        background: linear-gradient(45deg, #c0392b, #a93226);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(231, 76, 60, 0.6);
      }

      .battle-inventory-btn.primary:disabled {
        background: rgba(108, 117, 125, 0.6);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .battle-inventory-btn.secondary {
        background: rgba(108, 117, 125, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .battle-inventory-btn.secondary:hover {
        background: rgba(108, 117, 125, 1);
        transform: translateY(-1px);
      }

      /* === ÉTATS SPÉCIAUX === */
      
      .battle-items-grid .empty-pocket {
        grid-column: 1 / -1;
        text-align: center;
        color: #888;
        padding: 30px 20px;
        font-style: italic;
      }

      .battle-items-grid .empty-pocket-icon {
        font-size: 36px;
        margin-bottom: 10px;
        opacity: 0.4;
      }

      /* === SCROLLBAR COMBAT === */
      
      .battle-items-grid::-webkit-scrollbar {
        width: 6px;
      }

      .battle-items-grid::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      .battle-items-grid::-webkit-scrollbar-thumb {
        background: rgba(231, 76, 60, 0.6);
        border-radius: 3px;
      }

      .battle-items-grid::-webkit-scrollbar-thumb:hover {
        background: rgba(231, 76, 60, 0.8);
      }

      /* === RESPONSIVE COMBAT === */
      
      @media (max-width: 768px) {
        .battle-inventory-container {
          width: 95%;
          height: 80%;
        }

        .battle-pocket-tab {
          padding: 10px 8px;
          font-size: 12px;
        }

        .battle-pocket-tab span {
          display: none; /* Masquer texte sur mobile */
        }

        .battle-items-grid {
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
        }

        .battle-items-grid .item-slot {
          min-height: 70px;
          padding: 8px 4px;
        }
      }

      /* === ANIMATIONS SPÉCIALES COMBAT === */
      
      @keyframes battleItemAppear {
        from {
          opacity: 0;
          transform: scale(0.7) rotateY(90deg);
        }
        to {
          opacity: 1;
          transform: scale(1) rotateY(0deg);
        }
      }

      .battle-items-grid .item-slot.battle-new {
        animation: battleItemAppear 0.3s ease;
      }

      @keyframes battlePocketSwitch {
        0% { opacity: 0; transform: translateX(-20px) scale(0.95); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }

      .battle-items-grid.battle-switching {
        animation: battlePocketSwitch 0.2s ease;
      }
    `;

    document.head.appendChild(style);
  }

  // === OVERRIDE: EVENT LISTENERS SPÉCIALISÉS ===
  
  setupEventListeners() {
    // Fermeture
    this.overlay.querySelector('.battle-inventory-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // ESC pour fermer
    const escHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', escHandler);
    this.escHandler = escHandler; // Sauvegarder pour cleanup

    // Changement de poche (tabs horizontaux)
    this.overlay.querySelectorAll('.battle-pocket-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const pocket = tab.dataset.pocket;
        this.switchToPocket(pocket);
      });
    });

    // Boutons d'action
    this.overlay.querySelector('#use-item-btn').addEventListener('click', () => {
      this.handleBattleAction();
    });

    this.overlay.querySelector('#cancel-btn').addEventListener('click', () => {
      this.hide();
    });

    // Fermeture en cliquant à l'extérieur
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  // === OVERRIDE: AFFICHAGE AVEC FOCUS BALLS ===
  
  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    
    // ✅ Auto-focus sur la poche balls
    this.switchToPocket(this.defaultPocket);
    
    // Requête des données d'inventaire
    this.requestInventoryData();
    
    console.log('⚔️ Inventaire de combat ouvert');
  }

  // === OVERRIDE: FILTRAGE POCHES COMBAT ===
  
  switchToPocket(pocketName) {
    // ✅ Filtrer seulement les poches de combat
    if (!this.battlePockets.includes(pocketName)) {
      console.warn(`⚠️ Poche ${pocketName} non disponible en combat`);
      return;
    }

    // Mettre à jour l'onglet actif
    this.overlay.querySelectorAll('.battle-pocket-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.pocket === pocketName);
    });

    this.currentPocket = pocketName;
    this.selectedItem = null;
    this.refreshCurrentPocket();
    this.updateActionButton();
  }

  // === OVERRIDE: AFFICHAGE OBJETS FILTRÉ ===
  
  refreshCurrentPocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    let pocketData = this.inventoryData[this.currentPocket] || [];
    
    // ✅ Filtrer seulement les objets utilisables en combat
    pocketData = this.filterBattleItems(pocketData);
    
    // Animation de transition
    itemsGrid.classList.add('battle-switching');
    setTimeout(() => itemsGrid.classList.remove('battle-switching'), 200);

    // Vider la grille
    itemsGrid.innerHTML = '';

    if (pocketData.length === 0) {
      this.showEmptyBattlePocket();
    } else {
      this.displayBattleItems(pocketData);
    }

    this.updatePocketInfo();
  }

  // === NOUVEAU: FILTRAGE OBJETS COMBAT ===
  
  filterBattleItems(items) {
    return items.filter(item => {
      // ✅ Garder seulement les objets utilisables en combat
      if (this.currentPocket === 'balls') {
        return this.isBattleBall(item.itemId);
      } else if (this.currentPocket === 'medicine') {
        return this.isBattleMedicine(item.itemId);
      } else if (this.currentPocket === 'battle_items') {
        return this.isBattleItem(item.itemId);
      }
      return false;
    });
  }

  isBattleBall(itemId) {
    const battleBalls = [
      'poke_ball', 'great_ball', 'ultra_ball', 'master_ball',
      'safari_ball', 'net_ball', 'dive_ball', 'nest_ball',
      'repeat_ball', 'timer_ball', 'luxury_ball', 'premier_ball'
    ];
    return battleBalls.includes(itemId);
  }

  isBattleMedicine(itemId) {
    const battleMedicine = [
      'potion', 'super_potion', 'hyper_potion', 'max_potion',
      'full_restore', 'revive', 'max_revive',
      'antidote', 'parlyz_heal', 'awakening', 'burn_heal', 'ice_heal', 'full_heal'
    ];
    return battleMedicine.includes(itemId);
  }

  isBattleItem(itemId) {
    const battleItems = [
      'x_attack', 'x_defense', 'x_speed', 'x_special',
      'dire_hit', 'guard_spec', 'x_accuracy'
    ];
    return battleItems.includes(itemId);
  }

  // === OVERRIDE: AFFICHAGE OBJETS AVEC STYLE COMBAT ===
  
  displayBattleItems(items) {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    
    items.forEach((item, index) => {
      const itemElement = this.createBattleItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  createBattleItemElement(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-slot';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

    // ✅ Style spécial pour les Balls en capture
    if (this.currentPocket === 'balls') {
      itemElement.classList.add('capture-ready');
    }

    const itemIcon = this.getItemIcon(item.itemId, item.data);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="item-icon">${itemIcon}</div>
      <div class="item-name">${itemName}</div>
      ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
    `;

    itemElement.addEventListener('click', () => {
      this.selectBattleItem(item, itemElement);
    });

    // Animation d'apparition combat
    setTimeout(() => {
      itemElement.classList.add('battle-new');
    }, index * 30); // Plus rapide

    return itemElement;
  }

  // === OVERRIDE: SÉLECTION ITEM AVEC PRÉPARATION ACTION ===
  
  selectBattleItem(item, element) {
    // Désélectionner l'ancien item
    this.overlay.querySelectorAll('.item-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Sélectionner le nouveau
    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateActionButton();
  }

  // === NOUVEAU: GESTION BOUTON ACTION DYNAMIQUE ===
  
  updateActionButton() {
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const actionText = this.overlay.querySelector('#action-text');

    if (!this.selectedItem) {
      useBtn.disabled = true;
      actionText.textContent = 'Utiliser';
      return;
    }

    useBtn.disabled = false;

    // ✅ Texte dynamique selon le type d'objet
    if (this.currentPocket === 'balls') {
      actionText.textContent = 'Capturer';
      useBtn.className = 'battle-inventory-btn primary capture';
    } else if (this.currentPocket === 'medicine') {
      actionText.textContent = 'Soigner';
      useBtn.className = 'battle-inventory-btn primary heal';
    } else if (this.currentPocket === 'battle_items') {
      actionText.textContent = 'Utiliser';
      useBtn.className = 'battle-inventory-btn primary boost';
    }
  }

  // === NOUVEAU: ACTION COMBAT SPÉCIALISÉE ===
  
  handleBattleAction() {
    if (!this.selectedItem || !this.battleContext) {
      console.warn('⚠️ Pas d\'objet sélectionné ou contexte manquant');
      return;
    }

    const item = this.selectedItem;
    console.log(`⚔️ Action combat: ${item.itemId} (${this.currentPocket})`);

    if (this.currentPocket === 'balls') {
      this.handleCapture(item);
    } else if (this.currentPocket === 'medicine') {
      this.handleHeal(item);
    } else if (this.currentPocket === 'battle_items') {
      this.handleBattleItem(item);
    }

    // ✅ Fermeture automatique après action
    if (this.autoCloseAfterAction) {
      this.hide();
    }
  }

  // === NOUVEAU: ACTIONS SPÉCIALISÉES ===
  
  handleCapture(ballItem) {
    console.log(`🎯 Tentative capture avec: ${ballItem.itemId}`);
    
    if (this.battleContext.networkHandler) {
      // ✅ Appel méthode serveur
      this.battleContext.networkHandler.attemptCapture(ballItem.itemId);
      
      // ✅ Feedback immédiat
      if (this.battleContext.battleScene) {
        this.battleContext.battleScene.showActionMessage(
          `Lancement d'une ${this.getItemName(ballItem.itemId)}...`
        );
      }
    } else {
      console.error('❌ NetworkHandler manquant pour capture');
    }
  }

  handleHeal(medicineItem) {
    console.log(`💊 Utilisation soin: ${medicineItem.itemId}`);
    
    if (this.battleContext.networkHandler) {
      // ✅ Utiliser objet de soin
      this.battleContext.networkHandler.useItem(medicineItem.itemId, null);
      
      // ✅ Feedback immédiat
      if (this.battleContext.battleScene) {
        this.battleContext.battleScene.showActionMessage(
          `Utilisation de ${this.getItemName(medicineItem.itemId)}...`
        );
      }
    } else {
      console.error('❌ NetworkHandler manquant pour soin');
    }
  }

  handleBattleItem(boostItem) {
    console.log(`⚡ Utilisation boost: ${boostItem.itemId}`);
    
    if (this.battleContext.networkHandler) {
      // ✅ Utiliser objet de boost
      this.battleContext.networkHandler.useItem(boostItem.itemId, null);
      
      // ✅ Feedback immédiat
      if (this.battleContext.battleScene) {
        this.battleContext.battleScene.showActionMessage(
          `Utilisation de ${this.getItemName(boostItem.itemId)}...`
        );
      }
    } else {
      console.error('❌ NetworkHandler manquant pour boost');
    }
  }

  // === OVERRIDE: AFFICHAGE POCHE VIDE ===
  
  showEmptyBattlePocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    const pocketNames = {
      balls: 'Poké Balls',
      medicine: 'objets de soin',
      battle_items: 'objets de boost'
    };

    itemsGrid.innerHTML = `
      <div class="empty-pocket">
        <div class="empty-pocket-icon">📭</div>
        <p>Aucun ${pocketNames[this.currentPocket] || this.currentPocket} disponible</p>
      </div>
    `;
  }

  // === OVERRIDE: MISE À JOUR INFO POCHE ===
  
  updatePocketInfo() {
    let pocketData = this.inventoryData[this.currentPocket] || [];
    pocketData = this.filterBattleItems(pocketData);
    
    const countElement = this.overlay.querySelector('#pocket-count');
    countElement.textContent = `${pocketData.length} objets`;
  }

  // === OVERRIDE: MASQUAGE AVEC CLEANUP ===
  
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.selectedItem = null;
    
    // ✅ Cleanup listeners
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
    }
    
    console.log('⚔️ Inventaire de combat fermé');

    // ✅ Notifier BattleScene que l'inventaire est fermé
    if (this.battleContext.battleScene) {
      this.battleContext.battleScene.hideActionButtons();
    }
  }

  // === MÉTHODES PUBLIQUES SPÉCIALISÉES ===
  
  openToBalls() {
    this.show();
    this.switchToPocket('balls');
  }

  openToMedicine() {
    this.show();
    this.switchToPocket('medicine');
  }

  getBattleItems() {
    const allItems = {};
    this.battlePockets.forEach(pocket => {
      const pocketData = this.inventoryData[pocket] || [];
      allItems[pocket] = this.filterBattleItems(pocketData);
    });
    return allItems;
  }

  hasUsableBalls() {
    const balls = this.inventoryData.balls || [];
    return this.filterBattleItems(balls).length > 0;
  }

  hasUsableMedicine() {
    const medicine = this.inventoryData.medicine || [];
    return this.filterBattleItems(medicine).length > 0;
  }

  // === CLEANUP ===
  
  destroy() {
    this.hide();
    
    // Supprimer styles
    const styles = document.querySelector(`#${this.cssId}`);
    if (styles) {
      styles.remove();
    }
    
    // Supprimer overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    console.log('⚔️ BattleInventoryUI détruit');
  }
}

// === FONCTIONS DE TEST ===

window.testBattleInventory = function() {
  console.log('🧪 Test BattleInventoryUI...');
  
  const mockGameRoom = {
    send: (type, data) => console.log(`📤 Mock: ${type}`, data),
    onMessage: (type, callback) => console.log(`📥 Mock listener: ${type}`)
  };
  
  const mockBattleContext = {
    battleScene: {
      showActionMessage: (msg) => console.log(`💬 Mock message: ${msg}`),
      hideActionButtons: () => console.log(`🔲 Mock hide buttons`)
    },
    networkHandler: {
      attemptCapture: (ball) => console.log(`🎯 Mock capture: ${ball}`),
      useItem: (item) => console.log(`🎒 Mock use item: ${item}`)
    },
    battleRoomId: 'test_battle_room'
  };
  
  const battleInventory = new BattleInventoryUI(mockGameRoom, mockBattleContext);
  
  // Mock data
  battleInventory.inventoryData = {
    balls: [
      { itemId: 'poke_ball', quantity: 5, data: { type: 'ball' } },
      { itemId: 'great_ball', quantity: 2, data: { type: 'ball' } }
    ],
    medicine: [
      { itemId: 'potion', quantity: 3, data: { type: 'medicine' } },
      { itemId: 'super_potion', quantity: 1, data: { type: 'medicine' } }
    ]
  };
  
  battleInventory.show();
  
  window.battleInventoryTest = battleInventory;
  return battleInventory;
};

console.log('⚔️ BattleInventoryUI chargé !');
console.log('🧪 Test: window.testBattleInventory()');
