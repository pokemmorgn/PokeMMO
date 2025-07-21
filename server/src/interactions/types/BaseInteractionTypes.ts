// src/interactions/types/BaseInteractionTypes.ts
// Types de base pour le système d'interactions - Version multi-fonctionnelle

// ===== TYPES DE BASE =====

export type InteractionType = 'npc' | 'object' | 'environment' | 'player' | 'puzzle';

// ✅ NOUVEAU : Types de résultats étendus pour multi-fonctionnel + CONSERVATION EXISTANTS
export type InteractionResultType = 
  | 'success' 
  | 'error' 
  | 'dialogue' 
  | 'shop' 
  | 'questGiver' 
  | 'questComplete' 
  | 'heal' 
  | 'starterTable' 
  | 'battleSpectate'
  | 'npc_choice'        // ✅ NOUVEAU : Interface de choix multi-fonctionnel
  | 'transport'
  | 'service'
  | 'minigame'
  | 'research'
  // ✅ TYPES EXISTANTS CONSERVÉS POUR COMPATIBILITÉ
  | 'objectCollected'
  | 'searchComplete'
  | 'itemFound'
  | 'pcAccess'
  | 'machineActivated';

// ===== INTERFACES REQUÊTES =====

export interface InteractionRequest {
  type: InteractionType;
  targetId: number | string;
  position?: {
    x: number;
    y: number;
    mapId: string;
  };
  // ✅ STRUCTURE DATA ÉTENDUE POUR MULTI-FONCTIONNEL
  data?: {
    // Propriétés existantes
    npcId?: number;
    objectId?: string;
    objectType?: string;
    tileX?: number;
    tileY?: number;
    action?: 'search' | 'surf' | 'fish' | 'examine';
    targetPlayerId?: string;
    playerAction?: 'battle' | 'trade' | 'spectate';
    itemId?: string;
    direction?: 'north' | 'south' | 'east' | 'west';
    metadata?: Record<string, any>;
    
    // ✅ NOUVELLES PROPRIÉTÉS MULTI-FONCTIONNELLES
    capability?: string;              // Capability spécifique demandée
    capabilities?: string[];          // Liste de capabilities à vérifier
    forceChoice?: boolean;           // Forcer l'interface de choix même si une seule option
    skipAutoDetection?: boolean;     // Désactiver la détection automatique
    
    // Propriétés spécialisées par capability
    shopAction?: 'buy' | 'sell' | 'browse';
    questAction?: 'accept' | 'complete' | 'check_progress';
    healerAction?: 'heal' | 'check_health' | 'premium_heal';
    serviceAction?: 'use' | 'info' | 'upgrade';
  };
  timestamp: number;
}

// ===== INTERFACES RÉSULTATS =====

export interface InteractionResult {
  success: boolean;
  type: InteractionResultType;
  message?: string;
  lines?: string[];  // Dialogues à afficher
  
  // ✅ DONNÉES MULTI-FONCTIONNELLES
  data?: {
    // Données existantes (shop, quêtes, etc.)
    shopId?: string;
    shopData?: any;
    availableQuests?: any[];
    questRewards?: any[];
    questProgress?: any[];
    npcId?: number;
    npcName?: string;
    questId?: string;
    questName?: string;
    starterData?: any;
    starterEligible?: boolean;
    starterReason?: string;
    battleSpectate?: {
      battleId: string;
      battleRoomId: string;
      targetPlayerName: string;
      canWatch: boolean;
      reason?: string;
    };
    
    // ✅ NOUVELLES DONNÉES MULTI-FONCTIONNELLES
    capabilities?: NpcCapability[];   // Capacités disponibles du NPC
    welcomeMessage?: string;          // Message d'accueil personnalisé
    choiceContext?: {                 // Contexte pour l'interface de choix
      title?: string;
      description?: string;
      allowCancel?: boolean;
      defaultChoice?: string;
    };
    
    // Métadonnées système
    metadata?: {
      processingTime?: number;
      moduleUsed?: string;
      handlerUsed?: string;
      capabilitiesAnalyzed?: number;
      errorCode?: string;
      debugInfo?: any;
      timestamp?: number;
      
      // ✅ PROPRIÉTÉS EXISTANTES CONSERVÉES pour compatibilité
      itemReceived?: any;
      module?: string;
      [key: string]: any; // Flexibilité pour propriétés futures
    };
  };
  
