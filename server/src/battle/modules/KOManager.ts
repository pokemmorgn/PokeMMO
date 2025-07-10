// server/src/battle/modules/KOManager.ts
// GESTIONNAIRE K.O. ET PHASES DE MORT POKÉMON AUTHENTIQUE

import { BattleGameState, BattleResult, Pokemon, PlayerRole } from '../types/BattleTypes';
import { BATTLE_TIMINGS } from './BroadcastManager';

// === INTERFACES ===

export interface KOResult {
  isKO: boolean;
  pokemonName: string;
  playerRole: PlayerRole;
  ownerName: string;
  message: string;
  isBattleEnding: boolean;
  winner?: PlayerRole | null;
  sequence: KOSequenceStep[];
}

export interface KOSequenceStep {
  type: 'faint_animation' | 'ko_message' | 'battle_end_check' | 'winner_announce';
  message: string;
  timing: number;
  data?: any;
}

export interface BattleEndCheck {
  isEnded: boolean;
  winner: PlayerRole | null;
  reason: string;
  message: string;
  type: 'ko_victory' | 'ko_defeat' | 'double_ko';
}

/**
 * KO MANAGER - Gestion authentique des K.O. Pokémon
 * 
 * Responsabilités :
 * - Détecter les K.O.
 * - Générer les séquences d'animation K.O.
 * - Vérifier les fins de combat
 * - Messages authentiques Pokémon
 * - Préparer les changements de Pokémon (futur)
 */
