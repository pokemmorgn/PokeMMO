// server/src/rooms/BattleRoom.ts
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon, BattleAction } from "../schema/BattleState";
import { WildPokemon } from "../managers/EncounterManager";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";

// Interface pour les données initiales du combat
export interface BattleInitData {
  battleType: "wild" | "pvp";
  playerData: {
    sessionId: string;
    name: string;
    worldRoomId: string;  // Pour communiquer avec WorldRoom
    activePokemonId?: string; // Pokémon actif choisi
  };
  wildPokemon?: WildPokemon;
  player2Data?: {
    sessionId: string;
    name: string;
    worldRoomId: string;
  };
}

// Types pour les icônes de statut
export type BattleStatusIcon = 
  | "entering_battle"    // ⚔️ 
  | "battle_advantage"   // 😤
  | "battle_struggling"  // 😰 
  | "battle_critical"    // 😵
  | "battle_victory"     // 🎉
  | "battle_defeat"      // 😢
  | "battle_fled"        // 🏃
  | "capturing"          // 🎯
  | "switching_pokemon"; // 🔄

export class BattleRoom extends Room<BattleState> {
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  private worldRoomRef: any = null; // Référence vers WorldRoom
  
  // Combat timing
  private actionTimeoutMs = 30000; // 30s pour choisir action
  private currentActionTimer?: NodeJS.Timeout;

  // Statistiques pour icônes
  private playerHpPercentages: Map<string, number> = new Map();
  private lastStatusIcons: Map<string, BattleStatusIcon> = new Map();

  maxClients = 2; // 1 pour sauvage, 2 pour PvP

