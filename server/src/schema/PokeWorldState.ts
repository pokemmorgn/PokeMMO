import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class TeamPokemon extends Schema {
  @type("string") id: string;
  @type("number") pokemonId: number;
  @type("number") level: number;
  @type("string") nickname: string;
  @type("boolean") shiny: boolean;
  @type("string") gender: string;
  // ❌ ENLEVER currentZone d'ici - c'est pour le TeamPokemon, pas le Player !
}

export class Player extends Schema {
  @type("string") id: string = ""; // ✅ AJOUTÉ pour l'ID de session
  @type("number") x: number = 300;
  @type("number") y: number = 300;
  @type("string") map: string = "";
  @type("string") name: string = "";
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
  @type("string") currentZone: string = ""; // ✅ AJOUTÉ ICI dans Player
  @type([ TeamPokemon ]) team: ArraySchema<TeamPokemon> = new ArraySchema<TeamPokemon>();
}

export class PokeWorldState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();
}
