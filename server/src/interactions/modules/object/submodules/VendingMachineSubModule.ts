// src/interactions/modules/object/submodules/VendingMachineSubModule.ts
// Sous-module pour les distributeurs automatiques avec gestion stock + argent
// VERSION COMPLÈTE AVEC CATALOGUES + VALIDATION ÉCONOMIQUE

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";
import { ObjectNameMapper, MappingResult } from "../utils/ObjectNameMapper";
import { isValidItemId, getItemData, ItemData } from "../../../../utils/ItemDB";

/**
 * Sous-module pour les distributeurs automatiques
 * Type: "vending_machine"
 * 
 * FONCTIONNALITÉS :
 * - Catalogues d'objets avec prix personnalisés
 * - Validation argent joueur + déduction automatique
 * - Stock limité optionnel par machine
 * - Auto-détection objets via ObjectNameMapper
 * - Différents types de machines (boissons, snacks, objets Pokémon)
 * - Pas de cooldown (achats illimités si argent suffisant)
 * - Intégration ItemDB pour validation + données
 * - Support des promotions et réductions
 * 
 * Types de machines supportés :
 * - drinks: Boissons (Fresh Water, Soda Pop, Lemonade)
 * - snacks: En-cas et nourriture
 * - pokeballs: Poké Balls diverses
 * - medicine: Objets de soin
 * - items: Objets divers
 * - tm: Machines Techniques (CT)
 */
export default class VendingMachineSubModule extends BaseObjectSubModule {
  
  readonly typeName = "VendingMachine";
  readonly version = "1.0.0";

  // === CATALOGUES PRÉDÉFINIS ===
  private readonly MACHINE_CATALOGS: Record<string, Array<{
    itemId: string;
    price: number;
    stock?: number; // undefined = stock illimité
    promotion?: {
      discountPercent: number;
      description: string;
    };
  }>> = {
    
    // === DISTRIBUTEUR DE BOISSONS ===
    drinks: [
      { itemId: 'fresh_water', price: 200 },
      { itemId: 'soda_pop', price: 300 },
      { itemId: 'lemonade', price: 350 },
      { itemId: 'moomoo_milk', price: 500, stock: 5 }, // Stock limité
      // Promotion exemple
      { 
        itemId: 'energy_powder', 
        price: 400, 
        promotion: { 
          discountPercent: 20, 
          description: "Promotion été !" 
        }
      }
    ],
    
    // === DISTRIBUTEUR POKÉBALLS ===
    pokeballs: [
      { itemId: 'poke_ball', price: 200 },
      { itemId: 'great_ball', price: 600 },
      { itemId: 'ultra_ball', price: 1200, stock: 3 },
      { itemId: 'timer_ball', price: 1000 },
      { itemId: 'repeat_ball', price: 1000 }
    ],
    
    // === DISTRIBUTEUR MÉDICAL ===
    medicine: [
      { itemId: 'potion', price: 300 },
      { itemId: 'super_potion', price: 700 },
      { itemId: 'antidote', price: 100 },
      { itemId: 'paralyze_heal', price: 200 },
      { itemId: 'awakening', price: 250 },
      { itemId: 'burn_heal', price: 250 }
    ],
    
    // === DISTRIBUTEUR GÉNÉRAL ===
    items: [
      { itemId: 'repel', price: 350 },
      { itemId: 'super_repel', price: 500 },
      { itemId: 'escape_rope', price: 550 },
      { itemId: 'poke_doll', price: 1000, stock: 2 },
      { itemId: 'honey', price: 300 }
    ],
    
    // === DISTRIBUTEUR SNACKS ===
    snacks: [
      { itemId: 'poke_puff', price: 150, stock: 10 },
      { itemId: 'rare_candy', price: 10000, stock: 1 }, // Très cher !
      { itemId: 'berry_juice', price: 100 }
    ]
  };

