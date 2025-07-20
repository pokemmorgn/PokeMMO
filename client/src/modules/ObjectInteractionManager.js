// client/src/modules/ObjectInteractionManager.js
// ✅ Gestionnaire spécialisé pour toutes les interactions objets
// Gère objets au sol, fouille, machines, collectibles

import { 
  INTERACTION_TYPES, 
  INTERACTION_RESULT_TYPES, 
  OBJECT_INTERACTION_TYPES,
  InteractionValidator,
  InteractionHelpers,
  INTERACTION_CONFIG
} from '../types/InteractionTypes.js';

export class ObjectInteractionManager {
  constructor(scene, networkInteractionHandler) {
    this.scene = scene;
    this.networkHandler = networkInteractionHandler;
    this.isInitialized = false;
    
    // ✅ Dépendances systèmes (injection)
    this.dependencies = {
      playerManager: null,
      inventorySystem: null,
      notificationSystem: null
    };
    
    // ✅ État des interactions objets
    this.state = {
      lastInteractedObject: null,
      currentInteractionType: null,
      isProcessingInteraction: false,
      lastInteractionTime: 0,
      lastSearchTime: 0,
      blockedUntil: 0
    };
    
    // ✅ Système de détection objets
    this.objectDetectors = new Map();
    this.registerBuiltinDetectors();
    
    // ✅ Handlers spécialisés par type objet
    this.objectHandlers = new Map();
    this.registerBuiltinHandlers();
    
    // ✅ Cache des objets détectés
    this.objectCache = {
      lastScanTime: 0,
      scanInterval: 1000, // 1 seconde
      nearbyObjects: [],
      interactableObjects: []
    };
    
    // ✅ Callbacks
    this.callbacks = {
      onObjectInteractionStart: null,
      onObjectInteractionComplete: null,
      onObjectInteractionError: null,
      onObjectCollected: null,
      onItemFound: null,
      onSearchComplete: null,
      onMachineAccessed: null
    };
    
    // ✅ Configuration
    this.config = {
      maxInteractionDistance: INTERACTION_CONFIG.MAX_INTERACTION_DISTANCE,
      searchRadius: INTERACTION_CONFIG.DEFAULT_SEARCH_RADIUS,
      maxSearchRadius: INTERACTION_CONFIG.MAX_SEARCH_RADIUS,
      interactionCooldown: INTERACTION_CONFIG.DEFAULT_INTERACTION_COOLDOWN,
      searchCooldown: INTERACTION_CONFIG.SEARCH_COOLDOWN,
      enableAutoDetection: true,
      enableObjectCaching: true,
      enableVisualFeedback: true,
      debugMode: INTERACTION_CONFIG.ENABLE_DEBUG_LOGS
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalObjectInteractions: 0,
      objectsCollected: 0,
      searchAttempts: 0,
      itemsFound: 0,
      machinesAccessed: 0,
      interactionsByType: new Map(),
      errors: 0,
      successfulInteractions: 0
    };
    
    console.log('[ObjectInteractionManager] 📦 Créé pour scène:', this.scene.scene.key);
  }

  // === INITIALISATION ===

  initialize(dependencies = {}) {
    console.log('[ObjectInteractionManager] 🚀 === INITIALISATION ===');
    
    // ✅ Injection des dépendances
    this.dependencies = {
      playerManager: dependencies.playerManager || this.scene.playerManager,
      inventorySystem: dependencies.inventorySystem || window.inventorySystem,
      notificationSystem: dependencies.notificationSystem || window.showGameNotification
    };
    
    console.log('[ObjectInteractionManager] 📦 Dépendances injectées:');
    Object.entries(this.dependencies).forEach(([key, value]) => {
      console.log(`  ${key}: ${!!value ? '✅' : '❌'}`);
    });
    
    // ✅ Configurer les callbacks réseau
    this.setupNetworkCallbacks();
    
    // ✅ Démarrer le scan d'objets si activé
    if (this.config.enableObjectCaching) {
      this.startObjectScanning();
    }
    
    this.isInitialized = true;
    console.log('[ObjectInteractionManager] ✅ Initialisé avec succès');
    
    return this;
  }

  setupNetworkCallbacks() {
    if (!this.networkHandler) {
      console.warn('[ObjectInteractionManager] ⚠️ Pas de NetworkHandler - callbacks non configurés');
      return;
    }
    
    console.log('[ObjectInteractionManager] 🔗 Configuration callbacks réseau...');
    
    // ✅ Callback pour résultats d'interaction objet
    this.networkHandler.onObjectInteraction((data) => {
      console.log('[ObjectInteractionManager] 📨 Résultat interaction objet reçu:', data);
      this.handleNetworkObjectResult(data);
    });
    
    // ✅ Callback pour résultats de fouille
    this.networkHandler.onSearchResult((data) => {
      console.log('[ObjectInteractionManager] 🔍 Résultat fouille reçu:', data);
      this.handleNetworkSearchResult(data);
    });
    
    console.log('[ObjectInteractionManager] ✅ Callbacks réseau configurés');
  }

  // === DÉTECTEURS DE TYPE OBJET ===

  registerBuiltinDetectors() {
    console.log('[ObjectInteractionManager] 🔍 Enregistrement détecteurs d\'objets...');
    
    // ✅ Détecteur pokeball au sol
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.POKEBALL, (objects) => {
      return objects.filter(obj => {
        const name = (obj.name || '').toLowerCase();
        return name.includes('pokeball') || name.includes('poke_ball') || name.includes('ball');
      });
    });
    
