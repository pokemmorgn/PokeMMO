// server/src/Intelligence/DataCollection/ActionValidator.ts

/**
 * ✅ ACTION VALIDATOR - VALIDATION ET INTÉGRITÉ DES DONNÉES
 * 
 * Valide toutes les actions avant sauvegarde pour garantir :
 * - Intégrité des données
 * - Cohérence des types
 * - Détection d'anomalies
 * - Prévention des attaques
 * 
 * SÉCURITÉ CRITIQUE : Empêche les données corrompues d'entrer dans l'IA.
 */

import { 
  PlayerAction, 
  ActionType, 
  ActionCategory,
  getCategoryForActionType,
  BEHAVIOR_THRESHOLDS
} from '../Core/ActionTypes';

import type { 
  PokemonActionData, 
  CombatActionData, 
  MovementActionData,
  InventoryActionData,
  QuestActionData,
  SocialActionData,
  EconomyActionData,
  BaseActionData 
} from '../Core/ActionTypes';

// ===================================================================
// 🛡️ TYPES DE VALIDATION
// ===================================================================

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedAction?: PlayerAction;
  securityFlags: string[];
  anomalyScore: number; // 0-1, 1 = très suspect
}

/**
 * Configuration de validation
 */
export interface ValidationConfig {
  strictMode: boolean;          // Mode strict : rejette au moindre doute
  allowSanitization: boolean;   // Autoriser la correction automatique
  maxActionsPerMinute: number;  // Limite actions/minute par joueur
  maxDistancePerSecond: number; // Vitesse max en pixels/seconde
  requiredFields: string[];     // Champs obligatoires
}

/**
 * Historique récent d'un joueur pour validation contextuelle
 */
interface PlayerValidationContext {
  playerId: string;
  recentActions: PlayerAction[];
  lastActionTime: number;
  actionCount: number;
  lastLocation: { map: string; x: number; y: number };
  sessionStart: number;
  suspiciousActivity: boolean;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - ACTION VALIDATOR
// ===================================================================

export class ActionValidator {
  private config: ValidationConfig;
  private playerContexts: Map<string, PlayerValidationContext> = new Map();
  private blacklistedIPs: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map(); // pattern -> count
  
  // Statistiques de validation
  private stats = {
    totalValidated: 0,
    totalRejected: 0,
    totalSanitized: 0,
    anomaliesDetected: 0,
    securityIncidents: 0
  };

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      strictMode: false,
      allowSanitization: true,
      maxActionsPerMinute: 60,     // 1 action/seconde max
      maxDistancePerSecond: 500,   // 500 pixels/seconde max
      requiredFields: ['playerId', 'actionType', 'timestamp', 'data'],
      ...config
    };

    console.log('✅ ActionValidator initialisé', this.config);
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🔍 VALIDATION PRINCIPALE
  // ===================================================================

