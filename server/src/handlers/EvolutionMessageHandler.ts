// server/src/handlers/EvolutionMessageHandler.ts
import { Room, Client } from "colyseus";
import { evolutionService } from '../services/EvolutionService';

// ===== TYPES DES MESSAGES =====

export interface EvolutionRequest {
  ownedPokemonId: string;
  method?: 'level' | 'stone' | 'trade' | 'friendship' | 'special';
  item?: string; // Pierre d'évolution, objet échangé, etc.
  location?: string;
  triggeredBy?: string; // ID du joueur pour les échanges
}

export interface EvolutionCheckRequest {
  ownedPokemonId: string;
}

export interface EvolutionWithItemRequest {
  ownedPokemonId: string;
  item: string;
  location?: string;
}

export interface EvolutionTradeRequest {
  ownedPokemonId: string;
  tradePartner: string;
  location?: string;
}

export interface EvolutionHistoryRequest {
  limit?: number;
}

// ===== CONFIGURATION DU HANDLER =====

interface HandlerConfig {
  enableValidation: boolean;
  enableRateLimiting: boolean;
  maxEvolutionsPerMinute: number;
  enableCache: boolean;
  enableMetrics: boolean;
  enableDebug: boolean;
}

// ===== HANDLER ÉVOLUTION =====

export class EvolutionMessageHandler {
  private room: Room;
  private config: HandlerConfig = {
    enableValidation: true,
    enableRateLimiting: true,
    maxEvolutionsPerMinute: 10, // Plus restrictif que les autres actions
    enableCache: true,
    enableMetrics: true,
    enableDebug: false
  };
  
  // Rate limiting par client pour évolutions
  private evolutionLimitMap = new Map<string, { count: number; resetTime: number }>();
  
  // Métriques spécifiques aux évolutions
  private metrics = {
    totalEvolutions: 0,
    successfulEvolutions: 0,
    failedEvolutions: 0,
    averageResponseTime: 0,
    evolutionsByMethod: new Map<string, number>(),
    rateLimitedRequests: 0
  };
  
  // Cache pour les vérifications fréquentes
  private canEvolveCache = new Map<string, { data: any; timestamp: number }>();
  
  constructor(room: Room, config?: Partial<HandlerConfig>) {
    this.room = room;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.registerHandlers();
    this.initializeHandler();
    console.log('🌟 [EvolutionMessageHandler] Handler d\'évolution initialisé');
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
    
    this.debugLog('Handler évolution initialisé avec succès');
  }
  
