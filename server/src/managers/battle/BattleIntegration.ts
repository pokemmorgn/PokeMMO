// server/src/managers/battle/BattleIntegration.ts
// Intégration finale du nouveau système de combat avec BattleRoom

import BattleSequencer, { IBattleRoomCallbacks } from './BattleSequencer';
import SoloBattleHandler from './handlers/SoloBattleHandler';
import { 
  BattleContext, 
  BattleAction, 
  BattlePokemonData,
  BattleParticipant,
  BattleSettings,
  BattleEnvironment,
  ActionType
} from './types/BattleTypes';
import { DamageCalculator } from './DamageCalculator';
import { TypeEffectiveness } from './TypeEffectiveness';
import { BattleMessageHandler } from './BattleMessageHandler';
import { MoveManager } from '../MoveManager'; //
/**
 * INTÉGRATEUR PRINCIPAL
 * 
 * Relie le nouveau système de combat au BattleRoom existant
 * Fournit une API simple pour migrer progressivement
 */
export class BattleIntegration {
  
  private sequencer: BattleSequencer;
  private soloHandler: SoloBattleHandler;
  private currentContext: BattleContext | null = null;
  
  constructor() {
    console.log('🔗 [BattleIntegration] Initialisation...');
    
    // Créer le sequencer
    this.sequencer = new BattleSequencer();
    
    // Créer et enregistrer le handler solo
    this.soloHandler = new SoloBattleHandler();  // ✅ Utiliser le vrai handler
    this.sequencer.registerHandler('solo', this.soloHandler);
    
    console.log('✅ [BattleIntegration] Système initialisé');
  }
  
  // === INTERFACE POUR BATTLEROOM ===
  
  /**
   * Initialise un nouveau combat avec le BattleRoom
   */
  initializeBattle(
    battleRoomCallbacks: IBattleRoomCallbacks,
    battleType: string,
    participants: any[]
  ): BattleContext {
    console.log(`🚀 [BattleIntegration] Initialisation combat ${battleType}`);
    
    // Configurer les callbacks
    this.sequencer.setCallbacks(battleRoomCallbacks);
    
    // Créer le contexte
    this.currentContext = this.createBattleContext(battleType, participants);
    
    console.log(`✅ [BattleIntegration] Combat initialisé: ${this.currentContext.battleId}`);
    return this.currentContext;
  }
  
  /**
   * Traite une action de combat via le nouveau système
   */
  async processAction(
    playerId: string,
    actionType: ActionType,
    actionData: any
  ): Promise<boolean> {
    if (!this.currentContext) {
      console.error('❌ [BattleIntegration] Aucun combat actif');
      return false;
    }
    
    console.log(`⚔️ [BattleIntegration] Action: ${actionType} par ${playerId}`);
    
    // Créer l'action
    const action: BattleAction = {
      actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      type: actionType,
      data: actionData,
      priority: actionData.priority || 0,
      speed: this.getPlayerSpeed(playerId) || 50,
      timestamp: Date.now()
    };
    
    // Traiter via le sequencer
    const success = await this.sequencer.processAction(action, this.currentContext);
    
    if (success) {
      console.log(`✅ [BattleIntegration] Action traitée avec succès`);
    } else {
      console.error(`❌ [BattleIntegration] Échec traitement action`);
    }
    
    return success;
  }
  
  /**
   * Met à jour le contexte de combat
   */
  updateContext(updates: Partial<BattleContext>): void {
    if (!this.currentContext) return;
    
    Object.assign(this.currentContext, updates);
    console.log(`🔄 [BattleIntegration] Contexte mis à jour`);
  }
  
  /**
   * Termine le combat
   */
  endBattle(): void {
    if (!this.currentContext) return;
    
    console.log(`🏁 [BattleIntegration] Fin du combat ${this.currentContext.battleId}`);
    
    // Nettoyer les séquences
    this.sequencer.cancelBattleSequences(this.currentContext.battleId);
    
    this.currentContext = null;
  }
  
  // === MÉTHODES DE MIGRATION ===
  
