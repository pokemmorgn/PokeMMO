// ============================================================================
// InteractionNpcManager.js - AVEC BRIDGE VERS QUESTMANAGER
// 🔗 Délègue les quest givers au QuestManager pour éviter duplication
// ============================================================================

export class InteractionNpcManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isProcessing = false;
    this.lastInteractionTime = 0;
    this.cooldownMs = 1000; // 1 seconde entre interactions
    
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
    
    // ✅ NOUVEAU: Bridge vers QuestManager pour quest givers
    if (this.isQuestGiver(npcData)) {
      console.log('🎯 [InteractionNpcManager] Quest Giver détecté - délégation QuestManager');
      
      const questResult = this.delegateToQuestManager(npcData);
      
      if (questResult === 'BLOCKED') {
        console.log('🚫 [InteractionNpcManager] QuestManager bloqué - stop traitement');
        this.stopProcessing();
        return false;
      }
      
      if (questResult === 'QUESTS_SHOWN' || questResult === 'REQUESTING_QUESTS') {
        console.log('✅ [InteractionNpcManager] QuestManager gère - délégation réussie');
        // QuestManager prend le relais, mais on continue le processing normal
        // car le QuestManager va potentiellement envoyer sa propre requête
      }
      
      // Si questResult === 'NO_QUEST', on continue le traitement normal ci-dessous
    }
    
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
  
  // === ✅ NOUVEAU: DÉTECTION QUEST GIVER ===
  
  isQuestGiver(npcData) {
    if (!npcData) return false;
    
    // Vérifier différents indicateurs de quest giver
    const questIndicators = [
      npcData.type === 'questGiver',
      npcData.npcType === 'questGiver',
      npcData.isQuestGiver === true,
      npcData.hasQuests === true,
      npcData.questGiver === true,
      // Noms/patterns communs pour quest givers
      npcData.name && npcData.name.toLowerCase().includes('guide'),
      npcData.name && npcData.name.toLowerCase().includes('master'),
      npcData.name && npcData.name.toLowerCase().includes('elder'),
      // Sprite patterns
      npcData.sprite && npcData.sprite.includes('questgiver'),
      npcData.sprite && npcData.sprite.includes('quest')
    ];
    
    return questIndicators.some(indicator => indicator);
  }
  
  // === ✅ NOUVEAU: DÉLÉGATION QUESTMANAGER ===
  
  delegateToQuestManager(npcData) {
    console.log('🔗 [InteractionNpcManager] Délégation au QuestManager...');
    
    // Vérifier si le QuestManager est disponible
    if (!window.questSystem?.manager) {
      console.warn('⚠️ [InteractionNpcManager] QuestManager non disponible - fallback normal');
      return 'NO_QUEST';
    }
    
    if (typeof window.questSystem.manager.handleNpcInteraction !== 'function') {
      console.warn('⚠️ [InteractionNpcManager] handleNpcInteraction non disponible - fallback');
      return 'NO_QUEST';
    }
    
    try {
      // Préparer les données pour le QuestManager
      const questData = {
        ...npcData,
        type: 'questGiver', // Force le type pour que QuestManager le reconnaisse
        source: 'InteractionNpcManager',
        timestamp: Date.now()
      };
      
      console.log('📤 [InteractionNpcManager] Envoi données au QuestManager:', questData);
      
      // Déléguer au QuestManager
      const result = window.questSystem.manager.handleNpcInteraction(questData);
      
      console.log('📨 [InteractionNpcManager] Réponse QuestManager:', result);
      
      return result || 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [InteractionNpcManager] Erreur délégation QuestManager:', error);
      return 'NO_QUEST';
    }
  }
  
  // === TRAITEMENT DES RÉPONSES DU SERVEUR (MODIFIÉ) ===
  
  handleServerResponse(responseData) {
    console.log('📨 [InteractionNpcManager] === RÉPONSE SERVEUR ===');
    console.log('📊 Type:', responseData.type);
    console.log('📊 Data:', responseData);
    
    this.stopProcessing();
    
    // ✅ NOUVEAU: Déléguer les réponses quest au QuestManager en priorité
    if (this.isQuestResponse(responseData)) {
      console.log('🎯 [InteractionNpcManager] Réponse quest détectée - délégation QuestManager');
      
      if (window.questSystem?.manager?.handleServerResponse) {
        try {
          window.questSystem.manager.handleServerResponse(responseData);
          console.log('✅ [InteractionNpcManager] Réponse quest déléguée avec succès');
          return; // QuestManager gère tout
        } catch (error) {
          console.error('❌ [InteractionNpcManager] Erreur délégation réponse quest:', error);
          // Continuer avec le traitement normal en cas d'erreur
        }
      }
    }
    
    // Traitement normal pour les autres types
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
  
  // === ✅ NOUVEAU: DÉTECTION RÉPONSE QUEST ===
  
  isQuestResponse(responseData) {
    if (!responseData) return false;
    
    const questResponseIndicators = [
      responseData.type === 'questGiver',
      responseData.type === 'questComplete',
      responseData.type === 'quest',
      responseData.availableQuests && Array.isArray(responseData.availableQuests),
      responseData.questData !== undefined,
      responseData.questId !== undefined,
      responseData.questStarted === true,
      responseData.questCompleted === true
    ];
    
    return questResponseIndicators.some(indicator => indicator);
  }
  
  // === GESTIONNAIRES SPÉCIALISÉS PAR TYPE NPC ===
  
  handleQuestGiver(data) {
    console.log('🎯 [InteractionNpcManager] Quest Giver (fallback)');
    
    // ✅ Note: Normalement délégué au QuestManager, ceci est un fallback
    if (data.availableQuests && data.availableQuests.length > 0) {
      console.log('⚠️ [InteractionNpcManager] Fallback: tentative délégation tardive QuestManager');
      
      if (window.questSystem?.manager?.showQuestSelectionDialog) {
        try {
          window.questSystem.manager.showQuestSelectionDialog('Choisir une quête', data.availableQuests);
          return;
        } catch (error) {
          console.error('❌ [InteractionNpcManager] Fallback délégation échouée:', error);
        }
      }
      
      // Ultimate fallback - message simple
      this.showNpcMessage({
        npcName: data.npcName || 'Guide',
        message: `J'ai ${data.availableQuests.length} quête(s) pour vous, mais le système de quêtes n'est pas disponible.`
      });
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
    console.log('✅ [InteractionNpcManager] Quest Complete (fallback)');
    
    // ✅ Déléguer au QuestManager si possible
    if (window.questSystem?.manager?.handleQuestCompletion) {
      try {
        window.questSystem.manager.handleQuestCompletion(data);
        return;
      } catch (error) {
        console.error('❌ [InteractionNpcManager] Erreur délégation quest completion:', error);
      }
    }
    
    // Fallback
    this.showNpcMessage({
      npcName: data.npcName || 'NPC',
      message: data.message || 'Quête terminée !'
    });
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
    
    // ✅ NOUVEAU: Vérifier aussi l'état du QuestManager
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
  
  // === ✅ NOUVEAU: DEBUG QUESTMANAGER ===
  
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
