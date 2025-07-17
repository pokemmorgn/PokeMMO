// server/src/handlers/BattleHandlers.ts
import { Client, matchMaker } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { BattleRoom, BattleInitData } from "../rooms/BattleRoom";
import { WildPokemon } from "../managers/EncounterManager";
import { TeamManager } from "../managers/TeamManager";
import { getPokemonById } from '../data/PokemonData';
import { JWTManager } from '../managers/JWTManager';

/**
 * Gestionnaire centralisé pour tous les handlers de combat + CAPTURE
 * Gère la création, connexion et communication avec les BattleRoom
 */
export class BattleHandlers {
  private room: WorldRoom;
    private jwtManager = JWTManager.getInstance(); // ← AJOUTER ÇA

  // Tracking des combats actifs
  private activeBattles: Map<string, string> = new Map(); // sessionId -> battleRoomId
  private battleRequests: Map<string, any> = new Map(); // sessionId -> battle request data

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`⚔️ [BattleHandlers] Initialisé pour ${room.constructor.name} + capture`);
  }

  // ✅ CONFIGURATION DES HANDLERS
  setupHandlers(): void {
    console.log(`📨 [BattleHandlers] Configuration des handlers + capture...`);

    // === HANDLERS PRINCIPAUX ===
    
    // Démarrer un combat sauvage
    this.room.onMessage("startWildBattle", async (client, data: {
      wildPokemon: WildPokemon;
      location: string;
      method: string;
    }) => {
      await this.handleStartWildBattle(client, data);
    });

    // Répondre à une proposition de combat
    this.room.onMessage("respondToBattle", async (client, data: {
      accept: boolean;
      battleType?: string;
    }) => {
      await this.handleBattleResponse(client, data);
    });

    // Quitter un combat (abandon)
    this.room.onMessage("leaveBattle", async (client, data: {
      battleRoomId?: string;
      reason?: string;
    }) => {
      await this.handleLeaveBattle(client, data);
    });

    // ✅ NOUVEAU: Tenter de capturer un Pokémon
    this.room.onMessage("attemptCapture", async (client, data: {
      ballType: string;
      battleRoomId?: string;
    }) => {
      await this.handleAttemptCapture(client, data);
    });

    // === HANDLERS D'ÉTAT ===
    
    // Obtenir l'état du combat actuel
    this.room.onMessage("getBattleStatus", (client) => {
      this.handleGetBattleStatus(client);
    });

    // Vérifier si peut combattre
    this.room.onMessage("canBattle", async (client) => {
      await this.handleCanBattle(client);
    });

    // === HANDLERS DE RÉCOMPENSES ===
    
    // Recevoir les récompenses de combat
    this.room.onMessage("claimBattleRewards", async (client, data: {
      battleRoomId: string;
      rewards: any;
    }) => {
      await this.handleClaimRewards(client, data);
    });

    // ✅ NOUVEAU: Résultat de capture
    this.room.onMessage("captureResult", async (client, data: {
      success: boolean;
      pokemonName?: string;
      ballUsed?: string;
      shakes?: number;
      addedTo?: 'team' | 'pc';
      battleEnded?: boolean;
    }) => {
      await this.handleCaptureResult(client, data);
    });

    // === HANDLERS PVP (POUR PLUS TARD) ===
    
    // Défier un autre joueur
    this.room.onMessage("challengePlayer", async (client, data: {
      targetPlayerId: string;
      battleType: string;
    }) => {
      await this.handleChallengePlayer(client, data);
    });

    // === HANDLERS DEBUG ===
    
    this.room.onMessage("debugBattles", (client) => {
      this.handleDebugBattles(client);
    });

    this.room.onMessage("forceBattleEnd", async (client, data: {
      battleRoomId: string;
    }) => {
      await this.handleForceBattleEnd(client, data);
    });

    console.log(`✅ [BattleHandlers] Tous les handlers configurés + capture`);
  }

  // ✅ === HANDLERS PRINCIPAUX ===

  /**
   * Démarre un combat sauvage
   */