  /**
   * Convertit les données BattleRoom existantes vers le nouveau format
   */
  static convertBattleRoomData(battleRoomState: any): {
    context: BattleContext,
    participants: BattleParticipant[]
  } {
    console.log('🔄 [BattleIntegration] Conversion données BattleRoom...');
    
    // Créer les participants
    const participants: BattleParticipant[] = [];
    
    // Participant 1 (joueur)
    if (battleRoomState.player1Pokemon) {
      participants.push({
        sessionId: battleRoomState.player1Id || 'player1',
        name: battleRoomState.player1Name || 'Joueur',
        role: 'player1',
        team: [BattleIntegration.convertToBattlePokemon(battleRoomState.player1Pokemon)],
        activePokemon: battleRoomState.player1Pokemon.pokemonId?.toString() || '1',
        isAI: false,
        isConnected: true,
        lastActionTime: Date.now()
      });
    }
    
    // Participant 2 (IA/adversaire)
    if (battleRoomState.player2Pokemon) {
      participants.push({
        sessionId: 'ai',
        name: battleRoomState.player2Pokemon.isWild ? 'Pokémon Sauvage' : 'Dresseur',
        role: 'player2',
        team: [BattleIntegration.convertToBattlePokemon(battleRoomState.player2Pokemon)],
        activePokemon: battleRoomState.player2Pokemon.pokemonId?.toString() || '2',
        isAI: true,
        isConnected: true,
        lastActionTime: Date.now()
      });
    }
    
    // Créer le contexte
    const context: BattleContext = {
      battleId: battleRoomState.battleId || `migrated_${Date.now()}`,
      battleType: battleRoomState.battleType === 'wild' ? 'wild' : 'trainer',
      phase: BattleIntegration.convertPhase(battleRoomState.phase),
      participants,
      spectators: [],
      settings: {
        allowSpectators: true,
        allowItems: true,
        customRules: {}
      },
      environment: {
        location: battleRoomState.encounterLocation || 'unknown',
        effects: []
      },
      turn: battleRoomState.turnNumber || 1,
      currentPlayer: battleRoomState.currentTurn === 'player1' ? participants[0]?.sessionId || 'player1' : 'ai',
      isMultiplayer: false,
      maxClients: 2
      // ✅ SUPPRESSION: escapeAttempts (sera ajouté dynamiquement si nécessaire)
    };
    
    console.log('✅ [BattleIntegration] Données converties');
    return { context, participants };
  }
  
  /**
   * Convertit un Pokémon BattleRoom vers le nouveau format
   */
  static convertToBattlePokemon(oldPokemon: any): BattlePokemonData {
    return {
      pokemonId: oldPokemon.pokemonId || 1,
      name: oldPokemon.name || 'Pokémon',
      level: oldPokemon.level || 5,
      currentHp: oldPokemon.currentHp || 20,
      maxHp: oldPokemon.maxHp || 20,
      types: Array.isArray(oldPokemon.types) ? Array.from(oldPokemon.types) : ['Normal'],
      moves: Array.isArray(oldPokemon.moves)
        ? oldPokemon.moves.map((moveId: string) => {
            const moveData = MoveManager.getMoveData(moveId);
            return moveData
              ? {
                  moveId: moveData.id,
                  name: moveData.name,
                  type: moveData.type,
                  category: moveData.category.toLowerCase(), // En minuscule pour compatibilité
                  power: moveData.power,
                  accuracy: moveData.accuracy,
                  pp: moveData.pp,
                  maxPp: moveData.pp,
                  priority: moveData.priority,
                  description: moveData.description,
                  effects: moveData.effects,
                  contact: moveData.contact,
                }
              : {
                  moveId,
                  name: moveId,
                  type: 'Normal',
                  category: 'physical',
                  power: 40,
                  accuracy: 100,
                  pp: 35,
                  maxPp: 35,
                  priority: 0,
                  description: 'Default move',
                };
          })
        : [{
            moveId: 'tackle',
            name: 'Charge',
            type: 'Normal',
            category: 'physical',
            power: 40,
            accuracy: 100,
            pp: 35,
            maxPp: 35,
            priority: 0,
            description: 'Default move'
          }],
      ability: oldPokemon.ability,
      heldItem: oldPokemon.heldItem,
      statusCondition: oldPokemon.statusCondition || 'normal',
      statStages: {
        attack: oldPokemon.attackStage || 0,
        defense: oldPokemon.defenseStage || 0,
        specialAttack: oldPokemon.specialAttackStage || 0,
        specialDefense: oldPokemon.specialDefenseStage || 0,
        speed: oldPokemon.speedStage || 0,
        accuracy: 0,
        evasion: 0
      },
      stats: {
        hp: oldPokemon.maxHp || 20,
        attack: oldPokemon.attack || 10,
        defense: oldPokemon.defense || 10,
        specialAttack: oldPokemon.specialAttack || 10,
        specialDefense: oldPokemon.specialDefense || 10,
        speed: oldPokemon.speed || 10
      },
      gender: oldPokemon.gender,
      shiny: oldPokemon.shiny || false,
      isWild: oldPokemon.isWild || false,
      experience: oldPokemon.experience,
      nature: oldPokemon.nature
      // ✅ SUPPRESSION: speed (déjà dans stats.speed)
    };
  }
  
