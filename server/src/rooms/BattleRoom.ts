// server/src/rooms/BattleRoom.ts - VERSION CORRIGÉE
import { Room, Client } from "@colyseus/core";
import { BattleState, BattleAction } from "../schema/BattleState";
import { BattleManager } from "../managers/BattleManager";
import { ServerEncounterManager, WildPokemon } from "../managers/EncounterManager"; // ✅ CORRIGÉ
import { MoveManager } from "../managers/MoveManager";

export class BattleRoom extends Room<BattleState> {
  private battleManager!: BattleManager;
  private encounterManager!: ServerEncounterManager; // ✅ CORRIGÉ
  private turnTimer?: any;

  maxClients = 2; // Maximum 2 joueurs pour un combat

  async onCreate(options: any) {
    console.log(`⚔️ === BATAILLE CRÉÉE ===`);
    console.log("Options:", options);

    // Initialiser le state
    this.setState(new BattleState());

    // Initialiser les managers
    this.battleManager = new BattleManager(this.state);
    this.encounterManager = new ServerEncounterManager(); // ✅ CORRIGÉ
    
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
      // ✅ UTILISER LE POKÉMON SAUVAGE DÉJÀ GÉNÉRÉ SI DISPONIBLE
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

      console.log(`🐾 [BattleRoom] Pokémon sauvage préparé: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);
      
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du combat sauvage:", error);
    }
  }

  private async generateWildPokemon(options: any): Promise<WildPokemon | null> {
    console.log(`🌿 [BattleRoom] Génération Pokémon sauvage de secours...`);
    
    const zone = options.zone || "road1";
    const method = options.method || "grass";
    const timeOfDay = options.timeOfDay || "day";
    const weather = options.weather || "clear";
    const zoneId = options.zoneId; // ✅ NOUVEAU: Support zoneId

    // ✅ UTILISER LA NOUVELLE API AVEC ZONES
    return await this.encounterManager.checkForEncounter(
      zone,
      method as 'grass' | 'fishing',
      1.0, // 100% de chance pour forcer la génération
      timeOfDay as 'day' | 'night',
      weather as 'clear' | 'rain',
      zoneId
    );
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

    // ✅ NOUVEAU: Capture de Pokémon
    this.onMessage("throwPokeball", async (client, data) => {
      console.log(`🥎 Tentative de capture:`, data);
      const action = new BattleAction();
      action.type = "capture";
      action.playerId = client.sessionId;
      action.data = JSON.stringify({
        ballType: data.ballType || "poke_ball",
        targetPokemon: "wild" // Pour identifier le Pokémon sauvage
      });
      
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
        battleEnded: this.state.battleEnded,
        winner: this.state.winner,
        // ✅ NOUVEAU: Données d'encounter
        encounterLocation: this.state.encounterLocation,
        encounterMethod: this.state.encounterMethod
      });
    });

    // ✅ NOUVEAU: Demande des données du Pokémon sauvage
    this.onMessage("getWildPokemonData", (client) => {
      if (this.state.battleType === "wild" && this.state.player2Pokemon) {
        client.send("wildPokemonData", {
          pokemon: this.state.player2Pokemon,
          location: this.state.encounterLocation,
          method: this.state.encounterMethod,
          canCatch: !this.state.battleEnded && this.state.phase !== "defeat"
        });
      }
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
      action.speed = pokemon?.speed || 50;
    }

    try {
      await this.battleManager.processAction(action);
      
      // Appliquer les effets de fin de tour
      this.battleManager.processEndOfTurnEffects();
      
      // ✅ DONNÉES ÉTENDUES POUR L'UPDATE
      const battleUpdate = {
        battleId: this.state.battleId,
        phase: this.state.phase,
        turnNumber: this.state.turnNumber,
        currentTurn: this.state.currentTurn,
        battleLog: Array.from(this.state.battleLog),
        battleEnded: this.state.battleEnded,
        winner: this.state.winner,
        expGained: this.state.expGained,
        pokemonCaught: this.state.pokemonCaught,
        // ✅ NOUVEAU: Données des Pokémon mises à jour
        player1Pokemon: this.state.player1Pokemon,
        player2Pokemon: this.state.player2Pokemon,
        waitingForAction: this.state.waitingForAction
      };

      // Envoyer l'état mis à jour
      this.broadcast("battleStateUpdate", battleUpdate);

      // ✅ Si le combat est terminé, envoyer les résultats détaillés
      if (this.state.battleEnded) {
        this.broadcast("battleResult", {
          result: this.state.winner === "player1" ? "victory" : 
                  this.state.winner === "player2" ? "defeat" : "draw",
          expGained: this.state.expGained,
          pokemonCaught: this.state.pokemonCaught,
          capturedPokemon: this.state.pokemonCaught ? this.state.player2Pokemon : null,
          battleDuration: this.state.turnNumber,
          location: this.state.encounterLocation
        });

        // Fermer la room après un délai
        this.clock.setTimeout(() => {
          this.disconnect();
        }, 10000); // 10 secondes
      }

    } catch (error) {
      console.error("❌ Erreur lors du traitement de l'action:", error);
      client.send("battleError", { 
        message: "Erreur lors de l'exécution de l'action",
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`👤 [BattleRoom] Joueur rejoint le combat: ${client.sessionId}`);
    console.log(`📊 [BattleRoom] Options joueur:`, options);

    // Si c'est le premier joueur et qu'il y a des données de combat sauvage
    if (this.clients.length === 1 && (this as any).wildPokemonData) {
      try {
        console.log(`🎮 [BattleRoom] Initialisation combat sauvage...`);
        
        await this.battleManager.initializeWildBattle(
          client.sessionId,
          options.playerName || "Joueur",
          (this as any).playerPokemonId,
          (this as any).wildPokemonData,
          this.state.encounterLocation
        );

        // ✅ ENVOYER L'ÉTAT INITIAL COMPLET
        const initData = {
          battleId: this.state.battleId,
          battleType: this.state.battleType,
          playerPokemon: this.state.player1Pokemon,
          opponentPokemon: this.state.player2Pokemon,
          phase: this.state.phase,
          battleLog: Array.from(this.state.battleLog),
          encounterLocation: this.state.encounterLocation,
          encounterMethod: this.state.encounterMethod,
          turnNumber: this.state.turnNumber,
          waitingForAction: this.state.waitingForAction
        };

        client.send("battleInitialized", initData);

        console.log(`✅ [BattleRoom] Combat sauvage initialisé pour ${client.sessionId}`);
        console.log(`🐾 [BattleRoom] Pokémon joueur: ${this.state.player1Pokemon?.pokemonId}`);
        console.log(`🌿 [BattleRoom] Pokémon sauvage: ${this.state.player2Pokemon?.pokemonId}`);
        
      } catch (error) {
        console.error("❌ [BattleRoom] Erreur lors de l'initialisation:", error);
        client.send("battleError", {
          message: "Impossible d'initialiser le combat",
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
        client.leave(1000, "Erreur d'initialisation");
      }
    } else if (this.clients.length > 1) {
      console.warn(`⚠️ [BattleRoom] Trop de joueurs dans la room de combat`);
      client.leave(1000, "Room pleine");
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 [BattleRoom] Joueur quitte le combat: ${client.sessionId} (consenti: ${consented})`);

    // Si le joueur quitte pendant un combat actif, le faire perdre
    if (!this.state.battleEnded && client.sessionId === this.state.player1Id) {
      console.log(`🏃 [BattleRoom] Joueur ${client.sessionId} a abandonné le combat`);
      
      this.state.battleEnded = true;
      this.state.winner = "opponent";
      this.state.phase = "defeat";
      
      // Ajouter un message au log
      this.state.battleLog.push(`${client.sessionId} a abandonné le combat !`);
      
      this.broadcast("battleStateUpdate", {
        battleId: this.state.battleId,
        phase: this.state.phase,
        battleEnded: this.state.battleEnded,
        winner: this.state.winner,
        battleLog: Array.from(this.state.battleLog)
      });

      // Envoyer le résultat d'abandon
      this.broadcast("battleResult", {
        result: "fled",
        expGained: 0,
        pokemonCaught: false,
        battleDuration: this.state.turnNumber,
        location: this.state.encounterLocation
      });
    }
  }

  onDispose() {
    console.log(`💀 [BattleRoom] Battle Room fermée: ${this.state.battleId}`);
    
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    // ✅ NETTOYAGE DES DONNÉES TEMPORAIRES
    delete (this as any).wildPokemonData;
    delete (this as any).playerPokemonId;
  }
}
