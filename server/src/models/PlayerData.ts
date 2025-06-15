import mongoose from "mongoose";

const PlayerDataSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  gold: { type: Number, default: 0 },
  pokemons: [{ type: String }],        // Liste des Pokémon attrapés
  lastX: { type: Number, default: 300 }, // Position X sauvegardée
  lastY: { type: Number, default: 300 }, // Position Y sauvegardée
  lastMap: { type: String, default: "Beach" } // <-- Ajout du champ pour la map
});

export const PlayerData = mongoose.model("PlayerData", PlayerDataSchema);
