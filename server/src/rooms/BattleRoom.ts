// server/src/rooms/BattleRoom.ts
import { Room, Client } from "@colyseus/core";
import { BattleState, BattleAction } from "../schema/BattleState";
import { BattleManager } from "../managers/BattleManager";
import { EncounterManager, WildPokemon } from "../managers/EncounterManager";
import { MoveManager } from "../managers/MoveManager";

export class BattleRoom extends Room<BattleState> {
  private battleManager!: BattleManager;
  private encounterManager!: EncounterManager;
  private turnTimer?: any;

  maxClients = 2; // Maximum 2 joueurs pour un combat

  async onCreate(options: any) {
    console.log(`⚔️ === BATAILLE CRÉÉE ===`);
    console.log("Options:", options);

    // Initialiser le state
    this.setState(new BattleState());

    // Initialiser les managers
    this.battleManager = new BattleManager(this.state);
    this.encounterManager = new EncounterManager();
    
    // Initialiser les données des attaques
    await MoveManager.initialize();

    // Configurer les handlers
    this.setupMessageHandlers();

    // Si c'est un combat sauvage, l'initialiser immédiatement
    if (options.battleType === "wild") {
      await this.initializeWildBattle(options);
    }

    console.log(`✅ Battle Room initialisée: ${this.state.battleId}`);
  }

  private async initializeWildBattle(options: any) {
    try {
      // Générer le Pokémon sauvage
      const wildPokemon: WildPokemon = options.wildPokemon || await this.generateWildPokemon(options);
      
      if (!wildPokemon) {
        throw new Error("Impossible de générer le Pokémon sauvage");
      }

      // Attendre qu'un joueur rejoigne
      this.state.battleType = "wild";
      this.state.encounterLocation = options.location || "Route 1";
      this.state.encounterMethod = options.method || "wild_grass";
      
      // Stocker les données pour l'initialisation
      (this as any).wildPokemonData = wildPokemon;
      (this as any).playerPokemonId = options.playerPokemonId || 25; // Pikachu par défaut
      
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du combat sauvage:", error);
    }
  }

  private async generateWildPokemon(options: any): Promise<WildPokemon | null> {
    const zone = options.zone || "road1";
    const method = options.method || "grass";
    const timeOfDay = options.timeOfDay || "day";
    const weather = options.weather || "clear";

    return await this.encounterManager.generateWildEncounter(zone, method, timeOfDay, weather);
  }

  private setupMessageHandlers() {
    // Action de combat
    this.onMessage("battleAction", async (client, data) => {
      console.log(`⚔️ Action de combat reçue:`, data);
      await this.handleBattleAction(client, data);
    });

    // Demande de fuite
    this.onMessage("runFromBattle", async (client) => {
      console.log(`🏃 Tentative de fuite de ${client.sessionId}`);
      const action = new BattleAction();
      action.type = "run";
      action.playerId = client.sessionId;
      action.data = "{}";
      
      await this.battleManager.processAction(action);
    });

    // Utilisation d'objet
    this.onMessage("useItem", async (client, data) => {
      console.log(`🎒 Utilisation d'objet:`, data);
      const action = new BattleAction();
      action.type = "item";
      action.playerId = client.sessionId;
      action.data = JSON.stringify(data);
      
      await this.battleManager.processAction(action);
    });

    // Demande d'état du combat
    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", {
        battleId: this.state.battleId,
        phase: this.state.phase,
        turnNumber: this.state.turnNumber,
        currentTurn: this.state.currentTurn,
        battleLog: Array.from(this.state.battleLog),
        battleEnded: this.state.battleEnded
      });
    });
  }

  private async handleBattleAction(client: Client, data: any) {
    if (this.state.battleEnded) {
      client.send("battleError", { message: "Le combat est terminé !" });
      return;
    }

    if (!this.state.waitingForAction) {
      client.send("battleError", { message: "Attendez votre tour !" });
      return;
    }

    const action = new BattleAction();
    action.type = data.type;
    action.playerId = client.sessionId;
    action.data = JSON.stringify(data);

    // Définir priorité et vitesse selon l'action
    if (data.type === "attack" && data.moveId) {
      const moveData = MoveManager.getMoveData(data.moveId);
      action.priority = moveData?.priority || 0;
      
      const pokemon = client.sessionId === this.state.player1Id 
        ? this.state.player1Pokemon 
        : this.state.player2Pokemon;
      action.speed = pokemon.speed;
    }

    try {
      await this.battleManager.processAction(action);
      
      // Appliquer les effets de fin de tour
      this.battleManager.processEndOfTurnEffects();
      
      // Envoyer l'état mis à jour
      this.broadcast("battleStateUpdate", {
        battleId: this.state.battleId,
        phase: this.state.phase,
        turnNumber: this.state.turnNumber,
        currentTurn: this.state.currentTurn,
        battleLog: Array.from(this.state.battleLog),
        battleEnded: this.state.battleEnded,
        winner: this.state.winner,
        expGained: this.state.expGained,
        pokemonCaught: this.state.pokemonCaught
      });

      // Si le combat est terminé, fermer la room après un délai
      if (this.state.battleEnded) {
        this.clock.setTimeout(() => {
          this.disconnect();
        }, 10000); // 10 secondes
      }

    } catch (error) {
      console.error("❌ Erreur lors du traitement de l'action:", error);
      client.send("battleError", { message: "Erreur lors de l'exécution de l'action" });
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`👤 Joueur rejoint le combat: ${client.sessionId}`);

    // Si c'est le premier joueur et qu'il y a des données de combat sauvage
    if (this.clients.length === 1 && (this as any).wildPokemonData) {
      try {
        await this.battleManager.initializeWildBattle(
          client.sessionId,
          options.playerName || "Joueur",
          (this as any).playerPokemonId,
          (this as any).wildPokemonData,
          this.state.encounterLocation
        );

        // Envoyer l'état initial
        client.send("battleInitialized", {
          battleId: this.state.battleId,
          battleType: this.state.battleType,
          playerPokemon: this.state.player1Pokemon,
          opponentPokemon: this.state.player2Pokemon,
          phase: this.state.phase,
          battleLog: Array.from(this.state.battleLog)
        });

        console.log(`✅ Combat sauvage initialisé pour ${client.sessionId}`);
      } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        client.leave(1000, "Erreur d'initialisation");
      }
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 Joueur quitte le combat: ${client.sessionId}`);

    // Si le joueur quitte pendant un combat actif, le faire perdre
    if (!this.state.battleEnded && client.sessionId === this.state.player1Id) {
      this.state.battleEnded = true;
      this.state.winner = "opponent";
      this.state.phase = "defeat";
      
      this.broadcast("battleStateUpdate", {
        battleId: this.state.battleId,
        phase: this.state.phase,
        battleEnded: this.state.battleEnded,
        winner: this.state.winner,
        battleLog: Array.from(this.state.battleLog)
      });
    }
  }

  onDispose() {
    console.log(`💀 Battle Room fermée: ${this.state.battleId}`);
    
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
  }
}
