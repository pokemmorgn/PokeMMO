// client/src/modules/NpcInteractionManager.js
// ✅ VERSION MISE À JOUR POUR DIALOGUEMANAGER
// ✅ Support complet du nouveau système de dialogue modulaire

import { 
  INTERACTION_TYPES, 
  INTERACTION_RESULT_TYPES, 
  NPC_INTERACTION_TYPES,
  InteractionValidator,
  InteractionHelpers,
  INTERACTION_CONFIG
} from '../types/InteractionTypes.js';

export class NpcInteractionManager {
  constructor(scene, networkInteractionHandler) {
    this.scene = scene;
    this.networkHandler = networkInteractionHandler;
    this.isInitialized = false;
    
    // ✅ Dépendances systèmes (injection mise à jour)
    this.dependencies = {
      npcManager: null,
      playerManager: null,
      questSystem: null,
      shopSystem: null,
      // ✅ MISE À JOUR : Support des deux systèmes de dialogue
      dialogueManager: null,      // Nouveau système (priorité)
      legacyDialogueSystem: null  // Ancien système (fallback)
    };
    
    // ✅ État des interactions NPC
    this.state = {
      lastInteractedNpc: null,
      currentInteractionType: null,
      isProcessingInteraction: false,
      lastInteractionTime: 0,
      blockedUntil: 0,
      // ✅ État interface unifiée
      currentUnifiedInterface: null,
      lastUnifiedInterfaceTime: 0,
      unifiedInterfaceActive: false
    };
    
    // ✅ Système de détection NPC
    this.npcDetectors = new Map();
    this.registerBuiltinDetectors();
    
    // ✅ Handlers spécialisés par type NPC
    this.npcHandlers = new Map();
    this.registerBuiltinHandlers();
    
    // ✅ Callbacks
    this.callbacks = {
      onNpcInteractionStart: null,
      onNpcInteractionComplete: null,
      onNpcInteractionError: null,
      onNpcTypeDetected: null,
      onSystemDelegation: null,
      // ✅ Callbacks interface unifiée
      onUnifiedInterfaceShow: null,
      onUnifiedInterfaceHide: null,
      onUnifiedTabSwitch: null
    };
    
    // ✅ Configuration
    this.config = {
      maxInteractionDistance: INTERACTION_CONFIG.MAX_INTERACTION_DISTANCE,
      interactionCooldown: INTERACTION_CONFIG.DEFAULT_INTERACTION_COOLDOWN,
      enableAutoDetection: true,
      enableSystemDelegation: true,
      debugMode: INTERACTION_CONFIG.ENABLE_DEBUG_LOGS,
      // ✅ Configuration interface unifiée
      enableUnifiedInterface: true,
      unifiedInterfaceTimeout: 30000, // 30 secondes max
      defaultUnifiedTab: 'auto', // 'auto' utilise defaultAction du serveur
      // ✅ NOUVEAU : Configuration système dialogue
      preferNewDialogueSystem: true, // Préférer le nouveau DialogueManager
      enableDialogueFallback: true   // Fallback vers ancien système si nécessaire
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalInteractions: 0,
      interactionsByType: new Map(),
      systemDelegations: new Map(),
      errors: 0,
      successfulInteractions: 0,
      // ✅ Stats interface unifiée
      unifiedInterfacesShown: 0,
      unifiedInterfacesByCapabilities: new Map(),
      tabSwitches: 0,
      // ✅ NOUVEAU : Stats système dialogue
      newDialogueSystemUsed: 0,
      legacyDialogueSystemUsed: 0,
      dialogueSystemDetections: 0
    };
    
    console.log('[NpcInteractionManager] 🎭 Créé avec support DialogueManager:', this.scene.scene.key);
  }

  // === INITIALISATION MISE À JOUR ===

  initialize(dependencies = {}) {
    console.log('[NpcInteractionManager] 🚀 === INITIALISATION AVEC DIALOGUEMANAGER ===');
    
    // ✅ Injection des dépendances MISE À JOUR
    this.dependencies = {
      npcManager: dependencies.npcManager || this.scene.npcManager,
      playerManager: dependencies.playerManager || this.scene.playerManager,
      questSystem: dependencies.questSystem || window.questSystem || window.questSystemGlobal,
      shopSystem: dependencies.shopSystem || this.scene.shopIntegration?.getShopSystem() || window.shopSystem,
      // ✅ MISE À JOUR : Détecter le nouveau système de dialogue
      dialogueManager: dependencies.dialogueManager || this.detectDialogueManager(),
      legacyDialogueSystem: dependencies.legacyDialogueSystem || this.detectLegacyDialogueSystem()
    };
    
    console.log('[NpcInteractionManager] 📦 Dépendances détectées:');
    Object.entries(this.dependencies).forEach(([key, value]) => {
      const status = this.getSystemStatus(key, value);
      console.log(`  ${key}: ${status}`);
    });
    
    // ✅ Vérifier quel système dialogue utiliser
    this.determineDialogueSystem();
    
    // ✅ Configurer les callbacks réseau
    this.setupNetworkCallbacks();
    
    // ✅ Configurer callbacks interface unifiée
    this.setupUnifiedInterfaceCallbacks();
    
    this.isInitialized = true;
    console.log('[NpcInteractionManager] ✅ Initialisé avec DialogueManager');
    
    return this;
  }

  // ✅ NOUVELLE MÉTHODE : Détecter le nouveau DialogueManager
  detectDialogueManager() {
    this.stats.dialogueSystemDetections++;
    
    // 1. Vérifier window.dialogueManager
    if (window.dialogueManager && typeof window.dialogueManager.show === 'function') {
      console.log('[NpcInteractionManager] ✅ DialogueManager détecté (window.dialogueManager)');
      return window.dialogueManager;
    }
    
    // 2. Vérifier dans les dépendances explicites
    if (window.dialogueSystemGlobal && typeof window.dialogueSystemGlobal.show === 'function') {
      console.log('[NpcInteractionManager] ✅ DialogueManager détecté (window.dialogueSystemGlobal)');
      return window.dialogueSystemGlobal;
    }
    
    // 3. Vérifier dans la scène
    if (this.scene.dialogueManager && typeof this.scene.dialogueManager.show === 'function') {
      console.log('[NpcInteractionManager] ✅ DialogueManager détecté (scene.dialogueManager)');
      return this.scene.dialogueManager;
    }
    
    console.log('[NpcInteractionManager] ⚠️ Nouveau DialogueManager non détecté');
    return null;
  }

  // ✅ NOUVELLE MÉTHODE : Détecter l'ancien système de dialogue
  detectLegacyDialogueSystem() {
    // 1. Fonction showNpcDialogue
    if (typeof window.showNpcDialogue === 'function') {
      console.log('[NpcInteractionManager] ✅ Ancien système détecté (window.showNpcDialogue)');
      return window.showNpcDialogue;
    }
    
    // 2. Fonction showDialogue
    if (typeof window.showDialogue === 'function') {
      console.log('[NpcInteractionManager] ✅ Ancien système détecté (window.showDialogue)');
      return window.showDialogue;
    }
    
    console.log('[NpcInteractionManager] ⚠️ Ancien système dialogue non détecté');
    return null;
  }

