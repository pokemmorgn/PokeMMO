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
import { ItemData } from '../models/ItemData';
import { DialogStringModel, IDialogString } from '../models/DialogString';


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
    
    
    // Combiner objets et NPCs
    const allObjects = [...formattedObjects, ...formattedNPCs];
    
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
    console.log('📦 [AdminAPI] Loading items from MongoDB...');
    
    const { category, generation, rarity, search, limit = 1000 } = req.query;
    
    // Construire les filtres
    const filter: any = { isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (generation && generation !== 'all') {
      filter.generation = parseInt(generation);
    }
    
    if (rarity && rarity !== 'all') {
      filter.rarity = rarity;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Récupérer les items
    const items = await ItemData.find(filter)
      .sort({ category: 1, name: 1 })
      .limit(parseInt(limit))
      .lean();
    
    // ✅ FORMATER pour compatibilité avec l'ancien format JSON
    const formattedItems: { [key: string]: any } = {};
    
    items.forEach(item => {
      formattedItems[item.itemId] = {
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        sell_price: item.sellPrice,
        stackable: item.stackable,
        consumable: item.consumable,
        sprite: item.sprite,
        generation: item.generation,
        rarity: item.rarity,
        tags: item.tags,
        effects: item.effects,
        obtain_methods: item.obtainMethods,
        usage_restrictions: item.usageRestrictions,
        // Données héritées pour compatibilité
        ...(item.legacyData || {})
      };
    });
    
    console.log(`✅ [AdminAPI] ${Object.keys(formattedItems).length} items loaded from MongoDB`);
    
    // ✅ MÊME FORMAT que l'ancien JSON - le client ne voit aucune différence !
    res.json(formattedItems);
    
  } catch (error) {
    console.error('❌ [AdminAPI] Error loading items from MongoDB:', error);
    res.status(500).json({ 
      error: 'Erreur chargement items depuis MongoDB',
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

// Dans server/src/routes/adminRoutes.ts
// Version nettoyée sans fonction dupliquée :

// ✅ ROUTE SIMPLE: Liste des zones depuis MongoDB
router.get('/maps/list', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('🗺️ [Maps API] Getting zones from MongoDB...');
    
    // Récupérer toutes les zones distinctes depuis MongoDB
    const [gameObjectZones, npcZones, shopZones] = await Promise.all([
      GameObjectData.distinct('zone').catch((): string[] => []),
      NpcData.distinct('zone').catch((): string[] => []), 
      ShopData.distinct('zone').catch((): string[] => [])
    ]);
    
    // Combiner toutes les zones et éliminer les doublons
    const allZones = Array.from(new Set([
      ...gameObjectZones,
      ...npcZones,
      ...shopZones,
      // Zones par défaut si DB vide
      'village', 'city', 'forest', 'cave', 'beach'
    ])).filter((zone): zone is string => typeof zone === 'string' && zone.trim().length > 0);
    
    // Formater comme attendu par le frontend
    const maps = allZones.map((zone: string) => ({
      id: zone,
      name: zone.charAt(0).toUpperCase() + zone.slice(1), // Simple capitalisation
      file: `${zone}.tmj` // Simulé pour compatibilité
    }));
    
    console.log(`✅ [Maps API] Found ${maps.length} zones:`, maps.map(m => m.id));
    
    res.json({
      success: true,
      maps,
      total: maps.length
    });
    
  } catch (error) {
    console.error('❌ [Maps API] Error:', error);
    
    // Fallback minimal
    const fallbackMaps = [
      { id: 'village', name: 'Village', file: 'village.tmj' },
      { id: 'city', name: 'City', file: 'city.tmj' },
      { id: 'forest', name: 'Forest', file: 'forest.tmj' },
      { id: 'cave', name: 'Cave', file: 'cave.tmj' },
      { id: 'beach', name: 'Beach', file: 'beach.tmj' }
    ];
    
    res.json({
      success: true,
      maps: fallbackMaps,
      total: fallbackMaps.length
    });
  }
});

// ✅ PAS de fonction formatMapName ici - utilise celle qui existe déjà ou supprime-la
// ✅ PAS de fonction formatMapName ici - utilise celle qui existe déjà ou supprime-la

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
    console.log(`🧑‍🤝‍🧑 [NPCs API] Loading ALL NPC data for zone: ${zoneId} from MongoDB`);
    
    // ✅ CORRECTION: Récupérer TOUS les champs sans restriction avec casting TypeScript
    const npcs = await NpcData.find({ zone: zoneId, isActive: true })
      .sort({ npcId: 1 })
      .lean(); // Utiliser lean() pour récupérer les objets JS bruts
    
    console.log(`✅ [NPCs API] Found ${npcs.length} NPCs for ${zoneId} in MongoDB`);
    console.log(`🔍 [NPCs API] First NPC raw data:`, npcs[0] ? Object.keys(npcs[0]) : 'No NPCs');
    
    // ✅ CORRECTION: Conversion COMPLÈTE au format éditeur avec casting TypeScript
    const formattedNPCs = npcs.map((npcRaw: any) => {
      console.log(`🔄 [NPCs API] Converting NPC ${npcRaw.npcId} with ALL fields`);
      
      // ✅ SOLUTION: Caster en 'any' pour éviter les erreurs TypeScript
      const npc = npcRaw as any;
      
      // Commencer par tous les champs de base
      const convertedNPC: any = {
        // Champs de base OBLIGATOIRES
        id: npc.npcId,
        name: npc.name,
        type: npc.type,
        sprite: npc.sprite,
        direction: npc.direction,
        
        // Position STRICTE
        position: {
          x: Number(npc.position?.x) || 0,
          y: Number(npc.position?.y) || 0
        },
        
        // Comportement
        interactionRadius: npc.interactionRadius || 32,
        canWalkAway: npc.canWalkAway !== false,
        autoFacePlayer: npc.autoFacePlayer !== false,
        repeatable: npc.repeatable !== false,
        cooldownSeconds: npc.cooldownSeconds || 0,
        
        // Système de quêtes
        questsToGive: npc.questsToGive || [],
        questsToEnd: npc.questsToEnd || [],
        questRequirements: npc.questRequirements || {},
        questDialogueIds: npc.questDialogueIds || {},
        
        // Conditions de spawn
        spawnConditions: npc.spawnConditions || {},
        
        // ✅ CORRECTION SIMPLE: Copier TOUS les champs depuis npcData avec casting
        // Dialogues (tous types)
        dialogueIds: npc.dialogueIds || npc.npcData?.dialogueIds || [],
        dialogueId: npc.dialogueId || npc.npcData?.dialogueId || '',
        conditionalDialogueIds: npc.conditionalDialogueIds || npc.npcData?.conditionalDialogueIds || {},
        zoneInfo: npc.zoneInfo || npc.npcData?.zoneInfo || {},
        
        // Merchant
        shopId: npc.shopId || npc.npcData?.shopId || '',
        
        // Trainer
        trainerId: npc.trainerId || npc.npcData?.trainerId || '',
        trainerClass: npc.trainerClass || npc.npcData?.trainerClass || '',
        trainerRank: npc.trainerRank || npc.npcData?.trainerRank || 1,
        trainerTitle: npc.trainerTitle || npc.npcData?.trainerTitle || '',
        battleConfig: npc.battleConfig || npc.npcData?.battleConfig || {},
        battleDialogueIds: npc.battleDialogueIds || npc.npcData?.battleDialogueIds || {},
        rewards: npc.rewards || npc.npcData?.rewards || {},
        rebattle: npc.rebattle || npc.npcData?.rebattle || {},
        visionConfig: npc.visionConfig || npc.npcData?.visionConfig || {},
        battleConditions: npc.battleConditions || npc.npcData?.battleConditions || {},
        progressionFlags: npc.progressionFlags || npc.npcData?.progressionFlags || {},
        
        // Healer
        healerConfig: npc.healerConfig || npc.npcData?.healerConfig || {},
        healerDialogueIds: npc.healerDialogueIds || npc.npcData?.healerDialogueIds || {},
        additionalServices: npc.additionalServices || npc.npcData?.additionalServices || {},
        serviceRestrictions: npc.serviceRestrictions || npc.npcData?.serviceRestrictions || {},
        
        // Gym Leader
        gymConfig: npc.gymConfig || npc.npcData?.gymConfig || {},
        gymDialogueIds: npc.gymDialogueIds || npc.npcData?.gymDialogueIds || {},
        challengeConditions: npc.challengeConditions || npc.npcData?.challengeConditions || {},
        gymRewards: npc.gymRewards || npc.npcData?.gymRewards || {},
        rematchConfig: npc.rematchConfig || npc.npcData?.rematchConfig || {},
        
        // Transport
        transportConfig: npc.transportConfig || npc.npcData?.transportConfig || {},
        destinations: npc.destinations || npc.npcData?.destinations || [],
        schedules: npc.schedules || npc.npcData?.schedules || [],
        transportDialogueIds: npc.transportDialogueIds || npc.npcData?.transportDialogueIds || {},
        weatherRestrictions: npc.weatherRestrictions || npc.npcData?.weatherRestrictions || {},
        
        // Service
        serviceConfig: npc.serviceConfig || npc.npcData?.serviceConfig || {},
        availableServices: npc.availableServices || npc.npcData?.availableServices || [],
        serviceDialogueIds: npc.serviceDialogueIds || npc.npcData?.serviceDialogueIds || {},
        
        // Minigame
        minigameConfig: npc.minigameConfig || npc.npcData?.minigameConfig || {},
        contestCategories: npc.contestCategories || npc.npcData?.contestCategories || [],
        contestRewards: npc.contestRewards || npc.npcData?.contestRewards || {},
        contestDialogueIds: npc.contestDialogueIds || npc.npcData?.contestDialogueIds || {},
        contestSchedule: npc.contestSchedule || npc.npcData?.contestSchedule || {},
        
        // Researcher
        researchConfig: npc.researchConfig || npc.npcData?.researchConfig || {},
        researchServices: npc.researchServices || npc.npcData?.researchServices || [],
        acceptedPokemon: npc.acceptedPokemon || npc.npcData?.acceptedPokemon || [],
        researchDialogueIds: npc.researchDialogueIds || npc.npcData?.researchDialogueIds || {},
        researchRewards: npc.researchRewards || npc.npcData?.researchRewards || {},
        
        // Guild
        guildConfig: npc.guildConfig || npc.npcData?.guildConfig || {},
        recruitmentRequirements: npc.recruitmentRequirements || npc.npcData?.recruitmentRequirements || {},
        guildServices: npc.guildServices || npc.npcData?.guildServices || [],
        guildDialogueIds: npc.guildDialogueIds || npc.npcData?.guildDialogueIds || {},
        rankSystem: npc.rankSystem || npc.npcData?.rankSystem || {},
        
        // Event
        eventConfig: npc.eventConfig || npc.npcData?.eventConfig || {},
        eventPeriod: npc.eventPeriod || npc.npcData?.eventPeriod || {},
        eventActivities: npc.eventActivities || npc.npcData?.eventActivities || [],
        eventDialogueIds: npc.eventDialogueIds || npc.npcData?.eventDialogueIds || {},
        globalProgress: npc.globalProgress || npc.npcData?.globalProgress || {},
        
        // Quest Master
        questMasterConfig: npc.questMasterConfig || npc.npcData?.questMasterConfig || {},
        questMasterDialogueIds: npc.questMasterDialogueIds || npc.npcData?.questMasterDialogueIds || {},
        questRankSystem: npc.questRankSystem || npc.npcData?.questRankSystem || {},
        epicRewards: npc.epicRewards || npc.npcData?.epicRewards || {},
        specialConditions: npc.specialConditions || npc.npcData?.specialConditions || {}
      };
      
      // ✅ CORRECTION CRITIQUE: Copier TOUS les champs restants depuis npcData avec casting
      if (npc.npcData && typeof npc.npcData === 'object') {
        Object.keys(npc.npcData).forEach((key: string) => {
          if (!(key in convertedNPC)) {
            convertedNPC[key] = npc.npcData[key];
          }
        });
      }
      
      console.log(`✅ [NPCs API] NPC ${npc.npcId} converted with ${Object.keys(convertedNPC).length} fields`);
      return convertedNPC;
    });
    
    res.json({
      success: true,
      data: {
        zone: zoneId,
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        description: `NPCs for zone ${zoneId} - Complete data from MongoDB`,
        npcs: formattedNPCs
      },
      zoneId,
      npcCount: npcs.length,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error loading complete NPCs from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement complet des NPCs depuis MongoDB'
    });
  }
});

