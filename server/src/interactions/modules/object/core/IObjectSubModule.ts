// src/interactions/modules/object/core/IObjectSubModule.ts
// Interface contractuelle pour tous les sous-modules d'objets - VERSION FINALE CORRIGÉE

import { Player } from "../../../../schema/PokeWorldState";
import { 
  InteractionResult,
  InteractionContext,
  InteractionResultType,
  ObjectInteractionResult,
  ObjectInteractionData,
  INTERACTION_RESULT_TYPES,
  createInteractionResult
} from "../../../types/BaseInteractionTypes";

// ✅ DÉFINITION D'UN OBJET PARSÉ DEPUIS TILED
export interface ObjectDefinition {
  // Données de base depuis Tiled
  id: number;                    // obj.id depuis Tiled
  name: string;                  // obj.name depuis Tiled
  x: number;                     // obj.x depuis Tiled
  y: number;                     // obj.y depuis Tiled
  zone: string;                  // Zone où se trouve l'objet
  
  // Propriétés depuis Tiled (obj.properties)
  type: string;                  // "ground_item", "hidden_item", "pc", etc.
  itemId?: string;               // ID de l'objet à donner
  quantity?: number;             // Quantité (défaut: 1)
  rarity?: string;               // "common", "rare", "epic", "legendary"
  respawnTime?: number;          // Temps de respawn en ms (0 = pas de respawn)
  
  // Propriétés optionnelles
  requirements?: {
    level?: number;
    badge?: string;
    item?: string;
    quest?: string;
  };
  
  // État runtime (pas dans Tiled)
  state: {
    collected: boolean;
    lastCollectedTime?: number;
    collectedBy?: string[];      // Liste des joueurs qui ont collecté
  };
  
  // Toutes les autres propriétés custom de Tiled
  customProperties: Record<string, any>;
}

// ✅ INTERFACE PRINCIPALE DES SOUS-MODULES
export interface IObjectSubModule {
  
  // === IDENTIFICATION ===
  
  /**
   * Nom unique du sous-module
   */
  readonly typeName: string;
  
  /**
   * Version pour compatibilité
   */
  readonly version: string;
  
  // === MÉTHODES PRINCIPALES ===
  
  /**
   * Détermine si ce sous-module peut traiter cet objet
   * @param objectDef - Définition de l'objet depuis Tiled
   * @returns true si le sous-module peut traiter
   */
  canHandle(objectDef: ObjectDefinition): boolean;
  
  /**
   * Traite l'interaction avec l'objet
   * @param player - Joueur qui interagit
   * @param objectDef - Définition complète de l'objet
   * @param actionData - Données additionnelles de l'action
   * @returns Résultat de l'interaction
   */
  handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult>;
  
  // === MÉTHODES OPTIONNELLES ===
  
  /**
   * Initialisation du sous-module
   */
  initialize?(): Promise<void>;
  
  /**
   * Nettoyage du sous-module
   */
  cleanup?(): Promise<void>;
  
  /**
   * Validation spécifique avant traitement
   * @param player - Joueur
   * @param objectDef - Objet à valider
   * @returns { valid: boolean, reason?: string }
   */
  validateAccess?(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }>;
  
  /**
   * Hook appelé après interaction réussie
   * @param player - Joueur
   * @param objectDef - Objet interagi
   * @param result - Résultat de l'interaction
   */
  onInteractionSuccess?(
    player: Player, 
    objectDef: ObjectDefinition, 
    result: ObjectInteractionResult
  ): Promise<void>;
  
  /**
   * Statistiques du sous-module
   */
  getStats?(): {
    totalInteractions: number;
    successfulInteractions: number;
    failedInteractions: number;
    averageProcessingTime: number;
    lastInteraction: Date | null;
  };
  
  /**
   * Santé du sous-module
   */
  getHealth?(): {
    status: 'healthy' | 'warning' | 'critical';
    errorRate: number;
    lastCheck: Date;
    details?: Record<string, any>;
  };
}

// ✅ INTERFACE PLAYER ÉTENDUE (temporaire pour éviter les erreurs TypeScript)
interface PlayerWithExtensions extends Player {
  badges?: string[];
  inventory?: Array<{ id: string; quantity: number; [key: string]: any }>;
  quests?: string[];
}

// ✅ CLASSE DE BASE ABSTRAITE - VERSION FINALE CORRIGÉE
export abstract class BaseObjectSubModule implements IObjectSubModule {
  
  abstract readonly typeName: string;
  readonly version: string = "1.0.0";
  
  // Statistiques par défaut
  protected stats = {
    totalInteractions: 0,
    successfulInteractions: 0,
    failedInteractions: 0,
    averageProcessingTime: 0,
    lastInteraction: null as Date | null
  };
  
  // === MÉTHODES ABSTRAITES ===
  abstract canHandle(objectDef: ObjectDefinition): boolean;
  abstract handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult>;
  