  async onCreate(options: BattleInitData) {
    console.log(`⚔️ === CRÉATION BATTLEROOM ===`);
    console.log(`🎯 Type: ${options.battleType}`);
    console.log(`👤 Joueur 1: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    console.log(`✅ BattleRoom ${this.roomId} créée`);
    
    // Setup des handlers
    this.setupMessageHandlers();
    
    // Récupérer référence vers WorldRoom pour notifications de statut
    await this.setupWorldRoomConnection();
  }

private async setupWorldRoomConnection() {
  try {
    console.log(`🔗 [BattleRoom] Tentative de connexion à WorldRoom...`);
    
    // ✅ CORRECTION: Utiliser le bon chemin d'import et vérifier l'existence
    const { ServiceRegistry } = require('../services/ServiceRegistry');
    
    if (!ServiceRegistry) {
      console.warn(`⚠️ [BattleRoom] ServiceRegistry non trouvé, mode dégradé`);
      this.worldRoomRef = null;
      return;
    }
    
    const registry = ServiceRegistry.getInstance();
    
    if (!registry) {
      console.warn(`⚠️ [BattleRoom] Instance ServiceRegistry non disponible`);
      this.worldRoomRef = null;
      return;
    }
    
    // ✅ CORRECTION: Utiliser la méthode getWorldRoom() qui existe maintenant
    this.worldRoomRef = registry.getWorldRoom();
    
    if (this.worldRoomRef) {
      console.log(`✅ [BattleRoom] Connectée à WorldRoom avec succès`);
    } else {
      console.warn(`⚠️ [BattleRoom] WorldRoom non disponible dans ServiceRegistry`);
      console.log(`ℹ️ [BattleRoom] Mode dégradé : notifications de statut désactivées`);
    }
    
  } catch (error) {
    console.error(`❌ [BattleRoom] Erreur connexion WorldRoom:`, error);
    console.log(`🔄 [BattleRoom] Passage en mode dégradé sans WorldRoom`);
    this.worldRoomRef = null;
  }
}

  private setupMessageHandlers() {
    console.log(`📨 Configuration handlers BattleRoom...`);

    // === ACTIONS DE COMBAT ===
    
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });

    // === CHOIX POKÉMON INITIAL ===
    
    this.onMessage("choosePokemon", async (client, data: { pokemonId: string }) => {
      await this.handleChoosePokemon(client, data.pokemonId);
    });

    // === CAPTURE ===
    
    this.onMessage("attemptCapture", async (client, data: { ballType: string }) => {
      await this.handleCaptureAttempt(client, data.ballType);
    });

    // === FUITE ===
    
    this.onMessage("attemptFlee", async (client) => {
      await this.handleFleeAttempt(client);
    });

    // === CHANGEMENT POKÉMON ===
    
    this.onMessage("switchPokemon", async (client, data: { newPokemonId: string }) => {
      await this.handleSwitchPokemon(client, data.newPokemonId);
    });

    // === DEBUG ===
    
    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", {
        phase: this.state.phase,
        currentTurn: this.state.currentTurn,
        player1Pokemon: this.state.player1Pokemon,
        player2Pokemon: this.state.player2Pokemon,
        battleLog: Array.from(this.state.battleLog)
      });
    });

    console.log(`✅ Handlers BattleRoom configurés`);
  }

  // === MÉTHODES PRINCIPALES ===

  async onJoin(client: Client, options: any) {
    console.log(`👤 Joueur ${client.sessionId} rejoint BattleRoom`);
    
    try {
      // Bloquer le mouvement dans WorldRoom
      this.blockPlayerInWorldRoom(client.sessionId, "Entré en combat");
      
      // Charger le TeamManager du joueur
      const playerName = this.getPlayerName(client.sessionId);
      if (playerName) {
        const teamManager = new TeamManager(playerName);
        await teamManager.load();
        this.teamManagers.set(client.sessionId, teamManager);
        console.log(`📁 TeamManager chargé pour ${playerName}`);
      }

      // Configurer le joueur dans le state
      if (this.state.player1Id === "" || this.state.player1Id === client.sessionId) {
        this.state.player1Id = client.sessionId;
        this.state.player1Name = playerName || "Player1";
      } else if (this.state.player2Id === "" || this.state.player2Id === client.sessionId) {
        this.state.player2Id = client.sessionId;
        this.state.player2Name = playerName || "Player2";
      }

      // Initialiser HP à 100% pour le calcul d'icône
      this.playerHpPercentages.set(client.sessionId, 100);
      
      // Envoyer l'état initial
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: this.getPlayerRole(client.sessionId)
      });

      // Mettre à jour le statut visuel
      this.updatePlayerStatusIcon(client.sessionId, "entering_battle");

      // Démarrer le combat si tout le monde est là
      if (this.shouldStartBattle()) {
        this.clock.setTimeout(() => this.startBattle(), 1000);
      }

    } catch (error) {
      console.error(`❌ Erreur onJoin BattleRoom:`, error);
      client.leave(1000, "Erreur lors de l'entrée en combat");
    }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 ${client.sessionId} quitte BattleRoom (consenti: ${consented})`);
    
    try {
      // Débloquer le mouvement
      this.unblockPlayerInWorldRoom(client.sessionId);
      
      // Nettoyer le statut visuel
      this.clearPlayerStatusIcon(client.sessionId);
      
      // Nettoyer les données
      this.teamManagers.delete(client.sessionId);
      this.playerHpPercentages.delete(client.sessionId);
      this.lastStatusIcons.delete(client.sessionId);
      
      // Si le combat était en cours, l'arrêter
      if (this.state.phase === "battle") {
        this.endBattleEarly("player_disconnected");
      }
      
    } catch (error) {
      console.error(`❌ Erreur onLeave BattleRoom:`, error);
    }
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

  // === LOGIQUE DE COMBAT ===

  private async startBattle() {
    console.log(`🎬 DÉMARRAGE DU COMBAT !`);
    
    try {
      this.state.phase = "intro";
      
      // Configurer le combat selon le type
      if (this.state.battleType === "wild") {
        await this.setupWildBattle();
      } else {
        await this.setupPvPBattle();
      }
      
      // Passer en phase de sélection d'équipe
      this.state.phase = "team_selection";
      this.broadcast("phaseChange", { phase: "team_selection" });
      
      console.log(`✅ Combat configuré, attente sélection équipe`);
      
    } catch (error) {
      console.error(`❌ Erreur startBattle:`, error);
      this.endBattleEarly("setup_error");
    }
  }

  private async setupWildBattle() {
    console.log(`🌿 Configuration combat sauvage`);
    
    if (!this.battleInitData.wildPokemon) {
      throw new Error("Données Pokémon sauvage manquantes");
    }

    const wildPokemon = this.battleInitData.wildPokemon;
    
    // Créer le BattlePokemon sauvage
    const wildBattlePokemon = new BattlePokemon();
    
    // Récupérer les données du Pokémon
    const pokemonData = await getPokemonById(wildPokemon.pokemonId);
    if (!pokemonData) {
      throw new Error(`Pokémon ${wildPokemon.pokemonId} introuvable`);
    }

    // Configurer le Pokémon sauvage
    wildBattlePokemon.pokemonId = wildPokemon.pokemonId;
    wildBattlePokemon.name = pokemonData.name;
    wildBattlePokemon.level = wildPokemon.level;
    wildBattlePokemon.isWild = true;
    wildBattlePokemon.gender = wildPokemon.gender;
    wildBattlePokemon.shiny = wildPokemon.shiny;
    
    // Types
    wildBattlePokemon.types.clear();
    pokemonData.types.forEach(type => wildBattlePokemon.types.push(type));
    
    // Calculer les stats avec IVs
    const stats = this.calculateStats(pokemonData, wildPokemon.level, wildPokemon.ivs);
    wildBattlePokemon.maxHp = stats.hp;
    wildBattlePokemon.currentHp = stats.hp;
    wildBattlePokemon.attack = stats.attack;
    wildBattlePokemon.defense = stats.defense;
    wildBattlePokemon.specialAttack = stats.specialAttack;
    wildBattlePokemon.specialDefense = stats.specialDefense;
    wildBattlePokemon.speed = stats.speed;
    
    // Moves
    wildBattlePokemon.moves.clear();
    wildPokemon.moves.forEach(move => wildBattlePokemon.moves.push(move));
    
    // Assigner comme player2 (adversaire)
    this.state.player2Pokemon = wildBattlePokemon;
    this.state.player2Name = `${pokemonData.name} sauvage`;
    
    this.addBattleMessage(`Un ${pokemonData.name} sauvage apparaît !`);
    
    console.log(`✅ ${pokemonData.name} sauvage configuré (Niv.${wildPokemon.level})`);
  }

  private async setupPvPBattle() {
    console.log(`⚔️ Configuration combat PvP`);
    // TODO: À implémenter pour les combats joueur vs joueur
    this.addBattleMessage("Combat PvP à implémenter");
  }

  private async handleChoosePokemon(client: Client, pokemonId: string) {
    console.log(`🎯 ${client.sessionId} choisit Pokémon: ${pokemonId}`);
    
    try {
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("error", { message: "TeamManager non trouvé" });
        return;
      }

      // Récupérer le Pokémon de l'équipe
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

      // Créer le BattlePokemon
      const battlePokemon = await this.createBattlePokemonFromTeam(selectedPokemon);
      
      // Assigner selon le rôle du joueur
      if (client.sessionId === this.state.player1Id) {
        this.state.player1Pokemon = battlePokemon;
      } else if (client.sessionId === this.state.player2Id) {
        this.state.player2Pokemon = battlePokemon;
      }

      console.log(`✅ ${selectedPokemon.nickname || 'Pokémon'} assigné`);

      // Vérifier si on peut commencer le combat
      if (this.canStartActualBattle()) {
        this.startActualBattle();
      }

    } catch (error) {
      console.error(`❌ Erreur handleChoosePokemon:`, error);
      client.send("error", { message: "Erreur lors de la sélection" });
    }
  }

