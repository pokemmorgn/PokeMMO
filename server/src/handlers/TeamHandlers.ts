// server/src/handlers/TeamHandlers.ts
import { Client } from "@colyseus/core";
import mongoose from "mongoose";
import { TeamManager } from "../managers/TeamManager";
import { WorldRoom } from "../rooms/WorldRoom";

/**
 * Gestionnaire centralisé pour tous les handlers d'équipe
 * Sépare la logique d'équipe du WorldRoom principal
 */
export class TeamHandlers {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
  }

  /**
   * Configure tous les handlers d'équipe sur la room
   */
  setupHandlers(): void {
    console.log(`⚔️ [TeamHandlers] Configuration des handlers d'équipe...`);

    // === HANDLERS DE RÉCUPÉRATION ===
    this.room.onMessage("getTeam", this.handleGetTeam.bind(this));
    this.room.onMessage("getTeamStats", this.handleGetTeamStats.bind(this));
    this.room.onMessage("getTeamStatsExtended", this.handleGetTeamStatsExtended.bind(this));
    this.room.onMessage("getTeamPokemon", this.handleGetTeamPokemon.bind(this));
    this.room.onMessage("getTeamHistory", this.handleGetTeamHistory.bind(this));

    // === HANDLERS DE GESTION ===
    this.room.onMessage("addToTeam", this.handleAddToTeam.bind(this));
    this.room.onMessage("removeFromTeam", this.handleRemoveFromTeam.bind(this));
    this.room.onMessage("swapTeamSlots", this.handleSwapTeamSlots.bind(this));
    this.room.onMessage("reorganizeTeam", this.handleReorganizeTeam.bind(this));

    // === HANDLERS DE SOIN ===
    this.room.onMessage("healTeam", this.handleHealTeam.bind(this));
    this.room.onMessage("healPokemon", this.handleHealPokemon.bind(this));

    // === HANDLERS DE VÉRIFICATION ===
    this.room.onMessage("checkTeamCanBattle", this.handleCheckTeamCanBattle.bind(this));

    console.log(`✅ [TeamHandlers] Tous les handlers d'équipe configurés`);
  }

  // ================================================================================================
  // HANDLERS DE RÉCUPÉRATION
  // ================================================================================================

  /**
   * Récupère l'équipe complète du joueur
   */
  private async handleGetTeam(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`⚔️ [TeamHandlers] Récupération équipe pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const team = await teamManager.getTeam();
      const stats = await teamManager.getTeamStats();
      
      // Enrichir les données de l'équipe
      const enrichedTeam = team.map(pokemon => ({
        ...pokemon.toObject(),
        canBattle: pokemon.currentHp > 0,
        hpPercentage: pokemon.maxHp > 0 ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0,
        isHealthy: pokemon.status === 'normal' && pokemon.currentHp > 0,
        statusIcon: this.getStatusIcon(pokemon.status),
        powerLevel: this.calculatePokemonPower(pokemon)
      }));
      
      client.send("teamData", {
        success: true,
        team: enrichedTeam,
        stats: stats,
        canBattle: stats.canBattle,
        timestamp: Date.now()
      });
      
      console.log(`✅ [TeamHandlers] Équipe envoyée à ${player.name}: ${team.length} Pokémon`);
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur getTeam:", error);
      client.send("teamActionResult", {
        success: false,
        message: "Erreur lors de la récupération de l'équipe"
      });
    }
  }

  /**
   * Récupère les statistiques de base de l'équipe
   */
  private async handleGetTeamStats(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamStats", {
          totalPokemon: 0,
          alivePokemon: 0,
          faintedPokemon: 0,
          averageLevel: 0,
          canBattle: false
        });
        return;
      }

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const stats = await teamManager.getTeamStats();
      
      client.send("teamStats", {
        ...stats,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur getTeamStats:", error);
      client.send("teamStats", {
        totalPokemon: 0,
        alivePokemon: 0,
        faintedPokemon: 0,
        averageLevel: 0,
        canBattle: false,
        error: true
      });
    }
  }

  /**
   * Récupère les statistiques étendues de l'équipe
   */
  private async handleGetTeamStatsExtended(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamStatsExtended", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const team = await teamManager.getTeam();
      const stats = await teamManager.getTeamStats();
      
      // Calculs étendus
      const analysis = this.analyzeTeam(team);
      
      client.send("teamStatsExtended", {
        success: true,
        basicStats: stats,
        typeDistribution: analysis.typeDistribution,
        levelDistribution: analysis.levelDistribution,
        averageStats: analysis.averageStats,
        teamPower: analysis.teamPower,
        recommendations: analysis.recommendations,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur getTeamStatsExtended:", error);
      client.send("teamStatsExtended", {
        success: false,
        message: "Erreur lors du calcul des statistiques étendues"
      });
    }
  }

  /**
   * Récupère un Pokémon spécifique de l'équipe
   */
  private async handleGetTeamPokemon(client: Client, data: { slot: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamPokemonResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      if (!this.isValidSlot(data.slot)) {
        client.send("teamPokemonResult", {
          success: false,
          message: "Numéro de slot invalide (0-5)"
        });
        return;
      }

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const pokemon = await teamManager.getTeamPokemon(data.slot);
      
      if (pokemon) {
        client.send("teamPokemonResult", {
          success: true,
          pokemon: {
            ...pokemon.toObject(),
            canBattle: pokemon.currentHp > 0,
            hpPercentage: pokemon.maxHp > 0 ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0,
            powerLevel: this.calculatePokemonPower(pokemon)
          }
        });
      } else {
        client.send("teamPokemonResult", {
          success: false,
          message: `Aucun Pokémon au slot ${data.slot}`
        });
      }
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur getTeamPokemon:", error);
      client.send("teamPokemonResult", {
        success: false,
        message: "Erreur lors de la récupération du Pokémon"
      });
    }
  }

  /**
   * Récupère l'historique des changements d'équipe
   */
  private async handleGetTeamHistory(client: Client, data: { limit?: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamHistoryResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      // TODO: Implémenter un vrai système d'historique
      const mockHistory = [
        {
          action: "added",
          pokemonName: "Pikachu",
          timestamp: Date.now() - 3600000,
          details: "Ajouté à l'équipe"
        },
        {
          action: "healed",
          pokemonName: "Charizard", 
          timestamp: Date.now() - 1800000,
          details: "Soigné au Centre Pokémon"
        }
      ];
      
      client.send("teamHistoryResult", {
        success: true,
        history: mockHistory.slice(0, data.limit || 10)
      });
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur getTeamHistory:", error);
      client.send("teamHistoryResult", {
        success: false,
        message: "Erreur lors de la récupération de l'historique"
      });
    }
  }

  // ================================================================================================
  // HANDLERS DE GESTION
  // ================================================================================================

  /**
   * Ajoute un Pokémon à l'équipe
   */
  private async handleAddToTeam(client: Client, data: { pokemonId: string }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`➕ [TeamHandlers] Ajout Pokémon ${data.pokemonId} pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      // Vérifier si l'équipe n'est pas pleine
      const team = await teamManager.getTeam();
      if (team.length >= 6) {
        client.send("teamActionResult", {
          success: false,
          message: "Équipe complète (6 Pokémon maximum)"
        });
        return;
      }
      
      const pokemonObjectId = new mongoose.Types.ObjectId(data.pokemonId);
      const success = await teamManager.addToTeam(pokemonObjectId);
      
      if (success) {
        client.send("pokemonAddedToTeam", {
          pokemonId: data.pokemonId,
          slot: team.length // Nouveau slot
        });
        
        // Renvoyer l'équipe mise à jour
        const updatedTeam = await teamManager.getTeam();
        const stats = await teamManager.getTeamStats();
        
        client.send("teamData", {
          success: true,
          team: updatedTeam,
          stats: stats
        });
        
        client.send("teamActionResult", {
          success: true,
          message: "Pokémon ajouté à l'équipe !"
        });
      } else {
        client.send("teamActionResult", {
          success: false,
          message: "Impossible d'ajouter ce Pokémon à l'équipe"
        });
      }
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur addToTeam:", error);
      client.send("teamActionResult", {
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors de l'ajout"
      });
    }
  }

  /**
   * Retire un Pokémon de l'équipe
   */
  private async handleRemoveFromTeam(client: Client, data: { pokemonId: string }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`📦 [TeamHandlers] Retrait Pokémon ${data.pokemonId} pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const pokemonObjectId = new mongoose.Types.ObjectId(data.pokemonId);
      const success = await teamManager.removeFromTeam(pokemonObjectId);
      
      if (success) {
        client.send("pokemonRemovedFromTeam", {
          pokemonId: data.pokemonId
        });
        
        // Renvoyer l'équipe mise à jour
        const team = await teamManager.getTeam();
        const stats = await teamManager.getTeamStats();
        
        client.send("teamData", {
          success: true,
          team: team,
          stats: stats
        });
        
        client.send("teamActionResult", {
          success: true,
          message: "Pokémon envoyé au PC !"
        });
      } else {
        client.send("teamActionResult", {
          success: false,
          message: "Pokémon non trouvé dans l'équipe"
        });
      }
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur removeFromTeam:", error);
      client.send("teamActionResult", {
        success: false,
        message: "Erreur lors du retrait"
      });
    }
  }

  /**
   * Échange deux Pokémon de place dans l'équipe
   */
  private async handleSwapTeamSlots(client: Client, data: { slotA: number, slotB: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      if (!this.isValidSlot(data.slotA) || !this.isValidSlot(data.slotB)) {
        client.send("teamActionResult", {
          success: false,
          message: "Numéros de slot invalides (0-5)"
        });
        return;
      }

      console.log(`🔄 [TeamHandlers] Échange slots ${data.slotA} <-> ${data.slotB} pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const success = await teamManager.swapTeamSlots(data.slotA, data.slotB);
      
      if (success) {
        // Renvoyer l'équipe mise à jour
        const team = await teamManager.getTeam();
        const stats = await teamManager.getTeamStats();
        
        client.send("teamData", {
          success: true,
          team: team,
          stats: stats
        });
        
        client.send("teamActionResult", {
          success: true,
          message: "Pokémon échangés !"
        });
      } else {
        client.send("teamActionResult", {
          success: false,
          message: "Impossible d'échanger ces Pokémon"
        });
      }
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur swapTeamSlots:", error);
      client.send("teamActionResult", {
        success: false,
        message: "Erreur lors de l'échange"
      });
    }
  }

  /**
   * Réorganise automatiquement l'équipe selon une stratégie
   */
  private async handleReorganizeTeam(client: Client, data: { 
    strategy: 'level' | 'type' | 'hp' | 'custom', 
    customOrder?: number[] 
  }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`🔄 [TeamHandlers] Réorganisation équipe (${data.strategy}) pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const team = await teamManager.getTeam();
      if (team.length === 0) {
        client.send("teamActionResult", {
          success: false,
          message: "Aucun Pokémon dans l'équipe"
        });
        return;
      }
      
      // Appliquer la stratégie de réorganisation
      const newOrder = this.calculateNewOrder(team, data.strategy, data.customOrder);
      
      // Appliquer les échanges
      for (let i = 0; i < newOrder.length; i++) {
        const targetSlot = newOrder[i];
        if (targetSlot !== i) {
          await teamManager.swapTeamSlots(i, targetSlot);
        }
      }
      
      // Renvoyer l'équipe réorganisée
      const reorganizedTeam = await teamManager.getTeam();
      const stats = await teamManager.getTeamStats();
      
      client.send("teamData", {
        success: true,
        team: reorganizedTeam,
        stats: stats
      });
      
      client.send("teamActionResult", {
        success: true,
        message: `Équipe réorganisée par ${data.strategy}`
      });
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur reorganizeTeam:", error);
      client.send("teamActionResult", {
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors de la réorganisation"
      });
    }
  }

  // ================================================================================================
  // HANDLERS DE SOIN
  // ================================================================================================

  /**
   * Soigne toute l'équipe
   */
  private async handleHealTeam(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`💊 [TeamHandlers] Soin de l'équipe pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      await teamManager.healTeam();
      
      client.send("teamHealed", {
        success: true,
        message: "Équipe soignée avec succès !"
      });
      
      // Renvoyer l'équipe mise à jour
      const team = await teamManager.getTeam();
      const stats = await teamManager.getTeamStats();
      
      client.send("teamData", {
        success: true,
        team: team,
        stats: stats
      });
      
      console.log(`✅ [TeamHandlers] Équipe de ${player.name} soignée`);
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur healTeam:", error);
      client.send("teamActionResult", {
        success: false,
        message: "Erreur lors du soin de l'équipe"
      });
    }
  }

  /**
   * Soigne un Pokémon spécifique
   */
  private async handleHealPokemon(client: Client, data: { pokemonId: string, amount?: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`💊 [TeamHandlers] Soin Pokémon ${data.pokemonId} pour ${player.name}`);
      
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const pokemonObjectId = new mongoose.Types.ObjectId(data.pokemonId);
      const success = await teamManager.healPokemon(pokemonObjectId, data.amount);
      
      if (success) {
        client.send("pokemonUpdated", {
          pokemonId: data.pokemonId,
          updates: { healed: true }
        });
        
        client.send("teamActionResult", {
          success: true,
          message: "Pokémon soigné !"
        });
      } else {
        client.send("teamActionResult", {
          success: false,
          message: "Pokémon non trouvé dans l'équipe"
        });
      }
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur healPokemon:", error);
      client.send("teamActionResult", {
        success: false,
        message: "Erreur lors du soin du Pokémon"
      });
    }
  }

  // ================================================================================================
  // HANDLERS DE VÉRIFICATION
  // ================================================================================================

  /**
   * Vérifie si l'équipe peut combattre
   */
  private async handleCheckTeamCanBattle(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("teamBattleCheck", { 
          canBattle: false, 
          reason: "Joueur non trouvé" 
        });
        return;
      }

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const canBattle = await teamManager.canBattle();
      const stats = await teamManager.getTeamStats();
      
      client.send("teamBattleCheck", {
        canBattle: canBattle,
        alivePokemon: stats.alivePokemon,
        totalPokemon: stats.totalPokemon,
        reason: canBattle ? "Équipe prête au combat" : "Aucun Pokémon en état de combattre"
      });
      
    } catch (error) {
      console.error("❌ [TeamHandlers] Erreur checkTeamCanBattle:", error);
      client.send("teamBattleCheck", { 
        canBattle: false, 
        reason: "Erreur serveur" 
      });
    }
  }

  // ================================================================================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ================================================================================================

  /**
   * Valide un numéro de slot
   */
  private isValidSlot(slot: number): boolean {
    return Number.isInteger(slot) && slot >= 0 && slot <= 5;
  }

  /**
   * Calcule la puissance d'un Pokémon
   */
  private calculatePokemonPower(pokemon: any): number {
    if (!pokemon || !pokemon.calculatedStats) return 0;
    
    const stats = pokemon.calculatedStats;
    return Math.round(
      (stats.attack + stats.spAttack + stats.defense + stats.spDefense + stats.speed) * 
      (pokemon.level / 100)
    );
  }

  /**
   * Retourne l'icône de statut appropriée
   */
  private getStatusIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'normal': '🟢',
      'poison': '🟣',
      'burn': '🔥',
      'freeze': '🧊',
      'paralysis': '⚡',
      'sleep': '💤'
    };
    return statusIcons[status] || '❓';
  }

  /**
   * Analyse complète de l'équipe
   */
  private analyzeTeam(team: any[]): any {
    const typeDistribution: { [key: string]: number } = {};
    const levelDistribution = { low: 0, medium: 0, high: 0 };
    let totalStats: { [key: string]: number } = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    
    team.forEach(pokemon => {
      // Distribution des types
      if (pokemon.types) {
        pokemon.types.forEach((type: string) => {
          typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
      }
      
      // Distribution des niveaux
      if (pokemon.level <= 30) levelDistribution.low++;
      else if (pokemon.level <= 60) levelDistribution.medium++;
      else levelDistribution.high++;
      
      // Somme des stats
      if (pokemon.calculatedStats) {
        Object.keys(totalStats).forEach(stat => {
          totalStats[stat] += (pokemon.calculatedStats as any)[stat] || 0;
        });
      }
    });
    
    // Calcul des moyennes
    const avgStats: { [key: string]: number } = {};
    Object.keys(totalStats).forEach(stat => {
      avgStats[stat] = team.length > 0 ? Math.round(totalStats[stat] / team.length) : 0;
    });
    
    const teamPower = Object.values(avgStats).reduce((sum: number, stat: unknown) => sum + (stat as number), 0);
    
    // Générer des recommandations
    const recommendations = this.generateTeamRecommendations(team, typeDistribution, levelDistribution);
    
    return {
      typeDistribution,
      levelDistribution,
      averageStats: avgStats,
      teamPower,
      recommendations
    };
  }

  /**
   * Génère des recommandations pour l'équipe
   */
  private generateTeamRecommendations(team: any[], typeDistribution: { [key: string]: number }, levelDistribution: any): string[] {
    const recommendations: string[] = [];
    
    if (team.length < 6) {
      recommendations.push(`Ajoutez ${6 - team.length} Pokémon de plus à votre équipe`);
    }
    
    if (levelDistribution.low > 3) {
      recommendations.push("Entraînez vos Pokémon de bas niveau");
    }
    
    const uniqueTypes = Object.keys(typeDistribution).length;
    if (uniqueTypes < 3) {
      recommendations.push("Diversifiez les types de votre équipe");
    }
    
    return recommendations;
  }

  /**
   * Calcule le nouvel ordre pour la réorganisation
   */
  private calculateNewOrder(team: any[], strategy: string, customOrder?: number[]): number[] {
    switch (strategy) {
      case 'level':
        const levelSorted = team
          .map((pokemon, index) => ({ pokemon, originalIndex: index }))
          .sort((a, b) => b.pokemon.level - a.pokemon.level);
        return levelSorted.map(item => item.originalIndex);
        
      case 'hp':
        const hpSorted = team
          .map((pokemon, index) => ({ pokemon, originalIndex: index }))
          .sort((a, b) => {
            const aHp = a.pokemon.currentHp / a.pokemon.maxHp;
            const bHp = b.pokemon.currentHp / b.pokemon.maxHp;
            return bHp - aHp;
          });
        return hpSorted.map(item => item.originalIndex);
        
      case 'custom':
        if (customOrder && customOrder.length === team.length) {
          return customOrder;
        } else {
          throw new Error("Ordre personnalisé invalide");
        }
        
      default:
        throw new Error("Stratégie de réorganisation inconnue");
    }
  }
}

export default TeamHandlers;
