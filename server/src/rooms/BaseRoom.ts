import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";
import { NpcManager } from "../managers/NPCManager";
import { MovementController } from "../controllers/MovementController";
import { TransitionController } from "../controllers/TransitionController";
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

export abstract class BaseRoom extends Room<PokeWorldState> {
  maxClients = 100;

  public abstract mapName: string;
  protected abstract defaultX: number;
  protected abstract defaultY: number;

  protected npcManager: NpcManager;
  public movementController: MovementController;
  public transitionController: TransitionController;
  protected interactionManager: InteractionManager;

  // Méthode abstraite à implémenter dans chaque room fille
  public abstract calculateSpawnPosition(spawnData: SpawnData): { x: number; y: number };

  onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log(`🔥 DEBUT onCreate ${this.mapName}`);

    this.npcManager = new NpcManager(`../assets/maps/${this.mapName.replace('Room', '').toLowerCase()}.tmj`);
    this.interactionManager = new InteractionManager(this.npcManager);
    this.movementController = new MovementController();
    this.transitionController = new TransitionController(this);

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      this.saveAllPlayers();
    }, 30000);

    this.onMessage("npcInteract", (client: Client, data: { npcId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const result = this.interactionManager.handleNpcInteraction(player, data.npcId);
      client.send("npcInteractionResult", result);
    });

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
      }
    });

    this.onMessage("changeZone", (client: Client, data: any) => {
      this.transitionController.handleTransition(client, data);
    });

    // ===== MESSAGE HANDLERS POUR LA SÉLECTION DE STARTER =====
    
    this.onMessage("selectStarter", async (client: Client, data: { starterId: 1 | 4 | 7 }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🎯 ${player.name} choisit le starter ${data.starterId}`);

      try {
        // Vérifier si le joueur peut encore choisir un starter
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

        // Donner le starter choisi
        const starterPokemon = await giveStarterToPlayer(player.name, data.starterId);
        
        // Mettre à jour la team du joueur
        playerData.team = [starterPokemon._id];
        await playerData.save();

        // Recharger la team dans le state
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

        console.log(`✅ ${player.name} a reçu ${starterNames[data.starterId]} (niveau ${starterPokemon.level}, shiny: ${starterPokemon.shiny})`);

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

      // Vérifier si le joueur peut choisir un starter
      const playerData = await PlayerData.findOne({ username: player.name });
      const canSelect = !playerData || !playerData.team || playerData.team.length === 0;

      if (canSelect) {
        // Envoyer les données des starters disponibles
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
    client.send("npcList", this.npcManager.getAllNpcs());

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

    // === Récupération des Pokémon de la team depuis la BDD ===
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

    // === Injection de la team synchronisée ===
    player.team = new ArraySchema(...teamPokemons.map(convertOwnedPokemonToTeam));

    this.state.players.set(client.sessionId, player);

    // ===== GESTION DE L'AFFICHAGE DU HUD DE STARTER =====
    
    if (isNewPlayer || teamPokemons.length === 0) {
      // Nouveau joueur ou joueur sans Pokémon -> Afficher le HUD de sélection
      console.log(`🎁 Affichage du HUD de sélection de starter pour ${username}`);
      
      // Délai court pour que le client soit bien connecté
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
      // Joueur existant avec des Pokémon -> Message de bienvenue normal
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
