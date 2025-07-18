// src/interactions/modules/object/core/IObjectSubModule.ts
// Interface contractuelle pour tous les sous-modules d'objets

import { Player } from "../../../../schema/PokeWorldState";
import { 
  InteractionResult,
  InteractionContext
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

// ✅ RÉSULTAT SPÉCIALISÉ POUR OBJETS
export interface ObjectInteractionResult extends InteractionResult {
  objectData?: {
    objectId: number;
    objectType: string;
    collected?: boolean;
    newState?: string;
    
    // Item reçu
    itemReceived?: {
      itemId: string;
      quantity: number;
      rarity: string;
    };
    
    // Résultat de fouille
    searchResult?: {
      found: boolean;
      remainingChances?: number;
    };
    
    // Données de machine/PC
    machineData?: any;
    
    // Contenu de panneau
    panelContent?: {
      title: string;
      content: string[];
      imageUrl?: string;
    };
    
    // Métadonnées
    metadata?: Record<string, any>;
  };
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

// ✅ CLASSE DE BASE ABSTRAITE (Optionnelle mais utile)
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
      type: 'error',
      message,
      data: {
        metadata: {
          errorCode: code,
          subModule: this.typeName,
          timestamp: Date.now()
        }
      }
    };
  }
  
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
  PROCESSING_FAILED: (reason: string) => ({ 
    code: 'PROCESSING_FAILED', 
    message: `Erreur de traitement: ${reason}` 
  })
} as const;
