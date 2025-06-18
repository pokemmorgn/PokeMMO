import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 300;
  @type("number") y: number = 300;
  @type("string") map: string = "";
  @type("string") name: string = "";
  // 👇 AJOUTE pour les anims
  @type("string") direction: string = "down";
  @type("boolean") isMoving: boolean = false;
}

export class PokeWorldState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();
}