  // === IMPLÉMENTATIONS PAR DÉFAUT ===
  
  async initialize(): Promise<void> {
    this.log('info', `Sous-module ${this.typeName} initialisé v${this.version}`);
  }
  
  async cleanup(): Promise<void> {
    this.log('info', `Sous-module ${this.typeName} nettoyé`);
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  getHealth() {
    const errorRate = this.stats.totalInteractions > 0 
      ? this.stats.failedInteractions / this.stats.totalInteractions 
      : 0;
      
    return {
      status: errorRate < 0.1 ? 'healthy' as const : 
              errorRate < 0.3 ? 'warning' as const : 'critical' as const,
      errorRate,
      lastCheck: new Date(),
      details: {
        totalInteractions: this.stats.totalInteractions,
        avgProcessingTime: this.stats.averageProcessingTime
      }
    };
  }
  
  // === MÉTHODES UTILITAIRES PROTÉGÉES ===
  
  /**
   * Met à jour les statistiques
   */
  protected updateStats(success: boolean, processingTime: number): void {
    this.stats.totalInteractions++;
    this.stats.lastInteraction = new Date();
    
    if (success) {
      this.stats.successfulInteractions++;
    } else {
      this.stats.failedInteractions++;
    }
    
    // Calcul moyenne mobile
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalInteractions - 1) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalInteractions;
  }
  
  /**
   * Créer un résultat d'erreur standardisé
   */
  protected createErrorResult(message: string, code?: string): ObjectInteractionResult {
    return {
      success: false,
      type: INTERACTION_RESULT_TYPES.ERROR,
      message,
      data: {
        objectData: {
          objectId: "0",
          objectType: "error",
          collected: false
        },
        metadata: {
          errorCode: code,
          subModule: this.typeName,
          timestamp: Date.now()
        }
      }
    };
  }
  
  /**
   * Créer un résultat de succès avec données objet
   */
  protected createSuccessResult(
    type: InteractionResultType,
    message: string,
    objectData: Partial<ObjectInteractionData> & {
      objectId: string;
      objectType: string;
    },
    additionalData?: Record<string, any>
  ): ObjectInteractionResult {
    return {
      success: true,
      type,
      message,
      data: {
        objectData: {
          collected: false,
          ...objectData
        },
        ...additionalData
      }
    };
  }
  
  // === MÉTHODES HELPER AVEC TYPES PRÉDÉFINIS ===
  
