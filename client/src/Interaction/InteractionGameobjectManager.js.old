// ============================================================================
// InteractionNpcManager.js - Gère TOUTES les interactions avec les NPCs
// ============================================================================

export class InteractionNpcManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isProcessing = false;
    this.lastInteractionTime = 0;
    this.cooldownMs = 1000; // 1 seconde entre interactions
    
    console.log('🤖 [InteractionNpcManager] Initialisé');
  }
  
  // === POINT D'ENTRÉE UNIQUE POUR NPCs ===
  handleNpcInteraction(npcData) {
    console.log('🤖 [InteractionNpcManager] === INTERACTION NPC ===');
    console.log('📊 NPC:', npcData);
    
    // Protection anti-spam
    if (!this.canProcessInteraction()) {
      console.log('🚫 [InteractionNpcManager] Interaction bloquée (cooldown/processing)');
      return false;
    }
    
    this.startProcessing();
    
    // Envoyer au serveur via NetworkManager
    const success = this.networkManager.sendNpcInteraction(npcData.id || npcData.npcId, {
      npcName: npcData.name,
      npcType: npcData.type,
      playerPosition: this.getPlayerPosition()
    });
    
    if (success) {
      console.log('✅ [InteractionNpcManager] Interaction envoyée au serveur');
      
      // Programmer la fin du processing
      setTimeout(() => {
        this.stopProcessing();
      }, 3000); // 3 secondes max
      
      return true;
    } else {
      console.error('❌ [InteractionNpcManager] Échec envoi interaction');
      this.stopProcessing();
      return false;
    }
  }
  
  // === TRAITEMENT DES RÉPONSES DU SERVEUR ===
  handleServerResponse(responseData) {
    console.log('📨 [InteractionNpcManager] === RÉPONSE SERVEUR ===');
    console.log('📊 Type:', responseData.type);
    console.log('📊 Data:', responseData);
    
    this.stopProcessing();
    
    switch (responseData.type) {
      case 'questGiver':
        this.handleQuestGiver(responseData);
        break;
        
      case 'shop':
        this.handleShop(responseData);
        break;
        
      case 'dialog':
        this.handleDialog(responseData);
        break;
        
      case 'questComplete':
        this.handleQuestComplete(responseData);
        break;
        
      case 'trainer':
        this.handleTrainer(responseData);
        break;
        
      default:
        console.warn('⚠️ [InteractionNpcManager] Type NPC non géré:', responseData.type);
        this.handleGenericNpc(responseData);
    }
  }
  
  // === GESTIONNAIRES SPÉCIALISÉS PAR TYPE NPC ===
  
  handleQuestGiver(data) {
    console.log('🎯 [InteractionNpcManager] Quest Giver');
    
    if (data.availableQuests && data.availableQuests.length > 0) {
      // Déléguer au système de quêtes
      if (window.questSystem?.manager) {
        window.questSystem.manager.showQuestSelection(data.availableQuests);
      } else {
        console.warn('⚠️ Quest System non disponible');
      }
    } else if (data.message) {
      this.showNpcMessage(data);
    }
  }
  
  handleShop(data) {
    console.log('🏪 [InteractionNpcManager] Shop');
    
    if (window.shopSystem) {
      window.shopSystem.openShop(data.shopId, data.shopData);
    } else {
      console.warn('⚠️ Shop System non disponible');
    }
  }
  
  handleDialog(data) {
    console.log('💬 [InteractionNpcManager] Dialog');
    
    if (data.lines && data.lines.length > 0) {
      this.showDialogSequence(data);
    }
  }
  
  handleQuestComplete(data) {
    console.log('✅ [InteractionNpcManager] Quest Complete');
    
    if (window.questSystem?.manager) {
      window.questSystem.manager.handleQuestCompletion(data);
    }
  }
  
  handleTrainer(data) {
    console.log('⚔️ [InteractionNpcManager] Trainer');
    
    if (window.battleSystem) {
      window.battleSystem.startTrainerBattle(data);
    }
  }
  
  handleGenericNpc(data) {
    console.log('🗨️ [InteractionNpcManager] NPC Générique');
    
    if (data.message) {
      this.showNpcMessage(data);
    }
  }
  
  // === UTILITAIRES ===
  
  canProcessInteraction() {
    const now = Date.now();
    
    if (this.isProcessing) {
      return false;
    }
    
    if (now - this.lastInteractionTime < this.cooldownMs) {
      return false;
    }
    
    return true;
  }
  
  startProcessing() {
    this.isProcessing = true;
    this.lastInteractionTime = Date.now();
    console.log('🔄 [InteractionNpcManager] Processing démarré');
  }
  
  stopProcessing() {
    this.isProcessing = false;
    console.log('✅ [InteractionNpcManager] Processing terminé');
  }
  
  getPlayerPosition() {
    if (window.playerManager?.getPosition) {
      return window.playerManager.getPosition();
    }
    return { x: 0, y: 0 };
  }
  
  showNpcMessage(data) {
    if (typeof window.showNpcDialogue === 'function') {
      window.showNpcDialogue({
        name: data.npcName || 'NPC',
        portrait: data.portrait,
        lines: data.lines || [data.message]
      });
    } else {
      console.log(`💬 ${data.npcName}: ${data.message}`);
    }
  }
  
  showDialogSequence(data) {
    if (typeof window.createSequentialDiscussion === 'function') {
      window.createSequentialDiscussion(
        data.npcName,
        data.portrait,
        data.lines,
        data.options || {}
      );
    } else {
      this.showNpcMessage(data);
    }
  }
  
  getDebugInfo() {
    return {
      isProcessing: this.isProcessing,
      lastInteractionTime: this.lastInteractionTime,
      cooldownMs: this.cooldownMs,
      canProcessInteraction: this.canProcessInteraction()
    };
  }
}

