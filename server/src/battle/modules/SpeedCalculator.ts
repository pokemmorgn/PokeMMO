// server/src/battle/modules/SpeedCalculator.ts
// CALCUL D'ORDRE PAR VITESSE AUTHENTIQUE POKÉMON

import { BattleAction, Pokemon, PlayerRole } from '../types/BattleTypes';

// === INTERFACES ===

export interface SpeedCalculation {
  playerRole: PlayerRole;
  pokemon: Pokemon;
  action: BattleAction;
  baseSpeed: number;
  effectiveSpeed: number;
  actionPriority: number;
  modifiers: SpeedModifier[];
  finalPosition: number;
}

export interface SpeedModifier {
  source: string;
  multiplier: number;
  description: string;
  active: boolean;
}

export interface SpeedTieResult {
  isTie: boolean;
  tiedPlayers: PlayerRole[];
  resolution: 'random' | 'submission_order' | 'player1_wins';
  winner?: PlayerRole;
}

/**
 * SPEED CALCULATOR - Calcul de vitesse authentique Pokémon
 * 
 * Responsabilités :
 * - Calculer l'ordre d'action par vitesse
 * - Gérer les priorités d'attaques
 * - Appliquer les modificateurs de vitesse
 * - Résoudre les égalités
 * - Simulation fidèle au système Pokémon
 */
export class SpeedCalculator {
  
  // === PRIORITÉS D'ACTIONS ===
  
  private static readonly ACTION_PRIORITIES: Record<string, number> = {
    // Actions spéciales (toujours en premier)
    'switch': 8,        // Changement de Pokémon
    'mega_evolution': 7, // Méga-évolution (future)
    'item': 6,          // Utilisation d'objets
    'run': 5,           // Tentative de fuite
    'capture': 4,       // Capture
    
    // Attaques (priorité variable)
    'attack': 0         // Dépend de l'attaque spécifique
  };
  
  // === PRIORITÉS D'ATTAQUES ===
  
  private static readonly MOVE_PRIORITIES: Record<string, number> = {
    // Priorité +3
    'helping_hand': 3,
    
    // Priorité +2
    'extreme_speed': 2,
    'fake_out': 2,
    'first_impression': 2,
    
    // Priorité +1
    'quick_attack': 1,
    'bullet_punch': 1,
    'mach_punch': 1,
    'aqua_jet': 1,
    'ice_shard': 1,
    'shadow_sneak': 1,
    'sucker_punch': 1,
    'vacuum_wave': 1,
    'baby_doll_eyes': 1,
    
    // Priorité 0 (normale)
    'tackle': 0,
    'scratch': 0,
    'pound': 0,
    'vine_whip': 0,
    'razor_leaf': 0,
    'ember': 0,
    'water_gun': 0,
    
    // Priorité -1
    'vital_throw': -1,
    
    // Priorité -3
    'focus_punch': -3,
    'beak_blast': -3,
    'shell_trap': -3,
    
    // Priorité -4
    'avalanche': -4,
    'revenge': -4,
    
    // Priorité -5
    'counter': -5,
    'mirror_coat': -5,
    'metal_burst': -5,
    
    // Priorité -6
    'roar': -6,
    'whirlwind': -6,
    'dragon_tail': -6,
    'circle_throw': -6,
    
    // Priorité -7
    'trick_room': -7
  };
  
  // === API PRINCIPALE ===
  
  /**
   * Calcule l'ordre d'action complet
   */
  static getActionOrder(
    action1: BattleAction,
    pokemon1: Pokemon,
    action2: BattleAction,
    pokemon2: Pokemon
  ): SpeedCalculation[] {
    
    console.log('⚡ [SpeedCalculator] Calcul ordre d\'action...');
    
    // Calculer pour chaque joueur
    const calc1 = this.calculateSpeedData('player1', pokemon1, action1);
    const calc2 = this.calculateSpeedData('player2', pokemon2, action2);
    
    // Déterminer l'ordre
    const ordered = this.determineOrder([calc1, calc2]);
    
    // Assigner les positions finales
    ordered.forEach((calc, index) => {
      calc.finalPosition = index + 1;
    });
    
    console.log(`⚡ [SpeedCalculator] Ordre final: ${ordered.map(c => c.playerRole).join(' → ')}`);
    
    return ordered;
  }
  
