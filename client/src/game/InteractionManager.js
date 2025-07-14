// client/src/game/InteractionManager.js - RÉÉCRITURE COMPLÈTE
// Aligné avec le système modulaire serveur BaseInteractionManager + NpcInteractionModule

export class InteractionManager {
  constructor(scene) {
    this.scene = scene;
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;

    // === CONFIGURATION ===
    this.config = {
      maxInteractionDistance: 64,
      interactionKey: 'E',
      cooldowns: {
        npc: 500,
        object: 200,
        environment: 1000,
        player: 2000
      },
      debugMode: true
    };

    // === ÉTAT LOCAL ===
    this.state = {
      lastInteractionTime: 0,
      lastInteractedNpc: null,
      isInteractionBlocked: false,
      currentCooldowns: new Map()
    };

    // === VALIDATION CACHE ===
    this.validationCache = new Map();
    this.cacheTimeout = 1000; // 1 seconde

    console.log(`🎯 [InteractionManager] Instance créée - Version serveur modulaire`);
  }

  // === 🚀 INITIALISATION ===

  initialize(networkManager, playerManager, npcManager) {
    console.log(`🚀 [InteractionManager] Initialisation...`);
    
    this.networkManager = networkManager;
    this.playerManager = playerManager;
    this.npcManager = npcManager;

    this.setupInputHandlers();
    this.setupNetworkHandlers();
    this.exposeDialogueAPI();

    console.log(`✅ [InteractionManager] Initialisé avec système modulaire`);
    return this;
  }

  // === 🎛️ GESTION INPUT ===

  setupInputHandlers() {
    this.scene.input.keyboard.on(`keydown-${this.config.interactionKey}`, () => {
      this.handleInteractionInput();
    });
    console.log(`⌨️ [InteractionManager] Input configuré (${this.config.interactionKey})`);
  }

  handleInteractionInput() {
    console.log(`🎮 [InteractionManager] === INTERACTION INPUT ===`);
    
    if (!this.canPlayerInteract()) {
      console.log(`🚫 [InteractionManager] Interaction bloquée`);
      return;
    }

    const targetNpc = this.findInteractionTarget();
    if (!targetNpc) {
      this.showMessage("Aucun NPC à proximité pour interagir", 'info');
      return;
    }

    console.log(`🎯 [InteractionManager] NPC trouvé: ${targetNpc.name} (${targetNpc.id})`);
    this.triggerInteraction(targetNpc);
  }

  findInteractionTarget() {
    if (!this.playerManager || !this.npcManager) return null;
    
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) return null;

