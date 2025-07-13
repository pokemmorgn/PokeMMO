// server/src/rewards/PokemonReward.ts

import { OwnedPokemon } from '../models/OwnedPokemon';
import { TeamManager } from '../managers/TeamManager';
import { MoveManager } from '../managers/MoveManager';
import { getPokemonById } from '../data/PokemonData';
import { FriendshipReward } from './FriendshipReward';
import { 
  PokemonReward as PokemonRewardType, 
  ProcessedReward, 
  RewardNotification,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

interface PokemonGenerationOptions {
  guaranteedShiny?: boolean;
  minIVs?: number;
  maxIVs?: number;
  specificMoves?: string[];
  specificNature?: string;
  friendship?: number;
  customStats?: boolean;
}

export class PokemonReward {
  private friendshipReward: FriendshipReward;

  constructor() {
    this.friendshipReward = new FriendshipReward();
  }

  /**
   * 🎁 Distribue un Pokémon en récompense
   */
  async givePokemon(playerId: string, reward: PokemonRewardType): Promise<ProcessedReward> {
    console.log(`🎁 [PokemonReward] Distribution Pokémon pour ${playerId}: ${reward.pokemonData.pokemonId}`);

    try {
      // Générer le Pokémon avec les spécifications
      const generatedPokemon = await this.generateRewardPokemon(playerId, reward.pokemonData);

      if (!generatedPokemon) {
        return {
          type: 'pokemon',
          success: false,
          error: 'Impossible de générer le Pokémon récompense'
        };
      }

      // Ajouter à l'équipe ou au PC
      const addResult = await this.addPokemonToPlayerCollection(playerId, generatedPokemon);

      // Appliquer l'amitié de départ si spécifiée
      if (reward.pokemonData.friendship && reward.pokemonData.friendship > 70) {
        await this.friendshipReward.giveFriendship(playerId, {
          type: 'friendship',
          pokemonId: generatedPokemon._id.toString(),
          friendshipGain: reward.pokemonData.friendship - 70,
          reason: 'gift'
        });
      }

      // Générer les notifications
      const notifications = this.generatePokemonNotifications(generatedPokemon, addResult, reward);

      console.log(`✅ [PokemonReward] Pokémon distribué: ${generatedPokemon.nickname || generatedPokemon.name}`);

      return {
        type: 'pokemon',
        success: true,
        finalAmount: 1,
        data: {
          ownedPokemon: generatedPokemon,
          addedTo: addResult.location,
          isShiny: generatedPokemon.shiny,
          notifications,
          specialTraits: this.analyzePokemonTraits(generatedPokemon)
        }
      };

    } catch (error) {
      console.error('❌ [PokemonReward] Erreur distribution Pokémon:', error);
      return {
        type: 'pokemon',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🏭 Génère un Pokémon selon les spécifications
   */
  private async generateRewardPokemon(
    playerId: string, 
    pokemonData: PokemonRewardType['pokemonData'],
    options: PokemonGenerationOptions = {}
  ): Promise<any> {
    try {
      // Récupérer les données de base du Pokémon
      const basePokemonData = await getPokemonById(pokemonData.pokemonId);
      if (!basePokemonData) {
        throw new Error(`Pokémon ID ${pokemonData.pokemonId} introuvable`);
      }

      // Générer les IVs
      const ivs = this.generateIVs(pokemonData.ivs, options);

      // Générer les stats calculées
      const calculatedStats = this.calculateRewardPokemonStats(
        basePokemonData.baseStats,
        pokemonData.level,
        ivs,
        pokemonData.nature || this.generateRandomNature()
      );

      // Calculer HP max
      const maxHp = this.calculateHP(basePokemonData.baseStats.hp, pokemonData.level, ivs.hp);

      // Générer les attaques
      const moves = await this.generateRewardMoves(
        pokemonData.pokemonId,
        pokemonData.level,
        pokemonData.moves || options.specificMoves
      );

      // Créer le Pokémon
      const ownedPokemon = new OwnedPokemon({
        owner: playerId,
        pokemonId: pokemonData.pokemonId,
        level: pokemonData.level,
        experience: this.calculateExperienceForLevel(pokemonData.level),
        nature: pokemonData.nature || this.generateRandomNature(),
        nickname: undefined, // Les Pokémon récompenses n'ont pas de surnom par défaut
        shiny: pokemonData.shiny || false,
        gender: this.generateRandomGender(basePokemonData),
        ability: this.generateRandomAbility(basePokemonData),
        
        ivs: ivs,
        evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
        calculatedStats: calculatedStats,
        
        moves: moves,
        
        currentHp: maxHp,
        maxHp: maxHp,
        status: 'normal',
        
        isInTeam: false,
        box: 0,
        
        caughtAt: new Date(),
        friendship: pokemonData.friendship || 70,
        pokeball: 'poke_ball', // Pokémon récompenses viennent dans des Poké Balls basiques
        originalTrainer: 'System', // Marqué comme don du système
        heldItem: undefined
      });

      await ownedPokemon.save();
      console.log(`🆕 [PokemonReward] Pokémon créé: ${basePokemonData.name} niveau ${pokemonData.level}`);

      return ownedPokemon;

    } catch (error) {
      console.error('❌ [PokemonReward] Erreur génération Pokémon:', error);
      throw error;
    }
  }

  /**
   * 📊 Génère les IVs selon les spécifications
   */
  private generateIVs(
    customIVs?: PokemonRewardType['pokemonData']['ivs'],
    options: PokemonGenerationOptions = {}
  ): any {
    const minIV = options.minIVs || 0;
    const maxIV = options.maxIVs || 31;

    return {
      hp: customIVs?.hp ?? this.randomBetween(minIV, maxIV),
      attack: customIVs?.attack ?? this.randomBetween(minIV, maxIV),
      defense: customIVs?.defense ?? this.randomBetween(minIV, maxIV),
      spAttack: customIVs?.spAttack ?? this.randomBetween(minIV, maxIV),
      spDefense: customIVs?.spDefense ?? this.randomBetween(minIV, maxIV),
      speed: customIVs?.speed ?? this.randomBetween(minIV, maxIV)
    };
  }

  /**
   * 🧮 Calcule les stats d'un Pokémon récompense
   */
  private calculateRewardPokemonStats(
    baseStats: any, 
    level: number, 
    ivs: any, 
    nature: string
  ): any {
    // Formule Pokémon standard
    const calculateStat = (baseStat: number, iv: number, isHP: boolean = false): number => {
      if (isHP) {
        return Math.floor(((2 * baseStat + iv) * level) / 100) + level + 10;
      } else {
        let stat = Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
        
        // Application de la nature (simplifié)
        const natureEffects = this.getNatureEffects(nature);
        if (natureEffects.increased && this.statMatchesNature(baseStat, natureEffects.increased)) {
          stat = Math.floor(stat * 1.1);
        } else if (natureEffects.decreased && this.statMatchesNature(baseStat, natureEffects.decreased)) {
          stat = Math.floor(stat * 0.9);
        }
        
        return stat;
      }
    };

    return {
      attack: calculateStat(baseStats.attack, ivs.attack),
      defense: calculateStat(baseStats.defense, ivs.defense),
      spAttack: calculateStat(baseStats.specialAttack, ivs.spAttack),
      spDefense: calculateStat(baseStats.specialDefense, ivs.spDefense),
      speed: calculateStat(baseStats.speed, ivs.speed)
    };
  }

  /**
   * ❤️ Calcule les HP
   */
  private calculateHP(baseHP: number, level: number, hpIV: number): number {
    return Math.floor(((2 * baseHP + hpIV) * level) / 100) + level + 10;
  }

  /**
   * ⚔️ Génère les attaques pour un Pokémon récompense
   */
  private async generateRewardMoves(
    pokemonId: number,
    level: number,
    customMoves?: string[]
  ): Promise<any[]> {
    try {
      if (customMoves && customMoves.length > 0) {
        // Utiliser les attaques spécifiées
        return customMoves.slice(0, 4).map(moveId => {
          const moveData = MoveManager.getMoveData(moveId);
          return {
            moveId,
            currentPp: moveData?.pp || 20,
            maxPp: moveData?.pp || 20
          };
        });
      } else {
        // Générer les attaques selon le niveau
        const availableMoves = await MoveManager.getLearnableMoves(pokemonId, level);
        const selectedMoves = availableMoves.slice(-4); // Prendre les 4 dernières attaques

        return selectedMoves.map(moveId => {
          const moveData = MoveManager.getMoveData(moveId);
          return {
            moveId,
            currentPp: moveData?.pp || 20,
            maxPp: moveData?.pp || 20
          };
        });
      }
    } catch (error) {
      console.error('❌ [PokemonReward] Erreur génération attaques:', error);
      // Attaques par défaut
      return [{
        moveId: 'tackle',
        currentPp: 35,
        maxPp: 35
      }];
    }
  }

  /**
   * 📦 Ajoute le Pokémon à la collection du joueur
   */
  private async addPokemonToPlayerCollection(
    playerId: string, 
    pokemon: any
  ): Promise<{ location: 'team' | 'pc'; message: string }> {
    try {
      const teamManager = new TeamManager();
      
      try {
        await teamManager.addToTeam(pokemon._id);
        return {
          location: 'team',
          message: `${pokemon.nickname || pokemon.name} a été ajouté à votre équipe !`
        };
      } catch (teamError) {
        // Équipe pleine, ajouter au PC
        pokemon.isInTeam = false;
        pokemon.box = 0;
        await pokemon.save();
        
        return {
          location: 'pc',
          message: `${pokemon.nickname || pokemon.name} a été envoyé au PC (équipe pleine).`
        };
      }
    } catch (error) {
      console.error('❌ [PokemonReward] Erreur ajout collection:', error);
      throw error;
    }
  }

  /**
   * 🔔 Génère les notifications pour la récompense Pokémon
   */
  private generatePokemonNotifications(
    pokemon: any, 
    addResult: any, 
    reward: PokemonRewardType
  ): RewardNotification[] {
    const notifications: RewardNotification[] = [];

    // Notification principale
    notifications.push({
      type: 'pokemon',
      message: `Vous recevez ${pokemon.nickname || pokemon.name} !`,
      priority: 'high',
      animation: 'sparkle',
      data: {
        pokemonId: pokemon.pokemonId,
        level: pokemon.level,
        isShiny: pokemon.shiny,
        location: addResult.location
      }
    });

    // Notification shiny
    if (pokemon.shiny) {
      notifications.push({
        type: 'pokemon',
        message: `⭐ C'est un Pokémon chromatique ! ⭐`,
        priority: 'high',
        animation: 'explosion',
        data: {
          pokemonId: pokemon.pokemonId,
          shiny: true
        }
      });
    }

    // Notification IVs parfaits
    const perfectIVs = this.countPerfectIVs(pokemon.ivs);
    if (perfectIVs >= 3) {
      notifications.push({
        type: 'pokemon',
        message: `Excellent ! ${perfectIVs} statistiques parfaites !`,
        priority: 'medium',
        data: {
          pokemonId: pokemon.pokemonId,
          perfectIVs
        }
      });
    }

    // Notification emplacement
    notifications.push({
      type: 'pokemon',
      message: addResult.message,
      priority: 'medium',
      data: {
        location: addResult.location
      }
    });

    return notifications;
  }

  /**
   * 🔍 Analyse les traits spéciaux du Pokémon
   */
  private analyzePokemonTraits(pokemon: any): {
    isShiny: boolean;
    perfectIVCount: number;
    totalIVSum: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    specialTraits: string[];
  } {
    const perfectIVs = this.countPerfectIVs(pokemon.ivs);
    const totalIVs = Object.values(pokemon.ivs).reduce((sum: number, iv: any) => sum + iv, 0);
    const specialTraits: string[] = [];

    // Traits spéciaux
    if (pokemon.shiny) specialTraits.push('Chromatique');
    if (perfectIVs >= 6) specialTraits.push('IVs Parfaits');
    if (perfectIVs >= 3) specialTraits.push('Excellentes Statistiques');
    if (totalIVs >= 170) specialTraits.push('Très Fort');
    if (pokemon.friendship > 200) specialTraits.push('Très Amical');

    // Déterminer la rareté
    let rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common';
    if (pokemon.shiny && perfectIVs >= 3) rarity = 'legendary';
    else if (pokemon.shiny) rarity = 'epic';
    else if (perfectIVs >= 4) rarity = 'epic';
    else if (perfectIVs >= 2) rarity = 'rare';
    else if (perfectIVs >= 1) rarity = 'uncommon';

    return {
      isShiny: pokemon.shiny,
      perfectIVCount: perfectIVs,
      totalIVSum: totalIVs,
      rarity,
      specialTraits
    };
  }

  // === MÉTHODES UTILITAIRES ===

  private countPerfectIVs(ivs: any): number {
    return Object.values(ivs).filter((iv: any) => iv === 31).length;
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateRandomNature(): string {
    const natures = [
      'hardy', 'lonely', 'brave', 'adamant', 'naughty',
      'bold', 'docile', 'relaxed', 'impish', 'lax',
      'timid', 'hasty', 'serious', 'jolly', 'naive',
      'modest', 'mild', 'quiet', 'bashful', 'rash',
      'calm', 'gentle', 'sassy', 'careful', 'quirky'
    ];
    return natures[Math.floor(Math.random() * natures.length)];
  }

  private generateRandomGender(pokemonData: any): string {
    const genderRatio = pokemonData.genderRatio;
    if (genderRatio === -1) return 'Genderless';
    if (genderRatio === 0) return 'Male';
    if (genderRatio === 8) return 'Female';
    
    const random = Math.random() * 8;
    return random < genderRatio ? 'Female' : 'Male';
  }

  private generateRandomAbility(pokemonData: any): string {
    const abilities = pokemonData.abilities || ['overgrow'];
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  private calculateExperienceForLevel(level: number): number {
    return Math.floor(Math.pow(level, 3));
  }

  private getNatureEffects(nature: string): { increased?: string; decreased?: string } {
    // Simplifié - en réalité il faudrait une table complète des natures
    const natureEffects: Record<string, { increased?: string; decreased?: string }> = {
      'adamant': { increased: 'attack', decreased: 'spAttack' },
      'modest': { increased: 'spAttack', decreased: 'attack' },
      'timid': { increased: 'speed', decreased: 'attack' },
      'jolly': { increased: 'speed', decreased: 'spAttack' },
      'bold': { increased: 'defense', decreased: 'attack' },
      'calm': { increased: 'spDefense', decreased: 'attack' },
      // Nature neutre
      'hardy': {},
      'serious': {},
      'bashful': {},
      'quirky': {},
      'docile': {}
    };
    
    return natureEffects[nature] || {};
  }

  private statMatchesNature(statValue: number, natureStat: string): boolean {
    // Logique simplifiée pour mapper les stats aux natures
    // En réalité, il faudrait une correspondance plus précise
    return true; // Simplifié pour l'instant
  }

  // === MÉTHODES PUBLIQUES UTILITAIRES ===

  /**
   * 🎲 Génère un Pokémon aléatoire pour récompense
   */
  async generateRandomRewardPokemon(
    playerId: string, 
    levelRange: { min: number; max: number },
    options: {
      allowShiny?: boolean;
      shinyChance?: number;
      minIVs?: number;
      rareSpeciesOnly?: boolean;
    } = {}
  ): Promise<ProcessedReward> {
    try {
      // Liste des Pokémon disponibles en récompense
      const availablePokemon = this.getRewardPokemonPool(options.rareSpeciesOnly);
      const selectedPokemonId = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
      
      const level = this.randomBetween(levelRange.min, levelRange.max);
      const isShiny = options.allowShiny && Math.random() < (options.shinyChance || 0.01);

      return await this.givePokemon(playerId, {
        type: 'pokemon',
        pokemonData: {
          pokemonId: selectedPokemonId,
          level,
          shiny: isShiny,
          ivs: options.minIVs ? {
            hp: this.randomBetween(options.minIVs, 31),
            attack: this.randomBetween(options.minIVs, 31),
            defense: this.randomBetween(options.minIVs, 31),
            spAttack: this.randomBetween(options.minIVs, 31),
            spDefense: this.randomBetween(options.minIVs, 31),
            speed: this.randomBetween(options.minIVs, 31)
          } : undefined
        }
      });

    } catch (error) {
      console.error('❌ [PokemonReward] Erreur génération aléatoire:', error);
      return {
        type: 'pokemon',
        success: false,
        error: 'Impossible de générer un Pokémon aléatoire'
      };
    }
  }

  /**
   * 🎪 Pool de Pokémon disponibles en récompense
   */
  private getRewardPokemonPool(rareOnly: boolean = false): number[] {
    if (rareOnly) {
      // Pokémon rares pour récompenses spéciales
      return [
        130, 131, 132, // Léviator, Lokhlass, Métamorph
        143, // Ronflex
        147, 148, 149, // Dragons
        25, // Pikachu
        144, 145, 146, // Oiseaux légendaires
        150, 151 // Mewtwo, Mew
      ];
    } else {
      // Pool standard (premiers Pokémon pour simplifier)
      return [
        1, 2, 3,    // Bulbasaur line
        4, 5, 6,    // Charmander line  
        7, 8, 9,    // Squirtle line
        25, 26,     // Pikachu line
        29, 30, 31, // Nidoran F line
        32, 33, 34, // Nidoran M line
        39, 40,     // Jigglypuff line
        50, 51,     // Diglett line
        52, 53,     // Meowth line
        54, 55,     // Psyduck line
        56, 57,     // Mankey line
        58, 59,     // Growlithe line
        60, 61, 62, // Poliwag line
        63, 64, 65, // Abra line
        66, 67, 68, // Machop line
        69, 70, 71, // Bellsprout line
        72, 73,     // Tentacool line
        74, 75, 76, // Geodude line
        77, 78,     // Ponyta line
        79, 80,     // Slowpoke line
        81, 82,     // Magnemite line
        83,         // Farfetch'd
        84, 85,     // Doduo line
        86, 87,     // Seel line
        88, 89,     // Grimer line
        90, 91,     // Shellder line
        92, 93, 94, // Gastly line
        95,         // Onix
        96, 97,     // Drowzee line
        98, 99,     // Krabby line
        100, 101,   // Voltorb line
        102, 103,   // Exeggcute line
        104, 105,   // Cubone line
        106, 107,   // Hitmonlee, Hitmonchan
        108,        // Lickitung
        109, 110,   // Koffing line
        111, 112,   // Rhyhorn line
        113,        // Chansey
        114,        // Tangela
        115,        // Kangaskhan
        116, 117,   // Horsea line
        118, 119,   // Goldeen line
        120, 121,   // Staryu line
        122,        // Mr. Mime
        123,        // Scyther
        124,        // Jynx
        125,        // Electabuzz
        126,        // Magmar
        127,        // Pinsir
        128,        // Tauros
        129, 130,   // Magikarp line
        131,        // Lapras
        132,        // Ditto
        133, 134, 135, 136, // Eevee lines
        137,        // Porygon
        138, 139,   // Omanyte line
        140, 141,   // Kabuto line
        142,        // Aerodactyl
        143         // Snorlax
      ];
    }
  }

  /**
   * 📊 Statistiques des Pokémon distribués
   */
  async getDistributionStats(playerId: string): Promise<{
    totalPokemonReceived: number;
    shinyReceived: number;
    averageIVs: number;
    rareReceived: number;
    lastReceived?: Date;
  }> {
    try {
      // TODO: Implémenter avec une table d'historique
      // Pour l'instant, estimation depuis OwnedPokemon
      const systemPokemon = await OwnedPokemon.find({ 
        owner: playerId, 
        originalTrainer: 'System' 
      });

      let totalShiny = 0;
      let totalIVs = 0;
      let totalPokemon = systemPokemon.length;

      for (const pokemon of systemPokemon) {
        if (pokemon.shiny) totalShiny++;
        if (pokemon.ivs) {
          const ivSum = Object.values(pokemon.ivs).reduce((sum: number, iv: any) => sum + iv, 0);
          totalIVs += ivSum;
        }
      }

      return {
        totalPokemonReceived: totalPokemon,
        shinyReceived: totalShiny,
        averageIVs: totalPokemon > 0 ? Math.round(totalIVs / (totalPokemon * 6)) : 0,
        rareReceived: 0, // TODO: calculer selon la rareté
        lastReceived: systemPokemon[0]?.caughtAt
      };

    } catch (error) {
      console.error('❌ [PokemonReward] Erreur stats distribution:', error);
      return {
        totalPokemonReceived: 0,
        shinyReceived: 0,
        averageIVs: 0,
        rareReceived: 0
      };
    }
  }
}
