// server/src/services/EvolutionService.ts
import { EventEmitter } from 'events';
import { pokedexIntegrationService } from './PokedexIntegrationService';
import { getPokemonById } from '../data/PokemonData';
import { Types } from 'mongoose';

// ===== TYPES & INTERFACES =====

export interface EvolutionConditions {
  // Conditions de base
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  
  // Objets requis
  item?: string;
  stone?: 'fire' | 'water' | 'thunder' | 'leaf' | 'moon' | 'sun' | 'dawn' | 'dusk' | 'shiny';
  heldItem?: string;
  
  // Conditions temporelles
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  timeRange?: { start: string; end: string };
  
  // Conditions sociales
  friendship?: number;
  trade?: boolean;
  tradeWithItem?: string;
  tradeWithSpecificPokemon?: number;
  
  // Conditions de localisation
  location?: string;
  biome?: string;
  nearbyPokemon?: number;
  
  // Conditions spéciales
  gender?: 'male' | 'female';
  moveKnown?: string;
  otherPokemonInParty?: number;
  weather?: string;
  
  // Conditions d'événement
  isEvent?: boolean;
  eventType?: string;
  
  // Conditions de stats
  attack?: number;
  defense?: number;
  attackDefenseRatio?: 'equal' | 'attack_higher' | 'defense_higher';
  
  // Méthode d'évolution
  method: 'level' | 'stone' | 'trade' | 'friendship' | 'special' | 'mega' | 'fusion';
  
  // Données contextuelles
  location?: string;
  triggeredBy?: string;
  playerId?: string;
}

export interface EvolutionChain {
  pokemonId: number;
  evolvesTo?: EvolutionChain[];
  conditions?: EvolutionConditions[];
  branchConditions?: { [key: string]: EvolutionConditions };
}

export interface EvolutionResult {
  success: boolean;
  fromPokemon: {
    id: number;
    name: string;
    level: number;
  };
  toPokemon: {
    id: number;
    name: string;
    level: number;
  };
  ownedPokemon: any; // L'instance mise à jour
  conditions: EvolutionConditions;
  rewards?: string[];
  notifications: string[];
  achievements: string[];
  isNewForm?: boolean;
  evolutionData?: {
    animationType: string;
    duration: number;
    effects: string[];
  };
  error?: string;
}

export interface MegaEvolutionData {
  megaStone: string;
  duration: number; // en secondes, 0 = permanent
  statBoosts: {
    attack?: number;
    defense?: number;
    speed?: number;
    hp?: number;
  };
  newAbilities?: string[];
  newTypes?: string[];
}

export interface EvolutionServiceConfig {
  enableValidation: boolean;
  enableAutoIntegration: boolean; // Intégration Pokédx automatique
  enableNotifications: boolean;
  enableAchievements: boolean;
  enableMegaEvolution: boolean;
  enableFusionEvolution: boolean;
  debugMode: boolean;
  maxEvolutionsPerSession: number;
  evolutionCooldown: number; // en millisecondes
}

// ===== SERVICE ÉVOLUTION OPTIMISÉ =====

export class EvolutionService extends EventEmitter {
  private static instance: EvolutionService;
  
  // Configuration du service
  private config: EvolutionServiceConfig = {
    enableValidation: true,
    enableAutoIntegration: true,
    enableNotifications: true,
    enableAchievements: true,
    enableMegaEvolution: true,
    enableFusionEvolution: false, // Fonctionnalité avancée
    debugMode: false,
    maxEvolutionsPerSession: 10,
    evolutionCooldown: 1000 // 1 seconde entre évolutions
  };
  
  // Cache des évolutions récentes pour cooldown
  private recentEvolutions = new Map<string, number>(); // playerId -> timestamp
  
  // Cache des chaînes d'évolution
  private evolutionChainCache = new Map<number, EvolutionChain>();
  
  // Cache des conditions d'évolution
  private evolutionConditionsCache = new Map<string, EvolutionConditions[]>();
  
  // Statistiques de performance
  private performanceStats = {
    totalEvolutions: 0,
    successfulEvolutions: 0,
    failedEvolutions: 0,
    megaEvolutions: 0,
    fusionEvolutions: 0,
    averageExecutionTime: 0,
    errors: 0,
    validationFailures: 0
  };
  
  constructor() {
    super();
    this.initializeService();
    console.log('🌟 [EvolutionService] Service d\'évolution initialisé');
  }
  
