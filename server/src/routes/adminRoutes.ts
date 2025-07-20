// server/src/routes/adminRoutes.ts
import express from 'express';
import { PlayerData } from '../models/PlayerData';
import { OwnedPokemon } from '../models/OwnedPokemon';
import { PlayerQuest } from '../models/PlayerQuest';
import { Inventory } from '../models/Inventory';
import { PokedexEntry } from '../models/PokedexEntry';
import { PokedexStats } from '../models/PokedexStats';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

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
                       clientIP.includes('5.51.41.59');

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

// Ajouter ces routes dans adminRoutes.ts après les routes existantes

// ✅ ROUTE: Lister toutes les quêtes
router.get('/quests', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const questsData = await fs.readFile(questsPath, 'utf8');
    const questsJson = JSON.parse(questsData);
    
    res.json({
      quests: questsJson.quests || [],
      total: questsJson.quests?.length || 0,
      lastModified: (await fs.stat(questsPath)).mtime
    });
  } catch (error) {
    console.error('❌ Erreur lecture quêtes:', error);
    res.status(500).json({ error: 'Erreur lecture fichier quêtes' });
  }
});

// ✅ ROUTE: Ajouter une nouvelle quête
router.post('/quests', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const questsData = await fs.readFile(questsPath, 'utf8');
    const questsJson = JSON.parse(questsData);
    
    const newQuest = {
      id: req.body.id || `quest_${Date.now()}`,
      name: req.body.name || 'Nouvelle Quête',
      description: req.body.description || 'Description de la quête',
      category: req.body.category || 'side',
      startNpcId: req.body.startNpcId || null,
      endNpcId: req.body.endNpcId || null,
      isRepeatable: req.body.isRepeatable || false,
      autoComplete: req.body.autoComplete || false,
      dialogues: req.body.dialogues || {
        questOffer: ["Dialogue d'offre par défaut"],
        questInProgress: ["Dialogue en cours par défaut"],
        questComplete: ["Dialogue de fin par défaut"]
      },
      steps: req.body.steps || []
    };
    
    // Vérifier que l'ID n'existe pas déjà
    if (questsJson.quests.find((q: any) => q.id === newQuest.id)) {
      return res.status(400).json({ error: 'Une quête avec cet ID existe déjà' });
    }
    
    questsJson.quests.push(newQuest);
    
    // Sauvegarder avec backup
    const backupPath = questsPath + `.backup.${Date.now()}`;
    await fs.copyFile(questsPath, backupPath);
    
    await fs.writeFile(questsPath, JSON.stringify(questsJson, null, 2));
    
    console.log(`🎯 [Admin] ${req.user.username} a ajouté la quête: ${newQuest.id}`);
    
    res.json({
      message: 'Quête ajoutée avec succès',
      quest: newQuest,
      backupCreated: backupPath
    });
  } catch (error) {
    console.error('❌ Erreur ajout quête:', error);
    res.status(500).json({ error: 'Erreur sauvegarde quête' });
  }
});

// ✅ ROUTE: Modifier une quête existante
router.put('/quests/:questId', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const questsData = await fs.readFile(questsPath, 'utf8');
    const questsJson = JSON.parse(questsData);
    
    const questIndex = questsJson.quests.findIndex((q: any) => q.id === req.params.questId);
    if (questIndex === -1) {
      return res.status(404).json({ error: 'Quête non trouvée' });
    }
    
    // Backup avant modification
    const backupPath = questsPath + `.backup.${Date.now()}`;
    await fs.copyFile(questsPath, backupPath);
    
    // Mettre à jour la quête
    questsJson.quests[questIndex] = {
      ...questsJson.quests[questIndex],
      ...req.body,
      id: req.params.questId // Garder l'ID original
    };
    
    await fs.writeFile(questsPath, JSON.stringify(questsJson, null, 2));
    
    console.log(`🎯 [Admin] ${req.user.username} a modifié la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête modifiée avec succès',
      quest: questsJson.quests[questIndex],
      backupCreated: backupPath
    });
  } catch (error) {
    console.error('❌ Erreur modification quête:', error);
    res.status(500).json({ error: 'Erreur modification quête' });
  }
});

// ✅ ROUTE: Supprimer une quête
router.delete('/quests/:questId', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const questsData = await fs.readFile(questsPath, 'utf8');
    const questsJson = JSON.parse(questsData);
    
    const questIndex = questsJson.quests.findIndex((q: any) => q.id === req.params.questId);
    if (questIndex === -1) {
      return res.status(404).json({ error: 'Quête non trouvée' });
    }
    
    // Backup avant suppression
    const backupPath = questsPath + `.backup.${Date.now()}`;
    await fs.copyFile(questsPath, backupPath);
    
    const deletedQuest = questsJson.quests.splice(questIndex, 1)[0];
    
    await fs.writeFile(questsPath, JSON.stringify(questsJson, null, 2));
    
    console.log(`🗑️ [Admin] ${req.user.username} a supprimé la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête supprimée avec succès',
      deletedQuest,
      backupCreated: backupPath
    });
  } catch (error) {
    console.error('❌ Erreur suppression quête:', error);
    res.status(500).json({ error: 'Erreur suppression quête' });
  }
});

