// client/src/modules/NpcInteractionManager.js
// ✅ UNIFIED INTERFACE EXTENSIONS - Gestionnaire spécialisé pour toutes les interactions NPC
// Extrait de l'ancien InteractionManager monolithique

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
    
    // ✅ Dépendances systèmes (injection)
    this.dependencies = {
      npcManager: null,
      playerManager: null,
      questSystem: null,
      shopSystem: null,
      dialogueSystem: null
    };
    
    // ✅ État des interactions NPC
    this.state = {
      lastInteractedNpc: null,
      currentInteractionType: null,
      isProcessingInteraction: false,
      lastInteractionTime: 0,
      blockedUntil: 0,
      // ✅ NOUVEAU - État interface unifiée
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
      // ✅ NOUVEAU - Callbacks interface unifiée
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
      // ✅ NOUVEAU - Configuration interface unifiée
      enableUnifiedInterface: true,
      unifiedInterfaceTimeout: 30000, // 30 secondes max
      defaultUnifiedTab: 'auto' // 'auto' utilise defaultAction du serveur
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalInteractions: 0,
      interactionsByType: new Map(),
      systemDelegations: new Map(),
      errors: 0,
      successfulInteractions: 0,
      // ✅ NOUVEAU - Stats interface unifiée
      unifiedInterfacesShown: 0,
      unifiedInterfacesByCapabilities: new Map(),
      tabSwitches: 0
    };
    
    console.log('[NpcInteractionManager] 🎭 Créé pour scène avec Extensions Interface Unifiée:', this.scene.scene.key);
  }

  // === INITIALISATION ===

  initialize(dependencies = {}) {
    console.log('[NpcInteractionManager] 🚀 === INITIALISATION AVEC EXTENSIONS ===');
    
    // ✅ Injection des dépendances
    this.dependencies = {
      npcManager: dependencies.npcManager || this.scene.npcManager,
      playerManager: dependencies.playerManager || this.scene.playerManager,
      questSystem: dependencies.questSystem || window.questSystem || window.questSystemGlobal,
      shopSystem: dependencies.shopSystem || this.scene.shopIntegration?.getShopSystem() || window.shopSystem,
      dialogueSystem: dependencies.dialogueSystem || window.showNpcDialogue
    };
    
    console.log('[NpcInteractionManager] 📦 Dépendances injectées:');
    Object.entries(this.dependencies).forEach(([key, value]) => {
      console.log(`  ${key}: ${!!value ? '✅' : '❌'}`);
    });
    
    // ✅ Configurer les callbacks réseau
    this.setupNetworkCallbacks();
    
    // ✅ NOUVEAU - Configurer callbacks interface unifiée
    this.setupUnifiedInterfaceCallbacks();
    
    this.isInitialized = true;
    console.log('[NpcInteractionManager] ✅ Initialisé avec succès + Interface Unifiée');
    
    return this;
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

    // ✅ NOUVEAU - Callback spécialisé pour interface unifiée
    this.networkHandler.onUnifiedInterfaceResult((data) => {
      console.log('[NpcInteractionManager] 🎭 Résultat interface unifiée reçu:', data);
      this.handleUnifiedInterfaceResult(data);
    });
    
    console.log('[NpcInteractionManager] ✅ Callbacks réseau configurés avec extensions');
  }

  // ✅ NOUVELLE MÉTHODE - Setup callbacks interface unifiée
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

  // ✅ NOUVELLE VERSION CORRIGÉE
  async sendNpcInteraction(npc, options = {}) {
    console.log('[NpcInteractionManager] 📤 Envoi interaction réseau...');
    
    if (!this.networkHandler) {
      console.error('[NpcInteractionManager] ❌ Pas de NetworkHandler');
      return false;
    }
    
    try {
      // ✅(garder number)
      const npcId = npc.id; // Garder le number original
      
      // ✅ Créer données d'interaction avec types corrects
      const playerPosition = this.getPlayerPosition();
      const interactionData = InteractionHelpers.createNpcInteraction(
        npcId, // ← String maintenant
        this.networkHandler.networkManager.sessionId,
        this.networkHandler.networkManager.currentZone,
        playerPosition,
        {
          npcName: npc.name,
          interactionType: this.state.currentInteractionType,
          ...options
        }
      );
      
      // ✅ Validation côté client (pour debug seulement)
      const validation = InteractionValidator.validate(INTERACTION_TYPES.NPC, interactionData);
      if (!validation.isValid) {
        console.warn('[NpcInteractionManager] ⚠️ Validation échouée:', validation.errors);
        // ⚠️ NE PAS ARRÊTER - Le serveur validera
      } else {
        console.log('[NpcInteractionManager] ✅ Validation client réussie');
      }
      
      // ✅ CHOIX DE MÉTHODE D'ENVOI
      // Option A: Utiliser la nouvelle méthode (recommandé)
      const result = this.networkHandler.sendNpcInteract(npcId, interactionData);
      
      console.log(`[NpcInteractionManager] Résultat envoi: ${result}`);
      return result;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur envoi:', error);
      return false;
    }
  }

  // === GESTION DES RÉSULTATS RÉSEAU ===

  // ✅ MÉTHODE PRINCIPALE ÉTENDUE - Détection interface unifiée prioritaire
  handleNetworkInteractionResult(data) {
    console.log('[NpcInteractionManager] 🔄 === TRAITEMENT RÉSULTAT RÉSEAU ÉTENDU ===');
    console.log('[NpcInteractionManager] Data:', data);
    
    try {
      // ✅ NOUVEAU - Vérification interface unifiée EN PREMIER (avant determineResultType)
      if (data.isUnifiedInterface || data.unifiedInterface) {
        console.log('[NpcInteractionManager] 🎭 Interface unifiée détectée - traitement prioritaire');
        return this.handleUnifiedInterfaceResult(data);
      }
      
      // ✅ Traitement normal pour NPCs simples (code existant inchangé)
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

  // ✅ NOUVELLE MÉTHODE - Handler principal interface unifiée
  handleUnifiedInterfaceResult(data) {
    console.log('[NpcInteractionManager] 🎭 === HANDLER INTERFACE UNIFIÉE ===');
    
    const interfaceData = data.unifiedInterface || data;
    const npc = this.state.lastInteractedNpc || this.findNpcById(data.npcId);
    
    console.log('[NpcInteractionManager] Interface Data:', {
      npcId: interfaceData.npcId,
      npcName: interfaceData.npcName,
      capabilities: interfaceData.capabilities,
      defaultAction: interfaceData.defaultAction,
      quickActions: interfaceData.quickActions?.length || 0
    });
    
    try {
      // ✅ Validation des données
      if (!this.validateUnifiedInterface(interfaceData)) {
        throw new Error('Données interface unifiée invalides');
      }
      
      // ✅ Stocker l'état interface unifiée
      this.state.currentUnifiedInterface = interfaceData;
      this.state.lastUnifiedInterfaceTime = Date.now();
      this.state.unifiedInterfaceActive = true;
      
      // ✅ Créer et afficher l'interface unifiée
      this.showUnifiedNpcInterface(interfaceData, npc);
      
      // ✅ Mise à jour statistiques
      this.updateUnifiedStats(interfaceData);
      
      // ✅ Callback de complétion
      if (this.callbacks.onNpcInteractionComplete) {
        this.callbacks.onNpcInteractionComplete(npc, data, true);
      }
      
      // ✅ Callback spécialisé interface unifiée
      if (this.callbacks.onUnifiedInterfaceShow) {
        this.callbacks.onUnifiedInterfaceShow(interfaceData, npc);
      }
      
      console.log('[NpcInteractionManager] ✅ Interface unifiée affichée');
      return true;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur interface unifiée:', error);
      
      // ✅ Fallback vers dialogue simple
      return this.handleDialogueInteraction(npc, {
        message: interfaceData.dialogueData?.lines?.[0] || "Interface temporairement indisponible"
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE - Validation interface unifiée
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
    
    // ✅ Vérifier que chaque capability a des données
    for (const capability of interfaceData.capabilities) {
      const dataKey = `${capability}Data`;
      if (!interfaceData[dataKey]) {
        console.warn(`[NpcInteractionManager] ⚠️ Pas de données pour ${capability}`);
      }
    }
    
    console.log('[NpcInteractionManager] ✅ Interface unifiée valide');
    return true;
  }

  // ✅ NOUVELLE MÉTHODE - Affichage interface unifiée avec extension dialogue
  showUnifiedNpcInterface(interfaceData, npc) {
    console.log('[NpcInteractionManager] 🖼️ === AFFICHAGE INTERFACE UNIFIÉE ===');
    
    // ✅ Préparer les données pour le système dialogue étendu
    const unifiedDialogueData = this.prepareUnifiedDialogueData(interfaceData, npc);
    
    // ✅ Vérifier si le système dialogue est disponible
    const dialogueSystem = this.dependencies.dialogueSystem;
    if (typeof dialogueSystem !== 'function') {
      console.error('[NpcInteractionManager] ❌ Système dialogue non disponible');
      this.showErrorMessage("Système de dialogue non disponible");
      return false;
    }
    
    try {
      console.log('[NpcInteractionManager] 🎭 Affichage dialogue unifié...');
      console.log('[NpcInteractionManager] Données préparées:', unifiedDialogueData);
      
      // ✅ Appeler le système dialogue avec mode unifié
      dialogueSystem(unifiedDialogueData);
      
      console.log('[NpcInteractionManager] ✅ Interface unifiée affichée via dialogue étendu');
      return true;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur affichage interface unifiée:', error);
      // ✅ Fallback vers dialogue simple
      return this.showUnifiedFallbackDialogue(interfaceData, npc);
    }
  }

  // ✅ NOUVELLE MÉTHODE - Préparer données pour dialogue unifié
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

  // ✅ NOUVELLE MÉTHODE - Générer onglets depuis capabilities
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
        // ✅ Fallback pour capabilities inconnues
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

  // ✅ NOUVELLE MÉTHODE - Extraire données par onglet
  extractTabData(interfaceData) {
    const tabData = {};
    
    // ✅ Extraire données pour chaque capability
    interfaceData.capabilities?.forEach(capability => {
      const dataKey = `${capability}Data`;
      if (interfaceData[dataKey]) {
        tabData[capability] = interfaceData[dataKey];
      }
    });
    
    return tabData;
  }

  // ✅ NOUVELLE MÉTHODE - Générer actions rapides par défaut
  generateDefaultQuickActions(interfaceData) {
    const quickActions = [];
    
    // ✅ Actions basées sur capabilities
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
    
    // ✅ Action fermer toujours présente
    quickActions.push({
      id: 'close',
      label: 'Fermer',
      icon: '❌',
      action: 'close',
      enabled: true
    });
    
    return quickActions;
  }

  // ✅ NOUVELLE MÉTHODE - Gestion changement d'onglet
  handleUnifiedTabSwitch(tabName, interfaceData) {
    console.log('[NpcInteractionManager] 🔄 === CHANGEMENT ONGLET ===');
    console.log('[NpcInteractionManager] Onglet:', tabName);
    
    this.stats.tabSwitches++;
    
    // ✅ Callback spécialisé
    if (this.callbacks.onUnifiedTabSwitch) {
      this.callbacks.onUnifiedTabSwitch(tabName, interfaceData);
    }
    
    // ✅ Traitement selon l'onglet
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

  // ✅ NOUVELLE MÉTHODE - Gestion action rapide
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

  // ✅ NOUVELLES MÉTHODES - Handlers d'onglets spécialisés
  handleMerchantTab(merchantData) {
    console.log('[NpcInteractionManager] 🏪 Handler onglet marchand');
    // ✅ Le ShopUI sera embedde dans l'onglet par le système dialogue étendu
    return true;
  }

  handleQuestTab(questData) {
    console.log('[NpcInteractionManager] ⚔️ Handler onglet quêtes');
    // ✅ Le QuestSystem sera embedde dans l'onglet par le système dialogue étendu
    return true;
  }

  handleHealerTab(healerData) {
    console.log('[NpcInteractionManager] 🏥 Handler onglet soigneur');
    // ✅ Interface de soin sera embeddee dans l'onglet
    return true;
  }

  handleDialogueTab(dialogueData) {
    console.log('[NpcInteractionManager] 💬 Handler onglet dialogue');
    // ✅ Dialogue normal sera affiché dans l'onglet
    return true;
  }

  // ✅ NOUVELLE MÉTHODE - Fermeture interface unifiée
  closeUnifiedInterface() {
    console.log('[NpcInteractionManager] 🚪 === FERMETURE INTERFACE UNIFIÉE ===');
    
    if (!this.state.unifiedInterfaceActive) {
      console.log('[NpcInteractionManager] ℹ️ Aucune interface unifiée active');
      return;
    }
    
    // ✅ Reset état
    this.state.currentUnifiedInterface = null;
    this.state.unifiedInterfaceActive = false;
    
    // ✅ Callback spécialisé
    if (this.callbacks.onUnifiedInterfaceHide) {
      this.callbacks.onUnifiedInterfaceHide();
    }
    
    // ✅ Fermer le dialogue (qui fermera l'interface unifiée)
    const dialogueBox = document.getElementById('dialogue-box');
    if (dialogueBox) {
      dialogueBox.style.display = 'none';
    }
    
    console.log('[NpcInteractionManager] ✅ Interface unifiée fermée');
  }

  // ✅ NOUVELLE MÉTHODE - Fallback dialogue simple
  showUnifiedFallbackDialogue(interfaceData, npc) {
    console.log('[NpcInteractionManager] 🔄 === FALLBACK DIALOGUE UNIFIÉ ===');
    
    // ✅ Créer un dialogue avec boutons d'actions rapides
    const quickActions = interfaceData.quickActions || [];
    const capabilities = interfaceData.capabilities || [];
    
    // ✅ Message principal
    let dialogueLines = interfaceData.dialogueData?.lines || ["Que puis-je faire pour vous ?"];
    
    // ✅ Ajouter les actions disponibles
    if (quickActions.length > 0 || capabilities.length > 0) {
      dialogueLines.push(""); // Ligne vide
      dialogueLines.push("Actions disponibles :");
      
      const actions = quickActions.length > 0 ? quickActions : 
        capabilities.map((cap, index) => ({
          label: `${index + 1}. ${cap.charAt(0).toUpperCase() + cap.slice(1)}`
        }));
        
      actions.forEach((action) => {
        dialogueLines.push(action.label);
      });
    }
    
    // ✅ Afficher via système dialogue existant
    const dialogueData = this.prepareDialogueData(npc, {
      lines: dialogueLines,
      name: interfaceData.npcName || npc?.name,
      portrait: npc?.portrait,
      // ✅ Marquer comme fallback unifié
      unifiedFallback: true,
      originalUnifiedData: interfaceData
    });
    
    return this.handleDialogueInteraction(npc, dialogueData);
  }

  // ✅ NOUVELLE MÉTHODE - Mise à jour statistiques unifiées
  updateUnifiedStats(interfaceData) {
    this.stats.unifiedInterfacesShown++;
    
    // ✅ Stats par type de capabilities
    const capabilitiesKey = interfaceData.capabilities.sort().join(',');
    const current = this.stats.unifiedInterfacesByCapabilities.get(capabilitiesKey) || 0;
    this.stats.unifiedInterfacesByCapabilities.set(capabilitiesKey, current + 1);
    
    console.log(`[NpcInteractionManager] 📊 Stats: ${this.stats.unifiedInterfacesShown} interfaces unifiées affichées`);
  }

  determineResultType(data) {
    // ✅ Mapping des types serveur vers types client
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
    
    // ✅ Vérifier type explicite
    if (data.type && typeMapping[data.type]) {
      return typeMapping[data.type];
    }
    
    // ✅ Vérifier npcType
    if (data.npcType && typeMapping[data.npcType]) {
      return typeMapping[data.npcType];
    }
    
    // ✅ Vérifier présence shopId
    if (data.shopId || data.shopData) {
      return NPC_INTERACTION_TYPES.MERCHANT;
    }
    
    // ✅ Fallback vers dialogue
    return NPC_INTERACTION_TYPES.DIALOGUE;
  }

  // === HANDLERS SPÉCIALISÉS (code existant avec améliorations mineures) ===

  handleMerchantInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🏪 === HANDLER MARCHAND ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Data:', data);
    
    // ✅ Vérifier disponibilité du système shop
    const shopSystem = this.dependencies.shopSystem;
    if (!shopSystem) {
      console.warn('[NpcInteractionManager] ⚠️ ShopSystem non disponible');
      return this.handleDialogueInteraction(npc, {
        message: "Ce marchand n'est pas disponible actuellement."
      });
    }
    
    // ✅ Déléguer au système shop
    try {
      console.log('[NpcInteractionManager] 🔗 Délégation vers ShopSystem...');
      
      // ✅ Statistiques de délégation spécialisée
      this.updateDelegationStats('ShopSystem');
      
      // ✅ Callback de délégation
      if (this.callbacks.onSystemDelegation) {
        this.callbacks.onSystemDelegation('ShopSystem', npc, data);
      }
      
      // ✅ Préparer données shop
      const shopData = this.prepareShopData(npc, data);
      
      // ✅ Appel système
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
    
    // ✅ Vérifier disponibilité du système quest
    const questSystem = this.dependencies.questSystem;
    if (!questSystem?.handleNpcInteraction) {
      console.warn('[NpcInteractionManager] ⚠️ QuestSystem non disponible');
      return this.handleDialogueInteraction(npc, {
        message: data?.message || "Système de quêtes non disponible",
        lines: data?.lines || ["Système de quêtes non disponible"],
        name: data?.name || npc?.name || "PNJ"
      });
    }
    
    // ✅ Déléguer au système quest
    try {
      console.log('[NpcInteractionManager] 🔗 Délégation vers QuestSystem...');
      
      // ✅ Statistiques de délégation
      this.updateDelegationStats('QuestSystem');
      
      // ✅ Callback de délégation
      if (this.callbacks.onSystemDelegation) {
        this.callbacks.onSystemDelegation('QuestSystem', npc, data);
      }
      
      // ✅ Appel système
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
    
    // ✅ Créer données de soin
    const healData = data || {
      type: "heal",
      npcId: npc?.id,
      npcName: npc?.name || "Infirmière",
      message: "Vos Pokémon sont maintenant en pleine forme !",
      portrait: "/assets/portrait/nurse.png"
    };
    
    // ✅ Déléguer au système dialogue
    return this.handleDialogueInteraction(npc, healData);
  }

  handleStarterInteraction(npc, data) {
    console.log('[NpcInteractionManager] 🎮 === HANDLER STARTER ===');
    
    // ✅ Vérifier méthode scene
    if (this.scene.showStarterSelection) {
      console.log('[NpcInteractionManager] 🔗 Délégation vers scene.showStarterSelection');
      
      // ✅ Statistiques de délégation
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

  handleDialogueInteraction(npc, data) {
    console.log('[NpcInteractionManager] 💬 === HANDLER DIALOGUE ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Data:', data);
    
    // ✅ Vérifier disponibilité du système dialogue
    const dialogueSystem = this.dependencies.dialogueSystem;
    if (typeof dialogueSystem !== 'function') {
      console.error('[NpcInteractionManager] ❌ Système dialogue non disponible');
      this.showErrorMessage("Système de dialogue non disponible");
      return false;
    }
    
    try {
      // ✅ Préparer données dialogue
      const dialogueData = this.prepareDialogueData(npc, data);
      
      console.log('[NpcInteractionManager] 📤 Données dialogue:', dialogueData);
      
      // ✅ Statistiques de délégation
      this.updateDelegationStats('DialogueSystem');
      
      // ✅ Callback de délégation
      if (this.callbacks.onSystemDelegation) {
        this.callbacks.onSystemDelegation('DialogueSystem', npc, data);
      }
      
      // ✅ Appel système dialogue
      dialogueSystem(dialogueData);
      
      console.log('[NpcInteractionManager] ✅ Dialogue affiché');
      return true;
      
    } catch (error) {
      console.error('[NpcInteractionManager] ❌ Erreur dialogue:', error);
      this.showErrorMessage(`Erreur dialogue: ${error.message}`);
      return false;
    }
  }

  handleGenericResult(data) {
    console.log('[NpcInteractionManager] ❓ === HANDLER GÉNÉRIQUE ===');
    console.log('[NpcInteractionManager] Data:', data);
    
    // ✅ Fallback vers dialogue
    return this.handleDialogueInteraction(null, {
      message: data?.message || "Interaction non gérée",
      lines: data?.lines || ["Interaction non gérée"]
    });
  }

  // === DÉTECTION ET VALIDATION (code existant inchangé) ===

  detectNpcInteractionType(npc) {
    console.log('[NpcInteractionManager] 🔍 === DÉTECTION TYPE NPC ===');
    console.log('[NpcInteractionManager] NPC:', npc?.name);
    console.log('[NpcInteractionManager] Propriétés:', npc?.properties);
    
    if (!this.config.enableAutoDetection) {
      console.log('[NpcInteractionManager] Auto-détection désactivée');
      return NPC_INTERACTION_TYPES.DIALOGUE;
    }
    
    // ✅ Trier par priorité
    const sortedDetectors = Array.from(this.npcDetectors.values())
      .sort((a, b) => a.priority - b.priority);
    
    console.log(`[NpcInteractionManager] Test de ${sortedDetectors.length} détecteurs...`);
    
    // ✅ Tester chaque détecteur
    for (const detector of sortedDetectors) {
      try {
        console.log(`[NpcInteractionManager] Test détecteur: ${detector.type}`);
        
        const matches = detector.detector(npc);
        if (matches) {
          console.log(`[NpcInteractionManager] ✅ Match trouvé: ${detector.type}`);
          
          // ✅ Callback de détection
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

  // === UTILITAIRES (code existant + extensions) ===

  prepareShopData(npc, data) {
    // ✅ Assurer compatibilité nom NPC
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
      // ✅ NOUVEAU - Préserver métadonnées interface unifiée si présentes
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

  // === VALIDATION ET ÉTAT ===

  canInteractWithNpc(npc) {
    // ✅ Vérifications de base
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
    
    // ✅ NOUVEAU - Vérifier si interface unifiée active (pas bloquant)
    if (this.state.unifiedInterfaceActive) {
      console.log('[NpcInteractionManager] ℹ️ Interface unifiée déjà active');
      // Ne pas bloquer - permet changement de NPC
    }
    
    // ✅ Vérification cooldown
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
    
    // ✅ Vérification distance
    if (!this.isNpcInRange(npc)) {
      console.log('[NpcInteractionManager] 🚫 NPC trop loin');
      return false;
    }
    
    // ✅ Vérifications systèmes bloquants
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
      return true; // Assume OK si pas de PlayerManager
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
    const dialogueBox = document.getElementById('dialogue-box');
    return dialogueBox && dialogueBox.style.display !== 'none';
  }

  // === GESTION D'ERREURS ===

  handleInteractionError(error, npc = null, data = null) {
    console.error('[NpcInteractionManager] ❌ Erreur interaction:', error);
    
    this.stats.errors++;
    
    // ✅ Callback d'erreur
    if (this.callbacks.onNpcInteractionError) {
      this.callbacks.onNpcInteractionError(error, npc, data);
    }
    
    // ✅ Afficher message d'erreur
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

  // === STATISTIQUES (améliorées avec interface unifiée) ===

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
    
    // ✅ NOUVEAU - Track spécialement les interfaces unifiées
    if (systemName.startsWith('UnifiedInterface_')) {
      const unifiedCount = this.stats.systemDelegations.get('_UnifiedInterfaceTotal') || 0;
      this.stats.systemDelegations.set('_UnifiedInterfaceTotal', unifiedCount + 1);
    }
  }

  // === CALLBACKS PUBLICS ===

  onNpcInteractionStart(callback) { this.callbacks.onNpcInteractionStart = callback; }
  onNpcInteractionComplete(callback) { this.callbacks.onNpcInteractionComplete = callback; }
  onNpcInteractionError(callback) { this.callbacks.onNpcInteractionError = callback; }
  onNpcTypeDetected(callback) { this.callbacks.onNpcTypeDetected = callback; }
  onSystemDelegation(callback) { this.callbacks.onSystemDelegation = callback; }

  // ✅ NOUVEAUX CALLBACKS INTERFACE UNIFIÉE
  onUnifiedInterfaceShow(callback) { this.callbacks.onUnifiedInterfaceShow = callback; }
  onUnifiedInterfaceHide(callback) { this.callbacks.onUnifiedInterfaceHide = callback; }
  onUnifiedTabSwitch(callback) { this.callbacks.onUnifiedTabSwitch = callback; }

  // === CONFIGURATION ===

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
      state: {
        ...this.state,
        // ✅ NOUVEAU - État interface unifiée
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
        // ✅ NOUVEAU - Stats interface unifiée
        unifiedInterfacesByCapabilities: Object.fromEntries(this.stats.unifiedInterfacesByCapabilities)
      },
      detectors: Array.from(this.npcDetectors.keys()),
      handlers: Array.from(this.npcHandlers.keys()),
      dependencies: Object.fromEntries(
        Object.entries(this.dependencies).map(([key, value]) => [key, !!value])
      ),
      sceneKey: this.scene?.scene?.key,
      networkHandlerReady: !!this.networkHandler?.isInitialized,
      // ✅ NOUVEAU - Support interface unifiée
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
      // ✅ NOUVEAU - Reset stats interface unifiée
      unifiedInterfacesShown: 0,
      unifiedInterfacesByCapabilities: new Map(),
      tabSwitches: 0
    };
  }

  // === MÉTHODES UTILITAIRES SUPPLÉMENTAIRES ===

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

  // === DESTRUCTION ===

  destroy() {
    console.log('[NpcInteractionManager] 💀 Destruction...');
    
    // ✅ Fermer interface unifiée si active
    if (this.state.unifiedInterfaceActive) {
      this.closeUnifiedInterface();
    }
    
    // ✅ Nettoyer callbacks globaux
    if (typeof window !== 'undefined') {
      delete window.closeUnifiedNpcInterface;
      delete window.switchUnifiedTab;
    }
    
    // ✅ Nettoyer callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    // ✅ Nettoyer collections
    this.npcDetectors.clear();
    this.npcHandlers.clear();
    this.stats.interactionsByType.clear();
    this.stats.systemDelegations.clear();
    this.stats.unifiedInterfacesByCapabilities.clear();
    
    // ✅ Reset état
    this.isInitialized = false;
    this.scene = null;
    this.networkHandler = null;
    
    console.log('[NpcInteractionManager] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES ÉTENDUES ===

window.debugNpcInteractionManager = function() {
  // Essayer de trouver le manager dans différents endroits
  const managers = [
    window.globalNetworkManager?.npcInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.npcInteractionManager,
    window.currentNpcInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const info = managers[0].getDebugInfo();
    console.log('[NpcInteractionManager] === DEBUG INFO ÉTENDU ===');
    console.table({
      'Interactions Totales': info.stats.totalInteractions,
      'Interactions Réussies': info.stats.successfulInteractions,
      'Erreurs': info.stats.errors,
      'Interfaces Unifiées': info.stats.unifiedInterfacesShown,
      'Changements d\'Onglet': info.stats.tabSwitches,
      'Taux de Succès': `${((info.stats.successfulInteractions / Math.max(info.stats.totalInteractions, 1)) * 100).toFixed(1)}%`
    });
    console.log('[NpcInteractionManager] Support Interface Unifiée:', info.unifiedInterfaceSupport);
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
    
    console.log('[NpcInteractionManager] 🧪 Test interface unifiée...');
    
    // Mock data d'interface unifiée
    const mockData = {
      type: 'npc',
      npcId: 9002,
      npcName: 'Marchand Test Unifié',
      isUnifiedInterface: true,
      unifiedInterface: {
        npcId: 9002,
        npcName: 'Marchand Test Unifié',
        capabilities: ['merchant', 'questGiver', 'dialogue'],
        defaultAction: 'merchant',
        merchantData: {
          shopId: 'test_unified_shop',
          availableItems: [
            { itemId: 'potion', buyPrice: 300, stock: 10 }
          ]
        },
        questData: {
          availableQuests: [
            { id: 'test_quest', title: 'Quête Test', description: 'Une quête de test' }
          ]
        },
        dialogueData: {
          lines: ['Bonjour ! Je suis un NPC test avec interface unifiée !']
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

window.closeCurrentUnifiedInterface = function() {
  const managers = [
    window.globalNetworkManager?.npcInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.npcInteractionManager,
    window.currentNpcInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    managers[0].closeUnifiedInterface();
    return true;
  }
  return false;
};

console.log('✅ NpcInteractionManager avec Extensions Interface Unifiée chargé!');
console.log('🔍 Utilisez window.debugNpcInteractionManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testUnifiedNpcInterface() pour tester interface unifiée');
console.log('🚪 Utilisez window.closeCurrentUnifiedInterface() pour fermer interface active');
