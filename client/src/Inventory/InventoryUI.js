// Inventory/InventoryUI.js - VERSION AVEC TRADUCTIONS TEMPS RÉEL
// 🌐 Support complet des traductions selon le pattern TeamIcon/QuestIcon
// 🔄 Mise à jour automatique lors changement de langue

import { INVENTORY_UI_STYLES } from './InventoryUICSS.js';
import { t } from '../managers/LocalizationManager.js';

export class InventoryUI {
  constructor(gameRoom, optionsManager = null) {
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;
    
    this.isVisible = false;
    this.currentPocket = 'items';
    this.selectedItem = null;
    this.inventoryData = {};
    this.itemLocalizations = {};
    this.currentLanguage = 'fr';
    this.overlay = null;
    this._eventsAttached = false;
    
    // === 🌐 LOCALIZATION ===
    this.cleanupLanguageListener = null;
    
    console.log('🎒 [InventoryUI] Instance créée avec support traductions');
    
    this.init();
  }

  async loadLocalizations() {
    try {
      const response = await fetch('/localization/itemloca.json');
      this.itemLocalizations = await response.json();
      console.log('🌐 Localisations d\'objets chargées');
    } catch (error) {
      console.error('❌ Erreur chargement localizations:', error);
      this.itemLocalizations = {};
    }
  }

  getItemName(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    return 'Description non disponible.';
  }

  // === 🚀 INITIALISATION AVEC LOCALIZATION ===

  init() {
    try {
      console.log('🚀 [InventoryUI] Initialisation avec traductions...');
      
      this.createInventoryInterface();
      this.addStyles();
      this.setupServerListeners();
      this.setupLanguageSupport();
      
      // ✅ FERMER PAR DÉFAUT
      this.forceClose();
      
      console.log('✅ [InventoryUI] Initialisé avec support multilingue et fermé par défaut');
      
    } catch (error) {
      console.error('❌ [InventoryUI] Erreur initialisation:', error);
      throw error;
    }
  }

  // === 🌐 CONFIGURATION SUPPORT LANGUE ===

  setupLanguageSupport() {
    // S'abonner aux changements de langue si optionsManager disponible
    if (this.optionsManager && typeof this.optionsManager.addLanguageListener === 'function') {
      console.log('🌐 [InventoryUI] Configuration listener langue...');
      
      this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
        console.log('🔄 [InventoryUI] Changement langue détecté');
        this.updateLanguage();
      });
      
