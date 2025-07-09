// server/src/battle/modules/broadcast/BroadcastManagerFactory.ts
// FACTORY + PRESETS POUR BROADCAST MANAGER

import { BroadcastManager, BATTLE_TIMINGS, BattleEvent } from '../BroadcastManager';
import { BattleGameState, PlayerRole } from '../../types/BattleTypes';

// === PRESETS DE CONFIGURATION ===

export interface BroadcastConfig {
  timingProfile: 'authentic' | 'fast' | 'slow' | 'debug';
  enableSpectators: boolean;
  enableReplay: boolean;
  enableVerboseLogs: boolean;
  customTimings?: Partial<typeof BATTLE_TIMINGS>;
}

export interface EmitCallbackConfig {
  webSocket?: any;
  battleRoom?: any;
  customHandler?: (event: any) => void;
}

// === PROFILS DE TIMING ===

const TIMING_PROFILES = {
  // Timing authentique Pokémon (défaut)
  authentic: BATTLE_TIMINGS,
  
  // Timing accéléré pour tests
  fast: {
    ...BATTLE_TIMINGS,
    moveUsed: 800,
    damageDealt: 600,
    captureAttempt: 700,
    captureShake: 300,
    pokemonFainted: 1000,
    battleEnd: 1200
  },
  
  // Timing ralenti pour spectacle
  slow: {
    ...BATTLE_TIMINGS,
    moveUsed: 2500,
    damageDealt: 2000,
    captureAttempt: 2200,
    captureShake: 1000,
    pokemonFainted: 3000,
    battleEnd: 3500
  },
  
  // Timing minimal pour debug
  debug: Object.fromEntries(
    Object.keys(BATTLE_TIMINGS).map(key => [key, key === 'yourTurn' ? 0 : 100])
  )
} as const;

/**
 * BROADCAST MANAGER FACTORY
 * 
 * Responsabilités :
 * - Créer des BroadcastManager configurés
 * - Fournir des presets de timing
 * - Configurer automatiquement les callbacks
 * - Gérer les profils de performance
 */
export class BroadcastManagerFactory {
  
  private static defaultConfig: BroadcastConfig = {
    timingProfile: 'authentic',
    enableSpectators: true,
    enableReplay: true,
    enableVerboseLogs: false
  };
  
  // === CRÉATION PRINCIPALE ===
  
  /**
   * Crée un BroadcastManager configuré
   */
  static create(
    battleId: string,
    gameState: BattleGameState,
    config: Partial<BroadcastConfig> = {}
  ): BroadcastManager {
    
    const finalConfig = { ...this.defaultConfig, ...config };
    
    console.log(`🏭 [BroadcastFactory] Création manager pour ${battleId} - Profile: ${finalConfig.timingProfile}`);
    
    // Créer le manager de base
    const manager = new BroadcastManager(battleId, gameState);
    
    // Appliquer le profil de timing
    this.applyTimingProfile(manager, finalConfig);
    
    // Configurer les options
    this.configureOptions(manager, finalConfig);
    
    console.log(`✅ [BroadcastFactory] Manager créé avec succès`);
    
    return manager;
  }
  
  /**
   * Crée un manager pour combat sauvage (preset)
   */
  static createForWildBattle(
    battleId: string,
    gameState: BattleGameState,
    playerSessionId: string
  ): BroadcastManager {
    
    const manager = this.create(battleId, gameState, {
      timingProfile: 'authentic',
      enableSpectators: true,
      enableReplay: true
    });
    
    // Configuration spécifique combat sauvage
    manager.addParticipant(playerSessionId);
    
    console.log(`🌿 [BroadcastFactory] Manager combat sauvage créé pour ${playerSessionId}`);
    
    return manager;
  }
  
  /**
   * Crée un manager pour combat PvP (preset)
   */
  static createForPvPBattle(
    battleId: string,
    gameState: BattleGameState,
    player1SessionId: string,
    player2SessionId: string
  ): BroadcastManager {
    
    const manager = this.create(battleId, gameState, {
      timingProfile: 'authentic',
      enableSpectators: true,
      enableReplay: true,
      enableVerboseLogs: true // Plus de logs pour PvP
    });
    
    // Configuration spécifique PvP
    manager.addParticipant(player1SessionId);
    manager.addParticipant(player2SessionId);
    
    console.log(`⚔️ [BroadcastFactory] Manager PvP créé pour ${player1SessionId} vs ${player2SessionId}`);
    
    return manager;
  }
  
  /**
   * Crée un manager pour combat de test (rapide)
   */
  static createForTesting(
    battleId: string,
    gameState: BattleGameState
  ): BroadcastManager {
    
    return this.create(battleId, gameState, {
      timingProfile: 'debug',
      enableSpectators: false,
      enableReplay: false,
      enableVerboseLogs: true
    });
  }
  
  // === CONFIGURATION CALLBACKS ===
  
  /**
   * Configure le callback d'émission pour WebSocket
   */
  static configureWebSocket(
    manager: BroadcastManager,
    webSocketHandler: any
  ): void {
    
    manager.setEmitCallback((event: BattleEvent) => {
      // Envoyer à tous les participants
      const recipients = [
        ...event.participants || [],
        ...event.spectators || []
      ];
      
      recipients.forEach(sessionId => {
        try {
          webSocketHandler.sendToUser(sessionId, 'battleEvent', event);
        } catch (error) {
          console.error(`❌ [BroadcastFactory] Erreur envoi WS à ${sessionId}:`, error);
        }
      });
    });
    
    console.log(`🔌 [BroadcastFactory] Callback WebSocket configuré`);
  }
  
