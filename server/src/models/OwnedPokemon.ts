import mongoose from "mongoose";

const OwnedPokemonSchema = new mongoose.Schema({
  owner: { type: String, required: true }, // username, userId ou wallet
  pokemonId: { type: Number, required: true }, // id dex national (ex: 25)
  level: { type: Number, default: 1 },
  nature: { type: String, default: "Hardy" },
  ivs: { // <--- PAS de ? ici
    hp: { type: Number, default: 0 },
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    spAttack: { type: Number, default: 0 },
    spDefense: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
  },
  moves: [{ type: String }], // ex: ["tackle", "tail_whip"]
  nickname: { type: String },
  shiny: { type: Boolean, default: false },
  isInTeam: { type: Boolean, default: false },
  slot: { type: Number }, // 0-5 si dans la team
  box: { type: Number, default: 0 }, // numéro de boîte PC
  caughtAt: { type: Date, default: Date.now },
  gender: { type: String }, // Ajouté pour exemple ("male", "female", "unknown")
  // Ajoute ici tous les autres champs plus tard
});

export interface IOwnedPokemon {
  _id: any; // mongoose.Types.ObjectId si tu veux être strict
  owner: string;
  pokemonId: number;
  level: number;
  nature: string;
  ivs: {
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
  // Ajoute ici les autres champs à synchroniser
}

export const OwnedPokemon = mongoose.model("OwnedPokemon", OwnedPokemonSchema);