  /**
   * Convertit la phase BattleRoom vers le nouveau format
   */
  static convertPhase(oldPhase: string): any {
    const phaseMap: { [key: string]: any } = {
      'waiting': 'waiting',
      'intro': 'intro',
      'team_selection': 'team_selection',
      'battle': 'battle',
      'ended': 'ended',
      'fled': 'fled'
    };
    
    return phaseMap[oldPhase] || 'battle';
  }
  
  // === MÉTHODES PRIVÉES ===
  
  private createBattleContext(battleType: string, participants: any[]): BattleContext {
    return {
      battleId: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      battleType: battleType as any,
      phase: 'battle',
      participants: participants.map(p => this.convertParticipant(p)),
      spectators: [],
      settings: {
        allowSpectators: true,
        allowItems: battleType !== 'wild',
        customRules: {}
      },
      environment: {
        location: 'unknown',
        effects: []
      },
      turn: 1,
      currentPlayer: participants[0]?.sessionId || 'player1',
      isMultiplayer: participants.length > 2,
      maxClients: participants.length
      // ✅ SUPPRESSION: escapeAttempts (sera ajouté dynamiquement)
    };
  }
  
private convertParticipant(participant: any): BattleParticipant {
  return {
    sessionId: participant.sessionId || participant.id || 'unknown',
    name: participant.name || 'Participant',
    role: participant.role || 'player1',
    team: Array.isArray(participant.team)
      ? participant.team.map((pk: any) => pk.stats && pk.statStages ? pk : BattleIntegration.convertToBattlePokemon(pk))
      : [],
    activePokemon: participant.activePokemon || '1',
    isAI: participant.isAI || false,
    isConnected: participant.isConnected !== false,
    lastActionTime: Date.now()
  };
}


  
  private getPlayerSpeed(playerId: string): number | null {
    if (!this.currentContext) return null;
    
    const participant = this.currentContext.participants.find(p => p.sessionId === playerId);
    if (!participant || !participant.team[0]) return null;
    
    return participant.team[0].stats.speed;
  }
  
  // === MÉTHODES DE TEST ===
  