  // ✅ NOUVELLE MÉTHODE : Déterminer quel système utiliser
  determineDialogueSystem() {
    const hasNew = !!this.dependencies.dialogueManager;
    const hasLegacy = !!this.dependencies.legacyDialogueSystem;
    
    if (hasNew && this.config.preferNewDialogueSystem) {
      console.log('[NpcInteractionManager] 🎭 Utilisation du nouveau DialogueManager');
      this.activeDialogueSystem = 'new';
    } else if (hasLegacy && this.config.enableDialogueFallback) {
      console.log('[NpcInteractionManager] 🎭 Utilisation de l\'ancien système dialogue');
      this.activeDialogueSystem = 'legacy';
    } else if (hasNew) {
      console.log('[NpcInteractionManager] 🎭 Utilisation du DialogueManager (fallback)');
      this.activeDialogueSystem = 'new';
    } else if (hasLegacy) {
      console.log('[NpcInteractionManager] 🎭 Utilisation de l\'ancien système (fallback)');
      this.activeDialogueSystem = 'legacy';
    } else {
      console.error('[NpcInteractionManager] ❌ Aucun système dialogue disponible !');
      this.activeDialogueSystem = null;
    }
    
    console.log(`[NpcInteractionManager] Système dialogue actif: ${this.activeDialogueSystem}`);
  }

  // ✅ NOUVELLE MÉTHODE : Obtenir le statut d'un système
  getSystemStatus(systemName, system) {
    if (!system) return '❌ Non détecté';
    
    switch (systemName) {
      case 'dialogueManager':
        return typeof system.show === 'function' ? '✅ DialogueManager' : '⚠️ Invalide';
      case 'legacyDialogueSystem':
        return typeof system === 'function' ? '✅ Legacy' : '⚠️ Invalide';
      case 'shopSystem':
        return system.isShopOpen ? '✅ ShopSystem' : '⚠️ Incomplet';
      default:
        return '✅ Détecté';
    }
  }

  setupNetworkCallbacks() {
    if (!this.networkHandler) {
      console.warn('[NpcInteractionManager] ⚠️ Pas de NetworkHandler - callbacks non configurés');
      return;
    }
    
    console.log('[NpcInteractionManager] 🔗 Configuration callbacks réseau...');
    
    // ✅ Callback pour résultats d'interaction NPC
    this.networkHandler.onNpcInteraction((data) => {
      console.log('[NpcInteractionManager] 📨 Résultat interaction reçu:', data);
      this.handleNetworkInteractionResult(data);
    });

    // ✅ Callback spécialisé pour interface unifiée
    this.networkHandler.onUnifiedInterfaceResult((data) => {
      console.log('[NpcInteractionManager] 🎭 Résultat interface unifiée reçu:', data);
      this.handleUnifiedInterfaceResult(data);
    });
    
    console.log('[NpcInteractionManager] ✅ Callbacks réseau configurés');
  }

  setupUnifiedInterfaceCallbacks() {
    // Setup des événements globaux pour interface unifiée
    if (typeof window !== 'undefined') {
      // Callback global pour fermeture interface unifiée
      window.closeUnifiedNpcInterface = () => {
        this.closeUnifiedInterface();
      };

      // Callback global pour changement d'onglet
      window.switchUnifiedTab = (tabName) => {
        this.switchUnifiedTab(tabName);
      };

      console.log('[NpcInteractionManager] ✅ Callbacks globaux interface unifiée configurés');
    }
  }

  // === DÉTECTEURS DE TYPE NPC ===

  registerBuiltinDetectors() {
    console.log('[NpcInteractionManager] 🔍 Enregistrement détecteurs de type...');
    
    // ✅ Détecteur marchand
    this.registerNpcDetector(NPC_INTERACTION_TYPES.MERCHANT, (npc) => {
      if (!npc?.properties) return false;
      
      const merchantProperties = ['npcType', 'shopId', 'shop', 'merchant', 'store'];
      for (const prop of merchantProperties) {
        const value = npc.properties[prop];
        if (value === 'merchant' || value === 'shop' || value === true ||
          (typeof value === 'string' && value.toLowerCase().includes('shop'))) {
          return true;
        }
      }
      
      // Vérification par nom
      if (npc.name && (
        npc.name.toLowerCase().includes('marchand') ||
        npc.name.toLowerCase().includes('merchant') ||
        npc.name.toLowerCase().includes('shop') ||
        npc.name.toLowerCase().includes('magasin')
      )) {
        return true;
      }
      
      return false;
    });
    
    // ✅ Détecteur donneur de quêtes
    this.registerNpcDetector(NPC_INTERACTION_TYPES.QUEST_GIVER, (npc) => {
      if (!npc?.properties) return false;
      
      return !!(
        npc.properties.npcType === 'questGiver' ||
        npc.properties.questId ||
        npc.properties.quest ||
        npc.properties.hasQuest === true ||
        npc.properties.questGiver === true
      );
    });
    
    // ✅ Détecteur soigneur
    this.registerNpcDetector(NPC_INTERACTION_TYPES.HEALER, (npc) => {
      if (!npc?.properties) return false;
      
      return !!(
        npc.properties.npcType === 'healer' ||
        npc.properties.heal === true ||
        npc.properties.pokemonCenter === true ||
        (npc.name && npc.name.toLowerCase().includes('infirmière'))
      );
    });
    
    // ✅ Détecteur table starter
    this.registerNpcDetector(NPC_INTERACTION_TYPES.STARTER_SELECTOR, (npc) => {
      return !!(npc?.properties?.startertable === true);
    });
    
    // ✅ Détecteur dialogue générique (priorité la plus basse)
    this.registerNpcDetector(NPC_INTERACTION_TYPES.DIALOGUE, () => true, 99);
    
    console.log(`[NpcInteractionManager] ✅ ${this.npcDetectors.size} détecteurs enregistrés`);
  }

  registerNpcDetector(type, detector, priority = 50) {
    console.log(`[NpcInteractionManager] 📝 Enregistrement détecteur: ${type} (priorité: ${priority})`);
    
    this.npcDetectors.set(type, {
      type: type,
      detector: detector,
      priority: priority,
      description: `Détecteur pour ${type}`
    });
  }

  // === HANDLERS SPÉCIALISÉS ===

  registerBuiltinHandlers() {
    console.log('[NpcInteractionManager] ⚙️ Enregistrement handlers...');
    
    // ✅ Handler marchand
    this.registerNpcHandler(NPC_INTERACTION_TYPES.MERCHANT, (npc, data) => {
      return this.handleMerchantInteraction(npc, data);
    });
    
    // ✅ Handler quêtes
    this.registerNpcHandler(NPC_INTERACTION_TYPES.QUEST_GIVER, (npc, data) => {
      return this.handleQuestInteraction(npc, data);
    });
    
    // ✅ Handler soigneur
    this.registerNpcHandler(NPC_INTERACTION_TYPES.HEALER, (npc, data) => {
      return this.handleHealerInteraction(npc, data);
    });
    
    // ✅ Handler starter
    this.registerNpcHandler(NPC_INTERACTION_TYPES.STARTER_SELECTOR, (npc, data) => {
      return this.handleStarterInteraction(npc, data);
    });
    
    // ✅ Handler dialogue (fallback)
    this.registerNpcHandler(NPC_INTERACTION_TYPES.DIALOGUE, (npc, data) => {
      return this.handleDialogueInteraction(npc, data);
    });
    
    console.log(`[NpcInteractionManager] ✅ ${this.npcHandlers.size} handlers enregistrés`);
  }

  registerNpcHandler(type, handler) {
    console.log(`[NpcInteractionManager] 🔧 Enregistrement handler: ${type}`);
    
    this.npcHandlers.set(type, {
      type: type,
      handler: handler,
      registeredAt: Date.now()
    });
  }

  // === LOGIQUE PRINCIPALE D'INTERACTION ===

