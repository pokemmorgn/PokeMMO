// client/src/types/InteractionTypes.js
// ✅ Types et constantes d'interaction - Validés par le serveur
// 🆕 INTERFACE UNIFIÉE supportée - Champs étendus pour transmission réseau

// === TYPES D'INTERACTION DE BASE ===

export const INTERACTION_TYPES = {
  NPC: 'npc',
  OBJECT: 'object', 
  ENVIRONMENT: 'environment',
  PLAYER: 'player',
  PUZZLE: 'puzzle'
};

// === TYPES DE RÉSULTATS D'INTERACTION ===

export const INTERACTION_RESULT_TYPES = {
  // Résultats NPC
  DIALOGUE: 'dialogue',
  SHOP: 'shop',
  QUEST_GIVER: 'questGiver',
  QUEST_COMPLETE: 'questComplete',
  QUEST_PROGRESS: 'questProgress',
  HEAL: 'heal',
  STARTER_TABLE: 'starterTable',
  
  // Résultats Objets
  OBJECT_COLLECTED: 'objectCollected',
  ITEM_FOUND: 'itemFound',
  PC_ACCESS: 'pcAccess',
  MACHINE_ACTIVATED: 'machineActivated',
  CONTAINER_OPENED: 'containerOpened',
  
  // Résultats Environnement
  ENVIRONMENT_CHANGED: 'environmentChanged',
  DOOR_OPENED: 'doorOpened',
  SWITCH_ACTIVATED: 'switchActivated',
  
  // 🆕 INTERFACE UNIFIÉE
  UNIFIED_INTERFACE: 'unifiedInterface',
  
  // Résultats Universels
  SUCCESS: 'success',
  ERROR: 'error',
  BLOCKED: 'blocked',
  COOLDOWN: 'cooldown'
};

// === MESSAGES RÉSEAU STANDARDISÉS ===

export const NETWORK_MESSAGES = {
  // Envoi (Client → Serveur)
  SEND: {
    NPC_INTERACT: 'npcInteract',
    OBJECT_INTERACT: 'objectInteract', 
    SEARCH_HIDDEN_ITEM: 'searchHiddenItem',
    ENVIRONMENT_INTERACT: 'environmentInteract',
    PLAYER_INTERACT: 'playerInteract'
  },
  
  // Réception (Serveur → Client)
  RECEIVE: {
    NPC_INTERACTION_RESULT: 'npcInteractionResult',
    OBJECT_INTERACTION_RESULT: 'objectInteractionResult',
    SEARCH_RESULT: 'searchResult',
    ENVIRONMENT_INTERACTION_RESULT: 'environmentInteractionResult',
    INTERACTION_ERROR: 'interactionError',
    INTERACTION_BLOCKED: 'interactionBlocked',
    INTERACTION_COOLDOWN: 'interactionCooldown',
    INTERACTION_RESULT: 'interactionResult', // Générique
    // 🆕 INTERFACE UNIFIÉE
    UNIFIED_INTERFACE_RESULT: 'unifiedInterfaceResult'
  }
};

// === STRUCTURES DE DONNÉES STANDARDISÉES ===