// ✅ ROUTE: Sauvegarder les NPCs d'une zone dans MongoDB (CORRIGÉE)
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
    
    // ✅ NOUVEAU: Déterminer le mode de sauvegarde
    const saveMode = req.query.mode || 'replace'; // 'replace' | 'merge' | 'add'
    
    console.log(`🔄 [NPCs API] Mode de sauvegarde: ${saveMode}`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    
    // ✅ CORRECTION: Logique selon le mode
    if (saveMode === 'replace') {
      // Mode REPLACE: Supprimer tous les NPCs existants et recréer (ancien comportement)
      console.log(`🗑️ [NPCs API] MODE REPLACE: Suppression de tous les NPCs existants de ${zoneId}`);
      const deleteResult = await NpcData.deleteMany({ zone: zoneId });
      console.log(`🗑️ [NPCs API] ${deleteResult.deletedCount} NPCs supprimés`);
      
      // Créer tous les nouveaux NPCs
      for (const npcJson of npcData.npcs) {
        try {
          await NpcData.createFromJson(npcJson, zoneId);
          savedCount++;
        } catch (error) {
          const errorMsg = `NPC ${npcJson.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌ [NPCs API] Error creating NPC:', errorMsg);
        }
      }
      
    } else if (saveMode === 'merge') {
      // Mode MERGE: Mettre à jour les existants, créer les nouveaux
      console.log(`🔄 [NPCs API] MODE MERGE: Mise à jour/création sélective`);
      
      for (const npcJson of npcData.npcs) {
        try {
          if (!npcJson.id && !npcJson.npcId) {
            errors.push(`NPC sans ID: impossible de merger`);
            continue;
          }
          
          const npcId = npcJson.id || npcJson.npcId;
          
          // Chercher le NPC existant avec l'ID GLOBAL
          const existingNPC = await NpcData.findOne({ npcId: npcId });
          
          if (existingNPC) {
            // Mettre à jour le NPC existant
            await existingNPC.updateFromJson(npcJson);
            updatedCount++;
            console.log(`🔄 [NPCs API] NPC ${npcId} mis à jour`);
          } else {
            // Créer un nouveau NPC
            await NpcData.createFromJson(npcJson, zoneId);
            savedCount++;
            console.log(`➕ [NPCs API] NPC ${npcId} créé`);
          }
          
        } catch (error) {
          const errorMsg = `NPC ${npcJson.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌ [NPCs API] Error in merge mode:', errorMsg);
        }
      }
      
    } else if (saveMode === 'add') {
      // Mode ADD: Ajouter uniquement les nouveaux (ignorer les existants)
      console.log(`➕ [NPCs API] MODE ADD: Ajout uniquement des nouveaux NPCs`);
      
      for (const npcJson of npcData.npcs) {
        try {
          if (npcJson.id || npcJson.npcId) {
            const npcId = npcJson.id || npcJson.npcId;
            
            // Vérifier si le NPC existe déjà GLOBALEMENT
            const existingNPC = await NpcData.findOne({ npcId: npcId });
            
            if (existingNPC) {
              skippedCount++;
              console.log(`⏭️ [NPCs API] NPC ${npcId} existe déjà, ignoré`);
              continue;
            }
          }
          
          // Créer le nouveau NPC (ID sera attribué automatiquement si nécessaire)
          await NpcData.createFromJson(npcJson, zoneId);
          savedCount++;
          
        } catch (error) {
          const errorMsg = `NPC ${npcJson.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌ [NPCs API] Error in add mode:', errorMsg);
        }
      }
    }
    
    const totalProcessed = savedCount + updatedCount + skippedCount;
    
    console.log(`✅ [NPCs API] Sauvegarde terminée pour ${zoneId}:`);
    console.log(`   📊 Mode: ${saveMode}`);
    console.log(`   ➕ Créés: ${savedCount}`);
    console.log(`   🔄 Mis à jour: ${updatedCount}`);
    console.log(`   ⏭️ Ignorés: ${skippedCount}`);
    console.log(`   ❌ Erreurs: ${errors.length}`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [NPCs API] ${errors.length} erreurs:`, errors.slice(0, 5));
    }
    
    res.json({
      success: true,
      message: `NPCs sauvegardés pour ${zoneId} (mode: ${saveMode})`,
      zoneId,
      mode: saveMode,
      results: {
        created: savedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limiter les erreurs affichées
      timestamp: new Date().toISOString(),
      savedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error saving NPCs to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde des NPCs dans MongoDB',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ NOUVELLE ROUTE: Ajouter un seul NPC (plus sûre)
router.post('/zones/:zoneId/npcs/add-single', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    const npcJson = req.body;
    
    console.log(`➕ [NPCs API] Adding single NPC to zone: ${zoneId}`);
    console.log(`📋 [NPCs API] NPC data received:`, {
      name: npcJson.name,
      type: npcJson.type,
      position: npcJson.position,
      sprite: npcJson.sprite,
      hasId: !!(npcJson.id || npcJson.npcId)
    });
    
    // Validation du NPC
    if (!npcJson.name || !npcJson.type || !npcJson.position || !npcJson.sprite) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants pour le NPC (name, type, position, sprite)'
      });
    }
    
    // ✅ CORRECTION: Vérifier/obtenir l'ID global AVANT createFromJson
    let globalNpcId = npcJson.id || npcJson.npcId;
    
    if (!globalNpcId) {
      // Obtenir le prochain ID global disponible
      globalNpcId = await NpcData.getNextGlobalNpcId();
      console.log(`🆔 [NPCs API] ID global automatique attribué: ${globalNpcId}`);
    } else {
      // Vérifier que l'ID est disponible
      const isAvailable = await NpcData.isGlobalNpcIdAvailable(globalNpcId);
      if (!isAvailable) {
        console.log(`⚠️ [NPCs API] ID ${globalNpcId} déjà utilisé, attribution automatique`);
        globalNpcId = await NpcData.getNextGlobalNpcId();
        console.log(`🆔 [NPCs API] Nouvel ID global attribué: ${globalNpcId}`);
      }
    }
    
    // ✅ CORRECTION: Ajouter l'ID au JSON avant createFromJson
    const npcJsonWithId = {
      ...npcJson,
      id: globalNpcId,
      npcId: globalNpcId
    };
    
    console.log(`💾 [NPCs API] Creating NPC with guaranteed ID: ${globalNpcId}`);
    
    // Créer le NPC avec l'ID garanti
    const newNpc = await NpcData.createFromJson(npcJsonWithId, zoneId);
    
    console.log(`✅ [NPCs API] Single NPC "${newNpc.name}" (ID: ${newNpc.npcId}) added to ${zoneId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `NPC "${newNpc.name}" ajouté à la zone ${zoneId}`,
      npc: newNpc.toNpcFormat(),
      globalId: newNpc.npcId, // ✅ Retourner l'ID global attribué
      zoneId,
      addedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error adding single NPC to MongoDB:', error);
    
    // ✅ MEILLEUR DEBUG
    if (error instanceof Error) {
      console.error('❌ [NPCs API] Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        npcData: req.body
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du NPC dans MongoDB',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ ROUTE ALTERNATIVE: Créer un NPC directement avec new + save (pour debug)
router.post('/zones/:zoneId/npcs/add-direct', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId } = req.params;
    const npcJson = req.body;
    
    console.log(`➕ [NPCs API] DIRECT: Adding NPC to zone: ${zoneId}`);
    
    // Validation
    if (!npcJson.name || !npcJson.type || !npcJson.position || !npcJson.sprite) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants'
      });
    }
    
    // Obtenir l'ID global
    const globalNpcId = await NpcData.getNextGlobalNpcId();
    console.log(`🆔 [NPCs API] DIRECT: ID global attribué: ${globalNpcId}`);
    
    // Créer directement avec new
    const newNpc = new NpcData({
      npcId: globalNpcId, // ✅ ID explicite
      zone: zoneId,
      name: npcJson.name,
      type: npcJson.type,
      position: {
        x: Number(npcJson.position?.x) || 0,
        y: Number(npcJson.position?.y) || 0
      },
      direction: npcJson.direction || 'south',
      sprite: npcJson.sprite,
      interactionRadius: npcJson.interactionRadius || 32,
      canWalkAway: npcJson.canWalkAway !== false,
      autoFacePlayer: npcJson.autoFacePlayer !== false,
      repeatable: npcJson.repeatable !== false,
      cooldownSeconds: npcJson.cooldownSeconds || 0,
      isActive: true,
      version: '3.0.0',
      sourceFile: 'admin_direct_create'
    });
    
    console.log(`💾 [NPCs API] DIRECT: Saving NPC with ID ${globalNpcId}...`);
    await newNpc.save();
    
    console.log(`✅ [NPCs API] DIRECT: NPC "${newNpc.name}" (ID: ${newNpc.npcId}) created successfully`);
    
    res.json({
      success: true,
      message: `NPC "${newNpc.name}" créé directement`,
      npc: newNpc.toNpcFormat(),
      globalId: newNpc.npcId,
      method: 'direct',
      zoneId,
      addedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] DIRECT: Error creating NPC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur création directe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ NOUVELLE ROUTE: Mettre à jour un seul NPC (plus sûre)
router.put('/zones/:zoneId/npcs/:npcId/update-single', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    const npcJson = req.body;
    
    console.log(`🔄 [NPCs API] Updating single NPC ${npcId} in zone ${zoneId}`);
    
    // Trouver le NPC par ID GLOBAL (pas par zone)
    const existingNpc = await NpcData.findOne({ npcId: parseInt(npcId) });
    
    if (!existingNpc) {
      return res.status(404).json({
        success: false,
        error: `NPC avec ID global ${npcId} non trouvé`
      });
    }
    
    // Vérifier que le NPC est bien dans la zone attendue (optionnel)
    if (existingNpc.zone !== zoneId) {
      console.warn(`⚠️ [NPCs API] NPC ${npcId} est dans la zone ${existingNpc.zone}, pas ${zoneId}`);
    }
    
    // Mettre à jour le NPC
    await existingNpc.updateFromJson(npcJson);
    
    console.log(`✅ [NPCs API] Single NPC ${npcId} "${existingNpc.name}" updated by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `NPC "${existingNpc.name}" (ID: ${npcId}) mis à jour`,
      npc: existingNpc.toNpcFormat(),
      globalId: existingNpc.npcId,
      originalZone: existingNpc.zone,
      updatedBy: req.user.username,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error updating single NPC:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du NPC',
      details: error instanceof Error ? error.message : 'Unknown error'
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
// Dans server/src/routes/adminRoutes.ts
// Remplacer complètement la route PUT /zones/:zoneId/npcs/:npcId par :

router.put('/zones/:zoneId/npcs/:npcId', requireMacAndDev, async (req: any, res) => {
  try {
    const { zoneId, npcId } = req.params;
    const { npc } = req.body;
    
    console.log(`✏️ [NPCs API] Complete MongoDB update NPC ${npcId} in zone ${zoneId}`);
        // ✅ AJOUTEZ CES LOGS DE DEBUG ICI :
    console.log('🔍 [NPCs API] Request body keys:', Object.keys(req.body));
    console.log('🔍 [NPCs API] NPC data keys:', Object.keys(npc || {}));
    console.log('🔍 [NPCs API] NPC shopId received:', npc?.shopId);
    console.log('🔍 [NPCs API] NPC shopType received:', npc?.shopType);
    console.log('🔍 [NPCs API] NPC type received:', npc?.type);
    if (!npc) {
      return res.status(400).json({
        success: false,
        error: 'Données NPC manquantes'
      });
    }
    
    // ✅ MISE À JOUR COMPLÈTE avec TOUS les champs possibles
    const updateData: any = {
      name: npc.name,
      type: npc.type,
      sprite: npc.sprite,
      direction: npc.direction,
      position: {
        x: Number(npc.position?.x) || 0,
        y: Number(npc.position?.y) || 0
      },
      interactionRadius: npc.interactionRadius || 32,
      canWalkAway: npc.canWalkAway !== false,
      autoFacePlayer: npc.autoFacePlayer !== false,
      repeatable: npc.repeatable !== false,
      cooldownSeconds: npc.cooldownSeconds || 0,
      
      // Système de quêtes
      questsToGive: npc.questsToGive || [],
      questsToEnd: npc.questsToEnd || [],
      questRequirements: npc.questRequirements || {},
      questDialogueIds: npc.questDialogueIds || {},
      
      // Conditions de spawn
      spawnConditions: npc.spawnConditions || {},
      
      // Métadonnées
      lastUpdated: new Date(),
      version: '2.0.0'
    };
    
    // ✅ TOUS LES CHAMPS SPÉCIFIQUES AU TYPE
    // Dialogue NPCs
    if (npc.dialogueIds !== undefined) updateData.dialogueIds = npc.dialogueIds;
    if (npc.dialogueId !== undefined) updateData.dialogueId = npc.dialogueId;
    if (npc.conditionalDialogueIds !== undefined) updateData.conditionalDialogueIds = npc.conditionalDialogueIds;
    if (npc.zoneInfo !== undefined) updateData.zoneInfo = npc.zoneInfo;
    
    // Merchant NPCs
    if (npc.shopId !== undefined) updateData.shopId = npc.shopId;
    
    // Trainer NPCs
    if (npc.trainerId !== undefined) updateData.trainerId = npc.trainerId;
    if (npc.trainerClass !== undefined) updateData.trainerClass = npc.trainerClass;
    if (npc.trainerRank !== undefined) updateData.trainerRank = npc.trainerRank;
    if (npc.trainerTitle !== undefined) updateData.trainerTitle = npc.trainerTitle;
    if (npc.battleConfig !== undefined) updateData.battleConfig = npc.battleConfig;
    if (npc.battleDialogueIds !== undefined) updateData.battleDialogueIds = npc.battleDialogueIds;
    if (npc.rewards !== undefined) updateData.rewards = npc.rewards;
    if (npc.rebattle !== undefined) updateData.rebattle = npc.rebattle;
    if (npc.visionConfig !== undefined) updateData.visionConfig = npc.visionConfig;
    if (npc.battleConditions !== undefined) updateData.battleConditions = npc.battleConditions;
    if (npc.progressionFlags !== undefined) updateData.progressionFlags = npc.progressionFlags;
    
    // Healer NPCs
    if (npc.healerConfig !== undefined) updateData.healerConfig = npc.healerConfig;
    if (npc.healerDialogueIds !== undefined) updateData.healerDialogueIds = npc.healerDialogueIds;
    if (npc.additionalServices !== undefined) updateData.additionalServices = npc.additionalServices;
    if (npc.serviceRestrictions !== undefined) updateData.serviceRestrictions = npc.serviceRestrictions;
    
    // Gym Leader NPCs
    if (npc.gymConfig !== undefined) updateData.gymConfig = npc.gymConfig;
    if (npc.gymDialogueIds !== undefined) updateData.gymDialogueIds = npc.gymDialogueIds;
    if (npc.challengeConditions !== undefined) updateData.challengeConditions = npc.challengeConditions;
    if (npc.gymRewards !== undefined) updateData.gymRewards = npc.gymRewards;
    if (npc.rematchConfig !== undefined) updateData.rematchConfig = npc.rematchConfig;
    
    // Transport NPCs
    if (npc.transportConfig !== undefined) updateData.transportConfig = npc.transportConfig;
    if (npc.destinations !== undefined) updateData.destinations = npc.destinations;
    if (npc.schedules !== undefined) updateData.schedules = npc.schedules;
    if (npc.transportDialogueIds !== undefined) updateData.transportDialogueIds = npc.transportDialogueIds;
    if (npc.weatherRestrictions !== undefined) updateData.weatherRestrictions = npc.weatherRestrictions;
    
    // Service NPCs
    if (npc.serviceConfig !== undefined) updateData.serviceConfig = npc.serviceConfig;
    if (npc.availableServices !== undefined) updateData.availableServices = npc.availableServices;
    if (npc.serviceDialogueIds !== undefined) updateData.serviceDialogueIds = npc.serviceDialogueIds;
    
    // Minigame NPCs
    if (npc.minigameConfig !== undefined) updateData.minigameConfig = npc.minigameConfig;
    if (npc.contestCategories !== undefined) updateData.contestCategories = npc.contestCategories;
    if (npc.contestRewards !== undefined) updateData.contestRewards = npc.contestRewards;
    if (npc.contestDialogueIds !== undefined) updateData.contestDialogueIds = npc.contestDialogueIds;
    if (npc.contestSchedule !== undefined) updateData.contestSchedule = npc.contestSchedule;
    
    // Researcher NPCs
    if (npc.researchConfig !== undefined) updateData.researchConfig = npc.researchConfig;
    if (npc.researchServices !== undefined) updateData.researchServices = npc.researchServices;
    if (npc.acceptedPokemon !== undefined) updateData.acceptedPokemon = npc.acceptedPokemon;
    if (npc.researchDialogueIds !== undefined) updateData.researchDialogueIds = npc.researchDialogueIds;
    if (npc.researchRewards !== undefined) updateData.researchRewards = npc.researchRewards;
    
    // Guild NPCs
    if (npc.guildConfig !== undefined) updateData.guildConfig = npc.guildConfig;
    if (npc.recruitmentRequirements !== undefined) updateData.recruitmentRequirements = npc.recruitmentRequirements;
    if (npc.guildServices !== undefined) updateData.guildServices = npc.guildServices;
    if (npc.guildDialogueIds !== undefined) updateData.guildDialogueIds = npc.guildDialogueIds;
    if (npc.rankSystem !== undefined) updateData.rankSystem = npc.rankSystem;
    
    // Event NPCs
    if (npc.eventConfig !== undefined) updateData.eventConfig = npc.eventConfig;
    if (npc.eventPeriod !== undefined) updateData.eventPeriod = npc.eventPeriod;
    if (npc.eventActivities !== undefined) updateData.eventActivities = npc.eventActivities;
    if (npc.eventDialogueIds !== undefined) updateData.eventDialogueIds = npc.eventDialogueIds;
    if (npc.globalProgress !== undefined) updateData.globalProgress = npc.globalProgress;
    
    // Quest Master NPCs
    if (npc.questMasterConfig !== undefined) updateData.questMasterConfig = npc.questMasterConfig;
    if (npc.questMasterDialogueIds !== undefined) updateData.questMasterDialogueIds = npc.questMasterDialogueIds;
    if (npc.questRankSystem !== undefined) updateData.questRankSystem = npc.questRankSystem;
    if (npc.epicRewards !== undefined) updateData.epicRewards = npc.epicRewards;
    if (npc.specialConditions !== undefined) updateData.specialConditions = npc.specialConditions;
    
// ✅ AJOUTEZ CES LOGS JUSTE AVANT LA SAUVEGARDE :
console.log('🔍 [NPCs API] updateData shopId:', updateData.shopId);
console.log('🔍 [NPCs API] updateData shopType:', updateData.shopType);
console.log('🔍 [NPCs API] updateData keys count:', Object.keys(updateData).length);

// ✅ MISE À JOUR avec TOUS les champs
const updatedNpc = await NpcData.findOneAndUpdate(
      { 
        zone: zoneId, 
        npcId: parseInt(npcId) 
      },
      { $set: updateData },
      { 
        new: true,
        runValidators: true
      }
    );

console.log('🔍 [NPCs API] MongoDB returned shopId:', (updatedNpc as any)?.shopId);
console.log('🔍 [NPCs API] MongoDB returned shopType:', (updatedNpc as any)?.shopType);
console.log('🔍 [NPCs API] MongoDB document keys:', Object.keys(updatedNpc?.toObject() || {}));
      
    if (!updatedNpc) {
      return res.status(404).json({
        success: false,
        error: 'NPC non trouvé'
      });
    }
    
    console.log(`✅ [NPCs API] ALL fields updated for NPC ${npcId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'NPC mis à jour avec succès (tous champs)',
      npc: updatedNpc.toNpcFormat(),
      updatedBy: req.user.username,
      fieldsUpdated: Object.keys(updateData).length
    });
    
  } catch (error) {
    console.error('❌ [NPCs API] Error updating all NPC fields:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour complète du NPC',
      details: error instanceof Error ? error.message : 'Unknown error'
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

// Routes Shop simplifiées à ajouter dans server/src/routes/adminRoutes.ts

/**
 * GET /api/admin/shops/list
 * Récupérer toutes les boutiques pour la liste
 */
router.get('/shops/list', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('🏪 [Admin] Loading all shops...');
        
        const shops = await ShopData.find({ isActive: true })
            .select('shopId nameKey type location currency items isTemporary isActive buyMultiplier sellMultiplier')
            .sort({ 'location.zone': 1, shopId: 1 })
            .lean();
        
        const formattedShops = shops.map(shop => ({
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            itemCount: shop.items?.length || 0,
            isTemporary: shop.isTemporary || false,
            isActive: shop.isActive !== false,
            buyMultiplier: shop.buyMultiplier,
            sellMultiplier: shop.sellMultiplier
        }));
        
        console.log(`✅ [Admin] ${formattedShops.length} shops loaded`);
        
        res.json({
            success: true,
            shops: formattedShops,
            total: formattedShops.length
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error loading shops:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des boutiques'
        });
    }
});

/**
 * GET /api/admin/shops/by-zone/:zone
 * Récupérer les boutiques d'une zone spécifique
 */
router.get('/shops/by-zone/:zone', requireMacAndDev, async (req: any, res) => {
    try {
        const { zone } = req.params;
        
        console.log(`🗺️ [Admin] Loading shops for zone: ${zone}`);
        
        const shops = await ShopData.find({ 
            'location.zone': zone,
            isActive: true 
        })
        .select('shopId nameKey type location currency items isTemporary isActive buyMultiplier sellMultiplier')
        .sort({ shopId: 1 })
        .lean();
        
        const formattedShops = shops.map(shop => ({
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            itemCount: shop.items?.length || 0,
            isTemporary: shop.isTemporary || false,
            isActive: shop.isActive !== false,
            buyMultiplier: shop.buyMultiplier,
            sellMultiplier: shop.sellMultiplier
        }));
        
        console.log(`✅ [Admin] ${formattedShops.length} shops found in zone ${zone}`);
        
        res.json({
            success: true,
            shops: formattedShops,
            zone,
            total: formattedShops.length
        });
        
    } catch (error) {
        console.error(`❌ [Admin] Error loading shops for zone ${req.params.zone}:`, error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des boutiques de la zone'
        });
    }
});

/**
 * GET /api/admin/shops/details/:shopId
 * Récupérer les détails complets d'une boutique
 */
router.get('/shops/details/:shopId', requireMacAndDev, async (req: any, res) => {
    try {
        const { shopId } = req.params;
        
        console.log(`🔍 [Admin] Loading details for shop: ${shopId}`);
        
        const shop = await ShopData.findOne({ shopId }).lean();
        
        if (!shop) {
            return res.status(404).json({
                success: false,
                error: 'Boutique non trouvée'
            });
        }
        
        // Formater les détails complets pour l'éditeur
        const shopDetails = {
            shopId: shop.shopId,
            name: shop.nameKey || shop.shopId,
            nameKey: shop.nameKey,
            type: shop.type,
            location: shop.location,
            currency: shop.currency,
            buyMultiplier: shop.buyMultiplier || 1.0,
            sellMultiplier: shop.sellMultiplier || 0.5,
            taxRate: shop.taxRate || 0,
            items: shop.items || [],
            shopKeeper: shop.shopKeeper,
            accessRequirements: shop.accessRequirements,
            restockInfo: shop.restockInfo,
            isTemporary: shop.isTemporary || false,
            isActive: shop.isActive !== false,
            version: shop.version,
            lastUpdated: shop.lastUpdated
        };
        
        console.log(`✅ [Admin] Shop details loaded for ${shopId}`);
        
        res.json({
            success: true,
            shop: shopDetails
        });
        
    } catch (error) {
        console.error(`❌ [Admin] Error loading shop details for ${req.params.shopId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des détails de la boutique'
        });
    }
});

/**
 * POST /api/admin/shops
 * Créer une nouvelle boutique
 */
router.post('/shops', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('🏪 [Admin] Creating new shop...');
        
        const shopData = req.body;
        
        // Validation des données de base
        if (!shopData.shopId || !shopData.name || !shopData.type) {
            return res.status(400).json({
                success: false,
                error: 'shopId, name et type sont requis'
            });
        }
        
        // Vérifier que l'ID n'existe pas déjà
        const existingShop = await ShopData.findOne({ shopId: shopData.shopId });
        if (existingShop) {
            return res.status(400).json({
                success: false,
                error: 'Une boutique avec cet ID existe déjà'
            });
        }
        
        // Créer la nouvelle boutique
        const newShop = await ShopData.create({
            shopId: shopData.shopId,
            nameKey: `shop.name.${shopData.shopId}`,
            type: shopData.type,
            location: {
                zone: shopData.location?.zone || '',
                cityKey: shopData.location?.city ? `location.city.${shopData.location.city}` : undefined,
                buildingKey: shopData.location?.building ? `location.building.${shopData.location.building}` : undefined
            },
            currency: shopData.currency || 'gold',
            buyMultiplier: shopData.buyMultiplier || 1.0,
            sellMultiplier: shopData.sellMultiplier || 0.5,
            taxRate: shopData.taxRate || 0,
            items: shopData.items || [],
            isActive: shopData.isActive !== false,
            isTemporary: shopData.isTemporary || false,
            version: '1.0.0',
            sourceFile: `admin_editor_${req.user.username}`
        });
        
        console.log(`✅ [Admin] Shop "${newShop.shopId}" created by ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Boutique créée avec succès',
            shop: {
                shopId: newShop.shopId,
                name: newShop.nameKey,
                type: newShop.type,
                location: newShop.location,
                currency: newShop.currency,
                isActive: newShop.isActive
            },
            createdBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error creating shop:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la boutique',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/admin/shops/:shopId
 * Mettre à jour une boutique existante
 */
/**
 * PUT /api/admin/shops/:shopId
 * Mettre à jour une boutique existante - VERSION CORRIGÉE
 */
/**
 * PUT /api/admin/shops/:shopId
 * Mettre à jour une boutique existante - VERSION CORRIGÉE
 */
/**
 * PUT /api/admin/shops/:shopId
 * Mettre à jour une boutique existante - VERSION CORRIGÉE
 */
router.put('/shops/:shopId', requireMacAndDev, async (req: any, res) => {
    try {
        const { shopId } = req.params;
        const shopData = req.body;
        
        console.log(`🏪 [Admin] Updating shop: ${shopId}`);
        
        // Trouver la boutique existante
        const existingShop = await ShopData.findOne({ shopId });
        if (!existingShop) {
            return res.status(404).json({
                success: false,
                error: 'Boutique non trouvée'
            });
        }
        
        // ✅ CORRECTION: Mise à jour directe des propriétés du modèle
        if (shopData.name) {
            existingShop.nameKey = `shop.name.${shopId}`;
        }
        
        if (shopData.type) {
            existingShop.type = shopData.type;
        }
        
        // Mise à jour de la location
        if (shopData.location) {
            if (shopData.location.zone) {
                existingShop.location.zone = shopData.location.zone;
            }
            if (shopData.location.city) {
                existingShop.location.cityKey = `location.city.${shopData.location.city}`;
            }
            if (shopData.location.building) {
                existingShop.location.buildingKey = `location.building.${shopData.location.building}`;
            }
        }
        
        // Mise à jour des autres propriétés
        if (shopData.currency) existingShop.currency = shopData.currency;
        if (shopData.buyMultiplier !== undefined) existingShop.buyMultiplier = shopData.buyMultiplier;
        if (shopData.sellMultiplier !== undefined) existingShop.sellMultiplier = shopData.sellMultiplier;
        if (shopData.taxRate !== undefined) existingShop.taxRate = shopData.taxRate;
        if (shopData.items) existingShop.items = shopData.items;
        if (shopData.isActive !== undefined) existingShop.isActive = shopData.isActive;
        if (shopData.isTemporary !== undefined) existingShop.isTemporary = shopData.isTemporary;
        
        existingShop.lastUpdated = new Date();
        
        await existingShop.save();
        
        console.log(`✅ [Admin] Shop "${shopId}" updated by ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Boutique mise à jour avec succès',
            shop: {
                shopId: existingShop.shopId,
                name: existingShop.nameKey,
                type: existingShop.type,
                location: existingShop.location,
                currency: existingShop.currency,
                buyMultiplier: existingShop.buyMultiplier,
                sellMultiplier: existingShop.sellMultiplier,
                items: existingShop.items,
                isActive: existingShop.isActive,
                isTemporary: existingShop.isTemporary
            },
            updatedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error updating shop:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la boutique',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/admin/shops/:shopId
 * Supprimer une boutique
 */
router.delete('/shops/:shopId', requireMacAndDev, async (req: any, res) => {
    try {
        const { shopId } = req.params;
        
        console.log(`🗑️ [Admin] Deleting shop: ${shopId}`);
        
        const deletedShop = await ShopData.findOneAndDelete({ shopId });
        if (!deletedShop) {
            return res.status(404).json({
                success: false,
                error: 'Boutique non trouvée'
            });
        }
        
        console.log(`✅ [Admin] Shop "${shopId}" deleted by ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Boutique supprimée avec succès',
            deletedShop: {
                shopId: deletedShop.shopId,
                name: deletedShop.nameKey
            },
            deletedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error deleting shop:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la boutique'
        });
    }
});

/**
 * POST /api/admin/shops/:shopId/duplicate
 * Dupliquer une boutique
 */
router.post('/shops/:shopId/duplicate', requireMacAndDev, async (req: any, res) => {
    try {
        const { shopId } = req.params;
        
        console.log(`📋 [Admin] Duplicating shop: ${shopId}`);
        
        // Trouver la boutique originale
        const originalShop = await ShopData.findOne({ shopId });
        if (!originalShop) {
            return res.status(404).json({
                success: false,
                error: 'Boutique originale non trouvée'
            });
        }
        
        // Générer un nouvel ID unique
        const newShopId = `${shopId}_copy_${Date.now()}`;
        
        // Créer la copie
        const duplicateShop = await ShopData.create({
            ...originalShop.toObject(),
            _id: undefined, // Nouveau document
            shopId: newShopId,
            nameKey: `shop.name.${newShopId}`,
            sourceFile: `duplicated_from_${shopId}_by_${req.user.username}`,
            lastUpdated: new Date()
        });
        
        console.log(`✅ [Admin] Shop duplicated: ${shopId} -> ${newShopId} by ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Boutique dupliquée avec succès',
            originalShopId: shopId,
            newShopId: newShopId,
            shop: {
                shopId: duplicateShop.shopId,
                name: duplicateShop.nameKey,
                type: duplicateShop.type
            },
            duplicatedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error duplicating shop:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la duplication de la boutique'
        });
    }
});

/**
 * GET /api/admin/shops/stats
 * Statistiques générales des boutiques
 */
router.get('/shops/stats', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('📊 [Admin] Generating shops statistics...');
        
        const [
            totalShops,
            activeShops,
            temporaryShops,
            shopsByType
        ] = await Promise.all([
            ShopData.countDocuments({}),
            ShopData.countDocuments({ isActive: true }),
            ShopData.countDocuments({ isTemporary: true }),
            ShopData.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        
        const stats = {
            total: totalShops,
            active: activeShops,
            inactive: totalShops - activeShops,
            temporary: temporaryShops,
            byType: shopsByType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
        
        console.log('✅ [Admin] Shop statistics generated successfully');
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error generating shop statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération des statistiques'
        });
    }
});

/**
 * GET /api/admin/shops/export/all
 * Exporter toutes les boutiques
 */
router.get('/shops/export/all', requireMacAndDev, async (req: any, res) => {
    try {
        console.log(`📤 [Admin] Exporting all shops by ${req.user.username}`);
        
        // Récupérer toutes les boutiques
        const allShops = await ShopData.find({ isActive: true }).sort({ 'location.zone': 1, shopId: 1 });
        
        // Grouper par zone
        const shopsByZone: Record<string, any> = {};
        
        allShops.forEach(shop => {
            const zone = shop.location.zone || 'unknown';
            if (!shopsByZone[zone]) {
                shopsByZone[zone] = {
                    zone: zone,
                    version: '1.0.0',
                    lastUpdated: new Date().toISOString(),
                    description: `Shops for zone ${zone} - Exported from Admin Panel`,
                    shops: []
                };
            }
            shopsByZone[zone].shops.push({
                shopId: shop.shopId,
                name: shop.nameKey,
                type: shop.type,
                location: shop.location,
                currency: shop.currency,
                buyMultiplier: shop.buyMultiplier,
                sellMultiplier: shop.sellMultiplier,
                items: shop.items,
                isActive: shop.isActive,
                isTemporary: shop.isTemporary
            });
        });
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.username,
            source: 'admin_panel',
            totalZones: Object.keys(shopsByZone).length,
            totalShops: allShops.length,
            zones: shopsByZone
        };
        
        res.json({
            success: true,
            data: exportData
        });
        
    } catch (error) {
        console.error('❌ [Admin] Error exporting shops:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'export des boutiques'
        });
    }
});


// À ajouter dans server/src/routes/adminRoutes.ts

/**
 * GET /api/admin/pokemon/list
 * Retourne la liste des Pokémon depuis pokemon-index.json
 */
router.get('/pokemon/list', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('🐾 [AdminAPI] Loading Pokemon from pokemon-index.json...')
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Détecter si on est en mode build ou dev
    const isDev = __filename.includes('/src/');
    console.log('🔧 [AdminAPI] Mode détecté:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
    
    let pokemonIndexPath: string;
    
    if (isDev) {
      // Mode développement : server/src/data/pokemon/pokemon-index.json
      pokemonIndexPath = path.join(__dirname, '../data/pokemon/pokemon-index.json');
    } else {
      // Mode production : server/build/data/pokemon/pokemon-index.json
      pokemonIndexPath = path.join(__dirname, '../data/pokemon/pokemon-index.json');
    }
    
    console.log('📂 [AdminAPI] Pokemon index path:', pokemonIndexPath);
    
    try {
      const pokemonIndexData = await fs.readFile(pokemonIndexPath, 'utf8');
      const pokemonIndex = JSON.parse(pokemonIndexData);
      
      // Mapping des IDs vers les noms (Génération 1 principalement)
      const pokemonNames: Record<string, string> = {
        1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur',
        4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
        7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise',
        10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
        13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill',
        16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
        19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow',
        23: 'Ekans', 24: 'Arbok', 25: 'Pikachu', 26: 'Raichu',
        27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina', 31: 'Nidoqueen',
        32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Clefairy', 36: 'Clefable',
        37: 'Vulpix', 38: 'Ninetales', 39: 'Jigglypuff', 40: 'Wigglytuff',
        41: 'Zubat', 42: 'Golbat', 43: 'Oddish', 44: 'Gloom', 45: 'Vileplume',
        46: 'Paras', 47: 'Parasect', 48: 'Venonat', 49: 'Venomoth',
        50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian',
        54: 'Psyduck', 55: 'Golduck', 56: 'Mankey', 57: 'Primeape',
        58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag', 61: 'Poliwhirl', 62: 'Poliwrath',
        63: 'Abra', 64: 'Kadabra', 65: 'Alakazam', 66: 'Machop', 67: 'Machoke', 68: 'Machamp',
        69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool', 73: 'Tentacruel',
        74: 'Geodude', 75: 'Graveler', 76: 'Golem', 77: 'Ponyta', 78: 'Rapidash',
        79: 'Slowpoke', 80: 'Slowbro', 81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d',
        84: 'Doduo', 85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk',
        90: 'Shellder', 91: 'Cloyster', 92: 'Gastly', 93: 'Haunter', 94: 'Gengar',
        95: 'Onix', 96: 'Drowzee', 97: 'Hypno', 98: 'Krabby', 99: 'Kingler',
        100: 'Voltorb', 101: 'Electrode', 102: 'Exeggcute', 103: 'Exeggutor',
        104: 'Cubone', 105: 'Marowak', 106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung',
        109: 'Koffing', 110: 'Weezing', 111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey',
        114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea', 117: 'Seadra',
        118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie', 122: 'Mr. Mime',
        123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz', 126: 'Magmar', 127: 'Pinsir',
        128: 'Tauros', 129: 'Magikarp', 130: 'Gyarados', 131: 'Lapras', 132: 'Ditto',
        133: 'Eevee', 134: 'Vaporeon', 135: 'Jolteon', 136: 'Flareon', 137: 'Porygon',
        138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto', 141: 'Kabutops', 142: 'Aerodactyl',
        143: 'Snorlax', 144: 'Articuno', 145: 'Zapdos', 146: 'Moltres',
        147: 'Dratini', 148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew',
        // Quelques Pokémon additionnels présents dans l'index
        170: 'Chinchou', 171: 'Lanturn', 194: 'Wooper', 195: 'Quagsire',
        196: 'Espeon', 197: 'Umbreon', 218: 'Slugma', 219: 'Magcargo',
        225: 'Delibird', 243: 'Raikou', 244: 'Entei', 245: 'Suicune',
        470: 'Leafeon', 471: 'Glaceon', 607: 'Litwick', 608: 'Lampent', 609: 'Chandelure'
      };
      
      // Créer la liste des Pokémon depuis l'index
      const pokemonList = Object.entries(pokemonIndex).map(([id, family]) => {
        const pokemonId = parseInt(id);
        const name = pokemonNames[id] || `Pokemon_${id}`;
        
        return {
          id: pokemonId,
          name: name,
          family: family,
          generation: pokemonId <= 151 ? 1 : pokemonId <= 251 ? 2 : pokemonId <= 386 ? 3 : pokemonId <= 493 ? 4 : 5
        };
      }).sort((a, b) => a.id - b.id);
      
      console.log(`✅ [AdminAPI] ${pokemonList.length} Pokémon loaded from index`);
      
      res.json({
        success: true,
        pokemon: pokemonList,
        total: pokemonList.length,
        source: 'pokemon-index.json'
      });
      
    } catch (fileError) {
      console.error('❌ [AdminAPI] Error reading pokemon-index.json:', fileError);
      console.log('📂 [AdminAPI] Tried path:', pokemonIndexPath);
      
      // Essayer plusieurs chemins possibles
      const possiblePaths = [
        path.join(__dirname, '../data/pokemon/pokemon-index.json'),           // Relatif normal
        path.join(__dirname, '../../data/pokemon/pokemon-index.json'),        // Un niveau plus haut
        path.join(process.cwd(), 'server/build/data/pokemon/pokemon-index.json'), // Absolu build
        path.join(process.cwd(), 'server/src/data/pokemon/pokemon-index.json'),   // Absolu src
        path.join(process.cwd(), 'server/data/pokemon/pokemon-index.json'),       // Racine server
        path.join(process.cwd(), 'data/pokemon/pokemon-index.json')               // Racine projet
      ];
      
      console.log('🔍 [AdminAPI] Trying alternative paths...');
      
      for (const altPath of possiblePaths) {
        try {
          console.log('📂 [AdminAPI] Trying:', altPath);
          const altPokemonData = await fs.readFile(altPath, 'utf8');
          const altPokemonIndex = JSON.parse(altPokemonData);
          
          // Utiliser le même mapping que ci-dessus
          const pokemonNames: Record<string, string> = {
            1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur', 4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
            7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise', 10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
            13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill', 16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
            19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow', 23: 'Ekans', 24: 'Arbok',
            25: 'Pikachu', 26: 'Raichu', 27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina',
            31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Clefairy', 36: 'Clefable',
            37: 'Vulpix', 38: 'Ninetales', 39: 'Jigglypuff', 40: 'Wigglytuff', 41: 'Zubat', 42: 'Golbat',
            43: 'Oddish', 44: 'Gloom', 45: 'Vileplume', 46: 'Paras', 47: 'Parasect', 48: 'Venonat',
            49: 'Venomoth', 50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian', 54: 'Psyduck',
            55: 'Golduck', 56: 'Mankey', 57: 'Primeape', 58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag',
            61: 'Poliwhirl', 62: 'Poliwrath', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam', 66: 'Machop',
            67: 'Machoke', 68: 'Machamp', 69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool',
            73: 'Tentacruel', 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 77: 'Ponyta', 78: 'Rapidash',
            79: 'Slowpoke', 80: 'Slowbro', 81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d', 84: 'Doduo',
            85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk', 90: 'Shellder', 91: 'Cloyster',
            92: 'Gastly', 93: 'Haunter', 94: 'Gengar', 95: 'Onix', 96: 'Drowzee', 97: 'Hypno', 98: 'Krabby',
            99: 'Kingler', 100: 'Voltorb', 101: 'Electrode', 102: 'Exeggcute', 103: 'Exeggutor', 104: 'Cubone',
            105: 'Marowak', 106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung', 109: 'Koffing', 110: 'Weezing',
            111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey', 114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea',
            117: 'Seadra', 118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie', 122: 'Mr. Mime',
            123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz', 126: 'Magmar', 127: 'Pinsir', 128: 'Tauros',
            129: 'Magikarp', 130: 'Gyarados', 131: 'Lapras', 132: 'Ditto', 133: 'Eevee', 134: 'Vaporeon',
            135: 'Jolteon', 136: 'Flareon', 137: 'Porygon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto',
            141: 'Kabutops', 142: 'Aerodactyl', 143: 'Snorlax', 144: 'Articuno', 145: 'Zapdos', 146: 'Moltres',
            147: 'Dratini', 148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew',
            170: 'Chinchou', 171: 'Lanturn', 194: 'Wooper', 195: 'Quagsire', 196: 'Espeon', 197: 'Umbreon',
            218: 'Slugma', 219: 'Magcargo', 225: 'Delibird', 243: 'Raikou', 244: 'Entei', 245: 'Suicune',
            470: 'Leafeon', 471: 'Glaceon', 607: 'Litwick', 608: 'Lampent', 609: 'Chandelure'
          };
          
          const pokemonList = Object.entries(altPokemonIndex).map(([id, family]) => {
            const pokemonId = parseInt(id);
            const name = pokemonNames[id] || `Pokemon_${id}`;
            
            return {
              id: pokemonId,
              name: name,
              family: family,
              generation: pokemonId <= 151 ? 1 : pokemonId <= 251 ? 2 : pokemonId <= 386 ? 3 : pokemonId <= 493 ? 4 : 5
            };
          }).sort((a, b) => a.id - b.id);
          
          console.log(`✅ [AdminAPI] Pokemon found at: ${altPath} (${pokemonList.length} Pokémon)`);
          return res.json({
            success: true,
            pokemon: pokemonList,
            total: pokemonList.length,
            source: 'pokemon-index.json'
          });
          
        } catch (altError) {
          // Continue à l'itération suivante
        }
      }
      
      // Aucun chemin n'a fonctionné
      console.error('❌ [AdminAPI] pokemon-index.json not found in any location');
      res.status(404).json({ 
        success: false,
        error: 'Fichier pokemon-index.json non trouvé',
        searchedPaths: possiblePaths,
        pokemon: []
      });
    }
    
  } catch (error) {
    console.error('❌ [AdminAPI] Error loading Pokemon:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur chargement Pokemon',
      details: error instanceof Error ? error.message : 'Unknown error',
      pokemon: []
    });
  }
});

/**
 * GET /api/admin/pokemon/:id
 * Retourne les détails d'un Pokémon spécifique
 */
router.get('/pokemon/:id', requireMacAndDev, async (req: any, res) => {
  try {
    const pokemonId = parseInt(req.params.id);
    
    if (!pokemonId || pokemonId < 1) {
      return res.status(400).json({
        success: false,
        error: 'ID Pokémon invalide'
      });
    }
    
    const pokemonNames: Record<string, string> = {
      1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur', 4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
      7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise', 10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
      13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill', 16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
      19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow', 23: 'Ekans', 24: 'Arbok',
      25: 'Pikachu', 26: 'Raichu', 27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina',
      31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Clefairy', 36: 'Clefable',
      37: 'Vulpix', 38: 'Ninetales', 39: 'Jigglypuff', 40: 'Wigglytuff', 41: 'Zubat', 42: 'Golbat',
      43: 'Oddish', 44: 'Gloom', 45: 'Vileplume', 46: 'Paras', 47: 'Parasect', 48: 'Venonat',
      49: 'Venomoth', 50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian', 54: 'Psyduck',
      55: 'Golduck', 56: 'Mankey', 57: 'Primeape', 58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag',
      61: 'Poliwhirl', 62: 'Poliwrath', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam', 66: 'Machop',
      67: 'Machoke', 68: 'Machamp', 69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool',
      73: 'Tentacruel', 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 77: 'Ponyta', 78: 'Rapidash',
      79: 'Slowpoke', 80: 'Slowbro', 81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d', 84: 'Doduo',
      85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk', 90: 'Shellder', 91: 'Cloyster',
      92: 'Gastly', 93: 'Haunter', 94: 'Gengar', 95: 'Onix', 96: 'Drowzee', 97: 'Hypno', 98: 'Krabby',
      99: 'Kingler', 100: 'Voltorb', 101: 'Electrode', 102: 'Exeggcute', 103: 'Exeggutor', 104: 'Cubone',
      105: 'Marowak', 106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung', 109: 'Koffing', 110: 'Weezing',
      111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey', 114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea',
      117: 'Seadra', 118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie', 122: 'Mr. Mime',
      123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz', 126: 'Magmar', 127: 'Pinsir', 128: 'Tauros',
      129: 'Magikarp', 130: 'Gyarados', 131: 'Lapras', 132: 'Ditto', 133: 'Eevee', 134: 'Vaporeon',
      135: 'Jolteon', 136: 'Flareon', 137: 'Porygon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto',
      141: 'Kabutops', 142: 'Aerodactyl', 143: 'Snorlax', 144: 'Articuno', 145: 'Zapdos', 146: 'Moltres',
      147: 'Dratini', 148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew'
    };
    
    const pokemonName = pokemonNames[pokemonId.toString()];
    
    if (!pokemonName) {
      return res.status(404).json({
        success: false,
        error: `Pokémon avec l'ID ${pokemonId} non trouvé`
      });
    }
    
    const pokemon = {
      id: pokemonId,
      name: pokemonName,
      generation: pokemonId <= 151 ? 1 : 2
    };
    
    res.json({
      success: true,
      pokemon: pokemon
    });
    
  } catch (error) {
    console.error(`❌ [AdminAPI] Error loading Pokemon ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: `Erreur lors du chargement du Pokémon ${req.params.id}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/pokemon/search
 * Recherche de Pokémon par nom
 */
router.post('/pokemon/search', requireMacAndDev, async (req: any, res) => {
  try {
    const { query, limit = 20 } = req.body;
    
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Requête trop courte (minimum 2 caractères)'
      });
    }
    
    const pokemonNames: Record<string, string> = {
      1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur', 4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
      7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise', 10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
      13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill', 16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
      19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow', 23: 'Ekans', 24: 'Arbok',
      25: 'Pikachu', 26: 'Raichu', 27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina',
      31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Clefairy', 36: 'Clefable',
      37: 'Vulpix', 38: 'Ninetales', 39: 'Jigglypuff', 40: 'Wigglytuff', 41: 'Zubat', 42: 'Golbat',
      43: 'Oddish', 44: 'Gloom', 45: 'Vileplume', 46: 'Paras', 47: 'Parasect', 48: 'Venonat',
      49: 'Venomoth', 50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian', 54: 'Psyduck',
      55: 'Golduck', 56: 'Mankey', 57: 'Primeape', 58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag',
      61: 'Poliwhirl', 62: 'Poliwrath', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam', 66: 'Machop',
      67: 'Machoke', 68: 'Machamp', 69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool',
      73: 'Tentacruel', 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 77: 'Ponyta', 78: 'Rapidash',
      79: 'Slowpoke', 80: 'Slowbro', 81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d', 84: 'Doduo',
      85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk', 90: 'Shellder', 91: 'Cloyster',
      92: 'Gastly', 93: 'Haunter', 94: 'Gengar', 95: 'Onix', 96: 'Drowzee', 97: 'Hypno', 98: 'Krabby',
      99: 'Kingler', 100: 'Voltorb', 101: 'Electrode', 102: 'Exeggcute', 103: 'Exeggutor', 104: 'Cubone',
      105: 'Marowak', 106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung', 109: 'Koffing', 110: 'Weezing',
      111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey', 114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea',
      117: 'Seadra', 118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie', 122: 'Mr. Mime',
      123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz', 126: 'Magmar', 127: 'Pinsir', 128: 'Tauros',
      129: 'Magikarp', 130: 'Gyarados', 131: 'Lapras', 132: 'Ditto', 133: 'Eevee', 134: 'Vaporeon',
      135: 'Jolteon', 136: 'Flareon', 137: 'Porygon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto',
      141: 'Kabutops', 142: 'Aerodactyl', 143: 'Snorlax', 144: 'Articuno', 145: 'Zapdos', 146: 'Moltres',
      147: 'Dratini', 148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew'
    };
    
    const searchRegex = new RegExp(query, 'i');
    const results = Object.entries(pokemonNames)
      .filter(([id, name]) => searchRegex.test(name))
      .map(([id, name]) => ({
        id: parseInt(id),
        name: name,
        generation: parseInt(id) <= 151 ? 1 : 2
      }))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      results: results,
      query: query,
      total: results.length
    });
    
  } catch (error) {
    console.error('❌ [AdminAPI] Error searching Pokemon:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de Pokémon'
    });
  }
});
/**
 * GET /api/admin/pokemon/search
 * Recherche de Pokémon par nom
 */
