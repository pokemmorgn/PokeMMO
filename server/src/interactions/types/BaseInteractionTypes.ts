// src/interactions/types/BaseInteractionTypes.ts
// Types de base pour le système d'interaction modulaire - VERSION ÉTENDUE AVEC IA

import { Player } from "../../schema/PokeWorldState";

// ✅ TYPES DE REQUÊTES D'INTERACTION
export type InteractionType = 
  | 'npc'           // NPCs (quêtes, shops, dialogues)
  | 'object'        // Objets du monde (ramassables, panneaux, machines)
  | 'environment'   // Cases/tiles (fouille, pêche, surf)
  | 'player'        // Autres joueurs (échange, combat, spectateur)
  | 'puzzle';       // Énigmes/séquences complexes

// ✅ REQUÊTE D'INTERACTION STANDARDISÉE - ÉTENDUE POUR IA
export interface InteractionRequest {
  // Type d'interaction
  type: InteractionType;
  
  // Identification de la cible
  targetId?: string | number;
  
  // Position pour validations
  position?: {
    x: number;
    y: number;
    mapId?: string;
  };
  
  // Données spécifiques selon le type
  data?: {
    // Pour NPCs
    npcId?: number;
    
    // Pour objets
    objectId?: string;
    objectType?: string;
    
    // Pour environnement
    tileX?: number;
    tileY?: number;
    action?: 'search' | 'fish' | 'surf' | 'examine';
    
    // Pour joueurs
    targetPlayerId?: string;
    playerAction?: 'trade' | 'battle' | 'spectate';
    
    // Données additionnelles
    itemId?: string;
    direction?: 'north' | 'south' | 'east' | 'west';
    metadata?: Record<string, any>;
    
    // ✅ NOUVELLES PROPRIÉTÉS IA
    userId?: string;
    sessionId?: string;
  };
  
  // Timestamp pour debugging/analytics
  timestamp?: number;
}

// ✅ NOUVEAUX TYPES DE RÉSULTATS ÉTENDUS
export type InteractionResultType = 
  | 'error' 
  | 'dialogue' 
  | 'shop' 
  | 'heal' 
  | 'questGiver' 
  | 'questComplete' 
  | 'starterTable' 
  | 'battleSpectate' 
  | 'objectCollected' 
  | 'panelRead' 
  | 'itemFound' 
  | 'noItemFound' 
  | 'machineActivated'
  | 'pcAccess'
  | 'vendingMachine'
  | 'hiddenItemFound'
  | 'itemPickup'
  | 'searchComplete'
  | 'unifiedInterface'; 

// ✅ CONSTANTES POUR ÉVITER LES ERREURS DE TYPO
export const INTERACTION_RESULT_TYPES = {
  ERROR: 'error' as const,
  DIALOGUE: 'dialogue' as const,
  SHOP: 'shop' as const,
  HEAL: 'heal' as const,
  QUEST_GIVER: 'questGiver' as const,
  QUEST_COMPLETE: 'questComplete' as const,
  STARTER_TABLE: 'starterTable' as const,
  BATTLE_SPECTATE: 'battleSpectate' as const,
  OBJECT_COLLECTED: 'objectCollected' as const,
  PANEL_READ: 'panelRead' as const,
  ITEM_FOUND: 'itemFound' as const,
  NO_ITEM_FOUND: 'noItemFound' as const,
  MACHINE_ACTIVATED: 'machineActivated' as const,
  PC_ACCESS: 'pcAccess' as const,
  VENDING_MACHINE: 'vendingMachine' as const,
  HIDDEN_ITEM_FOUND: 'hiddenItemFound' as const,
  ITEM_PICKUP: 'itemPickup' as const,
  SEARCH_COMPLETE: 'searchComplete' as const,
  UNIFIED_INTERFACE: 'unifiedInterface' as const
} as const;

// ✅ INTERFACE POUR OBJECT DATA ÉTENDUE
export interface ObjectInteractionData {
  objectId: string;
  objectType: string;
  collected?: boolean;
  newState?: string;
  // NOUVELLES PROPRIÉTÉS POUR CORRIGER LES ERREURS
  searchResult?: { 
    found: boolean; 
    attempts?: number;
    itemsFound?: string[];
    // NOUVELLES PROPRIÉTÉS pour HiddenItem
    chance?: number;        // Pourcentage de chance (ex: 70)
    roll?: number;          // Résultat du dé (ex: 45) 
    hasItemfinder?: boolean; // Bonus Itemfinder utilisé
  }
  machineData?: { 
    activated: boolean; 
    output?: any;
    state?: string;
  };
  pcData?: { 
    accessed: boolean; 
    storage?: any;
    operation?: string;
  };
  panelData?: {
    title?: string;
    content?: string[];
    imageUrl?: string;
  };
  // Permet l'extension future
  [key: string]: any;
}

