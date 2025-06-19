// src/services/PokemonService.ts

import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { HydratedDocument } from "mongoose";

/**
 * Ajoute un Pokémon au joueur (dans la team si demandé, sinon dans le PC).
 * @param username        - Nom du joueur (string)
 * @param pokemonProps    - Props du Pokémon à créer (pokemonId, moves, ivs, etc.)
 * @param inTeam          - true = l’ajoute à la team (slot libre), false = PC
 * @returns Promise<HydratedDocument<IOwnedPokemon>>
 */
export async function givePokemonToPlayer(
  username: string,
  pokemonProps: Partial<Omit<IOwnedPokemon, "_id" | "owner">>,
  inTeam = false
): Promise<HydratedDocument<IOwnedPokemon>> {
  // Récupère PlayerData (doit exister)
  const playerData = await PlayerData.findOne({ username });
  if (!playerData) throw new Error("Player not found");

  // Crée le Pokémon
  const poke = await OwnedPokemon.create({
    ...pokemonProps,
    owner: username,
    isInTeam: inTeam,
    // slot: défini plus bas si ajouté à la team
  });

  // Ajoute à la team si demandé ET team pas pleine
  if (inTeam) {
    if (!Array.isArray(playerData.team)) playerData.team = [];
    if (playerData.team.length < 6) {
      poke.slot = playerData.team.length;
      playerData.team.push(poke._id);
      await poke.save();
      await playerData.save();
    } else {
      // Team pleine : Pokémon va en PC (box 0)
      poke.isInTeam = false;
      poke.slot = undefined;
      poke.box = 0;
      await poke.save();
    }
  } else {
    // Ajoute dans le PC (box 0 par défaut)
    poke.isInTeam = false;
    poke.slot = undefined;
    poke.box = 0;
    await poke.save();
  }

  return poke;
}
