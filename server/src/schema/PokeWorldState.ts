// server/src/schema/PokeWorldState.ts

import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

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
  @type("string") currentZone: string = ""; // Zone courante du joueur
  @type([ TeamPokemon ]) team: ArraySchema<TeamPokemon> = new ArraySchema<TeamPokemon>();
  
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
  
  // Propriétés globales du monde
  @type("string") worldTime: string = "day";
  @type("string") weather: string = "clear";
  @type("number") serverTime: number = Date.now();
  
  // Statistiques du serveur
  @type("number") onlineCount: number = 0;
  @type("number") totalPlayers: number = 0;
  
  // Événements mondiaux
  @type("boolean") eventActive: boolean = false;
  @type("string") eventName: string = "";
}
