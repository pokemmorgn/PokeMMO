// ===============================================
// BaseRoom.ts - Classe parent pour toutes les rooms
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager, NpcData } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController";
// TODO: Adapter le chemin et le nom si tu as un MapManager (sinon à remplacer par un stub/minimum)

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;

  // Propriétés abstraites que chaque room enfant doit définir
  protected abstract mapName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;

  // Méthode abstraite pour calculer les positions de spawn selon la zone cible
  protected abstract calculateSpawnPosition(targetZone: string): { x: number, y: number };

  protected npcManager: NpcManager;
  protected movementController: MovementController;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    // Initialise le NpcManager
    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    console.log(`[${this.mapName}] NPCs chargés :`, this.npcManager.getAllNpcs());

    // Initialise la MapManager et MovementController
    this.mapManager = new MapManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    this.movementController = new MovementController(this.mapManager);

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000);

    // Handler pour les mouvements sécurisé par MovementController
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // ✅ Utilise le MovementController pour valider
        const moveResult = this.movementController.handleMove(client.sessionId, player, data);

        player.x = moveResult.x;
        player.y = moveResult.y;
        // Propriétés optionnelles
        if ("direction" in moveResult) player.direction = moveResult.direction;
        if ("isMoving" in moveResult) player.isMoving = moveResult.isMoving;

        // Notifie le client en cas de snap/correction
        if (moveResult.snapped) {
          client.send("snap", { x: moveResult.x, y: moveResult.y });
        }
      }
    });

    // Handler pour les changements de zone (inchangé)
    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      console.log(`[${this.mapName}] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // Calcul position spawn dans la zone cible
      const spawnPosition = this.calculateSpawnPosition(data.targetZone);

      // Supprime joueur de cette room (transition)
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[${this.mapName}] Joueur ${client.sessionId} supprimé pour transition`);

        // Sauvegarde position + map cible dans la DB
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
        );
        console.log(`[${this.mapName}] Sauvegarde position et map (${spawnPosition.x}, ${spawnPosition.y}) dans ${data.targetZone} pour ${player.name}`);
      }

      // Envoi confirmation au client
      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: this.mapName.replace('Room', 'Scene'), // BeachRoom -> BeachScene
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

    if (this.state.players.size === 0) {
      console.log('🟡 Aucun joueur à sauvegarder');
      return;
    }

    try {
      for (const [sessionId, player] of this.state.players) {
        console.log(`🟡 Sauvegarde ${player.name} à (${player.x}, ${player.y})`);

        const result = await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: player.x, lastY: player.y, lastMap: this.mapName.replace('Room', '') } }
        );

        console.log(`✅ ${player.name} sauvegardé - MongoDB result:`, result.modifiedCount);
      }
      console.log('✅ saveAllPlayers terminée');
    } catch (error) {
      console.error(`❌ Erreur saveAllPlayers ${this.mapName}:`, error);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`🔍 DEBUG onJoin ${this.mapName} - options reçues:`, options);

    const username = options.username || "Anonymous";
    console.log('🔍 DEBUG username utilisé:', username);

    client.send("npcList", this.npcManager.getAllNpcs());
    // Vérifie si joueur avec même nom existe déjà, supprime-le si oui
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        // Optionnel : reset le MovementController pour éviter les "ghost snaps"
        this.movementController?.resetPlayer?.(oldSessionId);
        console.log(`[${this.mapName}] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }

    // Recherche les données sauvegardées
    console.log('🔍 DEBUG - Recherche playerData pour username:', username);
    let playerData = await PlayerData.findOne({ username });
    console.log('🔍 DEBUG - playerData trouvé:', playerData);

    if (!playerData) {
      console.log('🔍 DEBUG - Création nouveau playerData');
      const mapName = this.mapName.replace('Room', '');
      playerData = await PlayerData.create({
        username,
        lastX: this.defaultX,
        lastY: this.defaultY,
        lastMap: mapName
      });
      console.log('🔍 DEBUG - Nouveau playerData créé:', playerData);
    }

    const player = new Player();
    player.name = username;

    // Spawn depuis transition ou depuis la dernière position sauvegardée
    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[${this.mapName}] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[${this.mapName}] ${username} spawn à position sauvegardée (${player.x}, ${player.y})`);
    }

    player.map = this.mapName.replace('Room', '');
    this.state.players.set(client.sessionId, player);
    console.log(`[${this.mapName}] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
      });
      this.movementController?.resetPlayer?.(client.sessionId); // Nettoie les traces de mouvements
      console.log(`[${this.mapName}] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
      this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {
    console.log(`[${this.mapName}] Room fermée - sauvegarde finale`);
    await this.saveAllPlayers();
  }
}