  /**
   * Test complet du système d'intégration
   */
  static async runIntegrationTests(): Promise<void> {
    console.log('🧪 [BattleIntegration] === TESTS COMPLETS ===');
    
    // Test 1: Création de l'intégration
    const integration = new BattleIntegration();
    console.log('✅ Test 1: Création intégration');
    
    // Test 2: Conversion de données
    const mockBattleRoomState = {
      battleId: 'test_battle',
      battleType: 'wild',
      phase: 'battle',
      currentTurn: 'player1',
      turnNumber: 1,
      player1Id: 'player123',
      player1Name: 'TestPlayer',
      player1Pokemon: {
        pokemonId: 25,
        name: 'Pikachu',
        level: 10,
        currentHp: 35,
        maxHp: 35,
        types: ['Electric'],
        moves: ['thunder_shock', 'quick_attack'],
        speed: 55,
        attack: 25,
        defense: 20,
        specialAttack: 30,
        specialDefense: 25
      },
      player2Pokemon: {
        pokemonId: 1,
        name: 'Bulbasaur',
        level: 8,
        currentHp: 28,
        maxHp: 28,
        types: ['Grass', 'Poison'],
        moves: ['tackle', 'vine_whip'],
        isWild: true,
        speed: 20,
        attack: 15,
        defense: 18,
        specialAttack: 20,
        specialDefense: 20
      }
    };
    
    const { context, participants } = BattleIntegration.convertBattleRoomData(mockBattleRoomState);
    console.log('✅ Test 2: Conversion données BattleRoom');
    console.log(`   Battle ID: ${context.battleId}`);
    console.log(`   Type: ${context.battleType}`);
    console.log(`   Participants: ${participants.length}`);
    
    // Test 3: Callbacks mock
    const mockCallbacks: IBattleRoomCallbacks = {
      broadcastMessage: (messageId, data) => {
        console.log(`📡 Broadcast message: ${messageId}`, data);
      },
      broadcastUpdate: (data) => {
        console.log(`📡 Broadcast update:`, data);
      },
      updatePokemonHP: (pokemonId, newHp) => {
        console.log(`💖 Update HP: ${pokemonId} → ${newHp}`);
      },
      changeTurn: (newTurn) => {
        console.log(`🔄 Change turn: ${newTurn}`);
      },
      endBattle: (result) => {
        console.log(`🏁 End battle:`, result);
      },
      logBattleEvent: (event) => {
        console.log(`📝 Log event: ${event.type}`);
      }
    };
    
    // Test 4: Initialisation combat
    const battleContext = integration.initializeBattle(mockCallbacks, 'wild', participants);
    console.log('✅ Test 3: Initialisation combat');
    
    // Test 5: Action de combat
    const actionSuccess = await integration.processAction('player123', 'attack', {
      moveId: 'thunder_shock'
    });
    console.log(`✅ Test 4: Action combat (succès: ${actionSuccess})`);
    
    // Test 6: Fin de combat
    integration.endBattle();
    console.log('✅ Test 5: Fin combat');
    
    console.log('🎉 [BattleIntegration] Tous les tests réussis !');
  }
  