  /**
   * Calcule la vitesse effective d'un Pokémon
   */
  static calculateEffectiveSpeed(pokemon: Pokemon, action: BattleAction): number {
    const baseSpeed = pokemon.speed || 0;
    const modifiers = this.getSpeedModifiers(pokemon, action);
    
    // Appliquer tous les modificateurs
    let effectiveSpeed = baseSpeed;
    modifiers.forEach(modifier => {
      if (modifier.active) {
        effectiveSpeed *= modifier.multiplier;
      }
    });
    
    return Math.floor(effectiveSpeed);
  }
  
  // === CALCULS DÉTAILLÉS ===
  
  /**
   * Calcule toutes les données de vitesse pour un joueur
   */
  private static calculateSpeedData(
    playerRole: PlayerRole,
    pokemon: Pokemon,
    action: BattleAction
  ): SpeedCalculation {
    
    const baseSpeed = pokemon.speed || 0;
    const modifiers = this.getSpeedModifiers(pokemon, action);
    const effectiveSpeed = this.calculateEffectiveSpeed(pokemon, action);
    const actionPriority = this.getActionPriority(action);
    
    return {
      playerRole,
      pokemon,
      action,
      baseSpeed,
      effectiveSpeed,
      actionPriority,
      modifiers,
      finalPosition: 0 // Sera assigné plus tard
    };
  }
  
  /**
   * Détermine l'ordre final basé sur les priorités et vitesses
   */
  private static determineOrder(calculations: SpeedCalculation[]): SpeedCalculation[] {
    return calculations.sort((a, b) => {
      // 1. Priorité d'action (plus élevée = premier)
      if (a.actionPriority !== b.actionPriority) {
        return b.actionPriority - a.actionPriority;
      }
      
      // 2. Vitesse effective (plus rapide = premier)
      if (a.effectiveSpeed !== b.effectiveSpeed) {
        return b.effectiveSpeed - a.effectiveSpeed;
      }
      
      // 3. Égalité : player1 gagne (comme les vrais jeux)
      return a.playerRole === 'player1' ? -1 : 1;
    });
  }
  
  // === PRIORITÉS D'ACTIONS ===
  
  /**
   * Obtient la priorité d'une action
   */
  private static getActionPriority(action: BattleAction): number {
    const basePriority = this.ACTION_PRIORITIES[action.type] || 0;
    
    // Pour les attaques, ajouter la priorité spécifique de l'attaque
    if (action.type === 'attack' && action.data?.moveId) {
      const movePriority = this.MOVE_PRIORITIES[action.data.moveId] || 0;
      return basePriority + movePriority;
    }
    
    return basePriority;
  }
  
  /**
   * Vérifie si une attaque a une priorité spéciale
   */
  static hasMovePriority(moveId: string): boolean {
    return moveId in this.MOVE_PRIORITIES && this.MOVE_PRIORITIES[moveId] !== 0;
  }
  
  /**
   * Obtient la priorité d'une attaque spécifique
   */
  static getMovePriority(moveId: string): number {
    return this.MOVE_PRIORITIES[moveId] || 0;
  }
  
  // === MODIFICATEURS DE VITESSE ===
  
  /**
   * Calcule tous les modificateurs de vitesse
   */
  private static getSpeedModifiers(pokemon: Pokemon, action: BattleAction): SpeedModifier[] {
    const modifiers: SpeedModifier[] = [];
    
    // Modificateurs de statut
    modifiers.push(...this.getStatusSpeedModifiers(pokemon));
    
    // Modificateurs d'objet (futur)
    modifiers.push(...this.getItemSpeedModifiers(pokemon));
    
    // Modificateurs de talent (futur)
    modifiers.push(...this.getAbilitySpeedModifiers(pokemon));
    
    // Modificateurs de terrain/météo (futur)
    modifiers.push(...this.getEnvironmentSpeedModifiers(pokemon));
    
    return modifiers;
  }
  
  /**
   * Modificateurs liés aux statuts
   */
  private static getStatusSpeedModifiers(pokemon: Pokemon): SpeedModifier[] {
    const modifiers: SpeedModifier[] = [];
    const status = pokemon.status || 'normal';
    
    switch (status) {
      case 'paralysis':
        modifiers.push({
          source: 'paralysis',
          multiplier: 0.25, // Vitesse divisée par 4
          description: 'Paralysie ralentit',
          active: true
        });
        break;
        
      // Autres statuts n'affectent pas la vitesse en Gen 5+
      default:
        break;
    }
    
    return modifiers;
  }
  
