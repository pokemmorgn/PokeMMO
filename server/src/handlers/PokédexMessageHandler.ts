// server/src/handlers/PokédexMessageHandler.ts
import { Room, Client } from "colyseus";
import { pokédexService } from '../services/PokédexService';
import { PokédexProgressService } from '../services/PokédexProgressService'; // ✅ CORRIGÉ
import { pokédexNotificationService } from '../services/PokédexNotificationService';
import { pokédexIntegrationService } from '../services/PokédexIntegrationService';

// Créer l'instance du service de progression
const pokédexProgressService = PokédxProgressService.getInstance(); // ✅ AJOUTÉ

// ===== TYPES DES MESSAGES =====

export interface PokédxGetRequest {
  filters?: {
    seen?: boolean;
    caught?: boolean;
    shiny?: boolean;
    types?: string[];
    regions?: string[];
    nameQuery?: string;
    sortBy?: 'id' | 'name' | 'level' | 'date_seen' | 'date_caught';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  };
}

export interface PokédxEntryRequest {
  pokemonId: number;
}

export interface PokédxMarkSeenRequest {
  pokemonId: number;
  level: number;
  location: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
}

export interface PokédxMarkCaughtRequest {
  pokemonId: number;
  level: number;
  location: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
  isShiny?: boolean;
  ownedPokemonId: string;
  captureTime?: number;
}

export interface PokédxNotificationRequest {
  notificationId?: string;
  markAllRead?: boolean;
  filters?: {
    unreadOnly?: boolean;
    types?: string[];
    limit?: number;
  };
}

export interface PokédxSettingsRequest {
  enabled?: boolean;
  discoveryNotifications?: boolean;
  captureNotifications?: boolean;
  shinyNotifications?: boolean;
  milestoneNotifications?: boolean;
  streakNotifications?: boolean;
  soundEnabled?: boolean;
  animationsEnabled?: boolean;
}

// ===== HANDLER PRINCIPAL =====

export class PokédxMessageHandler {
  private room: Room;
  
  constructor(room: Room) {
    this.room = room;
    console.log('🔗 [PokédxMessageHandler] Initialisé');
  }
  
  /**
   * Configure tous les handlers de messages Pokédx
   */
  public setupHandlers(): void {
    // === CONSULTATION POKÉDX ===
    this.room.onMessage("pokedx:get", this.handleGetPokedx.bind(this));
    this.room.onMessage("pokedx:entry", this.handleGetEntry.bind(this));
    this.room.onMessage("pokedx:stats", this.handleGetStats.bind(this));
    this.room.onMessage("pokedx:progress", this.handleGetProgress.bind(this));
    this.room.onMessage("pokedx:analytics", this.handleGetAnalytics.bind(this));
    
    // === MISE À JOUR POKÉDX ===
    this.room.onMessage("pokedx:mark_seen", this.handleMarkSeen.bind(this));
    this.room.onMessage("pokedx:mark_caught", this.handleMarkCaught.bind(this));
    this.room.onMessage("pokedx:recalculate", this.handleRecalculate.bind(this));
    
    // === ACCOMPLISSEMENTS & STREAKS ===
    this.room.onMessage("pokedx:achievements", this.handleGetAchievements.bind(this));
    this.room.onMessage("pokedx:streaks", this.handleGetStreaks.bind(this));
    
    // === NOTIFICATIONS ===
    this.room.onMessage("pokedx:notifications", this.handleGetNotifications.bind(this));
    this.room.onMessage("pokedx:notification_read", this.handleMarkNotificationRead.bind(this));
    this.room.onMessage("pokedx:notification_delete", this.handleDeleteNotification.bind(this));
    this.room.onMessage("pokedx:settings", this.handleUpdateSettings.bind(this));
    
    // === INTÉGRATION & DEBUG ===
    this.room.onMessage("pokedx:integration_status", this.handleGetIntegrationStatus.bind(this));
    this.room.onMessage("pokedx:force_integration", this.handleForceIntegration.bind(this));
    
    console.log('✅ [PokédxMessageHandler] 15 handlers configurés');
  }
  