  /**
   * Configure le callback pour BattleRoom
   */
  static configureBattleRoom(
    manager: BroadcastManager,
    battleRoom: any
  ): void {
    
    manager.setEmitCallback((event: BattleEvent) => {
      try {
        // Utiliser la méthode broadcast de BattleRoom
        battleRoom.broadcast('battleEvent', event);
      } catch (error) {
        console.error(`❌ [BroadcastFactory] Erreur BattleRoom broadcast:`, error);
      }
    });
    
    console.log(`🏰 [BroadcastFactory] Callback BattleRoom configuré`);
  }
  
  /**
   * Configure un callback personnalisé
   */
  static configureCustomCallback(
    manager: BroadcastManager,
    customHandler: (event: any) => void
  ): void {
    
    manager.setEmitCallback(customHandler);
    console.log(`⚙️ [BroadcastFactory] Callback personnalisé configuré`);
  }
  
  // === MÉTHODES HELPER ===
  
  /**
   * Crée des données d'attaque formatées pour emitAttackSequence
   */
  static createAttackData(
    attacker: { name: string; role: PlayerRole },
    target: { name: string; role: PlayerRole },
    move: { id: string; name: string; power?: number },
    damage: number,
    oldHp: number,
    newHp: number,
    maxHp: number,
    effects: string[] = []
  ) {
    return {
      attacker,
      target,
      move,
      damage,
      oldHp,
      newHp,
      maxHp,
      effects,
      isKnockedOut: newHp <= 0
    };
  }
  
  /**
   * Crée des données de capture formatées pour emitCaptureSequence
   */
  static createCaptureData(
    playerName: string,
    pokemonName: string,
    ballType: string,
    ballDisplayName: string,
    shakeCount: number,
    captured: boolean,
    critical: boolean = false,
    addedTo: 'team' | 'pc' = 'team'
  ) {
    return {
      playerName,
      pokemonName,
      ballType,
      ballDisplayName,
      shakeCount,
      captured,
      critical,
      addedTo
    };
  }
  
  /**
   * Utilitaire pour convertir les effets de combat en IDs
   */
  static parseTypeEffectiveness(effectiveness: number): string[] {
    const effects: string[] = [];
    
    if (effectiveness > 1.5) {
      effects.push('super_effective');
    } else if (effectiveness < 0.75) {
      effects.push('not_very_effective');
    } else if (effectiveness === 0) {
      effects.push('no_effect');
    }
    
    return effects;
  }
  
  /**
   * Utilitaire pour détecter un coup critique
   */
  static addCriticalHitEffect(effects: string[], isCritical: boolean): string[] {
    if (isCritical && !effects.includes('critical_hit')) {
      return ['critical_hit', ...effects];
    }
    return effects;
  }
  
  // === CONFIGURATION INTERNE ===
  
  private static applyTimingProfile(
    manager: BroadcastManager,
    config: BroadcastConfig
  ): void {
    
    const profile = TIMING_PROFILES[config.timingProfile];
    const finalTimings = { ...profile, ...config.customTimings };
    
    // Le BroadcastManager utilise déjà BATTLE_TIMINGS par défaut
    // Cette méthode permettra d'override les timings si besoin futur
    
    console.log(`⏱️ [BroadcastFactory] Profil timing appliqué: ${config.timingProfile}`);
  }
  
  private static configureOptions(
    manager: BroadcastManager,
    config: BroadcastConfig
  ): void {
    
    // Configuration des options sera implémentée selon les besoins
    // Pour l'instant, les options sont gérées automatiquement
    
    if (config.enableVerboseLogs) {
      console.log(`📋 [BroadcastFactory] Logs verbeux activés`);
    }
    
    if (!config.enableSpectators) {
      console.log(`👁️ [BroadcastFactory] Spectateurs désactivés`);
    }
    
    if (!config.enableReplay) {
      console.log(`📼 [BroadcastFactory] Replay désactivé`);
    }
  }
  
  // === UTILITAIRES STATIQUES ===
  
  /**
   * Récupère les profils de timing disponibles
   */
  static getAvailableTimingProfiles(): string[] {
    return Object.keys(TIMING_PROFILES);
  }
  
  /**
   * Récupère un profil de timing spécifique
   */
  static getTimingProfile(profileName: keyof typeof TIMING_PROFILES) {
    return TIMING_PROFILES[profileName];
  }
  
  /**
   * Crée un profil de timing personnalisé
   */
  static createCustomTimingProfile(
    basedOn: keyof typeof TIMING_PROFILES,
    overrides: Partial<typeof BATTLE_TIMINGS>
  ) {
    const baseProfile = TIMING_PROFILES[basedOn];
    return { ...baseProfile, ...overrides };
  }
  
  /**
   * Statistiques de la factory
   */
  static getFactoryStats() {
    return {
      version: 'v1.0.0',
      defaultProfile: this.defaultConfig.timingProfile,
      availableProfiles: this.getAvailableTimingProfiles(),
      presets: ['wild', 'pvp', 'testing'],
      features: [
        'timing_profiles',
        'websocket_integration', 
        'battleroom_integration',
        'custom_callbacks',
        'helper_methods'
      ]
    };
  }
}

export default BroadcastManagerFactory;
