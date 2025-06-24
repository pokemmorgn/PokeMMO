// server/src/routes/battleRoutes.ts
import { Router } from 'express';
import { MoveManager } from '../managers/MoveManager';
import { BattleConfigUtils } from '../config/battleConfig';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ================================================================================================
// DONNÉES DE COMBAT
// ================================================================================================

/**
 * Récupère les données d'une attaque
 */
router.get('/move/:moveId', authMiddleware, (req, res) => {
  try {
    const { moveId } = req.params;
    const moveData = MoveManager.getMoveData(moveId);
    
    if (!moveData) {
      return res.status(404).json({ error: 'Attaque non trouvée' });
    }
    
    // Renvoie seulement les données nécessaires au client
    res.json({
      id: moveData.id,
      name: moveData.name,
      type: moveData.type,
      category: moveData.category,
      power: moveData.power,
      accuracy: moveData.accuracy,
      pp: moveData.pp,
      description: moveData.description
    });
  } catch (error) {
    console.error('Erreur récupération attaque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Calcule l'efficacité d'un type contre un autre
 */
router.get('/type-effectiveness/:attackType/:defendType', authMiddleware, (req, res) => {
  try {
    const { attackType, defendType } = req.params;
    const effectiveness = BattleConfigUtils.getTypeEffectiveness(attackType, defendType);
    
    res.json({ 
      effectiveness,
      message: BattleConfigUtils.getEffectivenessMessage(effectiveness)
    });
  } catch (error) {
    console.error('Erreur calcul efficacité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================================================
// ACTIONS DE COMBAT (SÉCURISÉES)
// ================================================================================================

/**
 * Calcule les dégâts d'une attaque (côté serveur uniquement)
 */
router.post('/calculate-damage', authMiddleware, (req, res) => {
  try {
    const {
      attackerId,
      defenderId,
      moveId,
      battleId
    } = req.body;

    // Validation des paramètres
    if (!attackerId || !defenderId || !moveId || !battleId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // Vérifier que le joueur a le droit de faire cette action
    const playerId = req.user?.id;
    if (!playerId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // TODO: Vérifier que c'est le tour du joueur dans cette bataille
    // TODO: Récupérer les stats des Pokémon depuis la base de données
    // TODO: Calculer les dégâts avec BattleConfigUtils
    
    res.json({
      damage: 0, // Calcul réel à implémenter
      effectiveness: 1.0,
      isCritical: false,
      message: "Calcul en cours..."
    });
    
  } catch (error) {
    console.error('Erreur calcul dégâts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Exécute un tour de combat complet
 */
router.post('/execute-turn', authMiddleware, (req, res) => {
  try {
    const {
      battleId,
      action, // "attack", "switch", "item", "run"
      moveId,
      targetId
    } = req.body;

    const playerId = req.user?.id;
    if (!playerId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // TODO: Implémenter la logique complète de tour
    // 1. Vérifier que c'est le tour du joueur
    // 2. Valider l'action
    // 3. Calculer les résultats
    // 4. Mettre à jour l'état de la bataille
    // 5. Envoyer les résultats via WebSocket

    res.json({
      success: true,
      results: {
        action: action,
        damage: 0,
        effects: [],
        nextTurn: "opponent"
      }
    });

  } catch (error) {
    console.error('Erreur exécution tour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================================================
// GESTION DES BATAILLES
// ================================================================================================

/**
 * Démarre une nouvelle bataille
 */
router.post('/start', authMiddleware, (req, res) => {
  try {
    const {
      opponentType, // "wild", "trainer", "player"
      opponentId,
      location
    } = req.body;

    const playerId = req.user?.id;
    if (!playerId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // TODO: Créer une nouvelle instance de bataille
    // TODO: Initialiser les Pokémon
    // TODO: Sauvegarder en base de données

    const battleId = `battle_${Date.now()}_${playerId}`;

    res.json({
      battleId,
      status: "started",
      turn: "player",
      playerPokemon: {
        // Données du Pokémon du joueur
      },
      opponentPokemon: {
        // Données du Pokémon adverse
      }
    });

  } catch (error) {
    console.error('Erreur démarrage bataille:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Récupère l'état actuel d'une bataille
 */
router.get('/state/:battleId', authMiddleware, (req, res) => {
  try {
    const { battleId } = req.params;
    const playerId = req.user?.id;

    if (!playerId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // TODO: Récupérer l'état de la bataille depuis la base de données
    // TODO: Vérifier que le joueur fait partie de cette bataille

    res.json({
      battleId,
      status: "ongoing", // "ongoing", "ended", "paused"
      turn: "player",
      turnTimer: 30,
      playerPokemon: {
        id: "pokemon_1",
        name: "Pikachu",
        level: 25,
        currentHp: 80,
        maxHp: 100,
        status: "normal",
        moves: [
          { id: "thunderbolt", pp: 15, maxPp: 15 },
          { id: "quick_attack", pp: 30, maxPp: 30 }
        ]
      },
      opponentPokemon: {
        id: "pokemon_2",
        name: "Rattata",
        level: 20,
        currentHp: 60,
        maxHp: 70,
        status: "normal"
      },
      battleLog: [
        "Un Rattata sauvage apparaît !",
        "Allez Pikachu !"
      ]
    });

  } catch (error) {
    console.error('Erreur récupération état bataille:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Termine une bataille
 */
router.post('/end/:battleId', authMiddleware, (req, res) => {
  try {
    const { battleId } = req.params;
    const { result } = req.body; // "victory", "defeat", "run", "draw"
    const playerId = req.user?.id;

    if (!playerId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // TODO: Finaliser la bataille
    // TODO: Calculer les récompenses (XP, argent, objets)
    // TODO: Mettre à jour les stats du joueur
    // TODO: Nettoyer les données temporaires

    res.json({
      result,
      rewards: {
        experience: 120,
        money: 50,
        items: []
      },
      levelUps: []
    });

  } catch (error) {
    console.error('Erreur fin de bataille:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================================================
// ROUTES DE DEBUG (DÉVELOPPEMENT UNIQUEMENT)
// ================================================================================================

if (process.env.NODE_ENV === 'development') {
  /**
   * Force un résultat de combat (debug)
   */
  router.post('/debug/force-result', (req, res) => {
    const { battleId, result } = req.body;
    
    res.json({
      debug: true,
      forcedResult: result,
      message: "Résultat forcé (mode développement)"
    });
  });

  /**
   * Liste toutes les attaques disponibles (debug)
   */
  router.get('/debug/all-moves', (req, res) => {
    const allMoves = MoveManager.getAllMoves();
    res.json({
      total: allMoves.length,
      moves: allMoves.map(move => ({
        id: move.id,
        name: move.name,
        type: move.type,
        power: move.power
      }))
    });
  });
}

export default router;