  async interactWithNpc(npc, options = {}) {
    console.log('[NpcInteractionManager] 🎯 === INTERACTION NPC ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name || 'unknown');
    console.log('[NpcInteractionManager] Options:', options);
    
    // ✅ Vérifications préliminaires
    if (!this.canInteractWithNpc(npc)) {
      return false;
    }
    
    try {
      this.state.isProcessingInteraction = true;
      this.state.lastInteractedNpc = npc;
      this.state.lastInteractionTime = Date.now();
      
      // ✅ Détecter le type d'interaction
      const interactionType = this.detectNpcInteractionType(npc);
      if (!interactionType) {
        throw new Error(`Type d'interaction non déterminé pour NPC: ${npc.name}`);
      }
      
      console.log(`[NpcInteractionManager] Type détecté: ${interactionType}`);
      this.state.currentInteractionType = interactionType;
      
      // ✅ Callback de début
      if (this.callbacks.onNpcInteractionStart) {
        this.callbacks.onNpcInteractionStart(npc, interactionType);
      }
      
      // ✅ Envoyer l'interaction au serveur
      const networkResult = await this.sendNpcInteraction(npc, options);
      if (!networkResult) {
        throw new Error('Échec envoi interaction réseau');
      }
      
      // ✅ Mise à jour statistiques
      this.updateStats(interactionType, true);
      
      console.log('[NpcInteractionManager] ✅ Interaction envoyée avec succès');
      return true;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur interaction:', error);
      
      this.updateStats(this.state.currentInteractionType, false);
      this.handleInteractionError(error, npc);
      
      return false;
      
    } finally {
      // ✅ Reset état après délai
      setTimeout(() => {
        this.state.isProcessingInteraction = false;
        this.state.currentInteractionType = null;
      }, 100);
    }
  }

  async sendNpcInteraction(npc, options = {}) {
    console.log('[NpcInteractionManager] 📤 Envoi interaction réseau...');
    
    if (!this.networkHandler) {
      console.error('[NpcInteractionManager] ❌ Pas de NetworkHandler');
      return false;
    }
    
    try {
      const npcId = npc.id;
      
      // ✅ Créer données d'interaction avec types corrects
      const playerPosition = this.getPlayerPosition();
      const interactionData = InteractionHelpers.createNpcInteraction(
        npcId,
        this.networkHandler.networkManager.sessionId,
        this.networkHandler.networkManager.currentZone,
        playerPosition,
        {
          npcName: npc.name,
          interactionType: this.state.currentInteractionType,
          ...options
        }
      );
      
      // ✅ Validation côté client
      const validation = InteractionValidator.validate(INTERACTION_TYPES.NPC, interactionData);
      if (!validation.isValid) {
        console.warn('[NpcInteractionManager] ⚠️ Validation échouée:', validation.errors);
      } else {
        console.log('[NpcInteractionManager] ✅ Validation client réussie');
      }
      
      // ✅ Envoyer l'interaction
      const result = this.networkHandler.sendNpcInteract(npcId, interactionData);
      
      console.log(`[NpcInteractionManager] Résultat envoi: ${result}`);
      return result;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur envoi:', error);
      return false;
    }
  }

  // === GESTION DES RÉSULTATS RÉSEAU ===

handleNetworkInteractionResult(data) {
  console.log('[NpcInteractionManager] 🔄 === TRAITEMENT RÉSULTAT RÉSEAU ===');
  console.log('[NpcInteractionManager] Data:', data);
  
  // ✅ FORCER L'AFFICHAGE COMPLET DES DONNÉES
  console.log('[NpcInteractionManager] 🔍 === DEBUG COMPLET DONNÉES ===');
  console.log('[NpcInteractionManager] JSON.stringify(data):', JSON.stringify(data, null, 2));
  console.log('[NpcInteractionManager] Object.keys(data):', Object.keys(data));
  console.log('[NpcInteractionManager] Champs critiques:', {
    type: data.type,
    npcId: data.npcId,
    npcName: data.npcName,
    isUnifiedInterface: data.isUnifiedInterface,
    capabilities: data.capabilities,
    contextualData: data.contextualData,
    shopId: data.shopId,
    shopData: data.shopData
  });
  
  try {
    // ✅ DÉTECTION AMÉLIORÉE : Vérifier plusieurs critères
    const isUnifiedInterface = (
      data.isUnifiedInterface === true ||
      data.type === 'unifiedInterface' ||  
      (data.unifiedInterface && typeof data.unifiedInterface === 'object') ||
      (data.capabilities && Array.isArray(data.capabilities) && data.capabilities.length > 0) ||
      (data.contextualData && typeof data.contextualData === 'object')
    );
    
    if (isUnifiedInterface) {
      console.log('[NpcInteractionManager] 🎭 Interface unifiée détectée - traitement prioritaire');
      console.log('[NpcInteractionManager] 🔍 Critères détection:', {
        typeMatch: data.type === 'unifiedInterface',
        flagExplicit: data.isUnifiedInterface === true,
        hasUnifiedObj: !!(data.unifiedInterface),
        hasCapabilities: !!(data.capabilities && data.capabilities.length > 0),
        hasContextualData: !!(data.contextualData)
      });
      return this.handleUnifiedInterfaceResult(data);
    }
    
    // ✅ Traitement normal pour NPCs simples
    console.log('[NpcInteractionManager] 📝 Traitement NPC simple');
    const resultType = this.determineResultType(data);
    console.log(`[NpcInteractionManager] Type de résultat (NPC simple): ${resultType}`);
    
    // ✅ Obtenir le handler approprié
    const handler = this.npcHandlers.get(resultType);
    if (!handler) {
      console.warn(`[NpcInteractionManager] ⚠️ Pas de handler pour: ${resultType}`);
      this.handleGenericResult(data);
      return;
    }
    
    // ✅ Récupérer le NPC
    const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
    if (!npc) {
      console.warn('[NpcInteractionManager] ⚠️ NPC non trouvé pour résultat');
    }
    
    // ✅ Appeler le handler spécialisé
    const result = handler.handler(npc, data);
    
    // ✅ Callback de complétion
    if (this.callbacks.onNpcInteractionComplete) {
      this.callbacks.onNpcInteractionComplete(npc, data, result);
    }
    
    console.log('[NpcInteractionManager] ✅ Résultat NPC simple traité avec succès');
    
  } catch (error) {
    console.error('[NpcInteractionManager] ❌ Erreur traitement résultat:', error);
    this.handleInteractionError(error, null, data);
  }
}

  // === GESTION INTERFACE UNIFIÉE ===

handleUnifiedInterfaceResult(data) {
  console.log('[NpcInteractionManager] 🎭 === HANDLER INTERFACE UNIFIÉE AMÉLIORÉ ===');
  
  // ✅ EXTRACTION CORRIGÉE : Les données sont dans l'objet racine
  const interfaceData = {
    npcId: data.npcId,                                    // ✅ Directement dans data
    npcName: data.npcName,                                // ✅ Directement dans data
    capabilities: data.capabilities || [],               // ✅ Directement dans data
    defaultAction: data.contextualData?.defaultAction || data.capabilities?.[0],
    quickActions: data.contextualData?.quickActions || [],
    contextualData: data.contextualData,
    
    // ✅ Données interface unifiée (si présentes)
    ...(data.unifiedInterface || {}),
    
    // ✅ Reconstruire données par capability
    merchantData: data.shopData ? {
      shopId: data.shopId,
      shopInfo: data.shopData.shopInfo || { name: data.npcName },
      availableItems: data.shopData.availableItems || []
    } : undefined,
    
    dialogueData: {
      lines: data.lines || [data.message || "Bonjour !"]
    }
  };
  
  const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
  
  console.log('[NpcInteractionManager] Interface Data extraite:', {
    npcId: interfaceData.npcId,
    npcName: interfaceData.npcName,
    capabilities: interfaceData.capabilities,
    defaultAction: interfaceData.defaultAction,
    hasContextualData: !!data.contextualData,
    quickActionsCount: interfaceData.quickActions?.length || 0
  });
  
  try {
    // ✅ Validation simple mais efficace
    if (!interfaceData.npcId) {
      throw new Error('NPC ID manquant');
    }
    
    if (!interfaceData.capabilities || interfaceData.capabilities.length === 0) {
      throw new Error('Capabilities manquantes');
    }
    
    // ✅ Stocker l'état
    this.state.currentUnifiedInterface = interfaceData;
    this.state.unifiedInterfaceActive = true;
    
    // ✅ Afficher interface
    const success = this.showUnifiedNpcInterface(interfaceData, npc);
    
    if (success) {
      console.log('[NpcInteractionManager] ✅ Interface unifiée affichée avec succès');
      this.updateUnifiedStats(interfaceData);
      return true;
    } else {
      throw new Error('Échec affichage interface');
    }
    
  } catch (error) {
    console.error('[NpcInteractionManager] ❌ Erreur interface unifiée:', error);
    
    // ✅ Fallback intelligent
    return this.handleDialogueInteraction(npc, {
      message: data.message || data.lines?.[0] || "Bonjour !",
      lines: data.lines || [data.message || "Bonjour !"],
      name: data.npcName || npc?.name,
      
      // ✅ Préserver actions disponibles
      availableActions: this.deriveActionsFromData(data)
    });
  }
}

  validateUnifiedInterface(interfaceData) {
    if (!interfaceData) {
      console.error('[NpcInteractionManager] ❌ Pas de données interface');
      return false;
    }
    
    if (!interfaceData.npcId) {
      console.error('[NpcInteractionManager] ❌ NPC ID manquant');
      return false;
    }
    
    if (!interfaceData.capabilities || !Array.isArray(interfaceData.capabilities)) {
      console.error('[NpcInteractionManager] ❌ Capabilities invalides');
      return false;
    }
    
    if (interfaceData.capabilities.length === 0) {
      console.error('[NpcInteractionManager] ❌ Aucune capability');
      return false;
    }
    
    console.log('[NpcInteractionManager] ✅ Interface unifiée valide');
    return true;
  }

  // ✅ MÉTHODE MISE À JOUR : Support DialogueManager
  showUnifiedNpcInterface(interfaceData, npc) {
    console.log('[NpcInteractionManager] 🖼️ === AFFICHAGE INTERFACE UNIFIÉE ===');
    
    // ✅ Préparer les données pour le système dialogue étendu
    const unifiedDialogueData = this.prepareUnifiedDialogueData(interfaceData, npc);
    
    // ✅ MISE À JOUR : Utiliser le bon système dialogue
    const success = this.callDialogueSystem(unifiedDialogueData);
    
    if (success) {
      console.log('[NpcInteractionManager] ✅ Données dialogue unifié préparées');
      return true;
    } else {
      console.error('[NpcInteractionManager] ❌ Système dialogue non disponible');
      this.showErrorMessage("Système de dialogue non disponible");
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Appeler le bon système dialogue
  callDialogueSystem(dialogueData) {
    console.log('[NpcInteractionManager] 🎭 === APPEL SYSTÈME DIALOGUE ===');
    console.log(`[NpcInteractionManager] Système actif: ${this.activeDialogueSystem}`);
    
    try {
      if (this.activeDialogueSystem === 'new' && this.dependencies.dialogueManager) {
        // ✅ Utiliser le nouveau DialogueManager
        console.log('[NpcInteractionManager] 🆕 Utilisation DialogueManager.show()');
        this.dependencies.dialogueManager.show(dialogueData);
        this.stats.newDialogueSystemUsed++;
        this.updateDelegationStats('NewDialogueManager');
        return true;
        
      } else if (this.activeDialogueSystem === 'legacy' && this.dependencies.legacyDialogueSystem) {
        // ✅ Utiliser l'ancien système
        console.log('[NpcInteractionManager] 🔄 Utilisation ancien système dialogue');
        this.dependencies.legacyDialogueSystem(dialogueData);
        this.stats.legacyDialogueSystemUsed++;
        this.updateDelegationStats('LegacyDialogueSystem');
        return true;
        
      } else {
        // ✅ Tentative de détection temps réel
        console.log('[NpcInteractionManager] 🔍 Tentative de redétection...');
        this.dependencies.dialogueManager = this.detectDialogueManager();
        this.dependencies.legacyDialogueSystem = this.detectLegacyDialogueSystem();
        this.determineDialogueSystem();
        
        // ✅ Nouvel essai après redétection
        if (this.activeDialogueSystem === 'new' && this.dependencies.dialogueManager) {
          console.log('[NpcInteractionManager] 🔄 Retry avec DialogueManager détecté');
          this.dependencies.dialogueManager.show(dialogueData);
          this.stats.newDialogueSystemUsed++;
          return true;
          
        } else if (this.activeDialogueSystem === 'legacy' && this.dependencies.legacyDialogueSystem) {
          console.log('[NpcInteractionManager] 🔄 Retry avec ancien système détecté');
          this.dependencies.legacyDialogueSystem(dialogueData);
          this.stats.legacyDialogueSystemUsed++;
          return true;
          
        } else {
          console.error('[NpcInteractionManager] ❌ Aucun système dialogue utilisable après redétection');
          return false;
        }
      }
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur appel système dialogue:', error);
      
      // ✅ Fallback vers l'autre système si possible
      return this.tryDialogueFallback(dialogueData, error);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Fallback entre systèmes
  tryDialogueFallback(dialogueData, originalError) {
    console.log('[NpcInteractionManager] 🔄 === FALLBACK SYSTÈME DIALOGUE ===');
    
    try {
      if (this.activeDialogueSystem === 'new' && this.dependencies.legacyDialogueSystem) {
        console.log('[NpcInteractionManager] 🔄 Fallback vers ancien système');
        this.dependencies.legacyDialogueSystem(dialogueData);
        this.stats.legacyDialogueSystemUsed++;
        return true;
        
      } else if (this.activeDialogueSystem === 'legacy' && this.dependencies.dialogueManager) {
        console.log('[NpcInteractionManager] 🔄 Fallback vers DialogueManager');
        this.dependencies.dialogueManager.show(dialogueData);
        this.stats.newDialogueSystemUsed++;
        return true;
        
      } else {
        console.error('[NpcInteractionManager] ❌ Aucun fallback disponible');
        throw originalError;
      }
      
    } catch (fallbackError) {
      console.error('[NpcInteractionManager] ❌ Échec fallback:', fallbackError);
      return false;
    }
  }

  prepareUnifiedDialogueData(interfaceData, npc) {
    // ✅ Données de base du dialogue
    const baseDialogueData = this.prepareDialogueData(npc, {
      name: interfaceData.npcName || npc?.name,
      lines: interfaceData.dialogueData?.lines || ["Que puis-je faire pour vous ?"]
    });
    
    // ✅ Ajouter données spécifiques à l'interface unifiée
    const unifiedDialogueData = {
      ...baseDialogueData,
      
      // ✅ Marqueur pour mode unifié
      isUnifiedInterface: true,
      unifiedMode: true,
      
      // ✅ Données interface unifiée
      unifiedInterface: interfaceData,
      
      // ✅ Configuration onglets
      tabs: this.generateTabsFromCapabilities(interfaceData.capabilities),
      defaultTab: interfaceData.defaultAction || interfaceData.capabilities[0],
      
      // ✅ Actions rapides
      quickActions: interfaceData.quickActions || this.generateDefaultQuickActions(interfaceData),
      
      // ✅ Données pré-chargées par capability
      tabData: this.extractTabData(interfaceData),
      
      // ✅ Configuration affichage
      showTabs: true,
      showQuickActions: true,
      allowTabSwitching: true,
      
      // ✅ Callbacks spécialisés
      onTabSwitch: (tabName) => this.handleUnifiedTabSwitch(tabName, interfaceData),
      onQuickAction: (actionName) => this.handleUnifiedQuickAction(actionName, interfaceData),
      onClose: () => this.closeUnifiedInterface()
    };
    
    console.log('[NpcInteractionManager] ✅ Données dialogue unifié préparées');
    return unifiedDialogueData;
  }

  generateTabsFromCapabilities(capabilities) {
    const tabConfig = {
      merchant: { 
        id: 'shop', 
        label: 'Shop', 
        icon: '🛒', 
        description: 'Acheter et vendre des objets' 
      },
      questGiver: { 
        id: 'quest', 
        label: 'Quêtes', 
        icon: '⚔️', 
        description: 'Missions disponibles' 
      },
      healer: { 
        id: 'heal', 
        label: 'Soins', 
        icon: '🏥', 
        description: 'Soigner vos Pokémon' 
      },
      dialogue: { 
        id: 'chat', 
        label: 'Discussion', 
        icon: '💬', 
        description: 'Discuter avec le PNJ' 
      }
    };
    
    return capabilities.map(capability => {
      const config = tabConfig[capability];
      if (config) {
        return {
          id: config.id,
          capability: capability,
          label: config.label,
          icon: config.icon,
          description: config.description,
          enabled: true
        };
      } else {
        return {
          id: capability.toLowerCase(),
          capability: capability,
          label: capability.charAt(0).toUpperCase() + capability.slice(1),
          icon: '❓',
          description: `${capability} non configuré`,
          enabled: false
        };
      }
    });
  }

  extractTabData(interfaceData) {
    const tabData = {};
    
    interfaceData.capabilities?.forEach(capability => {
      const dataKey = `${capability}Data`;
      if (interfaceData[dataKey]) {
        tabData[capability] = interfaceData[dataKey];
      }
    });
    
    return tabData;
  }

  generateDefaultQuickActions(interfaceData) {
    const quickActions = [];
    
    interfaceData.capabilities?.forEach(capability => {
      switch (capability) {
        case 'merchant':
          quickActions.push({
            id: 'quick_shop',
            label: 'Ouvrir Boutique',
            icon: '🛒',
            action: 'shop',
            enabled: true
          });
          break;
          
        case 'questGiver':
          quickActions.push({
            id: 'quick_quest',
            label: 'Voir Quêtes',
            icon: '⚔️',
            action: 'quest',
            enabled: true
          });
          break;
          
        case 'healer':
          quickActions.push({
            id: 'quick_heal',
            label: 'Soins Rapides',
            icon: '🏥',
            action: 'heal',
            enabled: true
          });
          break;
      }
    });
    
    quickActions.push({
      id: 'close',
      label: 'Fermer',
      icon: '❌',
      action: 'close',
      enabled: true
    });
    
    return quickActions;
  }

  handleUnifiedTabSwitch(tabName, interfaceData) {
    console.log('[NpcInteractionManager] 🔄 === CHANGEMENT ONGLET ===');
    console.log('[NpcInteractionManager] Onglet:', tabName);
    
    this.stats.tabSwitches++;
    
    if (this.callbacks.onUnifiedTabSwitch) {
      this.callbacks.onUnifiedTabSwitch(tabName, interfaceData);
    }
    
    switch (tabName) {
      case 'shop':
      case 'merchant':
        return this.handleMerchantTab(interfaceData.merchantData);
        
      case 'quest':
      case 'questGiver':
        return this.handleQuestTab(interfaceData.questData);
        
      case 'heal':
      case 'healer':
        return this.handleHealerTab(interfaceData.healerData);
        
      case 'chat':
      case 'dialogue':
        return this.handleDialogueTab(interfaceData.dialogueData);
        
      default:
        console.warn(`[NpcInteractionManager] ⚠️ Onglet non reconnu: ${tabName}`);
        return false;
    }
  }

  handleUnifiedQuickAction(actionName, interfaceData) {
    console.log('[NpcInteractionManager] ⚡ === ACTION RAPIDE ===');
    console.log('[NpcInteractionManager] Action:', actionName);
    
    switch (actionName) {
      case 'close':
        return this.closeUnifiedInterface();
        
      case 'shop':
        return this.handleMerchantTab(interfaceData.merchantData);
        
      case 'quest':
        return this.handleQuestTab(interfaceData.questData);
        
      case 'heal':
        return this.handleHealerTab(interfaceData.healerData);
        
      default:
        console.warn(`[NpcInteractionManager] ⚠️ Action rapide non reconnue: ${actionName}`);
        return false;
    }
  }

  handleMerchantTab(merchantData) {
    console.log('[NpcInteractionManager] 🏪 Handler onglet marchand');
    return true;
  }

  handleQuestTab(questData) {
    console.log('[NpcInteractionManager] ⚔️ Handler onglet quêtes');
    return true;
  }

  handleHealerTab(healerData) {
    console.log('[NpcInteractionManager] 🏥 Handler onglet soigneur');
    return true;
  }

  handleDialogueTab(dialogueData) {
    console.log('[NpcInteractionManager] 💬 Handler onglet dialogue');
    return true;
  }

  closeUnifiedInterface() {
    console.log('[NpcInteractionManager] 🚪 === FERMETURE INTERFACE UNIFIÉE ===');
    
    if (!this.state.unifiedInterfaceActive) {
      console.log('[NpcInteractionManager] ℹ️ Aucune interface unifiée active');
      return;
    }
    
    this.state.currentUnifiedInterface = null;
    this.state.unifiedInterfaceActive = false;
    
    if (this.callbacks.onUnifiedInterfaceHide) {
      this.callbacks.onUnifiedInterfaceHide();
    }
    
    // ✅ MISE À JOUR : Fermer via le bon système
    if (this.dependencies.dialogueManager && this.dependencies.dialogueManager.hide) {
      this.dependencies.dialogueManager.hide();
    } else {
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox) {
        dialogueBox.style.display = 'none';
      }
    }
    
    console.log('[NpcInteractionManager] ✅ Interface unifiée fermée');
  }

  updateUnifiedStats(interfaceData) {
    this.stats.unifiedInterfacesShown++;
    
    const capabilitiesKey = interfaceData.capabilities.sort().join(',');
    const current = this.stats.unifiedInterfacesByCapabilities.get(capabilitiesKey) || 0;
    this.stats.unifiedInterfacesByCapabilities.set(capabilitiesKey, current + 1);
    
    console.log(`[NpcInteractionManager] 📊 Stats: ${this.stats.unifiedInterfacesShown} interfaces unifiées affichées`);
  }

  // === HANDLERS SPÉCIALISÉS (inchangés) ===

  determineResultType(data) {
    const typeMapping = {
      'shop': NPC_INTERACTION_TYPES.MERCHANT,
      'merchant': NPC_INTERACTION_TYPES.MERCHANT,
      'questGiver': NPC_INTERACTION_TYPES.QUEST_GIVER,
      'questComplete': NPC_INTERACTION_TYPES.QUEST_GIVER,
      'questProgress': NPC_INTERACTION_TYPES.QUEST_GIVER,
      'heal': NPC_INTERACTION_TYPES.HEALER,
      'starterTable': NPC_INTERACTION_TYPES.STARTER_SELECTOR,
      'dialogue': NPC_INTERACTION_TYPES.DIALOGUE
    };
    
    if (data.type && typeMapping[data.type]) {
      return typeMapping[data.type];
    }
    
    if (data.npcType && typeMapping[data.npcType]) {
      return typeMapping[data.npcType];
    }
    
    if (data.shopId || data.shopData) {
      return NPC_INTERACTION_TYPES.MERCHANT;
    }
    
    return NPC_INTERACTION_TYPES.DIALOGUE;
  }

  handleMerchantInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🏪 === HANDLER MARCHAND ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Data:', data);
    
    const shopSystem = this.dependencies.shopSystem;
    if (!shopSystem) {
      console.warn('[NpcInteractionManager] ⚠️ ShopSystem non disponible');
      return this.handleDialogueInteraction(npc, {
        message: "Ce marchand n'est pas disponible actuellement."
      });
    }
    
    try {
      console.log('[NpcInteractionManager] 🔗 Délégation vers ShopSystem...');
      
      this.updateDelegationStats('ShopSystem');
      
      if (this.callbacks.onSystemDelegation) {
        this.callbacks.onSystemDelegation('ShopSystem', npc, data);
      }
      
      const shopData = this.prepareShopData(npc, data);
      const result = shopSystem.handleShopNpcInteraction(shopData);
      
      console.log('[NpcInteractionManager] ✅ ShopSystem appelé avec succès');
      return result;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur délégation ShopSystem:', error);
      return this.handleDialogueInteraction(npc, {
        message: `Erreur boutique: ${error.message}`
      });
    }
  }

  handleQuestInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🎯 === HANDLER QUÊTE ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Data:', data);
    
    const questSystem = this.dependencies.questSystem;
    if (!questSystem?.handleNpcInteraction) {
      console.warn('[NpcInteractionManager] ⚠️ QuestSystem non disponible');
      return this.handleDialogueInteraction(npc, {
        message: data?.message || "Système de quêtes non disponible",
        lines: data?.lines || ["Système de quêtes non disponible"],
        name: data?.name || npc?.name || "PNJ"
      });
    }
    
    try {
      console.log('[NpcInteractionManager] 🔗 Délégation vers QuestSystem...');
      
      this.updateDelegationStats('QuestSystem');
      
      if (this.callbacks.onSystemDelegation) {
        this.callbacks.onSystemDelegation('QuestSystem', npc, data);
      }
      
      const result = questSystem.handleNpcInteraction(data || npc, 'NpcInteractionManager');
      
      console.log('[NpcInteractionManager] ✅ QuestSystem appelé, résultat:', result);
      return result;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur délégation QuestSystem:', error);
      return this.handleDialogueInteraction(npc, data);
    }
  }

  handleHealerInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🏥 === HANDLER SOIGNEUR ===');
    
    const healData = data || {
      type: "heal",
      npcId: npc?.id,
      npcName: npc?.name || "Infirmière",
      message: "Vos Pokémon sont maintenant en pleine forme !",
      portrait: "/assets/portrait/nurse.png"
    };
    
    return this.handleDialogueInteraction(npc, healData);
  }

  handleStarterInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🎮 === HANDLER STARTER ===');
    
    if (this.scene.showStarterSelection) {
      console.log('[NpcInteractionManager] 🔗 Délégation vers scene.showStarterSelection');
      
      this.updateDelegationStats('StarterSelection');
      
      try {
        this.scene.showStarterSelection(data?.availableStarters);
        return true;
      } catch (error) {
        console.error('[NpcInteractionManager] ❌ Erreur StarterSelection:', error);
        return this.handleDialogueInteraction(npc, {
          message: "Erreur du système de sélection starter"
        });
      }
    } else {
      console.error('[NpcInteractionManager] ❌ showStarterSelection non disponible');
      return this.handleDialogueInteraction(npc, {
        message: "Système starter non disponible"
      });
    }
  }

