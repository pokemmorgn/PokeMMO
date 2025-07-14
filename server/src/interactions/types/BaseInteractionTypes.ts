// src/interactions/types/BaseInteractionTypes.ts
// Types de base pour le système d'interaction modulaire

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

// ✅ RÉSULTAT D'INTERACTION STANDARDISÉ
export interface InteractionResult {
  // Succès ou échec
  success: boolean;
  
  // Type de résultat (correspond aux types existants)
  type: 'error' | 'dialogue' | 'shop' | 'heal' | 'questGiver' | 'questComplete' | 
        'starterTable' | 'battleSpectate' | 'objectCollected' | 'panelRead' | 
        'itemFound' | 'noItemFound' | 'machineActivated';
  
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
    
    // Nouveaux - Objets du monde
    objectData?: {
      objectId: string;
      objectType: string;
      collected?: boolean;
      newState?: string;
    };
    
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
