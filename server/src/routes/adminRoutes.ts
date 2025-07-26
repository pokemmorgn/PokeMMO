// server/src/routes/adminRoutes.ts
import express from 'express';
import { PlayerData } from '../models/PlayerData';
import { OwnedPokemon } from '../models/OwnedPokemon';
import { PlayerQuest } from '../models/PlayerQuest';
import { Inventory } from '../models/Inventory';
import { PokedexEntry } from '../models/PokedexEntry';
import { PokedexStats } from '../models/PokedexStats';
import { QuestData } from '../models/QuestData'; // ✅ AJOUT: Import du modèle QuestData
import { GameObjectData } from '../models/GameObjectData';
import { NpcData } from '../models/NpcData'; // ✅ Correct
import { ShopData } from '../models/ShopData.js'


import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MongoClient, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import * as fsSync from 'fs';  // ← AJOUTER CETTE LIGNE

const router = express.Router();
const execAsync = promisify(exec);

interface CollectionStats {
    name: string;
    count: number;
    size: number;
    avgObjSize: number;
}

interface DatabaseStats {
    name: string;
    collections: number;
    dataSize: number;
    indexSize: number;
    totalSize: number;
}

// Fonction pour récupérer la DB Mongoose
async function getMongooseDB() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected via Mongoose');
    }
    return mongoose.connection.db;
}

// Utilitaire pour préparer les requêtes MongoDB
function prepareMongoQuery(query: any): any {
    if (!query || typeof query !== 'object') return {};
    
    const convertedQuery = JSON.parse(JSON.stringify(query));
    
    function convertObjectIds(obj: any): void {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (Array.isArray(obj[key])) {
                    obj[key] = obj[key].map((item: any) => 
                        typeof item === 'string' && ObjectId.isValid(item) 
                            ? new ObjectId(item) 
                            : item
                    );
                } else {
                    convertObjectIds(obj[key]);
                }
            } else if (key === '_id' && typeof obj[key] === 'string' && ObjectId.isValid(obj[key])) {
                obj[key] = new ObjectId(obj[key]);
            }
        }
    }
    
    convertObjectIds(convertedQuery);
    return convertedQuery;
}

