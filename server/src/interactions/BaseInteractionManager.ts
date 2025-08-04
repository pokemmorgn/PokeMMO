// src/interactions/types/BaseInteractionTypes.ts
// Types de base pour le système d'interaction modulaire - VERSION CORRIGÉE AVEC SÉCURITÉ

import { Player } from "../../schema/PokeWorldState";

// ✅ TYPES DE REQUÊTES D'INTERACTION
export type InteractionType = 
  | 'npc'           // NPCs (quêtes, shops, dialogues)
  | 'object'        // Objets du monde (ramassables, panneaux, machines)
  | 'environment'   // Cases/tiles (fouille, pêche, surf)
  | 'player'        // Autres joueurs (échange, combat, spectateur)
  | 'puzzle';       // Énigmes/séquences complexes

// ✅ REQUÊTE D'INTERACTION STANDARDISÉE AVEC SÉCURITÉ
export interface InteractionRequest {
  // Type d'interaction
  type: InteractionType;
  
  // Identification de la cible
  targetId?: string | number;
  
  // Position pour validations (peut être envoyée par le client)
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
    playerLanguage?: string;
    
    // ✅ NOUVEAUX CHAMPS POUR SÉCURITÉ
    zone?: string; // Zone prétendues par le client (à valider)
    clientPosition?: { x: number; y: number }; // Position prétendues par le client (à valider)
    
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
    
    // ✅ NOUVELLES MÉTADONNÉES DE SÉCURITÉ
    metadata?: {
      sanitized?: boolean;
      securityWarnings?: string[];
      securityOverride?: {
        originalClientZone?: string;
        originalClientPosition?: { x: number; y: number };
        serverZone?: string;
        serverPosition?: { x: number; y: number };
      };
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

// ✅ CONTEXTE D'INTERACTION (pour modules) AVEC SÉCURITÉ
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
    securityValidated?: boolean;
    serverPosition?: { x: number; y: number };
    serverZone?: string;
    [key: string]: any;
  };
}

// ✅ CONFIGURATION D'INTERACTION AVEC SÉCURITÉ
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

// ✅ ERREURS STANDARDISÉES AVEC SÉCURITÉ
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

// Codes d'erreur standardisés AVEC SÉCURITÉ
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
  
  // ✅ NOUVELLES ERREURS DE SÉCURITÉ
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  POSITION_MISMATCH: 'POSITION_MISMATCH',
  ZONE_MISMATCH: 'ZONE_MISMATCH',
  RATE_LIMITED: 'RATE_LIMITED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  
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
  
  // ✅ NOUVELLE : Erreur de sécurité
  securityError: (
    message: string,
    securityCode: string,
    details?: any
  ): InteractionResult => ({
    success: false,
    type: INTERACTION_RESULT_TYPES.ERROR,
    message,
    data: {
      metadata: {
        errorCode: 'SECURITY_VIOLATION',
        securityCode,
        timestamp: Date.now(),
        details
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