export class KOManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('💀 [KOManager] Gestionnaire K.O. Pokémon authentique initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [KOManager] Configuré pour la gestion des K.O.');
  }
  
  // === DÉTECTION K.O. ===
  
  /**
   * Vérifie si un Pokémon est K.O. et traite les conséquences
   */
  checkAndProcessKO(pokemon: Pokemon, playerRole: PlayerRole): KOResult {
    console.log(`💀 [KOManager] Vérification K.O. : ${pokemon.name} (HP: ${pokemon.currentHp}/${pokemon.maxHp})`);
    
    if (pokemon.currentHp > 0) {
      return {
        isKO: false,
        pokemonName: pokemon.name,
        playerRole,
        ownerName: this.getPlayerName(playerRole),
        message: '',
        isBattleEnding: false,
        sequence: []
      };
    }
    
    // ✅ POKÉMON K.O. DÉTECTÉ
    console.log(`💀 [KOManager] ${pokemon.name} est K.O. !`);
    
    // Générer la séquence K.O. authentique
    const sequence = this.generateKOSequence(pokemon, playerRole);
    
    // Vérifier si le combat se termine
    const battleEndCheck = this.checkBattleEnd();
    
    return {
      isKO: true,
      pokemonName: pokemon.name,
      playerRole,
      ownerName: this.getPlayerName(playerRole),
      message: `${pokemon.name} est mis K.O. !`,
      isBattleEnding: battleEndCheck.isEnded,
      winner: battleEndCheck.winner,
      sequence
    };
  }
  
  /**
   * Vérifie si le combat doit se terminer après un K.O.
   */
  checkBattleEnd(): BattleEndCheck {
    if (!this.gameState) {
      return {
        isEnded: false,
        winner: null,
        reason: '',
        message: '',
        type: 'ko_victory'
      };
    }
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      return {
        isEnded: false,
        winner: null,
        reason: 'Données Pokémon manquantes',
        message: '',
        type: 'ko_victory'
      };
    }
    
    const player1KO = player1Pokemon.currentHp <= 0;
    const player2KO = player2Pokemon.currentHp <= 0;
    
    // ✅ DOUBLE K.O. (très rare mais possible)
    if (player1KO && player2KO) {
      console.log('💀💀 [KOManager] DOUBLE K.O. - Match nul !');
      return {
        isEnded: true,
        winner: null,
        reason: 'double_ko',
        message: 'Match nul ! Les deux Pokémon sont K.O. !',
        type: 'double_ko'
      };
    }
    
    // ✅ JOUEUR K.O. = DÉFAITE
    if (player1KO) {
      console.log('💀 [KOManager] Joueur vaincu !');
      return {
        isEnded: true,
        winner: 'player2',
        reason: 'player_pokemon_fainted',
        message: `${player1Pokemon.name} est K.O. ! Vous avez perdu !`,
        type: 'ko_defeat'
      };
    }
    
    // ✅ ADVERSAIRE K.O. = VICTOIRE
    if (player2KO) {
      console.log('🏆 [KOManager] Joueur victorieux !');
      return {
        isEnded: true,
        winner: 'player1',
        reason: 'opponent_pokemon_fainted',
        message: `${player2Pokemon.name} est K.O. ! Vous avez gagné !`,
        type: 'ko_victory'
      };
    }
    
    // ✅ COMBAT CONTINUE
    return {
      isEnded: false,
      winner: null,
      reason: '',
      message: '',
      type: 'ko_victory'
    };
  }
  
  // === SÉQUENCES POKÉMON AUTHENTIQUES ===
  
  /**
   * Génère la séquence d'animation K.O. authentique
   */
  private generateKOSequence(pokemon: Pokemon, playerRole: PlayerRole): KOSequenceStep[] {
    const sequence: KOSequenceStep[] = [];
    const battleEndCheck = this.checkBattleEnd();
    
    // 1. ✅ ANIMATION DE CHUTE (timing Gen 4/5)
    sequence.push({
      type: 'faint_animation',
      message: `${pokemon.name} s'effondre...`,
      timing: BATTLE_TIMINGS.pokemonFainted, // 2000ms
      data: {
        pokemonName: pokemon.name,
        playerRole: playerRole,
        animationType: 'faint_fall'
      }
    });
    
    // 2. ✅ MESSAGE K.O. OFFICIEL
    sequence.push({
      type: 'ko_message',
      message: `${pokemon.name} est mis K.O. !`,
      timing: 1500, // Pause pour lire le message
      data: {
        pokemonName: pokemon.name,
        playerRole: playerRole,
        messageType: 'official_ko'
      }
    });
    
    // 3. ✅ VÉRIFICATION FIN DE COMBAT
    sequence.push({
      type: 'battle_end_check',
      message: 'Vérification du statut du combat...',
      timing: 500, // Court délai technique
      data: {
        checkResult: battleEndCheck,
        shouldEnd: battleEndCheck.isEnded
      }
    });
    
    // 4. ✅ ANNONCE VICTOIRE/DÉFAITE SI APPLICABLE
    if (battleEndCheck.isEnded) {
      let victoryMessage = '';
      let messageType = '';
      
      switch (battleEndCheck.type) {
        case 'ko_victory':
          victoryMessage = 'Félicitations ! Vous avez remporté le combat !';
          messageType = 'victory';
          break;
        case 'ko_defeat':
          victoryMessage = 'Vous avez été vaincu !';
          messageType = 'defeat';
          break;
        case 'double_ko':
          victoryMessage = 'Match nul !';
          messageType = 'draw';
          break;
      }
      
      sequence.push({
        type: 'winner_announce',
        message: victoryMessage,
        timing: BATTLE_TIMINGS.battleEnd, // 2200ms
        data: {
          winner: battleEndCheck.winner,
          battleEndType: battleEndCheck.type,
          finalMessage: victoryMessage,
          messageType: messageType
        }
      });
    }
    
    console.log(`🎬 [KOManager] Séquence K.O. générée : ${sequence.length} étapes`);
    
    return sequence;
  }
  
  // === GESTION ÉQUIPES (FUTUR) ===
  
  /**
   * Vérifie si le joueur a d'autres Pokémon disponibles
   */
  hasUsablePokemon(playerRole: PlayerRole): boolean {
    // TODO: Implémenter quand on aura les équipes complètes
    // Pour l'instant, on assume qu'il n'y a qu'un Pokémon par joueur
    
    if (!this.gameState) return false;
    
    const player = playerRole === 'player1' ? this.gameState.player1 : this.gameState.player2;
    const pokemon = player.pokemon;
    
    return pokemon ? pokemon.currentHp > 0 : false;
  }
  
  /**
   * Prépare le choix de Pokémon suivant (futur)
   */
  preparePokemonSwitch(playerRole: PlayerRole): any {
    // TODO: Implémenter pour les équipes multi-Pokémon
    console.log(`🔄 [KOManager] Changement de Pokémon pas encore implémenté pour ${playerRole}`);
    
    return {
      needsSwitch: false,
      availablePokemon: [],
      isForced: true,
      timeLimit: 30000 // 30 secondes pour choisir
    };
  }
  
  // === MESSAGES AUTHENTIQUES ===
  
  /**
   * Génère les messages de K.O. selon le contexte
   */
  generateKOMessages(pokemon: Pokemon, playerRole: PlayerRole, battleEndCheck: BattleEndCheck): string[] {
    const messages: string[] = [];
    
    // Message K.O. principal
    messages.push(`${pokemon.name} est mis K.O. !`);
    
    // Message de fin si applicable
    if (battleEndCheck.isEnded) {
      messages.push(battleEndCheck.message);
      
      // Message additionnel selon le type
      switch (battleEndCheck.type) {
        case 'ko_victory':
          messages.push('Le combat est terminé !');
          break;
        case 'ko_defeat':
          messages.push('Vous devez vous entraîner davantage...');
          break;
        case 'double_ko':
          messages.push('Un résultat surprenant !');
          break;
      }
    }
    
    return messages;
  }
  
  /**
   * Message spécifique selon le type de Pokémon K.O.
   */
  getKOFlavorText(pokemon: Pokemon, playerRole: PlayerRole): string {
    if (pokemon.isWild) {
      return `Le ${pokemon.name} sauvage est vaincu !`;
    } else if (playerRole === 'player1') {
      return `${pokemon.name} ne peut plus combattre !`;
    } else {
      return `Le ${pokemon.name} ennemi est vaincu !`;
    }
  }
  
  // === STATISTIQUES K.O. ===
  
  /**
   * Analyse le type de K.O. pour les stats
   */
  analyzeKOType(pokemon: Pokemon, damage: number): {
    koType: 'normal' | 'critical' | 'super_effective' | 'overkill';
    damageRatio: number;
    wasCritical: boolean;
    wasTypeAdvantage: boolean;
  } {
    const damageRatio = damage / pokemon.maxHp;
    
    let koType: 'normal' | 'critical' | 'super_effective' | 'overkill' = 'normal';
    
    if (damageRatio >= 0.75) {
      koType = 'overkill'; // Dégâts massifs
    } else if (damageRatio >= 0.5) {
      koType = 'super_effective'; // Dégâts élevés
    } else {
      koType = 'normal'; // K.O. normal
    }
    
    return {
      koType,
      damageRatio,
      wasCritical: false, // TODO: À implémenter avec le système de critique
      wasTypeAdvantage: false // TODO: À implémenter avec les types
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Récupère le nom du joueur
   */
  private getPlayerName(playerRole: PlayerRole): string {
    if (!this.gameState) return 'Joueur Inconnu';
    
    if (playerRole === 'player1') {
      return this.gameState.player1.name;
    } else {
      return this.gameState.player2.name;
    }
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
    console.log('🔄 [KOManager] Reset effectué');
  }
  
  /**
   * Statistiques du gestionnaire K.O.
   */
  getStats(): any {
    return {
      version: 'ko_manager_v1',
      ready: this.isReady(),
      features: [
        'ko_detection',
        'authentic_sequences',
        'battle_end_checking',
        'pokemon_switch_ready',
        'flavor_text_support'
      ],
      battleState: this.gameState ? {
        player1HP: this.gameState.player1.pokemon?.currentHp || 0,
        player2HP: this.gameState.player2.pokemon?.currentHp || 0,
        anyKO: (this.gameState.player1.pokemon?.currentHp || 0) <= 0 || 
               (this.gameState.player2.pokemon?.currentHp || 0) <= 0
      } : null
    };
  }
}

export default KOManager;
