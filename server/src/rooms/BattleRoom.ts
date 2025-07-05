// server/src/rooms/BattleRoom.ts - VERSION AVEC VRAI COMBAT
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon, BattleAction } from "../schema/BattleState";
import { BattleManager } from "../managers/BattleManager";
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
  private battleManager!: BattleManager; // ✅ AJOUT: Instance du BattleManager
  
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
    
    // ✅ NOUVEAU: Initialiser BattleManager avec le state
    this.battleManager = new BattleManager(this.state);
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    // ✅ NOUVEAU: Initialiser MoveManager si pas encore fait
    await MoveManager.initialize();
    
    console.log(`✅ BattleRoom ${this.roomId} créée avec BattleManager`);
    
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
    console.log(`👤 Joueur ${client.sessionId} rejoint BattleRoom`);
    
    try {
      this.blockPlayerInWorldRoom(client.sessionId, "Entré en combat");
      
      const playerName = this.getPlayerName(client.sessionId);
      if (playerName) {
        const teamManager = new TeamManager(playerName);
        await teamManager.load();
        this.teamManagers.set(client.sessionId, teamManager);
        console.log(`📁 TeamManager chargé pour ${playerName}`);
      }

      if (this.state.player1Id === "" || this.state.player1Id === client.sessionId) {
        this.state.player1Id = client.sessionId;
        this.state.player1Name = playerName || "Player1";
      } else if (this.state.player2Id === "" || this.state.player2Id === client.sessionId) {
        this.state.player2Id = client.sessionId;
        this.state.player2Name = playerName || "Player2";
      }

      this.playerHpPercentages.set(client.sessionId, 100);
      
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: this.getPlayerRole(client.sessionId)
      });

      this.updatePlayerStatusIcon(client.sessionId, "entering_battle");

      if (this.shouldStartBattle()) {
        this.clock.setTimeout(() => this.startBattle(), 1000);
      }

    } catch (error) {
      console.error(`❌ Erreur onJoin BattleRoom:`, error);
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

  // === DÉMARRAGE DU COMBAT ===

  private async startBattle() {
    console.log(`🎬 DÉMARRAGE DU COMBAT AVEC BATTLEMANAGER !`);
    
    try {
      this.state.phase = "intro";
      
      if (this.state.battleType === "wild") {
        await this.setupWildBattleWithManager();
      } else {
        await this.setupPvPBattle();
      }
      
      this.state.phase = "team_selection";
      this.broadcast("phaseChange", { phase: "team_selection" });
      
      console.log(`✅ Combat configuré avec BattleManager`);
      
    } catch (error) {
      console.error(`❌ Erreur startBattle:`, error);
      this.endBattleEarly("setup_error");
    }
  }

  // ✅ NOUVEAU: Setup combat sauvage avec BattleManager
  private async setupWildBattleWithManager() {
    console.log(`🌿 Configuration combat sauvage avec BattleManager`);
    
    if (!this.battleInitData.wildPokemon) {
      throw new Error("Données Pokémon sauvage manquantes");
    }

    // ✅ Le BattleManager va créer les BattlePokemon directement
    // On n'a pas besoin de les créer manuellement ici
    
    console.log(`✅ Combat sauvage configuré pour BattleManager`);
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

  // ✅ AMÉLIORÉ: Choisir Pokémon et initialiser le BattleManager
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

      // ✅ NOUVEAU: Utiliser BattleManager pour initialiser le combat
      if (this.state.battleType === "wild" && this.battleInitData.wildPokemon) {
        await this.battleManager.initializeWildBattle(
          this.state.player1Id,
          this.state.player1Name,
          selectedPokemon.pokemonId,
          this.battleInitData.wildPokemon,
          this.battleInitData.wildPokemon.pokemonId.toString() // location simplifiée
        );
        
        console.log(`✅ Combat sauvage initialisé avec BattleManager`);
        
        // Le BattleManager a mis à jour le state, on peut commencer
        this.startActualBattle();
      }

    } catch (error) {
      console.error(`❌ Erreur handleChoosePokemon:`, error);
      client.send("error", { message: "Erreur lors de la sélection" });
    }
  }

  private startActualBattle() {
    console.log(`⚔️ DÉBUT DU COMBAT RÉEL AVEC BATTLEMANAGER !`);
    
    this.state.phase = "battle";
    this.state.waitingForAction = true;
    
    // Le BattleManager a déjà déterminé l'ordre et configuré le state
    
    this.broadcast("battleStart", {
      player1Pokemon: this.serializePokemonForClient(this.state.player1Pokemon),
      player2Pokemon: this.serializePokemonForClient(this.state.player2Pokemon),
      currentTurn: this.state.currentTurn,
      turnNumber: this.state.turnNumber,
      battleLog: Array.from(this.state.battleLog)
    });
    
    this.updateBattleStatusIcons();
    this.startActionTimer();
    
    console.log(`✅ Combat ${this.state.battleId} en cours avec BattleManager !`);
  }

  // === ACTIONS DE COMBAT AVEC BATTLEMANAGER ===

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
    
    // ✅ NOUVEAU: Créer BattleAction pour BattleManager
    const action = new BattleAction();
    action.type = data.actionType;
    action.playerId = client.sessionId;
    action.data = JSON.stringify(data);
    
    console.log(`🔥 [DEBUG] BattleAction créée:`, {
      type: action.type,
      playerId: action.playerId,
      data: action.data
    });
    
    // ✅ Calculer priorité et vitesse pour l'ordre d'action
    if (data.actionType === "attack" && data.moveId) {
      console.log(`🔥 [DEBUG] Calcul priorité pour attaque ${data.moveId}`);
      
      const moveData = MoveManager.getMoveData(data.moveId);
      action.priority = moveData?.priority || 0;
      
      const currentPokemon = this.getCurrentPlayerPokemon();
      action.speed = currentPokemon.speed;
      
      console.log(`🔥 [DEBUG] Priorité: ${action.priority}, Vitesse: ${action.speed}`);
    }

    console.log(`🔥 [DEBUG] Appel BattleManager.processAction...`);
    
    // ✅ NOUVEAU: Utiliser BattleManager pour traiter l'action
    await this.battleManager.processAction(action);
    
    console.log(`🔥 [DEBUG] BattleManager.processAction terminé`);
    console.log(`🔥 [DEBUG] État du combat après processAction:`, {
      battleEnded: this.state.battleEnded,
      currentTurn: this.state.currentTurn,
      turnNumber: this.state.turnNumber,
      player1Hp: this.state.player1Pokemon?.currentHp,
      player2Hp: this.state.player2Pokemon?.currentHp,
      lastMessage: this.state.lastMessage
    });
    
    // ✅ Le BattleManager met à jour automatiquement le state
    // On broadcast les changements
    console.log(`🔥 [DEBUG] Appel broadcastBattleUpdate...`);
    this.broadcastBattleUpdate();
    console.log(`🔥 [DEBUG] broadcastBattleUpdate terminé`);
    
    // ✅ Vérifier si le combat est terminé
    if (this.state.battleEnded) {
      console.log(`🔥 [DEBUG] Combat terminé, appel handleBattleEnd...`);
      await this.handleBattleEnd();
    } else {
      console.log(`🔥 [DEBUG] Combat continue, mise à jour statuts...`);
      
      // Mettre à jour les icônes de statut
      this.updatePlayerHpPercentages();
      this.updateBattleStatusIcons();
      
      console.log(`🔥 [DEBUG] Statuts mis à jour`);
    }

    console.log(`🔥 [DEBUG] handleBattleAction terminé avec succès`);

  } catch (error) {
    console.error(`🔥 [DEBUG] ERREUR dans handleBattleAction:`, error);
    console.error(`🔥 [DEBUG] Stack trace:`, error.stack);
    client.send("error", { message: "Erreur lors de l'action" });
  }
}

  // ✅ NOUVEAU: Broadcast des mises à jour de combat
  private broadcastBattleUpdate() {
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
  }

  // ✅ NOUVEAU: Gestion de la fin de combat avec BattleManager
  private async handleBattleEnd() {
    console.log(`🏁 FIN DE COMBAT DÉTECTÉE PAR BATTLEMANAGER`);
    
    // Récupérer les résultats du BattleManager
    const battleResult = this.battleManager.getBattleResult();
    
    console.log(`📊 Résultat:`, battleResult);
    
    // Déterminer le type de fin
    let endType: "victory" | "defeat" | "fled" | "draw";
    
    if (this.state.pokemonCaught) {
      endType = "victory";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
    } else if (battleResult.winner === 'player') {
      endType = "victory";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
    } else if (battleResult.winner === 'opponent') {
      endType = "defeat";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_defeat");
    } else {
      endType = "draw";
    }
    
    // Sauvegarder les changements des Pokémon
    await this.updatePokemonAfterBattle(this.state.player1Id, this.state.player1Pokemon);
    
    // Calculer les récompenses
    const rewards = this.calculateRewards(endType, battleResult);
    
    // Broadcast du résultat final
    this.broadcast("battleEnd", {
      result: endType,
      rewards: rewards,
      finalLog: Array.from(this.state.battleLog),
      battleResult: battleResult
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
    
    // ✅ NOUVEAU: Utiliser BattleManager pour la logique de fuite
    const action = new BattleAction();
    action.type = "run";
    action.playerId = client.sessionId;
    action.data = JSON.stringify({});
    
    try {
      await this.battleManager.processAction(action);
      
      // Le BattleManager a mis à jour le state
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
    console.log(`🤖 Tour de l'IA avec BattleManager`);
    
    // ✅ Le BattleManager génère automatiquement l'action IA
    // Quand on processAction du joueur, l'IA répond automatiquement
    // Donc cette méthode est maintenant simplifiée
    
    // Appliquer les effets de fin de tour
    this.battleManager.processEndOfTurnEffects();
    
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
    return this.state.battleType === "wild" ? this.clients.length >= 1 : this.clients.length >= 2;
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
      
      await this.battleManager.processAction(action);
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
