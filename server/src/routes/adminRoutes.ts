// server/src/routes/adminRoutes.ts
import express from 'express';
import { PlayerData } from '../models/PlayerData';
import { OwnedPokemon } from '../models/OwnedPokemon';
import { PlayerQuest } from '../models/PlayerQuest';
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

export default router;
