// server/src/schema/PokemonTeamSchema.ts

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class PokemonMoveSchema extends Schema {
  @type("string") moveId: string = "";
  @type("string") name: string = "";
  @type("number") currentPp: number = 0;
  @type("number") maxPp: number = 0;
  @type("number") power: number = 0;
  @type("string") category: string = "";
}

export class PokemonStatsSchema extends Schema {
  @type("number") hp: number = 0;
  @type("number") attack: number = 0;
  @type("number") defense: number = 0;
  @type("number") specialAttack: number = 0;
  @type("number") specialDefense: number = 0;
  @type("number") speed: number = 0;
}

export class PokemonInstanceSchema extends Schema {
  @type("string") id: string = "";
  @type("number") pokemonId: number = 0;
  @type("string") name: string = "";
  @type("string") nickname: string = "";
  @type("number") level: number = 1;
  @type("number") experience: number = 0;
  @type("number") currentHp: number = 0;
  @type("number") maxHp: number = 0;
  @type("string") nature: string = "";
  @type("string") ability: string = "";
  @type("string") gender: string = "";
  @type("boolean") isShiny: boolean = false;
  @type("string") status: string = "normal";
  @type("string") sprite: string = "";
  @type([PokemonMoveSchema]) moves = new ArraySchema<PokemonMoveSchema>();
  @type(PokemonStatsSchema) stats = new PokemonStatsSchema();
  @type(["string"]) types = new ArraySchema<string>();
}

export class PlayerTeamSchema extends Schema {
  @type("string") playerId: string = "";
  @type([PokemonInstanceSchema]) pokemon = new ArraySchema<PokemonInstanceSchema>();
  @type("number") activePokemon: number = -1;
  @type("number") teamSize: number = 0;
}

// Mise à jour du PokeWorldState principal
// server/src/schema/PokeWorldState.ts

import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerTeamSchema } from "./PokemonTeamSchema";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
  @type("string") map: string = "";
}

export class PokeWorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  
  // ⭐ NOUVEAU : Équipes des joueurs synchronisées
  @type({ map: PlayerTeamSchema }) playerTeams = new MapSchema<PlayerTeamSchema>();
  
  @type("number") serverTime: number = 0;
}
