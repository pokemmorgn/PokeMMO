// ===============================================
// BaseRoom.ts - Classe parent pour toutes les rooms
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;
  
  // Propriétés abstraites que chaque room enfant doit définir
  protected abstract roomName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;

  // Méthode abstraite pour calculer les positions de spawn selon la zone cible
  protected abstract calculateSpawnPosition(targetZone: string): { x: number, y: number };

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    console.log(`🔥 DEBUT onCreate ${this.roomName}`);

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000);

    // Handler pour les mouvements
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        // Propriétés optionnelles
        if ('direction' in data) player.direction = data.direction;
        if ('isMoving' in data) player.isMoving = data.isMoving;
      }
    });

    // Handler pour les changements de zone
    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      console.log(`[${this.roomName}] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // Calcul position spawn dans la zone cible
      const spawnPosition = this.calculateSpawnPosition(data.targetZone);

      // Supprime joueur de cette room (transition)
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[${this.roomName}] Joueur ${client.sessionId} supprimé pour transition`);

        // Sauvegarde position + map cible dans la DB
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
        );
        console.log(`[${this.roomName}] Sauvegarde position et map (${spawnPosition.x}, ${spawnPosition.y}) dans ${data.targetZone} pour ${player.name}`);
      }

      // Envoi confirmation au client
      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: this.roomName.replace('Room', 'Scene'), // BeachRoom -> BeachScene
        direction: data.direction,
        spawnX: spawnPosition.x,
        spawnY: spawnPosition.y
      });

      console.log(`[${this.roomName}] Transition envoyée: ${data.targetZone} à (${spawnPosition.x}, ${spawnPosition.y})`);
    });

    console.log(`[${this.roomName}] Room créée :`, this.roomId);
    console.log(`🔥 FIN onCreate ${this.roomName}`);
  }

  async saveAllPlayers() {
    console.log(`🟡🟡🟡 saveAllPlayers APPELEE pour ${this.roomName}`);
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
          { $set: { lastX: player.x, lastY: player.y, lastMap: this.roomName.replace('Room', '') } }
        );
        
        console.log(`✅ ${player.name} sauvegardé - MongoDB result:`, result.modifiedCount);
      }
      console.log('✅ saveAllPlayers terminée');
    } catch (error) {
      console.error(`❌ Erreur saveAllPlayers ${this.roomName}:`, error);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`🔍 DEBUG onJoin ${this.roomName} - options reçues:`, options);
    
    const username = options.username || "Anonymous";
    console.log('🔍 DEBUG username utilisé:', username);
    
    // Vérifie si joueur avec même nom existe déjà, supprime-le si oui
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[${this.roomName}] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }
    
    // Recherche les données sauvegardées
    console.log('🔍 DEBUG - Recherche playerData pour username:', username);
    let playerData = await PlayerData.findOne({ username });
    console.log('🔍 DEBUG - playerData trouvé:', playerData);
    
    if (!playerData) {
      console.log('🔍 DEBUG - Création nouveau playerData');
      const mapName = this.roomName.replace('Room', '');
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
      console.log(`[${this.roomName}] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[${this.roomName}] ${username} spawn à position sauvegardée (${player.x}, ${player.y})`);
    }
    
    player.map = this.roomName.replace('Room', '');
    this.state.players.set(client.sessionId, player);
    console.log(`[${this.roomName}] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
      });
      console.log(`[${this.roomName}] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
      this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {
    console.log(`[${this.roomName}] Room fermée - sauvegarde finale`);
    await this.saveAllPlayers();
  }
}
