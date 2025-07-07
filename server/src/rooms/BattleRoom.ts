// server/src/rooms/BattleRoom.ts - VERSION AVEC VRAI COMBAT
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon, BattleAction } from "../schema/BattleState";
import { BattleIntegration } from '../managers/battle/BattleIntegration';
import { ActionType } from '../managers/battle/types/BattleTypes';
import { IBattleRoomCallbacks } from '../managers/battle/BattleSequencer';
import { MoveManager } from "../managers/MoveManager";
import { CaptureManager, CaptureAttempt } from "../managers/CaptureManager";
import { WildPokemon } from "../managers/EncounterManager";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";
// Interface pour les données initiales du combat
export interface BattleInitData {
  battleType: "wild" | "pvp";
  playerData: {
    sessionId: string;
    name: string;
    worldRoomId: string;
    activePokemonId?: string;
  };
  wildPokemon?: WildPokemon;
  player2Data?: {
    sessionId: string;
    name: string;
    worldRoomId: string;
  };
}

export type BattleStatusIcon = 
  | "entering_battle" | "battle_advantage" | "battle_struggling" 
  | "battle_critical" | "battle_victory" | "battle_defeat" 
  | "battle_fled" | "capturing" | "switching_pokemon";

export class BattleRoom extends Room<BattleState> {
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  private worldRoomRef: any = null;
  private battleIntegration!: BattleIntegration;
  
  // Combat timing
  private actionTimeoutMs = 30000;
  private currentActionTimer?: NodeJS.Timeout;

  // Statistiques pour icônes
  private playerHpPercentages: Map<string, number> = new Map();
  private lastStatusIcons: Map<string, BattleStatusIcon> = new Map();

  maxClients = 2;

  async onCreate(options: BattleInitData) {
    console.log(`⚔️ === CRÉATION BATTLEROOM AVEC VRAI COMBAT ===`);
    console.log(`🎯 Type: ${options.battleType}`);
    console.log(`👤 Joueur 1: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // ✅ NOUVEAU: Initialiser BattleIntegration avec le state
    this.battleIntegration = new BattleIntegration();
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    // ✅ NOUVEAU: Initialiser MoveManager si pas encore fait
    await MoveManager.initialize();
    
    console.log(`✅ BattleRoom ${this.roomId} créée avec BattleIntegration`);
    
    this.setupMessageHandlers();
    await this.setupWorldRoomConnection();
  }

  private async setupWorldRoomConnection() {
    try {
      console.log(`🔗 [BattleRoom] Connexion à WorldRoom...`);
      const { ServiceRegistry } = require('../services/ServiceRegistry');
      
      if (ServiceRegistry) {
        const registry = ServiceRegistry.getInstance();
        this.worldRoomRef = registry?.getWorldRoom();
        
        if (this.worldRoomRef) {
          console.log(`✅ [BattleRoom] WorldRoom connectée`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [BattleRoom] Mode dégradé sans WorldRoom`);
      this.worldRoomRef = null;
    }
  }

  private setupMessageHandlers() {
    console.log(`📨 Configuration handlers BattleRoom...`);

    // ✅ AMÉLIORÉ: Actions de combat avec vraie logique
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });

    this.onMessage("choosePokemon", async (client, data: { pokemonId: string }) => {
      await this.handleChoosePokemon(client, data.pokemonId);
    });

    this.onMessage("attemptCapture", async (client, data: { ballType: string }) => {
      await this.handleCaptureAttempt(client, data.ballType);
    });

    this.onMessage("attemptFlee", async (client) => {
      await this.handleFleeAttempt(client);
    });

    this.onMessage("switchPokemon", async (client, data: { newPokemonId: string }) => {
      await this.handleSwitchPokemon(client, data.newPokemonId);
    });

    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", {
        phase: this.state.phase,
        currentTurn: this.state.currentTurn,
        player1Pokemon: this.serializePokemonForClient(this.state.player1Pokemon),
        player2Pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
        battleLog: Array.from(this.state.battleLog),
        turnNumber: this.state.turnNumber
      });
    });

    console.log(`✅ Handlers BattleRoom configurés`);
  }

  // === MÉTHODES PRINCIPALES ===