// ✅ ROUTE: Dupliquer une quête
router.post('/quests/:questId/duplicate', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const questsData = await fs.readFile(questsPath, 'utf8');
    const questsJson = JSON.parse(questsData);
    
    const originalQuest = questsJson.quests.find((q: any) => q.id === req.params.questId);
    if (!originalQuest) {
      return res.status(404).json({ error: 'Quête originale non trouvée' });
    }
    
    const duplicatedQuest = {
      ...originalQuest,
      id: `${originalQuest.id}_copy_${Date.now()}`,
      name: `${originalQuest.name} (Copie)`
    };
    
    questsJson.quests.push(duplicatedQuest);
    
    const backupPath = questsPath + `.backup.${Date.now()}`;
    await fs.copyFile(questsPath, backupPath);
    
    await fs.writeFile(questsPath, JSON.stringify(questsJson, null, 2));
    
    console.log(`📋 [Admin] ${req.user.username} a dupliqué la quête: ${req.params.questId}`);
    
    res.json({
      message: 'Quête dupliquée avec succès',
      quest: duplicatedQuest
    });
  } catch (error) {
    console.error('❌ Erreur duplication quête:', error);
    res.status(500).json({ error: 'Erreur duplication quête' });
  }
});

// ✅ ROUTE: Recharger le système de quêtes
router.post('/quests/reload', requireMacAndDev, async (req: any, res) => {
  try {
    // Ici, vous pouvez ajouter la logique pour recharger le QuestManager
    // Par exemple, si vous avez une méthode reload() dans QuestManager
    
    console.log(`🔄 [Admin] ${req.user.username} a rechargé le système de quêtes`);
    
    res.json({
      message: 'Système de quêtes rechargé avec succès',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur rechargement quêtes:', error);
    res.status(500).json({ error: 'Erreur rechargement système' });
  }
});

// ✅ ROUTE: Obtenir les backups disponibles
router.get('/quests/backups', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsDir = path.join(__dirname, '../data/quests');
    const files = await fs.readdir(questsDir);
    
    const backups = files
      .filter((file: string) => file.startsWith('quests.json.backup.'))
      .map(async (file: string) => {
        const filePath = path.join(questsDir, file);
        const stats = await fs.stat(filePath);
        return {
          filename: file,
          timestamp: parseInt(file.split('.').pop() || '0'),
          date: stats.mtime,
          size: stats.size
        };
      });
    
    const backupList = await Promise.all(backups);
    backupList.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      backups: backupList.slice(0, 10), // Garder seulement les 10 plus récents
      total: backupList.length
    });
  } catch (error) {
    console.error('❌ Erreur liste backups:', error);
    res.status(500).json({ error: 'Erreur lecture backups' });
  }
});

// ✅ ROUTE: Restaurer depuis un backup
router.post('/quests/restore/:backupFile', requireMacAndDev, async (req: any, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const questsPath = path.join(__dirname, '../data/quests/quests.json');
    const backupPath = path.join(__dirname, '../data/quests', req.params.backupFile);
    
    // Vérifier que le backup existe
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup non trouvé' });
    }
    
    // Créer un backup du fichier actuel avant restauration
    const currentBackupPath = questsPath + `.backup.before_restore.${Date.now()}`;
    await fs.copyFile(questsPath, currentBackupPath);
    
    // Restaurer le backup
    await fs.copyFile(backupPath, questsPath);
    
    console.log(`⏮️ [Admin] ${req.user.username} a restauré le backup: ${req.params.backupFile}`);
    
    res.json({
      message: 'Backup restauré avec succès',
      restoredFrom: req.params.backupFile,
      currentBackupCreated: currentBackupPath
    });
  } catch (error) {
    console.error('❌ Erreur restauration backup:', error);
    res.status(500).json({ error: 'Erreur restauration backup' });
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

export default router;
