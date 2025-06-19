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

// Gender random (80% male, 20% female par défaut, adapte à l'espèce si besoin)
export function randomGender() {
  return Math.random() < 0.8 ? "male" : "female";
}

// Moves de base depuis ton fichier JSON ou DB
import { getStarterMoves } from "../data/PokemonData"; // à adapter selon ta structure

export function getLevel1Moves(pokemonId: number): string[] {
  // Ici, tu vas lire ton fichier/DB contenant les moves de départ
  // (simu : "tackle" et "growl" pour tous)
  return ["tackle", "growl"];
}
