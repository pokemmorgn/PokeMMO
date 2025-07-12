// server/src/handlers/PokédexMessageHandler.ts
import { Room, Client } from "colyseus";
import { pokédexService } from '../services/PokédexService';
import { pokédexIntegrationService } from '../services/PokédexIntegrationService';
import { pokédxNotificationService } from '../services/PokédxNotificationService';
import { pokédxProgressService } from '../services/PokédxProgressService';

// ===== TYPES SIMPLES ET SÉCURISÉS =====

export interface PokédxMessage {
  type: string;
  data?: any;
  requestId?: string;
}

export interface PokédxResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId?: string;
}

// Messages entrants
export interface QuickSeenMessage {
  pokemonId: number;
  level?: number;
  location?: string;
  weather?: string;
  method?: string;
}

export interface QuickCaughtMessage {
  pokemonId: number;
  level?: number;
  location?: string;
  ownedPokemonId: string;
  isShiny?: boolean;
  method?: string;
}

export interface PokédxQueryMessage {
  filters?: {
    seen?: boolean;
    caught?: boolean;
    shiny?: boolean;
    types?: string[];
    nameQuery?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  };
}

export interface NotificationMessage {
  notificationId?: string;
  markAllRead?: boolean;
  filters?: {
    unreadOnly?: boolean;
    types?: string[];
    limit?: number;
  };
}

export interface SettingsMessage {
  discoveries?: boolean;
  captures?: boolean;
  shinies?: boolean;
  milestones?: boolean;
  streaks?: boolean;
  sounds?: boolean;
  animations?: boolean;
}

// ===== HANDLER WEBSOCKET OPTIMISÉ =====

export class PokédxMessageHandler {
  private room: Room;
  
  // Rate limiting par client
  private clientRateLimit = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  
  // Statistiques
  private stats = {
    totalMessages: 0,
    totalErrors: 0,
    rateLimitHits: 0,
    connectedClients: 0
  };
  
  constructor(room: Room) {
    this.room = room;
    this.registerHandlers();
    this.setupCleanup();
    console.log('🔗 [PokédxMessageHandler] Handlers WebSocket enregistrés');
  }
  
  // ===== ENREGISTREMENT DES HANDLERS =====
  
  /**
   * Enregistre tous les handlers de messages optimisés
   */
  private registerHandlers(): void {
    console.log('📡 [PokédxMessageHandler] Enregistrement des handlers...');
    
    // === API SIMPLE ET RAPIDE ===
    this.room.onMessage("pokedx:quick_seen", this.handleQuickSeen.bind(this));
    this.room.onMessage("pokedx:quick_caught", this.handleQuickCaught.bind(this));
    
    // === CONSULTATION ===
    this.room.onMessage("pokedx:get", this.handleGetPokedx.bind(this));
    this.room.onMessage("pokedx:entry", this.handleGetEntry.bind(this));
    this.room.onMessage("pokedx:summary", this.handleGetSummary.bind(this));
    this.room.onMessage("pokedx:analytics", this.handleGetAnalytics.bind(this));
    
    // === ACHIEVEMENTS & PROGRESSION ===
    this.room.onMessage("pokedx:achievements", this.handleGetAchievements.bind(this));
    this.room.onMessage("pokedx:streaks", this.handleGetStreaks.bind(this));
    
    // === NOTIFICATIONS ===
    this.room.onMessage("pokedx:notifications", this.handleGetNotifications.bind(this));
    this.room.onMessage("pokedx:notification_read", this.handleMarkNotificationRead.bind(this));
    this.room.onMessage("pokedx:notification_delete", this.handleDeleteNotification.bind(this));
    this.room.onMessage("pokedx:settings", this.handleUpdateSettings.bind(this));
    
    // === UTILITAIRES ===
    this.room.onMessage("pokedx:recalculate", this.handleRecalculate.bind(this));
    this.room.onMessage("pokedx:stats", this.handleGetStats.bind(this));
    
    // === ÉVÉNEMENTS CLIENT ===
    this.room.onJoin = this.handleClientJoin.bind(this);
    this.room.onLeave = this.handleClientLeave.bind(this);
    
    console.log('✅ [PokédxMessageHandler] 13 handlers enregistrés');
  }
  
  // ===== HANDLERS API SIMPLE =====
  
  /**
   * 👁️ POKÉMON VU - Handler ultra-rapide
   */
  private async handleQuickSeen(client: Client, message: QuickSeenMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Sécurité et validation
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:quick_seen', 'Joueur non identifié');
        return;
      }
      
      // Validation du message
      const validation = this.validateSeenMessage(message);
      if (!validation.valid) {
        this.sendError(client, 'pokedx:quick_seen', validation.error!);
        return;
      }
      
