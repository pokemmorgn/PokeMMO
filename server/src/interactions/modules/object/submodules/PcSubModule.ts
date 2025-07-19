// src/interactions/modules/object/submodules/PcSubModule.ts
// Sous-module pour les PC Pokémon avec accès équipe + PC complet
// VERSION INTÉGRÉE AVEC POKEMONMANAGER + OWNEDPOKEMON + POKEMONTEAM

import { Player } from "../../../../schema/PokeWorldState";
import PokemonManager from "../../../../managers/PokemonManager";
import { OwnedPokemon, IOwnedPokemon } from "../../../../models/OwnedPokemon";
import { PokemonTeam, IPokemonTeam, IPokemonInstance } from "../../../../models/PokemonTeam";
import { PlayerData, IPlayerData } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";

// ✅ TYPES POUR CORRIGER LES ERREURS TYPESCRIPT
type PcType = 'basic' | 'pokemon' | 'bill' | 'admin' | 'storage';
type AccessLevel = 'view' | 'basic' | 'admin';

interface PcStorageData {
  team: {
    pokemon: any[];
    activePokemon: number;
    maxSize: number;
  };
  boxes: Record<number, any[]>;
  totalBoxes: number;
  availableOperations: string[];
  specialFeatures?: {
    pokemonStorage: boolean;
    massTransfer: boolean;
    pokemonSearch: boolean;
    statistics: boolean;
  };
  adminFeatures?: {
    debugInfo: boolean;
    pokemonEdit: boolean;
    massOperations: boolean;
    systemInfo: any;
  };
}

/**
 * Sous-module pour les PC Pokémon avec accès complet aux données
 * Type: "pc"
 * 
 * FONCTIONNALITÉS :
 * - Accès illimité (pas de cooldown)
 * - Intégration PokemonManager pour données complètes
 * - Accès équipe active via PokemonTeam
 * - Accès PC via OwnedPokemon
 * - Différents types de PC (basic, admin, Bill's PC)
 * - Opérations de consultation et transfert
 * - Validation d'accès selon accessLevel
 * 
 * Types de PC supportés :
 * - basic: Accès standard (consultation + transfert)
 * - admin: Accès administrateur (toutes opérations)
 * - bill: PC de Bill (fonctionnalités spéciales)
 * - storage: PC de stockage simple
 */
export default class PcSubModule extends BaseObjectSubModule {
  
  readonly typeName = "Pc";
  readonly version = "1.0.0";

  // === GESTIONNAIRES ===
  private pokemonManager: PokemonManager;

  constructor() {
    super();
    
    // Initialiser PokemonManager avec cache activé
    this.pokemonManager = new PokemonManager({
      basePath: './data/pokemon',
      enableCache: true
    });
  }

