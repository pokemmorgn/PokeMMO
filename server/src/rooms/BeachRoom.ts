// ===============================================
// BeachRoom.ts - Version corrigée avec sauvegarde
// ===============================================
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class BeachRoom extends Room<PokeWorldState> {
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    console.log('🔥 DEBUT onCreate BeachRoom');
    
    // ✅ Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      console.log(`🔥🔥🔥 TIMER - Appel saveAllPlayers - ${new Date().toISOString()}`);
      this.saveAllPlayers();
    }, 30000); // 30 secondes

    this.onMessage("move", (client, data: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });

    this.onMessage("changeZone", (client, data: { targetZone: string, direction: string }) => {
      console.log(`[BeachRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // ✅ AJOUT : Calculer la position de spawn dans la zone cible
      let spawnX = 100, spawnY = 100; // Position par défaut
      
      if (data.targetZone === 'VillageScene') {
        // Position d'entrée depuis la plage vers le village
        spawnX = 150;
        spawnY = 200;
      }

      // ✅ AJOUT : Supprimer immédiatement le joueur de cette room
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[BeachRoom] Joueur ${client.sessionId} supprimé pour transition`);
      }

      // Envoie la confirmation de changement au client
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

  // ✅ AJOUT : Méthode de sauvegarde automatique
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
    
    // ✅ AJOUT : Vérifier s'il n'y a pas déjà un joueur avec ce username
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      // Supprimer l'ancien joueur avec le même username
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[BeachRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }
    
    // Charge ou crée le player
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
    
    // ✅ AJOUT : Utiliser les coordonnées de spawn si fournies (transition depuis autre zone)
    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[BeachRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      // Position par défaut ou dernière position sauvée
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`🔍 DEBUG - Position depuis DB: (${playerData.lastX}, ${playerData.lastY})`);
      console.log(`🔍 DEBUG - Position assignée au player: (${player.x}, ${player.y})`);
      console.log(`[BeachRoom] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
    }
    
    player.map = "Beach";
    this.state.players.set(client.sessionId, player);
    console.log(`[BeachRoom] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Sauvegarde en base
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: "Beach" }
      });
      console.log(`[BeachRoom] ${player.name} a quitté (sauvé à ${player.x}, ${player.y})`);
      this.state.players.delete(client.sessionId);
    }
  }

  async onDispose() {
    console.log("[BeachRoom] Room fermée - sauvegarde finale");
    await this.saveAllPlayers();
  }
}