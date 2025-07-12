// client/src/game/InventorySystem.js - Adaptations pour NotificationManager

import { InventoryUI } from './InventoryUI.js';
import { InventoryIcon } from './InventoryIcon.js';

export class InventorySystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.inventoryUI = null;
    this.inventoryIcon = null;
    
    // ✅ NOUVEAU: Référence au NotificationManager
    this.notificationManager = window.NotificationManager;
    
    this.init();
  }

  init() {
    // Créer l'interface d'inventaire
    this.inventoryUI = new InventoryUI(this.gameRoom);
    
    // Créer l'icône d'inventaire
    this.inventoryIcon = new InventoryIcon(this.inventoryUI);
    
    // Configurer les interactions entre les composants
    this.setupInteractions();
    
    // Rendre le système accessible globalement
    window.inventorySystem = this;
    
    console.log("🎒 Système d'inventaire initialisé avec NotificationManager");
  }

  setupInteractions() {
    // Écouter les événements du serveur pour l'inventaire
    this.setupServerListeners();
    
    // Configurer les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    // Intégrer avec les autres systèmes
    this.setupSystemIntegration();
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Données d'inventaire complètes
    this.gameRoom.onMessage("inventoryData", (data) => {
      this.inventoryUI.updateInventoryData(data);
    });

    // ✅ NOUVEAU: Mises à jour d'inventaire avec NotificationManager
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.inventoryUI.handleInventoryUpdate(data);
      this.inventoryIcon.onInventoryUpdate(data);
      
      // ✅ Notification via NotificationManager
      this.showInventoryNotification(data);
    });

    // ✅ NOUVEAU: Résultat d'utilisation d'objet
    this.gameRoom.onMessage("itemUseResult", (data) => {
      this.inventoryUI.handleItemUseResult(data);
      
      if (data.success) {
        this.notificationManager.inventory(
          data.message || "Objet utilisé avec succès",
          { duration: 3000 }
        );
      } else {
        this.notificationManager.error(
          data.message || "Impossible d'utiliser cet objet",
          { duration: 4000 }
        );
      }
    });

    // ✅ NOUVEAU: Notification d'objet ramassé
    this.gameRoom.onMessage("itemPickup", (data) => {
      this.showPickupNotification(data);
    });

    // ✅ NOUVEAU: Erreurs d'inventaire
    this.gameRoom.onMessage("inventoryError", (data) => {
      this.notificationManager.error(data.message, { duration: 4000 });
    });
  }

  // ✅ NOUVELLE MÉTHODE: Notifications d'inventaire intelligentes
  showInventoryNotification(data) {
    const itemName = this.inventoryUI.getItemName(data.itemId);
    const isAdd = data.type === "add";
    const isRemove = data.type === "remove";
    
    if (isAdd) {
      // ✅ Notification d'ajout d'objet
      this.notificationManager.itemNotification(
        itemName,
        data.quantity,
        'obtained',
        {
          duration: 3000,
          position: 'bottom-right',
          onClick: () => {
            // Ouvrir l'inventaire à la bonne poche
            this.openInventoryToPocket(data.pocket);
          }
        }
      );
      
      // ✅ Effet spécial pour les objets rares/importants
      if (this.isImportantItem(data.itemId)) {
        setTimeout(() => {
          this.notificationManager.achievement(
            `Objet rare obtenu: ${itemName}!`,
            {
              duration: 6000,
              bounce: true,
              sound: true
            }
          );
        }, 500);
      }
      
    } else if (isRemove) {
      // ✅ Notification de perte/utilisation d'objet (plus discrète)
      this.notificationManager.itemNotification(
        itemName,
        data.quantity,
        'used',
        {
          duration: 2000,
          position: 'bottom-right'
        }
      );
    }
  }

  // ✅ NOUVELLE MÉTHODE: Notification de ramassage
  showPickupNotification(data) {
    const itemName = this.inventoryUI.getItemName(data.itemId);
    
    this.notificationManager.itemNotification(
      itemName,
      data.quantity,
      'obtained',
      {
        duration: 3000,
        position: 'bottom-center',
        bounce: true,
        onClick: () => this.openInventory()
      }
    );
    
    // Effet visuel sur l'icône
    this.inventoryIcon.showNewItemEffect();
  }

  // ✅ NOUVELLE MÉTHODE: Déterminer si un objet est important
  isImportantItem(itemId) {
    const importantItems = [
      'master_ball',
      'town_map',
      'bike_voucher',
      'bicycle',
      'exp_share',
      'old_amber',
      'dome_fossil',
      'helix_fossil',
      'poke_flute',
      'silph_scope'
    ];
    return importantItems.includes(itemId);
  }

  // ✅ NOUVELLE MÉTHODE: Notification d'inventaire plein
  onInventoryFull(pocketName) {
    this.notificationManager.warning(
      `Poche ${pocketName} pleine ! Impossible d'ajouter plus d'objets.`,
      {
        duration: 5000,
        position: 'top-center',
        onClick: () => this.openInventoryToPocket(pocketName)
      }
    );
    
    // Effet visuel sur l'icône
    this.inventoryIcon.setTemporaryIcon('⚠️', 3000);
  }

  // ✅ NOUVELLE MÉTHODE: Notification d'objet important obtenu
  onImportantItemObtained(itemId) {
    const itemName = this.inventoryUI.getItemName(itemId);
    
    // ✅ Utiliser le système d'achievement
    this.notificationManager.achievement(
      `Objet important obtenu: ${itemName}!`,
      {
        duration: 8000,
        bounce: true,
        sound: true,
        persistent: false,
        onClick: () => this.openInventory()
      }
    );
    
    // Effet visuel marquant
    this.inventoryIcon.setTemporaryIcon('⭐', 5000);
  }

  // === NOUVELLES MÉTHODES POUR DIFFÉRENTS TYPES DE NOTIFICATIONS ===

  notifyItemCombined(item1, item2, result) {
    this.notificationManager.success(
      `${item1} + ${item2} = ${result}`,
      {
        duration: 4000,
        type: 'inventory'
      }
    );
  }

  notifyItemExpired(itemName) {
    this.notificationManager.warning(
      `${itemName} a expiré`,
      {
        duration: 4000,
        onClick: () => this.openInventory()
      }
    );
  }

  notifyLowItemCount(itemName, count) {
    this.notificationManager.warning(
      `Stock faible: ${itemName} (${count} restant)`,
      {
        duration: 3000,
        position: 'bottom-left'
      }
    );
  }

  notifyAutoUse(itemName, effect) {
    this.notificationManager.info(
      `${itemName} utilisé automatiquement: ${effect}`,
      {
        duration: 3000,
        type: 'inventory'
      }
    );
  }

  // === MÉTHODES POUR LES REPELS ET OBJETS SPÉCIAUX ===

  notifyRepelActivated(repelType, steps) {
    this.notificationManager.inventory(
      `${repelType} activé pour ${steps} pas`,
      {
        duration: 4000,
        position: 'top-center'
      }
    );
  }

  notifyRepelWearing() {
    this.notificationManager.warning(
      "L'effet du Repousse se dissipe...",
      {
        duration: 3000,
        position: 'top-center'
      }
    );
  }

  notifyRepelExpired() {
    this.notificationManager.error(
      "L'effet du Repousse a pris fin",
      {
        duration: 3000,
        position: 'top-center',
        onClick: () => this.openInventoryToPocket('items')
      }
    );
  }

  // === MÉTHODES POUR LES POKÉ BALLS ===

  notifyPokeBallUsed(ballType, result) {
    const messages = {
      success: `${ballType} : Pokémon capturé !`,
      failed: `${ballType} : Le Pokémon s'est échappé`,
      critical: `${ballType} : Capture critique !`
    };

    const types = {
      success: 'success',
      failed: 'warning',
      critical: 'achievement'
    };

    this.notificationManager.show(
      messages[result] || `${ballType} utilisé`,
      {
        type: types[result] || 'info',
        duration: result === 'critical' ? 6000 : 4000,
        bounce: result === 'critical',
        sound: result === 'success' || result === 'critical'
      }
    );
  }

  // === MÉTHODES POUR LES OBJETS DE SOIN ===

  notifyHealingItemUsed(itemName, pokemonName, effect) {
    this.notificationManager.success(
      `${pokemonName} soigné avec ${itemName}: ${effect}`,
      {
        duration: 4000,
        type: 'inventory'
      }
    );
  }

  notifyStatusCured(pokemonName, status, itemName) {
    this.notificationManager.success(
      `${pokemonName}: ${status} guéri avec ${itemName}`,
      {
        duration: 4000
      }
    );
  }

  // === MÉTHODES CONSERVÉES ET ADAPTÉES ===

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ne pas traiter les raccourcis si on ne peut pas interagir
      if (!this.canPlayerInteract()) return;

      switch (e.key.toLowerCase()) {
        case 'i':
          e.preventDefault();
          this.toggleInventory();
          break;
        case 'b':
          e.preventDefault();
          this.openInventoryToPocket('balls');
          // ✅ Notification de raccourci
          this.notificationManager.info(
            "Poche Poké Balls ouverte",
            { duration: 1500, position: 'bottom-center' }
          );
          break;
        case 'm':
          e.preventDefault();
          this.openInventoryToPocket('medicine');
          // ✅ Notification de raccourci
          this.notificationManager.info(
            "Poche Soins ouverte",
            { duration: 1500, position: 'bottom-center' }
          );
          break;
      }
    });

    // Raccourcis quand l'inventaire est ouvert
    document.addEventListener('keydown', (e) => {
      if (this.inventoryUI.isVisible) {
        const handled = this.inventoryUI.handleKeyPress(e.key);
        if (handled) {
          e.preventDefault();
        }
      }
    });
  }