async onJoin(client: Client, options: any) {
  console.log(`🔥 [JOIN DEBUG] === JOUEUR REJOINT BATTLEROOM ===`);
  console.log(`🔥 [JOIN DEBUG] Client sessionId: ${client.sessionId}`);
  console.log(`🔥 [JOIN DEBUG] Options reçues:`, options);
  console.log(`🔥 [JOIN DEBUG] Expected Player1: ${this.battleInitData.playerData.sessionId}`);
  
  try {
    // ✅ SOLUTION: Utiliser worldSessionId des options si disponible
    const effectiveSessionId = options?.worldSessionId || client.sessionId;
    const playerName = options?.playerName || this.getPlayerName(effectiveSessionId);
    
    console.log(`🔥 [JOIN DEBUG] SessionId effectif: ${effectiveSessionId}`);
    console.log(`🔥 [JOIN DEBUG] Nom du joueur: ${playerName}`);
    
    // ✅ Vérification avec le bon sessionId
    if (effectiveSessionId === this.battleInitData.playerData.sessionId) {
      console.log(`🔥 [JOIN DEBUG] ✅ CLIENT ATTENDU TROUVÉ! Assignation Player1`);
      this.state.player1Id = client.sessionId; // Garder le vrai sessionId de la BattleRoom
      this.state.player1Name = this.battleInitData.playerData.name;
      
      // ✅ Créer TeamManager avec le vrai nom
      console.log(`🔥 [JOIN DEBUG] Création TeamManager pour ${this.battleInitData.playerData.name}...`);
      const teamManager = new TeamManager(this.battleInitData.playerData.name);
      await teamManager.load();
      this.teamManagers.set(client.sessionId, teamManager);
      console.log(`🔥 [JOIN DEBUG] ✅ TeamManager créé !`);
      
    } else {
      console.log(`🔥 [JOIN DEBUG] ⚠️ CLIENT INATTENDU: ${effectiveSessionId} !== ${this.battleInitData.playerData.sessionId}`);
      
      // Assigner quand même
      this.state.player1Id = client.sessionId;
      this.state.player1Name = playerName || "Player1";
    }
    
    // ✅ Le reste...
    this.blockPlayerInWorldRoom(client.sessionId, "Entré en combat");
    this.playerHpPercentages.set(client.sessionId, 100);
    
    client.send("battleJoined", {
      battleId: this.state.battleId,
      battleType: this.state.battleType,
      yourRole: this.getPlayerRole(client.sessionId)
    });

    this.updatePlayerStatusIcon(client.sessionId, "entering_battle");
    
    console.log(`🔥 [JOIN DEBUG] État final:`, {
      player1Id: this.state.player1Id,
      player1Name: this.state.player1Name,
      hasTeamManager: this.teamManagers.has(client.sessionId)
    });

    if (this.shouldStartBattle()) {
      console.log(`🔥 [JOIN DEBUG] 🚀 DÉMARRAGE COMBAT!`);
      this.clock.setTimeout(() => this.startBattle(), 1000);
    }

  } catch (error) {
    console.error(`🔥 [JOIN DEBUG] Erreur:`, error);
    client.leave(1000, "Erreur lors de l'entrée en combat");
  }
}
  
  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 ${client.sessionId} quitte BattleRoom`);
    
    try {
      this.unblockPlayerInWorldRoom(client.sessionId);
      this.clearPlayerStatusIcon(client.sessionId);
      this.teamManagers.delete(client.sessionId);
      this.playerHpPercentages.delete(client.sessionId);
      this.lastStatusIcons.delete(client.sessionId);
      
      if (this.state.phase === "battle") {
        this.endBattleEarly("player_disconnected");
      }
      
    } catch (error) {
      console.error(`❌ Erreur onLeave BattleRoom:`, error);
    }
  }

  private createBattleCallbacks(): IBattleRoomCallbacks {
  return {
    broadcastMessage: (messageId: string, data: any) => {
      console.log(`📡 [BattleRoom] Broadcasting message: ${messageId}`);
      this.addBattleMessage(data.message || messageId); // ✅ AJOUT: Ajouter au battleLog
      this.broadcast('battleMessage', {
        messageId,
        message: data.message || messageId,
        variables: data.variables || {},
        timing: data.timing || 2000
      });
    },

    broadcastUpdate: (updateData: any) => {
      console.log(`📡 [BattleRoom] Broadcasting update`);
      this.broadcast('battleUpdate', updateData);
    },

    updatePokemonHP: (pokemonId: string, newHp: number) => {
      console.log(`💖 [BattleRoom] Update HP: ${pokemonId} → ${newHp}`);
      // Mettre à jour le HP dans le state
      if (this.state.player1Pokemon?.pokemonId.toString() === pokemonId) {
        this.state.player1Pokemon.currentHp = newHp;
      } else if (this.state.player2Pokemon?.pokemonId.toString() === pokemonId) {
        this.state.player2Pokemon.currentHp = newHp;
      }
    },

    changeTurn: (newTurn: string) => {
      console.log(`🔄 [BattleRoom] Change turn: ${newTurn}`);
      // ✅ CORRECTION: Bien mapper les tours
      if (newTurn === 'player1' || newTurn === this.state.player1Id) {
        this.state.currentTurn = "player1";
      } else if (newTurn === 'ai' || newTurn === 'player2') {
        this.state.currentTurn = "player2";
      } else {
        this.state.currentTurn = newTurn as any;
      }
      this.state.turnNumber++;
      
      console.log(`🔄 [BattleRoom] Tour mis à jour: ${this.state.currentTurn}`);
    },

    endBattle: (result: any) => {
      console.log(`🏁 [BattleRoom] End battle:`, result);
      this.state.battleEnded = true;
      this.state.winner = result.winner;
      this.state.phase = result.result === 'fled' ? 'fled' : 'ended';
    },

    logBattleEvent: (event: any) => {
      console.log(`📝 [BattleRoom] Log event: ${event.type}`);
    }
  };
}
  // === DÉMARRAGE DU COMBAT ===

private async startBattle() {
  console.log(`🔥 [AUTO PHASE] === DÉMARRAGE DU COMBAT AVEC BattleIntegration ===`);
  console.log(`🔥 [AUTO PHASE] Phase initiale: ${this.state.phase}`);
  console.log(`🔥 [AUTO PHASE] Type de combat: ${this.state.battleType}`);
  console.log(`🔥 [AUTO PHASE] Player1Id: ${this.state.player1Id}`);
  console.log(`🔥 [AUTO PHASE] Player1Name: ${this.state.player1Name}`);
  
  try {
    console.log(`🔥 [AUTO PHASE] Passage en phase intro...`);
    this.state.phase = "intro";
    
    if (this.state.battleType === "wild") {
      console.log(`🔥 [AUTO PHASE] Setup combat sauvage automatique...`);
      await this.setupWildBattleWithManager();
      console.log(`🔥 [AUTO PHASE] Setup sauvage terminé`);
    } else {
      console.log(`🔥 [AUTO PHASE] Setup combat PvP...`);
      await this.setupPvPBattle();
      console.log(`🔥 [AUTO PHASE] Setup PvP terminé`);
    }
    
    console.log(`🔥 [AUTO PHASE] Passage en phase team_selection...`);
    this.state.phase = "team_selection";
    this.broadcast("phaseChange", { phase: "team_selection" });
    
    // ✅ ICI IL FAUT AJOUTER LA LOGIQUE AUTOMATIQUE
    console.log(`🔥 [AUTO PHASE] Démarrage automatique sélection Pokémon...`);
    
    // Pour un combat sauvage, choisir automatiquement le premier Pokémon disponible
    if (this.state.battleType === "wild") {
      await this.autoSelectFirstPokemon();
    }
    
    console.log(`🔥 [AUTO PHASE] startBattle terminé`);
    
  } catch (error) {
    console.error(`🔥 [AUTO PHASE] Erreur startBattle:`, error);
    if (error instanceof Error) {
      console.error(`🔥 [AUTO PHASE] Stack trace:`, error.stack);
    }
    this.endBattleEarly("setup_error");
  }
}

private checkAndPlayAITurn() {
  console.log(`🤖 [AI CHECK] Vérification tour IA...`);
  console.log(`🤖 [AI CHECK] Tour actuel: ${this.state.currentTurn}`);
  console.log(`🤖 [AI CHECK] Phase: ${this.state.phase}`);
  console.log(`🤖 [AI CHECK] Waiting for action: ${this.state.waitingForAction}`);
  console.log(`🤖 [AI CHECK] Battle ended: ${this.state.battleEnded}`);
  
  // Vérifications renforcées
  if (this.state.battleEnded) {
    console.log(`🤖 [AI CHECK] ❌ Combat terminé, IA ignore`);
    return;
  }
  
  if (this.state.phase !== "battle") {
    console.log(`🤖 [AI CHECK] ❌ Phase incorrecte: ${this.state.phase}`);
    return;
  }
  
  if (this.state.currentTurn !== "player2") {
    console.log(`🤖 [AI CHECK] ❌ Pas le tour de l'IA: ${this.state.currentTurn}`);
    return;
  }
  
  if (!this.state.waitingForAction) {
    console.log(`🤖 [AI CHECK] ❌ Pas en attente d'action`);
    return;
  }
  
  // ✅ Toutes les conditions OK, l'IA peut jouer
  console.log(`🤖 [AI CHECK] ✅ Conditions OK, IA va jouer dans 1s...`);
  
  this.clock.setTimeout(() => {
    this.playAITurnNow();
  }, 1000);
}
  
