// server/src/battle/modules/CaptureManager.ts
// VERSION AVEC BROADCASTMANAGER - INTÉGRATION RAPIDE

import { BattleGameState, BattleResult, Pokemon } from '../types/BattleTypes';
import { TeamManager } from '../../managers/TeamManager';
import { InventoryManager } from '../../managers/InventoryManager';
import { OwnedPokemon } from '../../models/OwnedPokemon';
import { getPokemonById } from '../../data/PokemonData';
import { MoveManager } from '../../managers/MoveManager';
import { BallManager } from './BallManager';
import { BroadcastManager, BroadcastManagerFactory } from './broadcast/BroadcastManagerFactory';

// === INTERFACES (inchangées) ===

export interface CaptureAnimation {
  phase: 'throw' | 'shake' | 'success' | 'failure';
  shakeCount: number;
  totalShakes: number;
  message: string;
  timing: number;
}

export interface CriticalCaptureResult {
  isCritical: boolean;
  chance: number;
  pokemonCaughtCount: number;
  message?: string;
}

export interface CaptureResult extends BattleResult {
  captureData?: {
    captured: boolean;
    pokemonName: string;
    ballType: string;
    animations: CaptureAnimation[];
    shakeCount: number;
    captureRate: number;
    battleEnded: boolean;
    addedTo?: 'team' | 'pc';
    pokemonId?: string;
    critical?: boolean;
    criticalChance?: number;
    pokemonCaughtCount?: number;
  };
}

/**
 * CAPTURE MANAGER - VERSION AVEC BROADCASTMANAGER
 * 
 * ✅ NOUVEAU: Intégration timing serveur pour captures
 */
export class CaptureManager {
  
  private gameState: BattleGameState | null = null;
  private ballManager: BallManager;
  
  // ✅ NOUVEAU: Support BroadcastManager optionnel
  private broadcastManager: BroadcastManager | null = null;
  
  constructor() {
    this.ballManager = new BallManager();
    console.log('🎯 [CaptureManager] Version avec BroadcastManager initialisée');
  }
  
  // === ✅ NOUVEAU: CONFIGURATION BROADCAST ===
  
  /**
   * Configure le BroadcastManager pour timing des captures
   */
  setBroadcastManager(broadcastManager: BroadcastManager): void {
    this.broadcastManager = broadcastManager;
    console.log('📡 [CaptureManager] BroadcastManager configuré');
  }
  
  // === INITIALISATION ===
  
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    
    this.ballManager.setBattleContext({
      turnNumber: gameState.turnNumber || 1
    });
    
