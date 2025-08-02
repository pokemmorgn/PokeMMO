// server/src/Intelligence/AINPCManager.ts
import { getIntelligenceOrchestrator, trackPlayerAction, processGameEvent } from "./IntelligenceOrchestrator";
import type { CompletePlayerAnalysis, GameEvent } from "./IntelligenceOrchestrator";
import { getActionTracker } from "./Core/PlayerActionTracker";
import { getActionLogger } from "./DataCollection/ActionLogger";
import { getNPCIntelligenceConnector, registerNPCsWithAI, handleSmartNPCInteraction } from "./NPCSystem/NPCIntelligenceConnector";
import type { SmartNPCResponse } from "./NPCSystem/NPCIntelligenceConnector";
import { ActionType } from "./Core/ActionTypes";

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

export class AINPCManager {
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
    // Module IA déchargé du WorldRoom
  }

  async initialize(): Promise<void> {
    try {
      this.actionTracker.setDatabase(this.actionLogger);
      
      this.npcIntelligenceConnector.updateConfig({
        globallyEnabled: true,
        enabledNPCTypes: ['dialogue', 'healer', 'merchant', 'trainer'],
        debugMode: process.env.NODE_ENV === 'development',
        trackAllInteractions: true
      });
      
      this.aiSystemInitialized = true;
      
    } catch (error) {
      throw error;
    }
  }

  registerPlayer(playerInfo: PlayerInfo): void {
    if (!this.aiSystemInitialized) {
      return;
    }

    try {
      this.actionTracker.registerPlayer(
        playerInfo.username,
        playerInfo.username,
        `session_${Date.now()}`,
        { map: playerInfo.currentZone, x: playerInfo.x, y: playerInfo.y },
        playerInfo.level
      );
    } catch (error) {
      console.error(`❌ [AI] Erreur enregistrement joueur:`, error);
    }
  }

  unregisterPlayer(username: string): void {
    // Session end géré par trackPlayerAction
  }

  trackPlayerAction(
    username: string,
    actionType: ActionType,
    actionData: any = {},
    context?: { location?: { map: string; x: number; y: number } }
  ): void {
    if (!this.aiSystemInitialized) return;
    
    try {
      trackPlayerAction(username, actionType, actionData, context);
      this.aiStats.actionsTracked++;
      
      if (this.aiStats.actionsTracked % 50 === 0) {
        console.log(`📊 [AI] ${this.aiStats.actionsTracked} actions trackées`);
      }
    } catch (error) {
      console.error(`❌ [AI] Erreur tracking action:`, error);
    }
  }

  async analyzePlayer(username: string): Promise<CompletePlayerAnalysis | null> {
    if (!this.aiSystemInitialized) {
      return null;
    }
    
    try {
      const analysis = await this.intelligenceOrchestrator.analyzePlayer(username);
      if (analysis) {
        this.aiStats.lastAnalysisTime = Date.now();
      }
      return analysis;
    } catch (error) {
      console.error(`❌ [AI] Erreur analyse joueur ${username}:`, error);
      return null;
    }
  }

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
      this.trackPlayerAction(
        username,
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

      const smartResponse = await handleSmartNPCInteraction(
        sessionId,
        npcId.toString(),
        'dialogue',
        {
          playerAction: 'interact',
          location: { map: playerInfo.currentZone, x: playerInfo.x, y: playerInfo.y },
          sessionData: { level: playerInfo.level, gold: playerInfo.gold }
        }
      );

      if (smartResponse.success) {
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

  async registerNPCs(allNpcs: any[]): Promise<void> {
    try {
      if (allNpcs.length > 0) {
        const results = await this.npcIntelligenceConnector.registerNPCsBulk(allNpcs);
        
        if (results.errors.length > 0) {
          console.warn(`⚠️ [AI] Erreurs d'enregistrement:`, results.errors.slice(0, 3));
        }
      }
      
    } catch (error) {
      console.error(`❌ [AI] Erreur enregistrement NPCs:`, error);
    }
  }

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

  cleanup(): void {
    this.aiSystemInitialized = false;
  }
}

let managerInstance: AINPCManager | null = null;

export function getAINPCManager(): AINPCManager {
  if (!managerInstance) {
    managerInstance = new AINPCManager();
  }
  return managerInstance;
}
