// src/services/PokemonService.ts
import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { HydratedDocument } from "mongoose";
import { randomIVs, randomGender, getLevel1Moves, randomNature, randomShiny } from "../utils/pokemonRandom";

/**
 * Ajoute un Pokémon généré automatiquement au joueur
 */
export async function givePokemonToPlayer(
  username: string,
  options: {
    pokemonId: number;
    level?: number;
    nature?: string;
    shiny?: boolean;
    nickname?: string;
    inTeam?: boolean;
  }
): Promise<HydratedDocument<IOwnedPokemon>> {
  const playerData = await PlayerData.findOne({ username });
  if (!playerData) throw new Error("Player not found");

  // Destructure options avec valeurs par défaut
  const {
    pokemonId,
    level = 1,
    nature,
    shiny,
    nickname,
    inTeam = false
  } = options;

  // Génération automatique des données
  const ivs = randomIVs();
  const gender = await randomGender(pokemonId);
  const moves = await getLevel1Moves(pokemonId);
  const finalNature = nature || randomNature();
  const isShiny = shiny !== undefined ? shiny : randomShiny();

  // Création du Pokémon avec toutes les données
  const pokemonData = {
    owner: username,
    pokemonId,
    level,
    nature: finalNature,
    shiny: isShiny,
    nickname,
    ivs, // Maintenant ivs est toujours défini
    gender,
    moves,
    isInTeam: inTeam,
    slot: undefined as number | undefined,
    box: 0,
    caughtAt: new Date()
  };

  const poke = await OwnedPokemon.create(pokemonData);

  // Gestion de l'équipe/PC
  if (inTeam) {
    if (!Array.isArray(playerData.team)) playerData.team = [];
    if (playerData.team.length < 6) {
      poke.slot = playerData.team.length;
      poke.isInTeam = true;
      playerData.team.push(poke._id);
      await poke.save();
      await playerData.save();
    } else {
      // Équipe pleine, va au PC
      poke.isInTeam = false;
      poke.slot = undefined;
      poke.box = 0;
      await poke.save();
      console.warn(`Équipe pleine pour ${username}, ${nickname || `Pokémon ${pokemonId}`} envoyé au PC`);
    }
  } else {
    // Directement au PC
    poke.isInTeam = false;
    poke.slot = undefined;
    poke.box = 0;
    await poke.save();
  }

  return poke;
}

/**
 * Donne un starter au joueur
 */
export async function giveStarterToPlayer(
  username: string,
  starterId: 1 | 4 | 7 // Bulbasaur, Charmander, Squirtle
): Promise<HydratedDocument<IOwnedPokemon>> {
  return givePokemonToPlayer(username, {
    pokemonId: starterId,
    level: 5,
    inTeam: true,
    shiny: randomShiny(8192) // Starters un peu plus rares pour le shiny
  });
}
