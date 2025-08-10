// server/src/managers/JWTManager.ts
import { QuestManager } from "./QuestManager";
import { PlayerData, IPlayerData } from "../models/PlayerData";

export class JWTManager {
  private static instance: JWTManager;
  private sessionToUser: Map<string, string> = new Map(); // sessionId -> userId
  private userToSession: Map<string, string> = new Map(); // userId -> sessionId (primary)
  private userJWTData: Map<string, any> = new Map(); // userId -> JWT data
  private activeBattleStates: Map<string, any> = new Map(); // userId -> battle state
  
  // 🆕 SUPPORT MULTI-SESSIONS BATTLEROOMS
  private battleSessions: Map<string, string> = new Map(); // battleSessionId -> userId
  private userToBattleSessions: Map<string, Set<string>> = new Map(); // userId -> Set<battleSessionIds>
  
  private questManager: QuestManager;
  
  static getInstance(): JWTManager {
    if (!JWTManager.instance) {
      JWTManager.instance = new JWTManager();
      JWTManager.instance.questManager = new QuestManager();
    }
    return JWTManager.instance;
  }
  
  /**
   * 🆕 Enregistrer un utilisateur avec support BattleRoom
   */
  async registerUser(sessionId: string, jwt: any, context?: { roomType?: string }): Promise<void> {
    const userId = jwt.userId;
    const isBattleRoom = context?.roomType === 'battle';

    console.log(`🔗 [JWTManager] Enregistrement: ${sessionId} -> ${userId} (${jwt.username})${isBattleRoom ? ' [BATTLE]' : ''}`);

    // 🆕 GESTION SPÉCIALE POUR BATTLEROOMS
    if (isBattleRoom) {
      return await this.registerBattleSession(sessionId, userId, jwt);
    }

    // 🔥 LOGIQUE NORMALE POUR SESSIONS PRINCIPALES
    const oldSessionId = this.userToSession.get(userId);
    if (oldSessionId && oldSessionId !== sessionId) {
      console.log(`⛔ [JWTManager] Connexion refusée : ${userId} déjà connecté (session ${oldSessionId})`);
      throw new Error("Vous êtes déjà connecté sur un autre onglet ou appareil.");
    }

    // Nouveau mapping (connexion normale)
    this.sessionToUser.set(sessionId, userId);
    this.userToSession.set(userId, sessionId);
    this.userJWTData.set(userId, jwt);
    await this.handleQuestAutoReset(jwt.username);

    // Reset objets en mode dev
    const { getServerConfig } = require('../config/serverConfig');
    const serverConfig = getServerConfig();
    
    if (serverConfig.autoresetObjects) {
      await this.resetPlayerObjects(jwt.username);
    }

    console.log(`✅ [JWTManager] Utilisateur enregistré: ${jwt.username} (${userId})`);
  }

  /**
   * 🆕 Enregistrer une session BattleRoom
   */
  private async registerBattleSession(sessionId: string, userId: string, jwt: any): Promise<void> {
    // Vérifier que l'utilisateur a une session principale
    if (!this.userJWTData.has(userId)) {
      console.log(`⚠️ [JWTManager] Battle session sans session principale: ${userId}`);
      // Créer les données JWT si pas disponibles
      this.userJWTData.set(userId, jwt);
    }

    // Enregistrer la session battle
    this.battleSessions.set(sessionId, userId);
    
    // Ajouter à la liste des sessions battle de l'utilisateur
    if (!this.userToBattleSessions.has(userId)) {
      this.userToBattleSessions.set(userId, new Set());
    }
    this.userToBattleSessions.get(userId)!.add(sessionId);

    console.log(`⚔️ [JWTManager] Session battle enregistrée: ${sessionId} -> ${userId} (${jwt.username})`);
  }
  
  /**
   * 🆕 Traduire sessionId -> userId (avec support battle sessions)
   */
  getUserId(sessionId: string): string | null {
    // Chercher d'abord dans les sessions normales
    let userId = this.sessionToUser.get(sessionId);
    
    // Si pas trouvé, chercher dans les battle sessions
    if (!userId) {
      userId = this.battleSessions.get(sessionId);
    }
    
    return userId || null;
  }
  
