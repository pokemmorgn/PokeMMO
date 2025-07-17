// server/src/schema/PokeWorldState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { PokemonFollower } from "./PokemonFollowerSchema";

export class TeamPokemon extends Schema {
  @type("string") id: string;
  @type("number") pokemonId: number;
  @type("number") level: number;
  @type("string") nickname: string;
  @type("boolean") shiny: boolean;
  @type("string") gender: string;
}

export class Player extends Schema {
  @type("string") id: string = ""; // ID de session
  @type("number") x: number = 300;
  @type("number") y: number = 300;
  @type("string") map: string = "";
  @type("string") name: string = "";
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
    @type("string") characterId: string = "brendan"; // ID du personnage choisi
  @type("string") currentZone: string = ""; // Zone courante du joueur
    @type("boolean") isDev: boolean = false; // ✅ AJOUTER CETTE LIGNE ICI

  @type([ TeamPokemon ]) team: ArraySchema<TeamPokemon> = new ArraySchema<TeamPokemon>();
  @type(PokemonFollower) follower?: PokemonFollower;

  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LE SYSTÈME SHOP
  @type("number") level: number = 1;      // Niveau du joueur
  @type("number") gold: number = 1000;    // Argent du joueur
  
  // Propriétés pour extensions futures
  @type("number") experience: number = 0;
  @type("string") title: string = "";     // Titre du joueur
  @type("string") animation: string = "idle"; // Animation courante
}

export class PokeWorldState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();
  
  // ✅ SYSTÈME TEMPS/MÉTÉO
  @type("number") gameHour: number = 12;
  @type("number") gameMinute: number = 0;
  @type("boolean") isDayTime: boolean = true;
  @type("string") weather: string = "clear";
  @type("number") serverTime: number = Date.now();
  
  // ✅ PROPRIÉTÉS TEMPS ÉTENDUES
  @type("string") timeOfDay: string = "day"; // "day" | "night"
  @type("string") weatherDisplayName: string = "Ciel dégagé";
  @type("number") dayStartHour: number = 6;
  @type("number") nightStartHour: number = 18;
  
  // ✅ EFFETS MÉTÉO POUR LE GAMEPLAY
  @type("number") weatherSpawnRate: number = 1.0;
  @type("number") weatherCatchRate: number = 1.0;
  @type("number") weatherExpBonus: number = 1.0;
  
  // Statistiques du serveur
  @type("number") onlineCount: number = 0;
  @type("number") totalPlayers: number = 0;
  
  // Événements mondiaux
  @type("boolean") eventActive: boolean = false;
  @type("string") eventName: string = "";
  @type("number") eventEndTime: number = 0;
  
  // ✅ ZONES SPÉCIALES
  @type("string") rareSpawnZone: string = ""; // Zone avec spawn rare actuel
  @type("number") rareSpawnEndTime: number = 0;
}
