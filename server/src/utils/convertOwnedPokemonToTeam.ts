import { TeamPokemon } from "../schema/PokeWorldState";
import { IOwnedPokemon } from "../models/OwnedPokemon"; // ou ton interface

export function convertOwnedPokemonToTeam(poke: IOwnedPokemon): TeamPokemon {
  const teamPoke = new TeamPokemon();
  teamPoke.id = poke._id.toString();
  teamPoke.pokemonId = poke.pokemonId;
  teamPoke.level = poke.level;
  teamPoke.nickname = poke.nickname;
  teamPoke.shiny = poke.shiny;
  teamPoke.gender = poke.gender;
  // ...autres champs
  return teamPoke;
}