  /**
   * Valide une action complètement
   */
  async validateAction(action: PlayerAction): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: [],
      anomalyScore: 0
    };

    this.stats.totalValidated++;

    try {
      // 1. Validation structurelle de base
      this.validateStructure(action, result);
      
      // 2. Validation des types et valeurs
      this.validateTypes(action, result);
      
      // 3. Validation contextuelle (historique joueur)
      await this.validateContext(action, result);
      
      // 4. Validation spécifique au type d'action
      this.validateActionSpecific(action, result);
      
      // 5. Détection d'anomalies et sécurité
      this.detectAnomalies(action, result);
      
      // 6. Sanitization si autorisée et nécessaire
      if (this.config.allowSanitization && result.warnings.length > 0) {
        result.sanitizedAction = this.sanitizeAction(action, result);
        if (result.sanitizedAction) {
          this.stats.totalSanitized++;
        }
      }
      
      // 7. Décision finale
      result.isValid = result.errors.length === 0;
      
      if (!result.isValid) {
        this.stats.totalRejected++;
      }
      
      if (result.securityFlags.length > 0) {
        this.stats.securityIncidents++;
      }
      
      if (result.anomalyScore > 0.7) {
        this.stats.anomaliesDetected++;
      }

      return result;

    } catch (error) {
      console.error('❌ Erreur validation action:', error);
      result.isValid = false;
      result.errors.push(`Erreur validation: ${error}`);
      return result;
    }
  }

  // ===================================================================
  // 🏗️ VALIDATIONS SPÉCIFIQUES
  // ===================================================================

  /**
   * Validation structurelle de base
   */
  private validateStructure(action: PlayerAction, result: ValidationResult): void {
    // Vérifier les champs requis
    for (const field of this.config.requiredFields) {
      if (!action[field as keyof PlayerAction]) {
        result.errors.push(`Champ requis manquant: ${field}`);
      }
    }

    // Vérifier l'ID
    if (!action.id || action.id.length < 10) {
      result.errors.push('ID action invalide');
    }

    // Vérifier la cohérence timestamp
    const now = Date.now();
    if (action.timestamp > now + 60000) { // Max 1 min dans le futur
      result.errors.push('Timestamp dans le futur');
      result.securityFlags.push('future_timestamp');
    }
    
    if (action.timestamp < now - 24 * 60 * 60 * 1000) { // Max 24h dans le passé
      result.warnings.push('Timestamp très ancien');
    }

    // Vérifier la catégorie
    const expectedCategory = getCategoryForActionType(action.actionType);
    if (action.category !== expectedCategory) {
      result.errors.push(`Catégorie incohérente: ${action.category} vs ${expectedCategory}`);
    }
  }

  /**
   * Validation des types et valeurs
   */
  private validateTypes(action: PlayerAction, result: ValidationResult): void {
    // Vérifier playerId
    if (typeof action.playerId !== 'string' || action.playerId.length < 3) {
      result.errors.push('PlayerId invalide');
    }

    // Vérifier actionType
    if (!Object.values(ActionType).includes(action.actionType)) {
      result.errors.push(`Type d'action inconnu: ${action.actionType}`);
    }

    // Vérifier données de base
    if (!action.data || typeof action.data !== 'object') {
      result.errors.push('Données action manquantes');
      return;
    }

    const data = action.data as BaseActionData;

    // Vérifier la localisation
    if (data.location) {
      if (!data.location.map || typeof data.location.map !== 'string') {
        result.errors.push('Carte manquante ou invalide');
      }
      
      if (typeof data.location.x !== 'number' || typeof data.location.y !== 'number') {
        result.errors.push('Coordonnées invalides');
      }
      
      // Vérifier que les coordonnées sont raisonnables
      if (Math.abs(data.location.x) > 10000 || Math.abs(data.location.y) > 10000) {
        result.warnings.push('Coordonnées très éloignées');
        result.anomalyScore += 0.2;
      }
    }
  }

  /**
   * Validation contextuelle avec l'historique du joueur
   */
  private async validateContext(action: PlayerAction, result: ValidationResult): Promise<void> {
    const context = this.getPlayerContext(action.playerId);
    
    // Vérifier le rate limiting
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentActions = context.recentActions.filter(a => a.timestamp > oneMinuteAgo);
    if (recentActions.length >= this.config.maxActionsPerMinute) {
      result.errors.push('Trop d\'actions par minute');
      result.securityFlags.push('rate_limit_exceeded');
    }

    // Vérifier la cohérence temporelle
    if (context.lastActionTime && action.timestamp < context.lastActionTime) {
      result.warnings.push('Action antérieure à la précédente');
      result.anomalyScore += 0.3;
    }

    // Vérifier la vitesse de déplacement
    if (context.lastLocation && action.data.location) {
      const distance = Math.sqrt(
        Math.pow(action.data.location.x - context.lastLocation.x, 2) +
        Math.pow(action.data.location.y - context.lastLocation.y, 2)
      );
      
      const timeDiff = (action.timestamp - context.lastActionTime) / 1000; // secondes
      const speed = distance / Math.max(timeDiff, 1);
      
      if (speed > this.config.maxDistancePerSecond) {
        result.warnings.push(`Vitesse de déplacement suspecte: ${speed.toFixed(2)} px/s`);
        result.securityFlags.push('suspicious_speed');
        result.anomalyScore += 0.4;
      }
    }

    // Mettre à jour le contexte
    this.updatePlayerContext(action);
  }

  /**
   * Validation spécifique selon le type d'action
   */
  private validateActionSpecific(action: PlayerAction, result: ValidationResult): void {
    switch (action.category) {
      case ActionCategory.POKEMON:
        this.validatePokemonAction(action, result);
        break;
      case ActionCategory.COMBAT:
        this.validateCombatAction(action, result);
        break;
      case ActionCategory.MOVEMENT:
        this.validateMovementAction(action, result);
        break;
      case ActionCategory.INVENTORY:
        this.validateInventoryAction(action, result);
        break;
      case ActionCategory.QUEST:
        this.validateQuestAction(action, result);
        break;
      case ActionCategory.SOCIAL:
        this.validateSocialAction(action, result);
        break;
      case ActionCategory.ECONOMY:
        this.validateEconomyAction(action, result);
        break;
    }
  }

  /**
   * Validation actions Pokémon
   */
  private validatePokemonAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as PokemonActionData;

    if (data.pokemon) {
      // Vérifier espèce
      if (!data.pokemon.species || typeof data.pokemon.species !== 'string') {
        result.errors.push('Espèce Pokémon manquante');
      }

      // Vérifier level
      if (data.pokemon.level !== undefined) {
        if (typeof data.pokemon.level !== 'number' || data.pokemon.level < 1 || data.pokemon.level > 100) {
          result.errors.push('Niveau Pokémon invalide');
        }
      }

      // Vérifier IVs si présents
      if (data.pokemon.ivs) {
        if (!Array.isArray(data.pokemon.ivs) || data.pokemon.ivs.length !== 6) {
          result.warnings.push('IVs Pokémon invalides');
        } else {
          for (const iv of data.pokemon.ivs) {
            if (typeof iv !== 'number' || iv < 0 || iv > 31) {
              result.warnings.push('Valeur IV invalide');
              break;
            }
          }
        }
      }
    }

    // Vérifier cohérence des tentatives
    if (data.attempts !== undefined && data.attempts < 1) {
      result.warnings.push('Nombre de tentatives invalide');
    }
  }

  /**
   * Validation actions de combat
   */
  private validateCombatAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as CombatActionData;

    // Vérifier type de combat
    const validBattleTypes = ['wild', 'trainer', 'pvp', 'gym'];
    if (!validBattleTypes.includes(data.battleType)) {
      result.errors.push('Type de combat invalide');
    }

    // Vérifier équipe
    if (data.playerTeam && !Array.isArray(data.playerTeam)) {
      result.warnings.push('Équipe joueur invalide');
    }

    // Vérifier dégâts
    if (data.damage !== undefined) {
      if (typeof data.damage !== 'number' || data.damage < 0 || data.damage > 999) {
        result.warnings.push('Dégâts invalides');
      }
    }

    // Vérifier durée
    if (data.duration !== undefined) {
      if (typeof data.duration !== 'number' || data.duration < 0 || data.duration > 30 * 60 * 1000) {
        result.warnings.push('Durée de combat suspecte');
      }
    }
  }

  /**
   * Validation actions de mouvement
   */
  private validateMovementAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as MovementActionData;

    if (data.fromLocation && data.toLocation) {
      // Vérifier distance
      if (data.distance !== undefined) {
        const calculatedDistance = Math.sqrt(
          Math.pow(data.toLocation.x - data.fromLocation.x, 2) +
          Math.pow(data.toLocation.y - data.fromLocation.y, 2)
        );
        
        if (Math.abs(data.distance - calculatedDistance) > 10) {
          result.warnings.push('Distance calculée incohérente');
        }
      }

      // Vérifier méthode de déplacement
      const validMethods = ['walk', 'run', 'bike', 'surf', 'teleport'];
      if (data.method && !validMethods.includes(data.method)) {
        result.warnings.push('Méthode de déplacement inconnue');
      }
    }
  }

  /**
   * Validation actions d'inventaire
   */
  private validateInventoryAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as InventoryActionData;

    // Vérifier quantité
    if (typeof data.quantity !== 'number' || data.quantity < 1 || data.quantity > 999) {
      result.errors.push('Quantité invalide');
    }

    // Vérifier ID objet
    if (!data.itemId || typeof data.itemId !== 'string') {
      result.errors.push('ID objet manquant');
    }

    // Vérifier nom objet
    if (!data.itemName || typeof data.itemName !== 'string') {
      result.warnings.push('Nom objet manquant');
    }
  }

  /**
   * Validation actions de quête
   */
  private validateQuestAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as QuestActionData;

    // Vérifier ID quête
    if (!data.questId || typeof data.questId !== 'string') {
      result.errors.push('ID quête manquant');
    }

    // Vérifier progression
    if (data.progress !== undefined) {
      if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 100) {
        result.warnings.push('Progression quête invalide');
      }
    }
  }

  /**
   * Validation actions sociales
   */
  private validateSocialAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as SocialActionData;

    // Vérifier message (si présent)
    if (data.message !== undefined) {
      if (typeof data.message !== 'string') {
        result.warnings.push('Message invalide');
      } else if (data.message.length > 500) {
        result.warnings.push('Message trop long');
      } else if (data.message.length === 0) {
        result.warnings.push('Message vide');
      }
    }

    // Vérifier canal
    const validChannels = ['whisper', 'local', 'guild', 'global'];
    if (data.channelType && !validChannels.includes(data.channelType)) {
      result.warnings.push('Type de canal invalide');
    }
  }

  /**
   * Validation actions économiques
   */
  private validateEconomyAction(action: PlayerAction, result: ValidationResult): void {
    const data = action.data as EconomyActionData;

    // Vérifier prix
    if (data.price !== undefined) {
      if (typeof data.price !== 'number' || data.price < 0 || data.price > 1000000) {
        result.warnings.push('Prix suspect');
        result.anomalyScore += 0.2;
      }
    }

    // Vérifier cohérence coût total
    if (data.price && data.quantity && data.totalCost) {
      const expectedCost = data.price * data.quantity;
      if (Math.abs(data.totalCost - expectedCost) > 1) {
        result.warnings.push('Coût total incohérent');
      }
    }

    // Vérifier évolution de l'or
    if (data.goldBefore !== undefined && data.goldAfter !== undefined) {
      if (data.goldBefore < 0 || data.goldAfter < 0) {
        result.errors.push('Montant d\'or négatif');
        result.securityFlags.push('negative_gold');
      }
    }
  }

  // ===================================================================
  // 🕵️ DÉTECTION D'ANOMALIES
  // ===================================================================

  /**
   * Détecte les anomalies et activités suspectes
   */
  private detectAnomalies(action: PlayerAction, result: ValidationResult): void {
    const context = this.getPlayerContext(action.playerId);

    // Détection de spam d'actions identiques
    const recentSameActions = context.recentActions.filter(
      a => a.actionType === action.actionType && 
           (action.timestamp - a.timestamp) < 10000 // 10 secondes
    );
    
    if (recentSameActions.length >= 5) {
      result.securityFlags.push('action_spam');
      result.anomalyScore += 0.3;
    }

    // Détection de patterns suspects
    const patternKey = `${action.playerId}_${action.actionType}`;
    const patternCount = this.suspiciousPatterns.get(patternKey) || 0;
    this.suspiciousPatterns.set(patternKey, patternCount + 1);

    if (patternCount > 100) { // Plus de 100 actions du même type
      result.securityFlags.push('suspicious_pattern');
      result.anomalyScore += 0.4;
    }

    // Détection de session trop longue
    const sessionDuration = action.timestamp - context.sessionStart;
    if (sessionDuration > 12 * 60 * 60 * 1000) { // Plus de 12 heures
      result.warnings.push('Session très longue détectée');
      result.anomalyScore += 0.1;
    }

    // Détection d'actions impossibles
    if (this.isImpossibleAction(action, context)) {
      result.securityFlags.push('impossible_action');
      result.anomalyScore += 0.5;
    }
  }

  /**
   * Détermine si une action est impossible dans le contexte
   */
  private isImpossibleAction(action: PlayerAction, context: PlayerValidationContext): boolean {
    // Action de combat sans avoir rencontré de Pokémon
    if (action.actionType === ActionType.BATTLE_START) {
      const recentEncounter = context.recentActions.find(
        a => a.actionType === ActionType.POKEMON_ENCOUNTER && 
             (action.timestamp - a.timestamp) < 60000 // 1 minute
      );
      if (!recentEncounter) return true;
    }

    // Capture sans combat ou rencontre
    if (action.actionType === ActionType.POKEMON_CAPTURE_ATTEMPT) {
      const recentBattleOrEncounter = context.recentActions.find(
        a => (a.actionType === ActionType.BATTLE_START || a.actionType === ActionType.POKEMON_ENCOUNTER) &&
             (action.timestamp - a.timestamp) < 300000 // 5 minutes
      );
      if (!recentBattleOrEncounter) return true;
    }

    return false;
  }

  // ===================================================================
  // 🧼 SANITIZATION
  // ===================================================================

  /**
   * Corrige automatiquement les données d'action
   */
  private sanitizeAction(action: PlayerAction, result: ValidationResult): PlayerAction | null {
    try {
      const sanitized = JSON.parse(JSON.stringify(action)); // Deep clone

      // Corriger le timestamp si dans le futur
      if (sanitized.timestamp > Date.now() + 60000) {
        sanitized.timestamp = Date.now();
        result.warnings.push('Timestamp corrigé');
      }

      // Corriger la catégorie si incohérente
      const expectedCategory = getCategoryForActionType(sanitized.actionType);
      if (sanitized.category !== expectedCategory) {
        sanitized.category = expectedCategory;
        result.warnings.push('Catégorie corrigée');
      }

      // Limiter les coordonnées
      if (sanitized.data.location) {
        sanitized.data.location.x = Math.max(-5000, Math.min(5000, sanitized.data.location.x));
        sanitized.data.location.y = Math.max(-5000, Math.min(5000, sanitized.data.location.y));
      }

      // Limiter les quantités
      if (sanitized.data.quantity) {
        sanitized.data.quantity = Math.max(1, Math.min(999, sanitized.data.quantity));
      }

      return sanitized;

    } catch (error) {
      console.error('❌ Erreur sanitization:', error);
      return null;
    }
  }

  // ===================================================================
  // 👤 GESTION CONTEXTE JOUEUR
  // ===================================================================

  /**
   * Récupère ou crée le contexte d'un joueur
   */
  private getPlayerContext(playerId: string): PlayerValidationContext {
    if (!this.playerContexts.has(playerId)) {
      this.playerContexts.set(playerId, {
        playerId,
        recentActions: [],
        lastActionTime: 0,
        actionCount: 0,
        lastLocation: { map: '', x: 0, y: 0 },
        sessionStart: Date.now(),
        suspiciousActivity: false
      });
    }
    
    return this.playerContexts.get(playerId)!;
  }

  /**
   * Met à jour le contexte après validation
   */
  private updatePlayerContext(action: PlayerAction): void {
    const context = this.getPlayerContext(action.playerId);
    
    // Ajouter l'action récente
    context.recentActions.push(action);
    
    // Garder seulement les 50 dernières actions
    if (context.recentActions.length > 50) {
      context.recentActions = context.recentActions.slice(-50);
    }
    
    // Mettre à jour les informations
    context.lastActionTime = action.timestamp;
    context.actionCount++;
    
    if (action.data.location) {
      context.lastLocation = { ...action.data.location };
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MONITORING
  // ===================================================================

  /**
   * Retourne les statistiques de validation
   */
  getValidationStats(): {
    totalValidated: number;
    totalRejected: number;
    totalSanitized: number;
    rejectionRate: number;
    sanitizationRate: number;
    anomaliesDetected: number;
    securityIncidents: number;
    playersTracked: number;
  } {
    const rejectionRate = this.stats.totalValidated > 0 ? 
      this.stats.totalRejected / this.stats.totalValidated : 0;
    const sanitizationRate = this.stats.totalValidated > 0 ? 
      this.stats.totalSanitized / this.stats.totalValidated : 0;

    return {
      ...this.stats,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      sanitizationRate: Math.round(sanitizationRate * 100) / 100,
      playersTracked: this.playerContexts.size
    };
  }

  /**
   * Marque un joueur comme suspect
   */
  flagPlayerAsSuspicious(playerId: string, reason: string): void {
    const context = this.getPlayerContext(playerId);
    context.suspiciousActivity = true;
    console.warn(`🚨 Joueur ${playerId} marqué comme suspect: ${reason}`);
  }

  // ===================================================================
  // 🧹 MAINTENANCE
  // ===================================================================

  /**
   * Lance les tâches de maintenance
   */
  private startMaintenanceTasks(): void {
    // Nettoyage du contexte toutes les heures
    setInterval(() => {
      this.cleanupPlayerContexts();
    }, 60 * 60 * 1000);

    // Nettoyage des patterns suspects toutes les 6 heures
    setInterval(() => {
      this.cleanupSuspiciousPatterns();
    }, 6 * 60 * 60 * 1000);

    console.log('🧹 Tâches de maintenance du validator démarrées');
  }

  /**
   * Nettoie les contextes de joueurs inactifs
   */
  private cleanupPlayerContexts(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 heures
    let cleanedCount = 0;

    for (const [playerId, context] of this.playerContexts) {
      if (now - context.lastActionTime > maxAge) {
        this.playerContexts.delete(playerId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} contextes joueurs nettoyés`);
    }
  }

  /**
   * Nettoie les patterns suspects anciens
   */
  private cleanupSuspiciousPatterns(): void {
    // Reset des compteurs pour éviter l'accumulation infinie
    this.suspiciousPatterns.clear();
    console.log('🧹 Patterns suspects réinitialisés');
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.playerContexts.clear();
    this.suspiciousPatterns.clear();
    console.log('✅ ActionValidator détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let validatorInstance: ActionValidator | null = null;

/**
 * Récupère l'instance singleton du validator
 */
export function getActionValidator(): ActionValidator {
  if (!validatorInstance) {
    validatorInstance = new ActionValidator();
  }
  return validatorInstance;
}

/**
 * Export par défaut
 */
export default ActionValidator;
