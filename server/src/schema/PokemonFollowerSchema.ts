import { Schema, type } from "@colyseus/schema";

export class PokemonFollower extends Schema {
  @type("number") pokemonId: number = 0;
  @type("string") nickname: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
  @type("boolean") isShiny: boolean = false;
  @type("number") level: number = 1;
}