router.post('/pokemon/search', requireMacAndDev, async (req: any, res) => {
  try {
    const { query, limit = 20 } = req.body;
    
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Requête trop courte (minimum 2 caractères)'
      });
    }
    
// Mapping direct des noms (même que dans les autres routes)
const pokemonNames: Record<string, string> = {
  1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur', 4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
  7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise', 10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
  13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill', 16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
  19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow', 23: 'Ekans', 24: 'Arbok',
  25: 'Pikachu', 26: 'Raichu', 27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina',
  31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking', 35: 'Clefairy', 36: 'Clefable',
  37: 'Vulpix', 38: 'Ninetales', 39: 'Jigglypuff', 40: 'Wigglytuff', 41: 'Zubat', 42: 'Golbat',
  43: 'Oddish', 44: 'Gloom', 45: 'Vileplume', 46: 'Paras', 47: 'Parasect', 48: 'Venonat',
  49: 'Venomoth', 50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian', 54: 'Psyduck',
  55: 'Golduck', 56: 'Mankey', 57: 'Primeape', 58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag',
  61: 'Poliwhirl', 62: 'Poliwrath', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam', 66: 'Machop',
  67: 'Machoke', 68: 'Machamp', 69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool',
  73: 'Tentacruel', 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 77: 'Ponyta', 78: 'Rapidash',
  79: 'Slowpoke', 80: 'Slowbro', 81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d', 84: 'Doduo',
  85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk', 90: 'Shellder', 91: 'Cloyster',
  92: 'Gastly', 93: 'Haunter', 94: 'Gengar', 95: 'Onix', 96: 'Drowzee', 97: 'Hypno', 98: 'Krabby',
  99: 'Kingler', 100: 'Voltorb', 101: 'Electrode', 102: 'Exeggcute', 103: 'Exeggutor', 104: 'Cubone',
  105: 'Marowak', 106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung', 109: 'Koffing', 110: 'Weezing',
  111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey', 114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea',
  117: 'Seadra', 118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie', 122: 'Mr. Mime',
  123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz', 126: 'Magmar', 127: 'Pinsir', 128: 'Tauros',
  129: 'Magikarp', 130: 'Gyarados', 131: 'Lapras', 132: 'Ditto', 133: 'Eevee', 134: 'Vaporeon',
  135: 'Jolteon', 136: 'Flareon', 137: 'Porygon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto',
  141: 'Kabutops', 142: 'Aerodactyl', 143: 'Snorlax', 144: 'Articuno', 145: 'Zapdos', 146: 'Moltres',
  147: 'Dratini', 148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew'
};