  // Singleton pattern
  static getInstance(): EvolutionService {
    if (!EvolutionService.instance) {
      EvolutionService.instance = new EvolutionService();
    }
    return EvolutionService.instance;
  }
  
  // ===== INITIALISATION =====
  
  private initializeService(): void {
    // Pré-charger les chaînes d'évolution communes
    this.preloadEvolutionChains().catch(console.error);
    
    // Nettoyage périodique du cache de cooldown
    setInterval(() => this.cleanupCooldowns(), 60000); // 1 minute
    
    // Monitoring des erreurs
    this.on('error', (error) => {
      this.performanceStats.errors++;
      console.error('❌ [EvolutionService] Erreur service:', error);
    });
    
    this.debugLog('Service initialisé avec succès');
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  /**
   * API ultra-simple : Évolution basique par niveau
   */
  async evolve(
    ownedPokemonId: string,
    targetPokemonId?: number,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon(ownedPokemonId, {
        method: 'level',
        location
      }, targetPokemonId);
      
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolve failed:`, error);
      return false;
    }
  }
  
  /**
   * API simple : Évolution avec objet
   */
  async evolveWithItem(
    ownedPokemonId: string,
    itemName: string,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon(ownedPokemonId, {
        method: 'stone',
        stone: itemName as any,
        item: itemName,
        location
      });
      
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolveWithItem failed:`, error);
      return false;
    }
  }
  
  /**
   * API simple : Évolution par échange
   */
  async evolveByTrade(
    ownedPokemonId: string,
    tradePartner: string,
    location: string = 'Trade'
  ): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon(ownedPokemonId, {
        method: 'trade',
        trade: true,
        location,
        triggeredBy: tradePartner
      });
      
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolveByTrade failed:`, error);
      return false;
    }
  }
  
  // ===== MÉTHODE PRINCIPALE D'ÉVOLUTION =====
  
  /**
   * Évolution complète d'un Pokémon possédé avec validation
   */
  async evolveOwnedPokemon(
    ownedPokemonId: string,
    conditions: EvolutionConditions,
    targetPokemonId?: number
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    this.performanceStats.totalEvolutions++;
    
    try {
      // Validation des paramètres
      const validation = await this.validateEvolutionRequest(ownedPokemonId, conditions);
      if (!validation.isValid) {
        this.performanceStats.validationFailures++;
        return this.createFailureResult(validation.error || 'Validation failed');
      }
      
      this.debugLog(`🌟 Évolution: ${ownedPokemonId} avec conditions ${conditions.method}`);
      
      // Récupérer le Pokémon possédé
      const ownedPokemon = await this.getOwnedPokemon(ownedPokemonId);
      if (!ownedPokemon) {
        throw new Error('Pokémon possédé introuvable');
      }
      
      const playerId = ownedPokemon.owner;
      
      // Vérifier le cooldown
      if (this.isInCooldown(playerId)) {
        throw new Error('Cooldown d\'évolution actif');
      }
      
      // Récupérer les données du Pokémon source
      const fromPokemonData = await getPokemonById(ownedPokemon.pokemonId);
      if (!fromPokemonData) {
        throw new Error('Données Pokémon source introuvables');
      }
      
      // Déterminer le Pokémon cible
      let toPokemonId = targetPokemonId;
      if (!toPokemonId) {
        toPokemonId = await this.determineBestEvolution(ownedPokemon, conditions);
      }
      
      if (!toPokemonId) {
        throw new Error('Aucune évolution possible avec ces conditions');
      }
      
      // Valider l'évolution spécifique
      const evolutionValidation = await this.validateSpecificEvolution(
        ownedPokemon,
        toPokemonId,
        conditions
      );
      
      if (!evolutionValidation.isValid) {
        throw new Error(evolutionValidation.error || 'Évolution non valide');
      }
      
      // Récupérer les données du Pokémon cible
      const toPokemonData = await getPokemonById(toPokemonId);
      if (!toPokemonData) {
        throw new Error('Données Pokémon cible introuvables');
      }
      
      // Effectuer la transformation
      const transformResult = await this.performTransformation(
        ownedPokemon,
        toPokemonData,
        conditions
      );
      
      if (!transformResult.success) {
        throw new Error(transformResult.error || 'Échec de la transformation');
      }
      
      // Marquer le cooldown
      this.markCooldown(playerId);
      
      // Intégration automatique au Pokédx
      let isNewForm = false;
      if (this.config.enableAutoIntegration) {
        const integrationResult = await pokedexIntegrationService.handlePokemonEvolution({
          playerId,
          fromPokemonId: ownedPokemon.pokemonId,
          toPokemonId,
          ownedPokemonId,
          location: conditions.location || 'Evolution',
          method: conditions.method,
          triggeredBy: conditions.triggeredBy
        });
        
        isNewForm = integrationResult.isNewForm || false;
      }
      
      // Générer les notifications et accomplissements
      const notifications = await this.generateEvolutionNotifications(
        fromPokemonData,
        toPokemonData,
        conditions,
        isNewForm
      );
      
      const achievements = await this.checkEvolutionAchievements(
        playerId,
        fromPokemonData,
        toPokemonData,
        conditions
      );
      
      // Créer le résultat de succès
      const result: EvolutionResult = {
        success: true,
        fromPokemon: {
          id: ownedPokemon.pokemonId,
          name: fromPokemonData.name,
          level: ownedPokemon.level
        },
        toPokemon: {
          id: toPokemonId,
          name: toPokemonData.name,
          level: transformResult.ownedPokemon.level
        },
        ownedPokemon: transformResult.ownedPokemon,
        conditions,
        rewards: transformResult.rewards,
        notifications,
        achievements,
        isNewForm,
        evolutionData: {
          animationType: this.getAnimationType(conditions.method),
          duration: this.getAnimationDuration(conditions.method),
          effects: this.getEvolutionEffects(fromPokemonData, toPokemonData)
        }
      };
      
      // Émettre les événements
      this.emit('pokemonEvolved', {
        playerId,
        fromPokemonId: ownedPokemon.pokemonId,
        toPokemonId,
        ownedPokemonId,
        conditions,
        result
      });
      
      // Mettre à jour les statistiques
      this.performanceStats.successfulEvolutions++;
      if (conditions.method === 'mega') {
        this.performanceStats.megaEvolutions++;
      } else if (conditions.method === 'fusion') {
        this.performanceStats.fusionEvolutions++;
      }
      
      const executionTime = Date.now() - startTime;
      this.updatePerformanceStats(executionTime);
      
      this.debugLog(`✅ Évolution réussie: ${fromPokemonData.name} → ${toPokemonData.name}`);
      
      return result;
      
    } catch (error) {
      this.emit('error', error);
      this.performanceStats.failedEvolutions++;
      this.updatePerformanceStats(Date.now() - startTime);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [EvolutionService] Erreur evolveOwnedPokemon:`, error);
      
      return this.createFailureResult(errorMessage);
    }
  }
  
  // ===== ÉVOLUTIONS SPÉCIALES =====
  
  /**
   * Méga-évolution temporaire
   */
  async megaEvolve(
    ownedPokemonId: string,
    megaStone: string,
    duration: number = 300, // 5 minutes par défaut
    location: string = 'Battle'
  ): Promise<EvolutionResult> {
    try {
      if (!this.config.enableMegaEvolution) {
        throw new Error('Méga-évolution désactivée');
      }
      
      const result = await this.evolveOwnedPokemon(ownedPokemonId, {
        method: 'mega',
        stone: megaStone as any,
        location,
        triggeredBy: `MegaStone:${megaStone}`
      });
      
      // Programmer la reversion après la durée
      if (result.success && duration > 0) {
        setTimeout(async () => {
          await this.revertMegaEvolution(ownedPokemonId);
        }, duration * 1000);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [EvolutionService] megaEvolve failed:`, error);
      return this.createFailureResult(error instanceof Error ? error.message : 'Méga-évolution échouée');
    }
  }
  
  /**
   * Évolution par fusion (fonctionnalité avancée)
   */
  async fusionEvolve(
    pokemon1Id: string,
    pokemon2Id: string,
    location: string = 'Fusion Chamber'
  ): Promise<EvolutionResult> {
    try {
      if (!this.config.enableFusionEvolution) {
        throw new Error('Évolution par fusion désactivée');
      }
      
      // TODO: Implémenter logique de fusion complète
      // Pour l'instant, retourner une erreur
      throw new Error('Évolution par fusion non encore implémentée');
      
    } catch (error) {
      console.error(`❌ [EvolutionService] fusionEvolve failed:`, error);
      return this.createFailureResult(error instanceof Error ? error.message : 'Fusion échouée');
    }
  }
  
  // ===== VALIDATION =====
  
  /**
   * Validation complète d'une demande d'évolution
   */
  private async validateEvolutionRequest(
    ownedPokemonId: string,
    conditions: EvolutionConditions
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!this.config.enableValidation) {
      return { isValid: true };
    }
    
    // Validation de base
    if (!ownedPokemonId || !Types.ObjectId.isValid(ownedPokemonId)) {
      return { isValid: false, error: 'ID Pokémon possédé invalide' };
    }
    
    if (!conditions || !conditions.method) {
      return { isValid: false, error: 'Conditions d\'évolution requises' };
    }
    
    const validMethods = ['level', 'stone', 'trade', 'friendship', 'special', 'mega', 'fusion'];
    if (!validMethods.includes(conditions.method)) {
      return { isValid: false, error: 'Méthode d\'évolution invalide' };
    }
    
    // Validations spécifiques par méthode
    switch (conditions.method) {
      case 'level':
        if (conditions.minLevel && (conditions.minLevel < 1 || conditions.minLevel > 100)) {
          return { isValid: false, error: 'Niveau minimum invalide' };
        }
        break;
        
      case 'stone':
        if (!conditions.stone && !conditions.item) {
          return { isValid: false, error: 'Pierre d\'évolution requise' };
        }
        break;
        
      case 'trade':
        if (!conditions.trade) {
          return { isValid: false, error: 'Échange requis pour cette évolution' };
        }
        break;
        
      case 'friendship':
        if (conditions.friendship && (conditions.friendship < 0 || conditions.friendship > 255)) {
          return { isValid: false, error: 'Niveau d\'amitié invalide' };
        }
        break;
        
      case 'mega':
        if (!this.config.enableMegaEvolution) {
          return { isValid: false, error: 'Méga-évolution désactivée' };
        }
        if (!conditions.stone) {
          return { isValid: false, error: 'Méga-pierre requise' };
        }
        break;
        
      case 'fusion':
        if (!this.config.enableFusionEvolution) {
          return { isValid: false, error: 'Évolution par fusion désactivée' };
        }
        break;
    }
    
    return { isValid: true };
  }
  
  /**
   * Validation d'une évolution spécifique
   */
  private async validateSpecificEvolution(
    ownedPokemon: any,
    targetPokemonId: number,
    conditions: EvolutionConditions
  ): Promise<{ isValid: boolean; error?: string }> {
    // Récupérer la chaîne d'évolution
    const evolutionChain = await this.getEvolutionChain(ownedPokemon.pokemonId);
    if (!evolutionChain) {
      return { isValid: false, error: 'Aucune évolution possible pour ce Pokémon' };
    }
    
    // Vérifier que l'évolution cible est valide
    const possibleEvolutions = await this.getPossibleEvolutions(ownedPokemon, conditions);
    if (!possibleEvolutions.includes(targetPokemonId)) {
      return { isValid: false, error: 'Évolution cible non autorisée avec ces conditions' };
    }
    
    // Vérifications spécifiques aux conditions
    if (conditions.level && ownedPokemon.level < conditions.level) {
      return { isValid: false, error: `Niveau ${conditions.level} requis` };
    }
    
    if (conditions.minLevel && ownedPokemon.level < conditions.minLevel) {
      return { isValid: false, error: `Niveau minimum ${conditions.minLevel} requis` };
    }
    
    // TODO: Ajouter d'autres validations selon les conditions
    
    return { isValid: true };
  }
  
  // ===== LOGIQUE D'ÉVOLUTION =====
  
  /**
   * Détermine la meilleure évolution possible
   */
  private async determineBestEvolution(
    ownedPokemon: any,
    conditions: EvolutionConditions
  ): Promise<number | null> {
    const possibleEvolutions = await this.getPossibleEvolutions(ownedPokemon, conditions);
    
    if (possibleEvolutions.length === 0) {
      return null;
    }
    
    // Si une seule évolution possible, la retourner
    if (possibleEvolutions.length === 1) {
      return possibleEvolutions[0];
    }
    
    // Logique de choix intelligent
    // TODO: Implémenter algorithme de choix basé sur les stats, préférences, etc.
    
    // Pour l'instant, retourner la première évolution
    return possibleEvolutions[0];
  }
  
  /**
   * Récupère les évolutions possibles selon les conditions
   */
  private async getPossibleEvolutions(
    ownedPokemon: any,
    conditions: EvolutionConditions
  ): Promise<number[]> {
    const evolutionChain = await this.getEvolutionChain(ownedPokemon.pokemonId);
    if (!evolutionChain || !evolutionChain.evolvesTo) {
      return [];
    }
    
    const possibleEvolutions: number[] = [];
    
    for (const evolution of evolutionChain.evolvesTo) {
      if (await this.checkEvolutionConditions(ownedPokemon, evolution, conditions)) {
        possibleEvolutions.push(evolution.pokemonId);
      }
    }
    
    return possibleEvolutions;
  }
  
  /**
   * Vérifie si les conditions d'évolution sont remplies
   */
  private async checkEvolutionConditions(
    ownedPokemon: any,
    evolution: EvolutionChain,
    playerConditions: EvolutionConditions
  ): Promise<boolean> {
    if (!evolution.conditions || evolution.conditions.length === 0) {
      return true;
    }
    
    // Vérifier chaque condition d'évolution
    for (const condition of evolution.conditions) {
      if (await this.isConditionMet(ownedPokemon, condition, playerConditions)) {
        return true; // Une condition suffit (OR logic)
      }
    }
    
    return false;
  }
  
  /**
   * Vérifie si une condition spécifique est remplie
   */
  private async isConditionMet(
    ownedPokemon: any,
    evolutionCondition: EvolutionConditions,
    playerConditions: EvolutionConditions
  ): Promise<boolean> {
    // Vérification de la méthode
    if (evolutionCondition.method !== playerConditions.method) {
      return false;
    }
    
    // Vérifications spécifiques
    if (evolutionCondition.minLevel && ownedPokemon.level < evolutionCondition.minLevel) {
      return false;
    }
    
    if (evolutionCondition.maxLevel && ownedPokemon.level > evolutionCondition.maxLevel) {
      return false;
    }
    
    if (evolutionCondition.stone && evolutionCondition.stone !== playerConditions.stone) {
      return false;
    }
    
    if (evolutionCondition.item && evolutionCondition.item !== playerConditions.item) {
      return false;
    }
    
    if (evolutionCondition.timeOfDay && evolutionCondition.timeOfDay !== playerConditions.timeOfDay) {
      return false;
    }
    
    if (evolutionCondition.trade && !playerConditions.trade) {
      return false;
    }
    
    if (evolutionCondition.friendship && (!ownedPokemon.friendship || ownedPokemon.friendship < evolutionCondition.friendship)) {
      return false;
    }
    
    // TODO: Ajouter d'autres vérifications selon les besoins
    
    return true;
  }
  
  /**
   * Effectue la transformation physique du Pokémon
   */
  private async performTransformation(
    ownedPokemon: any,
    toPokemonData: any,
    conditions: EvolutionConditions
  ): Promise<{ success: boolean; ownedPokemon: any; rewards?: string[]; error?: string }> {
    try {
      // TODO: Intégrer avec le modèle OwnedPokemon réel
      // Pour l'instant, simulation de la transformation
      
      const originalData = {
        pokemonId: ownedPokemon.pokemonId,
        name: ownedPokemon.name,
        level: ownedPokemon.level
      };
      
      // Transformation de base
      ownedPokemon.pokemonId = toPokemonData.id;
      ownedPokemon.name = toPokemonData.name;
      
      // Mise à jour des stats selon l'évolution
      if (toPokemonData.baseStats) {
        // TODO: Recalculer les stats selon les nouvelles stats de base
      }
      
      // Nouvelles capacités possibles
      if (toPokemonData.learnset) {
        // TODO: Ajouter les nouvelles capacités apprises par évolution
      }
      
      // Gestion des méga-évolutions
      if (conditions.method === 'mega') {
        ownedPokemon.isMegaEvolved = true;
        ownedPokemon.megaStone = conditions.stone;
        ownedPokemon.megaEvolutionTime = new Date();
      }
      
      // Sauvegarder les modifications
      // TODO: await ownedPokemon.save();
      
      // Générer les récompenses
      const rewards = this.generateEvolutionRewards(originalData, toPokemonData, conditions);
      
      return {
        success: true,
        ownedPokemon,
        rewards
      };
      
    } catch (error) {
      console.error('❌ Erreur transformation:', error);
      return {
        success: false,
        ownedPokemon,
        error: error instanceof Error ? error.message : 'Erreur transformation'
      };
    }
  }
  
  // ===== GESTION DES CHAÎNES D'ÉVOLUTION =====
  
  /**
   * Récupère la chaîne d'évolution d'un Pokémon
   */
  private async getEvolutionChain(pokemonId: number): Promise<EvolutionChain | null> {
    // Vérifier le cache
    if (this.evolutionChainCache.has(pokemonId)) {
      return this.evolutionChainCache.get(pokemonId) || null;
    }
    
    // Récupérer depuis la base de données ou fichier de configuration
    const chain = await this.loadEvolutionChain(pokemonId);
    
    // Mettre en cache
    if (chain) {
      this.evolutionChainCache.set(pokemonId, chain);
    }
    
    return chain;
  }
  
  /**
   * Charge une chaîne d'évolution depuis la source de données
   */
  private async loadEvolutionChain(pokemonId: number): Promise<EvolutionChain | null> {
    // TODO: Récupérer depuis base de données ou fichier JSON
    // Pour l'instant, quelques exemples hardcodés
    
    const evolutionChains: { [key: number]: EvolutionChain } = {
      // Bulbasaur -> Ivysaur -> Venusaur
      1: {
        pokemonId: 1,
        evolvesTo: [{
          pokemonId: 2,
          conditions: [{ method: 'level', minLevel: 16 }],
          evolvesTo: [{
            pokemonId: 3,
            conditions: [{ method: 'level', minLevel: 32 }]
          }]
        }]
      },
      
      // Charmander -> Charmeleon -> Charizard
      4: {
        pokemonId: 4,
        evolvesTo: [{
          pokemonId: 5,
          conditions: [{ method: 'level', minLevel: 16 }],
          evolvesTo: [{
            pokemonId: 6,
            conditions: [{ method: 'level', minLevel: 36 }]
          }]
        }]
      },
      
      // Squirtle -> Wartortle -> Blastoise
      7: {
        pokemonId: 7,
        evolvesTo: [{
          pokemonId: 8,
          conditions: [{ method: 'level', minLevel: 16 }],
          evolvesTo: [{
            pokemonId: 9,
            conditions: [{ method: 'level', minLevel: 36 }]
          }]
        }]
      },
      
      // Pikachu -> Raichu (pierre)
      25: {
        pokemonId: 25,
        evolvesTo: [{
          pokemonId: 26,
          conditions: [{ method: 'stone', stone: 'thunder' }]
        }]
      },
      
      // Eevee (évolutions multiples)
      133: {
        pokemonId: 133,
        evolvesTo: [
          {
            pokemonId: 134, // Vaporeon
            conditions: [{ method: 'stone', stone: 'water' }]
          },
          {
            pokemonId: 135, // Jolteon
            conditions: [{ method: 'stone', stone: 'thunder' }]
          },
          {
            pokemonId: 136, // Flareon
            conditions: [{ method: 'stone', stone: 'fire' }]
          }
        ]
      }
    };
    
    return evolutionChains[pokemonId] || null;
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Récupère un Pokémon possédé (simulation)
   */
  private async getOwnedPokemon(ownedPokemonId: string): Promise<any> {
    // TODO: Intégrer avec le vrai modèle OwnedPokemon
    // Pour l'instant, simulation
    return {
      _id: ownedPokemonId,
      pokemonId: 1, // Bulbasaur par exemple
      name: 'Bulbasaur',
      level: 20,
      owner: 'player123',
      friendship: 150,
      save: async () => {} // Mock save method
    };
  }
  
  private isInCooldown(playerId: string): boolean {
    const lastEvolution = this.recentEvolutions.get(playerId);
    if (!lastEvolution) return false;
    
    return (Date.now() - lastEvolution) < this.config.evolutionCooldown;
  }
  
  private markCooldown(playerId: string): void {
    this.recentEvolutions.set(playerId, Date.now());
  }
  
  private cleanupCooldowns(): void {
    const now = Date.now();
    for (const [playerId, timestamp] of this.recentEvolutions.entries()) {
      if ((now - timestamp) > this.config.evolutionCooldown * 2) {
        this.recentEvolutions.delete(playerId);
      }
    }
  }
  
  private createFailureResult(error: string): EvolutionResult {
    return {
      success: false,
      fromPokemon: { id: 0, name: '', level: 0 },
      toPokemon: { id: 0, name: '', level: 0 },
      ownedPokemon: null,
      conditions: { method: 'level' },
      notifications: [],
      achievements: [],
      error
    };
  }
  
  private async generateEvolutionNotifications(
    fromPokemon: any,
    toPokemon: any,
    conditions: EvolutionConditions,
    isNewForm: boolean
  ): Promise<string[]> {
    const notifications: string[] = [];
    
    notifications.push(`🌟 ${fromPokemon.name} a évolué en ${toPokemon.name} !`);
    
    if (conditions.method === 'mega') {
      notifications.push(`💎 Méga-évolution activée avec ${conditions.stone} !`);
    }
    
    if (isNewForm) {
      notifications.push(`📝 Nouvelle forme ajoutée au Pokédx !`);
    }
    
    return notifications;
  }
  
  private async checkEvolutionAchievements(
    playerId: string,
    fromPokemon: any,
    toPokemon: any,
    conditions: EvolutionConditions
  ): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Vérifier les accomplissements d'évolution
    if (conditions.method === 'mega') {
      achievements.push('💎 Accomplissement : Premier Méga-évolution !');
    }
    
    return achievements;
  }
  
  private generateEvolutionRewards(
    fromPokemon: any,
    toPokemon: any,
    conditions: EvolutionConditions
  ): string[] {
    const rewards: string[] = [];
    
    // Récompenses de base
    rewards.push('50 EXP Bonus');
    
    // Récompenses spéciales selon la méthode
    switch (conditions.method) {
      case 'mega':
        rewards.push('Méga-Énergie +10');
        break;
      case 'stone':
        rewards.push('Pierre Fragment');
        break;
      case 'trade':
        rewards.push('Social Bond +1');
        break;
    }
    
    return rewards;
  }
  
  private getAnimationType(method: string): string {
    const animations: { [key: string]: string } = {
      level: 'classic_evolution',
      stone: 'stone_evolution',
      trade: 'trade_evolution',
      friendship: 'friendship_evolution',
      mega: 'mega_evolution',
      special: 'special_evolution'
    };
    
    return animations[method] || 'classic_evolution';
  }
  
  private getAnimationDuration(method: string): number {
    const durations: { [key: string]: number } = {
      level: 3000,
      stone: 4000,
      trade: 5000,
      friendship: 6000,
      mega: 8000,
      special: 10000
    };
    
    return durations[method] || 3000;
  }
  
  private getEvolutionEffects(fromPokemon: any, toPokemon: any): string[] {
    const effects = ['light_burst', 'stat_increase'];
    
    // Effets selon les types
    if (toPokemon.types?.includes('fire')) {
      effects.push('fire_aura');
    }
    if (toPokemon.types?.includes('water')) {
      effects.push('water_splash');
    }
    
    return effects;
  }
  
  private updatePerformanceStats(executionTime: number): void {
    const totalEvolutions = this.performanceStats.successfulEvolutions + this.performanceStats.failedEvolutions;
    this.performanceStats.averageExecutionTime = 
      (this.performanceStats.averageExecutionTime * (totalEvolutions - 1) + executionTime) / totalEvolutions;
  }
  
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [EvolutionService] ${message}`);
    }
  }
  
  // ===== MÉTHODES SPÉCIALES =====
  
  /**
   * Revert une méga-évolution
   */
  private async revertMegaEvolution(ownedPokemonId: string): Promise<boolean> {
    try {
      // TODO: Implémenter la reversion
      this.debugLog(`🔄 Reversion méga-évolution: ${ownedPokemonId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur reversion méga-évolution:', error);
      return false;
    }
  }
  
  /**
   * Pré-charge les chaînes d'évolution communes
   */
  private async preloadEvolutionChains(): Promise<void> {
    const commonPokemon = [1, 4, 7, 25, 133]; // Starters + Pikachu + Eevee
    
    for (const pokemonId of commonPokemon) {
      await this.getEvolutionChain(pokemonId);
    }
    
    this.debugLog(`⚡ ${commonPokemon.length} chaînes d'évolution pré-chargées`);
  }
  
  // ===== API PUBLIQUE AVANCÉE =====
  
  /**
   * Vérifie si un Pokémon peut évoluer
   */
  async canEvolve(ownedPokemonId: string, conditions?: EvolutionConditions): Promise<{
    canEvolve: boolean;
    possibleEvolutions: Array<{ id: number; name: string; conditions: EvolutionConditions[] }>;
    missingConditions?: string[];
  }> {
    try {
      const ownedPokemon = await this.getOwnedPokemon(ownedPokemonId);
      if (!ownedPokemon) {
        return { canEvolve: false, possibleEvolutions: [] };
      }
      
      const evolutionChain = await this.getEvolutionChain(ownedPokemon.pokemonId);
      if (!evolutionChain?.evolvesTo) {
        return { canEvolve: false, possibleEvolutions: [] };
      }
      
      const possibleEvolutions = [];
      const missingConditions = [];
      
      for (const evolution of evolutionChain.evolvesTo) {
        const pokemonData = await getPokemonById(evolution.pokemonId);
        if (pokemonData) {
          possibleEvolutions.push({
            id: evolution.pokemonId,
            name: pokemonData.name,
            conditions: evolution.conditions || []
          });
          
          // Vérifier les conditions si spécifiées
          if (conditions && evolution.conditions) {
            for (const condition of evolution.conditions) {
              if (!await this.isConditionMet(ownedPokemon, condition, conditions)) {
                missingConditions.push(`${pokemonData.name}: ${JSON.stringify(condition)}`);
              }
            }
          }
        }
      }
      
      return {
        canEvolve: possibleEvolutions.length > 0,
        possibleEvolutions,
        missingConditions: missingConditions.length > 0 ? missingConditions : undefined
      };
      
    } catch (error) {
      console.error('❌ Erreur canEvolve:', error);
      return { canEvolve: false, possibleEvolutions: [] };
    }
  }
  
  /**
   * Récupère l'historique d'évolution d'un joueur
   */
  async getEvolutionHistory(playerId: string, limit: number = 10): Promise<Array<{
    date: Date;
    fromPokemon: { id: number; name: string };
    toPokemon: { id: number; name: string };
    method: string;
    location: string;
  }>> {
    // TODO: Implémenter récupération depuis base de données
    return [];
  }
  
  // ===== CONFIGURATION ET MONITORING =====
  
  updateConfig(newConfig: Partial<EvolutionServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog('⚙️ Configuration mise à jour');
  }
  
  getConfig(): EvolutionServiceConfig {
    return { ...this.config };
  }
  
  getServiceStats(): any {
    return {
      ...this.performanceStats,
      cacheSize: {
        evolutionChains: this.evolutionChainCache.size,
        evolutionConditions: this.evolutionConditionsCache.size,
        recentEvolutions: this.recentEvolutions.size
      },
      config: this.config,
      successRate: this.performanceStats.totalEvolutions > 0 ? 
        (this.performanceStats.successfulEvolutions / this.performanceStats.totalEvolutions) * 100 : 0
    };
  }
  
  clearCaches(): void {
    this.evolutionChainCache.clear();
    this.evolutionConditionsCache.clear();
    this.recentEvolutions.clear();
    console.log('🧹 [EvolutionService] Tous les caches nettoyés');
  }
  
  clearPlayerData(playerId: string): void {
    this.recentEvolutions.delete(playerId);
    console.log(`🗑️ [EvolutionService] Données supprimées pour ${playerId}`);
  }
}

// ===== EXPORT SINGLETON =====
export const evolutionService = EvolutionService.getInstance();
export default evolutionService;

// ===== GUIDE D'UTILISATION =====
//
// ===== API SIMPLE =====
// 
// // Évolution basique par niveau
// const success = await evolutionService.evolve(ownedPokemonId);
//
// // Évolution avec pierre
// const success = await evolutionService.evolveWithItem(ownedPokemonId, "thunderstone");
//
// // Évolution par échange
// const success = await evolutionService.evolveByTrade(ownedPokemonId, partnerPlayerId);
//
// ===== API AVANCÉE =====
//
// // Évolution complète avec conditions
// const result = await evolutionService.evolveOwnedPokemon(ownedPokemonId, {
//   method: 'level',
//   minLevel: 16,
//   location: 'Route 1',
//   timeOfDay: 'day'
// });
//
// // Méga-évolution temporaire
// const result = await evolutionService.megaEvolve(ownedPokemonId, 'charizardite-x', 300);
//
// // Vérifier les évolutions possibles
// const check = await evolutionService.canEvolve(ownedPokemonId);
//
// ===== INTÉGRATION AUTOMATIQUE =====
// L'intégration avec le Pokédx se fait automatiquement via PokedxIntegrationService
// Aucune action supplémentaire nécessaire !
//
// ===== ÉVÉNEMENTS =====
// evolutionService.on('pokemonEvolved', (data) => {
//   console.log(`Évolution: ${data.fromPokemonId} → ${data.toPokemonId}`);
// });