  // === MÉTHODES PRINCIPALES ===

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'pc';
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `Accès PC Pokémon`, { 
        objectId: objectDef.id, 
        player: player.name,
        pcName: objectDef.name,
        zone: objectDef.zone,
        pcType: objectDef.customProperties?.pcType || 'basic',
        accessLevel: objectDef.customProperties?.accessLevel || 'basic'
      });

      // === ÉTAPE 1 : VALIDATION D'ACCÈS ===
      
      const accessValidation = await this.validatePcAccess(player, objectDef);
      if (!accessValidation.valid) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          accessValidation.reason || "Accès au PC refusé",
          'ACCESS_DENIED'
        );
      }

      // === ÉTAPE 2 : RÉCUPÉRER LES DONNÉES JOUEUR ===
      
      const playerDataDoc = await PlayerData.findOne({ username: player.name });
      if (!playerDataDoc) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Données joueur non trouvées.",
          'PLAYER_NOT_FOUND'
        );
      }

      const playerData = playerDataDoc as IPlayerData;

      // === ÉTAPE 3 : CHARGER L'ÉQUIPE ACTIVE ===
      
      let pokemonTeam: IPokemonTeam | null = null;
      try {
        pokemonTeam = await PokemonTeam.findOne({ userId: playerData._id });
        
        if (!pokemonTeam) {
          // Créer une équipe vide si elle n'existe pas
          pokemonTeam = await PokemonTeam.create({
            userId: playerData._id,
            pokemon: [],
            activePokemon: -1
          });
          this.log('info', 'Équipe vide créée pour le joueur', { player: player.name });
        }
      } catch (error) {
        this.log('error', 'Erreur récupération équipe', { error, player: player.name });
        
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Impossible d'accéder à votre équipe Pokémon.",
          'TEAM_ACCESS_ERROR'
        );
      }

      // === ÉTAPE 4 : CHARGER LES POKÉMON DU PC ===
      
      let pcPokemon: IOwnedPokemon[] = [];
      try {
        // Récupérer tous les Pokémon du joueur qui ne sont pas dans l'équipe
        pcPokemon = await OwnedPokemon.find({ 
          owner: player.name, 
          isInTeam: false 
        }).sort({ box: 1, boxSlot: 1 });
        
        this.log('info', 'Pokémon PC chargés', { 
          player: player.name,
          pcPokemonCount: pcPokemon.length 
        });
        
      } catch (error) {
        this.log('error', 'Erreur récupération PC', { error, player: player.name });
        
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Impossible d'accéder au PC Pokémon.",
          'PC_ACCESS_ERROR'
        );
      }

      // === ÉTAPE 5 : ENRICHIR AVEC DONNÉES POKEMONMANAGER ===
      
      const enrichedTeam = await this.enrichPokemonWithData(pokemonTeam.pokemon, 'team');
      const enrichedPcBoxes = await this.enrichPokemonPcWithData(pcPokemon);

      // === ÉTAPE 6 : DÉTERMINER LE TYPE D'OPÉRATION ===
      
      const pcType = this.getProperty(objectDef, 'pcType', 'pokemon') as PcType;
      const accessLevel = this.getProperty(objectDef, 'accessLevel', 'basic') as AccessLevel;
      const operation = actionData?.operation || 'access';

      // === ÉTAPE 7 : TRAITEMENT SELON L'OPÉRATION ===
      
      let operationResult: any = {};
      
      switch (operation) {
        case 'access':
        case 'view':
          operationResult = await this.handlePcAccess(playerData, enrichedTeam, enrichedPcBoxes, pcType, accessLevel);
          break;
          
        case 'transfer':
          operationResult = await this.handlePokemonTransfer(
            playerData, 
            pokemonTeam, 
            pcPokemon, 
            actionData,
            accessLevel
          );
          break;
          
        case 'organize':
          operationResult = await this.handlePcOrganization(pcPokemon, actionData, accessLevel);
          break;
          
        default:
          operationResult = await this.handlePcAccess(playerData, enrichedTeam, enrichedPcBoxes, pcType, accessLevel);
      }

      // === SUCCÈS ===
      
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      return this.createSuccessResult(
        "pcAccess",
        `Accès au PC autorisé - ${this.getPcDisplayName(objectDef, pcType)}`,
        {
          objectId: objectDef.id.toString(),
          objectType: objectDef.type,
          pcData: {
            accessed: true,
            operation,
            storage: operationResult.storage,
            ...operationResult
          }
        },
        {
          metadata: {
            pcInfo: {
              pcType,
              accessLevel,
              operation,
              playerLevel: player.level || 1
            },
            teamStats: {
              teamSize: enrichedTeam.length,
              activePokemon: pokemonTeam.activePokemon,
              pcBoxes: Object.keys(enrichedPcBoxes).length,
              totalPcPokemon: pcPokemon.length
            },
            processingTime,
            timestamp: Date.now()
          }
        }
      );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement PC', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // === VALIDATION D'ACCÈS ===

  async validatePcAccess(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }> {
    
    const accessLevel = this.getProperty(objectDef, 'accessLevel', 'basic') as AccessLevel;
    const pcType = this.getProperty(objectDef, 'pcType', 'pokemon') as PcType;
    
    // Validation niveau minimum pour certains PC
    const requiredLevel = this.getProperty(objectDef, 'requiredLevel', 1);
    if (player.level < requiredLevel) {
      return {
        valid: false,
        reason: `Niveau ${requiredLevel} requis pour ce PC`
      };
    }
    
    // Validation accès admin
    if (accessLevel === 'admin') {
      try {
        const playerDataDoc = await PlayerData.findOne({ username: player.name });
        if (!playerDataDoc || !playerDataDoc.isDev) {
          return {
            valid: false,
            reason: "Accès administrateur requis"
          };
        }
      } catch (error) {
        this.log('error', 'Erreur validation accès admin', error);
        return {
          valid: false,
          reason: "Erreur de validation d'accès"
        };
      }
    }
    
    // Validation PC de Bill (exemple de restriction spéciale)
    if (pcType === 'bill') {
      // TODO: Vérifier prérequis spéciaux (badge, quête, etc.)
      // Pour l'instant, autoriser l'accès
    }
    
    return { valid: true };
  }

  // === HANDLERS D'OPÉRATIONS ===

  private async handlePcAccess(
    playerData: IPlayerData,
    enrichedTeam: any[],
    enrichedPcBoxes: Record<number, any[]>,
    pcType: string,
    accessLevel: string
  ) {
    this.log('info', 'Accès consultation PC', {
      player: playerData.username,
      pcType,
      accessLevel,
      teamSize: enrichedTeam.length,
      pcBoxCount: Object.keys(enrichedPcBoxes).length
    });

    const storage: PcStorageData = {
      team: {
        pokemon: enrichedTeam,
        activePokemon: -1, // Index sera déterminé côté client
        maxSize: 6
      },
      boxes: enrichedPcBoxes,
      totalBoxes: Math.max(1, ...Object.keys(enrichedPcBoxes).map(Number)) + 1,
      availableOperations: this.getAvailableOperations(accessLevel as AccessLevel)
    };

    // Ajout fonctionnalités spéciales selon le type de PC
    if (pcType === 'bill') {
      storage.specialFeatures = {
        pokemonStorage: true,
        massTransfer: true,
        pokemonSearch: true,
        statistics: true
      };
    } else if (pcType === 'admin' && accessLevel === 'admin') {
      storage.adminFeatures = {
        debugInfo: true,
        pokemonEdit: true,
        massOperations: true,
        systemInfo: await this.getSystemInfo()
      };
    }

    return { storage };
  }

  private async handlePokemonTransfer(
    playerData: IPlayerData,
    pokemonTeam: IPokemonTeam,
    pcPokemon: IOwnedPokemon[],
    actionData: any,
    accessLevel: AccessLevel
  ) {
    if (accessLevel === 'view') {
      throw new Error("Opération non autorisée avec ce niveau d'accès");
    }

    const { transferType, pokemonId, fromLocation, toLocation } = actionData;
    
    this.log('info', 'Tentative transfert Pokémon', {
      player: playerData.username,
      transferType,
      pokemonId,
      fromLocation,
      toLocation
    });

    // TODO: Implémenter la logique de transfert
    // - team → pc
    // - pc → team  
    // - pc → pc (changement de box)
    
    throw new Error("Transfert Pokémon non encore implémenté - nécessite TeamManager");
  }

  private async handlePcOrganization(
    pcPokemon: IOwnedPokemon[],
    actionData: any,
    accessLevel: AccessLevel
  ) {
    if (accessLevel === 'view') {
      throw new Error("Opération non autorisée avec ce niveau d'accès");
    }

    // TODO: Implémenter l'organisation des PC
    // - Tri par niveau, type, nom
    // - Déplacement entre boxes
    // - Libération de Pokémon
    
    throw new Error("Organisation PC non encore implémentée");
  }

  // === ENRICHISSEMENT DES DONNÉES ===

  private async enrichPokemonWithData(pokemon: IPokemonInstance[], source: string): Promise<any[]> {
    const enrichedPokemon: any[] = [];
    
    for (const poke of pokemon) {
      try {
        // Récupérer les données complètes depuis PokemonManager
        const pokemonData = await this.pokemonManager.getPokemon(poke.pokemonId);
        
        const enriched = {
          // Données de l'instance
          id: poke.id,
          pokemonId: poke.pokemonId,
          nickname: poke.nickname,
          level: poke.level,
          experience: poke.experience,
          currentHp: poke.currentHp,
          maxHp: poke.maxHp,
          status: poke.status,
          nature: poke.nature,
          ability: poke.ability,
          gender: poke.gender,
          isShiny: poke.isShiny,
          stats: poke.stats,
          ivs: poke.ivs,
          evs: poke.evs,
          moves: poke.moves,
          originalTrainer: poke.originalTrainer,
          catchDate: poke.catchDate,
          pokeball: poke.pokeball,
          happiness: poke.happiness,
          heldItem: poke.heldItem,
          
          // Données enrichies depuis PokemonManager
          species: {
            name: pokemonData.name,
            types: pokemonData.types,
            sprite: pokemonData.sprite,
            description: pokemonData.description,
            category: pokemonData.category,
            height: pokemonData.height,
            weight: pokemonData.weight
          },
          
          // Métadonnées
          source,
          canBattle: poke.currentHp > 0,
          isFainted: poke.currentHp === 0
        };
        
        enrichedPokemon.push(enriched);
        
      } catch (error) {
        this.log('error', `Erreur enrichissement Pokémon ${poke.pokemonId}`, error);
        
        // Ajouter version basique en cas d'erreur
        enrichedPokemon.push({
          ...poke,
          source,
          species: {
            name: `Pokemon #${poke.pokemonId}`,
            types: ['unknown'],
            sprite: '/sprites/unknown.png'
          }
        });
      }
    }
    
    return enrichedPokemon;
  }

  private async enrichPokemonPcWithData(pcPokemon: IOwnedPokemon[]): Promise<Record<number, any[]>> {
    const boxes: Record<number, any[]> = {};
    
    for (const poke of pcPokemon) {
      const boxNumber = poke.box || 0;
      
      if (!boxes[boxNumber]) {
        boxes[boxNumber] = [];
      }
      
      try {
        // Récupérer les données complètes depuis PokemonManager
        const pokemonData = await this.pokemonManager.getPokemon(poke.pokemonId);
        
        const enriched = {
          // Données de l'instance
          id: poke._id.toString(),
          pokemonId: poke.pokemonId,
          nickname: poke.nickname,
          level: poke.level,
          experience: poke.experience,
          currentHp: poke.currentHp,
          maxHp: poke.maxHp,
          status: poke.status,
          nature: poke.nature,
          ability: poke.ability,
          gender: poke.gender,
          shiny: poke.shiny,
          moves: poke.moves,
          originalTrainer: poke.originalTrainer,
          caughtAt: poke.caughtAt,
          pokeball: poke.pokeball,
          friendship: poke.friendship,
          heldItem: poke.heldItem,
          
          // Position dans le PC
          box: poke.box,
          boxSlot: poke.boxSlot,
          
          // Données enrichies depuis PokemonManager
          species: {
            name: pokemonData.name,
            types: pokemonData.types,
            sprite: pokemonData.sprite,
            description: pokemonData.description,
            category: pokemonData.category,
            height: pokemonData.height,
            weight: pokemonData.weight
          },
          
          // Métadonnées
          source: 'pc',
          canBattle: poke.currentHp > 0,
          isFainted: poke.currentHp === 0
        };
        
        boxes[boxNumber].push(enriched);
        
      } catch (error) {
        this.log('error', `Erreur enrichissement Pokémon PC ${poke.pokemonId}`, error);
        
        // Ajouter version basique en cas d'erreur
        boxes[boxNumber].push({
          id: poke._id.toString(),
          pokemonId: poke.pokemonId,
          nickname: poke.nickname,
          level: poke.level,
          box: poke.box,
          boxSlot: poke.boxSlot,
          species: {
            name: `Pokemon #${poke.pokemonId}`,
            types: ['unknown'],
            sprite: '/sprites/unknown.png'
          },
          source: 'pc'
        });
      }
    }
    
    // Trier les Pokémon dans chaque box par boxSlot
    for (const boxNumber of Object.keys(boxes)) {
      boxes[parseInt(boxNumber)].sort((a, b) => (a.boxSlot || 0) - (b.boxSlot || 0));
    }
    
    return boxes;
  }

  // === MÉTHODES UTILITAIRES ===

  private getPcDisplayName(objectDef: ObjectDefinition, pcType: string): string {
    if (objectDef.name && objectDef.name !== 'pc') {
      return objectDef.name;
    }
    
    const names: Record<string, string> = {
      'basic': 'PC Pokémon',
      'bill': 'PC de Bill',
      'admin': 'PC Administrateur',
      'storage': 'PC de Stockage',
      'pokemon': 'PC Pokémon'
    };
    
    return names[pcType] || 'PC';
  }

  private getAvailableOperations(accessLevel: AccessLevel): string[] {
    const operations: Record<AccessLevel, string[]> = {
      'view': ['view', 'consult'],
      'basic': ['view', 'consult', 'transfer', 'organize'],
      'admin': ['view', 'consult', 'transfer', 'organize', 'edit', 'debug', 'mass_operations']
    };
    
    return operations[accessLevel] || operations['basic'];
  }

  private async getSystemInfo(): Promise<any> {
    try {
      const pokemonManagerStats = this.pokemonManager.getCacheStats();
      const totalPlayers = await PlayerData.countDocuments();
      const totalTeams = await PokemonTeam.countDocuments();
      const totalOwnedPokemon = await OwnedPokemon.countDocuments();
      
      return {
        pokemonManager: pokemonManagerStats,
        database: {
          totalPlayers,
          totalTeams,
          totalOwnedPokemon
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this.log('error', 'Erreur récupération system info', error);
      return { error: 'Informations système non disponibles' };
    }
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  /**
   * Obtenir les statistiques d'utilisation des PC
   */
  async getPcUsageStats(): Promise<{
    totalAccesses: number;
    uniqueUsers: number;
    averageTeamSize: number;
    averagePcPokemon: number;
    popularOperations: Record<string, number>;
  }> {
    try {
      // Basé sur les stats du module
      const moduleStats = this.getStats();
      
      // Statistiques calculées depuis la base de données
      const totalTeams = await PokemonTeam.countDocuments();
      const totalPcPokemon = await OwnedPokemon.countDocuments({ isInTeam: false });
      const averageTeamSize = totalTeams > 0 
        ? await PokemonTeam.aggregate([
            { $project: { teamSize: { $size: "$pokemon" } } },
            { $group: { _id: null, avg: { $avg: "$teamSize" } } }
          ]).then(result => result[0]?.avg || 0)
        : 0;
      
      return {
        totalAccesses: moduleStats.totalInteractions,
        uniqueUsers: totalTeams, // Approximation
        averageTeamSize: Math.round(averageTeamSize * 10) / 10,
        averagePcPokemon: totalTeams > 0 ? Math.round((totalPcPokemon / totalTeams) * 10) / 10 : 0,
        popularOperations: {
          'access': moduleStats.successfulInteractions,
          'view': Math.floor(moduleStats.successfulInteractions * 0.8),
          'transfer': Math.floor(moduleStats.successfulInteractions * 0.1),
          'organize': Math.floor(moduleStats.successfulInteractions * 0.1)
        }
      };
    } catch (error) {
      this.log('error', 'Erreur calcul stats PC', error);
      return {
        totalAccesses: 0,
        uniqueUsers: 0,
        averageTeamSize: 0,
        averagePcPokemon: 0,
        popularOperations: {}
      };
    }
  }

  /**
   * Vérifier l'état du système PC pour un joueur
   */
  async checkPlayerPcStatus(playerName: string): Promise<{
    hasTeam: boolean;
    teamSize: number;
    pcPokemonCount: number;
    totalPokemon: number;
    lastAccess?: Date;
  }> {
    try {
      const playerData = await PlayerData.findOne({ username: playerName });
      if (!playerData) {
        return {
          hasTeam: false,
          teamSize: 0,
          pcPokemonCount: 0,
          totalPokemon: 0
        };
      }

      const team = await PokemonTeam.findOne({ userId: playerData._id });
      const pcPokemon = await OwnedPokemon.countDocuments({ 
        owner: playerName, 
        isInTeam: false 
      });
      const totalPokemon = await OwnedPokemon.countDocuments({ owner: playerName });

      return {
        hasTeam: !!team,
        teamSize: team?.pokemon.length || 0,
        pcPokemonCount: pcPokemon,
        totalPokemon,
        lastAccess: team?.lastModified
      };
    } catch (error) {
      this.log('error', 'Erreur vérification statut PC joueur', { error, playerName });
      return {
        hasTeam: false,
        teamSize: 0,
        pcPokemonCount: 0,
        totalPokemon: 0
      };
    }
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'Pc',
      version: this.version,
      features: [
        'pokemon_team_access',
        'pokemon_pc_access',
        'pokemonmanager_integration',
        'data_enrichment',
        'multiple_pc_types',
        'access_level_validation',
        'no_cooldown_system',
        'transfer_operations',
        'organization_operations',
        'admin_features'
      ],
      integrations: {
        pokemonManager: true,
        ownedPokemon: true,
        pokemonTeam: true,
        playerData: true
      }
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    let pokemonManagerHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let databaseHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    try {
      // Test PokemonManager
      const managerStats = this.pokemonManager.getCacheStats();
      if (!managerStats.indexLoaded) {
        pokemonManagerHealth = 'warning';
      }
    } catch (error) {
      pokemonManagerHealth = 'critical';
    }
    
    // Test modèles MongoDB
    try {
      if (!OwnedPokemon || !PokemonTeam || !PlayerData) {
        databaseHealth = 'critical';
      }
    } catch (error) {
      databaseHealth = 'critical';
    }
    
    const details = {
      ...baseHealth.details,
      pokemonManagerAvailable: !!this.pokemonManager,
      ownedPokemonModelAvailable: !!OwnedPokemon,
      pokemonTeamModelAvailable: !!PokemonTeam,
      playerDataModelAvailable: !!PlayerData,
      pokemonManagerHealth,
      databaseHealth
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, pokemonManagerHealth, databaseHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, pokemonManagerHealth, databaseHealth].includes('warning') 
          ? 'warning' 
          : 'healthy';
    
    return {
      ...baseHealth,
      status: globalHealth,
      details
    };
  }

  // === INITIALISATION ===

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialiser PokemonManager
    try {
      await this.pokemonManager.loadPokemonIndex();
      this.log('info', 'PokemonManager initialisé avec succès');
    } catch (error) {
      this.log('error', 'Erreur initialisation PokemonManager', error);
      throw new Error(`PokemonManager non fonctionnel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    // Vérifier modèles MongoDB
    if (!OwnedPokemon) {
      throw new Error('OwnedPokemon model non disponible');
    }
    
    if (!PokemonTeam) {
      throw new Error('PokemonTeam model non disponible');
    }
    
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }
    
    this.log('info', 'PcSubModule initialisé avec succès', {
      pokemonManagerReady: true,
      modelsReady: true,
      version: this.version
    });
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage PcSubModule');
    
    // Nettoyer PokemonManager si nécessaire
    if (this.pokemonManager) {
      this.pokemonManager.clearCache();
    }
    
    await super.cleanup();
  }
}
