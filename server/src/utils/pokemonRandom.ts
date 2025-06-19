// src/utils/pokemonRandom.ts
import { getStarterMoves, generateRandomGender } from "../data/PokemonData";

// IVs random entre 0 et 31
export function randomIVs() {
  return {
    hp: Math.floor(Math.random() * 32),
    attack: Math.floor(Math.random() * 32),
    defense: Math.floor(Math.random() * 32),
    spAttack: Math.floor(Math.random() * 32),
    spDefense: Math.floor(Math.random() * 32),
    speed: Math.floor(Math.random() * 32)
  };
}

// Gender basé sur les vraies données du Pokémon
export async function randomGender(pokemonId: number): Promise<string> {
  return generateRandomGender(pokemonId);
}

// Moves de niveau 1 depuis vos données JSON
export async function getLevel1Moves(pokemonId: number): Promise<string[]> {
  return getStarterMoves(pokemonId);
}

// Natures possibles dans Pokémon
export const POKEMON_NATURES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky"
];

// Nature aléatoire
export function randomNature(): string {
  return POKEMON_NATURES[Math.floor(Math.random() * POKEMON_NATURES.length)];
}

// Chance de shiny (normalement 1/4096)
export function randomShiny(customRate = 4096): boolean {
  return Math.random() < (1 / customRate);
}