// ============================================================================
// InteractionGameobjectManager.js - Gère TOUTES les interactions avec objets
// ============================================================================

export class InteractionGameobjectManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isProcessing = false;
    this.lastInteractionTime = 0;
    this.cooldownMs = 500; // Plus rapide pour les objets
    
    console.log('📦 [InteractionGameobjectManager] Initialisé');
  }
  
  // === POINT D'ENTRÉE UNIQUE POUR GAMEOBJECTS ===
  handleGameobjectInteraction(objectData) {
    console.log('📦 [InteractionGameobjectManager] === INTERACTION OBJET ===');
    console.log('📊 Objet:', objectData);
    
    // Protection anti-spam
    if (!this.canProcessInteraction()) {
      console.log('🚫 [InteractionGameobjectManager] Interaction bloquée');
      return false;
    }
    
    this.startProcessing();
    
    // Envoyer au serveur
    const success = this.networkManager.sendGameobjectInteraction(objectData.id, {
      objectType: objectData.type,
      objectName: objectData.name,
      playerPosition: this.getPlayerPosition()
    });
    
    if (success) {
      console.log('✅ [InteractionGameobjectManager] Interaction envoyée');
      
      setTimeout(() => {
        this.stopProcessing();
      }, 2000);
      
      return true;
    } else {
      console.error('❌ [InteractionGameobjectManager] Échec envoi');
      this.stopProcessing();
      return false;
    }
  }
  
  // === TRAITEMENT DES RÉPONSES DU SERVEUR ===
  handleServerResponse(responseData) {
    console.log('📨 [InteractionGameobjectManager] === RÉPONSE SERVEUR ===');
    console.log('📊 Type:', responseData.type);
    
    this.stopProcessing();
    
    switch (responseData.type) {
      case 'chest':
        this.handleChest(responseData);
        break;
        
      case 'door':
        this.handleDoor(responseData);
        break;
        
      case 'switch':
        this.handleSwitch(responseData);
        break;
        
      case 'collectible':
        this.handleCollectible(responseData);
        break;
        
      case 'teleporter':
        this.handleTeleporter(responseData);
        break;
        
      case 'sign':
        this.handleSign(responseData);
        break;
        
      default:
        console.warn('⚠️ [InteractionGameobjectManager] Type objet non géré:', responseData.type);
        this.handleGenericObject(responseData);
    }
  }
  
  // === GESTIONNAIRES SPÉCIALISÉS PAR TYPE OBJET ===
  
  handleChest(data) {
    console.log('📦 [InteractionGameobjectManager] Coffre');
    
    if (data.items && data.items.length > 0) {
      this.showLootDialog(data);
      
      // Ajouter à l'inventaire
      if (window.inventorySystem) {
        data.items.forEach(item => {
          window.inventorySystem.addItem(item.id, item.quantity);
        });
      }
    }
  }
  
  handleDoor(data) {
    console.log('🚪 [InteractionGameobjectManager] Porte');
    
    if (data.locked) {
      this.showMessage(`La porte est verrouillée.`);
    } else if (data.targetZone) {
      // Déclencher transition de zone
      if (window.transitionManager) {
        window.transitionManager.moveToZone(data.targetZone, data.spawnX, data.spawnY);
      }
    }
  }
  
  handleSwitch(data) {
    console.log('🔘 [InteractionGameobjectManager] Interrupteur');
    
    if (data.activated) {
      this.showMessage(`Interrupteur activé !`);
    } else {
      this.showMessage(`Interrupteur désactivé.`);
    }
    
    // Effet visuel/sonore
    this.playInteractionEffect('switch');
  }
  
  handleCollectible(data) {
    console.log('✨ [InteractionGameobjectManager] Collectible');
    
    if (data.item) {
      this.showMessage(`Vous avez trouvé : ${data.item.name} !`);
      
      if (window.inventorySystem) {
        window.inventorySystem.addItem(data.item.id, data.item.quantity || 1);
      }
      
      this.playInteractionEffect('collect');
    }
  }
  
  handleTeleporter(data) {
    console.log('🌀 [InteractionGameobjectManager] Téléporteur');
    
    if (data.targetZone) {
      this.showMessage(`Téléportation vers ${data.targetZone}...`);
      
      if (window.transitionManager) {
        window.transitionManager.moveToZone(data.targetZone, data.spawnX, data.spawnY);
      }
    }
  }
  
  handleSign(data) {
    console.log('📋 [InteractionGameobjectManager] Panneau');
    
    if (data.text) {
      this.showMessage(data.text, data.title || 'Panneau');
    }
  }
  
  handleGenericObject(data) {
    console.log('📦 [InteractionGameobjectManager] Objet générique');
    
    if (data.message) {
      this.showMessage(data.message);
    }
  }
  
  // === UTILITAIRES ===
  
  canProcessInteraction() {
    const now = Date.now();
    
    if (this.isProcessing) {
      return false;
    }
    
    if (now - this.lastInteractionTime < this.cooldownMs) {
      return false;
    }
    
    return true;
  }
  
  startProcessing() {
    this.isProcessing = true;
    this.lastInteractionTime = Date.now();
    console.log('🔄 [InteractionGameobjectManager] Processing démarré');
  }
  
  stopProcessing() {
    this.isProcessing = false;
    console.log('✅ [InteractionGameobjectManager] Processing terminé');
  }
  
  getPlayerPosition() {
    if (window.playerManager?.getPosition) {
      return window.playerManager.getPosition();
    }
    return { x: 0, y: 0 };
  }
  
  showMessage(message, title = 'Information') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'info', { duration: 3000 });
    } else {
      console.log(`📢 ${title}: ${message}`);
    }
  }
  
  showLootDialog(data) {
    if (typeof window.showLootDialog === 'function') {
      window.showLootDialog(data.items, data.chestName || 'Coffre');
    } else {
      const itemNames = data.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
      this.showMessage(`Trouvé : ${itemNames}`);
    }
  }
  
  playInteractionEffect(type) {
    if (window.audioManager) {
      switch (type) {
        case 'switch':
          window.audioManager.playSound('switch_click');
          break;
        case 'collect':
          window.audioManager.playSound('item_pickup');
          break;
      }
    }
  }
  
  getDebugInfo() {
    return {
      isProcessing: this.isProcessing,
      lastInteractionTime: this.lastInteractionTime,
      cooldownMs: this.cooldownMs,
      canProcessInteraction: this.canProcessInteraction()
    };
  }
}
