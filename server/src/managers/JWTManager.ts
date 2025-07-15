// server/src/managers/JWTManager.ts
export class JWTManager {
  private static instance: JWTManager;
  private sessionToUser: Map<string, string> = new Map(); // sessionId -> userId
  private userToSession: Map<string, string> = new Map(); // userId -> sessionId
  private userJWTData: Map<string, any> = new Map(); // userId -> JWT data
  
  static getInstance(): JWTManager {
    if (!JWTManager.instance) {
      JWTManager.instance = new JWTManager();
    }
    return JWTManager.instance;
  }
  
  /**
   * Enregistrer un utilisateur à la connexion
   */
  registerUser(sessionId: string, jwt: any): void {
    const userId = jwt.userId;
    
    console.log(`🔗 [JWTManager] Enregistrement: ${sessionId} -> ${userId} (${jwt.username})`);
    
    // Nettoyer l'ancien mapping si reconnexion
    const oldSessionId = this.userToSession.get(userId);
    if (oldSessionId && oldSessionId !== sessionId) {
      console.log(`🔄 [JWTManager] Reconnexion détectée: ${oldSessionId} -> ${sessionId}`);
      this.sessionToUser.delete(oldSessionId);
    }
    
    // Nouveau mapping
    this.sessionToUser.set(sessionId, userId);
    this.userToSession.set(userId, sessionId);
    this.userJWTData.set(userId, jwt);
    
    console.log(`✅ [JWTManager] Utilisateur enregistré: ${jwt.username} (${userId})`);
  }
  
  /**
   * Traduire sessionId -> userId
   */
  getUserId(sessionId: string): string | null {
    return this.sessionToUser.get(sessionId) || null;
  }
  
  /**
   * Traduire userId -> sessionId actuel
   */
  getSessionId(userId: string): string | null {
    return this.userToSession.get(userId) || null;
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
  
  /**
   * Vérifier si un utilisateur est connecté
   */
  isUserConnected(userId: string): boolean {
    return this.userToSession.has(userId);
  }
  
  /**
   * Nettoyer un utilisateur à la déconnexion
   */
  removeUser(sessionId: string): void {
    const userId = this.sessionToUser.get(sessionId);
    if (userId) {
      console.log(`🧹 [JWTManager] Déconnexion: ${sessionId} -> ${userId}`);
      
      this.sessionToUser.delete(sessionId);
      this.userToSession.delete(userId);
      this.userJWTData.delete(userId);
      
      console.log(`✅ [JWTManager] Utilisateur supprimé: ${userId}`);
    }
  }
  
  /**
   * Debug - Afficher tous les mappings
   */
  debugMappings(): void {
    console.log(`🔍 [JWTManager] === DEBUG MAPPINGS ===`);
    console.log(`📊 Sessions actives: ${this.sessionToUser.size}`);
    
    for (const [sessionId, userId] of this.sessionToUser.entries()) {
      const jwt = this.userJWTData.get(userId);
      console.log(`  🔗 ${sessionId} -> ${userId} (${jwt?.username || 'unknown'})`);
    }
  }
  
  /**
   * Obtenir les statistiques
   */
  getStats(): any {
    return {
      activeSessions: this.sessionToUser.size,
      activeUsers: this.userToSession.size,
      mappings: Array.from(this.sessionToUser.entries()).map(([sessionId, userId]) => ({
        sessionId,
        userId,
        username: this.userJWTData.get(userId)?.username || 'unknown'
      }))
    };
  }
}