  /**
   * Traduire userId -> sessionId principal
   */
  getSessionId(userId: string): string | null {
    return this.userToSession.get(userId) || null;
  }

  /**
   * 🆕 Obtenir toutes les sessions d'un utilisateur (principale + battles)
   */
  getAllUserSessions(userId: string): string[] {
    const sessions: string[] = [];
    
    // Session principale
    const mainSession = this.userToSession.get(userId);
    if (mainSession) sessions.push(mainSession);
    
    // Sessions battle
    const battleSessions = this.userToBattleSessions.get(userId);
    if (battleSessions) {
      sessions.push(...Array.from(battleSessions));
    }
    
    return sessions;
  }

  /**
   * 🆕 Vérifier si une session est une BattleRoom
   */
  isBattleSession(sessionId: string): boolean {
    return this.battleSessions.has(sessionId);
  }
  
  /**
   * Obtenir les données JWT d'un utilisateur
   */
  getUserJWTData(userId: string): any | null {
    return this.userJWTData.get(userId) || null;
  }
  
  /**
   * Obtenir les données JWT via sessionId
   */
  getJWTDataBySession(sessionId: string): any | null {
    const userId = this.getUserId(sessionId);
    return userId ? this.getUserJWTData(userId) : null;
  }

  getUserIdByPlayerName(playerName: string): string | null {
    for (const [sessionId, userId] of this.sessionToUser.entries()) {
      const jwtData = this.userJWTData.get(userId);
      if (jwtData?.username === playerName) {
        return userId;
      }
    }
    return null;
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Maintenir cohérence JWT
   */
  ensureMapping(sessionId: string, userId: string, jwtData: any): void {
    const existingUserId = this.getUserId(sessionId);
    
    if (existingUserId && existingUserId !== userId) {
      console.log(`🔄 [JWTManager] Changement session: ${existingUserId} -> ${userId}`);
      
      // Transférer état de combat si nécessaire
      const battleState = this.getBattleState(existingUserId);
      if (battleState) {
        this.saveBattleState(userId, battleState);
        this.clearBattleState(existingUserId);
        console.log(`⚔️ [JWTManager] Combat transféré: ${existingUserId} -> ${userId}`);
      }
    }
    
    this.sessionToUser.set(sessionId, userId);
    this.userToSession.set(userId, sessionId);
    this.userJWTData.set(userId, jwtData);
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Validation actions critiques
   */
  validateCriticalAction(sessionId: string, action: string): boolean {
    const userId = this.getUserId(sessionId);
    const jwtData = this.getJWTDataBySession(sessionId);
    
    if (!userId || !jwtData) {
      console.error(`❌ [JWTManager] Action ${action} bloquée: session invalide ${sessionId}`);
      return false;
    }
    
    if (jwtData.exp && Date.now() >= jwtData.exp * 1000) {
      console.error(`❌ [JWTManager] Action ${action} bloquée: JWT expiré`);
      this.removeUser(sessionId);
      return false;
    }
    
    return true;
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  isUserConnected(userId: string): boolean {
    return this.userToSession.has(userId) || this.userToBattleSessions.has(userId);
  }
  
  /**
   * 🆕 Nettoyer un utilisateur à la déconnexion (avec support battle sessions)
   */
  removeUser(sessionId: string): void {
    const userId = this.sessionToUser.get(sessionId) || this.battleSessions.get(sessionId);
    
    if (!userId) {
      console.log(`🤷 [JWTManager] Session inconnue: ${sessionId}`);
      return;
    }

    console.log(`🧹 [JWTManager] Déconnexion: ${sessionId} -> ${userId}`);
    
    // 🆕 GESTION BATTLE SESSION
    if (this.battleSessions.has(sessionId)) {
      this.removeBattleSession(sessionId, userId);
      return;
    }

    // 🔥 GESTION SESSION PRINCIPALE
    const hasActiveBattle = this.hasActiveBattle(userId);
    
    if (hasActiveBattle) {
      console.log(`⚔️ [JWTManager] Préservation JWT pour combat actif: ${userId}`);
      
      // NE PAS supprimer le JWT, juste la session courante
      this.sessionToUser.delete(sessionId);
      // Garder userToSession et userJWTData pour reconnexion
      
      console.log(`💾 [JWTManager] JWT préservé pour reconnexion: ${userId}`);
      return;
    }
    
    // ✅ Nettoyage normal si pas de combat
    this.sessionToUser.delete(sessionId);
    this.userToSession.delete(userId);
    this.userJWTData.delete(userId);
    
    console.log(`✅ [JWTManager] Utilisateur supprimé: ${userId}`);
  }

  /**
   * 🆕 Supprimer une battle session spécifique
   */
  private removeBattleSession(sessionId: string, userId: string): void {
    this.battleSessions.delete(sessionId);
    
    const userBattleSessions = this.userToBattleSessions.get(userId);
    if (userBattleSessions) {
      userBattleSessions.delete(sessionId);
      
      // Si plus de battle sessions, supprimer la Set
      if (userBattleSessions.size === 0) {
        this.userToBattleSessions.delete(userId);
      }
    }
    
    console.log(`⚔️ [JWTManager] Battle session supprimée: ${sessionId} -> ${userId}`);
    
    // Si l'utilisateur n'a plus de session principale ET plus de battle sessions
    const hasMainSession = this.userToSession.has(userId);
    const hasBattleSessions = this.userToBattleSessions.has(userId);
    
    if (!hasMainSession && !hasBattleSessions && !this.hasActiveBattle(userId)) {
      console.log(`🧹 [JWTManager] Nettoyage complet utilisateur: ${userId}`);
      this.userJWTData.delete(userId);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Re-association automatique
  async restoreUserSession(sessionId: string, username: string): Promise<boolean> {
    console.log(`🔄 [JWTManager] Tentative restauration session pour ${username}`);
    
    // Chercher l'userId par nom d'utilisateur
    for (const [userId, jwtData] of this.userJWTData.entries()) {
      if (jwtData.username === username) {
        console.log(`✅ [JWTManager] JWT trouvé pour ${username}: ${userId}`);
        
        // Re-créer les mappings
        this.sessionToUser.set(sessionId, userId);
        this.userToSession.set(userId, sessionId);
        
        console.log(`🔗 [JWTManager] Session restaurée: ${sessionId} -> ${userId}`);
        return true;
      }
    }
    
    console.log(`❌ [JWTManager] Aucun JWT trouvé pour ${username}`);
    return false;
  }

  /**
   * ✅ MÉTHODE UNIVERSELLE: Récupère userId de manière robuste avec auto-restauration
   */
  async getUserIdRobust(sessionId: string, playerName?: string): Promise<string | null> {
    console.log(`🔍 [JWTManager] getUserIdRobust pour session: ${sessionId}`);
    
    // ✅ ÉTAPE 1: Essayer mapping normal (sessions principales + battle)
    let userId = this.getUserId(sessionId);
    
    if (userId) {
      console.log(`✅ [JWTManager] UserId trouvé directement: ${userId}`);
      return userId;
    }
    
    // ✅ ÉTAPE 2: Si pas de mapping et nom fourni, essayer restauration
    if (playerName) {
      console.log(`🔄 [JWTManager] Tentative restauration pour: ${playerName}`);
      
      try {
        const restored = await this.restoreUserSession(sessionId, playerName);
        
        if (restored) {
          userId = this.getUserId(sessionId);
          console.log(`✅ [JWTManager] UserId restauré: ${userId}`);
          return userId;
        }
      } catch (error) {
        console.error(`❌ [JWTManager] Erreur restauration:`, error);
      }
    }
    
    // ✅ ÉTAPE 3: Dernier recours - chercher par nom dans tous les mappings
    if (playerName) {
      console.log(`🔄 [JWTManager] Recherche par nom dans mappings: ${playerName}`);
      
      // Chercher dans sessions principales
      for (const [existingSessionId, existingUserId] of this.sessionToUser.entries()) {
        const jwtData = this.userJWTData.get(existingUserId);
        if (jwtData?.username === playerName) {
          console.log(`🔗 [JWTManager] Mapping trouvé, re-association: ${sessionId} -> ${existingUserId}`);
          
          // Re-créer le mapping pour cette session
          this.sessionToUser.set(sessionId, existingUserId);
          this.userToSession.set(existingUserId, sessionId);
          
          return existingUserId;
        }
      }
      
      // Chercher dans battle sessions
      for (const [battleSessionId, existingUserId] of this.battleSessions.entries()) {
        const jwtData = this.userJWTData.get(existingUserId);
        if (jwtData?.username === playerName) {
          console.log(`⚔️ [JWTManager] Battle mapping trouvé, re-association: ${sessionId} -> ${existingUserId}`);
          
          // Ajouter comme nouvelle battle session
          this.battleSessions.set(sessionId, existingUserId);
          if (!this.userToBattleSessions.has(existingUserId)) {
            this.userToBattleSessions.set(existingUserId, new Set());
          }
          this.userToBattleSessions.get(existingUserId)!.add(sessionId);
          
          return existingUserId;
        }
      }
    }
    
    console.log(`❌ [JWTManager] Impossible de résoudre userId pour session: ${sessionId}`);
    return null;
  }

  /**
   * ✅ MÉTHODE UNIVERSELLE: Valide session avec auto-restauration
   */
  async validateSessionRobust(sessionId: string, playerName?: string, action?: string): Promise<{
    valid: boolean;
    userId?: string;
    jwtData?: any;
    reason?: string;
  }> {
    console.log(`🔍 [JWTManager] validateSessionRobust: ${sessionId} (${playerName}) pour ${action || 'action'}`);
    
    // ✅ Récupérer userId de manière robuste
    const userId = await this.getUserIdRobust(sessionId, playerName);
    
    if (!userId) {
      return {
        valid: false,
        reason: `Impossible de résoudre userId pour session ${sessionId}`
      };
    }
    
    // ✅ Récupérer JWT data
    const jwtData = this.getJWTDataBySession(sessionId);
    
    if (!jwtData) {
      return {
        valid: false,
        userId,
        reason: `JWT Data manquant pour userId ${userId}`
      };
    }
    
    // ✅ Vérifier expiration
    if (jwtData.exp && Date.now() >= jwtData.exp * 1000) {
      const expiredSince = Math.round((Date.now() - jwtData.exp * 1000) / 1000);
      return {
        valid: false,
        userId,
        jwtData,
        reason: `JWT expiré depuis ${expiredSince}s`
      };
    }
    
    console.log(`✅ [JWTManager] Session validée: ${sessionId} -> ${userId} (${jwtData.username})`);
    
    return {
      valid: true,
      userId,
      jwtData
    };
  }

  /**
   * ✅ NOUVEAU: Sauvegarder l'état de combat d'un utilisateur
   */
  saveBattleState(userId: string, battleState: any): void {
    this.activeBattleStates.set(userId, {
      ...battleState,
      timestamp: Date.now() // Mettre à jour le timestamp
    });
    console.log(`💾 [JWTManager] État combat sauvé pour ${userId}`);
  }

  /**
   * ✅ NOUVEAU: Récupérer l'état de combat d'un utilisateur
   */
  getBattleState(userId: string): any | null {
    return this.activeBattleStates.get(userId) || null;
  }

  /**
   * ✅ NOUVEAU: Supprimer l'état de combat (combat terminé)
   */
  clearBattleState(userId: string): void {
    if (this.activeBattleStates.has(userId)) {
      this.activeBattleStates.delete(userId);
      console.log(`🗑️ [JWTManager] État combat supprimé pour ${userId}`);
    }
  }

  /**
   * ✅ NOUVEAU: Vérifier si un utilisateur a un combat en cours
   */
  hasActiveBattle(userId: string): boolean {
    const battleState = this.activeBattleStates.get(userId);
    if (!battleState) return false;
    
    // Vérifier que le combat n'est pas trop ancien (5 minutes max)
    const timeDiff = Date.now() - battleState.timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiff > maxAge) {
      console.log(`⏰ [JWTManager] Combat expiré pour ${userId} (${Math.round(timeDiff/1000)}s)`);
      this.clearBattleState(userId);
      return false;
    }
    
    return true;
  }

  /**
   * ✅ NOUVEAU: Obtenir les informations de combat actif
   */
  getActiveBattleInfo(userId: string): any | null {
    if (!this.hasActiveBattle(userId)) return null;
    
    const battleState = this.activeBattleStates.get(userId);
    if (!battleState) return null;
    
    return {
      battleId: battleState.battleId,
      battleType: battleState.battleType,
      phase: battleState.phase,
      turnNumber: battleState.turnNumber,
      player1Pokemon: battleState.player1?.pokemon?.name,
      player2Pokemon: battleState.player2?.pokemon?.name,
      timeElapsed: Math.round((Date.now() - battleState.timestamp) / 1000),
      canRestore: true
    };
  }

  /**
   * ✅ NOUVEAU: Nettoyage automatique des combats expirés
   */
  cleanupExpiredBattles(): number {
    let cleaned = 0;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    for (const [userId, battleState] of this.activeBattleStates.entries()) {
      if (now - battleState.timestamp > maxAge) {
        this.activeBattleStates.delete(userId);
        cleaned++;
        console.log(`🧹 [JWTManager] Combat expiré nettoyé: ${userId}`);
      }
    }
    
    if (cleaned > 0) {
      console.log(`✅ [JWTManager] ${cleaned} combat(s) expiré(s) nettoyé(s)`);
    }
    
    return cleaned;
  }

  /**
   * ✅ NOUVEAU: Lister tous les combats actifs
   */
  getAllActiveBattles(): Array<{userId: string, username: string, battleInfo: any}> {
    const activeBattles: Array<{userId: string, username: string, battleInfo: any}> = [];
    
    for (const [userId, battleState] of this.activeBattleStates.entries()) {
      if (this.hasActiveBattle(userId)) {
        const jwtData = this.getUserJWTData(userId);
        activeBattles.push({
          userId,
          username: jwtData?.username || 'unknown',
          battleInfo: this.getActiveBattleInfo(userId)
        });
      }
    }
    
    return activeBattles;
  }

  /**
   * ✅ NOUVEAU: Reset tous les objets collectés d'un joueur (mode dev)
   */
  async resetPlayerObjects(username: string): Promise<void> {
    try {
      console.log(`🔄 [JWTManager] Reset objets pour ${username}`);
      
      const playerDataDoc = await PlayerData.findOne({ username });
      if (!playerDataDoc) {
        console.log(`⚠️ [JWTManager] Joueur ${username} non trouvé pour reset objets`);
        return;
      }

      const playerData = playerDataDoc as IPlayerData;
      
      // Supprimer tous les cooldowns objets
      const initialCount = playerData.objectStates.length;
      playerData.objectStates = [];
      await playerData.save();
      
      console.log(`✅ [JWTManager] ${initialCount} cooldowns objets supprimés pour ${username}`);
      
    } catch (error) {
      console.error(`❌ [JWTManager] Erreur reset objets pour ${username}:`, error);
    }
  }
  
  /**
   * 🆕 Debug - Afficher tous les mappings (avec battle sessions)
   */
  debugMappings(): void {
    console.log(`🔍 [JWTManager] === DEBUG MAPPINGS ===`);
    console.log(`📊 Sessions principales: ${this.sessionToUser.size}`);
    console.log(`⚔️ Sessions battle: ${this.battleSessions.size}`);
    console.log(`🎮 Combats actifs: ${this.activeBattleStates.size}`);
    
    // Sessions principales
    console.log(`🔍 [JWTManager] --- SESSIONS PRINCIPALES ---`);
    for (const [sessionId, userId] of this.sessionToUser.entries()) {
      const jwt = this.userJWTData.get(userId);
      const hasBattle = this.hasActiveBattle(userId);
      console.log(`  🔗 ${sessionId} -> ${userId} (${jwt?.username || 'unknown'}) ${hasBattle ? '⚔️' : ''}`);
    }
    
    // Battle sessions
    if (this.battleSessions.size > 0) {
      console.log(`🔍 [JWTManager] --- BATTLE SESSIONS ---`);
      for (const [sessionId, userId] of this.battleSessions.entries()) {
        const jwt = this.userJWTData.get(userId);
        console.log(`  ⚔️ ${sessionId} -> ${userId} (${jwt?.username || 'unknown'})`);
      }
    }
    
    // Combats actifs
    if (this.activeBattleStates.size > 0) {
      console.log(`🔍 [JWTManager] === COMBATS ACTIFS ===`);
      for (const [userId, battleState] of this.activeBattleStates.entries()) {
        const jwtData = this.getUserJWTData(userId);
        const timeElapsed = Math.round((Date.now() - battleState.timestamp) / 1000);
        console.log(`  ⚔️ ${userId} (${jwtData?.username || 'unknown'}): ${battleState.battleId} - Tour ${battleState.turnNumber} - ${timeElapsed}s`);
      }
    }
  }
  
  /**
   * 🆕 Obtenir les statistiques (avec battle sessions)
   */
  getStats(): any {
    return {
      activeSessions: this.sessionToUser.size,
      activeUsers: this.userToSession.size,
      battleSessions: this.battleSessions.size, // 🆕
      activeBattles: this.activeBattleStates.size,
      mappings: Array.from(this.sessionToUser.entries()).map(([sessionId, userId]) => ({
        sessionId,
        userId,
        username: this.userJWTData.get(userId)?.username || 'unknown',
        hasActiveBattle: this.hasActiveBattle(userId),
        type: 'main'
      })),
      battleMappings: Array.from(this.battleSessions.entries()).map(([sessionId, userId]) => ({ // 🆕
        sessionId,
        userId,
        username: this.userJWTData.get(userId)?.username || 'unknown',
        type: 'battle'
      })),
      battleStates: this.getAllActiveBattles()
    };
  }

  /**
   * ✅ NOUVEAU: Méthode utilitaire pour debug admin
   */
  debugBattleStates(): void {
    console.log(`🔍 [JWTManager] === DEBUG BATTLE STATES ===`);
    console.log(`⚔️ Total combats: ${this.activeBattleStates.size}`);
    
    if (this.activeBattleStates.size === 0) {
      console.log(`  Aucun combat actif`);
      return;
    }
    
    for (const [userId, battleState] of this.activeBattleStates.entries()) {
      const jwtData = this.getUserJWTData(userId);
      const timeElapsed = Math.round((Date.now() - battleState.timestamp) / 1000);
      const isExpired = !this.hasActiveBattle(userId);
      
      console.log(`  👤 ${jwtData?.username || userId}:`);
      console.log(`    🆔 Battle ID: ${battleState.battleId}`);
      console.log(`    🎮 Type: ${battleState.battleType}`);
      console.log(`    📊 Phase: ${battleState.phase} | Tour: ${battleState.turnNumber}`);
      console.log(`    ⏰ Temps: ${timeElapsed}s ${isExpired ? '(EXPIRÉ)' : ''}`);
      console.log(`    🐾 Pokémon: ${battleState.player1?.pokemon?.name} vs ${battleState.player2?.pokemon?.name}`);
    }
  }

  /**
   * ✅ NOUVEAU: Gestion auto-reset des quêtes à la reconnexion
   */
  private async handleQuestAutoReset(username: string): Promise<void> {
    try {
      const resetResult = await this.questManager.handlePlayerReconnection(username);
      
      if (resetResult.resetOccurred) {
        console.log(`🔄 [JWTManager] Auto-reset quêtes pour ${username}: ${resetResult.message}`);
      }
    } catch (error) {
      console.error(`❌ [JWTManager] Erreur auto-reset quêtes pour ${username}:`, error);
    }
  }
}
