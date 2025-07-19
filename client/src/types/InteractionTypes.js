// client/src/types/InteractionTypes.js
// ✅ Types et constantes d'interaction - Validés par le serveur
// Pas d'auto-découverte côté client - Sécurité first

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
    INTERACTION_RESULT: 'interactionResult' // Générique
  }
};

// === STRUCTURES DE DONNÉES STANDARDISÉES ===

export const INTERACTION_DATA_FORMATS = {
  // Format d'envoi interaction NPC
  NPC_INTERACT: {
    npcId: 'string', // required
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
  
  // Format réponse générique
  INTERACTION_RESULT: {
    success: 'boolean', // required
    type: 'string', // required (INTERACTION_TYPES)
    resultType: 'string', // required (INTERACTION_RESULT_TYPES)
    message: 'string', // optional
    data: 'object', // optional - données spécifiques
    interactionId: 'string', // optional
    timestamp: 'number' // auto
  }
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
  
  // Valider résultat interaction
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
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Validation générique par type
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
  
  // Timeouts (ms)
  INTERACTION_TIMEOUT: 8000,
  NETWORK_TIMEOUT: 5000,
  
  // Limites
  MAX_PENDING_INTERACTIONS: 10,
  MAX_RETRY_ATTEMPTS: 2,
  
  // Debug
  ENABLE_DEBUG_LOGS: true,
  ENABLE_INTERACTION_HISTORY: true,
  MAX_HISTORY_SIZE: 50
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
  UNKNOWN_ERROR: 'Erreur d\'interaction inconnue'
};

// === EXPORT GLOBAL POUR DEBUG ===

if (typeof window !== 'undefined') {
  window.InteractionTypes = {
    INTERACTION_TYPES,
    INTERACTION_RESULT_TYPES,
    NETWORK_MESSAGES,
    INTERACTION_CONFIG,
    InteractionValidator,
    InteractionHelpers
  };
  
  console.log('✅ InteractionTypes chargé et exposé globalement');
}

console.log('📋 InteractionTypes.js loaded - Types validés côté serveur uniquement');
