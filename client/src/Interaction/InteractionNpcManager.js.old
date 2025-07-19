// ============================================================================
// InteractionNpcManager.js - FIX DOUBLE DÉLÉGATION
// ============================================================================

export class InteractionNpcManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isProcessing = false;
    this.lastInteractionTime = 0;
    this.cooldownMs = 1000;
    
    console.log('🤖 [InteractionNpcManager] Initialisé avec bridge QuestManager');
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
    
    // ✅ FIX: DÉLÉGUER SEULEMENT aux Quest Givers, PAS aux autres
    if (this.isQuestGiver(npcData)) {
      console.log('🎯 [InteractionNpcManager] Quest Giver détecté - délégation QuestManager UNIQUEMENT');
      
      const questResult = this.delegateToQuestManager(npcData);
      
      if (questResult === 'BLOCKED') {
        console.log('🚫 [InteractionNpcManager] QuestManager bloqué - stop traitement');
        this.stopProcessing();
        return false;
      }
      
      if (questResult === 'QUESTS_SHOWN' || questResult === 'REQUESTING_QUESTS') {
        console.log('✅ [InteractionNpcManager] QuestManager gère - PAS d\'envoi serveur supplémentaire');
        this.stopProcessing(); // ✅ FIX: Arrêter ici, pas de double envoi
        return true;
      }
      
      // Si questResult === 'NO_QUEST', continuer le traitement normal
      console.log('ℹ️ [InteractionNpcManager] Pas de quête, traitement normal');
    }
    
    // ✅ FIX: Envoyer au serveur SEULEMENT si pas déjà géré par QuestManager
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
      }, 3000);
      
      return true;
    } else {
      console.error('❌ [InteractionNpcManager] Échec envoi interaction');
      this.stopProcessing();
      return false;
    }
  }
  
  // === ✅ DÉTECTION QUEST GIVER (inchangée) ===
  
  isQuestGiver(npcData) {
    if (!npcData) return false;
    
    const questIndicators = [
      npcData.type === 'questGiver',
      npcData.npcType === 'questGiver',
      npcData.isQuestGiver === true,
      npcData.hasQuests === true,
      npcData.questGiver === true,
      npcData.name && npcData.name.toLowerCase().includes('guide'),
      npcData.name && npcData.name.toLowerCase().includes('master'),
      npcData.name && npcData.name.toLowerCase().includes('elder'),
      npcData.sprite && npcData.sprite.includes('questgiver'),
      npcData.sprite && npcData.sprite.includes('quest')
    ];
    
    return questIndicators.some(indicator => indicator);
  }
  
  // === ✅ DÉLÉGATION QUESTMANAGER (inchangée) ===
  
  delegateToQuestManager(npcData) {
    console.log('🔗 [InteractionNpcManager] Délégation au QuestManager...');
    
    if (!window.questSystem?.manager) {
      console.warn('⚠️ [InteractionNpcManager] QuestManager non disponible - fallback normal');
      return 'NO_QUEST';
    }
    
    if (typeof window.questSystem.manager.handleNpcInteraction !== 'function') {
      console.warn('⚠️ [InteractionNpcManager] handleNpcInteraction non disponible - fallback');
      return 'NO_QUEST';
    }
    
    try {
      const questData = {
        ...npcData,
        type: 'questGiver',
        source: 'InteractionNpcManager',
        timestamp: Date.now()
      };
      
      console.log('📤 [InteractionNpcManager] Envoi données au QuestManager:', questData);
      
      const result = window.questSystem.manager.handleNpcInteraction(questData);
      
      console.log('📨 [InteractionNpcManager] Réponse QuestManager:', result);
      
      return result || 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [InteractionNpcManager] Erreur délégation QuestManager:', error);
      return 'NO_QUEST';
    }
  }
  
  // === ✅ FIX: TRAITEMENT DES RÉPONSES SERVEUR - Éviter redélégation ===
  
  handleServerResponse(responseData) {
    console.log('📨 [InteractionNpcManager] === RÉPONSE SERVEUR ===');
    console.log('📊 Type:', responseData.type);
    console.log('📊 Data:', responseData);
    
    this.stopProcessing();
    
    // ✅ FIX: NE PAS déléguer les réponses quest au QuestManager
    // Le QuestManager a ses propres handlers NetworkManager
    console.log('ℹ️ [InteractionNpcManager] Traitement réponse sans redélégation quest');
    
    // Traitement normal pour les autres types
    switch (responseData.type) {
      case 'shop':
        this.handleShop(responseData);
        break;
        
      case 'dialog':
        this.handleDialog(responseData);
        break;
        
      case 'trainer':
        this.handleTrainer(responseData);
        break;
        
      // ✅ FIX: Ne plus gérer questGiver ici - laissé au QuestManager
      case 'questGiver':
        console.log('ℹ️ [InteractionNpcManager] questGiver ignoré - géré par QuestManager');
        break;
        
      case 'questComplete':
        console.log('ℹ️ [InteractionNpcManager] questComplete ignoré - géré par QuestManager');
        break;
        
      default:
        console.warn('⚠️ [InteractionNpcManager] Type NPC non géré:', responseData.type);
        this.handleGenericNpc(responseData);
    }
  }
  
  // === ✅ SUPPRIMÉ: isQuestResponse et délégation quest ===
  
  // === GESTIONNAIRES SPÉCIALISÉS PAR TYPE NPC (simplifiés) ===
  
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
  
  // === UTILITAIRES (inchangés) ===
  
  canProcessInteraction() {
    const now = Date.now();
    
    if (this.isProcessing) {
      return false;
    }
    
    if (now - this.lastInteractionTime < this.cooldownMs) {
      return false;
    }
    
    if (window.questSystem?.manager?.canProcessInteraction) {
      if (!window.questSystem.manager.canProcessInteraction()) {
        console.log('🚫 [InteractionNpcManager] QuestManager bloqué');
        return false;
      }
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
  
  debugQuestManagerConnection() {
    const info = {
      questSystemExists: !!window.questSystem,
      questManagerExists: !!window.questSystem?.manager,
      hasHandleNpcInteraction: !!(window.questSystem?.manager?.handleNpcInteraction),
      hasCanProcessInteraction: !!(window.questSystem?.manager?.canProcessInteraction),
      questManagerState: window.questSystem?.manager?.getState?.() || null,
      questManagerReady: window.questSystem?.manager?.isReady?.() || false
    };
    
    console.log('🔍 [InteractionNpcManager] État connexion QuestManager:', info);
    return info;
  }
  
  getDebugInfo() {
    return {
      isProcessing: this.isProcessing,
      lastInteractionTime: this.lastInteractionTime,
      cooldownMs: this.cooldownMs,
      canProcessInteraction: this.canProcessInteraction(),
      questManagerConnection: this.debugQuestManagerConnection()
    };
  }
}
