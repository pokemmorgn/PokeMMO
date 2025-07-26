// server/src/managers/ShopManager.ts - VERSION HYBRIDE CORRIGÉE avec ShopData.ts

import fs from "fs";
import path from "path";
import { InventoryManager } from "./InventoryManager";
import { ShopData, IShopData, ShopType, Currency, ShopCategory } from "../models/ShopData";

// ===== ÉNUMÉRATION DES SOURCES =====
export enum ShopDataSource {
  JSON = 'json',
  MONGODB = 'mongodb', 
  HYBRID = 'hybrid'
}

// ===== INTERFACES LEGACY (compatibilité) =====
export interface ShopItem {
  itemId: string;
  customPrice?: number;
  stock?: number;
  unlockLevel?: number;
  unlockQuest?: string;
}

export interface ShopDefinition {
  id: string;
  nameKey?: string;            // ✅ Support des IDs de localisation
  name?: string;               // ✅ Rétro-compatibilité
  type: 'general' | 'pokemart' | 'specialist' | 'black_market' | 'temporary';
  descriptionKey?: string;     // ✅ ID de localisation pour description
  description?: string;        // ✅ Rétro-compatibilité
  items: ShopItem[];
  buyMultiplier?: number;
  sellMultiplier?: number;
  currency?: 'gold' | 'tokens' | 'battle_points';
  restockInterval?: number;
  lastRestock?: number;
  isTemporary?: boolean;
  
  // ✅ NOUVEAUX CHAMPS pour MongoDB
  location?: {
    zone: string;
    cityKey?: string;
    city?: string;             // Rétro-compatibilité
  };
  shopKeeper?: {
    nameKey?: string;          // ✅ ID de localisation
    name?: string;             // Rétro-compatibilité
    personalityKey?: string;
    personality?: string;      // Rétro-compatibilité
  };
  dialogues?: {
    welcomeKeys?: string[];    // ✅ IDs de localisation
    purchaseKeys?: string[];
    saleKeys?: string[];
    notEnoughMoneyKeys?: string[];
    comeBackLaterKeys?: string[];
    closedKeys?: string[];
    restrictedKeys?: string[];
    // Rétro-compatibilité
    welcome?: string[];
    purchase?: string[];
    sale?: string[];
    notEnoughMoney?: string[];
    comeBackLater?: string[];
    closed?: string[];
    restricted?: string[];
  };
  sourceType?: 'json' | 'mongodb';
}

export interface TransactionResult {
  success: boolean;
  message: string;
  messageKey?: string;         // ✅ ID de localisation pour le message
  newGold?: number;
  itemsChanged?: {
    itemId: string;
    quantityChanged: number;
    newQuantity: number;
  }[];
  shopStockChanged?: {
    itemId: string;
    newStock: number;
  }[];
}

// ===== CONFIGURATION =====
interface ShopManagerConfig {
  primaryDataSource: ShopDataSource;
  useMongoCache: boolean;
  cacheTTL: number;
  enableFallback: boolean;
  
  shopsDataPath: string;
  itemsDataPath: string;
  autoLoadJSON: boolean;
  debugMode: boolean;
  
  // ✅ NOUVEAU : Support localisation
  enableLocalization: boolean;
  defaultLanguage: string;
}

export class ShopManager {
  // ===== STOCKAGE DONNÉES =====
  private shopDefinitions: Map<string, ShopDefinition> = new Map();
  private itemPrices: Map<string, number> = new Map();
  private temporaryShops: Map<string, ShopDefinition> = new Map();
  
