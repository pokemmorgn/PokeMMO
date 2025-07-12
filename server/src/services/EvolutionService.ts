// server/src/services/EvolutionService.ts
import { EventEmitter } from 'events';
import { pokedexIntegrationService } from './PokedexIntegrationService';
import { getPokemonById } from '../data/PokemonData';
import { Types } from 'mongoose';

// ===== TYPES SIMPLIFIÉS =====

export interface EvolutionRequest {
  ownedPokemonId: string;
  method?: 'level' | 'stone' | 'trade' | 'friendship' | 'special';
  item?: string; // Pierre d'évolution, objet échangé, etc.
  location?: string;
  triggeredBy?: string; // ID du joueur pour les échanges
}

export interface EvolutionResult {
  success: boolean;
  fromPokemon: { id: number; name: string; level: number };
  toPokemon: { id: number; name: string; level: number };
  ownedPokemon: any;
  notifications: string[];
  isNewForm?: boolean;
  error?: string;
}

// ===== SERVICE ÉVOLUTION SIMPLIFIÉ =====

export class EvolutionService extends EventEmitter {
  private static instance: EvolutionService;
  
  private config = {
    enableAutoIntegration: true,
    debugMode: false,
    evolutionCooldown: 1000 // 1 seconde
  };
  
  // Cooldown simple par joueur
  private recentEvolutions = new Map<string, number>();
  
  // Stats basiques
  private stats = {
    totalEvolutions: 0,
    successfulEvolutions: 0,
    errors: 0
  };
  
  constructor() {
    super();
    console.log('🌟 [EvolutionService] Service d\'évolution simplifié initialisé');
  }
  
