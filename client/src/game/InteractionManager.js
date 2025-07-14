// client/src/game/InteractionManager.js
// Gestionnaire unifié des interactions joueur-NPC avec système de dialogue avancé

export class InteractionManager {
  constructor(scene) {
    this.scene = scene;
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    this.questSystem = null;

    this.config = {
      maxInteractionDistance: 64,
      interactionKey: 'E',
      debugMode: false
    };

    this.interactionSystems = new Map();
    this.state = {
      lastInteractionTime: 0,
      lastInteractedNpc: null,
      isInteractionBlocked: false,
      currentInteractionType: null
    };

    this.shopHandlerActive = false;
    this.lastShopOpenTime = 0;

    console.log(`🎯 [${this.scene.scene.key}] InteractionManager créé`);
  }

  initialize(networkManager, playerManager, npcManager) {
    this.networkManager = networkManager;
    this.playerManager = playerManager;
    this.npcManager = npcManager;

    this.shopSystem = this.scene.shopIntegration?.getShopSystem() || window.shopSystem;
    this.questSystem = window.questSystem;

    this.registerInteractionSystems();
    this.setupInputHandlers();
    this.setupNetworkHandlers();
    this.exposeDialogueAPI();

    console.log(`✅ [${this.scene.scene.key}] InteractionManager initialisé`);
    return this;
  }

  // === EXPOSITION API DIALOGUE ===

  exposeDialogueAPI() {
    // Créer un namespace pour éviter la pollution globale
    if (!window.DialogueAPI) {
      window.DialogueAPI = {};
    }

    // Exposer les méthodes via le namespace
    window.DialogueAPI.createCustomDiscussion = (npcName, npcPortrait, text, options = {}) => {
      return this.createCustomDiscussion(npcName, npcPortrait, text, options);
    };

    window.DialogueAPI.createSequentialDiscussion = (npcName, npcPortrait, messages, options = {}) => {
      return this.createSequentialDiscussion(npcName, npcPortrait, messages, options);
    };

    // Compatibilité : exposer aussi directement pour l'instant
    window.createCustomDiscussion = window.DialogueAPI.createCustomDiscussion;
    window.createSequentialDiscussion = window.DialogueAPI.createSequentialDiscussion;

    console.log(`✅ [${this.scene.scene.key}] API Dialogue exposée via window.DialogueAPI`);
  }

  // === SYSTÈMES D'INTERACTION ===

  registerInteractionSystems() {

  this.registerSystem('starter', {
  priority: 0,
  canHandle: (npc) => npc?.properties?.startertable === true,
  handle: (npc, data) => this.handleStarterInteraction(npc, data),  // ✅ MODIFIÉ !
  validateState: () => true,
  description: "Table starter Pokémon"
});
    
    this.registerSystem('shop', {
      priority: 1,
      canHandle: (npc) => this.isNpcMerchant(npc),
      handle: (npc, data) => this.handleShopInteraction(npc, data),
      validateState: () => !this.isShopOpen(),
      description: "Système de boutique/marchand"
    });

    this.registerSystem('quest', {
      priority: 2,
      canHandle: (npc) => this.isNpcQuestGiver(npc),
      handle: (npc, data) => this.handleQuestInteraction(npc, data),
      validateState: () => !this.isQuestDialogOpen(),
      description: "Système de quêtes"
    });

    this.registerSystem('heal', {
      priority: 3,
      canHandle: (npc) => this.isNpcHealer(npc),
      handle: (npc, data) => this.handleHealInteraction(npc, data),
      validateState: () => true,
      description: "Système de soin Pokémon"
    });

    this.registerSystem('dialogue', {
      priority: 99,
      canHandle: (npc) => true,
      handle: (npc, data) => this.handleDialogueInteraction(npc, data),
      validateState: () => !this.isDialogueOpen(),
      description: "Système de dialogue générique"
    });
  }

  registerSystem(name, system) {
    if (!system.canHandle || !system.handle) {
      throw new Error(`Système ${name} invalide : manque canHandle ou handle`);
    }
    system.name = name;
    system.priority = system.priority || 50;
    system.validateState = system.validateState || (() => true);

    this.interactionSystems.set(name, system);
  }

