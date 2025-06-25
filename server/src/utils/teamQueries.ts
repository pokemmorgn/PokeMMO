// server/src/utils/teamQueries.ts
import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";

/**
 * Utilitaires pour les requêtes d'équipe
 * Sépare la logique des méthodes statiques problématiques
 */

export class TeamQueries {
  /**
   * Récupère l'équipe d'un joueur (triée par slot)
   */
  static async findByOwnerTeam(owner: string): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.find({ 
      owner, 
      isInTeam: true 
    }).sort({ slot: 1 });
  }

  /**
   * Récupère les Pokémon d'une boîte PC (triés par slot)
   */
  static async findByOwnerBox(owner: string, boxNumber: number = 0): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.find({ 
      owner, 
      isInTeam: false, 
      box: boxNumber 
    }).sort({ boxSlot: 1 });
  }

  /**
   * Récupère un Pokémon spécifique de l'équipe par slot
   */
  static async findTeamPokemonBySlot(owner: string, slot: number): Promise<IOwnedPokemon | null> {
    if (slot < 0 || slot > 5) return null;
    return await OwnedPokemon.findOne({ 
      owner, 
      isInTeam: true, 
      slot 
    });
  }

  /**
   * Récupère le premier Pokémon vivant de l'équipe
   */
  static async findFirstAlivePokemon(owner: string): Promise<IOwnedPokemon | null> {
    const team = await this.findByOwnerTeam(owner);
    return team.find(pokemon => !pokemon.isFainted()) || null;
  }

  /**
   * Compte le nombre de Pokémon dans l'équipe
   */
  static async countTeamPokemon(owner: string): Promise<number> {
    return await OwnedPokemon.countDocuments({ 
      owner, 
      isInTeam: true 
    });
  }

  /**
   * Récupère tous les Pokémon possédés par un joueur
   */
  static async findAllByOwner(owner: string): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.find({ owner });
  }

  /**
   * Vérifie si l'équipe peut combattre
   */
  static async canTeamBattle(owner: string): Promise<boolean> {
    const team = await this.findByOwnerTeam(owner);
    return team.some(pokemon => pokemon.canBattle());
  }

  /**
   * Récupère les statistiques de l'équipe
   */
  static async getTeamStats(owner: string): Promise<{
    totalPokemon: number;
    alivePokemon: number;
    faintedPokemon: number;
    averageLevel: number;
    canBattle: boolean;
  }> {
    const team = await this.findByOwnerTeam(owner);
    
    const alivePokemon = team.filter(p => !p.isFainted()).length;
    const faintedPokemon = team.filter(p => p.isFainted()).length;
    const totalLevel = team.reduce((sum, p) => sum + p.level, 0);
    
    return {
      totalPokemon: team.length,
      alivePokemon,
      faintedPokemon,
      averageLevel: team.length > 0 ? totalLevel / team.length : 0,
      canBattle: alivePokemon > 0
    };
  }

  /**
   * Récupère le Pokémon le plus rapide encore vivant
   */
  static async getFastestAlivePokemon(owner: string): Promise<IOwnedPokemon | null> {
    const team = await this.findByOwnerTeam(owner);
    const alivePokemon = team.filter(p => !p.isFainted());
    
    if (alivePokemon.length === 0) return null;
    
    return alivePokemon.reduce((fastest, current) => 
      current.getEffectiveSpeed() > fastest.getEffectiveSpeed() ? current : fastest
    );
  }

  /**
   * Vérifie si l'équipe est complètement vaincue
   */
  static async isTeamDefeated(owner: string): Promise<boolean> {
    const team = await this.findByOwnerTeam(owner);
    return team.length > 0 && team.every(pokemon => pokemon.isFainted());
  }

  /**
   * Trouve le prochain slot libre dans une boîte PC
   */
  static async getNextBoxSlot(owner: string, boxNumber: number): Promise<number> {
    const boxPokemon = await this.findByOwnerBox(owner, boxNumber);
    
    // Trouve le premier slot libre (0-29)
    for (let i = 0; i < 30; i++) {
      if (!boxPokemon.find(p => p.boxSlot === i)) {
        return i;
      }
    }
    return boxPokemon.length; // Si aucun slot libre trouvé
  }

  /**
   * Réorganise les slots de l'équipe après suppression
   */
  static async reorganizeTeamSlots(owner: string, removedSlot: number): Promise<void> {
    const team = await OwnedPokemon.find({ 
      owner, 
      isInTeam: true,
      slot: { $gt: removedSlot }
    }).sort({ slot: 1 });
    
    for (const pokemon of team) {
      pokemon.slot = pokemon.slot! - 1;
      await pokemon.save();
    }
  }

  /**
   * Soigne tous les Pokémon de l'équipe
   */
  static async healTeam(owner: string): Promise<number> {
    const team = await this.findByOwnerTeam(owner);
    let healedCount = 0;
    
    for (const pokemon of team) {
      if (pokemon.currentHp < pokemon.maxHp || pokemon.status !== 'normal') {
        pokemon.heal();
        await pokemon.save();
        healedCount++;
      }
    }
    
    return healedCount;
  }
}

export default TeamQueries;