private async autoSelectFirstPokemon() {
  console.log(`🔥 [AUTO SELECT] Sélection automatique du premier Pokémon...`);
  
  try {
    const playerClient = Array.from(this.clients)[0];
    if (!playerClient) {
      throw new Error("Aucun client trouvé");
    }
    
    const teamManager = this.teamManagers.get(playerClient.sessionId);
    if (!teamManager) {
      throw new Error("TeamManager non trouvé");
    }
    
    const team = await teamManager.getTeam();
    const firstAvailablePokemon = team.find(pokemon => 
      pokemon.currentHp > 0 && 
      pokemon.moves && pokemon.moves.length > 0
    );
    
    if (!firstAvailablePokemon) {
      throw new Error("Aucun Pokémon disponible pour le combat");
    }
    
    console.log(`🔥 [AUTO SELECT] Premier Pokémon trouvé: ${firstAvailablePokemon.nickname || 'Sans nom'}`);
    
    if (this.battleInitData.wildPokemon) {
      // ✅ AJOUT: Créer les BattlePokemon dans le state AVANT d'initialiser BattleIntegration
      console.log(`🔧 [AUTO SELECT] Création des BattlePokemon...`);
      
      // Créer le Pokémon du joueur
      this.state.player1Pokemon = await this.createBattlePokemonFromTeam(firstAvailablePokemon);
      
      // Créer le Pokémon sauvage
      this.state.player2Pokemon = await this.createWildBattlePokemon(this.battleInitData.wildPokemon);
      
      console.log(`✅ [AUTO SELECT] BattlePokemon créés:`);
      console.log(`   Player1: ${this.state.player1Pokemon.name} (vitesse: ${this.state.player1Pokemon.speed})`);
      console.log(`   Player2: ${this.state.player2Pokemon.name} (vitesse: ${this.state.player2Pokemon.speed})`);
      
      // Maintenant initialiser BattleIntegration
      const callbacks = this.createBattleCallbacks();

    // ✅ FONCTION HELPER pour convertir BattlePokemon → BattlePokemonData
    const convertToBattlePokemonData = async (battlePokemon: BattlePokemon): Promise<any> => {
      return {
        pokemonId: battlePokemon.pokemonId,
        name: battlePokemon.name,
        level: battlePokemon.level,
        currentHp: battlePokemon.currentHp,
        maxHp: battlePokemon.maxHp,
        types: Array.from(battlePokemon.types), // ✅ CONVERSION DYNAMIQUE DES TYPES
        moves: await Promise.all(
          Array.from(battlePokemon.moves).map(async (moveId) => {
            const moveData = MoveManager.getMoveData(moveId);
            return {
              moveId,
              name: moveData?.name || moveId,
              type: moveData?.type || 'Normal',
              category: (moveData?.category?.toLowerCase() || 'physical') as const,
              power: moveData?.power || 0,
              accuracy: moveData?.accuracy || 100,
              pp: moveData?.pp || 35,
              maxPp: moveData?.pp || 35,
              priority: moveData?.priority || 0,
              description: moveData?.description || ''
            };
          })
        ),
        stats: {
          attack: battlePokemon.attack,
          defense: battlePokemon.defense,
          specialAttack: battlePokemon.specialAttack,
          specialDefense: battlePokemon.specialDefense,
          speed: battlePokemon.speed,
          hp: battlePokemon.maxHp
        },
        statStages: {
          attack: battlePokemon.attackStage || 0,
          defense: battlePokemon.defenseStage || 0,
          specialAttack: battlePokemon.specialAttackStage || 0,
          specialDefense: battlePokemon.specialDefenseStage || 0,
          speed: battlePokemon.speedStage || 0,
          accuracy: 0, evasion: 0
        },
        statusCondition: (battlePokemon.statusCondition || 'normal') as const,
        ability: battlePokemon.ability,
        heldItem: battlePokemon.heldItem,
        gender: battlePokemon.gender,
        shiny: battlePokemon.shiny,
        isWild: battlePokemon.isWild,
        nature: 'Hardy' // TODO: récupérer la vraie nature si disponible
      };
    };
    
    // ✅ PARTICIPANTS DYNAMIQUES
    const participants = [
      {
        sessionId: this.state.player1Id,
        name: this.state.player1Name,
        role: 'player1',
        team: [await convertToBattlePokemonData(this.state.player1Pokemon)],
        activePokemon: this.state.player1Pokemon.pokemonId.toString(),
        isAI: false,
        isConnected: true,
        lastActionTime: Date.now()
      },
      {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        role: 'player2',
        team: [await convertToBattlePokemonData(this.state.player2Pokemon)],
        activePokemon: this.state.player2Pokemon.pokemonId.toString(),
        isAI: true,
        isConnected: true,
        lastActionTime: Date.now()
      }
    ];
          
          console.log(`🔧 [AUTO SELECT] Participants créés:`, participants.length);
          participants.forEach((p, i) => {
            console.log(`   ${i}: ${p.sessionId} (${p.name}) - Pokémon: ${p.team[0]?.name}`);
          });
          
          this.battleIntegration.initializeBattle(callbacks, 'wild', participants);
          
          // Démarrer le combat réel
          this.startActualBattle();
        }
        
      } catch (error) {
        console.error(`🔥 [AUTO SELECT] Erreur sélection auto:`, error);
        throw error;
      }
    }

