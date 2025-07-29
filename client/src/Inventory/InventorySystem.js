// client/src/game/InventorySystem.js - VERSION AVEC SUPPORT OPTIONSMANAGER
// 🎯 RESPONSABILITÉ: Logique métier inventaire SEULEMENT
// 🌐 MODIFICATION: Passe optionsManager à InventoryUI pour traductions temps réel

import { InventoryUI } from './InventoryUI.js';
import { InventoryIcon } from './InventoryIcon.js';

export class InventorySystem {
  constructor(scene, gameRoom, optionsManager = null) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;  // 🌐 NOUVEAU
    this.inventoryUI = null;
    this.inventoryIcon = null;
    
    // ✅ Référence au NotificationManager
    this.notificationManager = window.NotificationManager;
    
    console.log('🎒 [InventorySystem] Instance créée avec optionsManager:', !!optionsManager);
    
    this.init();
  }

  init() {
    console.log('🚀 [InventorySystem] Initialisation avec support traductions...');
    
    // 🌐 Créer l'interface d'inventaire avec optionsManager
    this.inventoryUI = new InventoryUI(this.gameRoom, this.optionsManager);
    
    // 🌐 Créer l'icône d'inventaire avec optionsManager
    this.inventoryIcon = new InventoryIcon(this.inventoryUI, this.optionsManager);
    
    // Configurer les interactions entre les composants
    this.setupInteractions();
    
    // Rendre le système accessible globalement
    window.inventorySystem = this;
    
    console.log("✅ [InventorySystem] Système d'inventaire initialisé avec traductions temps réel");
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

    // ✅ Mises à jour d'inventaire avec NotificationManager
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.inventoryUI.handleInventoryUpdate(data);
      this.inventoryIcon.onInventoryUpdate(data);
      
      // ✅ Notification via NotificationManager
      this.showInventoryNotification(data);
    });

    // ✅ Résultat d'utilisation d'objet
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

    // ✅ Notification d'objet ramassé
    this.gameRoom.onMessage("itemPickup", (data) => {
      this.showPickupNotification(data);
    });

    // ✅ Erreurs d'inventaire
    this.gameRoom.onMessage("inventoryError", (data) => {
      this.notificationManager.error(data.message, { duration: 4000 });
    });
  }

  // === 🌐 NOTIFICATIONS AVEC NOMS TRADUITS ===

  /**
   * Obtenir le nom traduit d'un objet
   */
  getTranslatedItemName(itemId) {
    // Utiliser le système de traduction d'InventoryUI si disponible
    if (this.inventoryUI && typeof this.inventoryUI.getItemName === 'function') {
      return this.inventoryUI.getItemName(itemId);
    }
    
    // Fallback: formatage simple
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ✅ Notifications d'inventaire intelligentes avec traductions
  showInventoryNotification(data) {
    const itemName = this.getTranslatedItemName(data.itemId);  // 🌐 NOM TRADUIT
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

  // ✅ Notification de ramassage avec nom traduit
  showPickupNotification(data) {
    const itemName = this.getTranslatedItemName(data.itemId);  // 🌐 NOM TRADUIT
    
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

  // ✅ Déterminer si un objet est important
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

  // ✅ Notification d'inventaire plein
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

  // ✅ Notification d'objet important obtenu
  onImportantItemObtained(itemId) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
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

  // === NOTIFICATIONS POUR DIFFÉRENTS TYPES D'OBJETS ===

  notifyItemCombined(item1, item2, result) {
    // 🌐 Traduire noms si possible
    const item1Name = this.getTranslatedItemName(item1);
    const item2Name = this.getTranslatedItemName(item2);
    const resultName = this.getTranslatedItemName(result);
    
    this.notificationManager.success(
      `${item1Name} + ${item2Name} = ${resultName}`,
      {
        duration: 4000,
        type: 'inventory'
      }
    );
  }

  notifyItemExpired(itemId) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
    this.notificationManager.warning(
      `${itemName} a expiré`,
      {
        duration: 4000,
        onClick: () => this.openInventory()
      }
    );
  }

  notifyLowItemCount(itemId, count) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
    this.notificationManager.warning(
      `Stock faible: ${itemName} (${count} restant)`,
      {
        duration: 3000,
        position: 'bottom-left'
      }
    );
  }

  notifyAutoUse(itemId, effect) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
    this.notificationManager.info(
      `${itemName} utilisé automatiquement: ${effect}`,
      {
        duration: 3000,
        type: 'inventory'
      }
    );
  }

  // === NOTIFICATIONS REPELS ET OBJETS SPÉCIAUX ===

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

  // === NOTIFICATIONS POKÉ BALLS ===

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

  // === NOTIFICATIONS OBJETS DE SOIN ===

  notifyHealingItemUsed(itemId, pokemonName, effect) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
    this.notificationManager.success(
      `${pokemonName} soigné avec ${itemName}: ${effect}`,
      {
        duration: 4000,
        type: 'inventory'
      }
    );
  }

  notifyStatusCured(pokemonName, status, itemId) {
    const itemName = this.getTranslatedItemName(itemId);  // 🌐 NOM TRADUIT
    
    this.notificationManager.success(
      `${pokemonName}: ${status} guéri avec ${itemName}`,
      {
        duration: 4000
      }
    );
  }

  // === RACCOURCIS CLAVIER ===

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
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
      // On récupère l'input du chat (à adapter selon ton code)
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

  // === API PUBLIQUE - LOGIQUE MÉTIER SEULEMENT ===

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

  onItemPickup(itemId, quantity = 1) {
    this.showPickupNotification({ itemId, quantity });
    
    // Effet visuel sur l'icône
    this.inventoryIcon.showNewItemEffect();
    
    // Déclencher l'événement de quête si applicable
    if (window.questSystem) {
      window.questSystem.triggerCollectEvent(itemId, quantity);
    }
  }

  // === LOGIQUE MÉTIER INVENTAIRE ===

  useItemAutomatically(itemId) {
    this.useItem(itemId, "field");
    
    // ✅ Notification d'utilisation automatique avec nom traduit
    const itemName = this.getTranslatedItemName(itemId);
    this.notifyAutoUse(itemId, "Utilisé automatiquement");
    
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
        
        // ✅ Notification d'auto-heal avec nom traduit
        const itemName = this.getTranslatedItemName(item.itemId);
        this.notifyAutoUse(
          item.itemId,
          `${healAmount === pokemonMaxHp ? 'Soin complet' : healAmount + ' PV'}`
        );
        
        return item.itemId;
      }
    }

    // Si aucun objet parfait, utiliser le plus petit disponible
    if (sortedItems.length > 0) {
      this.useItem(sortedItems[0].itemId, "field");
      
      const itemName = this.getTranslatedItemName(sortedItems[0].itemId);
      this.notifyAutoUse(sortedItems[0].itemId, "Meilleur soin disponible");
      
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
      
      // ✅ Notification d'utilisation d'objet clé avec nom traduit
      const itemName = this.getTranslatedItemName(keyItemId);
      this.notificationManager.info(
        `Objet clé utilisé: ${itemName}`,
        { duration: 4000 }
      );
      
      return true;
    } else {
      const itemName = this.getTranslatedItemName(keyItemId);
      this.notificationManager.error(
        `Objet clé manquant: ${itemName}`,
        { duration: 4000 }
      );
      return false;
    }
  }

  // === 🌐 MÉTHODE POUR INJECTER OPTIONSMANAGER APRÈS CRÉATION ===

  /**
   * Injecter optionsManager après création (pour compatibilité)
   */
  setOptionsManager(optionsManager) {
    console.log('🌐 [InventorySystem] Injection optionsManager...');
    
    this.optionsManager = optionsManager;
    
    // Mettre à jour InventoryUI
    if (this.inventoryUI) {
      this.inventoryUI.optionsManager = optionsManager;
      if (typeof this.inventoryUI.setupLanguageSupport === 'function') {
        this.inventoryUI.setupLanguageSupport();
        console.log('🔄 [InventorySystem] InventoryUI mis à jour avec optionsManager');
      }
    }
    
    // Mettre à jour InventoryIcon
    if (this.inventoryIcon) {
      this.inventoryIcon.optionsManager = optionsManager;
      if (typeof this.inventoryIcon.setupLanguageSupport === 'function') {
        this.inventoryIcon.setupLanguageSupport();
        console.log('🔄 [InventorySystem] InventoryIcon mis à jour avec optionsManager');
      }
    }
    
    console.log('✅ [InventorySystem] OptionsManager injecté dans tous les composants');
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('🧹 [InventorySystem] Destruction...');
    
    if (this.inventoryUI) {
      this.inventoryUI.destroy();
      this.inventoryUI = null;
    }
    
    if (this.inventoryIcon) {
      this.inventoryIcon.destroy();
      this.inventoryIcon = null;
    }
    
    this.gameRoom = null;
    this.scene = null;
    this.notificationManager = null;
    this.optionsManager = null;  // 🌐 NOUVEAU
    
    console.log('✅ [InventorySystem] Détruit avec nettoyage optionsManager');
  }
}