// ✅ RÉSULTAT D'INTERACTION STANDARDISÉ - VERSION ÉTENDUE AVEC IA
export interface InteractionResult {
  // Succès ou échec
  success: boolean;
  
  // Type de résultat - UTILISE LE NOUVEAU TYPE UNION
  type: InteractionResultType;
  
  // Message principal
  message?: string;
  
  // Messages multiples (dialogues)
  lines?: string[];
  
  // Données spécifiques selon le type de résultat
  data?: {
    // NPCs - Données existantes conservées
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
    
    // OBJETS - UTILISE LA NOUVELLE INTERFACE ÉTENDUE
    objectData?: ObjectInteractionData;
    
    // Nouveaux - Items collectés
    itemData?: {
      itemId: string;
      quantity: number;
      rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    };
    
    // Nouveaux - Informations lues
    panelData?: {
      title: string;
      content: string[];
      imageUrl?: string;
    };
    
    // ✅ NOUVELLES MÉTADONNÉES IA
    metadata?: {
      timestamp?: number;
      processingTime?: number;
      moduleUsed?: string;
      errorCode?: string;
      // Métadonnées IA
      aiAnalysisPerformed?: boolean;
      intelligenceUsed?: boolean;
      trackingData?: any;
      userId?: string;
      sessionId?: string;
      [key: string]: any;
    };
  };
  
  // Timing pour animations/effets
  timing?: {
    duration?: number;
    delay?: number;
    animation?: string;
  };
  
  // Pour debugging/analytics
  processingTime?: number;
  moduleUsed?: string;
  timestamp?: number;
  
  // ✅ NOUVELLES PROPRIÉTÉS IA (optionnelles pour compatibilité)
  aiEnhanced?: boolean;
  intelligenceScore?: number;
  personalizedContent?: boolean;
}

// ✅ TYPE HELPER POUR LES RÉSULTATS D'OBJETS
export type ObjectInteractionResult = InteractionResult & {
  data: NonNullable<InteractionResult['data']> & {
    objectData: ObjectInteractionData;
  };
};

// ✅ VALIDATION DE PROXIMITÉ
export interface ProximityValidation {
  valid: boolean;
  distance?: number;
  maxDistance?: number;
  reason?: string;
}

// ✅ VALIDATION DE CONDITION
export interface ConditionValidation {
  valid: boolean;
  reason?: string;
  requirements?: {
    item?: string;
    level?: number;
    quest?: string;
    badge?: string;
    [key: string]: any;
  };
}

// ✅ COOLDOWN INFO
export interface CooldownInfo {
  active: boolean;
  remainingTime?: number;
  nextAvailable?: Date;
  cooldownType?: string;
}

// ✅ CONTEXTE D'INTERACTION (pour modules) - ÉTENDU POUR IA
export interface InteractionContext {
  player: Player;
  request: InteractionRequest;
  validations: {
    proximity?: ProximityValidation;
    conditions?: ConditionValidation[];
    cooldown?: CooldownInfo;
  };
  metadata?: {
    timestamp?: number;
    sessionId?: string;
    // ✅ NOUVELLES PROPRIÉTÉS IA
    userId?: string;
    source?: string;
    enhancedTracking?: boolean;
    aiSystemEnabled?: boolean;
    [key: string]: any;
  };
}

// ✅ NOUVELLE INTERFACE : Options enrichies pour processInteraction
export interface EnhancedProcessInteractionOptions {
  userId?: string;
  sessionId?: string;
  source?: string;
  timestamp?: number;
  aiSystemEnabled?: boolean;
}

// ===== INTERFACES DE VALIDATION =====

export interface ProximityValidation {
  valid: boolean;
  distance?: number;
  maxDistance?: number;
  reason?: string;
}

export interface CooldownInfo {
  active: boolean;
  remainingTime?: number;
  nextAvailable?: Date;
  cooldownType?: InteractionType;
}

export interface ConditionValidation {
  valid: boolean;
  reason?: string;
  requiredItems?: string[];
  requiredLevel?: number;
  requiredQuests?: string[];
  customConditions?: Record<string, any>;
}

// ===== CONFIGURATION =====

export interface InteractionConfig {
  maxDistance: number;
  cooldowns?: {
    [K in InteractionType]?: number;
  };
  requiredValidations?: {
    [K in InteractionType]?: ('proximity' | 'cooldown' | 'conditions')[];
  };
  debug?: boolean;
  logLevel?: 'info' | 'warn' | 'error';
  
