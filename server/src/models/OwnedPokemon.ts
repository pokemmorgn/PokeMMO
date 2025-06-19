// src/models/OwnedPokemon.ts
import mongoose from "mongoose";

const OwnedPokemonSchema = new mongoose.Schema({
  owner: { type: String, required: true },
  pokemonId: { type: Number, required: true },
  level: { type: Number, default: 1 },
  nature: { type: String, default: "Hardy" },
  ivs: { // Plus d'optionnel, toujours présent avec des valeurs par défaut
    hp: { type: Number, default: 0 },
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    spAttack: { type: Number, default: 0 },
    spDefense: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  moves: [{ type: String }],
  nickname: { type: String },
  shiny: { type: Boolean, default: false },
  isInTeam: { type: Boolean, default: false },
  slot: { type: Number },
  box: { type: Number, default: 0 },
  caughtAt: { type: Date, default: Date.now },
  gender: { type: String },
});

export interface IOwnedPokemon {
  _id: any;
  owner: string;
  pokemonId: number;
  level: number;
  nature: string;
  ivs: { // Plus optionnel non plus
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  moves: string[];
  nickname?: string;
  shiny?: boolean;
  isInTeam?: boolean;
  slot?: number;
  box?: number;
  caughtAt?: Date;
  gender?: string;
}

export const OwnedPokemon = mongoose.model<IOwnedPokemon>("OwnedPokemon", OwnedPokemonSchema);
