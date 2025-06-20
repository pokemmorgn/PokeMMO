// ===== server/src/rooms/WorldRoom.ts =====
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";
import { InventoryManager } from "../managers/InventoryManager"; 

export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  
  // Limite pour auto-scaling
  maxClients = 50;

  onCreate(options: any) {
    console.log(`🌍 === WORLDROOM CRÉATION ===`);
    console.log(`📊 Options:`, options);

    // Initialiser le state
    this.setState(new PokeWorldState());
    console.log(`✅ State initialisé`);

    // Initialiser le ZoneManager
    this.zoneManager = new ZoneManager(this);
    console.log(`✅ ZoneManager initialisé`);

    // Messages handlers
    this.setupMessageHandlers();
    console.log(`✅ Message handlers configurés`);

    console.log(`🚀 WorldRoom prête ! MaxClients: ${this.maxClients}`);
  }

  private setupMessageHandlers() {
    console.log(`📨 === SETUP MESSAGE HANDLERS ===`);

    // Mouvement du joueur
    this.onMessage("playerMove", (client, data) => {
      this.handlePlayerMove(client, data);
    });

    // Transition entre zones
    this.onMessage("moveToZone", (client, data) => {
      console.log(`🌀 === ZONE TRANSITION REQUEST ===`);
      console.log(`👤 From: ${client.sessionId}`);
      console.log(`📍 Data:`, data);
      this.zoneManager.handleZoneTransition(client, data);
    });

    // Interaction avec NPC
    this.onMessage("npcInteract", (client, data) => {
      console.log(`💬 === NPC INTERACTION REQUEST ===`);
      this.zoneManager.handleNpcInteraction(client, data.npcId);
    });

    // Démarrage de quête
    this.onMessage("questStart", (client, data) => {
      console.log(`🎯 === QUEST START REQUEST ===`);
      this.zoneManager.handleQuestStart(client, data.questId);
    });

    console.log(`✅ Tous les handlers configurés`);
  }

  async onJoin(client: Client, options: any = {}) {
    console.log(`👤 === PLAYER JOIN ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`📊 Options:`, options);

    try {
      // Créer le joueur
      const player = new Player();
      
      // Données de base
      player.id = client.sessionId;
      player.name = options.name || `Player_${client.sessionId.substring(0, 6)}`;
      player.x = options.spawnX || 52;
      player.y = options.spawnY || 48;
      
      // Zone de spawn
      player.currentZone = options.spawnZone || "beach";
      console.log(`🌍 Zone de spawn: ${player.currentZone}`);
      
      // Compatibilité avec l'ancien système
      player.map = player.currentZone; // Compatibilité
      
      // Ajouter au state
      this.state.players.set(client.sessionId, player);
      
      console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`✅ Joueur ${player.name} créé`);

try {
  const inv = await InventoryManager.addItem(player.name, "poke_ball", 5);

  // OU : groupé par poche (prêt pour une UI avec onglets)
  const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
  console.log(`🎒 [INVENTAIRE groupé par poche] ${player.name}:`, grouped);

} catch (err) {
  console.error(`❌ [INVENTAIRE] Erreur d'ajout d'objet pour ${player.name}:`, err);
}

      
      // Faire entrer le joueur dans sa zone initiale
      await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
      
      console.log(`🎉 ${player.name} a rejoint le monde !`);

    } catch (error) {
      console.error(`❌ Erreur lors du join:`, error);
      
      // En cas d'erreur, faire quitter le client
      client.leave(1000, "Erreur lors de la connexion");
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 === PLAYER LEAVE ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`✅ Consenti: ${consented}`);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`📍 Position finale: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      
      // Notifier la zone que le joueur part
      this.zoneManager.onPlayerLeaveZone(client, player.currentZone);
      
      // Supprimer du state
      this.state.players.delete(client.sessionId);
      console.log(`🗑️ Joueur ${player.name} supprimé du state`);
    }

    console.log(`👋 Client ${client.sessionId} déconnecté`);
  }

  onDispose() {
    console.log(`💀 === WORLDROOM DISPOSE ===`);
    console.log(`👥 Joueurs restants: ${this.state.players.size}`);
    
    // Sauvegarder les données des joueurs restants
    this.state.players.forEach((player, sessionId) => {
      console.log(`💾 Sauvegarde joueur: ${player.name} à (${player.x}, ${player.y}) dans ${player.currentZone}`);
    });

    console.log(`✅ WorldRoom fermée`);
  }

  private handlePlayerMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Mettre à jour la position
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;

    // Debug occasionnel (1 fois sur 10)
    if (Math.random() < 0.1) {
    //  console.log(`🚶 ${player.name}: (${player.x}, ${player.y})`);
    console.log(`🌍 ${player.name}:  Zone: ${player.currentZone}`);
    }
  }
}
