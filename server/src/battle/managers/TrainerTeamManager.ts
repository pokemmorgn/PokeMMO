// server/src/battle/managers/TrainerTeamManager.ts
// 🎯 WRAPPER TEAMMANAGER POUR COMBATS DRESSEURS - COMPATIBLE & OPTIMISÉ

import { TeamManager } from '../../managers/TeamManager';
import { IOwnedPokemon } from '../../models/OwnedPokemon';
import { 
  Pokemon, 
  TrainerPokemonTeam, 
  convertOwnedPokemonToBattlePokemon,
  createTrainerPokemonTeam 
} from '../types/TrainerBattleTypes';
import mongoose from 'mongoose';

// === INTERFACES SPÉCIFIQUES ===

export interface BattleTeamState {
  allPokemon: Pokemon[];         // Équipe complète pour le combat
  activePokemonIndex: number;    // Index Pokémon actuel
  availableForSwitch: number[];  // Index des Pokémon disponibles pour changement
  lastSwitchTurn?: number;       // Dernier tour de changement
  switchCount: number;           // Nombre de changements effectués
}

export interface SwitchValidation {
  isValid: boolean;
  reason?: string;
  availableOptions?: number[];
  cooldownTurns?: number;
}

export interface TeamAnalysis {
  totalPokemon: number;
  alivePokemon: number;
  faintedPokemon: number;
  averageLevel: number;
  strongestPokemon: Pokemon | null;
  fastestPokemon: Pokemon | null;
  teamTypes: string[];           // Types représentés dans l'équipe
  teamWeaknesses: string[];      // Faiblesses communes
  battleReady: boolean;
}

/**
 * TRAINER TEAM MANAGER - Wrapper intelligent autour de TeamManager
 * 
 * Responsabilités :
 * - Adapter TeamManager pour combats multi-Pokémon
 * - Gestion de l'état de combat (Pokémon actif, changements)
 * - Validation des changements selon les règles
 * - Interface compatible avec BattleEngine existant
 * - Optimisations pour performance MMO
 */
export class TrainerTeamManager {
  
  private teamManager: TeamManager;
  private battleState: BattleTeamState | null = null;
  private playerId: string;
  private isInitialized = false;
  
  // Configuration
  private maxSwitchesPerTurn = 1;
  private switchCooldown = 0;
  private allowForcedSwitches = true;
  
  constructor(playerId: string) {
    this.playerId = playerId;
    this.teamManager = new TeamManager(playerId);
    console.log(`🎮 [TrainerTeamManager] Créé pour ${playerId}`);
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'équipe du joueur depuis la DB
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔄 [TrainerTeamManager] Initialisation pour ${this.playerId}...`);
      
      // Charger l'équipe via TeamManager
      const ownedPokemon = await this.teamManager.load();
      
      if (ownedPokemon.length === 0) {
        throw new Error(`Aucun Pokémon dans l'équipe de ${this.playerId}`);
      }
      
      // Convertir vers format combat
      const battlePokemon = ownedPokemon.map(convertOwnedPokemonToBattlePokemon);
      
      // Créer l'état de combat
      this.battleState = {
        allPokemon: battlePokemon,
        activePokemonIndex: 0, // Premier Pokémon par défaut
        availableForSwitch: this.calculateAvailableForSwitch(battlePokemon),
        switchCount: 0
      };
      
      this.isInitialized = true;
      