  /**
   * Enregistre tous les handlers d'évolution
   */
  private registerHandlers(): void {
    // === ÉVOLUTIONS DE BASE ===
    this.room.onMessage("evolution:evolve", this.wrapHandler(this.handleEvolve.bind(this)));
    this.room.onMessage("evolution:evolve_item", this.wrapHandler(this.handleEvolveWithItem.bind(this)));
    this.room.onMessage("evolution:evolve_trade", this.wrapHandler(this.handleEvolveByTrade.bind(this)));
    this.room.onMessage("evolution:evolve_custom", this.wrapHandler(this.handleEvolveCustom.bind(this)));
    
    // === VÉRIFICATIONS ===
    this.room.onMessage("evolution:can_evolve", this.wrapHandler(this.handleCanEvolve.bind(this)));
    this.room.onMessage("evolution:requirements", this.wrapHandler(this.handleGetRequirements.bind(this)));
    
    // === HISTORIQUE ET STATS ===
    this.room.onMessage("evolution:history", this.wrapHandler(this.handleGetHistory.bind(this)));
    this.room.onMessage("evolution:stats", this.wrapHandler(this.handleGetStats.bind(this)));
    
    console.log('✅ [EvolutionMessageHandler] 8 handlers d\'évolution enregistrés');
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
        this.metrics.totalEvolutions++;
        
        // Validation du client
        const playerId = this.getPlayerId(client);
        if (!playerId) {
          this.sendError(client, handlerName, 'Client non authentifié', 401);
          return;
        }
        
        // Rate limiting spécial pour évolutions
        if (this.config.enableRateLimiting && this.isEvolutionRateLimited(client.sessionId)) {
          this.sendError(client, handlerName, 'Trop d\'évolutions récentes, attendez un peu', 429);
          this.metrics.rateLimitedRequests++;
          return;
        }
        
        // Validation du message
        if (this.config.enableValidation && !this.validateMessage(message, handlerName)) {
          this.sendError(client, handlerName, 'Message invalide', 400);
          return;
        }
        
        // Vérification du cache pour les requêtes de lecture
        if (this.config.enableCache && handlerName.includes('can_evolve')) {
          const cacheKey = this.generateCacheKey(playerId, handlerName, message);
          const cached = this.getCachedResponse(cacheKey);
          if (cached) {
            this.sendSuccess(client, handlerName, cached);
            this.updateMetrics(startTime, true);
            return;
          }
        }
        
        // Exécution du handler
        this.debugLog(`🌟 Exécution ${handlerName} pour ${playerId}`);
        
        await handler.call(this, client, message, ...args);
        
        this.metrics.successfulEvolutions++;
        this.updateMetrics(startTime, true);
        
      } catch (error) {
        this.metrics.failedEvolutions++;
        this.updateMetrics(startTime, false);
        
        console.error(`❌ [EvolutionMessageHandler] Erreur ${handlerName}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
        const statusCode = this.getErrorStatusCode(error);
        
        this.sendError(client, handlerName, errorMessage, statusCode);
      }
    };
  }
  
  // ===== HANDLERS D'ÉVOLUTION =====
  
  /**
   * Évolution basique par niveau
   */
  private async handleEvolve(client: Client, message: { ownedPokemonId: string; location?: string }): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`🌟 Évolution basique: ${playerId} -> ${message.ownedPokemonId}`);
    
    const result = await evolutionService.evolve(
      message.ownedPokemonId,
      message.location || 'Evolution'
    );
    
    if (result) {
      this.sendSuccess(client, 'evolution:evolve', {
        success: true,
        message: 'Évolution réussie !',
        ownedPokemonId: message.ownedPokemonId
      });
      
      // Broadcaster l'évolution aux autres joueurs de la room
      this.broadcastEvolution(playerId, {
        type: 'level',
        ownedPokemonId: message.ownedPokemonId,
        location: message.location
      });
      
      this.incrementMethodCount('level');
    } else {
      this.sendError(client, 'evolution:evolve', 'Évolution échouée');
    }
  }
  
  /**
   * Évolution avec objet/pierre
   */
  private async handleEvolveWithItem(client: Client, message: EvolutionWithItemRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`🔮 Évolution avec objet: ${playerId} -> ${message.ownedPokemonId} (${message.item})`);
    
    const result = await evolutionService.evolveWithItem(
      message.ownedPokemonId,
      message.item,
      message.location || 'Evolution'
    );
    
    if (result) {
      this.sendSuccess(client, 'evolution:evolve_item', {
        success: true,
        message: `Évolution avec ${message.item} réussie !`,
        ownedPokemonId: message.ownedPokemonId,
        item: message.item
      });
      
      this.broadcastEvolution(playerId, {
        type: 'stone',
        ownedPokemonId: message.ownedPokemonId,
        item: message.item,
        location: message.location
      });
      
      this.incrementMethodCount('stone');
    } else {
      this.sendError(client, 'evolution:evolve_item', `Évolution avec ${message.item} échouée`);
    }
  }
  
  /**
   * Évolution par échange
   */
  private async handleEvolveByTrade(client: Client, message: EvolutionTradeRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`🔄 Évolution par échange: ${playerId} -> ${message.ownedPokemonId} avec ${message.tradePartner}`);
    
    const result = await evolutionService.evolveByTrade(
      message.ownedPokemonId,
      message.tradePartner,
      message.location || 'Trade'
    );
    
    if (result) {
      this.sendSuccess(client, 'evolution:evolve_trade', {
        success: true,
        message: 'Évolution par échange réussie !',
        ownedPokemonId: message.ownedPokemonId,
        tradePartner: message.tradePartner
      });
      
      this.broadcastEvolution(playerId, {
        type: 'trade',
        ownedPokemonId: message.ownedPokemonId,
        tradePartner: message.tradePartner,
        location: message.location
      });
      
      this.incrementMethodCount('trade');
    } else {
      this.sendError(client, 'evolution:evolve_trade', 'Évolution par échange échouée');
    }
  }
  
  /**
   * Évolution personnalisée avec conditions complètes
   */
  private async handleEvolveCustom(client: Client, message: EvolutionRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    this.debugLog(`⚡ Évolution personnalisée: ${playerId} -> ${message.ownedPokemonId} (${message.method})`);
    
    const result = await evolutionService.evolveOwnedPokemon(message);
    
    if (result.success) {
      this.sendSuccess(client, 'evolution:evolve_custom', {
        success: true,
        fromPokemon: result.fromPokemon,
        toPokemon: result.toPokemon,
        notifications: result.notifications,
        isNewForm: result.isNewForm,
        method: message.method
      });
      
      this.broadcastEvolution(playerId, {
        type: message.method || 'special',
        ownedPokemonId: message.ownedPokemonId,
        fromPokemon: result.fromPokemon,
        toPokemon: result.toPokemon,
        location: message.location
      });
      
      this.incrementMethodCount(message.method || 'special');
    } else {
      this.sendError(client, 'evolution:evolve_custom', result.error || 'Évolution échouée');
    }
  }
  
  // ===== HANDLERS DE VÉRIFICATION =====
  
  /**
   * Vérifie si un Pokémon peut évoluer
   */
  private async handleCanEvolve(client: Client, message: EvolutionCheckRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    // Vérifier le cache
    const cacheKey = this.generateCacheKey(playerId, 'canEvolve', message);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.sendSuccess(client, 'evolution:can_evolve', cached);
      return;
    }
    
    const result = await evolutionService.canEvolve(message.ownedPokemonId);
    
    // Mettre en cache pour 30 secondes
    this.setCachedResponse(cacheKey, result, 30000);
    
    this.sendSuccess(client, 'evolution:can_evolve', {
      ownedPokemonId: message.ownedPokemonId,
      canEvolve: result.canEvolve,
      evolutionData: result.evolutionData,
      missingRequirements: result.missingRequirements
    });
  }
  
  /**
   * Récupère les prérequis d'évolution détaillés
   */
  private async handleGetRequirements(client: Client, message: EvolutionCheckRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const result = await evolutionService.canEvolve(message.ownedPokemonId);
    
    this.sendSuccess(client, 'evolution:requirements', {
      ownedPokemonId: message.ownedPokemonId,
      canEvolve: result.canEvolve,
      evolutionData: result.evolutionData,
      requirements: result.missingRequirements || [],
      detailedConditions: result.evolutionData ? {
        method: result.evolutionData.method,
        requirement: result.evolutionData.requirement,
        evolvesInto: result.evolutionData.evolvesInto
      } : null
    });
  }
  
  // ===== HANDLERS HISTORIQUE ET STATS =====
  
  /**
   * Récupère l'historique d'évolution
   */
  private async handleGetHistory(client: Client, message: EvolutionHistoryRequest): Promise<void> {
    const playerId = this.getPlayerId(client)!;
    
    const history = await evolutionService.getEvolutionHistory(playerId, message.limit || 10);
    
    this.sendSuccess(client, 'evolution:history', {
      history,
      count: history.length
    });
  }
  
  /**
   * Récupère les statistiques d'évolution
   */
  private async handleGetStats(client: Client): Promise<void> {
    const serviceStats = evolutionService.getServiceStats();
    const handlerStats = this.getHandlerStats();
    
    this.sendSuccess(client, 'evolution:stats', {
      service: serviceStats,
      handler: handlerStats,
      combined: {
        totalEvolutions: serviceStats.totalEvolutions,
        successRate: serviceStats.successRate,
        averageResponseTime: handlerStats.averageResponseTime
      }
    });
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Récupère l'ID du joueur depuis le client
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
   * Broadcaster une évolution à la room
   */
  private broadcastEvolution(playerId: string, evolutionData: any): void {
    this.room.broadcast("evolution:broadcast", {
      playerId,
      evolutionData,
      timestamp: new Date()
    });
    
    this.debugLog(`📡 Évolution broadcastée pour ${playerId}`);
  }
  
  // ===== RATE LIMITING SPÉCIALISÉ =====
  
  private isEvolutionRateLimited(sessionId: string): boolean {
    if (!this.config.enableRateLimiting) return false;
    
    const now = Date.now();
    const limit = this.evolutionLimitMap.get(sessionId);
    
    if (!limit || now > limit.resetTime) {
      this.evolutionLimitMap.set(sessionId, { count: 1, resetTime: now + 60000 });
      return false;
    }
    
    if (limit.count >= this.config.maxEvolutionsPerMinute) {
      return true;
    }
    
    limit.count++;
    return false;
  }
  
  private resetRateLimits(): void {
    const now = Date.now();
    for (const [sessionId, limit] of this.evolutionLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.evolutionLimitMap.delete(sessionId);
      }
    }
  }
  
  // ===== CACHE SPÉCIALISÉ =====
  
  private generateCacheKey(playerId: string, handler: string, message: any): string {
    const messageHash = JSON.stringify(message).substring(0, 30);
    return `evolution_${playerId}_${handler}_${messageHash}`;
  }
  
  private getCachedResponse(key: string): any | null {
    const cached = this.canEvolveCache.get(key);
    if (!cached) return null;
    
    // Cache de 30 secondes pour can_evolve
    if (Date.now() > cached.timestamp + 30000) {
      this.canEvolveCache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCachedResponse(key: string, data: any, ttl: number = 30000): void {
    this.canEvolveCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  // ===== VALIDATION =====
  
  private validateMessage(message: any, handlerName: string): boolean {
    if (!this.config.enableValidation) return true;
    
    // Validation basique
    if (message === null || message === undefined) return false;
    
    // Validations spécifiques
    if (handlerName.includes('evolve')) {
      return !!(message.ownedPokemonId && typeof message.ownedPokemonId === 'string');
    }
    
    if (handlerName.includes('can_evolve') || handlerName.includes('requirements')) {
      return !!(message.ownedPokemonId && typeof message.ownedPokemonId === 'string');
    }
    
    return true;
  }
  
  // ===== MÉTRIQUES =====
  
  private incrementMethodCount(method: string): void {
    const current = this.metrics.evolutionsByMethod.get(method) || 0;
    this.metrics.evolutionsByMethod.set(method, current + 1);
  }
  
  private updateMetrics(startTime: number, success: boolean): void {
    const executionTime = Date.now() - startTime;
    const totalEvolutions = this.metrics.successfulEvolutions + this.metrics.failedEvolutions;
    
    if (totalEvolutions > 0) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalEvolutions - 1) + executionTime) / totalEvolutions;
    }
  }
  
  private logMetrics(): void {
    if (this.config.enableDebug) {
      console.log('🌟 [EvolutionMessageHandler] Métriques:', {
        ...this.metrics,
        successRate: this.metrics.totalEvolutions > 0 ? 
          (this.metrics.successfulEvolutions / this.metrics.totalEvolutions) * 100 : 0,
        evolutionsByMethod: Object.fromEntries(this.metrics.evolutionsByMethod),
        cacheSize: this.canEvolveCache.size
      });
    }
  }
  
  private getHandlerStats(): any {
    return {
      ...this.metrics,
      evolutionsByMethod: Object.fromEntries(this.metrics.evolutionsByMethod),
      cacheSize: this.canEvolveCache.size,
      rateLimitSize: this.evolutionLimitMap.size
    };
  }
  
  // ===== UTILITAIRES PRIVÉES =====
  
  private generateRequestId(): string {
    return `evo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  private getErrorStatusCode(error: any): number {
    if (error?.code && typeof error.code === 'number') {
      return error.code;
    }
    
    if (error?.message?.includes('validation')) return 400;
    if (error?.message?.includes('not found')) return 404;
    if (error?.message?.includes('cooldown')) return 429;
    
    return 500;
  }
  
  private debugLog(message: string): void {
    if (this.config.enableDebug) {
      console.log(`🔧 [EvolutionMessageHandler] ${message}`);
    }
  }
  
  // ===== NETTOYAGE =====
  
  private cleanupCaches(): void {
    const now = Date.now();
    
    // Nettoyage du cache can_evolve (30 secondes)
    for (const [key, cached] of this.canEvolveCache.entries()) {
      if (now > cached.timestamp + 30000) {
        this.canEvolveCache.delete(key);
      }
    }
    
    // Nettoyage rate limiting
    this.resetRateLimits();
    
    this.debugLog(`🧹 Nettoyage effectué - Cache: ${this.canEvolveCache.size}, RateLimit: ${this.evolutionLimitMap.size}`);
  }
  
  // ===== API PUBLIQUE =====
  
  /**
   * Met à jour la configuration du handler
   */
  updateConfig(newConfig: Partial<HandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog('⚙️ Configuration mise à jour');
  }
  
  /**
   * Récupère les métriques du handler
   */
  getMetrics(): any {
    return this.getHandlerStats();
  }
  
  /**
   * Nettoie les ressources lors de la déconnexion
   */
  cleanup(): void {
    this.canEvolveCache.clear();
    this.evolutionLimitMap.clear();
    console.log('🧹 [EvolutionMessageHandler] Nettoyage des handlers d\'évolution');
  }
}

// ===== EXPORT =====
export default EvolutionMessageHandler;

// ===== GUIDE D'INTÉGRATION DANS UNE ROOM =====
//
// Dans votre Room Colyseus (ex: GameRoom.ts) :
//
// import EvolutionMessageHandler from './handlers/EvolutionMessageHandler';
//
// export class GameRoom extends Room {
//   private evolutionHandler: EvolutionMessageHandler;
//
//   onCreate(options: any) {
//     // Initialiser le handler d'évolution
//     this.evolutionHandler = new EvolutionMessageHandler(this, {
//       enableDebug: true,
//       maxEvolutionsPerMinute: 5, // Restrictif
//       enableCache: true
//     });
//   }
//
//   onDispose() {
//     // Nettoyer le handler
//     this.evolutionHandler?.cleanup();
//   }
// }
//
// ===== UTILISATION CÔTÉ CLIENT =====
//
// // Évolution basique
// room.send("evolution:evolve", { 
//   ownedPokemonId: "507f1f77bcf86cd799439011",
//   location: "Route 1"
// });
//
// // Évolution avec pierre
// room.send("evolution:evolve_item", {
//   ownedPokemonId: "507f1f77bcf86cd799439011",
//   item: "fire_stone",
//   location: "Evolution Chamber"
// });
//
// // Évolution par échange
// room.send("evolution:evolve_trade", {
//   ownedPokemonId: "507f1f77bcf86cd799439011",
//   tradePartner: "friend_player_id",
//   location: "Trade Center"
// });
//
// // Vérifier si peut évoluer
// room.send("evolution:can_evolve", {
//   ownedPokemonId: "507f1f77bcf86cd799439011"
// });
//
// // Écouter les réponses
// room.onMessage("evolution:evolve:response", (message) => {
//   if (message.success) {
//     console.log("Évolution réussie !");
//     showEvolutionAnimation();
//   } else {
//     console.error("Évolution échouée:", message.error);
//   }
// });
//
// // Écouter les évolutions des autres joueurs
// room.onMessage("evolution:broadcast", (data) => {
//   console.log(`${data.playerId} a fait évoluer un Pokémon !`);
//   showEvolutionNotification(data.evolutionData);
// });