  // ===== SYSTÈME MONGODB =====
  private mongoCache: Map<string, { data: IShopData[]; timestamp: number }> = new Map();
  private shopSourceMap: Map<string, ShopDataSource> = new Map();
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // ===== HOT RELOAD =====
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, shopData?: any) => void> = [];
  
  // ===== CONFIGURATION =====
  private config: ShopManagerConfig = {
    primaryDataSource: ShopDataSource.MONGODB,
    useMongoCache: process.env.SHOP_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.SHOP_CACHE_TTL || '1800000'), // 30 min
    enableFallback: process.env.SHOP_FALLBACK !== 'false',
    
    shopsDataPath: "../data/shops.json",
    itemsDataPath: "../data/items.json", 
    autoLoadJSON: true,
    debugMode: process.env.NODE_ENV === 'development',
    
    // Support localisation
    enableLocalization: process.env.SHOP_LOCALIZATION !== 'false',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en'
  };

  // ===== CONSTRUCTEUR =====
  constructor(
    shopsDataPath: string = "../data/shops.json",
    itemsDataPath: string = "../data/items.json",
    customConfig?: Partial<ShopManagerConfig>
  ) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.config.shopsDataPath = shopsDataPath;
    this.config.itemsDataPath = itemsDataPath;
    
    this.log('info', `🏪 [ShopManager] Construction avec source: ${this.config.primaryDataSource}`, {
      primarySource: this.config.primaryDataSource,
      fallback: this.config.enableFallback,
      localization: this.config.enableLocalization
    });

    this.log('info', `✅ [ShopManager] Construit (pas encore initialisé)`);
  }

  // ===== INITIALISATION ASYNCHRONE =====
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('info', `♻️ [ShopManager] Déjà initialisé`);
      return;
    }
    
    if (this.isInitializing) {
      this.log('info', `⏳ [ShopManager] Initialisation en cours...`);
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    this.log('info', `🔄 [ShopManager] Démarrage initialisation asynchrone...`);
    
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.log('info', `✅ [ShopManager] Initialisation terminée`, {
        totalShops: this.shopDefinitions.size,
        temporaryShops: this.temporaryShops.size,
        prices: this.itemPrices.size
      });
    } catch (error) {
      this.log('error', `❌ [ShopManager] Erreur initialisation:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      // 1. Charger les prix des items (nécessaire pour les deux sources)
      await this.loadItemPrices();
      
      // 2. Charger les shops selon la stratégie configurée
      switch (this.config.primaryDataSource) {
        case ShopDataSource.MONGODB:
          await this.loadShopsFromMongoDB();
          break;
          
        case ShopDataSource.JSON:
          this.loadShopsFromJSON();
          break;
          
        case ShopDataSource.HYBRID:
          try {
            await this.loadShopsFromMongoDB();
          } catch (mongoError) {
            this.log('warn', `⚠️ [Hybrid] MongoDB échoué, fallback JSON`);
            this.loadShopsFromJSON();
          }
          break;
      }
      
      // 3. Démarrer Hot Reload si MongoDB
      if (this.config.primaryDataSource === ShopDataSource.MONGODB && this.hotReloadEnabled) {
        this.startHotReload();
      }
      
    } catch (error) {
      this.log('error', `❌ [ShopManager] Erreur lors de l'initialisation:`, error);
      throw error;
    }
  }

  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [ShopManager] Attente du chargement des shops (timeout: ${timeoutMs}ms)...`);
    
    // Lancer l'initialisation si pas encore fait
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [ShopManager] Lancement de l'initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [ShopManager] Erreur initialisation:`, error);
      });
    }
    
    // Attendre que l'initialisation se termine
    while ((!this.isInitialized || this.shopDefinitions.size === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.shopDefinitions.size > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [ShopManager] Shops chargés: ${this.shopDefinitions.size} shops en ${loadTime}ms`);
    } else {
      this.log('warn', `⚠️ [ShopManager] Timeout après ${timeoutMs}ms`);
    }
    
    return loaded;
  }

  // ===== CHARGEMENT MONGODB =====
  private async loadShopsFromMongoDB(): Promise<void> {
    try {
      this.log('info', `🗄️ [MongoDB] Chargement des shops...`);
      
      // Attendre que MongoDB soit prêt
      await this.waitForMongoDBReady();
      
      const mongoShops = await ShopData.findActiveShops();
      
      let convertedCount = 0;
      for (const mongoShop of mongoShops) {
        try {
          const shopDefinition = this.convertMongoToShopDefinition(mongoShop);
          this.shopDefinitions.set(shopDefinition.id, shopDefinition);
          this.shopSourceMap.set(shopDefinition.id, ShopDataSource.MONGODB);
          convertedCount++;
        } catch (error) {
          this.log('error', `❌ [MongoDB] Erreur conversion shop ${mongoShop.shopId}:`, error);
        }
      }
      
      this.log('info', `✅ [MongoDB] ${convertedCount} shops chargés depuis MongoDB`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur chargement:`, error);
      
      if (this.config.enableFallback) {
        this.log('info', `🔄 [Fallback] Tentative chargement JSON`);
        this.loadShopsFromJSON();
      } else {
        throw error;
      }
    }
  }

  // ✅ CONVERSION MONGODB → SHOP DEFINITION CORRIGÉE
  private convertMongoToShopDefinition(mongoShop: IShopData): ShopDefinition {
    return {
      id: mongoShop.shopId,
      nameKey: mongoShop.nameKey,
      name: undefined, // Pas de nom legacy, on utilise nameKey
      type: this.mapShopType(mongoShop.type),
      descriptionKey: `shop.description.${mongoShop.shopId}`,
      items: mongoShop.items.map(item => ({
        itemId: item.itemId,
        customPrice: item.basePrice,
        stock: item.stock,
        unlockLevel: item.unlockLevel,
        unlockQuest: item.requiredQuests?.[0]
      })),
      buyMultiplier: mongoShop.buyMultiplier,
      sellMultiplier: mongoShop.sellMultiplier,
      currency: this.mapCurrency(mongoShop.currency),
      restockInterval: mongoShop.restockInfo?.interval || 0,
      lastRestock: mongoShop.restockInfo?.lastRestock?.getTime(),
      isTemporary: mongoShop.isTemporary,
      
      // ✅ Nouvelles données avec support localisation
      location: {
        zone: mongoShop.location.zone,
        cityKey: mongoShop.location.cityKey,
        city: undefined // Pas de nom legacy, on utilise cityKey
      },
      shopKeeper: mongoShop.shopKeeper ? {
        nameKey: mongoShop.shopKeeper.nameKey,
        name: undefined, // Pas de nom legacy
        personalityKey: mongoShop.shopKeeper.personalityKey,
        personality: undefined // Pas de personnalité legacy
      } : undefined,
      dialogues: mongoShop.dialogues ? {
        welcomeKeys: mongoShop.dialogues.welcomeKeys,
        purchaseKeys: mongoShop.dialogues.purchaseKeys,
        saleKeys: mongoShop.dialogues.saleKeys,
        notEnoughMoneyKeys: mongoShop.dialogues.notEnoughMoneyKeys,
        comeBackLaterKeys: mongoShop.dialogues.comeBackLaterKeys,
        closedKeys: mongoShop.dialogues.closedKeys,
        restrictedKeys: mongoShop.dialogues.restrictedKeys
      } : undefined,
      sourceType: 'mongodb'
    };
  }

  // Mapping des types pour compatibilité
  private mapShopType(mongoType: ShopType): ShopDefinition['type'] {
    const typeMap: Record<ShopType, ShopDefinition['type']> = {
      'pokemart': 'pokemart',
      'department': 'general',
      'specialist': 'specialist', 
      'gym_shop': 'specialist',
      'contest_shop': 'specialist',
      'game_corner': 'specialist',
      'black_market': 'black_market',
      'trainer_shop': 'specialist',
      'temporary': 'temporary',
      'vending_machine': 'general',
      'online_shop': 'general'
    };
    return typeMap[mongoType] || 'general';
  }

  private mapCurrency(mongoCurrency: Currency): ShopDefinition['currency'] {
    const currencyMap: Record<Currency, ShopDefinition['currency']> = {
      'gold': 'gold',
      'battle_points': 'battle_points',
      'contest_points': 'tokens',
      'game_tokens': 'tokens', 
      'rare_candy': 'tokens'
    };
    return currencyMap[mongoCurrency] || 'gold';
  }

  private async waitForMongoDBReady(maxRetries: number = 10): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        this.log('info', `🏓 [MongoDB Ping] Tentative ${retries + 1}/${maxRetries}...`);
        
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Mongoose pas encore connecté');
        }
        
        await mongoose.connection.db.admin().ping();
        
        const shopCount = await ShopData.countDocuments();
        this.log('info', `✅ [MongoDB Ping] ${shopCount} shops détectés`);
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        this.log('warn', `⚠️ [MongoDB Ping] Échec ${retries}/${maxRetries}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ===== CHARGEMENT JSON (MÉTHODES EXISTANTES AMÉLIORÉES) =====
  private loadShopsFromJSON(): void {
    this.log('info', `📄 [JSON] Chargement des shops...`);
    this.loadShopDefinitionsFromJSON();
  }

  private loadShopDefinitionsFromJSON(): void {
    try {
      const foundPath = this.findShopsJsonPath();
      
      if (foundPath) {
        this.log('info', `🎯 [JSON] Utilisation du chemin: ${foundPath}`);
        this.loadShopDefinitionsFromPath(foundPath);
      } else {
        this.log('warn', `⚠️ [JSON] Aucun fichier shops.json trouvé, création de shops par défaut`);
        this.createDefaultShops();
      }
      
    } catch (error) {
      this.log('error', "❌ [JSON] Erreur lors du chargement des shops:", error);
      this.createDefaultShops();
    }
  }

  private findShopsJsonPath(): string | null {
    const possiblePaths = [
      path.resolve(__dirname, this.config.shopsDataPath),
      path.resolve(__dirname, "../data/shops.json"),
      path.resolve(__dirname, "../../data/shops.json"),
      path.resolve(__dirname, "../../../data/shops.json"),
      path.resolve(process.cwd(), "data/shops.json"),
      path.resolve(process.cwd(), "server/data/shops.json"),
      path.resolve(process.cwd(), "server/src/data/shops.json"),
      path.resolve(process.cwd(), "src/data/shops.json")
    ];
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
    
    return null;
  }

  private loadShopDefinitionsFromPath(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const shopsData = JSON.parse(fileContent);
      
      if (!shopsData.shops || !Array.isArray(shopsData.shops)) {
        throw new Error(`Structure JSON invalide: propriété 'shops' manquante ou invalide`);
      }
      
      for (const shop of shopsData.shops) {
        if (!shop.id || !shop.name) {
          this.log('warn', `⚠️ [JSON] Shop invalide ignoré:`, shop);
          continue;
        }
        
        // ✅ Configuration avec support localisation
        const shopDef: ShopDefinition = {
          ...shop,
          buyMultiplier: shop.buyMultiplier || 1.0,
          sellMultiplier: shop.sellMultiplier || 0.5,
          currency: shop.currency || 'gold',
          restockInterval: shop.restockInterval || 0,
          isTemporary: false,
          sourceType: 'json',
          
          // ✅ Conversion automatique vers IDs de localisation si activée
          ...(this.config.enableLocalization && {
            nameKey: `shop.name.${shop.id}`,
            descriptionKey: `shop.description.${shop.id}`
          })
        };
        
        this.shopDefinitions.set(shop.id, shopDef);
        this.shopSourceMap.set(shop.id, ShopDataSource.JSON);
        this.log('info', `✅ [JSON] Shop chargé: ${shop.id} - ${shop.name} (${shop.items?.length || 0} items)`);
      }

      this.log('info', `🎉 [JSON] ${this.shopDefinitions.size} définitions de shops chargées avec succès`);
      
    } catch (parseError) {
      this.log('error', "❌ [JSON] Erreur parsing JSON:", parseError);
      throw new Error(`Erreur parsing shops.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  // ===== MÉTHODES EXISTANTES (COMPATIBILITÉ PRÉSERVÉE) =====
  
  getShopDefinition(shopId: string): ShopDefinition | undefined {
    this.log('info', `🔍 [ShopManager] getShopDefinition appelé pour: ${shopId}`);
    
    // 1. Chercher dans les shops officiels
    let shop = this.shopDefinitions.get(shopId);
    if (shop) {
      this.log('info', `✅ [ShopManager] Shop ${shop.sourceType} trouvé: ${shopId} - ${shop.nameKey || shop.name}`);
      return shop;
    }

    // 2. Chercher dans les shops temporaires
    shop = this.temporaryShops.get(shopId);
    if (shop) {
      this.log('info', `🔄 [ShopManager] Shop temporaire trouvé: ${shopId}`);
      return shop;
    }

    // 3. Créer un shop temporaire si nécessaire
    this.log('warn', `⚠️ [ShopManager] Shop ${shopId} introuvable, création d'un shop temporaire`);
    return this.createTemporaryShop(shopId);
  }

  getItemPrice(itemId: string, customPrice?: number): number {
    if (customPrice !== undefined) {
      return customPrice;
    }
    
    const price = this.itemPrices.get(itemId);
    if (price !== undefined) {
      return price;
    }
    
    this.log('warn', `⚠️ [ShopManager] Prix manquant pour ${itemId}, utilisation du prix par défaut (100₽)`);
    return 100;
  }

  getItemBuyPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return 0;

    const shopItem = shop.items.find(item => item.itemId === itemId);
    const basePrice = this.getItemPrice(itemId, shopItem?.customPrice);
    
    return Math.floor(basePrice * (shop.buyMultiplier || 1.0));
  }

  getItemSellPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return 0;

    const basePrice = this.getItemPrice(itemId);
    return Math.floor(basePrice * (shop.sellMultiplier || 0.5));
  }

  canBuyItem(shopId: string, itemId: string, quantity: number = 1, playerGold: number, playerLevel: number = 1): {
    canBuy: boolean;
    reason?: string;
    reasonKey?: string; // ✅ ID de localisation pour la raison
    totalCost?: number;
  } {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return { 
      canBuy: false, 
      reason: "Shop introuvable",
      reasonKey: "shop.error.not_found"
    };

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem) return { 
      canBuy: false, 
      reason: "Objet non vendu dans ce magasin",
      reasonKey: "shop.error.item_not_sold"
    };

    if (shopItem.unlockLevel && playerLevel < shopItem.unlockLevel) {
      return { 
        canBuy: false, 
        reason: `Niveau ${shopItem.unlockLevel} requis`,
        reasonKey: "shop.error.level_required"
      };
    }

    if (shopItem.stock !== undefined && shopItem.stock !== -1) {
      if (shopItem.stock < quantity) {
        return { 
          canBuy: false, 
          reason: shopItem.stock === 0 ? "Rupture de stock" : `Stock insuffisant (${shopItem.stock} disponible(s))`,
          reasonKey: shopItem.stock === 0 ? "shop.error.out_of_stock" : "shop.error.insufficient_stock"
        };
      }
    }

    const totalCost = this.getItemBuyPrice(shopId, itemId) * quantity;
    if (playerGold < totalCost) {
      return { 
        canBuy: false, 
        reason: "Pas assez d'argent", 
        reasonKey: "shop.error.insufficient_money",
        totalCost 
      };
    }

    return { canBuy: true, totalCost };
  }

  async buyItem(
    username: string,
    shopId: string, 
    itemId: string, 
    quantity: number, 
    playerGold: number, 
    playerLevel: number = 1
  ): Promise<TransactionResult> {
    this.log('info', `🛒 Tentative d'achat: ${quantity}x ${itemId} dans ${shopId} pour ${username}`);

    const buyCheck = this.canBuyItem(shopId, itemId, quantity, playerGold, playerLevel);
    if (!buyCheck.canBuy) {
      return { 
        success: false, 
        message: buyCheck.reason || "Achat impossible",
        messageKey: buyCheck.reasonKey || "shop.error.purchase_failed"
      };
    }

    const shop = this.getShopDefinition(shopId)!;
    const shopItem = shop.items.find(item => item.itemId === itemId)!;
    const totalCost = buyCheck.totalCost!;

    try {
      await InventoryManager.addItem(username, itemId, quantity);
      const newGold = playerGold - totalCost;

      const shopStockChanged: { itemId: string; newStock: number }[] = [];
      if (shopItem.stock !== undefined && shopItem.stock !== -1) {
        shopItem.stock -= quantity;
        shopStockChanged.push({ itemId: itemId, newStock: shopItem.stock });
      }

      const newQuantityInInventory = await InventoryManager.getItemCount(username, itemId);

      return {
        success: true,
        message: `Bought ${quantity}x ${itemId} for ${totalCost} gold`,
        messageKey: "shop.transaction.purchase_success",
        newGold: newGold,
        itemsChanged: [{
          itemId: itemId,
          quantityChanged: quantity,
          newQuantity: newQuantityInInventory
        }],
        shopStockChanged: shopStockChanged
      };

    } catch (error) {
      this.log('error', `❌ Erreur lors de l'achat:`, error);
      return { 
        success: false, 
        message: "Erreur lors de la transaction",
        messageKey: "shop.error.transaction_failed"
      };
    }
  }

  async sellItem(username: string, shopId: string, itemId: string, quantity: number): Promise<TransactionResult> {
    this.log('info', `💰 Tentative de vente: ${quantity}x ${itemId} dans ${shopId} par ${username}`);

    const shop = this.getShopDefinition(shopId);
    if (!shop) return { 
      success: false, 
      message: "Shop introuvable",
      messageKey: "shop.error.not_found"
    };

    try {
      const playerHasQuantity = await InventoryManager.getItemCount(username, itemId);
      if (playerHasQuantity < quantity) {
        return { 
          success: false, 
          message: "Pas assez d'objets à vendre",
          messageKey: "shop.error.insufficient_items"
        };
      }

      const removeSuccess = await InventoryManager.removeItem(username, itemId, quantity);
      if (!removeSuccess) {
        return { 
          success: false, 
          message: "Impossible de retirer l'objet de l'inventaire",
          messageKey: "shop.error.inventory_removal_failed"
        };
      }

      const sellPrice = this.getItemSellPrice(shopId, itemId);
      const totalValue = sellPrice * quantity;
      const newQuantityInInventory = await InventoryManager.getItemCount(username, itemId);

      return {
        success: true,
        message: `Sold ${quantity}x ${itemId} for ${totalValue} gold`,
        messageKey: "shop.transaction.sale_success",
        newGold: totalValue,
        itemsChanged: [{ itemId: itemId, quantityChanged: -quantity, newQuantity: newQuantityInInventory }]
      };

    } catch (error) {
      this.log('error', `❌ Erreur lors de la vente:`, error);
      return { 
        success: false, 
        message: "Erreur lors de la transaction",
        messageKey: "shop.error.transaction_failed"
      };
    }
  }

  getShopCatalog(shopId: string, playerLevel: number = 1): {
    shopInfo: ShopDefinition;
    availableItems: (ShopItem & {
      itemId: string;
      buyPrice: number;
      sellPrice: number;
      canBuy: boolean;
      canSell: boolean;
      unlocked: boolean;
    })[];
  } | null {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return null;

    this.log('info', `🏪 [ShopManager] Génération catalogue pour ${shopId}, niveau joueur: ${playerLevel}`);

    const availableItems = shop.items.map(shopItem => {
      const buyPrice = this.getItemBuyPrice(shopId, shopItem.itemId);
      const sellPrice = this.getItemSellPrice(shopId, shopItem.itemId);
      const unlocked = !shopItem.unlockLevel || playerLevel >= shopItem.unlockLevel;
      const canBuy = unlocked && (shopItem.stock === undefined || shopItem.stock === -1 || shopItem.stock > 0);
      
      const item = {
        ...shopItem,
        itemId: shopItem.itemId,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        canBuy: canBuy,
        canSell: true,
        unlocked: unlocked
      };

      this.log('info', `📦 [ShopManager] ${shopItem.itemId}: unlocked=${unlocked} (requis: ${shopItem.unlockLevel}), canBuy=${canBuy}`);
      
      return item;
    });

    this.log('info', `✅ [ShopManager] Catalogue généré: ${availableItems.length} items`);

    return {
      shopInfo: shop,
      availableItems: availableItems
    };
  }

  // ===== MÉTHODES UTILITAIRES =====
  private async loadItemPrices(): Promise<void> {
    this.log('info', `💰 [ShopManager] === CHARGEMENT PRIX OBJETS ===`);
    
    try {
      const foundPath = this.findItemsJsonPath();
      
      if (foundPath) {
        this.log('info', `🎯 [ShopManager] Utilisation du chemin items: ${foundPath}`);
        this.loadItemPricesFromPath(foundPath);
      } else {
        this.log('warn', `⚠️ [ShopManager] Aucun fichier items.json trouvé, utilisation de prix par défaut`);
        this.createDefaultPrices();
      }
      
    } catch (error) {
      this.log('error', "❌ [ShopManager] Erreur lors du chargement des prix d'objets:", error);
      this.createDefaultPrices();
    }
  }

  private findItemsJsonPath(): string | null {
    const possiblePaths = [
      path.resolve(__dirname, this.config.itemsDataPath),
      path.resolve(__dirname, "../data/items.json"),
      path.resolve(__dirname, "../../data/items.json"),
      path.resolve(__dirname, "../../../data/items.json"),
      path.resolve(process.cwd(), "data/items.json"),
      path.resolve(process.cwd(), "server/data/items.json"),
      path.resolve(process.cwd(), "server/src/data/items.json"),
      path.resolve(process.cwd(), "src/data/items.json")
    ];
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
    
    return null;
  }

  private loadItemPricesFromPath(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const itemsData = JSON.parse(fileContent);
      
      let pricesLoaded = 0;
      for (const [itemId, itemData] of Object.entries(itemsData)) {
        const item = itemData as any;
        
        if (item.price !== null && item.price !== undefined && typeof item.price === 'number') {
          this.itemPrices.set(itemId, item.price);
          pricesLoaded++;
        }
      }

      this.log('info', `💰 [ShopManager] ${pricesLoaded} prix d'objets chargés avec succès`);
      
    } catch (parseError) {
      this.log('error', "❌ [ShopManager] Erreur parsing items.json:", parseError);
      throw new Error(`Erreur parsing items.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  private createDefaultPrices(): void {
    const defaultPrices = {
      'poke_ball': 200, 'great_ball': 600, 'ultra_ball': 1200,
      'potion': 300, 'super_potion': 700, 'hyper_potion': 1200, 'max_potion': 2500,
      'revive': 1500, 'max_revive': 4000, 'antidote': 100, 'escape_rope': 550
    };
    
    for (const [itemId, price] of Object.entries(defaultPrices)) {
      this.itemPrices.set(itemId, price);
    }
    
    this.log('info', `✅ [ShopManager] ${Object.keys(defaultPrices).length} prix par défaut créés`);
  }

  private createDefaultShops(): void {
    this.log('info', `🔧 [ShopManager] === CRÉATION SHOPS PAR DÉFAUT ===`);
    
    const defaultLavandiaShop: ShopDefinition = {
      id: "lavandiashop",
      nameKey: this.config.enableLocalization ? "shop.name.lavandiashop" : undefined,
      name: this.config.enableLocalization ? undefined : "Poké Mart du Village",
      type: "pokemart",
      descriptionKey: this.config.enableLocalization ? "shop.description.lavandiashop" : undefined,
      description: this.config.enableLocalization ? undefined : "Boutique officielle Pokémon",
      buyMultiplier: 1.0,
      sellMultiplier: 0.5,
      currency: "gold",
      restockInterval: 720,
      isTemporary: false,
      items: [
        { itemId: "poke_ball", stock: 100 },
        { itemId: "great_ball", stock: 50, unlockLevel: 10 },
        { itemId: "ultra_ball", stock: 20, unlockLevel: 20 },
        { itemId: "potion", stock: 30 },
        { itemId: "super_potion", stock: 20, unlockLevel: 5 },
        { itemId: "hyper_potion", stock: 10, unlockLevel: 15 },
        { itemId: "max_potion", stock: 5, unlockLevel: 25 },
        { itemId: "revive", stock: 15, unlockLevel: 10 },
        { itemId: "max_revive", stock: 5, unlockLevel: 30 }
      ]
    };
    
    this.shopDefinitions.set("lavandiashop", defaultLavandiaShop);
    this.log('info', `✅ [ShopManager] Shop par défaut créé: lavandiashop`);
  }

  private createTemporaryShop(shopId: string): ShopDefinition {
    this.log('info', `🔧 Création d'un shop temporaire pour ${shopId}`);
    
    const temporaryShop: ShopDefinition = {
      id: shopId,
      nameKey: this.config.enableLocalization ? "shop.name.temporary" : undefined,
      name: this.config.enableLocalization ? undefined : "Marchand Itinérant",
      type: "temporary",
      descriptionKey: this.config.enableLocalization ? "shop.description.temporary" : undefined,
      description: this.config.enableLocalization ? undefined : "Un marchand temporaire avec des objets de base.",
      buyMultiplier: 1.0,
      sellMultiplier: 0.5,
      currency: "gold",
      restockInterval: 0,
      isTemporary: true,
      items: [
        { itemId: "potion", customPrice: 300, stock: 10 },
        { itemId: "poke_ball", customPrice: 200, stock: 5 },
        { itemId: "antidote", customPrice: 100, stock: 5 },
        { itemId: "escape_rope", customPrice: 550, stock: 3 }
      ]
    };

    this.temporaryShops.set(shopId, temporaryShop);
    this.log('info', `✅ Shop temporaire créé: ${temporaryShop.nameKey || temporaryShop.name} avec ${temporaryShop.items.length} objets`);
    return temporaryShop;
  }

  // ===== HOT RELOAD MONGODB =====
  private startHotReload(): void {
    try {
      this.log('info', '🔥 [HotReload] Démarrage MongoDB Change Streams...');
      
      this.changeStream = ShopData.watch([], { 
        fullDocument: 'updateLookup'
      });
      
      this.changeStream.on('change', (change: any) => {
        this.handleMongoDBChange(change);
      });
      
      this.changeStream.on('error', (error: any) => {
        this.log('error', '❌ [HotReload] Erreur Change Stream:', error);
        
        setTimeout(() => {
          this.log('info', '🔄 [HotReload] Redémarrage Change Stream...');
          this.startHotReload();
        }, 5000);
      });
      
      this.log('info', '✅ [HotReload] Change Streams actif !');
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Impossible de démarrer Change Streams:', error);
    }
  }

  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      this.log('info', `🔥 [HotReload] Changement détecté: ${change.operationType}`);
      
      switch (change.operationType) {
        case 'insert':
          await this.handleShopInsert(change.fullDocument);
          break;
          
        case 'update':
          await this.handleShopUpdate(change.fullDocument);
          break;
          
        case 'delete':
          await this.handleShopDelete(change.documentKey._id);
          break;
          
        default:
          this.log('info', `ℹ️ [HotReload] Opération ignorée: ${change.operationType}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur traitement changement:', error);
    }
  }

  private async handleShopInsert(mongoDoc: any): Promise<void> {
    try {
      const shopDef = this.convertMongoToShopDefinition(mongoDoc);
      this.shopDefinitions.set(shopDef.id, shopDef);
      this.shopSourceMap.set(shopDef.id, ShopDataSource.MONGODB);
      
      this.log('info', `➕ [HotReload] Shop ajouté: ${shopDef.nameKey || shopDef.name} (${shopDef.id})`);
      this.notifyReloadCallbacks('insert', shopDef);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur ajout shop:', error);
    }
  }

  private async handleShopUpdate(mongoDoc: any): Promise<void> {
    try {
      const shopDef = this.convertMongoToShopDefinition(mongoDoc);
      this.shopDefinitions.set(shopDef.id, shopDef);
      
      this.log('info', `🔄 [HotReload] Shop mis à jour: ${shopDef.nameKey || shopDef.name} (${shopDef.id})`);
      this.notifyReloadCallbacks('update', shopDef);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur modification shop:', error);
    }
  }

  private async handleShopDelete(documentId: any): Promise<void> {
    for (const [shopId, shop] of this.shopDefinitions.entries()) {
      if (shop.sourceType === 'mongodb') {
        this.shopDefinitions.delete(shopId);
        this.shopSourceMap.delete(shopId);
        
        this.log('info', `➖ [HotReload] Shop supprimé: ${shop.nameKey || shop.name} (${shopId})`);
        this.notifyReloadCallbacks('delete', shop);
        break;
      }
    }
  }

  private notifyReloadCallbacks(event: string, shopData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, shopData);
      } catch (error) {
        this.log('error', '❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  // ===== MÉTHODES PUBLIQUES HOT RELOAD =====
  public onShopChange(callback: (event: string, shopData?: any) => void): void {
    this.reloadCallbacks.push(callback);
    this.log('info', `📋 [HotReload] Callback enregistré (total: ${this.reloadCallbacks.length})`);
  }

  public stopHotReload(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      this.log('info', '🛑 [HotReload] Change Streams arrêté');
    }
  }

  // ===== NOUVELLES MÉTHODES MONGODB =====
  async syncShopsToMongoDB(): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      const jsonShops = Array.from(this.shopDefinitions.values())
        .filter(shop => shop.sourceType !== 'mongodb');
      
      this.log('info', `🔄 [Sync] Synchronisation ${jsonShops.length} shops vers MongoDB...`);
      
      for (const shop of jsonShops) {
        try {
          let mongoShop = await ShopData.findOne({ shopId: shop.id });
          
          if (mongoShop) {
            await mongoShop.updateFromJson(shop);
            results.success++;
          } else {
            mongoShop = await ShopData.createFromJson(shop);
            results.success++;
          }
          
        } catch (error) {
          const errorMsg = `Shop ${shop.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          results.errors.push(errorMsg);
          this.log('error', `❌ [Sync] ${errorMsg}`);
        }
      }
      
      this.log('info', `✅ [Sync] Terminé: ${results.success} succès, ${results.errors.length} erreurs`);
      
    } catch (error) {
      this.log('error', '❌ [Sync] Erreur générale:', error);
      results.errors.push('Erreur de synchronisation globale');
    }
    
    return results;
  }

  async reloadShopsFromMongoDB(): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement des shops depuis MongoDB`);
      
      // Nettoyer les shops MongoDB du cache
      const mongoShopIds = Array.from(this.shopSourceMap.entries())
        .filter(([_, source]) => source === ShopDataSource.MONGODB)
        .map(([shopId, _]) => shopId);
      
      mongoShopIds.forEach(shopId => {
        this.shopDefinitions.delete(shopId);
        this.shopSourceMap.delete(shopId);
      });
      
      // Recharger depuis MongoDB
      await this.loadShopsFromMongoDB();
      
      this.log('info', `✅ [Reload] Shops rechargés depuis MongoDB`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur rechargement:`, error);
      return false;
    }
  }

  // ===== AUTRES MÉTHODES EXISTANTES ===== 
  getAllShops(): ShopDefinition[] {
    return [
      ...Array.from(this.shopDefinitions.values()),
      ...Array.from(this.temporaryShops.values())
    ];
  }

  // ===== ADMINISTRATION =====
  getSystemStats() {
    const mongoCount = Array.from(this.shopSourceMap.values()).filter(s => s === ShopDataSource.MONGODB).length;
    const jsonCount = Array.from(this.shopSourceMap.values()).filter(s => s === ShopDataSource.JSON).length;
    
    return {
      totalShops: this.shopDefinitions.size,
      temporaryShops: this.temporaryShops.size,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      sources: {
        json: jsonCount,
        mongodb: mongoCount
      },
      prices: this.itemPrices.size,
      config: this.config,
      cache: {
        size: this.mongoCache.size,
        ttl: this.config.cacheTTL
      },
      hotReload: {
        enabled: this.hotReloadEnabled,
        active: !!this.changeStream,
        callbackCount: this.reloadCallbacks.length
      }
    };
  }

  public cleanup(): void {
    this.log('info', '🧹 [ShopManager] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.shopSourceMap.clear();
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [ShopManager] Nettoyage terminé');
  }

  debugShopManager(): void {
    console.log(`🔍 [ShopManager] === ÉTAT COMPLET HYBRIDE ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 Shops par source:`);
    this.shopDefinitions.forEach((shop, id) => {
      console.log(`  🏪 ${id}: ${shop.nameKey || shop.name} [${shop.sourceType || 'unknown'}] (${shop.items.length} items)`);
    });
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }
}
