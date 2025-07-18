// client/src/game/InteractionManager.js
// ✅ VERSION COMPLÈTE AVEC LOGS DÉTAILLÉS POUR DEBUG

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
      debugMode: true // ✅ DEBUG activé
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

    // ✅ COMPTEURS DEBUG
    this.debugCounters = {
      inputEvents: 0,
      networkSends: 0,
      networkReceives: 0,
      questCalls: 0,
      shopCalls: 0,
      systemCalls: 0
    };

    // ✅ Protection existante
    this._lastInteractionResultTime = 0;
    this._interactionResultCooldown = 500;
    this._resultCallCount = 0;
    this.interactionProcessingMap = new Map();
    this.lastProcessedInteractionId = null;
    this.isCurrentlyProcessingInteraction = false;

    console.log(`[InteractionManager] === CONSTRUCTOR ===`);
    console.log(`[InteractionManager] Scene: ${this.scene.scene.key}`);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    console.trace(`[InteractionManager] Stack trace constructor:`);
  }

  initialize(networkManager, playerManager, npcManager) {
    console.log(`[InteractionManager] === INITIALIZE ===`);
    console.log(`[InteractionManager] NetworkManager: ${!!networkManager}`);
    console.log(`[InteractionManager] PlayerManager: ${!!playerManager}`);
    console.log(`[InteractionManager] NpcManager: ${!!npcManager}`);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    console.trace(`[InteractionManager] Stack trace initialize:`);

    this.networkManager = networkManager;
    this.playerManager = playerManager;
    this.npcManager = npcManager;

    this.shopSystem = this.scene.shopIntegration?.getShopSystem() || window.shopSystem;
    this.questSystem = window.questSystem;

    console.log(`[InteractionManager] ShopSystem trouvé: ${!!this.shopSystem}`);
    console.log(`[InteractionManager] QuestSystem trouvé: ${!!this.questSystem}`);

    this.registerInteractionSystems();
    this.setupInputHandlers();
    this.setupNetworkHandlers();
    this.exposeDialogueAPI();

    console.log(`[InteractionManager] === INITIALIZE TERMINÉ ===`);
    return this;
  }

  // === EXPOSITION API DIALOGUE ===

  exposeDialogueAPI() {
    console.log(`[InteractionManager] === EXPOSE DIALOGUE API ===`);
    
    if (!window.DialogueAPI) {
      window.DialogueAPI = {};
    }

    window.DialogueAPI.createCustomDiscussion = (npcName, npcPortrait, text, options = {}) => {
      return this.createCustomDiscussion(npcName, npcPortrait, text, options);
    };

    window.DialogueAPI.createSequentialDiscussion = (npcName, npcPortrait, messages, options = {}) => {
      return this.createSequentialDiscussion(npcName, npcPortrait, messages, options);
    };

    window.createCustomDiscussion = window.DialogueAPI.createCustomDiscussion;
    window.createSequentialDiscussion = window.DialogueAPI.createSequentialDiscussion;

    console.log(`[InteractionManager] API Dialogue exposée`);
  }

  // === SYSTÈMES D'INTERACTION ===

  registerInteractionSystems() {
    console.log(`[InteractionManager] === REGISTER INTERACTION SYSTEMS ===`);
    
    const systems = [
      {
        name: 'starter',
        priority: 0,
        canHandle: (npc) => npc?.properties?.startertable === true,
        handle: (npc, data) => this.handleStarterInteraction(npc, data),
        validateState: () => true,
        description: "Table starter Pokémon"
      },
      {
        name: 'shop',
        priority: 1,
        canHandle: (npc) => this.isNpcMerchant(npc),
        handle: (npc, data) => this.handleShopInteraction(npc, data),
        validateState: () => !this.isShopOpen(),
        description: "Système de boutique/marchand"
      },
      {
        name: 'quest',
        priority: 2,
        canHandle: (npc) => this.isNpcQuestGiver(npc),
        handle: (npc, data) => this.handleQuestInteraction(npc, data),
        validateState: () => !this.isQuestDialogOpen(),
        description: "Système de quêtes"
      },
      {
        name: 'heal',
        priority: 3,
        canHandle: (npc) => this.isNpcHealer(npc),
        handle: (npc, data) => this.handleHealInteraction(npc, data),
        validateState: () => true,
        description: "Système de soin Pokémon"
      },
      {
        name: 'dialogue',
        priority: 99,
        canHandle: (npc) => true,
        handle: (npc, data) => this.handleDialogueInteraction(npc, data),
        validateState: () => !this.isDialogueOpen(),
        description: "Système de dialogue générique"
      }
    ];

    systems.forEach(system => {
      this.registerSystem(system.name, system);
      console.log(`[InteractionManager] Système enregistré: ${system.name} (priorité: ${system.priority})`);
    });

    console.log(`[InteractionManager] ${systems.length} systèmes enregistrés`);
  }

  registerSystem(name, system) {
    console.log(`[InteractionManager] === REGISTER SYSTEM: ${name} ===`);
    
    if (!system.canHandle || !system.handle) {
      throw new Error(`Système ${name} invalide : manque canHandle ou handle`);
    }
    system.name = name;
    system.priority = system.priority || 50;
    system.validateState = system.validateState || (() => true);

    this.interactionSystems.set(name, system);
    console.log(`[InteractionManager] Système ${name} enregistré avec priorité ${system.priority}`);
  }

  // === GESTION DES INPUTS ===

  setupInputHandlers() {
    console.log(`[InteractionManager] === SETUP INPUT HANDLERS ===`);
    console.log(`[InteractionManager] Scene key: ${this.scene.scene.key}`);
    console.log(`[InteractionManager] Interaction key: ${this.config.interactionKey}`);

    // ✅ VÉRIFICATION AVANT NETTOYAGE
    const existingListenersBefore = this.scene.input.keyboard.listenerCount(`keydown-${this.config.interactionKey}`);
    console.log(`[InteractionManager] Listeners existants AVANT nettoyage: ${existingListenersBefore}`);

    // ✅ NETTOYAGE PRÉVENTIF
    this.scene.input.keyboard.removeAllListeners(`keydown-${this.config.interactionKey}`);
    
    const existingListenersAfter = this.scene.input.keyboard.listenerCount(`keydown-${this.config.interactionKey}`);
    console.log(`[InteractionManager] Listeners APRÈS nettoyage: ${existingListenersAfter}`);
    
    // ✅ AJOUT LISTENER AVEC DEBUG
    this.scene.input.keyboard.on(`keydown-${this.config.interactionKey}`, () => {
      this.debugCounters.inputEvents++;
      console.log(`[InteractionManager] === INPUT E DÉTECTÉ #${this.debugCounters.inputEvents} ===`);
      console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
      console.log(`[InteractionManager] Scene active: ${this.scene.scene.isActive()}`);
      console.log(`[InteractionManager] Scene key: ${this.scene.scene.key}`);
      console.trace(`[InteractionManager] Stack trace input E:`);
      
      this.handleInteractionInput();
    });
    
    // ✅ VÉRIFICATION APRÈS AJOUT
    const finalListeners = this.scene.input.keyboard.listenerCount(`keydown-${this.config.interactionKey}`);
    console.log(`[InteractionManager] Listeners APRÈS ajout: ${finalListeners}`);
    
    if (finalListeners > 1) {
      console.warn(`[InteractionManager] ⚠️ MULTIPLE LISTENERS DÉTECTÉS: ${finalListeners}`);
      console.trace(`[InteractionManager] Stack trace multiple listeners:`);
    }
  }

  handleInteractionInput() {
    console.log(`[InteractionManager] === HANDLE INTERACTION INPUT ===`);
    console.log(`[InteractionManager] Input event #${this.debugCounters.inputEvents}`);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    
    // ✅ PROTECTION ANTI-SPAM
    const now = Date.now();
    if (this.state.lastInteractionTime && (now - this.state.lastInteractionTime) < 500) {
      console.log(`[InteractionManager] 🚫 Input bloqué (anti-spam ${now - this.state.lastInteractionTime}ms)`);
      return;
    }

    console.log(`[InteractionManager] Vérification canPlayerInteract...`);
    if (!this.canPlayerInteract()) {
      console.log(`[InteractionManager] 🚫 Joueur ne peut pas interagir`);
      return;
    }

    console.log(`[InteractionManager] Recherche target NPC...`);
    const targetNpc = this.findInteractionTarget();
    if (!targetNpc) {
      console.log(`[InteractionManager] 🚫 Aucun NPC à proximité`);
      this.showMessage("Aucun NPC à proximité pour interagir", 'info');
      return;
    }

    console.log(`[InteractionManager] NPC trouvé: ${targetNpc.name} (ID: ${targetNpc.id})`);
    console.log(`[InteractionManager] Position NPC: (${targetNpc.x}, ${targetNpc.y})`);

    console.log(`[InteractionManager] Détermination type d'interaction...`);
    const interactionType = this.determineInteractionType(targetNpc);
    if (!interactionType) {
      console.warn(`[InteractionManager] ⚠️ Aucun système ne peut gérer le NPC ${targetNpc.name}`);
      return;
    }

    console.log(`[InteractionManager] Type d'interaction déterminé: ${interactionType}`);
    
    this.state.lastInteractionTime = now;
    this.triggerInteraction(targetNpc, interactionType);
  }

  findInteractionTarget() {
    console.log(`[InteractionManager] === FIND INTERACTION TARGET ===`);
    
    if (!this.playerManager || !this.npcManager) {
      console.log(`[InteractionManager] 🚫 PlayerManager: ${!!this.playerManager}, NpcManager: ${!!this.npcManager}`);
      return null;
    }
    
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) {
      console.log(`[InteractionManager] 🚫 Aucun joueur trouvé`);
      return null;
    }

    console.log(`[InteractionManager] Position joueur: (${myPlayer.x}, ${myPlayer.y})`);
    console.log(`[InteractionManager] Distance max: ${this.config.maxInteractionDistance}`);

    const closestNpc = this.npcManager.getClosestNpc(
      myPlayer.x,
      myPlayer.y,
      this.config.maxInteractionDistance
    );

    if (closestNpc) {
      console.log(`[InteractionManager] NPC le plus proche: ${closestNpc.name} (ID: ${closestNpc.id})`);
    } else {
      console.log(`[InteractionManager] Aucun NPC dans la portée`);
    }

    return closestNpc;
  }

  determineInteractionType(npc) {
    console.log(`[InteractionManager] === DETERMINE INTERACTION TYPE ===`);
    console.log(`[InteractionManager] NPC: ${npc.name} (ID: ${npc.id})`);
    console.log(`[InteractionManager] Propriétés NPC:`, npc.properties);

    const sortedSystems = Array.from(this.interactionSystems.values())
      .sort((a, b) => a.priority - b.priority);
    
    console.log(`[InteractionManager] Systèmes à tester: ${sortedSystems.map(s => `${s.name}(${s.priority})`).join(', ')}`);

    for (const system of sortedSystems) {
      try {
        console.log(`[InteractionManager] Test système: ${system.name}`);
        const canHandle = system.canHandle(npc);
        const stateValid = system.validateState();
        
        console.log(`[InteractionManager] ${system.name} - canHandle: ${canHandle}, stateValid: ${stateValid}`);
        
        if (canHandle && stateValid) {
          console.log(`[InteractionManager] ✅ Système sélectionné: ${system.name}`);
          return system.name;
        }
      } catch (error) {
        console.error(`[InteractionManager] ❌ Erreur système "${system.name}":`, error);
      }
    }
    
    console.log(`[InteractionManager] 🚫 Aucun système compatible trouvé`);
    return null;
  }

  triggerInteraction(npc, interactionType) {
    console.log(`[InteractionManager] === TRIGGER INTERACTION ===`);
    console.log(`[InteractionManager] NPC: ${npc.name} (ID: ${npc.id})`);
    console.log(`[InteractionManager] Type: ${interactionType}`);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    console.trace(`[InteractionManager] Stack trace trigger interaction:`);

    const system = this.interactionSystems.get(interactionType);
    if (!system) {
      console.error(`[InteractionManager] ❌ Système ${interactionType} non trouvé`);
      return;
    }

    this.state.lastInteractedNpc = npc;
    this.state.currentInteractionType = interactionType;
    
    if (this.npcManager) {
      this.npcManager.lastInteractedNpc = npc;
    }

    try {
      if (this.networkManager) {
        this.debugCounters.networkSends++;
        console.log(`[InteractionManager] === ENVOI RÉSEAU #${this.debugCounters.networkSends} ===`);
        console.log(`[InteractionManager] NPC ID: ${npc.id}`);
        console.log(`[InteractionManager] NetworkManager présent: ${!!this.networkManager}`);
        console.log(`[InteractionManager] Room présente: ${!!this.networkManager.room}`);
        console.log(`[InteractionManager] Room connectée: ${!!this.networkManager.room?.connection?.isOpen}`);
        console.trace(`[InteractionManager] Stack trace envoi réseau:`);
        
        this.networkManager.sendNpcInteract(npc.id);
        
        console.log(`[InteractionManager] ✅ Message envoyé au serveur`);
      } else {
        console.warn(`[InteractionManager] ⚠️ Pas de NetworkManager`);
      }
      
      if (interactionType === 'shop' && this.shopSystem) {
        console.log(`[InteractionManager] Appel système shop en parallèle`);
        system.handle(npc, null);
      }
    } catch (error) {
      console.error(`[InteractionManager] ❌ Erreur trigger:`, error);
      console.trace(`[InteractionManager] Stack trace erreur trigger:`);
      this.showMessage(`Erreur d'interaction: ${error.message}`, 'error');
    }
  }

  // === GESTION RÉSEAU AVEC LOGS DÉTAILLÉS ===

  setupNetworkHandlers() {
    if (!this.networkManager) {
      console.warn(`[InteractionManager] ⚠️ Pas de NetworkManager pour setup handlers`);
      return;
    }

    console.log(`[InteractionManager] === SETUP NETWORK HANDLERS ===`);
    console.log(`[InteractionManager] Scene: ${this.scene.scene.key}`);
    console.log(`[InteractionManager] NetworkManager: ${!!this.networkManager}`);
    console.log(`[InteractionManager] Room: ${!!this.networkManager.room}`);

    // ✅ VÉRIFICATION HANDLERS EXISTANTS
    if (this.networkManager.room && this.networkManager.room._messageHandlers) {
      const existingHandlers = this.networkManager.room._messageHandlers.get("npcInteractionResult");
      console.log(`[InteractionManager] Handlers existants pour npcInteractionResult: ${existingHandlers?.length || 0}`);
      
      if (existingHandlers && existingHandlers.length > 0) {
        console.warn(`[InteractionManager] ⚠️ HANDLERS DÉJÀ PRÉSENTS: ${existingHandlers.length}`);
        console.trace(`[InteractionManager] Stack trace handlers existants:`);
      }
    }

    this.networkManager.onMessage("npcInteractionResult", (data) => {
      this.debugCounters.networkReceives++;
      console.log(`[InteractionManager] === MESSAGE RÉSEAU REÇU #${this.debugCounters.networkReceives} ===`);
      console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
      console.log(`[InteractionManager] NPC ID: ${data.npcId || 'unknown'}`);
      console.log(`[InteractionManager] Type: ${data.type || 'unknown'}`);
      console.log(`[InteractionManager] Message hash: ${this.hashMessage(data.message || '')}`);
      console.log(`[InteractionManager] Data complète:`, data);
      console.trace(`[InteractionManager] Stack trace message réseau:`);
      
      // ✅ Vérifier combien de handlers ont été appelés
      const now = Date.now();
      if (!this.lastNetworkReceiveTime) {
        this.lastNetworkReceiveTime = now;
        this.sameNetworkReceiveCount = 1;
      } else if (now - this.lastNetworkReceiveTime < 100) {
        this.sameNetworkReceiveCount++;
        console.warn(`[InteractionManager] ⚠️ RÉCEPTION MULTIPLE #${this.sameNetworkReceiveCount} en ${now - this.lastNetworkReceiveTime}ms`);
      } else {
        this.lastNetworkReceiveTime = now;
        this.sameNetworkReceiveCount = 1;
      }

      this.handleInteractionResultUnified(data);
    });

    console.log(`[InteractionManager] Handler npcInteractionResult enregistré`);
    this.setupOtherHandlers();
  }

  handleInteractionResultUnified(data) {
    this.debugCounters.systemCalls++;
    console.log(`[InteractionManager] === HANDLE INTERACTION RESULT UNIFIED #${this.debugCounters.systemCalls} ===`);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    console.log(`[InteractionManager] Data:`, data);
    console.trace(`[InteractionManager] Stack trace handle result:`);
    
    // ✅ PROTECTION RÉENTRANTE
    if (this.isCurrentlyProcessingInteraction) {
      console.log(`[InteractionManager] 🚫 Déjà en traitement, ignorer`);
      return;
    }
    
    this.isCurrentlyProcessingInteraction = true;
    
    try {
      const systemName = this.mapResponseToSystem(data);
      console.log(`[InteractionManager] Système déterminé: ${systemName}`);
      
      const system = this.interactionSystems.get(systemName);
      const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
      
      console.log(`[InteractionManager] Système trouvé: ${!!system}`);
      console.log(`[InteractionManager] NPC trouvé: ${npc?.name || 'unknown'}`);
      
      if (system) {
        console.log(`[InteractionManager] ✅ Appel système ${systemName}`);
        console.trace(`[InteractionManager] Stack trace avant appel système:`);
        
        system.handle(npc, data);
        
        console.log(`[InteractionManager] ✅ Système ${systemName} exécuté`);
      } else {
        console.log(`[InteractionManager] ⚠️ Système ${systemName} non trouvé, fallback`);
        this.handleFallbackInteraction(data);
      }
      
    } catch (error) {
      console.error(`[InteractionManager] ❌ Erreur traitement:`, error);
      console.trace(`[InteractionManager] Stack trace erreur traitement:`);
      this.handleFallbackInteraction(data);
      
    } finally {
      setTimeout(() => {
        this.isCurrentlyProcessingInteraction = false;
        console.log(`[InteractionManager] 🔓 Traitement débloqué`);
      }, 100);
    }
  }

  setupOtherHandlers() {
    console.log(`[InteractionManager] === SETUP OTHER HANDLERS ===`);
    
    this.networkManager.onMessage("starterEligibility", (data) => {
      console.log(`[InteractionManager] Message starterEligibility reçu:`, data);
      
      if (data.eligible) {
        if (this.scene.starterSelector && !this.scene.starterSelector.starterOptions) {
          this.scene.starterSelector.starterOptions = data.availableStarters || [];
        }
        this.scene.showStarterSelection(data.availableStarters);
      }
    });

    this.networkManager.onMessage("starterReceived", (data) => {
      console.log(`[InteractionManager] Message starterReceived reçu:`, data);
      
      if (data.success) {
        const pokemonName = data.pokemon?.name || 'Pokémon';
        this.showMessage(`${pokemonName} ajouté à votre équipe !`, 'success');
      } else {
        this.showMessage(data.message || 'Erreur sélection', 'error');
      }
    });
  }

  generateInteractionId(data) {
    const npcId = data.npcId || data.id || 'unknown';
    const type = data.type || 'unknown';
    const messageHash = this.hashMessage(data.message || data.lines?.join('') || '');
    
    const id = `${npcId}-${type}-${messageHash}`;
    console.log(`[InteractionManager] ID généré: ${id}`);
    return id;
  }

  hashMessage(message) {
    if (!message) return 'nomsg';
    
    let hash = 0;
    for (let i = 0; i < Math.min(message.length, 50); i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  isShopInteraction(data) {
    const isShop = !!(
      data.type === "shop" ||
      data.shopId ||
      data.npcType === "merchant" ||
      (data.shopData && Object.keys(data.shopData).length > 0)
    );
    
    console.log(`[InteractionManager] IsShopInteraction: ${isShop}`);
    return isShop;
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
    
    let systemName = 'dialogue'; // défaut
    
    if (data.shopId || (data.npcType && data.npcType === "merchant")) {
      systemName = 'shop';
    } else if (data.type && typeMapping[data.type]) {
      systemName = typeMapping[data.type];
    }
    
    console.log(`[InteractionManager] Type "${data.type}" mappé vers système "${systemName}"`);
    return systemName;
  }

  // === INTERACTIONS SPÉCIFIQUES AVEC LOGS ===

  handleQuestInteraction(npc, data) {
    this.debugCounters.questCalls++;
    console.log(`[InteractionManager] === HANDLE QUEST INTERACTION #${this.debugCounters.questCalls} ===`);
    console.log(`[InteractionManager] NPC: ${npc?.name || 'unknown'}`);
    console.log(`[InteractionManager] Data:`, data);
    console.log(`[InteractionManager] Timestamp: ${Date.now()}`);
    console.trace(`[InteractionManager] Stack trace quest interaction:`);
    
    const questSystem = window.questSystem || window.questSystemGlobal;
    
    console.log(`[InteractionManager] QuestSystem trouvé: ${!!questSystem}`);
    console.log(`[InteractionManager] QuestSystem.handleNpcInteraction: ${typeof questSystem?.handleNpcInteraction}`);
    
    if (!questSystem?.handleNpcInteraction) {
      console.warn(`[InteractionManager] ⚠️ QuestSystem non disponible`);
      this.handleDialogueInteraction(npc, {
        message: data?.message || "Système de quêtes non disponible",
        lines: data?.lines || ["Système de quêtes non disponible"],
        name: data?.name || npc?.name || "PNJ"
      });
      return;
    }
    
    try {
      console.log(`[InteractionManager] Appel QuestSystem.handleNpcInteraction...`);
      console.trace(`[InteractionManager] Stack trace avant appel QuestSystem:`);
      
      const result = questSystem.handleNpcInteraction(data || npc, 'InteractionManager');
      
      console.log(`[InteractionManager] ✅ QuestSystem result: ${result}`);
      
    } catch (error) {
      console.error(`[InteractionManager] ❌ Erreur quest:`, error);
      console.trace(`[InteractionManager] Stack trace erreur quest:`);
      this.handleDialogueInteraction(npc, data);
    }
  }

  handleShopInteraction(npc, data) {
    this.debugCounters.shopCalls++;
    console.log(`[InteractionManager] === HANDLE SHOP INTERACTION #${this.debugCounters.shopCalls} ===`);
    console.log(`[InteractionManager] NPC: ${npc?.name || 'unknown'}`);
    console.log(`[InteractionManager] Data:`, data);
    console.trace(`[InteractionManager] Stack trace shop interaction:`);
    
    this.shopSystem = this.shopSystem || (this.scene.shopIntegration?.getShopSystem()) || window.shopSystem;
    if (!this.shopSystem) {
      console.warn(`[InteractionManager] ⚠️ ShopSystem non disponible`);
      this.handleDialogueInteraction(npc, { message: "Ce marchand n'est pas disponible." });
      return;
    }

    if (data && data.type === 'dialogue' && !data.shopId) {
      console.log(`[InteractionManager] Redirection vers dialogue (pas de shopId)`);
      this.handleDialogueInteraction(npc, data);
      return;
    }

    try {
      if (data && typeof data.npcName === "object" && data.npcName.name) {
        data.npcName = data.npcName.name;
      }

      console.log(`[InteractionManager] Appel ShopSystem.handleShopNpcInteraction...`);
      this.shopSystem.handleShopNpcInteraction(data || this.createShopInteractionData(npc));
      console.log(`[InteractionManager] ✅ ShopSystem appelé`);
    } catch (error) {
      console.error(`[InteractionManager] ❌ Erreur shop:`, error);
      console.trace(`[InteractionManager] Stack trace erreur shop:`);
      this.handleDialogueInteraction(npc, { 
        message: `Erreur boutique: ${error.message}`
      });
    }
  }

  handleShopInteractionResult(data) {
    console.log(`[InteractionManager] === HANDLE SHOP INTERACTION RESULT ===`);
    console.log(`[InteractionManager] Data:`, data);
    console.trace(`[InteractionManager] Stack trace shop result:`);
    
    const now = Date.now();
    if (this.shopHandlerActive || (now - this.lastShopOpenTime) < 1000) {
      console.log(`[InteractionManager] 🚫 Shop handler déjà actif ou cooldown`);
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
      console.error(`[InteractionManager] ❌ Erreur shop result:`, error);
      console.trace(`[InteractionManager] Stack trace erreur shop result:`);
      this.showMessage(`Erreur boutique: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        this.shopHandlerActive = false;
        console.log(`[InteractionManager] 🔓 Shop handler débloqué`);
      }, 2000);
    }
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
      shopHandlerActive: this.shopHandlerActive,
      currentlyProcessing: this.isCurrentlyProcessingInteraction
    };
    
    const blocked = Object.entries(checks).filter(([key, value]) => value);
    
    console.log(`[InteractionManager] canPlayerInteract - Bloqueurs actifs: ${blocked.map(([key]) => key).join(', ') || 'aucun'}`);
    
    return blocked.length === 0;
  }

  isShopOpen() {
    const open = this.shopSystem?.isShopOpen() || false;
    console.log(`[InteractionManager] isShopOpen: ${open}`);
    return open;
  }

  isQuestDialogOpen() {
    const open = window._questDialogActive || false;
    console.log(`[InteractionManager] isQuestDialogOpen: ${open}`);
    return open;
  }

  isDialogueOpen() {
    const dialogueBox = document.getElementById('dialogue-box');
    const open = dialogueBox && dialogueBox.style.display !== 'none';
    console.log(`[InteractionManager] isDialogueOpen: ${open}`);
    return open;
  }

  // === DÉTECTION TYPE NPC ===

  isNpcMerchant(npc) {
    if (!npc || !npc.properties) {
      console.log(`[InteractionManager] isNpcMerchant: false (pas de propriétés)`);
      return false;
    }
    
    const merchantProperties = ['npcType', 'shopId', 'shop', 'merchant', 'store'];
    for (const prop of merchantProperties) {
      const value = npc.properties[prop];
      if (value === 'merchant' || value === 'shop' || value === true ||
        (typeof value === 'string' && value.toLowerCase().includes('shop'))) {
        console.log(`[InteractionManager] isNpcMerchant: true (propriété ${prop}=${value})`);
        return true;
      }
    }
    
    if (npc.name && (
      npc.name.toLowerCase().includes('marchand') ||
      npc.name.toLowerCase().includes('merchant') ||
      npc.name.toLowerCase().includes('shop') ||
      npc.name.toLowerCase().includes('magasin')
    )) {
      console.log(`[InteractionManager] isNpcMerchant: true (nom ${npc.name})`);
      return true;
    }
    
    console.log(`[InteractionManager] isNpcMerchant: false`);
    return false;
  }

  isNpcQuestGiver(npc) {
    if (!npc) {
      console.log(`[InteractionManager] isNpcQuestGiver: false (pas de NPC)`);
      return false;
    }
    
    let isQuestGiver = false;
    
    if (npc.properties) {
      isQuestGiver = !!(
        npc.properties.npcType === 'questGiver' ||
        npc.properties.questId ||
        npc.properties.quest ||
        npc.properties.hasQuest === true ||
        npc.properties.questGiver === true
      );
    }
    
    if (!isQuestGiver && npc.name) {
      const lowerName = npc.name.toLowerCase();
      isQuestGiver = lowerName.includes('quest') || 
                    lowerName.includes('quête') ||
                    lowerName.includes('mission');
    }
    
    console.log(`[InteractionManager] isNpcQuestGiver: ${isQuestGiver} (NPC: ${npc.name})`);
    return isQuestGiver;
  }

  isNpcHealer(npc) {
    if (!npc || !npc.properties) {
      console.log(`[InteractionManager] isNpcHealer: false (pas de propriétés)`);
      return false;
    }
    
    const isHealer = !!(
      npc.properties.npcType === 'healer' ||
      npc.properties.heal === true ||
      npc.properties.pokemonCenter === true ||
      (npc.name && npc.name.toLowerCase().includes('infirmière'))
    );
    
    console.log(`[InteractionManager] isNpcHealer: ${isHealer}`);
    return isHealer;
  }

  // === AUTRES MÉTHODES (sans changement mais avec logs) ===

  handleHealInteraction(npc, data) {
    console.log(`[InteractionManager] === HANDLE HEAL INTERACTION ===`);
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
    console.log(`[InteractionManager] === HANDLE STARTER INTERACTION ===`);
    if (this.scene.showStarterSelection) {
      this.scene.showStarterSelection();
    } else {
      console.error(`[InteractionManager] ❌ showStarterSelection not available`);
      this.showMessage("Système starter non disponible", 'error');
    }
  }
  
  handleDialogueInteraction(npc, data) {
    console.log(`[InteractionManager] === HANDLE DIALOGUE INTERACTION ===`);
    console.log(`[InteractionManager] NPC: ${npc?.name || 'unknown'}`);
    console.log(`[InteractionManager] Data:`, data);
    
    if (typeof window.showNpcDialogue !== 'function') {
      console.error(`[InteractionManager] ❌ showNpcDialogue non disponible`);
      this.showMessage("Système de dialogue non disponible", 'error');
      return;
    }
    
    const dialogueData = this.createDialogueData(npc, data);
    try {
      console.log(`[InteractionManager] Appel showNpcDialogue avec:`, dialogueData);
      window.showNpcDialogue(dialogueData);
      console.log(`[InteractionManager] ✅ Dialogue affiché`);
    } catch (error) {
      console.error(`[InteractionManager] ❌ Erreur dialogue:`, error);
      this.showMessage(`Erreur dialogue: ${error.message}`, 'error');
    }
  }

  handleFallbackInteraction(data) {
    console.log(`[InteractionManager] === HANDLE FALLBACK INTERACTION ===`);
    console.log(`[InteractionManager] Data:`, data);
    this.handleDialogueInteraction(null, {
      message: data?.message || "Interaction non gérée"
    });
  }

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
    
    const dialogueData = {
      portrait,
      name: npcName,
      lines,
      text: data?.text || null
    };
    
    console.log(`[InteractionManager] Dialogue data créée:`, dialogueData);
    return dialogueData;
  }

  // === MÉTHODES UTILITAIRES ===

  findNpcById(npcId) {
    console.log(`[InteractionManager] Recherche NPC par ID: ${npcId}`);
    if (!this.npcManager || !npcId) return null;
    const npc = this.npcManager.getNpcData(npcId);
    console.log(`[InteractionManager] NPC trouvé: ${npc?.name || 'aucun'}`);
    return npc;
  }

  showMessage(message, type = 'info') {
    console.log(`[InteractionManager] === SHOW MESSAGE ===`);
    console.log(`[InteractionManager] Message: ${message}`);
    console.log(`[InteractionManager] Type: ${type}`);
    
    if (typeof window.showGameNotification === 'function') {
      try {
        window.showGameNotification(message, type, { duration: 3000 });
        console.log(`[InteractionManager] ✅ Notification affichée`);
      } catch (error) {
        console.error(`[InteractionManager] ❌ Erreur notification:`, error);
        console.log(`[InteractionManager] ${type.toUpperCase()}: ${message}`);
      }
    } else {
      console.log(`[InteractionManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  // === MÉTHODES DEBUG ===

  getDebugCounters() {
    return {
      ...this.debugCounters,
      timestamp: Date.now(),
      scene: this.scene.scene.key
    };
  }

  resetDebugCounters() {
    console.log(`[InteractionManager] === RESET DEBUG COUNTERS ===`);
    const oldCounters = { ...this.debugCounters };
    
    this.debugCounters = {
      inputEvents: 0,
      networkSends: 0,
      networkReceives: 0,
      questCalls: 0,
      shopCalls: 0,
      systemCalls: 0
    };
    
    console.log(`[InteractionManager] Anciens compteurs:`, oldCounters);
    console.log(`[InteractionManager] Compteurs resetés`);
  }

  getFullDebugInfo() {
    return {
      scene: this.scene.scene.key,
      counters: this.debugCounters,
      state: this.state,
      systems: Array.from(this.interactionSystems.keys()),
      canInteract: this.canPlayerInteract(),
      networkManager: !!this.networkManager,
      questSystem: !!this.questSystem,
      shopSystem: !!this.shopSystem,
      isProcessing: this.isCurrentlyProcessingInteraction,
      lastNetworkReceive: this.lastNetworkReceiveTime,
      sameReceiveCount: this.sameNetworkReceiveCount
    };
  }

  // === MÉTHODES EXISTANTES (dialogue, etc.) ===

  createCustomDiscussion(npcName, npcPortrait, text, options = {}) {
    console.log(`[InteractionManager] === CREATE CUSTOM DISCUSSION ===`);
    if (typeof window.showNpcDialogue !== 'function') {
      console.error('[InteractionManager] showNpcDialogue non disponible');
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
      console.error('[InteractionManager] Erreur createCustomDiscussion:', error);
      return false;
    }
  }

  async createSequentialDiscussion(npcName, npcPortrait, messages, options = {}) {
    console.log(`[InteractionManager] === CREATE SEQUENTIAL DISCUSSION ===`);
    if (typeof window.showNpcDialogue !== 'function') {
      console.error('[InteractionManager] showNpcDialogue non disponible');
      return false;
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.warn('[InteractionManager] Messages invalides ou vides');
      return false;
    }
    
    const validMessages = messages.filter(msg => {
      if (typeof msg === "object" && msg !== null) {
        return !!msg.text;
      }
      return typeof msg === "string" && msg.trim();
    });

    if (validMessages.length === 0) {
      console.warn('[InteractionManager] Aucun message valide');
      return false;
    }
    
    try {
      for (let i = 0; i < validMessages.length; i++) {
        const message = validMessages[i];
        const isLast = i === validMessages.length - 1;

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
          console.error(`[InteractionManager] Erreur affichage message ${i + 1}`);
          break;
        }
      }
      
      if (options.onComplete) {
        try {
          options.onComplete();
        } catch (error) {
          console.error(`[InteractionManager] Erreur callback onComplete:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[InteractionManager] Erreur createSequentialDiscussion:', error);
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
          hideName: options.hideName
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
        console.error(`[InteractionManager] Erreur message ${currentIndex}:`, error);
        resolve(false);
      }
    });
  }

  addVisualContinueIndicator(currentIndex, totalCount) {
    const dialogueBox = document.getElementById('dialogue-box');
    if (!dialogueBox) return;
    
    this.removeVisualContinueIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'dialogue-continue-indicator';
    indicator.id = 'dialogue-continue-indicator';
    
    const isLast = currentIndex === totalCount;
    if (isLast) {
      indicator.classList.add('last-message');
    }
    
    const arrow = document.createElement('div');
    arrow.className = 'dialogue-arrow';
    
    const counter = document.createElement('span');
    counter.className = 'dialogue-counter';
    counter.textContent = `${currentIndex}/${totalCount}`;
    
    indicator.appendChild(counter);
    indicator.appendChild(arrow);
    
    dialogueBox.appendChild(indicator);
  }

  removeVisualContinueIndicator() {
    const existingIndicator = document.getElementById('dialogue-continue-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }

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

  setConfig(config) {
    console.log(`[InteractionManager] === SET CONFIG ===`);
    console.log(`[InteractionManager] Nouvelle config:`, config);
    this.config = { ...this.config, ...config };
  }

  blockInteractions(blocked = true, reason = "Interaction bloquée") {
    console.log(`[InteractionManager] === BLOCK INTERACTIONS ===`);
    console.log(`[InteractionManager] Bloqué: ${blocked}, Raison: ${reason}`);
    this.state.isInteractionBlocked = blocked;
  }

  destroy() {
    console.log(`[InteractionManager] === DESTROY ===`);
    console.log(`[InteractionManager] Compteurs finaux:`, this.debugCounters);
    console.trace(`[InteractionManager] Stack trace destroy:`);
    
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
    this.interactionProcessingMap.clear();
    
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    this.questSystem = null;
    this.scene = null;

    console.log(`[InteractionManager] Détruit`);
  }

  triggerStarter() {
    console.log(`[InteractionManager] === TRIGGER STARTER ===`);
    if (this.networkManager?.room) {
      this.networkManager.room.send("checkStarterEligibility");
      console.log(`[InteractionManager] ✅ Message starter envoyé`);
    } else {
      console.log(`[InteractionManager] 🚫 Pas de connexion serveur`);
      this.showMessage("Connexion serveur requise", 'error');
    }
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugInteractionManager = function() {
  const scenes = window.game?.scene?.getScenes(true) || [];
  const activeScene = scenes.find(s => s.scene.isActive()) || scenes[0];
  const interactionManager = activeScene?.interactionManager;
  
  if (interactionManager) {
    console.log('[InteractionManager] === DEBUG INFO GLOBALE ===');
    const info = interactionManager.getFullDebugInfo();
    console.table(info.counters);
    console.log('[InteractionManager] Info complète:', info);
    return info;
  } else {
    console.error('[InteractionManager] InteractionManager non trouvé');
    return null;
  }
};

window.resetInteractionManagerDebug = function() {
  const scenes = window.game?.scene?.getScenes(true) || [];
  const activeScene = scenes.find(s => s.scene.isActive()) || scenes[0];
  const interactionManager = activeScene?.interactionManager;
  
  if (interactionManager) {
    interactionManager.resetDebugCounters();
    console.log('[InteractionManager] Debug counters reset');
    return true;
  }
  return false;
};

console.log('[InteractionManager] === VERSION DEBUG CHARGÉE ===');
console.log('[InteractionManager] Utilisez window.debugInteractionManager() pour voir les stats');
console.log('[InteractionManager] Utilisez window.resetInteractionManagerDebug() pour reset');