  private async createBattlePokemonFromTeam(teamPokemon: any): Promise<BattlePokemon> {
    const battlePokemon = new BattlePokemon();
    
    // Récupérer les données de base
    const pokemonData = await getPokemonById(teamPokemon.pokemonId);
    if (!pokemonData) {
      throw new Error(`Données Pokémon ${teamPokemon.pokemonId} introuvables`);
    }

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
    
    // Stats actuelles (avec IVs, nature, etc.)
    battlePokemon.maxHp = teamPokemon.maxHp;
    battlePokemon.currentHp = teamPokemon.currentHp;
    battlePokemon.attack = teamPokemon.calculatedStats?.attack || 50;
    battlePokemon.defense = teamPokemon.calculatedStats?.defense || 50;
    battlePokemon.specialAttack = teamPokemon.calculatedStats?.spAttack || 50;
    battlePokemon.specialDefense = teamPokemon.calculatedStats?.spDefense || 50;
    battlePokemon.speed = teamPokemon.calculatedStats?.speed || 50;
    
    // Moves
    battlePokemon.moves.clear();
    // TODO: Récupérer les moves réels du Pokémon de l'équipe
    // Pour l'instant, utiliser les moves de base
    const baseMoves = pokemonData.learnset
      .filter((learn: any) => learn.level <= teamPokemon.level)
      .slice(-4)
      .map((learn: any) => learn.moveId);
    
    (baseMoves || ["tackle"]).forEach((move: string) => battlePokemon.moves.push(move));
    
    // Status
    battlePokemon.statusCondition = teamPokemon.status || "normal";
    
    return battlePokemon;
  }

