// src/rooms/BattleRoom.ts - Exemple d'intégration dans Colyseus

import { Room, Client } from "colyseus";
import { CaptureManager, CaptureAttempt, CaptureResult } from "../managers/CaptureManager";
import { PokemonManager } from "../managers/PokemonManager";

export class BattleRoom extends Room {
  
  /**
   * Gère une tentative de capture de Pokémon
   */
  onMessage(client: Client, type: string, message: any) {
    if (type === "capture_attempt") {
      this.handleCaptureAttempt(client, message);
    }
  }

  private async handleCaptureAttempt(client: Client, data: any) {
    try {
      const { pokemonId, ballType, currentHp, maxHp, statusCondition, level, location } = data;
      
      // Récupération des données Pokémon
      const pokemonData = await PokemonManager.getPokemonById(pokemonId);
      if (!pokemonData) {
        client.send("capture_error", { message: "Pokémon introuvable" });
        return;
      }

      // Préparation de la tentative de capture
      const captureAttempt: CaptureAttempt = {
        pokemonId,
        pokemonLevel: level,
        currentHp,
        maxHp,
        statusCondition: statusCondition || "normal",
        ballType,
        location
      };

      // Calcul et simulation de la capture
      const captureResult: CaptureResult = CaptureManager.calculateCaptureRate(
        captureAttempt, 
        pokemonData
      );

      // Envoi du résultat au client avec animation
      client.send("capture_result", {
        success: captureResult.success,
        pokemonName: pokemonData.name,
        ballUsed: captureResult.ballUsed,
        shakeCount: captureResult.shakeCount,
        captureRate: Math.round(captureResult.finalProbability * 100) / 100,
        criticalCapture: captureResult.criticalCapture
      });

      // Si capture réussie, ajouter à l'équipe du joueur
      if (captureResult.success) {
        await this.addPokemonToPlayer(client, pokemonData, level);
        
        // Log pour statistiques
        console.log(`${client.userData.username} a capturé ${pokemonData.name} (${captureResult.finalProbability.toFixed(1)}% de chance)`);
      }

    } catch (error) {
      console.error("Erreur lors de la capture:", error);
      client.send("capture_error", { message: "Erreur lors de la capture" });
    }
  }

  /**
   * Recommande les meilleures balls pour un Pokémon
   */
  private handleBallRecommendation(client: Client, data: any) {
    const { pokemonId, location } = data;
    
    PokemonManager.getPokemonById(pokemonId).then(pokemonData => {
      if (pokemonData) {
        const recommendedBalls = CaptureManager.getRecommendedBalls(pokemonData, location);
        
        client.send("ball_recommendations", {
          pokemonName: pokemonData.name,
          recommendedBalls,
          location
        });
      }
    });
  }

  /**
   * Ajoute un Pokémon capturé à l'équipe du joueur
   */
  private async addPokemonToPlayer(client: Client, pokemonData: any, level: number) {
    // Génération des IVs aléatoirement (0-31)
    const ivs = {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      specialAttack: Math.floor(Math.random() * 32),
      specialDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };

    // Génération d'une nature aléatoire
    const natures = ["Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish", "Lax"];
    const nature = natures[Math.floor(Math.random() * natures.length)];

    // Calcul des stats finales
    const finalStats = this.calculateFinalStats(pokemonData.baseStats, ivs, level, nature);

    const capturedPokemon = {
      id: pokemonData.id,
      name: pokemonData.name,
      level,
      experience: this.calculateExperienceForLevel(level, pokemonData.growthRate),
      ivs,
      nature,
      stats: finalStats,
      moves: this.generateMovesetForLevel(pokemonData.learnset, level),
      ability: pokemonData.abilities[0], // Première capacité par défaut
      originalTrainer: client.userData.username,
      captureDate: new Date().toISOString(),
      captureLocation: client.userData.currentLocation,
      happiness: pokemonData.baseHappiness || 70
    };

    // Ajout à la base de données du joueur
    // await PlayerManager.addPokemonToTeam(client.userData.id, capturedPokemon);
    
    client.send("pokemon_captured", { pokemon: capturedPokemon });
  }

  /**
   * Calcule les stats finales d'un Pokémon
   */
  private calculateFinalStats(baseStats: any, ivs: any, level: number, nature: string): any {
    // Formule authentique Pokémon pour les stats
    const hp = Math.floor(((baseStats.hp * 2 + ivs.hp) * level) / 100) + level + 10;
    const attack = Math.floor(((baseStats.attack * 2 + ivs.attack) * level) / 100) + 5;
    const defense = Math.floor(((baseStats.defense * 2 + ivs.defense) * level) / 100) + 5;
    const specialAttack = Math.floor(((baseStats.specialAttack * 2 + ivs.specialAttack) * level) / 100) + 5;
    const specialDefense = Math.floor(((baseStats.specialDefense * 2 + ivs.specialDefense) * level) / 100) + 5;
    const speed = Math.floor(((baseStats.speed * 2 + ivs.speed) * level) / 100) + 5;

    // Application des modificateurs de nature (simplifié)
    return {
      hp,
      attack: this.applyNatureModifier(attack, nature, "attack"),
      defense: this.applyNatureModifier(defense, nature, "defense"),
      specialAttack: this.applyNatureModifier(specialAttack, nature, "specialAttack"),
      specialDefense: this.applyNatureModifier(specialDefense, nature, "specialDefense"),
      speed: this.applyNatureModifier(speed, nature, "speed")
    };
  }

  private applyNatureModifier(stat: number, nature: string, statName: string): number {
    // Table des natures simplifiée
    const natureEffects: { [key: string]: { increase?: string, decrease?: string } } = {
      "Adamant": { increase: "attack", decrease: "specialAttack" },
      "Brave": { increase: "attack", decrease: "speed" },
      "Bold": { increase: "defense", decrease: "attack" },
      "Impish": { increase: "defense", decrease: "specialAttack" }
      // ... autres natures
    };

    const effect = natureEffects[nature];
    if (!effect) return stat; // Nature neutre

    if (effect.increase === statName) return Math.floor(stat * 1.1);
    if (effect.decrease === statName) return Math.floor(stat * 0.9);
    return stat;
  }

  private calculateExperienceForLevel(level: number, growthRate: string): number {
    // Formules authentiques d'expérience selon le taux de croissance
    switch (growthRate) {
      case "Fast":
        return Math.floor((4 * Math.pow(level, 3)) / 5);
      case "Medium Fast":
        return Math.pow(level, 3);
      case "Medium Slow":
        return Math.floor((6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140);
      case "Slow":
        return Math.floor((5 * Math.pow(level, 3)) / 4);
      default:
        return Math.pow(level, 3);
    }
  }

  private generateMovesetForLevel(learnset: any[], level: number): string[] {
    const availableMoves = learnset
      .filter(move => move.level <= level)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4) // Maximum 4 attaques
      .map(move => move.moveId);

    return availableMoves;
  }
}

// Types pour le client
interface CaptureAttemptMessage {
  pokemonId: number;
  ballType: string;
  currentHp: number;
  maxHp: number;
  statusCondition?: string;
  level: number;
  location: string;
}

interface CaptureResultMessage {
  success: boolean;
  pokemonName: string;
  ballUsed: string;
  shakeCount: number;
  captureRate: number;
  criticalCapture?: boolean;
}
