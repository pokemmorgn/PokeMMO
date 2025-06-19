// server/src/app.config.ts - Configuration avec système de channels
import express from 'express';
import path from 'path';
import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { PlayerData } from "./models/PlayerData";

import { BeachRoom } from "./rooms/BeachRoom";
import { VillageRoom } from "./rooms/VillageRoom";
import { Road1Room } from "./rooms/Road1Room";
import { VillageLabRoom } from "./rooms/VillageLabRoom";
import { VillageHouse1Room } from "./rooms/VillageHouse1Room";
import { LavandiaRoom } from "./rooms/LavandiaRoom";
import { connectDB } from "./db";
import { AuthRoom } from "./rooms/AuthRoom";
import { MoveManager } from "./managers/MoveManager";
import { PokemonManager } from "./managers/PokemonManager";
import { WorldChatRoom } from "./rooms/WorldChatRoom";
import { getServerConfig } from "./config/serverConfig";
import { PlayerQuest } from "./models/PlayerQuest";

// ✅ NOUVEAU : Import du ChannelManager
import { ChannelManager } from "./managers/ChannelManger";

let globalPokemonManager: PokemonManager;
let globalMoveManager: MoveManager;
let globalChannelManager: ChannelManager; // ✅ NOUVEAU

export default config({
  initializeGameServer: (gameServer) => {
    // ✅ NOUVEAU : Initialiser le ChannelManager
    globalChannelManager = new ChannelManager(gameServer);

    // ✅ NOUVEAU : Configuration des channels par zone
    // Beach : 3 channels, auto-scaling activé
    globalChannelManager.configureChannels('BeachRoom', {
      maxChannels: 3,
      maxPlayersPerChannel: 50,
      autoScale: true,
      scaleThreshold: 80 // Créer nouveau channel à 80% de remplissage
    });

    // Village : 3 channels, auto-scaling activé
    globalChannelManager.configureChannels('VillageRoom', {
      maxChannels: 3,
      maxPlayersPerChannel: 50,
      autoScale: true,
      scaleThreshold: 80
    });

    // ✅ NOUVEAU : Définition des rooms avec pattern de channels
    // Pattern: RoomName_ChannelIndex (ex: BeachRoom_0, BeachRoom_1, BeachRoom_2)
    
    // Beach Channels
    for (let i = 0; i < 3; i++) {
      gameServer.define(`BeachRoom_${i}`, BeachRoom)
        .filterBy(['channelIndex'])
        .on('create', (room) => {
          room.metadata = { 
            channelIndex: i, 
            zone: 'beach',
            displayName: `Beach Channel ${i + 1}`
          };
          console.log(`🏖️ Beach Channel ${i + 1} créé: ${room.roomId}`);
        });
    }

    // Village Channels  
    for (let i = 0; i < 3; i++) {
      gameServer.define(`VillageRoom_${i}`, VillageRoom)
        .filterBy(['channelIndex'])
        .on('create', (room) => {
          room.metadata = { 
            channelIndex: i, 
            zone: 'village',
            displayName: `Village Channel ${i + 1}`
          };
          console.log(`🏘️ Village Channel ${i + 1} créé: ${room.roomId}`);
        });
    }

    // ✅ ROOMS TRADITIONNELLES (pas de channels pour l'instant)
    gameServer.define('AuthRoom', AuthRoom);
    gameServer.define('Road1Room', Road1Room);
    gameServer.define('VillageLabRoom', VillageLabRoom);
    gameServer.define('VillageHouse1Room', VillageHouse1Room);
    gameServer.define('LavandiaRoom', LavandiaRoom);
    gameServer.define('worldchat', WorldChatRoom);

    console.log("✅ Système de channels configuré pour Beach et Village");
  },

  initializeExpress: (app) => {
    app.get("/hello_world", (req, res) => {
      res.send("Welcome to PokeWorld with Channels!");
    });

    // ✅ NOUVEAU : API pour récupérer le channel optimal
    app.get("/api/optimal-channel/:roomType", async (req, res) => {
      try {
        const { roomType } = req.params;
        
        if (!globalChannelManager) {
          return res.status(500).json({ error: "ChannelManager not initialized" });
        }

        // Vérifier si le roomType supporte les channels
        const supportedChannelRooms = ['BeachRoom', 'VillageRoom'];
        if (!supportedChannelRooms.includes(roomType)) {
          // Pour les rooms sans channels, retourner le nom de base
          return res.json({ channelId: roomType });
        }

        const optimalChannelId = await globalChannelManager.findOptimalChannel(roomType);
        res.json({ 
          channelId: optimalChannelId,
          hasChannels: true
        });
        
      } catch (error) {
        console.error("❌ Erreur récupération channel optimal:", error);
        res.status(500).json({ 
          error: "Impossible de trouver un channel optimal",
          channelId: req.params.roomType // Fallback
        });
      }
    });

    // ✅ NOUVEAU : API pour les statistiques des channels
    app.get("/api/channels/stats", async (req, res) => {
      try {
        if (!globalChannelManager) {
          return res.status(500).json({ error: "ChannelManager not initialized" });
        }

        const stats = await globalChannelManager.getChannelStats();
        res.json({
          timestamp: new Date().toISOString(),
          stats,
          totalActiveChannels: Object.values(stats).reduce((sum: number, roomStats: any) => 
            sum + roomStats.totalChannels, 0),
          totalPlayers: Object.values(stats).reduce((sum: number, roomStats: any) => 
            sum + roomStats.totalPlayers, 0)
        });
        
      } catch (error) {
        console.error("❌ Erreur stats channels:", error);
        res.status(500).json({ error: "Impossible de récupérer les stats" });
      }
    });

    // ✅ NOUVEAU : API pour forcer la création d'un channel (admin)
    app.post("/api/channels/create/:roomType", async (req, res) => {
      try {
        const { roomType } = req.params;
        const { channelIndex } = req.body;
        
        if (!globalChannelManager) {
          return res.status(500).json({ error: "ChannelManager not initialized" });
        }

        const channelId = await globalChannelManager.forceCreateChannel(roomType, channelIndex);
        res.json({ 
          success: true, 
          channelId,
          message: `Channel ${channelId} créé avec succès`
        });
        
      } catch (error) {
        console.error("❌ Erreur création channel forcée:", error);
        res.status(500).json({ 
          error: error.message || "Erreur lors de la création du channel"
        });
      }
    });

    // ✅ NOUVEAU : API pour le debug des channels (dev only)
    if (process.env.NODE_ENV !== "production") {
      app.get("/api/channels/debug", async (req, res) => {
        try {
          if (!globalChannelManager) {
            return res.status(500).json({ error: "ChannelManager not initialized" });
          }

          const debugInfo = await globalChannelManager.getDebugInfo();
          res.json(debugInfo);
          
        } catch (error) {
          console.error("❌ Erreur debug channels:", error);
          res.status(500).json({ error: "Erreur lors du debug" });
        }
      });
    }

    // ✅ API EXISTANTE : Données joueur
    app.get("/api/playerData", async (req, res) => {
      const username = req.query.username;
      if (!username) return res.status(400).json({ error: "username manquant" });
      try {
        const player = await PlayerData.findOne({ username });
        if (!player) return res.status(404).json({ error: "not found" });

        res.json({
          lastMap: player.lastMap,
          lastX: player.lastX,
          lastY: player.lastY,
          gold: player.gold,
          walletAddress: player.walletAddress
        });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // ✅ Fichiers statiques
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // ✅ Monitoring et playground
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
    }

    app.use("/monitor", monitor());

    console.log("✅ APIs de gestion des channels configurées");
  },

  beforeListen: async () => {
    try {
      await connectDB();
      console.log("✅ Connected to MongoDB: pokeworld");
      
      // ✅ Reset des quêtes si configuré
      const config = getServerConfig();
      if (config.autoresetQuest) {
        await PlayerQuest.deleteMany({});
        console.log("🔥 PlayerQuest vidé (auto-reset activé)");
      }
      
      // ✅ Initialisation du MoveManager
      console.log("🔄 Initialisation du MoveManager...");
      globalMoveManager = new MoveManager({
        basePath: './src/data',
        useDevFallback: true,
        enableCache: true
      });
      console.log("✅ MoveManager initialisé");

      // ✅ NOUVEAU : Planifier le nettoyage automatique des channels
      if (globalChannelManager) {
        setInterval(() => {
          globalChannelManager.cleanupEmptyChannels();
        }, 5 * 60 * 1000); // Toutes les 5 minutes
        
        console.log("✅ Nettoyage automatique des channels configuré");
      }
      
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    }
  }
});

// ✅ Exports pour les autres modules
export { globalMoveManager, globalPokemonManager, globalChannelManager };

// ✅ NOUVEAU : Fonction utilitaire pour récupérer les informations de channel
export function getChannelInfo(roomId: string) {
  if (!globalChannelManager) return null;
  return globalChannelManager.getChannelInfo(roomId);
}

// ✅ NOUVEAU : Fonction pour vérifier si une room supporte les channels
export function supportsChannels(roomType: string): boolean {
  const channelSupportedRooms = ['BeachRoom', 'VillageRoom'];
  return channelSupportedRooms.includes(roomType);
}

// ✅ NOUVEAU : Fonction pour extraire le type de room depuis l'ID de channel
export function extractRoomType(channelId: string): string {
  // BeachRoom_0 -> BeachRoom
  // VillageRoom_2 -> VillageRoom  
  // Road1Room -> Road1Room (pas de channel)
  return channelId.split('_')[0];
}

// ✅ NOUVEAU : Fonction pour extraire l'index de channel
export function extractChannelIndex(channelId: string): number {
  const parts = channelId.split('_');
  return parts.length > 1 ? parseInt(parts[1]) : 0;
}

// ✅ NOUVEAU : Configuration des règles de transition par zone
export const ZONE_TRANSITION_RULES = {
  // Beach peut aller vers Village uniquement
  'Beach': ['Village'],
  'BeachRoom': ['VillageRoom'],
  
  // Village peut aller vers Beach, Lab, House1, Road1
  'Village': ['Beach', 'VillageLab', 'VillageHouse1', 'Road1'],
  'VillageRoom': ['BeachRoom', 'VillageLabRoom', 'VillageHouse1Room', 'Road1Room'],
  
  // Lab peut retourner au Village
  'VillageLab': ['Village'], 
  'VillageLabRoom': ['VillageRoom'],
  
  // House1 peut retourner au Village
  'VillageHouse1': ['Village'],
  'VillageHouse1Room': ['VillageRoom'],
  
  // Road1 peut aller vers Village et Lavandia
  'Road1': ['Village', 'Lavandia'],
  'Road1Room': ['VillageRoom', 'LavandiaRoom'],
  
  // Lavandia peut retourner vers Road1
  'Lavandia': ['Road1'],
  'LavandiaRoom': ['Road1Room']
};

// ✅ NOUVEAU : Fonction pour valider une transition
export function isTransitionAllowed(fromZone: string, toZone: string): boolean {
  const allowedDestinations = ZONE_TRANSITION_RULES[fromZone];
  return allowedDestinations ? allowedDestinations.includes(toZone) : false;
}

// ✅ NOUVEAU : Middleware de validation des transitions (à utiliser dans les rooms)
export function validateTransition(fromZone: string, toZone: string, playerLevel: number = 1): {
  allowed: boolean;
  reason?: string;
} {
  // 1. Vérifier si la transition est autorisée
  if (!isTransitionAllowed(fromZone, toZone)) {
    return {
      allowed: false,
      reason: `Transition ${fromZone} → ${toZone} non autorisée`
    };
  }

  // 2. Vérifications de niveau (exemple)
  const levelRequirements: Record<string, number> = {
    'LavandiaRoom': 10, // Exemple: niveau 10 requis pour Lavandia
    'Road1Room': 5     // Exemple: niveau 5 requis pour Road1
  };

  const requiredLevel = levelRequirements[toZone];
  if (requiredLevel && playerLevel < requiredLevel) {
    return {
      allowed: false,
      reason: `Niveau ${requiredLevel} requis pour accéder à cette zone`
    };
  }

  // 3. Autres validations futures (objets requis, quêtes, etc.)
  
  return { allowed: true };
}

console.log("✅ Configuration du système de channels chargée");