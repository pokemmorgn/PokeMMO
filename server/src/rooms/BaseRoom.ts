// ===============================================
// BaseRoom.ts - Classe parent pour toutes les rooms
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager, NpcData } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController"; // <-- à créer/importer
import { InteractionManager } from "../managers/InteractionManager";

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
  protected interactionManager: InteractionManager;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    // Initialise le NpcManager
    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    console.log(`[${this.mapName}] NPCs chargés :`, this.npcManager.getAllNpcs());

    this.interactionManager = new InteractionManager(this.npcManager);
    // Initialise le MovementController (collision simple ou à améliorer plus tard)
    this.movementController = new MovementController();

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000);

    this.onMessage("npcInteract", (client, data: { npcId: number }) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;
  const result = this.interactionManager.handleNpcInteraction(player, data.npcId);
  client.send("npcInteractionResult", result);
  });
    
    // Handler pour les mouvements avec MovementController
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Passage par MovementController pour valider (vitesse, tp, etc.)
        const moveResult = this.movementController.handleMove(client.sessionId, player, data);

        player.x = moveResult.x;
        player.y = moveResult.y;
        if ('direction' in moveResult) player.direction = moveResult.direction;
        if ('isMoving' in moveResult) player.isMoving = moveResult.isMoving;

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


const player = this.state.players.get(client.sessionId);
if (player) {
  const result = this.movementController.handleMove(
    client.sessionId,
    player,
    { x: targetX, y: targetY, direction: player.direction, isMoving: false },
    true // <- skipAnticheat !
  );
  player.x = result.x;
  player.y = result.y;
  player.direction = result.direction;
  player.isMoving = result.isMoving;

  // Envoie un message au client pour confirmer le TP
  client.send("teleported", { x: result.x, y: result.y });

  // (Seulement si tu retires le joueur ensuite, sinon pas besoin)
  this.state.players.delete(client.sessionId);
  this.movementController?.resetPlayer?.(client.sessionId);

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
        // Optionnel : reset MovementController
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
      this.movementController?.resetPlayer?.(client.sessionId);
      console.log(`[${this.mapName}] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
      this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {
    console.log(`[${this.mapName}] Room fermée - sauvegarde finale`);
    await this.saveAllPlayers();
  }
}
