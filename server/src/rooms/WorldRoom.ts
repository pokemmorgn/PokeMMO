// ===== server/src/rooms/WorldRoom.ts =====
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "./managers/ZoneManager";
import { MovementController } from "../controllers/MovementController";
import { ArraySchema } from "@colyseus/schema";

export class WorldRoom extends Room<PokeWorldState> {
  maxClients = 50; // ✅ Channel system ready
  
  private zoneManager: ZoneManager;
  private movementController: MovementController;
  private channelId: string;

  onCreate(options: any) {
    console.log(`🌍 === WORLDROOM CRÉATION ===`);
    console.log(`🆔 Room ID: ${this.roomId}`);
    console.log(`📋 Options:`, options);
    
    this.channelId = options.channelId || `Channel_${this.roomId.substring(0, 8)}`;
    console.log(`📡 Channel ID: ${this.channelId}`);

    // Initialiser le state
    this.setState(new PokeWorldState());
    console.log(`✅ State initialisé`);

    // Initialiser les managers
    this.zoneManager = new ZoneManager(this);
    this.movementController = new MovementController();
    console.log(`✅ Managers initialisés`);

    // Setup des handlers
    this.setupMessageHandlers();
    console.log(`✅ Message handlers configurés`);

    // Sauvegarde automatique
    this.clock.setInterval(() => {
      this.saveAllPlayers();
    }, 30000);

    console.log(`🏁 WorldRoom créée avec succès: ${this.channelId}`);
  }

  private setupMessageHandlers() {
    console.log(`🔧 Configuration des message handlers...`);

    // ✅ MOVEMENT (existant)
    this.onMessage("move", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const moveResult = this.movementController.handleMove(client.sessionId, player, data);
      player.x = moveResult.x;
      player.y = moveResult.y;
      if ('direction' in moveResult) player.direction = moveResult.direction;
      if ('isMoving' in moveResult) player.isMoving = moveResult.isMoving;
      
      if (moveResult.snapped) {
        client.send("snap", { x: moveResult.x, y: moveResult.y });
      }
    });

    // ✅ ZONE TRANSITION (nouveau système)
    this.onMessage("moveToZone", (client: Client, data: any) => {
      console.log(`🌀 === ZONE TRANSITION REQUEST ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📍 Transition data:`, data);
      
      this.zoneManager.handleZoneTransition(client, data);
    });

    // ✅ NPC INTERACTION (délégué aux zones)
    this.onMessage("npcInteract", (client: Client, data: { npcId: number }) => {
      console.log(`💬 === NPC INTERACTION ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`🤖 NPC ID: ${data.npcId}`);
      
      this.zoneManager.handleNpcInteraction(client, data.npcId);
    });

    // ✅ QUEST MESSAGES (délégués aux zones)
    this.onMessage("startQuest", (client: Client, data: { questId: string }) => {
      console.log(`🎯 === QUEST START ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📜 Quest: ${data.questId}`);
      
      this.zoneManager.handleQuestStart(client, data.questId);
    });

    // ✅ DEBUG COMMANDS
    this.onMessage("debugPlayer", (client: Client) => {
      this.debugPlayer(client.sessionId);
    });

    console.log(`✅ Message handlers configurés`);
  }

  async onJoin(client: Client, options: any) {
    console.log(`👤 === PLAYER JOIN ===`);
    console.log(`🆔 Session: ${client.sessionId}`);
    console.log(`👤 Username: ${options.username}`);
    console.log(`🌍 Channel: ${this.channelId}`);
    console.log(`📊 Joueurs avant: ${this.state.players.size}`);

    const username = options.username || "Anonymous";
    
    // Vérifier doublons
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      console.log(`⚠️ Joueur ${username} déjà présent, suppression...`);
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        this.movementController?.resetPlayer?.(oldSessionId);
      }
    }

    // Créer le joueur
    const player = new Player();
    player.name = username;
    player.currentZone = options.spawnZone || "beach";
    player.x = options.spawnX || 52;
    player.y = options.spawnY || 48;
    player.map = player.currentZone; // Compatibilité
    player.team = new ArraySchema();
    (player as any).justSpawned = true;
    (player as any).channelId = this.channelId;

    this.state.players.set(client.sessionId, player);

    console.log(`✅ Joueur créé: ${username}`);
    console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    console.log(`📊 Joueurs après: ${this.state.players.size}`);

    // Laisser le ZoneManager gérer l'entrée en zone
    await this.zoneManager.onPlayerJoinZone(client, player.currentZone);

    console.log(`🏁 Player join terminé pour ${username}`);
  }

  async onLeave(client: Client) {
    console.log(`📤 === PLAYER LEAVE ===`);
    console.log(`🆔 Session: ${client.sessionId}`);
    
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 Joueur qui part: ${player.name}`);
      console.log(`📍 Position finale: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      
      // Laisser le ZoneManager gérer la sortie
      this.zoneManager.onPlayerLeaveZone(client, player.currentZone);
      
      // Sauvegarder et nettoyer
      await this.savePlayer(player);
      this.movementController?.resetPlayer?.(client.sessionId);
      this.state.players.delete(client.sessionId);
      
      console.log(`✅ Joueur ${player.name} supprimé. Restants: ${this.state.players.size}`);
    } else {
      console.warn(`⚠️ Aucun joueur trouvé pour session ${client.sessionId}`);
    }
  }

  // ===== UTILITY METHODS =====

  private async savePlayer(player: Player) {
    // TODO: Implémenter sauvegarde DB
    console.log(`💾 Sauvegarde joueur: ${player.name} à (${player.x}, ${player.y}) dans ${player.currentZone}`);
  }

  private async saveAllPlayers() {
    console.log(`💾 Sauvegarde automatique de ${this.state.players.size} joueurs...`);
    for (const player of this.state.players.values()) {
      await this.savePlayer(player);
    }
  }

  private debugPlayer(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (player) {
      console.log(`🔍 === DEBUG PLAYER ===`);
      console.log(`👤 Name: ${player.name}`);
      console.log(`🆔 Session: ${sessionId}`);
      console.log(`📍 Position: (${player.x}, ${player.y})`);
      console.log(`🌍 Zone: ${player.currentZone}`);
      console.log(`📊 Team size: ${player.team.length}`);
      console.log(`🏃 Moving: ${player.isMoving}`);
      console.log(`➡️ Direction: ${player.direction}`);
    } else {
      console.log(`❌ Player not found: ${sessionId}`);
    }
  }

  onDispose() {
    console.log(`🗑️ WorldRoom dispose: ${this.channelId}`);
    this.saveAllPlayers();
  }
}
