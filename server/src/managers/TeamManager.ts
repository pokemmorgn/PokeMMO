// server/src/managers/TeamManager.ts - Version améliorée
import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import mongoose from "mongoose";

export interface TeamStats {
  totalPokemon: number;
  alivePokemon: number;
  faintedPokemon: number;
  averageLevel: number;
  canBattle: boolean;
}

export class TeamManager {
  playerId: string;
  playerData: any;
  
  constructor(playerId: string) {
    this.playerId = playerId;
    this.playerData = null;
  }

  // === CHARGEMENT ET DONNÉES DE BASE ===
  
  /**
   * Charge les données du joueur et son équipe
   */
  async load() {
    this.playerData = await PlayerData.findOne({ username: this.playerId });
    if (!this.playerData) {
      throw new Error(`Joueur ${this.playerId} introuvable`);
    }
    return this.getTeam();
  }

  /**
   * Récupère l'équipe active (avec tous les détails)
   */
  async getTeam(): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.findByOwnerTeam(this.playerId);
  }

  /**
   * Récupère un Pokémon spécifique de l'équipe par son slot
   */
  async getTeamPokemon(slot: number): Promise<IOwnedPokemon | null> {
    if (slot < 0 || slot > 5) return null;
    return await OwnedPokemon.findOne({ 
      owner: this.playerId, 
      isInTeam: true, 
      slot 
    });
  }

  /**
   * Récupère le premier Pokémon vivant de l'équipe
   */
  async getFirstAlivePokemon(): Promise<IOwnedPokemon | null> {
    const team = await this.getTeam();
    return team.find(pokemon => !pokemon.isFainted()) || null;
  }

  /**
   * Récupère tous les Pokémon possédés (équipe + PC)
   */
  async getAllPokemon(): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.find({ owner: this.playerId });
  }

  // === GESTION DE L'ÉQUIPE ===

  /**
   * Ajoute un Pokémon à l'équipe
   */
  async addToTeam(pokemonId: mongoose.Types.ObjectId): Promise<boolean> {
    if (!this.playerData) await this.load();
    
    const team = await this.getTeam();
    if (team.length >= 6) {
      throw new Error("Équipe complète (6 Pokémon maximum)");
    }
    
    const pokemon = await OwnedPokemon.findById(pokemonId);
    if (!pokemon || pokemon.owner !== this.playerId) {
      throw new Error("Pokémon introuvable ou n'appartient pas au joueur");
    }
    
    if (pokemon.isInTeam) {
      throw new Error("Ce Pokémon est déjà dans l'équipe");
    }
    
    // Met à jour le Pokémon
    pokemon.isInTeam = true;
    pokemon.slot = team.length;
    pokemon.box = undefined;
    pokemon.boxSlot = undefined;
    await pokemon.save();
    
    // Met à jour PlayerData
    if (!Array.isArray(this.playerData.team)) {
      this.playerData.team = [];
    }
    this.playerData.team.push(pokemonId as any);
    await this.playerData.save();
    
    return true;
  }

  /**
   * Retire un Pokémon de l'équipe
   */
  async removeFromTeam(pokemonId: mongoose.Types.ObjectId): Promise<boolean> {
    if (!this.playerData) await this.load();
    
    const pokemon = await OwnedPokemon.findById(pokemonId);
    if (!pokemon || pokemon.owner !== this.playerId || !pokemon.isInTeam) {
      return false;
    }
    
    const oldSlot = pokemon.slot!;
    
    // Met à jour le Pokémon (va au PC)
    pokemon.isInTeam = false;
    pokemon.slot = undefined;
    pokemon.box = 0;
    pokemon.boxSlot = await this.getNextBoxSlot(0);
    await pokemon.save();
    
    // Met à jour PlayerData
    const teamIndex = this.playerData.team.findIndex((id: any) => id.equals(pokemonId));
    if (teamIndex !== -1) {
      this.playerData.team.splice(teamIndex, 1);
      await this.playerData.save();
    }
    
    // Réorganise les slots de l'équipe
    await this.reorganizeTeamSlots(oldSlot);
    
    return true;
  }

  /**
   * Échange la position de deux Pokémon dans l'équipe
   */
  async swapTeamSlots(slotA: number, slotB: number): Promise<boolean> {
    if (slotA === slotB) return true;
    if (slotA < 0 || slotA > 5 || slotB < 0 || slotB > 5) {
      throw new Error("Slots invalides (0-5)");
    }
    
    const pokemonA = await this.getTeamPokemon(slotA);
    const pokemonB = await this.getTeamPokemon(slotB);
    
    if (!pokemonA && !pokemonB) return true;
    
    // Échange les slots
    if (pokemonA) {
      pokemonA.slot = slotB;
      await pokemonA.save();
    }
    if (pokemonB) {
      pokemonB.slot = slotA;
      await pokemonB.save();
    }
    
    return true;
  }

  /**
   * Réorganise les slots après suppression
   */
  private async reorganizeTeamSlots(removedSlot: number): Promise<void> {
    const team = await OwnedPokemon.find({ 
      owner: this.playerId, 
      isInTeam: true,
      slot: { $gt: removedSlot }
    }).sort({ slot: 1 });
    
    for (const pokemon of team) {
      pokemon.slot = pokemon.slot! - 1;
      await pokemon.save();
    }
  }

  /**
   * Trouve le prochain slot libre dans une boîte PC
   */
  private async getNextBoxSlot(boxNumber: number): Promise<number> {
    const boxPokemon = await OwnedPokemon.find({ 
      owner: this.playerId, 
      box: boxNumber,
      isInTeam: false
    }).sort({ boxSlot: 1 });
    
    // Trouve le premier slot libre
    for (let i = 0; i < 30; i++) { // 30 slots par boîte
      if (!boxPokemon.find(p => p.boxSlot === i)) {
        return i;
      }
    }
    return boxPokemon.length; // Si aucun slot libre trouvé
  }

  // === GESTION DE COMBAT ===

  /**
   * Soigne tous les Pokémon de l'équipe
   */
  async healTeam(): Promise<void> {
    const team = await this.getTeam();
    
    for (const pokemon of team) {
      pokemon.heal(); // Soigne complètement
      await pokemon.save();
    }
  }

  /**
   * Soigne un Pokémon spécifique
   */
  async healPokemon(pokemonId: mongoose.Types.ObjectId, amount?: number): Promise<boolean> {
    const pokemon = await OwnedPokemon.findOne({
      _id: pokemonId,
      owner: this.playerId,
      isInTeam: true
    });
    
    if (!pokemon) return false;
    
    pokemon.heal(amount);
    await pokemon.save();
    return true;
  }

  /**
   * Applique des dégâts à un Pokémon
   */
  async damagePokemon(pokemonId: mongoose.Types.ObjectId, damage: number): Promise<boolean> {
    const pokemon = await OwnedPokemon.findOne({
      _id: pokemonId,
      owner: this.playerId,
      isInTeam: true
    });
    
    if (!pokemon) return false;
    
    const isFainted = pokemon.takeDamage(damage);
    await pokemon.save();
    
    return isFainted;
  }

  /**
   * Applique un statut à un Pokémon
   */
  async applyStatusToPokemon(
    pokemonId: mongoose.Types.ObjectId, 
    status: string, 
    turns?: number
  ): Promise<boolean> {
    const pokemon = await OwnedPokemon.findOne({
      _id: pokemonId,
      owner: this.playerId,
      isInTeam: true
    });
    
    if (!pokemon) return false;
    
    const applied = pokemon.applyStatus(status, turns);
    if (applied) {
      await pokemon.save();
    }
    
    return applied;
  }

  /**
   * Utilise une attaque (diminue les PP)
   */
  async useMove(pokemonId: mongoose.Types.ObjectId, moveId: string): Promise<boolean> {
    const pokemon = await OwnedPokemon.findOne({
      _id: pokemonId,
      owner: this.playerId,
      isInTeam: true
    });
    
    if (!pokemon) return false;
    
    const move = pokemon.moves.find(m => m.moveId === moveId);
    if (!move || move.currentPp <= 0) return false;
    
    move.currentPp -= 1;
    await pokemon.save();
    
    return true;
  }

  // === STATISTIQUES ET ÉTAT ===

  /**
   * Récupère les statistiques de l'équipe
   */
  async getTeamStats(): Promise<TeamStats> {
    const team = await this.getTeam();
    
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
   * Vérifie si l'équipe peut combattre
   */
  async canBattle(): Promise<boolean> {
    const team = await this.getTeam();
    return team.some(pokemon => pokemon.canBattle());
  }

  /**
   * Récupère le Pokémon le plus rapide encore vivant
   */
  async getFastestAlivePokemon(): Promise<IOwnedPokemon | null> {
    const team = await this.getTeam();
    const alivePokemon = team.filter(p => !p.isFainted());
    
    if (alivePokemon.length === 0) return null;
    
    return alivePokemon.reduce((fastest, current) => 
      current.getEffectiveSpeed() > fastest.getEffectiveSpeed() ? current : fastest
    );
  }

  /**
   * Vérifie si l'équipe est complètement vaincue
   */
  async isTeamDefeated(): Promise<boolean> {
    const team = await this.getTeam();
    return team.length > 0 && team.every(pokemon => pokemon.isFainted());
  }

  // === GESTION PC ===

  /**
   * Récupère les Pokémon d'une boîte PC
   */
  async getBoxPokemon(boxNumber: number = 0): Promise<IOwnedPokemon[]> {
    return await OwnedPokemon.findByOwnerBox(this.playerId, boxNumber);
  }

  /**
   * Transfère un Pokémon entre équipe et PC
   */
  async transferPokemon(
    pokemonId: mongoose.Types.ObjectId, 
    toTeam: boolean
  ): Promise<boolean> {
    if (toTeam) {
      return await this.addToTeam(pokemonId);
    } else {
      return await this.removeFromTeam(pokemonId);
    }
  }
}

export default TeamManager;