private async createWildBattlePokemon(wildPokemon: any): Promise<BattlePokemon> {
  const battlePokemon = new BattlePokemon();
  
  const pokemonData = await getPokemonById(wildPokemon.pokemonId);
  if (!pokemonData) {
    throw new Error(`Données Pokémon sauvage ${wildPokemon.pokemonId} introuvables`);
  }

  battlePokemon.pokemonId = wildPokemon.pokemonId;
  battlePokemon.name = pokemonData.name;
  battlePokemon.level = wildPokemon.level;
  battlePokemon.isWild = true;
  battlePokemon.gender = wildPokemon.gender;
  battlePokemon.shiny = wildPokemon.shiny;
  
  // Types
  battlePokemon.types.clear();
  pokemonData.types.forEach((type: string) => battlePokemon.types.push(type));
  
  // ✅ CORRECTION: Utiliser les stats de wildPokemon ou calculer
  console.log(`🔧 [WildPokemon] Stats reçues:`, {
    hp: wildPokemon.hp,
    attack: wildPokemon.attack,
    speed: wildPokemon.speed
  });
  
  battlePokemon.maxHp = wildPokemon.hp || this.calculateBaseStat(pokemonData.baseStats.hp, wildPokemon.level);
  battlePokemon.currentHp = wildPokemon.hp || this.calculateBaseStat(pokemonData.baseStats.hp, wildPokemon.level);
  battlePokemon.attack = wildPokemon.attack || this.calculateBaseStat(pokemonData.baseStats.attack, wildPokemon.level);
  battlePokemon.defense = wildPokemon.defense || this.calculateBaseStat(pokemonData.baseStats.defense, wildPokemon.level);
  battlePokemon.specialAttack = wildPokemon.specialAttack || this.calculateBaseStat(pokemonData.baseStats.specialAttack, wildPokemon.level);
  battlePokemon.specialDefense = wildPokemon.specialDefense || this.calculateBaseStat(pokemonData.baseStats.specialDefense, wildPokemon.level);
  battlePokemon.speed = wildPokemon.speed || this.calculateBaseStat(pokemonData.baseStats.speed, wildPokemon.level);
  
  console.log(`✅ [WildPokemon] Stats finales:`, {
    hp: battlePokemon.maxHp,
    attack: battlePokemon.attack,
    speed: battlePokemon.speed
  });
  
  // Moves de base
  battlePokemon.moves.clear();
  const baseMoves = pokemonData.learnset
    .filter((learn: any) => learn.level <= wildPokemon.level)
    .slice(-4)
    .map((learn: any) => learn.moveId);
  
  (baseMoves.length > 0 ? baseMoves : ["tackle"]).forEach((move: string) => {
    battlePokemon.moves.push(move);
  });
  
  battlePokemon.statusCondition = "normal";
  
  return battlePokemon;
}
  
  // ✅ NOUVEAU: Setup combat sauvage avec BattleIntegration
  private async setupWildBattleWithManager() {
    console.log(`🌿 Configuration combat sauvage avec BattleIntegration`);
    
    if (!this.battleInitData.wildPokemon) {
      throw new Error("Données Pokémon sauvage manquantes");
    }

    // ✅ Le BattleIntegration va créer les BattlePokemon directement
    // On n'a pas besoin de les créer manuellement ici
    
    console.log(`✅ Combat sauvage configuré pour BattleIntegration`);
  }

  private async setupPvPBattle() {
    console.log(`⚔️ Configuration combat PvP`);
    // TODO: À implémenter pour les combats joueur vs joueur
    this.addBattleMessage("Combat PvP à implémenter");
    
    // Pour l'instant, configuration basique pour éviter les erreurs
    if (!this.battleInitData.player2Data) {
      throw new Error("Données joueur 2 manquantes pour combat PvP");
    }
    
    // Configuration minimale en attendant l'implémentation complète
    this.state.player2Name = this.battleInitData.player2Data.name;
    
    console.log(`✅ Combat PvP configuré (implémentation basique)`);
  }

  // ✅ AMÉLIORÉ: Choisir Pokémon et initialiser le BattleIntegration
  private async handleChoosePokemon(client: Client, pokemonId: string) {
    console.log(`🎯 ${client.sessionId} choisit Pokémon: ${pokemonId}`);
    
    try {
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("error", { message: "TeamManager non trouvé" });
        return;
      }

      const team = await teamManager.getTeam();
      const selectedPokemon = team.find(p => p._id.toString() === pokemonId);
      
      if (!selectedPokemon) {
        client.send("error", { message: "Pokémon non trouvé dans votre équipe" });
        return;
      }

      if (selectedPokemon.currentHp <= 0) {
        client.send("error", { message: "Ce Pokémon est KO !" });
        return;
      }

      // ✅ NOUVEAU: Utiliser BattleIntegration pour initialiser le combat
      if (this.state.battleType === "wild" && this.battleInitData.wildPokemon) {
        const callbacks = this.createBattleCallbacks();
        this.battleIntegration.initializeBattle(callbacks, 'wild', []);
        
        console.log(`✅ Combat sauvage initialisé avec BattleIntegration`);
        
        // Le BattleIntegration a mis à jour le state, on peut commencer
        this.startActualBattle();
      }

    } catch (error) {
      console.error(`❌ Erreur handleChoosePokemon:`, error);
      client.send("error", { message: "Erreur lors de la sélection" });
    }
  }

private startActualBattle() {
  console.log(`⚔️ DÉBUT DU COMBAT RÉEL AVEC BattleIntegration !`);
  
  this.state.phase = "battle";
  this.state.waitingForAction = true;
  this.state.turnNumber = 1;
  
  // ✅ CALCUL CORRECT: Qui joue en premier selon la vitesse
  const player1Speed = this.state.player1Pokemon?.speed || 0;
  const player2Speed = this.state.player2Pokemon?.speed || 0;
  
  let firstPlayer: string;
  if (player1Speed > player2Speed) {
    firstPlayer = "player1";
  } else if (player2Speed > player1Speed) {
    firstPlayer = "player2";
  } else {
    // Égalité = aléatoire
    firstPlayer = Math.random() < 0.5 ? "player1" : "player2";
  }
  
  this.state.currentTurn = firstPlayer;
  
  console.log(`⚡ [BattleRoom] Vitesses: Player1=${player1Speed} vs Player2=${player2Speed}`);
  console.log(`🎯 [BattleRoom] Premier tour: ${firstPlayer}`);
  
  this.broadcast("battleStart", {
    player1Pokemon: this.serializePokemonForClient(this.state.player1Pokemon),
    player2Pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
    currentTurn: this.state.currentTurn,
    turnNumber: this.state.turnNumber,
    battleLog: Array.from(this.state.battleLog),
    speedComparison: { // ✅ Info pour le client
      player1Speed,
      player2Speed,
      firstPlayer
    }
  });
  
  this.updateBattleStatusIcons();
  this.startActionTimer();
  
  console.log(`✅ Combat ${this.state.battleId} en cours avec BattleIntegration !`);
}
  
private async playAITurnNow() {
  console.log(`🤖 [AI TURN] === TOUR DE L'IA ===`);
  
  try {
    // Choisir une attaque aléatoire
    const moves = Array.from(this.state.player2Pokemon.moves);
    const randomMove = moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : "tackle";
    
    console.log(`🤖 [AI TURN] IA utilise: ${randomMove}`);
    
    // ✅ ÉTAPE 1: Afficher le message d'attaque de l'IA
    const moveDisplayName = this.getMoveDisplayName(randomMove);
    this.addBattleMessage(`${this.state.player2Pokemon.name} utilise ${moveDisplayName} !`);
    
    // ✅ ÉTAPE 2: Attendre 1.5s avant d'appliquer les dégâts (temps de lecture)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // ✅ ÉTAPE 3: Créer et traiter l'action
    const aiAction = new BattleAction();
    aiAction.type = "attack";
    aiAction.playerId = "ai";
    aiAction.data = JSON.stringify({
      actionType: "attack",
      moveId: randomMove
    });
    
    const moveData = MoveManager.getMoveData(randomMove);
    aiAction.priority = moveData?.priority || 0;
    aiAction.speed = this.state.player2Pokemon.speed;
    
    // Traiter l'action via BattleIntegration
    this.state.waitingForAction = false;
    await this.battleIntegration.processAction(
      aiAction.playerId,
      aiAction.type as ActionType,
      JSON.parse(aiAction.data)
    );
    
    console.log(`🤖 [AI TURN] Action IA traitée`);
    
    // ✅ ÉTAPE 4: Attendre 1s supplémentaire pour les effets visuels
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ✅ ÉTAPE 5: Changer le tour SEULEMENT si le combat continue
    if (!this.state.battleEnded) {
      console.log(`🔄 [AI TURN] Changement de tour: player2 → player1`);
      this.state.currentTurn = "player1";
      this.state.waitingForAction = true;
      this.state.turnNumber++;
    }
    
    // ✅ ÉTAPE 6: Broadcast avec timing respecté
    this.broadcastBattleUpdate();
    
    // Vérifier fin de combat
    if (this.state.battleEnded) {
      await this.handleBattleEnd();
    } else {
      this.updatePlayerHpPercentages();
      this.updateBattleStatusIcons();
    }
    
  } catch (error) {
    console.error(`🤖 [AI TURN] Erreur tour IA:`, error);
  }
}