    // ✅ Détecteur objets collectibles
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.COLLECTIBLE, (objects) => {
      return objects.filter(obj => {
        const props = obj.properties || {};
        return props.collectible === true || 
               props.itemType === 'collectible' ||
               props.canCollect === true;
      });
    });
    
    // ✅ Détecteur PC
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.PC, (objects) => {
      return objects.filter(obj => {
        const name = (obj.name || '').toLowerCase();
        const props = obj.properties || {};
        return name.includes('pc') || 
               name.includes('computer') || 
               props.objectType === 'pc' ||
               props.isPC === true;
      });
    });
    
    // ✅ Détecteur machines
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.MACHINE, (objects) => {
      return objects.filter(obj => {
        const props = obj.properties || {};
        return props.objectType === 'machine' ||
               props.isMachine === true ||
               props.machineType !== undefined;
      });
    });
    
    // ✅ Détecteur vending machines
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.VENDING_MACHINE, (objects) => {
      return objects.filter(obj => {
        const name = (obj.name || '').toLowerCase();
        const props = obj.properties || {};
        return name.includes('vending') ||
               name.includes('distributeur') ||
               props.objectType === 'vendingMachine';
      });
    });
    
    // ✅ Détecteur conteneurs
    this.registerObjectDetector(OBJECT_INTERACTION_TYPES.CONTAINER, (objects) => {
      return objects.filter(obj => {
        const props = obj.properties || {};
        return props.objectType === 'container' ||
               props.isContainer === true ||
               props.canOpen === true;
      });
    });
    
    console.log(`[ObjectInteractionManager] ✅ ${this.objectDetectors.size} détecteurs enregistrés`);
  }

  registerObjectDetector(type, detector, priority = 50) {
    console.log(`[ObjectInteractionManager] 📝 Enregistrement détecteur: ${type} (priorité: ${priority})`);
    
    this.objectDetectors.set(type, {
      type: type,
      detector: detector,
      priority: priority,
      enabled: true,
      description: `Détecteur pour ${type}`
    });
  }

  // === HANDLERS SPÉCIALISÉS ===

  registerBuiltinHandlers() {
    console.log('[ObjectInteractionManager] ⚙️ Enregistrement handlers...');
    
    // ✅ Handler pokeball
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.POKEBALL, (object, data) => {
      return this.handlePokeballInteraction(object, data);
    });
    
    // ✅ Handler collectibles
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.COLLECTIBLE, (object, data) => {
      return this.handleCollectibleInteraction(object, data);
    });
    
    // ✅ Handler PC
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.PC, (object, data) => {
      return this.handlePCInteraction(object, data);
    });
    
    // ✅ Handler machines
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.MACHINE, (object, data) => {
      return this.handleMachineInteraction(object, data);
    });
    
    // ✅ Handler vending machines
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.VENDING_MACHINE, (object, data) => {
      return this.handleVendingMachineInteraction(object, data);
    });
    
    // ✅ Handler conteneurs
    this.registerObjectHandler(OBJECT_INTERACTION_TYPES.CONTAINER, (object, data) => {
      return this.handleContainerInteraction(object, data);
    });
    
    console.log(`[ObjectInteractionManager] ✅ ${this.objectHandlers.size} handlers enregistrés`);
  }

  registerObjectHandler(type, handler) {
    console.log(`[ObjectInteractionManager] 🔧 Enregistrement handler: ${type}`);
    
    this.objectHandlers.set(type, {
      type: type,
      handler: handler,
      registeredAt: Date.now()
    });
  }

  // === LOGIQUE PRINCIPALE D'INTERACTION ===

  async interactWithObject(object, options = {}) {
    console.log('[ObjectInteractionManager] 🎯 === INTERACTION OBJET ===');
    console.log('[ObjectInteractionManager] Objet:', object?.name || object?.id || 'unknown');
    console.log('[ObjectInteractionManager] Options:', options);
    
    // ✅ Vérifications préliminaires
    if (!this.canInteractWithObject(object)) {
      return false;
    }
    
    try {
      this.state.isProcessingInteraction = true;
      this.state.lastInteractedObject = object;
      this.state.lastInteractionTime = Date.now();
      
      // ✅ Détecter le type d'interaction
      const interactionType = this.detectObjectInteractionType(object);
      if (!interactionType) {
        throw new Error(`Type d'interaction non déterminé pour objet: ${object.name || object.id}`);
      }
      
      console.log(`[ObjectInteractionManager] Type détecté: ${interactionType}`);
      this.state.currentInteractionType = interactionType;
      
      // ✅ Callback de début
      if (this.callbacks.onObjectInteractionStart) {
        this.callbacks.onObjectInteractionStart(object, interactionType);
      }
      
      // ✅ Envoyer l'interaction au serveur
      // ✅ APRÈS - Passer le type détecté
      const networkResult = await this.sendObjectInteraction(object, {
        ...options,
        detectedType: interactionType
      });
      if (!networkResult) {
        throw new Error('Échec envoi interaction réseau');
      }
      
      // ✅ Mise à jour statistiques
      this.updateStats(interactionType, true);
      
      console.log('[ObjectInteractionManager] ✅ Interaction envoyée avec succès');
      return true;
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur interaction:', error);
      
      this.updateStats(this.state.currentInteractionType, false);
      this.handleInteractionError(error, object);
      
      return false;
      
    } finally {
      // ✅ Reset état après délai
      setTimeout(() => {
        this.state.isProcessingInteraction = false;
        this.state.currentInteractionType = null;
      }, 100);
    }
  }