export const INTERACTION_DATA_FORMATS = {
  // Format d'envoi interaction NPC
  NPC_INTERACT: {
    npcId: 'string|number', // required - support string ET number
    additionalData: 'object', // optional
    playerPosition: 'object', // optional {x, y}
    timestamp: 'number', // auto
    zone: 'string', // auto
    sessionId: 'string' // auto
  },
  
  // Format d'envoi interaction objet
  OBJECT_INTERACT: {
    objectId: 'string', // required
    objectType: 'string', // optional
    position: 'object', // optional {x, y}
    playerPosition: 'object', // auto {x, y}
    timestamp: 'number', // auto
    zone: 'string', // auto
    sessionId: 'string' // auto
  },
  
  // Format d'envoi fouille
  SEARCH_HIDDEN_ITEM: {
    position: 'object', // required {x, y}
    searchRadius: 'number', // optional, default 32
    playerInfo: 'object', // auto {id, name, position}
    timestamp: 'number', // auto
    zone: 'string', // auto
    sessionId: 'string' // auto
  },
  
  // 🆕 FORMAT RÉPONSE ÉTENDU - Interface Unifiée
  INTERACTION_RESULT: {
    // === CHAMPS DE BASE (existants) ===
    success: 'boolean', // required
    type: 'string', // required (INTERACTION_TYPES)
    resultType: 'string', // required (INTERACTION_RESULT_TYPES)
    message: 'string', // optional
    data: 'object', // optional - données spécifiques
    interactionId: 'string', // optional
    timestamp: 'number', // auto
    
    // === 🆕 CHAMPS INTERFACE UNIFIÉE ===
    // Identification NPC/Objet
    npcId: 'string|number', // optional - ID du NPC (pour compatibilité serveur)
    npcName: 'string', // optional - Nom du NPC
    objectId: 'string', // optional - ID de l'objet
    objectName: 'string', // optional - Nom de l'objet
    
    // Interface unifiée
    isUnifiedInterface: 'boolean', // optional - Flag interface unifiée
    capabilities: 'array', // optional - ['merchant', 'dialogue', 'questGiver']
    contextualData: 'object', // optional - Données contextuelles spécifiques
    
    // Métadonnées étendues
    zone: 'string', // optional - Zone actuelle
    playerPosition: 'object', // optional - {x, y}
    targetPosition: 'object', // optional - {x, y}
    distance: 'number', // optional - Distance calculée
    priority: 'number', // optional - Priorité d'interaction
    
    // Données système
    requiresResponse: 'boolean', // optional - Nécessite une réponse utilisateur
    autoClose: 'boolean', // optional - Fermeture automatique
    cooldownDuration: 'number', // optional - Durée de cooldown (ms)
    
    // Gestion d'erreurs étendues
    errorCode: 'string', // optional - Code erreur spécifique
    errorDetails: 'object', // optional - Détails d'erreur
    
    // Compatibilité future
    version: 'string', // optional - Version de l'interface
    extensions: 'object' // optional - Extensions futures
  },
  
  // 🆕 FORMAT SPÉCIFIQUE INTERFACE UNIFIÉE
  UNIFIED_INTERFACE_RESULT: {
    // Hérite de INTERACTION_RESULT avec champs requis pour interface unifiée
    success: 'boolean', // required
    type: 'string', // required - toujours INTERACTION_TYPES.NPC ou OBJECT
    resultType: 'string', // required - toujours 'unifiedInterface'
    isUnifiedInterface: 'boolean', // required - toujours true
    capabilities: 'array', // required - au moins une capability
    contextualData: 'object', // required - données contextuelles
    npcId: 'string|number', // required si type=NPC
    npcName: 'string', // required si type=NPC
    objectId: 'string', // required si type=OBJECT
    timestamp: 'number' // auto
  }
};

// === 🆕 CAPABILITIES STANDARDISÉES ===

export const UNIFIED_CAPABILITIES = {
  // NPC Capabilities
  DIALOGUE: 'dialogue',
  MERCHANT: 'merchant',
  QUEST_GIVER: 'questGiver',
  HEALER: 'healer',
  TRAINER: 'trainer',
  GYM_LEADER: 'gymLeader',
  STARTER_SELECTOR: 'starterSelector',
  TELEPORTER: 'teleporter',
  
  // Object Capabilities
  COLLECTIBLE: 'collectible',
  CONTAINER: 'container',
  PC_ACCESS: 'pcAccess',
  MACHINE: 'machine',
  VENDING: 'vending',
  STORAGE: 'storage',
  
  // Environment Capabilities
  DOOR: 'door',
  SWITCH: 'switch',
  PORTAL: 'portal',
  TRIGGER: 'trigger'
};

// === VALIDATEURS CÔTÉ CLIENT ===
// ⚠️ Le serveur fait la validation définitive !

export class InteractionValidator {
  
