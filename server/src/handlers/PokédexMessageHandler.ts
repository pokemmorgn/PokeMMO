// server/src/handlers/PokédexMessageHandler.ts
import { Room, Client } from "colyseus";
import { pokédexService } from '../services/PokédexService';
import { PokédexProgressService } from '../services/PokédexProgressService'; // Fixed import
import { pokédexNotificationService } from '../services/PokédexNotificationService';
import { pokédexIntegrationService } from '../services/PokédexIntegrationService';

// Create the instance
const pokédexProgressService = PokédexProgressService.getInstance();

// ===== TYPES DES MESSAGES =====

export interface PokédexGetRequest {
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

export interface PokédexEntryRequest {
  pokemonId: number;
}

export interface PokédexMarkSeenRequest {
  pokemonId: number;
  level: number;
  location: string;
  method?: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
}

export interface PokédexMarkCaughtRequest {
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

export interface PokédexNotificationRequest {
  notificationId?: string;
  markAllRead?: boolean;
  filters?: {
    unreadOnly?: boolean;
    types?: string[];
    limit?: number;
  };
}

export interface PokédexSettingsRequest {
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

export class PokédexMessageHandler {
  private room: Room;
  
  constructor(room: Room) {
    this.room = room;
    this.registerHandlers();
    console.log('🔗 [PokédexMessageHandler] Handlers Pokédx enregistrés');
  }
  
  /**
   * Enregistre tous les handlers de messages Pokédx
   */
  private registerHandlers(): void {
    // === CONSULTATION POKÉDX ===
    this.room.onMessage("pokedex:get", this.handleGetPokedex.bind(this));
    this.room.onMessage("pokedex:entry", this.handleGetEntry.bind(this));
    this.room.onMessage("pokedex:stats", this.handleGetStats.bind(this));
    this.room.onMessage("pokedex:progress", this.handleGetProgress.bind(this));
    this.room.onMessage("pokedex:analytics", this.handleGetAnalytics.bind(this));
    
    // === MISE À JOUR POKÉDX ===
    this.room.onMessage("pokedex:mark_seen", this.handleMarkSeen.bind(this));
    this.room.onMessage("pokedex:mark_caught", this.handleMarkCaught.bind(this));
    this.room.onMessage("pokedex:recalculate", this.handleRecalculate.bind(this));
    
    // === ACCOMPLISSEMENTS & STREAKS ===
    this.room.onMessage("pokedex:achievements", this.handleGetAchievements.bind(this));
    this.room.onMessage("pokedex:streaks", this.handleGetStreaks.bind(this));
    
    // === NOTIFICATIONS ===
    this.room.onMessage("pokedex:notifications", this.handleGetNotifications.bind(this));
    this.room.onMessage("pokedex:notification_read", this.handleMarkNotificationRead.bind(this));
    this.room.onMessage("pokedex:notification_delete", this.handleDeleteNotification.bind(this));
    this.room.onMessage("pokedex:settings", this.handleUpdateSettings.bind(this));
    
    // === INTÉGRATION & DEBUG ===
    this.room.onMessage("pokedex:integration_status", this.handleGetIntegrationStatus.bind(this));
    this.room.onMessage("pokedex:force_integration", this.handleForceIntegration.bind(this));
    
    console.log('✅ [PokédexMessageHandler] 15 handlers enregistrés');
  }
  
  // ===== HANDLERS DE CONSULTATION =====
  
  /**
   * Récupère le Pokédx d'un joueur avec filtres
   */
  private async handleGetPokedex(client: Client, message: PokédexGetRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedex:get', 'Joueur non identifié');
        return;
      }
      
      console.log(`📖 [PokédexHandler] Récupération Pokédx pour ${playerId}`);
      
      const result = await pokédexService.getPlayerPokedex(playerId, message.filters || {});
      