// ✅ FONCTION pour récupérer l'adresse MAC du serveur
async function getServerMacAddress(): Promise<string[]> {
  try {
    // Windows
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('getmac /v /fo csv');
      const lines = stdout.split('\n');
      const macAddresses = lines
        .filter(line => line.includes('Physical Address'))
        .map(line => {
          const match = line.match(/([0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2})/);
          return match ? match[1].replace(/-/g, ':').toLowerCase() : null;
        })
        .filter(mac => mac !== null);
      return macAddresses as string[];
    }
    
    // Linux/macOS
    const { stdout } = await execAsync('ip link show || ifconfig');
    const macRegex = /([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/gi;
    const matches = stdout.match(macRegex) || [];
    return matches.map(mac => mac.toLowerCase());
  } catch (error) {
    console.error('❌ Erreur récupération MAC:', error);
    return [];
  }
}

// ✅ MIDDLEWARE de vérification MAC + Dev
const requireMacAndDev = async (req: any, res: any, next: any) => {
  console.log('🔍 [AdminRoute] === NOUVELLE REQUÊTE ADMIN ===');
  console.log('📍 URL:', req.url);
  console.log('🌐 Method:', req.method);
  console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    // 1. Vérifier le token JWT
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth Header:', authHeader ? 'Présent' : 'MANQUANT');
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🎫 Token:', token ? `${token.substring(0, 20)}...` : 'AUCUN');

    if (!token) {
      console.log('❌ [AdminRoute] Pas de token fourni');
      return res.status(401).json({ error: 'Token requis' });
    }

    console.log('🔐 Vérification JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('✅ JWT décodé:', { username: decoded.username, isDev: decoded.isDev, exp: decoded.exp });
    
    // 2. Vérifier que l'utilisateur est développeur
    console.log('👤 Recherche utilisateur dans DB...');
    const player = await PlayerData.findOne({ username: decoded.username });
    console.log('👤 Utilisateur trouvé:', player ? `${player.username} (isDev: ${player.isDev})` : 'AUCUN');
    
    if (!player || !player.isDev) {
      console.log('❌ [AdminRoute] Accès refusé: pas développeur');
      return res.status(403).json({ error: 'Accès développeur requis' });
    }

    // 3. Récupérer l'IP du client
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';
    console.log('🌍 IP Client:', clientIP);

    // 4. Vérification IP (plus permissive pour debug)
    const isLocalhost = clientIP.includes('127.0.0.1') || 
                       clientIP.includes('::1') || 
                       clientIP.includes('localhost') ||
                       clientIP.includes('192.168.') ||
                       clientIP.includes('90.126.88.90') ||
                       clientIP.includes('172.226.148.60') || // GREG
                       clientIP.includes('90.11.142.68') || // LOGAN
                       clientIP.includes('80.15.105.181') ||
                       clientIP.includes('5.51.41.59'); // Bryan
                        

    console.log('🏠 Localhost détecté:', isLocalhost);

    if (isLocalhost) {
      console.log('✅ [AdminRoute] Accès autorisé (localhost/IP autorisée)');
      req.user = decoded;
      req.clientInfo = { ip: clientIP, isLocalhost: true };
      return next();
    }

    console.log(`❌ [AdminRoute] IP non autorisée: ${clientIP}`);
    return res.status(403).json({ error: 'IP non autorisée' });

} catch (error) {
    console.error('❌ [AdminRoute] Erreur middleware:', error);
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

// ✅ ROUTE PRINCIPALE: Dashboard admin
router.get('/dashboard', requireMacAndDev, async (req: any, res) => {
  try {
    const stats = await Promise.all([
      PlayerData.countDocuments(),
      PlayerData.countDocuments({ isActive: true }),
      PlayerData.countDocuments({ isDev: true }),
      OwnedPokemon.countDocuments(),
      PlayerQuest.countDocuments()
    ]);

    const [totalPlayers, activePlayers, developers, totalPokemon, totalQuests] = stats;

    res.json({
      user: req.user.username,
      clientInfo: req.clientInfo,
      serverStats: {
        totalPlayers,
        activePlayers,
        developers,
        totalPokemon,
        totalQuests,
        uptime: Math.floor(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Charger les gameobjects ET NPCs d'une zone depuis MongoDB
router.get('/maps/:mapId/gameobjects', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    console.log(`🗺️ [Maps API] Loading gameobjects and NPCs from MongoDB for zone: ${mapId}`);
    
    // Récupérer les gameobjects et NPCs en parallèle
    const [gameObjects, npcs] = await Promise.all([
      GameObjectData.findByZone(mapId),
      NpcData.findByZone(mapId)
    ]);
    
    // ✅ LOG 1 - Données brutes de la DB
    console.log('🔍 [DEBUG] Raw NPCs from DB:', npcs.map(npc => ({
      id: npc.npcId,
      name: npc.name,
      position: npc.position,
      type: npc.type,
      zone: npc.zone
    })));
    
    console.log(`✅ [Maps API] Found ${gameObjects.length} gameobjects and ${npcs.length} NPCs for ${mapId}`);
    
    // Convertir les gameobjects au format attendu
    const formattedObjects = gameObjects.map(obj => obj.toObjectFormat());
    
   // Convertir les NPCs au format attendu par l'éditeur
const formattedNPCs = npcs.map((npc: any) => ({
  id: npc.npcId,
  type: 'npc',
  name: npc.name,
  // ✅ CORRECTION : Garder les coordonnées en pixels ET ajouter tiles
  x: npc.position.x,  // Coordonnées en pixels pour compatibilité
  y: npc.position.y,  // Coordonnées en pixels pour compatibilité
  position: {         // Position en pixels (format standard)
    x: npc.position.x,
    y: npc.position.y
  },
  sprite: npc.sprite,
  direction: npc.direction,
  npcType: npc.type,
  
  // Propriétés comportementales
  interactionRadius: npc.interactionRadius,
  canWalkAway: npc.canWalkAway,
  autoFacePlayer: npc.autoFacePlayer,
  repeatable: npc.repeatable,
  cooldownSeconds: npc.cooldownSeconds,
  
  // Données spécifiques du type
  npcData: npc.npcData,
  
  // Système de quêtes
  questsToGive: npc.questsToGive,
  questsToEnd: npc.questsToEnd,
  questRequirements: npc.questRequirements,
  questDialogueIds: npc.questDialogueIds,
  
  // Conditions de spawn
  spawnConditions: npc.spawnConditions,
  
  customProperties: {
    originalNPCType: npc.type,
    mongoId: npc._id?.toString(),
    isNPC: true,
    version: npc.version
  }
}));
    
    // ✅ LOG 2 - NPCs après conversion
    console.log('🔍 [DEBUG] Formatted NPCs:', formattedNPCs.map(npc => ({
      id: npc.id,
      type: npc.type,
      name: npc.name,
      x: npc.x,
      y: npc.y,
      sprite: npc.sprite
    })));
    
// ✅ NPC DE TEST avec coordonnées en pixels
const testNPC = {
  id: 9999,
  type: 'npc',
  name: 'Test NPC Debug',
  x: 5 * 16,  // ✅ Convertir en pixels (5 tiles * 16px)
  y: 5 * 16,  // ✅ Convertir en pixels (5 tiles * 16px)
  position: {
    x: 5 * 16,
    y: 5 * 16
  },
  sprite: 'npc_test',
  direction: 'south',
  npcType: 'dialogue',
  customProperties: {
    isTest: true
  }
};
    
    // Combiner objets et NPCs
    const allObjects = [...formattedObjects, ...formattedNPCs, testNPC];
    
    // ✅ LOG 3 - Objets finaux envoyés au client
    console.log('🔍 [DEBUG] All objects sent to client:', {
      totalObjects: allObjects.length,
      gameObjects: formattedObjects.length,
      npcs: formattedNPCs.length,
      testNPC: 1,
      byType: allObjects.reduce((acc, obj) => {
        acc[obj.type] = (acc[obj.type] || 0) + 1;
        return acc;
      }, {}),
      sampleObjects: allObjects.slice(0, 3).map(obj => ({
        id: obj.id,
        type: obj.type,
        name: obj.name,
        x: obj.x,
        y: obj.y
      }))
    });
    
    res.json({
      success: true,
      data: {
        zone: mapId,
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        description: `${mapId} - Objects and NPCs from MongoDB`,
        defaultRequirements: {
          ground: { minLevel: 1 },
          hidden: { minLevel: 1 }
        },
        requirementPresets: {
          starter: { minLevel: 1 }
        },
        objects: allObjects
      },
      mapId,
      objectCount: gameObjects.length,
      npcCount: npcs.length,
      totalCount: allObjects.length
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error loading gameobjects and NPCs from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des objets et NPCs depuis la base de données'
    });
  }
});

// ✅ ROUTE: Sauvegarder les gameobjects d'une zone
// ✅ ROUTE: Sauvegarder les gameobjects ET NPCs d'une zone dans MongoDB
router.post('/maps/:mapId/gameobjects', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    const mapData = req.body;
    
    console.log(`💾 [Maps API] Saving gameobjects and NPCs to MongoDB for zone: ${mapId}`);
    console.log(`📊 [Maps API] Total objects: ${mapData.objects?.length || 0}`);
    
    if (!mapData.objects || !Array.isArray(mapData.objects)) {
      return res.status(400).json({
        success: false,
        error: 'Format de données invalide - objects array requis'
      });
    }
    
    // Séparer les objets et les NPCs
    const gameObjects = mapData.objects.filter((obj: any) => obj.type !== 'npc');
    const npcs = mapData.objects.filter((obj: any) => obj.type === 'npc');
    
    console.log(`📊 [Maps API] GameObjects: ${gameObjects.length}, NPCs: ${npcs.length}`);
    
    // Supprimer tous les objets et NPCs existants de cette zone
await Promise.all([
  GameObjectData.deleteMany({ zone: mapId }),
  NpcData.deleteMany({ zone: mapId })
]);
    
    console.log(`🗑️ [Maps API] Cleared existing objects and NPCs for zone: ${mapId}`);
    
    let savedGameObjects = 0;
    let savedNPCs = 0;
    const errors: string[] = [];
    
    // Sauvegarder les gameobjects
    for (const obj of gameObjects) {
      try {
        if (!obj.id || !obj.type || (!obj.position && (!obj.x || !obj.y))) {
          errors.push(`GameObject manque des champs requis: ${JSON.stringify(obj)}`);
          continue;
        }
        
        const gameObject = new GameObjectData({
          objectId: obj.id,
          zone: mapId,
          name: obj.name || undefined,
          type: obj.type === 'ground_item' ? 'ground' : 
                obj.type === 'hidden_item' ? 'hidden' : obj.type,
          position: {
            x: obj.position?.x || obj.x,
            y: obj.position?.y || obj.y
          },
          itemId: obj.itemId,
          sprite: obj.sprite,
          quantity: obj.quantity || 1,
          cooldownHours: obj.cooldown || obj.cooldownHours || 24,
          searchRadius: obj.searchRadius,
          itemfinderRadius: obj.itemfinderRadius,
          findChance: obj.findChance,
          requirements: obj.requirements,
          customProperties: obj.customProperties || {},
          rarity: obj.rarity || 'common',
          isActive: true,
          version: '2.0.0',
          sourceFile: `editor_${mapId}`
        });
        
        await gameObject.save();
        savedGameObjects++;
        
      } catch (error) {
        const errorMsg = `GameObject ${obj.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌ [Maps API] Error saving gameobject:', errorMsg);
      }
    }
    
   // ✅ Sauvegarde adaptée au modèle NpcData
if (npcs.length > 0) {
  for (const npc of npcs) {
    try {
      if (!npc.id || !npc.name || (!npc.position && (!npc.x || !npc.y))) {
        errors.push(`NPC manque des champs requis: ${JSON.stringify(npc)}`);
        continue;
      }
      
      const npcObject = new NpcData({
        npcId: npc.id,
        zone: mapId,
        name: npc.name,
        type: npc.npcType || npc.customProperties?.originalNPCType || 'dialogue',
        position: {
          x: npc.position?.x || npc.x,
          y: npc.position?.y || npc.y
        },
        sprite: npc.sprite || 'npc_default',
        direction: npc.direction || 'south',
        
        // Propriétés comportementales
        interactionRadius: npc.interactionRadius || 32,
        canWalkAway: npc.canWalkAway || false,
        autoFacePlayer: npc.autoFacePlayer !== false,
        repeatable: npc.repeatable !== false,
        cooldownSeconds: npc.cooldownSeconds || 0,
        
        // Données spécifiques du type
        npcData: npc.npcData || {},
        
        // Système de quêtes
        questsToGive: npc.questsToGive || [],
        questsToEnd: npc.questsToEnd || [],
        questRequirements: npc.questRequirements,
        questDialogueIds: npc.questDialogueIds,
        
        // Conditions de spawn
        spawnConditions: npc.spawnConditions,
        
        // Métadonnées
        isActive: true,
        version: '1.0.0',
        sourceFile: `editor_${mapId}`
      });
      
      await npcObject.save();
      savedNPCs++;
      
    } catch (error) {
      const errorMsg = `NPC ${npc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌ [Maps API] Error saving NPC:', errorMsg);
    }
  }
}
    
    const totalSaved = savedGameObjects + savedNPCs;
    const totalAttempted = gameObjects.length + npcs.length;
    
    console.log(`✅ [Maps API] Saved ${totalSaved}/${totalAttempted} objects for ${mapId} (${savedGameObjects} gameobjects, ${savedNPCs} NPCs)`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [Maps API] ${errors.length} errors during save:`, errors);
    }
    
    res.json({
      success: true,
      message: `Objects sauvegardés pour ${mapId}`,
      mapId,
      totalObjects: totalSaved,
      gameObjects: savedGameObjects,
      npcs: savedNPCs,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      savedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error saving objects and NPCs to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde des objets et NPCs'
    });
  }
});

// ✅ ROUTE: Statistiques des gameobjects et NPCs
router.get('/maps/gameobjects/stats', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📊 [Maps API] Getting gameobjects and NPCs statistics from MongoDB');
    
    const [
      totalObjects,
      activeObjects,
      typeStats,
      zoneStats,
      totalNPCs,
      activeNPCs,
      npcTypeStats
    ] = await Promise.all([
      GameObjectData.countDocuments(),
      GameObjectData.countDocuments({ isActive: true }),
      GameObjectData.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      GameObjectData.aggregate([{ $group: { _id: '$zone', count: { $sum: 1 } } }]),
     NpcData.countDocuments(),
  NpcData.countDocuments({ isActive: true }),
  NpcData.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
    ]);
    
    res.json({
      success: true,
      stats: {
        gameObjects: {
          total: totalObjects,
          active: activeObjects,
          inactive: totalObjects - activeObjects,
          byType: typeStats.reduce((acc: any, stat: any) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        },
        npcs: {
          total: totalNPCs,
          active: activeNPCs,
          inactive: totalNPCs - activeNPCs,
          byType: npcTypeStats.reduce((acc: any, stat: any) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        },
        zones: zoneStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        totals: {
          allObjects: totalObjects + totalNPCs,
          allActive: activeObjects + activeNPCs
        }
      }
    });
  } catch (error) {
    console.error('❌ [Maps API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur statistiques'
    });
  }
});

// ✅ ROUTE: Supprimer tous les gameobjects d'une zone
router.delete('/maps/:mapId/gameobjects/clear', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    console.log(`🗑️ [Maps API] Clearing all gameobjects for zone: ${mapId}`);
    
    const result = await GameObjectData.deleteMany({ zone: mapId });
    
    console.log(`✅ [Maps API] Cleared ${result.deletedCount} gameobjects for ${mapId}`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} gameobjects supprimés pour ${mapId}`,
      deletedCount: result.deletedCount,
      clearedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error clearing gameobjects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur suppression gameobjects'
    });
  }
});

// ✅ ROUTE: Dupliquer les gameobjects d'une zone vers une autre
router.post('/maps/:sourceMapId/gameobjects/duplicate/:targetMapId', requireMacAndDev, async (req: any, res) => {
  try {
    const { sourceMapId, targetMapId } = req.params;
    console.log(`📋 [Maps API] Duplicating gameobjects from ${sourceMapId} to ${targetMapId}`);
    
    // Récupérer les objets source
    const sourceObjects = await GameObjectData.findByZone(sourceMapId);
    
    if (sourceObjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Aucun gameobject trouvé dans la zone source: ${sourceMapId}`
      });
    }
    
    // Supprimer les objets existants dans la zone cible
    await GameObjectData.deleteMany({ zone: targetMapId });
    
    // Dupliquer les objets
    let duplicatedCount = 0;
    for (const sourceObj of sourceObjects) {
      try {
        const duplicatedObj = new GameObjectData({
          ...sourceObj.toObject(),
          _id: undefined, // Nouveau document
          zone: targetMapId,
          sourceFile: `duplicated_from_${sourceMapId}`,
          lastUpdated: new Date()
        });
        
        await duplicatedObj.save();
        duplicatedCount++;
      } catch (error) {
        console.error(`❌ Error duplicating object ${sourceObj.objectId}:`, error);
      }
    }
    
    console.log(`✅ [Maps API] Duplicated ${duplicatedCount}/${sourceObjects.length} gameobjects`);
    
    res.json({
      success: true,
      message: `${duplicatedCount} gameobjects dupliqués de ${sourceMapId} vers ${targetMapId}`,
      sourceZone: sourceMapId,
      targetZone: targetMapId,
      duplicatedCount,
      duplicatedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error duplicating gameobjects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur duplication gameobjects'
    });
  }
});

// ✅ ROUTE: Récupérer tous les items depuis items.json (dev + production)
router.get('/items', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📦 [AdminAPI] Loading items.json...');
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Détecter si on est en mode build ou dev
    const isDev = __filename.includes('/src/');
    console.log('🔧 [AdminAPI] Mode détecté:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
    
    let itemsPath: string;
    
    if (isDev) {
      // Mode développement : server/src/data/items.json
      itemsPath = path.join(__dirname, '../data/items.json');
    } else {
      // Mode production : server/build/data/items.json  
      itemsPath = path.join(__dirname, '../data/items.json');
    }
    
    console.log('📂 [AdminAPI] Items path:', itemsPath);
    
    try {
      const itemsData = await fs.readFile(itemsPath, 'utf8');
      const items = JSON.parse(itemsData);
      
      console.log(`✅ [AdminAPI] Items loaded: ${Object.keys(items).length} items`);
      
      res.json(items);
      
    } catch (fileError) {
      console.error('❌ [AdminAPI] Error reading items.json:', fileError);
      console.log('📂 [AdminAPI] Tried path:', itemsPath);
      
      // Essayer plusieurs chemins possibles
      const possiblePaths = [
        path.join(__dirname, '../data/items.json'),           // Relatif normal
        path.join(__dirname, '../../data/items.json'),        // Un niveau plus haut
        path.join(process.cwd(), 'server/build/data/items.json'), // Absolu build
        path.join(process.cwd(), 'server/src/data/items.json'),   // Absolu src
        path.join(process.cwd(), 'server/data/items.json'),       // Racine server
        path.join(process.cwd(), 'data/items.json')               // Racine projet
      ];
      
      console.log('🔍 [AdminAPI] Trying alternative paths...');
      
      for (const altPath of possiblePaths) {
        try {
          console.log('📂 [AdminAPI] Trying:', altPath);
          const altItemsData = await fs.readFile(altPath, 'utf8');
          const altItems = JSON.parse(altItemsData);
          
          console.log(`✅ [AdminAPI] Items found at: ${altPath} (${Object.keys(altItems).length} items)`);
          return res.json(altItems);
          
        } catch (altError) {
          // Continue à l'itération suivante
        }
      }
      
      // Aucun chemin n'a fonctionné
      console.error('❌ [AdminAPI] Items.json not found in any location');
      res.status(404).json({ 
        error: 'Fichier items.json non trouvé',
        searchedPaths: possiblePaths
      });
    }
    
  } catch (error) {
    console.error('❌ [AdminAPI] Error loading items:', error);
    res.status(500).json({ 
      error: 'Erreur chargement items',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ ROUTE: Liste complète des joueurs avec données détaillées
router.get('/players', requireMacAndDev, async (req: any, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const players = await PlayerData.find(query)
      .select('-password -deviceFingerprint') // Exclure données sensibles
      .sort({ lastLogin: -1 })
      .limit(parseInt(limit as string) * 1)
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .lean();

    const total = await PlayerData.countDocuments(query);

    res.json({
      players,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération joueurs' });
  }
});

// ✅ ROUTE: Détails d'un joueur spécifique
router.get('/players/:username', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    const [player, pokemon, quests] = await Promise.all([
      PlayerData.findOne({ username }).select('-password'),
      OwnedPokemon.find({ owner: username }).lean(),
      PlayerQuest.findOne({ username }).lean()
    ]);

    if (!player) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }

    res.json({
      player: player.toObject(),
      pokemon: pokemon || [],
      quests: quests || { activeQuests: [], completedQuests: [] },
      stats: {
        totalPokemon: pokemon?.length || 0,
        activeQuests: quests?.activeQuests?.length || 0,
        completedQuests: quests?.completedQuests?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération détails joueur' });
  }
});

// ✅ ROUTE: Modifier un joueur (DANGEREUX - bien sécuriser)
router.put('/players/:username', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;
    
    // ✅ WHITELIST des champs modifiables
    const allowedFields = ['gold', 'level', 'experience', 'lastX', 'lastY', 'lastMap', 'isDev', 'isActive', 'isBanned'];
    const sanitizedUpdates: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const player = await PlayerData.findOneAndUpdate(
      { username },
      sanitizedUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!player) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }

    console.log(`🔧 [Admin] ${req.user.username} a modifié ${username}:`, sanitizedUpdates);

    res.json({
      message: 'Joueur modifié avec succès',
      player: player.toObject(),
      modifiedBy: req.user.username,
      modifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur modification joueur:', error);
    res.status(500).json({ error: 'Erreur modification joueur' });
  }
});

// ✅ ROUTE: Recherche en temps réel
router.post('/search', requireMacAndDev, async (req: any, res) => {
  try {
    const { query, type = 'players' } = req.body;
    
    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

let results: Array<{ username: string; email?: string; level?: number; gold?: number; lastLogin: Date; isActive: boolean; isDev?: boolean }> = [];

    if (type === 'players') {
      results = await PlayerData.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      })
      .select('username email level gold lastLogin isActive isDev')
      .limit(20)
      .lean();
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Erreur recherche' });
  }
});

// ✅ ROUTE: Actions en lot
router.post('/bulk-actions', requireMacAndDev, async (req: any, res) => {
  try {
    const { action, usernames } = req.body;
    
    if (!action || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: 'Action et liste d\'utilisateurs requises' });
    }

    let updateOperation: any = {};
    let results: any = { success: 0, failed: 0, details: [] };

    switch (action) {
      case 'activate':
        updateOperation = { isActive: true };
        break;
      case 'deactivate':
        updateOperation = { isActive: false };
        break;
      case 'reset_gold':
        updateOperation = { gold: 1000 };
        break;
      default:
        return res.status(400).json({ error: 'Action non supportée' });
    }

    for (const username of usernames) {
      try {
        const result = await PlayerData.updateOne({ username }, updateOperation);
        if (result.matchedCount > 0) {
          results.success++;
          results.details.push({ username, status: 'success' });
        } else {
          results.failed++;
          results.details.push({ username, status: 'not_found' });
        }
      } catch (error) {
        results.failed++;
        results.details.push({ username, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log(`🔧 [Admin] ${req.user.username} a effectué l'action '${action}' sur ${usernames.length} utilisateurs`);

    res.json({
      message: `Action '${action}' terminée`,
      results,
      executedBy: req.user.username,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur action en lot' });
  }
});

// ✅ NOUVEAU: Routes pour gestion des quêtes dans adminRoutes.ts

// ✅ ROUTE: Lister toutes les quêtes depuis MongoDB
router.get('/quests', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('🎯 [Quests API] Loading quests from MongoDB...');
    
    const quests = await QuestData.find({ isActive: true })
      .sort({ category: 1, questId: 1 })
      .lean();
    
    console.log(`✅ [Quests API] ${quests.length} quests loaded from database`);
    
    res.json({
      quests: quests.map(quest => ({
        id: quest.questId,
        name: quest.name,
        description: quest.description,
        category: quest.category,
        startNpcId: quest.startNpcId,
        endNpcId: quest.endNpcId,
        isRepeatable: quest.isRepeatable,
        autoComplete: quest.autoComplete,
        dialogues: quest.dialogues,
        steps: quest.steps
      })),
      total: quests.length,
      lastModified: new Date()
    });
  } catch (error) {
    console.error('❌ Erreur lecture quêtes MongoDB:', error);
    res.status(500).json({ error: 'Erreur lecture base de données' });
  }
});

// ✅ ROUTE: Ajouter une nouvelle quête dans MongoDB
router.post('/quests', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('🎯 [Quests API] Creating new quest in MongoDB...');
    
    const questData = {
      questId: req.body.id || `quest_${Date.now()}`,
      name: req.body.name || 'Nouvelle Quête',
      description: req.body.description || 'Description de la quête',
      category: req.body.category || 'side',
      startNpcId: req.body.startNpcId || null,
      endNpcId: req.body.endNpcId || null,
      isRepeatable: req.body.isRepeatable || false,
      autoComplete: req.body.autoComplete !== false,
      dialogues: req.body.dialogues || {
        questOffer: ["Dialogue d'offre par défaut"],
        questInProgress: ["Dialogue en cours par défaut"],
        questComplete: ["Dialogue de fin par défaut"]
      },
      steps: req.body.steps || [],
      isActive: true,
      version: '2.0.0'
    };
    
    // Vérifier que l'ID n'existe pas déjà
    const existing = await QuestData.findOne({ questId: questData.questId });
    if (existing) {
      return res.status(400).json({ error: 'Une quête avec cet ID existe déjà' });
    }
    
    const newQuest = await QuestData.create(questData);
    
    console.log(`🎯 [Admin] ${req.user.username} a ajouté la quête: ${questData.questId}`);
    
    res.json({
      message: 'Quête ajoutée avec succès',
      quest: {
        id: newQuest.questId,
        name: newQuest.name,
        category: newQuest.category,
        steps: newQuest.steps
      }
    });
  } catch (error) {
    console.error('❌ Erreur ajout quête MongoDB:', error);
    res.status(500).json({ error: 'Erreur sauvegarde quête' });
  }
});

// ✅ ROUTE: Modifier une quête existante dans MongoDB
router.put('/quests/:questId', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`🎯 [Quests API] Updating quest: ${req.params.questId}`);
    
    const quest = await QuestData.findOne({ questId: req.params.questId });
    if (!quest) {
      return res.status(404).json({ error: 'Quête non trouvée' });
    }
    
    // Mettre à jour avec les nouvelles données
    await quest.updateFromJson(req.body);
    
    console.log(`🎯 [Admin] ${req.user.username} a modifié la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête modifiée avec succès',
      quest: {
        id: quest.questId,
        name: quest.name,
        category: quest.category,
        steps: quest.steps
      }
    });
  } catch (error) {
    console.error('❌ Erreur modification quête MongoDB:', error);
    res.status(500).json({ error: 'Erreur modification quête' });
  }
});

// ✅ ROUTE: Supprimer une quête de MongoDB
router.delete('/quests/:questId', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`🎯 [Quests API] Deleting quest: ${req.params.questId}`);
    
    const quest = await QuestData.findOneAndDelete({ questId: req.params.questId });
    if (!quest) {
      return res.status(404).json({ error: 'Quête non trouvée' });
    }
    
    console.log(`🗑️ [Admin] ${req.user.username} a supprimé la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête supprimée avec succès',
      deletedQuest: {
        id: quest.questId,
        name: quest.name
      }
    });
  } catch (error) {
    console.error('❌ Erreur suppression quête MongoDB:', error);
    res.status(500).json({ error: 'Erreur suppression quête' });
  }
});