    return this.npcManager.getClosestNpc(
      myPlayer.x,
      myPlayer.y,
      this.config.maxInteractionDistance
    );
  }

  triggerInteraction(npc) {
    console.log(`🚀 [InteractionManager] === DÉCLENCHEMENT INTERACTION ===`);
    console.log(`🎯 [InteractionManager] NPC: ${npc.name} (${npc.id})`);
    
    // Validation proximité locale avant envoi serveur
    if (!this.validateProximity(npc)) {
      this.showMessage("Trop loin du NPC", 'warning');
      return;
    }

    // Vérifier cooldown
    if (!this.validateCooldown('npc')) {
      return;
    }

    // Mettre à jour état local
    this.state.lastInteractionTime = Date.now();
    this.state.lastInteractedNpc = npc;
    this.updateCooldown('npc');
    
    if (this.npcManager) {
      this.npcManager.lastInteractedNpc = npc;
    }

    // Créer requête standardisée pour serveur modulaire
    const interactionRequest = this.createInteractionRequest(npc);
    
    try {
      // Envoyer au serveur via le système modulaire
      if (this.networkManager) {
        console.log(`📡 [InteractionManager] Envoi requête modulaire:`, interactionRequest);
        this.networkManager.sendNpcInteract(npc.id, interactionRequest);
      }
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur envoi:`, error);
      this.showMessage(`Erreur d'interaction: ${error.message}`, 'error');
    }
  }

  // === 📋 CRÉATION REQUÊTE MODULAIRE ===

  createInteractionRequest(npc) {
    const myPlayer = this.playerManager.getMyPlayer();
    
    return {
      type: 'npc',
      targetId: npc.id,
      position: {
        x: myPlayer.x,
        y: myPlayer.y,
        mapId: myPlayer.currentZone || this.scene.scene.key
      },
      data: {
        npcId: npc.id,
        playerPosition: { x: myPlayer.x, y: myPlayer.y },
        npcPosition: { x: npc.x, y: npc.y },
        interactionDistance: this.calculateDistance(myPlayer, npc),
        timestamp: Date.now()
      }
    };
  }

  // === 📡 NETWORK HANDLERS ===

  setupNetworkHandlers() {
    if (!this.networkManager) return;

    // Handler unifié pour résultats d'interaction modulaire
    this.networkManager.onMessage("npcInteractionResult", (data) => {
      console.log(`📥 [InteractionManager] === RÉSULTAT INTERACTION MODULAIRE ===`);
      console.log(`📊 [InteractionManager] Data:`, data);
      
      this.handleInteractionResult(data);
    });

    // Handlers spécialisés (conservés pour compatibilité)
    this.setupSpecializedHandlers();
    
    console.log(`📡 [InteractionManager] Network handlers configurés`);
  }

  setupSpecializedHandlers() {
    // Quest handlers
    this.networkManager.onMessage("questStartResult", (data) => {
      this.handleQuestResult(data);
    });

    this.networkManager.onMessage("questGranted", (data) => {
      this.handleQuestGranted(data);
    });

    this.networkManager.onMessage("questProgressUpdate", (data) => {
      this.handleQuestProgress(data);
    });

    // Starter handlers
    this.networkManager.onMessage("starterEligibility", (data) => {
      this.handleStarterEligibility(data);
    });

    this.networkManager.onMessage("starterReceived", (data) => {
      this.handleStarterReceived(data);
    });

    // Shop handlers (délégués au système shop)
    this.networkManager.onMessage("shopTransaction", (data) => {
      this.delegateToShopSystem(data);
    });
  }

  // === 🔄 TRAITEMENT RÉSULTATS ===

  handleInteractionResult(data) {
    console.log(`🔄 [InteractionManager] === TRAITEMENT RÉSULTAT ===`);
    console.log(`📊 [InteractionManager] Type: ${data.type}`);
    
    try {
      // Router selon le type de résultat du serveur modulaire
      switch (data.type) {
        case 'shop':
          this.handleShopResult(data);
          break;
          
        case 'questGiver':
          this.handleQuestGiverResult(data);
          break;
          
        case 'questComplete':
          this.handleQuestCompleteResult(data);
          break;
          
        case 'starterTable':
          this.handleStarterTableResult(data);
          break;
          
        case 'dialogue':
          this.handleDialogueResult(data);
          break;
          
        case 'heal':
          this.handleHealResult(data);
          break;
          
        case 'battleSpectate':
          this.handleBattleSpectateResult(data);
          break;
          
        case 'error':
          this.handleErrorResult(data);
          break;
          
        default:
          console.warn(`⚠️ [InteractionManager] Type non géré: ${data.type}`);
          this.handleFallbackResult(data);
      }
      
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur traitement:`, error);
      this.handleErrorResult({ message: `Erreur traitement: ${error.message}` });
    }
  }

  // === 🛒 RÉSULTATS SPÉCIALISÉS ===

  handleShopResult(data) {
    console.log(`🛒 [InteractionManager] Résultat shop:`, data);
    
    // Déléguer au système shop s'il existe
    if (this.scene.shopIntegration) {
      const shopSystem = this.scene.shopIntegration.getShopSystem();
      if (shopSystem && shopSystem.handleShopNpcInteraction) {
        shopSystem.handleShopNpcInteraction(data);
        return;
      }
    }
    
    // Fallback
    this.showMessage("Boutique temporairement indisponible", 'warning');
  }

  handleQuestGiverResult(data) {
    console.log(`📖 [InteractionManager] Résultat quest giver:`, data);
    
    // Déléguer au système quest s'il existe
    if (window.questSystem && window.questSystem.handleNpcInteraction) {
      const result = window.questSystem.handleNpcInteraction(data);
      if (result !== 'NO_QUEST') {
        return;
      }
    }
    
    // Fallback vers dialogue normal
    this.handleDialogueResult({
      message: data.message || "Ce PNJ a des quêtes mais le système n'est pas disponible.",
      lines: data.lines || ["Je peux vous aider mais le système n'est pas prêt."]
    });
  }

  handleQuestCompleteResult(data) {
    console.log(`🎉 [InteractionManager] Résultat quest complete:`, data);
    
    // Notification de succès
    this.showMessage(data.message || "Quête terminée !", 'success');
    
    // Déléguer au système quest pour mise à jour
    if (window.questSystem && window.questSystem.handleNpcInteraction) {
      window.questSystem.handleNpcInteraction(data);
    }
    
    // Afficher dialogue de récompense
    if (data.lines && data.lines.length > 0) {
      this.showDialogue(data);
    }
  }

  handleStarterTableResult(data) {
    console.log(`🎯 [InteractionManager] Résultat starter table:`, data);
    
    if (data.starterEligible) {
      // Déclencher sélection starter
      if (this.scene.showStarterSelection) {
        this.scene.showStarterSelection();
      } else {
        this.showMessage("Système starter non disponible", 'error');
      }
    } else {
      // Afficher raison d'inéligibilité
      this.handleDialogueResult({
        lines: data.lines || [data.message || "Starter non disponible"]
      });
    }
  }

  handleDialogueResult(data) {
    console.log(`💬 [InteractionManager] Résultat dialogue:`, data);
    
    if (typeof window.showNpcDialogue === 'function') {
      const dialogueData = this.formatDialogueData(data);
      window.showNpcDialogue(dialogueData);
    } else {
      // Fallback avec notification
      const message = data.message || (data.lines && data.lines[0]) || "Dialogue non disponible";
      this.showMessage(message, 'info');
    }
  }

  handleHealResult(data) {
    console.log(`💚 [InteractionManager] Résultat heal:`, data);
    
    // Effet visuel de soin (si disponible)
    if (this.scene.showHealEffect) {
      this.scene.showHealEffect();
    }
    
    // Dialogue de confirmation
    this.handleDialogueResult({
      lines: data.lines || [data.message || "Vos Pokémon sont soignés !"],
      npcName: data.npcName || "Infirmière"
    });
  }

  handleBattleSpectateResult(data) {
    console.log(`👁️ [InteractionManager] Résultat battle spectate:`, data);
    
    if (data.battleSpectate && data.battleSpectate.canWatch) {
      // Déléguer au système de spectateur
      if (this.scene.spectatorManager) {
        this.scene.spectatorManager.joinBattle(data.battleSpectate);
      } else {
        this.showMessage("Système spectateur non disponible", 'error');
      }
    } else {
      this.showMessage(data.message || "Impossible de regarder ce combat", 'warning');
    }
  }

  handleErrorResult(data) {
    console.log(`❌ [InteractionManager] Résultat erreur:`, data);
    
    const errorMessage = data.message || "Erreur d'interaction inconnue";
    this.showMessage(errorMessage, 'error');
  }

  handleFallbackResult(data) {
    console.log(`🔄 [InteractionManager] Résultat fallback:`, data);
    
    // Essayer d'afficher en dialogue par défaut
    if (data.message || data.lines) {
      this.handleDialogueResult(data);
    } else {
      this.showMessage("Interaction non reconnue", 'warning');
    }
  }

  // === 📖 HANDLERS QUEST SPÉCIALISÉS ===

  handleQuestResult(data) {
    console.log(`📖 [InteractionManager] Résultat quest:`, data);
    
    if (data.success) {
      this.showMessage(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      
      // Notifier le système quest
      if (window.questSystem && window.questSystem.handleQuestStartResult) {
        window.questSystem.handleQuestStartResult(data);
      }
    } else {
      this.showMessage(data.message || "Impossible de démarrer cette quête", 'error');
    }
  }

  handleQuestGranted(data) {
    console.log(`🎁 [InteractionManager] Quest accordée:`, data);
    
    this.showMessage(`Nouvelle quête : ${data.questName || 'Inconnue'} !`, 'success');
    
    // Notifier le système quest
    if (window.questSystem && window.questSystem.handleQuestGranted) {
      window.questSystem.handleQuestGranted(data);
    }
  }

  handleQuestProgress(data) {
    console.log(`📈 [InteractionManager] Progression quest:`, data);
    
    // Notifier le système quest
    if (window.questSystem && window.questSystem.handleQuestProgress) {
      window.questSystem.handleQuestProgress(data);
    }
    
    // Afficher progression si pertinente
    if (Array.isArray(data) && data.length > 0) {
      const firstResult = data[0];
      if (firstResult.objectiveCompleted) {
        this.showMessage(`Objectif complété : ${firstResult.objectiveName}`, 'success');
      } else if (firstResult.stepCompleted) {
        this.showMessage(`Étape terminée : ${firstResult.stepName}`, 'success');
      } else if (firstResult.questCompleted) {
        this.showMessage(`Quête terminée : ${firstResult.questName} !`, 'success');
      }
    }
  }

  // === 🎯 HANDLERS STARTER ===

  handleStarterEligibility(data) {
    console.log("📥 [InteractionManager] Éligibilité starter:", data);
    
    if (data.eligible) {
      console.log("✅ Joueur éligible - affichage starter");
      this.scene.showStarterSelection(data.availableStarters);
    } else {
      console.log("❌ Joueur non éligible:", data.reason);
      this.showMessage(data.message || "Starter non disponible", 'warning');
    }
  }

  handleStarterReceived(data) {
    console.log("📥 [InteractionManager] Starter reçu:", data);
    
    if (data.success) {
      const pokemonName = data.pokemon?.name || 'Pokémon';
      this.showMessage(`${pokemonName} ajouté à votre équipe !`, 'success');
    } else {
      this.showMessage(data.message || 'Erreur sélection', 'error');
    }
  }

  // === 🛒 DÉLÉGATION SHOP ===

  delegateToShopSystem(data) {
    console.log(`🛒 [InteractionManager] Délégation shop:`, data);
    
    if (this.scene.shopIntegration) {
      const shopSystem = this.scene.shopIntegration.getShopSystem();
      if (shopSystem && shopSystem.handleTransaction) {
        shopSystem.handleTransaction(data);
        return;
      }
    }
    
    if (window.shopSystem && window.shopSystem.handleTransaction) {
      window.shopSystem.handleTransaction(data);
      return;
    }
    
    console.warn(`⚠️ [InteractionManager] Système shop non trouvé`);
  }

  // === 🎭 DIALOGUES ===

  formatDialogueData(data) {
    let npcName = "PNJ";
    let portrait = "/assets/portrait/defaultPortrait.png";
    
    if (data.npcName) {
      npcName = data.npcName;
    } else if (this.state.lastInteractedNpc?.name) {
      npcName = this.state.lastInteractedNpc.name;
    }
    
    if (data.portrait) {
      portrait = data.portrait;
    } else if (this.state.lastInteractedNpc?.sprite) {
      portrait = `/assets/portrait/${this.state.lastInteractedNpc.sprite}Portrait.png`;
    }

    let lines = ["..."];
    if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      lines = data.lines;
    } else if (data.message) {
      lines = [data.message];
    }
    
    return {
      portrait,
      name: npcName,
      lines,
      text: data.text || null
    };
  }

  // === 🔐 VALIDATIONS ===

  canPlayerInteract() {
    const checks = {
      questDialogOpen: window._questDialogActive || false,
      chatOpen: typeof window.isChatFocused === "function" && window.isChatFocused(),
      inventoryOpen: window.inventorySystem?.isInventoryOpen() || false,
      shopOpen: this.isShopOpen(),
      dialogueOpen: this.isDialogueOpen(),
      interactionBlocked: this.state.isInteractionBlocked
    };
    
    const blocked = Object.entries(checks).filter(([key, value]) => value);
    if (blocked.length > 0) {
      console.log(`🚫 [InteractionManager] Interaction bloquée par:`, blocked.map(([key]) => key));
    }
    
    return !Object.values(checks).some(Boolean);
  }

  validateProximity(npc) {
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) return false;

    const distance = this.calculateDistance(myPlayer, npc);
    const isValid = distance <= this.config.maxInteractionDistance;
    
    if (!isValid) {
      console.log(`🚫 [InteractionManager] Trop loin: ${Math.round(distance)}px > ${this.config.maxInteractionDistance}px`);
    }
    
    return isValid;
  }

  validateCooldown(interactionType) {
    const cooldownDuration = this.config.cooldowns[interactionType] || 0;
    if (cooldownDuration === 0) return true;

    const lastTime = this.state.currentCooldowns.get(interactionType) || 0;
    const timeSince = Date.now() - lastTime;
    
    if (timeSince < cooldownDuration) {
      const remaining = Math.ceil((cooldownDuration - timeSince) / 1000);
      console.log(`🚫 [InteractionManager] Cooldown actif: ${remaining}s restantes`);
      return false;
    }
    
    return true;
  }

  updateCooldown(interactionType) {
    this.state.currentCooldowns.set(interactionType, Date.now());
  }

  calculateDistance(player, npc) {
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  isShopOpen() {
    if (this.scene.shopIntegration) {
      const shopSystem = this.scene.shopIntegration.getShopSystem();
      return shopSystem?.isShopOpen() || false;
    }
    return window.shopSystem?.isShopOpen() || false;
  }

  isDialogueOpen() {
    const dialogueBox = document.getElementById('dialogue-box');
    return dialogueBox && dialogueBox.style.display !== 'none';
  }

  // === 🎬 API PUBLIQUE ===

  exposeDialogueAPI() {
    // Namespace pour éviter pollution globale
    if (!window.DialogueAPI) {
      window.DialogueAPI = {};
    }

    window.DialogueAPI.createCustomDiscussion = (npcName, npcPortrait, text, options = {}) => {
      return this.createCustomDiscussion(npcName, npcPortrait, text, options);
    };

    window.DialogueAPI.createSequentialDiscussion = (npcName, npcPortrait, messages, options = {}) => {
      return this.createSequentialDiscussion(npcName, npcPortrait, messages, options);
    };

    // Compatibilité
    window.createCustomDiscussion = window.DialogueAPI.createCustomDiscussion;
    window.createSequentialDiscussion = window.DialogueAPI.createSequentialDiscussion;

    console.log(`✅ [InteractionManager] API Dialogue exposée`);
  }

  createCustomDiscussion(npcName, npcPortrait, text, options = {}) {
    if (typeof window.showNpcDialogue !== 'function') {
      console.error('❌ [InteractionManager] showNpcDialogue non disponible');
      return false;
    }
    
    let lines;
    if (Array.isArray(text)) {
      lines = text.filter(line => line && line.trim());
    } else if (typeof text === 'string' && text.trim()) {
      lines = [text.trim()];
    } else {
      lines = ["..."];
    }
    
    const dialogueData = {
      portrait: npcPortrait || "/assets/portrait/defaultPortrait.png",
      name: npcName || "PNJ",
      lines: lines,
      onClose: options.onClose || null,
      autoClose: options.autoClose || false,
      closeable: options.closeable !== false,
      hideName: options.hideName || false
    };
    
    try {
      window.showNpcDialogue(dialogueData);
      
      if (options.autoClose && typeof options.autoClose === 'number') {
        setTimeout(() => {
          const dialogueBox = document.getElementById('dialogue-box');
          if (dialogueBox && dialogueBox.style.display !== 'none') {
            dialogueBox.style.display = 'none';
            if (dialogueData.onClose) {
              dialogueData.onClose();
            }
          }
        }, options.autoClose);
      }
      
      return true;
    } catch (error) {
      console.error('❌ [InteractionManager] Erreur createCustomDiscussion:', error);
      return false;
    }
  }

  async createSequentialDiscussion(npcName, npcPortrait, messages, options = {}) {
    if (typeof window.showNpcDialogue !== 'function') {
      console.error('❌ [InteractionManager] showNpcDialogue non disponible');
      return false;
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.warn('⚠️ [InteractionManager] Messages invalides ou vides');
      return false;
    }
    
    const validMessages = messages.filter(msg => {
      if (typeof msg === "object" && msg !== null) {
        return !!msg.text;
      }
      return typeof msg === "string" && msg.trim();
    });

    if (validMessages.length === 0) {
      console.warn('⚠️ [InteractionManager] Aucun message valide');
      return false;
    }
    
    try {
      for (let i = 0; i < validMessages.length; i++) {
        const message = validMessages[i];
        
        let currentNpcName = npcName;
        let currentPortrait = npcPortrait;
        let messageText = "";
        let hideName = false;

        if (typeof message === "object" && message !== null) {
          currentNpcName = message.speaker || currentNpcName;
          currentPortrait = message.portrait || currentPortrait;
          messageText = message.text || "";
          hideName = !!message.hideName;
        } else {
          messageText = message;
        }

        const success = await this.showSingleMessageAndWait(
          currentNpcName, 
          currentPortrait, 
          messageText, 
          i + 1, 
          validMessages.length,
          { ...options, hideName }
        );

        if (!success) {
          console.error(`❌ [InteractionManager] Erreur message ${i + 1}`);
          break;
        }
      }
      
      if (options.onComplete) {
        try {
          options.onComplete();
        } catch (error) {
          console.error(`❌ [InteractionManager] Erreur callback onComplete:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ [InteractionManager] Erreur createSequentialDiscussion:', error);
      return false;
    }
  }

  showSingleMessageAndWait(npcName, portrait, message, currentIndex, totalCount, options = {}) {
    return new Promise((resolve) => {
      try {
        this.createCustomDiscussion(npcName, portrait, message, {
          autoClose: false,
          hideName: options.hideName
        });
        
        setTimeout(() => {
          const checkInterval = 100;
          const checkDialogueClose = () => {
            const dialogueBox = document.getElementById('dialogue-box');
            if (!dialogueBox || dialogueBox.style.display === 'none' || !dialogueBox.offsetParent) {
              resolve(true);
              return;
            }
            setTimeout(checkDialogueClose, checkInterval);
          };
          setTimeout(checkDialogueClose, 200);
        }, 100);
      } catch (error) {
        console.error(`❌ [InteractionManager] Erreur message ${currentIndex}:`, error);
        resolve(false);
      }
    });
  }

  // === 🔧 UTILITAIRES ===

  showMessage(message, type = 'info') {
    if (this.scene.showNotification) {
      this.scene.showNotification(message, type);
    } else if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [InteractionManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  showDialogue(data) {
    if (typeof window.showNpcDialogue === 'function') {
      const dialogueData = this.formatDialogueData(data);
      window.showNpcDialogue(dialogueData);
    }
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  blockInteractions(blocked = true, reason = "Interaction bloquée") {
    this.state.isInteractionBlocked = blocked;
    console.log(`🔒 [InteractionManager] Interactions ${blocked ? 'bloquées' : 'débloquées'}: ${reason}`);
  }

  // === 🧹 NETTOYAGE ===

  destroy() {
    // Nettoyer API globale
    if (window.DialogueAPI) {
      delete window.DialogueAPI;
    }
    if (window.createCustomDiscussion) {
      delete window.createCustomDiscussion;
    }
    if (window.createSequentialDiscussion) {
      delete window.createSequentialDiscussion;
    }

    // Nettoyer événements
    this.scene.input.keyboard.off(`keydown-${this.config.interactionKey}`);
    
    // Nettoyer cache
    this.validationCache.clear();
    this.state.currentCooldowns.clear();
    
    // Reset références
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.scene = null;

    console.log(`🧹 [InteractionManager] Nettoyé`);
  }

  // === 🐛 DEBUG ===

  getDebugInfo() {
    return {
      config: this.config,
      state: this.state,
      hasNetworkManager: !!this.networkManager,
      hasPlayerManager: !!this.playerManager,
      hasNpcManager: !!this.npcManager,
      currentCooldowns: Object.fromEntries(this.state.currentCooldowns),
      cacheSize: this.validationCache.size
    };
  }
}