  // Propriétés système (conservées pour compatibilité)
  processingTime?: number;
  moduleUsed?: string;
  timestamp?: number;
}

// ✅ NOUVELLE INTERFACE : Capacité NPC
export interface NpcCapability {
  type: 'merchant' | 'quest_giver' | 'quest_ender' | 'healer' | 'dialogue' | 'starter' | 'spectate' | 'transport' | 'service' | 'minigame' | 'research' | 'guild' | 'event';
  priority: number;                // Ordre d'affichage (plus petit = plus prioritaire)
  handler?: string;               // Handler responsable
  icon?: string;                  // Icône pour l'interface (emoji ou code)
  label: string;                  // Texte affiché au joueur
  description?: string;           // Description détaillée
  available: boolean;             // Disponible actuellement
  reason?: string;               // Raison si non disponible
  
  // Propriétés étendues
  cooldown?: {
    active: boolean;
    remainingTime?: number;      // ms
    nextAvailable?: Date;
  };
  requirements?: {
    level?: number;
    items?: string[];
    badges?: string[];
    flags?: string[];
    forbiddenFlags?: string[];
  };
  rewards?: {
    preview?: string;           // Aperçu des récompenses
    guaranteed?: any[];         // Récompenses garanties
    possible?: any[];          // Récompenses possibles
  };
  
  // Métadonnées
  metadata?: {
    timesUsed?: number;
    lastUsed?: Date;
    category?: string;
    tags?: string[];
  };
}

// ✅ NOUVELLE INTERFACE : Résultat de choix NPC
export interface NpcChoiceResult extends Omit<InteractionResult, 'type'> {
  type: 'npc_choice';
  capabilities: NpcCapability[];
  npcId: number;
  npcName: string;
  welcomeMessage?: string;
}

// ===== INTERFACES CONTEXTE =====

export interface InteractionContext {
  player: any; // Player object
  request: InteractionRequest;
  validations: {
    proximity?: ProximityValidation;
    cooldown?: CooldownInfo;
    conditions?: ConditionValidation[];
  };
  metadata: {
    timestamp: number;
    sessionId?: string; // ✅ RENDU OPTIONNEL pour compatibilité
    previousInteraction?: {
      type: InteractionType;
      targetId: number | string;
      timestamp: number;
    };
  };
}

// ===== INTERFACES VALIDATIONS =====

export interface ProximityValidation {
  valid: boolean;
  distance: number;
  maxDistance: number;
  reason?: string;
}

export interface ConditionValidation {
  valid: boolean;
  condition: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CooldownInfo {
  active: boolean;
  remainingTime?: number; // millisecondes
  nextAvailable?: Date;
  cooldownType?: InteractionType;
}

// ===== INTERFACES CONFIGURATION =====

export interface InteractionConfig {
  maxDistance: number;
  cooldowns?: Partial<Record<InteractionType, number>>; // millisecondes
  requiredValidations?: Partial<Record<InteractionType, string[]>>;
  debug?: boolean;
  logLevel?: 'info' | 'warn' | 'error';
  
  // ✅ NOUVELLES CONFIGURATIONS MULTI-FONCTIONNELLES
  multiFunction?: {
    enabled: boolean;
    autoDetection: boolean;           // Détection automatique des capabilities
    forceChoiceThreshold: number;     // Nombre min de capabilities pour forcer le choix
    prioritySystem: boolean;          // Utiliser le système de priorité
    cacheCapabilities: boolean;      // Cache des capabilities pour performance
    cacheDuration: number;           // Durée du cache en ms
  };
  