async sendObjectInteraction(object, options = {}) {
  console.log('[ObjectInteractionManager] 📤 Envoi interaction objet...');
  
  if (!this.networkHandler) {
    console.error('[ObjectInteractionManager] ❌ Pas de NetworkHandler');
    return false;
  }
  
  try {
    // ✅ CORRECTION : Utiliser les propriétés du sprite Phaser
    const objectId = object.objectId || object.id || object.name || 'unknown_object';
    
    // ✅ CORRECTION CRITIQUE : Utiliser this.state.currentInteractionType en PRIORITÉ (contient "pokeball")
    const objectType = options.detectedType || this.state.currentInteractionType || object.objectType || options.objectType || 'unknown';
    
    // ✅ Position de l'objet
    const objectPosition = object.x !== undefined && object.y !== undefined 
      ? { x: object.x, y: object.y }
      : null;
    
    // ✅ CORRECTION : Récupérer le nom depuis objectData en PRIORITÉ
    const itemName = object.objectData?.name || object.properties?.name || object.name || '';
    
    console.log('[ObjectInteractionManager] 🔍 DEBUG NAME:', {
      'objectData.name': object.objectData?.name,
      'properties.name': object.properties?.name,
      'object.name': object.name,
      'itemName final': itemName
    });
    
    // ✅ CORRECTION : Données supplémentaires avec les bonnes propriétés
    const additionalData = {
      objectName: object.name || object.objectId || objectId,
      objectType: objectType, // ← "pokeball" (détecté client)
      name: itemName, // ← "loveball" depuis objectData ✅
      interactionType: this.state.currentInteractionType,
      ...options
    };
        
    // ✅ LOG DEBUG pour vérifier les valeurs
    console.log('[ObjectInteractionManager] 🔍 DEBUG ENVOI:', {
      objectId,
      objectType,
      name: itemName, // ← Vérifier que c'est "loveball"
      currentInteractionType: this.state.currentInteractionType
    });
    
    // ✅ Envoyer via NetworkHandler
     const result = this.networkHandler.sendObjectInteract(objectId);
    
    console.log(`[ObjectInteractionManager] Résultat envoi: ${result}`);
    return result;
    
  } catch (error) {
    console.error('[ObjectInteractionManager] ❌ Erreur envoi:', error);
    return false;
  }
}
  // === FOUILLE D'OBJETS CACHÉS ===

  async searchHiddenItems(position = null, searchRadius = null) {
    console.log('[ObjectInteractionManager] 🔍 === FOUILLE OBJETS CACHÉS ===');
    console.log('[ObjectInteractionManager] Position:', position);
    console.log('[ObjectInteractionManager] Radius:', searchRadius);
    
    // ✅ Vérifications préliminaires
    if (!this.canSearchHiddenItems()) {
      return false;
    }
    
    try {
      // ✅ Déterminer position de fouille
      const searchPosition = position || this.getPlayerPosition();
      if (!searchPosition) {
        throw new Error('Position de fouille non déterminée');
      }
      
      // ✅ Déterminer rayon de recherche
      const radius = searchRadius || this.config.searchRadius;
      
      this.state.lastSearchTime = Date.now();
      
      // ✅ Envoyer la demande de fouille
      const networkResult = await this.sendSearchRequest(searchPosition, radius);
      if (!networkResult) {
        throw new Error('Échec envoi demande de fouille');
      }
      
      // ✅ Mise à jour statistiques
      this.stats.searchAttempts++;
      
      console.log('[ObjectInteractionManager] ✅ Demande de fouille envoyée');
      return true;
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur fouille:', error);
      this.handleSearchError(error);
      return false;
    }
  }

  async sendSearchRequest(position, radius) {
    console.log('[ObjectInteractionManager] 📤 Envoi demande fouille...');
    
    if (!this.networkHandler) {
      console.error('[ObjectInteractionManager] ❌ Pas de NetworkHandler');
      return false;
    }
    
    try {
      // ✅ Envoyer via NetworkHandler
      const result = this.networkHandler.sendSearchHiddenItem(position, radius, {
        searchType: 'manual',
        timestamp: Date.now()
      });
      
      console.log(`[ObjectInteractionManager] Résultat envoi fouille: ${result}`);
      return result;
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur envoi fouille:', error);
      return false;
    }
  }

  // === GESTION DES RÉSULTATS RÉSEAU ===

  handleNetworkObjectResult(data) {
    console.log('[ObjectInteractionManager] 🔄 === TRAITEMENT RÉSULTAT OBJET ===');
    console.log('[ObjectInteractionManager] Data:', data);
    
    try {
      // ✅ Déterminer le type de résultat
      const resultType = this.determineObjectResultType(data);
      console.log(`[ObjectInteractionManager] Type de résultat: ${resultType}`);
      
      // ✅ Obtenir le handler approprié
      const handler = this.objectHandlers.get(resultType);
      if (!handler) {
        console.warn(`[ObjectInteractionManager] ⚠️ Pas de handler pour: ${resultType}`);
        this.handleGenericObjectResult(data);
        return;
      }
      
      // ✅ Récupérer l'objet
      const object = this.state.lastInteractedObject || this.findObjectById(data.objectId);
      
      // ✅ Appeler le handler spécialisé
      const result = handler.handler(object, data);
      
      // ✅ Callback de complétion
      if (this.callbacks.onObjectInteractionComplete) {
        this.callbacks.onObjectInteractionComplete(object, data, result);
      }
      
      console.log('[ObjectInteractionManager] ✅ Résultat objet traité avec succès');
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur traitement résultat objet:', error);
      this.handleInteractionError(error, null, data);
    }
  }

  handleNetworkSearchResult(data) {
    console.log('[ObjectInteractionManager] 🔄 === TRAITEMENT RÉSULTAT FOUILLE ===');
    console.log('[ObjectInteractionManager] Data:', data);
    
    try {
      if (data.found && data.item) {
        console.log(`[ObjectInteractionManager] ✅ Objet trouvé: ${data.item.name || data.item.id}`);
        
        // ✅ Mise à jour statistiques
        this.stats.itemsFound++;
        
        // ✅ Afficher message de succès
        this.showInteractionMessage(
          data.message || `Vous avez trouvé: ${data.item.name || 'un objet'} !`, 
          'success'
        );
        
        // ✅ Callback spécifique
        if (this.callbacks.onItemFound) {
          this.callbacks.onItemFound(data.item, data);
        }
        
        // ✅ Ajouter à l'inventaire si système disponible
        this.addItemToInventory(data.item);
        
      } else {
        console.log('[ObjectInteractionManager] 🔍 Rien trouvé lors de la fouille');
        
        // ✅ Afficher message d'échec
        this.showInteractionMessage(
          data.message || 'Aucun objet caché trouvé ici.', 
          'info'
        );
      }
      
      // ✅ Callback de complétion fouille
      if (this.callbacks.onSearchComplete) {
        this.callbacks.onSearchComplete(data);
      }
      
      console.log('[ObjectInteractionManager] ✅ Résultat fouille traité avec succès');
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur traitement résultat fouille:', error);
      this.handleSearchError(error, data);
    }
  }

  determineObjectResultType(data) {
    // ✅ Mapping des types serveur vers types client
    const typeMapping = {
      'objectCollected': OBJECT_INTERACTION_TYPES.COLLECTIBLE,
      'itemFound': OBJECT_INTERACTION_TYPES.COLLECTIBLE,
      'pcAccess': OBJECT_INTERACTION_TYPES.PC,
      'machineActivated': OBJECT_INTERACTION_TYPES.MACHINE,
      'containerOpened': OBJECT_INTERACTION_TYPES.CONTAINER,
      'vendingMachineAccess': OBJECT_INTERACTION_TYPES.VENDING_MACHINE,
      'pokeball': OBJECT_INTERACTION_TYPES.POKEBALL
    };
    
    // ✅ Vérifier type explicite
    if (data.resultType && typeMapping[data.resultType]) {
      return typeMapping[data.resultType];
    }
    
    // ✅ Vérifier objectType
    if (data.objectType && Object.values(OBJECT_INTERACTION_TYPES).includes(data.objectType)) {
      return data.objectType;
    }
    
    // ✅ Détection par nom d'objet
    if (data.objectName) {
      const name = data.objectName.toLowerCase();
      if (name.includes('pokeball') || name.includes('ball')) {
        return OBJECT_INTERACTION_TYPES.POKEBALL;
      }
      if (name.includes('pc') || name.includes('computer')) {
        return OBJECT_INTERACTION_TYPES.PC;
      }
      if (name.includes('machine')) {
        return OBJECT_INTERACTION_TYPES.MACHINE;
      }
    }
    
    // ✅ Fallback vers collectible
    return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
  }

  // === HANDLERS SPÉCIALISÉS ===

  handlePokeballInteraction(object, data) {
    console.log('[ObjectInteractionManager] ⚽ === HANDLER POKEBALL ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Pokeball collectée: ${object?.name || 'pokeball'}`);
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || 'Pokeball ajoutée à votre inventaire !', 
        'success'
      );
      
      // ✅ Callback spécifique
      if (this.callbacks.onObjectCollected) {
        this.callbacks.onObjectCollected(object, data);
      }
      
      // ✅ Ajouter à l'inventaire
      if (data.item) {
        this.addItemToInventory(data.item);
      }
      
      // ✅ Supprimer l'objet de la scène si nécessaire
      this.removeObjectFromScene(object);
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Échec collecte pokeball');
      this.showInteractionMessage(data.message || 'Impossible de collecter cette pokeball', 'error');
    }
    
    return data.success;
  }

  handleCollectibleInteraction(object, data) {
    console.log('[ObjectInteractionManager] 💎 === HANDLER COLLECTIBLE ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Objet collecté: ${object?.name || 'objet'}`);
      
      // ✅ Mise à jour statistiques
      this.stats.objectsCollected++;
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || `${object?.name || 'Objet'} ajouté à votre inventaire !`, 
        'success'
      );
      
      // ✅ Callback spécifique
      if (this.callbacks.onObjectCollected) {
        this.callbacks.onObjectCollected(object, data);
      }
      
      // ✅ Ajouter à l'inventaire
      if (data.item) {
        this.addItemToInventory(data.item);
      }
      
      // ✅ Supprimer de la scène
      this.removeObjectFromScene(object);
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Échec collecte objet');
      this.showInteractionMessage(data.message || 'Impossible de collecter cet objet', 'error');
    }
    
    return data.success;
  }

  handlePCInteraction(object, data) {
    console.log('[ObjectInteractionManager] 💻 === HANDLER PC ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Accès PC accordé`);
      
      // ✅ Mise à jour statistiques
      this.stats.machinesAccessed++;
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || 'Accès au PC accordé !', 
        'success'
      );
      
      // ✅ Callback spécifique
      if (this.callbacks.onMachineAccessed) {
        this.callbacks.onMachineAccessed(object, data, 'PC');
      }
      
      // ✅ Ouvrir interface PC si disponible
      this.openPCInterface(data);
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Accès PC refusé');
      this.showInteractionMessage(data.message || 'Accès au PC refusé', 'error');
    }
    
    return data.success;
  }

  handleMachineInteraction(object, data) {
    console.log('[ObjectInteractionManager] ⚙️ === HANDLER MACHINE ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Machine activée: ${data.machineType || 'machine'}`);
      
      // ✅ Mise à jour statistiques
      this.stats.machinesAccessed++;
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || `${data.machineType || 'Machine'} activée !`, 
        'success'
      );
      
      // ✅ Callback spécifique
      if (this.callbacks.onMachineAccessed) {
        this.callbacks.onMachineAccessed(object, data, data.machineType);
      }
      
      // ✅ Actions spécifiques selon le type de machine
      this.handleSpecificMachineType(data);
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Échec activation machine');
      this.showInteractionMessage(data.message || 'Impossible d\'activer cette machine', 'error');
    }
    
    return data.success;
  }

  handleVendingMachineInteraction(object, data) {
    console.log('[ObjectInteractionManager] 🥤 === HANDLER VENDING MACHINE ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Distributeur accessible`);
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || 'Distributeur accessible !', 
        'success'
      );
      
      // ✅ Callback spécifique
      if (this.callbacks.onMachineAccessed) {
        this.callbacks.onMachineAccessed(object, data, 'VENDING_MACHINE');
      }
      
      // ✅ Ouvrir interface distributeur si disponible
      this.openVendingMachineInterface(data);
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Distributeur inaccessible');
      this.showInteractionMessage(data.message || 'Distributeur inaccessible', 'error');
    }
    
    return data.success;
  }

  handleContainerInteraction(object, data) {
    console.log('[ObjectInteractionManager] 📦 === HANDLER CONTAINER ===');
    
    if (data.success) {
      console.log(`[ObjectInteractionManager] ✅ Conteneur ouvert`);
      
      // ✅ Message de succès
      this.showInteractionMessage(
        data.message || 'Conteneur ouvert !', 
        'success'
      );
      
      // ✅ Afficher contenu si disponible
      if (data.contents && data.contents.length > 0) {
        this.showContainerContents(data.contents);
      }
      
    } else {
      console.log('[ObjectInteractionManager] ❌ Impossible d\'ouvrir le conteneur');
      this.showInteractionMessage(data.message || 'Conteneur verrouillé ou vide', 'error');
    }
    
    return data.success;
  }

  handleGenericObjectResult(data) {
    console.log('[ObjectInteractionManager] ❓ === HANDLER GÉNÉRIQUE ===');
    console.log('[ObjectInteractionManager] Data:', data);
    
    // ✅ Traitement générique
    if (data.success) {
      this.showInteractionMessage(data.message || 'Interaction réussie', 'success');
    } else {
      this.showInteractionMessage(data.message || 'Échec de l\'interaction', 'error');
    }
  }

  // === DÉTECTION ET VALIDATION ===

