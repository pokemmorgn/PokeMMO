// client/src/components/scene/InventoryComponent.js
// ✅ Composant responsable de l'inventaire

export class InventoryComponent {
  constructor(scene) {
    this.scene = scene;
    this.inventorySystem = null;
    this.inventoryInitialized = false;
    this.worldItems = null;
  }

  // === INITIALISATION ===
  async initialize(networkManager) {
    if (this.inventoryInitialized || !networkManager?.room) {
      console.log(`⚠️ Inventaire déjà initialisé ou pas de room`);
      return false;
    }

    try {
      console.log(`🎒 Initialisation du système d'inventaire...`);
      
      // Importer et créer le système d'inventaire
      const { InventorySystem } = await import('../../game/InventorySystem.js');
      this.inventorySystem = new InventorySystem(this.scene, networkManager.room);
      
      // Configurer la langue
      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }
      
      // Rendre accessible globalement
      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;
      
      // Setup des événements
      this.setupInventoryEventHandlers(networkManager.room);
      
      // Connecter l'inventaire standalone (rétrocompatibilité)
      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(networkManager.room);
      }
      
      this.inventoryInitialized = true;
      console.log(`✅ Système d'inventaire initialisé`);
      
      // Test automatique
      this.scene.time.delayedCall(2000, () => {
        this.testInventoryConnection();
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur initialisation inventaire:`, error);
      return false;
    }
  }

  // === ÉVÉNEMENTS SERVEUR ===
  setupInventoryEventHandlers(room) {
    console.log(`🎒 Configuration des événements d'inventaire...`);

    room.onMessage("inventoryData", (data) => {
      console.log(`🎒 Données d'inventaire reçues:`, data);
    });

    room.onMessage("inventoryUpdate", (data) => {
      console.log(`🔄 Mise à jour inventaire:`, data);
      
      if (data.type === 'add') {
        this.showNotification(`+${data.quantity} ${data.itemId}`, 'success');
      } else if (data.type === 'remove') {
        this.showNotification(`-${data.quantity} ${data.itemId}`, 'info');
      }
    });

    room.onMessage("itemPickup", (data) => {
      console.log(`🎁 Objet ramassé:`, data);
      this.showNotification(`Picked up: ${data.itemId} x${data.quantity}`, 'success');
      this.showPickupEffect(data);
    });

    room.onMessage("itemUseResult", (data) => {
      console.log(`🎯 Résultat utilisation objet:`, data);
      
      if (data.success) {
        this.showNotification(data.message || "Item used successfully", 'success');
      } else {
        this.showNotification(data.message || "Cannot use this item", 'error');
      }
    });

    room.onMessage("inventoryError", (data) => {
      console.error(`❌ Erreur inventaire:`, data);
      this.showNotification(data.message, 'error');
    });

    console.log(`✅ Événements d'inventaire configurés`);
  }

  // === OBJETS DANS LE MONDE ===
  createWorldItems() {
    console.log(`🎁 Création d'objets dans le monde...`);
    
    if (this.scene.scene.key !== 'BeachScene') {
      console.log(`⚠️ Objets de test uniquement sur BeachScene`);
      return;
    }

    const itemsToCreate = [
      { itemId: 'poke_ball', x: 150, y: 150, emoji: '⚪' },
      { itemId: 'potion', x: 200, y: 150, emoji: '💊' },
      { itemId: 'antidote', x: 250, y: 150, emoji: '🟢' },
      { itemId: 'great_ball', x: 300, y: 150, emoji: '🟡' }
    ];

    itemsToCreate.forEach(item => {
      this.createAdvancedWorldItem(item.itemId, item.x, item.y, item.emoji);
    });
  }

  createAdvancedWorldItem(itemId, x, y, emoji = '📦') {
    // Créer un conteneur pour l'objet
    const itemContainer = this.scene.add.container(x, y);
    
    // Fond de l'objet
    const background = this.scene.add.circle(0, 0, 12, 0x4a90e2);
    background.setStrokeStyle(2, 0xffffff);
    
    // Emoji de l'objet
    const itemEmoji = this.scene.add.text(0, 0, emoji, {
      fontSize: '16px',
      align: 'center'
    }).setOrigin(0.5);
    
    // Ajouter au conteneur
    itemContainer.add([background, itemEmoji]);
    itemContainer.setDepth(3);
    itemContainer.setInteractive(new Phaser.Geom.Circle(0, 0, 12), Phaser.Geom.Circle.Contains);
    
    // Animations
    this.scene.tweens.add({
      targets: itemContainer,
      y: y - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.scene.tweens.add({
      targets: itemEmoji,
      rotation: 0.2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Stocker les données
    itemContainer.itemData = { itemId, x, y };
    
    // Interaction
    itemContainer.on('pointerdown', () => {
      this.attemptPickupItem(itemContainer);
    });
    
    // Ajouter au groupe
    if (!this.worldItems) {
      this.worldItems = this.scene.add.group();
    }
    this.worldItems.add(itemContainer);
    
    console.log(`🎁 Objet avancé créé: ${itemId} à (${x}, ${y})`);
  }

  // === INTERACTIONS ===
  attemptPickupItem(itemContainer, myPlayer = null) {
    if (!myPlayer) {
      // Récupérer le joueur depuis le PlayerComponent
      if (this.scene.playerComponent) {
        myPlayer = this.scene.playerComponent.getMyPlayer();
      }
    }
    
    if (!myPlayer) {
      console.warn(`⚠️ Pas de joueur pour ramasser l'objet`);
      return;
    }

    // Vérifier la distance
    const distance = Phaser.Math.Distance.Between(
      myPlayer.x, myPlayer.y,
      itemContainer.x, itemContainer.y
    );
    
    if (distance > 50) {
      this.showNotification("Too far from item", 'warning');
      console.log(`🚫 Trop loin de l'objet: ${distance}px`);
      return;
    }

    // Animation de ramassage
    this.scene.tweens.add({
      targets: itemContainer,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        itemContainer.destroy();
      }
    });

    // Envoyer au serveur si réseau disponible
    if (this.scene.networkComponent?.networkManager?.room) {
      this.scene.networkComponent.networkManager.room.send("pickupItem", {
        itemId: itemContainer.itemData.itemId,
        quantity: 1,
        x: itemContainer.itemData.x,
        y: itemContainer.itemData.y
      });
    }

    // Effet visuel
    this.createAdvancedPickupEffect(itemContainer.x, itemContainer.y, itemContainer.itemData.itemId);
  }

  checkForNearbyItems(player) {
    if (!this.worldItems) return null;

    let closestItem = null;
    let closestDistance = Infinity;

    this.worldItems.children.entries.forEach(item => {
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        item.x, item.y
      );
      
      if (distance < 50 && distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });

    return closestItem;
  }

  // === EFFETS VISUELS ===
  showPickupEffect(data) {
    // Récupérer le joueur
    let myPlayer = null;
    if (this.scene.playerComponent) {
      myPlayer = this.scene.playerComponent.getMyPlayer();
    }
    
    if (!myPlayer) return;

    // Créer un effet de texte qui monte
    const effectText = this.scene.add.text(
      myPlayer.x,
      myPlayer.y - 20,
      `+${data.quantity} ${data.itemId}`,
      {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setDepth(1000);

    // Animation du texte
    this.scene.tweens.add({
      targets: effectText,
      y: myPlayer.y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        effectText.destroy();
      }
    });

    // Effet de particules simple
    this.createSimpleParticleEffect(myPlayer.x, myPlayer.y - 10);
  }

  createSimpleParticleEffect(x, y) {
    // Créer quelques cercles colorés qui disparaissent
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        3,
        0xffdd00
      ).setDepth(999);

      this.scene.tweens.add({
        targets: particle,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 800,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  createAdvancedPickupEffect(x, y, itemId) {
    // Texte principal
    const mainText = this.scene.add.text(x, y - 20, `+1 ${itemId}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(1000).setOrigin(0.5);

    // Animation du texte
    this.scene.tweens.add({
      targets: mainText,
      y: y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => mainText.destroy()
    });

    // Particules colorées
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.circle(
        x + Phaser.Math.Between(-15, 15),
        y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(2, 5),
        Phaser.Math.Between(0x00ff00, 0xffff00)
      ).setDepth(999);

      this.scene.tweens.add({
        targets: particle,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        y: particle.y - 30,
        duration: 1000,
        delay: i * 50,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Son de ramassage (si disponible)
    if (this.scene.sound.get('pickup')) {
      this.scene.sound.play('pickup', { volume: 0.3 });
    }
  }

  showNotification(message, type = 'info') {
    const notification = this.scene.add.text(
      this.scene.cameras.main.centerX,
      50,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : type === 'success' ? '#44ff44' : '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.scene.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }

  // === UTILITAIRES ===
  testInventoryConnection() {
    if (!this.inventorySystem || !this.scene.networkComponent?.networkManager?.room) {
      console.warn(`⚠️ Cannot test inventory: no system or room`);
      return;
    }

    console.log(`🧪 Test de connexion inventaire...`);
    
    // Demander les données d'inventaire
    this.inventorySystem.requestInventoryData();
    
    // Test d'ajout d'objet (pour le debug)
    if (this.scene.scene.key === 'BeachScene') {
      this.scene.time.delayedCall(3000, () => {
        console.log(`🧪 Test ajout d'objets de départ...`);
        const room = this.scene.networkComponent.networkManager.room;
        room.send("testAddItem", { itemId: "poke_ball", quantity: 3 });
        room.send("testAddItem", { itemId: "potion", quantity: 2 });
        room.send("testAddItem", { itemId: "town_map", quantity: 1 });
      });
    }
  }

  // === API PUBLIQUE ===
  toggleInventory() {
    if (this.inventorySystem) {
      this.inventorySystem.toggleInventory();
    }
  }

  useItem(itemId) {
    if (this.inventorySystem) {
      this.inventorySystem.useItem(itemId);
    }
  }

  hasItem(itemId) {
    if (this.inventorySystem) {
      return this.inventorySystem.hasItem(itemId);
    }
    return false;
  }

  isInventoryOpen() {
    return this.inventorySystem ? this.inventorySystem.isInventoryOpen() : false;
  }

  canPlayerInteract() {
    return this.inventorySystem ? this.inventorySystem.canPlayerInteract() : true;
  }

  // === GETTERS ===
  getInventoryStatus() {
    return {
      initialized: this.inventoryInitialized,
      system: !!this.inventorySystem,
      global: !!window.inventorySystem,
      canUse: this.inventoryInitialized && this.scene.networkComponent?.isNetworkReady()
    };
  }

  // === CLEANUP ===
  cleanup() {
    // Nettoyer les objets du monde
    if (this.worldItems) {
      this.worldItems.clear(true, true);
      this.worldItems = null;
    }

    // L'inventaire reste global et n'est pas nettoyé en transition
    this.inventoryInitialized = false;
  }

  destroy() {
    this.cleanup();
    
    if (this.inventorySystem && !window.inventorySystemGlobal) {
      this.inventorySystem.destroy();
    }
    
    this.inventorySystem = null;
  }
}