// ✅ AMÉLIORATION de broadcastBattleUpdate() sans double appel IA
private broadcastBattleUpdate() {
  console.log(`📡 [BattleRoom] Broadcasting update:`, {
    currentTurn: this.state.currentTurn,
    turnNumber: this.state.turnNumber,
    player1Hp: this.state.player1Pokemon?.currentHp,
    player2Hp: this.state.player2Pokemon?.currentHp
  });
  
  this.broadcast("battleUpdate", {
    player1Pokemon: this.serializePokemonForClient(this.state.player1Pokemon),
    player2Pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
    currentTurn: this.state.currentTurn,
    turnNumber: this.state.turnNumber,
    battleLog: Array.from(this.state.battleLog),
    lastMessage: this.state.lastMessage,
    battleEnded: this.state.battleEnded,
    winner: this.state.winner
  });
  
  // ✅ SUPPRIMÉ: Plus d'appel automatique à l'IA ici
  // L'IA se déclenche maintenant via handleBattleAction() avec le bon timing
  console.log(`📡 [BattleRoom] Broadcast terminé sans appel automatique IA`);
}

// ✅ AJOUT: Helper pour obtenir le nom d'affichage d'une attaque
private getMoveDisplayName(moveId: string): string {
  const moveNames: { [key: string]: string } = {
    'tackle': 'Charge',
    'scratch': 'Griffe', 
    'growl': 'Rugissement',
    'thundershock': 'Éclair',
    'quick_attack': 'Vive-Attaque',
    'bite': 'Morsure',
    'ember': 'Flammèche',
    'water_gun': 'Pistolet à O',
    'vine_whip': 'Fouet Lianes',
    'peck': 'Picpic'
  };
  
  return moveNames[moveId] || moveId.charAt(0).toUpperCase() + moveId.slice(1);
}
  // === ACTIONS DE COMBAT AVEC BattleIntegration ===

private async handleBattleAction(client: Client, data: any) {
  console.log(`🔥 [DEBUG] handleBattleAction appelée:`, data);
  console.log(`🔥 [DEBUG] Phase actuelle:`, this.state.phase);
  console.log(`🔥 [DEBUG] Tour actuel:`, this.state.currentTurn);
  
  if (this.state.phase !== "battle") {
    console.log(`🔥 [DEBUG] Combat non actif, rejet`);
    client.send("error", { message: "Combat non actif" });
    return;
  }

  const playerRole = this.getPlayerRole(client.sessionId);
  console.log(`🔥 [DEBUG] Rôle du joueur:`, playerRole);
  
  if (this.state.currentTurn !== playerRole) {
    console.log(`🔥 [DEBUG] Pas le tour du joueur, rejet`);
    client.send("error", { message: "Ce n'est pas votre tour" });
    return;
  }

  console.log(`🔥 [DEBUG] Validation OK, traitement action ${data.actionType}`);
  console.log(`🎮 Action de ${client.sessionId}: ${data.actionType}`);

  try {
    console.log(`🔥 [DEBUG] Création BattleAction...`);
    
    const action = new BattleAction();
    action.type = data.actionType;
    action.playerId = client.sessionId;
    action.data = JSON.stringify(data);
    
    console.log(`🔥 [DEBUG] BattleAction créée:`, {
      type: action.type,
      playerId: action.playerId,
      data: action.data
    });
    
    if (data.actionType === "attack" && data.moveId) {
      console.log(`🔥 [DEBUG] Calcul priorité pour attaque ${data.moveId}`);
      
      const moveData = MoveManager.getMoveData(data.moveId);
      action.priority = moveData?.priority || 0;
      
      const currentPokemon = this.getCurrentPlayerPokemon();
      action.speed = currentPokemon.speed;
      
      console.log(`🔥 [DEBUG] Priorité: ${action.priority}, Vitesse: ${action.speed}`);
    }

    console.log(`🔥 [DEBUG] Appel BattleIntegration.processAction...`);
    
    await this.battleIntegration.processAction(
      action.playerId,
      action.type as ActionType,
      typeof action.data === 'string' ? JSON.parse(action.data) : action.data
    );
        
    console.log(`🔥 [DEBUG] BattleIntegration.processAction terminé`);
    console.log(`🔥 [DEBUG] État du combat après processAction:`, {
      battleEnded: this.state.battleEnded,
      currentTurn: this.state.currentTurn,
      turnNumber: this.state.turnNumber,
      player1Hp: this.state.player1Pokemon?.currentHp,
      player2Hp: this.state.player2Pokemon?.currentHp,
      lastMessage: this.state.lastMessage
    });
    
    console.log(`🔥 [DEBUG] Appel broadcastBattleUpdate...`);
    this.broadcastBattleUpdate();
    console.log(`🔥 [DEBUG] broadcastBattleUpdate terminé`);
    
    if (this.state.battleEnded) {
      console.log(`🔥 [DEBUG] Combat terminé, appel handleBattleEnd...`);
      await this.handleBattleEnd();
    } else {
      console.log(`🔥 [DEBUG] Combat continue, mise à jour statuts...`);
      
      this.updatePlayerHpPercentages();
      this.updateBattleStatusIcons();
      
      console.log(`🔥 [DEBUG] Statuts mis à jour`);
      
      // ✅ SUPPRIMÉ: L'appel à checkAndPlayAITurn pour éviter la duplication
    }

    console.log(`🔥 [DEBUG] handleBattleAction terminé avec succès`);

  } catch (error) {
    console.error(`🔥 [DEBUG] ERREUR dans handleBattleAction:`, error);
    if (error instanceof Error) {
      console.error(`🔥 [DEBUG] Stack trace:`, error.stack);
    } else {
      console.error(`🔥 [DEBUG] Erreur non-Error:`, String(error));
    }
    client.send("error", { message: "Erreur lors de l'action" });
  }
}

  // ✅ NOUVEAU: Gestion de la fin de combat avec BattleIntegration