// ✅ ROUTE: Dupliquer une quête dans MongoDB
router.post('/quests/:questId/duplicate', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`🎯 [Quests API] Duplicating quest: ${req.params.questId}`);
    
    const originalQuest = await QuestData.findOne({ questId: req.params.questId });
    if (!originalQuest) {
      return res.status(404).json({ error: 'Quête originale non trouvée' });
    }
    
    const duplicatedQuestData = {
  questId: `${originalQuest.questId}_copy_${Date.now()}`,
  name: `${originalQuest.name} (Copie)`,
  description: originalQuest.description,
  category: originalQuest.category,
  startNpcId: originalQuest.startNpcId,
  endNpcId: originalQuest.endNpcId,
  isRepeatable: originalQuest.isRepeatable,
  autoComplete: originalQuest.autoComplete,
  dialogues: originalQuest.dialogues,
  steps: originalQuest.steps,
  isActive: originalQuest.isActive,
  version: originalQuest.version,
  metadata: originalQuest.metadata,
  config: originalQuest.config,
  lastUpdated: new Date()
};
    
    const duplicatedQuest = await QuestData.create(duplicatedQuestData);
    
    console.log(`📋 [Admin] ${req.user.username} a dupliqué la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête dupliquée avec succès',
      quest: {
        id: duplicatedQuest.questId,
        name: duplicatedQuest.name
      }
    });
  } catch (error) {
    console.error('❌ Erreur duplication quête MongoDB:', error);
    res.status(500).json({ error: 'Erreur duplication quête' });
  }
});

// ✅ ROUTE: Liste des quêtes pour le sélecteur NPC
router.get('/quests/list', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📋 [Quests API] Loading quests list for NPC selector...');
    
    const quests = await QuestData.find({ isActive: true })
      .select('questId name description category startNpcId endNpcId isRepeatable')
      .sort({ category: 1, name: 1 })
      .lean();
    
    console.log(`✅ [Quests API] ${quests.length} quests loaded for selector`);
    
    // Formater pour le sélecteur
    const formattedQuests = quests.map(quest => ({
      id: quest.questId,
      name: quest.name,
      description: quest.description || 'Aucune description',
      category: quest.category || 'general',
      startNpcId: quest.startNpcId,
      endNpcId: quest.endNpcId,
      isRepeatable: quest.isRepeatable || false
    }));
    
    res.json({
      success: true,
      quests: formattedQuests,
      total: formattedQuests.length
    });
    
  } catch (error) {
    console.error('❌ [Quests API] Error loading quests for selector:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du chargement des quêtes',
      quests: []
    });
  }
});

// ✅ ROUTE: Recharger le système de quêtes (validation MongoDB)
router.post('/quests/reload', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`🔄 [Admin] ${req.user.username} a demandé validation système quêtes`);
    
    // Valider l'intégrité de la base de données
    const validation = await QuestData.validateDatabaseIntegrity();
    
    let message = 'Système de quêtes validé avec succès';
    if (!validation.valid) {
      message += ` - ${validation.issues.length} problèmes détectés`;
    }
    
    res.json({
      message,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur validation système quêtes:', error);
    res.status(500).json({ error: 'Erreur validation système' });
  }
});

// ✅ ROUTE: Statistiques des quêtes MongoDB
router.get('/quests/stats', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📊 [Quests API] Getting quest statistics from MongoDB');
    
    const [
      totalQuests,
      activeQuests,
      categoryStats,
      repeatableQuests,
      questsByDifficulty
    ] = await Promise.all([
      QuestData.countDocuments(),
      QuestData.countDocuments({ isActive: true }),
      QuestData.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      QuestData.countDocuments({ isRepeatable: true }),
      QuestData.aggregate([
        { $group: { _id: '$metadata.difficulty', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalQuests,
        active: activeQuests,
        inactive: totalQuests - activeQuests,
        repeatable: repeatableQuests,
        categories: categoryStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        difficulties: questsByDifficulty.reduce((acc: any, stat: any) => {
          acc[stat._id || 'unknown'] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats quêtes MongoDB:', error);
    res.status(500).json({ error: 'Erreur statistiques' });
  }
});

// ✅ ROUTE: Migrer toutes les quêtes vers la dernière version
router.post('/quests/migrate', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`🔄 [Admin] ${req.user.username} a lancé la migration des quêtes`);
    
    const migrationResult = await QuestData.migrateAllToLatestVersion();
    
    res.json({
      message: 'Migration terminée',
      migrated: migrationResult.migrated,
      errors: migrationResult.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur migration quêtes:', error);
    res.status(500).json({ error: 'Erreur migration' });
  }
});




// ✅ ROUTE: Logs système (simulé)
router.get('/logs', requireMacAndDev, async (req: any, res) => {
  try {
    const { type = 'all', limit = 100 } = req.query;
    
    // Pour l'instant, on simule des logs. À remplacer par un vrai système de logs
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'auth',
        message: 'Utilisateur connecté',
        details: { username: 'TestUser', ip: '192.168.1.100' }
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'warning',
        type: 'game',
        message: 'Tentative de capture impossible',
        details: { username: 'AnotherUser', pokemon: 'Pikachu', reason: 'PokeBall insuffisantes' }
      },
      {
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'error',
        type: 'database',
        message: 'Erreur de connexion MongoDB',
        details: { error: 'Connection timeout', duration: '5s' }
      }
    ];

    const filteredLogs = type === 'all' ? mockLogs : mockLogs.filter(log => log.type === type);

    res.json({
      logs: filteredLogs.slice(0, parseInt(limit as string)),
      total: filteredLogs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération logs' });
  }
});

// ✅ ROUTE: Récupérer l'équipe Pokémon d'un joueur
router.get('/players/:username/team', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    console.log(`📊 [AdminAPI] Récupération équipe pour: ${username}`);
    
    // Vérifier que le joueur existe
    const player = await PlayerData.findOne({ username });
    if (!player) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }

    // Récupérer l'équipe avec les détails des Pokémon
    const teamPokemon = await OwnedPokemon.find({
      owner: username,
      isInTeam: true
    }).sort({ slot: 1 });

    // Formater la réponse
    const teamData = {
      username,
      pokemon: teamPokemon.map(pokemon => ({
        id: pokemon._id.toString(),
        pokemonId: pokemon.pokemonId,
        nickname: pokemon.nickname,
        level: pokemon.level,
        experience: pokemon.experience,
        currentHp: pokemon.currentHp,
        maxHp: pokemon.maxHp,
        status: pokemon.status,
        nature: pokemon.nature,
        ability: pokemon.ability,
        gender: pokemon.gender,
        isShiny: pokemon.shiny,
        stats: {
          hp: pokemon.maxHp,
          attack: pokemon.calculatedStats.attack,
          defense: pokemon.calculatedStats.defense,
          specialAttack: pokemon.calculatedStats.spAttack,
          specialDefense: pokemon.calculatedStats.spDefense,
          speed: pokemon.calculatedStats.speed
        },
        moves: pokemon.moves.map(move => ({
          moveId: move.moveId,
          currentPp: move.currentPp,
          maxPp: move.maxPp
        })),
        slot: pokemon.slot,
        originalTrainer: pokemon.originalTrainer,
        catchDate: pokemon.caughtAt,
        pokeball: pokemon.pokeball,
        happiness: pokemon.friendship,
        heldItem: pokemon.heldItem
      })),
      activePokemon: teamPokemon.length > 0 ? 
        teamPokemon.findIndex(p => p.slot === 0) : -1,
      count: teamPokemon.length
    };

    res.json(teamData);
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur récupération équipe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Remplacez complètement la route POST /players/:username/team/add par :
router.post('/players/:username/team/add', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    const { pokemonId, level = 50, nickname } = req.body;

    console.log(`➕ [AdminAPI] Ajout Pokémon ${pokemonId} à l'équipe de ${username}`);

    // Vérifications
    const player = await PlayerData.findOne({ username });
    if (!player) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }

    // Compter l'équipe actuelle
    const teamCount = await OwnedPokemon.countDocuments({
      owner: username,
      isInTeam: true
    });

    if (teamCount >= 6) {
      return res.status(400).json({ error: 'Équipe pleine (6 Pokémon maximum)' });
    }

    // Calculer les stats de base (formule simplifiée)
    const pokemonLevel = Math.min(100, Math.max(1, parseInt(level)));
    const baseHp = Math.floor(((2 * 50 + 15 + 0) * pokemonLevel) / 100) + pokemonLevel + 10;
    const baseStat = Math.floor(((2 * 50 + 15 + 0) * pokemonLevel) / 100) + 5;

    // Créer le nouveau Pokémon avec TOUS les champs requis
    const newPokemon = new OwnedPokemon({
      owner: username,
      pokemonId: parseInt(pokemonId),
      level: pokemonLevel,
      experience: 0,
      nickname: nickname || undefined,
      nature: 'hardy',
      ability: 'overgrow',
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      shiny: Math.random() < 0.001,
      
      // IVs aléatoires
      ivs: {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        spAttack: Math.floor(Math.random() * 32),
        spDefense: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32)
      },
      
      // EVs à zéro
      evs: {
        hp: 0, attack: 0, defense: 0,
        spAttack: 0, spDefense: 0, speed: 0
      },
      
      // ✅ CHAMPS REQUIS - Stats calculées
      calculatedStats: {
        attack: baseStat,
        defense: baseStat,
        spAttack: baseStat,
        spDefense: baseStat,
        speed: baseStat
      },
      
      // ✅ CHAMPS REQUIS - HP
      currentHp: baseHp,
      maxHp: baseHp,
      
      // Attaques de base
      moves: [
        { moveId: 'tackle', currentPp: 35, maxPp: 35 }
      ],
      
      // Équipe
      isInTeam: true,
      slot: teamCount,
      
      // Métadonnées
      originalTrainer: username,
      pokeball: 'poke_ball',
      friendship: 70
    });

    console.log('💾 [AdminAPI] Sauvegarde du Pokémon...');
    await newPokemon.save();
    
    console.log(`✅ [Admin] ${req.user.username} a ajouté un Pokémon #${pokemonId} à ${username}`);
    
    res.json({ 
      message: 'Pokémon ajouté à l\'équipe avec succès',
      pokemon: {
        id: newPokemon._id.toString(),
        pokemonId: newPokemon.pokemonId,
        level: newPokemon.level,
        nickname: newPokemon.nickname,
        slot: newPokemon.slot
      }
    });
    
} catch (error) {
    console.error('❌ [AdminAPI] Erreur ajout Pokémon:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (errorStack) {
      console.error('❌ Stack trace:', errorStack);
    }
    
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: errorMessage
    });
  }
});

