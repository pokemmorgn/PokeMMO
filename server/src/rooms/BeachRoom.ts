// ===============================================
// BeachRoom.ts - Version corrigée avec sauvegarde map + position
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class BeachRoom extends Room<PokeWorldState> {
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    console.log('🔥 DEBUT onCreate BeachRoom');

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000);

    this.onMessage("move", (client, data) => {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    player.x = data.x;
    player.y = data.y;
    // Ajoute ces lignes :
    if ('direction' in data) player.direction = data.direction;
    if ('isMoving' in data) player.isMoving = data.isMoving;
  }
});


    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      console.log(`[BeachRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // Calcul position spawn dans la zone cible
      let spawnX = 100, spawnY = 100; // Position par défaut
      
      if (data.targetZone === 'VillageScene') {
        spawnX = 150;
        spawnY = 200;
      }

      // Supprime joueur de cette room (transition)
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[BeachRoom] Joueur ${client.sessionId} supprimé pour transition`);

        // Sauvegarde position + map cible dans la DB
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnX, lastY: spawnY, lastMap: data.targetZone } }
        );
        console.log(`[BeachRoom] Sauvegarde position et map (${spawnX}, ${spawnY}) dans ${data.targetZone} pour ${player.name}`);
      }

      // Envoi confirmation au client
      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: "BeachScene",
        direction: data.direction,
        spawnX: spawnX,
        spawnY: spawnY
      });

      console.log(`[BeachRoom] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
    });

    console.log("[BeachRoom] Room créée :", this.roomId);
    console.log('🔥 FIN onCreate BeachRoom');
  }

  async saveAllPlayers() {
    console.log('🟡🟡🟡 saveAllPlayers APPELEE');
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
          { $set: { lastX: player.x, lastY: player.y, lastMap: "Beach" } }
        );
        
        console.log(`✅ ${player.name} sauvegardé - MongoDB result:`, result.modifiedCount);
      }
      console.log('✅ saveAllPlayers terminée');
    } catch (error) {
      console.error('❌ Erreur saveAllPlayers:', error);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log('🔍 DEBUG onJoin - options reçues:', options);
    
    const username = options.username || "Anonymous";
    console.log('🔍 DEBUG username utilisé:', username);
    
    // Vérifie si joueur avec même nom existe déjà, supprime-le si oui
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[BeachRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }
    
    // Recherche les données sauvegardées
    console.log('🔍 DEBUG - Recherche playerData pour username:', username);
    let playerData = await PlayerData.findOne({ username });
    console.log('🔍 DEBUG - playerData trouvé:', playerData);
    
    if (!playerData) {
      console.log('🔍 DEBUG - Création nouveau playerData');
      playerData = await PlayerData.create({ username, lastX: 52, lastY: 48, lastMap: "Beach" });
      console.log('🔍 DEBUG - Nouveau playerData créé:', playerData);
    }
    
    const player = new Player();
    player.name = username;
    
    // Spawn depuis transition ou depuis la dernière position sauvegardée
    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[BeachRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[BeachRoom] ${username} spawn à position sauvegardée (${player.x}, ${player.y})`);
    }
    
    player.map = "Beach";
    this.state.players.set(client.sessionId, player);
    console.log(`[BeachRoom] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

async onLeave(client: Client) {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    await PlayerData.updateOne({ username: player.name }, {
      $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
    });
    console.log(`[BeachRoom] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
    this.state.players.delete(client.sessionId);
  }
}


  async onDispose() {
    console.log("[BeachRoom] Room fermée - sauvegarde finale");
    await this.saveAllPlayers();
  }
}
