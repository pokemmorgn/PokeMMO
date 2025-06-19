import { TeamPokemon } from "../schema/PokeWorldState"; // adapte le chemin

export function convertOwnedPokemonToTeam(poke): TeamPokemon {
  const teamPoke = new TeamPokemon();
  teamPoke.id = poke._id.toString();
  teamPoke.pokemonId = poke.pokemonId;
  teamPoke.level = poke.level;
  teamPoke.nickname = poke.nickname;
  teamPoke.shiny = poke.shiny;
  teamPoke.gender = poke.gender; // Ajoute tout ce que tu veux exposer
  // teamPoke.ivs = poke.ivs; // etc.
  return teamPoke;
}