  // Valider données interaction NPC
  static validateNpcInteract(data) {
    const errors = [];
    
    // ✅ Accepter number ET string
    if (!data.npcId || (typeof data.npcId !== 'string' && typeof data.npcId !== 'number')) {
      errors.push('npcId requis (string ou number)');
    }
    
    // ❌ NE PAS convertir en string - garder le type original
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Valider données interaction objet
  static validateObjectInteract(data) {
    const errors = [];
    
    if (!data.objectId || typeof data.objectId !== 'string') {
      errors.push('objectId requis (string)');
    }
    
    if (data.position && (!data.position.x || !data.position.y)) {
      errors.push('position invalide (doit avoir x et y)');
    }
    
    if (data.objectType && typeof data.objectType !== 'string') {
      errors.push('objectType doit être string');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Valider données fouille
  static validateSearchHiddenItem(data) {
    const errors = [];
    
    if (!data.position || typeof data.position !== 'object') {
      errors.push('position requise (object)');
    } else {
      if (typeof data.position.x !== 'number' || typeof data.position.y !== 'number') {
        errors.push('position.x et position.y doivent être des nombres');
      }
    }
    
    if (data.searchRadius && (typeof data.searchRadius !== 'number' || data.searchRadius <= 0)) {
      errors.push('searchRadius doit être un nombre positif');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // 🆕 Valider interface unifiée
  static validateUnifiedInterface(data) {
    const errors = [];
    
    if (typeof data.success !== 'boolean') {
      errors.push('success requis (boolean)');
    }
    
    if (typeof data.isUnifiedInterface !== 'boolean' || !data.isUnifiedInterface) {
      errors.push('isUnifiedInterface requis et doit être true');
    }
    
    if (!Array.isArray(data.capabilities) || data.capabilities.length === 0) {
      errors.push('capabilities requis (array non-vide)');
    } else {
      // Valider que toutes les capabilities sont reconnues
      const validCapabilities = Object.values(UNIFIED_CAPABILITIES);
      const invalidCapabilities = data.capabilities.filter(cap => !validCapabilities.includes(cap));
      if (invalidCapabilities.length > 0) {
        errors.push(`capabilities non reconnues: ${invalidCapabilities.join(', ')}`);
      }
    }
    
    if (!data.contextualData || typeof data.contextualData !== 'object') {
      errors.push('contextualData requis (object)');
    }
    
    // Validation selon le type
    if (data.type === INTERACTION_TYPES.NPC) {
      if (!data.npcId || (typeof data.npcId !== 'string' && typeof data.npcId !== 'number')) {
        errors.push('npcId requis pour type NPC');
      }
      if (!data.npcName || typeof data.npcName !== 'string') {
        errors.push('npcName requis pour type NPC');
      }
    } else if (data.type === INTERACTION_TYPES.OBJECT) {
      if (!data.objectId || typeof data.objectId !== 'string') {
        errors.push('objectId requis pour type OBJECT');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Valider résultat interaction (étendu)
  static validateInteractionResult(data) {
    const errors = [];
    
    if (typeof data.success !== 'boolean') {
      errors.push('success requis (boolean)');
    }
    
    if (!data.type || !Object.values(INTERACTION_TYPES).includes(data.type)) {
      errors.push('type invalide (doit être dans INTERACTION_TYPES)');
    }
    
    if (!data.resultType || !Object.values(INTERACTION_RESULT_TYPES).includes(data.resultType)) {
      errors.push('resultType invalide (doit être dans INTERACTION_RESULT_TYPES)');
    }
    
    // 🆕 Validation spécifique interface unifiée
    if (data.resultType === INTERACTION_RESULT_TYPES.UNIFIED_INTERFACE) {
      const unifiedValidation = this.validateUnifiedInterface(data);
      if (!unifiedValidation.isValid) {
        errors.push(...unifiedValidation.errors);
      }
    }
    
    // Validation des champs optionnels étendus
    if (data.capabilities && !Array.isArray(data.capabilities)) {
      errors.push('capabilities doit être un array');
    }
    
    if (data.contextualData && typeof data.contextualData !== 'object') {
      errors.push('contextualData doit être un object');
    }
    
    if (data.playerPosition && (!data.playerPosition.x || !data.playerPosition.y)) {
      errors.push('playerPosition invalide (doit avoir x et y)');
    }
    
    if (data.targetPosition && (!data.targetPosition.x || !data.targetPosition.y)) {
      errors.push('targetPosition invalide (doit avoir x et y)');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Validation générique par type (étendue)
  static validate(type, data) {
    switch (type) {
      case INTERACTION_TYPES.NPC:
        return this.validateNpcInteract(data);
      case INTERACTION_TYPES.OBJECT:
        return this.validateObjectInteract(data);
      case 'search':
        return this.validateSearchHiddenItem(data);
      case 'result':
        return this.validateInteractionResult(data);
      case 'unifiedInterface':
        return this.validateUnifiedInterface(data);
      default:
        return { isValid: false, errors: ['Type de validation inconnu'] };
    }
  }
}

// === HELPERS UTILITAIRES ===

export class InteractionHelpers {
  
  // Créer structure de base pour interaction
  static createBaseInteraction(type, sessionId, zone, playerPosition = null) {
    return {
      type: type,
      timestamp: Date.now(),
      zone: zone,
      sessionId: sessionId,
      playerPosition: playerPosition
    };
  }
  
  // Créer interaction NPC
  static createNpcInteraction(npcId, sessionId, zone, playerPosition, additionalData = {}) {
    return {
      ...this.createBaseInteraction(INTERACTION_TYPES.NPC, sessionId, zone, playerPosition),
      npcId: npcId,
      ...additionalData
    };
  }
  
  // Créer interaction objet
  static createObjectInteraction(objectId, sessionId, zone, playerPosition, objectType = null, position = null, additionalData = {}) {
    return {
      ...this.createBaseInteraction(INTERACTION_TYPES.OBJECT, sessionId, zone, playerPosition),
      objectId: objectId,
      objectType: objectType,
      position: position,
      ...additionalData
    };
  }
  
  // Créer fouille
  static createSearchInteraction(position, sessionId, zone, playerInfo, searchRadius = 32, additionalData = {}) {
    return {
      ...this.createBaseInteraction('search', sessionId, zone),
      position: position,
      searchRadius: searchRadius,
      playerInfo: playerInfo,
      ...additionalData
    };
  }
  
  // 🆕 Créer réponse interface unifiée
  static createUnifiedInterfaceResult(type, targetId, targetName, capabilities, contextualData, additionalData = {}) {
    const result = {
      success: true,
      type: type,
      resultType: INTERACTION_RESULT_TYPES.UNIFIED_INTERFACE,
      isUnifiedInterface: true,
      capabilities: capabilities,
      contextualData: contextualData,
      timestamp: Date.now(),
      ...additionalData
    };
    
    // Ajouter les champs spécifiques selon le type
    if (type === INTERACTION_TYPES.NPC) {
      result.npcId = targetId;
      result.npcName = targetName;
    } else if (type === INTERACTION_TYPES.OBJECT) {
      result.objectId = targetId;
      result.objectName = targetName;
    }
    
    return result;
  }
  
  // 🆕 Vérifier si une capability est supportée
  static isValidCapability(capability) {
    return Object.values(UNIFIED_CAPABILITIES).includes(capability);
  }
  
  // 🆕 Extraire les capabilities d'un résultat d'interaction
  static extractCapabilities(interactionResult) {
    if (!interactionResult || !interactionResult.isUnifiedInterface) {
      return [];
    }
    
    return interactionResult.capabilities || [];
  }
  
  // 🆕 Vérifier si une interaction supporte une capability spécifique
  static hasCapability(interactionResult, capability) {
    const capabilities = this.extractCapabilities(interactionResult);
    return capabilities.includes(capability);
  }
  
  // 🆕 Formater le nom d'affichage selon le type
  static getDisplayName(interactionResult) {
    if (!interactionResult) return 'Inconnu';
    
    if (interactionResult.type === INTERACTION_TYPES.NPC) {
      return interactionResult.npcName || `NPC #${interactionResult.npcId}`;
    } else if (interactionResult.type === INTERACTION_TYPES.OBJECT) {
      return interactionResult.objectName || `Objet #${interactionResult.objectId}`;
    }
    
    return 'Cible inconnue';
  }
  
  // Vérifier si un type d'interaction est supporté
  static isValidInteractionType(type) {
    return Object.values(INTERACTION_TYPES).includes(type);
  }
  
  // Vérifier si un type de résultat est supporté
  static isValidResultType(resultType) {
    return Object.values(INTERACTION_RESULT_TYPES).includes(resultType);
  }
  
  // Obtenir le message réseau pour un type d'interaction
  static getNetworkMessage(direction, interactionType) {
    if (direction === 'send') {
      switch (interactionType) {
        case INTERACTION_TYPES.NPC:
          return NETWORK_MESSAGES.SEND.NPC_INTERACT;
        case INTERACTION_TYPES.OBJECT:
          return NETWORK_MESSAGES.SEND.OBJECT_INTERACT;
        case 'search':
          return NETWORK_MESSAGES.SEND.SEARCH_HIDDEN_ITEM;
        default:
          return null;
      }
    } else if (direction === 'receive') {
      switch (interactionType) {
        case INTERACTION_TYPES.NPC:
          return NETWORK_MESSAGES.RECEIVE.NPC_INTERACTION_RESULT;
        case INTERACTION_TYPES.OBJECT:
          return NETWORK_MESSAGES.RECEIVE.OBJECT_INTERACTION_RESULT;
        case 'search':
          return NETWORK_MESSAGES.RECEIVE.SEARCH_RESULT;
        case 'unifiedInterface':
          return NETWORK_MESSAGES.RECEIVE.UNIFIED_INTERFACE_RESULT;
        default:
          return NETWORK_MESSAGES.RECEIVE.INTERACTION_RESULT;
      }
    }
    return null;
  }
  
  // Formater message d'erreur
  static formatErrorMessage(errors) {
    if (!errors || errors.length === 0) {
      return 'Erreur inconnue';
    }
    
    if (errors.length === 1) {
      return errors[0];
    }
    
    return `Erreurs multiples: ${errors.join(', ')}`;
  }
  
  // 🆕 Diagnostiquer un résultat d'interaction
  static diagnoseInteractionResult(result) {
    const diagnosis = {
      isValid: false,
      isUnified: false,
      type: null,
      capabilities: [],
      issues: [],
      suggestions: []
    };
    
    if (!result) {
      diagnosis.issues.push('Résultat manquant');
      diagnosis.suggestions.push('Vérifier que le serveur envoie une réponse');
      return diagnosis;
    }
    
    diagnosis.type = result.type;
    diagnosis.isUnified = !!result.isUnifiedInterface;
    
    // Validation de base
    const validation = this.validate('result', result);
    diagnosis.isValid = validation.isValid;
    if (!validation.isValid) {
      diagnosis.issues.push(...validation.errors);
    }
    
    // Analyse des capabilities
    if (result.capabilities) {
      diagnosis.capabilities = result.capabilities;
      const invalidCaps = result.capabilities.filter(cap => !this.isValidCapability(cap));
      if (invalidCaps.length > 0) {
        diagnosis.issues.push(`Capabilities invalides: ${invalidCaps.join(', ')}`);
        diagnosis.suggestions.push('Vérifier les capabilities côté serveur');
      }
    }
    
    // Suggestions d'amélioration
    if (!diagnosis.isUnified) {
      diagnosis.suggestions.push('Considérer l\'utilisation de l\'interface unifiée');
    }
    
    if (!result.contextualData) {
      diagnosis.suggestions.push('Ajouter contextualData pour une meilleure UX');
    }
    
    return diagnosis;
  }
}

// === CONSTANTES DE CONFIGURATION ===

export const INTERACTION_CONFIG = {
  // Limites générales
  MAX_INTERACTION_DISTANCE: 64,
  DEFAULT_SEARCH_RADIUS: 32,
  MAX_SEARCH_RADIUS: 128,
  
  // Cooldowns (ms)
  DEFAULT_INTERACTION_COOLDOWN: 500,
  SEARCH_COOLDOWN: 1000,
  OBJECT_COLLECT_COOLDOWN: 300,
  
  // 🆕 Interface unifiée
  UNIFIED_INTERFACE_TIMEOUT: 10000,
  MAX_CAPABILITIES_PER_TARGET: 10,
  CONTEXTUAL_DATA_MAX_SIZE: 1024 * 10, // 10KB
  
  // Timeouts (ms)
  INTERACTION_TIMEOUT: 8000,
  NETWORK_TIMEOUT: 5000,
  
  // Limites
  MAX_PENDING_INTERACTIONS: 10,
  MAX_RETRY_ATTEMPTS: 2,
  
  // Debug
  ENABLE_DEBUG_LOGS: true,
  ENABLE_INTERACTION_HISTORY: true,
  MAX_HISTORY_SIZE: 50,
  
  // 🆕 Validation
  STRICT_CAPABILITY_VALIDATION: true,
  ALLOW_UNKNOWN_FIELDS: false
};

// === ÉNUMÉRATIONS ÉTENDUES ===

export const NPC_INTERACTION_TYPES = {
  DIALOGUE: 'dialogue',
  MERCHANT: 'merchant', 
  QUEST_GIVER: 'questGiver',
  HEALER: 'healer',
  STARTER_SELECTOR: 'starterSelector',
  TRAINER: 'trainer',
  GYM_LEADER: 'gymLeader'
};

export const OBJECT_INTERACTION_TYPES = {
  COLLECTIBLE: 'collectible',
  CONTAINER: 'container',
  MACHINE: 'machine',
  PC: 'pc',
  VENDING_MACHINE: 'vendingMachine',
  HIDDEN_ITEM: 'hiddenItem',
  POKEBALL: 'pokeball',
  BERRY_TREE: 'berryTree'
};

export const INTERACTION_PRIORITIES = {
  URGENT: 0,    // Système critique (combat, sauvetage)
  HIGH: 1,      // NPC important (quête principale)
  NORMAL: 2,    // Interaction standard
  LOW: 3,       // Collectibles, fouille
  BACKGROUND: 4 // Événements passifs
};

// === MESSAGES D'ERREUR STANDARDISÉS ===

export const INTERACTION_ERROR_MESSAGES = {
  NOT_CONNECTED: 'Connexion requise pour interagir',
  IN_TRANSITION: 'Impossible d\'interagir pendant une transition',
  COOLDOWN_ACTIVE: 'Attendez avant d\'interagir à nouveau',
  TOO_FAR: 'Trop loin pour interagir',
  INVALID_TARGET: 'Cible d\'interaction invalide',
  ALREADY_INTERACTING: 'Interaction déjà en cours',
  INTERACTION_FAILED: 'Échec de l\'interaction',
  TIMEOUT: 'Interaction expirée',
  BLOCKED: 'Interaction bloquée',
  UNKNOWN_ERROR: 'Erreur d\'interaction inconnue',
  
  // 🆕 Erreurs interface unifiée
  UNIFIED_INTERFACE_UNSUPPORTED: 'Interface unifiée non supportée par cette cible',
  CAPABILITY_NOT_AVAILABLE: 'Capability non disponible actuellement',
  CONTEXTUAL_DATA_MISSING: 'Données contextuelles manquantes',
  INVALID_CAPABILITY: 'Capability non reconnue'
};

// === 🆕 FACTORY CLASSES POUR INTERFACE UNIFIÉE ===

export class UnifiedInterfaceFactory {
  
  // Créer interface unifiée pour NPC
  static createNpcInterface(npcId, npcName, capabilities, contextualData, additionalData = {}) {
    const validCapabilities = capabilities.filter(cap => InteractionHelpers.isValidCapability(cap));
    
    if (validCapabilities.length === 0) {
      console.warn(`[UnifiedInterfaceFactory] Aucune capability valide pour NPC ${npcName}`);
      validCapabilities.push(UNIFIED_CAPABILITIES.DIALOGUE); // Fallback
    }
    
    return InteractionHelpers.createUnifiedInterfaceResult(
      INTERACTION_TYPES.NPC,
      npcId,
      npcName,
      validCapabilities,
      contextualData,
      {
        priority: INTERACTION_PRIORITIES.HIGH,
        requiresResponse: true,
        ...additionalData
      }
    );
  }
  
  // Créer interface unifiée pour objet
  static createObjectInterface(objectId, objectName, capabilities, contextualData, additionalData = {}) {
    const validCapabilities = capabilities.filter(cap => InteractionHelpers.isValidCapability(cap));
    
    if (validCapabilities.length === 0) {
      console.warn(`[UnifiedInterfaceFactory] Aucune capability valide pour objet ${objectName}`);
      validCapabilities.push(UNIFIED_CAPABILITIES.COLLECTIBLE); // Fallback
    }
    
    return InteractionHelpers.createUnifiedInterfaceResult(
      INTERACTION_TYPES.OBJECT,
      objectId,
      objectName,
      validCapabilities,
      contextualData,
      {
        priority: INTERACTION_PRIORITIES.NORMAL,
        requiresResponse: false,
        ...additionalData
      }
    );
  }
}

// === EXPORT GLOBAL POUR DEBUG ===

if (typeof window !== 'undefined') {
  window.InteractionTypes = {
    INTERACTION_TYPES,
    INTERACTION_RESULT_TYPES,
    UNIFIED_CAPABILITIES,
    NETWORK_MESSAGES,
    INTERACTION_CONFIG,
    InteractionValidator,
    InteractionHelpers,
    UnifiedInterfaceFactory
  };
  
  // 🆕 Utilitaires de debug interface unifiée
  window.debugUnifiedInterface = function(interactionResult) {
    const diagnosis = InteractionHelpers.diagnoseInteractionResult(interactionResult);
    console.log('🔍 DIAGNOSTIC INTERFACE UNIFIÉE:', diagnosis);
    return diagnosis;
  };
  
  window.testUnifiedValidation = function(data) {
    const validation = InteractionValidator.validateUnifiedInterface(data);
    console.log('✅ VALIDATION INTERFACE UNIFIÉE:', validation);
    return validation;
  };
  
  console.log('✅ InteractionTypes chargé et exposé globalement');
  console.log('🆕 Interface unifiée supportée - Utilisez window.debugUnifiedInterface() pour diagnostiquer');
}

console.log('📋 InteractionTypes.js loaded - Interface unifiée supportée');
console.log('🆕 Nouveaux champs supportés: isUnifiedInterface, capabilities, contextualData, npcId, npcName');
