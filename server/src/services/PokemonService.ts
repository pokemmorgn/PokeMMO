import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { HydratedDocument } from "mongoose";
import { randomIVs, randomGender, getLevel1Moves } from "../utils/pokemonRandom";

/**
 * Ajoute un Pokémon généré à 100% automatiquement au joueur
 * (Starter/capture/event...)
 */
export async function givePokemonToPlayer(
  username: string,
  options: {
    pokemonId: number;
    level?: number; // défaut: 1
    nature?: string; // défaut: Hardy
    shiny?: boolean; // défaut: false
    nickname?: string;
    // + autres options custom (future proof)
    inTeam?: boolean;
  }
): Promise<HydratedDocument<IOwnedPokemon>> {
  const playerData = await PlayerData.findOne({ username });
  if (!playerData) throw new Error("Player not found");

  // Remplir tous les champs automatiquement
  const {
    pokemonId,
    level = 1,
    nature = "Hardy",
    shiny = false,
    nickname,
    inTeam = false
  } = options;

  const ivs = randomIVs();
  const gender = randomGender();
  const moves = getLevel1Moves(pokemonId);

  // Création du Pokémon
  const poke = await OwnedPokemon.create({
    owner: username,
    pokemonId,
    level,
    nature,
    shiny,
    nickname,
    ivs,
    gender,
    moves,
    isInTeam: inTeam,
  });

  // Ajout à la team ou au PC
  if (inTeam) {
    if (!Array.isArray(playerData.team)) playerData.team = [];
    if (playerData.team.length < 6) {
      poke.slot = playerData.team.length;
      playerData.team.push(poke._id);
      await poke.save();
      await playerData.save();
    } else {
      poke.isInTeam = false;
      poke.slot = undefined;
      poke.box = 0;
      await poke.save();
    }
  } else {
    poke.isInTeam = false;
    poke.slot = undefined;
    poke.box = 0;
    await poke.save();
  }

  return poke;
}
