// src/interactions/interfaces/InteractionModule.ts
// Interface contractuelle pour tous les modules d'interaction

import { Player } from "../../schema/PokeWorldState";
import { 
  InteractionRequest, 
  InteractionResult, 
  InteractionContext,
  InteractionType,
  ProximityValidation,
  ConditionValidation,
  CooldownInfo
} from "../types/BaseInteractionTypes";

// ✅ INTERFACE PRINCIPALE DES MODULES
export interface IInteractionModule {
  
  // === IDENTIFICATION DU MODULE ===
  
  /**
   * Nom unique du module pour debugging/logging
   */
  readonly moduleName: string;
  
  /**
   * Types d'interaction que ce module peut gérer
   */
  readonly supportedTypes: InteractionType[];
  
  /**
   * Version du module pour compatibilité
   */
  readonly version: string;
  
  // === MÉTHODES PRINCIPALES ===
  
  /**
   * Détermine si ce module peut traiter cette requête
   * @param request - Requête d'interaction
   * @returns true si le module peut traiter, false sinon
   */
  canHandle(request: InteractionRequest): boolean;
  
  /**
   * Traite l'interaction
   * @param context - Contexte complet de l'interaction (player + request + validations)
   * @returns Résultat de l'interaction
   */
  handle(context: InteractionContext): Promise<InteractionResult>;
  
  // === MÉTHODES DE VALIDATION OPTIONNELLES ===
  
  /**
   * Validation spécifique au module (optionnelle)
   * Appelée après les validations de base si implémentée
   * @param context - Contexte de l'interaction
   * @returns Validation réussie ou échouée avec raison
   */
  validateSpecific?(context: InteractionContext): Promise<ConditionValidation>;
  
  /**
   * Calcul de cooldown spécifique au module (optionnel)
   * @param player - Joueur qui fait l'interaction
   * @param request - Requête d'interaction
   * @returns Info de cooldown spécifique
   */
  getCooldownInfo?(player: Player, request: InteractionRequest): Promise<CooldownInfo>;
  
  // === MÉTHODES DE CYCLE DE VIE ===
  
  /**
   * Initialisation du module
   * Appelée une fois au démarrage du serveur
   */
  initialize?(): Promise<void>;
  
  /**
   * Nettoyage du module
   * Appelée à l'arrêt du serveur
   */
  cleanup?(): Promise<void>;
  
  // === MÉTHODES DE MONITORING ===
  
  /**
   * Statistiques du module pour monitoring
   * @returns Métriques d'utilisation du module
   */
  getStats?(): ModuleStats;
  
  /**
   * Santé du module pour health checks
   * @returns État de santé du module
   */
  getHealth?(): ModuleHealth;
}

// ✅ CLASSE DE BASE ABSTRAITE (optionnelle)
export abstract class BaseInteractionModule implements IInteractionModule {
  
  abstract readonly moduleName: string;
  abstract readonly supportedTypes: InteractionType[];
  readonly version: string = "1.0.0";
  
  // Statistiques par défaut
  protected stats: ModuleStats = {
    totalInteractions: 0,
    successfulInteractions: 0,
    failedInteractions: 0,
    averageProcessingTime: 0,
    lastInteraction: null
  };
  
  abstract canHandle(request: InteractionRequest): boolean;
  abstract handle(context: InteractionContext): Promise<InteractionResult>;
  
  // === IMPLÉMENTATIONS PAR DÉFAUT ===
  
  async initialize(): Promise<void> {
    console.log(`📦 [${this.moduleName}] Module initialisé v${this.version}`);
  }
  
  async cleanup(): Promise<void> {
    console.log(`🧹 [${this.moduleName}] Module nettoyé`);
  }
  
  getStats(): ModuleStats {
    return { ...this.stats };
  }
  
  getHealth(): ModuleHealth {
    const errorRate = this.stats.totalInteractions > 0 
      ? this.stats.failedInteractions / this.stats.totalInteractions 
      : 0;
      
    return {
      status: errorRate < 0.1 ? 'healthy' : errorRate < 0.3 ? 'warning' : 'critical',
      errorRate: errorRate,
      lastCheck: new Date(),
      details: {
        totalInteractions: this.stats.totalInteractions,
        avgProcessingTime: this.stats.averageProcessingTime
      }
    };
  }
  
  // === MÉTHODES UTILITAIRES PROTÉGÉES ===
  
  /**
   * Met à jour les statistiques du module
   */
  protected updateStats(success: boolean, processingTime: number): void {
    this.stats.totalInteractions++;
    this.stats.lastInteraction = new Date();
    
    if (success) {
      this.stats.successfulInteractions++;
    } else {
      this.stats.failedInteractions++;
    }
    
    // Calcul moyenne mobile simple
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalInteractions - 1) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalInteractions;
  }
  
  /**
   * Créer un résultat d'erreur standardisé
   */
  protected createErrorResult(message: string, code?: string): InteractionResult {
    return {
      success: false,
      type: 'error',
      message: message,
      data: {
        metadata: {
          errorCode: code,
          module: this.moduleName,
          timestamp: Date.now()
        }
      }
    };
  }
  
  /**
   * Log avec préfixe du module
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.moduleName}]`;
    
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
}

// ✅ TYPES POUR MONITORING
export interface ModuleStats {
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  averageProcessingTime: number; // en millisecondes
  lastInteraction: Date | null;
}

export interface ModuleHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  errorRate: number; // 0-1
  lastCheck: Date;
  details?: Record<string, any>;
}

// ✅ REGISTRY DES MODULES (pour le BaseInteractionManager)
export interface IModuleRegistry {
  
  /**
   * Enregistrer un module
   */
  register(module: IInteractionModule): void;
  
  /**
   * Trouver le module approprié pour une requête
   */
  findModule(request: InteractionRequest): IInteractionModule | null;
  
  /**
   * Obtenir tous les modules enregistrés
   */
  getAllModules(): IInteractionModule[];
  
  /**
   * Obtenir un module par nom
   */
  getModule(moduleName: string): IInteractionModule | null;
  
  /**
   * Initialiser tous les modules
   */
  initializeAll(): Promise<void>;
  
  /**
   * Nettoyer tous les modules
   */
  cleanupAll(): Promise<void>;
  
  /**
   * Statistiques globales
   */
  getGlobalStats(): GlobalModuleStats;
}

export interface GlobalModuleStats {
  totalModules: number;
  activeModules: number;
  totalInteractions: number;
  moduleStats: Record<string, ModuleStats>;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

// ✅ CONFIGURATION DES MODULES
export interface ModuleConfig {
  enabled: boolean;
  priority?: number; // Pour ordre de traitement si plusieurs modules peuvent gérer
  settings?: Record<string, any>;
}

export interface ModulesConfiguration {
  [moduleName: string]: ModuleConfig;
}
