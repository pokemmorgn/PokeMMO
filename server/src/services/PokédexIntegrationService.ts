// server/src/services/PokédexIntegrationService.ts
import { EventEmitter } from 'events';
import { pokédexService } from './PokédexService';
import { IOwnedPokemon } from '../models/OwnedPokemon';

// ===== TYPES SIMPLES ET SÉCURISÉS =====

export interface QuickPokemonEvent {
  playerId: string;
  pokemonId: number;
  level?: number;
  location?: string;
  weather?: string;
  timeOfDay?: string;
  isShiny?: boolean;
  ownedPokemonId?: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
}

export interface IntegrationConfig {
  enabled: boolean;
  autoNotifications: boolean;
  rateLimitEnabled: boolean;
  debugMode: boolean;
}

export interface IntegrationResult {
  success: boolean;
  isNew: boolean;
  notifications: string[];
  achievements: string[];
  error?: string;
}

// ===== SERVICE D'INTÉGRATION OPTIMISÉ =====

export class PokédexIntegrationService extends EventEmitter {
  private static instance: PokédexIntegrationService;
  
  // Configuration simple
  private config: IntegrationConfig = {
    enabled: true,
    autoNotifications: true,
    rateLimitEnabled: true,
    debugMode: false
  };
  
  // Cache anti-spam avec TTL
  private recentActions = new Map<string, Set<string>>();
  private readonly SPAM_WINDOW = 30 * 1000; // 30 secondes
  
  // Compteurs pour monitoring
  private stats = {
    totalProcessed: 0,
    totalErrors: 0,
    lastReset: Date.now()
  };
  
  constructor() {
    super();
    this.setupCleanup();
    console.log('🔗 [PokédexIntegrationService] Service d\'intégration initialisé');
  }
  
  // Singleton sécurisé
  static getInstance(): PokédexIntegrationService {
    if (!PokédexIntegrationService.instance) {
      PokédexIntegrationService.instance = new PokédexIntegrationService();
    }
    return PokédxIntegrationService.instance;
  }
  
  // ===== API ULTRA-SIMPLE =====
  
