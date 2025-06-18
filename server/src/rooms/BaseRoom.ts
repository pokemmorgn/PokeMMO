// ===============================================
// BaseRoom.ts - Classe parent pour toutes les rooms
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController";
import { TransitionController } from "../controllers/TransitionController";
import { InteractionManager } from "../managers/InteractionManager";

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;
  public abstract mapName: string;
  public abstract defaultX: number;
  public abstract defaultY: number;
  public abstract calculateSpawnPosition(targetZone: string): { x: number, y: number };

  protected npcManager: NpcManager;
  public movementController: MovementController;
  public transitionController: TransitionController;
  protected interactionManager: InteractionManager;


  onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    this.interactionManager = new InteractionManager(this.npcManager);
    this.movementController = new MovementController();
    this.transitionController = new TransitionController(this);

    // Sauvegarde automatique
    this.clock.setInterval(() => {
      this.saveAllPlayers();
    }, 30000);

    // --- Gestion interaction NPC ---
    this.onMessage("npcInteract", (client, data: { npcId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const result = this.interactionManager.handleNpcInteraction(player, data.npcId);
      client.send("npcInteractionResult", result);
    });

    // --- Gestion des mouvements ---
    this.onMessage("move", (client, data) => {
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

    // --- Gestion des transitions de zones via TransitionController ---
    this.onMessage("changeZone", (client, data) => {
      this.transitionController.handleTransition(client, data);
    });
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

    // Remove old duplicate player
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        this.movementController?.resetPlayer?.(oldSessionId);
      }
    }

    // Recherche des données sauvegardées
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
    (player as any).isTransitioning = false; // Reset du flag ici !

    // Spawn via transition ou dernière position connue
    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
    }
    player.map = this.mapName.replace('Room', '');
    this.state.players.set(client.sessionId, player);
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
  }
}
