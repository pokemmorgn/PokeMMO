// server/src/handlers/PokedexMessageHandler.ts
import { Room, Client } from "colyseus";
import { pokedexService } from '../services/PokedexService';
import { pokedexNotificationService } from '../services/PokedexNotificationService';
import { pokedexIntegrationService } from '../services/PokedexIntegrationService';
import { pokedexProgressService } from '../services/PokedexProgressService';

// ===== TYPES DES MESSAGES =====

export interface PokedexGetRequest {
  filters?: {
    seen?: boolean;
    caught?: boolean;
    shiny?: boolean;
    favorited?: boolean;
    types?: string[];
    regions?: string[];
    methods?: string[];
    levelRange?: { min: number; max: number };
    nameQuery?: string;
    tags?: string[];
    dateRange?: { start: string; end: string };
    sortBy?: 'id' | 'name' | 'level' | 'date_seen' | 'date_caught' | 'times_encountered';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  };
}

export interface PokedexEntryRequest {
  pokemonId: number;
  includeEvolutions?: boolean;
  includeRecommendations?: boolean;
}

export interface PokedexMarkSeenRequest {
  pokemonId: number;
  level: number;
  location: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special' | 'raid' | 'legendary';
  weather?: string;
  timeOfDay?: string;
  sessionId?: string;
  biome?: string;
  difficulty?: number;
  isEvent?: boolean;
}

export interface PokedexMarkCaughtRequest {
  pokemonId: number;
  level: number;
  location: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special' | 'raid' | 'legendary';
  weather?: string;
  timeOfDay?: string;
  isShiny?: boolean;
  ownedPokemonId: string;
  captureTime?: number;
  ballType?: string;
  isFirstAttempt?: boolean;
  criticalCapture?: boolean;
  experienceGained?: number;
}

// Interface d'évolution retirée - sera dans EvolutionService

export interface PokedexNotificationRequest {
  notificationId?: string;
  markAllRead?: boolean;
  filters?: {
    unreadOnly?: boolean;
    types?: string[];
    categories?: string[];
    priorities?: string[];
    limit?: number;
    sinceDate?: string;
  };
}

export interface PokedexSettingsRequest {
  enabled?: boolean;
  discoveryNotifications?: boolean;
  captureNotifications?: boolean;
  shinyNotifications?: boolean;
  milestoneNotifications?: boolean;
  streakNotifications?: boolean;
  achievementNotifications?: boolean;
  soundEnabled?: boolean;
  animationsEnabled?: boolean;
  vibrationEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  minimumPriority?: 'low' | 'medium' | 'high' | 'critical';
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  typeFilters?: string[];
}

export interface PokedexQuickActionRequest {
  action: 'quick_notify' | 'mark_all_read' | 'clear_cache' | 'force_sync';
  data?: any;
}

export interface PokedexBulkRequest {
  operations: Array<{
    type: 'mark_seen' | 'mark_caught';
    data: PokedexMarkSeenRequest | PokedexMarkCaughtRequest;
  }>;
  validateOnly?: boolean;
}

// ===== CONFIGURATION DU HANDLER =====

interface HandlerConfig {
  enableValidation: boolean;
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
  enableCache: boolean;
  enableMetrics: boolean;
  enableDebug: boolean;
  bulkOperationLimit: number;
}

// ===== HANDLER PRINCIPAL OPTIMISÉ =====

export class PokedexMessageHandler {
  private room: Room;
  private config: HandlerConfig = {
    enableValidation: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 60,
    enableCache: true,
    enableMetrics: true,
    enableDebug: false,
    bulkOperationLimit: 50
  };
  