  /**
   * Modificateurs d'objets (implémentation future)
   */
  private static getItemSpeedModifiers(pokemon: Pokemon): SpeedModifier[] {
    const modifiers: SpeedModifier[] = [];
    
    // TODO: Implémenter objets qui affectent la vitesse
    // - Choice Scarf: ×1.5
    // - Iron Ball: ×0.5
    // - Quick Powder (Ditto): ×2.0
    // - Macho Brace: ×0.5
    
    return modifiers;
  }
  
  /**
   * Modificateurs de talents (implémentation future)
   */
  private static getAbilitySpeedModifiers(pokemon: Pokemon): SpeedModifier[] {
    const modifiers: SpeedModifier[] = [];
    
    // TODO: Implémenter talents qui affectent la vitesse
    // - Quick Feet: ×1.5 avec statut
    // - Chlorophyll: ×2.0 au soleil
    // - Swift Swim: ×2.0 sous la pluie
    // - Sand Rush: ×2.0 dans tempête de sable
    
    return modifiers;
  }
  
  /**
   * Modificateurs environnementaux (implémentation future)
   */
  private static getEnvironmentSpeedModifiers(pokemon: Pokemon): SpeedModifier[] {
    const modifiers: SpeedModifier[] = [];
    
    // TODO: Implémenter conditions météo/terrain
    // - Trick Room: Inverse l'ordre de vitesse
    // - Tailwind: ×2.0 pour l'équipe
    // - Paralysis: ×0.25
    
    return modifiers;
  }
  
  // === GESTION DES ÉGALITÉS ===
  
  /**
   * Analyse les égalités de vitesse
   */
  static analyzeTies(calculations: SpeedCalculation[]): SpeedTieResult {
    if (calculations.length !== 2) {
      return { isTie: false, tiedPlayers: [], resolution: 'player1_wins' };
    }
    
    const [calc1, calc2] = calculations;
    
    // Vérifier égalité de priorité ET de vitesse
    const samePriority = calc1.actionPriority === calc2.actionPriority;
    const sameSpeed = calc1.effectiveSpeed === calc2.effectiveSpeed;
    
    if (samePriority && sameSpeed) {
      return {
        isTie: true,
        tiedPlayers: [calc1.playerRole, calc2.playerRole],
        resolution: 'player1_wins', // Player1 gagne toujours en cas d'égalité
        winner: 'player1'
      };
    }
    
    return { isTie: false, tiedPlayers: [], resolution: 'player1_wins' };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Compare deux vitesses avec contexte
   */
  static compareSpeed(
    pokemon1: Pokemon, action1: BattleAction,
    pokemon2: Pokemon, action2: BattleAction
  ): { faster: 'player1' | 'player2' | 'tie'; difference: number } {
    
    const speed1 = this.calculateEffectiveSpeed(pokemon1, action1);
    const speed2 = this.calculateEffectiveSpeed(pokemon2, action2);
    const priority1 = this.getActionPriority(action1);
    const priority2 = this.getActionPriority(action2);
    
    // Comparer priorités d'abord
    if (priority1 !== priority2) {
      return {
        faster: priority1 > priority2 ? 'player1' : 'player2',
        difference: Math.abs(priority1 - priority2)
      };
    }
    
    // Puis vitesses
    if (speed1 !== speed2) {
      return {
        faster: speed1 > speed2 ? 'player1' : 'player2',
        difference: Math.abs(speed1 - speed2)
      };
    }
    
    return { faster: 'tie', difference: 0 };
  }
  
  /**
   * Diagnostics détaillés
   */
  static getDiagnostics(calculations: SpeedCalculation[]): any {
    return {
      version: 'speed_calculator_v1',
      totalCalculations: calculations.length,
      orderBreakdown: calculations.map(calc => ({
        playerRole: calc.playerRole,
        pokemon: calc.pokemon.name,
        actionType: calc.action.type,
        actionPriority: calc.actionPriority,
        baseSpeed: calc.baseSpeed,
        effectiveSpeed: calc.effectiveSpeed,
        modifiers: calc.modifiers.filter(m => m.active).length,
        finalPosition: calc.finalPosition
      })),
      tieAnalysis: this.analyzeTies(calculations),
      speedDifferential: calculations.length === 2 ? 
        Math.abs(calculations[0].effectiveSpeed - calculations[1].effectiveSpeed) : 0,
      features: [
        'priority_system',
        'move_priorities',
        'status_modifiers',
        'tie_resolution',
        'authentic_pokemon_logic'
      ]
    };
  }
}

export default SpeedCalculator;