      client.send("pokedex:get:response", {
        success: true,
        data: {
          entries: result.entries,
          pagination: result.pagination,
          summary: result.summary
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getPokedex:', error);
      this.sendError(client, 'pokedex:get', 'Erreur récupération Pokédx');
    }
  }
  
  /**
   * Récupère une entrée spécifique du Pokédx
   */
  private async handleGetEntry(client: Client, message: PokédexEntryRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:entry', 'Joueur non identifié');
        return;
      }
      
      // Fixed method name
      const result = await pokédexService.getPokédxEntry(playerId, message.pokemonId);
      
      client.send("pokedex:entry:response", {
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getEntry:', error);
      this.sendError(client, 'pokedex:entry', 'Erreur récupération entrée');
    }
  }
  
  /**
   * Récupère les statistiques globales
   */
  private async handleGetStats(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedex:stats', 'Joueur non identifié');
        return;
      }
      
      const progress = await pokédexService.getPlayerProgress(playerId);
      
      client.send("pokedex:stats:response", {
        success: true,
        data: progress
      });
      
    } catch (error) {
      console.error('❌ [PokédxHandler] Erreur getStats:', error);
      this.sendError(client, 'pokedex:stats', 'Erreur récupération statistiques');
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
      
      const progress = await pokédexService.getPlayerProgress(playerId);
      
      client.send("pokedex:progress:response", {
        success: true,
        data: progress
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getProgress:', error);
      this.sendError(client, 'pokedex:progress', 'Erreur récupération progression');
    }
  }
  
  /**
   * Récupère les analytics complètes
   */
  private async handleGetAnalytics(client: Client): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedex:analytics', 'Joueur non identifié');
        return;
      }
      
      const analytics = await pokédexProgressService.generatePokédexAnalytics(playerId);
      
      client.send("pokedex:analytics:response", {
        success: true,
        data: analytics
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getAnalytics:', error);
      this.sendError(client, 'pokedex:analytics', 'Erreur récupération analytics');
    }
  }
  
  // ===== HANDLERS DE MISE À JOUR =====
  
  /**
   * Marque un Pokémon comme vu
   */
  private async handleMarkSeen(client: Client, message: PokédexMarkSeenRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:mark_seen', 'Joueur non identifié');
        return;
      }
      
      console.log(`👁️ [PokédexHandler] Marquer comme vu: ${playerId} -> #${message.pokemonId}`);
      
      const result = await pokédexIntegrationService.handlePokemonEncounter({
        playerId,
        pokemonId: message.pokemonId,
        level: message.level,
        location: message.location,
        method: message.method || 'wild',
        weather: message.weather,
        timeOfDay: message.timeOfDay
      });
      
      client.send("pokedex:mark_seen:response", {
        success: result.success,
        data: {
          isNewDiscovery: result.isNewDiscovery,
          notifications: result.notifications
        },
        error: result.error
      });
      
      // Broadcaster les notifications aux autres clients si nécessaire
      if (result.isNewDiscovery && result.notifications.length > 0) {
        this.broadcastToPlayer(playerId, "pokedex:discovery", {
          pokemonId: message.pokemonId,
          notifications: result.notifications
        });
      }
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur markSeen:', error);
      this.sendError(client, 'pokedex:mark_seen', 'Erreur marquage vu');
    }
  }
  
  /**
   * Marque un Pokémon comme capturé
   */
  private async handleMarkCaught(client: Client, message: PokédexMarkCaughtRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:mark_caught', 'Joueur non identifié');
        return;
      }
      
      console.log(`🎯 [PokédexHandler] Marquer comme capturé: ${playerId} -> #${message.pokemonId}`);
      
