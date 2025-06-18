// ===============================================
// BaseRoom.ts - Classe parent pour toutes les rooms
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager, NpcData } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController";
import { InteractionManager } from "../managers/InteractionManager";

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;
  protected abstract mapName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;
  protected abstract calculateSpawnPosition(targetZone: string): { x: number, y: number };
  
  protected npcManager: NpcManager;
  protected movementController: MovementController;
  protected interactionManager: InteractionManager;

  onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    console.log(`[${this.mapName}] NPCs chargés :`, this.npcManager.getAllNpcs());

    this.interactionManager = new InteractionManager(this.npcManager);
    this.movementController = new MovementController();

    // Sauvegarde automatique
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000);

    // Interaction NPC
    this.onMessage("npcInteract", (client, data: { npcId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const result = this.interactionManager.handleNpcInteraction(player, data.npcId);
      client.send("npcInteractionResult", result);
    });
    
    // Handler mouvements joueurs
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

    // Handler changement de zone (transition)
    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      console.log(`[${this.mapName}] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);
      const spawnPosition = this.calculateSpawnPosition(data.targetZone);

      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Désactive l'anticheat uniquement pour ce déplacement de transition
        this.movementController.handleMove(
          client.sessionId,
          player,
          { x: spawnPosition.x, y: spawnPosition.y, direction: player.direction, isMoving: false },
          true // skipAnticheat
        );
        player.x = spawnPosition.x;
        player.y = spawnPosition.y;
        player.isMoving = false;

        // Enlève le joueur de la room (Colyseus va le recréer dans la prochaine room)
        this.state.players.delete(client.sessionId);
        this.movementController?.resetPlayer?.(client.sessionId);

        // Sauvegarde la position en BDD
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
        );
        console.log(`[${this.mapName}] Sauvegarde position et map (${spawnPosition.x}, ${spawnPosition.y}) dans ${data.targetZone} pour ${player.name}`);
      }

      // Envoie confirmation au client (il se reconnectera à la nouvelle room)
      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: this.mapName.replace('Room', 'Scene'),
        direction: data.direction,
        spawnX: spawnPosition.x,
        spawnY: spawnPosition.y
      });

      console.log(`[${this.mapName}] Transition envoyée: ${data.targetZone} à (${spawnPosition.x}, ${spawnPosition.y})`);
    });

    console.log(`[${this.mapName}] Room créée :`, this.roomId);
    console.log(`🔥 FIN onCreate ${this.mapName}`);
  }

  async saveAllPlayers() {
    console.log(`🟡🟡🟡 saveAllPlayers APPELEE pour ${this.mapName}`);
    console.log('🟡 Nombre de joueurs:', this.state.players.size);
    if (this.state.players.size === 0) return;
    try {
      for (const [sessionId, player] of this.state.players) {
        await PlayerData.updateOne(
          { username: player.name }, 
          { $set: { lastX: player.x, lastY: player.y, lastMap: this.mapName.replace('Room', '') } }
        );
      }
      console.log('✅ saveAllPlayers terminée');
    } catch (error) {
      console.error(`❌ Erreur saveAllPlayers ${this.mapName}:`, error);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`🔍 DEBUG onJoin ${this.mapName} - options reçues:`, options);
    const username = options.username || "Anonymous";
    client.send("npcList", this.npcManager.getAllNpcs());

    // Retire un ancien joueur avec le même nom
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        this.movementController?.resetPlayer?.(oldSessionId);
      }
    }
    
    // Recherche les données sauvegardées
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

    // Spawn via transition ou via dernière position
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