// ✅ ROUTE: Soigner tous les Pokémon de l'équipe
router.post('/players/:username/team/heal-all', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    console.log(`💚 [AdminAPI] Soin de l'équipe de ${username}`);

    const result = await OwnedPokemon.updateMany(
      { owner: username, isInTeam: true },
      {
        $set: {
          status: 'normal',
          statusTurns: undefined
        }
      }
    );

    // Mettre à jour les HP et PP individuellement (MongoDB ne supporte pas les références dans $set)
    const teamPokemon = await OwnedPokemon.find({ owner: username, isInTeam: true });
    for (const pokemon of teamPokemon) {
      pokemon.currentHp = pokemon.maxHp;
      pokemon.moves.forEach(move => {
        move.currentPp = move.maxPp;
      });
      await pokemon.save();
    }

    console.log(`✅ [Admin] ${req.user.username} a soigné l'équipe de ${username}`);

    res.json({ 
      message: `${result.matchedCount} Pokémon soignés`,
      count: result.matchedCount
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur soin équipe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Définir le Pokémon actif
router.post('/players/:username/team/set-active', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    const { index } = req.body;
    
    console.log(`⭐ [AdminAPI] Pokémon actif ${index} pour ${username}`);

    // Récupérer l'équipe
    const teamPokemon = await OwnedPokemon.find({
      owner: username,
      isInTeam: true
    }).sort({ slot: 1 });

    if (index >= teamPokemon.length) {
      return res.status(400).json({ error: 'Index invalide' });
    }

    // Réassigner les slots
    for (let i = 0; i < teamPokemon.length; i++) {
      teamPokemon[i].slot = i === index ? 0 : i + 1;
      await teamPokemon[i].save();
    }

    console.log(`✅ [Admin] ${req.user.username} a changé le Pokémon actif de ${username}`);

    res.json({ message: 'Pokémon actif modifié' });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur changement Pokémon actif:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Retirer un Pokémon de l'équipe
router.delete('/players/:username/team/:pokemonId', requireMacAndDev, async (req: any, res) => {
  try {
    const { username, pokemonId } = req.params;
    
    console.log(`🗑️ [AdminAPI] Retrait Pokémon ${pokemonId} de l'équipe de ${username}`);

    const pokemon = await OwnedPokemon.findById(pokemonId);
    if (!pokemon || pokemon.owner !== username) {
      return res.status(404).json({ error: 'Pokémon non trouvé' });
    }

    // Retirer de l'équipe (ne pas supprimer, juste désactiver)
    pokemon.isInTeam = false;
    pokemon.slot = undefined;
    await pokemon.save();

    console.log(`✅ [Admin] ${req.user.username} a retiré un Pokémon de l'équipe de ${username}`);

    res.json({ message: 'Pokémon retiré de l\'équipe' });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur retrait Pokémon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Récupérer l'inventaire d'un joueur
router.get('/players/:username/inventory', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    console.log(`🎒 [AdminAPI] Récupération inventaire pour: ${username}`);

    let inventory = await Inventory.findOne({ username });
    
    // Créer un inventaire vide si n'existe pas
    if (!inventory) {
      inventory = new Inventory({ username });
      await inventory.save();
    }

    res.json({
      username,
      items: inventory.items || [],
      medicine: inventory.medicine || [],
      balls: inventory.balls || [],
      berries: inventory.berries || [],
      key_items: inventory.key_items || [],
      tms: inventory.tms || [],
      battle_items: inventory.battle_items || [],
      valuables: inventory.valuables || [],
      held_items: inventory.held_items || [],
      totalItems: Object.values(inventory.toObject()).reduce((total, category) => {
        if (Array.isArray(category)) {
          return total + category.reduce((sum, item: any) => sum + (item.quantity || 0), 0);
        }
        return total;
      }, 0)
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur récupération inventaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Ajouter un objet à l'inventaire
router.post('/players/:username/inventory/add', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    const { category, itemId, quantity = 1 } = req.body;
    
    console.log(`➕ [AdminAPI] Ajout ${quantity}x ${itemId} (${category}) pour ${username}`);

    let inventory = await Inventory.findOne({ username });
    if (!inventory) {
      inventory = new Inventory({ username });
    }

    // Vérifier que la catégorie existe
    if (!inventory[category]) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }

    // Chercher l'objet existant
    const existingItem = inventory[category].find((item: any) => item.itemId === itemId);
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      inventory[category].push({
        itemId,
        quantity: parseInt(quantity)
      });
    }

    await inventory.save();
    
    console.log(`✅ [Admin] ${req.user.username} a ajouté ${quantity}x ${itemId} à ${username}`);
    
    res.json({ 
      message: `${quantity}x ${itemId} ajouté à l'inventaire`,
      category,
      itemId,
      newQuantity: existingItem ? existingItem.quantity : parseInt(quantity)
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur ajout objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Modifier la quantité d'un objet
router.put('/players/:username/inventory/:category/:itemId', requireMacAndDev, async (req: any, res) => {
  try {
    const { username, category, itemId } = req.params;
    const { quantity } = req.body;
    
    console.log(`✏️ [AdminAPI] Modification ${itemId}: ${quantity} pour ${username}`);

    const inventory = await Inventory.findOne({ username });
    if (!inventory) {
      return res.status(404).json({ error: 'Inventaire non trouvé' });
    }

    const item = inventory[category].find((item: any) => item.itemId === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Objet non trouvé' });
    }

    if (parseInt(quantity) <= 0) {
      // Supprimer l'objet si quantité <= 0
      inventory[category] = inventory[category].filter((item: any) => item.itemId !== itemId);
    } else {
      item.quantity = parseInt(quantity);
    }

    await inventory.save();
    
    console.log(`✅ [Admin] ${req.user.username} a modifié la quantité de ${itemId} pour ${username}`);
    
    res.json({ 
      message: `Quantité de ${itemId} mise à jour`,
      newQuantity: parseInt(quantity)
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur modification objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Supprimer un objet de l'inventaire
router.delete('/players/:username/inventory/:category/:itemId', requireMacAndDev, async (req: any, res) => {
  try {
    const { username, category, itemId } = req.params;
    
    console.log(`🗑️ [AdminAPI] Suppression ${itemId} (${category}) pour ${username}`);

    const inventory = await Inventory.findOne({ username });
    if (!inventory) {
      return res.status(404).json({ error: 'Inventaire non trouvé' });
    }

    inventory[category] = inventory[category].filter((item: any) => item.itemId !== itemId);
    await inventory.save();
    
    console.log(`✅ [Admin] ${req.user.username} a supprimé ${itemId} de l'inventaire de ${username}`);
    
    res.json({ message: `${itemId} supprimé de l'inventaire` });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur suppression objet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Récupérer les statistiques du Pokédex d'un joueur
router.get('/players/:username/pokedex', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    console.log(`📖 [AdminAPI] Récupération Pokédex pour: ${username}`);

    // Récupérer les stats du Pokédex
    let stats = await PokedexStats.findOne({ playerId: username });
if (!stats) {
  stats = await PokedexStats.findOrCreate(username) as any;
}

    // Récupérer quelques entrées récentes
    const recentEntries = await PokedexEntry.find({ playerId: username })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    res.json({
      username,
      totalSeen: stats.totalSeen,
      totalCaught: stats.totalCaught,
      totalPokemon: stats.totalPokemon,
      seenPercentage: stats.seenPercentage,
      caughtPercentage: stats.caughtPercentage,
      records: stats.records,
      activity: stats.activity,
      recentEntries: recentEntries.map(entry => ({
        pokemonId: entry.pokemonId,
        isSeen: entry.isSeen,
        isCaught: entry.isCaught,
        firstSeenAt: entry.firstSeenAt,
        firstCaughtAt: entry.firstCaughtAt,
        timesEncountered: entry.timesEncountered,
        timesCaught: entry.timesCaught,
        isShiny: entry.bestSpecimen?.isShiny || false
      }))
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur récupération Pokédex:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Récupérer les statistiques détaillées d'un joueur
router.get('/players/:username/stats', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    
    console.log(`📈 [AdminAPI] Récupération stats pour: ${username}`);

    // Stats de base du joueur
    const player = await PlayerData.findOne({ username });
    if (!player) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }

    // Stats Pokémon
    const pokemonCount = await OwnedPokemon.countDocuments({ owner: username });
    const teamCount = await OwnedPokemon.countDocuments({ owner: username, isInTeam: true });
    const shinyCount = await OwnedPokemon.countDocuments({ owner: username, shiny: true });
    
    // Stats niveau moyen
    const avgLevelResult = await OwnedPokemon.aggregate([
      { $match: { owner: username } },
      { $group: { _id: null, avgLevel: { $avg: "$level" } } }
    ]);
    
    // Stats Pokédex
    let pokedexStats = await PokedexStats.findOne({ playerId: username });
if (!pokedexStats) {
  pokedexStats = await PokedexStats.findOrCreate(username) as any;
}

    // Stats inventaire
    const inventory = await Inventory.findOne({ username });
    let totalItems = 0;
    if (inventory) {
      const categories = ['items', 'medicine', 'balls', 'berries', 'key_items', 'tms', 'battle_items', 'valuables', 'held_items'];
      totalItems = categories.reduce((total, category) => {
        return total + (inventory[category] || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
      }, 0);
    }

    res.json({
      username,
      player: {
        level: player.level,
        experience: player.experience,
        gold: player.gold,
        totalPlaytime: player.totalPlaytime,
        loginCount: player.loginCount,
        lastLogin: player.lastLogin,
        createdAt: player.createdAt,
        isDev: player.isDev,
        isActive: player.isActive,
        location: {
          map: player.lastMap,
          x: player.lastX,
          y: player.lastY
        }
      },
      pokemon: {
        total: pokemonCount,
        inTeam: teamCount,
        shiny: shinyCount,
        averageLevel: avgLevelResult[0]?.avgLevel || 0,
        pc: pokemonCount - teamCount
      },
      pokedex: {
        seen: pokedexStats.totalSeen,
        caught: pokedexStats.totalCaught,
        percentage: pokedexStats.caughtPercentage,
        shiniesFound: pokedexStats.records.totalShinyCaught,
        longestStreak: pokedexStats.records.longestCaughtStreak
      },
      inventory: {
        totalItems,
        uniqueItems: inventory ? Object.keys(inventory.toObject()).reduce((count, key) => {
          if (Array.isArray(inventory[key])) {
            return count + inventory[key].length;
          }
          return count;
        }, 0) : 0
      },
      activity: {
        lastActivity: player.lastLogin,
        sessionDuration: player.currentSessionStart ? 
          Math.floor((Date.now() - player.currentSessionStart.getTime()) / 1000 / 60) : 0,
        totalSessions: player.loginCount
      }
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Modifier un Pokémon spécifique
router.put('/players/:username/pokemon/:pokemonId', requireMacAndDev, async (req: any, res) => {
  try {
    const { username, pokemonId } = req.params;
    const updates = req.body;
    
    console.log(`✏️ [AdminAPI] Modification Pokémon ${pokemonId} pour ${username}`);

    const pokemon = await OwnedPokemon.findById(pokemonId);
    if (!pokemon || pokemon.owner !== username) {
      return res.status(404).json({ error: 'Pokémon non trouvé' });
    }

    // Appliquer les modifications autorisées
    const allowedFields = ['nickname', 'level', 'experience', 'currentHp', 'status', 'nature', 'friendship'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
(pokemon as any)[field] = updates[field];
      }
    });

    // Validation spéciale pour le niveau
    if (updates.level !== undefined) {
      pokemon.level = Math.min(100, Math.max(1, parseInt(updates.level)));
      await pokemon.recalculateStats();
    }

    // Validation HP
    if (updates.currentHp !== undefined) {
      pokemon.currentHp = Math.min(pokemon.maxHp, Math.max(0, parseInt(updates.currentHp)));
    }

    await pokemon.save();
    
    console.log(`✅ [Admin] ${req.user.username} a modifié le Pokémon ${pokemonId} de ${username}`);
    
    res.json({ 
      message: 'Pokémon modifié avec succès',
      pokemon: {
        id: pokemon._id.toString(),
        nickname: pokemon.nickname,
        level: pokemon.level,
        currentHp: pokemon.currentHp,
        maxHp: pokemon.maxHp,
        status: pokemon.status
      }
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur modification Pokémon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Soigner un Pokémon spécifique
router.post('/players/:username/pokemon/:pokemonId/heal', requireMacAndDev, async (req: any, res) => {
  try {
    const { username, pokemonId } = req.params;
    
    console.log(`💚 [AdminAPI] Soin Pokémon ${pokemonId} pour ${username}`);

    const pokemon = await OwnedPokemon.findById(pokemonId);
    if (!pokemon || pokemon.owner !== username) {
      return res.status(404).json({ error: 'Pokémon non trouvé' });
    }

    // Utiliser la méthode heal() du modèle
    pokemon.heal();
    await pokemon.save();
    
    console.log(`✅ [Admin] ${req.user.username} a soigné le Pokémon ${pokemonId} de ${username}`);
    
    res.json({ 
      message: 'Pokémon soigné avec succès',
      pokemon: {
        id: pokemon._id.toString(),
        currentHp: pokemon.currentHp,
        maxHp: pokemon.maxHp,
        status: pokemon.status
      }
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur soin Pokémon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE: Actions en lot avancées pour un joueur
router.post('/players/:username/bulk-actions', requireMacAndDev, async (req: any, res) => {
  try {
    const { username } = req.params;
    const { action, targets } = req.body;
    
    console.log(`⚡ [AdminAPI] Action en lot "${action}" pour ${username}`);

    let result = { success: 0, failed: 0, message: '' };

    switch (action) {
      case 'heal_all_pokemon':
        const healResult = await OwnedPokemon.updateMany(
          { owner: username },
          { $set: { status: 'normal', statusTurns: undefined } }
        );
        
        // Mettre à jour HP et PP individuellement
        const allPokemon = await OwnedPokemon.find({ owner: username });
        for (const pokemon of allPokemon) {
          pokemon.currentHp = pokemon.maxHp;
          pokemon.moves.forEach(move => {
            move.currentPp = move.maxPp;
          });
          await pokemon.save();
        }
        
        result.success = healResult.matchedCount;
        result.message = `${healResult.matchedCount} Pokémon soignés`;
        break;

      case 'clear_inventory_category':
        if (!targets?.category) {
          return res.status(400).json({ error: 'Catégorie requise' });
        }
        
        const inventory = await Inventory.findOne({ username });
        if (inventory && inventory[targets.category]) {
          const itemCount = inventory[targets.category].length;
          inventory[targets.category] = [];
          await inventory.save();
          result.success = itemCount;
          result.message = `${itemCount} objets supprimés de ${targets.category}`;
        }
        break;

      case 'reset_pokedex':
        const deletedEntries = await PokedexEntry.deleteMany({ playerId: username });
        const deletedStats = await PokedexStats.deleteMany({ playerId: username });
        result.success = deletedEntries.deletedCount + deletedStats.deletedCount;
        result.message = `Pokédex reseté (${deletedEntries.deletedCount} entrées supprimées)`;
        break;

      case 'release_all_pc_pokemon':
        const releasedResult = await OwnedPokemon.deleteMany({
          owner: username,
          isInTeam: false
        });
        result.success = releasedResult.deletedCount;
        result.message = `${releasedResult.deletedCount} Pokémon du PC relâchés`;
        break;

      default:
        return res.status(400).json({ error: 'Action non reconnue' });
    }

    console.log(`✅ [Admin] ${req.user.username} a effectué l'action "${action}" pour ${username}`);

    res.json({
      message: 'Action en lot terminée',
      result
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Erreur action en lot:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// 🗺️ ROUTES POUR L'ÉDITEUR DE CARTES
// ========================================

interface MapObject {
  id: string;
  type: 'npc' | 'object' | 'spawn' | 'teleport';
  x: number;
  y: number;
  name: string;
  properties: Record<string, any>;
}

interface MapData {
  mapId: string;
  mapName: string;
  objects: MapObject[];
  timestamp: string;
  totalObjects: number;
}

// Import nécessaire pour les fichiers (ajoutez en haut du fichier si pas déjà fait)
import { promises as fs } from 'fs';
import path from 'path';

// Dossiers de stockage
const MAPS_DIR = path.join(process.cwd(), 'client/public/assets/maps');
const MAP_OBJECTS_DIR = path.join(process.cwd(), 'server/data/map-objects');

// S'assurer que le dossier existe
async function ensureMapObjectsDir() {
  try {
    await fs.access(MAP_OBJECTS_DIR);
  } catch {
    await fs.mkdir(MAP_OBJECTS_DIR, { recursive: true });
  }
}

// ✅ ROUTE: Liste des cartes disponibles
router.get('/maps/list', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('🗺️ [Maps API] Getting available maps list');
    
    const files = await fs.readdir(MAPS_DIR);
    const tmjFiles = files.filter(file => file.endsWith('.tmj'));
    
    const maps = tmjFiles.map(file => {
      const id = file.replace('.tmj', '');
      return {
        id,
        name: formatMapName(id),
        file
      };
    });
    
    res.json({
      success: true,
      maps,
      total: maps.length
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error listing maps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement de la liste des cartes'
    });
  }
});

// ✅ ROUTE: Charger une carte TMJ
router.get('/maps/:mapId', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    console.log(`🗺️ [Maps API] Loading map data: ${mapId}`);
    
    const mapFile = path.join(MAPS_DIR, `${mapId}.tmj`);
    
    try {
      await fs.access(mapFile);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Carte non trouvée'
      });
    }
    
    const mapData = await fs.readFile(mapFile, 'utf-8');
    const parsedMap = JSON.parse(mapData);
    
    res.json({
      success: true,
      map: parsedMap,
      mapId
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error loading map:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement de la carte'
    });
  }
});

// ✅ ROUTE: Charger les objets d'une carte
router.get('/maps/:mapId/objects', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    console.log(`🗺️ [Maps API] Loading objects for map: ${mapId}`);
    
    await ensureMapObjectsDir();
    
    const objectsFile = path.join(MAP_OBJECTS_DIR, `${mapId}.json`);
    
    try {
      await fs.access(objectsFile);
      const objectsData = await fs.readFile(objectsFile, 'utf-8');
      const parsedObjects = JSON.parse(objectsData);
      
      res.json({
        success: true,
        objects: parsedObjects.objects || [],
        mapId,
        lastModified: parsedObjects.timestamp
      });
    } catch {
      // Fichier n'existe pas, retourner une liste vide
      res.json({
        success: true,
        objects: [],
        mapId,
        lastModified: null
      });
    }
    
  } catch (error) {
    console.error('❌ [Maps API] Error loading objects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des objets'
    });
  }
});

// ✅ ROUTE: Sauvegarder les objets d'une carte
router.post('/maps/:mapId/objects', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    const mapData: MapData = req.body;
    
    console.log(`💾 [Maps API] Saving objects for map: ${mapId}`);
    console.log(`📊 [Maps API] Total objects: ${mapData.objects?.length || 0}`);
    
    // Validation des données
    if (!mapData.objects || !Array.isArray(mapData.objects)) {
      return res.status(400).json({
        success: false,
        error: 'Données d\'objets invalides'
      });
    }
    
    // Validation des objets
    for (const obj of mapData.objects) {
      if (!obj.id || !obj.type || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Format d\'objet invalide'
        });
      }
    }
    
    await ensureMapObjectsDir();
    
    // Préparer les données à sauvegarder
    const saveData: MapData = {
      mapId,
      mapName: mapData.mapName || mapId,
      objects: mapData.objects,
      timestamp: new Date().toISOString(),
      totalObjects: mapData.objects.length
    };
    
    // Sauvegarder dans le fichier
    const objectsFile = path.join(MAP_OBJECTS_DIR, `${mapId}.json`);
    await fs.writeFile(objectsFile, JSON.stringify(saveData, null, 2), 'utf-8');
    
    // Optionnel: créer une backup
    const backupFile = path.join(MAP_OBJECTS_DIR, `${mapId}_backup_${Date.now()}.json`);
    await fs.writeFile(backupFile, JSON.stringify(saveData, null, 2), 'utf-8');
    
    console.log(`✅ [Maps API] Objects saved successfully for ${mapId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `${saveData.totalObjects} objets sauvegardés pour la carte ${mapId}`,
      mapId,
      totalObjects: saveData.totalObjects,
      timestamp: saveData.timestamp,
      savedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error saving objects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde des objets'
    });
  }
});

// ✅ ROUTE: Supprimer tous les objets d'une carte
router.delete('/maps/:mapId/objects', requireMacAndDev, async (req: any, res) => {
  try {
    const { mapId } = req.params;
    console.log(`🗑️ [Maps API] Deleting all objects for map: ${mapId} by ${req.user.username}`);
    
    await ensureMapObjectsDir();
    
    const objectsFile = path.join(MAP_OBJECTS_DIR, `${mapId}.json`);
    
    try {
      // Créer une backup avant suppression
      const backupFile = path.join(MAP_OBJECTS_DIR, `${mapId}_backup_before_delete_${Date.now()}.json`);
      await fs.copyFile(objectsFile, backupFile);
      
      await fs.unlink(objectsFile);
      console.log(`✅ [Maps API] Objects file deleted for ${mapId}`);
    } catch {
      // Fichier n'existe pas, pas d'erreur
    }
    
    res.json({
      success: true,
      message: `Objets supprimés pour la carte ${mapId}`,
      mapId,
      deletedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error deleting objects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression des objets'
    });
  }
});

// ✅ ROUTE: Statistiques des cartes
router.get('/maps/stats', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📊 [Maps API] Getting maps statistics');
    
    // Compter les fichiers TMJ
    const mapFiles = await fs.readdir(MAPS_DIR);
    const totalMaps = mapFiles.filter(file => file.endsWith('.tmj')).length;
    
    // Compter les objets par carte
    await ensureMapObjectsDir();
    const objectFiles = await fs.readdir(MAP_OBJECTS_DIR);
    const mapObjectFiles = objectFiles.filter(file => 
      file.endsWith('.json') && !file.includes('_backup_')
    );
    
    let totalObjects = 0;
    const mapStats = [];
    
    for (const file of mapObjectFiles) {
      try {
        const content = await fs.readFile(path.join(MAP_OBJECTS_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        const objectCount = data.totalObjects || 0;
        totalObjects += objectCount;
        
        mapStats.push({
          mapId: data.mapId || file.replace('.json', ''),
          objectCount,
          lastModified: data.timestamp
        });
      } catch {
        // Ignorer les fichiers corrompus
      }
    }
    
    res.json({
      success: true,
      stats: {
        totalMaps,
        mapsWithObjects: mapStats.length,
        totalObjects,
        mapStats
      }
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des statistiques'
    });
  }
});

// ✅ ROUTE: Exporter tous les objets de cartes
router.get('/maps/export/all', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`📤 [Maps API] Exporting all map objects by ${req.user.username}`);
    
    await ensureMapObjectsDir();
    const objectFiles = await fs.readdir(MAP_OBJECTS_DIR);
    const mapObjectFiles = objectFiles.filter(file => 
      file.endsWith('.json') && !file.includes('_backup_')
    );
    
    const allMapData: Record<string, any> = {};
    
    for (const file of mapObjectFiles) {
      try {
        const content = await fs.readFile(path.join(MAP_OBJECTS_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        allMapData[data.mapId || file.replace('.json', '')] = data;
      } catch {
        // Ignorer les fichiers corrompus
      }
    }
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      totalMaps: Object.keys(allMapData).length,
      totalObjects: Object.values(allMapData).reduce((total: number, map: any) => total + (map.totalObjects || 0), 0),
      maps: allMapData
    };
    
    res.json({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error exporting:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'export'
    });
  }
});

// Fonction utilitaire pour formater les noms de cartes
function formatMapName(mapId: string): string {
  return mapId
    .split(/(?=[A-Z])/)
    .join(' ')
    .split('_')
    .join(' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ========================================
// FIN DES ROUTES MAPS
// ========================================

// ========================================
// 🧑‍🤝‍🧑 ROUTES POUR L'ÉDITEUR DE NPCs - VERSION MONGODB UNIQUEMENT
// ========================================

// ✅ ROUTE: Charger les NPCs d'une zone depuis MongoDB
router.get('/zones/:zoneId/npcs', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    console.log(`🧑‍🤝‍🧑 [NPCs API] Loading NPCs for zone: ${zoneId} from MongoDB`);
    
    // Charger les NPCs depuis MongoDB
    const npcs = await NpcData.findByZone(zoneId);
    
    console.log(`✅ [NPCs API] Found ${npcs.length} NPCs for ${zoneId} in MongoDB`);
    
    // Convertir au format attendu par l'éditeur
    const formattedNPCs = npcs.map(npc => npc.toNpcFormat());
    
    res.json({
      success: true,
      data: {
        zone: zoneId,
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        description: `NPCs for zone ${zoneId} - From MongoDB`,
        npcs: formattedNPCs
      },
      zoneId,
      npcCount: npcs.length,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error loading NPCs from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des NPCs depuis MongoDB'
    });
  }
});

// ✅ ROUTE: Sauvegarder les NPCs d'une zone dans MongoDB
router.post('/zones/:zoneId/npcs', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    const npcData = req.body;
    
    console.log(`💾 [NPCs API] Saving NPCs for zone: ${zoneId} to MongoDB`);
    console.log(`📊 [NPCs API] Total NPCs: ${npcData.npcs?.length || 0}`);
    
    // Validation des données
    if (!npcData.npcs || !Array.isArray(npcData.npcs)) {
      return res.status(400).json({
        success: false,
        error: 'Données NPCs invalides - array requis'
      });
    }
    
    // Supprimer tous les NPCs existants de cette zone
    const deleteResult = await NpcData.deleteMany({ zone: zoneId });
    console.log(`🗑️ [NPCs API] Deleted ${deleteResult.deletedCount} existing NPCs for ${zoneId}`);
    
    let savedCount = 0;
    const errors: string[] = [];
    
    // Sauvegarder chaque NPC individuellement
    for (const npcJson of npcData.npcs) {
      try {
        // Validation de base
        if (!npcJson.id || !npcJson.name || !npcJson.type) {
          errors.push(`NPC invalide: manque id, name ou type - ${JSON.stringify(npcJson)}`);
          continue;
        }
        
        if (!npcJson.position || typeof npcJson.position.x !== 'number' || typeof npcJson.position.y !== 'number') {
          errors.push(`NPC ${npcJson.id}: position invalide`);
          continue;
        }
        
        // Créer le NPC avec la méthode static
        await NpcData.createFromJson(npcJson, zoneId);
        savedCount++;
        
      } catch (error) {
        const errorMsg = `NPC ${npcJson.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌ [NPCs API] Error saving NPC:', errorMsg);
      }
    }
    
    console.log(`✅ [NPCs API] Saved ${savedCount}/${npcData.npcs.length} NPCs for ${zoneId} by ${req.user.username}`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [NPCs API] ${errors.length} errors during save:`, errors);
    }
    
    res.json({
      success: true,
      message: `NPCs sauvegardés pour ${zoneId}`,
      zoneId,
      totalNPCs: savedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      savedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error saving NPCs to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde des NPCs dans MongoDB'
    });
  }
});

// ✅ ROUTE: Supprimer tous les NPCs d'une zone dans MongoDB
router.delete('/zones/:zoneId/npcs', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    console.log(`🗑️ [NPCs API] Deleting all NPCs for zone: ${zoneId} from MongoDB by ${req.user.username}`);
    
    const deleteResult = await NpcData.deleteMany({ zone: zoneId });
    
    console.log(`✅ [NPCs API] Deleted ${deleteResult.deletedCount} NPCs for ${zoneId}`);
    
    res.json({
      success: true,
      message: `${deleteResult.deletedCount} NPCs supprimés pour la zone ${zoneId}`,
      zoneId,
      deletedCount: deleteResult.deletedCount,
      deletedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error deleting NPCs from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression des NPCs dans MongoDB'
    });
  }
});

// ✅ ROUTE: Ajouter un NPC à une zone dans MongoDB
router.post('/zones/:zoneId/npcs/add', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    const npcJson = req.body;
    
    console.log(`➕ [NPCs API] Adding NPC to zone: ${zoneId} in MongoDB`);
    
    // Validation du NPC
    if (!npcJson.name || !npcJson.type || !npcJson.position || !npcJson.sprite) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants pour le NPC (name, type, position, sprite)'
      });
    }
    
    // Générer un ID unique si pas fourni
    if (!npcJson.id) {
      // Trouver le prochain ID disponible pour cette zone
      const existingNpcs = await NpcData.find({ zone: zoneId }).sort({ npcId: -1 }).limit(1);
      npcJson.id = existingNpcs.length > 0 ? existingNpcs[0].npcId + 1 : 1;
    }
    
    // Vérifier que l'ID n'existe pas déjà
    const existingNpc = await NpcData.findOne({ zone: zoneId, npcId: npcJson.id });
    if (existingNpc) {
      return res.status(400).json({
        success: false,
        error: 'Un NPC avec cet ID existe déjà dans cette zone'
      });
    }
    
    // Créer le NPC
    const newNpc = await NpcData.createFromJson(npcJson, zoneId);
    
    console.log(`✅ [NPCs API] NPC "${npcJson.name}" added to ${zoneId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `NPC "${npcJson.name}" ajouté à la zone ${zoneId}`,
      npc: newNpc.toNpcFormat(),
      zoneId,
      addedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error adding NPC to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du NPC dans MongoDB'
    });
  }
});

// ✅ ROUTE: Modifier un NPC spécifique dans MongoDB
router.put('/zones/:zoneId/npcs/:npcId', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    const updates = req.body;
    
    console.log(`✏️ [NPCs API] Updating NPC ${npcId} in zone ${zoneId} in MongoDB`);
    
    // Trouver le NPC
    const npc = await NpcData.findOne({ zone: zoneId, npcId: parseInt(npcId) });
    if (!npc) {
      return res.status(404).json({
        success: false,
        error: 'NPC non trouvé'
      });
    }
    
    // Appliquer les modifications via la méthode updateFromJson
    await npc.updateFromJson(updates);
    
    console.log(`✅ [NPCs API] NPC ${npcId} updated in ${zoneId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'NPC modifié avec succès',
      npc: npc.toNpcFormat(),
      modifiedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error updating NPC in MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du NPC dans MongoDB'
    });
  }
});

// ✅ ROUTE: Supprimer un NPC spécifique dans MongoDB
router.delete('/zones/:zoneId/npcs/:npcId', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    
    console.log(`🗑️ [NPCs API] Deleting NPC ${npcId} from zone ${zoneId} in MongoDB`);
    
    // Trouver et supprimer le NPC
    const deletedNpc = await NpcData.findOneAndDelete({ 
      zone: zoneId, 
      npcId: parseInt(npcId) 
    });
    
    if (!deletedNpc) {
      return res.status(404).json({
        success: false,
        error: 'NPC non trouvé'
      });
    }
    
    console.log(`✅ [NPCs API] NPC "${deletedNpc.name}" deleted from ${zoneId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `NPC "${deletedNpc.name}" supprimé de la zone ${zoneId}`,
      deletedNPC: deletedNpc.toNpcFormat(),
      deletedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error deleting NPC from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du NPC dans MongoDB'
    });
  }
});

// ✅ ROUTE: Dupliquer un NPC dans MongoDB
router.post('/zones/:zoneId/npcs/:npcId/duplicate', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    
    console.log(`📋 [NPCs API] Duplicating NPC ${npcId} in zone ${zoneId} in MongoDB`);
    
    // Trouver le NPC original
    const originalNpc = await NpcData.findOne({ 
      zone: zoneId, 
      npcId: parseInt(npcId) 
    });
    
    if (!originalNpc) {
      return res.status(404).json({
        success: false,
        error: 'NPC original non trouvé'
      });
    }
    
    // Trouver le prochain ID disponible
    const lastNpc = await NpcData.find({ zone: zoneId }).sort({ npcId: -1 }).limit(1);
    const newId = lastNpc.length > 0 ? lastNpc[0].npcId + 1 : 1;
    
    // Créer la copie
    const originalData = originalNpc.toNpcFormat();
    const duplicateData = {
      ...originalData,
      id: newId,
      name: `${originalData.name} (Copie)`,
      position: {
        x: originalData.position.x + 50, // Décaler légèrement
        y: originalData.position.y + 50
      }
    };
    
    // Sauvegarder la copie
    const duplicatedNpc = await NpcData.createFromJson(duplicateData, zoneId);
    
    console.log(`✅ [NPCs API] NPC duplicated in ${zoneId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'NPC dupliqué avec succès',
      npc: duplicatedNpc.toNpcFormat(),
      duplicatedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error duplicating NPC in MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la duplication du NPC dans MongoDB'
    });
  }
});

// ✅ ROUTE: Statistiques des NPCs depuis MongoDB
router.get('/npcs/stats', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📊 [NPCs API] Getting NPCs statistics from MongoDB');
    
    const [
      totalNPCs,
      activeNPCs,
      typeStats,
      zoneStats
    ] = await Promise.all([
      NpcData.countDocuments(),
      NpcData.countDocuments({ isActive: true }),
      NpcData.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      NpcData.aggregate([
        { $group: { _id: '$zone', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      stats: {
        totalZones: zoneStats.length,
        totalNPCs,
        activeNPCs,
        inactiveNPCs: totalNPCs - activeNPCs,
        typeDistribution: typeStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        zoneStats: zoneStats.map((stat: any) => ({
          zone: stat._id,
          npcCount: stat.count
        }))
      },
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error getting stats from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des statistiques NPCs depuis MongoDB'
    });
  }
});

// ✅ ROUTE: Exporter tous les NPCs depuis MongoDB
router.get('/npcs/export/all', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`📤 [NPCs API] Exporting all NPCs from MongoDB by ${req.user.username}`);
    
    // Récupérer tous les NPCs regroupés par zone
    const allNpcs = await NpcData.find({ isActive: true }).sort({ zone: 1, npcId: 1 });
    
    // Regrouper par zone
    const npcsByZone: Record<string, any> = {};
    
    allNpcs.forEach(npc => {
      if (!npcsByZone[npc.zone]) {
        npcsByZone[npc.zone] = {
          zone: npc.zone,
          version: '2.0.0',
          lastUpdated: new Date().toISOString(),
          description: `NPCs for zone ${npc.zone} - Exported from MongoDB`,
          npcs: []
        };
      }
      npcsByZone[npc.zone].npcs.push(npc.toNpcFormat());
    });
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      source: 'mongodb',
      totalZones: Object.keys(npcsByZone).length,
      totalNPCs: allNpcs.length,
      zones: npcsByZone
    };
    
    res.json({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error exporting NPCs from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'export des NPCs depuis MongoDB'
    });
  }
});

// ✅ ROUTE: Importer des NPCs depuis JSON vers MongoDB
router.post('/npcs/import/json', requireMacAndDev, async (req: any, res) => {
  try {
    const { data } = req.body;
    
    console.log(`📥 [NPCs API] Importing NPCs from JSON to MongoDB by ${req.user.username}`);
    
    if (!data || !data.zones) {
      return res.status(400).json({
        success: false,
        error: 'Format de données invalide - zones requis'
      });
    }
    
    let totalImported = 0;
    let totalErrors = 0;
    const importResults: any[] = [];
    
    // Importer chaque zone
    for (const [zoneId, zoneData] of Object.entries(data.zones) as [string, any][]) {
      try {
        console.log(`📥 [NPCs API] Importing zone: ${zoneId}`);
        
        const result = await NpcData.bulkImportFromJson(zoneData);
        
        totalImported += result.success;
        totalErrors += result.errors.length;
        
        importResults.push({
          zone: zoneId,
          imported: result.success,
          errors: result.errors
        });
        
      } catch (error) {
        console.error(`❌ [NPCs API] Error importing zone ${zoneId}:`, error);
        totalErrors++;
        importResults.push({
          zone: zoneId,
          imported: 0,
          errors: [`Zone import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }
    
    console.log(`✅ [NPCs API] Import completed: ${totalImported} NPCs imported, ${totalErrors} errors`);
    
    res.json({
      success: true,
      message: `Import terminé: ${totalImported} NPCs importés`,
      totalImported,
      totalErrors,
      importResults,
      importedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error importing NPCs to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'import des NPCs vers MongoDB'
    });
  }
});

// ✅ ROUTE: Migrer un NPC vers le dernier format
router.post('/zones/:zoneId/npcs/:npcId/migrate', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    
    console.log(`🔄 [NPCs API] Migrating NPC ${npcId} in zone ${zoneId} to latest format`);
    
    // Trouver le NPC
    const npc = await NpcData.findOne({ zone: zoneId, npcId: parseInt(npcId) });
    if (!npc) {
      return res.status(404).json({
        success: false,
        error: 'NPC non trouvé'
      });
    }
    
    // Mettre à jour la version
    npc.version = '2.0.0';
    npc.lastUpdated = new Date();
    await npc.save();
    
    console.log(`✅ [NPCs API] NPC ${npcId} migrated by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'NPC migré vers la dernière version',
      npc: npc.toNpcFormat(),
      migratedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error migrating NPC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la migration du NPC'
    });
  }
});

// ✅ ROUTE: Valider l'intégrité des NPCs d'une zone
router.get('/zones/:zoneId/npcs/validate', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    
    console.log(`🔍 [NPCs API] Validating NPCs integrity for zone: ${zoneId}`);
    
    const npcs = await NpcData.findByZone(zoneId);
    
    const validationResults = {
      totalNPCs: npcs.length,
      valid: 0,
      invalid: 0,
      issues: [] as string[]
    };
    
    // Validation de base
    for (const npc of npcs) {
      let isValid = true;
      
      // Vérifications basiques
      if (!npc.name || npc.name.trim().length === 0) {
        validationResults.issues.push(`NPC ${npc.npcId}: nom manquant ou vide`);
        isValid = false;
      }
      
      if (!npc.position || typeof npc.position.x !== 'number' || typeof npc.position.y !== 'number') {
        validationResults.issues.push(`NPC ${npc.npcId}: position invalide`);
        isValid = false;
      }
      
      if (!npc.sprite || npc.sprite.trim().length === 0) {
        validationResults.issues.push(`NPC ${npc.npcId}: sprite manquant`);
        isValid = false;
      }
      
      // Vérification des IDs dupliqués
      const duplicates = npcs.filter(n => n.npcId === npc.npcId);
      if (duplicates.length > 1) {
        validationResults.issues.push(`NPC ${npc.npcId}: ID dupliqué`);
        isValid = false;
      }
      
      if (isValid) {
        validationResults.valid++;
      } else {
        validationResults.invalid++;
      }
    }
    
    console.log(`✅ [NPCs API] Validation completed for ${zoneId}: ${validationResults.valid}/${validationResults.totalNPCs} valid`);
    
    res.json({
      success: true,
      zone: zoneId,
      validation: validationResults
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error validating NPCs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation des NPCs'
    });
  }
});

// ✅ ROUTE: Rechercher des NPCs dans toutes les zones
router.post('/npcs/search', requireMacAndDev, async (req: any, res) => {
  try {
    const { query, limit = 20 } = req.body;
    
    console.log(`🔍 [NPCs API] Searching NPCs: "${query}"`);
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Requête trop courte'
      });
    }
    
    // Recherche par nom, type ou zone
    const searchRegex = new RegExp(query, 'i');
    const results = await NpcData.find({
      $or: [
        { name: searchRegex },
        { type: searchRegex },
        { zone: searchRegex }
      ],
      isActive: true
    })
    .limit(parseInt(limit))
    .sort({ zone: 1, name: 1 });
    
    const formattedResults = results.map(npc => ({
      id: npc.npcId,
      name: npc.name,
      type: npc.type,
      zone: npc.zone,
      position: npc.position,
      lastUpdated: npc.lastUpdated
    }));
    
    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length,
      query
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error searching NPCs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche des NPCs'
    });
  }
});

// ========================================
// FIN DES ROUTES NPCs MONGODB
// ========================================

// ========================================
// ROUTES MONGODB CORRIGÉES
// ========================================

// GET /api/admin/mongodb/databases - Lister les bases de données
router.get('/mongodb/databases', requireMacAndDev, async (req: any, res: any) => {
    try {
        console.log('🗄️ [MongoDB API] Récupération des bases de données...');
        
        const db = await getMongooseDB();
        const admin = db.admin();
        const databasesList = await admin.listDatabases();
        
        const databases = databasesList.databases
            .filter((database: any) => !['admin', 'local', 'config'].includes(database.name))
            .map((database: any) => database.name);
        
        console.log('✅ [MongoDB API] Bases trouvées:', databases);
        
        res.json({ 
            success: true, 
            databases: databases
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur databases:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// GET /api/admin/mongodb/collections/:database - Lister les collections
router.get('/mongodb/collections/:database', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database } = req.params;
        console.log(`🗄️ [MongoDB API] Collections de ${database}...`);
        
        // Pour Mongoose, on utilise directement la DB actuelle
        const db = await getMongooseDB();
        
        // Si on veut une autre base, on change la connexion
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const collections = await targetDb.listCollections().toArray();
        const collectionNames = collections.map((col: any) => col.name);
        
        console.log(`✅ [MongoDB API] Collections trouvées:`, collectionNames);
        
        res.json({ 
            success: true, 
            collections: collectionNames
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur collections:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /api/admin/mongodb/documents - Récupérer les documents avec pagination
router.post('/mongodb/documents', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, query = {}, page = 0, limit = 20 } = req.body;
        
        console.log(`🔍 [MongoDB API] Documents ${database}.${collection}, page ${page}`);
        console.log('🔍 [MongoDB API] Query:', JSON.stringify(query));
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Préparer la requête MongoDB
        const mongoQuery = prepareMongoQuery(query);
        
        // Compter le total
        const total = await coll.countDocuments(mongoQuery);
        
        // Récupérer les documents avec pagination
        const documents = await coll
            .find(mongoQuery)
            .skip(page * limit)
            .limit(limit)
            .toArray();
        
        console.log(`✅ [MongoDB API] ${documents.length}/${total} documents récupérés`);
        
        res.json({ 
            success: true, 
            documents: documents,
            total: total,
            page: page,
            limit: limit
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur documents:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// GET /api/admin/mongodb/document/:database/:collection/:id - Récupérer un document par ID
router.get('/mongodb/document/:database/:collection/:id', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, id } = req.params;
        
        console.log(`📄 [MongoDB API] Récupération document: ${database}.${collection}#${id}`);
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        let documentId;
        try {
            documentId = new ObjectId(id);
        } catch (error) {
            documentId = id;
        }
        
        const document = await coll.findOne({ _id: documentId });
        
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document non trouvé'
            });
        }
        
        res.json({
            success: true,
            document: document
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur récupération document:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /api/admin/mongodb/document - Créer un nouveau document
router.post('/mongodb/document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, data } = req.body;
        
        console.log(`➕ [MongoDB API] Création document ${database}.${collection}`);
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Insérer le nouveau document
        const result = await coll.insertOne(data);
        
        console.log(`✅ [MongoDB API] Document créé avec ID: ${result.insertedId}`);
        
        res.json({ 
            success: true, 
            message: 'Document créé avec succès',
            insertedId: result.insertedId
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur création:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// PUT /api/admin/mongodb/document - Mettre à jour un document
router.put('/mongodb/document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, id, data } = req.body;
        
        console.log(`💾 [MongoDB API] Mise à jour ${database}.${collection} ID: ${id}`);
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Préparer les données (enlever l'_id s'il est présent)
        const updateData = { ...data };
        delete updateData._id;
        
        // Mettre à jour le document
        const result = await coll.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document non trouvé' 
            });
        }
        
        console.log(`✅ [MongoDB API] Document mis à jour`);
        
        res.json({ 
            success: true, 
            message: 'Document mis à jour avec succès',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur mise à jour:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// DELETE /api/admin/mongodb/document - Supprimer un document
router.delete('/mongodb/document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, id } = req.body;
        
        console.log(`🗑️ [MongoDB API] Suppression ${database}.${collection} ID: ${id}`);
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Supprimer le document
        const result = await coll.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document non trouvé' 
            });
        }
        
        console.log(`✅ [MongoDB API] Document supprimé`);
        
        res.json({ 
            success: true, 
            message: 'Document supprimé avec succès',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur suppression:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// GET /api/admin/mongodb/stats/:database - Statistiques d'une base
router.get('/mongodb/stats/:database', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database } = req.params;
        
        console.log(`📊 [MongoDB API] Stats de ${database}`);
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        // Récupérer les stats de la base
        const dbStats = await targetDb.stats();
        
        // Récupérer les stats des collections
        const collections = await targetDb.listCollections().toArray();
        const collectionsStats: CollectionStats[] = [];
        
        for (const col of collections) {
            try {
                // Utiliser countDocuments au lieu de stats()
                const count = await targetDb.collection(col.name).countDocuments();
                
                // Essayer d'obtenir des stats basiques
                let size = 0;
                let avgObjSize = 0;
                
                try {
                    // Utiliser un document échantillon pour estimer la taille
                    const sampleDoc = await targetDb.collection(col.name).findOne();
                    if (sampleDoc) {
                        const docSize = JSON.stringify(sampleDoc).length;
                        avgObjSize = docSize;
                        size = count * docSize;
                    }
                } catch {
                    // Ignorer si impossible d'obtenir les stats
                }
                
                collectionsStats.push({
                    name: col.name,
                    count: count,
                    size: size,
                    avgObjSize: avgObjSize
                });
            } catch (error) {
                // Certaines collections peuvent ne pas avoir de stats
                collectionsStats.push({
                    name: col.name,
                    count: 0,
                    size: 0,
                    avgObjSize: 0
                });
            }
        }
        
        console.log(`✅ [MongoDB API] Stats récupérées`);
        
        const databaseStats: DatabaseStats = {
            name: database,
            collections: dbStats.collections || 0,
            dataSize: dbStats.dataSize || 0,
            indexSize: dbStats.indexSize || 0,
            totalSize: (dbStats.dataSize || 0) + (dbStats.indexSize || 0)
        };
        
        res.json({ 
            success: true,
            database: databaseStats,
            collections: collectionsStats
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur stats:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /api/admin/mongodb/query - Exécuter une requête personnalisée
router.post('/mongodb/query', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, operation, query, options = {} } = req.body;
        
        console.log(`🔧 [MongoDB API] Requête personnalisée ${operation} sur ${database}.${collection}`);
        
        const db = await getMongooseDB();
        
        // Utiliser la bonne base de données
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        let result: any;
        
        switch (operation) {
            case 'find':
                result = await coll.find(query, options).toArray();
                break;
            case 'findOne':
                result = await coll.findOne(query, options);
                break;
            case 'count':
                result = await coll.countDocuments(query);
                break;
            case 'aggregate':
                result = await coll.aggregate(query).toArray();
                break;
            case 'distinct':
                const field = options.field;
                if (!field) throw new Error('Le champ "field" est requis pour distinct');
                result = await coll.distinct(field, query);
                break;
            default:
                throw new Error(`Opération non supportée: ${operation}`);
        }
        
        console.log(`✅ [MongoDB API] Requête exécutée`);
        
        res.json({ 
            success: true,
            operation: operation,
            result: result
        });
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur requête:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/create-document - Créer un nouveau document (avec nettoyage avancé)
router.post('/mongodb/create-document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, document } = req.body;
        
        console.log(`📝 [MongoDB API] Création document dans ${database}.${collection}`);
        console.log(`📝 [MongoDB API] Document reçu:`, JSON.stringify(document, null, 2));
        
        if (!database || !collection || !document) {
            return res.status(400).json({
                success: false,
                error: 'Database, collection et document sont requis'
            });
        }
        
        // Fonction pour nettoyer le document récursivement
        function cleanDocument(obj: any): any {
            if (obj === null || obj === undefined) {
                return null;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => cleanDocument(item));
            }
            
            if (typeof obj === 'object' && obj.constructor === Object) {
                const cleaned: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Ignorer les valeurs undefined
                    if (value !== undefined) {
                        cleaned[key] = cleanDocument(value);
                    }
                }
                return cleaned;
            }
            
            return obj;
        }
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Nettoyer le document complètement
        let cleanedDocument = cleanDocument(document);
        
        // Supprimer _id si null ou vide
        if (cleanedDocument._id === null || cleanedDocument._id === '' || cleanedDocument._id === undefined) {
            delete cleanedDocument._id;
        }
        
        console.log(`📝 [MongoDB API] Document nettoyé:`, JSON.stringify(cleanedDocument, null, 2));
        
        // Vérifier que le document n'est pas vide
        if (!cleanedDocument || Object.keys(cleanedDocument).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le document ne peut pas être vide après nettoyage'
            });
        }
        
        const result = await coll.insertOne(cleanedDocument);
        
        console.log(`✅ [MongoDB API] Document créé avec ID: ${result.insertedId}`);
        
        res.json({
            success: true,
            insertedId: result.insertedId,
            document: { ...cleanedDocument, _id: result.insertedId }
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur création document:', error);
        console.error('❌ [MongoDB API] Stack trace:', error instanceof Error ? error.stack : 'No stack');
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/update-document - Mettre à jour un document (avec nettoyage avancé)
router.post('/mongodb/update-document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, document, originalId } = req.body;
        
        console.log(`✏️ [MongoDB API] Mise à jour document dans ${database}.${collection}`);
        console.log(`✏️ [MongoDB API] originalId: ${originalId}, document._id: ${document?._id}`);
        
        if (!database || !collection || !document) {
            return res.status(400).json({
                success: false,
                error: 'Database, collection et document sont requis'
            });
        }
        
        // Fonction pour nettoyer le document récursivement
        function cleanDocument(obj: any): any {
            if (obj === null || obj === undefined) {
                return null;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => cleanDocument(item));
            }
            
            if (typeof obj === 'object' && obj.constructor === Object) {
                const cleaned: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Ignorer les valeurs undefined
                    if (value !== undefined) {
                        cleaned[key] = cleanDocument(value);
                    }
                }
                return cleaned;
            }
            
            return obj;
        }
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Utiliser originalId en priorité, puis document._id
        const idToUse = originalId || document._id;
        console.log(`✏️ [MongoDB API] ID utilisé: ${idToUse}`);
        
        if (!idToUse) {
            return res.status(400).json({
                success: false,
                error: 'ID du document requis (originalId ou document._id)'
            });
        }
        
        let documentId;
        try {
            documentId = new ObjectId(idToUse);
        } catch (error) {
            documentId = idToUse;
        }
        
        // Nettoyer et préparer le document de mise à jour
        let updateDocument = cleanDocument(document);
        delete updateDocument._id; // Ne pas inclure _id dans l'update
        
        console.log(`✏️ [MongoDB API] Document à mettre à jour:`, Object.keys(updateDocument));
        
        // Vérifier que le document n'est pas vide
        if (!updateDocument || Object.keys(updateDocument).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le document ne peut pas être vide après nettoyage'
            });
        }
        
        const result = await coll.replaceOne(
            { _id: documentId },
            updateDocument
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document non trouvé'
            });
        }
        
        res.json({
            success: true,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur mise à jour document:', error);
        console.error('❌ [MongoDB API] Stack trace:', error instanceof Error ? error.stack : 'No stack');
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/delete-document - Supprimer un document
router.post('/mongodb/delete-document', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, id } = req.body;
        
        console.log(`🗑️ [MongoDB API] Suppression document: ${database}.${collection}#${id}`);
        
        if (!database || !collection || !id) {
            return res.status(400).json({
                success: false,
                error: 'Database, collection et id sont requis'
            });
        }
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        let documentId;
        try {
            documentId = new ObjectId(id);
        } catch (error) {
            documentId = id;
        }
        
        const result = await coll.deleteOne({ _id: documentId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document non trouvé'
            });
        }
        
        res.json({
            success: true,
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur suppression document:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/query-advanced - Exécuter une requête Find avancée
router.post('/mongodb/query-advanced', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, query, projection, sort, limit, skip } = req.body;
        
        console.log(`🔍 [MongoDB API] Requête avancée: ${database}.${collection}`);
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        // Construire la requête
        let cursor = coll.find(query || {});
        
        if (projection) {
            cursor = cursor.project(projection);
        }
        
        if (sort) {
            cursor = cursor.sort(sort);
        }
        
        if (skip) {
            cursor = cursor.skip(skip);
        }
        
        if (limit) {
            cursor = cursor.limit(limit);
        }
        
        const documents = await cursor.toArray();
        const total = await coll.countDocuments(query || {});
        
        res.json({
            success: true,
            documents: documents,
            total: total,
            query: query,
            projection: projection,
            sort: sort
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur requête:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/aggregate - Pipeline d'agrégation
router.post('/mongodb/aggregate', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, pipeline } = req.body;
        
        console.log(`📊 [MongoDB API] Agrégation: ${database}.${collection}`);
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        const results = await coll.aggregate(pipeline).toArray();
        
        res.json({
            success: true,
            results: results,
            pipeline: pipeline
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur agrégation:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/database-stats - Statistiques de base de données
router.post('/mongodb/database-stats', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database } = req.body;
        
        console.log(`📊 [MongoDB API] Stats pour: ${database}`);
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        // Récupérer les collections
        const collections = await targetDb.listCollections().toArray();
        
        // Stats par collection
        const collectionStats = [];
        for (const collInfo of collections) {
            try {
                const count = await targetDb.collection(collInfo.name).countDocuments();
                
                // Estimation de taille (simplifiée)
                let size = 0;
                let avgObjSize = 0;
                
                try {
                    const sampleDoc = await targetDb.collection(collInfo.name).findOne();
                    if (sampleDoc) {
                        const docSize = JSON.stringify(sampleDoc).length;
                        avgObjSize = docSize;
                        size = count * docSize;
                    }
                } catch {
                    // Ignore si pas possible
                }
                
                collectionStats.push({
                    name: collInfo.name,
                    documents: count,
                    size: size,
                    avgDocSize: avgObjSize,
                    indexes: 3 // Valeur par défaut
                });
            } catch (error) {
                console.warn(`Erreur stats collection ${collInfo.name}:`, error);
            }
        }
        
        res.json({
            success: true,
            stats: {
                collections: collections.length,
                totalDocuments: collectionStats.reduce((sum, c) => sum + c.documents, 0),
                totalSize: collectionStats.reduce((sum, c) => sum + c.size, 0),
                totalIndexes: collectionStats.reduce((sum, c) => sum + c.indexes, 0),
                collectionStats: collectionStats
            }
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur stats:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// GET /mongodb/server-info - Informations serveur
router.get('/mongodb/server-info', requireMacAndDev, async (req: any, res: any) => {
    try {
        console.log(`🖥️ [MongoDB API] Info serveur`);
        
        const db = await getMongooseDB();
        const admin = db.admin();
        
        try {
            const serverStatus = await admin.serverStatus();
            const buildInfo = await admin.buildInfo();
            
            res.json({
                success: true,
                info: {
                    version: buildInfo.version,
                    host: serverStatus.host,
                    uptime: serverStatus.uptime,
                    connections: serverStatus.connections?.current || 0,
                    activeConnections: serverStatus.connections?.active || 0,
                    operationsPerSecond: serverStatus.opcounters?.command || 0,
                    memoryUsage: serverStatus.mem?.resident * 1024 * 1024 || 0,
                    storageEngine: serverStatus.storageEngine?.name || 'WiredTiger',
                    journaling: serverStatus.dur?.journaled || false,
                    authentication: false,
                    ssl: false
                }
            });
        } catch {
            // Version simplifiée si pas d'accès admin
            res.json({
                success: true,
                info: {
                    version: 'Unknown',
                    host: 'localhost',
                    uptime: 0,
                    connections: 0,
                    activeConnections: 0,
                    operationsPerSecond: 0,
                    memoryUsage: 0,
                    storageEngine: 'WiredTiger',
                    journaling: true,
                    authentication: false,
                    ssl: false
                }
            });
        }
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur info serveur:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/update - Mettre à jour plusieurs documents (pour query builder)
router.post('/mongodb/update', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, filter, update, multi, upsert } = req.body;
        
        console.log(`🔄 [MongoDB API] Update multiple: ${database}.${collection}`);
        
        if (!database || !collection || !filter || !update) {
            return res.status(400).json({
                success: false,
                error: 'Database, collection, filter et update sont requis'
            });
        }
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        let result;
        if (multi) {
            result = await coll.updateMany(filter, update, { upsert: upsert || false });
        } else {
            result = await coll.updateOne(filter, update, { upsert: upsert || false });
        }
        
        res.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount || 0,
            upsertedId: result.upsertedId || null
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur update:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// POST /mongodb/delete - Supprimer plusieurs documents (pour query builder)
router.post('/mongodb/delete', requireMacAndDev, async (req: any, res: any) => {
    try {
        const { database, collection, filter, multi } = req.body;
        
        console.log(`🗑️ [MongoDB API] Delete multiple: ${database}.${collection}`);
        
        if (!database || !collection || !filter) {
            return res.status(400).json({
                success: false,
                error: 'Database, collection et filter sont requis'
            });
        }
        
        const db = await getMongooseDB();
        const targetDb = database === mongoose.connection.db?.databaseName ? 
            db : 
            mongoose.connection.getClient().db(database);
        
        const coll = targetDb.collection(collection);
        
        let result;
        if (multi) {
            result = await coll.deleteMany(filter);
        } else {
            result = await coll.deleteOne(filter);
        }
        
        res.json({
            success: true,
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('❌ [MongoDB API] Erreur delete:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});

// ✅ ROUTE: Liste des sprites NPCs - VERSION SERVEUR
router.get('/sprites/list', requireMacAndDev, (req: any, res: any) => {
    try {
        // Détecter si on est en mode build ou dev
        const isDev = __filename.includes('/src/');
        console.log('🔧 [Sprites] Mode détecté:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
        
        const possiblePaths = [
            // Mode développement
            path.join(__dirname, '../assets/npc'),           // src/routes/../assets/npc
            path.join(__dirname, '../../assets/npc'),        // src/assets/npc
            // Mode production  
            path.join(__dirname, '../assets/npc'),           // build/routes/../assets/npc
            path.join(__dirname, '../../assets/npc'),        // build/assets/npc
            // Chemins absolus
            path.join(process.cwd(), 'server/src/assets/npc'),
            path.join(process.cwd(), 'server/build/assets/npc'),
            path.join(process.cwd(), 'server/assets/npc')
        ];
        
        let sprites: string[] = [];
        let foundPath: string | null = null;
        
        for (const spritePath of possiblePaths) {
            try {
                console.log('📂 [Sprites] Testing path:', spritePath);
                
                if (fsSync.existsSync(spritePath)) {
                    const files = fsSync.readdirSync(spritePath);
                    sprites = files
                        .filter((file: string) => file.toLowerCase().endsWith('.png'))
                        .sort();
                    foundPath = spritePath;
                    console.log(`✅ [Sprites] Found ${sprites.length} sprites in: ${foundPath}`);
                    break;
                }
            } catch (error) {
                console.log(`❌ [Sprites] Error testing ${spritePath}:`, error);
                continue;
            }
        }
        
        if (sprites.length === 0) {
            console.warn('⚠️ [Sprites] No sprites found in any path');
        }
        
        res.json({
            success: true,
            sprites,
            count: sprites.length,
            path: foundPath,
            mode: isDev ? 'development' : 'production'
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error listing sprites:', error);
        res.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            sprites: []
        });
    }
});

// À ajouter dans server/src/routes/admin.ts - Section Shops API

/**
 * GET /api/admin/shops/list
 * Récupérer la liste de toutes les boutiques pour le sélecteur NPC
 */
router.get('/shops/list', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('📋 [Admin] Loading shops list for NPC selector...')
        
        // Récupérer toutes les boutiques actives depuis MongoDB
        const shops = await ShopData.find({ isActive: true })
            .select('shopId nameKey type location currency items isTemporary isActive')
            .sort({ 'location.zone': 1, shopId: 1 })
            .lean()
        
        if (!shops || shops.length === 0) {
            console.log('📋 [Admin] No shops found in database')
            return res.json({
                success: true,
                shops: [],
                message: 'No shops found'
            })
        }
        
        // Formater les données pour le frontend
        const formattedShops = shops.map(shop => ({
            shopId: shop.shopId,
            nameKey: shop.nameKey,
            name: shop.nameKey || shop.shopId, // Fallback pour compatibilité
            type: shop.type,
            location: {
                zone: shop.location?.zone || 'unknown',
                cityKey: shop.location?.cityKey,
                buildingKey: shop.location?.buildingKey
            },
            currency: shop.currency || 'gold',
            itemCount: shop.items?.length || 0,
            isTemporary: shop.isTemporary || false,
            isActive: shop.isActive !== false
        }))
        
        console.log(`✅ [Admin] Successfully loaded ${formattedShops.length} shops for NPC selector`)
        
        res.json({
            success: true,
            shops: formattedShops,
            total: formattedShops.length
        })
        
    } catch (error) {
        console.error('❌ [Admin] Error loading shops list:', error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des boutiques',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * GET /api/admin/shops/search
 * Rechercher des boutiques par terme
 */
router.post('/shops/search', requireMacAndDev, async (req: any, res) => {
    try {
        const { query, limit = 50, type = null, zone = null } = req.body
        
        console.log(`🔍 [Admin] Searching shops with query: "${query}"`)
        
        // Construire le filtre de recherche
        const searchFilter: any = { isActive: true }
        
        // Filtre par zone si spécifié
        if (zone) {
            searchFilter['location.zone'] = zone
        }
        
        // Filtre par type si spécifié
        if (type) {
            searchFilter.type = type
        }
        
        // Recherche textuelle
        if (query && query.length >= 2) {
            searchFilter.$or = [
                { shopId: { $regex: query, $options: 'i' } },
                { nameKey: { $regex: query, $options: 'i' } },
                { 'location.zone': { $regex: query, $options: 'i' } },
                { type: { $regex: query, $options: 'i' } }
            ]
        }
        
        const shops = await ShopData.find(searchFilter)
            .select('shopId nameKey type location currency items isTemporary')
            .sort({ 'location.zone': 1, shopId: 1 })
            .limit(limit)
            .lean()
        
        const results = shops.map(shop => ({
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            zone: shop.location?.zone || 'unknown',
            location: shop.location,
            currency: shop.currency,
            itemCount: shop.items?.length || 0,
            isTemporary: shop.isTemporary
        }))
        
        console.log(`✅ [Admin] Found ${results.length} shops matching search`)
        
        res.json({
            success: true,
            results,
            query,
            total: results.length
        })
        
    } catch (error) {
        console.error('❌ [Admin] Error searching shops:', error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recherche de boutiques'
        })
    }
})

/**
 * GET /api/admin/shops/by-zone/:zone
 * Récupérer les boutiques d'une zone spécifique
 */
router.get('/shops/by-zone/:zone', requireMacAndDev, async (req: any, res) => {
    try {
        const { zone } = req.params
        
        console.log(`🗺️ [Admin] Loading shops for zone: ${zone}`)
        
        const shops = await ShopData.findByZone(zone)
        
        const formattedShops = shops.map(shop => ({
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            items: shop.items,
            shopKeeper: shop.shopKeeper,
            dialogues: shop.dialogues,
            isTemporary: shop.isTemporary,
            isActive: shop.isActive
        }))
        
        res.json({
            success: true,
            shops: formattedShops,
            zone,
            total: formattedShops.length
        })
        
    } catch (error) {
        console.error(`❌ [Admin] Error loading shops for zone ${req.params.zone}:`, error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des boutiques de la zone'
        })
    }
})

/**
 * GET /api/admin/shops/by-type/:type
 * Récupérer les boutiques d'un type spécifique
 */
router.get('/shops/by-type/:type', requireMacAndDev, async (req: any, res) => {
    try {
        const { type } = req.params
        
        console.log(`🏪 [Admin] Loading shops of type: ${type}`)
        
        const shops = await ShopData.findByType(type as any)
        
        const formattedShops = shops.map(shop => ({
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            itemCount: shop.items?.length || 0,
            isTemporary: shop.isTemporary
        }))
        
        res.json({
            success: true,
            shops: formattedShops,
            type,
            total: formattedShops.length
        })
        
    } catch (error) {
        console.error(`❌ [Admin] Error loading shops of type ${req.params.type}:`, error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des boutiques par type'
        })
    }
})

/**
 * GET /api/admin/shops/details/:shopId
 * Récupérer les détails complets d'une boutique
 */
router.get('/shops/details/:shopId', requireMacAndDev, async (req: any, res) => {
    try {
        const { shopId } = req.params
        
        console.log(`🔍 [Admin] Loading details for shop: ${shopId}`)
        
        const shop = await ShopData.findOne({ shopId }).lean()
        
        if (!shop) {
            return res.status(404).json({
                success: false,
                error: 'Boutique non trouvée'
            })
        }
        
        // Formater les détails complets
        const shopDetails = {
            shopId: shop.shopId,
            nameKey: shop.nameKey,
            name: shop.nameKey || shop.shopId,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            buyMultiplier: shop.buyMultiplier,
            sellMultiplier: shop.sellMultiplier,
            items: shop.items.map(item => ({
                itemId: item.itemId,
                category: item.category,
                basePrice: item.basePrice,
                stock: item.stock,
                unlockLevel: item.unlockLevel,
                requiredBadges: item.requiredBadges,
                featured: item.featured
            })),
            shopKeeper: shop.shopKeeper,
            dialogues: shop.dialogues,
            accessRequirements: shop.accessRequirements,
            restockInfo: shop.restockInfo,
            isTemporary: shop.isTemporary,
            isActive: shop.isActive,
            lastUpdated: shop.lastUpdated
        }
        
        res.json({
            success: true,
            shop: shopDetails
        })
        
    } catch (error) {
        console.error(`❌ [Admin] Error loading shop details for ${req.params.shopId}:`, error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des détails de la boutique'
        })
    }
})

/**
 * GET /api/admin/shops/stats
 * Statistiques générales des boutiques
 */
router.get('/shops/stats', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('📊 [Admin] Generating shops statistics...')
        
        const [
            totalShops,
            activeShops,
            temporaryShops,
            shopsByType,
            shopsByZone
        ] = await Promise.all([
            ShopData.countDocuments({}),
            ShopData.countDocuments({ isActive: true }),
            ShopData.countDocuments({ isTemporary: true }),
            ShopData.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            ShopData.aggregate([
                { $group: { _id: '$location.zone', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ])
        
        const stats = {
            total: totalShops,
            active: activeShops,
            inactive: totalShops - activeShops,
            temporary: temporaryShops,
            byType: shopsByType.reduce((acc, item) => {
                acc[item._id] = item.count
                return acc
            }, {}),
            topZones: shopsByZone.map(item => ({
                zone: item._id,
                count: item.count
            }))
        }
        
        console.log('✅ [Admin] Shop statistics generated successfully')
        
        res.json({
            success: true,
            stats
        })
        
    } catch (error) {
        console.error('❌ [Admin] Error generating shop statistics:', error)
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération des statistiques'
        })
    }
})

// ✅ ROUTE: Récupérer un NPC spécifique pour édition depuis Map Editor
// ✅ ROUTE CORRIGÉE: Récupérer un NPC spécifique pour édition depuis Map Editor
router.get('/zones/:zoneId/npcs/:npcId/edit', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    
    console.log(`✏️ [NPCs API] Loading NPC ${npcId} from zone ${zoneId} for map editor`);
    
    let npc = null;
    
    // ✅ CORRECTION: Essayer d'abord avec l'ID numérique
    if (!isNaN(parseInt(npcId))) {
      // Si c'est un nombre, chercher par npcId
      npc = await NpcData.findOne({ zone: zoneId, npcId: parseInt(npcId) });
    }
    
    // ✅ Si pas trouvé et que l'ID commence par "npc_", extraire le nombre
    if (!npc && npcId.startsWith('npc_')) {
      const numericId = npcId.replace('npc_', '');
      if (!isNaN(parseInt(numericId))) {
        npc = await NpcData.findOne({ zone: zoneId, npcId: parseInt(numericId) });
      }
    }
    
    // ✅ Dernier recours: chercher par ObjectId si c'est un ID MongoDB valide
    if (!npc && npcId.length === 24) {
      try {
        npc = await NpcData.findOne({ zone: zoneId, _id: npcId });
      } catch (error) {
        // Ignore si ce n'est pas un ObjectId valide
      }
    }
    
    if (!npc) {
      console.error(`❌ [NPCs API] NPC not found: ${npcId} in zone ${zoneId}`);
      
      // Debug: lister tous les NPCs de la zone
      const allNpcs = await NpcData.find({ zone: zoneId }).select('npcId name _id');
      console.log(`🔍 [NPCs API] Available NPCs in ${zoneId}:`, 
        allNpcs.map(n => ({ npcId: n.npcId, name: n.name, _id: n._id.toString() }))
      );
      
      return res.status(404).json({
        success: false,
        error: `NPC non trouvé: ${npcId} dans la zone ${zoneId}`,
        availableNPCs: allNpcs.map(n => ({ npcId: n.npcId, name: n.name }))
      });
    }
    
    // Convertir au format éditeur
    const npcForEditor = npc.toNpcFormat();
    
    console.log(`✅ [NPCs API] NPC ${npc.npcId} (${npc.name}) loaded for editing from map`);
    
    res.json({
      success: true,
      npc: npcForEditor,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error loading NPC for map editor:', error);
    res.status(500).json({
      success: false,
      error: `Erreur serveur: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// ✅ ROUTE: Mettre à jour un NPC depuis Map Editor
router.put('/zones/:zoneId/npcs/:npcId/update-from-map', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    const { npcData, mapPosition } = req.body;
    
    console.log(`🗺️ [NPCs API] Updating NPC ${npcId} from map editor`);
    
    // Trouver le NPC
    const npc = await NpcData.findOne({ zone: zoneId, npcId: parseInt(npcId) });
    if (!npc) {
      return res.status(404).json({
        success: false,
        error: 'NPC non trouvé'
      });
    }
    
    // Mettre à jour les données
    await npc.updateFromJson(npcData);
    
    // Si position de la carte fournie, mettre à jour
    if (mapPosition) {
      npc.position = {
        x: mapPosition.x,
        y: mapPosition.y
      };
      await npc.save();
    }
    
    console.log(`✅ [NPCs API] NPC ${npcId} updated from map editor by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'NPC mis à jour depuis l\'éditeur de carte',
      npc: npc.toNpcFormat(),
      updatedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error updating NPC from map editor:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du NPC depuis la carte'
    });
  }
});

// ✅ ROUTE CORRIGÉE: Supprimer un NPC depuis Map Editor
router.delete('/zones/:zoneId/npcs/:npcId/delete-from-map', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    
    console.log(`🗑️ [NPCs API] Deleting NPC ${npcId} from zone ${zoneId} via map editor`);
    
    let deletedNpc = null;
    
    // ✅ CORRECTION: Même logique que pour l'édition
    // Essayer d'abord avec l'ID numérique
    if (!isNaN(parseInt(npcId))) {
      deletedNpc = await NpcData.findOneAndDelete({ 
        zone: zoneId, 
        npcId: parseInt(npcId) 
      });
    }
    
    // Si pas trouvé et que l'ID commence par "npc_", extraire le nombre
    if (!deletedNpc && npcId.startsWith('npc_')) {
      const numericId = npcId.replace('npc_', '');
      if (!isNaN(parseInt(numericId))) {
        deletedNpc = await NpcData.findOneAndDelete({ 
          zone: zoneId, 
          npcId: parseInt(numericId) 
        });
      }
    }
    
    // Dernier recours: chercher par ObjectId
    if (!deletedNpc && npcId.length === 24) {
      try {
        deletedNpc = await NpcData.findOneAndDelete({ zone: zoneId, _id: npcId });
      } catch (error) {
        // Ignore si ce n'est pas un ObjectId valide
      }
    }
    
    if (!deletedNpc) {
      console.error(`❌ [NPCs API] NPC not found for deletion: ${npcId} in zone ${zoneId}`);
      
      // Debug: lister tous les NPCs de la zone
      const allNpcs = await NpcData.find({ zone: zoneId }).select('npcId name _id');
      console.log(`🔍 [NPCs API] Available NPCs in ${zoneId}:`, 
        allNpcs.map(n => ({ npcId: n.npcId, name: n.name, _id: n._id.toString() }))
      );
      
      return res.status(404).json({
        success: false,
        error: `NPC non trouvé pour suppression: ${npcId} dans la zone ${zoneId}`,
        availableNPCs: allNpcs.map(n => ({ npcId: n.npcId, name: n.name }))
      });
    }
    
    console.log(`✅ [NPCs API] NPC "${deletedNpc.name}" deleted from map by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `NPC "${deletedNpc.name}" supprimé depuis l\'éditeur de carte`,
      deletedNPC: deletedNpc.toNpcFormat(),
      deletedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error deleting NPC from map editor:', error);
    res.status(500).json({
      success: false,
      error: `Erreur serveur lors de la suppression: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// ✅ ROUTE: Synchroniser les NPCs entre Map Editor et NPC Editor
router.post('/zones/:zoneId/npcs/sync-with-map', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    const { mapNPCs } = req.body; // NPCs provenant de l'éditeur de carte
    
    console.log(`🔄 [NPCs API] Synchronizing NPCs between map and NPC editor for zone: ${zoneId}`);
    
    if (!Array.isArray(mapNPCs)) {
      return res.status(400).json({
        success: false,
        error: 'mapNPCs doit être un tableau'
      });
    }
    
    // Récupérer les NPCs actuels en base
    const dbNPCs = await NpcData.findByZone(zoneId);
    
    // ✅ CORRECTION: Typer explicitement syncResults
    const syncResults: {
      updated: number;
      created: number;
      deleted: number;
      errors: string[];
    } = {
      updated: 0,
      created: 0,
      deleted: 0,
      errors: []
    };
    
    // Mettre à jour ou créer les NPCs de la carte
    for (const mapNPC of mapNPCs) {
      try {
        if (mapNPC.type !== 'npc') continue;
        
        const existingNPC = dbNPCs.find(npc => npc.npcId === mapNPC.id);
        
        if (existingNPC) {
          // Mettre à jour position si différente
          if (existingNPC.position.x !== mapNPC.x || existingNPC.position.y !== mapNPC.y) {
            existingNPC.position = { x: mapNPC.x, y: mapNPC.y };
            await existingNPC.save();
            syncResults.updated++;
          }
        } else {
          // Créer nouveau NPC
          const npcData = {
            id: mapNPC.id,
            name: mapNPC.name || `NPC_${mapNPC.id}`,
            type: mapNPC.npcType || 'dialogue',
            position: { x: mapNPC.x, y: mapNPC.y },
            sprite: mapNPC.sprite || 'npc_default',
            direction: mapNPC.direction || 'south'
          };
          
          await NpcData.createFromJson(npcData, zoneId);
          syncResults.created++;
        }
      } catch (error) {
        // ✅ CORRECTION: Gérer le type unknown de error
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        syncResults.errors.push(`NPC ${mapNPC.id}: ${errorMessage}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Synchronisation terminée',
      results: syncResults,
      syncedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error syncing NPCs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation'
    });
  }
});

export default router;
