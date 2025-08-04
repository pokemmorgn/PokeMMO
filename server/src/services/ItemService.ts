// server/src/services/ItemService.ts - SERVICE POUR LA GESTION DES ITEMS
import { ItemData, IItemData, ItemType, ItemPocket, ItemRarity } from "../models/ItemData";
import { Logger } from "../utils/Logger";

export class ItemService {
  private static logger = new Logger("ItemService");

  // ===== MÉTHODES DE RÉCUPÉRATION =====

  /**
   * Récupère un item par son ID
   */
  static async getItemById(itemId: string): Promise<IItemData | null> {
    try {
      this.logger.debug(`Getting item by ID: ${itemId}`);
      
      const item = await ItemData.findOne({ 
        itemId, 
        isActive: true 
      });
      
      if (!item) {
        this.logger.warn(`Item not found: ${itemId}`);
        return null;
      }
      
      return item;
    } catch (error) {
      this.logger.error(`Error getting item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère plusieurs items par leurs IDs
   */
  static async getItemsByIds(itemIds: string[]): Promise<IItemData[]> {
    try {
      this.logger.debug(`Getting items by IDs: ${itemIds.join(', ')}`);
      
      if (itemIds.length === 0) return [];
      
      const items = await ItemData.find({ 
        itemId: { $in: itemIds }, 
        isActive: true 
      }).sort({ name: 1 });
      
      return items;
    } catch (error) {
      this.logger.error(`Error getting items by IDs:`, error);
      throw error;
    }
  }

  /**
   * Récupère tous les items actifs
   */
  static async getAllItems(): Promise<IItemData[]> {
    try {
      this.logger.debug("Getting all active items");
      
      const items = await ItemData.findActiveItems();
      
      this.logger.info(`Retrieved ${items.length} active items`);
      return items;
    } catch (error) {
      this.logger.error("Error getting all items:", error);
      throw error;
    }
  }

  /**
   * Récupère les items par type
   */
  static async getItemsByType(type: ItemType): Promise<IItemData[]> {
    try {
      this.logger.debug(`Getting items by type: ${type}`);
      
      const items = await ItemData.findByType(type);
      
      this.logger.debug(`Found ${items.length} items of type ${type}`);
      return items;
    } catch (error) {
      this.logger.error(`Error getting items by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les items par poche
   */
  static async getItemsByPocket(pocket: ItemPocket): Promise<IItemData[]> {
    try {
      this.logger.debug(`Getting items by pocket: ${pocket}`);
      
      const items = await ItemData.findByPocket(pocket);
      
      this.logger.debug(`Found ${items.length} items in pocket ${pocket}`);
      return items;
    } catch (error) {
      this.logger.error(`Error getting items by pocket ${pocket}:`, error);
      throw error;
    }
  }

  /**
   * Récupère les items par rareté
   */
  static async getItemsByRarity(rarity: ItemRarity): Promise<IItemData[]> {
    try {
      this.logger.debug(`Getting items by rarity: ${rarity}`);
      
      const items = await ItemData.findByRarity(rarity);
      
      this.logger.debug(`Found ${items.length} items of rarity ${rarity}`);
      return items;
    } catch (error) {
      this.logger.error(`Error getting items by rarity ${rarity}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES ÉCONOMIQUES =====

  /**
   * Récupère les items achetables
   */
  static async getBuyableItems(): Promise<IItemData[]> {
    try {
      this.logger.debug("Getting buyable items");
      
      const items = await ItemData.findBuyableItems();
      
      this.logger.debug(`Found ${items.length} buyable items`);
      return items;
    } catch (error) {
      this.logger.error("Error getting buyable items:", error);
      throw error;
    }
  }

  /**
   * Récupère les items vendables
   */
  static async getSellableItems(): Promise<IItemData[]> {
    try {
      this.logger.debug("Getting sellable items");
      
      const items = await ItemData.findSellableItems();
      
      this.logger.debug(`Found ${items.length} sellable items`);
      return items;
    } catch (error) {
      this.logger.error("Error getting sellable items:", error);
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
      this.logger.error(`Error getting buy price for item ${itemId}:`, error);
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
      this.logger.error(`Error getting sell price for item ${itemId}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE RECHERCHE =====

  /**
   * Recherche d'items par nom/description
   */
  static async searchItems(query: string): Promise<IItemData[]> {
    try {
      this.logger.debug(`Searching items with query: "${query}"`);
      
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      const items = await ItemData.searchItems(query.trim());
      
      this.logger.debug(`Found ${items.length} items matching "${query}"`);
      return items;
    } catch (error) {
      this.logger.error(`Error searching items with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Recherche avancée avec filtres
   */
  static async searchItemsAdvanced(filters: {
    query?: string;
    type?: ItemType;
    pocket?: ItemPocket;
    rarity?: ItemRarity;
    priceMin?: number;
    priceMax?: number;
    buyable?: boolean;
    sellable?: boolean;
    usableInBattle?: boolean;
    usableInField?: boolean;
  }): Promise<IItemData[]> {
    try {
      this.logger.debug("Advanced item search:", filters);
      
      const query: any = { isActive: true };
      
      // Filtres de base
      if (filters.type) query.type = filters.type;
      if (filters.pocket) query.pocket = filters.pocket;
      if (filters.rarity) query.rarity = filters.rarity;
      
      // Filtres de prix
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        query.price = { $ne: null };
        if (filters.priceMin !== undefined) query.price.$gte = filters.priceMin;
        if (filters.priceMax !== undefined) query.price.$lte = filters.priceMax;
      }
      
      // Filtres d'achat/vente
      if (filters.buyable === true) {
        query.price = { $ne: null, $gt: 0 };
      }
      if (filters.sellable === true) {
        query.sellPrice = { $ne: null, $gt: 0 };
      }
      
      // Filtres d'utilisation
      if (filters.usableInBattle !== undefined) {
        query.usableInBattle = filters.usableInBattle;
      }
      if (filters.usableInField !== undefined) {
        query.usableInField = filters.usableInField;
      }
      
      let items = await ItemData.find(query).sort({ name: 1 });
      
      // Filtre textuel si spécifié
      if (filters.query && filters.query.trim().length > 0) {
        const searchTerm = filters.query.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      this.logger.debug(`Advanced search found ${items.length} items`);
      return items;
    } catch (error) {
      this.logger.error("Error in advanced item search:", error);
      throw error;
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
      this.logger.error(`Error checking if item exists ${itemId}:`, error);
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
      this.logger.error("Error checking if items exist:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques des items
   */
  static async getItemStats(): Promise<{
    total: number;
    byType: { [type: string]: number };
    byPocket: { [pocket: string]: number };
    byRarity: { [rarity: string]: number };
    buyable: number;
    sellable: number;
  }> {
    try {
      this.logger.debug("Getting item statistics");
      
      const [
        total,
        byType,
        byPocket, 
        byRarity,
        buyableCount,
        sellableCount
      ] = await Promise.all([
        // Total des items actifs
        ItemData.countDocuments({ isActive: true }),
        
        // Par type
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        
        // Par poche
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$pocket', count: { $sum: 1 } } }
        ]),
        
        // Par rareté
        ItemData.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$rarity', count: { $sum: 1 } } }
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
        })
      ]);
      
      const stats = {
        total,
        byType: {} as { [type: string]: number },
        byPocket: {} as { [pocket: string]: number },
        byRarity: {} as { [rarity: string]: number },
        buyable: buyableCount,
        sellable: sellableCount
      };
      
      // Transformer les résultats d'agrégation
      byType.forEach((item: any) => stats.byType[item._id] = item.count);
      byPocket.forEach((item: any) => stats.byPocket[item._id] = item.count);
      byRarity.forEach((item: any) => stats.byRarity[item._id] = item.count);
      
      this.logger.info("Item statistics:", stats);
      return stats;
    } catch (error) {
      this.logger.error("Error getting item statistics:", error);
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
    type: ItemType;
    pocket: ItemPocket;
    price?: number | null;
    sellPrice?: number | null;
    description?: string;
    [key: string]: any;
  }): Promise<IItemData> {
    try {
      this.logger.info(`Creating new item: ${itemData.itemId}`);
      
      // Vérifier si l'item existe déjà
      const existing = await this.getItemById(itemData.itemId);
      if (existing) {
        throw new Error(`Item with ID "${itemData.itemId}" already exists`);
      }
      
      const item = new ItemData(itemData);
      await item.save();
      
      this.logger.info(`Item created successfully: ${itemData.itemId}`);
      return item;
    } catch (error) {
      this.logger.error(`Error creating item ${itemData.itemId}:`, error);
      throw error;
    }
  }

  /**
   * Met à jour un item existant
   */
  static async updateItem(itemId: string, updateData: Partial<IItemData>): Promise<IItemData | null> {
    try {
      this.logger.info(`Updating item: ${itemId}`);
      
      const item = await ItemData.findOneAndUpdate(
        { itemId, isActive: true },
        { 
          ...updateData, 
          lastUpdated: new Date() 
        },
        { new: true, runValidators: true }
      );
      
      if (!item) {
        this.logger.warn(`Item not found for update: ${itemId}`);
        return null;
      }
      
      this.logger.info(`Item updated successfully: ${itemId}`);
      return item;
    } catch (error) {
      this.logger.error(`Error updating item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Désactive un item (soft delete)
   */
  static async deactivateItem(itemId: string): Promise<boolean> {
    try {
      this.logger.info(`Deactivating item: ${itemId}`);
      
      const result = await ItemData.findOneAndUpdate(
        { itemId, isActive: true },
        { isActive: false, lastUpdated: new Date() }
      );
      
      if (!result) {
        this.logger.warn(`Item not found for deactivation: ${itemId}`);
        return false;
      }
      
      this.logger.info(`Item deactivated successfully: ${itemId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deactivating item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Réactive un item
   */
  static async reactivateItem(itemId: string): Promise<boolean> {
    try {
      this.logger.info(`Reactivating item: ${itemId}`);
      
      const result = await ItemData.findOneAndUpdate(
        { itemId },
        { isActive: true, lastUpdated: new Date() }
      );
      
      if (!result) {
        this.logger.warn(`Item not found for reactivation: ${itemId}`);
        return false;
      }
      
      this.logger.info(`Item reactivated successfully: ${itemId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error reactivating item ${itemId}:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES DE MIGRATION =====

  /**
   * Import en masse depuis JSON
   */
  static async importFromJson(jsonData: any): Promise<{
    success: number;
    errors: string[];
    skipped: number;
  }> {
    try {
      this.logger.info("Starting bulk import from JSON");
      
      const results = await ItemData.bulkImportFromJson(jsonData);
      
      this.logger.info(`Import completed: ${results.success} items imported, ${results.errors.length} errors`);
      
      return {
        success: results.success,
        errors: results.errors,
        skipped: 0
      };
    } catch (error) {
      this.logger.error("Error during JSON import:", error);
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
  }> {
    try {
      this.logger.info("Validating item database integrity");
      
      const [integrity, stats] = await Promise.all([
        ItemData.validateDatabaseIntegrity(),
        this.getItemStats()
      ]);
      
      this.logger.info(`Database validation completed: ${integrity.valid ? 'VALID' : 'INVALID'}`);
      if (integrity.issues.length > 0) {
        this.logger.warn("Database issues found:", integrity.issues);
      }
      
      return {
        valid: integrity.valid,
        issues: integrity.issues,
        stats
      };
    } catch (error) {
      this.logger.error("Error validating database:", error);
      throw error;
    }
  }

  /**
   * Exporte tous les items au format JSON
   */
  static async exportToJson(): Promise<{ [itemId: string]: any }> {
    try {
      this.logger.info("Exporting all items to JSON format");
      
      const items = await this.getAllItems();
      const jsonData: { [itemId: string]: any } = {};
      
      for (const item of items) {
        jsonData[item.itemId] = item.toItemFormat();
      }
      
      this.logger.info(`Exported ${items.length} items to JSON`);
      return jsonData;
    } catch (error) {
      this.logger.error("Error exporting items to JSON:", error);
      throw error;
    }
  }
}
