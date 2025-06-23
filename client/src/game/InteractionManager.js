// client/src/game/InteractionManager.js - Gestionnaire centralisé des interactions

export class InteractionManager {
  constructor(scene) {
    this.scene = scene;
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    this.questSystem = null;

    // Configuration des interactions
    this.config = {
      maxInteractionDistance: 64,
      interactionKey: 'E',
      debugMode: false
    };

    // Systèmes d'interaction disponibles
    this.interactionSystems = new Map();

    // État des interactions
    this.state = {
      lastInteractionTime: 0,
      lastInteractedNpc: null,
      isInteractionBlocked: false,
      currentInteractionType: null
    };

    console.log(`🎯 [${this.scene.scene.key}] InteractionManager créé`);
  }

  // ✅ INITIALISATION
  initialize(networkManager, playerManager, npcManager) {
    this.networkManager = networkManager;
    this.playerManager = playerManager;
    this.npcManager = npcManager;

    this.shopSystem = this.scene.shopIntegration?.getShopSystem() || window.shopSystem;
    this.questSystem = window.questSystem;

    this.registerInteractionSystems();

    this.setupInputHandlers();
    this.setupNetworkHandlers();

    console.log(`✅ [${this.scene.scene.key}] InteractionManager initialisé`);
    console.log(`📊 Systèmes enregistrés: ${this.interactionSystems.size}`);

    return this;
  }

  // ✅ ENREGISTREMENT DES SYSTÈMES D'INTERACTION
  registerInteractionSystems() {
    // ✅ Système Shop (priorité 1)
    this.registerSystem('shop', {
      priority: 1,
      canHandle: (npc) => this.isNpcMerchant(npc),
      handle: (npc, data) => this.handleShopInteraction(npc, data),
      validateState: () => !this.isShopOpen(),
      description: "Système de boutique/marchand"
    });

    // ✅ Système Quête (priorité 2)
    this.registerSystem('quest', {
      priority: 2,
      canHandle: (npc) => this.isNpcQuestGiver(npc),
      handle: (npc, data) => this.handleQuestInteraction(npc, data),
      validateState: () => !this.isQuestDialogOpen(),
      description: "Système de quêtes"
    });

    // ✅ Système Soin (priorité 3)
    this.registerSystem('heal', {
      priority: 3,
      canHandle: (npc) => this.isNpcHealer(npc),
      handle: (npc, data) => this.handleHealInteraction(npc, data),
      validateState: () => true,
      description: "Système de soin Pokémon"
    });

    // ✅ Système Dialogue (priorité 99 - fallback)
    this.registerSystem('dialogue', {
      priority: 99,
      canHandle: (npc) => true, // Accepte tous les NPCs
      handle: (npc, data) => this.handleDialogueInteraction(npc, data),
      validateState: () => !this.isDialogueOpen(),
      description: "Système de dialogue générique"
    });

    console.log(`🔧 [InteractionManager] ${this.interactionSystems.size} systèmes enregistrés`);
  }

  registerSystem(name, system) {
    if (!system.canHandle || !system.handle) {
      throw new Error(`Système ${name} invalide : manque canHandle ou handle`);
    }
    system.name = name;
    system.priority = system.priority || 50;
    system.validateState = system.validateState || (() => true);

    this.interactionSystems.set(name, system);
    console.log(`📝 [InteractionManager] Système "${name}" enregistré (priorité: ${system.priority})`);
  }

  setupInputHandlers() {
    this.scene.input.keyboard.on(`keydown-${this.config.interactionKey}`, () => {
      this.handleInteractionInput();
    });
    console.log(`⌨️ [InteractionManager] Touche ${this.config.interactionKey} configurée`);
  }

  setupNetworkHandlers() {
    if (!this.networkManager) return;

    this.networkManager.onMessage("npcInteractionResult", (data) => {
      this.handleInteractionResult(data);
    });

    console.log(`📡 [InteractionManager] Handlers réseau configurés`);
  }

