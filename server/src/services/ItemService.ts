// server/src/services/ItemService.ts - SERVICE COMPLET AVEC SYSTÈME D'EFFETS
import { ItemData, IItemData, ItemCategory, ItemRarity, ObtainMethod } from "../models/ItemData";
import { EffectTrigger } from "../items/ItemEffectTypes";
import { ItemEffectProcessor, EffectProcessResult } from "../items/ItemEffectProcessor";

export class ItemService {
  private static logPrefix = "[ItemService]";
  
  private static log = {
    debug: (msg: string, ...args: any[]) => console.debug(`${ItemService.logPrefix} ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.info(`${ItemService.logPrefix} ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`${ItemService.logPrefix} ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`${ItemService.logPrefix} ${msg}`, ...args)
  };

  // ===== MÉTHODES DE RÉCUPÉRATION DE BASE =====

  /**
   * Récupère un item par son ID
   */
  static async getItemById(itemId: string): Promise<IItemData | null> {
    try {
      this.log.debug(`Getting item by ID: ${itemId}`);
      
      const item = await ItemData.findOne({ 
        itemId, 
        isActive: true 
      });
      
      if (!item) {
        this.log.warn(`Item not found: ${itemId}`);
        return null;
      }
      
      return item;
    } catch (error) {
      this.log.error(`Error getting item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère plusieurs items par leurs IDs
   */
  static async getItemsByIds(itemIds: string[]): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by IDs: ${itemIds.join(', ')}`);
      
      if (itemIds.length === 0) return [];
      
      const items = await ItemData.find({ 
        itemId: { $in: itemIds }, 
        isActive: true 
      }).sort({ name: 1 });
      
      return items;
    } catch (error) {
      this.log.error(`Error getting items by IDs:`, error);
      throw error;
    }
  }

  /**
   * Récupère tous les items actifs
   */
  static async getAllItems(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting all active items");
      
      const items = await ItemData.findActiveItems();
      
      this.log.info(`Retrieved ${items.length} active items`);
      return items;
    } catch (error) {
      this.log.error("Error getting all items:", error);
      throw error;
    }
  }

  // ===== MÉTHODES DE RECHERCHE PAR CATÉGORIE =====

  /**
   * Récupère les items par catégorie
   */
  static async getItemsByCategory(category: ItemCategory): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by category: ${category}`);
      
      const items = await ItemData.findByCategory(category);
      
      this.log.debug(`Found ${items.length} items of category ${category}`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les items par génération
   */
  static async getItemsByGeneration(generation: number): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by generation: ${generation}`);
      
      const items = await ItemData.findByGeneration(generation);
      
      this.log.debug(`Found ${items.length} items from generation ${generation}`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items by generation ${generation}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les items par rareté
   */
  static async getItemsByRarity(rarity: ItemRarity): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by rarity: ${rarity}`);
      
      const items = await ItemData.findByRarity(rarity);
      
      this.log.debug(`Found ${items.length} items of rarity ${rarity}`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items by rarity ${rarity}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE RECHERCHE SPÉCIALISÉES =====

  /**
   * Récupère les items d'évolution
   */
  static async getEvolutionItems(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting evolution items");
      
      const items = await ItemData.findEvolutionItems();
      
      this.log.debug(`Found ${items.length} evolution items`);
      return items;
    } catch (error) {
      this.log.error("Error getting evolution items:", error);
      throw error;
    }
  }

  /**
   * Récupère les objets tenus
   */
  static async getHeldItems(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting held items");
      
      const items = await ItemData.findHeldItems();
      
      this.log.debug(`Found ${items.length} held items`);
      return items;
    } catch (error) {
      this.log.error("Error getting held items:", error);
      throw error;
    }
  }

