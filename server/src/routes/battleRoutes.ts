// server/src/routes/battleRoutes.ts - VERSION ZONES
import express from 'express';
import { matchMaker } from '@colyseus/core';
import { ServerEncounterManager } from '../managers/EncounterManager';
import { MoveManager } from '../managers/MoveManager';

const router = express.Router();
const encounterManager = new ServerEncounterManager();

// ✅ CRÉER UN COMBAT SAUVAGE AVEC ZONES
router.post('/wild', async (req, res) => {
  try {
    const { 
      playerId, 
      playerName, 
      playerPokemonId, 
      zone, 
      method, 
      timeOfDay, 
      weather,
      zoneId, // ✅ NOUVEAU: Zone spécifique
      x,      // ✅ NOUVEAU: Position pour validation
      y 
    } = req.body;

    console.log(`🎮 [BattleRoutes] === CRÉATION COMBAT SAUVAGE ===`);
    console.log(`👤 Joueur: ${playerName} (${playerId})`);
    console.log(`📍 Zone: ${zone} - ZoneID: ${zoneId || 'default'}`);
    console.log(`🎯 Position: (${x}, ${y})`);
    console.log(`🌿 Méthode: ${method || 'grass'}`);
    console.log(`⏰ Conditions: ${timeOfDay || 'day'}, ${weather || 'clear'}`);

    // ✅ VALIDATION ANTI-CHEAT: Générer via le système sécurisé
    const wildPokemon = await encounterManager.validateAndGenerateEncounter(
      playerId,
      zone,
      x || 0,
      y || 0,
      timeOfDay || 'day',
      weather || 'clear',
      zoneId,
      method || 'grass'
    );

    if (!wildPokemon) {
      console.log(`❌ [BattleRoutes] Aucun Pokémon généré pour ${zone}/${zoneId}`);
      return res.status(400).json({ 
        error: 'Aucun Pokémon trouvé pour cette zone ou conditions non valides',
        details: {
          zone,
          zoneId: zoneId || 'default',
          method: method || 'grass',
          timeOfDay: timeOfDay || 'day',
          weather: weather || 'clear'
        }
      });
    }

    console.log(`✅ [BattleRoutes] Pokémon généré: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);

    // ✅ CRÉER LA ROOM DE COMBAT
    const room = await matchMaker.createRoom('battle', {
      battleType: 'wild',
      playerId: playerId,
      playerName: playerName,
      playerPokemonId: playerPokemonId,
      wildPokemon: wildPokemon,
      location: zone,
      zoneId: zoneId || 'default',
      method: method || 'grass',
      conditions: {
        timeOfDay: timeOfDay || 'day',
        weather: weather || 'clear'
      }
    });

    console.log(`🎯 [BattleRoutes] Combat créé: ${room.roomId}`);

    res.json({
      success: true,
      roomId: room.roomId,
      wildPokemon: {
        pokemonId: wildPokemon.pokemonId,
        level: wildPokemon.level,
        shiny: wildPokemon.shiny,
        nature: wildPokemon.nature,
        gender: wildPokemon.gender
      },
      encounter: {
        zone: zone,
        zoneId: zoneId || 'default',
        method: method || 'grass',
        conditions: {
          timeOfDay: timeOfDay || 'day',
          weather: weather || 'clear'
        }
      }
    });

  } catch (error) {
    console.error('❌ [BattleRoutes] Erreur création combat:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du combat',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ✅ VÉRIFIER LES RENCONTRES POSSIBLES DANS UNE ZONE (avec zones spécifiques)
router.get('/encounters/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const { 
      method = 'grass', 
      timeOfDay = 'day', 
      weather = 'clear',
      zoneId,
      samples = 100
    } = req.query;

    console.log(`📊 [BattleRoutes] Analyse rencontres pour ${zone}/${zoneId || 'default'}`);

    await encounterManager.loadEncounterTable(zone);
    
    // ✅ SIMULER DES RENCONTRES POUR OBTENIR LES STATISTIQUES
    const encounters: any[] = [];
    const sampleCount = Math.min(parseInt(samples as string), 1000); // Max 1000
    
    for (let i = 0; i < sampleCount; i++) {
      const wildPokemon = await encounterManager.checkForEncounter(
        zone, 
        method as 'grass' | 'fishing',
        1.0, // 100% pour simulation
        timeOfDay as 'day' | 'night',
        weather as 'clear' | 'rain',
        zoneId as string
      );
      
      if (wildPokemon) {
        encounters.push({
          pokemonId: wildPokemon.pokemonId,
          level: wildPokemon.level,
          shiny: wildPokemon.shiny,
          nature: wildPokemon.nature,
          gender: wildPokemon.gender
        });
      }
    }

    // ✅ CALCULER LES STATISTIQUES DÉTAILLÉES
    const stats = encounters.reduce((acc, enc) => {
      const key = `${enc.pokemonId}`;
      if (!acc[key]) {
        acc[key] = {
          pokemonId: enc.pokemonId,
          count: 0,
          levels: [],
          shinyCount: 0,
          genders: { male: 0, female: 0, unknown: 0 },
          natures: {}
        };
      }
      
      acc[key].count++;
      acc[key].levels.push(enc.level);
      
      if (enc.shiny) acc[key].shinyCount++;
      
      acc[key].genders[enc.gender as keyof typeof acc[string]['genders']]++;
      
      if (!acc[key].natures[enc.nature]) acc[key].natures[enc.nature] = 0;
      acc[key].natures[enc.nature]++;
      
      return acc;
    }, {} as any);

    // ✅ CALCULER POURCENTAGES ET NIVEAUX MOYENS
    Object.values(stats).forEach((stat: any) => {
      stat.percentage = (stat.count / encounters.length * 100).toFixed(2);
      stat.averageLevel = (stat.levels.reduce((a: number, b: number) => a + b, 0) / stat.levels.length).toFixed(1);
      stat.minLevel = Math.min(...stat.levels);
      stat.maxLevel = Math.max(...stat.levels);
      stat.shinyRate = (stat.shinyCount / stat.count * 100).toFixed(4);
    });

    res.json({
      zone,
      zoneId: zoneId || 'default',
      method,
      timeOfDay,
      weather,
      analysis: {
        totalSimulations: sampleCount,
        successfulEncounters: encounters.length,
        encounterRate: (encounters.length / sampleCount * 100).toFixed(2) + '%',
        uniquePokemon: Object.keys(stats).length
      },
      statistics: Object.values(stats),
      examples: encounters.slice(0, 10),
      summary: {
        mostCommon: Object.values(stats).sort((a: any, b: any) => b.count - a.count).slice(0, 3),
        rarest: Object.values(stats).sort((a: any, b: any) => a.count - b.count).slice(0, 3),
        shinyFound: encounters.filter(e => e.shiny).length
      }
    });

  } catch (error) {
    console.error('❌ [BattleRoutes] Erreur consultation rencontres:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation des rencontres',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ✅ LISTER LES ZONES D'UNE CARTE
router.get('/zones/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    
    console.log(`🗺️ [BattleRoutes] Liste des zones pour ${zone}`);
    
    await encounterManager.loadEncounterTable(zone);
    
    // Debug de la table pour voir les zones disponibles
    encounterManager.debugEncounterTable(zone);
    
    res.json({
      zone,
      message: 'Vérifiez la console serveur pour les détails des zones',
      available: true
    });

  } catch (error) {
    console.error('❌ [BattleRoutes] Erreur consultation zones:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la consultation des zones'
    });
  }
});

// ✅ TESTER UNE RENCONTRE SPÉCIFIQUE (développement)
router.post('/test-encounter', async (req, res) => {
  try {
    const { 
      zone, 
      zoneId, 
      method = 'grass', 
      timeOfDay = 'day', 
      weather = 'clear',
      playerId = 'test-player'
    } = req.body;

    console.log(`🧪 [BattleRoutes] Test rencontre: ${zone}/${zoneId}`);

    const wildPokemon = await encounterManager.validateAndGenerateEncounter(
      playerId,
      zone,
      100, // Position test
      100,
      timeOfDay,
      weather,
      zoneId,
      method
    );

    if (wildPokemon) {
      res.json({
        success: true,
        wildPokemon,
        conditions: { zone, zoneId, method, timeOfDay, weather }
      });
    } else {
      res.json({
        success: false,
        message: 'Aucune rencontre générée',
        conditions: { zone, zoneId, method, timeOfDay, weather }
      });
    }

  } catch (error) {
    console.error('❌ [BattleRoutes] Erreur test rencontre:', error);
    res.status(500).json({ 
      error: 'Erreur lors du test de rencontre'
    });
  }
});

// === ROUTES EXISTANTES (INCHANGÉES) ===

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

// Obtenir les statistiques de combat d'un Pokémon
router.get('/pokemon/:id/battle-stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { level = 50 } = req.query;

    // Simuler des stats de combat pour un Pokémon
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

export default router;