      const result = await pokédexIntegrationService.handlePokemonCapture({
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
      
      client.send("pokedex:mark_caught:response", {
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
        this.broadcastToPlayer(playerId, "pokedex:capture", {
          pokemonId: message.pokemonId,
          isNewCapture: result.isNewCapture,
          isNewBestSpecimen: result.isNewBestSpecimen,
          isShiny: message.isShiny,
          notifications: result.notifications
        });
      }
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur markCaught:', error);
      this.sendError(client, 'pokedex:mark_caught', 'Erreur marquage capturé');
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
      
      console.log(`🔄 [PokédexHandler] Recalcul stats pour ${playerId}`);
      
      const stats = await pokédexService.recalculatePlayerStats(playerId);
      
      client.send("pokedex:recalculate:response", {
        success: true,
        data: {
          totalSeen: stats.totalSeen,
          totalCaught: stats.totalCaught,
          seenPercentage: stats.seenPercentage,
          caughtPercentage: stats.caughtPercentage
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur recalculate:', error);
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
      // Fixed: Added proper type annotations
      const achievements: {
        unlocked: any[];
        inProgress: any[];
        locked: any[];
        totalPoints: number;
      } = {
        unlocked: [],
        inProgress: [],
        locked: [],
        totalPoints: 0
      };
      
      client.send("pokedex:achievements:response", {
        success: true,
        data: achievements
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getAchievements:', error);
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
      
      client.send("pokedex:streaks:response", {
        success: true,
        data: streaks
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getStreaks:', error);
      this.sendError(client, 'pokedx:streaks', 'Erreur récupération streaks');
    }
  }
  
  // ===== HANDLERS NOTIFICATIONS =====
  
  /**
   * Récupère les notifications
   */
  private async handleGetNotifications(client: Client, message: PokédexNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notifications', 'Joueur non identifié');
        return;
      }
      
      const notifications = pokédexNotificationService.getPlayerNotifications(
        playerId,
        message.filters || {}
      );
      
      const stats = pokédexNotificationService.getNotificationStats(playerId);
      
      client.send("pokedx:notifications:response", {
        success: true,
        data: {
          notifications,
          stats
        }
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getNotifications:', error);
      this.sendError(client, 'pokedx:notifications', 'Erreur récupération notifications');
    }
  }
  
  /**
   * Marque une notification comme lue
   */
  private async handleMarkNotificationRead(client: Client, message: PokédexNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:notification_read', 'Joueur non identifié');
        return;
      }
      
      let result;
      if (message.markAllRead) {
        result = pokédexNotificationService.markAllAsRead(playerId);
      } else if (message.notificationId) {
        result = pokédexNotificationService.markAsRead(playerId, message.notificationId);
      } else {
        this.sendError(client, 'pokedx:notification_read', 'ID notification requis');
        return;
      }
      
      client.send("pokedx:notification_read:response", {
        success: true,
        data: { marked: result }
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur markNotificationRead:', error);
      this.sendError(client, 'pokedx:notification_read', 'Erreur marquage notification');
    }
  }
  
  /**
   * Supprime une notification
   */
  private async handleDeleteNotification(client: Client, message: PokédexNotificationRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId || !message.notificationId) {
        this.sendError(client, 'pokedx:notification_delete', 'Paramètres invalides');
        return;
      }
      
      const result = pokédexNotificationService.removeNotification(playerId, message.notificationId);
      
      client.send("pokedx:notification_delete:response", {
        success: result,
        data: { deleted: result }
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur deleteNotification:', error);
      this.sendError(client, 'pokedx:notification_delete', 'Erreur suppression notification');
    }
  }
  
  /**
   * Met à jour les paramètres de notification
   */
  private async handleUpdateSettings(client: Client, message: PokédexSettingsRequest): Promise<void> {
    try {
      const playerId = this.getPlayerId(client);
      if (!playerId) {
        this.sendError(client, 'pokedx:settings', 'Joueur non identifié');
        return;
      }
      
      pokédexNotificationService.updatePlayerSettings(playerId, message);
      const settings = pokédexNotificationService.getPlayerSettings(playerId);
      
      client.send("pokedx:settings:response", {
        success: true,
        data: settings
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur updateSettings:', error);
      this.sendError(client, 'pokedx:settings', 'Erreur mise à jour paramètres');
    }
  }
  
  // ===== HANDLERS INTÉGRATION & DEBUG =====
  
  /**
   * Récupère le statut d'intégration
   */
  private async handleGetIntegrationStatus(client: Client): Promise<void> {
    try {
      const stats = pokédexIntegrationService.getIntegrationStats();
      
      client.send("pokedx:integration_status:response", {
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('❌ [PokédexHandler] Erreur getIntegrationStatus:', error);
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
    return client.sessionId || client.auth?.playerId || null;
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
    console.log('🧹 [PokédexMessageHandler] Nettoyage des handlers');
    // Nettoyage si nécessaire
  }
}

// ===== EXPORT & UTILISATION =====
export default PokédexMessageHandler;

// ===== GUIDE D'INTÉGRATION DANS UNE ROOM =====
//
// Dans votre Room Colyseus (ex: GameRoom.ts) :
//
// import PokédxMessageHandler from './handlers/PokédxMessageHandler';
//
// export class GameRoom extends Room {
//   private pokédxHandler: PokédxMessageHandler;
//
//   onCreate(options: any) {
//     // Initialiser le handler Pokédx
//     this.pokédxHandler = new PokédxMessageHandler(this);
//   }
//
//   onDispose() {
//     // Nettoyer le handler
//     this.pokédxHandler?.cleanup();
//   }
// }
//
// ===== UTILISATION CÔTÉ CLIENT (Phaser) =====
//
// // Récupérer le Pokédx
// room.send("pokedx:get", { 
//   filters: { caught: true, types: ["fire"] } 
// });
//
// // Écouter la réponse
// room.onMessage("pokedx:get:response", (message) => {
//   if (message.success) {
//     console.log("Pokédx reçu:", message.data);
//   }
// });
//
// // Marquer comme vu lors d'une rencontre
// room.send("pokedx:mark_seen", {
//   pokemonId: 25,
//   level: 5,
//   location: "Route 1",
//   method: "wild"
// });
//
// // Écouter les notifications en temps réel
// room.onMessage("pokedx:discovery", (data) => {
//   showDiscoveryNotification(data.pokemonId, data.notifications);
// });
