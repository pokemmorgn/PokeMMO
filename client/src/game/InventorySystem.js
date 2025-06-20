// client/src/game/InventorySystem.js

import { InventoryUI } from '../components/InventoryUI.js';
import { InventoryIcon } from '../components/InventoryIcon.js';

export class InventorySystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.inventoryUI = null;
    this.inventoryIcon = null;
    
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
    
    console.log("🎒 Système d'inventaire initialisé");
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

    // Mises à jour d'inventaire en temps réel
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.inventoryUI.handleInventoryUpdate(data);
      this.inventoryIcon.onInventoryUpdate(data);
    });

    // Résultat d'utilisation d'objet
    this.gameRoom.onMessage("itemUseResult", (data) => {
      this.inventoryUI.handleItemUseResult(data);
    });

    // Notification d'objet ramassé
    this.gameRoom.onMessage("itemPickup", (data) => {
      this.showPickupNotification(data);
    });

    // Erreurs d'inventaire
    this.gameRoom.onMessage("inventoryError", (data) => {
      this.inventoryUI.showNotification(data.message, "error");
    });
  }

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
          break;
        case 'm':
          e.preventDefault();
          this.openInventoryToPocket('medicine');
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
      // Écouter les événements de ramassage d'objets pour les quêtes
      this.gameRoom?.onMessage("inventoryUpdate", (data) => {
        if (data.type === 'add') {
          window.questSystem.triggerCollectEvent(data.itemId, data.quantity);
        }
      });
    }

    // Intégration avec le chat
    if (typeof window.isChatFocused === 'function') {
      // Désactiver l'inventaire quand le chat est actif
      setInterval(() => {
        const chatFocused = window.isChatFocused();
        this.inventoryIcon.setEnabled(!chatFocused);
      }, 1000);
    }
  }

  // === MÉTHODES PUBLIQUES ===

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

  // Utiliser un objet programmatiquement
  useItem(itemId, context = "field") {
    if (this.gameRoom) {
      this.gameRoom.send("useItem", {
        itemId: itemId,
        context: context
      });
    }
  }

  // Demander les données d'inventaire
  requestInventoryData() {
    if (this.gameRoom) {
      this.gameRoom.send("getInventory");
    }
  }

  // === NOTIFICATIONS ET EFFETS ===

  showPickupNotification(data) {
    const itemName = this.inventoryUI.getItemName(data.itemId);
    const message = `Ramassé: ${itemName} x${data.quantity}`;
    
    this.inventoryUI.showNotification(message, "success");
    this.inventoryIcon.showNewItemEffect();
  }

  showItemNotification(itemId, quantity, type = "add") {
    const itemName = this.inventoryUI.getItemName(itemId);
    const prefix = type === "add" ? "+" : "-";
    const message = `${prefix}${quantity} ${itemName}`;
    
    this.inventoryUI.showNotification(message, type === "add" ? "success" : "info");
  }

  // === INTÉGRATION AVEC LE JEU ===

  canPlayerInteract() {
    return this.inventoryUI.canPlayerInteract();
  }

  // Méthode appelée quand le joueur ramasse un objet dans le monde
  onItemPickup(itemId, quantity = 1) {
    this.showPickupNotification({ itemId, quantity });
    
    // Effet visuel sur l'icône
    this.inventoryIcon.showNewItemEffect();
    
    // Déclencher l'événement de quête si applicable
    if (window.questSystem) {
      window.questSystem.triggerCollectEvent(itemId, quantity);
    }
  }

  // Méthode appelée depuis les scenes Phaser pour vérifier si on peut ouvrir des menus
  canOpenMenus() {
    return !this.isInventoryOpen() && this.canPlayerInteract();
  }

  // === GESTION DES OBJETS SPÉCIAUX ===

  // Utilisation automatique d'objets (comme les Repel)
  useItemAutomatically(itemId) {
    this.useItem(itemId, "field");
    console.log(`🎒 Utilisation automatique: ${itemId}`);
  }

  // Vérifier si le joueur a un objet spécifique
  hasItem(itemId) {
    if (!this.inventoryUI.inventoryData) return false;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item && item.quantity > 0) return true;
    }
    return false;
  }

  // Obtenir la quantité d'un objet
  getItemCount(itemId) {
    if (!this.inventoryUI.inventoryData) return 0;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item) return item.quantity;
    }
    return 0;
  }

  // === MÉTHODES POUR LES COMBATS ===

  // Ouvrir l'inventaire en mode combat (uniquement objets utilisables)
  openBattleInventory() {
    // TODO: Implémenter une version combat de l'inventaire
    console.log("🎒 Mode combat de l'inventaire pas encore implémenté");
  }

  // Utiliser un objet en combat
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

  // Obtenir la liste des Poké Balls disponibles
  getAvailablePokeBalls() {
    const ballsData = this.inventoryUI.inventoryData.balls || [];
    return ballsData.filter(ball => ball.quantity > 0);
  }

  // Utiliser une Poké Ball (en combat)
  usePokeBall(ballId) {
    this.useBattleItem(ballId);
  }

  // === MÉTHODES POUR LES OBJETS DE SOIN ===

  // Obtenir la liste des objets de soin utilisables
  getHealingItems() {
    const medicineData = this.inventoryUI.inventoryData.medicine || [];
    return medicineData.filter(item => 
      item.quantity > 0 && 
      item.data && 
      (item.data.heal_amount || item.data.status_cure)
    );
  }

  // Utiliser automatiquement le meilleur objet de soin
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
        return item.itemId;
      }
    }

    // Si aucun objet parfait, utiliser le plus petit disponible
    if (sortedItems.length > 0) {
      this.useItem(sortedItems[0].itemId, "field");
      return sortedItems[0].itemId;
    }

    return null;
  }

  // === MÉTHODES POUR LES OBJETS CLÉS ===

  // Vérifier si le joueur a un objet clé spécifique
  hasKeyItem(keyItemId) {
    const keyItems = this.inventoryUI.inventoryData.key_items || [];
    return keyItems.some(item => item.itemId === keyItemId);
  }

  // Utiliser un objet clé (par exemple, une clé pour ouvrir une porte)
  useKeyItem(keyItemId) {
    if (this.hasKeyItem(keyItemId)) {
      this.useItem(keyItemId, "field");
      return true;
    }
    return false;
  }

  // === GESTION DES ÉVÉNEMENTS SPÉCIAUX ===

  // Déclencher un effet quand l'inventaire devient plein
  onInventoryFull(pocketName) {
    this.inventoryUI.showNotification(
      `Poche ${pocketName} pleine ! Impossible d'ajouter plus d'objets.`,
      "error"
    );
    
    // Effet visuel sur l'icône
    this.inventoryIcon.setTemporaryIcon('⚠️', 3000);
  }

  // Déclencher un effet quand un objet important est obtenu
  onImportantItemObtained(itemId) {
    const itemName = this.inventoryUI.getItemName(itemId);
    
    // Notification spéciale
    this.showSpecialNotification(`Objet important obtenu: ${itemName}!`);
    
    // Effet visuel marquant
    this.inventoryIcon.setTemporaryIcon('⭐', 5000);
  }

  showSpecialNotification(message) {
    // Créer une notification spéciale plus visible
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(45deg, #ffd700, #ffed4a);
      color: #000;
      padding: 20px 30px;
      border-radius: 15px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      z-index: 1003;
      box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
      animation: specialNotification 3s ease;
      border: 3px solid #fff;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Ajouter l'animation si elle n'existe pas
    if (!document.querySelector('#special-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'special-notification-styles';
      style.textContent = `
        @keyframes specialNotification {
          0% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.5); 
          }
          10% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1.1); 
          }
          20% { 
            transform: translate(-50%, -50%) scale(1); 
          }
          80% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
          }
          100% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.8); 
          }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}
