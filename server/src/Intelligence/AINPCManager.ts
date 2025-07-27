// server/src/Intelligence/AINPCManager.ts

/**
 * 🤖 AI NPC MANAGER - EXTRACTION DU CODE IA DU WORLDROOM
 * 
 * Récupère EXACTEMENT le code IA qui était dans WorldRoom, sans modification.
 * Objectif : Décharger WorldRoom en déplaçant son code IA ici.
 */

// ===================================================================
// 📦 IMPORTS EXTRAITS DU WORLDROOM
// ===================================================================

import { getIntelligenceOrchestrator, trackPlayerAction, processGameEvent } from "./IntelligenceOrchestrator";
import type { CompletePlayerAnalysis, GameEvent } from "./IntelligenceOrchestrator";
import { getActionTracker } from "./Core/PlayerActionTracker";
import { getActionLogger } from "./DataCollection/ActionLogger";
import { getNPCIntelligenceConnector, registerNPCsWithAI, handleSmartNPCInteraction } from "./NPCSystem/NPCIntelligenceConnector";
import type { SmartNPCResponse } from "./NPCSystem/NPCIntelligenceConnector";
import { ActionType } from "./Core/ActionTypes";

// ===================================================================
// 🎯 INTERFACES (pour communication avec WorldRoom)
// ===================================================================

export interface PlayerInfo {
  username: string;
  sessionId: string;
  level: number;
  gold: number;
  currentZone: string;
  x: number;
  y: number;
}

export interface AIInteractionResult {
  success: boolean;
  type: string;
  message?: string;
  dialogue?: any;
  actions?: any[];
  followUpQuestions?: string[];
  metadata?: any;
  isAI: boolean;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - CODE EXTRAIT DU WORLDROOM
// ===================================================================

export class AINPCManager {
  // ✅ COPIE EXACTE des propriétés du WorldRoom
  private intelligenceOrchestrator = getIntelligenceOrchestrator();
  private actionTracker = getActionTracker();
  private actionLogger = getActionLogger();
  private npcIntelligenceConnector = getNPCIntelligenceConnector();
  private aiSystemInitialized = false;
  private aiStats = {
    actionsTracked: 0,
    intelligentInteractions: 0,
    lastAnalysisTime: 0
  };

  constructor() {
    console.log('🤖 [AINPCManager] Créé avec le code extrait du WorldRoom');
  }

  // ===================================================================
  // 🚀 INITIALISATION - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE de la méthode initializeAISystem() du WorldRoom
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🤖 [AI] === INITIALISATION SYSTÈME D'IA ===`);
      
      // Étape 1: Configurer l'ActionTracker avec notre ActionLogger
      this.actionTracker.setDatabase(this.actionLogger);
      console.log(`✅ [AI] ActionTracker configuré avec ActionLogger`);
      
      // Étape 2: Configuration de base du NPCIntelligenceConnector
      this.npcIntelligenceConnector.updateConfig({
        globallyEnabled: true,
        enabledNPCTypes: ['dialogue', 'healer', 'merchant', 'trainer'],
        debugMode: process.env.NODE_ENV === 'development',
        trackAllInteractions: true
      });
      console.log(`✅ [AI] NPCIntelligenceConnector configuré`);
      