  // Configuration des capabilities
  capabilities?: {
    merchant?: {
      enabled: boolean;
      priority: number;
      requirements?: any;
    };
    questGiver?: {
      enabled: boolean;
      priority: number;
      requirements?: any;
    };
    healer?: {
      enabled: boolean;
      priority: number;
      requirements?: any;
    };
    // ... autres capabilities
  };
}

// ===== INTERFACES ERREURS =====

export interface InteractionError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export const INTERACTION_ERROR_CODES = {
  // Codes existants
  INVALID_REQUEST: 'INVALID_REQUEST',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  TOO_FAR: 'TOO_FAR',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  CONDITIONS_NOT_MET: 'CONDITIONS_NOT_MET',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  
  // ✅ NOUVEAUX CODES MULTI-FONCTIONNELS
  CAPABILITY_NOT_FOUND: 'CAPABILITY_NOT_FOUND',
  CAPABILITY_NOT_AVAILABLE: 'CAPABILITY_NOT_AVAILABLE',
  MULTIPLE_CAPABILITIES_DETECTED: 'MULTIPLE_CAPABILITIES_DETECTED',
  NO_CAPABILITIES_AVAILABLE: 'NO_CAPABILITIES_AVAILABLE',
  CAPABILITY_HANDLER_ERROR: 'CAPABILITY_HANDLER_ERROR',
  CHOICE_INTERFACE_ERROR: 'CHOICE_INTERFACE_ERROR',
  PRIORITY_SYSTEM_ERROR: 'PRIORITY_SYSTEM_ERROR'
} as const;

// ===== TYPES HELPER =====

export type InteractionErrorCode = typeof INTERACTION_ERROR_CODES[keyof typeof INTERACTION_ERROR_CODES];

// ✅ NOUVELLES INTERFACES POUR REQUÊTES SPÉCIALISÉES

export interface NpcCapabilityRequest {
  npcId: number;
  capability: string;
  playerPosition?: { x: number; y: number; mapId: string };
  context?: {
    skipValidation?: boolean;
    forceExecution?: boolean;
    metadata?: Record<string, any>;
  };
}

export interface CapabilityAnalysisRequest {
  npcId: number;
  playerPosition: { x: number; y: number; mapId: string };
  options?: {
    includeUnavailable?: boolean;
    filterByPriority?: boolean;
    maxResults?: number;
    categoryFilter?: string[];
  };
}

export interface CapabilityAnalysisResult {
  npcId: number;
  npcName: string;
  totalCapabilities: number;
  availableCapabilities: number;
  capabilities: NpcCapability[];
  recommendedAction?: {
    capability: string;
    reason: string;
  };
  analysisTime: number;
}

// ===== TYPES UTILITAIRES =====

// Type guard pour vérifier si un résultat est un choix NPC
export const isNpcChoiceResult = (result: InteractionResult): result is NpcChoiceResult => {
  return result.type === 'npc_choice';
};

// Type guard pour vérifier si une requête a une capability spécifique
export const hasSpecificCapability = (request: InteractionRequest): boolean => {
  return !!(request.data?.capability);
};

// Type guard pour vérifier si un NPC a des capabilities multiples
export const hasMultipleCapabilities = (capabilities: NpcCapability[]): boolean => {
  return capabilities.filter(c => c.available).length > 1;
};

// ===== CONSTANTES =====

export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  maxDistance: 64,
  cooldowns: {
    npc: 500,
    object: 200,
    environment: 1000,
    player: 2000,
    puzzle: 0
  },
  requiredValidations: {
    npc: ['proximity', 'cooldown'],
    object: ['proximity', 'cooldown'],
    environment: ['proximity', 'cooldown'],
    player: ['proximity', 'cooldown'],
    puzzle: ['conditions']
  },
  debug: false,
  logLevel: 'info',
  
  // Configuration multi-fonctionnelle par défaut
  multiFunction: {
    enabled: true,
    autoDetection: true,
    forceChoiceThreshold: 2,
    prioritySystem: true,
    cacheCapabilities: true,
    cacheDuration: 30000 // 30 secondes
  },
  
