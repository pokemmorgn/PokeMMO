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
