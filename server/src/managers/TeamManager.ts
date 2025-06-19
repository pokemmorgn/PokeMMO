import { OwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import mongoose from "mongoose";

export class TeamManager {
  playerId: string; // username ou wallet
  playerData: any;

  constructor(playerId: string) {
    this.playerId = playerId;
    this.playerData = null;
  }

  // Charge la PlayerData et la team associée
  async load() {
    this.playerData = await PlayerData.findOne({ username: this.playerId }).populate("team");
    return this.playerData.team || [];
  }

  // Ajoute un OwnedPokemon à la team si slot libre (<6)
  async addToTeam(pokemonId: mongoose.Types.ObjectId) {
    if (!this.playerData) await this.load();
    if (this.playerData.team.length >= 6) throw new Error("Team full");
    this.playerData.team.push(pokemonId);
    await this.playerData.save();
    await OwnedPokemon.findByIdAndUpdate(pokemonId, { isInTeam: true, slot: this.playerData.team.length - 1 });
  }

  // Retire un Pokémon de la team (par index ou id)
  async removeFromTeam(pokemonId: mongoose.Types.ObjectId) {
    if (!this.playerData) await this.load();
    const idx = this.playerData.team.findIndex((id: any) => id.equals(pokemonId));
    if (idx === -1) return false;
    this.playerData.team.splice(idx, 1);
    await this.playerData.save();
    await OwnedPokemon.findByIdAndUpdate(pokemonId, { isInTeam: false, slot: null });
    return true;
  }

  // Change l'ordre (swap) de deux slots
  async swapTeamSlots(indexA: number, indexB: number) {
    if (!this.playerData) await this.load();
    if (
      indexA < 0 || indexA >= this.playerData.team.length ||
      indexB < 0 || indexB >= this.playerData.team.length
    ) throw new Error("Invalid slot index");
    [this.playerData.team[indexA], this.playerData.team[indexB]] = [this.playerData.team[indexB], this.playerData.team[indexA]];
    await this.playerData.save();
    // Met à jour les slots dans OwnedPokemon
    await OwnedPokemon.findByIdAndUpdate(this.playerData.team[indexA], { slot: indexA });
    await OwnedPokemon.findByIdAndUpdate(this.playerData.team[indexB], { slot: indexB });
  }

  // Récupère l'équipe active complète (avec détails)
  async getTeamFull() {
    if (!this.playerData) await this.load();
    // Renvoie les détails des OwnedPokemon en team (avec level/moves, etc)
    return await OwnedPokemon.find({ _id: { $in: this.playerData.team } });
  }
}