private async handleBattleEnd() {
  console.log(`🏁 FIN DE COMBAT DÉTECTÉE PAR BattleIntegration`);
  
  // Déterminer le type de fin selon l'état
  let endType: "victory" | "defeat" | "fled" | "draw";
  
  if (this.state.pokemonCaught) {
    endType = "victory";
    this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
  } else if (this.state.winner === this.state.player1Id) {
    endType = "victory";
    this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
  } else if (this.state.winner === this.state.player2Id || this.state.winner === 'ai') {
    endType = "defeat";
    this.updatePlayerStatusIcon(this.state.player1Id, "battle_defeat");
  } else if (this.state.phase === "fled") {
    endType = "fled";
    this.updatePlayerStatusIcon(this.state.player1Id, "battle_fled");
  } else {
    endType = "draw";
  }
  
  // Sauvegarder les changements des Pokémon
  await this.updatePokemonAfterBattle(this.state.player1Id, this.state.player1Pokemon);
  
  // Calculer les récompenses
  const rewards = this.calculateRewards(endType, { expGained: 50 }); // Valeurs par défaut
  
  // Broadcast du résultat final
  this.broadcast("battleEnd", {
    result: endType,
    rewards: rewards,
    finalLog: Array.from(this.state.battleLog)
  });
  
  // Programmer la fermeture
  this.clock.setTimeout(() => {
    this.disconnect();
  }, 5000);
}

  // ✅ AMÉLIORÉ: Capture avec CaptureManager réel
  private async handleCaptureAttempt(client: Client, ballType: string) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de capturer un Pokémon de dresseur !" });
      return;
    }
    
    if (this.state.phase !== "battle") {
      client.send("error", { message: "Combat non actif" });
      return;
    }
    
    console.log(`🎯 Tentative de capture avec ${ballType}`);
    
    try {
      this.updatePlayerStatusIcon(client.sessionId, "capturing");
      
      // ✅ NOUVEAU: Utiliser CaptureManager réel
      const captureAttempt: CaptureAttempt = {
        pokemonId: this.state.player2Pokemon.pokemonId,
        pokemonLevel: this.state.player2Pokemon.level,
        currentHp: this.state.player2Pokemon.currentHp,
        maxHp: this.state.player2Pokemon.maxHp,
        statusCondition: this.state.player2Pokemon.statusCondition,
        ballType: ballType,
        location: this.state.encounterLocation
      };

      const pokemonData = await getPokemonById(this.state.player2Pokemon.pokemonId);
      const captureResult = CaptureManager.calculateCaptureRate(captureAttempt, pokemonData);
      
      // ✅ NOUVEAU: Animation réaliste de capture
      this.addBattleMessage(`${this.state.player1Name} lance une ${ballType} !`);
      
      // Animation progressive
      this.broadcast("captureStart", { ballType, captureRate: captureResult.finalProbability });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.addBattleMessage("*Boing*");
      this.broadcast("captureBounce");
      
      // Secousses réalistes
      for (let i = 0; i < captureResult.shakeCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.addBattleMessage("*Clic*");
        this.broadcast("captureShake", { shakeNumber: i + 1, totalShakes: captureResult.shakeCount });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (captureResult.success) {
        this.addBattleMessage(`Gotcha ! ${this.state.player2Pokemon.name} a été capturé !`);
        
        if (captureResult.criticalCapture) {
          this.addBattleMessage("Capture critique !");
        }
        
        this.state.pokemonCaught = true;
        this.state.battleEnded = true;
        this.state.winner = this.state.player1Id;
        
        // TODO: Ajouter le Pokémon capturé à l'équipe/PC
        
        this.broadcast("captureSuccess", { 
          pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
          criticalCapture: captureResult.criticalCapture
        });
        
        await this.handleBattleEnd();
        
      } else {
        this.addBattleMessage(`Oh non ! ${this.state.player2Pokemon.name} s'est échappé !`);
        this.broadcast("captureFailure", { shakeCount: captureResult.shakeCount });
        
        // Le combat continue - tour de l'IA
        this.clock.setTimeout(() => {
          this.playAITurn();
        }, 1500);
      }
      
    } catch (error) {
      console.error(`❌ Erreur capture:`, error);
      client.send("error", { message: "Erreur lors de la capture" });
    }
  }

  // ✅ AMÉLIORÉ: Fuite avec calcul réaliste
  private async handleFleeAttempt(client: Client) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de fuir un combat de dresseur !" });
      return;
    }
    
    console.log(`🏃 ${client.sessionId} tente de fuir`);
    
    // ✅ NOUVEAU: Utiliser BattleIntegration pour la logique de fuite
    const action = new BattleAction();
    action.type = "run";
    action.playerId = client.sessionId;
    action.data = JSON.stringify({});
    
    try {
        await this.battleIntegration.processAction(
          action.playerId,
          action.type as ActionType,
          {}
        );
      
      // Le BattleIntegration a mis à jour le state
      if (this.state.battleEnded && this.state.phase === "fled") {
        this.updatePlayerStatusIcon(client.sessionId, "battle_fled");
        await this.handleBattleEnd();
      } else {
        // Échec de fuite - continuer le combat
        this.playAITurn();
      }
      
    } catch (error) {
      console.error(`❌ Erreur fuite:`, error);
      client.send("error", { message: "Erreur lors de la fuite" });
    }
  }

  // === TOUR DE L'IA AMÉLIORÉ ===

  private async playAITurn() {
    console.log(`🤖 Tour de l'IA avec BattleIntegration`);
    
    // ✅ Le BattleIntegration génère automatiquement l'action IA
    // Quand on processAction du joueur, l'IA répond automatiquement
    // Donc cette méthode est maintenant simplifiée
    
    
    // Vérifier si le combat continue
    if (!this.state.battleEnded) {
      this.updatePlayerHpPercentages();
      this.updateBattleStatusIcons();
      this.broadcastBattleUpdate();
    }
  }

  // === MÉTHODES UTILITAIRES AMÉLIORÉES ===

  private getCurrentPlayerPokemon(): BattlePokemon {
    return this.state.currentTurn === "player1" 
      ? this.state.player1Pokemon 
      : this.state.player2Pokemon;
  }

  private getOpponentPokemon(): BattlePokemon {
    return this.state.currentTurn === "player1" 
      ? this.state.player2Pokemon 
      : this.state.player1Pokemon;
  }

  private updatePlayerHpPercentages() {
    if (this.state.player1Pokemon?.maxHp > 0) {
      const hp1 = (this.state.player1Pokemon.currentHp / this.state.player1Pokemon.maxHp) * 100;
      this.playerHpPercentages.set(this.state.player1Id, hp1);
    }
    
    if (this.state.player2Id && this.state.player2Pokemon?.maxHp > 0) {
      const hp2 = (this.state.player2Pokemon.currentHp / this.state.player2Pokemon.maxHp) * 100;
      this.playerHpPercentages.set(this.state.player2Id, hp2);
    }
  }

  private updateBattleStatusIcons() {
    this.clients.forEach(client => {
      const hpPercent = this.playerHpPercentages.get(client.sessionId) || 100;
      let newIcon: BattleStatusIcon;
      
      if (hpPercent > 70) {
        newIcon = "battle_advantage";
      } else if (hpPercent > 30) {
        newIcon = "battle_struggling";
      } else {
        newIcon = "battle_critical";
      }
      
      const lastIcon = this.lastStatusIcons.get(client.sessionId);
      if (lastIcon !== newIcon) {
        this.updatePlayerStatusIcon(client.sessionId, newIcon);
      }
    });
  }

  private addBattleMessage(message: string) {
    this.state.battleLog.push(message);
    this.state.lastMessage = message;
    
    console.log(`💬 [COMBAT] ${message}`);
    
    if (this.state.battleLog.length > 50) {
      this.state.battleLog.splice(0, this.state.battleLog.length - 50);
    }
    
    this.broadcast("battleMessage", { message });
  }

  private calculateRewards(result: string, battleResult: any) {
    const rewards: any = {
      experience: battleResult.expGained || 0,
      gold: 0,
      items: [],
      pokemonCaught: this.state.pokemonCaught
    };
    
    if (result === "victory" && this.state.battleType === "wild") {
      const wildLevel = this.state.player2Pokemon.level;
      rewards.gold = Math.floor(wildLevel * 10 + Math.random() * 50);
      
      console.log(`🎁 Récompenses calculées:`, rewards);
    }
    
    return rewards;
  }

  // === MÉTHODES D'INFRASTRUCTURE ===

