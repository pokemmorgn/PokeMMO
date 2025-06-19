import mongoose from "mongoose";

const PlayerDataSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  gold: { type: Number, default: 0 },
  pokemons: [{ type: String }],        // (optionnel - legacy, à migrer)
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: "OwnedPokemon" }], // <-- Ajouté ici !
  lastX: { type: Number, default: 300 },
  lastY: { type: Number, default: 300 },
  lastMap: { type: String, default: "Beach" },
  walletAddress: { type: String, unique: true, sparse: true }
});

export const PlayerData = mongoose.model("PlayerData", PlayerDataSchema);