  /**
   * 👁️ POKÉMON VU - Intégration automatique
   * Appel unique depuis n'importe où dans votre jeu
   */
  async quickSeen(data: QuickPokemonEvent): Promise<IntegrationResult> {
    try {
      if (!this.config.enabled) {
        return { success: false, isNew: false, notifications: [], achievements: [], error: 'Service désactivé' };
      }
      
      // Validation rapide
      const validation = this.validateEvent(data);
      if (!validation.valid) {
        return { success: false, isNew: false, notifications: [], achievements: [], error: validation.error };
      }
      
      // Protection anti-spam
      if (this.config.rateLimitEnabled && this.isSpam(data.playerId, `seen:${data.pokemonId}`)) {
        this.debugLog(`⏭️ Action ignorée (spam): ${data.playerId} - ${data.pokemonId}`);
        return { success: true, isNew: false, notifications: [], achievements: [] };
      }
      
      this.debugLog(`👁️ Intégration vue: ${data.playerId} -> #${data.pokemonId}`);
      
      // Déléguer au service principal
      const result = await pokédxService.pokemonSeen({
        playerId: data.playerId,
        pokemonId: data.pokemonId,
        level: data.level,
        location: data.location,
        weather: data.weather,
        method: data.method,
        timeOfDay: data.timeOfDay
      });
      
      this.stats.totalProcessed++;
      
      // Marquer comme traité
      this.markAsProcessed(data.playerId, `seen:${data.pokemonId}`);
      
      // Émettre événement pour autres systèmes
      if (result.isNew) {
        this.emit('pokemonDiscovered', {
          playerId: data.playerId,
          pokemonId: data.pokemonId,
          location: data.location,
          timestamp: new Date()
        });
      }
      
      return {
        success: result.success,
        isNew: result.isNew,
        notifications: result.notifications,
        achievements: [], // TODO: Système d'achievements
        error: result.error
      };
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédxIntegrationService] Erreur quickSeen:`, error);
      return {
        success: false,
        isNew: false,
        notifications: [],
        achievements: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * 🎯 POKÉMON CAPTURÉ - Intégration automatique
   * Appel unique lors des captures
   */
  async quickCaught(data: QuickPokemonEvent): Promise<IntegrationResult & { isNewBest?: boolean }> {
    try {
      if (!this.config.enabled) {
        return { success: false, isNew: false, notifications: [], achievements: [], error: 'Service désactivé' };
      }
      
      // Validation avec ownedPokemonId requis
      const validation = this.validateEvent(data, true);
      if (!validation.valid) {
        return { success: false, isNew: false, notifications: [], achievements: [], error: validation.error };
      }
      
      // Protection anti-spam
      if (this.config.rateLimitEnabled && this.isSpam(data.playerId, `caught:${data.pokemonId}`)) {
        this.debugLog(`⏭️ Capture ignorée (spam): ${data.playerId} - ${data.pokemonId}`);
        return { success: true, isNew: false, notifications: [], achievements: [] };
      }
      
      this.debugLog(`🎯 Intégration capture: ${data.playerId} -> #${data.pokemonId}${data.isShiny ? ' ✨' : ''}`);
      
      // Déléguer au service principal
      const result = await pokédxService.pokemonCaught({
        playerId: data.playerId,
        pokemonId: data.pokemonId,
        level: data.level || 5,
        location: data.location || 'Zone Inconnue',
        weather: data.weather,
        method: data.method || 'wild',
        timeOfDay: data.timeOfDay,
        ownedPokemonId: data.ownedPokemonId!,
        isShiny: data.isShiny || false
      });
      
      this.stats.totalProcessed++;
      
      // Marquer comme traité
      this.markAsProcessed(data.playerId, `caught:${data.pokemonId}`);
      
      // Émettre événements pour autres systèmes
      if (result.isNew) {
        this.emit('pokemonCaptured', {
          playerId: data.playerId,
          pokemonId: data.pokemonId,
          isShiny: data.isShiny,
          location: data.location,
          timestamp: new Date()
        });
      }
      
      if (data.isShiny) {
        this.emit('shinyFound', {
          playerId: data.playerId,
          pokemonId: data.pokemonId,
          location: data.location,
          timestamp: new Date()
        });
      }
      
      return {
        success: result.success,
        isNew: result.isNew,
        isNewBest: result.isNewBest,
        notifications: result.notifications,
        achievements: [], // TODO: Système d'achievements
        error: result.error
      };
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`❌ [PokédxIntegrationService] Erreur quickCaught:`, error);
      return {
        success: false,
        isNew: false,
        notifications: [],
        achievements: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * 🌟 ÉVOLUTION POKÉMON - Gestion automatique
   * Appel depuis votre système d'évolution
   */
  async handleEvolution(
    playerId: string,
    fromPokemonId: number,
    toPokemonId: number,
    ownedPokemonId: string,
    location: string = 'Évolution'
  ): Promise<IntegrationResult> {
    try {
      this.debugLog(`🌟 Évolution: ${playerId} - #${fromPokemonId} → #${toPokemonId}`);
      
      // Marquer la nouvelle forme comme vue ET capturée
      const [seenResult, caughtResult] = await Promise.all([
        this.quickSeen({
          playerId,
          pokemonId: toPokemonId,
          level: 1, // Niveau générique pour évolution
          location,
          method: 'evolution'
        }),
        this.quickCaught({
          playerId,
          pokemonId: toPokemonId,
          level: 1,
          location,
          method: 'evolution',
          ownedPokemonId,
          isShiny: false // TODO: Récupérer statut shiny du Pokémon original
        })
      ]);
      
      // Combiner les notifications
      const allNotifications = [
        ...seenResult.notifications,
        ...caughtResult.notifications
      ];
      
      // Notification spéciale d'évolution
      if (seenResult.isNew) {
        allNotifications.push(`🌟 Nouvelle forme découverte par évolution !`);
      }
      
      // Émettre événement d'évolution
      this.emit('pokemonEvolved', {
        playerId,
        fromPokemonId,
        toPokemonId,
        isNewForm: seenResult.isNew,
        timestamp: new Date()
      });
      
      return {
        success: seenResult.success && caughtResult.success,
        isNew: seenResult.isNew,
        notifications: allNotifications,
        achievements: []
      };
      
    } catch (error) {
      console.error(`❌ [PokédxIntegrationService] Erreur handleEvolution:`, error);
      return {
        success: false,
        isNew: false,
        notifications: [],
        achievements: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  // ===== HOOKS POUR AUTRES SYSTÈMES =====
  
  /**
   * Hook OwnedPokemon - Intégration automatique à la création
   */
  async onPokemonCreated(ownedPokemon: IOwnedPokemon, context?: {
    location?: string;
    method?: string;
    weather?: string;
    timeOfDay?: string;
  }): Promise<void> {
    try {
      await this.quickCaught({
        playerId: ownedPokemon.owner,
        pokemonId: ownedPokemon.pokemonId,
        level: ownedPokemon.level,
        location: context?.location,
        weather: context?.weather,
        method: context?.method as any,
        timeOfDay: context?.timeOfDay,
        ownedPokemonId: ownedPokemon._id.toString(),
        isShiny: ownedPokemon.shiny
      });
    } catch (error) {
      console.error(`❌ [PokédxIntegrationService] Erreur onPokemonCreated:`, error);
    }
  }
  
  /**
   * Hook Combat - Rencontre sauvage
   */
  async onWildEncounter(
    playerId: string,
    pokemonId: number,
    level: number,
    location: string,
    context?: {
      weather?: string;
      timeOfDay?: string;
    }
  ): Promise<void> {
    try {
      await this.quickSeen({
        playerId,
        pokemonId,
        level,
        location,
        method: 'wild',
        weather: context?.weather,
        timeOfDay: context?.timeOfDay
      });
    } catch (error) {
      console.error(`❌ [PokédxIntegrationService] Erreur onWildEncounter:`, error);
    }
  }
  
  /**
   * Hook Combat - Dresseur
   */
  async onTrainerEncounter(
    playerId: string,
    pokemonId: number,
    level: number,
    location: string,
    trainerName?: string
  ): Promise<void> {
    try {
      await this.quickSeen({
        playerId,
        pokemonId,
        level,
        location: location + (trainerName ? ` (vs ${trainerName})` : ''),
        method: 'trainer'
      });
    } catch (error) {
      console.error(`❌ [PokédxIntegrationService] Erreur onTrainerEncounter:`, error);
    }
  }
  
  // ===== MÉTHODES PRIVÉES OPTIMISÉES =====
  
  /**
   * Validation rapide et sécurisée
   */
  private validateEvent(data: QuickPokemonEvent, requireOwnedId: boolean = false): { valid: boolean; error?: string } {
    if (!data.playerId || typeof data.playerId !== 'string' || data.playerId.length > 50) {
      return { valid: false, error: 'PlayerId invalide' };
    }
    
    if (!Number.isInteger(data.pokemonId) || data.pokemonId < 1 || data.pokemonId > 2000) {
      return { valid: false, error: 'PokemonId invalide' };
    }
    
    if (data.level !== undefined && (data.level < 1 || data.level > 100)) {
      return { valid: false, error: 'Niveau invalide' };
    }
    
    if (data.location && data.location.length > 100) {
      return { valid: false, error: 'Nom de lieu trop long' };
    }
    
    if (requireOwnedId && (!data.ownedPokemonId || typeof data.ownedPokemonId !== 'string')) {
      return { valid: false, error: 'OwnedPokemonId requis pour capture' };
    }
    
    return { valid: true };
  }
  
  /**
   * Détection de spam optimisée
   */
  private isSpam(playerId: string, actionKey: string): boolean {
    const playerActions = this.recentActions.get(playerId);
    if (!playerActions) {
      return false;
    }
    
    return playerActions.has(actionKey);
  }
  
  /**
   * Marquer une action comme traitée
   */
  private markAsProcessed(playerId: string, actionKey: string): void {
    let playerActions = this.recentActions.get(playerId);
    if (!playerActions) {
      playerActions = new Set();
      this.recentActions.set(playerId, playerActions);
    }
    
    playerActions.add(actionKey);
    
    // Auto-nettoyage après la fenêtre anti-spam
    setTimeout(() => {
      const actions = this.recentActions.get(playerId);
      if (actions) {
        actions.delete(actionKey);
        if (actions.size === 0) {
          this.recentActions.delete(playerId);
        }
      }
    }, this.SPAM_WINDOW);
  }
  
  /**
   * Log de debug conditionnel
   */
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [PokédxIntegration] ${message}`);
    }
  }
  
  // ===== CONFIGURATION =====
  
  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`⚙️ [PokédxIntegrationService] Configuration mise à jour`);
  }
  
  /**
   * Récupère la configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }
  
  /**
   * Active/désactive le service
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} [PokédxIntegrationService] Service ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  /**
   * Active/désactive le mode debug
   */
  setDebugMode(debug: boolean): void {
    this.config.debugMode = debug;
    console.log(`🔧 [PokédxIntegrationService] Debug ${debug ? 'activé' : 'désactivé'}`);
  }
  
  // ===== MONITORING & STATISTIQUES =====
  
  /**
   * Récupère les statistiques du service
   */
  getStats(): {
    totalProcessed: number;
    totalErrors: number;
    errorRate: number;
    uptime: number;
    cacheSize: number;
    isEnabled: boolean;
  } {
    const uptime = Date.now() - this.stats.lastReset;
    const errorRate = this.stats.totalProcessed > 0 ? 
      (this.stats.totalErrors / this.stats.totalProcessed) * 100 : 0;
    
    return {
      totalProcessed: this.stats.totalProcessed,
      totalErrors: this.stats.totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      uptime,
      cacheSize: this.recentActions.size,
      isEnabled: this.config.enabled
    };
  }
  
  /**
   * Remet à zéro les statistiques
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      lastReset: Date.now()
    };
    console.log('📊 [PokédxIntegrationService] Statistiques remises à zéro');
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  /**
   * Configuration du nettoyage automatique
   */
  private setupCleanup(): void {
    // Nettoyage du cache anti-spam toutes les 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    // Reset automatique des stats toutes les 24h
    setInterval(() => {
      this.resetStats();
    }, 24 * 60 * 60 * 1000);
  }
  
  /**
   * Nettoyage du cache
   */
  private cleanupCache(): void {
    // Nettoyage des caches vides
    for (const [playerId, actions] of this.recentActions.entries()) {
      if (actions.size === 0) {
        this.recentActions.delete(playerId);
      }
    }
    
    this.debugLog(`🧹 Cache nettoyé - ${this.recentActions.size} joueurs actifs`);
  }
  
  /**
   * Nettoyage manuel complet
   */
  clearCache(): void {
    this.recentActions.clear();
    console.log('🧹 [PokédxIntegrationService] Cache vidé manuellement');
  }
  
  /**
   * Health check du service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const stats = this.getStats();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!this.config.enabled) {
        status = 'unhealthy';
      } else if (stats.errorRate > 10) {
        status = 'degraded';
      }
      
      return {
        status,
        details: {
          enabled: this.config.enabled,
          errorRate: stats.errorRate,
          processed: stats.totalProcessed,
          cacheSize: stats.cacheSize,
          uptime: stats.uptime
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// ===== EXPORT SINGLETON =====
export const pokédxIntegrationService = PokédxIntegrationService.getInstance();
export default pokédxIntegrationService;

// ===== GUIDE D'UTILISATION RAPIDE =====
/*

// 1. RENCONTRE SAUVAGE (dans votre BattleService)
await pokédxIntegrationService.quickSeen({
  playerId: "player123",
  pokemonId: 25,
  level: 15,
  location: "Route 1",
  weather: "clear",
  method: "wild"
});

// 2. CAPTURE RÉUSSIE (dans votre CaptureService)
await pokédxIntegrationService.quickCaught({
  playerId: "player123",
  pokemonId: 25,
  level: 15,
  location: "Route 1",
  ownedPokemonId: "owned_poke_id",
  isShiny: false,
  method: "wild"
});

// 3. ÉVOLUTION (dans votre EvolutionService)
await pokédxIntegrationService.handleEvolution(
  "player123", 
  16, // Roucool
  17, // Roucoups
  "owned_poke_id",
  "Centre Pokémon"
);

// 4. HOOKS AUTOMATIQUES
// Dans OwnedPokemon.save():
await pokédxIntegrationService.onPokemonCreated(this, { location: "Route 1" });

*/
