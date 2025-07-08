// server/src/schema/BattleState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class BattlePokemon extends Schema {
  @type("number") pokemonId: number;
  @type("string") combatId: string;
  @type("string") name: string;
  @type("number") level: number;
  @type("number") currentHp: number;
  @type("number") maxHp: number;
  @type(["string"]) types: ArraySchema<string> = new ArraySchema<string>();
  @type(["string"]) moves: ArraySchema<string> = new ArraySchema<string>();
  @type("string") statusCondition: string = "normal";
  @type("string") gender: string = "unknown";
  @type("boolean") shiny: boolean = false;
  @type("string") sprite: string = "";
  @type("boolean") isWild: boolean = false;
  
  // Stats calculées pour le combat
  @type("number") attack: number = 0;
  @type("number") defense: number = 0;
  @type("number") specialAttack: number = 0;
  @type("number") specialDefense: number = 0;
  @type("number") speed: number = 0;
  
  // Modificateurs temporaires de combat
  @type("number") attackStage: number = 0;
  @type("number") defenseStage: number = 0;
  @type("number") speedStage: number = 0;
  @type("number") specialAttackStage: number = 0;
  @type("number") specialDefenseStage: number = 0;
  @type("number") accuracyStage: number = 0;
  @type("number") evasionStage: number = 0;
}

export class BattleAction extends Schema {
  @type("string") type: string; // "attack", "item", "switch", "run"
  @type("string") playerId: string;
  @type("string") data: string; // JSON stringifié des données de l'action
  @type("number") priority: number = 0;
  @type("number") speed: number = 0;
}

export class BattleState extends Schema {
  @type("string") battleId: string;
  @type("string") battleType: string = "wild"; // "wild", "trainer", "pvp"
  @type("string") currentTurn: string; // "player1", "player2", "waiting"
  @type("number") turnNumber: number = 1;
  @type("string") phase: string = "intro"; // "intro", "battle", "capture", "victory", "defeat", "fled"
  
  // Participants
  @type("string") player1Id: string;
  @type("string") player2Id: string = "";
  @type("string") player1Name: string;
  @type("string") player2Name: string = "";
  
  // Pokémon en combat
  @type(BattlePokemon) player1Pokemon: BattlePokemon;
  @type(BattlePokemon) player2Pokemon: BattlePokemon; // Pokémon sauvage ou adversaire
  
  // Actions du tour
  @type([BattleAction]) pendingActions: ArraySchema<BattleAction> = new ArraySchema<BattleAction>();
  
  // État du combat
  @type("boolean") canRun: boolean = true;
  @type("boolean") canUseItems: boolean = true;
  @type("boolean") canSwitchPokemon: boolean = true;
  @type("string") weather: string = "none";
  @type("number") weatherTurns: number = 0;
  
  // Messages de combat
  @type(["string"]) battleLog: ArraySchema<string> = new ArraySchema<string>();
  @type("string") lastMessage: string = "";
  
  // Résultats
  @type("boolean") battleEnded: boolean = false;
  @type("string") winner: string = "";
  @type("number") expGained: number = 0;
  @type("boolean") pokemonCaught: boolean = false;
  
  // Données de la rencontre sauvage
  @type("string") encounterLocation: string = "";
  @type("string") encounterMethod: string = "wild_grass";
  
  // Timer pour les actions
  @type("number") turnTimer: number = 30;
  @type("boolean") waitingForAction: boolean = true;
}