      this.aiSystemInitialized = true;
      console.log(`🎉 [AI] Système d'IA complètement initialisé !`);
      
    } catch (error) {
      console.error(`❌ [AI] Erreur initialisation:`, error);
      throw error;
    }
  }

  // ===================================================================
  // 👤 GESTION JOUEUR - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE du code d'enregistrement joueur du WorldRoom (onJoin)
   */
  registerPlayer(playerInfo: PlayerInfo): void {
    if (!this.aiSystemInitialized) {
      console.warn(`⚠️ [AI] Système IA pas encore initialisé, enregistrement différé`);
      return;
    }

    try {
      this.actionTracker.registerPlayer(
        playerInfo.username,                 // ✅ USERNAME stable et permanent
        playerInfo.username,
        `session_${Date.now()}`,
        { map: playerInfo.currentZone, x: playerInfo.x, y: playerInfo.y },
        playerInfo.level
      );
      console.log(`📝 [AI] Joueur ${playerInfo.username} enregistré avec username permanent`);
    } catch (error) {
      console.error(`❌ [AI] Erreur enregistrement joueur:`, error);
    }
  }

  /**
   * ✅ COPIE EXACTE du code de désenregistrement du WorldRoom (onLeave)
   */
  unregisterPlayer(username: string): void {
    // Le WorldRoom n'avait pas de désenregistrement explicite
    // Juste le tracking de SESSION_END qui est géré par trackPlayerAction
  }

  // ===================================================================
  // 📝 TRACKING - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE de trackPlayerActionWithAI() du WorldRoom
   */
  trackPlayerAction(
    username: string,  // ✅ Modifié : username au lieu de sessionId
    actionType: ActionType,
    actionData: any = {},
    context?: { location?: { map: string; x: number; y: number } }
  ): void {
    if (!this.aiSystemInitialized) return;
    
    try {
      // ✅ UTILISER USERNAME directement (pas de lookup JWT)
      trackPlayerAction(username, actionType, actionData, context);
      this.aiStats.actionsTracked++;
      
      // Log occasionnel pour debug
      if (this.aiStats.actionsTracked % 50 === 0) {
        console.log(`📊 [AI] ${this.aiStats.actionsTracked} actions trackées`);
      }
    } catch (error) {
      console.error(`❌ [AI] Erreur tracking action:`, error);
    }
  }

  // ===================================================================
  // 🧠 ANALYSE - COPIE EXACTE DU WORLDROOM  
  // ===================================================================

  /**
   * ✅ COPIE EXACTE de analyzePlayerWithAI() du WorldRoom
   */
  async analyzePlayer(username: string): Promise<CompletePlayerAnalysis | null> {
    if (!this.aiSystemInitialized) {
      console.warn(`⚠️ [AI] Système non initialisé pour analyse de ${username}`);
      return null;
    }
    
    try {
      const analysis = await this.intelligenceOrchestrator.analyzePlayer(username);
      if (analysis) {
        this.aiStats.lastAnalysisTime = Date.now();
        console.log(`🧠 [AI] Analyse complète de ${username}: confiance ${analysis.analysisConfidence.toFixed(2)}`);
      }
      return analysis;
    } catch (error) {
      console.error(`❌ [AI] Erreur analyse joueur ${username}:`, error);
      return null;
    }
  }

  // ===================================================================
  // 🤖 INTERACTION NPC - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE du code d'interaction NPC intelligent du WorldRoom
   */
  async handleIntelligentNPCInteraction(
    username: string,
    sessionId: string,
    npcId: number,
    playerInfo: PlayerInfo
  ): Promise<AIInteractionResult> {
    if (!this.aiSystemInitialized) {
      return {
        success: false,
        type: "error",
        isAI: false
      };
    }

    try {
      // ✅ COPIE EXACTE du tracking du WorldRoom
      this.trackPlayerAction(
        username,  // ✅ Username au lieu de sessionId
        ActionType.NPC_TALK,
        {
          npcId: npcId,
          playerLevel: playerInfo.level,
          playerGold: playerInfo.gold
        },
        {
          location: { 
            map: playerInfo.currentZone, 
            x: playerInfo.x, 
            y: playerInfo.y 
          }
        }
      );

      // ✅ COPIE EXACTE de l'interaction intelligente du WorldRoom
      const smartResponse = await handleSmartNPCInteraction(
        sessionId,  // ✅ Garder sessionId pour communication client
        npcId,
        'dialogue',
        {
          playerAction: 'interact',
          location: { map: playerInfo.currentZone, x: playerInfo.x, y: playerInfo.y },
          sessionData: { level: playerInfo.level, gold: playerInfo.gold }
        }
      );

      if (smartResponse.success) {
        console.log(`🧠 [AI] Interaction intelligente réussie avec NPC ${npcId}`);
        this.aiStats.intelligentInteractions++;
        
        return {
          success: true,
          type: "smart_dialogue",
          message: smartResponse.dialogue.message,
          dialogue: smartResponse.dialogue,
          actions: smartResponse.actions,
          followUpQuestions: smartResponse.followUpQuestions,
          metadata: smartResponse.metadata,
          isAI: true
        };
      } else {
        // ✅ Retourner fallback comme dans WorldRoom
        return {
          success: false,
          type: "fallback_needed",
          isAI: false
        };
      }
      
    } catch (error) {
      console.error(`❌ [AI] Erreur interaction intelligente:`, error);
      return {
        success: false,
        type: "error",
        isAI: false
      };
    }
  }

  // ===================================================================
  // 🔧 ENREGISTREMENT NPC - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE de registerNPCsWithAI() du WorldRoom
   */
  async registerNPCs(allNpcs: any[]): Promise<void> {
    try {
      console.log(`📋 [AI] Enregistrement des NPCs dans le système d'IA...`);
      
      console.log(`🔍 [AI] ${allNpcs.length} NPCs trouvés pour enregistrement IA`);
      
      if (allNpcs.length > 0) {
        const results = await this.npcIntelligenceConnector.registerNPCsBulk(allNpcs);
        console.log(`✅ [AI] NPCs enregistrés: ${results.registered} réussis, ${results.skipped} ignorés`);
        
        if (results.errors.length > 0) {
          console.warn(`⚠️ [AI] Erreurs d'enregistrement:`, results.errors.slice(0, 3)); // Log que les 3 premières
        }
      } else {
        console.log(`ℹ️ [AI] Aucun NPC à enregistrer pour l'IA`);
      }
      
    } catch (error) {
      console.error(`❌ [AI] Erreur enregistrement NPCs:`, error);
    }
  }

  // ===================================================================
  // 📊 STATS - COPIE EXACTE DU WORLDROOM
  // ===================================================================

  /**
   * ✅ COPIE EXACTE de getAIStats() du WorldRoom
   */
  getStats(): any {
    const orchestratorStats = this.aiSystemInitialized ? this.intelligenceOrchestrator.getStats() : {};
    const connectorStats = this.npcIntelligenceConnector.getStats();
    
    return {
      initialized: this.aiSystemInitialized,
      localStats: this.aiStats,
      orchestrator: orchestratorStats,
      npcConnector: connectorStats,
      health: this.intelligenceOrchestrator.getHealthStatus()
    };
  }

  // ===================================================================
  // 🧹 NETTOYAGE
  // ===================================================================

  cleanup(): void {
    this.aiSystemInitialized = false;
    console.log('🧹 [AINPCManager] Nettoyé');
  }
}

// ===================================================================
// 🏭 SINGLETON
// ===================================================================

let managerInstance: AINPCManager | null = null;

export function getAINPCManager(): AINPCManager {
  if (!managerInstance) {
    managerInstance = new AINPCManager();
  }
  return managerInstance;
}