  private startActualBattle() {
    console.log(`⚔️ DÉBUT DU COMBAT RÉEL !`);
    
    this.state.phase = "battle";
    this.state.waitingForAction = true;
    this.state.turnNumber = 1;
    
    // Déterminer qui commence (plus rapide en premier)
    this.determineTurnOrder();
    
    // Messages d'introduction
    this.addBattleMessage(`${this.state.player1Pokemon.name} ! Je te choisis !`);
    
    if (this.state.battleType === "wild") {
      this.addBattleMessage(`Face à ${this.state.player2Pokemon.name} sauvage !`);
    }
    
    // Broadcast de début
    this.broadcast("battleStart", {
      player1Pokemon: this.serializePokemonForClient(this.state.player1Pokemon),
      player2Pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
      currentTurn: this.state.currentTurn,
      turnNumber: this.state.turnNumber
    });
    
    // Mettre à jour les icônes
    this.updateBattleStatusIcons();
    
    // Démarrer le timer d'action
    this.startActionTimer();
    
    console.log(`✅ Combat ${this.state.battleId} en cours !`);
  }

  private determineTurnOrder() {
    const player1Speed = this.state.player1Pokemon.speed;
    const player2Speed = this.state.player2Pokemon.speed;
    
    if (player1Speed > player2Speed) {
      this.state.currentTurn = "player1";
    } else if (player2Speed > player1Speed) {
      this.state.currentTurn = "player2";
    } else {
      // Égalité : aléatoire
      this.state.currentTurn = Math.random() < 0.5 ? "player1" : "player2";
    }
    
    console.log(`🎲 Tour: ${this.state.currentTurn} (Speed: P1=${player1Speed}, P2=${player2Speed})`);
  }

  // === ACTIONS DE COMBAT ===