  /**
   * Créer un résultat d'objet collecté
   */
  protected createObjectCollectedResult(
    objectId: string,
    objectType: string,
    message: string = "Objet collecté avec succès !",
    additionalData?: Partial<ObjectInteractionData>
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.OBJECT_COLLECTED,
      message,
      {
        objectId,
        objectType,
        collected: true,
        ...additionalData
      }
    );
  }
  
  /**
   * Créer un résultat d'item trouvé lors d'une recherche
   */
  protected createItemFoundResult(
    objectId: string,
    objectType: string,
    itemsFound: string[] = [],
    message: string = "Vous avez trouvé quelque chose !",
    attempts: number = 1,
    additionalData?: Partial<ObjectInteractionData>
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.ITEM_FOUND,
      message,
      {
        objectId,
        objectType,
        collected: true,
        searchResult: { 
          found: true, 
          attempts, 
          itemsFound 
        },
        ...additionalData
      }
    );
  }
  
  /**
   * Créer un résultat de recherche sans résultat
   */
  protected createNoItemFoundResult(
    objectId: string = "0",
    objectType: string = "search",
    message: string = "Il n'y a rien ici.",
    attempts: number = 1
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.NO_ITEM_FOUND,
      message,
      {
        objectId,
        objectType,
        collected: false,
        searchResult: { found: false, attempts }
      }
    );
  }
  
  /**
   * Créer un résultat d'accès PC
   */
  protected createPcAccessResult(
    objectId: string,
    operation: string = "access",
    message: string = "Accès au PC autorisé",
    storage?: any
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.PC_ACCESS,
      message,
      {
        objectId,
        objectType: "pc",
        pcData: {
          accessed: true,
          operation,
          storage
        }
      }
    );
  }
  
  /**
   * Créer un résultat d'activation de machine
   */
  protected createMachineActivatedResult(
    objectId: string,
    objectType: string,
    output?: any,
    message: string = "Machine activée",
    newState?: string
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.MACHINE_ACTIVATED,
      message,
      {
        objectId,
        objectType,
        newState,
        machineData: {
          activated: true,
          output,
          state: newState
        }
      }
    );
  }
  
  /**
   * Créer un résultat de lecture de panneau
   */
  protected createPanelReadResult(
    objectId: string,
    title: string,
    content: string[],
    message: string = "Panneau lu",
    imageUrl?: string
  ): ObjectInteractionResult {
    return this.createSuccessResult(
      INTERACTION_RESULT_TYPES.PANEL_READ,
      message,
      {
        objectId,
        objectType: "panel",
        panelData: {
          title,
          content,
          imageUrl
        }
      }
    );
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Log avec préfixe du sous-module
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.typeName}]`;
    
    switch (level) {
      case 'info':
        console.log(`ℹ️ ${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`, data || '');
        break;
    }
  }
  
  /**
   * Valider les propriétés requises d'un objet
   */
  protected validateRequiredProperties(
    objectDef: ObjectDefinition, 
    requiredProps: string[]
  ): { valid: boolean; missing?: string[] } {
    const missing: string[] = [];
    
    for (const prop of requiredProps) {
      if (!(prop in objectDef.customProperties) && !(prop in objectDef)) {
        missing.push(prop);
      }
    }
    
    return missing.length > 0 
      ? { valid: false, missing }
      : { valid: true };
  }
  
  /**
   * Récupérer une propriété avec valeur par défaut
   */
  protected getProperty<T>(
    objectDef: ObjectDefinition, 
    propertyName: string, 
    defaultValue: T
  ): T {
    // Chercher d'abord dans les propriétés directes
    if (propertyName in objectDef && objectDef[propertyName as keyof ObjectDefinition] !== undefined) {
      return objectDef[propertyName as keyof ObjectDefinition] as T;
    }
    
    // Puis dans les propriétés custom
    if (propertyName in objectDef.customProperties && objectDef.customProperties[propertyName] !== undefined) {
      return objectDef.customProperties[propertyName] as T;
    }
    
    return defaultValue;
  }
  
  /**
   * Vérifier si un joueur a déjà collecté cet objet
   */
  protected hasPlayerCollected(objectDef: ObjectDefinition, playerName: string): boolean {
    return objectDef.state.collectedBy?.includes(playerName) ?? false;
  }
  
  /**
   * Vérifier les prérequis d'un objet pour un joueur - VERSION TYPE-SAFE
   */
  protected validateRequirements(
    player: Player,
    objectDef: ObjectDefinition
  ): { valid: boolean; reason?: string } {
    const req = objectDef.requirements;
    if (!req) return { valid: true };
    
    // Vérification niveau
    if (req.level && (player.level || 1) < req.level) {
      return { valid: false, reason: `Niveau ${req.level} requis` };
    }
    
    // Vérification badge - TYPE SAFE avec interface étendue
    if (req.badge) {
      const extendedPlayer = player as PlayerWithExtensions;
      if (!extendedPlayer.badges || !extendedPlayer.badges.includes(req.badge)) {
        return { valid: false, reason: `Badge ${req.badge} requis` };
      }
    }
    
    // Vérification item inventaire - TYPE SAFE avec interface étendue
    if (req.item) {
      const extendedPlayer = player as PlayerWithExtensions;
      if (!extendedPlayer.inventory || 
          !extendedPlayer.inventory.some((inventoryItem) => inventoryItem.id === req.item)) {
        return { valid: false, reason: `Objet ${req.item} requis` };
      }
    }
    
    // Vérification quête (implémentation future)
    if (req.quest) {
      const extendedPlayer = player as PlayerWithExtensions;
      if (!extendedPlayer.quests || !extendedPlayer.quests.includes(req.quest)) {
        // Pour l'instant, on ne bloque pas sur les quêtes
        // return { valid: false, reason: `Quête ${req.quest} requise` };
      }
    }
    
    return { valid: true };
  }
}

// ✅ FACTORY D'ERREURS STANDARDISÉES
export const ObjectErrors = {
  INVALID_OBJECT: (reason: string) => ({ code: 'INVALID_OBJECT', message: `Objet invalide: ${reason}` }),
  ACCESS_DENIED: (reason: string) => ({ code: 'ACCESS_DENIED', message: `Accès refusé: ${reason}` }),
  ALREADY_COLLECTED: () => ({ code: 'ALREADY_COLLECTED', message: 'Cet objet a déjà été collecté' }),
  INVENTORY_FULL: () => ({ code: 'INVENTORY_FULL', message: 'Inventaire plein' }),
  INSUFFICIENT_LEVEL: (required: number) => ({ 
    code: 'INSUFFICIENT_LEVEL', 
    message: `Niveau ${required} requis` 
  }),
  MISSING_ITEM: (itemId: string) => ({ 
    code: 'MISSING_ITEM', 
    message: `Objet requis manquant: ${itemId}` 
  }),
  MISSING_BADGE: (badgeId: string) => ({
    code: 'MISSING_BADGE',
    message: `Badge requis manquant: ${badgeId}`
  }),
  PROCESSING_FAILED: (reason: string) => ({ 
    code: 'PROCESSING_FAILED', 
    message: `Erreur de traitement: ${reason}` 
  }),
  NOT_AVAILABLE: () => ({
    code: 'NOT_AVAILABLE',
    message: 'Cet objet n\'est pas disponible actuellement'
  })
} as const;

// ✅ EXPORT EXPLICIT POUR ObjectInteractionResult
export { ObjectInteractionResult };