  capabilities: {
    merchant: {
      enabled: true,
      priority: 10
    },
    questGiver: {
      enabled: true,
      priority: 20
    },
    healer: {
      enabled: true,
      priority: 40
    }
  }
};

// Priorités par défaut des capabilities
export const DEFAULT_CAPABILITY_PRIORITIES = {
  quest_ender: 5,      // Terminer quête = priorité max
  quest_giver: 20,     // Recevoir quête
  merchant: 10,        // Boutique
  healer: 40,          // Soins
  starter: 50,         // Starter
  transport: 60,       // Transport
  service: 70,         // Services
  minigame: 80,        // Mini-jeux
  research: 90,        // Recherche
  guild: 95,           // Guilde
  event: 30,           // Événements (priorité haute)
  dialogue: 100        // Dialogue = fallback
} as const;

// Icônes par défaut des capabilities
export const DEFAULT_CAPABILITY_ICONS = {
  merchant: '🛒',
  quest_giver: '📜',
  quest_ender: '✅',
  healer: '🏥',
  starter: '🎁',
  transport: '🚢',
  service: '🔧',
  minigame: '🎮',
  research: '🔬',
  guild: '⚔️',
  event: '🎉',
  dialogue: '💬',
  spectate: '👁️'
} as const;

// Labels par défaut des capabilities
export const DEFAULT_CAPABILITY_LABELS = {
  merchant: 'Ouvrir la boutique',
  quest_giver: 'Recevoir une quête',
  quest_ender: 'Terminer une quête',
  healer: 'Soigner les Pokémon',
  starter: 'Choisir un starter',
  transport: 'Voyager',
  service: 'Utiliser un service',
  minigame: 'Jouer un mini-jeu',
  research: 'Recherche',
  guild: 'Rejoindre la guilde',
  event: 'Participer à l\'événement',
  dialogue: 'Discuter',
  spectate: 'Regarder le combat'
} as const;

// ===== EXPORT TYPES UTILITAIRES =====

export type CapabilityType = keyof typeof DEFAULT_CAPABILITY_PRIORITIES;
export type CapabilityIcon = typeof DEFAULT_CAPABILITY_ICONS[keyof typeof DEFAULT_CAPABILITY_ICONS];
export type CapabilityLabel = typeof DEFAULT_CAPABILITY_LABELS[keyof typeof DEFAULT_CAPABILITY_LABELS];

// ===== ✅ TYPES EXISTANTS CONSERVÉS POUR COMPATIBILITÉ =====

// Types pour ObjectInteractionModule
export interface ObjectInteractionResult extends InteractionResult {
  objectId?: string;
  itemsFound?: any[];
  searchComplete?: boolean;
}

export interface ObjectInteractionData {
  objectId: string;
  objectType: string;
  action: string;
  playerPosition: { x: number; y: number };
  metadata?: Record<string, any>;
}

// Constantes pour compatibilité
export const INTERACTION_RESULT_TYPES = {
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  DIALOGUE: 'dialogue' as const,
  SHOP: 'shop' as const,
  QUEST_GIVER: 'questGiver' as const,
  QUEST_COMPLETE: 'questComplete' as const,
  HEAL: 'heal' as const,
  STARTER_TABLE: 'starterTable' as const,
  BATTLE_SPECTATE: 'battleSpectate' as const,
  NPC_CHOICE: 'npc_choice' as const,
  OBJECT_COLLECTED: 'objectCollected' as const,
  SEARCH_COMPLETE: 'searchComplete' as const,
  ITEM_FOUND: 'itemFound' as const,
  PC_ACCESS: 'pcAccess' as const,
  MACHINE_ACTIVATED: 'machineActivated' as const,
} as const;

// Helper function pour créer des résultats (compatibilité)
export function createInteractionResult(
  type: InteractionResultType,
  message: string,
  data?: any
): InteractionResult {
  return {
    success: type !== 'error',
    type,
    message,
    data
  };
}