  static getInstance(): EvolutionService {
    if (!EvolutionService.instance) {
      EvolutionService.instance = new EvolutionService();
    }
    return EvolutionService.instance;
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  /**
   * Évolution basique par niveau
   */
  async evolve(ownedPokemonId: string, location: string = 'Evolution'): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon({
        ownedPokemonId,
        method: 'level',
        location
      });
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolve failed:`, error);
      return false;
    }
  }
  
  /**
   * Évolution avec pierre/objet
   */
  async evolveWithItem(ownedPokemonId: string, item: string, location: string = 'Evolution'): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon({
        ownedPokemonId,
        method: 'stone',
        item,
        location
      });
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolveWithItem failed:`, error);
      return false;
    }
  }
  
  /**
   * Évolution par échange
   */
  async evolveByTrade(ownedPokemonId: string, tradePartner: string, location: string = 'Trade'): Promise<boolean> {
    try {
      const result = await this.evolveOwnedPokemon({
        ownedPokemonId,
        method: 'trade',
        location,
        triggeredBy: tradePartner
      });
      return result.success;
    } catch (error) {
      console.error(`❌ [EvolutionService] evolveByTrade failed:`, error);
      return false;
    }
  }

    // Dans EvolutionService.ts
  async getEvolutionHistory(playerId: string, limit: number = 10): Promise<Array<{
    date: Date;
    fromPokemon: { id: number; name: string };
    toPokemon: { id: number; name: string };
    method: string;
    location: string;
  }>> {
    // TODO: Récupérer depuis base de données
    // Pour l'instant, retourner un tableau vide
    return [];
  }
  // ===== MÉTHODE PRINCIPALE =====
  
  /**
   * Évolution principale utilisant les données JSON
   */
  async evolveOwnedPokemon(request: EvolutionRequest): Promise<EvolutionResult> {
    this.stats.totalEvolutions++;
    
    try {
      // Validation de base
      if (!request.ownedPokemonId || !Types.ObjectId.isValid(request.ownedPokemonId)) {
        throw new Error('ID Pokémon invalide');
      }
      
      // Récupérer le Pokémon possédé (simulation pour l'instant)
      const ownedPokemon = await this.getOwnedPokemon(request.ownedPokemonId);
      if (!ownedPokemon) {
        throw new Error('Pokémon possédé introuvable');
      }
      
      const playerId = ownedPokemon.owner;
      
      // Vérifier le cooldown
      if (this.isInCooldown(playerId)) {
        throw new Error('Évolution trop rapide, attendez un peu');
      }
      
      // Récupérer les données du Pokémon depuis le JSON
      const fromPokemonData = await getPokemonById(ownedPokemon.pokemonId);
      if (!fromPokemonData) {
        throw new Error('Données Pokémon source introuvables');
      }
      
      // Vérifier si l'évolution est possible
      if (!fromPokemonData.evolution?.canEvolve) {
        throw new Error('Ce Pokémon ne peut pas évoluer');
      }
      
      const evolution = fromPokemonData.evolution;
      
      // Vérifier les conditions d'évolution
      const canEvolve = this.checkEvolutionConditions(ownedPokemon, evolution, request);
      if (!canEvolve.success) {
        throw new Error(canEvolve.error || 'Conditions d\'évolution non remplies');
      }
      
      // Récupérer les données du Pokémon cible
      const toPokemonData = await getPokemonById(evolution.evolvesInto);
      if (!toPokemonData) {
        throw new Error('Données Pokémon cible introuvables');
      }
      
      // Effectuer la transformation
      const transformedPokemon = await this.performEvolution(ownedPokemon, toPokemonData);
      
      // Marquer le cooldown
      this.markCooldown(playerId);
      
      // Intégration automatique au Pokédx
      let isNewForm = false;
      if (this.config.enableAutoIntegration) {
        try {
          const integrationResult = await pokedexIntegrationService.handlePokemonEvolution({
            playerId,
            fromPokemonId: ownedPokemon.pokemonId,
            toPokemonId: evolution.evolvesInto,
            ownedPokemonId: request.ownedPokemonId,
            location: request.location || 'Evolution',
            method: this.mapMethodToIntegration(request.method || evolution.method),
            triggeredBy: request.triggeredBy
          });
          
          isNewForm = integrationResult.isNewForm || false;
        } catch (integrationError) {
          console.warn('⚠️ Erreur intégration Pokédx:', integrationError);
          // Continue même si l'intégration échoue
        }
      }
      
      // Générer les notifications
      const notifications = this.generateNotifications(fromPokemonData, toPokemonData, isNewForm);
      
      // Créer le résultat
      const result: EvolutionResult = {
        success: true,
        fromPokemon: {
          id: ownedPokemon.pokemonId,
          name: fromPokemonData.name,
          level: ownedPokemon.level
        },
        toPokemon: {
          id: evolution.evolvesInto,
          name: toPokemonData.name,
          level: transformedPokemon.level
        },
        ownedPokemon: transformedPokemon,
        notifications,
        isNewForm
      };
      
      // Émettre l'événement
      this.emit('pokemonEvolved', {
        playerId,
        fromPokemonId: ownedPokemon.pokemonId,
        toPokemonId: evolution.evolvesInto,
        result
      });
      
      this.stats.successfulEvolutions++;
      this.debugLog(`✅ ${fromPokemonData.name} → ${toPokemonData.name}`);
      
      return result;
      
    } catch (error) {
      this.stats.errors++;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [EvolutionService] Erreur évolution:`, error);
      
      return {
        success: false,
        fromPokemon: { id: 0, name: '', level: 0 },
        toPokemon: { id: 0, name: '', level: 0 },
        ownedPokemon: null,
        notifications: [],
        error: errorMessage
      };
    }
  }
  
  // ===== LOGIQUE D'ÉVOLUTION =====
  
  /**
   * Vérifie les conditions d'évolution basées sur les données JSON
   */
  private checkEvolutionConditions(
    ownedPokemon: any,
    evolution: any,
    request: EvolutionRequest
  ): { success: boolean; error?: string } {
    
    // Vérification par méthode d'évolution
    switch (evolution.method) {
      case 'level':
        if (typeof evolution.requirement === 'number') {
          if (ownedPokemon.level < evolution.requirement) {
            return { 
              success: false, 
              error: `Niveau ${evolution.requirement} requis (actuellement ${ownedPokemon.level})` 
            };
          }
        }
        break;
        
      case 'stone':
        if (!request.item) {
          return { success: false, error: 'Pierre d\'évolution requise' };
        }
        // TODO: Vérifier le type de pierre selon le Pokémon
        break;
        
      case 'trade':
        if (request.method !== 'trade') {
          return { success: false, error: 'Échange requis pour cette évolution' };
        }
        if (!request.triggeredBy) {
          return { success: false, error: 'Partenaire d\'échange requis' };
        }
        break;
        
      case 'friendship':
        if (!ownedPokemon.friendship || ownedPokemon.friendship < 220) {
          return { success: false, error: 'Niveau d\'amitié insuffisant' };
        }
        break;
        
      default:
        // Évolutions spéciales
        break;
    }
    
    return { success: true };
  }
  
  /**
   * Effectue la transformation du Pokémon
   */
  private async performEvolution(ownedPokemon: any, toPokemonData: any): Promise<any> {
    try {
      // Sauvegarder les données importantes
      const originalLevel = ownedPokemon.level;
      const originalExp = ownedPokemon.experience;
      const originalStats = ownedPokemon.stats;
      
      // Transformation
      ownedPokemon.pokemonId = toPokemonData.id;
      ownedPokemon.name = toPokemonData.name;
      
      // Recalculer les stats avec les nouvelles stats de base
      if (toPokemonData.baseStats && originalStats) {
        // TODO: Recalculer les stats selon la formule Pokémon
        // Pour l'instant, on garde les mêmes stats relatives
      }
      
      // Conserver le niveau et l'expérience
      ownedPokemon.level = originalLevel;
      ownedPokemon.experience = originalExp;
      
      // TODO: Sauvegarder en base de données
      // await ownedPokemon.save();
      
      return ownedPokemon;
      
    } catch (error) {
      console.error('❌ Erreur transformation Pokémon:', error);
      throw error;
    }
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Map les méthodes vers le format du service d'intégration
   */
  private mapMethodToIntegration(method: string): 'level' | 'stone' | 'trade' | 'friendship' | 'special' {
    switch (method) {
      case 'level': return 'level';
      case 'stone': return 'stone';
      case 'trade': return 'trade';
      case 'friendship': return 'friendship';
      default: return 'special';
    }
  }
  
  /**
   * Génère les notifications d'évolution
   */
  private generateNotifications(fromPokemon: any, toPokemon: any, isNewForm: boolean): string[] {
    const notifications = [
      `🌟 ${fromPokemon.name} a évolué en ${toPokemon.name} !`
    ];
    
    if (isNewForm) {
      notifications.push('📝 Nouvelle forme ajoutée au Pokédx !');
    }
    
    return notifications;
  }
  
  /**
   * Récupère un Pokémon possédé (simulation)
   */
  private async getOwnedPokemon(ownedPokemonId: string): Promise<any> {
    // TODO: Remplacer par la vraie requête à la base de données
    // Pour l'instant, simulation
    return {
      _id: ownedPokemonId,
      pokemonId: 1, // Bulbasaur par exemple
      name: 'Bulbasaur',
      level: 20,
      owner: 'player123',
      friendship: 150,
      experience: 8000,
      stats: {
        hp: 45,
        attack: 49,
        defense: 49,
        specialAttack: 65,
        specialDefense: 65,
        speed: 45
      }
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
  
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [EvolutionService] ${message}`);
    }
  }
  
  // ===== API PUBLIQUE UTILITAIRE =====
  
  /**
   * Vérifie si un Pokémon peut évoluer
   */
  async canEvolve(ownedPokemonId: string): Promise<{
    canEvolve: boolean;
    evolutionData?: any;
    missingRequirements?: string[];
  }> {
    try {
      const ownedPokemon = await this.getOwnedPokemon(ownedPokemonId);
      if (!ownedPokemon) {
        return { canEvolve: false };
      }
      
      const pokemonData = await getPokemonById(ownedPokemon.pokemonId);
      if (!pokemonData?.evolution?.canEvolve) {
        return { canEvolve: false };
      }
      
      const evolution = pokemonData.evolution;
      const requirements: string[] = [];
      
      // Vérifier les conditions
      switch (evolution.method) {
        case 'level':
          if (typeof evolution.requirement === 'number' && ownedPokemon.level < evolution.requirement) {
            requirements.push(`Atteindre le niveau ${evolution.requirement}`);
          }
          break;
        case 'stone':
          requirements.push('Utiliser une pierre d\'évolution');
          break;
        case 'trade':
          requirements.push('Échanger avec un autre joueur');
          break;
        case 'friendship':
          if (!ownedPokemon.friendship || ownedPokemon.friendship < 220) {
            requirements.push('Augmenter le niveau d\'amitié');
          }
          break;
      }
      
      return {
        canEvolve: requirements.length === 0,
        evolutionData: evolution,
        missingRequirements: requirements.length > 0 ? requirements : undefined
      };
      
    } catch (error) {
      console.error('❌ Erreur canEvolve:', error);
      return { canEvolve: false };
    }
  }
  
  /**
   * Récupère les statistiques du service
   */
  getServiceStats(): any {
    return {
      ...this.stats,
      recentEvolutions: this.recentEvolutions.size,
      successRate: this.stats.totalEvolutions > 0 ? 
        (this.stats.successfulEvolutions / this.stats.totalEvolutions) * 100 : 0
    };
  }
  
  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [EvolutionService] Configuration mise à jour');
  }
  
  /**
   * Nettoie les données d'un joueur
   */
  clearPlayerData(playerId: string): void {
    this.recentEvolutions.delete(playerId);
  }
}

// ===== EXPORT SINGLETON =====
export const evolutionService = EvolutionService.getInstance();
export default evolutionService;

// ===== GUIDE D'UTILISATION SIMPLIFIÉ =====
//
// // Évolution basique
// const success = await evolutionService.evolve(ownedPokemonId);
//
// // Évolution avec pierre
// const success = await evolutionService.evolveWithItem(ownedPokemonId, "fire_stone");
//
// // Évolution par échange
// const success = await evolutionService.evolveByTrade(ownedPokemonId, partnerPlayerId);
//
// // Vérifier si peut évoluer
// const check = await evolutionService.canEvolve(ownedPokemonId);
// if (check.canEvolve) {
//   console.log("Peut évoluer !");
// } else {
//   console.log("Conditions manquantes:", check.missingRequirements);
// }
//
// // Écouter les évolutions
// evolutionService.on('pokemonEvolved', (data) => {
//   console.log(`Évolution: ${data.fromPokemonId} → ${data.toPokemonId}`);
// });