  /**
   * Récupère les baies
   */
  static async getBerries(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting berries");
      
      const items = await ItemData.findBerries();
      
      this.log.debug(`Found ${items.length} berries`);
      return items;
    } catch (error) {
      this.log.error("Error getting berries:", error);
      throw error;
    }
  }

  /**
   * Récupère les TMs/HMs
   */
  static async getTMs(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting TMs/HMs");
      
      const items = await ItemData.findTMs();
      
      this.log.debug(`Found ${items.length} TMs/HMs`);
      return items;
    } catch (error) {
      this.log.error("Error getting TMs/HMs:", error);
      throw error;
    }
  }

  /**
   * Récupère les items avec un effet spécifique
   */
  static async getItemsWithEffect(trigger: EffectTrigger): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items with effect trigger: ${trigger}`);
      
      const items = await ItemData.findWithEffect(trigger);
      
      this.log.debug(`Found ${items.length} items with ${trigger} effect`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items with effect ${trigger}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES ÉCONOMIQUES =====

  /**
   * Récupère les items achetables
   */
  static async getBuyableItems(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting buyable items");
      
      const items = await ItemData.findBuyableItems();
      
      this.log.debug(`Found ${items.length} buyable items`);
      return items;
    } catch (error) {
      this.log.error("Error getting buyable items:", error);
      throw error;
    }
  }

  /**
   * Récupère les items vendables
   */
  static async getSellableItems(): Promise<IItemData[]> {
    try {
      this.log.debug("Getting sellable items");
      
      const items = await ItemData.find({ 
        sellPrice: { $ne: null, $gt: 0 }, 
        isActive: true 
      }).sort({ sellPrice: -1, name: 1 });
      
      this.log.debug(`Found ${items.length} sellable items`);
      return items;
    } catch (error) {
      this.log.error("Error getting sellable items:", error);
      throw error;
    }
  }

  /**
   * Récupère les items par gamme de prix
   */
  static async getItemsByPriceRange(minPrice: number, maxPrice: number): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items in price range: ${minPrice} - ${maxPrice}`);
      
      const items = await ItemData.find({
        price: { $gte: minPrice, $lte: maxPrice },
        isActive: true
      }).sort({ price: 1, name: 1 });
      
      this.log.debug(`Found ${items.length} items in price range`);
      return items;
    } catch (error) {
      this.log.error("Error getting items by price range:", error);
      throw error;
    }
  }

  /**
   * Calcule le prix d'achat effectif avec modificateur
   */
  static async getItemBuyPrice(itemId: string, shopModifier: number = 1): Promise<number | null> {
    try {
      const item = await this.getItemById(itemId);
      if (!item) return null;
      
      return item.getEffectivePrice(shopModifier);
    } catch (error) {
      this.log.error(`Error getting buy price for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Calcule le prix de vente effectif avec modificateur
   */
  static async getItemSellPrice(itemId: string, shopModifier: number = 1): Promise<number | null> {
    try {
      const item = await this.getItemById(itemId);
      if (!item || !item.canBeSold()) return null;
      
      return Math.floor(item.sellPrice! * shopModifier);
    } catch (error) {
      this.log.error(`Error getting sell price for item ${itemId}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE RECHERCHE AVANCÉE =====

  /**
   * Recherche d'items par nom/description
   */
  static async searchItems(query: string): Promise<IItemData[]> {
    try {
      this.log.debug(`Searching items with query: "${query}"`);
      
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      const items = await ItemData.searchItems(query.trim());
      
      this.log.debug(`Found ${items.length} items matching "${query}"`);
      return items;
    } catch (error) {
      this.log.error(`Error searching items with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Recherche avancée avec filtres multiples
   */
  static async searchItemsAdvanced(filters: {
    query?: string;
    category?: ItemCategory;
    generation?: number;
    rarity?: ItemRarity;
    priceMin?: number;
    priceMax?: number;
    buyable?: boolean;
    sellable?: boolean;
    hasEffect?: EffectTrigger;
    obtainMethod?: ObtainMethod;
    tags?: string[];
    consumable?: boolean;
  }): Promise<IItemData[]> {
    try {
      this.log.debug("Advanced item search:", filters);
      
      const mongoQuery: any = { isActive: true };
      
      // Filtres de base
      if (filters.category) mongoQuery.category = filters.category;
      if (filters.generation) mongoQuery.generation = filters.generation;
      if (filters.rarity) mongoQuery.rarity = filters.rarity;
      
      // Filtres de prix
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        mongoQuery.price = { $ne: null };
        if (filters.priceMin !== undefined) mongoQuery.price.$gte = filters.priceMin;
        if (filters.priceMax !== undefined) mongoQuery.price.$lte = filters.priceMax;
      }
      
      // Filtres d'achat/vente
      if (filters.buyable === true) {
        mongoQuery.price = { $ne: null, $gt: 0 };
      }
      if (filters.sellable === true) {
        mongoQuery.sellPrice = { $ne: null, $gt: 0 };
      }
      
      // Filtre d'effet
      if (filters.hasEffect) {
        mongoQuery['effects.trigger'] = filters.hasEffect;
      }
      
      // Filtre de méthode d'obtention
      if (filters.obtainMethod) {
        mongoQuery['obtainMethods.method'] = filters.obtainMethod;
      }
      
      // Filtre de tags
      if (filters.tags && filters.tags.length > 0) {
        mongoQuery.tags = { $in: filters.tags };
      }
      
      // Filtre consommable
      if (filters.consumable !== undefined) {
        mongoQuery.consumable = filters.consumable;
      }
      
      let items = await ItemData.find(mongoQuery).sort({ name: 1 });
      
      // Filtre textuel si spécifié
      if (filters.query && filters.query.trim().length > 0) {
        const searchTerm = filters.query.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      this.log.debug(`Advanced search found ${items.length} items`);
      return items;
    } catch (error) {
      this.log.error("Error in advanced item search:", error);
      throw error;
    }
  }

  /**
   * Récupère les items par méthode d'obtention
   */
  static async getItemsByObtainMethod(method: ObtainMethod): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by obtain method: ${method}`);
      
      const items = await ItemData.find({
        'obtainMethods.method': method,
        isActive: true
      }).sort({ name: 1 });
      
      this.log.debug(`Found ${items.length} items obtainable via ${method}`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items by obtain method ${method}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les items par lieu d'obtention
   */
  static async getItemsByLocation(location: string): Promise<IItemData[]> {
    try {
      this.log.debug(`Getting items by location: ${location}`);
      
      const items = await ItemData.find({
        'obtainMethods.location': location,
        isActive: true
      }).sort({ name: 1 });
      
      this.log.debug(`Found ${items.length} items available at ${location}`);
      return items;
    } catch (error) {
      this.log.error(`Error getting items by location ${location}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE TRAITEMENT D'EFFETS =====

  /**
   * Utilise un item et traite ses effets
   */
  static async useItem(
    itemId: string, 
    trigger: EffectTrigger, 
    context: any
  ): Promise<{
    success: boolean;
    results: EffectProcessResult[];
    item_consumed: boolean;
    messages: string[];
    errors?: string[];
  }> {
    try {
      this.log.debug(`Using item ${itemId} with trigger ${trigger}`);
      
      const item = await this.getItemById(itemId);
      if (!item) {
        return {
          success: false,
          results: [],
          item_consumed: false,
          messages: [`Item ${itemId} not found`],
          errors: [`Item ${itemId} not found`]
        };
      }
      
      // Vérifier si l'item peut être utilisé dans ce contexte
      if (!item.canBeUsedBy(context)) {
        return {
          success: false,
          results: [],
          item_consumed: false,
          messages: [`${item.name} cannot be used here`],
          errors: [`Usage restrictions not met for ${itemId}`]
        };
      }
      
      // Traiter les effets
      const results = await ItemEffectProcessor.processItemEffects(
        item.effects, 
        trigger, 
        { ...context, item: { id: itemId, quantity: context.quantity || 1 } }
      );
      
      // Compiler les résultats
      const success = results.some((r: any) => r.success);
      const itemConsumed = results.some((r: any) => r.consumed_item) && item.isConsumable();
      const messages = results.map((r: any) => r.message).filter((m: any) => m) as string[];
      const errors = results.flatMap((r: any) => r.errors || []);
      
      this.log.info(`Item ${itemId} used: ${success ? 'SUCCESS' : 'FAILURE'}, consumed: ${itemConsumed}`);
      
      return {
        success,
        results,
        item_consumed: itemConsumed,
        messages,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      this.log.error(`Error using item ${itemId}:`, error);
      return {
        success: false,
        results: [],
        item_consumed: false,
        messages: ['An error occurred while using the item'],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Vérifie si un item a un effet spécifique
   */
  static async itemHasEffect(itemId: string, trigger: EffectTrigger): Promise<boolean> {
    try {
      const item = await this.getItemById(itemId);
      if (!item) return false;
      
      return item.hasEffect(trigger);
    } catch (error) {
      this.log.error(`Error checking item effect for ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Récupère les effets d'un item pour un trigger donné
   */
  static async getItemEffects(itemId: string, trigger: EffectTrigger) {
    try {
      const item = await this.getItemById(itemId);
      if (!item) return [];
      
      return item.getEffectsByTrigger(trigger);
    } catch (error) {
      this.log.error(`Error getting item effects for ${itemId}:`, error);
      return [];
    }
  }

  // ===== MÉTHODES D'UTILITÉ =====

  /**
   * Vérifie si un item existe et est actif
   */
  static async itemExists(itemId: string): Promise<boolean> {
    try {
      const item = await ItemData.findOne({ 
        itemId, 
        isActive: true 
      }).select('_id');
      
      return !!item;
    } catch (error) {
      this.log.error(`Error checking if item exists ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Vérifie si plusieurs items existent
   */
  static async itemsExist(itemIds: string[]): Promise<{ [itemId: string]: boolean }> {
    try {
      if (itemIds.length === 0) return {};
      
      const existingItems = await ItemData.find({ 
        itemId: { $in: itemIds }, 
        isActive: true 
      }).select('itemId');
      
      const existingIds = new Set(existingItems.map(item => item.itemId));
      
      const result: { [itemId: string]: boolean } = {};
      for (const itemId of itemIds) {
        result[itemId] = existingIds.has(itemId);
      }
      
      return result;
    } catch (error) {
      this.log.error("Error checking if items exist:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques détaillées des items
   */
  static async getItemStats(): Promise<{
    total: number;
    byCategory: { [category: string]: number };
    byGeneration: { [generation: string]: number };
    byRarity: { [rarity: string]: number };
    byObtainMethod: { [method: string]: number };
    buyable: number;
    sellable: number;
    withEffects: number;
    consumable: number;
    averagePrice: number;
  }> {
    try {
      this.log.debug("Getting comprehensive item statistics");
      
      const [
        total,
        byCategory,
        byGeneration, 
        byRarity,
        byObtainMethod,
        buyableCount,
        sellableCount,
        withEffectsCount,
        consumableCount,
        averagePrice
      ] = await Promise.all([
        // Total des items actifs
        ItemData.countDocuments({ isActive: true }),
        
        // Par catégorie
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        
        // Par génération
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$generation', count: { $sum: 1 } } }
        ]),
        
        // Par rareté
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$rarity', count: { $sum: 1 } } }
        ]),
        
        // Par méthode d'obtention
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $unwind: '$obtainMethods' },
          { $group: { _id: '$obtainMethods.method', count: { $sum: 1 } } }
        ]),
        
        // Items achetables
        ItemData.countDocuments({ 
          isActive: true, 
          price: { $ne: null, $gt: 0 } 
        }),
        
        // Items vendables
        ItemData.countDocuments({ 
          isActive: true, 
          sellPrice: { $ne: null, $gt: 0 } 
        }),
        
        // Items avec effets
        ItemData.countDocuments({
          isActive: true,
          'effects.0': { $exists: true }
        }),
        
        // Items consommables
        ItemData.countDocuments({
          isActive: true,
          consumable: true
        }),
        
        // Prix moyen
        ItemData.aggregate([
          { $match: { isActive: true, price: { $ne: null, $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$price' } } }
        ])
      ]);
      
      const stats = {
        total,
        byCategory: {} as { [category: string]: number },
        byGeneration: {} as { [generation: string]: number },
        byRarity: {} as { [rarity: string]: number },
        byObtainMethod: {} as { [method: string]: number },
        buyable: buyableCount,
        sellable: sellableCount,
        withEffects: withEffectsCount,
        consumable: consumableCount,
        averagePrice: averagePrice[0]?.avg || 0
      };
      
      // Transformer les résultats d'agrégation
      byCategory.forEach((item: any) => stats.byCategory[item._id] = item.count);
      byGeneration.forEach((item: any) => stats.byGeneration[item._id] = item.count);
      byRarity.forEach((item: any) => stats.byRarity[item._id] = item.count);
      byObtainMethod.forEach((item: any) => stats.byObtainMethod[item._id] = item.count);
      
      this.log.info("Comprehensive item statistics:", stats);
      return stats;
    } catch (error) {
      this.log.error("Error getting item statistics:", error);
      throw error;
    }
  }

  // ===== MÉTHODES D'ADMINISTRATION =====

  /**
   * Crée un nouvel item
   */
  static async createItem(itemData: {
    itemId: string;
    name: string;
    description: string;
    category: ItemCategory;
    effects?: any[];
    [key: string]: any;
  }): Promise<IItemData> {
    try {
      this.log.info(`Creating new item: ${itemData.itemId}`);
      
      // Vérifier si l'item existe déjà
      const existing = await this.getItemById(itemData.itemId);
      if (existing) {
        throw new Error(`Item with ID "${itemData.itemId}" already exists`);
      }
      
      const item = new ItemData(itemData);
      await item.save();
      
      this.log.info(`Item created successfully: ${itemData.itemId}`);
      return item;
    } catch (error) {
      this.log.error(`Error creating item ${itemData.itemId}:`, error);
      throw error;
    }
  }

  /**
   * Met à jour un item existant
   */
  static async updateItem(itemId: string, updateData: Partial<IItemData>): Promise<IItemData | null> {
    try {
      this.log.info(`Updating item: ${itemId}`);
      
      const item = await ItemData.findOneAndUpdate(
        { itemId, isActive: true },
        { 
          ...updateData, 
          lastUpdated: new Date() 
        },
        { new: true, runValidators: true }
      );
      
      if (!item) {
        this.log.warn(`Item not found for update: ${itemId}`);
        return null;
      }
      
      this.log.info(`Item updated successfully: ${itemId}`);
      return item;
    } catch (error) {
      this.log.error(`Error updating item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Désactive un item (soft delete)
   */
  static async deactivateItem(itemId: string): Promise<boolean> {
    try {
      this.log.info(`Deactivating item: ${itemId}`);
      
      const result = await ItemData.findOneAndUpdate(
        { itemId, isActive: true },
        { isActive: false, lastUpdated: new Date() }
      );
      
      if (!result) {
        this.log.warn(`Item not found for deactivation: ${itemId}`);
        return false;
      }
      
      this.log.info(`Item deactivated successfully: ${itemId}`);
      return true;
    } catch (error) {
      this.log.error(`Error deactivating item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Réactive un item
   */
  static async reactivateItem(itemId: string): Promise<boolean> {
    try {
      this.log.info(`Reactivating item: ${itemId}`);
      
      const result = await ItemData.findOneAndUpdate(
        { itemId },
        { isActive: true, lastUpdated: new Date() }
      );
      
      if (!result) {
        this.log.warn(`Item not found for reactivation: ${itemId}`);
        return false;
      }
      
      this.log.info(`Item reactivated successfully: ${itemId}`);
      return true;
    } catch (error) {
      this.log.error(`Error reactivating item ${itemId}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE MIGRATION ET VALIDATION =====

  /**
   * Import en masse depuis JSON
   */
  static async importFromJson(jsonData: any): Promise<{
    success: number;
    errors: string[];
    skipped: number;
    migrated: number;
  }> {
    try {
      this.log.info("Starting bulk import from JSON");
      
      const results = await ItemData.bulkImportFromJson(jsonData);
      
      this.log.info(`Import completed: ${results.success} items imported, ${results.errors.length} errors`);
      
      return {
        success: results.success,
        errors: results.errors,
        skipped: 0,
        migrated: 0
      };
    } catch (error) {
      this.log.error("Error during JSON import:", error);
      throw error;
    }
  }

  /**
   * Valide l'intégrité de la base de données des items
   */
  static async validateDatabase(): Promise<{
    valid: boolean;
    issues: string[];
    stats: any;
    effectValidation: any;
  }> {
    try {
      this.log.info("Validating item database integrity");
      
      const [integrity, stats, effectValidation] = await Promise.all([
        this.validateDatabaseIntegrity(),
        this.getItemStats(),
        ItemData.validateAllEffects()
      ]);
      
      this.log.info(`Database validation completed: ${integrity.valid ? 'VALID' : 'INVALID'}`);
      if (integrity.issues.length > 0) {
        this.log.warn("Database issues found:", integrity.issues);
      }
      
      return {
        valid: integrity.valid && effectValidation.items_with_errors === 0,
        issues: [...integrity.issues, ...effectValidation.errors],
        stats,
        effectValidation
      };
    } catch (error) {
      this.log.error("Error validating database:", error);
      throw error;
    }
  }

  /**
   * Valide l'intégrité de base des données
   */
  private static async validateDatabaseIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const result = { valid: true, issues: [] as string[] };
    
    try {
      // Vérifier les doublons
      const duplicates = await ItemData.aggregate([
        { $group: { _id: '$itemId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      
      for (const dup of duplicates) {
        result.issues.push(`Duplicate item ID: ${dup._id}`);
        result.valid = false;
      }
      
      // Vérifier les prix incohérents
      const badPrices = await ItemData.find({
        $and: [
          { price: { $ne: null } },
          { sellPrice: { $ne: null } },
          { $expr: { $gt: ['$sellPrice', '$price'] } }
        ]
      }).select('itemId price sellPrice');
      
      for (const item of badPrices) {
        result.issues.push(`Item ${item.itemId}: sell price (${item.sellPrice}) > buy price (${item.price})`);
      }
      
      // Vérifier les descriptions manquantes
      const missingDescriptions = await ItemData.countDocuments({
        $or: [
          { description: { $exists: false } },
          { description: '' },
          { description: null }
        ],
        isActive: true
      });
      
      if (missingDescriptions > 0) {
        result.issues.push(`${missingDescriptions} items missing descriptions`);
      }
      
      // Vérifier les items sans méthode d'obtention
      const noObtainMethods = await ItemData.countDocuments({
        $or: [
          { obtainMethods: { $exists: false } },
          { obtainMethods: { $size: 0 } }
        ],
        isActive: true
      });
      
      if (noObtainMethods > 0) {
        result.issues.push(`${noObtainMethods} items without obtain methods`);
      }
      
    } catch (error) {
      result.issues.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }
    
    return result;
  }

  /**
   * Migre tous les items depuis le format hérité
   */
  static async migrateAllFromLegacy(): Promise<{ migrated: number; errors: string[] }> {
    try {
      this.log.info("Starting migration from legacy format");
      
      const results = await ItemData.migrateAllFromLegacy();
      
      this.log.info(`Migration completed: ${results.migrated} items migrated, ${results.errors.length} errors`);
      
      return results;
    } catch (error) {
      this.log.error("Error during legacy migration:", error);
      throw error;
    }
  }

  /**
   * Exporte tous les items au format JSON
   */
  static async exportToJson(): Promise<{ [itemId: string]: any }> {
    try {
      this.log.info("Exporting all items to JSON format");
      
      const items = await this.getAllItems();
      const jsonData: { [itemId: string]: any } = {};
      
      for (const item of items) {
        jsonData[item.itemId] = item.toItemFormat();
      }
      
      this.log.info(`Exported ${items.length} items to JSON`);
      return jsonData;
    } catch (error) {
      this.log.error("Error exporting items to JSON:", error);
      throw error;
    }
  }

  /**
   * Valide les effets d'un item spécifique
   */
  static async validateItemEffects(itemId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        return {
          valid: false,
          errors: [`Item ${itemId} not found`],
          warnings: []
        };
      }
      
      return await item.validateEffects();
    } catch (error) {
      this.log.error(`Error validating effects for item ${itemId}:`, error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }
}