      console.log(`👁️ [PokédxHandler] ${playerId} voit #${message.pokemonId}`);
      
      // Appel service intégré
      const result = await pokédxIntegrationService.quickSeen({
        playerId,
        pokemonId: message.pokemonId,
        level: message.level,
        location: message.location,
        weather: message.weather,
        method: message.method as any
      });
      
      // Réponse immédiate
      client.send("pokedx:quick_seen:response", {
        success: result.success,
        data: {
          isNew: result.isNew,
          notifications: result.notifications,
          achievements: result.achievements
        },
        error: result.error,
        responseTime: Date.now() - startTime
      });
      
      // Broadcast si nouvelle découverte
      if (result.isNew) {
        this.broadcastToPlayer(playerId, "pokedx:discovery", {
          pokemonId: message.pokemonId,
          location: message.location,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      this.handleError(client, 'pokedx:quick_seen', error, startTime);
    }
  }
  
  /**
   * 🎯 POKÉMON CAPTURÉ - Handler ultra-rapide
   */
  private async handleQuickCaught(client: Client, message: QuickCaughtMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Sécurité et validation
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:quick_caught', 'Joueur non identifié');
        return;
      }
      
      // Validation du message
      const validation = this.validateCaughtMessage(message);
      if (!validation.valid) {
        this.sendError(client, 'pokedx:quick_caught', validation.error!);
        return;
      }
      
      console.log(`🎯 [PokédxHandler] ${playerId} capture #${message.pokemonId}${message.isShiny ? ' ✨' : ''}`);
      
      // Appel service intégré
      const result = await pokédxIntegrationService.quickCaught({
        playerId,
        pokemonId: message.pokemonId,
        level: message.level,
        location: message.location,
        ownedPokemonId: message.ownedPokemonId,
        isShiny: message.isShiny,
        method: message.method as any
      });
      
      // Réponse immédiate
      client.send("pokedx:quick_caught:response", {
        success: result.success,
        data: {
          isNew: result.isNew,
          isNewBest: result.isNewBest,
          notifications: result.notifications,
          achievements: result.achievements
        },
        error: result.error,
        responseTime: Date.now() - startTime
      });
      
      // Broadcast si nouvelle capture ou shiny
      if (result.isNew || message.isShiny) {
        this.broadcastToPlayer(playerId, "pokedx:capture", {
          pokemonId: message.pokemonId,
          isNew: result.isNew,
          isShiny: message.isShiny,
          location: message.location,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      this.handleError(client, 'pokedx:quick_caught', error, startTime);
    }
  }
  
  // ===== HANDLERS CONSULTATION =====
  
  /**
   * 📖 Récupère le Pokédx d'un joueur
   */
  private async handleGetPokedx(client: Client, message: PokédxQueryMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:get', 'Joueur non identifié');
        return;
      }
      
      console.log(`📖 [PokédxHandler] Récupération Pokédx pour ${playerId}`);
      
      // Validation des filtres
      const filters = this.sanitizeFilters(message.filters || {});
      
      const result = await pokédxService.getPlayerPokedx(playerId, filters);
      
      client.send("pokedx:get:response", {
        success: true,
        data: {
          entries: result.entries,
          total: result.total,
          summary: result.summary,
          pagination: {
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasNext: (filters.offset || 0) + (filters.limit || 20) < result.total
          }
        },
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:get', error, startTime);
    }
  }
  
  /**
   * 📄 Récupère une entrée spécifique
   */
  private async handleGetEntry(client: Client, message: { pokemonId: number }): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:entry', 'Joueur non identifié');
        return;
      }
      
      if (!this.validatePokemonId(message.pokemonId)) {
        this.sendError(client, 'pokedx:entry', 'PokemonId invalide');
        return;
      }
      
      const result = await pokédxService.getPokedxEntry(playerId, message.pokemonId);
      
      client.send("pokedx:entry:response", {
        success: true,
        data: result,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:entry', error, startTime);
    }
  }
  
  /**
   * 📊 Récupère le résumé d'un joueur
   */
  private async handleGetSummary(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:summary', 'Joueur non identifié');
        return;
      }
      
      const summary = await pokédxService.getPlayerSummary(playerId);
      
      client.send("pokedx:summary:response", {
        success: true,
        data: summary,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:summary', error, startTime);
    }
  }
  
  /**
   * 📈 Récupère les analytics complètes
   */
  private async handleGetAnalytics(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:analytics', 'Joueur non identifié');
        return;
      }
      
      const analytics = await pokédxProgressService.generateAnalytics(playerId);
      
      client.send("pokedx:analytics:response", {
        success: true,
        data: analytics,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:analytics', error, startTime);
    }
  }
  
  // ===== HANDLERS ACHIEVEMENTS & PROGRESSION =====
  
  /**
   * 🏆 Récupère les achievements
   */
  private async handleGetAchievements(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:achievements', 'Joueur non identifié');
        return;
      }
      
      const achievements = await pokédxProgressService.getPlayerAchievements(playerId);
      
      client.send("pokedx:achievements:response", {
        success: true,
        data: achievements,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:achievements', error, startTime);
    }
  }
  
  /**
   * 🔥 Récupère les streaks
   */
  private async handleGetStreaks(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:streaks', 'Joueur non identifié');
        return;
      }
      
      const streaks = await pokédxProgressService.getCurrentStreaks(playerId);
      
      client.send("pokedx:streaks:response", {
        success: true,
        data: streaks,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:streaks', error, startTime);
    }
  }
  
  // ===== HANDLERS NOTIFICATIONS =====
  
  /**
   * 🔔 Récupère les notifications
   */
  private async handleGetNotifications(client: Client, message: NotificationMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notifications', 'Joueur non identifié');
        return;
      }
      
      const notifications = pokédxNotificationService.getNotifications(
        playerId,
        message.filters || {}
      );
      
      const stats = pokédxNotificationService.getStats(playerId);
      
      client.send("pokedx:notifications:response", {
        success: true,
        data: {
          notifications,
          stats
        },
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:notifications', error, startTime);
    }
  }
  
  /**
   * ✅ Marque une notification comme lue
   */
  private async handleMarkNotificationRead(client: Client, message: NotificationMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notification_read', 'Joueur non identifié');
        return;
      }
      
      let result = false;
      
      if (message.markAllRead) {
        const count = pokédxNotificationService.markAllAsRead(playerId);
        result = count > 0;
      } else if (message.notificationId) {
        result = pokédxNotificationService.markAsRead(playerId, message.notificationId);
      } else {
        this.sendError(client, 'pokedx:notification_read', 'ID notification requis');
        return;
      }
      
      client.send("pokedx:notification_read:response", {
        success: true,
        data: { marked: result },
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:notification_read', error, startTime);
    }
  }
  
  /**
   * 🗑️ Supprime une notification
   */
  private async handleDeleteNotification(client: Client, message: NotificationMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId || !message.notificationId) {
        this.sendError(client, 'pokedx:notification_delete', 'Paramètres invalides');
        return;
      }
      
      const result = pokédxNotificationService.removeNotification(playerId, message.notificationId);
      
      client.send("pokedx:notification_delete:response", {
        success: result,
        data: { deleted: result },
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:notification_delete', error, startTime);
    }
  }
  
  /**
   * ⚙️ Met à jour les paramètres
   */
  private async handleUpdateSettings(client: Client, message: SettingsMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:settings', 'Joueur non identifié');
        return;
      }
      
      const success = pokédxNotificationService.updateSettings(playerId, message);
      const settings = pokédxNotificationService.getSettings(playerId);
      
      client.send("pokedx:settings:response", {
        success,
        data: settings,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:settings', error, startTime);
    }
  }
  
  // ===== HANDLERS UTILITAIRES =====
  
  /**
   * 🔄 Force un recalcul des statistiques
   */
  private async handleRecalculate(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:recalculate', 'Joueur non identifié');
        return;
      }
      
      console.log(`🔄 [PokédxHandler] Recalcul stats pour ${playerId}`);
      
      const stats = await pokédxService.recalculatePlayerStats(playerId);
      const summary = await pokédxService.getPlayerSummary(playerId);
      
      client.send("pokedx:recalculate:response", {
        success: true,
        data: summary,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:recalculate', error, startTime);
    }
  }
  
  /**
   * 📊 Récupère les statistiques du service
   */
  private async handleGetStats(client: Client): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.validateClient(client) || !this.checkRateLimit(client)) return;
      
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:stats', 'Joueur non identifié');
        return;
      }
      
      const serviceStats = {
        handler: this.stats,
        integration: pokédxIntegrationService.getStats(),
        notifications: pokédxNotificationService.getStats(playerId),
        progress: pokédxProgressService.getStats()
      };
      
      client.send("pokedx:stats:response", {
        success: true,
        data: serviceStats,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      this.handleError(client, 'pokedx:stats', error, startTime);
    }
  }
  
  // ===== GESTION DES CLIENTS =====
  
  /**
   * Client connecté
   */
  private handleClientJoin(client: Client): void {
    this.stats.connectedClients++;
    console.log(`🟢 [PokédxHandler] Client connecté: ${client.sessionId} (${this.stats.connectedClients} total)`);
  }
  
  /**
   * Client déconnecté
   */
  private handleClientLeave(client: Client): void {
    this.stats.connectedClients = Math.max(0, this.stats.connectedClients - 1);
    this.clientRateLimit.delete(client.sessionId);
    console.log(`🔴 [PokédxHandler] Client déconnecté: ${client.sessionId} (${this.stats.connectedClients} total)`);
  }
  
  // ===== MÉTHODES UTILITAIRES SÉCURISÉES =====
  
  /**
   * Récupère l'ID du joueur de manière sécurisée
   */
  private getPlayerId(client: Client): string | null {
    // Adapter selon votre système d'authentification
    const playerId = client.sessionId || client.auth?.playerId || client.userData?.playerId;
    
    if (!playerId || typeof playerId !== 'string' || playerId.length > 50) {
      return null;
    }
    
    return playerId;
  }
  
  /**
   * Valide un client
   */
  private validateClient(client: Client): boolean {
    if (!client || !client.sessionId) {
      console.warn('⚠️ [PokédxHandler] Client invalide');
      return false;
    }
    return true;
  }
  
  /**
   * Vérifie le rate limiting
   */
  private checkRateLimit(client: Client): boolean {
    if (!client.sessionId) return false;
    
    const now = Date.now();
    const minute = 60 * 1000;
    
    const current = this.clientRateLimit.get(client.sessionId);
    if (!current || now > current.resetTime) {
      this.clientRateLimit.set(client.sessionId, { count: 1, resetTime: now + minute });
      return true;
    }
    
    if (current.count >= this.MAX_REQUESTS_PER_MINUTE) {
      this.stats.rateLimitHits++;
      this.sendError(client, 'rate_limit', 'Trop de requêtes, attendez une minute');
      return false;
    }
    
    current.count++;
    return true;
  }
  
  /**
   * Valide un message de vue
   */
  private validateSeenMessage(message: QuickSeenMessage): { valid: boolean; error?: string } {
    if (!this.validatePokemonId(message.pokemonId)) {
      return { valid: false, error: 'PokemonId invalide' };
    }
    
    if (message.level !== undefined && (message.level < 1 || message.level > 100)) {
      return { valid: false, error: 'Niveau invalide (1-100)' };
    }
    
    if (message.location && message.location.length > 100) {
      return { valid: false, error: 'Nom de lieu trop long' };
    }
    
    return { valid: true };
  }
  
  /**
   * Valide un message de capture
   */
  private validateCaughtMessage(message: QuickCaughtMessage): { valid: boolean; error?: string } {
    const seenValidation = this.validateSeenMessage(message);
    if (!seenValidation.valid) return seenValidation;
    
    if (!message.ownedPokemonId || typeof message.ownedPokemonId !== 'string') {
      return { valid: false, error: 'OwnedPokemonId requis' };
    }
    
    return { valid: true };
  }
  
  /**
   * Valide un ID de Pokémon
   */
  private validatePokemonId(pokemonId: number): boolean {
    return Number.isInteger(pokemonId) && pokemonId >= 1 && pokemonId <= 2000;
  }
  
  /**
   * Sanitise les filtres de requête
   */
  private sanitizeFilters(filters: any): any {
    const sanitized: any = {};
    
    if (typeof filters.seen === 'boolean') sanitized.seen = filters.seen;
    if (typeof filters.caught === 'boolean') sanitized.caught = filters.caught;
    if (typeof filters.shiny === 'boolean') sanitized.shiny = filters.shiny;
    
    if (Array.isArray(filters.types) && filters.types.length <= 5) {
      sanitized.types = filters.types.filter((type: any) => 
        typeof type === 'string' && type.length <= 20
      ).slice(0, 5);
    }
    
    if (typeof filters.nameQuery === 'string' && filters.nameQuery.length <= 50) {
      sanitized.nameQuery = filters.nameQuery.trim();
    }
    
    if (['id', 'name', 'level', 'recent'].includes(filters.sortBy)) {
      sanitized.sortBy = filters.sortBy;
    }
    
    sanitized.limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    sanitized.offset = Math.max(filters.offset || 0, 0);
    
    return sanitized;
  }
  
  /**
   * Envoie une erreur formatée
   */
  private sendError(client: Client, messageType: string, error: string): void {
    this.stats.totalErrors++;
    
    client.send(`${messageType}:response`, {
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
    
    console.warn(`⚠️ [PokédxHandler] Erreur ${messageType}: ${error}`);
  }
  
  /**
   * Gère les erreurs de manière unifiée
   */
  private handleError(client: Client, messageType: string, error: any, startTime?: number): void {
    this.stats.totalErrors++;
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    client.send(`${messageType}:response`, {
      success: false,
      error: errorMessage,
      responseTime: startTime ? Date.now() - startTime : undefined,
      timestamp: new Date().toISOString()
    });
    
    console.error(`❌ [PokédxHandler] Erreur ${messageType}:`, error);
  }
  
  /**
   * Broadcast à tous les clients d'un joueur
   */
  private broadcastToPlayer(playerId: string, messageType: string, data: any): void {
    let sent = 0;
    
    this.room.clients.forEach(client => {
      if (this.getPlayerId(client) === playerId) {
        client.send(messageType, {
          ...data,
          timestamp: new Date().toISOString()
        });
        sent++;
      }
    });
    
    if (sent > 0) {
      console.log(`📡 [PokédxHandler] Broadcast ${messageType} vers ${sent} client(s) de ${playerId}`);
    }
  }
  
  /**
   * Broadcast à toute la room
   */
  private broadcastToAll(messageType: string, data: any): void {
    this.room.broadcast(messageType, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📡 [PokédxHandler] Broadcast ${messageType} vers ${this.room.clients.length} clients`);
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  /**
   * Configuration du nettoyage automatique
   */
  private setupCleanup(): void {
    // Nettoyage du rate limiter toutes les 5 minutes
    setInterval(() => {
      this.cleanupRateLimit();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Nettoie le rate limiter
   */
  private cleanupRateLimit(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [clientId, data] of this.clientRateLimit.entries()) {
      if (now > data.resetTime) {
        this.clientRateLimit.delete(clientId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [PokédxHandler] ${cleaned} entries rate limit nettoyées`);
    }
  }
  
  /**
   * Récupère les statistiques du handler
   */
  getStats(): {
    totalMessages: number;
    totalErrors: number;
    rateLimitHits: number;
    connectedClients: number;
    errorRate: number;
    rateLimitCacheSize: number;
  } {
    return {
      totalMessages: this.stats.totalMessages,
      totalErrors: this.stats.totalErrors,
      rateLimitHits: this.stats.rateLimitHits,
      connectedClients: this.stats.connectedClients,
      errorRate: this.stats.totalMessages > 0 ? 
        (this.stats.totalErrors / this.stats.totalMessages) * 100 : 0,
      rateLimitCacheSize: this.clientRateLimit.size
    };
  }
  
  /**
   * Nettoyage lors de la fermeture
   */
  public cleanup(): void {
    this.clientRateLimit.clear();
    console.log('🧹 [PokédxMessageHandler] Nettoyage complet effectué');
  }
}