  private async handleBattleAction(client: Client, data: any) {
    if (this.state.phase !== "battle") {
      client.send("error", { message: "Combat non actif" });
      return;
    }

    const playerRole = this.getPlayerRole(client.sessionId);
    if (this.state.currentTurn !== playerRole) {
      client.send("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    console.log(`🎮 Action de ${client.sessionId}: ${data.actionType}`);

    try {
      // Créer l'action
      const action = new BattleAction();
      action.type = data.actionType;
      action.playerId = client.sessionId;
      action.data = JSON.stringify(data);
      
      // Traiter selon le type
      switch (data.actionType) {
        case "attack":
          await this.processAttackAction(client, data.moveId);
          break;
        case "item":
          await this.processItemAction(client, data.itemId);
          break;
        case "switch":
          await this.processSwitchAction(client, data.targetPokemonId);
          break;
        case "run":
          await this.processRunAction(client);
          break;
        default:
          client.send("error", { message: "Action inconnue" });
          return;
      }

      // Passer au tour suivant
      this.nextTurn();

    } catch (error) {
      console.error(`❌ Erreur handleBattleAction:`, error);
      client.send("error", { message: "Erreur lors de l'action" });
    }
  }

  private async processAttackAction(client: Client, moveId: string) {
    // TODO: Implémenter logique d'attaque complète
    this.addBattleMessage(`${this.getCurrentPlayerPokemon().name} utilise ${moveId} !`);
    
    // Simulation simple pour test
    const damage = Math.floor(Math.random() * 50) + 10;
    const opponent = this.getOpponentPokemon();
    opponent.currentHp = Math.max(0, opponent.currentHp - damage);
    
    this.addBattleMessage(`${opponent.name} perd ${damage} PV !`);
    
    // Mettre à jour les HP pour les icônes
    this.updatePlayerHpPercentages();
    this.updateBattleStatusIcons();
    
    // Vérifier fin de combat
    if (opponent.currentHp <= 0) {
      this.endBattle("victory");
    }
  }

  private async processItemAction(client: Client, itemId: string) {
    this.addBattleMessage(`${this.state.player1Name} utilise ${itemId} !`);
    
    if (itemId.includes("ball") && this.state.battleType === "wild") {
      // Tentative de capture
      this.updatePlayerStatusIcon(client.sessionId, "capturing");
      // TODO: Logique de capture
      this.addBattleMessage("*Boing*");
    }
  }

  private async processSwitchAction(client: Client, targetPokemonId: string) {
    this.updatePlayerStatusIcon(client.sessionId, "switching_pokemon");
    this.addBattleMessage(`${this.state.player1Name} rappelle son Pokémon !`);
    // TODO: Logique de changement
  }

  private async processRunAction(client: Client) {
    if (this.state.battleType === "wild") {
      this.updatePlayerStatusIcon(client.sessionId, "battle_fled");
      this.addBattleMessage(`${this.state.player1Name} prend la fuite !`);
      this.endBattle("fled");
    } else {
      client.send("error", { message: "Impossible de fuir un combat de dresseur !" });
    }
  }

  // === GESTION DES TOURS ===

  private nextTurn() {
    // Nettoyer le timer précédent
    if (this.currentActionTimer) {
      clearTimeout(this.currentActionTimer);
    }

    // Changer de tour
    this.state.currentTurn = this.state.currentTurn === "player1" ? "player2" : "player1";
    this.state.turnNumber++;
    
    console.log(`🔄 Tour ${this.state.turnNumber}: ${this.state.currentTurn}`);

    // Si c'est l'IA (combat sauvage), jouer automatiquement
    if (this.state.battleType === "wild" && this.state.currentTurn === "player2") {
      this.clock.setTimeout(() => this.playAITurn(), 1500);
    } else {
      // Joueur humain : démarrer timer
      this.startActionTimer();
    }

    // Broadcast du changement
    this.broadcast("turnChange", {
      currentTurn: this.state.currentTurn,
      turnNumber: this.state.turnNumber
    });
  }

  private playAITurn() {
    console.log(`🤖 Tour de l'IA`);
    
    // IA simple : attaque aléatoire
    const moves = Array.from(this.state.player2Pokemon.moves);
    const randomMove = moves[Math.floor(Math.random() * moves.length)] || "tackle";
    
    this.addBattleMessage(`${this.state.player2Pokemon.name} utilise ${randomMove} !`);
    
    // Simulation dégâts sur player1
    const damage = Math.floor(Math.random() * 40) + 10;
    this.state.player1Pokemon.currentHp = Math.max(0, this.state.player1Pokemon.currentHp - damage);
    
    this.addBattleMessage(`${this.state.player1Pokemon.name} perd ${damage} PV !`);
    
    // Mettre à jour icônes
    this.updatePlayerHpPercentages();
    this.updateBattleStatusIcons();
    
    // Vérifier fin
    if (this.state.player1Pokemon.currentHp <= 0) {
      this.endBattle("defeat");
    } else {
      this.nextTurn();
    }
  }

  private startActionTimer() {
    this.currentActionTimer = setTimeout(() => {
      console.log(`⏰ Timeout d'action pour ${this.state.currentTurn}`);
      
      if (this.state.currentTurn === "player1") {
        // Joueur n'a pas agi : action par défaut (attaque de base)
        this.addBattleMessage(`${this.state.player1Pokemon.name} utilise Charge !`);
        // Simulation action par défaut
        this.nextTurn();
      }
    }, this.actionTimeoutMs);
  }

  // === GESTION DES ICÔNES DE STATUT ===

  private updatePlayerHpPercentages() {
    // Player 1
    if (this.state.player1Pokemon.maxHp > 0) {
      const hp1 = (this.state.player1Pokemon.currentHp / this.state.player1Pokemon.maxHp) * 100;
      this.playerHpPercentages.set(this.state.player1Id, hp1);
    }
    
    // Player 2 (si humain)
    if (this.state.player2Id && this.state.player2Pokemon.maxHp > 0) {
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
      
      // Mettre à jour seulement si changé
      const lastIcon = this.lastStatusIcons.get(client.sessionId);
      if (lastIcon !== newIcon) {
        this.updatePlayerStatusIcon(client.sessionId, newIcon);
      }
    });
  }

private updatePlayerStatusIcon(sessionId: string, icon: any) {
  this.lastStatusIcons.set(sessionId, icon);
  
  if (this.worldRoomRef) {
    try {
      // Notifier WorldRoom du changement d'icône
      this.worldRoomRef.broadcast("playerStatusIcon", {
        playerId: sessionId,
        icon: icon,
        iconEmoji: this.getIconEmoji(icon)
      });
      
      console.log(`📱 Icône ${icon} mise à jour pour ${sessionId}`);
    } catch (error) {
      console.error(`❌ Erreur mise à jour icône:`, error);
    }
  } else {
    // Mode dégradé : just log
    console.log(`📱 [DÉGRADÉ] Icône ${icon} pour ${sessionId} (WorldRoom indisponible)`);
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
  } else {
    // Mode dégradé : just log
    console.log(`🧹 [DÉGRADÉ] Icône nettoyée pour ${sessionId} (WorldRoom indisponible)`);
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

  // === FIN DE COMBAT ===

  private async endBattle(result: "victory" | "defeat" | "fled" | "draw") {
    console.log(`🏁 FIN DE COMBAT: ${result}`);
    
    this.state.phase = "ended";
    this.state.battleEnded = true;
    
    // Nettoyer le timer
    if (this.currentActionTimer) {
      clearTimeout(this.currentActionTimer);
    }
    
    // Messages de fin
    switch (result) {
      case "victory":
        this.addBattleMessage(`${this.state.player1Name} remporte le combat !`);
        this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
        break;
      case "defeat":
        this.addBattleMessage(`${this.state.player1Name} est défait...`);
        this.updatePlayerStatusIcon(this.state.player1Id, "battle_defeat");
        break;
      case "fled":
        this.addBattleMessage(`${this.state.player1Name} s'enfuit !`);
        this.updatePlayerStatusIcon(this.state.player1Id, "battle_fled");
        break;
      case "draw":
        this.addBattleMessage("Match nul !");
        break;
    }
    
    // Sauvegarder les changements des Pokémon
    if (this.state.player1Pokemon) {
      await this.updatePokemonAfterBattle(this.state.player1Id, this.state.player1Pokemon);
    }
    
    if (this.state.player2Id && this.state.player2Pokemon && !this.state.player2Pokemon.isWild) {
      await this.updatePokemonAfterBattle(this.state.player2Id, this.state.player2Pokemon);
    }
    
    // Calculer les récompenses
    const rewards = this.calculateRewards(result);
    
    // Broadcast du résultat
    this.broadcast("battleEnd", {
      result: result,
      rewards: rewards,
      finalLog: Array.from(this.state.battleLog)
    });
    
    // Programmer la fermeture de la room
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 5000); // 5 secondes pour voir les résultats
  }

  private endBattleEarly(reason: string) {
    console.log(`⚠️ ARRÊT PRÉMATURÉ: ${reason}`);
    
    this.state.phase = "ended";
    this.state.battleEnded = true;
    
    this.addBattleMessage(`Combat interrompu: ${reason}`);
    
    this.broadcast("battleInterrupted", {
      reason: reason,
      message: "Le combat a été interrompu"
    });
    
    // Fermeture immédiate
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 2000);
  }

  private calculateRewards(result: "victory" | "defeat" | "fled" | "draw") {
    const rewards: any = {
      experience: 0,
      gold: 0,
      items: [],
      pokemonCaught: null
    };
    
    if (result === "victory" && this.state.battleType === "wild") {
      // XP basé sur le niveau du Pokémon sauvage
      const wildLevel = this.state.player2Pokemon.level;
      rewards.experience = Math.floor((wildLevel * 50) + Math.random() * 20);
      
      // Or bonus
      rewards.gold = Math.floor(wildLevel * 10 + Math.random() * 50);
      
      console.log(`🎁 Récompenses: ${rewards.experience} XP, ${rewards.gold} gold`);
    }
    
    return rewards;
  }

  // === CAPTURE ===

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
    
    this.updatePlayerStatusIcon(client.sessionId, "capturing");
    this.addBattleMessage(`${this.state.player1Name} lance une ${ballType} !`);
    
    // TODO: Utiliser le vrai CaptureManager
    // Pour l'instant, simulation simple
    const captureRate = this.calculateSimpleCaptureRate();
    const success = Math.random() < captureRate;
    
    // Animation de capture
    this.addBattleMessage("*Boing*");
    
    // Simulation des secousses
    const shakes = success ? 3 : Math.floor(Math.random() * 3);
    
    for (let i = 0; i < shakes; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.addBattleMessage("*Clic*");
      this.broadcast("captureShake", { shakeNumber: i + 1 });
    }
    
    if (success) {
      this.addBattleMessage(`Gotcha ! ${this.state.player2Pokemon.name} a été capturé !`);
      this.state.pokemonCaught = true;
      this.endBattle("victory");
      
      // TODO: Ajouter le Pokémon à l'équipe/PC du joueur
      
    } else {
      this.addBattleMessage(`Oh non ! ${this.state.player2Pokemon.name} s'est échappé !`);
      this.nextTurn();
    }
  }