  // === MÉTHODES PRINCIPALES ===

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'vending_machine';
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `Interaction distributeur`, { 
        objectId: objectDef.id, 
        player: player.name,
        machineName: objectDef.name,
        zone: objectDef.zone,
        action: actionData?.action || 'view',
        machineType: objectDef.customProperties?.machineType || 'items'
      });

      // === ÉTAPE 1 : RÉCUPÉRER LE JOUEUR DEPUIS MONGODB ===
      
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

      // === ÉTAPE 2 : DÉTERMINER L'ACTION ===
      
      const action = actionData?.action || 'view';
      
      switch (action) {
        case 'view':
        case 'browse':
          return await this.handleBrowseCatalog(player, objectDef, playerData, startTime);
          
        case 'buy':
        case 'purchase':
          return await this.handlePurchase(player, objectDef, playerData, actionData, startTime);
          
        default:
          return await this.handleBrowseCatalog(player, objectDef, playerData, startTime);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement distributeur', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // === HANDLERS D'ACTIONS ===

  private async handleBrowseCatalog(
    player: Player,
    objectDef: ObjectDefinition,
    playerData: IPlayerData,
    startTime: number
  ): Promise<ObjectInteractionResult> {
    
    this.log('info', 'Consultation catalogue distributeur', {
      player: player.name,
      machineId: objectDef.id
    });

    // Récupérer le catalogue de la machine
    const catalog = await this.getMachineCatalog(objectDef);
    
    if (!catalog || catalog.length === 0) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        "Ce distributeur est vide ou hors service.",
        'EMPTY_MACHINE'
      );
    }

    // Enrichir le catalogue avec données ItemDB
    const enrichedCatalog = await this.enrichCatalogWithItemData(catalog);
    
    // Récupérer l'argent du joueur
    const playerGold = playerData.gold || 0;

    const processingTime = Date.now() - startTime;
    this.updateStats(true, processingTime);

    return this.createSuccessResult(
      "machineActivated",
      `Bienvenue ! Sélectionnez un article (Argent: ${playerGold}₽)`,
      {
        objectId: objectDef.id.toString(),
        objectType: objectDef.type,
        machineData: {
          activated: true,
          output: null,
          state: "catalog_displayed"
        },
        vendingData: {
          catalog: enrichedCatalog,
          playerGold,
          machineInfo: {
            name: this.getMachineName(objectDef),
            type: this.getProperty(objectDef, 'machineType', 'items'),
            totalItems: enrichedCatalog.length,
            acceptedCurrency: "Gold (₽)"
          }
        }
      },
      {
        metadata: {
          processingTime,
          timestamp: Date.now(),
          machineType: this.getProperty(objectDef, 'machineType', 'items')
        }
      }
    );
  }

  private async handlePurchase(
    player: Player,
    objectDef: ObjectDefinition,
    playerData: IPlayerData,
    actionData: any,
    startTime: number
  ): Promise<ObjectInteractionResult> {
    
    const itemId = actionData?.itemId;
    const quantity = Math.max(1, actionData?.quantity || 1);

    if (!itemId) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        "Veuillez sélectionner un article.",
        'NO_ITEM_SELECTED'
      );
    }

    this.log('info', 'Tentative d\'achat', {
      player: player.name,
      itemId,
      quantity,
      machineId: objectDef.id
    });

    // === VALIDATION 1 : ITEM DANS LE CATALOGUE ===
    
    const catalog = await this.getMachineCatalog(objectDef);
    const catalogItem = catalog.find(item => item.itemId === itemId);
    
    if (!catalogItem) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        "Cet article n'est pas disponible dans ce distributeur.",
        'ITEM_NOT_AVAILABLE'
      );
    }

    // === VALIDATION 2 : STOCK DISPONIBLE ===
    
    if (catalogItem.stock !== undefined && catalogItem.stock < quantity) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        catalogItem.stock === 0 
          ? "Article en rupture de stock."
          : `Stock insuffisant (${catalogItem.stock} disponible${catalogItem.stock > 1 ? 's' : ''}).`,
        'INSUFFICIENT_STOCK'
      );
    }

    // === CALCUL DU PRIX TOTAL ===
    
    let unitPrice = catalogItem.price;
    let discountApplied = false;
    let discountInfo = '';

    // Appliquer promotion si disponible
    if (catalogItem.promotion) {
      const discountAmount = Math.floor(unitPrice * catalogItem.promotion.discountPercent / 100);
      unitPrice -= discountAmount;
      discountApplied = true;
      discountInfo = catalogItem.promotion.description;
    }

    const totalPrice = unitPrice * quantity;

    // === VALIDATION 3 : ARGENT SUFFISANT ===
    
    const playerGold = playerData.gold || 0;
    
    if (playerGold < totalPrice) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        `Argent insuffisant (${totalPrice}₽ requis, ${playerGold}₽ disponible).`,
        'INSUFFICIENT_FUNDS'
      );
    }

    // === VALIDATION 4 : ITEM VALIDE DANS ITEMDB ===
    
    if (!isValidItemId(itemId)) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Item invalide dans catalogue', { itemId, machineId: objectDef.id });
      
      return this.createErrorResult(
        "Article temporairement indisponible.",
        'INVALID_ITEM'
      );
    }

    // === TRANSACTION ===
    
    try {
      // 1. Ajouter l'objet à l'inventaire
      await InventoryManager.addItem(player.name, itemId, quantity);
      
      // 2. Déduire l'argent
      playerData.gold = playerGold - totalPrice;
      await playerData.save();
      
      // 3. Mettre à jour le stock si applicable
      if (catalogItem.stock !== undefined) {
        catalogItem.stock -= quantity;
        // TODO: Persister le stock en base de données si nécessaire
        this.log('info', 'Stock mis à jour', {
          itemId,
          newStock: catalogItem.stock,
          machineId: objectDef.id
        });
      }
      
      this.log('info', '✅ Achat réussi', {
        player: player.name,
        itemId,
        quantity,
        totalPrice,
        newGold: playerData.gold,
        discountApplied
      });

      // === SUCCÈS ===
      
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);

      const itemData = getItemData(itemId);
      
      return this.createSuccessResult(
        "machineActivated",
        discountApplied 
          ? `Achat réussi ! ${quantity}x ${itemData.name} (${discountInfo})`
          : `Achat réussi ! ${quantity}x ${itemData.name}`,
        {
          objectId: objectDef.id.toString(),
          objectType: objectDef.type,
          machineData: {
            activated: true,
            output: {
              purchased: true,
              itemId,
              quantity,
              unitPrice,
              totalPrice,
              discountApplied,
              discountInfo
            },
            state: "purchase_complete"
          }
        },
        {
          metadata: {
            transaction: {
              itemPurchased: {
                itemId,
                quantity,
                unitPrice: catalogItem.price,
                finalPrice: unitPrice,
                totalPaid: totalPrice,
                discountApplied,
                discountInfo
              },
              playerEconomy: {
                goldBefore: playerGold,
                goldAfter: playerData.gold,
                goldSpent: totalPrice
              },
              stock: catalogItem.stock !== undefined 
                ? { available: catalogItem.stock, consumed: quantity }
                : { unlimited: true }
            },
            processingTime,
            timestamp: Date.now()
          }
        }
      );

    } catch (inventoryError) {
      // Erreur inventaire - ne pas déduire l'argent
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur ajout inventaire', {
        error: inventoryError,
        itemId,
        player: player.name
      });
      
      return this.createErrorResult(
        inventoryError instanceof Error 
          ? inventoryError.message 
          : "Impossible d'ajouter l'article à l'inventaire",
        'INVENTORY_ERROR'
      );
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private async getMachineCatalog(objectDef: ObjectDefinition): Promise<Array<{
    itemId: string;
    price: number;
    stock?: number;
    promotion?: { discountPercent: number; description: string; };
  }>> {
    
    const machineType = this.getProperty(objectDef, 'machineType', 'items');
    
    // 1. Catalogue prédéfini selon le type
    if (this.MACHINE_CATALOGS[machineType]) {
      // Créer une copie pour éviter les modifications
      return JSON.parse(JSON.stringify(this.MACHINE_CATALOGS[machineType]));
    }
    
    // 2. Catalogue personnalisé depuis Tiled
    const customCatalog = this.getProperty(objectDef, 'catalog', null);
    if (customCatalog && Array.isArray(customCatalog)) {
      return customCatalog;
    }
    
    // 3. Auto-génération depuis une liste d'objets
    const itemList = this.getProperty(objectDef, 'items', '');
    if (itemList && typeof itemList === 'string') {
      return this.generateCatalogFromItemList(itemList);
    }
    
    // 4. Catalogue par défaut vide
    this.log('warn', 'Aucun catalogue trouvé pour le distributeur', {
      machineId: objectDef.id,
      machineType
    });
    
    return [];
  }

  private generateCatalogFromItemList(itemList: string): Array<{
    itemId: string;
    price: number;
    stock?: number;
  }> {
    const items = itemList.split(',').map(item => item.trim()).filter(Boolean);
    const catalog: Array<{ itemId: string; price: number; stock?: number; }> = [];
    
    for (const itemName of items) {
      // Utiliser ObjectNameMapper pour auto-détection
      const mappingResult = ObjectNameMapper.mapObjectName(itemName);
      
      if (mappingResult.found && mappingResult.mapping && mappingResult.itemData) {
        // Prix basé sur ItemDB avec markup de 50%
        const basePrice = mappingResult.itemData.price || 100;
        const vendingPrice = Math.max(50, Math.floor(basePrice * 1.5));
        
        catalog.push({
          itemId: mappingResult.mapping.itemId,
          price: vendingPrice
        });
        
        this.log('info', 'Item auto-détecté pour catalogue', {
          itemName,
          itemId: mappingResult.mapping.itemId,
          basePrice,
          vendingPrice
        });
      } else {
        this.log('warn', 'Item non reconnu pour catalogue', {
          itemName,
          suggestions: mappingResult.suggestions
        });
      }
    }
    
    return catalog;
  }

  private async enrichCatalogWithItemData(catalog: Array<{
    itemId: string;
    price: number;
    stock?: number;
    promotion?: { discountPercent: number; description: string; };
  }>): Promise<Array<any>> {
    
    const enrichedCatalog: Array<any> = [];
    
    for (const catalogItem of catalog) {
      try {
        // Récupérer données ItemDB
        const itemData = getItemData(catalogItem.itemId);
        
        // Calculer prix final avec promotions
        let finalPrice = catalogItem.price;
        let discountInfo = null;
        
        if (catalogItem.promotion) {
          const discountAmount = Math.floor(catalogItem.price * catalogItem.promotion.discountPercent / 100);
          finalPrice = catalogItem.price - discountAmount;
          discountInfo = {
            originalPrice: catalogItem.price,
            discountPercent: catalogItem.promotion.discountPercent,
            discountAmount,
            description: catalogItem.promotion.description
          };
        }
        
        const enrichedItem = {
          // Données catalogue
          itemId: catalogItem.itemId,
          price: catalogItem.price,
          finalPrice,
          stock: catalogItem.stock,
          available: catalogItem.stock === undefined || catalogItem.stock > 0,
          
          // Données ItemDB
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          pocket: itemData.pocket,
          sprite: itemData.sprite || `/sprites/items/${catalogItem.itemId}.png`,
          
          // Promotion
          promotion: discountInfo,
          
          // Métadonnées
          affordable: false // Sera calculé côté client selon l'argent du joueur
        };
        
        enrichedCatalog.push(enrichedItem);
        
      } catch (error) {
        this.log('error', `Erreur enrichissement item ${catalogItem.itemId}`, error);
        
        // Ajouter version basique en cas d'erreur
        enrichedCatalog.push({
          itemId: catalogItem.itemId,
          price: catalogItem.price,
          finalPrice: catalogItem.price,
          stock: catalogItem.stock,
          available: catalogItem.stock === undefined || catalogItem.stock > 0,
          name: `Item ${catalogItem.itemId}`,
          description: "Article disponible",
          category: "unknown",
          sprite: "/sprites/items/unknown.png",
          affordable: false
        });
      }
    }
    
    return enrichedCatalog;
  }

  private getMachineName(objectDef: ObjectDefinition): string {
    if (objectDef.name && objectDef.name !== 'vending_machine') {
      return objectDef.name;
    }
    
    const machineType = this.getProperty(objectDef, 'machineType', 'items');
    const names: Record<string, string> = {
      'drinks': 'Distributeur de Boissons',
      'snacks': 'Distributeur de Snacks', 
      'pokeballs': 'Distributeur Poké Balls',
      'medicine': 'Distributeur Médical',
      'items': 'Distributeur d\'Objets',
      'tm': 'Distributeur CT'
    };
    
    return names[machineType] || 'Distributeur';
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  /**
   * Obtenir les statistiques de vente d'une machine
   */
  async getMachineSalesStats(machineId: number): Promise<{
    totalSales: number;
    totalRevenue: number;
    popularItems: Record<string, number>;
    averageTransactionValue: number;
  }> {
    // Pour une vraie implémentation, il faudrait tracker ces données
    // Ici on retourne des stats simulées basées sur les interactions du module
    
    const moduleStats = this.getStats();
    
    return {
      totalSales: moduleStats.successfulInteractions,
      totalRevenue: moduleStats.successfulInteractions * 500, // Estimation
      popularItems: {
        'potion': Math.floor(moduleStats.successfulInteractions * 0.3),
        'poke_ball': Math.floor(moduleStats.successfulInteractions * 0.2),
        'fresh_water': Math.floor(moduleStats.successfulInteractions * 0.15)
      },
      averageTransactionValue: 500
    };
  }

  /**
   * Restock une machine (admin)
   */
  async restockMachine(machineId: number, itemId: string, quantity: number): Promise<boolean> {
    // TODO: Implémenter la persistence du stock en base de données
    this.log('info', 'Restock machine (simulation)', {
      machineId,
      itemId,
      quantity
    });
    
    // Pour l'instant, simulation
    return true;
  }

  /**
   * Ajouter un article au catalogue d'une machine (admin)
   */
  async addItemToCatalog(
    machineId: number, 
    itemId: string, 
    price: number, 
    stock?: number
  ): Promise<boolean> {
    if (!isValidItemId(itemId)) {
      this.log('error', 'Tentative ajout item invalide', { itemId });
      return false;
    }
    
    // TODO: Implémenter la persistence des catalogues personnalisés
    this.log('info', 'Ajout item catalogue (simulation)', {
      machineId,
      itemId,
      price,
      stock
    });
    
    return true;
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'VendingMachine',
      version: this.version,
      features: [
        'multiple_machine_types',
        'predefined_catalogs',
        'custom_catalog_support',
        'auto_item_detection',
        'stock_management',
        'promotion_system',
        'economic_validation',
        'itemdb_integration',
        'inventory_integration',
        'no_cooldown_purchases',
        'gold_currency_system'
      ],
      economicData: {
        supportedCurrency: 'gold',
        catalogTypes: Object.keys(this.MACHINE_CATALOGS).length,
        totalCatalogItems: Object.values(this.MACHINE_CATALOGS)
          .reduce((total, catalog) => total + catalog.length, 0)
      }
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    let itemDbHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let catalogHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    try {
      // Test ItemDB
      const testItems = ['potion', 'poke_ball', 'fresh_water'];
      for (const itemId of testItems) {
        if (!isValidItemId(itemId)) {
          itemDbHealth = 'warning';
          break;
        }
      }
    } catch (error) {
      itemDbHealth = 'critical';
    }
    
    // Test catalogues
    try {
      const catalogCount = Object.keys(this.MACHINE_CATALOGS).length;
      if (catalogCount === 0) {
        catalogHealth = 'critical';
      } else if (catalogCount < 3) {
        catalogHealth = 'warning';
      }
    } catch (error) {
      catalogHealth = 'critical';
    }
    
    const details = {
      ...baseHealth.details,
      inventoryManagerAvailable: !!InventoryManager,
      playerDataModelAvailable: !!PlayerData,
      objectNameMapperAvailable: !!ObjectNameMapper,
      itemDbHealth,
      catalogHealth,
      predefinedCatalogs: Object.keys(this.MACHINE_CATALOGS),
      totalCatalogItems: Object.values(this.MACHINE_CATALOGS)
        .reduce((total, catalog) => total + catalog.length, 0)
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, itemDbHealth, catalogHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, itemDbHealth, catalogHealth].includes('warning') 
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
    
    // Vérifier dépendances
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }
    
    // Test ItemDB
    try {
      const testResult = isValidItemId('potion');
      if (!testResult) {
        this.log('warn', 'ItemDB pourrait avoir des problèmes');
      }
    } catch (error) {
      throw new Error(`ItemDB non fonctionnelle: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    // Valider catalogues prédéfinis
    let invalidItems = 0;
    for (const [catalogName, catalog] of Object.entries(this.MACHINE_CATALOGS)) {
      for (const item of catalog) {
        if (!isValidItemId(item.itemId)) {
          this.log('warn', `Item invalide dans catalogue ${catalogName}`, { itemId: item.itemId });
          invalidItems++;
        }
      }
    }
    
    this.log('info', 'VendingMachineSubModule initialisé', {
      catalogCount: Object.keys(this.MACHINE_CATALOGS).length,
      totalItems: Object.values(this.MACHINE_CATALOGS)
        .reduce((total, catalog) => total + catalog.length, 0),
      invalidItems,
      features: ['stock_management', 'promotions', 'auto_detection', 'economic_validation']
    });
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage VendingMachineSubModule');
    await super.cleanup();
  }
}
