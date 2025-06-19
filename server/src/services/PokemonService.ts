import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import mongoose from "mongoose";

/**
 * Ajoute un Pokémon au joueur, et l’ajoute à sa team si demandé.
 * @param username        - Le nom du joueur
 * @param pokemonProps    - Les propriétés du Pokémon à créer (pokemonId, moves, ivs, etc.)
 * @param inTeam          - true = dans la team (slot libre), false = PC
 * @returns Promise<OwnedPokemon>
 */
export async function givePokemonToPlayer(
  username: string,
  pokemonProps: Partial<Omit<IOwnedPokemon, "_id" | "owner">>,
  inTeam = false
): Promise<IOwnedPokemon> {
  // Récupère le PlayerData (doit exister)
  let playerData = await PlayerData.findOne({ username });
  if (!playerData) throw new Error("Player not found");

  // Crée le Pokémon
  const poke = await OwnedPokemon.create({
    ...pokemonProps,
    owner: username,
    isInTeam: inTeam,
    // Slot géré plus loin si team
  });

  // Si inTeam, ajoute au tableau team (max 6)
  if (inTeam) {
    if (!Array.isArray(playerData.team)) playerData.team = [];
    if (playerData.team.length < 6) {
      poke.slot = playerData.team.length;
      playerData.team.push(poke._id);
      await poke.save();
      await playerData.save();
    } else {
      // Si team full, met en PC
      poke.isInTeam = false;
      poke.slot = undefined;
      poke.box = 0;
      await poke.save();
    }
  }

  // Si pas inTeam, met en PC (box 0 par défaut)
  if (!inTeam) {
    poke.isInTeam = false;
    poke.slot = undefined;
    poke.box = 0;
    await poke.save();
  }

  return poke;
}
