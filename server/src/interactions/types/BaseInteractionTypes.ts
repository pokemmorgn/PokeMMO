// src/interactions/types/BaseInteractionTypes.ts
// Types de base pour le système d'interaction modulaire - VERSION CORRIGÉE

import { Player } from "../../schema/PokeWorldState";

// ✅ TYPES DE REQUÊTES D'INTERACTION
export type InteractionType = 
  | 'npc'           // NPCs (quêtes, shops, dialogues)
  | 'object'        // Objets du monde (ramassables, panneaux, machines)
  | 'environment'   // Cases/tiles (fouille, pêche, surf)
  | 'player'        // Autres joueurs (échange, combat, spectateur)
  | 'puzzle';       // Énigmes/séquences complexes

// ✅ REQUÊTE D'INTERACTION STANDARDISÉE
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
  | 'searchComplete';

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
  SEARCH_COMPLETE: 'searchComplete' as const
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
  };
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

// ✅ RÉSULTAT D'INTERACTION STANDARDISÉ - VERSION CORRIGÉE
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
    
    // Métadonnées pour extensions futures
    metadata?: Record<string, any>;
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

// ✅ CONTEXTE D'INTERACTION (pour modules)
export interface InteractionContext {
  player: Player;
  request: InteractionRequest;
  validations: {
    proximity?: ProximityValidation;
    conditions?: ConditionValidation[];
    cooldown?: CooldownInfo;
  };
  metadata?: Record<string, any>;
}

// ✅ CONFIGURATION D'INTERACTION
export interface InteractionConfig {
  // Distance maximale pour interaction
  maxDistance: number;
  
  // Cooldown global par type
  cooldowns?: {
    [key in InteractionType]?: number; // en millisecondes
  };
  
  // Validations requises par type
  requiredValidations?: {
    [key in InteractionType]?: ('proximity' | 'conditions' | 'cooldown')[];
  };
  
  // Configuration debugging
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

// ✅ ERREURS STANDARDISÉES
export class InteractionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'InteractionError';
  }
}

// Codes d'erreur standardisés
export const INTERACTION_ERROR_CODES = {
  // Erreurs de validation
  TOO_FAR: 'TOO_FAR',
  INVALID_TARGET: 'INVALID_TARGET',
  CONDITIONS_NOT_MET: 'CONDITIONS_NOT_MET',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  
  // Erreurs de traitement
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Erreurs système
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TIMEOUT: 'TIMEOUT'
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