  // ✅ NOUVELLE CONFIGURATION IA
  ai?: {
    enabled: boolean;
    enabledTypes: InteractionType[];
    fallbackToBasic: boolean;
    trackingEnabled: boolean;
    analysisTimeout?: number;
  };
}

// ===== GESTION DES ERREURS =====

export interface InteractionError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export const INTERACTION_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  TOO_FAR: 'TOO_FAR',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  CONDITIONS_NOT_MET: 'CONDITIONS_NOT_MET',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  // ✅ NOUVEAUX CODES D'ERREUR IA
  AI_SYSTEM_UNAVAILABLE: 'AI_SYSTEM_UNAVAILABLE',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  TRACKING_FAILED: 'TRACKING_FAILED'
} as const;

export type InteractionErrorCode = typeof INTERACTION_ERROR_CODES[keyof typeof INTERACTION_ERROR_CODES];

// ✅ HELPERS POUR LA CRÉATION DE RÉSULTATS
export const createInteractionResult = {
  success: (
    type: InteractionResultType,
    message?: string,
    data?: InteractionResult['data']
  ): InteractionResult => ({
    success: true,
    type,
    message,
    data,
    timestamp: Date.now()
  }),
  
  error: (
    message: string,
    code?: string,
    metadata?: Record<string, any>
  ): InteractionResult => ({
    success: false,
    type: INTERACTION_RESULT_TYPES.ERROR,
    message,
    data: {
      metadata: {
        errorCode: code,
        timestamp: Date.now(),
        ...metadata
      }
    },
    timestamp: Date.now()
  }),
  
  objectCollected: (
    objectId: string,
    objectType: string,
    message?: string,
    additionalData?: Partial<ObjectInteractionData>
  ): ObjectInteractionResult => ({
    success: true,
    type: INTERACTION_RESULT_TYPES.OBJECT_COLLECTED,
    message: message || "Objet collecté avec succès !",
    data: {
      objectData: {
        objectId,
        objectType,
        collected: true,
        ...additionalData
      }
    },
    timestamp: Date.now()
  }),
  
  noItemFound: (
    objectId: string = "0",
    objectType: string = "search",
    message?: string,
    attempts: number = 1
  ): ObjectInteractionResult => ({
    success: true,
    type: INTERACTION_RESULT_TYPES.NO_ITEM_FOUND,
    message: message || "Il n'y a rien ici.",
    data: {
      objectData: {
        objectId,
        objectType,
        collected: false,
        searchResult: { found: false, attempts }
      }
    },
    timestamp: Date.now()
  })
};

// ✅ NOUVELLES FONCTIONS UTILITAIRES POUR L'IA

/**
 * Créer une requête enrichie pour l'IA
 */
export function createEnhancedInteractionRequest(
  baseRequest: InteractionRequest,
  userId?: string,
  sessionId?: string
): InteractionRequest {
  return {
    ...baseRequest,
    data: {
      ...baseRequest.data,
      userId,
      sessionId
    },
    timestamp: baseRequest.timestamp || Date.now()
  };
}

/**
 * Créer des options enrichies pour l'IA
 */
export function createEnhancedOptions(
  userId?: string,
  sessionId?: string,
  source: string = 'interaction_manager'
): EnhancedProcessInteractionOptions {
  return {
    userId,
    sessionId,
    source,
    timestamp: Date.now(),
    aiSystemEnabled: true
  };
}

/**
 * Créer un résultat d'erreur standardisé
 */
export function createErrorResult(
  message: string,
  code: InteractionErrorCode,
  additionalData?: any
): InteractionResult {
  return {
    success: false,
    type: 'error' as InteractionResultType,
    message,
    data: {
      metadata: {
        errorCode: code,
        timestamp: Date.now(),
        ...additionalData
      }
    },
    timestamp: Date.now()
  };
}

/**
 * Créer un résultat enrichi IA
 */
export function createAIEnhancedResult(
  baseResult: InteractionResult,
  aiData: {
    intelligenceUsed?: boolean;
    analysisPerformed?: boolean;
    personalizedContent?: boolean;
    intelligenceScore?: number;
    trackingData?: any;
    userId?: string;
    sessionId?: string;
  }
): InteractionResult {
  return {
    ...baseResult,
    aiEnhanced: true,
    intelligenceScore: aiData.intelligenceScore,
    personalizedContent: aiData.personalizedContent,
    data: {
      ...baseResult.data,
      metadata: {
        ...baseResult.data?.metadata,
        aiAnalysisPerformed: aiData.analysisPerformed,
        intelligenceUsed: aiData.intelligenceUsed,
        trackingData: aiData.trackingData,
        userId: aiData.userId,
        sessionId: aiData.sessionId
      }
    }
  };
}
