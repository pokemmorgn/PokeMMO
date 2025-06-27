// server/src/routes/battleRoutes.ts
import express from 'express';
import { matchMaker } from '@colyseus/core';
import { ServerEncounterManager } from '../managers/EncounterManager';
import { MoveManager } from '../managers/MoveManager';

const router = express.Router();
const encounterManager = new ServerEncounterManager();

// Créer un combat sauvage
router.post('/wild', async (req, res) => {
  try {
    const { 
      playerId, 
      playerName, 
      playerPokemonId, 
      zone, 
      method, 
      timeOfDay, 
      weather 
    } = req.body;

    console.log(`🎮 Création combat sauvage pour ${playerName}`);

    // Générer le Pokémon sauvage
    const wildPokemon = await encounterManager.generateWildEncounter(
      zone, 
      method || 'grass', 
      timeOfDay || 'day', 
      weather || 'clear'
    );

    if (!wildPokemon) {
      return res.status(400).json({ 
        error: 'Aucun Pokémon trouvé pour cette zone' 
      });
    }

    // Créer la room de combat
    const room = await matchMaker.createRoom('battle', {
      battleType: 'wild',
      playerId: playerId,
      playerName: playerName,
      playerPokemonId: playerPokemonId,
      wildPokemon: wildPokemon,
      location: zone,
      method: method
    });

    res.json({
      success: true,
      roomId: room.roomId,
      wildPokemon: {
        pokemonId: wildPokemon.pokemonId,
        level: wildPokemon.level,
        shiny: wildPokemon.shiny
      }
    });

  } catch (error) {
    console.error('❌ Erreur création combat:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du combat' 
    });
  }
});

// Vérifier les rencontres possibles dans une zone
router.get('/encounters/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const { method = 'grass', timeOfDay = 'day', weather = 'clear' } = req.query;

    await encounterManager.loadEncounterTable(zone);
    
    // Simuler 100 rencontres pour obtenir les statistiques
    const encounters: any[] = [];
    for (let i = 0; i < 100; i++) {
      const wildPokemon = await encounterManager.generateWildEncounter(
        zone, 
        method as 'grass' | 'fishing',
        timeOfDay as 'day' | 'night',
        weather as 'clear' | 'rain'
      );
      
      if (wildPokemon) {
        encounters.push({
          pokemonId: wildPokemon.pokemonId,
          level: wildPokemon.level,
          shiny: wildPokemon.shiny
        });
      }
    }

    // Calculer les statistiques
    const stats = encounters.reduce((acc, enc) => {
      const key = `${enc.pokemonId}_${enc.level}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as any);

    res.json({
      zone,
      method,
      timeOfDay,
      weather,
      totalEncounters: encounters.length,
      statistics: stats,
      examples: encounters.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur consultation rencontres:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation des rencontres' 
    });
  }
});

// Obtenir les données d'une attaque
router.get('/moves/:moveId', async (req, res) => {
  try {
    const { moveId } = req.params;
    
    await MoveManager.initialize();
    const moveData = MoveManager.getMoveData(moveId);
    
    if (!moveData) {
      return res.status(404).json({ 
        error: 'Attaque non trouvée' 
      });
    }

    res.json(moveData);

  } catch (error) {
    console.error('❌ Erreur consultation attaque:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation de l\'attaque' 
    });
  }
});

// Lister toutes les attaques
router.get('/moves', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    
    await MoveManager.initialize();
    let moves = MoveManager.getAllMoves();

    // Filtrer par type
    if (type) {
      moves = moves.filter(move => move.type.toLowerCase() === (type as string).toLowerCase());
    }

    // Filtrer par catégorie
    if (category) {
      moves = moves.filter(move => move.category.toLowerCase() === (category as string).toLowerCase());
    }

    // Recherche textuelle
    if (search) {
      moves = MoveManager.searchMoves(search as string);
    }

    res.json({
      total: moves.length,
      moves: moves.slice(0, 50) // Limiter à 50 résultats
    });

  } catch (error) {
    console.error('❌ Erreur consultation attaques:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation des attaques' 
    });
  }
});

// Simuler un combat (pour tests)
router.post('/simulate', async (req, res) => {
  try {
    const { pokemon1, pokemon2, rounds = 1000 } = req.body;
    
    const results = {
      pokemon1Wins: 0,
      pokemon2Wins: 0,
      draws: 0,
      averageTurns: 0
    };

    // Simulation simplifiée
    for (let i = 0; i < rounds; i++) {
      const winner = Math.random() < 0.5 ? 'pokemon1' : 'pokemon2';
      if (winner === 'pokemon1') {
        results.pokemon1Wins++;
      } else {
        results.pokemon2Wins++;
      }
    }

    results.averageTurns = Math.floor(Math.random() * 10) + 5; // 5-15 tours

    res.json({
      simulation: {
        rounds,
        pokemon1: pokemon1,
        pokemon2: pokemon2
      },
      results
    });

  } catch (error) {
    console.error('❌ Erreur simulation:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la simulation' 
    });
  }
});

// Obtenir les statistiques de combat d'un Pokémon
router.get('/pokemon/:id/battle-stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { level = 50 } = req.query;

    // Simuler des stats de combat pour un Pokémon
    // Tu peux remplacer par des vraies données de ta base
    const battleStats = {
      pokemonId: parseInt(id),
      level: parseInt(level as string),
      estimatedStats: {
        hp: Math.floor(Math.random() * 200) + 100,
        attack: Math.floor(Math.random() * 150) + 50,
        defense: Math.floor(Math.random() * 150) + 50,
        specialAttack: Math.floor(Math.random() * 150) + 50,
        specialDefense: Math.floor(Math.random() * 150) + 50,
        speed: Math.floor(Math.random() * 150) + 50
      },
      commonMoves: ["tackle", "growl", "quick_attack"],
      typeEffectiveness: {
        weakTo: ["Fire", "Flying"],
        strongAgainst: ["Water", "Ground"],
        resistantTo: ["Electric", "Grass"]
      }
    };

    res.json(battleStats);

  } catch (error) {
    console.error('❌ Erreur stats combat:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation des stats de combat' 
    });
  }
});

// Calculer l'efficacité des types
router.get('/type-effectiveness/:attackType/:defendType', (req, res) => {
  try {
    const { attackType, defendType } = req.params;
    
    // Table d'efficacité simplifiée
    const typeChart: { [key: string]: { [key: string]: number } } = {
      "Fire": { "Grass": 2, "Water": 0.5, "Fire": 0.5 },
      "Water": { "Fire": 2, "Grass": 0.5, "Water": 0.5 },
      "Grass": { "Water": 2, "Fire": 0.5, "Grass": 0.5 },
      "Electric": { "Water": 2, "Flying": 2, "Ground": 0 },
      // ... ajouter plus selon tes besoins
    };

    const effectiveness = typeChart[attackType]?.[defendType] || 1;
    
    let description = "Efficacité normale";
    if (effectiveness === 2) description = "Super efficace !";
    else if (effectiveness === 0.5) description = "Peu efficace...";
    else if (effectiveness === 0) description = "Aucun effet !";

    res.json({
      attackType,
      defendType,
      effectiveness,
      multiplier: effectiveness,
      description
    });

  } catch (error) {
    console.error('❌ Erreur efficacité types:', error);
    res.status(500).json({ 
      error: 'Erreur lors du calcul d\'efficacité' 
    });
  }
});

export default router;