  // ✅ HANDLER DIALOGUE MISE À JOUR
  handleDialogueInteraction(npc, data) {
    console.log('[NpcInteractionManager] 💬 === HANDLER DIALOGUE ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Data:', data);
    
    try {
      // ✅ Préparer données dialogue
      const dialogueData = this.prepareDialogueData(npc, data);
      
      console.log('[NpcInteractionManager] 📤 Données dialogue:', dialogueData);
      
      // ✅ MISE À JOUR : Utiliser le bon système
      const success = this.callDialogueSystem(dialogueData);
      
      if (success) {
        this.updateDelegationStats('DialogueSystem');
        
        if (this.callbacks.onSystemDelegation) {
          this.callbacks.onSystemDelegation('DialogueSystem', npc, data);
        }
        
        console.log('[NpcInteractionManager] ✅ Dialogue affiché');
        return true;
      } else {
        this.showErrorMessage("Erreur d'affichage du dialogue");
        return false;
      }
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur dialogue:', error);
      this.showErrorMessage(`Erreur dialogue: ${error.message}`);
      return false;
    }
  }

  handleGenericResult(data) {
    console.log('[NpcInteractionManager] ❓ === HANDLER GÉNÉRIQUE ===');
    console.log('[NpcInteractionManager] Data:', data);
    
    return this.handleDialogueInteraction(null, {
      message: data?.message || "Interaction non gérée",
      lines: data?.lines || ["Interaction non gérée"]
    });
  }