// Filtrer par nom
const searchRegex = new RegExp(query, 'i');
const results = Object.entries(pokemonNames)
  .filter(([id, name]) => searchRegex.test(name))
  .map(([id, name]) => ({
    id: parseInt(id),
    name: name,
    generation: parseInt(id) <= 151 ? 1 : 2
  }))
  .slice(0, parseInt(limit));

res.json({
  success: true,
  results: results,
  query: query,
  total: results.length
});

} catch (error) {
  console.error('❌ [AdminAPI] Error searching Pokemon:', error);
  res.status(500).json({
    success: false,
    error: 'Erreur lors de la recherche de Pokémon'
  });
}
});

// ✅ ROUTE: Lister tous les dialogues
router.get('/dialogues', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('🗨️ [Dialogues API] Chargement des dialogues...');
        
        const { page = 1, limit = 100, category, npcId, search } = req.query;
        
        // Construire la requête de filtre
        const filter: any = { isActive: true };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (npcId && npcId !== 'all') {
            filter.npcId = npcId;
        }
        
        if (search) {
            filter.$or = [
                { dialogId: { $regex: search, $options: 'i' } },
                { eng: { $regex: search, $options: 'i' } },
                { fr: { $regex: search, $options: 'i' } },
                { npcId: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Exécuter la requête
        const dialogues = await DialogStringModel.find(filter)
            .sort({ npcId: 1, category: 1, priority: -1, dialogId: 1 })
            .limit(parseInt(limit as string))
            .skip((parseInt(page as string) - 1) * parseInt(limit as string))
            .lean();
        
        const total = await DialogStringModel.countDocuments(filter);
        
        console.log(`✅ [Dialogues API] ${dialogues.length}/${total} dialogues chargés`);
        
        res.json({
            success: true,
            dialogues: dialogues.map(d => ({
                dialogId: d.dialogId,
                npcId: d.npcId,
                category: d.category,
                context: d.context,
                eng: d.eng,
                fr: d.fr,
                es: d.es,
                de: d.de,
                ja: d.ja,
                it: d.it,
                pt: d.pt,
                ko: d.ko,
                zh: d.zh,
                variables: d.variables,
                conditions: d.conditions,
                priority: d.priority,
                isActive: d.isActive,
                version: d.version,
                tags: d.tags,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt
            })),
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string)
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur chargement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des dialogues',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ✅ ROUTE: Créer un nouveau dialogue
router.post('/dialogues', requireMacAndDev, async (req: any, res) => {
    try {
        const dialogueData = req.body;
        
        console.log(`🗨️ [Dialogues API] Création dialogue: ${dialogueData.dialogId}`);
        
        // Validation des champs requis
        if (!dialogueData.dialogId || !dialogueData.eng || !dialogueData.fr) {
            return res.status(400).json({
                success: false,
                error: 'Champs requis manquants (dialogId, eng, fr)'
            });
        }
        
        // Vérifier que l'ID n'existe pas déjà
        const existing = await DialogStringModel.findOne({ dialogId: dialogueData.dialogId });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Un dialogue avec cet ID existe déjà'
            });
        }
        
        // Créer le nouveau dialogue
        const newDialogue = new DialogStringModel({
            dialogId: dialogueData.dialogId,
            npcId: dialogueData.npcId,
            category: dialogueData.category || 'greeting',
            context: dialogueData.context,
            eng: dialogueData.eng,
            fr: dialogueData.fr,
            es: dialogueData.es,
            de: dialogueData.de,
            ja: dialogueData.ja,
            it: dialogueData.it,
            pt: dialogueData.pt,
            ko: dialogueData.ko,
            zh: dialogueData.zh,
            variables: dialogueData.variables || [],
            conditions: dialogueData.conditions || [],
            priority: dialogueData.priority || 5,
            isActive: dialogueData.isActive !== false,
            tags: dialogueData.tags || [],
            version: dialogueData.version || '1.0.0'
        });
        
        await newDialogue.save();
        
        console.log(`✅ [Dialogues API] Dialogue créé: ${dialogueData.dialogId} par ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Dialogue créé avec succès',
            dialogue: {
                dialogId: newDialogue.dialogId,
                npcId: newDialogue.npcId,
                category: newDialogue.category,
                isActive: newDialogue.isActive
            },
            createdBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur création:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du dialogue',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ✅ ROUTE: Mettre à jour un dialogue
router.put('/dialogues/:dialogueId', requireMacAndDev, async (req: any, res) => {
    try {
        const { dialogueId } = req.params;
        const updateData = req.body;
        
        console.log(`🗨️ [Dialogues API] Mise à jour dialogue: ${dialogueId}`);
        
        // Trouver le dialogue existant
        const dialogue = await DialogStringModel.findOne({ dialogId: dialogueId });
        if (!dialogue) {
            return res.status(404).json({
                success: false,
                error: 'Dialogue non trouvé'
            });
        }
        
        // Mettre à jour les champs autorisés
        const allowedFields = [
            'npcId', 'category', 'context', 'eng', 'fr', 'es', 'de', 'ja', 'it', 'pt', 'ko', 'zh',
            'variables', 'conditions', 'priority', 'isActive', 'tags', 'version'
        ];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                (dialogue as any)[field] = updateData[field];
            }
        });
        
        await dialogue.save();
        
        console.log(`✅ [Dialogues API] Dialogue mis à jour: ${dialogueId} par ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Dialogue mis à jour avec succès',
            dialogue: {
                dialogId: dialogue.dialogId,
                npcId: dialogue.npcId,
                category: dialogue.category,
                updatedAt: dialogue.updatedAt
            },
            updatedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur mise à jour:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du dialogue',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ✅ ROUTE: Supprimer un dialogue
router.delete('/dialogues/:dialogueId', requireMacAndDev, async (req: any, res) => {
    try {
        const { dialogueId } = req.params;
        
        console.log(`🗨️ [Dialogues API] Suppression dialogue: ${dialogueId}`);
        
        const deletedDialogue = await DialogStringModel.findOneAndDelete({ dialogId: dialogueId });
        if (!deletedDialogue) {
            return res.status(404).json({
                success: false,
                error: 'Dialogue non trouvé'
            });
        }
        
        console.log(`✅ [Dialogues API] Dialogue supprimé: ${dialogueId} par ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Dialogue supprimé avec succès',
            deletedDialogue: {
                dialogId: deletedDialogue.dialogId,
                npcId: deletedDialogue.npcId,
                category: deletedDialogue.category
            },
            deletedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur suppression:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du dialogue',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ✅ ROUTE: Obtenir les statistiques des dialogues
router.get('/dialogues/stats', requireMacAndDev, async (req: any, res) => {
    try {
        console.log('📊 [Dialogues API] Génération des statistiques...');
        
        const [
            totalDialogues,
            activeDialogues,
            dialoguesByCategory,
            dialoguesByNpc,
            missingTranslations,
            dialoguesWithConditions
        ] = await Promise.all([
            DialogStringModel.countDocuments({}),
            DialogStringModel.countDocuments({ isActive: true }),
            DialogStringModel.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            DialogStringModel.aggregate([
                { $match: { npcId: { $exists: true, $ne: null } } },
                { $group: { _id: '$npcId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            DialogStringModel.countDocuments({
                $or: [
                    { fr: { $exists: false } },
                    { fr: '' },
                    { fr: null }
                ]
            }),
            DialogStringModel.countDocuments({
                conditions: { $exists: true, $not: { $size: 0 } }
            })
        ]);
        
        const stats = {
            total: totalDialogues,
            active: activeDialogues,
            inactive: totalDialogues - activeDialogues,
            missingTranslations,
            withConditions: dialoguesWithConditions,
            byCategory: dialoguesByCategory.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            topNpcs: dialoguesByNpc.map((item: any) => ({
                npcId: item._id,
                count: item.count
            }))
        };
        
        console.log('✅ [Dialogues API] Statistiques générées');
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération des statistiques'
        });
    }
});

// ✅ ROUTE: Rechercher des dialogues
router.post('/dialogues/search', requireMacAndDev, async (req: any, res) => {
    try {
        const { query, category, npcId, language = 'fr', limit = 50 } = req.body;
        
        console.log(`🔍 [Dialogues API] Recherche: "${query}"`);
        
        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                results: [],
                message: 'Requête trop courte (minimum 2 caractères)'
            });
        }
        
        // Construire les filtres
        const filter: any = { isActive: true };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (npcId && npcId !== 'all') {
            filter.npcId = npcId;
        }
        
        // Recherche textuelle multi-champs
        const searchRegex = { $regex: query, $options: 'i' };
        filter.$or = [
            { dialogId: searchRegex },
            { npcId: searchRegex },
            { eng: searchRegex },
            { fr: searchRegex }
        ];
        
        // Ajouter les autres langues si spécifiées
        if (language !== 'fr' && language !== 'eng') {
            filter.$or.push({ [language]: searchRegex });
        }
        
        const results = await DialogStringModel.find(filter)
            .select(`dialogId npcId category ${language} eng priority isActive`)
            .sort({ priority: -1, dialogId: 1 })
            .limit(parseInt(limit))
            .lean();
        
        res.json({
            success: true,
            results: results.map(r => ({
                dialogId: r.dialogId,
                npcId: r.npcId,
                category: r.category,
                text: r[language as keyof typeof r] || r.eng,
                priority: r.priority,
                isActive: r.isActive
            })),
            query,
            total: results.length
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur recherche:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recherche'
        });
    }
});

// ✅ ROUTE: Dupliquer un dialogue
router.post('/dialogues/:dialogueId/duplicate', requireMacAndDev, async (req: any, res) => {
    try {
        const { dialogueId } = req.params;
        
        console.log(`📋 [Dialogues API] Duplication dialogue: ${dialogueId}`);
        
        // Trouver le dialogue original
        const originalDialogue = await DialogStringModel.findOne({ dialogId: dialogueId });
        if (!originalDialogue) {
            return res.status(404).json({
                success: false,
                error: 'Dialogue original non trouvé'
            });
        }
        
        // Générer un nouvel ID unique
        const newDialogueId = `${dialogueId}_copy_${Date.now()}`;
        
        // Créer la copie
        const duplicateDialogue = new DialogStringModel({
            ...originalDialogue.toObject(),
            _id: undefined, // Nouveau document
            dialogId: newDialogueId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await duplicateDialogue.save();
        
        console.log(`✅ [Dialogues API] Dialogue dupliqué: ${dialogueId} -> ${newDialogueId} par ${req.user.username}`);
        
        res.json({
            success: true,
            message: 'Dialogue dupliqué avec succès',
            originalDialogueId: dialogueId,
            newDialogueId: newDialogueId,
            dialogue: {
                dialogId: duplicateDialogue.dialogId,
                npcId: duplicateDialogue.npcId,
                category: duplicateDialogue.category
            },
            duplicatedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur duplication:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la duplication du dialogue'
        });
    }
});

// ✅ ROUTE: Importer des dialogues depuis JSON
router.post('/dialogues/import', requireMacAndDev, async (req: any, res) => {
    try {
        const { dialogues, overwrite = false } = req.body;
        
        console.log(`📥 [Dialogues API] Import de ${dialogues?.length || 0} dialogues par ${req.user.username}`);
        
        if (!Array.isArray(dialogues) || dialogues.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun dialogue à importer'
            });
        }
        
        let imported = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails: string[] = [];
        
        for (const dialogueData of dialogues) {
            try {
                // Validation de base
                if (!dialogueData.dialogId || !dialogueData.eng || !dialogueData.fr) {
                    errorDetails.push(`Dialogue ${dialogueData.dialogId || 'unknown'}: champs requis manquants`);
                    errors++;
                    continue;
                }
                
                // Vérifier s'il existe déjà
                const existing = await DialogStringModel.findOne({ dialogId: dialogueData.dialogId });
                
                if (existing && !overwrite) {
                    errorDetails.push(`Dialogue ${dialogueData.dialogId}: existe déjà (utilisez overwrite=true)`);
                    errors++;
                    continue;
                }
                
                if (existing && overwrite) {
                    // Mettre à jour
                    await DialogStringModel.updateOne(
                        { dialogId: dialogueData.dialogId },
                        { ...dialogueData, updatedAt: new Date() }
                    );
                    updated++;
                } else {
                    // Créer nouveau
                    const newDialogue = new DialogStringModel({
                        ...dialogueData,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    await newDialogue.save();
                    imported++;
                }
                
            } catch (error) {
                errorDetails.push(`Dialogue ${dialogueData.dialogId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                errors++;
            }
        }
        
        console.log(`✅ [Dialogues API] Import terminé: ${imported} créés, ${updated} mis à jour, ${errors} erreurs`);
        
        res.json({
            success: true,
            message: `Import terminé: ${imported} créés, ${updated} mis à jour`,
            imported,
            updated,
            errors,
            errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
            importedBy: req.user.username
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur import:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'import des dialogues'
        });
    }
});

// ✅ ROUTE: Exporter tous les dialogues
router.get('/dialogues/export/all', requireMacAndDev, async (req: any, res) => {
    try {
        console.log(`📤 [Dialogues API] Export de tous les dialogues par ${req.user.username}`);
        
        const dialogues = await DialogStringModel.find({ isActive: true })
            .sort({ npcId: 1, category: 1, dialogId: 1 })
            .lean();
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.username,
            version: '1.0.0',
            totalDialogues: dialogues.length,
            dialogues: dialogues.map(d => ({
                dialogId: d.dialogId,
                npcId: d.npcId,
                category: d.category,
                context: d.context,
                eng: d.eng,
                fr: d.fr,
                es: d.es,
                de: d.de,
                ja: d.ja,
                it: d.it,
                pt: d.pt,
                ko: d.ko,
                zh: d.zh,
                variables: d.variables,
                conditions: d.conditions,
                priority: d.priority,
                isActive: d.isActive,
                tags: d.tags,
                version: d.version
            }))
        };
        
        res.json({
            success: true,
            data: exportData
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur export:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'export des dialogues'
        });
    }
});

// ✅ ROUTE: Obtenir les traductions manquantes
router.get('/dialogues/missing-translations/:language', requireMacAndDev, async (req: any, res) => {
    try {
        const { language } = req.params;
        
        console.log(`🔍 [Dialogues API] Recherche traductions manquantes: ${language}`);
        
        if (!['fr', 'es', 'de', 'ja', 'it', 'pt', 'ko', 'zh'].includes(language)) {
            return res.status(400).json({
                success: false,
                error: 'Langue non supportée'
            });
        }
        
        const missingTranslations = await DialogStringModel.find({
            isActive: true,
            $or: [
                { [language]: { $exists: false } },
                { [language]: '' },
                { [language]: null }
            ]
        })
        .select('dialogId npcId category eng')
        .sort({ npcId: 1, dialogId: 1 })
        .lean();
        
        res.json({
            success: true,
            language,
            missingCount: missingTranslations.length,
            dialogues: missingTranslations.map(d => ({
                dialogId: d.dialogId,
                npcId: d.npcId,
                category: d.category,
                englishText: d.eng
            }))
        });
        
    } catch (error) {
        console.error('❌ [Dialogues API] Erreur traductions manquantes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recherche des traductions manquantes'
        });
    }
});

// ✅ NOUVELLES ROUTES CRUD pour l'admin des items

/**
 * GET /api/admin/items/list
 * Liste détaillée pour l'interface admin
 */
router.get('/items/list', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📦 [Items Admin] Loading items list...');
    
    const { page = 1, limit = 50, category, search } = req.query;
    
    const filter: any = { isActive: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [items, total] = await Promise.all([
      ItemData.find(filter)
        .sort({ category: 1, name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      ItemData.countDocuments(filter)
    ]);
    
    const formattedItems = items.map(item => ({
      itemId: item.itemId,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      sellPrice: item.sellPrice,
      stackable: item.stackable,
      consumable: item.consumable,
      sprite: item.sprite,
      generation: item.generation,
      rarity: item.rarity,
      tags: item.tags,
      effectCount: item.effects?.length || 0,
      obtainMethodCount: item.obtainMethods?.length || 0,
      isActive: item.isActive,
      lastUpdated: item.lastUpdated
    }));
    
    res.json({
      success: true,
      items: formattedItems,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur chargement liste items'
    });
  }
});

/**
 * GET /api/admin/items/details/:itemId
 * Détails complets d'un item pour édition
 */
router.get('/items/details/:itemId', requireMacAndDev, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    
    console.log(`📦 [Items Admin] Loading details for: ${itemId}`);
    
    const item = await ItemData.findOne({ itemId }).lean();
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item non trouvé'
      });
    }
    
    res.json({
      success: true,
      item: item
    });
    
  } catch (error) {
    console.error(`❌ [Items Admin] Error loading ${req.params.itemId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur chargement détails item'
    });
  }
});

/**
 * POST /api/admin/items
 * Créer un nouvel item
 */
router.post('/items', requireMacAndDev, async (req: any, res) => {
  try {
    const itemData = req.body;
    
    console.log(`📦 [Items Admin] Creating item: ${itemData.itemId}`);
    
    // Validation des champs requis
    if (!itemData.itemId || !itemData.name || !itemData.description) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants (itemId, name, description)'
      });
    }
    
    // Vérifier que l'ID n'existe pas déjà
    const existing = await ItemData.findOne({ itemId: itemData.itemId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Un item avec cet ID existe déjà'
      });
    }
    
    // Créer le nouvel item
    const newItem = await ItemData.createFromJson({
      id: itemData.itemId,
      ...itemData,
      createdBy: req.user.username
    });
    
    console.log(`✅ [Items Admin] Item créé: ${itemData.itemId} par ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Item créé avec succès',
      item: {
        itemId: newItem.itemId,
        name: newItem.name,
        category: newItem.category,
        isActive: newItem.isActive
      },
      createdBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error creating item:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur création item',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/items/:itemId
 * Mettre à jour un item existant
 */
router.put('/items/:itemId', requireMacAndDev, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const updateData = req.body;
    
    console.log(`📦 [Items Admin] Updating item: ${itemId}`);
    
    const item = await ItemData.findOne({ itemId });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item non trouvé'
      });
    }
    
    // Mettre à jour via la méthode du modèle
    await item.updateFromJson(updateData);
    
    console.log(`✅ [Items Admin] Item mis à jour: ${itemId} par ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Item mis à jour avec succès',
      item: item.toItemFormat(),
      updatedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error updating item:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur mise à jour item',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/items/:itemId
 * Supprimer un item (désactiver)
 */
router.delete('/items/:itemId', requireMacAndDev, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    
    console.log(`📦 [Items Admin] Deleting item: ${itemId}`);
    
    const item = await ItemData.findOne({ itemId });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item non trouvé'
      });
    }
    
    // Désactiver au lieu de supprimer
    item.isActive = false;
    await item.save();
    
    console.log(`✅ [Items Admin] Item désactivé: ${itemId} par ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Item désactivé avec succès',
      deletedItem: {
        itemId: item.itemId,
        name: item.name
      },
      deletedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error deleting item:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur suppression item'
    });
  }
});