  /**
   * Test de performance du système
   */
  static async runPerformanceTests(): Promise<void> {
    console.log('⚡ [BattleIntegration] === TESTS PERFORMANCE ===');
    
    const integration = new BattleIntegration();
    
    // Mock callbacks silencieux
    const silentCallbacks: IBattleRoomCallbacks = {
      broadcastMessage: () => {},
      broadcastUpdate: () => {},
      updatePokemonHP: () => {},
      changeTurn: () => {},
      endBattle: () => {},
      logBattleEvent: () => {}
    };
    
    const startTime = Date.now();
    const actionCount = 100;
    
    // Initialiser un combat
const context = integration.initializeBattle(silentCallbacks, 'wild', [
  {
    sessionId: 'player1',
    name: 'TestPlayer',
    isAI: false,
    team: [{
      pokemonId: 25,
      name: 'Pikachu',
      level: 12,
      currentHp: 40,
      maxHp: 40,
      types: ['Electric'],
      moves: ['thunder_shock', 'quick_attack'],
      stats: { attack: 30, defense: 25, specialAttack: 35, specialDefense: 30, speed: 60, hp: 40 },
      statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 }
    }]
  },
  {
    sessionId: 'ai',
    name: 'AI',
    isAI: true,
    team: [{
      pokemonId: 16,
      name: 'Roucool',
      level: 8,
      currentHp: 32,
      maxHp: 32,
      types: ['Normal', 'Flying'],
      moves: ['tackle', 'gust'],
      stats: { attack: 18, defense: 20, specialAttack: 15, specialDefense: 18, speed: 25, hp: 32 },
      statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 }
    }]
  }
]);
   
    // Exécuter de nombreuses actions
    for (let i = 0; i < actionCount; i++) {
      await integration.processAction('player1', 'attack', {
        moveId: 'tackle'
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const actionsPerSecond = (actionCount / duration) * 1000;
    
    console.log(`⚡ Performance: ${actionCount} actions en ${duration}ms`);
    console.log(`📊 Vitesse: ${actionsPerSecond.toFixed(2)} actions/seconde`);
    
    integration.endBattle();
    
    console.log('✅ [BattleIntegration] Tests performance terminés');
  }
  
  /**
   * Démonstration d'un combat complet
   */
  static async runBattleDemo(): Promise<void> {
    console.log('🎮 [BattleIntegration] === DÉMO COMBAT COMPLET ===');
    
    const integration = new BattleIntegration();
    
    // Callbacks verbeux pour la démo
    const demoCallbacks: IBattleRoomCallbacks = {
      broadcastMessage: (messageId, data) => {
        console.log(`🎬 MESSAGE: ${data.message || messageId}`);
      },
      broadcastUpdate: (data) => {
        console.log(`🔄 UPDATE: HP mis à jour`);
      },
      updatePokemonHP: (pokemonId, newHp) => {
        console.log(`💖 ${pokemonId} a maintenant ${newHp} HP`);
      },
      changeTurn: (newTurn) => {
        console.log(`🎯 Tour de: ${newTurn}`);
      },
      endBattle: (result) => {
        console.log(`🏆 RÉSULTAT: ${result.result || 'Inconnu'}`);
      },
      logBattleEvent: () => {} // Silencieux pour éviter le spam
    };
    
    // Créer un combat sauvage
    const participants = [
      {
        sessionId: 'player1',
        name: 'Sacha',
        isAI: false,
        team: [{
          pokemonId: 25,
          name: 'Pikachu',
          level: 12,
          currentHp: 40,
          maxHp: 40,
          types: ['Electric'],
          moves: ['thunder_shock', 'quick_attack'],
          stats: { attack: 30, defense: 25, specialAttack: 35, specialDefense: 30, speed: 60, hp: 40 }
        }]
      },
      {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        isAI: true,
        team: [{
          pokemonId: 16,
          name: 'Roucool',
          level: 8,
          currentHp: 32,
          maxHp: 32,
          types: ['Normal', 'Flying'],
          moves: ['tackle', 'gust'],
          stats: { attack: 18, defense: 20, specialAttack: 15, specialDefense: 18, speed: 25, hp: 32 }
        }]
      }
    ];
    
    console.log('🌟 Un Roucool sauvage apparaît !');
    
    const context = integration.initializeBattle(demoCallbacks, 'wild', participants);
    
    // Simulation de quelques tours
    console.log('\n--- TOUR 1 ---');
    await integration.processAction('player1', 'attack', { moveId: 'thunder_shock' });
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause réaliste
    
    console.log('\n--- TOUR 2 ---');
    // L'IA va automatiquement jouer via le SoloBattleHandler
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Laisser l'IA jouer
    
    console.log('\n--- TENTATIVE DE CAPTURE ---');
    await integration.processAction('player1', 'capture', { ballType: 'pokeball' });
    
    await new Promise(resolve => setTimeout(resolve, 4000)); // Animation de capture
    
    integration.endBattle();
    console.log('\n🎉 [BattleIntegration] Démo terminée !');
  }
  
  // === GETTERS DE DEBUG ===
  
  /**
   * Obtient des informations de debug
   */
  getDebugInfo(): any {
    return {
      hasActiveContext: !!this.currentContext,
      contextId: this.currentContext?.battleId,
      sequencerInfo: this.sequencer.getDebugInfo(),
      handlerStats: this.soloHandler.getStats()
    };
  }
  
  /**
   * Obtient le contexte actuel (pour debug)
   */
  getCurrentContext(): BattleContext | null {
    return this.currentContext;
  }
}

// === FONCTIONS UTILITAIRES GLOBALES ===

/**
 * Crée une instance d'intégration prête à l'emploi
 */
export function createBattleIntegration(): BattleIntegration {
  return new BattleIntegration();
}

/**
 * Fonction helper pour migration rapide
 */
export function migrateBattleRoomToBattleSystem(
  battleRoomState: any,
  callbacks: IBattleRoomCallbacks
): BattleIntegration {
  console.log('🔄 [Migration] Migration BattleRoom → BattleSystem...');
  
  const integration = new BattleIntegration();
  const { context, participants } = BattleIntegration.convertBattleRoomData(battleRoomState);
  
  integration.initializeBattle(callbacks, context.battleType, participants);
  
  console.log('✅ [Migration] Migration terminée');
  return integration;
}

// === TESTS AUTOMATIQUES ===

if (false) {
  // Exécuter tous les tests au chargement
  setTimeout(async () => {
    console.log('\n🚀 [BattleIntegration] LANCEMENT TESTS AUTOMATIQUES...\n');
    
    try {
      await BattleIntegration.runIntegrationTests();
      console.log('\n---\n');
      await BattleIntegration.runPerformanceTests();
      console.log('\n---\n');
      await BattleIntegration.runBattleDemo();
      
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS ! SYSTÈME PRÊT ! 🎉');
    } catch (error) {
      console.error('\n💥 ERREUR DANS LES TESTS:', error);
    }
  }, 1000);
}

export default BattleIntegration;