  // === UTILITAIRES (inchangés sauf prepareDialogueData) ===

  detectNpcInteractionType(npc) {
    console.log('[NpcInteractionManager] 🔍 === DÉTECTION TYPE NPC ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Propriétés:', npc?.properties);
    
    if (!this.config.enableAutoDetection) {
      console.log('[NpcInteractionManager] Auto-détection désactivée');
      return NPC_INTERACTION_TYPES.DIALOGUE;
    }
    
    const sortedDetectors = Array.from(this.npcDetectors.values())
      .sort((a, b) => a.priority - b.priority);
    
    console.log(`[NpcInteractionManager] Test de ${sortedDetectors.length} détecteurs...`);
    
    for (const detector of sortedDetectors) {
      try {
        console.log(`[NpcInteractionManager] Test détecteur: ${detector.type}`);
        
        const matches = detector.detector(npc);
        if (matches) {
          console.log(`[NpcInteractionManager] ✅ Match trouvé: ${detector.type}`);
          
          if (this.callbacks.onNpcTypeDetected) {
            this.callbacks.onNpcTypeDetected(npc, detector.type);
          }
          
          return detector.type;
        }
      } catch (error) {
        console.error(`[NpcInteractionManager] ❌ Erreur détecteur "${detector.type}":`, error);
      }
    }
    
    console.log('[NpcInteractionManager] 🚫 Aucun type détecté');
    return null;
  }