      console.log(`✅ [TrainerTeamManager] Initialisé avec ${battlePokemon.length} Pokémon`);
      console.log(`    Premier Pokémon: ${battlePokemon[0].name} (${battlePokemon[0].currentHp}/${battlePokemon[0].maxHp} HP)`);
      
    } catch (error) {
      console.error(`❌ [TrainerTeamManager] Erreur initialisation:`, error);
      throw error;
    }
  }
  
  /**
   * Initialisation directe avec Pokémon fournis (pour dresseurs IA)
   */
  initializeWithPokemon(pokemon: Pokemon[]): void {
    if (pokemon.length === 0) {
      throw new Error('Équipe vide fournie');
    }
    
    this.battleState = {
      allPokemon: pokemon,
      activePokemonIndex: 0,
      availableForSwitch: this.calculateAvailableForSwitch(pokemon),
      switchCount: 0
    };
    
    this.isInitialized = true;
    
    console.log(`✅ [TrainerTeamManager] Initialisé directement avec ${pokemon.length} Pokémon`);
  }
  
  // === ACCÈS À L'ÉQUIPE ===
  
  /**
   * Récupère le Pokémon actuellement actif
   */
  getActivePokemon(): Pokemon | null {
    if (!this.isInitialized || !this.battleState) {
      console.warn(`⚠️ [TrainerTeamManager] Non initialisé`);
      return null;
    }
    
    const activePokemon = this.battleState.allPokemon[this.battleState.activePokemonIndex];
    return activePokemon || null;
  }
  
  /**
   * Récupère l'équipe complète
   */
  getAllPokemon(): Pokemon[] {
    if (!this.battleState) return [];
    return [...this.battleState.allPokemon];
  }
  
  /**
   * Récupère les Pokémon encore vivants
   */
  getAlivePokemon(): Pokemon[] {
    if (!this.battleState) return [];
    return this.battleState.allPokemon.filter(p => p.currentHp > 0);
  }
  
  /**
   * Récupère un Pokémon par index
   */
  getPokemonByIndex(index: number): Pokemon | null {
    if (!this.battleState || index < 0 || index >= this.battleState.allPokemon.length) {
      return null;
    }
    return this.battleState.allPokemon[index];
  }
  
  /**
   * Trouve l'index d'un Pokémon par son combatId
   */
  findPokemonIndex(combatId: string): number {
    if (!this.battleState) return -1;
    return this.battleState.allPokemon.findIndex(p => p.combatId === combatId);
  }
  
  // === GESTION CHANGEMENTS ===
  
  /**
   * Valide si un changement est possible
   */
  validateSwitch(
    fromIndex: number, 
    toIndex: number, 
    currentTurn: number,
    isForced: boolean = false
  ): SwitchValidation {
    
    if (!this.isInitialized || !this.battleState) {
      return { isValid: false, reason: 'Gestionnaire non initialisé' };
    }
    
    // Validation index
    if (toIndex < 0 || toIndex >= this.battleState.allPokemon.length) {
      return { isValid: false, reason: 'Index Pokémon invalide' };
    }
    
    // Pokémon cible existe et est vivant
    const targetPokemon = this.battleState.allPokemon[toIndex];
    if (!targetPokemon) {
      return { isValid: false, reason: 'Pokémon cible introuvable' };
    }
    
    if (targetPokemon.currentHp <= 0) {
      return { isValid: false, reason: 'Pokémon cible K.O.' };
    }
    
    // Pas de changement vers le même Pokémon
    if (fromIndex === toIndex) {
      return { isValid: false, reason: 'Pokémon déjà actif' };
    }
    
    // Si changement forcé, toujours autorisé (KO)
    if (isForced && this.allowForcedSwitches) {
      return { 
        isValid: true, 
        availableOptions: this.battleState.availableForSwitch 
      };
    }
    
    // Vérifier cooldown
    if (this.battleState.lastSwitchTurn !== undefined) {
      const turnsSinceLastSwitch = currentTurn - this.battleState.lastSwitchTurn;
      if (turnsSinceLastSwitch < this.switchCooldown) {
        return { 
          isValid: false, 
          reason: 'Cooldown changement actif',
          cooldownTurns: this.switchCooldown - turnsSinceLastSwitch
        };
      }
    }
    
    // Vérifier limite par tour
    // Note: Réinitialiser switchCount à chaque nouveau tour (à implémenter selon logique combat)
    
    return { 
      isValid: true,
      availableOptions: this.battleState.availableForSwitch
    };
  }
  
  /**
   * Exécute un changement de Pokémon
   */
  executeSwitch(
    fromIndex: number, 
    toIndex: number, 
    currentTurn: number,
    isForced: boolean = false
  ): boolean {
    
    const validation = this.validateSwitch(fromIndex, toIndex, currentTurn, isForced);
    if (!validation.isValid) {
      console.warn(`⚠️ [TrainerTeamManager] Changement refusé: ${validation.reason}`);
      return false;
    }
    
    if (!this.battleState) return false;
    
    const fromPokemon = this.battleState.allPokemon[fromIndex];
    const toPokemon = this.battleState.allPokemon[toIndex];
    
    console.log(`🔄 [TrainerTeamManager] Changement: ${fromPokemon?.name} → ${toPokemon.name} ${isForced ? '(forcé)' : '(volontaire)'}`);
    
    // Effectuer le changement
    this.battleState.activePokemonIndex = toIndex;
    this.battleState.lastSwitchTurn = currentTurn;
    this.battleState.switchCount++;
    
    // Mettre à jour les options disponibles
    this.battleState.availableForSwitch = this.calculateAvailableForSwitch(this.battleState.allPokemon);
    
    return true;
  }
  
  /**
   * Changement automatique vers le premier Pokémon vivant
   */
  autoSwitchToFirstAlive(): boolean {
    if (!this.battleState) return false;
    
    const alivePokemon = this.getAlivePokemon();
    if (alivePokemon.length === 0) {
      console.log(`💀 [TrainerTeamManager] Aucun Pokémon vivant pour changement auto`);
      return false;
    }
    
    // Trouver le premier Pokémon vivant
    const firstAliveIndex = this.battleState.allPokemon.findIndex(p => p.currentHp > 0);
    if (firstAliveIndex === -1) return false;
    
    console.log(`🔄 [TrainerTeamManager] Changement auto vers ${this.battleState.allPokemon[firstAliveIndex].name}`);
    
    this.battleState.activePokemonIndex = firstAliveIndex;
    this.battleState.availableForSwitch = this.calculateAvailableForSwitch(this.battleState.allPokemon);
    
    return true;
  }
  
  // === GESTION COMBAT ===
  
  /**
   * Applique des dégâts au Pokémon actif
   */
  applyDamageToActive(damage: number): { newHp: number; isFainted: boolean } {
    const activePokemon = this.getActivePokemon();
    if (!activePokemon) {
      return { newHp: 0, isFainted: true };
    }
    
    const oldHp = activePokemon.currentHp;
    activePokemon.currentHp = Math.max(0, oldHp - damage);
    const isFainted = activePokemon.currentHp <= 0;
    
    console.log(`💥 [TrainerTeamManager] ${activePokemon.name}: ${oldHp} → ${activePokemon.currentHp} HP ${isFainted ? '(K.O.)' : ''}`);
    
    // Mettre à jour les options de changement si KO
    if (isFainted && this.battleState) {
      this.battleState.availableForSwitch = this.calculateAvailableForSwitch(this.battleState.allPokemon);
    }
    
    return {
      newHp: activePokemon.currentHp,
      isFainted
    };
  }
  
  /**
   * Soigne le Pokémon actif
   */
  healActivePokemon(amount?: number): boolean {
    const activePokemon = this.getActivePokemon();
    if (!activePokemon) return false;
    
    const oldHp = activePokemon.currentHp;
    if (amount === undefined) {
      activePokemon.currentHp = activePokemon.maxHp; // Soin complet
    } else {
      activePokemon.currentHp = Math.min(activePokemon.maxHp, oldHp + amount);
    }
    
    console.log(`💚 [TrainerTeamManager] ${activePokemon.name} soigné: ${oldHp} → ${activePokemon.currentHp} HP`);
    return true;
  }
  
  /**
   * Applique un statut au Pokémon actif
   */
  applyStatusToActive(status: string): boolean {
    const activePokemon = this.getActivePokemon();
    if (!activePokemon) return false;
    
    activePokemon.status = status;
    console.log(`🌀 [TrainerTeamManager] ${activePokemon.name} → statut: ${status}`);
    return true;
  }
  
  // === ANALYSE D'ÉQUIPE ===
  
  /**
   * Analyse complète de l'équipe
   */
  analyzeTeam(): TeamAnalysis {
    if (!this.battleState) {
      return {
        totalPokemon: 0,
        alivePokemon: 0,
        faintedPokemon: 0,
        averageLevel: 0,
        strongestPokemon: null,
        fastestPokemon: null,
        teamTypes: [],
        teamWeaknesses: [],
        battleReady: false
      };
    }
    
    const allPokemon = this.battleState.allPokemon;
    const alivePokemon = allPokemon.filter(p => p.currentHp > 0);
    const faintedPokemon = allPokemon.filter(p => p.currentHp <= 0);
    
    // Calculs de base
    const averageLevel = allPokemon.reduce((sum, p) => sum + p.level, 0) / allPokemon.length;
    const strongestPokemon = alivePokemon.reduce((strongest, current) => 
      (strongest === null || current.attack > strongest.attack) ? current : strongest, null as Pokemon | null);
    const fastestPokemon = alivePokemon.reduce((fastest, current) =>
      (fastest === null || current.speed > fastest.speed) ? current : fastest, null as Pokemon | null);
    
    // Types d'équipe (simplifié - à améliorer avec vraie DB Pokémon)
    const teamTypes = [...new Set(allPokemon.flatMap(p => p.types))];
    
    return {
      totalPokemon: allPokemon.length,
      alivePokemon: alivePokemon.length,
      faintedPokemon: faintedPokemon.length,
      averageLevel: Math.round(averageLevel),
      strongestPokemon,
      fastestPokemon,
      teamTypes,
      teamWeaknesses: [], // TODO: Calculer selon types
      battleReady: alivePokemon.length > 0
    };
  }
  
  /**
   * Vérifie si l'équipe peut encore se battre
   */
  canBattle(): boolean {
    return this.getAlivePokemon().length > 0;
  }
  
  /**
   * Vérifie si l'équipe est complètement vaincue
   */
  isTeamDefeated(): boolean {
    return !this.canBattle();
  }
  
  // === CONVERSION POUR BATTLEENGINE ===
  
  /**
   * Crée un TrainerPokemonTeam pour l'état de combat
   */
  createTrainerPokemonTeam(): TrainerPokemonTeam | null {
    if (!this.battleState) return null;
    
    return createTrainerPokemonTeam(
      this.battleState.allPokemon,
      this.battleState.activePokemonIndex
    );
  }
  
  /**
   * Récupère le Pokémon actif au format compatible BattleEngine
   */
  getActivePokemonForBattle(): Pokemon | null {
    return this.getActivePokemon();
  }
  
  // === SAUVEGARDE (OPTIONNEL) ===
  
  /**
   * Sauvegarde l'état actuel vers la DB via TeamManager
   */
  async saveCurrentState(): Promise<boolean> {
    if (!this.isInitialized || !this.battleState) {
      console.warn(`⚠️ [TrainerTeamManager] Impossible de sauvegarder - non initialisé`);
      return false;
    }
    
    try {
      // Mettre à jour les HP/statuts via TeamManager
      // Note: Nécessite mapping Pokemon → IOwnedPokemon._id
      // Pour l'instant, déléguer cette logique au BattleEndManager
      
      console.log(`💾 [TrainerTeamManager] Sauvegarde différée vers BattleEndManager`);
      return true;
      
    } catch (error) {
      console.error(`❌ [TrainerTeamManager] Erreur sauvegarde:`, error);
      return false;
    }
  }
  
  // === UTILITAIRES PRIVÉS ===
  
  /**
   * Calcule les index disponibles pour changement
   */
  private calculateAvailableForSwitch(allPokemon: Pokemon[]): number[] {
    return allPokemon
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ pokemon, index }) => 
        pokemon.currentHp > 0 && 
        index !== this.battleState?.activePokemonIndex
      )
      .map(({ index }) => index);
  }
  
  // === CONFIGURATION ===
  
  /**
   * Configure les règles de changement
   */
  configureRules(
    maxSwitchesPerTurn: number = 1,
    switchCooldown: number = 0,
    allowForcedSwitches: boolean = true
  ): void {
    this.maxSwitchesPerTurn = maxSwitchesPerTurn;
    this.switchCooldown = switchCooldown;
    this.allowForcedSwitches = allowForcedSwitches;
    
    console.log(`⚙️ [TrainerTeamManager] Règles configurées: ${maxSwitchesPerTurn} changements/tour, cooldown ${switchCooldown}, forcés ${allowForcedSwitches}`);
  }
  
  // === DIAGNOSTICS ===
  
  /**
   * État complet pour debugging
   */
  getDebugState(): any {
    return {
      playerId: this.playerId,
      isInitialized: this.isInitialized,
      battleState: this.battleState ? {
        activePokemonIndex: this.battleState.activePokemonIndex,
        availableForSwitch: this.battleState.availableForSwitch,
        lastSwitchTurn: this.battleState.lastSwitchTurn,
        switchCount: this.battleState.switchCount,
        pokemonCount: this.battleState.allPokemon.length,
        alivePokemon: this.getAlivePokemon().length
      } : null,
      rules: {
        maxSwitchesPerTurn: this.maxSwitchesPerTurn,
        switchCooldown: this.switchCooldown,
        allowForcedSwitches: this.allowForcedSwitches
      },
      analysis: this.battleState ? this.analyzeTeam() : null
    };
  }
  
  /**
   * Nettoyage
   */
  cleanup(): void {
    this.battleState = null;
    this.isInitialized = false;
    console.log(`🧹 [TrainerTeamManager] Nettoyé pour ${this.playerId}`);
  }
}

export default TrainerTeamManager;
