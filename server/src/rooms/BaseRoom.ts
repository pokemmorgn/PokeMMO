// server/src/rooms/BaseRoom.ts - VERSION SIMPLIFIÉE
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager } from "../managers/NPCManager";
import { QuestManager } from "../managers/QuestManager";
import { MovementController } from "../controllers/MovementController";
import { InteractionManager } from "../managers/InteractionManager";

import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { convertOwnedPokemonToTeam } from "../utils/convertOwnedPokemonToTeam";
import { giveStarterToPlayer } from "../services/PokemonService";
import { ArraySchema } from "@colyseus/schema";

export type SpawnData = {
  targetZone: string;
  targetSpawn?: string;
  targetX?: number;
  targetY?: number;
  fromZone?: string;
};

// ✅ NOUVEAU : Interface pour les demandes de transition
interface TransitionRequest {
  targetZone: string;
  targetRoom: string;
  spawnPoint?: string;
  targetX?: number;
  targetY?: number;
  fromZone: string;
}

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;

  public abstract mapName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;

  protected npcManager: NpcManager;
  protected questManager: QuestManager;
  public movementController: MovementController;
  protected interactionManager: InteractionManager;

  onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    // Initialisation des managers
    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    this.questManager = new QuestManager(`../data/quests/quests.json`);
    this.interactionManager = new InteractionManager(this.npcManager, this.questManager);
    this.movementController = new MovementController();

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      this.saveAllPlayers();
    }, 30000);

    // === HANDLERS DE MESSAGES ===

    // ✅ NOUVEAU : Handler pour les demandes de transition
    this.onMessage("requestTransition", (client: Client, data: TransitionRequest) => {
      this.handleTransitionRequest(client, data);
    });

    // Handler pour interaction NPC avec quêtes
    this.onMessage("npcInteract", async (client: Client, data: { npcId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      const result = await this.interactionManager.handleNpcInteraction(player, data.npcId);
      client.send("npcInteractionResult", { ...result, npcId: data.npcId });
    });

    // === HANDLERS SPÉCIFIQUES AUX QUÊTES ===

    this.onMessage("startQuest", async (client: Client, data: { questId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const result = await this.interactionManager.handleQuestStart(player.name, data.questId);
      client.send("questStartResult", result);

      if (result.success) {
        this.broadcast("questUpdate", {
          player: player.name,
          action: "started",
          questId: data.questId
        }, { except: client });
      }
    });

    this.onMessage("getActiveQuests", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const activeQuests = await this.questManager.getActiveQuests(player.name);
      client.send("activeQuestsList", { quests: activeQuests });
    });

    this.onMessage("getAvailableQuests", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const availableQuests = await this.questManager.getAvailableQuests(player.name);
      client.send("availableQuestsList", { quests: availableQuests });
    });

    this.onMessage("questProgress", async (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const results = await this.interactionManager.updatePlayerProgress(
        player.name, 
        data.type, 
        data
      );

      if (results.length > 0) {
        client.send("questProgressUpdate", results);
        
        for (const result of results) {
          if (result.rewards && result.rewards.length > 0) {
            client.send("questRewards", {
              questId: result.questId,
              rewards: result.rewards,
              message: result.message
            });
          }
        }
      }
    });

    // === HANDLERS EXISTANTS ===

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

        // Vérifier la progression des quêtes de type "reach"
        this.handleZoneReachProgress(player.name, player.x, player.y);
      }
    });

    // ===== MESSAGE HANDLERS POUR LA SÉLECTION DE STARTER =====
    
    this.onMessage("selectStarter", async (client: Client, data: { starterId: 1 | 4 | 7 }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🎯 ${player.name} choisit le starter ${data.starterId}`);

      try {
        const playerData = await PlayerData.findOne({ username: player.name });
        if (!playerData) {
          client.send("starterSelectionResult", { 
            success: false, 
            message: "Erreur: données joueur non trouvées" 
          });
          return;
        }

        if (playerData.team && playerData.team.length > 0) {
          client.send("starterSelectionResult", { 
            success: false, 
            message: "Vous avez déjà choisi votre starter!" 
          });
          return;
        }

        const starterPokemon = await giveStarterToPlayer(player.name, data.starterId);
        
        playerData.team = [starterPokemon._id];
        await playerData.save();

        const teamPokemons = await OwnedPokemon.find({ _id: { $in: playerData.team } });
        player.team = new ArraySchema(...teamPokemons.map(convertOwnedPokemonToTeam));

        const starterNames = { 1: "Bulbasaur", 4: "Charmander", 7: "Squirtle" };
        
        client.send("starterSelectionResult", {
          success: true,
          message: `Félicitations! Vous avez choisi ${starterNames[data.starterId]}!`,
          pokemon: {
            id: starterPokemon._id.toString(),
            pokemonId: starterPokemon.pokemonId,
            name: starterNames[data.starterId],
            level: starterPokemon.level,
            shiny: starterPokemon.shiny,
            nature: starterPokemon.nature,
            moves: starterPokemon.moves,
            nickname: starterPokemon.nickname,
            gender: starterPokemon.gender
          }
        });

        console.log(`✅ ${player.name} a reçu ${starterNames[data.starterId]}`);
        this.triggerTutorialQuest(client, player.name);

      } catch (error) {
        console.error(`❌ Erreur sélection starter pour ${player.name}:`, error);
        client.send("starterSelectionResult", { 
          success: false, 
          message: "Erreur lors de la sélection du starter" 
        });
      }
    });

    this.onMessage("requestStarterSelection", async (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const playerData = await PlayerData.findOne({ username: player.name });
      const canSelect = !playerData || !playerData.team || playerData.team.length === 0;

      if (canSelect) {
        client.send("showStarterSelection", {
          starters: [
            {
              id: 1,
              name: "Bulbasaur",
              types: ["Grass", "Poison"],
              description: "Un Pokémon Graine robuste et fiable"
            },
            {
              id: 4,
              name: "Charmander",
              types: ["Fire"],
              description: "Un Pokémon Lézard fougueux et courageux"
            },
            {
              id: 7,
              name: "Squirtle",
              types: ["Water"],
              description: "Un Pokémon Minitortue calme et stratégique"
            }
          ]
        });
      } else {
        client.send("starterSelectionResult", { 
          success: false, 
          message: "Vous avez déjà un Pokémon!" 
        });
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE : Gérer les demandes de transition (validation simple)
  private handleTransitionRequest(client: Client, request: TransitionRequest) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      client.send("transitionDenied", { reason: "Player not found" });
      return;
    }

    console.log(`🌀 [${this.mapName}] Demande de transition de ${player.name}:`, request);

    // === VALIDATION 1 : Destination valide ===
    const validDestinations = this.getValidDestinations();
    if (!validDestinations.includes(request.targetZone)) {
      console.warn(`❌ Destination invalide: ${request.targetZone}`);
      client.send("transitionDenied", { reason: "Invalid destination" });
      return;
    }

    // === VALIDATION 2 : Anti-spam ===
    const now = Date.now();
    const lastTransition = (player as any).lastTransitionTime || 0;
    if (now - lastTransition < 1000) { // Cooldown 1 seconde
      console.warn(`❌ Transition trop rapide pour ${player.name}`);
      client.send("transitionDenied", { reason: "Transition cooldown" });
      return;
    }

    // === VALIDATION 3 : État du joueur ===
    if ((player as any).isInBattle) {
      client.send("transitionDenied", { reason: "Cannot transition during battle" });
      return;
    }

    // === VALIDATION 4 : Proximité (simple) ===
    const nearTransition = this.isPlayerNearTransition(player.x, player.y);
    if (!nearTransition) {
      console.warn(`❌ ${player.name} pas près d'une zone de transition`);
      client.send("transitionDenied", { reason: "Not near transition zone" });
      return;
    }

    // ✅ TRANSITION APPROUVÉE
    (player as any).lastTransitionTime = now;
    
    console.log(`✅ [${this.mapName}] Transition approuvée pour ${player.name} vers ${request.targetZone}`);
    client.send("transitionApproved", { 
      approved: true,
      transitionData: request 
    });

    // Sauvegarder la nouvelle position dans la DB
    this.updatePlayerLocation(player.name, request);
  }

  // ✅ Définir les destinations valides pour chaque zone
  private getValidDestinations(): string[] {
    // Mapping simple basé sur le nom de la room
    const connections: Record<string, string[]> = {
      'BeachRoom': ['VillageScene'],
      'VillageRoom': ['BeachScene', 'VillageLabScene', 'Road1Scene', 'VillageHouse1Scene'],
      'VillageLabRoom': ['VillageScene'],
      'VillageHouse1Room': ['VillageScene'],
      'Road1Room': ['VillageScene', 'LavandiaScene'],
      'LavandiaRoom': ['Road1Scene']
    };
    
    return connections[this.mapName] || [];
  }

  // ✅ Vérification de proximité simple (remplace le MapManager complexe)
  private isPlayerNearTransition(playerX: number, playerY: number): boolean {
    // Zones de transition connues pour chaque map (positions approximatives)
    const transitionZones = this.getTransitionZonesForMap();
    
    return transitionZones.some(zone => {
      const distance = Math.sqrt(
        Math.pow(playerX - zone.x, 2) + 
        Math.pow(playerY - zone.y, 2)
      );
      return distance <= zone.radius;
    });
  }

  // ✅ Définition simple des zones de transition (remplace MapManager)
  private getTransitionZonesForMap(): Array<{x: number, y: number, radius: number}> {
    const zones: Record<string, Array<{x: number, y: number, radius: number}>> = {
      'BeachRoom': [
        { x: 500, y: 300, radius: 80 }   // Vers Village
      ],
      'VillageRoom': [
        { x: 200, y: 500, radius: 80 },  // Vers Beach
        { x: 248, y: 330, radius: 80 },  // Vers Lab
        { x: 400, y: 200, radius: 80 },  // Vers Route1
        { x: 181, y: 250, radius: 80 }   // Vers House1
      ],
      'VillageLabRoom': [
        { x: 200, y: 350, radius: 80 }   // Vers Village
      ],
      'VillageHouse1Room': [
        { x: 180, y: 280, radius: 80 }   // Vers Village
      ],
      'Road1Room': [
        { x: 337, y: 600, radius: 80 },  // Vers Village
        { x: 198, y: 50, radius: 80 }    // Vers Lavandia
      ],
      'LavandiaRoom': [
        { x: 56, y: 900, radius: 80 }    // Vers Route1
      ]
    };

    return zones[this.mapName] || [];
  }

  // ✅ Sauvegarde de la position (simplifié)
  private async updatePlayerLocation(playerName: string, request: TransitionRequest) {
    try {
      const targetMapName = request.targetZone.replace('Scene', '');
      await PlayerData.updateOne(
        { username: playerName },
        { 
          $set: { 
            lastMap: targetMapName,
            lastX: request.targetX || this.defaultX,
            lastY: request.targetY || this.defaultY
          } 
        }
      );
      console.log(`💾 Position sauvegardée pour ${playerName}: ${targetMapName}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde position:', error);
    }
  }

  // === MÉTHODES UTILITAIRES POUR LES QUÊTES ===

  private async triggerTutorialQuest(client: Client, username: string): Promise<void> {
    try {
      const tutorialQuest = await this.questManager.startQuest(username, "tutorial_first_steps");
      if (tutorialQuest) {
        client.send("questStarted", {
          quest: tutorialQuest,
          message: "Nouvelle quête disponible !"
        });
      }
    } catch (error) {
      console.error("❌ Erreur démarrage quête tutoriel:", error);
    }
  }

  private async handleZoneReachProgress(username: string, x: number, y: number): Promise<void> {
    const currentMap = this.mapName.replace('Room', '').toLowerCase();
    
    await this.interactionManager.updatePlayerProgress(username, 'reach', {
      zoneId: currentMap,
      x: x,
      y: y,
      map: currentMap
    });
  }

  // === MÉTHODES EXISTANTES CONSERVÉES ===

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
    console.log("🔥 [onJoin] Nouvelle connexion !", options.username);
    const username = options.username || "Anonymous";
    
    // Envoyer les NPCs
    const availableQuests = await this.questManager.getAvailableQuests(username);
    const rawNpcs = this.npcManager.getAllNpcs();
    const npcListWithQuests = rawNpcs.map(npc => {
      const questsForNpc = availableQuests.filter(q => q.startNpcId === npc.id);
      return {
        ...npc,
        availableQuests: questsForNpc.map(q => q.id),
      };
    });
    client.send("npcList", npcListWithQuests);

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
    let isNewPlayer = false;

    if (!playerData) {
      isNewPlayer = true;
      const mapName = this.mapName.replace('Room', '');
      playerData = await PlayerData.create({
        username,
        lastX: this.defaultX,
        lastY: this.defaultY,
        lastMap: mapName,
        team: []
      });
      console.log(`👤 Nouveau joueur créé: ${username}`);
    }

    // === Récupération des Pokémon de la team ===
    let teamPokemons: IOwnedPokemon[] = [];
    if (playerData.team && playerData.team.length > 0) {
      teamPokemons = await OwnedPokemon.find({ _id: { $in: playerData.team } });
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

    // === Injection de la team ===
    player.team = new ArraySchema(...teamPokemons.map(convertOwnedPokemonToTeam));

    this.state.players.set(client.sessionId, player);

    // === ENVOI DES QUÊTES AU CLIENT ===
    const activeQuests = await this.questManager.getActiveQuests(username);
    if (activeQuests.length > 0) {
      client.send("activeQuestsList", { quests: activeQuests });
    }

    // === GESTION DU HUD DE STARTER ===
    if (isNewPlayer || teamPokemons.length === 0) {
      console.log(`🎁 Affichage du HUD de sélection de starter pour ${username}`);
      
      this.clock.setTimeout(() => {
        client.send("showStarterSelection", {
          isNewPlayer: isNewPlayer,
          message: isNewPlayer 
            ? `Bienvenue dans le monde Pokémon, ${username}! Choisissez votre premier compagnon :`
            : `Bon retour, ${username}! Vous devez choisir votre Pokémon :`,
          starters: [
            {
              id: 1,
              name: "Bulbasaur",
              types: ["Grass", "Poison"],
              description: "Un Pokémon Graine robuste et fiable. Bon pour débuter !",
              sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
            },
            {
              id: 4,
              name: "Charmander",
              types: ["Fire"],
              description: "Un Pokémon Lézard fougueux et courageux. Parfait pour l'attaque !",
              sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png"
            },
            {
              id: 7,
              name: "Squirtle",
              types: ["Water"],
              description: "Un Pokémon Minitortue calme et stratégique. Excellent en défense !",
              sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png"
            }
          ]
        });
      }, 500);

    } else {
      client.send("welcomeMessage", {
        message: `Bon retour, ${username}!`,
        isNewPlayer: false,
        teamCount: teamPokemons.length
      });
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
  }
}
