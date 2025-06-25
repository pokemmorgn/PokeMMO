// server/src/managers/TeamManager.ts - Version avec utilitaires
import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import TeamQueries from "../utils/teamQueries";
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
  
  async load() {
    this.playerData = await PlayerData.findOne({ username: this.playerId });
    if (!this.playerData) {
      throw new Error(`Joueur ${this.playerId} introuvable`);
    }
    return this.getTeam();
  }

  async getTeam(): Promise<IOwnedPokemon[]> {
    return await TeamQueries.findByOwnerTeam(this.playerId);
  }

  async getTeamPokemon(slot: number): Promise<IOwnedPokemon | null> {
    return await TeamQueries.findTeamPokemonBySlot(this.playerId, slot);
  }

  async getFirstAlivePokemon(): Promise<IOwnedPokemon | null> {
    return await TeamQueries.findFirstAlivePokemon(this.playerId);
  }

  async getAllPokemon(): Promise<IOwnedPokemon[]> {
    return await TeamQueries.findAllByOwner(this.playerId);
  }

  // === GESTION DE L'ÉQUIPE ===

  async addToTeam(pokemonId: mongoose.Types.ObjectId): Promise<boolean> {
    if (!this.playerData) await this.load();
    
    const teamCount = await TeamQueries.countTeamPokemon(this.playerId);
    if (teamCount >= 6) {
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
    pokemon.slot = teamCount;
    pokemon.box = 0;
    pokemon.boxSlot = undefined;
    await pokemon.save();
    
    // Met à jour PlayerData
    if (!Array.isArray(this.playerData.team)) {
      this.playerData.team = [];
    }
    this.playerData.team.push(pokemonId);
    await this.playerData.save();
    
    return true;
  }

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
    pokemon.boxSlot = await TeamQueries.getNextBoxSlot(this.playerId, 0);
    await pokemon.save();
    
    // Met à jour PlayerData
    const teamIndex = this.playerData.team.findIndex((id: any) => id.equals(pokemonId));
    if (teamIndex !== -1) {
      this.playerData.team.splice(teamIndex, 1);
      await this.playerData.save();
    }
    
    // Réorganise les slots de l'équipe
    await TeamQueries.reorganizeTeamSlots(this.playerId, oldSlot);
    
    return true;
  }

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

  // Supprime les méthodes privées redondantes (maintenant dans TeamQueries)

  // === GESTION DE COMBAT ===

  async healTeam(): Promise<void> {
    await TeamQueries.healTeam(this.playerId);
  }

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

  async getTeamStats(): Promise<TeamStats> {
    return await TeamQueries.getTeamStats(this.playerId);
  }

  async canBattle(): Promise<boolean> {
    return await TeamQueries.canTeamBattle(this.playerId);
  }

  async getFastestAlivePokemon(): Promise<IOwnedPokemon | null> {
    return await TeamQueries.getFastestAlivePokemon(this.playerId);
  }

  async isTeamDefeated(): Promise<boolean> {
    return await TeamQueries.isTeamDefeated(this.playerId);
  }

  // === GESTION PC ===

  async getBoxPokemon(boxNumber: number = 0): Promise<IOwnedPokemon[]> {
    return await TeamQueries.findByOwnerBox(this.playerId, boxNumber);
  }

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