// ===== EXPORT =====
export default PokédxMessageHandler;

// ===== GUIDE D'INTÉGRATION =====
/*

// Dans votre Room Colyseus (ex: GameRoom.ts) :

import PokédxMessageHandler from './handlers/PokédxMessageHandler';

export class GameRoom extends Room {
  private pokédxHandler: PokédxMessageHandler;

  onCreate(options: any) {
    // Initialiser le handler Pokédx
    this.pokédxHandler = new PokédxMessageHandler(this);
  }

  onDispose() {
    // Nettoyer le handler
    this.pokédxHandler?.cleanup();
  }
}

// ===== UTILISATION CÔTÉ CLIENT =====

// 1. API SIMPLE - Pokémon vu
room.send("pokedx:quick_seen", { 
  pokemonId: 25,
  level: 15,
  location: "Route 1",
  weather: "clear"
});

// 2. API SIMPLE - Pokémon capturé
room.send("pokedx:quick_caught", {
  pokemonId: 25,
  level: 15,
  location: "Route 1", 
  ownedPokemonId: "pokemon_id",
  isShiny: false
});

// 3. Consultation Pokédx
room.send("pokedx:get", {
  filters: { 
    caught: true, 
    limit: 20 
  }
});

// 4. Analytics
room.send("pokedx:analytics");

// 5. Achievements
room.send("pokedx:achievements");

// ===== ÉCOUTE DES RÉPONSES =====

room.onMessage("pokedx:quick_seen:response", (message) => {
  if (message.success) {
    console.log("Pokémon vu:", message.data);
    if (message.data.isNew) {
      showDiscoveryNotification();
    }
  }
});

room.onMessage("pokedx:discovery", (data) => {
  // Broadcast nouvelle découverte
  showDiscoveryAnimation(data.pokemonId);
});

room.onMessage("pokedx:capture", (data) => {
  // Broadcast nouvelle capture
  if (data.isShiny) {
    showShinyAnimation();
  }
});

*/
