// server/src/rooms/BaseRoom.ts - Mise à jour avec les managers

import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController";
import { TransitionController } from "../controllers/TransitionController";
import { InteractionManager } from "../managers/InteractionManager";
// ⭐ NOUVEAUX IMPORTS
import { PokemonManager } from "../managers/PokemonManager";
import { MoveManager } from "../managers/MoveManager";
import { TeamManager } from "../managers/TeamManager";

export type SpawnData = {
  targetZone: string;
  targetSpawn?: string;
  targetX?: number;
  targetY?: number;
};

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;

  public abstract mapName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;

  protected npcManager: NpcManager;
  public movementController: MovementController;
  public transitionController: TransitionController;
  protected interactionManager: InteractionManager;
  
  // ⭐ NOUVEAUX MANAGERS
  protected pokemonManager: PokemonManager;
  protected moveManager: MoveManager;
  protected teamManager: TeamManager;

  public abstract calculateSpawnPosition(spawnData: SpawnData): { x: number; y: number };

  async onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    // ⭐ INITIALISATION DES NOUVEAUX MANAGERS
    try {
      // Initialise les managers de données Pokémon
      this.pokemonManager = new PokemonManager({
        basePath: './src/data/pokemon',
        enableCache: true
      });
      
      this.moveManager = new MoveManager({
        basePath: './src/data',
        useDevFallback: true,
        enableCache: true
      });

      // Charge les index au démarrage
      await this.pokemonManager.loadPokemonIndex();
      await this.moveManager.loadMoveIndex();
      
      console.log(`✅ PokemonManager et MoveManager initialisés pour ${this.mapName}`);

      // Initialise le gestionnaire d'équipes
      this.teamManager = new TeamManager(
        this.state,
        this.pokemonManager,
        this.moveManager
      );
      
      console.log(`✅ TeamManager initialisé pour ${this.mapName}`);
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'initialisation des managers Pokémon:`, error);
      // Continue sans les fonctionnalités Pokémon si erreur
    }

    // Managers existants
    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    this.interactionManager = new InteractionManager(this.npcManager);
    this.movementController = new MovementController();
    this.transitionController = new TransitionController(this);

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      this.saveAllPlayers();
    }, 30000);

    // ⭐ NOUVEAUX MESSAGES POKÉMON
    this.setupPokemonMessages();

    // Messages existants
    this.onMessage("npcInteract", (client: Client, data: { npcId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const result = this.interactionManager.handleNpcInteraction(player, data.npcId);
      client.send("npcInteractionResult", result);
    });

    this.onMessage("move", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const skipAnticheat = (player as any).justSpawned === true;
        const moveResult = this.movementController.handleMove(client.sessionId, player, data, skipAnticheat);
        if (skipAnticheat) (player as any).justSpawned = false;
        player.x = moveResult.x;
        player.y = moveResult.y;
        if ('direction' in moveResult) player.direction = moveResult.direction;
        if ('isMoving' in moveResult) player.isMoving = moveResult.isMoving;
        if (moveResult.snapped) {
          client.send("snap", { x: moveResult.x, y: moveResult.y });
        }
      }
    });

    this.onMessage("changeZone", (client: Client, data: any) => {
      this.transitionController.handleTransition(client, data);
    });
  }

  // ⭐ CONFIGURATION DES MESSAGES POKÉMON
  private setupPokemonMessages(): void {
    if (!this.teamManager) return;

    // Demander l'équipe du joueur
    this.onMessage("getTeam", async (client: Client) => {
      try {
        const team = await this.teamManager.getPlayerTeam(client.sessionId);
        client.send("teamData", {
          success: true,
          team: team ? this.teamManager.serializeTeam(team) : null
        });
      } catch (error) {
        console.error(`Erreur lors de la récupération de l'équipe:`, error);
        client.send("teamData", { success: false, error: "Erreur serveur" });
      }
    });

    // Changer le Pokémon actif
    this.onMessage("setActivePokemon", async (client: Client, data: { index: number }) => {
      try {
        const result = await this.teamManager.setActivePokemon(client.sessionId, data.index);
        client.send("teamUpdate", {
          success: true,
          action: "setActive",
          activePokemon: data.index
        });
        
        // Notifie les autres joueurs du changement (optionnel)
        this.broadcast("playerTeamUpdate", {
          sessionId: client.sessionId,
          activePokemon: data.index
        }, { except: client });
        
      } catch (error) {
        console.error(`Erreur lors du changement de Pokémon actif:`, error);
        client.send("teamUpdate", { 
          success: false, 
          action: "setActive", 
          error: error.message 
        });
      }
    });

    // Donner un Pokémon starter (pour test)
    this.onMessage("getStarter", async (client: Client, data: { pokemonId?: number }) => {
      try {
        const pokemonId = data.pokemonId || 1; // Bulbasaur par défaut
        const result = await this.teamManager.giveStarterPokemon(client.sessionId, pokemonId);
        
        if (result.success) {
          client.send("starterReceived", {
            success: true,
            pokemon: result.pokemon,
            message: `Vous avez reçu ${result.pokemon?.nickname || 'un Pokémon'} !`
          });
          
          // Envoie l'équipe mise à jour
          const team = await this.teamManager.getPlayerTeam(client.sessionId);
          client.send("teamData", {
            success: true,
            team: team ? this.teamManager.serializeTeam(team) : null
          });
        } else {
          client.send("starterReceived", {
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Erreur lors de l'attribution du starter:`, error);
        client.send("starterReceived", { 
          success: false, 
          error: "Erreur serveur" 
        });
      }
    });

    // Soigner l'équipe (pour les centres Pokémon)
    this.onMessage("healTeam", async (client: Client) => {
      try {
        await this.teamManager.healPlayerTeam(client.sessionId);
        client.send("teamHealed", {
          success: true,
          message: "Votre équipe a été soignée !"
        });
        
        // Envoie l'équipe mise à jour
        const team = await this.teamManager.getPlayerTeam(client.sessionId);
        client.send("teamData", {
          success: true,
          team: team ? this.teamManager.serializeTeam(team) : null
        });
      } catch (error) {
        console.error(`Erreur lors des soins:`, error);
        client.send("teamHealed", { 
          success: false, 
          error: "Erreur serveur" 
        });
      }
    });

    console.log(`✅ Messages Pokémon configurés pour ${this.mapName}`);
  }

  async saveAllPlayers() {
    if (this.state.players.size === 0) return;
    try {
      for (const [sessionId, player] of this.state.players) {
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: player.x, lastY: player.y, lastMap: this.mapName.replace('Room', '') } }
        );
      }
    } catch (error) {
      console.error(`❌ Erreur saveAllPlayers ${this.mapName}:`, error);
    }
  }

  async onJoin(client: Client, options: any) {
    const username = options.username || "Anonymous";
    client.send("npcList", this.npcManager.getAllNpcs());

    // Supprime un joueur en double si existant
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        this.movementController?.resetPlayer?.(oldSessionId);
      }
    }

    let playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      const mapName = this.mapName.replace('Room', '');
      playerData = await PlayerData.create({
        username,
        lastX: this.defaultX,
        lastY: this.defaultY,
        lastMap: mapName
      });
    }

    const player = new Player();
    player.name = username;
    (player as any).justSpawned = true;
    (player as any).isTransitioning = false;

    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
    }
    player.map = this.mapName.replace('Room', '');
    this.state.players.set(client.sessionId, player);

    // ⭐ INITIALISE L'ÉQUIPE DU JOUEUR
    if (this.teamManager) {
      try {
        await this.teamManager.initializePlayerTeam(client.sessionId, username);
        console.log(`✅ Équipe initialisée pour ${username}`);
      } catch (error) {
        console.error(`❌ Erreur lors de l'initialisation de l'équipe pour ${username}:`, error);
      }
    }
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
      });
      this.movementController?.resetPlayer?.(client.sessionId);
      this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {
    await this.saveAllPlayers();
    
    // ⭐ NETTOYAGE DES MANAGERS POKÉMON
    if (this.pokemonManager) {
      this.pokemonManager.clearCache();
    }
    if (this.moveManager) {
      this.moveManager.clearCache();
    }
  }
}