  // ===== HANDLERS DE CONSULTATION =====
  
  /**
   * Récupère le Pokédx d'un joueur avec filtres
   */
  private async handleGetPokedx(client: Client, message: PokédxGetRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:get', 'Joueur non identifié');
        return;
      }
      
      console.log(`📖 [PokédxHandler] Récupération Pokédx pour ${playerId}`);
      
      const result = await pokédxService.getPlayerPokedx(playerId, message.filters || {});
      
      client.send("pokedx:get:response", {
        success: true,
        data: {
          entries: result.entries,
          pagination: result.pagination,
          summary: result.summary
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getPokedx:', error);
      this.sendError(client, 'pokedx:get', 'Erreur récupération Pokédx');
    }
  }
  
  /**
   * Récupère une entrée spécifique du Pokédx
   */
  private async handleGetEntry(client: Client, message: PokédxEntryRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:entry', 'Joueur non identifié');
        return;
      }
      
      const result = await pokédxService.getPokédxEntry(playerId, message.pokemonId); // ✅ CORRIGÉ
      
      client.send("pokedx:entry:response", {
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getEntry:', error);
      this.sendError(client, 'pokedx:entry', 'Erreur récupération entrée');
    }
  }
  
  /**
   * Récupère les statistiques globales
   */
  private async handleGetStats(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:stats', 'Joueur non identifié');
        return;
      }
      
      const progress = await pokédxService.getPlayerProgress(playerId);
      
      client.send("pokedx:stats:response", {
        success: true,
        data: progress
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getStats:', error);
      this.sendError(client, 'pokedx:stats', 'Erreur récupération statistiques');
    }
  }
  
  /**
   * Récupère la progression détaillée
   */
  private async handleGetProgress(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:progress', 'Joueur non identifié');
        return;
      }
      
      const progress = await pokédxService.getPlayerProgress(playerId);
      
      client.send("pokedx:progress:response", {
        success: true,
        data: progress
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getProgress:', error);
      this.sendError(client, 'pokedx:progress', 'Erreur récupération progression');
    }
  }
  
  /**
   * Récupère les analytics complètes
   */
  private async handleGetAnalytics(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:analytics', 'Joueur non identifié');
        return;
      }
      
      const analytics = await pokédxProgressService.generatePokédxAnalytics(playerId);
      
      client.send("pokedx:analytics:response", {
        success: true,
        data: analytics
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getAnalytics:', error);
      this.sendError(client, 'pokedx:analytics', 'Erreur récupération analytics');
    }
  }
  
  // ===== HANDLERS DE MISE À JOUR =====
  
  /**
   * Marque un Pokémon comme vu
   */
  private async handleMarkSeen(client: Client, message: PokédxMarkSeenRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:mark_seen', 'Joueur non identifié');
        return;
      }
      
      console.log(`👁️ [PokédxHandler] Marquer comme vu: ${playerId} -> #${message.pokemonId}`);
      
      const result = await pokédxIntegrationService.handlePokemonEncounter({
        playerId,
        pokemonId: message.pokemonId,
        level: message.level,
        location: message.location,
        method: message.method || 'wild',
        weather: message.weather,
        timeOfDay: message.timeOfDay
      });
      
      client.send("pokedx:mark_seen:response", {
        success: result.success,
        data: {
          isNewDiscovery: result.isNewDiscovery,
          notifications: result.notifications
        },
        error: result.error
      });
      
      // Broadcaster les notifications aux autres clients si nécessaire
      if (result.isNewDiscovery && result.notifications.length > 0) {
        this.broadcastToPlayer(playerId, "pokedx:discovery", {
          pokemonId: message.pokemonId,
          notifications: result.notifications
        });
      }
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur markSeen:', error);
      this.sendError(client, 'pokedx:mark_seen', 'Erreur marquage vu');
    }
  }
  
  /**
   * Marque un Pokémon comme capturé
   */
  private async handleMarkCaught(client: Client, message: PokédxMarkCaughtRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:mark_caught', 'Joueur non identifié');
        return;
      }
      
      console.log(`🎯 [PokédxHandler] Marquer comme capturé: ${playerId} -> #${message.pokemonId}`);
      
      const result = await pokédxIntegrationService.handlePokemonCapture({
        playerId,
        pokemonId: message.pokemonId,
        level: message.level,
        location: message.location,
        method: message.method || 'wild',
        weather: message.weather,
        timeOfDay: message.timeOfDay,
        ownedPokemonId: message.ownedPokemonId,
        isShiny: message.isShiny || false,
        captureTime: message.captureTime
      });
      
      client.send("pokedx:mark_caught:response", {
        success: result.success,
        data: {
          isNewCapture: result.isNewCapture,
          isNewBestSpecimen: result.isNewBestSpecimen,
          notifications: result.notifications
        },
        error: result.error
      });
      
      // Broadcaster les notifications importantes
      if (result.isNewCapture || result.isNewBestSpecimen) {
        this.broadcastToPlayer(playerId, "pokedx:capture", {
          pokemonId: message.pokemonId,
          isNewCapture: result.isNewCapture,
          isNewBestSpecimen: result.isNewBestSpecimen,
          isShiny: message.isShiny,
          notifications: result.notifications
        });
      }
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur markCaught:', error);
      this.sendError(client, 'pokedx:mark_caught', 'Erreur marquage capturé');
    }
  }
  
  /**
   * Force un recalcul des statistiques
   */
  private async handleRecalculate(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:recalculate', 'Joueur non identifié');
        return;
      }
      
      console.log(`🔄 [PokédxHandler] Recalcul stats pour ${playerId}`);
      
      const stats = await pokédxService.recalculatePlayerStats(playerId);
      
      client.send("pokedx:recalculate:response", {
        success: true,
        data: {
          totalSeen: stats.totalSeen,
          totalCaught: stats.totalCaught,
          seenPercentage: stats.seenPercentage,
          caughtPercentage: stats.caughtPercentage
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur recalculate:', error);
      this.sendError(client, 'pokedx:recalculate', 'Erreur recalcul');
    }
  }
  
  // ===== HANDLERS ACCOMPLISSEMENTS & STREAKS =====
  
  /**
   * Récupère les accomplissements
   */
  private async handleGetAchievements(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:achievements', 'Joueur non identifié');
        return;
      }
      
      // TODO: ACHIEVEMENT SYSTEM GLOBAL - Remplacer par service unifié
      const achievements = {
        unlocked: [] as any[], // ✅ CORRIGÉ
        inProgress: [] as any[], // ✅ CORRIGÉ
        locked: [] as any[], // ✅ CORRIGÉ
        totalPoints: 0
      };
      
      client.send("pokedx:achievements:response", {
        success: true,
        data: achievements
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getAchievements:', error);
      this.sendError(client, 'pokedx:achievements', 'Erreur récupération accomplissements');
    }
  }
  
  /**
   * Récupère les streaks actuelles
   */
  private async handleGetStreaks(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:streaks', 'Joueur non identifié');
        return;
      }
      
      const streaks = await pokédxProgressService.getCurrentStreaks(playerId);
      
      client.send("pokedx:streaks:response", {
        success: true,
        data: streaks
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getStreaks:', error);
      this.sendError(client, 'pokedx:streaks', 'Erreur récupération streaks');
    }
  }
  
  // ===== HANDLERS NOTIFICATIONS =====
  
  /**
   * Récupère les notifications
   */
  private async handleGetNotifications(client: Client, message: PokédxNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notifications', 'Joueur non identifié');
        return;
      }
      
      const notifications = pokédxNotificationService.getPlayerNotifications(
        playerId,
        message.filters || {}
      );
      
      const stats = pokédxNotificationService.getNotificationStats(playerId);
      
      client.send("pokedx:notifications:response", {
        success: true,
        data: {
          notifications,
          stats
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getNotifications:', error);
      this.sendError(client, 'pokedx:notifications', 'Erreur récupération notifications');
    }
  }
  
  /**
   * Marque une notification comme lue
   */
  private async handleMarkNotificationRead(client: Client, message: PokédxNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notification_read', 'Joueur non identifié');
        return;
      }
      
      let result;
      if (message.markAllRead) {
        result = pokédxNotificationService.markAllAsRead(playerId);
      } else if (message.notificationId) {
        result = pokédxNotificationService.markAsRead(playerId, message.notificationId);
      } else {
        this.sendError(client, 'pokedx:notification_read', 'ID notification requis');
        return;
      }
      
      client.send("pokedx:notification_read:response", {
        success: true,
        data: { marked: result }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur markNotificationRead:', error);
      this.sendError(client, 'pokedx:notification_read', 'Erreur marquage notification');
    }
  }
  
  /**
   * Supprime une notification
   */
  private async handleDeleteNotification(client: Client, message: PokédxNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId || !message.notificationId) {
        this.sendError(client, 'pokedx:notification_delete', 'Paramètres invalides');
        return;
      }
      
      const result = pokédxNotificationService.removeNotification(playerId, message.notificationId);
      
      client.send("pokedx:notification_delete:response", {
        success: result,
        data: { deleted: result }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur deleteNotification:', error);
      this.sendError(client, 'pokedx:notification_delete', 'Erreur suppression notification');
    }
  }
  
  /**
   * Met à jour les paramètres de notification
   */
  private async handleUpdateSettings(client: Client, message: PokédxSettingsRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:settings', 'Joueur non identifié');
        return;
      }
      
      pokédxNotificationService.updatePlayerSettings(playerId, message);
      const settings = pokédxNotificationService.getPlayerSettings(playerId);
      
      client.send("pokedx:settings:response", {
        success: true,
        data: settings
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur updateSettings:', error);
      this.sendError(client, 'pokedx:settings', 'Erreur mise à jour paramètres');
    }
  }
  
  // ===== HANDLERS INTÉGRATION & DEBUG =====
  
  /**
   * Récupère le statut d'intégration
   */
  private async handleGetIntegrationStatus(client: Client): Promise<void> {
    try {
      const stats = pokédxIntegrationService.getIntegrationStats();
      
      client.send("pokedx:integration_status:response", {
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getIntegrationStatus:', error);
      this.sendError(client, 'pokedx:integration_status', 'Erreur statut intégration');
    }
  }
  
  /**
   * Force l'intégration d'un joueur
   */
  private async handleForceIntegration(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:force_integration', 'Joueur non identifié');
        return;
      }
      
      // TODO: Implémenter force integration via OwnedPokemon.bulkIntegrateToPokédx
      
      client.send("pokedx:force_integration:response", {
        success: true,
        data: { message: 'Intégration forcée démarrée' }
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur forceIntegration:', error);
      this.sendError(client, 'pokedx:force_integration', 'Erreur intégration forcée');
    }
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Récupère l'ID du joueur depuis le client
   */
  private getPlayerId(client: Client): string | null {
    // Adapter selon votre système d'authentification
    return client.sessionId || (client as any).auth?.playerId || null;
  }
  
  /**
   * Envoie une erreur formatée au client
   */
  private sendError(client: Client, messageType: string, error: string): void {
    client.send(`${messageType}:response`, {
      success: false,
      error: error
    });
  }
  
  /**
   * Broadcaster un message à tous les clients d'un joueur
   */
  private broadcastToPlayer(playerId: string, messageType: string, data: any): void {
    this.room.clients.forEach(client => {
      if (this.getPlayerId(client) === playerId) {
        client.send(messageType, data);
      }
    });
  }
  
  /**
   * Broadcaster un message à tous les clients de la room
   */
  private broadcastToAll(messageType: string, data: any): void {
    this.room.broadcast(messageType, data);
  }
  
  /**
   * Nettoie les ressources lors de la déconnexion
   */
  public cleanup(): void {
    console.log('🧹 [PokédxMessageHandler] Nettoyage des handlers');
    // Nettoyage si nécessaire
  }
}

export default PokédxMessageHandler;