/**
 * POST /api/admin/items/:itemId/duplicate
 * Dupliquer un item
 */
router.post('/items/:itemId/duplicate', requireMacAndDev, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    
    console.log(`📋 [Items Admin] Duplicating item: ${itemId}`);
    
    const originalItem = await ItemData.findOne({ itemId });
    if (!originalItem) {
      return res.status(404).json({
        success: false,
        error: 'Item original non trouvé'
      });
    }
    
    // Générer un nouvel ID unique
    const newItemId = `${itemId}_copy_${Date.now()}`;
    
    // Créer la copie
    const duplicateData = originalItem.toObject();
    delete duplicateData._id;
    duplicateData.itemId = newItemId;
    duplicateData.name = `${duplicateData.name} (Copie)`;
    duplicateData.createdBy = req.user.username;
    duplicateData.lastUpdated = new Date();
    
    const duplicatedItem = await ItemData.create(duplicateData);
    
    console.log(`✅ [Items Admin] Item dupliqué: ${itemId} -> ${newItemId} par ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Item dupliqué avec succès',
      originalItemId: itemId,
      newItemId: newItemId,
      item: {
        itemId: duplicatedItem.itemId,
        name: duplicatedItem.name,
        category: duplicatedItem.category
      },
      duplicatedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error duplicating item:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur duplication item'
    });
  }
});

/**
 * GET /api/admin/items/stats
 * Statistiques des items
 */
router.get('/items/stats', requireMacAndDev, async (req: any, res) => {
  try {
    console.log('📊 [Items Admin] Generating statistics...');
    
    const [
      totalItems,
      activeItems,
      itemsByCategory,
      itemsByGeneration,
      itemsByRarity,
      buyableItems
    ] = await Promise.all([
      ItemData.countDocuments({}),
      ItemData.countDocuments({ isActive: true }),
      ItemData.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ItemData.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$generation', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      ItemData.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$rarity', count: { $sum: 1 } } }
      ]),
      ItemData.countDocuments({ price: { $ne: null, $gt: 0 }, isActive: true })
    ]);
    
    const stats = {
      total: totalItems,
      active: activeItems,
      inactive: totalItems - activeItems,
      buyable: buyableItems,
      byCategory: itemsByCategory.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byGeneration: itemsByGeneration.reduce((acc: any, item: any) => {
        acc[`gen_${item._id}`] = item.count;
        return acc;
      }, {}),
      byRarity: itemsByRarity.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    console.log('✅ [Items Admin] Statistics generated');
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error generating stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur génération statistiques'
    });
  }
});

/**
 * POST /api/admin/items/search
 * Recherche avancée d'items
 */
router.post('/items/search', requireMacAndDev, async (req: any, res) => {
  try {
    const { query, category, generation, rarity, priceRange, hasEffects, limit = 50 } = req.body;
    
    console.log(`🔍 [Items Admin] Searching items: "${query}"`);
    
    const filter: any = { isActive: true };
    
    // Recherche textuelle
    if (query && query.length >= 2) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { itemId: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }
    
    // Filtres avancés
    if (category && category !== 'all') filter.category = category;
    if (generation && generation !== 'all') filter.generation = parseInt(generation);
    if (rarity && rarity !== 'all') filter.rarity = rarity;
    
    if (priceRange) {
      if (priceRange.min !== undefined) filter.price = { ...filter.price, $gte: priceRange.min };
      if (priceRange.max !== undefined) filter.price = { ...filter.price, $lte: priceRange.max };
    }
    
    if (hasEffects === true) {
      filter['effects.0'] = { $exists: true };
    } else if (hasEffects === false) {
      filter.effects = { $size: 0 };
    }
    
    const results = await ItemData.find(filter)
      .select('itemId name description category price generation rarity effects tags')
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .lean();
    
    const formattedResults = results.map(item => ({
      itemId: item.itemId,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      generation: item.generation,
      rarity: item.rarity,
      effectCount: item.effects?.length || 0,
      tags: item.tags
    }));
    
    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length,
      query
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error searching:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur recherche items'
    });
  }
});

/**
 * POST /api/admin/items/import
 * Importer des items depuis JSON
 */
router.post('/items/import', requireMacAndDev, async (req: any, res) => {
  try {
    const { items, overwrite = false } = req.body;
    
    console.log(`📥 [Items Admin] Importing ${Object.keys(items || {}).length} items by ${req.user.username}`);
    
    if (!items || typeof items !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Format d\'items invalide'
      });
    }
    
    const result = await ItemData.bulkImportFromJson(items);
    
    console.log(`✅ [Items Admin] Import completed: ${result.success} success, ${result.errors.length} errors`);
    
    res.json({
      success: true,
      message: `Import terminé: ${result.success} items importés`,
      imported: result.success,
      errors: result.errors.length,
      errorDetails: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined,
      importedBy: req.user.username
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error importing:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur import items'
    });
  }
});

/**
 * GET /api/admin/items/export/all
 * Exporter tous les items
 */
router.get('/items/export/all', requireMacAndDev, async (req: any, res) => {
  try {
    console.log(`📤 [Items Admin] Exporting all items by ${req.user.username}`);
    
    const items = await ItemData.findActiveItems();
    
    // Format compatible avec l'ancien JSON
    const exportData: { [key: string]: any } = {};
    
    items.forEach(item => {
      exportData[item.itemId] = item.toItemFormat();
    });
    
    const exportMetadata = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      version: '2.0.0',
      totalItems: items.length,
      items: exportData
    };
    
    res.json({
      success: true,
      data: exportMetadata
    });
    
  } catch (error) {
    console.error('❌ [Items Admin] Error exporting:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur export items'
    });
  }
});

export default router;
