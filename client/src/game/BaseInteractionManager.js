// client/src/game/BaseInteractionManager.js
// ✅ Orchestrateur principal des interactions - Remplace l'ancien monolithe
// Gère NPCs, objets, environnement via des modules spécialisés

import { 
  INTERACTION_TYPES, 
  INTERACTION_CONFIG,
  INTERACTION_PRIORITIES,
  InteractionValidator,
  InteractionHelpers
} from '../types/InteractionTypes.js';

import { NpcInteractionManager } from '../modules/NpcInteractionManager.js';

export class BaseInteractionManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Dépendances injectées
    this.dependencies = {
      networkManager: null,
      networkInteractionHandler: null,
      playerManager: null,
      npcManager: null,
      questSystem: null,
      shopSystem: null
    };
    
    // ✅ Modules spécialisés
    this.modules = {
      npcInteractionManager: null,
      objectInteractionManager: null,  // À créer
      environmentInteractionManager: null  // Futur
    };
    
    // ✅ État global des interactions
    this.state = {
      currentInteraction: null,
      lastInteractionTime: 0,
      isProcessingInteraction: false,
      blockedUntil: 0,
      inputBlocked: false
    };
    
    // ✅ Configuration
    this.config = {
      inputKey: 'E',
      maxInteractionDistance: INTERACTION_CONFIG.MAX_INTERACTION_DISTANCE,
      interactionCooldown: INTERACTION_CONFIG.DEFAULT_INTERACTION_COOLDOWN,
      enableAutoDetection: true,
      enableDebugLogs: INTERACTION_CONFIG.ENABLE_DEBUG_LOGS,
      priorityThreshold: INTERACTION_PRIORITIES.NORMAL
    };
    
    // ✅ Callbacks globaux
    this.callbacks = {
      onInteractionStart: null,
      onInteractionComplete: null,
      onInteractionError: null,
      onTargetDetected: null,
      onModuleDelegation: null,
      onInputBlocked: null
    };
    
    // ✅ Système de détection de cibles
    this.targetDetectors = new Map();
    this.registerBuiltinTargetDetectors();
    
    // ✅ Statistiques globales
    this.stats = {
      totalInteractions: 0,
      interactionsByType: new Map(),
      moduleDelegations: new Map(),
      inputEvents: 0,
      blockedInputs: 0,
      errors: 0,
      averageResponseTime: 0,
      lastInteractionDuration: 0
    };
    
    console.log('[BaseInteractionManager] 🎮 Créé pour scène:', this.scene.scene.key);
  }

  // === INITIALISATION ===

  initialize(dependencies = {}) {
    console.log('[BaseInteractionManager] 🚀 === INITIALISATION ===');
    console.log('[BaseInteractionManager] Scene:', this.scene.scene.key);
    
    // ✅ Injection des dépendances
    this.dependencies = {
      networkManager: dependencies.networkManager || this.scene.networkManager,
      networkInteractionHandler: dependencies.networkInteractionHandler,
      playerManager: dependencies.playerManager || this.scene.playerManager,
      npcManager: dependencies.npcManager || this.scene.npcManager,
      questSystem: dependencies.questSystem || window.questSystem || window.questSystemGlobal,
      shopSystem: dependencies.shopSystem || this.scene.shopIntegration?.getShopSystem() || window.shopSystem
    };
    
    console.log('[BaseInteractionManager] 📦 Dépendances injectées:');
    Object.entries(this.dependencies).forEach(([key, value]) => {
      console.log(`  ${key}: ${!!value ? '✅' : '❌'}`);
    });
    
    // ✅ Récupérer NetworkInteractionHandler depuis NetworkManager
    if (!this.dependencies.networkInteractionHandler && this.dependencies.networkManager?.interactionHandler) {
      this.dependencies.networkInteractionHandler = this.dependencies.networkManager.interactionHandler;
      console.log('[BaseInteractionManager] ✅ NetworkInteractionHandler récupéré depuis NetworkManager');
    }
    
    // ✅ Initialiser les modules spécialisés
    this.initializeModules();
    
    // ✅ Configurer la gestion des inputs
    this.setupInputHandling();
    
    // ✅ Exposer l'API globale
    this.exposeGlobalAPI();
    
    this.isInitialized = true;
    console.log('[BaseInteractionManager] ✅ Initialisé avec succès');
    
    return this;
  }

  initializeModules() {
    console.log('[BaseInteractionManager] 🔧 === INITIALISATION MODULES ===');
    
    // ✅ Module NPC
    try {
      this.modules.npcInteractionManager = new NpcInteractionManager(
        this.scene, 
        this.dependencies.networkInteractionHandler
      );
      
      const npcResult = this.modules.npcInteractionManager.initialize({
        npcManager: this.dependencies.npcManager,
        playerManager: this.dependencies.playerManager,
        questSystem: this.dependencies.questSystem,
        shopSystem: this.dependencies.shopSystem,
        dialogueSystem: window.showNpcDialogue
      });
      
      if (npcResult) {
        console.log('[BaseInteractionManager] ✅ NpcInteractionManager initialisé');
        
        // ✅ Connecter les callbacks
        this.setupNpcCallbacks();
      } else {
        console.error('[BaseInteractionManager] ❌ Échec initialisation NpcInteractionManager');
      }
      
    } catch (error) {
      console.error('[BaseInteractionManager] ❌ Erreur création NpcInteractionManager:', error);
    }
    
    // ✅ Module Objets (à venir)
    // this.modules.objectInteractionManager = new ObjectInteractionManager(...)
    
    // ✅ Module Environnement (futur)
    // this.modules.environmentInteractionManager = new EnvironmentInteractionManager(...)
    
    console.log('[BaseInteractionManager] 📊 Modules initialisés:', {
      npc: !!this.modules.npcInteractionManager,
      objects: !!this.modules.objectInteractionManager,
      environment: !!this.modules.environmentInteractionManager
    });
  }

  setupNpcCallbacks() {
    const npcManager = this.modules.npcInteractionManager;
    if (!npcManager) return;
    
    console.log('[BaseInteractionManager] 🔗 Configuration callbacks NPC...');
    
    npcManager.onNpcInteractionStart((npc, type) => {
      console.log(`[BaseInteractionManager] 🎯 Interaction NPC démarrée: ${npc?.name} (${type})`);
      this.state.currentInteraction = {
        type: INTERACTION_TYPES.NPC,
        target: npc,
        subType: type,
        startTime: Date.now()
      };
      
      if (this.callbacks.onInteractionStart) {
        this.callbacks.onInteractionStart(INTERACTION_TYPES.NPC, npc, type);
      }
    });
    
    npcManager.onNpcInteractionComplete((npc, data, result) => {
      console.log(`[BaseInteractionManager] ✅ Interaction NPC complétée: ${npc?.name}`);
      
      if (this.state.currentInteraction) {
        this.state.lastInteractionDuration = Date.now() - this.state.currentInteraction.startTime;
        this.updateAverageResponseTime(this.state.lastInteractionDuration);
      }
      
      this.state.currentInteraction = null;
      
      if (this.callbacks.onInteractionComplete) {
        this.callbacks.onInteractionComplete(INTERACTION_TYPES.NPC, npc, data, result);
      }
    });
    
    npcManager.onNpcInteractionError((error, npc, data) => {
      console.error(`[BaseInteractionManager] ❌ Erreur interaction NPC: ${error.message}`);
      this.stats.errors++;
      this.state.currentInteraction = null;
      
      if (this.callbacks.onInteractionError) {
        this.callbacks.onInteractionError(INTERACTION_TYPES.NPC, error, npc, data);
      }
    });
    
    npcManager.onSystemDelegation((systemName, npc, data) => {
      console.log(`[BaseInteractionManager] 🔗 Délégation: ${systemName}`);
      this.updateDelegationStats(systemName);
      
      if (this.callbacks.onModuleDelegation) {
        this.callbacks.onModuleDelegation('NpcInteractionManager', systemName, npc, data);
      }
    });
    
    console.log('[BaseInteractionManager] ✅ Callbacks NPC configurés');
  }

  // === GESTION DES INPUTS ===

  setupInputHandling() {
    console.log('[BaseInteractionManager] ⌨️ === CONFIGURATION INPUT HANDLING ===');
    console.log(`[BaseInteractionManager] Touche d'interaction: ${this.config.inputKey}`);
    
    // ✅ Nettoyage préventif
    this.cleanupExistingInputHandlers();
    
    // ✅ Configuration du handler d'input
    this.scene.input.keyboard.on(`keydown-${this.config.inputKey}`, (event) => {
      this.stats.inputEvents++;
      console.log(`[BaseInteractionManager] 🎯 === INPUT ${this.config.inputKey} #${this.stats.inputEvents} ===`);
      console.log(`[BaseInteractionManager] Timestamp: ${Date.now()}`);
      
      this.handleInteractionInput(event);
    });
    
    console.log('[BaseInteractionManager] ✅ Input handling configuré');
  }

  cleanupExistingInputHandlers() {
    const existingListeners = this.scene.input.keyboard.listenerCount(`keydown-${this.config.inputKey}`);
    if (existingListeners > 0) {
      console.log(`[BaseInteractionManager] 🧹 Nettoyage ${existingListeners} listeners existants`);
      this.scene.input.keyboard.removeAllListeners(`keydown-${this.config.inputKey}`);
    }
  }

  handleInteractionInput(event) {
    console.log('[BaseInteractionManager] 🔄 === TRAITEMENT INPUT ===');
    
    // ✅ Vérifications préliminaires
    if (!this.canProcessInput()) {
      this.stats.blockedInputs++;
      console.log(`[BaseInteractionManager] 🚫 Input bloqué (total: ${this.stats.blockedInputs})`);
      return;
    }
    
    // ✅ Détecter les cibles d'interaction
    const targets = this.detectInteractionTargets();
    if (targets.length === 0) {
      console.log('[BaseInteractionManager] 🚫 Aucune cible détectée');
      this.showInteractionMessage("Rien à proximité pour interagir", 'info');
      return;
    }
    
    // ✅ Sélectionner la meilleure cible
    const primaryTarget = this.selectPrimaryTarget(targets);
    if (!primaryTarget) {
      console.log('[BaseInteractionManager] 🚫 Aucune cible prioritaire');
      return;
    }
    
    console.log(`[BaseInteractionManager] 🎯 Cible sélectionnée: ${primaryTarget.type} - ${primaryTarget.target?.name || primaryTarget.target?.id}`);
    
    // ✅ Callback de détection
    if (this.callbacks.onTargetDetected) {
      this.callbacks.onTargetDetected(primaryTarget);
    }
    
    // ✅ Déléguer au module approprié
    this.delegateToModule(primaryTarget);
  }

  canProcessInput() {
    // ✅ Vérifications d'état
    if (this.state.inputBlocked) {
      console.log('[BaseInteractionManager] Input explicitement bloqué');
      return false;
    }
    
    if (this.state.isProcessingInteraction) {
      console.log('[BaseInteractionManager] Interaction déjà en cours');
      return false;
    }
    
    // ✅ Vérification cooldown
    const now = Date.now();
    if (now < this.state.blockedUntil) {
      const remaining = this.state.blockedUntil - now;
      console.log(`[BaseInteractionManager] Bloqué encore ${remaining}ms`);
      return false;
    }
    
    if (now - this.state.lastInteractionTime < this.config.interactionCooldown) {
      const remaining = this.config.interactionCooldown - (now - this.state.lastInteractionTime);
      console.log(`[BaseInteractionManager] Cooldown actif: ${remaining}ms`);
      return false;
    }
    
    // ✅ Vérifications systèmes bloquants
    if (this.areSystemsBlocking()) {
      console.log('[BaseInteractionManager] Systèmes bloquants actifs');
      if (this.callbacks.onInputBlocked) {
        this.callbacks.onInputBlocked('systems_blocking');
      }
      return false;
    }
    
    return true;
  }

  areSystemsBlocking() {
    const checks = {
      questDialogOpen: window._questDialogActive || false,
      chatOpen: typeof window.isChatFocused === "function" && window.isChatFocused(),
      inventoryOpen: window.inventorySystem?.isInventoryOpen() || false,
      shopOpen: this.dependencies.shopSystem?.isShopOpen() || false,
      dialogueOpen: this.isDialogueOpen()
    };
    
    const blocking = Object.entries(checks).filter(([key, value]) => value);
    return blocking.length > 0;
  }

  isDialogueOpen() {
    const dialogueBox = document.getElementById('dialogue-box');
    return dialogueBox && dialogueBox.style.display !== 'none';
  }

  // === DÉTECTION DES CIBLES ===

  registerBuiltinTargetDetectors() {
    console.log('[BaseInteractionManager] 🔍 Enregistrement détecteurs de cibles...');
    
    // ✅ Détecteur NPCs
    this.registerTargetDetector(INTERACTION_TYPES.NPC, INTERACTION_PRIORITIES.HIGH, () => {
      return this.detectNearbyNpcs();
    });
    
    // ✅ Détecteur objets (à implémenter avec ObjectInteractionManager)
    this.registerTargetDetector(INTERACTION_TYPES.OBJECT, INTERACTION_PRIORITIES.NORMAL, () => {
      return this.detectNearbyObjects();
    });
    
    // ✅ Détecteur environnement (futur)
    this.registerTargetDetector(INTERACTION_TYPES.ENVIRONMENT, INTERACTION_PRIORITIES.LOW, () => {
      return this.detectEnvironmentInteractions();
    });
    
    console.log(`[BaseInteractionManager] ✅ ${this.targetDetectors.size} détecteurs enregistrés`);
  }

  registerTargetDetector(type, priority, detector) {
    this.targetDetectors.set(type, {
      type: type,
      priority: priority,
      detector: detector,
      enabled: true
    });
    
    console.log(`[BaseInteractionManager] 📝 Détecteur enregistré: ${type} (priorité: ${priority})`);
  }

  detectInteractionTargets() {
    console.log('[BaseInteractionManager] 🔍 === DÉTECTION CIBLES ===');
    
    const allTargets = [];
    
    // ✅ Exécuter tous les détecteurs
    for (const [type, detector] of this.targetDetectors) {
      if (!detector.enabled) continue;
      
      try {
        console.log(`[BaseInteractionManager] Test détecteur: ${type}`);
        const targets = detector.detector();
        
        if (targets && targets.length > 0) {
          console.log(`[BaseInteractionManager] ${type}: ${targets.length} cible(s) trouvée(s)`);
          allTargets.push(...targets.map(target => ({
            type: type,
            priority: detector.priority,
            target: target,
            distance: this.calculateDistance(target)
          })));
        }
        
      } catch (error) {
        console.error(`[BaseInteractionManager] ❌ Erreur détecteur ${type}:`, error);
      }
    }
    
    console.log(`[BaseInteractionManager] Total cibles détectées: ${allTargets.length}`);
    return allTargets;
  }

  detectNearbyNpcs() {
    const npcManager = this.dependencies.npcManager;
    const playerManager = this.dependencies.playerManager;
    
    if (!npcManager || !playerManager) {
      return [];
    }
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer) {
      return [];
    }
    
    // ✅ Trouver le NPC le plus proche
    const closestNpc = npcManager.getClosestNpc(
      myPlayer.x,
      myPlayer.y,
      this.config.maxInteractionDistance
    );
    
    return closestNpc ? [closestNpc] : [];
  }

  detectNearbyObjects() {
    // ✅ À implémenter avec ObjectInteractionManager
    console.log('[BaseInteractionManager] 🚧 Détection objets - À implémenter');
    return [];
  }

  detectEnvironmentInteractions() {
    // ✅ Futur - Portes, commutateurs, etc.
    console.log('[BaseInteractionManager] 🚧 Détection environnement - À implémenter');
    return [];
  }

  selectPrimaryTarget(targets) {
    if (targets.length === 0) return null;
    
    console.log('[BaseInteractionManager] 🎯 === SÉLECTION CIBLE PRIORITAIRE ===');
    
    // ✅ Filtrer par priorité
    const highPriorityTargets = targets.filter(t => t.priority <= this.config.priorityThreshold);
    const candidateTargets = highPriorityTargets.length > 0 ? highPriorityTargets : targets;
    
    // ✅ Trier par priorité puis par distance
    candidateTargets.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Priorité plus faible = plus prioritaire
      }
      return a.distance - b.distance; // Distance plus courte = plus prioritaire
    });
    
    const selected = candidateTargets[0];
    console.log(`[BaseInteractionManager] Cible sélectionnée: ${selected.type} (priorité: ${selected.priority}, distance: ${selected.distance.toFixed(1)})`);
    
    return selected;
  }

  calculateDistance(target) {
    const playerManager = this.dependencies.playerManager;
    if (!playerManager) return Infinity;
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer || !target) return Infinity;
    
    return Math.sqrt(
      Math.pow(target.x - myPlayer.x, 2) + 
      Math.pow(target.y - myPlayer.y, 2)
    );
  }

  // === DÉLÉGATION AUX MODULES ===

  delegateToModule(targetInfo) {
    console.log('[BaseInteractionManager] 🔄 === DÉLÉGATION MODULE ===');
    console.log(`[BaseInteractionManager] Type: ${targetInfo.type}`);
    
    this.state.isProcessingInteraction = true;
    this.state.lastInteractionTime = Date.now();
    this.stats.totalInteractions++;
    
    try {
      let result = false;
      
      switch (targetInfo.type) {
        case INTERACTION_TYPES.NPC:
          result = this.delegateToNpcModule(targetInfo.target);
          break;
          
        case INTERACTION_TYPES.OBJECT:
          result = this.delegateToObjectModule(targetInfo.target);
          break;
          
        case INTERACTION_TYPES.ENVIRONMENT:
          result = this.delegateToEnvironmentModule(targetInfo.target);
          break;
          
        default:
          console.warn(`[BaseInteractionManager] ⚠️ Type d'interaction non supporté: ${targetInfo.type}`);
          result = false;
      }
      
      // ✅ Mise à jour statistiques
      this.updateInteractionStats(targetInfo.type, result);
      
      if (!result) {
        console.warn('[BaseInteractionManager] ⚠️ Délégation échouée');
        this.showInteractionMessage("Impossible d'interagir avec cette cible", 'warning');
      }
      
    } catch (error) {
      console.error('[BaseInteractionManager] ❌ Erreur délégation:', error);
      this.stats.errors++;
      this.showInteractionMessage(`Erreur d'interaction: ${error.message}`, 'error');
      
    } finally {
      // ✅ Libérer le verrou après un délai
      setTimeout(() => {
        this.state.isProcessingInteraction = false;
      }, 100);
    }
  }

  delegateToNpcModule(npc) {
    console.log('[BaseInteractionManager] 🎭 Délégation vers NpcInteractionManager');
    
    const npcModule = this.modules.npcInteractionManager;
    if (!npcModule) {
      console.error('[BaseInteractionManager] ❌ NpcInteractionManager non disponible');
      return false;
    }
    
    this.updateDelegationStats('NpcInteractionManager');
    
    return npcModule.interactWithNpc(npc);
  }

  delegateToObjectModule(object) {
    console.log('[BaseInteractionManager] 📦 Délégation vers ObjectInteractionManager');
    
    const objectModule = this.modules.objectInteractionManager;
    if (!objectModule) {
      console.error('[BaseInteractionManager] ❌ ObjectInteractionManager non disponible');
      return false;
    }
    
    this.updateDelegationStats('ObjectInteractionManager');
    
    // ✅ À implémenter
    // return objectModule.interactWithObject(object);
    return false;
  }

  delegateToEnvironmentModule(environmentTarget) {
    console.log('[BaseInteractionManager] 🌍 Délégation vers EnvironmentInteractionManager');
    
    const envModule = this.modules.environmentInteractionManager;
    if (!envModule) {
      console.error('[BaseInteractionManager] ❌ EnvironmentInteractionManager non disponible');
      return false;
    }
    
    this.updateDelegationStats('EnvironmentInteractionManager');
    
    // ✅ À implémenter
    // return envModule.interactWithEnvironment(environmentTarget);
    return false;
  }

  // === API GLOBALE ===

  exposeGlobalAPI() {
    console.log('[BaseInteractionManager] 🌐 === EXPOSITION API GLOBALE ===');
    
    // ✅ API de dialogue (compatibilité)
    if (!window.DialogueAPI) {
      window.DialogueAPI = {};
    }
    
    window.DialogueAPI.createCustomDiscussion = (npcName, npcPortrait, text, options = {}) => {
      return this.createCustomDiscussion(npcName, npcPortrait, text, options);
    };
    
    window.DialogueAPI.createSequentialDiscussion = (npcName, npcPortrait, messages, options = {}) => {
      return this.createSequentialDiscussion(npcName, npcPortrait, messages, options);
    };
    
    // ✅ Raccourcis globaux
    window.createCustomDiscussion = window.DialogueAPI.createCustomDiscussion;
    window.createSequentialDiscussion = window.DialogueAPI.createSequentialDiscussion;
    
    // ✅ API de contrôle
    window.BaseInteractionManager = {
      getInstance: () => this,
      interact: (target, options) => this.manualInteraction(target, options),
      blockInteractions: (duration, reason) => this.blockInteractions(duration, reason),
      unblockInteractions: () => this.unblockInteractions(),
      getStats: () => this.getDebugInfo()
    };
    
    console.log('[BaseInteractionManager] ✅ API globale exposée');
  }

  // === MÉTHODES PUBLIQUES ===

  manualInteraction(target, options = {}) {
    console.log('[BaseInteractionManager] 🔧 Interaction manuelle:', target);
    
    if (!target) {
      console.error('[BaseInteractionManager] ❌ Cible manquante');
      return false;
    }
    
    // ✅ Déterminer le type de cible
    let targetType = options.type;
    if (!targetType) {
      // ✅ Auto-détection basique
      if (target.properties || target.name) {
        targetType = INTERACTION_TYPES.NPC;
      } else {
        targetType = INTERACTION_TYPES.OBJECT;
      }
    }
    
    // ✅ Créer info de cible
    const targetInfo = {
      type: targetType,
      target: target,
      priority: options.priority || INTERACTION_PRIORITIES.NORMAL,
      distance: this.calculateDistance(target)
    };
    
    // ✅ Déléguer
    return this.delegateToModule(targetInfo);
  }

  blockInteractions(duration = 5000, reason = "Interactions bloquées") {
    console.log(`[BaseInteractionManager] 🚫 Blocage interactions: ${duration}ms (${reason})`);
    this.state.blockedUntil = Date.now() + duration;
    
    if (this.callbacks.onInputBlocked) {
      this.callbacks.onInputBlocked(reason);
    }
  }

  unblockInteractions() {
    console.log('[BaseInteractionManager] 🔓 Déblocage interactions');
    this.state.blockedUntil = 0;
  }

  setInputBlocked(blocked) {
    console.log(`[BaseInteractionManager] ${blocked ? '🚫' : '🔓'} Input ${blocked ? 'bloqué' : 'débloqué'}`);
    this.state.inputBlocked = blocked;
  }

  // === MÉTHODES DE DIALOGUE (Compatibilité) ===

  createCustomDiscussion(npcName, npcPortrait, text, options = {}) {
    console.log('[BaseInteractionManager] 💬 === DIALOGUE PERSONNALISÉ ===');
    
    // ✅ Déléguer au module NPC si disponible
    const npcModule = this.modules.npcInteractionManager;
    if (npcModule && typeof npcModule.createCustomDiscussion === 'function') {
      return npcModule.createCustomDiscussion(npcName, npcPortrait, text, options);
    }
    
    // ✅ Fallback vers système dialogue global
    if (typeof window.showNpcDialogue !== 'function') {
      console.error('[BaseInteractionManager] ❌ Système dialogue non disponible');
      return false;
    }
    
    try {
      let lines = Array.isArray(text) ? text : [text];
      lines = lines.filter(line => line && line.trim());
      
      if (lines.length === 0) {
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
      
      window.showNpcDialogue(dialogueData);
      return true;
      
    } catch (error) {
      console.error('[BaseInteractionManager] ❌ Erreur dialogue personnalisé:', error);
      return false;
    }
  }

  createSequentialDiscussion(npcName, npcPortrait, messages, options = {}) {
    console.log('[BaseInteractionManager] 💬 === DIALOGUE SÉQUENTIEL ===');
    
    // ✅ Déléguer au module NPC si disponible
    const npcModule = this.modules.npcInteractionManager;
    if (npcModule && typeof npcModule.createSequentialDiscussion === 'function') {
      return npcModule.createSequentialDiscussion(npcName, npcPortrait, messages, options);
    }
    
    // ✅ Fallback simple
    console.warn('[BaseInteractionManager] ⚠️ Fallback dialogue séquentiel - fonctionnalité limitée');
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }
    
    // ✅ Afficher seulement le premier message pour compatibilité
    const firstMessage = messages[0];
    const messageText = typeof firstMessage === 'object' ? firstMessage.text : firstMessage;
    
    return this.createCustomDiscussion(npcName, npcPortrait, messageText, options);
  }

  // === UTILITAIRES ===

  showInteractionMessage(message, type = 'info') {
    console.log(`[BaseInteractionManager] 💬 Message: ${message} (${type})`);
    
    if (typeof window.showGameNotification === 'function') {
      try {
        window.showGameNotification(message, type, { 
          duration: 3000,
          position: 'bottom-center'
        });
      } catch (error) {
        console.error('[BaseInteractionManager] ❌ Erreur notification:', error);
        console.log(`[BaseInteractionManager] ${type.toUpperCase()}: ${message}`);
      }
    } else {
      console.log(`[BaseInteractionManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  // === STATISTIQUES ===

  updateInteractionStats(type, success) {
    if (success) {
      const current = this.stats.interactionsByType.get(type) || 0;
      this.stats.interactionsByType.set(type, current + 1);
    }
  }

  updateDelegationStats(moduleName) {
    const current = this.stats.moduleDelegations.get(moduleName) || 0;
    this.stats.moduleDelegations.set(moduleName, current + 1);
  }

  updateAverageResponseTime(duration) {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = duration;
    } else {
      this.stats.averageResponseTime = (this.stats.averageResponseTime + duration) / 2;
    }
  }

  // === CALLBACKS PUBLICS ===

  onInteractionStart(callback) { this.callbacks.onInteractionStart = callback; }
  onInteractionComplete(callback) { this.callbacks.onInteractionComplete = callback; }
  onInteractionError(callback) { this.callbacks.onInteractionError = callback; }
  onTargetDetected(callback) { this.callbacks.onTargetDetected = callback; }
  onModuleDelegation(callback) { this.callbacks.onModuleDelegation = callback; }
  onInputBlocked(callback) { this.callbacks.onInputBlocked = callback; }

  // === CONFIGURATION ===

  setConfig(newConfig) {
    console.log('[BaseInteractionManager] 🔧 Mise à jour configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
    
    // ✅ Propager aux modules
    if (newConfig.maxInteractionDistance && this.modules.npcInteractionManager) {
      this.modules.npcInteractionManager.setConfig({
        maxInteractionDistance: newConfig.maxInteractionDistance
      });
    }
  }

  // === DEBUG ===

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      sceneKey: this.scene?.scene?.key,
      state: this.state,
      config: this.config,
      stats: {
        ...this.stats,
        interactionsByType: Object.fromEntries(this.stats.interactionsByType),
        moduleDelegations: Object.fromEntries(this.stats.moduleDelegations),
        successRate: this.stats.totalInteractions > 0 
          ? ((this.stats.totalInteractions - this.stats.errors) / this.stats.totalInteractions * 100).toFixed(1) + '%'
          : '0%'
      },
      modules: Object.fromEntries(
        Object.entries(this.modules).map(([key, value]) => [key, !!value])
      ),
      dependencies: Object.fromEntries(
        Object.entries(this.dependencies).map(([key, value]) => [key, !!value])
      ),
      detectors: Array.from(this.targetDetectors.keys())
    };
  }

  resetStats() {
    console.log('[BaseInteractionManager] 🔄 Reset statistiques');
    
    this.stats = {
      totalInteractions: 0,
      interactionsByType: new Map(),
      moduleDelegations: new Map(),
      inputEvents: 0,
      blockedInputs: 0,
      errors: 0,
      averageResponseTime: 0,
      lastInteractionDuration: 0
    };
    
    // ✅ Reset stats des modules
    if (this.modules.npcInteractionManager?.resetStats) {
      this.modules.npcInteractionManager.resetStats();
    }
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('[BaseInteractionManager] 💀 === DESTRUCTION ===');
    
    // ✅ Nettoyer input handlers
    this.cleanupExistingInputHandlers();
    
    // ✅ Détruire les modules
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });
    
    // ✅ Nettoyer API globale
    if (window.DialogueAPI) {
      delete window.DialogueAPI;
    }
    if (window.createCustomDiscussion) {
      delete window.createCustomDiscussion;
    }
    if (window.createSequentialDiscussion) {
      delete window.createSequentialDiscussion;
    }
    if (window.BaseInteractionManager) {
      delete window.BaseInteractionManager;
    }
    
    // ✅ Nettoyer callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    // ✅ Nettoyer collections
    this.targetDetectors.clear();
    this.stats.interactionsByType.clear();
    this.stats.moduleDelegations.clear();
    
    // ✅ Reset état
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[BaseInteractionManager] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugBaseInteractionManager = function() {
  if (window.BaseInteractionManager) {
    const instance = window.BaseInteractionManager.getInstance();
    if (instance) {
      const info = instance.getDebugInfo();
      console.log('[BaseInteractionManager] === DEBUG INFO ===');
      console.table({
        'Interactions Totales': info.stats.totalInteractions,
        'Erreurs': info.stats.errors,
        'Taux de Succès': info.stats.successRate,
        'Inputs': info.stats.inputEvents,
        'Inputs Bloqués': info.stats.blockedInputs,
        'Temps Moyen': `${info.stats.averageResponseTime.toFixed(0)}ms`
      });
      console.log('[BaseInteractionManager] Info complète:', info);
      return info;
    }
  }
  console.error('[BaseInteractionManager] Instance non trouvée');
  return null;
};

console.log('✅ BaseInteractionManager chargé!');
console.log('🔍 Utilisez window.debugBaseInteractionManager() pour diagnostiquer');