  prepareShopData(npc, data) {
    if (data && typeof data.npcName === "object" && data.npcName.name) {
      data.npcName = data.npcName.name;
    }
    
    return data || this.createShopInteractionData(npc);
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

  // ✅ MÉTHODE MISE À JOUR : Préparation dialogue compatible
  prepareDialogueData(npc, data) {
    let npcName = "PNJ";
    let portrait = "/assets/portrait/defaultPortrait.png";
    
    // ✅ Déterminer nom NPC
    if (data?.name) {
      npcName = data.name;
    } else if (npc?.name) {
      npcName = npc.name;
    }
    
    // ✅ Déterminer portrait
    if (data?.portrait) {
      portrait = data.portrait;
    } else if (npc?.sprite) {
      portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
    } else if (npc?.portrait) {
      portrait = npc.portrait;
    }

    // ✅ Déterminer lignes de dialogue
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
      text: data?.text || null,
      // ✅ Préserver métadonnées interface unifiée si présentes
      ...(data?.unifiedFallback && {
        unifiedFallback: data.unifiedFallback,
        originalUnifiedData: data.originalUnifiedData
      })
    };
  }

  getPlayerPosition() {
    const playerManager = this.dependencies?.playerManager || 
                         this.networkManager?.playerManager ||
                         this.scene?.playerManager;
                         
    if (!playerManager) {
      console.warn('[NpcInteractionManager] ⚠️ PlayerManager non trouvé');
      return null;
    }
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer) {
      console.warn('[NpcInteractionManager] ⚠️ Mon joueur non trouvé');
      return null;
    }
    
