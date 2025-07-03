// server/src/handlers/BattleHandlers.ts
import { Client, matchMaker } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { BattleRoom, BattleInitData } from "../rooms/BattleRoom";
import { WildPokemon } from "../managers/EncounterManager";

/**
 * Gestionnaire centralisé pour tous les handlers de combat
 * Gère la création, connexion et communication avec les BattleRoom
 */
export class BattleHandlers {
  private room: WorldRoom;
  
  // Tracking des combats actifs
  private activeBattles: Map<string, string> = new Map(); // sessionId -> battleRoomId
  private battleRequests: Map<string, any> = new Map(); // sessionId -> battle request data

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`⚔️ [BattleHandlers] Initialisé pour ${room.constructor.name}`);
  }

  // ✅ CONFIGURATION DES HANDLERS
  setupHandlers(): void {
    console.log(`📨 [BattleHandlers] Configuration des handlers...`);

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

    console.log(`✅ [BattleHandlers] Tous les handlers configurés`);
  }

  // ✅ === HANDLERS PRINCIPAUX ===

  /**
   * Démarre un combat sauvage
   */
  public async handleStartWildBattle(client: Client, data: {
    wildPokemon: WildPokemon;
    location: string;
    method: string;
    currentZone?: string;   // <--- AJOUTE CETTE LIGNE
    zoneId?: string;        // (optionnel)
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("battleError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`⚔️ [BattleHandlers] === DÉMARRAGE COMBAT SAUVAGE ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`🐾 Pokémon: ${data.wildPokemon.pokemonId} Niv.${data.wildPokemon.level}`);
    console.log(`📍 Lieu: ${data.location}`);

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

      // Préparer les données de combat
      const battleInitData: BattleInitData = {
        battleType: "wild",
        playerData: {
          sessionId: client.sessionId,
          name: player.name,
          worldRoomId: this.room.roomId
        },
        wildPokemon: data.wildPokemon
      };

      // Créer la BattleRoom
      const battleRoom = await matchMaker.createRoom("battle", battleInitData)
      console.log(`🏠 [BattleHandlers] BattleRoom créée: ${battleRoom.roomId}`);

      // Enregistrer le combat
      this.activeBattles.set(client.sessionId, battleRoom.roomId);

      // Bloquer le mouvement du joueur
      this.room.blockPlayerMovement(
        client.sessionId, 
        "battle", 
        0, // Durée illimitée jusqu'à fin de combat
        { 
          battleRoomId: battleRoom.roomId,
          battleType: "wild",
          wildPokemon: data.wildPokemon.pokemonId
        }
      );

      // Envoyer l'invitation de combat au client
      client.send("battleRoomCreated", {
        success: true,
        battleRoomId: battleRoom.roomId,
        battleType: "wild",
        wildPokemon: {
          pokemonId: data.wildPokemon.pokemonId,
          level: data.wildPokemon.level,
          shiny: data.wildPokemon.shiny,
          gender: data.wildPokemon.gender
        },
        location: data.location,
        method: data.method,
        currentZone: data.currentZone || player.currentZone || "unknown", // <--- PROPAGATION FINALE
        zoneId: data.zoneId,
        message: `Un ${this.getPokemonName(data.wildPokemon.pokemonId)} sauvage apparaît !`
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