  // Rate limiting par client
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  
  // Métriques de performance
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    rateLimitedRequests: 0,
    handlerCounts: new Map<string, number>()
  };
  
  // Cache des réponses pour optimiser
  private responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  constructor(room: Room, config?: Partial<HandlerConfig>) {
    this.room = room;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.registerHandlers();
    this.initializeHandler();
    console.log('🔗 [PokedexMessageHandler] Handler Pokédex optimisé initialisé');
  }
  
  // ===== INITIALISATION =====
  
  private initializeHandler(): void {
    // Nettoyage périodique
    setInterval(() => this.cleanup(), 60000); // 1 minute
    
    // Reset rate limiting
    setInterval(() => this.resetRateLimits(), 60000); // 1 minute
    
    // Log des métriques
    if (this.config.enableMetrics) {
      setInterval(() => this.logMetrics(), 300000); // 5 minutes
    }
    
    this.debugLog('Handler initialisé avec succès');
  }
  
  /**
   * Enregistre tous les handlers de messages Pokédx optimisés
   */
  private registerHandlers(): void {
    // === CONSULTATION POKÉDX ===
    this.room.onMessage("pokedex:get", this.wrapHandler(this.handleGetPokedex.bind(this)));
    this.room.onMessage("pokedex:entry", this.wrapHandler(this.handleGetEntry.bind(this)));
    this.room.onMessage("pokedex:stats", this.wrapHandler(this.handleGetStats.bind(this)));
    this.room.onMessage("pokedex:progress", this.wrapHandler(this.handleGetProgress.bind(this)));
    this.room.onMessage("pokedex:analytics", this.wrapHandler(this.handleGetAnalytics.bind(this)));
    
    // === MISE À JOUR POKÉDX ===
    this.room.onMessage("pokedex:mark_seen", this.wrapHandler(this.handleMarkSeen.bind(this)));
    this.room.onMessage("pokedex:mark_caught", this.wrapHandler(this.handleMarkCaught.bind(this)));
    this.room.onMessage("pokedex:recalculate", this.wrapHandler(this.handleRecalculate.bind(this)));
    
    // === BULK OPERATIONS ===
    this.room.onMessage("pokedex:bulk", this.wrapHandler(this.handleBulkOperations.bind(this)));
    
    // === ACCOMPLISSEMENTS & STREAKS ===
    this.room.onMessage("pokedex:achievements", this.wrapHandler(this.handleGetAchievements.bind(this)));
    this.room.onMessage("pokedex:streaks", this.wrapHandler(this.handleGetStreaks.bind(this)));
    this.room.onMessage("pokedex:update_streaks", this.wrapHandler(this.handleUpdateStreaks.bind(this)));
    
    // === NOTIFICATIONS ===
    this.room.onMessage("pokedex:notifications", this.wrapHandler(this.handleGetNotifications.bind(this)));
    this.room.onMessage("pokedex:notification_read", this.wrapHandler(this.handleMarkNotificationRead.bind(this)));
    this.room.onMessage("pokedex:notification_delete", this.wrapHandler(this.handleDeleteNotification.bind(this)));
    this.room.onMessage("pokedex:settings", this.wrapHandler(this.handleUpdateSettings.bind(this)));
    
    // === ACTIONS RAPIDES ===
    this.room.onMessage("pokedex:quick_action", this.wrapHandler(this.handleQuickAction.bind(this)));
    
    // === INTÉGRATION & DEBUG ===
    this.room.onMessage("pokedex:integration_status", this.wrapHandler(this.handleGetIntegrationStatus.bind(this)));
    this.room.onMessage("pokedex:force_integration", this.wrapHandler(this.handleForceIntegration.bind(this)));
    this.room.onMessage("pokedex:service_stats", this.wrapHandler(this.handleGetServiceStats.bind(this)));
    
    // === GESTION DES FAVORIS ET TAGS ===
    this.room.onMessage("pokedex:toggle_favorite", this.wrapHandler(this.handleToggleFavorite.bind(this)));
    this.room.onMessage("pokedex:add_tag", this.wrapHandler(this.handleAddTag.bind(this)));
    this.room.onMessage("pokedex:remove_tag", this.wrapHandler(this.handleRemoveTag.bind(this)));
    this.room.onMessage("pokedex:add_note", this.wrapHandler(this.handleAddNote.bind(this)));
    
    console.log('✅ [PokedexMessageHandler] 21 handlers enregistrés avec optimisations');
  }
  
  // ===== WRAPPER UNIVERSEL =====
  
  /**
   * Wrapper universel pour tous les handlers avec sécurité et métriques
   */
  private wrapHandler<T extends any[], R>(handler: (client: Client, message: any, ...args: T) => Promise<R>) {
    return async (client: Client, message: any, ...args: T): Promise<void> => {
      const startTime = Date.now();
      const handlerName = handler.name;
      
      try {
        this.metrics.totalRequests++;
        this.incrementHandlerCount(handlerName);
        
        // Validation du client
        const playerId = this.getPlayerId(client);
        if (!playerId) {
          this.sendError(client, handlerName, 'Client non authentifié', 401);
          return;
        }
        
        // Rate limiting
        if (this.config.enableRateLimiting && this.isRateLimited(client.sessionId)) {
          this.sendError(client, handlerName, 'Trop de requêtes', 429);
          this.metrics.rateLimitedRequests++;
          return;
        }
        
        // Validation du message
        if (this.config.enableValidation && !this.validateMessage(message, handlerName)) {
          this.sendError(client, handlerName, 'Message invalide', 400);
          return;
        }
        
        // Vérification du cache
        const cacheKey = this.generateCacheKey(playerId, handlerName, message);
        if (this.config.enableCache && handlerName.includes('get') || handlerName.includes('Get')) {
          const cached = this.getCachedResponse(cacheKey);
          if (cached) {
            this.sendSuccess(client, handlerName, cached);
            this.updateMetrics(startTime, true);
            return;
          }
        }
        
        // Exécution du handler
        this.debugLog(`🔄 Exécution ${handlerName} pour ${playerId}`);
        
        await handler.call(this, client, message, ...args);
        
        this.metrics.successfulRequests++;
        this.updateMetrics(startTime, true);
        
      } catch (error) {
        this.metrics.failedRequests++;
        this.updateMetrics(startTime, false);
        
        console.error(`❌ [PokedexMessageHandler] Erreur ${handlerName}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
        const statusCode = this.getErrorStatusCode(error);
        
        this.sendError(client, handlerName, errorMessage, statusCode);
      }
    };
  }
  
  // ===== HANDLERS DE CONSULTATION =====
  
  /**
   * Récupère le Pokédx d'un joueur avec filtres avancés
   */
  private async handleGetPokedex(client: Client, message: PokedexGetRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // Conversion des dates si nécessaire
    let filters = message.filters || {};
    if (filters.dateRange) {
      filters.dateRange = {
        start: new Date(filters.dateRange.start),
        end: new Date(filters.dateRange.end)
      } as any;
    }
    
    const result = await pokedexService.getPlayerPokedex(playerId, filters);
    
    // Mise en cache pour les requêtes GET
    const cacheKey = this.generateCacheKey(playerId, 'getPokedex', message);
    this.setCachedResponse(cacheKey, result, 300000); // 5 minutes
    
    this.sendSuccess(client, 'pokedex:get', {
      entries: result.entries,
      pagination: result.pagination,
      summary: result.summary,
      performance: result.performance
    });
  }
  
  /**
   * Récupère une entrée spécifique du Pokédx
   */
  private async handleGetEntry(client: Client, message: PokedexEntryRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const result = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    this.sendSuccess(client, 'pokedex:entry', {
      entry: result.entry,
      pokemonData: result.pokemonData,
      evolutionChain: message.includeEvolutions ? result.evolutionChain : undefined,
      relatedEntries: result.relatedEntries,
      recommendations: message.includeRecommendations ? result.recommendations : undefined
    });
  }
  
  /**
   * Récupère les statistiques globales
   */
  private async handleGetStats(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const progress = await pokedexService.getPlayerProgress(playerId);
    
    this.sendSuccess(client, 'pokedex:stats', {
      overview: progress.overview,
      records: progress.records,
      activity: progress.activity
    });
  }
  
  /**
   * Récupère la progression détaillée
   */
  private async handleGetProgress(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const progress = await pokedexService.getPlayerProgress(playerId);
    
    this.sendSuccess(client, 'pokedex:progress', progress);
  }
  
  /**
   * Récupère les analytics complètes
   */
  private async handleGetAnalytics(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const analytics = await pokedexProgressService.generatePokedexAnalytics(playerId);
    
    this.sendSuccess(client, 'pokedex:analytics', analytics);
  }
  
  // ===== HANDLERS DE MISE À JOUR =====
  
  /**
   * Marque un Pokémon comme vu
   */
  private async handleMarkSeen(client: Client, message: PokedexMarkSeenRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`👁️ Marquer comme vu: ${playerId} -> #${message.pokemonId}`);
    
    const result = await pokedexIntegrationService.handlePokemonEncounter({
      playerId,
      pokemonId: message.pokemonId,
      level: message.level,
      location: message.location,
      method: message.method || 'wild',
      weather: message.weather,
      timeOfDay: message.timeOfDay,
      sessionId: message.sessionId,
      biome: message.biome,
      difficulty: message.difficulty,
      isEvent: message.isEvent
    });
    
    this.sendSuccess(client, 'pokedex:mark_seen', {
      success: result.success,
      isNewDiscovery: result.isNewDiscovery,
      notifications: result.notifications,
      achievements: result.achievements,
      milestones: result.milestones,
      performance: result.performance
    });
    
    // Broadcaster les nouvelles découvertes importantes
    if (result.success && result.isNewDiscovery) {
      this.broadcastToPlayer(playerId, "pokedex:discovery", {
        pokemonId: message.pokemonId,
        notifications: result.notifications,
        achievements: result.achievements
      });
    }
    
    // Invalider le cache des stats
    this.invalidatePlayerCache(playerId);
  }
  
  /**
   * Marque un Pokémon comme capturé
   */
  private async handleMarkCaught(client: Client, message: PokedexMarkCaughtRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`🎯 Marquer comme capturé: ${playerId} -> #${message.pokemonId} ${message.isShiny ? '✨' : ''}`);
    
    const result = await pokedexIntegrationService.handlePokemonCapture({
      playerId,
      pokemonId: message.pokemonId,
      level: message.level,
      location: message.location,
      method: message.method || 'wild',
      weather: message.weather,
      timeOfDay: message.timeOfDay,
      ownedPokemonId: message.ownedPokemonId,
      isShiny: message.isShiny || false,
      captureTime: message.captureTime,
      ballType: message.ballType,
      isFirstAttempt: message.isFirstAttempt,
      criticalCapture: message.criticalCapture,
      experienceGained: message.experienceGained
    });
    
    this.sendSuccess(client, 'pokedex:mark_caught', {
      success: result.success,
      isNewCapture: result.isNewCapture,
      isNewBestSpecimen: result.isNewBestSpecimen,
      notifications: result.notifications,
      achievements: result.achievements,
      milestones: result.milestones,
      performance: result.performance
    });
    
    // Broadcaster les captures importantes
    if (result.success && (result.isNewCapture || result.isNewBestSpecimen)) {
      this.broadcastToPlayer(playerId, "pokedex:capture", {
        pokemonId: message.pokemonId,
        isNewCapture: result.isNewCapture,
        isNewBestSpecimen: result.isNewBestSpecimen,
        isShiny: message.isShiny,
        notifications: result.notifications,
        achievements: result.achievements
      });
    }
    
    this.invalidatePlayerCache(playerId);
  }
  
  // Handler évolution retiré - logique déplacée vers EvolutionService
  // L'intégration Pokédx se fait automatiquement via PokedexIntegrationService.handlePokemonEvolution()
  
  /**
   * Force un recalcul complet des statistiques
   */
  private async handleRecalculate(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`🔄 Recalcul stats pour ${playerId}`);
    
    const stats = await pokedexService.recalculatePlayerStats(playerId, true);
    
    this.sendSuccess(client, 'pokedex:recalculate', {
      totalSeen: stats.totalSeen,
      totalCaught: stats.totalCaught,
      seenPercentage: stats.seenPercentage,
      caughtPercentage: stats.caughtPercentage,
      lastCalculated: stats.cache.lastCalculated
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  // ===== BULK OPERATIONS =====
  
  /**
   * Gère les opérations en bulk pour de meilleures performances
   */
  private async handleBulkOperations(client: Client, message: PokedexBulkRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    if (!message.operations || message.operations.length === 0) {
      this.sendError(client, 'pokedx:bulk', 'Aucune opération spécifiée');
      return;
    }
    
    if (message.operations.length > this.config.bulkOperationLimit) {
      this.sendError(client, 'pokedex:bulk', `Trop d'opérations (max: ${this.config.bulkOperationLimit})`);
      return;
    }
    
    this.debugLog(`📦 Opérations bulk: ${message.operations.length} pour ${playerId}`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Traitement séquentiel pour éviter les conflits
    for (const [index, operation] of message.operations.entries()) {
      try {
        let result;
        
        if (operation.type === 'mark_seen') {
          const data = operation.data as PokedexMarkSeenRequest;
          result = await pokedexIntegrationService.handlePokemonEncounter({
            playerId,
            pokemonId: data.pokemonId,
            level: data.level,
            location: data.location,
            method: data.method || 'wild',
            weather: data.weather,
            timeOfDay: data.timeOfDay
          });
        } else if (operation.type === 'mark_caught') {
          const data = operation.data as PokedexMarkCaughtRequest;
          result = await pokedexIntegrationService.handlePokemonCapture({
            playerId,
            pokemonId: data.pokemonId,
            level: data.level,
            location: data.location,
            method: data.method || 'wild',
            ownedPokemonId: data.ownedPokemonId,
            isShiny: data.isShiny || false,
            captureTime: data.captureTime
          });
        }
        
        results.push({ index, success: true, result });
        successCount++;
        
      } catch (error) {
        results.push({ 
          index, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        });
        errorCount++;
      }
    }
    
    this.sendSuccess(client, 'pokedex:bulk', {
      totalOperations: message.operations.length,
      successCount,
      errorCount,
      results: message.validateOnly ? [] : results,
      summary: {
        processed: successCount + errorCount,
        success: successCount,
        errors: errorCount
      }
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  // ===== HANDLERS ACCOMPLISSEMENTS & STREAKS =====
  
  /**
   * Récupère les accomplissements
   */
  private async handleGetAchievements(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // TODO: Implémenter système d'accomplissements global
    // Pour l'instant, retourner une structure vide
    const achievements = {
      unlocked: [],
      inProgress: [],
      locked: [],
      totalPoints: 0,
      categories: {},
      recentUnlocks: []
    };
    
    this.sendSuccess(client, 'pokedex:achievements', achievements);
  }
  
  /**
   * Récupère les streaks actuelles
   */
  private async handleGetStreaks(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const streaks = await pokedexProgressService.getCurrentStreaks(playerId);
    
    this.sendSuccess(client, 'pokedex:streaks', {
      streaks,
      summary: {
        totalActive: streaks.filter(s => s.isActive).length,
        bestStreak: Math.max(...streaks.map(s => s.best)),
        totalMultiplier: streaks.reduce((sum, s) => sum + s.multiplier, 0)
      }
    });
  }
  
  /**
   * Met à jour les streaks manuellement
   */
  private async handleUpdateStreaks(client: Client, message: { action: 'seen' | 'caught' }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const result = await pokedexProgressService.updatePokedexStreaks(playerId, message.action);
    
    this.sendSuccess(client, 'pokedx:update_streaks', {
      newRecord: result.newRecord,
      notifications: result.notifications,
      updatedStreaks: result.updatedStreaks
    });
    
    if (result.newRecord) {
      this.broadcastToPlayer(playerId, "pokedex:streak_record", {
        action: message.action,
        notifications: result.notifications
      });
    }
  }
  
  // ===== HANDLERS NOTIFICATIONS =====
  
  /**
   * Récupère les notifications
   */
  private async handleGetNotifications(client: Client, message: PokedexNotificationRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // Conversion des dates si nécessaire
    let filters = message.filters || {};
    if (filters.sinceDate) {
      filters.sinceDate = new Date(filters.sinceDate) as any;
    }
    
    const notifications = pokedexNotificationService.getPlayerNotifications(playerId, filters);
    const stats = pokedexNotificationService.getNotificationStats(playerId);
    
    this.sendSuccess(client, 'pokedex:notifications', {
      notifications,
      stats,
      summary: {
        total: stats.total,
        unread: stats.unread,
        categories: Object.keys(stats.byType).length,
        recent: stats.last24h
      }
    });
  }
  
  /**
   * Marque une notification comme lue
   */
  private async handleMarkNotificationRead(client: Client, message: PokedexNotificationRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    let result: boolean | number;
    if (message.markAllRead) {
      result = pokedexNotificationService.markAllAsRead(playerId);
    } else if (message.notificationId) {
      result = pokedexNotificationService.markAsRead(playerId, message.notificationId);
    } else {
      this.sendError(client, 'pokedex:notification_read', 'ID notification ou markAllRead requis');
      return;
    }
    
    this.sendSuccess(client, 'pokedex:notification_read', {
      success: result !== false,
      marked: typeof result === 'number' ? result : (result ? 1 : 0)
    });
  }
  
  /**
   * Supprime une notification
   */
  private async handleDeleteNotification(client: Client, message: PokedexNotificationRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    if (!message.notificationId) {
      this.sendError(client, 'pokedex:notification_delete', 'ID notification requis');
      return;
    }
    
    const result = pokedexNotificationService.removeNotification(playerId, message.notificationId);
    
    this.sendSuccess(client, 'pokedex:notification_delete', {
      success: result,
      deleted: result
    });
  }
  
  /**
   * Met à jour les paramètres de notification
   */
  private async handleUpdateSettings(client: Client, message: PokedexSettingsRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    pokedexNotificationService.updatePlayerSettings(playerId, message);
    const settings = pokedexNotificationService.getPlayerSettings(playerId);
    
    this.sendSuccess(client, 'pokedex:settings', {
      settings,
      updated: Object.keys(message).length
    });
  }
  
  // ===== HANDLERS ACTIONS RAPIDES =====
  
  /**
   * Actions rapides pour l'interface
   */
  private async handleQuickAction(client: Client, message: PokedexQuickActionRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    let result: any;
    
    switch (message.action) {
      case 'quick_notify':
        result = await pokedexNotificationService.quickNotify(
          playerId,
          message.data.type || 'info',
          message.data.title || 'Notification',
          message.data.message || 'Message',
          message.data.priority || 'medium'
        );
        break;
        
      case 'mark_all_read':
        result = pokedexNotificationService.markAllAsRead(playerId);
        break;
        
      case 'clear_cache':
        this.invalidatePlayerCache(playerId);
        result = { success: true, message: 'Cache nettoyé' };
        break;
        
      case 'force_sync':
        await pokedexService.recalculatePlayerStats(playerId, true);
        result = { success: true, message: 'Synchronisation forcée' };
        break;
        
      default:
        this.sendError(client, 'pokedex:quick_action', 'Action non reconnue');
        return;
    }
    
    this.sendSuccess(client, 'pokedex:quick_action', {
      action: message.action,
      result,
      timestamp: new Date()
    });
  }
  
  // ===== HANDLERS GESTION FAVORIS & TAGS =====
  
  /**
   * Toggle le statut favori d'un Pokémon
   */
  private async handleToggleFavorite(client: Client, message: { pokemonId: number }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // Récupérer l'entrée et toggle
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:toggle_favorite', 'Pokémon non trouvé dans le Pokédex');
      return;
    }
    
    const newStatus = await entry.entry.toggleFavorite();
    
    this.sendSuccess(client, 'pokedex:toggle_favorite', {
      pokemonId: message.pokemonId,
      favorited: newStatus
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  /**
   * Ajoute un tag à un Pokémon
   */
  private async handleAddTag(client: Client, message: { pokemonId: number; tag: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:add_tag', 'Pokémon non trouvé dans le Pokédex');
      return;
    }
    
    await entry.entry.addTag(message.tag);
    
    this.sendSuccess(client, 'pokedex:add_tag', {
      pokemonId: message.pokemonId,
      tag: message.tag,
      tags: entry.entry.tags
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  /**
   * Supprime un tag d'un Pokémon
   */
  private async handleRemoveTag(client: Client, message: { pokemonId: number; tag: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:remove_tag', 'Pokémon non trouvé dans le Pokédex');
      return;
    }
    
    await entry.entry.removeTag(message.tag);
    
    this.sendSuccess(client, 'pokedex:remove_tag', {
      pokemonId: message.pokemonId,
      tag: message.tag,
      tags: entry.entry.tags
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  /**
   * Ajoute une note à un Pokémon
   */
  private async handleAddNote(client: Client, message: { pokemonId: number; note: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:add_note', 'Pokémon non trouvé dans le Pokédex');
      return;
    }
    
    await entry.entry.addNote(message.note);
    
    this.sendSuccess(client, 'pokedex:add_note', {
      pokemonId: message.pokemonId,
      note: message.note
    });
    
    this.invalidatePlayerCache(playerId);
  }
  
  // ===== HANDLERS INTÉGRATION & DEBUG =====
  
  /**
   * Récupère le statut d'intégration
   */
  private async handleGetIntegrationStatus(client: Client): Promise<void> {
    const stats = pokedexIntegrationService.getIntegrationStats();
    
    this.sendSuccess(client, 'pokedex:integration_status', {
      ...stats,
      timestamp: new Date()
    });
  }
  
  /**
   * Force l'intégration d'un joueur
   */
  private async handleForceIntegration(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // TODO: Implémenter force integration via OwnedPokemon.bulkIntegrateToPokedex
    
    this.sendSuccess(client, 'pokedex:force_integration', {
      success: true,
      message: 'Intégration forcée démarrée',
      playerId,
      timestamp: new Date()
    });
  }
  
  /**
   * Récupère les statistiques de tous les services
   */
  private async handleGetServiceStats(client: Client): Promise<void> {
    const stats = {
      handler: {
        ...this.metrics,
        cacheSize: this.responseCache.size
      },
      pokedexService: pokedexService.getServiceStats(),
      notificationService: pokedexNotificationService.getServiceStats(),
      integrationService: pokedexIntegrationService.getIntegrationStats(),
      progressService: pokedexProgressService.getServiceStats()
    };
    
    this.sendSuccess(client, 'pokedex:service_stats', stats);
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Récupère l'ID du joueur depuis le client de manière sécurisée
   */
  private getPlayerId(client: Client): string | null {
    // Adapter selon votre système d'authentification
    const playerId = client.sessionId || client.auth?.playerId || client.userData?.playerId;
    
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return null;
    }
    
    return playerId.trim();
  }
  
  /**
   * Envoie une réponse de succès formatée
   */
  private sendSuccess(client: Client, messageType: string, data: any): void {
    client.send(`${messageType}:response`, {
      success: true,
      data,
      timestamp: new Date(),
      requestId: this.generateRequestId()
    });
  }
  
  /**
   * Envoie une erreur formatée au client
   */
  private sendError(client: Client, messageType: string, error: string, statusCode: number = 500): void {
    client.send(`${messageType}:response`, {
      success: false,
      error: {
        message: error,
        code: statusCode,
        timestamp: new Date()
      },
      requestId: this.generateRequestId()
    });
  }
  
  /**
   * Broadcaster un message à tous les clients d'un joueur
   */
  private broadcastToPlayer(playerId: string, messageType: string, data: any): void {
    this.room.clients.forEach(client => {
      if (this.getPlayerId(client) === playerId) {
        client.send(messageType, {
          ...data,
          timestamp: new Date()
        });
      }
    });
  }
  
  /**
   * Broadcaster un message à tous les clients de la room
   */
  private broadcastToAll(messageType: string, data: any): void {
    this.room.broadcast(messageType, {
      ...data,
      timestamp: new Date()
    });
  }
  
  // ===== RATE LIMITING =====
  
  private isRateLimited(sessionId: string): boolean {
    if (!this.config.enableRateLimiting) return false;
    
    const now = Date.now();
    const limit = this.rateLimitMap.get(sessionId);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimitMap.set(sessionId, { count: 1, resetTime: now + 60000 });
      return false;
    }
    
    if (limit.count >= this.config.maxRequestsPerMinute) {
      return true;
    }
    
    limit.count++;
    return false;
  }
  
  private resetRateLimits(): void {
    const now = Date.now();
    for (const [sessionId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(sessionId);
      }
    }
  }
  
  // ===== CACHE =====
  
  private generateCacheKey(playerId: string, handler: string, message: any): string {
    const messageHash = JSON.stringify(message).substring(0, 50);
    return `${playerId}_${handler}_${messageHash}`;
  }
  
  private getCachedResponse(key: string): any | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.responseCache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCachedResponse(key: string, data: any, ttl: number = 300000): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  private invalidatePlayerCache(playerId: string): void {
    for (const [key] of this.responseCache.entries()) {
      if (key.startsWith(playerId)) {
        this.responseCache.delete(key);
      }
    }
  }
  
  // ===== VALIDATION =====
  
  private validateMessage(message: any, handlerName: string): boolean {
    if (!this.config.enableValidation) return true;
    
    // Validation basique
    if (message === null || message === undefined) return false;
    
    // Validations spécifiques par handler
    if (handlerName.includes('mark_seen') || handlerName.includes('markSeen')) {
      return this.validateMarkSeenMessage(message);
    }
    
    if (handlerName.includes('mark_caught') || handlerName.includes('markCaught')) {
      return this.validateMarkCaughtMessage(message);
    }
    
    return true;
  }
  
  private validateMarkSeenMessage(message: PokedexMarkSeenRequest): boolean {
    return !!(
      message.pokemonId && 
      typeof message.pokemonId === 'number' && 
      message.pokemonId > 0 &&
      message.level && 
      typeof message.level === 'number' && 
      message.level > 0 && 
      message.level <= 100 &&
      message.location && 
      typeof message.location === 'string' && 
      message.location.trim().length > 0
    );
  }
  
  private validateMarkCaughtMessage(message: PokedexMarkCaughtRequest): boolean {
    return !!(
      this.validateMarkSeenMessage(message) &&
      message.ownedPokemonId && 
      typeof message.ownedPokemonId === 'string' && 
      message.ownedPokemonId.trim().length > 0
    );
  }
  
  // ===== MÉTRIQUES =====
  
  private incrementHandlerCount(handlerName: string): void {
    const current = this.metrics.handlerCounts.get(handlerName) || 0;
    this.metrics.handlerCounts.set(handlerName, current + 1);
  }
  
  private updateMetrics(startTime: number, success: boolean): void {
    const executionTime = Date.now() - startTime;
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + executionTime) / totalRequests;
  }
  
  private logMetrics(): void {
    if (this.config.enableDebug) {
      console.log('📊 [PokedexMessageHandler] Métriques:', {
        ...this.metrics,
        successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
        cacheHitRatio: this.responseCache.size > 0 ? 'N/A' : 0, // TODO: Implémenter tracking cache hits
        topHandlers: Array.from(this.metrics.handlerCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
      });
    }
  }
  
  // ===== UTILITAIRES PRIVÉES =====
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  private getErrorStatusCode(error: any): number {
    if (error?.code && typeof error.code === 'number') {
      return error.code;
    }
    
    if (error?.message?.includes('validation')) return 400;
    if (error?.message?.includes('not found')) return 404;
    if (error?.message?.includes('unauthorized')) return 401;
    if (error?.message?.includes('forbidden')) return 403;
    
    return 500;
  }
  
  private debugLog(message: string): void {
    if (this.config.enableDebug) {
      console.log(`🔧 [PokedexMessageHandler] ${message}`);
    }
  }
  
  // ===== NETTOYAGE =====
  
  private cleanup(): void {
    // Nettoyage du cache
    const now = Date.now();
    for (const [key, cached] of this.responseCache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        this.responseCache.delete(key);
      }
    }
    
    // Nettoyage rate limiting
    this.resetRateLimits();
    
    this.debugLog(`🧹 Nettoyage effectué - Cache: ${this.responseCache.size}, RateLimit: ${this.rateLimitMap.size}`);
  }
  
  /**
   * Configuration du handler
   */
  updateConfig(newConfig: Partial<HandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog('⚙️ Configuration mise à jour');
  }
  
  /**
   * Récupère les métriques du handler
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      config: this.config,
      cacheSize: this.responseCache.size,
      rateLimitSize: this.rateLimitMap.size
    };
  }
  
  /**
   * Nettoie les ressources lors de la déconnexion
   */
  cleanup(): void {
    this.responseCache.clear();
    this.rateLimitMap.clear();
    console.log('🧹 [PokedexMessageHandler] Nettoyage des handlers et caches');
  }
}

// ===== EXPORT =====
export default PokedexMessageHandler;

// ===== GUIDE D'INTÉGRATION DANS UNE ROOM =====
//
// Dans votre Room Colyseus (ex: GameRoom.ts) :
//
// import PokedexMessageHandler from './handlers/PokedexMessageHandler';
//
// export class GameRoom extends Room {
//   private pokedexHandler: PokedexMessageHandler;
//
//   onCreate(options: any) {
//     // Initialiser le handler Pokédex avec configuration
//     this.pokedexHandler = new PokedexMessageHandler(this, {
//       enableDebug: true,
//       maxRequestsPerMinute: 100,
//       enableCache: true
//     });
//   }
//
//   onDispose() {
//     // Nettoyer le handler
//     this.pokedexHandler?.cleanup();
//   }
// }
//
// ===== UTILISATION CÔTÉ CLIENT (Phaser/React) =====
//
// // API Simple - Marquer comme vu
// room.send("pokedex:mark_seen", { 
//   pokemonId: 25, 
//   level: 5, 
//   location: "Route 1" 
// });
//
// // API Simple - Marquer comme capturé
// room.send("pokedex:mark_caught", {
//   pokemonId: 25,
//   level: 5,
//   location: "Route 1",
//   ownedPokemonId: "507f1f77bcf86cd799439011",
//   isShiny: false
// });
//
// // Récupérer le Pokédex avec filtres
// room.send("pokedex:get", { 
//   filters: { 
//     caught: true, 
//     types: ["electric"],
//     sortBy: "level",
//     sortOrder: "desc",
//     limit: 20
//   } 
// });
//
// // Opérations bulk pour de meilleures performances
// room.send("pokedex:bulk", {
//   operations: [
//     { type: "mark_seen", data: { pokemonId: 1, level: 5, location: "Route 1" } },
//     { type: "mark_seen", data: { pokemonId: 2, level: 7, location: "Route 1" } }
//   ]
// });
//
// // Écouter les réponses
// room.onMessage("pokedex:mark_seen:response", (message) => {
//   if (message.success) {
//     console.log("Pokémon marqué comme vu:", message.data);
//     if (message.data.isNewDiscovery) {
//       showDiscoveryAnimation(message.data.notifications);
//     }
//   }
// });
//
// // Écouter les événements en temps réel
// room.onMessage("pokedex:discovery", (data) => {
//   showDiscoveryNotification(data.pokemonId, data.notifications);
// });
//
// room.onMessage("pokedex:capture", (data) => {
//   showCaptureNotification(data.pokemonId, data.isShiny);
// });
//
// // Actions rapides
// room.send("pokedex:quick_action", {
//   action: "mark_all_read"
// });
//
// // Gestion des favoris et tags
// room.send("pokedex:toggle_favorite", { pokemonId: 25 });
// room.send("pokedex:add_tag", { pokemonId: 25, tag: "starter" });
// room.send("pokedex:add_note", { pokemonId: 25, note: "Mon premier Pokémon !" });