detectObjectInteractionType(object) {
  console.log('[ObjectInteractionManager] 🔍 === DÉTECTION TYPE OBJET ===');
  
  // ✅ CORRECTION : Utiliser les propriétés du sprite Phaser
  const objectName = object?.name || object?.objectId || 'unknown';
  const objectType = object?.objectType || 'unknown';
  const objectData = object?.objectData || {};
  const texture = object?.texture?.key || '';
  
  console.log('[ObjectInteractionManager] === PROPRIÉTÉS SPRITE ===');
  console.log('[ObjectInteractionManager] Nom/ID:', objectName);
  console.log('[ObjectInteractionManager] Type:', objectType);
  console.log('[ObjectInteractionManager] Texture:', texture);
  console.log('[ObjectInteractionManager] ObjectData:', objectData);
  
  if (!this.config.enableAutoDetection) {
    console.log('[ObjectInteractionManager] Auto-détection désactivée');
    return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
  }
  
  // ✅ DÉTECTION PRIORITAIRE PAR TEXTURE
  if (texture.includes('pokeball')) {
    console.log('[ObjectInteractionManager] ✅ Détecté comme POKEBALL via texture');
    return OBJECT_INTERACTION_TYPES.POKEBALL;
  }
  
  if (texture.includes('potion')) {
    console.log('[ObjectInteractionManager] ✅ Détecté comme COLLECTIBLE (potion) via texture');
    return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
  }
  
  if (texture.includes('berry')) {
    console.log('[ObjectInteractionManager] ✅ Détecté comme COLLECTIBLE (berry) via texture');
    return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
  }
  
  if (texture.includes('treasure') || texture.includes('chest')) {
    console.log('[ObjectInteractionManager] ✅ Détecté comme CONTAINER via texture');
    return OBJECT_INTERACTION_TYPES.CONTAINER;
  }
  
  // ✅ DÉTECTION PAR PROPRIÉTÉS OBJECTDATA
  if (objectData.type) {
    const dataType = objectData.type.toLowerCase();
    if (dataType.includes('pokeball') || dataType.includes('ball')) {
      console.log('[ObjectInteractionManager] ✅ Détecté comme POKEBALL via objectData.type');
      return OBJECT_INTERACTION_TYPES.POKEBALL;
    }
    if (dataType.includes('potion') || dataType.includes('heal')) {
      console.log('[ObjectInteractionManager] ✅ Détecté comme COLLECTIBLE via objectData.type');
      return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
    }
  }
  
  // ✅ DÉTECTION PAR NOM
  if (objectName && typeof objectName === 'string') {
    const name = objectName.toLowerCase();
    if (name.includes('pokeball') || name.includes('ball')) {
      console.log('[ObjectInteractionManager] ✅ Détecté comme POKEBALL via nom');
      return OBJECT_INTERACTION_TYPES.POKEBALL;
    }
    if (name.includes('potion') || name.includes('heal')) {
      console.log('[ObjectInteractionManager] ✅ Détecté comme COLLECTIBLE via nom');
      return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
    }
    if (name.includes('pc') || name.includes('computer')) {
      console.log('[ObjectInteractionManager] ✅ Détecté comme PC via nom');
      return OBJECT_INTERACTION_TYPES.PC;
    }
  }
  
  // ✅ ANCIENNE LOGIQUE DÉTECTEURS (en fallback)
  const singleObjectArray = [object];
  
  // Trier par priorité
  const sortedDetectors = Array.from(this.objectDetectors.values())
    .sort((a, b) => a.priority - b.priority);
  
  console.log(`[ObjectInteractionManager] Test de ${sortedDetectors.length} détecteurs...`);
  
  // Tester chaque détecteur
  for (const detector of sortedDetectors) {
    try {
      console.log(`[ObjectInteractionManager] Test détecteur: ${detector.type}`);
      
      const matches = detector.detector(singleObjectArray);
      if (matches && matches.length > 0) {
        console.log(`[ObjectInteractionManager] ✅ Match trouvé: ${detector.type}`);
        return detector.type;
      }
    } catch (error) {
      console.error(`[ObjectInteractionManager] ❌ Erreur détecteur "${detector.type}":`, error);
    }
  }
  
  console.log('[ObjectInteractionManager] 🚫 Aucun type détecté, fallback vers COLLECTIBLE');
  return OBJECT_INTERACTION_TYPES.COLLECTIBLE;
}

  canInteractWithObject(object) {
    // ✅ Vérifications de base
    if (!object) {
      console.log('[ObjectInteractionManager] 🚫 Objet manquant');
      return false;
    }
    
    if (!this.isInitialized) {
      console.log('[ObjectInteractionManager] 🚫 Manager non initialisé');
      return false;
    }
    
    if (this.state.isProcessingInteraction) {
      console.log('[ObjectInteractionManager] 🚫 Interaction déjà en cours');
      return false;
    }
    
    // ✅ Vérification cooldown
    const now = Date.now();
    if (now < this.state.blockedUntil) {
      const remaining = this.state.blockedUntil - now;
      console.log(`[ObjectInteractionManager] 🚫 Bloqué encore ${remaining}ms`);
      return false;
    }
    
    if (now - this.state.lastInteractionTime < this.config.interactionCooldown) {
      const remaining = this.config.interactionCooldown - (now - this.state.lastInteractionTime);
      console.log(`[ObjectInteractionManager] 🚫 Cooldown actif: ${remaining}ms`);
      return false;
    }
    
    // ✅ Vérification distance
    if (!this.isObjectInRange(object)) {
      console.log('[ObjectInteractionManager] 🚫 Objet trop loin');
      return false;
    }
    
    return true;
  }

  canSearchHiddenItems() {
    // ✅ Vérifications de base
    if (!this.isInitialized) {
      console.log('[ObjectInteractionManager] 🚫 Manager non initialisé');
      return false;
    }
    
    // ✅ Vérification cooldown fouille
    const now = Date.now();
    if (now - this.state.lastSearchTime < this.config.searchCooldown) {
      const remaining = this.config.searchCooldown - (now - this.state.lastSearchTime);
      console.log(`[ObjectInteractionManager] 🚫 Cooldown fouille actif: ${remaining}ms`);
      return false;
    }
    
    return true;
  }

  isObjectInRange(object) {
    const playerManager = this.dependencies.playerManager;
    if (!playerManager) {
      console.log('[ObjectInteractionManager] ⚠️ PlayerManager manquant - skip vérification distance');
      return true;
    }
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer) {
      console.log('[ObjectInteractionManager] ⚠️ Mon joueur non trouvé');
      return false;
    }
    
    if (object.x === undefined || object.y === undefined) {
      console.log('[ObjectInteractionManager] ⚠️ Position objet manquante - assume in range');
      return true;
    }
    
    const distance = Math.sqrt(
      Math.pow(object.x - myPlayer.x, 2) + 
      Math.pow(object.y - myPlayer.y, 2)
    );
    
    const inRange = distance <= this.config.maxInteractionDistance;
    console.log(`[ObjectInteractionManager] Distance: ${distance.toFixed(1)}px, Max: ${this.config.maxInteractionDistance}px, InRange: ${inRange}`);
    
    return inRange;
  }

  // === SCAN D'OBJETS ===

  startObjectScanning() {
    console.log('[ObjectInteractionManager] 🔄 Démarrage scan d\'objets...');
    
    // ✅ Scanner initial
    this.scanNearbyObjects();
    
    // ✅ Scanner périodique
    this.objectScanInterval = setInterval(() => {
      this.scanNearbyObjects();
    }, this.objectCache.scanInterval);
    
    console.log('[ObjectInteractionManager] ✅ Scan d\'objets démarré');
  }

  scanNearbyObjects() {
    const now = Date.now();
    if (now - this.objectCache.lastScanTime < this.objectCache.scanInterval) {
      return; // Trop tôt pour scanner
    }
    
    try {
      // ✅ Scanner les objets visibles dans la scène
      const visibleObjects = this.getVisibleObjects();
      
      // ✅ Filtrer les objets interactables
      const interactableObjects = this.filterInteractableObjects(visibleObjects);
      
      // ✅ Mettre à jour le cache
      this.objectCache.lastScanTime = now;
      this.objectCache.nearbyObjects = visibleObjects;
      this.objectCache.interactableObjects = interactableObjects;
      
      if (this.config.debugMode && interactableObjects.length > 0) {
        console.log(`[ObjectInteractionManager] 📊 Scan: ${interactableObjects.length} objets interactables`);
      }
      
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur scan objets:', error);
    }
  }

  getVisibleObjects() {
    // ✅ À implémenter selon la structure de la scène
    // Pour l'instant, retourne un tableau vide
    // TODO: Scanner les objets de la scène Phaser
    return [];
  }

  filterInteractableObjects(objects) {
    return objects.filter(object => {
      // ✅ Vérifier si l'objet est dans la portée
      if (!this.isObjectInRange(object)) {
        return false;
      }
      
      // ✅ Vérifier si l'objet a un type détectable
      const type = this.detectObjectInteractionType(object);
      return type !== null;
    });
  }

  // === GESTION D'INVENTAIRE ===

  addItemToInventory(item) {
    const inventorySystem = this.dependencies.inventorySystem;
    if (!inventorySystem) {
      console.log('[ObjectInteractionManager] ⚠️ InventorySystem non disponible');
      return false;
    }
    
    try {
      if (typeof inventorySystem.addItem === 'function') {
        console.log(`[ObjectInteractionManager] 📦 Ajout à l'inventaire: ${item.name || item.id}`);
        return inventorySystem.addItem(item);
      } else {
        console.log('[ObjectInteractionManager] ⚠️ Méthode addItem non disponible');
        return false;
      }
    } catch (error) {
      console.error('[ObjectInteractionManager] ❌ Erreur ajout inventaire:', error);
      return false;
    }
  }

  // === GESTION D'INTERFACES ===

  openPCInterface(data) {
    console.log('[ObjectInteractionManager] 💻 Ouverture interface PC...');
    
    // ✅ À implémenter selon les systèmes disponibles
    if (typeof window.openPCInterface === 'function') {
      window.openPCInterface(data);
    } else {
      console.log('[ObjectInteractionManager] ⚠️ Interface PC non disponible');
    }
  }

  openVendingMachineInterface(data) {
    console.log('[ObjectInteractionManager] 🥤 Ouverture interface distributeur...');
    
    // ✅ À implémenter selon les systèmes disponibles
    if (typeof window.openVendingMachine === 'function') {
      window.openVendingMachine(data);
    } else {
      console.log('[ObjectInteractionManager] ⚠️ Interface distributeur non disponible');
    }
  }

  showContainerContents(contents) {
    console.log('[ObjectInteractionManager] 📦 Affichage contenu conteneur:', contents);
    
    // ✅ À implémenter selon les systèmes d'interface
    const contentsText = contents.map(item => item.name || item.id).join(', ');
    this.showInteractionMessage(`Contenu: ${contentsText}`, 'info');
  }

  handleSpecificMachineType(data) {
    const machineType = data.machineType;
    
    switch (machineType) {
      case 'healing':
        console.log('[ObjectInteractionManager] 🏥 Machine de soin activée');
        break;
      case 'storage':
        console.log('[ObjectInteractionManager] 📦 Machine de stockage activée');
        break;
      case 'crafting':
        console.log('[ObjectInteractionManager] 🔨 Machine de craft activée');
        break;
      default:
        console.log(`[ObjectInteractionManager] ⚙️ Machine générique activée: ${machineType}`);
    }
  }

  // === UTILITAIRES ===

  getPlayerPosition() {
    const playerManager = this.dependencies.playerManager;
    if (!playerManager) return null;
    
    const myPlayer = playerManager.getMyPlayer();
    if (!myPlayer) return null;
    
    return { x: myPlayer.x, y: myPlayer.y };
  }

  findObjectById(objectId) {
    // ✅ Chercher dans le cache d'objets
    return this.objectCache.nearbyObjects.find(obj => 
      obj.id === objectId || obj.name === objectId
    ) || null;
  }

  removeObjectFromScene(object) {
    console.log(`[ObjectInteractionManager] 🗑️ Suppression objet de la scène: ${object?.name || object?.id}`);
    
    // ✅ À implémenter selon la structure de la scène
    // TODO: Supprimer l'objet de la scène Phaser
    
    // ✅ Supprimer du cache
    this.objectCache.nearbyObjects = this.objectCache.nearbyObjects.filter(obj => obj !== object);
    this.objectCache.interactableObjects = this.objectCache.interactableObjects.filter(obj => obj !== object);
  }

  handleInteractionError(error, object = null, data = null) {
    console.error('[ObjectInteractionManager] ❌ Erreur interaction:', error);
    
    this.stats.errors++;
    
    // ✅ Callback d'erreur
    if (this.callbacks.onObjectInteractionError) {
      this.callbacks.onObjectInteractionError(error, object, data);
    }
    
    // ✅ Afficher message d'erreur
    this.showInteractionMessage(error.message || 'Erreur d\'interaction avec l\'objet', 'error');
  }

  handleSearchError(error, data = null) {
    console.error('[ObjectInteractionManager] ❌ Erreur fouille:', error);
    
    this.stats.errors++;
    
    // ✅ Afficher message d'erreur
    this.showInteractionMessage(error.message || 'Erreur lors de la fouille', 'error');
  }

  showInteractionMessage(message, type = 'info') {
    console.log(`[ObjectInteractionManager] 💬 Message: ${message} (${type})`);
    
    const notificationSystem = this.dependencies.notificationSystem;
    if (typeof notificationSystem === 'function') {
      try {
        notificationSystem(message, type, { 
          duration: 3000,
          position: 'bottom-right'
        });
      } catch (error) {
        console.error('[ObjectInteractionManager] ❌ Erreur notification:', error);
        console.log(`[ObjectInteractionManager] ${type.toUpperCase()}: ${message}`);
      }
    } else {
      console.log(`[ObjectInteractionManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  // === STATISTIQUES ===

  updateStats(interactionType, success) {
    this.stats.totalObjectInteractions++;
    
    if (success) {
      this.stats.successfulInteractions++;
    }
    
    if (interactionType) {
      const current = this.stats.interactionsByType.get(interactionType) || 0;
      this.stats.interactionsByType.set(interactionType, current + 1);
    }
  }

  // === CALLBACKS PUBLICS ===

  onObjectInteractionStart(callback) { this.callbacks.onObjectInteractionStart = callback; }
  onObjectInteractionComplete(callback) { this.callbacks.onObjectInteractionComplete = callback; }
  onObjectInteractionError(callback) { this.callbacks.onObjectInteractionError = callback; }
  onObjectCollected(callback) { this.callbacks.onObjectCollected = callback; }
  onItemFound(callback) { this.callbacks.onItemFound = callback; }
  onSearchComplete(callback) { this.callbacks.onSearchComplete = callback; }
  onMachineAccessed(callback) { this.callbacks.onMachineAccessed = callback; }

  // === CONFIGURATION ===

  setConfig(newConfig) {
    console.log('[ObjectInteractionManager] 🔧 Mise à jour configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  blockInteractions(duration = 5000, reason = "Interactions objets bloquées") {
    console.log(`[ObjectInteractionManager] 🚫 Blocage interactions: ${duration}ms (${reason})`);
    this.state.blockedUntil = Date.now() + duration;
  }

  // === DEBUG ===

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      state: this.state,
      config: this.config,
      stats: {
        ...this.stats,
        interactionsByType: Object.fromEntries(this.stats.interactionsByType),
        successRate: this.stats.totalObjectInteractions > 0 
          ? ((this.stats.successfulInteractions / this.stats.totalObjectInteractions) * 100).toFixed(1) + '%'
          : '0%'
      },
      cache: {
        lastScanTime: this.objectCache.lastScanTime,
        nearbyObjectsCount: this.objectCache.nearbyObjects.length,
        interactableObjectsCount: this.objectCache.interactableObjects.length
      },
      detectors: Array.from(this.objectDetectors.keys()),
      handlers: Array.from(this.objectHandlers.keys()),
      dependencies: Object.fromEntries(
        Object.entries(this.dependencies).map(([key, value]) => [key, !!value])
      ),
      sceneKey: this.scene?.scene?.key,
      networkHandlerReady: !!this.networkHandler?.isInitialized
    };
  }

  resetStats() {
    console.log('[ObjectInteractionManager] 🔄 Reset statistiques');
    
    this.stats = {
      totalObjectInteractions: 0,
      objectsCollected: 0,
      searchAttempts: 0,
      itemsFound: 0,
      machinesAccessed: 0,
      interactionsByType: new Map(),
      errors: 0,
      successfulInteractions: 0
    };
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('[ObjectInteractionManager] 💀 Destruction...');
    
    // ✅ Arrêter le scan d'objets
    if (this.objectScanInterval) {
      clearInterval(this.objectScanInterval);
      this.objectScanInterval = null;
    }
    
    // ✅ Nettoyer callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    // ✅ Nettoyer collections
    this.objectDetectors.clear();
    this.objectHandlers.clear();
    this.stats.interactionsByType.clear();
    this.objectCache.nearbyObjects = [];
    this.objectCache.interactableObjects = [];
    
    // ✅ Reset état
    this.isInitialized = false;
    this.scene = null;
    this.networkHandler = null;
    
    console.log('[ObjectInteractionManager] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugObjectInteractionManager = function() {
  // Essayer de trouver le manager dans différents endroits
  const managers = [
    window.globalNetworkManager?.objectInteractionManager,
    window.game?.scene?.getScenes(true)?.[0]?.objectInteractionManager,
    window.currentObjectInteractionManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const info = managers[0].getDebugInfo();
    console.log('[ObjectInteractionManager] === DEBUG INFO ===');
    console.table({
      'Interactions Totales': info.stats.totalObjectInteractions,
      'Objets Collectés': info.stats.objectsCollected,
      'Fouilles': info.stats.searchAttempts,
      'Objets Trouvés': info.stats.itemsFound,
      'Machines Accédées': info.stats.machinesAccessed,
      'Taux de Succès': info.stats.successRate
    });
    console.log('[ObjectInteractionManager] Info complète:', info);
    return info;
  } else {
    console.error('[ObjectInteractionManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ ObjectInteractionManager chargé!');
console.log('🔍 Utilisez window.debugObjectInteractionManager() pour diagnostiquer');