  // === GESTION DE L'INPUT D'INTERACTION ===
  handleInteractionInput() {
    if (!this.canPlayerInteract()) {
      if (this.config.debugMode) console.log(`⚠️ [InteractionManager] Interaction bloquée`);
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
    if (!this.playerManager || !this.npcManager) {
      if (this.config.debugMode) console.error(`❌ [InteractionManager] PlayerManager ou NpcManager manquant`);
      return null;
    }
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) {
      if (this.config.debugMode) console.error(`❌ [InteractionManager] Joueur local introuvable`);
      return null;
    }
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
        if (this.config.debugMode) console.error(`❌ [InteractionManager] Erreur système "${system.name}":`, error);
      }
    }
    return null;
  }

  triggerInteraction(npc, interactionType) {
    const system = this.interactionSystems.get(interactionType);
    if (!system) {
      if (this.config.debugMode) console.error(`❌ [InteractionManager] Système "${interactionType}" introuvable`);
      return;
    }
    this.state.lastInteractionTime = Date.now();
    this.state.lastInteractedNpc = npc;
    this.state.currentInteractionType = interactionType;
    if (this.npcManager) {
      this.npcManager.lastInteractedNpc = npc;
    }
    try {
      // Toujours envoyer au serveur pour les données officielles
      if (this.networkManager) {
        this.networkManager.sendNpcInteract(npc.id);
      }
      // Shop : peut ouvrir un menu local aussi
      if (interactionType === 'shop' && this.shopSystem) {
        system.handle(npc, null);
      }
    } catch (error) {
      this.showMessage(`Erreur d'interaction: ${error.message}`, 'error');
    }
  }

  handleInteractionResult(data) {
    if (window._questDialogActive) {
      return;
    }
    // Déterminer le système à utiliser basé sur la réponse
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
      'dialogue': 'dialogue'
    };
    if (data.shopId || (data.npcType && data.npcType === "merchant")) return 'shop';
    if (data.type && typeMapping[data.type]) return typeMapping[data.type];
    return 'dialogue';
  }

  // === ETAT & BLOQUEURS ===

  canPlayerInteract() {
    const checks = {
      questDialogOpen: window._questDialogActive || false,
      chatOpen: typeof window.isChatFocused === "function" && window.isChatFocused(),
      inventoryOpen: window.inventorySystem?.isInventoryOpen() || false,
      shopOpen: this.isShopOpen(),
      dialogueOpen: this.isDialogueOpen(),
      interactionBlocked: this.state.isInteractionBlocked
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

  // === TYPE NPC ===

  isNpcMerchant(npc) {
    if (!npc || !npc.properties) return false;
    const merchantProperties = [
      'npcType',
      'shopId',
      'shop',
      'merchant',
      'store'
    ];
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
  if (data && data.type === 'dialogue') {
    this.handleDialogueInteraction(npc, data);
    return;
  }
  try {
    // PATCH : Forcer le npcName string si data.npcName existe
    if (data && typeof data.npcName === "object" && data.npcName.name) {
      data.npcName = data.npcName.name;
    }
    this.shopSystem.handleShopNpcInteraction(data || this.createShopInteractionData(npc));
  } catch (error) {
    this.handleDialogueInteraction(npc, { 
      message: `Erreur shop: ${error.message}\n\nSTACK:\n${error.stack || '(pas de stack)'}`
    });
  }
}


  handleQuestInteraction(npc, data) {
    this.questSystem = this.questSystem || window.questSystem;
    if (!this.questSystem) {
      this.handleDialogueInteraction(npc, { message: "Système de quêtes non disponible" });
      return;
    }
    try {
      const result = this.questSystem.handleNpcInteraction(data || npc);
      if (result === false || result === 'NO_QUEST') {
        // Fallback sur le dialogue normalisé
        this.handleDialogueInteraction(npc, null);
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
    // Toujours passer par la boite de dialogue normalisée
    this.handleDialogueInteraction(null, {
      message: data?.message || "Interaction non gérée"
    });
  }

  // === GÉNÉRATION DE LA DATA DE DIALOGUE, UNIFIÉE POUR TOUT ===

  createDialogueData(npc, data) {
    let npcName = "ERROR NAME";
    let portrait = "/assets/portrait/unknownPortrait.png";
    if (npc) {
      npcName = npc.name || "ERROR NAME";
      if (npc.sprite) {
        portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
      }
    }
    // Si data force le portrait ou le nom, on override
    if (data?.portrait) portrait = data.portrait;
    if (data?.name) npcName = data.name;

    let lines = ["..."];
    if (data?.lines && Array.isArray(data.lines) && data.lines.length > 0) {
      lines = data.lines;
    } else if (data?.message) {
      lines = [data.message];
    } else if (npc && npc.defaultDialogue) {
      lines = [npc.defaultDialogue];
    }
    return {
      portrait,
      name: npcName,
      lines,
      text: data?.text || null
    };
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

  // === UTILS

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
    console.log(`🔧 [InteractionManager] Configuration mise à jour:`, this.config);
  }

  enableDebugMode(enabled = true) {
    this.config.debugMode = enabled;
    console.log(`🐛 [InteractionManager] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  blockInteractions(blocked = true, reason = "Interaction bloquée") {
    this.state.isInteractionBlocked = blocked;
    if (blocked) {
      console.log(`🚫 [InteractionManager] Interactions bloquées: ${reason}`);
    } else {
      console.log(`✅ [InteractionManager] Interactions débloquées`);
    }
  }

  debugState() {
    console.log(`🔍 [InteractionManager] === DEBUG STATE ===`);
    console.log(`📊 Scène: ${this.scene.scene.key}`);
    console.log(`🎯 Systèmes enregistrés: ${this.interactionSystems.size}`);
    console.log(`⚙️ Configuration:`, this.config);
    console.log(`📈 État:`, this.state);
    console.log(`🔧 Systèmes disponibles:`);
    this.interactionSystems.forEach((system, name) => {
      console.log(`  - ${name}: priorité ${system.priority} - ${system.description}`);
    });
    console.log(`🤖 NPCs disponibles: ${this.npcManager?.getAllNpcs().length || 0}`);
    console.log(`🎮 Peut interagir: ${this.canPlayerInteract()}`);
    console.log(`=== FIN DEBUG ===`);
  }

  getStats() {
    return {
      sceneKey: this.scene.scene.key,
      systemsCount: this.interactionSystems.size,
      canInteract: this.canPlayerInteract(),
      lastInteractionTime: this.state.lastInteractionTime,
      currentInteractionType: this.state.currentInteractionType,
      isBlocked: this.state.isInteractionBlocked
    };
  }

  destroy() {
    this.scene.input.keyboard.off(`keydown-${this.config.interactionKey}`);
    this.interactionSystems.clear();
    this.networkManager = null;
    this.playerManager = null;
    this.npcManager = null;
    this.shopSystem = null;
    this.questSystem = null;
    this.scene = null;
    console.log(`✅ [InteractionManager] Détruit`);
  }
}