    console.log('✅ [CaptureManager] Configuré avec BallManager');
  }
  
  // === API PRINCIPALE ===
  
  async attemptCapture(
    playerId: string, 
    ballType: string, 
    teamManager: TeamManager
  ): Promise<CaptureResult> {
    console.log(`🎯 [CaptureManager] Tentative capture - ${ballType} par ${playerId}`);
    
    if (!this.gameState) {
      return this.createErrorResult('CaptureManager non initialisé');
    }
    
    try {
      // 1. Validation des conditions
      const validation = await this.validateCaptureConditions(playerId, ballType);
      if (!validation.success) {
        return validation as CaptureResult;
      }
      
      const targetPokemon = this.gameState.player2.pokemon!;
      const playerName = this.getPlayerName(playerId);
      
      // 2. Validation Ball via BallManager
      const ballValidation = this.ballManager.validateBall(ballType);
      if (!ballValidation.isValid) {
        return this.createErrorResult(`${ballType} n'est pas une Poké Ball valide`);
      }
      
      // 3. Consommer la Ball
      const ballConsumed = await InventoryManager.removeItem(playerName, ballType, 1);
      if (!ballConsumed) {
        return this.createErrorResult(`Vous n'avez plus de ${ballValidation.displayName} !`);
      }
      
      console.log(`🎾 [CaptureManager] ${ballValidation.displayName} consommée`);
      
      // 4. Test de capture critique
      const criticalResult = await this.calculateCriticalCaptureChance(targetPokemon, ballType, playerName);
      
      if (criticalResult.isCritical) {
        // CAPTURE CRITIQUE
        return await this.processCriticalCapture(targetPokemon, ballType, ballValidation, criticalResult, teamManager, playerName);
      }
      
      // 5. Capture normale
      return await this.processNormalCapture(targetPokemon, ballType, ballValidation, criticalResult, teamManager, playerName);
      
    } catch (error) {
      console.error(`❌ [CaptureManager] Erreur:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue lors de la capture'
      );
    }
  }
  
  // === ✅ NOUVEAU: CAPTURE AVEC BROADCAST ===
  
  /**
   * Capture critique avec BroadcastManager
   */
  private async processCriticalCapture(
    pokemon: Pokemon,
    ballType: string,
    ballValidation: any,
    criticalResult: CriticalCaptureResult,
    teamManager: TeamManager,
    playerName: string
  ): Promise<CaptureResult> {
    
    console.log(`⭐ [CaptureManager] CAPTURE CRITIQUE !`);
    
    // ✅ NOUVEAU: Émettre via BroadcastManager si disponible
    if (this.broadcastManager) {
      const captureData = BroadcastManagerFactory.createCaptureData(
        playerName,
        pokemon.name,
        ballType,
        ballValidation.displayName,
        1, // 1 secousse pour critique
        true, // captured
        true, // critical
        'team' // sera déterminé plus tard
      );
      
      // Émettre la séquence avec timing optimal
      await this.broadcastManager.emitCaptureSequence(captureData);
    }
    
    // Logique de capture (inchangée)
    const capturedPokemon = await this.createCapturedPokemon(pokemon, playerName, ballType);
    const addResult = await this.addPokemonToTeamOrPC(capturedPokemon, teamManager);
    
    // Animation pour compatibilité (si pas de BroadcastManager)
    const animations = await this.generateCriticalAnimations(pokemon, ballValidation);
    
    return {
      success: true,
      gameState: this.gameState,
      events: this.broadcastManager ? [] : [ // Pas d'événements si BroadcastManager actif
        `Vous lancez ${ballValidation.displayName} !`,
        '⭐ Capture critique ! ⭐',
        `${pokemon.name} a été capturé !`,
        addResult.message
      ],
      captureData: {
        captured: true,
        pokemonName: pokemon.name,
        ballType: ballType,
        animations: animations,
        shakeCount: 1,
        captureRate: 1.0,
        battleEnded: true,
        addedTo: addResult.location,
        pokemonId: capturedPokemon._id,
        critical: true,
        criticalChance: criticalResult.chance,
        pokemonCaughtCount: criticalResult.pokemonCaughtCount
      },
      data: {
        captured: true,
        battleEnded: true,
        winner: 'player1',
        critical: true
      }
    };
  }
  
  /**
   * Capture normale avec BroadcastManager
   */
  private async processNormalCapture(
    pokemon: Pokemon,
    ballType: string,
    ballValidation: any,
    criticalResult: CriticalCaptureResult,
    teamManager: TeamManager,
    playerName: string
  ): Promise<CaptureResult> {
    
    console.log(`🎯 [CaptureManager] Capture normale`);
    
    // Calculer le taux de capture
    const captureRate = await this.calculateCaptureRate(pokemon, ballType);
    
    // Effectuer les 4 checks
    const checkResult = this.performFourChecks(captureRate);
    
    // ✅ NOUVEAU: Émettre via BroadcastManager si disponible
    if (this.broadcastManager) {
      const captureData = BroadcastManagerFactory.createCaptureData(
        playerName,
        pokemon.name,
        ballType,
        ballValidation.displayName,
        checkResult.shakeCount,
        checkResult.captured,
        false, // pas critique
        checkResult.captured ? 'team' : undefined
      );
      
      // Émettre la séquence avec timing optimal
      await this.broadcastManager.emitCaptureSequence(captureData);
    }
    
    // Générer les animations (pour compatibilité)
    const animations = await this.generateNormalAnimations(pokemon, ballValidation, checkResult);
    
    if (checkResult.captured) {
      // SUCCÈS
      const capturedPokemon = await this.createCapturedPokemon(pokemon, playerName, ballType);
      const addResult = await this.addPokemonToTeamOrPC(capturedPokemon, teamManager);
      
      return {
        success: true,
        gameState: this.gameState,
        events: this.broadcastManager ? [] : this.generateEventMessages(animations, pokemon.name, addResult.message),
        captureData: {
          captured: true,
          pokemonName: pokemon.name,
          ballType: ballType,
          animations: animations,
          shakeCount: checkResult.shakeCount,
          captureRate: captureRate,
          battleEnded: true,
          addedTo: addResult.location,
          pokemonId: capturedPokemon._id,
          critical: false,
          criticalChance: criticalResult.chance,
          pokemonCaughtCount: criticalResult.pokemonCaughtCount
        },
        data: {
          captured: true,
          battleEnded: true,
          winner: 'player1'
        }
      };
      
    } else {
      // ÉCHEC
      return {
        success: true,
        gameState: this.gameState,
        events: this.broadcastManager ? [] : this.generateEventMessages(animations, pokemon.name),
        captureData: {
          captured: false,
          pokemonName: pokemon.name,
          ballType: ballType,
          animations: animations,
          shakeCount: checkResult.shakeCount,
          captureRate: captureRate,
          battleEnded: false,
          critical: false,
          criticalChance: criticalResult.chance,
          pokemonCaughtCount: criticalResult.pokemonCaughtCount
        },
        data: {
          captured: false,
          battleEnded: false
        }
      };
    }
  }
  
  // === MÉTHODES EXISTANTES (inchangées pour rapidité) ===
  
  private async calculateCriticalCaptureChance(pokemon: Pokemon, ballType: string, playerName: string): Promise<CriticalCaptureResult> {
    const pokemonCaughtCount = await this.getPokemonCaughtCount(playerName);
    
    let criticalMultiplier = 0;
    if (pokemonCaughtCount >= 600) criticalMultiplier = 2.5;
    else if (pokemonCaughtCount >= 450) criticalMultiplier = 2.0;
    else if (pokemonCaughtCount >= 300) criticalMultiplier = 1.5;
    else if (pokemonCaughtCount >= 150) criticalMultiplier = 1.0;
    else if (pokemonCaughtCount >= 60) criticalMultiplier = 0.5;
    else criticalMultiplier = 0;
    
    const ballEffect = this.ballManager.calculateBallEffect(ballType, pokemon, playerName);
    const pokemonData = await getPokemonById(pokemon.id);
    const baseCaptureRate = (pokemonData as any)?.captureRate || 45;
    const statusMultiplier = this.getStatusMultiplier(pokemon.status || 'normal');
    
    const criticalBase = Math.min(255, baseCaptureRate * ballEffect.multiplier * statusMultiplier * criticalMultiplier);
    const criticalChance = Math.min(0.25, criticalBase / 6 / 255);
    
    const isCritical = Math.random() < criticalChance;
    
    console.log(`⭐ [CaptureManager] Critique: ${(criticalChance * 100).toFixed(1)}% → ${isCritical ? 'OUI' : 'NON'}`);
    
    return {
      isCritical,
      chance: criticalChance,
      pokemonCaughtCount,
      message: isCritical ? 'Capture critique !' : undefined
    };
  }
  
  private async calculateCaptureRate(pokemon: Pokemon, ballType: string): Promise<number> {
    const pokemonData = await getPokemonById(pokemon.id);
    const baseCaptureRate = (pokemonData as any)?.captureRate || 45;
    
    const ballEffect = this.ballManager.calculateBallEffect(ballType, pokemon);
    
    const hpTerm = (3 * pokemon.maxHp - 2 * pokemon.currentHp);
    const statusMultiplier = this.getStatusMultiplier(pokemon.status || 'normal');
    
    const x = Math.max(1, Math.floor(
      (hpTerm * baseCaptureRate * ballEffect.multiplier * statusMultiplier) / (3 * pokemon.maxHp)
    ));
    
    const approximateRate = Math.min(0.99, Math.max(0.01, Math.pow(x / 255, 0.75)));
    
    console.log(`🧮 [CaptureManager] DÉTAIL CAPTURE:`, {
      pokemon: pokemon.name,
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      hpRatio: ((pokemon.currentHp / pokemon.maxHp) * 100).toFixed(1) + '%',
      ballEffect: ballEffect.description,
      taux: (approximateRate * 100).toFixed(1) + '%'
    });  
    
    return approximateRate;
  }
  
  private performFourChecks(captureRate: number): { captured: boolean; shakeCount: number; checks: boolean[] } {
    const success = Math.random() < captureRate;
    
    let shakeCount = 0;
    if (success) {
      shakeCount = 3; // Succès = 3 secousses
    } else {
      shakeCount = Math.floor(Math.random() * 3);
    }
    
    console.log(`🎲 [CaptureManager] Check unique Gen 5: probabilité=${(captureRate*100).toFixed(2)}%, ${shakeCount}/3 secousses → ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    return { 
      captured: success, 
      shakeCount, 
      checks: [success] 
    };
  }
  
  // === MÉTHODES UTILITAIRES (inchangées) ===
  
  private async getPokemonCaughtCount(playerName: string): Promise<number> {
    try {
      const uniquePokemon = await OwnedPokemon.distinct('pokemonId', { owner: playerName });
      return uniquePokemon.length;
    } catch (error) {
      console.error('❌ [CaptureManager] Erreur comptage:', error);
      return 0;
    }
  }
  
  private async addPokemonToTeamOrPC(pokemon: any, teamManager: TeamManager): Promise<{ message: string; location: 'team' | 'pc' }> {
    try {
      await teamManager.addToTeam(pokemon._id);
      return {
        message: `${pokemon.nickname || pokemon.name} a été ajouté à votre équipe !`,
        location: 'team'
      };
    } catch (error) {
      return {
        message: `${pokemon.nickname || pokemon.name} a été envoyé au PC (équipe pleine).`,
        location: 'pc'
      };
    }
  }
  
  private getStatusMultiplier(status: string): number {
    const multipliers: Record<string, number> = {
      'normal': 1.0,
      'sleep': 2.5,
      'freeze': 2.5,
      'paralysis': 1.5,
      'burn': 1.5,
      'poison': 1.5,
      'badly_poison': 1.5
    };
    return multipliers[status] || 1.0;
  }
  
  private generateEventMessages(animations: CaptureAnimation[], pokemonName: string, addMessage?: string): string[] {
    const messages: string[] = [];
    animations.forEach(anim => messages.push(anim.message));
    if (addMessage) messages.push(addMessage);
    return messages;
  }
  
  private async generateCriticalAnimations(pokemon: Pokemon, ballValidation: any): Promise<CaptureAnimation[]> {
    return [
      {
        phase: 'throw',
        shakeCount: 0,
        totalShakes: 1,
        message: `Vous lancez ${ballValidation.displayName} !`,
        timing: 800
      },
      {
        phase: 'shake',
        shakeCount: 1,
        totalShakes: 1,
        message: '⭐ Capture critique ! ⭐',
        timing: 400
      },
      {
        phase: 'success',
        shakeCount: 1,
        totalShakes: 1,
        message: `${pokemon.name} a été capturé !`,
        timing: 1500
      }
    ];
  }
  
  private async generateNormalAnimations(pokemon: Pokemon, ballValidation: any, checkResult: any): Promise<CaptureAnimation[]> {
    const animations: CaptureAnimation[] = [];
    
    animations.push({
      phase: 'throw',
      shakeCount: 0,
      totalShakes: 4,
      message: `Vous lancez ${ballValidation.displayName} !`,
      timing: 800
    });
    
    for (let i = 0; i < checkResult.shakeCount; i++) {
      animations.push({
        phase: 'shake',
        shakeCount: i + 1,
        totalShakes: 4,
        message: this.getShakeMessage(i + 1),
        timing: 600
      });
    }
    
    if (checkResult.captured) {
      animations.push({
        phase: 'success',
        shakeCount: checkResult.shakeCount,
        totalShakes: 4,
        message: `${pokemon.name} a été capturé !`,
        timing: 1500
      });
    } else {
      animations.push({
        phase: 'failure',
        shakeCount: checkResult.shakeCount,
        totalShakes: 4,
        message: `Oh non ! ${pokemon.name} s'est échappé !`,
        timing: 1000
      });
    }
    
    return animations;
  }
  
  private getShakeMessage(shakeNumber: number): string {
    const messages = [
      'La Ball bouge...',
      'Elle bouge encore...',
      'Et encore une fois...'
    ];
    return messages[shakeNumber - 1] || 'La Ball bouge...';
  }
  
  // [Autres méthodes utilitaires inchangées pour rapidité...]
  
  private createErrorResult(message: string): CaptureResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState!,
      events: []
    };
  }
  
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    }
    return playerId;
  }
  
  private async validateCaptureConditions(playerId: string, ballType: string): Promise<BattleResult> {
    if (!this.gameState) {
      return this.createErrorResult('État de combat manquant');
    }
    
    if (this.gameState.type !== 'wild') {
      return this.createErrorResult('Impossible de capturer le Pokémon d\'un autre dresseur !');
    }
    
    const targetPokemon = this.gameState.player2.pokemon;
    if (!targetPokemon) {
      return this.createErrorResult('Aucun Pokémon à capturer');
    }
    
    if (targetPokemon.currentHp <= 0) {
      return this.createErrorResult('Impossible de capturer un Pokémon K.O. !');
    }
    
    const ballValidation = this.ballManager.validateBall(ballType);
    if (!ballValidation.isValid) {
      return this.createErrorResult(`${ballType} n'est pas une Poké Ball valide`);
    }
    
    const playerName = this.getPlayerName(playerId);
    const ballCount = await InventoryManager.getItemCount(playerName, ballType);
    
    if (ballCount <= 0) {
      return this.createErrorResult(`Vous n'avez plus de ${ballValidation.displayName} !`);
    }
    
    return {
      success: true,
      gameState: this.gameState,
      events: []
    };
  }
  
  // [Méthodes pour créer Pokémon capturé - inchangées pour rapidité]
  private async createCapturedPokemon(wildPokemon: Pokemon, ownerName: string, ballType: string): Promise<any> {
    // [Implémentation complète inchangée...]
    const pokemonData = await getPokemonById(wildPokemon.id);
    const baseStats = pokemonData.baseStats;
    const level = wildPokemon.level;
    const ivs = this.generateRandomIVs();
    
    const calculateStat = (baseStat: number, iv: number): number => {
      return Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
    };
    
    const calculatedStats = {
      attack: calculateStat(baseStats.attack, ivs.attack),
      defense: calculateStat(baseStats.defense, ivs.defense),
      spAttack: calculateStat(baseStats.specialAttack, ivs.spAttack),
      spDefense: calculateStat(baseStats.specialDefense, ivs.spDefense),
      speed: calculateStat(baseStats.speed, ivs.speed)
    };
    
    const maxHp = Math.floor(((2 * baseStats.hp + ivs.hp) * level) / 100) + level + 10;
    
    const ownedPokemon = new OwnedPokemon({
      owner: ownerName,
      pokemonId: wildPokemon.id,
      level: level,
      experience: this.calculateExperienceForLevel(level),
      nature: this.generateRandomNature(),
      nickname: undefined,
      shiny: wildPokemon.shiny || false,
      gender: this.generateRandomGender(pokemonData),
      ability: this.generateRandomAbility(pokemonData),
      
      ivs: ivs,
      evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
      calculatedStats: calculatedStats,
      
      moves: wildPokemon.moves.map(moveId => {
        const moveData = MoveManager.getMoveData(moveId);
        const maxPp = moveData?.pp || 20;
        return {
          moveId: moveId,
          currentPp: maxPp,
          maxPp: maxPp
        };
      }),
      
      currentHp: maxHp,
      maxHp: maxHp,
      status: 'normal',
      
      isInTeam: false,
      box: 0,
      
      caughtAt: new Date(),
      friendship: this.getBaseFriendship(ballType),
      pokeball: ballType,
      originalTrainer: ownerName
    });
    
    await ownedPokemon.save();
    console.log(`🆕 [CaptureManager] ${wildPokemon.name} créé avec ID: ${ownedPokemon._id}`);
    
    return ownedPokemon;
  }
  
  private generateRandomNature(): string {
    const natures = [
      'hardy', 'lonely', 'brave', 'adamant', 'naughty',
      'bold', 'docile', 'relaxed', 'impish', 'lax',
      'timid', 'hasty', 'serious', 'jolly', 'naive',
      'modest', 'mild', 'quiet', 'bashful', 'rash',
      'calm', 'gentle', 'sassy', 'careful', 'quirky'
    ];
    return natures[Math.floor(Math.random() * natures.length)];
  }
  
  private generateRandomGender(pokemonData: any): string {
    const genderRatio = pokemonData.genderRatio;
    if (genderRatio === -1) return 'Genderless';
    if (genderRatio === 0) return 'Male';
    if (genderRatio === 8) return 'Female';
    
    const random = Math.random() * 8;
    return random < genderRatio ? 'Female' : 'Male';
  }
  
  private generateRandomAbility(pokemonData: any): string {
    const abilities = pokemonData.abilities || ['overgrow'];
    return abilities[Math.floor(Math.random() * abilities.length)];
  }
  
  private generateRandomIVs(): any {
    return {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      spAttack: Math.floor(Math.random() * 32),
      spDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };
  }
  
  private getBaseFriendship(ballType: string): number {
    if (ballType === 'luxury_ball') return 120;
    return 70;
  }
  
  private calculateExperienceForLevel(level: number): number {
    return Math.floor(Math.pow(level, 3));
  }
}

export default CaptureManager;
