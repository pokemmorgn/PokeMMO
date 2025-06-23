// client/src/game/InteractionManager.js - Gestionnaire centralisé des interactions
// ✅ Centralise toute la logique d'interaction : Shop, Quête, Dialogue, etc.

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
    
    // Récupérer les systèmes existants
    this.shopSystem = this.scene.shopIntegration?.getShopSystem() || window.shopSystem;
    this.questSystem = window.questSystem;
    
    // Enregistrer les systèmes d'interaction
    this.registerInteractionSystems();
    
    // Setup des événements
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

  // ✅ ENREGISTRER UN SYSTÈME D'INTERACTION
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

  // ✅ SETUP DES ÉVÉNEMENTS D'ENTRÉE
  setupInputHandlers() {
    this.scene.input.keyboard.on(`keydown-${this.config.interactionKey}`, () => {
      this.handleInteractionInput();
    });
    
    console.log(`⌨️ [InteractionManager] Touche ${this.config.interactionKey} configurée`);
  }

  // ✅ SETUP DES HANDLERS RÉSEAU
  setupNetworkHandlers() {
    if (!this.networkManager) return;

    this.networkManager.onMessage("npcInteractionResult", (data) => {
      this.handleInteractionResult(data);
    });
    
    console.log(`📡 [InteractionManager] Handlers réseau configurés`);
  }

  // ✅ GESTION DE L'INPUT D'INTERACTION
  handleInteractionInput() {
    console.log(`🎯 [InteractionManager] === INTERACTION INPUT ===`);
    
    // ✅ Vérifications préliminaires
    if (!this.canPlayerInteract()) {
      console.log(`⚠️ [InteractionManager] Interaction bloquée`);
      return;
    }

    // ✅ Trouver le NPC le plus proche
    const targetNpc = this.findInteractionTarget();
    if (!targetNpc) {
      console.log(`ℹ️ [InteractionManager] Aucun NPC à proximité`);
      this.showMessage("Aucun NPC à proximité pour interagir", 'info');
      return;
    }

    console.log(`🎯 [InteractionManager] NPC trouvé: ${targetNpc.name} (${targetNpc.id})`);
    
    // ✅ Déterminer le type d'interaction
    const interactionType = this.determineInteractionType(targetNpc);
    if (!interactionType) {
      console.warn(`⚠️ [InteractionManager] Aucun système ne peut gérer le NPC ${targetNpc.name}`);
      return;
    }

    console.log(`🔧 [InteractionManager] Type d'interaction: ${interactionType}`);
    
    // ✅ Déclencher l'interaction
    this.triggerInteraction(targetNpc, interactionType);
  }

  // ✅ TROUVER LE NPC CIBLE
  findInteractionTarget() {
    if (!this.playerManager || !this.npcManager) {
      console.error(`❌ [InteractionManager] PlayerManager ou NpcManager manquant`);
      return null;
    }

    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) {
      console.error(`❌ [InteractionManager] Joueur local introuvable`);
      return null;
    }

    return this.npcManager.getClosestNpc(
      myPlayer.x, 
      myPlayer.y, 
      this.config.maxInteractionDistance
    );
  }

  // ✅ DÉTERMINER LE TYPE D'INTERACTION
  determineInteractionType(npc) {
    console.log(`🔍 [InteractionManager] Analyse du NPC ${npc.name}...`);
    
    // ✅ Trier les systèmes par priorité
    const sortedSystems = Array.from(this.interactionSystems.values())
      .sort((a, b) => a.priority - b.priority);
    
    // ✅ Trouver le premier système qui peut gérer ce NPC
    for (const system of sortedSystems) {
      try {
        if (system.canHandle(npc) && system.validateState()) {
          console.log(`✅ [InteractionManager] Système "${system.name}" sélectionné`);
          return system.name;
        } else if (system.canHandle(npc) && !system.validateState()) {
          console.log(`⚠️ [InteractionManager] Système "${system.name}" peut gérer mais état invalide`);
        }
      } catch (error) {
        console.error(`❌ [InteractionManager] Erreur système "${system.name}":`, error);
      }
    }
    
    console.warn(`⚠️ [InteractionManager] Aucun système disponible pour ${npc.name}`);
    return null;
  }

  // ✅ DÉCLENCHER L'INTERACTION
  triggerInteraction(npc, interactionType) {
    console.log(`🚀 [InteractionManager] === DÉCLENCHEMENT INTERACTION ===`);
    console.log(`👤 NPC: ${npc.name}`);
    console.log(`🔧 Type: ${interactionType}`);
    
    const system = this.interactionSystems.get(interactionType);
    if (!system) {
      console.error(`❌ [InteractionManager] Système "${interactionType}" introuvable`);
      return;
    }

    // ✅ Mettre à jour l'état
    this.state.lastInteractionTime = Date.now();
    this.state.lastInteractedNpc = npc;
    this.state.currentInteractionType = interactionType;
    
    // ✅ Marquer le NPC comme dernier interagit
    if (this.npcManager) {
      this.npcManager.lastInteractedNpc = npc;
    }

    try {
      // ✅ Interaction locale d'abord (si possible)
      if (interactionType === 'shop' && this.shopSystem) {
        console.log(`🏪 [InteractionManager] Interaction shop locale`);
        system.handle(npc, null);
      }
      
      // ✅ Toujours envoyer au serveur pour les données officielles
      if (this.networkManager) {
        console.log(`📤 [InteractionManager] Envoi au serveur...`);
        this.networkManager.sendNpcInteract(npc.id);
      }
      
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur déclenchement:`, error);
      this.showMessage(`Erreur d'interaction: ${error.message}`, 'error');
    }
  }

  // ✅ GESTION DU RÉSULTAT D'INTERACTION
  handleInteractionResult(data) {
    console.log(`🟢 [InteractionManager] === RÉSULTAT INTERACTION ===`);
    console.log(`📊 Type: ${data.type}`);
    console.log(`📦 Data:`, data);

    if (window._questDialogActive) {
      console.log("⚠️ Fenêtre de quête déjà ouverte, résultat ignoré");
      return;
    }

    // ✅ Déterminer le système à utiliser basé sur la réponse
    const systemName = this.mapResponseToSystem(data);
    const system = this.interactionSystems.get(systemName);
    
    if (system) {
      console.log(`✅ [InteractionManager] Délégation au système "${systemName}"`);
      try {
        const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
        system.handle(npc, data);
      } catch (error) {
        console.error(`❌ [InteractionManager] Erreur système "${systemName}":`, error);
        this.handleFallbackInteraction(data);
      }
    } else {
      console.warn(`⚠️ [InteractionManager] Aucun système pour type "${data.type}"`);
      this.handleFallbackInteraction(data);
    }
  }

  // ✅ MAPPER LA RÉPONSE VERS UN SYSTÈME
  mapResponseToSystem(data) {
    // ✅ Mapping basé sur le type de réponse
    const typeMapping = {
      'shop': 'shop',
      'merchant': 'shop',
      'questGiver': 'quest',
      'questComplete': 'quest', 
      'questProgress': 'quest',
      'heal': 'heal',
      'dialogue': 'dialogue'
    };
    
    // ✅ Vérifications spéciales
    if (data.shopId || (data.npcType && data.npcType === "merchant")) {
      return 'shop';
    }
    
    if (data.type && typeMapping[data.type]) {
      return typeMapping[data.type];
    }
    
    // ✅ Fallback vers dialogue
    return 'dialogue';
  }

  // ✅ VÉRIFICATIONS D'ÉTAT

  canPlayerInteract() {
    const checks = {
      questDialogOpen: window._questDialogActive || false,
      chatOpen: typeof window.isChatFocused === "function" && window.isChatFocused(),
      inventoryOpen: window.inventorySystem?.isInventoryOpen() || false,
      shopOpen: this.isShopOpen(),
      dialogueOpen: this.isDialogueOpen(),
      interactionBlocked: this.state.isInteractionBlocked
    };
    
    const canInteract = !Object.values(checks).some(Boolean);
    
    if (!canInteract && this.config.debugMode) {
      console.log(`🔍 [InteractionManager] Interaction bloquée:`, checks);
    }
    
    return canInteract;
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

  // ✅ DÉTECTION DES TYPES DE NPCs

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
    
    // ✅ Vérifier le nom du NPC (fallback)
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

  // ✅ HANDLERS D'INTERACTION SPÉCIFIQUES

  handleShopInteraction(npc, data) {
    console.log(`🏪 [InteractionManager] === GESTION SHOP ===`);
    
    if (!this.shopSystem) {
      console.error(`❌ [InteractionManager] ShopSystem non disponible`);
      this.showMessage("Système de shop non disponible", 'error');
      return;
    }

    // ✅ Préparer les données d'interaction
    const interactionData = data || this.createShopInteractionData(npc);
    
    try {
      this.shopSystem.handleShopNpcInteraction(interactionData);
      console.log(`✅ [InteractionManager] Shop délégué avec succès`);
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur shop:`, error);
      this.showMessage(`Erreur shop: ${error.message}`, 'error');
    }
  }

handleQuestInteraction(npc, data) {
  console.log(`🎯 [InteractionManager] === GESTION QUÊTE ===`);
  
  if (!this.questSystem) {
    console.warn(`⚠️ [InteractionManager] QuestSystem non disponible`);
    this.showMessage("Système de quêtes non disponible", 'error');
    return;
  }

  try {
    // On suppose que handleNpcInteraction retourne true si une quête a été affichée,
    // false ou un code spécial sinon
    const result = this.questSystem.handleNpcInteraction(data || npc);
    if (result === false || result === 'NO_QUEST') {
      // Pas de quête dispo → on affiche le dialogue à la place
      this.handleDialogueInteraction(npc, data);
    } else {
      console.log(`✅ [InteractionManager] Quête déléguée avec succès`);
    }
  } catch (error) {
    console.error(`❌ [InteractionManager] Erreur quête:`, error);
    this.showMessage(`Erreur quête: ${error.message}`, 'error');
  }
}


  handleHealInteraction(npc, data) {
    console.log(`💊 [InteractionManager] === GESTION SOIN ===`);
    
    // ✅ Pour l'instant, déléguer vers dialogue avec message spécial
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
    console.log(`💬 [InteractionManager] === GESTION DIALOGUE ===`);
    
    if (typeof window.showNpcDialogue !== 'function') {
      console.error(`❌ [InteractionManager] showNpcDialogue non disponible`);
      this.showMessage("Système de dialogue non disponible", 'error');
      return;
    }

    // ✅ Préparer les données de dialogue
    const dialogueData = this.createDialogueData(npc, data);
    
    try {
      window.showNpcDialogue(dialogueData);
      console.log(`✅ [InteractionManager] Dialogue affiché`);
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur dialogue:`, error);
      this.showMessage(`Erreur dialogue: ${error.message}`, 'error');
    }
  }

  handleFallbackInteraction(data) {
    console.log(`🔄 [InteractionManager] === FALLBACK INTERACTION ===`);
    
    if (typeof window.showNpcDialogue === 'function') {
      window.showNpcDialogue({
        portrait: null,
        name: "???",
        text: data.message || "Interaction non gérée"
      });
    } else {
      this.showMessage(data.message || "Interaction non gérée", 'info');
    }
  }

  // ✅ CRÉATION DE DONNÉES D'INTERACTION

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

  createDialogueData(npc, data) {
    let npcName = "???";
    let portrait = data?.portrait;
    
    if (npc) {
      npcName = npc.name || "???";
      if (!portrait && npc.sprite) {
        portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
      }
    }
    
    return {
      portrait: portrait || "/assets/portrait/unknownPortrait.png",
      name: npcName,
      lines: data?.lines || [data?.message || "..."],
      text: data?.text
    };
  }

  // ✅ UTILITAIRES

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

  // ✅ CONFIGURATION ET DEBUG

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

  // ✅ DEBUG ET STATS

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

  // ✅ NETTOYAGE

  destroy() {
    console.log(`💀 [InteractionManager] Destruction...`);
    
    // Nettoyer les handlers
    this.scene.input.keyboard.off(`keydown-${this.config.interactionKey}`);
    
    // Nettoyer les références
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
