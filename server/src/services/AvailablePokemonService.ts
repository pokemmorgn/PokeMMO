// server/src/services/AvailablePokemonService.ts - Service pour gérer les Pokémon disponibles

import { PokemonData, IPokemonData } from '../models/PokemonData';
import { EventEmitter } from 'events';

/**
 * 🆕 NOUVEAU : Service centralisé pour gérer les Pokémon disponibles sur le serveur
 * 
 * Ce service remplace l'ancien système basé sur des fichiers JSON statiques
 * et utilise directement la base MongoDB pour déterminer quels Pokémon
 * sont disponibles pour les joueurs.
 */
export class AvailablePokemonService extends EventEmitter {
  private static instance: AvailablePokemonService;
  
  // Cache des Pokémon disponibles
  private cachedAvailableIds: number[] = [];
  private cachedAvailablePokemon: IPokemonData[] = [];
  private cacheTimestamp: number = 0;
  
  // Configuration du cache
  private readonly CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  
  // Statistiques du service
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    lastUpdate: new Date(),
    errors: 0
  };
  
  constructor() {
    super();
    console.log('🎮 [AvailablePokemonService] Service initialisé');
    this.initializeService();
  }
  
  /**
   * Singleton pattern
   */
  static getInstance(): AvailablePokemonService {
    if (!AvailablePokemonService.instance) {
      AvailablePokemonService.instance = new AvailablePokemonService();
    }
    return AvailablePokemonService.instance;
  }
  
  /**
   * Initialise le service
   */
  private initializeService(): void {
    // Pré-charger les données au démarrage
    this.refreshCache().catch(error => {
      console.error('❌ [AvailablePokemonService] Erreur initialisation:', error);
    });
    
    // Actualisation périodique du cache
    setInterval(() => {
      this.refreshCache().catch(error => {
        console.error('❌ [AvailablePokemonService] Erreur refresh auto:', error);
      });
    }, this.CACHE_EXPIRY);
    
    // Écouter les changements dans la base de données
    this.setupDatabaseListeners();
  }
  
  /**
   * Configure les listeners pour les changements dans la DB
   */
  private setupDatabaseListeners(): void {
    // TODO: Implémenter avec MongoDB Change Streams si nécessaire
    // Pour l'instant, on se base sur l'actualisation périodique
  }
  
  // ===== API PUBLIQUE =====
  
  /**
   * Récupère la liste des IDs de Pokémon disponibles
   */
  async getAvailablePokemonIds(): Promise<number[]> {
    this.stats.totalRequests++;
    
    if (this.isCacheValid()) {
      this.stats.cacheHits++;
      return [...this.cachedAvailableIds]; // Retourner une copie
    }
    
    this.stats.cacheMisses++;
    await this.refreshCache();
    return [...this.cachedAvailableIds];
  }
  
  /**
   * Récupère la liste complète des Pokémon disponibles
   */
  async getAvailablePokemon(): Promise<IPokemonData[]> {
    this.stats.totalRequests++;
    
    if (this.isCacheValid()) {
      this.stats.cacheHits++;
      return [...this.cachedAvailablePokemon]; // Retourner une copie
    }
    
    this.stats.cacheMisses++;
    await this.refreshCache();
    return [...this.cachedAvailablePokemon];
  }
  
  /**
   * Récupère le nombre total de Pokémon disponibles
   */
  async getTotalAvailable(): Promise<number> {
    const ids = await this.getAvailablePokemonIds();
    return ids.length;
  }
  
  /**
   * Vérifie si un Pokémon spécifique est disponible
   */
  async isPokemonAvailable(pokemonId: number): Promise<boolean> {
    const availableIds = await this.getAvailablePokemonIds();
    return availableIds.includes(pokemonId);
  }
  
  /**
   * Récupère les Pokémon disponibles par génération
   */
  async getAvailablePokemonByGeneration(generation: number): Promise<IPokemonData[]> {
    try {
      const pokemon = await PokemonData.findByGeneration(generation);
      return pokemon.filter(p => p.isActive && p.isObtainable);
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur getByGeneration:`, error);
      return [];
    }
  }
  
  /**
   * Récupère les Pokémon disponibles par région
   */
  async getAvailablePokemonByRegion(region: string): Promise<IPokemonData[]> {
    try {
      const pokemon = await PokemonData.findByRegion(region as any);
      return pokemon.filter(p => p.isActive && p.isObtainable);
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur getByRegion:`, error);
      return [];
    }
  }
  
  /**
   * Récupère les Pokémon disponibles par type
   */
  async getAvailablePokemonByType(types: string[]): Promise<IPokemonData[]> {
    try {
      const pokemon = await PokemonData.findByType(types as any);
      return pokemon.filter(p => p.isActive && p.isObtainable);
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur getByType:`, error);
      return [];
    }
  }
  
  /**
   * Récupère les Pokémon légendaires/mythiques disponibles
   */
  async getAvailableLegendaries(): Promise<IPokemonData[]> {
    try {
      const pokemon = await PokemonData.findLegendaries();
      return pokemon.filter(p => p.isActive && p.isObtainable);
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur getLegendaries:`, error);
      return [];
    }
  }
  
  /**
   * Récupère les Pokémon starter disponibles
   */
  async getAvailableStarters(): Promise<IPokemonData[]> {
    try {
      const pokemon = await PokemonData.findStarters();
      return pokemon.filter(p => p.isActive && p.isObtainable);
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur getStarters:`, error);
      return [];
    }
  }
  
  /**
   * Recherche de Pokémon avec filtres avancés
   */
  async searchAvailablePokemon(filters: {
    nameQuery?: string;
    types?: string[];
    generation?: number;
    region?: string;
    category?: string;
    minLevel?: number;
    maxLevel?: number;
    sortBy?: 'id' | 'name' | 'type' | 'generation';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }): Promise<IPokemonData[]> {
    try {
      const query: any = {
        isActive: true,
        isObtainable: true
      };
      
      // Filtres de recherche
      if (filters.nameQuery) {
        query.$or = [
          { nameKey: { $regex: filters.nameQuery, $options: 'i' } },
          { nationalDex: isNaN(parseInt(filters.nameQuery)) ? -1 : parseInt(filters.nameQuery) }
        ];
      }
      
      if (filters.types?.length) {
        query.types = { $in: filters.types };
      }
      
      if (filters.generation) {
        query.generation = filters.generation;
      }
      
      if (filters.region) {
        query.region = filters.region;
      }
      
      if (filters.category) {
        query.category = filters.category;
      }
      
      // Construction du tri
      let sort: any = { nationalDex: 1 }; // Tri par défaut
      if (filters.sortBy) {
        const order = filters.sortOrder === 'desc' ? -1 : 1;
        switch (filters.sortBy) {
          case 'id':
            sort = { nationalDex: order };
            break;
          case 'name':
            sort = { nameKey: order };
            break;
          case 'generation':
            sort = { generation: order, nationalDex: order };
            break;
          default:
            sort = { nationalDex: order };
        }
      }
      
      // Exécution de la requête
      let queryBuilder = PokemonData.find(query).sort(sort);
      
      if (filters.limit && filters.limit > 0) {
        queryBuilder = queryBuilder.limit(Math.min(filters.limit, 500)); // Limite de sécurité
      }
      
      return await queryBuilder.lean();
      
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur search:`, error);
      return [];
    }
  }
  
  // ===== GESTION DU CACHE =====
  
  /**
   * Vérifie si le cache est encore valide
   */
  private isCacheValid(): boolean {
    return this.cachedAvailableIds.length > 0 && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_EXPIRY;
  }
  
  /**
   * Actualise le cache depuis la base de données
   */
  async refreshCache(): Promise<void> {
    try {
      console.log('🔄 [AvailablePokemonService] Actualisation du cache...');
      
      const startTime = Date.now();
      
      // Récupérer tous les Pokémon disponibles
      const availablePokemon = await PokemonData.find({
        isActive: true,
        isObtainable: true
      }).sort({ nationalDex: 1 }).lean();
      
      // Mettre à jour le cache
      this.cachedAvailablePokemon = availablePokemon;
      this.cachedAvailableIds = availablePokemon.map(p => p.nationalDex);
      this.cacheTimestamp = Date.now();
      this.stats.lastUpdate = new Date();
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [AvailablePokemonService] Cache actualisé: ${this.cachedAvailableIds.length} Pokémon disponibles (${executionTime}ms)`);
      
      // Émettre un événement pour notifier les autres services
      this.emit('cacheUpdated', {
        totalAvailable: this.cachedAvailableIds.length,
        availableIds: [...this.cachedAvailableIds],
        executionTime
      });
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ [AvailablePokemonService] Erreur actualisation cache:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Vide le cache (force un rechargement)
   */
  clearCache(): void {
    this.cachedAvailableIds = [];
    this.cachedAvailablePokemon = [];
    this.cacheTimestamp = 0;
    console.log('🧹 [AvailablePokemonService] Cache vidé');
    this.emit('cacheCleared');
  }
  
  // ===== ADMINISTRATION =====
  
  /**
   * Active ou désactive un Pokémon
   */
  async setPokemonAvailability(pokemonId: number, isAvailable: boolean): Promise<boolean> {
    try {
      const pokemon = await PokemonData.findByNationalDex(pokemonId);
      if (!pokemon) {
        console.warn(`⚠️ [AvailablePokemonService] Pokémon #${pokemonId} non trouvé`);
        return false;
      }
      
      pokemon.isActive = isAvailable;
      pokemon.isObtainable = isAvailable;
      await pokemon.save();
      
      // Actualiser le cache
      await this.refreshCache();
      
      console.log(`🔄 [AvailablePokemonService] Pokémon #${pokemonId} ${isAvailable ? 'activé' : 'désactivé'}`);
      
      this.emit('pokemonAvailabilityChanged', {
        pokemonId,
        isAvailable,
        pokemonName: pokemon.nameKey
      });
      
      return true;
    } catch (error) {
      console.error(`❌ [AvailablePokemonService] Erreur setPokemonAvailability:`, error);
      return false;
    }
  }
  
  /**
   * Active/désactive des Pokémon en lot
   */
  async setBulkPokemonAvailability(pokemonIds: number[], isAvailable: boolean): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const pokemonId of pokemonIds) {
      try {
        const success = await this.setPokemonAvailability(pokemonId, isAvailable);
        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Pokémon #${pokemonId} non trouvé`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Pokémon #${pokemonId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    console.log(`📊 [AvailablePokemonService] Mise à jour en lot: ${result.success} succès, ${result.failed} échecs`);
    
    return result;
  }
  
  /**
   * Récupère les statistiques du service
   */
  getStats(): any {
    return {
      ...this.stats,
      cache: {
        isValid: this.isCacheValid(),
        size: this.cachedAvailableIds.length,
        lastUpdate: new Date(this.cacheTimestamp),
        memoryUsage: {
          ids: this.cachedAvailableIds.length * 4, // bytes approximatifs
          pokemon: this.cachedAvailablePokemon.length * 1000 // bytes approximatifs
        }
      },
      config: {
        cacheExpiry: this.CACHE_EXPIRY,
        maxCacheSize: this.MAX_CACHE_SIZE
      }
    };
  }
  
  /**
   * Réinitialise les statistiques
   */
  resetStats(): void {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      lastUpdate: new Date(),
      errors: 0
    };
    console.log('📊 [AvailablePokemonService] Statistiques réinitialisées');
  }
  
  /**
   * Validation de l'intégrité des données
   */
  async validateData(): Promise<{
    isValid: boolean;
    issues: string[];
    totalChecked: number;
  }> {
    const result = {
      isValid: true,
      issues: [] as string[],
      totalChecked: 0
    };
    
    try {
      const allPokemon = await PokemonData.find({}).lean();
      result.totalChecked = allPokemon.length;
      
      for (const pokemon of allPokemon) {
        // Vérifier les champs obligatoires
        if (!pokemon.nationalDex || pokemon.nationalDex < 1) {
          result.issues.push(`Pokémon ${pokemon._id}: nationalDex invalide`);
          result.isValid = false;
        }
        
        if (!pokemon.nameKey || pokemon.nameKey.trim().length === 0) {
          result.issues.push(`Pokémon #${pokemon.nationalDex}: nameKey manquant`);
          result.isValid = false;
        }
        
        if (!pokemon.types || pokemon.types.length === 0) {
          result.issues.push(`Pokémon #${pokemon.nationalDex}: types manquants`);
          result.isValid = false;
        }
        
        if (!pokemon.baseStats) {
          result.issues.push(`Pokémon #${pokemon.nationalDex}: baseStats manquantes`);
          result.isValid = false;
        }
      }
      
      console.log(`🔍 [AvailablePokemonService] Validation: ${result.totalChecked} Pokémon vérifiés, ${result.issues.length} problèmes trouvés`);
      
    } catch (error) {
      result.isValid = false;
      result.issues.push(`Erreur de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    return result;
  }
}

// ===== EXPORT SINGLETON =====
export const availablePokemonService = AvailablePokemonService.getInstance();
export default availablePokemonService;

// ===== EXPORT DES TYPES =====
export interface PokemonSearchFilters {
  nameQuery?: string;
  types?: string[];
  generation?: number;
  region?: string;
  category?: string;
  minLevel?: number;
  maxLevel?: number;
  sortBy?: 'id' | 'name' | 'type' | 'generation';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}
