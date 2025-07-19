// src/interactions/modules/object/submodules/HiddenItemSubModule.ts
// Sous-module pour gérer les objets cachés avec système de fouille probabiliste
// VERSION AVEC AUTO-DÉTECTION + COOLDOWNS MONGODB

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData, ObjectStateEntry } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";
import { ObjectNameMapper, MappingResult } from "../utils/ObjectNameMapper";

/**
 * Sous-module pour les objets cachés avec système de fouille probabiliste
 * Type: "hidden_item"
 * 
 * FONCTIONNALITÉS :
 * - Objets invisibles nécessitant une fouille
 * - Probabilité de réussite configurable (défaut 60%)
 * - Zone de recherche autour du point défini
 * - Bonus Itemfinder (+30% de chances)
 * - Auto-détection par nom : "pokeball" → "poke_ball"
 * - Cooldowns par joueur en MongoDB
 * - Tentatives multiples avec échecs possibles
 * 
 * Différences avec GroundItem :
 * - Objets invisibles (pas de sprite sur map)
 * - Action "search" dans une zone
 * - Probabilité de réussite (pas 100% garanti)
 * - Bonus équipement (Itemfinder)
 */
export default class HiddenItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "HiddenItem";
  readonly version = "1.0.0";

  // === CONFIGURATION PAR DÉFAUT ===
  private readonly DEFAULT_FIND_CHANCE = 60;      // 60% de base
  private readonly DEFAULT_SEARCH_RADIUS = 32;    // 32px de rayon
  private readonly ITEMFINDER_BONUS = 30;         // +30% avec Itemfinder
  private readonly DEFAULT_COOLDOWN_HOURS = 24;   // 24h comme GroundItem

  // === MÉTHODES PRINCIPALES ===

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'hidden_item';
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `Fouille objet caché`, { 
        objectId: objectDef.id, 
        player: player.name,
        objectName: objectDef.name,
        zone: objectDef.zone,
        actionType: actionData?.action || 'search'
      });

      // === ÉTAPE 1 : VÉRIFIER QUE C'EST UNE ACTION DE FOUILLE ===
      
      if (actionData?.action !== 'search') {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Action de fouille requise pour les objets cachés.",
          'INVALID_ACTION'
        );
      }

      // === ÉTAPE 2 : VÉRIFIER LA PROXIMITÉ DE LA ZONE DE RECHERCHE ===
      
      const searchRadius = this.getProperty(objectDef, 'searchRadius', this.DEFAULT_SEARCH_RADIUS);
      const playerDistance = Math.sqrt(
        Math.pow(player.x - objectDef.x, 2) + 
        Math.pow(player.y - objectDef.y, 2)
      );

      if (playerDistance > searchRadius) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('info', `Joueur trop loin de la zone`, { 
          distance: Math.round(playerDistance), 
          maxRadius: searchRadius 
        });
        
        return this.createErrorResult(
          "Il n'y a rien d'intéressant ici.",
          'OUTSIDE_SEARCH_ZONE'
        );
      }

      // === ÉTAPE 3 : AUTO-DÉTECTION PAR NOM ===
      
      let itemId: string;
      let autoDetected = false;
      let mappingResult: MappingResult | null = null;

      if (objectDef.itemId) {
        // itemId manuel (rétrocompatibilité)
        itemId = objectDef.itemId;
        this.log('info', `ItemId manuel: ${itemId}`);
        
      } else {
        // Auto-détection par nom
        mappingResult = ObjectNameMapper.mapObjectName(objectDef.name);
        
        if (mappingResult.found && mappingResult.mapping) {
          itemId = mappingResult.mapping.itemId;
          autoDetected = true;
          
          this.log('info', `✅ Auto-détecté: "${objectDef.name}" → "${itemId}"`);
          
        } else {
          const processingTime = Date.now() - startTime;
          this.updateStats(false, processingTime);
          
          const suggestions = mappingResult.suggestions || [];
          this.log('warn', `❌ Objet caché non reconnu: "${objectDef.name}"`, { suggestions });
          
          return this.createErrorResult(
            "Il n'y a rien ici...",
            'UNKNOWN_HIDDEN_OBJECT'
          );
        }
      }

      // === ÉTAPE 4 : RÉCUPÉRER LE JOUEUR DEPUIS MONGODB ===
      
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

      // === ÉTAPE 5 : VÉRIFIER LE COOLDOWN ===
      
      const canSearch = playerData.canCollectObject(objectDef.id, objectDef.zone);
      
      if (!canSearch) {
        const cooldownInfo = playerData.getObjectCooldownInfo(objectDef.id, objectDef.zone);
        const hoursRemaining = Math.ceil(cooldownInfo.cooldownRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.ceil((cooldownInfo.cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        const timeText = hoursRemaining > 0 
          ? `${hoursRemaining}h ${minutesRemaining}min`
          : `${minutesRemaining}min`;
        
        return this.createErrorResult(
          `Vous avez déjà fouillé ici récemment. Réessayez dans ${timeText}.`,
          'COOLDOWN_ACTIVE'
        );
      }

      // === ÉTAPE 6 : CALCUL DE LA PROBABILITÉ DE RÉUSSITE ===
      
      let findChance = this.getProperty(objectDef, 'findChance', this.DEFAULT_FIND_CHANCE);
      
      // Bonus Itemfinder (vérifier si le joueur l'a en inventaire)
      const hasItemfinder = await this.checkPlayerHasItemfinder(player.name);
      if (hasItemfinder) {
        findChance += this.ITEMFINDER_BONUS;
        this.log('info', `Bonus Itemfinder: +${this.ITEMFINDER_BONUS}%`, { 
          baseChance: findChance - this.ITEMFINDER_BONUS,
          finalChance: findChance 
        });
      }

      // Limiter à 95% max (toujours une petite chance d'échec)
      findChance = Math.min(findChance, 95);

      // === ÉTAPE 7 : TENTATIVE DE FOUILLE ===
      
      const searchRoll = Math.random() * 100;
      const searchSuccess = searchRoll < findChance;

      this.log('info', `Tentative de fouille`, {
        findChance,
        roll: Math.round(searchRoll),
        success: searchSuccess,
        hasItemfinder
      });

      // === ÉTAPE 8 : ENREGISTRER LE COOLDOWN (MÊME EN CAS D'ÉCHEC) ===
      
      const cooldownHours = this.getProperty(objectDef, 'cooldownHours', this.DEFAULT_COOLDOWN_HOURS);
      await playerData.recordObjectCollection(objectDef.id, objectDef.zone, cooldownHours);

      if (!searchSuccess) {
        // Échec de la fouille
        const processingTime = Date.now() - startTime;
        this.updateStats(true, processingTime); // Comptabiliser comme succès d'interaction
        
        return this.createSuccessResult(
          "searchComplete",
          "Vous fouillez minutieusement... mais ne trouvez rien.",
          {
            objectId: objectDef.id.toString(),
            objectType: objectDef.type,
            collected: false,
            searchResult: { 
              found: false, 
              attempts: 1,
              chance: findChance,
              roll: Math.round(searchRoll)
            }
          },
          {
            metadata: {
              searchAttempt: {
                success: false,
                chance: findChance,
                roll: Math.round(searchRoll),
                hasItemfinder,
                autoDetected
              },
              cooldown: {
                duration: cooldownHours,
                nextAvailable: Date.now() + cooldownHours * 60 * 60 * 1000
              },
              processingTime,
              timestamp: Date.now()
            }
          }
        );
      }

      // === ÉTAPE 9 : SUCCÈS - AJOUTER L'OBJET À L'INVENTAIRE ===

      try {
        const quantity = this.getProperty(objectDef, 'quantity', 1);
        await InventoryManager.addItem(player.name, itemId, quantity);
        
        this.log('info', `✅ Objet caché trouvé et ajouté`, { 
          player: player.name,
          itemId, 
          quantity,
          chance: findChance,
          roll: Math.round(searchRoll)
        });

        // Calculer rareté
        let rarity = this.getProperty(objectDef, 'rarity', 'rare'); // Les objets cachés sont plus rares par défaut
        
        if (autoDetected && mappingResult?.itemData) {
          rarity = ObjectNameMapper.calculateRarityFromPrice(mappingResult.itemData);
        }

        const processingTime = Date.now() - startTime;
        this.updateStats(true, processingTime);
        
        return this.createSuccessResult(
          "itemFound",
          `Vous fouillez attentivement et trouvez ${this.getDisplayName(objectDef, mappingResult)} !`,
          {
            objectId: objectDef.id.toString(),
            objectType: objectDef.type,
            collected: true,
            searchResult: { 
              found: true, 
              attempts: 1,
              chance: findChance,
              roll: Math.round(searchRoll),
              itemsFound: [itemId]
            }
          },
          {
            metadata: {
              itemReceived: {
                itemId,
                quantity,
                rarity,
                autoDetected,
                pocket: mappingResult?.itemData?.pocket || 'items'
              },
              searchAttempt: {
                success: true,
                chance: findChance,
                roll: Math.round(searchRoll),
                hasItemfinder
              },
              cooldown: {
                duration: cooldownHours,
                nextAvailable: Date.now() + cooldownHours * 60 * 60 * 1000
              },
              processingTime,
              timestamp: Date.now(),
              detectionMethod: autoDetected ? 'name-mapping' : 'manual-itemId'
            }
          }
        );

      } catch (inventoryError) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Erreur ajout inventaire objet caché', { error: inventoryError });
        
        return this.createErrorResult(
          "Vous trouvez quelque chose, mais votre sac est plein !",
          'INVENTORY_FULL'
        );
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement hidden_item', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Vérifier si le joueur possède l'Itemfinder
   */
  private async checkPlayerHasItemfinder(playerName: string): Promise<boolean> {
    try {
      // Vérifier via InventoryManager si le joueur a "itemfinder"
      const itemfinderCount = await InventoryManager.getItemCount(playerName, 'itemfinder');
      return itemfinderCount > 0;
    } catch (error) {
      this.log('warn', 'Erreur vérification Itemfinder', { error, playerName });
      return false; // En cas d'erreur, pas de bonus
    }
  }

  /**
   * Obtenir le nom d'affichage de l'objet caché
   */
  private getDisplayName(objectDef: ObjectDefinition, mappingResult: MappingResult | null): string {
    if (mappingResult?.found) {
      return objectDef.name || mappingResult.mapping!.itemId;
    }
    return objectDef.name || objectDef.itemId || `quelque chose`;
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  /**
   * Simuler une fouille pour tests (admin)
   */
  async simulateSearch(
    objectName: string, 
    hasItemfinder: boolean = false,
    iterations: number = 100
  ): Promise<{
    objectName: string;
    baseChance: number;
    finalChance: number;
    successRate: number;
    totalAttempts: number;
  }> {
    
    const mappingResult = ObjectNameMapper.mapObjectName(objectName);
    if (!mappingResult.found) {
      throw new Error(`Objet "${objectName}" non reconnu`);
    }

    const baseChance = this.DEFAULT_FIND_CHANCE;
    const finalChance = hasItemfinder ? baseChance + this.ITEMFINDER_BONUS : baseChance;
    
    let successes = 0;
    for (let i = 0; i < iterations; i++) {
      const roll = Math.random() * 100;
      if (roll < finalChance) successes++;
    }

    const successRate = (successes / iterations) * 100;

    this.log('info', `Simulation fouille "${objectName}"`, {
      baseChance,
      finalChance, 
      hasItemfinder,
      successRate: Math.round(successRate),
      iterations
    });

    return {
      objectName,
      baseChance,
      finalChance,
      successRate,
      totalAttempts: iterations
    };
  }

  /**
   * Obtenir les statistiques de fouille d'un joueur
   */
  async getPlayerSearchStats(playerName: string): Promise<{
    totalSearches: number;
    successfulSearches: number;
    failedSearches: number;
    successRate: number;
    activeCooldowns: number;
  }> {
    try {
      // Pour une vraie implémentation, il faudrait tracker ces stats
      // Ici on utilise les méthodes existantes du parent GroundItem
      
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc) {
        return {
          totalSearches: 0,
          successfulSearches: 0,
          failedSearches: 0,
          successRate: 0,
          activeCooldowns: 0
        };
      }

      const playerData = playerDataDoc as IPlayerData;
      const now = Date.now();
      const activeCooldowns = playerData.objectStates
        .filter((state: ObjectStateEntry) => state.nextAvailableTime > now).length;

      // Stats simulées basées sur les cooldowns (à améliorer avec de vraies stats)
      const totalSearches = playerData.objectStates.length;
      const successfulSearches = Math.floor(totalSearches * 0.6); // Estimation 60%
      const failedSearches = totalSearches - successfulSearches;
      const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;

      return {
        totalSearches,
        successfulSearches,
        failedSearches,
        successRate,
        activeCooldowns
      };

    } catch (error) {
      this.log('error', 'Erreur récupération stats recherche', { error, playerName });
      return {
        totalSearches: 0,
        successfulSearches: 0,
        failedSearches: 0,
        successRate: 0,
        activeCooldowns: 0
      };
    }
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'HiddenItem',
      version: this.version,
      features: [
        'probabilistic_search',
        'itemfinder_bonus',
        'search_radius_validation',
        'auto_detection_by_name',
        'itemdb_integration',
        'inventory_integration',
        'mongodb_cooldowns',
        'failure_tracking',
        'configurable_chances'
      ],
      config: {
        defaultFindChance: this.DEFAULT_FIND_CHANCE,
        defaultSearchRadius: this.DEFAULT_SEARCH_RADIUS,
        itemfinderBonus: this.ITEMFINDER_BONUS,
        defaultCooldownHours: this.DEFAULT_COOLDOWN_HOURS
      }
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    // Tests spécifiques aux objets cachés
    let probabilitySystemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    try {
      // Test basique du système de probabilité
      const testRoll = Math.random() * 100;
      if (isNaN(testRoll) || testRoll < 0 || testRoll > 100) {
        probabilitySystemHealth = 'critical';
      }
    } catch (error) {
      probabilitySystemHealth = 'critical';
    }

    const details = {
      ...baseHealth.details,
      inventoryManagerAvailable: !!InventoryManager,
      objectNameMapperAvailable: !!ObjectNameMapper,
      playerDataModelAvailable: !!PlayerData,
      probabilitySystemHealth,
      defaultConfigs: {
        findChance: this.DEFAULT_FIND_CHANCE,
        searchRadius: this.DEFAULT_SEARCH_RADIUS,
        itemfinderBonus: this.ITEMFINDER_BONUS
      }
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, probabilitySystemHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, probabilitySystemHealth].includes('warning') 
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
    
    // Vérifications spécifiques
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }
    
    // Test ObjectNameMapper
    try {
      const testResult = ObjectNameMapper.mapObjectName("potion");
      if (!testResult.found) {
        this.log('warn', 'ObjectNameMapper pourrait avoir des problèmes');
      }
    } catch (error) {
      throw new Error(`ObjectNameMapper non fonctionnel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    this.log('info', 'HiddenItemSubModule initialisé', {
      defaultFindChance: this.DEFAULT_FIND_CHANCE,
      itemfinderBonus: this.ITEMFINDER_BONUS,
      searchRadius: this.DEFAULT_SEARCH_RADIUS,
      cooldownHours: this.DEFAULT_COOLDOWN_HOURS
    });
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage HiddenItemSubModule');
    await super.cleanup();
  }
}

// ✅ EXEMPLE D'UTILISATION TILED + CLIENT

/*
// Dans Tiled, pour créer un objet caché :
{
  "id": 2,
  "name": "hidden_potion",           // ← AUTO-DÉTECTION: "hidden_potion" → "potion"
  "type": "hidden_item",             // ← Type requis
  "x": 500,
  "y": 300,
  "properties": [
    {"name": "type", "value": "hidden_item"},
    {"name": "searchRadius", "value": 48},      // Zone de fouille 48px
    {"name": "findChance", "value": 70},        // 70% de base + bonus Itemfinder
    {"name": "cooldownHours", "value": 12}      // Cooldown 12h
  ]
}

// Côté client (Phaser), pour fouiller :
// Action générale de fouille sur une case
this.socket.emit("objectInteract", {
  action: "search",
  position: { x: 500, y: 300 }
});

// Résultats possibles :

// 1. SUCCÈS (avec Itemfinder) :
{
  "success": true,
  "type": "itemFound",
  "message": "Vous fouillez attentivement et trouvez hidden_potion !",
  "data": {
    "objectData": {
      "objectId": "2",
      "objectType": "hidden_item",
      "collected": true,
      "searchResult": {
        "found": true,
        "chance": 100,  // 70% + 30% Itemfinder
        "roll": 45
      }
    },
    "metadata": {
      "itemReceived": {
        "itemId": "potion",
        "quantity": 1,
        "pocket": "medicine"
      },
      "searchAttempt": {
        "success": true,
        "hasItemfinder": true
      }
    }
  }
}

// 2. ÉCHEC :
{
  "success": true,
  "type": "searchComplete", 
  "message": "Vous fouillez minutieusement... mais ne trouvez rien.",
  "data": {
    "objectData": {
      "collected": false,
      "searchResult": {
        "found": false,
        "chance": 70,
        "roll": 85
      }
    }
  }
}

// 3. COOLDOWN :
{
  "success": false,
  "type": "error",
  "message": "Vous avez déjà fouillé ici récemment. Réessayez dans 11h 30min."
}

// Méthodes admin/test :
const hiddenModule = new HiddenItemSubModule();

// Simulation
await hiddenModule.simulateSearch("potion", true, 1000);

// Stats joueur  
await hiddenModule.getPlayerSearchStats("alice");
*/