      console.log('✅ [InventoryUI] Listener langue configuré');
    } else {
      console.warn('⚠️ [InventoryUI] OptionsManager non disponible - pas de mise à jour langue temps réel');
    }
    
    // Mise à jour initiale
    this.updateLanguage();
  }

  /**
   * Met à jour tous les textes selon la langue courante
   */
  updateLanguage() {
    if (!this.overlay) {
      console.log('ℹ️ [InventoryUI] Pas d\'overlay à mettre à jour');
      return;
    }
    
    console.log('🔄 [InventoryUI] Mise à jour langue...');
    
    try {
      // === TITRE PRINCIPAL ===
      const titleElement = this.overlay.querySelector('.inventory-title span');
      if (titleElement) {
        titleElement.textContent = t('inventory.ui.title');
      }
      
      // === BOUTON FERMETURE (garde le X) ===
      const closeBtn = this.overlay.querySelector('.inventory-close-btn');
      if (closeBtn) {
        closeBtn.textContent = t('inventory.ui.close');
      }
      
      // === ONGLETS POCHES ===
      this.updatePocketTabs();
      
      // === ZONE DÉTAILS ===
      this.updateDetailsSection();
      
      // === FOOTER ===
      this.updateFooterTexts();
      
      // === BOUTONS D'ACTION ===
      this.updateActionButtons();
      
      // === CONTENU ACTUEL ===
      this.refreshCurrentPocket();
      
      console.log('✅ [InventoryUI] Langue mise à jour');
      
    } catch (error) {
      console.error('❌ [InventoryUI] Erreur mise à jour langue:', error);
    }
  }

  /**
   * Met à jour les onglets des poches
   */
  updatePocketTabs() {
    const pocketMappings = {
      'items': 'inventory.ui.pockets.items',
      'medicine': 'inventory.ui.pockets.medicine',
      'balls': 'inventory.ui.pockets.balls',
      'berries': 'inventory.ui.pockets.berries',
      'key_items': 'inventory.ui.pockets.key_items',
      'tms': 'inventory.ui.pockets.tms'
    };
    
    Object.entries(pocketMappings).forEach(([pocket, translationKey]) => {
      const tabElement = this.overlay.querySelector(`[data-pocket="${pocket}"] span`);
      if (tabElement) {
        tabElement.textContent = t(translationKey);
      }
    });
  }

  /**
   * Met à jour la section de détails
   */
  updateDetailsSection() {
    const detailsContainer = this.overlay.querySelector('#item-details');
    if (!detailsContainer) return;
    
    // Si aucun objet sélectionné, mettre à jour le message par défaut
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">${t('inventory.ui.details.no_selection_icon')}</div>
          <p>${t('inventory.ui.details.no_selection')}</p>
        </div>
      `;
    } else {
      // Remettre à jour les détails de l'objet sélectionné
      this.updateItemDetails();
    }
  }

  /**
   * Met à jour les textes du footer
   */
  updateFooterTexts() {
    // Les boutons seront mis à jour dans updateActionButtons()
    // Le compteur sera mis à jour dans updatePocketInfo()
    this.updatePocketInfo();
  }

  /**
   * Met à jour les boutons d'action avec traductions
   */
  updateActionButtons() {
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const giveBtn = this.overlay.querySelector('#give-item-btn');
    const sortBtn = this.overlay.querySelector('#sort-items-btn');

    if (useBtn) {
      useBtn.textContent = t('inventory.ui.footer.use');
    }

    if (giveBtn) {
      giveBtn.textContent = t('inventory.ui.footer.give');
    }

    if (sortBtn) {
      sortBtn.textContent = t('inventory.ui.footer.sort');
    }
  }

  // === 🎨 CRÉATION INTERFACE AVEC TEXTES TRADUITS ===

  createInventoryInterface() {
    // Supprimer l'existant si présent
    const existing = document.querySelector('#inventory-overlay');
    if (existing) {
      existing.remove();
    }

    // Créer le conteneur principal avec traductions
    const overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = 'inventory-overlay hidden';

    overlay.innerHTML = `
      <div class="inventory-container">
        <!-- Header avec titre et bouton fermeture -->
        <div class="inventory-header">
          <div class="inventory-title">
            <img src="/assets/ui/bag-icon.png" alt="Sac" class="bag-icon" onerror="this.style.display='none'">
            <span>${t('inventory.ui.title')}</span>
          </div>
          <div class="inventory-controls">
            <button class="inventory-close-btn">${t('inventory.ui.close')}</button>
          </div>
        </div>

        <div class="inventory-content">
          <!-- Sidebar avec les poches -->
          <div class="inventory-sidebar">
            <div class="pocket-tabs">
              <div class="pocket-tab active" data-pocket="items">
                <div class="pocket-icon">📦</div>
                <span>${t('inventory.ui.pockets.items')}</span>
              </div>
              <div class="pocket-tab" data-pocket="medicine">
                <div class="pocket-icon">💊</div>
                <span>${t('inventory.ui.pockets.medicine')}</span>
              </div>
              <div class="pocket-tab" data-pocket="balls">
                <div class="pocket-icon">⚪</div>
                <span>${t('inventory.ui.pockets.balls')}</span>
              </div>
              <div class="pocket-tab" data-pocket="berries">
                <div class="pocket-icon">🍇</div>
                <span>${t('inventory.ui.pockets.berries')}</span>
              </div>
              <div class="pocket-tab" data-pocket="key_items">
                <div class="pocket-icon">🗝️</div>
                <span>${t('inventory.ui.pockets.key_items')}</span>
              </div>
              <div class="pocket-tab" data-pocket="tms">
                <div class="pocket-icon">💿</div>
                <span>${t('inventory.ui.pockets.tms')}</span>
              </div>
            </div>
          </div>

          <!-- Zone principale d'affichage -->
          <div class="inventory-main">
            <!-- Liste des objets -->
            <div class="items-grid" id="items-grid">
              <!-- Les objets seront générés ici -->
            </div>

            <!-- Zone de détails -->
            <div class="item-details" id="item-details">
              <div class="no-selection">
                <div class="no-selection-icon">${t('inventory.ui.details.no_selection_icon')}</div>
                <p>${t('inventory.ui.details.no_selection')}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer avec infos -->
        <div class="inventory-footer">
          <div class="pocket-info">
            <span id="pocket-count">0 ${t('inventory.ui.footer.count')}</span>
            <span id="pocket-limit">/ 30 ${t('inventory.ui.footer.max')}</span>
          </div>
          <div class="inventory-actions">
            <button class="inventory-btn" id="use-item-btn" disabled>${t('inventory.ui.footer.use')}</button>
            <button class="inventory-btn" id="give-item-btn" disabled>${t('inventory.ui.footer.give')}</button>
            <button class="inventory-btn secondary" id="sort-items-btn">${t('inventory.ui.footer.sort')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    
    console.log('🎨 [InventoryUI] Interface créée avec textes traduits');
  }

  addStyles() {
    if (document.querySelector('#inventory-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'inventory-ui-styles';
    style.textContent = INVENTORY_UI_STYLES;
    
    document.head.appendChild(style);
    console.log('🎨 [InventoryUI] Styles modulaires appliqués');
  }

  // === ✅ MÉTHODES INCHANGÉES (LOGIQUE UI) ===

  forceClose() {
    console.log('🔒 [InventoryUI] Fermeture forcée...');
    
    this.isVisible = false;
    
    if (this.overlay) {
      this.overlay.classList.remove('ui-fade-in', 'ui-fade-out');
      this.overlay.classList.add('hidden');
      this.overlay.style.display = 'none';
      this.overlay.style.opacity = '0';
      this.overlay.style.visibility = 'hidden';
      this.overlay.style.pointerEvents = 'none';
    }
    
    this.selectedItem = null;
    this._eventsAttached = false;
    
    console.log('✅ [InventoryUI] Fermé complètement');
  }

  show() {
    if (this.isVisible) {
      console.log('ℹ️ [InventoryUI] Déjà ouvert');
      return;
    }
    
    console.log('🎒 [InventoryUI] Ouverture inventaire...');
    
    this.isVisible = true;
    
    if (this.overlay) {
      this.overlay.classList.remove('hidden', 'ui-hidden', 'ui-fade-out');
      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = '1';
      this.overlay.style.visibility = 'visible';
      this.overlay.style.pointerEvents = 'auto';
      this.overlay.style.zIndex = '1000';
      
      this.overlay.classList.add('ui-fade-in');
      setTimeout(() => {
        this.overlay.classList.remove('ui-fade-in');
      }, 300);
    }
    
    this.ensureEventListeners();
    this.requestInventoryData();
    
    if (this.inventoryData && Object.keys(this.inventoryData).length > 0) {
      setTimeout(() => {
        this.refreshCurrentPocket();
      }, 100);
    }
    
    console.log('✅ [InventoryUI] Inventaire ouvert');
  }

  hide() {
    if (!this.isVisible) {
      console.log('ℹ️ [InventoryUI] Déjà fermé');
      return;
    }
    
    console.log('❌ [InventoryUI] Fermeture inventaire...');
    
    this.isVisible = false;
    
    if (this.overlay) {
      this.overlay.classList.add('ui-fade-out');
      
      setTimeout(() => {
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('ui-fade-out');
        this.overlay.style.display = 'none';
        this.overlay.style.opacity = '0';
        this.overlay.style.visibility = 'hidden';
        this.overlay.style.pointerEvents = 'none';
      }, 150);
    }
    
    this.selectedItem = null;
    this.updateItemDetails();
    
    console.log('✅ [InventoryUI] Inventaire fermé');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  ensureEventListeners() {
    if (this._eventsAttached) {
      console.log('ℹ️ [InventoryUI] Événements déjà attachés');
      return;
    }
    
    console.log('🔧 [InventoryUI] Attachement des événements...');
    this.setupEventListeners();
    this._eventsAttached = true;
  }

  setupEventListeners() {
    if (!this.overlay) return;

    // Événements ESC - global
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));

    // Bouton fermeture
    const closeBtn = this.overlay.querySelector('.inventory-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ [InventoryUI] Clic bouton fermer');
        this.hide();
      };
    }

    // Onglets poches
    this.overlay.querySelectorAll('.pocket-tab').forEach(tab => {
      tab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pocket = tab.dataset.pocket;
        console.log(`🔄 [InventoryUI] Changement vers poche: ${pocket}`);
        this.switchToPocket(pocket);
      };
    });

    // Boutons d'action
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const giveBtn = this.overlay.querySelector('#give-item-btn');
    const sortBtn = this.overlay.querySelector('#sort-items-btn');

    if (useBtn) {
      useBtn.onclick = () => this.useSelectedItem();
    }

    if (giveBtn) {
      giveBtn.onclick = () => this.giveSelectedItem();
    }

    if (sortBtn) {
      sortBtn.onclick = () => this.sortCurrentPocket();
    }

    // Fermeture en cliquant à l'extérieur
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        console.log('❌ [InventoryUI] Fermeture via clic extérieur');
        this.hide();
      }
    };

    console.log('✅ [InventoryUI] Événements attachés');
  }

  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isVisible) {
      e.preventDefault();
      this.hide();
    }
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    this.gameRoom.onMessage("inventoryData", (data) => {
      this.updateInventoryData(data);
    });

    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.handleInventoryUpdate(data);
    });

    this.gameRoom.onMessage("itemUseResult", (data) => {
      this.handleItemUseResult(data);
    });
  }

  requestInventoryData() {
    if (this.gameRoom) {
      console.log('📡 [InventoryUI] Demande données inventaire...');
      this.gameRoom.send("getInventory");
    }
  }

  updateInventoryData(data) {
    console.log('📦 [InventoryUI] Réception données inventaire:', data);
    
    this.inventoryData = data;
    
    if (this.isVisible) {
      this.refreshCurrentPocket();
      this.updatePocketInfo();
    }
    
    console.log('✅ [InventoryUI] Données d\'inventaire mises à jour');
  }

  switchToPocket(pocketName) {
    // Mettre à jour l'onglet actif
    this.overlay.querySelectorAll('.pocket-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.pocket === pocketName);
    });

    this.currentPocket = pocketName;
    this.selectedItem = null;
    this.refreshCurrentPocket();
    this.updateItemDetails();
    
    console.log(`✅ [InventoryUI] Poche changée vers: ${pocketName}`);
  }

  refreshCurrentPocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    if (!itemsGrid) return;
    
    const pocketData = this.inventoryData[this.currentPocket] || [];
    
    // Animation de transition
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    // Vider la grille
    itemsGrid.innerHTML = '';

    if (pocketData.length === 0) {
      this.showEmptyPocket();
    } else {
      this.displayItems(pocketData);
    }

    this.updatePocketInfo();
  }

  // === 🌐 MÉTHODES AVEC TRADUCTIONS ===

  showEmptyPocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    
    // Obtenir le nom traduit de la poche
    const pocketKey = `inventory.ui.pockets.${this.currentPocket}`;
    const pocketName = t(pocketKey);
    
    itemsGrid.innerHTML = `
      <div class="empty-pocket">
        <div class="empty-pocket-icon">${t('inventory.ui.empty.icon')}</div>
        <p>${t('inventory.ui.empty.message').replace('{pocket}', pocketName)}</p>
      </div>
    `;
  }

  displayItems(items) {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    
    items.forEach((item, index) => {
      const itemElement = this.createItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  createItemElement(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-slot';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

    const itemIcon = this.getItemIcon(item.itemId, item.data);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="item-icon">${itemIcon}</div>
      <div class="item-name">${itemName}</div>
      ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    // Animation d'apparition
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getItemIcon(itemId, itemData) {
    // Mapping des icônes selon le type d'objet (inchangé)
    const iconMap = {
      // Poké Balls
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'safari_ball': '🟢',
      
      // Soins
      'potion': '💊',
      'super_potion': '💉',
      'hyper_potion': '🧪',
      'max_potion': '🍼',
      'full_restore': '✨',
      'revive': '💎',
      'max_revive': '💠',
      'antidote': '🟢',
      'parlyz_heal': '🟡',
      'awakening': '🔵',
      'burn_heal': '🔴',
      'ice_heal': '❄️',
      'full_heal': '⭐',
      
      // Objets divers
      'escape_rope': '🪢',
      'repel': '🚫',
      'super_repel': '⛔',
      'max_repel': '🔒',
      
      // Objets clés
      'bike_voucher': '🎫',
      'bicycle': '🚲',
      'town_map': '🗺️',
      'itemfinder': '📡',
      'old_rod': '🎣',
      'good_rod': '🎯',
      'super_rod': '⭐',
      'card_key': '💳',
      'lift_key': '🗝️',
      'ss_ticket': '🎫',
      'secret_key': '🔑',
      'poke_flute': '🎵',
      'silph_scope': '🔍',
      'exp_share': '📊',
      'coin_case': '💰',
      'dome_fossil': '🦕',
      'helix_fossil': '🐚',
      'old_amber': '🟨'
    };

    return iconMap[itemId] || '📦';
  }

  selectItem(item, element) {
    // Désélectionner l'ancien item
    this.overlay.querySelectorAll('.item-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Sélectionner le nouveau
    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateItemDetails();
    this.updateActionButtonsState();
  }

  updateItemDetails() {
    const detailsContainer = this.overlay.querySelector('#item-details');
    
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">${t('inventory.ui.details.no_selection_icon')}</div>
          <p>${t('inventory.ui.details.no_selection')}</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId, item.data);

    detailsContainer.innerHTML = `
      <div class="item-detail-content">
        <div class="item-detail-icon">${itemIcon}</div>
        <div class="item-detail-info">
          <div class="item-detail-name">${itemName}</div>
          <div class="item-detail-type">${this.getItemTypeText(item.data)}</div>
          <div class="item-detail-description">${itemDescription}</div>
          <div class="item-detail-stats">
            ${this.getItemStats(item)}
          </div>
        </div>
      </div>
    `;
  }

  getItemTypeText(itemData) {
    if (!itemData) return t('inventory.ui.item_types.item');
    
    const typeKey = `inventory.ui.item_types.${itemData.type || 'item'}`;
    return t(typeKey);
  }

  getItemStats(item) {
    const stats = [];
    
    if (item.quantity > 1) {
      stats.push(`<div class="item-stat">${t('inventory.ui.stats.quantity')}: ${item.quantity}</div>`);
    }

    if (item.data && item.data.price) {
      stats.push(`<div class="item-stat">${t('inventory.ui.stats.price')}: ${item.data.price}₽</div>`);
    }

    if (item.data && item.data.heal_amount) {
      const healText = item.data.heal_amount === 'full' ? t('inventory.ui.stats.full') : `${item.data.heal_amount} ${t('inventory.ui.stats.hp')}`;
      stats.push(`<div class="item-stat">${t('inventory.ui.stats.heal')}: ${healText}</div>`);
    }

    if (item.data && item.data.effect_steps) {
      stats.push(`<div class="item-stat">${t('inventory.ui.stats.duration')}: ${item.data.effect_steps} ${t('inventory.ui.stats.steps')}</div>`);
    }

    return stats.join('');
  }

  updateActionButtonsState() {
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const giveBtn = this.overlay.querySelector('#give-item-btn');

    const canUse = this.selectedItem && this.canUseItem(this.selectedItem);
    const canGive = this.selectedItem && this.selectedItem.data?.type !== 'key_item';

    useBtn.disabled = !canUse;
    giveBtn.disabled = !canGive;
  }

  canUseItem(item) {
    if (!item || !item.data) return false;
    
    // Les objets clés ne peuvent généralement pas être "utilisés" depuis l'inventaire
    if (item.data.type === 'key_item') return false;
    
    // Vérifier si l'objet est utilisable hors combat
    return item.data.usable_in_field === true;
  }

  updatePocketInfo() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    const countElement = this.overlay.querySelector('#pocket-count');
    const limitElement = this.overlay.querySelector('#pocket-limit');
    
    if (countElement) {
      countElement.textContent = `${pocketData.length} ${t('inventory.ui.footer.count')}`;
    }
    
    if (limitElement) {
      limitElement.textContent = `/ 30 ${t('inventory.ui.footer.max')}`;
    }
  }

  useSelectedItem() {
    if (!this.selectedItem || !this.canUseItem(this.selectedItem)) return;

    if (this.gameRoom) {
      this.gameRoom.send("useItem", {
        itemId: this.selectedItem.itemId,
        context: "field"
      });
    }
  }

  giveSelectedItem() {
    if (!this.selectedItem) return;

    // TODO: Implémenter l'interface pour donner un objet à un Pokémon
    this.showNotification(t('inventory.ui.notifications.give_not_implemented'), "info");
  }

  sortCurrentPocket() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    if (pocketData.length === 0) return;

    // Trier par nom d'objet
    pocketData.sort((a, b) => {
      const nameA = this.getItemName(a.itemId).toLowerCase();
      const nameB = this.getItemName(b.itemId).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.refreshCurrentPocket();
    this.showNotification(t('inventory.ui.notifications.items_sorted'), "success");
  }

  handleInventoryUpdate(data) {
    // Mettre à jour les données locales
    if (data.type === 'add') {
      this.addItemToLocal(data.itemId, data.quantity, data.pocket);
    } else if (data.type === 'remove') {
      this.removeItemFromLocal(data.itemId, data.quantity, data.pocket);
    }

    // Rafraîchir l'affichage si on regarde la bonne poche
    if (data.pocket === this.currentPocket && this.isVisible) {
      this.refreshCurrentPocket();
    }

    // Notification avec traduction
    const itemName = this.getItemName(data.itemId);
    if (data.type === 'add') {
      this.showNotification(t('inventory.ui.notifications.item_added').replace('{quantity}', data.quantity).replace('{name}', itemName), "success");
    } else if (data.type === 'remove') {
      this.showNotification(t('inventory.ui.notifications.item_removed').replace('{quantity}', data.quantity).replace('{name}', itemName), "info");
    }
  }

  addItemToLocal(itemId, quantity, pocket) {
    if (!this.inventoryData[pocket]) {
      this.inventoryData[pocket] = [];
    }

    const existingItem = this.inventoryData[pocket].find(item => item.itemId === itemId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.inventoryData[pocket].push({
        itemId: itemId,
        quantity: quantity,
        data: {}
      });
    }
  }

  removeItemFromLocal(itemId, quantity, pocket) {
    if (!this.inventoryData[pocket]) return;

    const itemIndex = this.inventoryData[pocket].findIndex(item => item.itemId === itemId);
    if (itemIndex >= 0) {
      const item = this.inventoryData[pocket][itemIndex];
      item.quantity -= quantity;
      
      if (item.quantity <= 0) {
        this.inventoryData[pocket].splice(itemIndex, 1);
        
        // Si l'objet supprimé était sélectionné, désélectionner
        if (this.selectedItem && this.selectedItem.itemId === itemId) {
          this.selectedItem = null;
          this.updateItemDetails();
          this.updateActionButtonsState();
        }
      }
    }
  }

  handleItemUseResult(data) {
    if (data.success) {
      this.showNotification(data.message || t('inventory.ui.notifications.item_used_success'), "success");
      this.requestInventoryData();
    } else {
      this.showNotification(data.message || t('inventory.ui.notifications.item_use_failed'), "error");
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `inventory-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // === 🔧 MÉTHODES PUBLIQUES POUR L'INTÉGRATION ===

  openToPocket(pocketName) {
    this.show();
    if (pocketName && pocketName !== this.currentPocket) {
      setTimeout(() => {
        this.switchToPocket(pocketName);
      }, 100);
    }
  }

  isOpen() {
    return this.isVisible;
  }

  setEnabled(enabled) {
    if (this.overlay) {
      if (enabled) {
        this.overlay.classList.remove('disabled');
      } else {
        this.overlay.classList.add('disabled');
      }
    }
  }

  handleKeyPress(key) {
    if (!this.isVisible) return false;

    switch (key) {
      case 'Escape':
        this.hide();
        return true;
      case 'Enter':
        if (this.selectedItem && this.canUseItem(this.selectedItem)) {
          this.useSelectedItem();
          return true;
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        this.navigatePockets(key === 'ArrowRight' ? 1 : -1);
        return true;
      case 'ArrowUp':
      case 'ArrowDown':
        this.navigateItems(key === 'ArrowDown' ? 1 : -1);
        return true;
    }

    return false;
  }

  navigatePockets(direction) {
    const pockets = ['items', 'medicine', 'balls', 'berries', 'key_items', 'tms'];
    const currentIndex = pockets.indexOf(this.currentPocket);
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = pockets.length - 1;
    if (newIndex >= pockets.length) newIndex = 0;
    
    this.switchToPocket(pockets[newIndex]);
  }

  navigateItems(direction) {
    const items = this.overlay.querySelectorAll('.item-slot');
    if (items.length === 0) return;

    let currentIndex = -1;
    if (this.selectedItem) {
      items.forEach((item, index) => {
        if (item.dataset.itemId === this.selectedItem.itemId) {
          currentIndex = index;
        }
      });
    }

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    const newItem = items[newIndex];
    if (newItem) {
      newItem.click();
    }
  }

  exportData() {
    return {
      currentPocket: this.currentPocket,
      selectedItemId: this.selectedItem ? this.selectedItem.itemId : null
    };
  }

  importData(data) {
    if (data.currentPocket) {
      this.currentPocket = data.currentPocket;
    }
  }

  // === 🧹 NETTOYAGE AVEC CLEANUP LANGUE ===

  destroy() {
    console.log('🧹 [InventoryUI] Destruction...');
    
    // Nettoyer le listener de langue
    if (this.cleanupLanguageListener && typeof this.cleanupLanguageListener === 'function') {
      console.log('🌐 [InventoryUI] Nettoyage listener langue...');
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    // Supprimer les événements globaux
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Supprimer l'overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Reset état
    this.overlay = null;
    this.isVisible = false;
    this.selectedItem = null;
    this.inventoryData = {};
    this._eventsAttached = false;
    this.optionsManager = null;
    
    console.log('✅ [InventoryUI] Détruit avec nettoyage langue');
  }
}
