// server/src/battle/modules/CaptureManager.ts
// ÉTAPE 1 : Système de capture basique avec formule Pokémon

import { BattleGameState, BattleResult, Pokemon } from '../types/BattleTypes';
import { TeamManager } from '../../managers/TeamManager';
import { InventoryManager } from '../../managers/InventoryManager';
import { OwnedPokemon } from '../../models/OwnedPokemon';
import { getItemData } from '../../utils/ItemDB';
import { getPokemonById } from '../../data/PokemonData';
import { MoveManager } from '../../managers/MoveManager';

/**
 * CAPTURE MANAGER - Gestion de la capture de Pokémon
 * 
 * Responsabilités :
 * - Validation des conditions de capture
 * - Calcul de la formule de capture Pokémon
 * - Animation des secousses (1-3 fois)
 * - Création et ajout du Pokémon capturé à l'équipe/PC
 * - Consommation des Balls depuis l'inventaire
 * 
 * ÉTAPE 1 : Système basique fonctionnel
 * Plus tard : Formule complète, effets des statuts, etc.
 */
export class CaptureManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🎯 [CaptureManager] Initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [CaptureManager] Configuré pour le combat');
  }
  
  // === CAPTURE PRINCIPALE ===
  
  /**
   * Tente de capturer le Pokémon sauvage
   */
  async attemptCapture(
    playerId: string, 
    ballType: string, 
    teamManager: TeamManager
  ): Promise<BattleResult> {
    console.log(`🎯 [CaptureManager] Tentative capture avec ${ballType} par ${playerId}`);
    
    if (!this.gameState) {
      return this.createErrorResult('CaptureManager non initialisé');
    }
    
    try {
      // 1. Validation des conditions
      const validation = await this.validateCaptureConditions(playerId, ballType);
      if (!validation.success) {
        return validation;
      }
      
      const targetPokemon = this.gameState.player2.pokemon!;
      
      // 2. Consommer la Ball de l'inventaire
      const playerName = this.getPlayerName(playerId);
      const ballConsumed = await InventoryManager.removeItem(playerName, ballType, 1);
      
      if (!ballConsumed) {
        return this.createErrorResult(`Vous n'avez plus de ${this.getBallDisplayName(ballType)} !`);
      }
      
      console.log(`🎾 [CaptureManager] ${ballType} consommée pour ${playerName}`);
      
      // 3. Calculer les chances de capture
      const captureRate = await this.calculateCaptureRate(targetPokemon, ballType);
      console.log(`🎲 [CaptureManager] Taux de capture: ${(captureRate * 100).toFixed(1)}%`);
      
      // 4. Animation des secousses (1-3 fois)
      const shakeResults = this.simulateShakes(captureRate);
      console.log(`🔄 [CaptureManager] Secousses: ${shakeResults.shakes}/3, succès: ${shakeResults.success}`);
      
      // 5. Résultat de la capture
      if (shakeResults.success) {
        // Succès ! Créer et ajouter le Pokémon
        const capturedPokemon = await this.createCapturedPokemon(targetPokemon, playerName, ballType);
        const addResult = await this.addPokemonToTeamOrPC(capturedPokemon, teamManager);
        
        console.log(`🎉 [CaptureManager] ${targetPokemon.name} capturé avec succès !`);
        
        return {
          success: true,
          gameState: this.gameState,
          events: [
            `Vous lancez ${this.getBallDisplayName(ballType)} !`,
            ...this.generateShakeMessages(shakeResults.shakes),
            `${targetPokemon.name} a été capturé !`,
            addResult.message
          ],
          data: {
            captured: true,
            pokemonName: targetPokemon.name,
            ballUsed: ballType,
            shakes: shakeResults.shakes,
            addedTo: addResult.location,
            battleEnded: true,
            winner: 'player1' // Le joueur gagne par capture
          }
        };
        
      } else {
        // Échec ! Le Pokémon s'échappe
        console.log(`💨 [CaptureManager] ${targetPokemon.name} s'est échappé après ${shakeResults.shakes} secousse(s)`);
        
        return {
          success: true, // L'action est techniquement réussie même si la capture échoue
          gameState: this.gameState,
          events: [
            `Vous lancez ${this.getBallDisplayName(ballType)} !`,
            ...this.generateShakeMessages(shakeResults.shakes),
            `Oh non ! ${targetPokemon.name} s'est échappé !`
          ],
          data: {
            captured: false,
            pokemonName: targetPokemon.name,
            ballUsed: ballType,
            shakes: shakeResults.shakes,
            battleEnded: false // Le combat continue
          }
        };
      }
      
    } catch (error) {
      console.error(`❌ [CaptureManager] Erreur lors de la capture:`, error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue lors de la capture'
      );
    }
  }
  
  // === VALIDATION ===
  
  /**
   * Valide les conditions de capture
   */
  private async validateCaptureConditions(playerId: string, ballType: string): Promise<BattleResult> {
    if (!this.gameState) {
      return this.createErrorResult('État de combat manquant');
    }
    
    // 1. Vérifier que c'est un combat contre un Pokémon sauvage
    if (this.gameState.type !== 'wild') {
      return this.createErrorResult('Impossible de capturer le Pokémon d\'un autre dresseur !');
    }
    
    // 2. Vérifier que le Pokémon cible existe et n'est pas K.O.
    const targetPokemon = this.gameState.player2.pokemon;
    if (!targetPokemon) {
      return this.createErrorResult('Aucun Pokémon à capturer');
    }
    
    if (targetPokemon.currentHp <= 0) {
      return this.createErrorResult('Impossible de capturer un Pokémon K.O. !');
    }
    
    // 3. Vérifier que la Ball existe dans le système
    if (!this.isValidBall(ballType)) {
      return this.createErrorResult(`${ballType} n'est pas une Poké Ball valide`);
    }
    
    // 4. Vérifier que le joueur possède cette Ball
    const playerName = this.getPlayerName(playerId);
    const ballCount = await InventoryManager.getItemCount(playerName, ballType);
    
    if (ballCount <= 0) {
      return this.createErrorResult(`Vous n'avez plus de ${this.getBallDisplayName(ballType)} !`);
    }
    
    console.log(`✅ [CaptureManager] Conditions validées pour capture de ${targetPokemon.name}`);
    
    return {
      success: true,
      gameState: this.gameState,
      events: []
    };
  }
  
  // === CALCUL DE CAPTURE ===
  
  /**
   * Calcule le taux de capture selon la formule Pokémon (avec vraies données)
   */
  private async calculateCaptureRate(pokemon: Pokemon, ballType: string): Promise<number> {
    // Utiliser les vraies données Pokémon
    const pokemonData = await getPokemonById(pokemon.id);
    const baseCaptureRate = pokemonData?.captureRate || 45; // Défaut si pas trouvé
    
    console.log(`🎯 [CaptureManager] Données ${pokemon.name}: taux de capture de base = ${baseCaptureRate}`);
    
    // 1. HP restants (plus le Pokémon est faible, plus il est facile à capturer)
    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    
    // 2. Modificateur de statut (si le Pokémon en combat a un statut)
    const statusMultiplier = this.getStatusMultiplier(pokemon.status || 'normal');
    
    // 3. Modificateur de Ball
    const ballMultiplier = this.getBallMultiplier(ballType);
    
    // 4. Formule Pokémon simplifiée pour l'étape 1
    // Rate = (3*MaxHP - 2*CurrentHP) * CatchRate * BallRate * StatusRate / (3*MaxHP)
    const numerator = (3 * pokemon.maxHp - 2 * pokemon.currentHp) * baseCaptureRate * ballMultiplier * statusMultiplier;
    const denominator = 3 * pokemon.maxHp;
    
    // Convertir en probabilité (0-1)
    const rawRate = numerator / (255 * denominator);
    const finalRate = Math.min(0.99, Math.max(0.01, rawRate)); // Entre 1% et 99%
    
    console.log(`🧮 [CaptureManager] Calcul capture détaillé:`, {
      pokemon: pokemon.name,
      hp: `${pokemon.currentHp}/${pokemon.maxHp} (${(hpRatio * 100).toFixed(1)}%)`,
      baseCaptureRate,
      statusMultiplier,
      ballMultiplier,
      numerator,
      denominator,
      rawRate: rawRate.toFixed(3),
      finalRate: (finalRate * 100).toFixed(1) + '%'
    });
    
    return finalRate;
  }
  
  /**
   * Animation des secousses (1-3 fois selon les chances)
   */
  private simulateShakes(captureRate: number): { success: boolean; shakes: number } {
    let shakes = 0;
    
    // Chaque secousse a des chances de réussir
    for (let i = 0; i < 3; i++) {
      shakes++;
      
      // Chances de continuer la secousse
      const shakeChance = Math.pow(captureRate, 0.25); // Racine 4ème pour étaler sur 3 secousses
      
      if (Math.random() > shakeChance) {
        // Échec à cette secousse
        return { success: false, shakes };
      }
    }
    
    // Si on arrive ici, les 3 secousses ont réussi = capture !
    return { success: true, shakes: 3 };
  }
  
  // === CRÉATION DU POKÉMON CAPTURÉ ===
  
  /**
   * Crée un OwnedPokemon à partir du Pokémon sauvage capturé
   */
  private async createCapturedPokemon(
    wildPokemon: Pokemon, 
    ownerName: string, 
    ballType: string
  ): Promise<any> {
    console.log(`🆕 [CaptureManager] Création Pokémon capturé: ${wildPokemon.name} pour ${ownerName}`);
    
    // Convertir les données du combat vers OwnedPokemon (utiliser les données existantes)
    const ownedPokemon = new OwnedPokemon({
      // === DONNÉES DE BASE (COPIER DU POKÉMON EN COMBAT) ===
      owner: ownerName,
      pokemonId: wildPokemon.id,
      level: wildPokemon.level,
      experience: this.calculateExperienceForLevel(wildPokemon.level),
      nature: (wildPokemon as any).nature || 'hardy', // Utiliser nature du combat
      nickname: undefined, // Pas de surnom par défaut
      shiny: wildPokemon.shiny || false,
      gender: wildPokemon.gender || 'Male', // Utiliser genre du combat
      ability: (wildPokemon as any).ability || 'overgrow', // Utiliser capacité du combat
      
      // === IVS (COPIER DU POKÉMON EN COMBAT) ===
      ivs: (wildPokemon as any).ivs || {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        spAttack: Math.floor(Math.random() * 32),
        spDefense: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32)
      },
      
      // === EVS (vides pour capture sauvage) ===
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        spAttack: 0,
        spDefense: 0,
        speed: 0
      },
      
      // === ATTAQUES (PP au maximum après capture) ===
      moves: wildPokemon.moves.map(moveId => {
        const moveData = MoveManager.getMoveData(moveId);
        const maxPp = moveData?.pp || 20; // PP depuis la vraie DB des attaques
        return {
          moveId: moveId,
          currentPp: maxPp, // ✅ PP au MAX après capture
          maxPp: maxPp
        };
      }),
      
      // === ÉTAT DE COMBAT (HP actuels) ===
      currentHp: wildPokemon.currentHp,
      maxHp: wildPokemon.maxHp,
      status: wildPokemon.status || 'normal',
      statusTurns: undefined,
      
      // === ORGANISATION (pas dans l'équipe pour l'instant) ===
      isInTeam: false,
      slot: undefined,
      box: 0,
      boxSlot: undefined,
      
      // === MÉTADONNÉES ===
      caughtAt: new Date(),
      friendship: 70, // Valeur par défaut Pokémon
      pokeball: ballType,
      originalTrainer: ownerName,
      heldItem: undefined
    });
    
    // Recalculer les stats (fait automatiquement par le middleware)
    await ownedPokemon.save();
    
    console.log(`✅ [CaptureManager] ${wildPokemon.name} créé avec ID: ${ownedPokemon._id}`);
    
    return ownedPokemon;
  }
  
  /**
   * Ajoute le Pokémon à l'équipe ou au PC
   */
  private async addPokemonToTeamOrPC(
    pokemon: any, 
    teamManager: TeamManager
  ): Promise<{ message: string; location: 'team' | 'pc' }> {
    try {
      // Tenter d'ajouter à l'équipe
      const teamAdded = await teamManager.addToTeam(pokemon._id);
      
      return {
        message: `${pokemon.nickname || pokemon.name} a été ajouté à votre équipe !`,
        location: 'team'
      };
      
    } catch (error) {
      // Si l'équipe est pleine, le Pokémon va automatiquement au PC
      console.log(`📦 [CaptureManager] Équipe pleine, ${pokemon.nickname || pokemon.name} envoyé au PC`);
      
      return {
        message: `${pokemon.nickname || pokemon.name} a été envoyé au PC (équipe pleine).`,
        location: 'pc'
      };
    }
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Obtient le multiplicateur de statut
   */
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
  
  /**
   * Obtient le multiplicateur de Ball
   */
  private getBallMultiplier(ballType: string): number {
    const multipliers: Record<string, number> = {
      'poke_ball': 1.0,
      'great_ball': 1.5,
      'ultra_ball': 2.0,
      'master_ball': 255.0, // Capture garantie
      'safari_ball': 1.5
    };
    
    return multipliers[ballType] || 1.0;
  }
  
  /**
   * Vérifie si c'est une Ball valide
   */
  private isValidBall(ballType: string): boolean {
    const validBalls = ['poke_ball', 'great_ball', 'ultra_ball', 'master_ball', 'safari_ball'];
    return validBalls.includes(ballType);
  }
  
  /**
   * Obtient le nom d'affichage de la Ball
   */
  private getBallDisplayName(ballType: string): string {
    const names: Record<string, string> = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'safari_ball': 'Safari Ball'
    };
    
    return names[ballType] || ballType;
  }
  
  /**
   * Génère les messages de secousses
   */
  private generateShakeMessages(shakes: number): string[] {
    const messages: string[] = [];
    
    for (let i = 1; i <= shakes; i++) {
      if (i === 1) messages.push('La Ball bouge...');
      else if (i === 2) messages.push('Elle bouge encore...');
      else if (i === 3) messages.push('Et encore...');
    }
    
    return messages;
  }
  
  /**
   * Récupère le nom du joueur depuis son ID
   */
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    }
    
    return playerId;
  }
  
  /**
   * Calcule l'expérience pour un niveau donné
   */
  private calculateExperienceForLevel(level: number): number {
    // Formule simple pour l'expérience (Medium Fast)
    return Math.floor(Math.pow(level, 3));
  }
  
  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(message: string): BattleResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState!,
      events: []
    };
  }
  
  /**
   * Vérifie si le manager est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.gameState = null;
    console.log('🔄 [CaptureManager] Reset effectué');
  }
  
  /**
   * Obtient des statistiques sur le manager
   */
  getStats(): any {
    return {
      version: 'basic_v1',
      features: ['wild_capture', 'ball_consumption', 'team_pc_integration'],
      ready: this.isReady(),
      gameState: this.gameState ? 'loaded' : 'empty'
    };
  }
}

export default CaptureManager;
