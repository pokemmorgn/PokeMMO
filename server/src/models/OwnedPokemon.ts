import mongoose from "mongoose";

const OwnedPokemonSchema = new mongoose.Schema({
  owner: { type: String, required: true }, // username, userId ou wallet
  pokemonId: { type: Number, required: true }, // id dex national (ex: 25)
  level: { type: Number, default: 1 },
  nature: { type: String, default: "Hardy" },
  ivs: {
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
  // Tu ajoutes des champs plus tard si besoin
});

export const OwnedPokemon = mongoose.model("OwnedPokemon", OwnedPokemonSchema);