    return { x: myPlayer.x, y: myPlayer.y };
  }

  findNpcById(npcId) {
    const npcManager = this.dependencies.npcManager;
    if (!npcManager || !npcId) return null;
    
    return npcManager.getNpcData(npcId);
  }

  // === VALIDATION ET ÉTAT (inchangés) ===

  canInteractWithNpc(npc) {
    if (!npc) {
      console.log('[NpcInteractionManager] 🚫 NPC manquant');
      return false;
    }
    
    if (!this.isInitialized) {
      console.log('[NpcInteractionManager] 🚫 Manager non initialisé');
      return false;
    }
    
    if (this.state.isProcessingInteraction) {
      console.log('[NpcInteractionManager] 🚫 Interaction déjà en cours');
      return false;
    }
    
    if (this.state.unifiedInterfaceActive) {
      console.log('[NpcInteractionManager] ℹ️ Interface unifiée déjà active');
    }
    
    const now = Date.now();
    if (now < this.state.blockedUntil) {
      const remaining = this.state.blockedUntil - now;
      console.log(`[NpcInteractionManager] 🚫 Bloqué encore ${remaining}ms`);
      return false;
    }
    
    if (now - this.state.lastInteractionTime < this.config.interactionCooldown) {
      const remaining = this.config.interactionCooldown - (now - this.state.lastInteractionTime);
      console.log(`[NpcInteractionManager] 🚫 Cooldown actif: ${remaining}ms`);
      return false;
    }
    
    if (!this.isNpcInRange(npc)) {
      console.log('[NpcInteractionManager] 🚫 NPC trop loin');
      return false;
    }
    
    if (this.areSystemsBlocking()) {
      console.log('[NpcInteractionManager] 🚫 Systèmes bloquants actifs');
      return false;
    }
    
    return true;
  }

  isNpcInRange(npc) {
    const playerManager = this.dependencies.playerManager;
    if (!playerManager) {
      console.log('[NpcInteractionManager] ⚠️ PlayerManager manquant - skip vérification distance');
      return true;
    }
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer) {
      console.log('[NpcInteractionManager] ⚠️ Mon joueur non trouvé');
      return false;
    }
    
    const distance = Math.sqrt(
      Math.pow(npc.x - myPlayer.x, 2) + 
      Math.pow(npc.y - myPlayer.y, 2)
    );
    
    const inRange = distance <= this.config.maxInteractionDistance;
    console.log(`[NpcInteractionManager] Distance: ${distance.toFixed(1)}px, Max: ${this.config.maxInteractionDistance}px, InRange: ${inRange}`);
    
    return inRange;
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
    
    if (blocking.length > 0) {
      console.log(`[NpcInteractionManager] Systèmes bloquants: ${blocking.map(([key]) => key).join(', ')}`);
    }
    
    return blocking.length > 0;
  }

  isDialogueOpen() {
    // ✅ MISE À JOUR : Vérifier les deux systèmes
    if (this.dependencies.dialogueManager && this.dependencies.dialogueManager.isOpen) {
      return this.dependencies.dialogueManager.isOpen();
    }
    
    const dialogueBox = document.getElementById('dialogue-box');
    return dialogueBox && dialogueBox.style.display !== 'none';
  }

  // === GESTION D'ERREURS (inchangée) ===

  handleInteractionError(error, npc = null, data = null) {
    console.error('[NpcInteractionManager] ❌ Erreur interaction:', error);
    
    this.stats.errors++;
    
    if (this.callbacks.onNpcInteractionError) {
      this.callbacks.onNpcInteractionError(error, npc, data);
    }
    
    this.showErrorMessage(error.message || 'Erreur d\'interaction avec le NPC');
  }

  showErrorMessage(message) {
    console.log(`[NpcInteractionManager] 💬 Message erreur: ${message}`);
    
    if (typeof window.showGameNotification === 'function') {
      try {
        window.showGameNotification(message, 'error', { duration: 3000 });
      } catch (error) {
        console.error('[NpcInteractionManager] ❌ Erreur notification:', error);
        console.log(`[NpcInteractionManager] ERREUR: ${message}`);
      }
    } else {
      console.log(`[NpcInteractionManager] ERREUR: ${message}`);
    }
  }

  // === STATISTIQUES (mises à jour) ===

  updateStats(interactionType, success) {
    this.stats.totalInteractions++;
    
    if (success) {
      this.stats.successfulInteractions++;
    }
    
    if (interactionType) {
      const current = this.stats.interactionsByType.get(interactionType) || 0;
      this.stats.interactionsByType.set(interactionType, current + 1);
    }
  }

  updateDelegationStats(systemName) {
    const current = this.stats.systemDelegations.get(systemName) || 0;
    this.stats.systemDelegations.set(systemName, current + 1);
    
    if (systemName.startsWith('UnifiedInterface_')) {
      const unifiedCount = this.stats.systemDelegations.get('_UnifiedInterfaceTotal') || 0;
      this.stats.systemDelegations.set('_UnifiedInterfaceTotal', unifiedCount + 1);
    }
  }

  // === CALLBACKS PUBLICS (inchangés) ===

  onNpcInteractionStart(callback) { this.callbacks.onNpcInteractionStart = callback; }
  onNpcInteractionComplete(callback) { this.callbacks.onNpcInteractionComplete = callback; }
  onNpcInteractionError(callback) { this.callbacks.onNpcInteractionError = callback; }
  onNpcTypeDetected(callback) { this.callbacks.onNpcTypeDetected = callback; }
  onSystemDelegation(callback) { this.callbacks.onSystemDelegation = callback; }
  onUnifiedInterfaceShow(callback) { this.callbacks.onUnifiedInterfaceShow = callback; }
  onUnifiedInterfaceHide(callback) { this.callbacks.onUnifiedInterfaceHide = callback; }
  onUnifiedTabSwitch(callback) { this.callbacks.onUnifiedTabSwitch = callback; }

  // === CONFIGURATION (inchangée) ===

  setConfig(newConfig) {
    console.log('[NpcInteractionManager] 🔧 Mise à jour configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  blockInteractions(duration = 5000, reason = "Interactions bloquées") {
    console.log(`[NpcInteractionManager] 🚫 Blocage interactions: ${duration}ms (${reason})`);
    this.state.blockedUntil = Date.now() + duration;
  }

  // === DEBUG ÉTENDU ===

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      activeDialogueSystem: this.activeDialogueSystem,
      state: {
        ...this.state,
        unifiedInterfaceInfo: this.state.currentUnifiedInterface ? {
          npcName: this.state.currentUnifiedInterface.npcName,
          capabilities: this.state.currentUnifiedInterface.capabilities,
          activeFor: Date.now() - this.state.lastUnifiedInterfaceTime
        } : null
      },
      config: this.config,
      stats: {
        ...this.stats,
        interactionsByType: Object.fromEntries(this.stats.interactionsByType),
        systemDelegations: Object.fromEntries(this.stats.systemDelegations),
        unifiedInterfacesByCapabilities: Object.fromEntries(this.stats.unifiedInterfacesByCapabilities),
        // ✅ NOUVEAU : Stats système dialogue
        dialogueSystemStats: {
          newSystemUsed: this.stats.newDialogueSystemUsed,
          legacySystemUsed: this.stats.legacyDialogueSystemUsed,
          detections: this.stats.dialogueSystemDetections,
          currentSystem: this.activeDialogueSystem
        }
      },
      detectors: Array.from(this.npcDetectors.keys()),
      handlers: Array.from(this.npcHandlers.keys()),
      dependencies: Object.fromEntries(
        Object.entries(this.dependencies).map(([key, value]) => [key, !!value])
      ),
      sceneKey: this.scene?.scene?.key,
      networkHandlerReady: !!this.networkHandler?.isInitialized,
      unifiedInterfaceSupport: {
        enabled: this.config.enableUnifiedInterface,
        currentlyActive: this.state.unifiedInterfaceActive,
        totalShown: this.stats.unifiedInterfacesShown,
        tabSwitches: this.stats.tabSwitches
      }
    };
  }

  resetStats() {
    console.log('[NpcInteractionManager] 🔄 Reset statistiques');
    
    this.stats = {
      totalInteractions: 0,
      interactionsByType: new Map(),
      systemDelegations: new Map(),
      errors: 0,
      successfulInteractions: 0,
      unifiedInterfacesShown: 0,
      unifiedInterfacesByCapabilities: new Map(),
      tabSwitches: 0,
      // ✅ NOUVEAU : Reset stats dialogue
      newDialogueSystemUsed: 0,
      legacyDialogueSystemUsed: 0,
      dialogueSystemDetections: 0
    };
  }

  // === MÉTHODES UTILITAIRES (inchangées) ===

  getClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.isDestroyed) return null;
    
    const npcManager = this.dependencies.npcManager;
    if (!npcManager) return null;
    
    return npcManager.getClosestNpc(playerX, playerY, maxDist);
  }

  highlightClosestNpc(playerX, playerY, maxDist = 64) {
    const npcManager = this.dependencies.npcManager;
    if (!npcManager) return;
    
    npcManager.highlightClosestNpc(playerX, playerY, maxDist);
  }

  getAllNpcs() {
    const npcManager = this.dependencies.npcManager;
    if (!npcManager) return [];
    
    return npcManager.getAllNpcs();
  }

    deriveActionsFromData(data) {
      const actions = [];
      
      if (data.shopId || data.shopData) {
        actions.push({
          id: 'shop_action',
          label: '🛒 Boutique', 
          type: 'shop',
          callback: () => {
            // Ouvrir boutique directement
            if (this.dependencies.shopSystem && data.shopData) {
              this.dependencies.shopSystem.handleShopNpcInteraction(data);
            }
          }
        });
      }
      
      if (data.availableQuests && data.availableQuests.length > 0) {
        actions.push({
          id: 'quest_action',
          label: '📋 Quêtes',
          type: 'quest',
          callback: () => {
            // Ouvrir quêtes directement
            if (this.dependencies.questSystem) {
              this.dependencies.questSystem.handleNpcInteraction(data);
            }
          }
        });
      }
      
      return actions;
    }
  
    // === DESTRUCTION ===
  destroy() {
    console.log('[NpcInteractionManager] 💀 Destruction...');
    
    if (this.state.unifiedInterfaceActive) {
      this.closeUnifiedInterface();
    }
    
    if (typeof window !== 'undefined') {
      delete window.closeUnifiedNpcInterface;
      delete window.switchUnifiedTab;
    }
    
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    this.npcDetectors.clear();
    this.npcHandlers.clear();
    this.stats.interactionsByType.clear();
    this.stats.systemDelegations.clear();
    this.stats.unifiedInterfacesByCapabilities.clear();
    
    this.isInitialized = false;
    this.scene = null;
    this.networkHandler = null;
    
    console.log('[NpcInteractionManager] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES MISES À JOUR ===

window.debugNpcInteractionManager = function() {
  const managers = [
    window.globalNetworkManager?.npcInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.npcInteractionManager,
    window.currentNpcInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const info = managers[0].getDebugInfo();
    console.log('[NpcInteractionManager] === DEBUG INFO AVEC DIALOGUEMANAGER ===');
    console.table({
      'Système Dialogue Actif': info.activeDialogueSystem,
      'Nouveau Système Utilisé': info.stats.dialogueSystemStats.newSystemUsed,
      'Ancien Système Utilisé': info.stats.dialogueSystemStats.legacySystemUsed,
      'Détections Système': info.stats.dialogueSystemStats.detections,
      'Interactions Totales': info.stats.totalInteractions,
      'Interfaces Unifiées': info.stats.unifiedInterfacesShown,
      'Taux de Succès': `${((info.stats.successfulInteractions / Math.max(info.stats.totalInteractions, 1)) * 100).toFixed(1)}%`
    });
    console.log('[NpcInteractionManager] Dépendances:', info.dependencies);
    console.log('[NpcInteractionManager] Stats Dialogue:', info.stats.dialogueSystemStats);
    console.log('[NpcInteractionManager] Info complète:', info);
    return info;
  } else {
    console.error('[NpcInteractionManager] Manager non trouvé');
    return null;
  }
};

window.testUnifiedNpcInterface = function() {
  const managers = [
    window.globalNetworkManager?.npcInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.npcInteractionManager,
    window.currentNpcInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const manager = managers[0];
    
    console.log('[NpcInteractionManager] 🧪 Test interface unifiée avec DialogueManager...');
    
    const mockData = {
      type: 'npc',
      npcId: 9002,
      npcName: 'Marchand Test DialogueManager',
      isUnifiedInterface: true,
      unifiedInterface: {
        npcId: 9002,
        npcName: 'Marchand Test DialogueManager',
        capabilities: ['merchant', 'questGiver', 'dialogue'],
        defaultAction: 'merchant',
        merchantData: {
          shopId: 'test_dialogue_manager_shop',
          availableItems: [
            { itemId: 'potion', buyPrice: 300, stock: 10 }
          ]
        },
        questData: {
          availableQuests: [
            { id: 'test_quest_dm', title: 'Quête DialogueManager', description: 'Test avec nouveau système' }
          ]
        },
        dialogueData: {
          lines: ['Bonjour ! Je teste le nouveau DialogueManager !', 'Interface unifiée fonctionnelle !']
        },
        quickActions: [
          { id: 'quick_shop', label: 'Boutique Rapide', action: 'shop' },
          { id: 'quick_quest', label: 'Voir Quêtes', action: 'quest' }
        ]
      }
    };
    
    manager.handleUnifiedInterfaceResult(mockData);
    return mockData;
  } else {
    console.error('[NpcInteractionManager] Manager non trouvé');
    return null;
  }
};

window.testDialogueSystemDetection = function() {
  const managers = [
    window.globalNetworkManager?.npcInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.npcInteractionManager,
    window.currentNpcInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const manager = managers[0];
    
    console.log('[NpcInteractionManager] 🔍 Test détection système dialogue...');
    
    const dialogueManager = manager.detectDialogueManager();
    const legacySystem = manager.detectLegacyDialogueSystem();
    
    console.table({
      'DialogueManager Détecté': !!dialogueManager,
      'Ancien Système Détecté': !!legacySystem,
      'Système Actif': manager.activeDialogueSystem,
      'window.dialogueManager': !!window.dialogueManager,
      'window.showNpcDialogue': typeof window.showNpcDialogue === 'function'
    });
    
    return {
      dialogueManager: !!dialogueManager,
      legacySystem: !!legacySystem,
      activeSystem: manager.activeDialogueSystem
    };
  } else {
    console.error('[NpcInteractionManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcInteractionManager MISE À JOUR pour DialogueManager chargé!');
console.log('🔍 Utilisez window.debugNpcInteractionManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testUnifiedNpcInterface() pour tester avec DialogueManager');
console.log('🔍 Utilisez window.testDialogueSystemDetection() pour tester la détection');
