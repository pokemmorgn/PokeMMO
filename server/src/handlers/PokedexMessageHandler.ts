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
    enableDebug: true, // ✅ Gardé à true pour les logs de debug
    bulkOperationLimit: 50
  };
  
  // Rate limiting par playerId (plus sécurisé)
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
    console.log('🔗 [PokedexMessageHandler] Handler Pokédx optimisé et sécurisé initialisé');
  }
  
  // ===== INITIALISATION =====
  
  private initializeHandler(): void {
    // Nettoyage périodique
    setInterval(() => this.cleanupCaches(), 60000); // 1 minute
    
    // Reset rate limiting
    setInterval(() => this.resetRateLimits(), 60000); // 1 minute
    
    // Log des métriques
    if (this.config.enableMetrics) {
      setInterval(() => this.logMetrics(), 300000); // 5 minutes
    }
    
    this.debugLog('Handler initialisé avec succès');
  }
  
  /**
   * Enregistre tous les handlers de messages Pokédex optimisés
   */
  private registerHandlers(): void {
    // === CONSULTATION POKÉDEX ===
    this.room.onMessage("pokedex:get", this.wrapHandler(this.handleGetPokedex.bind(this)));
    this.room.onMessage("pokedex:entry", this.wrapHandler(this.handleGetEntry.bind(this)));
    this.room.onMessage("pokedex:stats", this.wrapHandler(this.handleGetStats.bind(this)));
    this.room.onMessage("pokedex:progress", this.wrapHandler(this.handleGetProgress.bind(this)));
    this.room.onMessage("pokedex:analytics", this.wrapHandler(this.handleGetAnalytics.bind(this)));
    
    // === MISE À JOUR POKÉDEX ===
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
    
    console.log('✅ [PokedexMessageHandler] 21 handlers enregistrés avec optimisations et sécurité');
  }
  
  // ===== SÉCURITÉ =====
  
  /**
   * 🔒 Récupère l'ID du joueur de manière SÉCURISÉE depuis le state de la room
   */
  private getPlayerId(client: Client): string | null {
    console.log('🔍 [POKÉDEX DEBUG] Recherche playerId pour session:', client.sessionId);
    console.log('🔍 [POKÉDX DEBUG] Total players dans room:', this.room.state.players.size);
    console.log('🔍 [POKÉDX DEBUG] Sessions dans room:', Array.from(this.room.state.players.keys()));
    
    // ✅ SÉCURISÉ: client.sessionId est géré par Colyseus, impossible à falsifier
    const player = this.room.state.players.get(client.sessionId);
    
    if (!player) {
      console.log('❌ [POKÉDX DEBUG] Aucun player trouvé pour session:', client.sessionId);
      return null;
    }
    
    if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
      console.log('❌ [POKÉDX DEBUG] Player trouvé mais nom invalide:', {
        hasName: !!player.name,
        nameType: typeof player.name,
        nameLength: player.name?.length
      });
      return null;
    }
    
    console.log('✅ [POKÉDX DEBUG] PlayerId trouvé depuis room state:', player.name);
    return player.name.trim();
  }
  
  /**
   * 🔒 Validation de sécurité renforcée pour toutes les requêtes
   */
  private validateSecureAccess(client: Client, operation: string): { valid: boolean; playerId?: string; reason?: string } {
    console.log('🔒 [POKÉDX SECURITY] Validation accès pour opération:', operation);
    
    // Vérifier que le client est dans la room
    if (!this.room.clients.includes(client)) {
      console.warn('🚨 [POKÉDX SECURITY] Client non autorisé tente:', operation);
      return { valid: false, reason: 'Client non autorisé dans cette room' };
    }
    
    // Récupérer l'ID du joueur de manière sécurisée
    const playerId = this.getPlayerId(client);
    if (!playerId) {
      console.warn('🚨 [POKÉDX SECURITY] Tentative d\'accès sans identification:', operation);
      return { valid: false, reason: 'Identification requise' };
    }
    
    // Vérifier que la session est active
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.warn('🚨 [POKÉDX SECURITY] Session expirée ou invalide:', client.sessionId);
      return { valid: false, reason: 'Session invalide' };
    }
    
    console.log('✅ [POKÉDX SECURITY] Accès validé pour', playerId, 'opération:', operation);
    return { valid: true, playerId };
  }
  
  // ===== WRAPPER UNIVERSEL SÉCURISÉ =====
  
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
        
        console.log(`🎯 [POKÉDX] Requête ${handlerName} de session:`, client.sessionId);
        
        // ✅ VALIDATION SÉCURISÉE RENFORCÉE
        const securityCheck = this.validateSecureAccess(client, handlerName);
        if (!securityCheck.valid) {
          console.log(`❌ [POKÉDX] Sécurité échouée pour ${handlerName}:`, securityCheck.reason);
          this.sendError(client, handlerName, securityCheck.reason || 'Accès refusé', 403);
          this.metrics.failedRequests++;
          return;
        }
        
        const playerId = securityCheck.playerId!;
        console.log(`✅ [POKÉDX] Sécurité validée pour ${handlerName}, playerId:`, playerId);
        
        // Rate limiting par playerId (plus sécurisé que sessionId)
        if (this.config.enableRateLimiting && this.isRateLimited(playerId)) {
          this.sendError(client, handlerName, 'Trop de requêtes', 429);
          this.metrics.rateLimitedRequests++;
          return;
        }
        
        // Validation du message
        if (this.config.enableValidation && !this.validateMessage(message, handlerName)) {
          this.sendError(client, handlerName, 'Message invalide', 400);
          return;
        }
        
        // Vérification du cache avec playerId sécurisé
        const cacheKey = this.generateCacheKey(playerId, handlerName, message);
        if (this.config.enableCache && (handlerName.includes('get') || handlerName.includes('Get'))) {
          const cached = this.getCachedResponse(cacheKey);
          if (cached) {
            console.log(`💨 [POKÉDX] Cache hit pour ${handlerName}, playerId:`, playerId);
            this.sendSuccess(client, handlerName, cached);
            this.updateMetrics(startTime, true);
            return;
          }
        }
        
        // ✅ SÉCURISÉ: Exécution avec playerId validé
        console.log(`🔄 [POKÉDX] Exécution sécurisée ${handlerName} pour ${playerId}`);
        
        await handler.call(this, client, message, ...args);
        
        this.metrics.successfulRequests++;
        this.updateMetrics(startTime, true);
        console.log(`✅ [POKÉDX] ${handlerName} réussi pour ${playerId}`);
        
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
    
    console.log(`📋 [POKÉDX] Récupération Pokédx pour:`, playerId);
    
    // Conversion des dates si nécessaire
    const serviceFilters: any = message.filters || {};
    if (message.filters?.dateRange) {
      serviceFilters.dateRange = {
        start: new Date(message.filters.dateRange.start),
        end: new Date(message.filters.dateRange.end)
      };
    }
    
    const result = await pokedexService.getPlayerPokedex(playerId, serviceFilters);
    
    // Mise en cache pour les requêtes GET
    const cacheKey = this.generateCacheKey(playerId, 'getPokedex', message);
    this.setCachedResponse(cacheKey, result, 300000); // 5 minutes
    
    // 🆕 NOUVELLE STRUCTURE DE RÉPONSE AVEC POKÉMON DISPONIBLES
    this.sendSuccess(client, 'pokedex:get', {
      // Données des entrées du joueur
      entries: result.entries,
      pagination: result.pagination,
      
      // 🆕 LISTE DES POKÉMON DISPONIBLES SUR LE SERVEUR
      availablePokemon: result.availablePokemon,
      
      // 🆕 RÉSUMÉ CORRIGÉ BASÉ SUR LES POKÉMON DISPONIBLES
      summary: {
        totalAvailable: result.summary.totalAvailable,           // Nombre total sur le serveur
        totalSeen: result.summary.seen.count,                    // Nombre vu par le joueur
        totalCaught: result.summary.caught.count,                // Nombre capturé par le joueur
        seenPercentage: result.summary.seen.percentage,          // % basé sur disponibles
        caughtPercentage: result.summary.caught.percentage,      // % basé sur disponibles
        
        // Détails supplémentaires
        remaining: {
          toSee: result.summary.seen.remaining,
          toCatch: result.summary.caught.remaining
        },
        shinies: result.summary.shinies,
        records: result.summary.records,
        completion: result.summary.completion
      },
      
      // Métadonnées
      performance: result.performance,
      timestamp: new Date(),
      basedOnAvailablePokemon: result.summary.basedOnAvailablePokemon || true
    });
    
    console.log(`✅ [POKÉDX] Pokédx envoyé à ${playerId}: ${result.entries.length} entrées`);
  }
  
  /**
   * Récupère une entrée spécifique du Pokédx
   */
  private async handleGetEntry(client: Client, message: PokedexEntryRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📄 [POKÉDX] Récupération entrée #${message.pokemonId} pour:`, playerId);
    
    const result = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    this.sendSuccess(client, 'pokedex:entry', {
      entry: result.entry,
      pokemonData: result.pokemonData,
      evolutionChain: message.includeEvolutions ? result.evolutionChain : undefined,
      relatedEntries: result.relatedEntries,
      recommendations: message.includeRecommendations ? result.recommendations : undefined
    });
    
    console.log(`✅ [POKÉDX] Entrée #${message.pokemonId} envoyée à ${playerId}`);
  }
  
  /**
   * Récupère les statistiques globales
   */
  private async handleGetStats(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📊 [POKÉDX] Récupération stats pour:`, playerId);
    
    const progress = await pokedexService.getPlayerProgress(playerId);
    
    this.sendSuccess(client, 'pokedex:stats', {
      overview: progress.overview,
      records: progress.records,
      activity: progress.activity
    });
    
    console.log(`✅ [POKÉDX] Stats envoyées à ${playerId}`);
  }
  
  /**
   * Récupère la progression détaillée
   */
  private async handleGetProgress(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📈 [POKÉDX] Récupération progression pour:`, playerId);
    
    const progress = await pokedexService.getPlayerProgress(playerId);
    
    this.sendSuccess(client, 'pokedex:progress', progress);
    
    console.log(`✅ [POKÉDX] Progression envoyée à ${playerId}`);
  }
  
  /**
   * Récupère les analytics complètes
   */
  private async handleGetAnalytics(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📊 [POKÉDX] Récupération analytics pour:`, playerId);
    
    const analytics = await pokedexProgressService.generatePokedexAnalytics(playerId);
    
    this.sendSuccess(client, 'pokedex:analytics', analytics);
    
    console.log(`✅ [POKÉDX] Analytics envoyées à ${playerId}`);
  }
  
  // ===== HANDLERS DE MISE À JOUR =====
  
  /**
   * Marque un Pokémon comme vu
   */
  private async handleMarkSeen(client: Client, message: PokedexMarkSeenRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`👁️ [POKÉDX] Marquer comme vu: ${playerId} -> #${message.pokemonId}`);
    
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
      console.log(`🎉 [POKÉDX] Nouvelle découverte #${message.pokemonId} pour ${playerId}!`);
    }
    
    // Invalider le cache des stats
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Marquer vu réussi pour ${playerId} -> #${message.pokemonId}`);
  }
  
  /**
   * Marque un Pokémon comme capturé
   */
  private async handleMarkCaught(client: Client, message: PokedexMarkCaughtRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🎯 [POKÉDX] Marquer comme capturé: ${playerId} -> #${message.pokemonId} ${message.isShiny ? '✨' : ''}`);
    
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
      console.log(`🎉 [POKÉDX] Nouvelle capture #${message.pokemonId} pour ${playerId}!`);
    }
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Marquer capturé réussi pour ${playerId} -> #${message.pokemonId}`);
  }
  
  /**
   * Force un recalcul complet des statistiques
   */
  private async handleRecalculate(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🔄 [POKÉDX] Recalcul stats pour ${playerId}`);
    
    const stats = await pokedexService.recalculatePlayerStats(playerId, true);
    
    this.sendSuccess(client, 'pokedex:recalculate', {
      totalSeen: stats.totalSeen,
      totalCaught: stats.totalCaught,
      seenPercentage: stats.seenPercentage,
      caughtPercentage: stats.caughtPercentage,
      lastCalculated: stats.cache.lastCalculated
    });
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Recalcul terminé pour ${playerId}`);
  }
  
  // ===== BULK OPERATIONS =====
  
  /**
   * Gère les opérations en bulk pour de meilleures performances
   */
  private async handleBulkOperations(client: Client, message: PokedexBulkRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    if (!message.operations || message.operations.length === 0) {
      this.sendError(client, 'pokedex:bulk', 'Aucune opération spécifiée');
      return;
    }
    
    if (message.operations.length > this.config.bulkOperationLimit) {
      this.sendError(client, 'pokedex:bulk', `Trop d'opérations (max: ${this.config.bulkOperationLimit})`);
      return;
    }
    
    console.log(`📦 [POKÉDX] Opérations bulk: ${message.operations.length} pour ${playerId}`);
    
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
    
    console.log(`✅ [POKÉDX] Bulk terminé pour ${playerId}: ${successCount}/${message.operations.length} réussis`);
  }
  
  // ===== HANDLERS ACCOMPLISSEMENTS & STREAKS =====
  
  /**
   * Récupère les accomplissements
   */
  private async handleGetAchievements(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🏆 [POKÉDX] Récupération accomplissements pour:`, playerId);
    
    // TODO: Implémenter système d'accomplissements global
    // Pour l'instant, retourner une structure vide typée
    const achievements: {
      unlocked: any[];
      inProgress: any[];
      locked: any[];
      totalPoints: number;
      categories: any;
      recentUnlocks: any[];
    } = {
      unlocked: [],
      inProgress: [],
      locked: [],
      totalPoints: 0,
      categories: {},
      recentUnlocks: []
    };
    
    this.sendSuccess(client, 'pokedex:achievements', achievements);
    
    console.log(`✅ [POKÉDX] Accomplissements envoyés à ${playerId}`);
  }
  
  /**
   * Récupère les streaks actuelles
   */
  private async handleGetStreaks(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🔥 [POKÉDX] Récupération streaks pour:`, playerId);
    
    const streaks = await pokedexProgressService.getCurrentStreaks(playerId);
    
    this.sendSuccess(client, 'pokedex:streaks', {
      streaks,
      summary: {
        totalActive: streaks.filter(s => s.isActive).length,
        bestStreak: Math.max(...streaks.map(s => s.best)),
        totalMultiplier: streaks.reduce((sum, s) => sum + s.multiplier, 0)
      }
    });
    
    console.log(`✅ [POKÉDX] Streaks envoyés à ${playerId}: ${streaks.length} streaks`);
  }
  
  /**
   * Met à jour les streaks manuellement
   */
  private async handleUpdateStreaks(client: Client, message: { action: 'seen' | 'caught' }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🔥 [POKÉDX] Update streaks ${message.action} pour:`, playerId);
    
    const result = await pokedexProgressService.updatePokedexStreaks(playerId, message.action);
    
    this.sendSuccess(client, 'pokedex:update_streaks', {
      newRecord: result.newRecord,
      notifications: result.notifications,
      updatedStreaks: result.updatedStreaks
    });
    
    if (result.newRecord) {
      this.broadcastToPlayer(playerId, "pokedex:streak_record", {
        action: message.action,
        notifications: result.notifications
      });
      console.log(`🎉 [POKÉDX] Nouveau record streak ${message.action} pour ${playerId}!`);
    }
    
    console.log(`✅ [POKÉDX] Streaks mis à jour pour ${playerId}`);
  }
  
  // ===== HANDLERS NOTIFICATIONS =====
  
  /**
   * Récupère les notifications
   */
  private async handleGetNotifications(client: Client, message: PokedexNotificationRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🔔 [POKÉDX] Récupération notifications pour:`, playerId);
    
    // Conversion des dates si nécessaire
    const serviceFilters: any = message.filters || {};
    if (message.filters?.sinceDate) {
      serviceFilters.sinceDate = new Date(message.filters.sinceDate);
    }
    
    const notifications = pokedexNotificationService.getPlayerNotifications(playerId, serviceFilters);
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
    
    console.log(`✅ [POKÉDX] Notifications envoyées à ${playerId}: ${notifications.length} notifications`);
  }
  
  /**
   * Marque une notification comme lue
   */
  private async handleMarkNotificationRead(client: Client, message: PokedexNotificationRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📖 [POKÉDX] Marquer notification lue pour:`, playerId);
    
    let result: boolean | number;
    if (message.markAllRead) {
      result = pokedexNotificationService.markAllAsRead(playerId);
      console.log(`📖 [POKÉDX] Marquer toutes comme lues pour ${playerId}: ${result} notifications`);
    } else if (message.notificationId) {
      result = pokedexNotificationService.markAsRead(playerId, message.notificationId);
      console.log(`📖 [POKÉDX] Marquer ${message.notificationId} comme lue pour ${playerId}: ${result}`);
    } else {
      this.sendError(client, 'pokedex:notification_read', 'ID notification ou markAllRead requis');
      return;
    }
    
    this.sendSuccess(client, 'pokedex:notification_read', {
      success: result !== false,
      marked: typeof result === 'number' ? result : (result ? 1 : 0)
    });
    
    console.log(`✅ [POKÉDX] Notification(s) marquée(s) comme lue(s) pour ${playerId}`);
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
    
    console.log(`🗑️ [POKÉDX] Supprimer notification ${message.notificationId} pour:`, playerId);
    
    const result = pokedexNotificationService.removeNotification(playerId, message.notificationId);
    
    this.sendSuccess(client, 'pokedex:notification_delete', {
      success: result,
      deleted: result
    });
    
    console.log(`✅ [POKÉDX] Notification supprimée pour ${playerId}: ${result}`);
  }
  
  /**
   * Met à jour les paramètres de notification
   */
  private async handleUpdateSettings(client: Client, message: PokedexSettingsRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`⚙️ [POKÉDX] Update settings pour:`, playerId, 'changements:', Object.keys(message));
    
    pokedexNotificationService.updatePlayerSettings(playerId, message);
    const settings = pokedexNotificationService.getPlayerSettings(playerId);
    
    this.sendSuccess(client, 'pokedex:settings', {
      settings,
      updated: Object.keys(message).length
    });
    
    console.log(`✅ [POKÉDX] Settings mis à jour pour ${playerId}: ${Object.keys(message).length} changements`);
  }
  
  // ===== HANDLERS ACTIONS RAPIDES =====
  
  /**
   * Actions rapides pour l'interface
   */
  private async handleQuickAction(client: Client, message: PokedexQuickActionRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`⚡ [POKÉDX] Action rapide ${message.action} pour:`, playerId);
    
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
    
    console.log(`✅ [POKÉDX] Action rapide ${message.action} terminée pour ${playerId}`);
  }
  
  // ===== HANDLERS GESTION FAVORIS & TAGS =====
  
  /**
   * Toggle le statut favori d'un Pokémon
   */
  private async handleToggleFavorite(client: Client, message: { pokemonId: number }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`⭐ [POKÉDX] Toggle favori #${message.pokemonId} pour:`, playerId);
    
    // Récupérer l'entrée et toggle
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:toggle_favorite', 'Pokémon non trouvé dans le Pokédx');
      return;
    }
    
    const newStatus = await entry.entry.toggleFavorite();
    
    this.sendSuccess(client, 'pokedex:toggle_favorite', {
      pokemonId: message.pokemonId,
      favorited: newStatus
    });
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Favori #${message.pokemonId} ${newStatus ? 'ajouté' : 'retiré'} pour ${playerId}`);
  }
  
  /**
   * Ajoute un tag à un Pokémon
   */
  private async handleAddTag(client: Client, message: { pokemonId: number; tag: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🏷️ [POKÉDX] Ajouter tag "${message.tag}" à #${message.pokemonId} pour:`, playerId);
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:add_tag', 'Pokémon non trouvé dans le Pokédx');
      return;
    }
    
    await entry.entry.addTag(message.tag);
    
    this.sendSuccess(client, 'pokedex:add_tag', {
      pokemonId: message.pokemonId,
      tag: message.tag,
      tags: entry.entry.tags
    });
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Tag "${message.tag}" ajouté à #${message.pokemonId} pour ${playerId}`);
  }
  
  /**
   * Supprime un tag d'un Pokémon
   */
  private async handleRemoveTag(client: Client, message: { pokemonId: number; tag: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🏷️ [POKÉDX] Retirer tag "${message.tag}" de #${message.pokemonId} pour:`, playerId);
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:remove_tag', 'Pokémon non trouvé dans le Pokédx');
      return;
    }
    
    await entry.entry.removeTag(message.tag);
    
    this.sendSuccess(client, 'pokedex:remove_tag', {
      pokemonId: message.pokemonId,
      tag: message.tag,
      tags: entry.entry.tags
    });
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Tag "${message.tag}" retiré de #${message.pokemonId} pour ${playerId}`);
  }
  
  /**
   * Ajoute une note à un Pokémon
   */
  private async handleAddNote(client: Client, message: { pokemonId: number; note: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`📝 [POKÉDX] Ajouter note à #${message.pokemonId} pour:`, playerId);
    
    const entry = await pokedexService.getPokedexEntry(playerId, message.pokemonId);
    
    if (!entry.entry) {
      this.sendError(client, 'pokedex:add_note', 'Pokémon non trouvé dans le Pokédx');
      return;
    }
    
    await entry.entry.addNote(message.note);
    
    this.sendSuccess(client, 'pokedex:add_note', {
      pokemonId: message.pokemonId,
      note: message.note
    });
    
    this.invalidatePlayerCache(playerId);
    
    console.log(`✅ [POKÉDX] Note ajoutée à #${message.pokemonId} pour ${playerId}`);
  }
  
  // ===== HANDLERS INTÉGRATION & DEBUG =====
  
  /**
   * Récupère le statut d'intégration
   */
  private async handleGetIntegrationStatus(client: Client): Promise<void> {
    console.log(`🔗 [POKÉDX] Récupération statut intégration`);
    
    const stats = pokedexIntegrationService.getIntegrationStats();
    
    this.sendSuccess(client, 'pokedex:integration_status', {
      ...stats,
      timestamp: new Date()
    });
    
    console.log(`✅ [POKÉDX] Statut intégration envoyé`);
  }
  
  /**
   * Force l'intégration d'un joueur
   */
  private async handleForceIntegration(client: Client): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    console.log(`🔗 [POKÉDX] Force intégration pour:`, playerId);
    
    // TODO: Implémenter force integration via OwnedPokemon.bulkIntegrateToPokedex
    
    this.sendSuccess(client, 'pokedex:force_integration', {
      success: true,
      message: 'Intégration forcée démarrée',
      playerId,
      timestamp: new Date()
    });
    
    console.log(`✅ [POKÉDX] Intégration forcée démarrée pour ${playerId}`);
  }
  
  /**
   * Récupère les statistiques de tous les services
   */
  private async handleGetServiceStats(client: Client): Promise<void> {
    console.log(`📊 [POKÉDX] Récupération stats services`);
    
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
    
    console.log(`✅ [POKÉDX] Stats services envoyées`);
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Envoie une réponse de succès formatée
   */
private sendSuccess(client: Client, messageType: string, data: any): void {
  client.send(messageType, {
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
  
  // ===== RATE LIMITING SÉCURISÉ =====
  
  private isRateLimited(playerId: string): boolean {
    if (!this.config.enableRateLimiting) return false;
    
    const now = Date.now();
    const limit = this.rateLimitMap.get(playerId);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimitMap.set(playerId, { count: 1, resetTime: now + 60000 });
      return false;
    }
    
    if (limit.count >= this.config.maxRequestsPerMinute) {
      console.warn(`🚨 [POKÉDX SECURITY] Rate limit dépassé pour ${playerId}`);
      return true;
    }
    
    limit.count++;
    return false;
  }
  
  private resetRateLimits(): void {
    const now = Date.now();
    for (const [playerId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(playerId);
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
      // Nettoyer le message des données sensibles potentielles
      const cleanMessage = message.replace(/password|token|auth|secret/gi, '[REDACTED]');
      console.log(`🔧 [PokedexMessageHandler] ${cleanMessage}`);
    }
  }
  
  // ===== NETTOYAGE =====
  
  private cleanupCaches(): void {
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