  private calculateSimpleCaptureRate(): number {
    const currentHp = this.state.player2Pokemon.currentHp;
    const maxHp = this.state.player2Pokemon.maxHp;
    const hpRatio = currentHp / maxHp;
    
    // Taux plus élevé si HP bas
    let rate = 0.1; // Base 10%
    if (hpRatio < 0.25) rate = 0.7;       // 70% si <25% HP
    else if (hpRatio < 0.5) rate = 0.4;   // 40% si <50% HP
    else if (hpRatio < 0.75) rate = 0.2;  // 20% si <75% HP
    
    return rate;
  }

  private async handleFleeAttempt(client: Client) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de fuir un combat de dresseur !" });
      return;
    }
    
    console.log(`🏃 ${client.sessionId} tente de fuir`);
    
    // Calcul simple de réussite de fuite
    const playerSpeed = this.state.player1Pokemon.speed;
    const wildSpeed = this.state.player2Pokemon.speed;
    
    let fleeChance = 0.75; // Base 75%
    if (playerSpeed >= wildSpeed) {
      fleeChance = 1.0; // Garanti si plus rapide
    } else {
      fleeChance = Math.min(0.9, 0.5 + (playerSpeed / wildSpeed) * 0.4);
    }
    
    if (Math.random() < fleeChance) {
      this.endBattle("fled");
    } else {
      this.addBattleMessage("Impossible de fuir !");
      this.nextTurn();
    }
  }

  private async handleSwitchPokemon(client: Client, newPokemonId: string) {
    console.log(`🔄 ${client.sessionId} change pour Pokémon ${newPokemonId}`);
    
    try {
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("error", { message: "Équipe non trouvée" });
        return;
      }
      
      // TODO: Logique complète de changement
      this.updatePlayerStatusIcon(client.sessionId, "switching_pokemon");
      this.addBattleMessage(`${this.state.player1Name} rappelle son Pokémon !`);
      
      // Simuler le changement
      setTimeout(() => {
        this.addBattleMessage(`Vas-y, nouveau Pokémon !`);
        this.nextTurn();
      }, 2000);
      
    } catch (error) {
      console.error(`❌ Erreur changement Pokémon:`, error);
      client.send("error", { message: "Erreur lors du changement" });
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private shouldStartBattle(): boolean {
    if (this.state.battleType === "wild") {
      return this.clients.length >= 1; // Juste le joueur
    } else {
      return this.clients.length >= 2; // Les deux joueurs
    }
  }

  private canStartActualBattle(): boolean {
    if (this.state.battleType === "wild") {
      return !!this.state.player1Pokemon && !!this.state.player2Pokemon;
    } else {
      return !!this.state.player1Pokemon && !!this.state.player2Pokemon;
    }
  }

  private getPlayerName(sessionId: string): string | null {
    if (sessionId === this.battleInitData.playerData.sessionId) {
      return this.battleInitData.playerData.name;
    }
    if (this.battleInitData.player2Data && sessionId === this.battleInitData.player2Data.sessionId) {
      return this.battleInitData.player2Data.name;
    }
    return null;
  }

  private getPlayerRole(sessionId: string): "player1" | "player2" | null {
    if (sessionId === this.state.player1Id) return "player1";
    if (sessionId === this.state.player2Id) return "player2";
    return null;
  }

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

  private addBattleMessage(message: string) {
    this.state.battleLog.push(message);
    this.state.lastMessage = message;
    
    console.log(`💬 [COMBAT] ${message}`);
    
    // Limiter à 50 messages
    if (this.state.battleLog.length > 50) {
      this.state.battleLog.splice(0, this.state.battleLog.length - 50);
    }
    
    // Broadcast immédiat du message
    this.broadcast("battleMessage", { message });
  }

  private serializePokemonForClient(pokemon: BattlePokemon) {
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
      isWild: pokemon.isWild
    };
  }

  private calculateStats(pokemonData: any, level: number, ivs: any) {
    const calculateStat = (baseStat: number, iv: number, isHP: boolean = false): number => {
      if (isHP) {
        return Math.floor(((2 * baseStat + iv) * level) / 100) + level + 10;
      } else {
        return Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
      }
    };

    return {
      hp: calculateStat(pokemonData.baseStats.hp, ivs.hp, true),
      attack: calculateStat(pokemonData.baseStats.attack, ivs.attack),
      defense: calculateStat(pokemonData.baseStats.defense, ivs.defense),
      specialAttack: calculateStat(pokemonData.baseStats.specialAttack, ivs.spAttack),
      specialDefense: calculateStat(pokemonData.baseStats.specialDefense, ivs.spDefense),
      speed: calculateStat(pokemonData.baseStats.speed, ivs.speed)
    };
  }

  // === GESTION DES DÉGÂTS ET PP ===

  private async updatePokemonAfterBattle(sessionId: string, battlePokemon: BattlePokemon) {
    console.log(`💾 Mise à jour ${battlePokemon.name} après combat`);
    
    try {
      const teamManager = this.teamManagers.get(sessionId);
      if (!teamManager) {
        console.warn(`⚠️ TeamManager non trouvé pour ${sessionId}`);
        return;
      }

      // Récupérer l'équipe
      const team = await teamManager.getTeam();
      const pokemonIndex = team.findIndex(p => p._id.toString() === battlePokemon.pokemonId.toString());
      
      if (pokemonIndex === -1) {
        console.warn(`⚠️ Pokémon non trouvé dans l'équipe`);
        return;
      }

      const teamPokemon = team[pokemonIndex];
      
      // Mettre à jour les HP
      if (teamPokemon.currentHp !== battlePokemon.currentHp) {
        console.log(`💔 HP: ${teamPokemon.currentHp} → ${battlePokemon.currentHp}`);
        // TODO: Utiliser une méthode du TeamManager pour sauvegarder
        // teamManager.updatePokemonHp(pokemonIndex, battlePokemon.currentHp);
      }
      
      // Mettre à jour le statut
      if (teamPokemon.status !== battlePokemon.statusCondition) {
        console.log(`🌡️ Status: ${teamPokemon.status} → ${battlePokemon.statusCondition}`);
        // TODO: Utiliser une méthode du TeamManager pour sauvegarder
        // teamManager.updatePokemonStatus(pokemonIndex, battlePokemon.statusCondition);
      }
      
      // TODO: Mettre à jour les PP des moves utilisés
      
      console.log(`✅ ${battlePokemon.name} mis à jour`);
      
    } catch (error) {
      console.error(`❌ Erreur mise à jour Pokémon:`, error);
    }
  }

  // === COMMUNICATION AVEC WORLDROOM ===

// === COMMUNICATION AVEC WORLDROOM ===

private blockPlayerInWorldRoom(sessionId: string, reason: string) {
  if (this.worldRoomRef) {
    try {
      this.worldRoomRef.blockPlayerMovement(sessionId, "battle", 0, { reason });
      console.log(`🚫 Mouvement bloqué pour ${sessionId}: ${reason}`);
    } catch (error) {
      console.error(`❌ Erreur blocage mouvement:`, error);
    }
  } else {
    // ✅ AJOUT: Mode dégradé - juste logger
    console.log(`🚫 [DÉGRADÉ] Mouvement bloqué pour ${sessionId}: ${reason} (WorldRoom indisponible)`);
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
    // ✅ AJOUT: Mode dégradé - juste logger
    console.log(`✅ [DÉGRADÉ] Mouvement débloqué pour ${sessionId} (WorldRoom indisponible)`);
  }
}
}  