  // === GESTION DES INPUTS ===

  setupInputHandlers() {
    this.scene.input.keyboard.on(`keydown-${this.config.interactionKey}`, () => {
      this.handleInteractionInput();
    });
  }

  handleInteractionInput() {
    if (!this.canPlayerInteract()) {
      return;
    }

    const targetNpc = this.findInteractionTarget();
    if (!targetNpc) {
      this.showMessage("Aucun NPC à proximité pour interagir", 'info');
      return;
    }

    const interactionType = this.determineInteractionType(targetNpc);
    if (!interactionType) {
      console.warn(`⚠️ [InteractionManager] Aucun système ne peut gérer le NPC ${targetNpc.name}`);
      return;
    }

    this.triggerInteraction(targetNpc, interactionType);
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

  determineInteractionType(npc) {
    const sortedSystems = Array.from(this.interactionSystems.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const system of sortedSystems) {
      try {
        if (system.canHandle(npc) && system.validateState()) {
          return system.name;
        }
      } catch (error) {
        console.error(`❌ [InteractionManager] Erreur système "${system.name}":`, error);
      }
    }
    return null;
  }

  triggerInteraction(npc, interactionType) {
    const system = this.interactionSystems.get(interactionType);
    if (!system) return;

    this.state.lastInteractionTime = Date.now();
    this.state.lastInteractedNpc = npc;
    this.state.currentInteractionType = interactionType;
    
    if (this.npcManager) {
      this.npcManager.lastInteractedNpc = npc;
    }

    try {
      if (this.networkManager) {
        this.networkManager.sendNpcInteract(npc.id);
      }
      
      if (interactionType === 'shop' && this.shopSystem) {
        system.handle(npc, null);
      }
    } catch (error) {
      this.showMessage(`Erreur d'interaction: ${error.message}`, 'error');
    }
  }

  // === GESTION RÉSEAU ===

  setupNetworkHandlers() {
    if (!this.networkManager) return;

    this.networkManager.onMessage("npcInteractionResult", (data) => {
      if (this.isShopInteraction(data)) {
        this.handleShopInteractionResult(data);
        return;
      }
      this.handleInteractionResult(data);
    });

   this.networkManager.onMessage("starterEligibility", (data) => {
  console.log("📥 Réponse éligibilité starter:", data);
  
  if (data.eligible) {
    console.log("✅ Joueur éligible - affichage starter");
    
    // ✅ FORCER LA RÉINITIALISATION AVANT AFFICHAGE
    if (this.scene.starterSelector && !this.scene.starterSelector.starterOptions) {
      this.scene.starterSelector.starterOptions = data.availableStarters || [];
    }
    
    // Utiliser les starters du serveur
    this.scene.showStarterSelection(data.availableStarters);
  } else {
    console.log("❌ Joueur non éligible:", data.reason);
    // ✅ LOG SIMPLE AU LIEU DE showMessage
    console.log(`❌ ${data.message || "Starter non disponible"}`);
  }
});
    this.networkManager.onMessage("starterReceived", (data) => {
    console.log("📥 Starter reçu:", data);
    
    if (data.success) {
      const pokemonName = data.pokemon?.name || 'Pokémon';
      this.showMessage(`${pokemonName} ajouté à votre équipe !`, 'success');
    } else {
      this.showMessage(data.message || 'Erreur sélection', 'error');
    }
  });
  }

  isShopInteraction(data) {
    return !!(
      data.type === "shop" ||
      data.shopId ||
      data.npcType === "merchant" ||
      (data.shopData && Object.keys(data.shopData).length > 0)
    );
  }

  handleShopInteractionResult(data) {
    const now = Date.now();
    if (this.shopHandlerActive || (now - this.lastShopOpenTime) < 1000) {
      return;
    }
    
    this.shopHandlerActive = true;
    this.lastShopOpenTime = now;
    
    try {
      if (this.shopSystem) {
        this.shopSystem.isOpeningShop = false;
        if (this.shopSystem.shopUI) {
          this.shopSystem.shopUI.isProcessingCatalog = false;
        }
      }
      
      this.handleShopInteraction(null, data);
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur shop interaction:`, error);
      this.showMessage(`Erreur boutique: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        this.shopHandlerActive = false;
      }, 2000);
    }
  }

  handleInteractionResult(data) {
    if (this.isShopInteraction(data)) return;
    if (window._questDialogActive) return;

    const systemName = this.mapResponseToSystem(data);
    const system = this.interactionSystems.get(systemName);
    const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
    
    if (system) {
      try {
        system.handle(npc, data);
      } catch (error) {
        this.handleFallbackInteraction(data);
      }
    } else {
      this.handleFallbackInteraction(data);
    }
  }

  mapResponseToSystem(data) {
    const typeMapping = {
      'shop': 'shop',
      'merchant': 'shop',
      'questGiver': 'quest',
      'questComplete': 'quest',
      'questProgress': 'quest',
      'heal': 'heal',
      'dialogue': 'dialogue',
      'starterTable': 'starter'
    };
    
    if (data.shopId || (data.npcType && data.npcType === "merchant")) return 'shop';
    if (data.type && typeMapping[data.type]) return typeMapping[data.type];
    return 'dialogue';
  }

  // === ÉTAT & BLOQUEURS ===

  canPlayerInteract() {
    const checks = {
      questDialogOpen: window._questDialogActive || false,
      chatOpen: typeof window.isChatFocused === "function" && window.isChatFocused(),
      inventoryOpen: window.inventorySystem?.isInventoryOpen() || false,
      shopOpen: this.isShopOpen(),
      dialogueOpen: this.isDialogueOpen(),
      interactionBlocked: this.state.isInteractionBlocked,
      shopHandlerActive: this.shopHandlerActive
    };
    
    return !Object.values(checks).some(Boolean);
  }

  isShopOpen() {
    return this.shopSystem?.isShopOpen() || false;
  }

  isQuestDialogOpen() {
    return window._questDialogActive || false;
  }

  isDialogueOpen() {
    const dialogueBox = document.getElementById('dialogue-box');
    return dialogueBox && dialogueBox.style.display !== 'none';
  }

  // === DÉTECTION TYPE NPC ===

  isNpcMerchant(npc) {
    if (!npc || !npc.properties) return false;
    
    const merchantProperties = ['npcType', 'shopId', 'shop', 'merchant', 'store'];
    for (const prop of merchantProperties) {
      const value = npc.properties[prop];
      if (value === 'merchant' || value === 'shop' || value === true ||
        (typeof value === 'string' && value.toLowerCase().includes('shop'))) {
        return true;
      }
    }
    
    if (npc.name && (
      npc.name.toLowerCase().includes('marchand') ||
      npc.name.toLowerCase().includes('merchant') ||
      npc.name.toLowerCase().includes('shop') ||
      npc.name.toLowerCase().includes('magasin')
    )) {
      return true;
    }
    
    return false;
  }

  isNpcQuestGiver(npc) {
    if (!npc || !npc.properties) return false;
    return !!(
      npc.properties.npcType === 'questGiver' ||
      npc.properties.questId ||
      npc.properties.quest ||
      npc.properties.hasQuest === true
    );
  }

  isNpcHealer(npc) {
    if (!npc || !npc.properties) return false;
    return !!(
      npc.properties.npcType === 'healer' ||
      npc.properties.heal === true ||
      npc.properties.pokemonCenter === true ||
      (npc.name && npc.name.toLowerCase().includes('infirmière'))
    );
  }

  // === INTERACTIONS SPÉCIFIQUES ===

  handleShopInteraction(npc, data) {
    this.shopSystem = this.shopSystem || (this.scene.shopIntegration?.getShopSystem()) || window.shopSystem;
    if (!this.shopSystem) {
      this.handleDialogueInteraction(npc, { message: "Ce marchand n'est pas disponible." });
      return;
    }

    if (data && data.type === 'dialogue' && !data.shopId) {
      this.handleDialogueInteraction(npc, data);
      return;
    }

    try {
      if (data && typeof data.npcName === "object" && data.npcName.name) {
        data.npcName = data.npcName.name;
      }

      this.shopSystem.handleShopNpcInteraction(data || this.createShopInteractionData(npc));
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur shop interaction:`, error);
      this.handleDialogueInteraction(npc, { 
        message: `Erreur boutique: ${error.message}`
      });
    }
  }

handleQuestInteraction(npc, data) {
  this.questSystem = this.questSystem || window.questSystem;
  if (!this.questSystem) {
    this.handleDialogueInteraction(npc, { message: "Système de quêtes non disponible" });
    return;
  }
  
  // ✅ CORRECTION : Le client ne fait QUE de l'affichage
  try {
    // ❌ LIGNE QUI PLANTE
    const result = this.questSystem.handleNpcInteraction(data || npc);
    
    // ✅ REMPLACEMENT TEMPORAIRE
    // Utiliser directement la méthode qui existe dans QuestSystem
    if (data && data.type === 'questGiver') {
      this.questSystem.showQuestGiverDialog(this.questSystem.parseNpcQuestData(data));
    } else {
      this.handleDialogueInteraction(npc, data);
    }
    
  } catch (error) {
    this.handleDialogueInteraction(npc, { message: `Erreur quête: ${error.message}` });
  }
}

  handleHealInteraction(npc, data) {
    const healData = data || {
      type: "heal",
      npcId: npc.id,
      npcName: npc.name,
      message: "Vos Pokémon sont soignés !",
      portrait: "assets/ui/heal_icon.png"
    };
    this.handleDialogueInteraction(npc, healData);
  }

  handleStarterInteraction(npc, data) {
  console.log("🎯 [InteractionManager] Handling starter interaction", data);
  
  // Déclencher le StarterSelector directement
  if (this.scene.showStarterSelection) {
    this.scene.showStarterSelection();
  } else {
    console.error("❌ showStarterSelection not available");
    this.showMessage("Système starter non disponible", 'error');
  }
}
  
  handleDialogueInteraction(npc, data) {
    if (typeof window.showNpcDialogue !== 'function') {
      this.showMessage("Système de dialogue non disponible", 'error');
      return;
    }
    
    const dialogueData = this.createDialogueData(npc, data);
    try {
      window.showNpcDialogue(dialogueData);
    } catch (error) {
      this.showMessage(`Erreur dialogue: ${error.message}`, 'error');
    }
  }

  handleFallbackInteraction(data) {
    this.handleDialogueInteraction(null, {
      message: data?.message || "Interaction non gérée"
    });
  }

  // === SYSTÈME DE DIALOGUE ===

  createDialogueData(npc, data) {
    let npcName = "PNJ";
    let portrait = "/assets/portrait/defaultPortrait.png";
    
    if (data?.name) {
      npcName = data.name;
    } else if (npc?.name) {
      npcName = npc.name;
    }
    
    if (data?.portrait) {
      portrait = data.portrait;
    } else if (npc?.sprite) {
      portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
    } else if (npc?.portrait) {
      portrait = npc.portrait;
    }

    let lines = ["..."];
    if (data?.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      lines = data.lines;
    } else if (data?.message) {
      lines = [data.message];
    } else if (npc?.defaultDialogue) {
      lines = [npc.defaultDialogue];
    }
    
    return {
      portrait,
      name: npcName,
      lines,
      text: data?.text || null
    };
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
  
  // Prend en compte objets OU strings
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
      const isLast = i === validMessages.length - 1;

      // Valeurs par défaut
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
        console.error(`❌ [InteractionManager] Erreur affichage message ${i + 1}`);
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
    const displayMessage = message;
    
    try {
      this.createCustomDiscussion(npcName, portrait, displayMessage, {
        autoClose: false,
        isNarrator: npcName === "Narrator",
        hideName: options.hideName // <-- ICI : transmet la valeur brute
      });
      
      setTimeout(() => {
        this.addVisualContinueIndicator(currentIndex, totalCount);
        if (npcName === "Narrator") {
          const dialogueBox = document.getElementById('dialogue-box');
          if (dialogueBox) {
            dialogueBox.setAttribute('data-speaker', 'Narrator');
          }
        }
      }, 100);
      
      const checkInterval = 100;
      const checkDialogueClose = () => {
        const dialogueBox = document.getElementById('dialogue-box');
        if (!dialogueBox || dialogueBox.style.display === 'none' || !dialogueBox.offsetParent) {
          this.removeVisualContinueIndicator();
          const dialogueBox = document.getElementById('dialogue-box');
          if (dialogueBox) {
            dialogueBox.removeAttribute('data-speaker');
          }
          resolve(true);
          return;
        }
        setTimeout(checkDialogueClose, checkInterval);
      };
      setTimeout(checkDialogueClose, 200);
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur message ${currentIndex}:`, error);
      resolve(false);
    }
  });
}

  // === INDICATEUR VISUEL ===

  addVisualContinueIndicator(currentIndex, totalCount) {
    const dialogueBox = document.getElementById('dialogue-box');
    if (!dialogueBox) return;
    
    // Supprimer l'ancien indicateur s'il existe
    this.removeVisualContinueIndicator();
    
    // Créer le conteneur de l'indicateur
    const indicator = document.createElement('div');
    indicator.className = 'dialogue-continue-indicator';
    indicator.id = 'dialogue-continue-indicator';
    
    // Marquer si c'est le dernier message
    const isLast = currentIndex === totalCount;
    if (isLast) {
      indicator.classList.add('last-message');
    }
    
    // Créer la flèche
    const arrow = document.createElement('div');
    arrow.className = 'dialogue-arrow';
    
    // Créer le compteur discret
    const counter = document.createElement('span');
    counter.className = 'dialogue-counter';
    counter.textContent = `${currentIndex}/${totalCount}`;
    
    // Assembler
    indicator.appendChild(counter);
    indicator.appendChild(arrow);
    
    // Ajouter au dialogue
    dialogueBox.appendChild(indicator);
  }

  removeVisualContinueIndicator() {
    const existingIndicator = document.getElementById('dialogue-continue-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }

  // === UTILITAIRES ===

  createShopInteractionData(npc) {
    const shopId = npc.properties?.shopId ||
      npc.properties?.shop ||
      npc.id ||
      'general_shop';
    
    return {
      type: "shop",
      npcId: npc.id,
      npcName: npc.name,
      npcType: "merchant",
      shopId: shopId,
      shopData: {
        shopInfo: {
          id: shopId,
          name: npc.name || "Marchand",
          description: "Articles pour dresseurs"
        },
        availableItems: [],
        playerGold: 0
      }
    };
  }

  findNpcById(npcId) {
    if (!this.npcManager || !npcId) return null;
    return this.npcManager.getNpcData(npcId);
  }

  showMessage(message, type = 'info') {
    if (this.scene.showNotification) {
      this.scene.showNotification(message, type);
    } else {
      console.log(`📢 [InteractionManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  blockInteractions(blocked = true, reason = "Interaction bloquée") {
    this.state.isInteractionBlocked = blocked;
  }

  destroy() {
    // Nettoyer l'API globale
    if (window.DialogueAPI) {
      delete window.DialogueAPI;
    }
    if (window.createCustomDiscussion) {
      delete window.createCustomDiscussion;
    }
    if (window.createSequentialDiscussion) {
      delete window.createSequentialDiscussion;
    }

    this.scene.input.keyboard.off(`keydown-${this.config.interactionKey}`);
    this.interactionSystems.clear();
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    this.questSystem = null;
    this.scene = null;
  }

  triggerStarter() {
    console.log("🎯 Déclenchement starter via InteractionManager");
    
    if (this.networkManager?.room) {
      this.networkManager.room.send("checkStarterEligibility");
    } else {
      this.showMessage("Connexion serveur requise", 'error');
    }
  }
}