setupSystemIntegration() {
  // Intégration avec le système de quêtes
  if (window.questSystem) {
    this.gameRoom?.onMessage("inventoryUpdate", (data) => {
      if (data.type === 'add') {
        window.questSystem.triggerCollectEvent(data.itemId, data.quantity);
      }
    });
  }

  // Intégration avec le chat
  if (typeof window.isChatFocused === 'function') {
    // On récupère l’input du chat (à adapter selon ton code)
    const chatInput = document.querySelector('#chat-input'); // Mets le bon sélecteur !
    if (chatInput) {
      chatInput.addEventListener('focus', () => {
        this.inventoryIcon.setEnabled(false);
      });
      chatInput.addEventListener('blur', () => {
        this.inventoryIcon.setEnabled(true);
      });
    }
  }
}


  // === MÉTHODES PUBLIQUES INCHANGÉES ===

  toggleInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  }

  openInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.show();
    }
  }

  closeInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.hide();
    }
  }

  openInventoryToPocket(pocketName) {
    if (this.inventoryUI) {
      this.inventoryUI.openToPocket(pocketName);
    }
  }

  isInventoryOpen() {
    return this.inventoryUI ? this.inventoryUI.isVisible : false;
  }

  useItem(itemId, context = "field") {
    if (this.gameRoom) {
      this.gameRoom.send("useItem", {
        itemId: itemId,
        context: context
      });
    }
  }

  requestInventoryData() {
    if (this.gameRoom) {
      this.gameRoom.send("getInventory");
    }
  }

  canPlayerInteract() {
    return this.inventoryUI.canPlayerInteract();
  }

  onItemPickup(itemId, quantity = 1) {
    this.showPickupNotification({ itemId, quantity });
    
    // Effet visuel sur l'icône
    this.inventoryIcon.showNewItemEffect();
    
    // Déclencher l'événement de quête si applicable
    if (window.questSystem) {
      window.questSystem.triggerCollectEvent(itemId, quantity);
    }
  }

  canOpenMenus() {
    return !this.isInventoryOpen() && this.canPlayerInteract();
  }

  // === MÉTHODES POUR L'UTILISATION AUTOMATIQUE ===

  useItemAutomatically(itemId) {
    this.useItem(itemId, "field");
    
    // ✅ Notification d'utilisation automatique
    const itemName = this.inventoryUI.getItemName(itemId);
    this.notifyAutoUse(itemName, "Utilisé automatiquement");
    
    console.log(`🎒 Utilisation automatique: ${itemId}`);
  }

  hasItem(itemId) {
    if (!this.inventoryUI.inventoryData) return false;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item && item.quantity > 0) return true;
    }
    return false;
  }

  getItemCount(itemId) {
    if (!this.inventoryUI.inventoryData) return 0;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item) return item.quantity;
    }
    return 0;
  }

  // === MÉTHODES POUR LES COMBATS ===

  openBattleInventory() {
    // TODO: Implémenter une version combat de l'inventaire
    this.notificationManager.info(
      "Mode combat de l'inventaire pas encore implémenté",
      { duration: 3000 }
    );
  }

  useBattleItem(itemId, targetPokemon = null) {
    if (this.gameRoom) {
      this.gameRoom.send("useBattleItem", {
        itemId: itemId,
        targetPokemon: targetPokemon,
        context: "battle"
      });
    }
  }

  // === MÉTHODES POUR LES POKÉ BALLS ===

  getAvailablePokeBalls() {
    const ballsData = this.inventoryUI.inventoryData.balls || [];
    return ballsData.filter(ball => ball.quantity > 0);
  }

  usePokeBall(ballId) {
    this.useBattleItem(ballId);
  }

  // === MÉTHODES POUR LES OBJETS DE SOIN ===

  getHealingItems() {
    const medicineData = this.inventoryUI.inventoryData.medicine || [];
    return medicineData.filter(item => 
      item.quantity > 0 && 
      item.data && 
      (item.data.heal_amount || item.data.status_cure)
    );
  }

  useAutoHeal(pokemonHp, pokemonMaxHp) {
    const healingItems = this.getHealingItems();
    
    // Trier par efficacité de soin
    const sortedItems = healingItems.sort((a, b) => {
      const healA = a.data.heal_amount === 'full' ? pokemonMaxHp : (a.data.heal_amount || 0);
      const healB = b.data.heal_amount === 'full' ? pokemonMaxHp : (b.data.heal_amount || 0);
      return healA - healB;
    });

    // Trouver le meilleur objet qui ne sur-soigne pas trop
    const missingHp = pokemonMaxHp - pokemonHp;
    for (const item of sortedItems) {
      const healAmount = item.data.heal_amount === 'full' ? pokemonMaxHp : item.data.heal_amount;
      if (healAmount >= missingHp) {
        this.useItem(item.itemId, "field");
        
        // ✅ Notification d'auto-heal
        this.notifyAutoUse(
          this.inventoryUI.getItemName(item.itemId),
          `${healAmount === pokemonMaxHp ? 'Soin complet' : healAmount + ' PV'}`
        );
        
        return item.itemId;
      }
    }

    // Si aucun objet parfait, utiliser le plus petit disponible
    if (sortedItems.length > 0) {
      this.useItem(sortedItems[0].itemId, "field");
      
      this.notifyAutoUse(
        this.inventoryUI.getItemName(sortedItems[0].itemId),
        "Meilleur soin disponible"
      );
      
      return sortedItems[0].itemId;
    }

    // ✅ Notification si aucun objet de soin
    this.notificationManager.warning(
      "Aucun objet de soin disponible",
      {
        duration: 3000,
        onClick: () => this.openInventoryToPocket('medicine')
      }
    );

    return null;
  }

  // === MÉTHODES POUR LES OBJETS CLÉS ===

  hasKeyItem(keyItemId) {
    const keyItems = this.inventoryUI.inventoryData.key_items || [];
    return keyItems.some(item => item.itemId === keyItemId);
  }

  useKeyItem(keyItemId) {
    if (this.hasKeyItem(keyItemId)) {
      this.useItem(keyItemId, "field");
      
      // ✅ Notification d'utilisation d'objet clé
      this.notificationManager.info(
        `Objet clé utilisé: ${this.inventoryUI.getItemName(keyItemId)}`,
        { duration: 4000 }
      );
      
      return true;
    } else {
      this.notificationManager.error(
        `Objet clé manquant: ${this.inventoryUI.getItemName(keyItemId)}`,
        { duration: 4000 }
      );
      return false;
    }
  }
}