public async handleStartWildBattle(client: Client, data: {
  wildPokemon: WildPokemon;
  location: string;
  method: string;
  currentZone?: string;
  zoneId?: string;
}): Promise<void> {
  console.log(`🔍 [DEBUG] === TENTATIVE COMBAT #${Date.now()} ===`);
  console.log(`🔍 [DEBUG] SessionId: ${client.sessionId}`);
  
  const player = this.room.state.players.get(client.sessionId);
  if (!player) {
    client.send("battleError", { message: "Joueur non trouvé" });
    return;
  }
  
  // ✅ DEBUG ÉTAT COMPLET
  const isInBattle = this.isPlayerInBattle(client.sessionId);
  const battleRoomId = this.getPlayerBattleRoomId(client.sessionId);
  const isBlocked = this.room.isPlayerMovementBlocked(client.sessionId);
  
  console.log(`🔍 [DEBUG] États:`);
  console.log(`  - En combat: ${isInBattle}`);
  console.log(`  - BattleRoom: ${battleRoomId}`);
  console.log(`  - Bloqué: ${isBlocked}`);
  console.log(`  - ActiveBattles: ${this.activeBattles.size}`);
  
  // ✅ NETTOYAGE SYSTÉMATIQUE
  console.log(`🧹 [DEBUG] Nettoyage préventif...`);
  await this.cleanupBattle(client.sessionId, "preventive");
  this.room.unblockPlayerMovement(client.sessionId, 'battle');

  // ✅ VALIDATION UNIVERSELLE EN UNE LIGNE !
  const sessionValidation = await this.jwtManager.validateSessionRobust(
    client.sessionId, 
    player.name, 
    'startWildBattle'
  );
  
  if (!sessionValidation.valid) {
    console.error(`❌ [BattleHandlers] ${sessionValidation.reason}`);
    client.send("battleError", { 
      message: "Session invalide pour le combat",
      code: "INVALID_SESSION",
      details: sessionValidation.reason
    });
    return;
  }
  
  const { userId, jwtData } = sessionValidation;
  console.log(`✅ [BattleHandlers] Session validée pour combat: ${userId} (${jwtData.username})`);

  console.log(`⚔️ [BattleHandlers] === DÉMARRAGE COMBAT SAUVAGE ===`);
  console.log(`👤 Joueur: ${player.name}`);
  console.log(`🐾 Pokémon: ${data.wildPokemon.pokemonId} Niv.${data.wildPokemon.level}`);
  console.log(`📍 Lieu: ${data.location}`);
  
  // Récupérer l'équipe du joueur
  const teamHandlers = this.room.getTeamHandlers();
  if (!teamHandlers) {
    client.send("battleError", { 
      message: "Système d'équipe non disponible",
      code: "TEAM_SYSTEM_ERROR"
    });
    return;
  }
  
  // Obtenir le premier Pokémon disponible pour le combat
  const playerPokemon = await this.getPlayerBattlePokemon(player.name);
  if (!playerPokemon) {
    client.send("battleError", { 
      message: "Aucun Pokémon disponible pour le combat",
      code: "NO_BATTLE_POKEMON"
    });
    return;
  }

  console.log(`👤 Pokémon joueur: ${playerPokemon.name} Niv.${playerPokemon.level}`);
  
  try {
    // Vérifier si le joueur peut combattre
    const canBattle = await this.checkPlayerCanBattle(client.sessionId);
    if (!canBattle.canBattle) {
      client.send("battleError", { 
        message: canBattle.reason || "Impossible de combattre",
        code: "CANNOT_BATTLE"
      });
      return;
    }

    // Vérifier qu'il n'est pas déjà en combat
    if (this.isPlayerInBattle(client.sessionId)) {
      client.send("battleError", { 
        message: "Vous êtes déjà en combat !",
        code: "ALREADY_IN_BATTLE"
      });
      return;
    }

    // ✅ NOUVEAU : Récupérer les vraies données du Pokémon sauvage
    const pokemonData = await getPokemonById(data.wildPokemon.pokemonId);
    const baseHp = pokemonData?.baseStats?.hp || 50;
    const calculatedMaxHp = Math.floor(((baseHp * 2) * data.wildPokemon.level) / 100) + data.wildPokemon.level + 10;

    const wildPokemonComplete = {
      pokemonId: data.wildPokemon.pokemonId,
      name: pokemonData?.name || this.getPokemonName(data.wildPokemon.pokemonId),
      level: data.wildPokemon.level,
      currentHp: calculatedMaxHp,
      maxHp: calculatedMaxHp,
      types: pokemonData?.types || ['Normal'],
      statusCondition: 'normal',
      shiny: data.wildPokemon.shiny,
      gender: data.wildPokemon.gender,
      moves: data.wildPokemon.moves || ['tackle', 'growl'],
      isWild: true
    };

    console.log(`🐾 Pokémon sauvage complet: ${wildPokemonComplete.name} (${calculatedMaxHp} PV)`);

    // Préparer les données de combat
// ✅ RÉCUPÉRER JWT POUR TRANSFER
const userId = this.jwtManager.getUserId(client.sessionId);
const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);

if (!userId || !jwtData) {
  client.send("battleError", { message: "Session invalide pour le combat" });
  return;
}

console.log(`🔑 [BattleHandlers] Transfer JWT: ${jwtData.username} (${userId})`);

const battleInitData: BattleInitData = {
  battleType: "wild",
  playerData: {
    sessionId: client.sessionId,
    name: player.name,
    worldRoomId: this.room.roomId,
    userId: userId,        // ✅ AJOUT
    jwtData: jwtData      // ✅ AJOUT
  },
  wildPokemon: data.wildPokemon
};

    // Créer la BattleRoom
    const battleRoom = await matchMaker.createRoom("battle", battleInitData);
    console.log(`🏠 [BattleHandlers] BattleRoom créée: ${battleRoom.roomId}`);

    // Enregistrer le combat
    this.activeBattles.set(client.sessionId, battleRoom.roomId);

    // Bloquer le mouvement du joueur
    this.room.blockPlayerMovement(
      client.sessionId, 
      "battle", 
      0,
      { 
        battleRoomId: battleRoom.roomId,
        battleType: "wild",
        wildPokemon: data.wildPokemon.pokemonId
      }
    );
      console.log(`📤 [BattleHandlers] ENVOI battleRoomCreated à ${client.sessionId}`);
      console.log(`📦 [BattleHandlers] Données envoyées:`, {
        playerPokemon: playerPokemon?.name,
        opponentPokemon: wildPokemonComplete?.name,
        opponentHp: `${wildPokemonComplete?.currentHp}/${wildPokemonComplete?.maxHp}`
      });

    // ✅ CORRECTION : Envoyer opponentPokemon au lieu de wildPokemon
    client.send("battleRoomCreated", {
      success: true,
      battleRoomId: battleRoom.roomId,
      battleType: "wild",
      playerPokemon: playerPokemon,
      opponentPokemon: wildPokemonComplete, // ✅ Données complètes avec PV et types
      location: data.location,
      method: data.method,
      currentZone: data.currentZone || player.currentZone || "unknown",
      zoneId: data.zoneId,
      message: `Un ${wildPokemonComplete.name} sauvage apparaît !`
    });

    console.log(`✅ [BattleHandlers] Combat sauvage préparé pour ${player.name}`);

  } catch (error) {
    console.error(`❌ [BattleHandlers] Erreur création combat:`, error);
    
    // Nettoyer en cas d'erreur
    this.activeBattles.delete(client.sessionId);
    this.room.unblockPlayerMovement(client.sessionId, "battle");
    
    client.send("battleError", {
      message: "Erreur lors de la création du combat",
      error: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
}

  /**
   * Réponse à une proposition de combat
   */
  public async handleBattleResponse(client: Client, data: {
    accept: boolean;
    battleType?: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("battleError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`🎯 [BattleHandlers] Réponse de combat: ${player.name} -> ${data.accept ? 'ACCEPTÉ' : 'REFUSÉ'}`);

    const battleRoomId = this.activeBattles.get(client.sessionId);
    if (!battleRoomId) {
      client.send("battleError", { 
        message: "Aucun combat en attente",
        code: "NO_PENDING_BATTLE"
      });
      return;
    }

    if (data.accept) {
      // Rejoindre la BattleRoom
      try {
        console.log(`🚪 [BattleHandlers] ${player.name} rejoint BattleRoom ${battleRoomId}`);
        
        client.send("joinBattleRoom", {
          battleRoomId: battleRoomId,
          message: "Rejoignez le combat !"
        });

        console.log(`✅ [BattleHandlers] Instructions envoyées à ${player.name}`);

      } catch (error) {
        console.error(`❌ [BattleHandlers] Erreur rejoindre combat:`, error);
        await this.cleanupBattle(client.sessionId, "join_error");
        
        client.send("battleError", {
          message: "Erreur lors de la connexion au combat"
        });
      }

    } else {
      // Refuser le combat
      console.log(`❌ [BattleHandlers] ${player.name} refuse le combat`);
      
      await this.cleanupBattle(client.sessionId, "declined");
      
      client.send("battleDeclined", {
        message: "Combat refusé"
      });
    }
  }

  /**
   * Quitter un combat
   */
  public async handleLeaveBattle(client: Client, data: {
    battleRoomId?: string;
    reason?: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`👋 [BattleHandlers] ${player.name} quitte le combat (${data.reason || 'manuel'})`);

    const battleRoomId = data.battleRoomId || this.activeBattles.get(client.sessionId);
    if (battleRoomId) {
      await this.cleanupBattle(client.sessionId, data.reason || "manual_leave");
    }

    client.send("battleLeft", {
      success: true,
      message: "Combat quitté",
      reason: data.reason
    });
  }

  // ✅ === NOUVEAU: HANDLERS DE CAPTURE ===

  /**
   * Tenter de capturer un Pokémon sauvage
   */
  public async handleAttemptCapture(client: Client, data: {
    ballType: string;
    battleRoomId?: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("captureError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`🎯 [BattleHandlers] Tentative capture: ${player.name} utilise ${data.ballType}`);

    try {
      // Vérifier que le joueur est en combat
      const battleRoomId = data.battleRoomId || this.activeBattles.get(client.sessionId);
      if (!battleRoomId) {
        client.send("captureError", { 
          message: "Aucun combat actif pour la capture",
          code: "NO_ACTIVE_BATTLE"
        });
        return;
      }

      // Vérifier que c'est un combat sauvage
      // TODO: Ajouter vérification du type de combat si nécessaire

      // Récupérer le TeamManager pour la capture
      const teamManager = await this.room.getTeamManager(player.name);
      if (!teamManager) {
        client.send("captureError", { 
          message: "Impossible d'accéder à votre équipe",
          code: "TEAM_MANAGER_ERROR"
        });
        return;
      }

      // Transmettre la tentative de capture au BattleRoom
      // Le BattleRoom gérera l'action via BattleEngine.processAction()
      console.log(`📤 [BattleHandlers] Transmission capture vers BattleRoom ${battleRoomId}`);
      
      // Envoyer au client pour qu'il transmette au BattleRoom
      client.send("processCaptureAction", {
        battleRoomId: battleRoomId,
        ballType: data.ballType,
        message: `Tentative de capture avec ${data.ballType}`
      });

      console.log(`✅ [BattleHandlers] Capture transmise pour ${player.name}`);

    } catch (error) {
      console.error(`❌ [BattleHandlers] Erreur tentative capture:`, error);
      
      client.send("captureError", {
        message: "Erreur lors de la tentative de capture",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      });
    }
  }

  // ✅ === HANDLERS D'ÉTAT ===

  /**
   * Obtenir le statut du combat actuel
   */
  public handleGetBattleStatus(client: Client): void {
    const battleRoomId = this.activeBattles.get(client.sessionId);
    const isInBattle = this.isPlayerInBattle(client.sessionId);
    const isMovementBlocked = this.room.isPlayerMovementBlocked(client.sessionId);

    client.send("battleStatus", {
      isInBattle: isInBattle,
      battleRoomId: battleRoomId,
      isMovementBlocked: isMovementBlocked,
      activeBattlesCount: this.activeBattles.size
    });

    console.log(`📊 [BattleHandlers] Statut envoyé à ${client.sessionId}: ${isInBattle ? 'EN COMBAT' : 'LIBRE'}`);
  }

  /**
   * Vérifier si le joueur peut combattre
   */
  public async handleCanBattle(client: Client): Promise<void> {
    try {
      const canBattleResult = await this.checkPlayerCanBattle(client.sessionId);
      
      client.send("canBattleResult", canBattleResult);
      
      console.log(`✅ [BattleHandlers] Vérification combat pour ${client.sessionId}: ${canBattleResult.canBattle}`);

    } catch (error) {
      console.error(`❌ [BattleHandlers] Erreur vérification combat:`, error);
      
      client.send("canBattleResult", {
        canBattle: false,
        reason: "Erreur lors de la vérification"
      });
    }
  }

  /**
 * Récupère le premier Pokémon disponible pour le combat
 */
private async getPlayerBattlePokemon(playerName: string): Promise<any | null> {
  try {
    console.log(`🔍 [BattleHandlers] Recherche Pokémon de combat pour ${playerName}`);
    
    const teamManager = new (require('../managers/TeamManager').TeamManager)(playerName);
    await teamManager.load();
    
    const team = await teamManager.getTeam();
    if (!team || team.length === 0) {
      console.log(`❌ [BattleHandlers] Aucun Pokémon dans l'équipe de ${playerName}`);
      return null;
    }
    
    // Trouver le premier Pokémon en état de combattre
    const battleReadyPokemon = team.find((pokemon: any) => 
      pokemon.currentHp > 0 && 
      pokemon.status !== 'fainted' &&
      pokemon.moves && pokemon.moves.length > 0
    );
    
    if (!battleReadyPokemon) {
      console.log(`❌ [BattleHandlers] Aucun Pokémon en état de combattre pour ${playerName}`);
      return null;
    }
    
    // ✅ NOUVEAU: Récupérer les vraies données depuis PokemonData
    const pokemonData = await getPokemonById(battleReadyPokemon.pokemonId);
    
    console.log(`✅ [BattleHandlers] Pokémon trouvé: ${battleReadyPokemon.nickname || pokemonData?.name || 'Pokémon'} (ID: ${battleReadyPokemon.pokemonId})`);
    
    return {
      id: battleReadyPokemon._id.toString(),
      pokemonId: battleReadyPokemon.pokemonId,
      name: battleReadyPokemon.nickname || pokemonData?.name || `Pokémon #${battleReadyPokemon.pokemonId}`, // ✅ Vrai nom
      level: battleReadyPokemon.level,
      currentHp: battleReadyPokemon.currentHp,
      maxHp: battleReadyPokemon.maxHp,
      statusCondition: battleReadyPokemon.status || 'normal',
      types: pokemonData?.types || ['normal'], // ✅ Vrais types depuis la base de données
      moves: battleReadyPokemon.moves.map((move: any) => move.moveId),
      stats: battleReadyPokemon.calculatedStats,
      isWild: false
    };
    
  } catch (error) {
    console.error(`❌ [BattleHandlers] Erreur récupération Pokémon:`, error);
    return null;
  }
}
  // ✅ === HANDLERS DE RÉCOMPENSES ===

  /**
   * Réclamer les récompenses de combat
   */
  public async handleClaimRewards(client: Client, data: {
    battleRoomId: string;
    rewards: any;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("rewardsError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`🎁 [BattleHandlers] Récompenses pour ${player.name}:`, data.rewards);

    try {
      // Appliquer les récompenses
      if (data.rewards.experience > 0) {
        // TODO: Donner XP aux Pokémon
        console.log(`📈 XP: +${data.rewards.experience}`);
      }

      if (data.rewards.gold > 0) {
        player.gold += data.rewards.gold;
        console.log(`💰 Or: +${data.rewards.gold} (total: ${player.gold})`);
      }

      if (data.rewards.items && data.rewards.items.length > 0) {
        // TODO: Ajouter les objets à l'inventaire
        for (const item of data.rewards.items) {
          console.log(`🎒 Objet: +${item.quantity} ${item.itemId}`);
        }
      }

      if (data.rewards.pokemonCaught) {
        // TODO: Ajouter le Pokémon capturé à l'équipe/PC
        console.log(`🎯 Pokémon capturé !`);
      }

      // Nettoyer le combat
      await this.cleanupBattle(client.sessionId, "rewards_claimed");

      client.send("rewardsClaimed", {
        success: true,
        rewards: data.rewards,
        newGold: player.gold,
        message: "Récompenses reçues !"
      });

      console.log(`✅ [BattleHandlers] Récompenses distribuées à ${player.name}`);

    } catch (error) {
      console.error(`❌ [BattleHandlers] Erreur récompenses:`, error);
      
      client.send("rewardsError", {
        message: "Erreur lors de la distribution des récompenses"
      });
    }
  }

  /**
   * Traiter le résultat d'une capture
   */
  public async handleCaptureResult(client: Client, data: {
    success: boolean;
    pokemonName?: string;
    ballUsed?: string;
    shakes?: number;
    addedTo?: 'team' | 'pc';
    battleEnded?: boolean;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🎯 [BattleHandlers] Résultat capture: ${player.name} -> ${data.success ? 'SUCCÈS' : 'ÉCHEC'}`);

    if (data.success) {
      console.log(`🎉 [BattleHandlers] ${data.pokemonName} capturé avec ${data.ballUsed} (${data.shakes} secousses)`);
      console.log(`📦 [BattleHandlers] Pokémon ajouté à: ${data.addedTo}`);

      // Si le combat est terminé par capture, nettoyer
      if (data.battleEnded) {
        await this.cleanupBattle(client.sessionId, "capture_success");
      }

      // Notifier le succès
      client.send("captureSuccess", {
        pokemonName: data.pokemonName,
        ballUsed: data.ballUsed,
        shakes: data.shakes,
        addedTo: data.addedTo,
        battleEnded: data.battleEnded,
        message: `${data.pokemonName} a été capturé !`
      });

    } else {
      console.log(`💨 [BattleHandlers] ${data.pokemonName} s'est échappé après ${data.shakes} secousse(s)`);

      // Notifier l'échec
      client.send("captureFailed", {
        pokemonName: data.pokemonName,
        ballUsed: data.ballUsed,
        shakes: data.shakes,
        message: `${data.pokemonName} s'est échappé !`
      });
    }
  }

  // ✅ === HANDLERS PVP (PRÉPARATION) ===

  /**
   * Défier un autre joueur (futur PvP)
   */
  public async handleChallengePlayer(client: Client, data: {
    targetPlayerId: string;
    battleType: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    const target = this.room.state.players.get(data.targetPlayerId);

    if (!player || !target) {
      client.send("challengeError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`⚔️ [BattleHandlers] ${player.name} défie ${target.name}`);

    // TODO: Implémenter le système de défi PvP
    client.send("challengeResult", {
      success: false,
      message: "Combat PvP non encore implémenté"
    });
  }

  // ✅ === MÉTHODES UTILITAIRES ===

  /**
   * Vérifier si un joueur peut combattre
   */
  private async checkPlayerCanBattle(sessionId: string): Promise<{
    canBattle: boolean;
    reason?: string;
    details?: any;
  }> {
    try {
      const player = this.room.state.players.get(sessionId);
      if (!player) {
        return { canBattle: false, reason: "Joueur non trouvé" };
      }

      // Vérifier si déjà en combat
      if (this.isPlayerInBattle(sessionId)) {
        return { canBattle: false, reason: "Déjà en combat" };
      }

      // Vérifier l'équipe via TeamHandlers
      const teamHandlers = this.room.getTeamHandlers();
      if (!teamHandlers) {
        return { canBattle: false, reason: "Système d'équipe non disponible" };
      }

      // TODO: Vérifier que le joueur a au moins un Pokémon en état de combattre
      // Pour l'instant, on assume que oui
      
      return { 
        canBattle: true,
        details: {
          playerName: player.name,
          playerLevel: player.level
        }
      };

    } catch (error) {
      console.error(`❌ [BattleHandlers] Erreur checkPlayerCanBattle:`, error);
      return { 
        canBattle: false, 
        reason: "Erreur lors de la vérification" 
      };
    }
  }

  /**
   * Vérifier si un joueur est en combat
   */
  public isPlayerInBattle(sessionId: string): boolean {
    return this.activeBattles.has(sessionId);
  }

  /**
   * Obtenir l'ID de la BattleRoom d'un joueur
   */
  public getPlayerBattleRoomId(sessionId: string): string | undefined {
    return this.activeBattles.get(sessionId);
  }

  /**
   * Nettoyer un combat terminé
   */
  public async cleanupBattle(sessionId: string, reason: string): Promise<void> {
    console.log(`🧹 [BattleHandlers] Nettoyage combat pour ${sessionId} (${reason})`);

    try {
      // Débloquer le mouvement
      this.room.unblockPlayerMovement(sessionId, "battle");

      // Nettoyer les icônes de statut
      this.room.broadcast("playerStatusIcon", {
        playerId: sessionId,
        icon: null,
        iconEmoji: null
      });

      // Supprimer des combats actifs
      const battleRoomId = this.activeBattles.get(sessionId);
      this.activeBattles.delete(sessionId);

      // Nettoyer les requêtes en attente
      this.battleRequests.delete(sessionId);

      console.log(`✅ [BattleHandlers] Combat nettoyé: ${sessionId} (Room: ${battleRoomId})`);

    } catch (error) {
      console.error(`❌ [BattleHandlers] Erreur nettoyage:`, error);
    }
  }

  // ✅ === NOUVELLE MÉTHODE POUR FIX BUG "DÉJÀ EN COMBAT" ===

  /**
   * Notification qu'un combat est terminé (appelée depuis WorldRoom)
   */
  public onBattleFinished(playerId: string, battleResult: string): void {
    console.log(`🏁 [BattleHandlers] onBattleFinished pour ${playerId}: ${battleResult}`);
    
    // 1. Supprimer des combats actifs
    const battleRoomId = this.activeBattles.get(playerId);
    if (battleRoomId) {
      this.activeBattles.delete(playerId);
      console.log(`🧹 [BattleHandlers] Combat actif supprimé: ${playerId} -> ${battleRoomId}`);
    }
    
    // 2. Supprimer des requêtes en attente
    if (this.battleRequests.has(playerId)) {
      this.battleRequests.delete(playerId);
      console.log(`🧹 [BattleHandlers] Requête en attente supprimée: ${playerId}`);
    }
    
    // 3. Débloquer le mouvement (sécurité)
    this.room.unblockPlayerMovement(playerId, 'battle');
    
    // 4. Nettoyer les icônes de statut
    this.room.broadcast("playerStatusIcon", {
      playerId: playerId,
      icon: null,
      iconEmoji: null
    });
    
    console.log(`✅ [BattleHandlers] État combat complètement nettoyé pour ${playerId}`);
    console.log(`📊 [BattleHandlers] Combats actifs restants: ${this.activeBattles.size}`);
  }

  /**
   * Obtenir le nom d'un Pokémon (helper)
   */
  private getPokemonName(pokemonId: number): string {
    const pokemonNames: { [key: number]: string } = {
      1: "Bulbasaur", 4: "Charmander", 7: "Squirtle",
      10: "Caterpie", 16: "Pidgey", 19: "Rattata", 
      25: "Pikachu", 41: "Zubat", 43: "Oddish",
      92: "Gastly", 129: "Magikarp", 170: "Chinchou"
    };
    
    return pokemonNames[pokemonId] || `Pokémon #${pokemonId}`;
  }

  // ✅ === HANDLERS DEBUG ===

  /**
   * Debug des combats actifs
   */
  public handleDebugBattles(client: Client): void {
    console.log(`🔍 [BattleHandlers] === DEBUG COMBATS ===`);
    
    const debugInfo = {
      activeBattles: this.activeBattles.size,
      battleList: Array.from(this.activeBattles.entries()),
      pendingRequests: this.battleRequests.size
    };

    console.log(`🔍 [BattleHandlers] Combats actifs:`, debugInfo);

    client.send("battleDebugInfo", debugInfo);
  }

  /**
   * Debug des états de combat
   */
  public debugBattleStates(): void {
    console.log(`🔍 [BattleHandlers] === DEBUG ÉTATS COMBAT ===`);
    console.log(`👥 Combats actifs: ${this.activeBattles.size}`);
    
    for (const [playerId, battleRoomId] of this.activeBattles) {
      console.log(`  🎮 ${playerId}: room ${battleRoomId}`);
    }
    
    console.log(`📋 Requêtes en attente: ${this.battleRequests.size}`);
    for (const [playerId, request] of this.battleRequests) {
      console.log(`  ⏳ ${playerId}: ${JSON.stringify(request)}`);
    }
    console.log(`=======================================`);
  }

  /**
   * Forcer la fin d'un combat (admin/debug)
   */
  public async handleForceBattleEnd(client: Client, data: {
    battleRoomId: string;
  }): Promise<void> {
    console.log(`🔥 [BattleHandlers] Force end battle: ${data.battleRoomId}`);

    // Trouver le joueur concerné
    let targetSessionId: string | null = null;
    for (const [sessionId, roomId] of this.activeBattles.entries()) {
      if (roomId === data.battleRoomId) {
        targetSessionId = sessionId;
        break;
      }
    }

    if (targetSessionId) {
      await this.cleanupBattle(targetSessionId, "force_ended");
      
      client.send("battleForceEndResult", {
        success: true,
        message: `Combat ${data.battleRoomId} forcé à se terminer`
      });
    } else {
      client.send("battleForceEndResult", {
        success: false,
        message: "Combat non trouvé"
      });
    }
  }

  // ✅ === MÉTHODES PUBLIQUES POUR WORLDROOM ===

  /**
   * Notification qu'un joueur a quitté la room
   */
  public async onPlayerLeave(sessionId: string): Promise<void> {
    if (this.isPlayerInBattle(sessionId)) {
      console.log(`👋 [BattleHandlers] Joueur ${sessionId} quitte avec combat actif`);
      await this.cleanupBattle(sessionId, "player_left_world");
    }
  }

  /**
   * Obtenir les statistiques des combats
   */
  public getStats(): any {
    return {
      activeBattles: this.activeBattles.size,
      pendingRequests: this.battleRequests.size,
      battleRooms: Array.from(this.activeBattles.values())
    };
  }

  /**
   * Nettoyer tous les combats (dispose)
   */
  public cleanup(): void {
    console.log(`🧹 [BattleHandlers] Nettoyage final...`);
    
    // Nettoyer tous les combats actifs
    for (const sessionId of this.activeBattles.keys()) {
      this.cleanupBattle(sessionId, "room_dispose");
    }
    
    this.activeBattles.clear();
    this.battleRequests.clear();
    
    console.log(`✅ [BattleHandlers] Nettoyage terminé`);
  }
}