private shouldStartBattle(): boolean {
  console.log(`🔥 [SHOULD START] Vérification conditions démarrage:`);
  console.log(`🔥 [SHOULD START] - Type: ${this.state.battleType}`);
  console.log(`🔥 [SHOULD START] - Clients: ${this.clients.length}`);
  console.log(`🔥 [SHOULD START] - Player1Id: ${this.state.player1Id}`);
  console.log(`🔥 [SHOULD START] - Player1Name: ${this.state.player1Name}`);
  console.log(`🔥 [SHOULD START] - TeamManagers: ${this.teamManagers.size}`);
  
  if (this.state.battleType === "wild") {
    const canStart = this.clients.length >= 1 && 
                     this.state.player1Id !== "" && 
                     this.state.player1Name !== "" &&
                     this.teamManagers.size >= 1;
    
    console.log(`🔥 [SHOULD START] Peut démarrer: ${canStart}`);
    return canStart;
  } else {
    const canStart = this.clients.length >= 2;
    console.log(`🔥 [SHOULD START] Peut démarrer (PvP): ${canStart}`);
    return canStart;
  }
}

private getPlayerName(sessionId: string): string | null {
  console.log(`🔥 [GET NAME] === DEBUG getPlayerName ===`);
  console.log(`🔥 [GET NAME] Recherche nom pour: ${sessionId}`);
  console.log(`🔥 [GET NAME] battleInitData.playerData:`, {
    sessionId: this.battleInitData.playerData.sessionId,
    name: this.battleInitData.playerData.name
  });
  console.log(`🔥 [GET NAME] battleInitData.player2Data:`, this.battleInitData.player2Data);
  
  if (sessionId === this.battleInitData.playerData.sessionId) {
    console.log(`🔥 [GET NAME] Match Player1: ${this.battleInitData.playerData.name}`);
    return this.battleInitData.playerData.name;
  }
  
  if (this.battleInitData.player2Data && sessionId === this.battleInitData.player2Data.sessionId) {
    console.log(`🔥 [GET NAME] Match Player2: ${this.battleInitData.player2Data.name}`);
    return this.battleInitData.player2Data.name;
  }
  
  console.log(`🔥 [GET NAME] ❌ AUCUN MATCH TROUVÉ pour ${sessionId}`);
  return null;
}
  
  private getPlayerRole(sessionId: string): "player1" | "player2" | null {
    if (sessionId === this.state.player1Id) return "player1";
    if (sessionId === this.state.player2Id) return "player2";
    return null;
  }

  private serializePokemonForClient(pokemon: BattlePokemon) {
    if (!pokemon) return null;
    
    return {
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
      level: pokemon.level,
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      types: Array.from(pokemon.types),
      moves: Array.from(pokemon.moves),
      statusCondition: pokemon.statusCondition,
      gender: pokemon.gender,
      shiny: pokemon.shiny,
      isWild: pokemon.isWild,
      // Stats pour l'affichage
      attack: pokemon.attack,
      defense: pokemon.defense,
      specialAttack: pokemon.specialAttack,
      specialDefense: pokemon.specialDefense,
      speed: pokemon.speed,
      // Modificateurs temporaires
      attackStage: pokemon.attackStage,
      defenseStage: pokemon.defenseStage,
      speedStage: pokemon.speedStage
    };
  }

  private async updatePokemonAfterBattle(sessionId: string, battlePokemon: BattlePokemon) {
    console.log(`💾 Mise à jour ${battlePokemon.name} après combat`);
    
    try {
      const teamManager = this.teamManagers.get(sessionId);
      if (!teamManager) {
        console.warn(`⚠️ TeamManager non trouvé pour ${sessionId}`);
        return;
      }

      // TODO: Implémenter la sauvegarde des HP et status
      console.log(`✅ ${battlePokemon.name} mis à jour (TODO: vraie sauvegarde)`);
      
    } catch (error) {
      console.error(`❌ Erreur mise à jour Pokémon:`, error);
    }
  }

  // === GESTION DES ICÔNES ET WORLDROOM ===

  private updatePlayerStatusIcon(sessionId: string, icon: BattleStatusIcon) {
    this.lastStatusIcons.set(sessionId, icon);
    
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.broadcast("playerStatusIcon", {
          playerId: sessionId,
          icon: icon,
          iconEmoji: this.getIconEmoji(icon)
        });
        
        console.log(`📱 Icône ${icon} mise à jour pour ${sessionId}`);
      } catch (error) {
        console.error(`❌ Erreur mise à jour icône:`, error);
      }
    }
  }

  private clearPlayerStatusIcon(sessionId: string) {
    this.lastStatusIcons.delete(sessionId);
    
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.broadcast("playerStatusIcon", {
          playerId: sessionId,
          icon: null,
          iconEmoji: null
        });
        
        console.log(`🧹 Icône nettoyée pour ${sessionId}`);
      } catch (error) {
        console.error(`❌ Erreur nettoyage icône:`, error);
      }
    }
  }

  private getIconEmoji(icon: BattleStatusIcon): string {
    const iconMap = {
      "entering_battle": "⚔️",
      "battle_advantage": "😤", 
      "battle_struggling": "😰",
      "battle_critical": "😵",
      "battle_victory": "🎉",
      "battle_defeat": "😢",
      "battle_fled": "🏃",
      "capturing": "🎯",
      "switching_pokemon": "🔄"
    };
    
    return iconMap[icon] || "❓";
  }

  private blockPlayerInWorldRoom(sessionId: string, reason: string) {
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.blockPlayerMovement(sessionId, "battle", 0, { reason });
        console.log(`🚫 Mouvement bloqué pour ${sessionId}: ${reason}`);
      } catch (error) {
        console.error(`❌ Erreur blocage mouvement:`, error);
      }
    } else {
      console.log(`🚫 [DÉGRADÉ] Mouvement bloqué pour ${sessionId}: ${reason}`);
    }
  }

  private unblockPlayerInWorldRoom(sessionId: string) {
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.unblockPlayerMovement(sessionId, "battle");
        console.log(`✅ Mouvement débloqué pour ${sessionId}`);
      } catch (error) {
        console.error(`❌ Erreur déblocage mouvement:`, error);
      }
    } else {
      console.log(`✅ [DÉGRADÉ] Mouvement débloqué pour ${sessionId}`);
    }
  }

  // === GESTION DES TIMERS ===

  private startActionTimer() {
    this.currentActionTimer = setTimeout(() => {
      console.log(`⏰ Timeout d'action pour ${this.state.currentTurn}`);
      
      if (this.state.currentTurn === "player1") {
        // Action par défaut : attaque de base
        this.handleDefaultAction();
      }
    }, this.actionTimeoutMs);
  }

  private async handleDefaultAction() {
    console.log(`🔄 Action par défaut pour ${this.state.currentTurn}`);
    
    try {
      // Utiliser la première attaque disponible
      const moves = Array.from(this.state.player1Pokemon.moves);
      const defaultMove = moves[0] || "tackle";
      
      const action = new BattleAction();
      action.type = "attack";
      action.playerId = this.state.player1Id;
      action.data = JSON.stringify({ moveId: defaultMove });
      action.priority = 0;
      action.speed = this.state.player1Pokemon.speed;
      
      await this.battleIntegration.processAction(
        action.playerId,
        action.type as ActionType,
        { moveId: defaultMove }
      );
      this.broadcastBattleUpdate();
      
      if (!this.state.battleEnded) {
        this.updatePlayerHpPercentages();
        this.updateBattleStatusIcons();
      }
      
    } catch (error) {
      console.error(`❌ Erreur action par défaut:`, error);
    }
  }

  // === GESTION DES CHANGEMENTS DE POKÉMON ===

  private async handleSwitchPokemon(client: Client, newPokemonId: string) {
    console.log(`🔄 ${client.sessionId} change pour Pokémon ${newPokemonId}`);
    
    try {
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("error", { message: "Équipe non trouvée" });
        return;
      }
      
      const team = await teamManager.getTeam();
      const newPokemon = team.find(p => p._id.toString() === newPokemonId);
      
      if (!newPokemon) {
        client.send("error", { message: "Pokémon non trouvé dans votre équipe" });
        return;
      }
      
      if (newPokemon.currentHp <= 0) {
        client.send("error", { message: "Ce Pokémon est KO !" });
        return;
      }
      
      this.updatePlayerStatusIcon(client.sessionId, "switching_pokemon");
      this.addBattleMessage(`${this.state.player1Name} rappelle ${this.state.player1Pokemon.name} !`);
      
      // Créer le nouveau BattlePokemon
      const newBattlePokemon = await this.createBattlePokemonFromTeam(newPokemon);
      
      // Remplacer dans le state
      this.state.player1Pokemon = newBattlePokemon;
      
      this.addBattleMessage(`Vas-y, ${newBattlePokemon.name} !`);
      
      // Broadcast du changement
      this.broadcast("pokemonSwitched", {
        playerId: client.sessionId,
        newPokemon: this.serializePokemonForClient(newBattlePokemon)
      });
      
      // Le changement coûte un tour dans un vrai combat Pokémon
      this.clock.setTimeout(() => {
        this.playAITurn();
      }, 2000);
      
    } catch (error) {
      console.error(`❌ Erreur changement Pokémon:`, error);
      client.send("error", { message: "Erreur lors du changement" });
    }
  }

  private async createBattlePokemonFromTeam(teamPokemon: any): Promise<BattlePokemon> {
    const battlePokemon = new BattlePokemon();
    
    const pokemonData = await getPokemonById(teamPokemon.pokemonId);
    if (!pokemonData) {
      throw new Error(`Données Pokémon ${teamPokemon.pokemonId} introuvables`);
    }
    console.log(`🔧 [CREATE POKEMON] ${teamPokemon.pokemonId} - ${pokemonData.name}`);
    console.log(`🔧 [CREATE POKEMON] teamPokemon.types:`, teamPokemon.types);
    console.log(`🔧 [CREATE POKEMON] pokemonData.types:`, pokemonData.types);
    
    // Types
    battlePokemon.types.clear();
    (teamPokemon.types || pokemonData.types).forEach((type: string) => {
      console.log(`🔧 [CREATE POKEMON] Ajout type: ${type}`);
      battlePokemon.types.push(type);
    });
    
    console.log(`🔧 [CREATE POKEMON] Types finaux:`, Array.from(battlePokemon.types));
    
    // Configuration de base
    battlePokemon.pokemonId = teamPokemon.pokemonId;
    battlePokemon.name = teamPokemon.customName || pokemonData.name;
    battlePokemon.level = teamPokemon.level;
    battlePokemon.isWild = false;
    battlePokemon.gender = teamPokemon.gender;
    battlePokemon.shiny = teamPokemon.shiny;
    
    // Types
    battlePokemon.types.clear();
    (teamPokemon.types || pokemonData.types).forEach((type: string) => battlePokemon.types.push(type));
    
    // Stats actuelles
    battlePokemon.maxHp = teamPokemon.maxHp;
    battlePokemon.currentHp = teamPokemon.currentHp;
    battlePokemon.attack = teamPokemon.calculatedStats?.attack || this.calculateBaseStat(pokemonData.baseStats.attack, teamPokemon.level);
    battlePokemon.defense = teamPokemon.calculatedStats?.defense || this.calculateBaseStat(pokemonData.baseStats.defense, teamPokemon.level);
    battlePokemon.specialAttack = teamPokemon.calculatedStats?.spAttack || this.calculateBaseStat(pokemonData.baseStats.specialAttack, teamPokemon.level);
    battlePokemon.specialDefense = teamPokemon.calculatedStats?.spDefense || this.calculateBaseStat(pokemonData.baseStats.specialDefense, teamPokemon.level);
    battlePokemon.speed = teamPokemon.calculatedStats?.speed || this.calculateBaseStat(pokemonData.baseStats.speed, teamPokemon.level);
    
    // Moves
    battlePokemon.moves.clear();
    if (teamPokemon.moves && teamPokemon.moves.length > 0) {
      teamPokemon.moves.forEach((move: any) => {
        if (typeof move === 'string') {
          battlePokemon.moves.push(move);
        } else if (move.moveId) {
          battlePokemon.moves.push(move.moveId);
        }
      });
    } else {
      // Fallback : moves de base selon le niveau
      const baseMoves = pokemonData.learnset
        .filter((learn: any) => learn.level <= teamPokemon.level)
        .slice(-4)
        .map((learn: any) => learn.moveId);
      
      (baseMoves.length > 0 ? baseMoves : ["tackle"]).forEach((move: string) => {
        battlePokemon.moves.push(move);
      });
    }
    
    // Status
    battlePokemon.statusCondition = teamPokemon.status || "normal";
    
    return battlePokemon;
  }

  private calculateBaseStat(baseStat: number, level: number): number {
    // Formule simplifiée pour calculer une stat
    return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
  }

  // === GESTION DE LA DÉCONNEXION ===

  private endBattleEarly(reason: string) {
    console.log(`⚠️ ARRÊT PRÉMATURÉ: ${reason}`);
    
    this.state.phase = "ended";
    this.state.battleEnded = true;
    
    if (this.currentActionTimer) {
      clearTimeout(this.currentActionTimer);
    }
    
    this.addBattleMessage(`Combat interrompu: ${reason}`);
    
    this.broadcast("battleInterrupted", {
      reason: reason,
      message: "Le combat a été interrompu"
    });
    
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 2000);
  }

  async onDispose() {
    console.log(`💀 BattleRoom ${this.roomId} détruite`);
    
    // Nettoyer tous les blocages
    this.clients.forEach(client => {
      this.unblockPlayerInWorldRoom(client.sessionId);
      this.clearPlayerStatusIcon(client.sessionId);
    });
    
    // Nettoyer le timer
    if (this.currentActionTimer) {
      clearTimeout(this.currentActionTimer);
    }
    
    console.log(`✅ BattleRoom ${this.roomId} nettoyée`);
  }
}
