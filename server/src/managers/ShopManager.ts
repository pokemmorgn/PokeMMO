// server/src/managers/ShopManager.ts - VERSION ADAPTÉE POUR STRUCTURE EXISTANTE

import fs from "fs";
import path from "path";
import { InventoryManager } from "./InventoryManager";

export interface ShopItem {
  itemId: string;
  customPrice?: number;
  stock?: number;
  unlockLevel?: number;
  unlockQuest?: string;
}

export interface ShopDefinition {
  id: string;
  name: string;
  type: 'general' | 'pokemart' | 'specialist' | 'black_market' | 'temporary';
  description?: string;
  npcId?: number;
  items: ShopItem[];
  buyMultiplier?: number;
  sellMultiplier?: number;
  currency?: 'gold' | 'tokens' | 'battle_points';
  restockInterval?: number;
  lastRestock?: number;
  isTemporary?: boolean;
}

export interface TransactionResult {
  success: boolean;
  message: string;
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

export class ShopManager {
  private shopDefinitions: Map<string, ShopDefinition> = new Map();
  private itemPrices: Map<string, number> = new Map();
  private temporaryShops: Map<string, ShopDefinition> = new Map();
  
  constructor(
    shopsDataPath: string = "../data/shops.json",
    itemsDataPath: string = "../data/items.json"
  ) {
    console.log(`🏪 [ShopManager] === INITIALISATION DEBUG ===`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`📁 __dirname: ${__dirname}`);
    console.log(`📁 Chemins fournis:`);
    console.log(`  - shopsDataPath: ${shopsDataPath}`);
    console.log(`  - itemsDataPath: ${itemsDataPath}`);
    
    this.loadShopDefinitions(shopsDataPath);
    this.loadItemPrices(itemsDataPath);
    
    console.log(`✅ [ShopManager] Initialisation terminée`);
    console.log(`📊 Résultats:`);
    console.log(`  - ${this.shopDefinitions.size} shops officiels chargés`);
    console.log(`  - ${this.itemPrices.size} prix d'objets chargés`);
    console.log(`  - ${this.temporaryShops.size} shops temporaires`);
  }

  private loadShopDefinitions(shopsDataPath: string): void {
    console.log(`🏪 [ShopManager] === CHARGEMENT SHOP DEFINITIONS ===`);
    
    try {
      // ✅ LISTE EXHAUSTIVE DE CHEMINS POSSIBLES
      const possiblePaths = [
        path.resolve(__dirname, shopsDataPath),
        path.resolve(__dirname, "../data/shops.json"),
        path.resolve(__dirname, "../../data/shops.json"),
        path.resolve(__dirname, "../../../data/shops.json"),
        path.resolve(process.cwd(), "data/shops.json"),
        path.resolve(process.cwd(), "server/data/shops.json"),
        path.resolve(process.cwd(), "server/src/data/shops.json"),
        path.resolve(process.cwd(), "src/data/shops.json")
      ];
      
      console.log(`🔍 [ShopManager] Test de ${possiblePaths.length} chemins possibles:`);
      
      let foundPath = null;
      for (const testPath of possiblePaths) {
        const exists = fs.existsSync(testPath);
        console.log(`  ${exists ? '✅' : '❌'} ${testPath}`);
        if (exists && !foundPath) {
          foundPath = testPath;
        }
      }
      
      if (foundPath) {
        console.log(`🎯 [ShopManager] Utilisation du chemin: ${foundPath}`);
        this.loadShopDefinitionsFromPath(foundPath);
      } else {
        console.warn(`⚠️ [ShopManager] Aucun fichier shops.json trouvé, création de shops par défaut`);
        this.createDefaultShops();
      }
      
    } catch (error) {
      console.error("❌ [ShopManager] Erreur lors du chargement des shops:", error);
      this.createDefaultShops();
    }
  }

  private loadShopDefinitionsFromPath(filePath: string): void {
    console.log(`📖 [ShopManager] Lecture du fichier: ${filePath}`);
    
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      console.log(`📄 [ShopManager] Taille du fichier: ${fileContent.length} caractères`);
      
      const shopsData = JSON.parse(fileContent);
      console.log(`🔍 [ShopManager] Structure JSON:`, Object.keys(shopsData));
      
      if (!shopsData.shops || !Array.isArray(shopsData.shops)) {
        throw new Error(`Structure JSON invalide: propriété 'shops' manquante ou invalide`);
      }
      
      console.log(`📋 [ShopManager] ${shopsData.shops.length} shops trouvés dans le JSON`);
      
      for (const shop of shopsData.shops) {
        if (!shop.id || !shop.name) {
          console.warn(`⚠️ [ShopManager] Shop invalide ignoré:`, shop);
          continue;
        }
        
        shop.buyMultiplier = shop.buyMultiplier || 1.0;
        shop.sellMultiplier = shop.sellMultiplier || 0.5;
        shop.currency = shop.currency || 'gold';
        shop.restockInterval = shop.restockInterval || 0;
        shop.isTemporary = false;
        
        this.shopDefinitions.set(shop.id, shop);
        console.log(`✅ [ShopManager] Shop chargé: ${shop.id} - ${shop.name} (${shop.items?.length || 0} items)`);
      }

      console.log(`🎉 [ShopManager] ${this.shopDefinitions.size} définitions de shops chargées avec succès`);
      
    } catch (parseError) {
      console.error("❌ [ShopManager] Erreur parsing JSON:", parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Erreur parsing shops.json: ${errorMessage}`);
    }
  }

  private createDefaultShops(): void {
    console.log(`🔧 [ShopManager] === CRÉATION SHOPS PAR DÉFAUT ===`);
    
    const defaultLavandiaShop: ShopDefinition = {
      id: "lavandiashop",
      name: "Poké Mart du Village",
      type: "pokemart",
      description: "Boutique officielle Pokémon",
      npcId: 101,
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
    console.log(`✅ [ShopManager] Shop par défaut créé: lavandiashop`);
  }

  private loadItemPrices(itemsDataPath: string): void {
    console.log(`💰 [ShopManager] === CHARGEMENT PRIX OBJETS ===`);
    
    try {
      // ✅ LISTE EXHAUSTIVE DE CHEMINS POSSIBLES POUR ITEMS.JSON
      const possiblePaths = [
        path.resolve(__dirname, itemsDataPath),
        path.resolve(__dirname, "../data/items.json"),
        path.resolve(__dirname, "../../data/items.json"),
        path.resolve(__dirname, "../../../data/items.json"),
        path.resolve(process.cwd(), "data/items.json"),
        path.resolve(process.cwd(), "server/data/items.json"),
        path.resolve(process.cwd(), "server/src/data/items.json"),
        path.resolve(process.cwd(), "src/data/items.json")
      ];
      
      console.log(`🔍 [ShopManager] Test de ${possiblePaths.length} chemins possibles pour items.json:`);
      
      let foundPath = null;
      for (const testPath of possiblePaths) {
        const exists = fs.existsSync(testPath);
        console.log(`  ${exists ? '✅' : '❌'} ${testPath}`);
        if (exists && !foundPath) {
          foundPath = testPath;
        }
      }
      
      if (foundPath) {
        console.log(`🎯 [ShopManager] Utilisation du chemin items: ${foundPath}`);
        this.loadItemPricesFromPath(foundPath);
      } else {
        console.warn(`⚠️ [ShopManager] Aucun fichier items.json trouvé, utilisation de prix par défaut`);
        this.createDefaultPrices();
      }
      
    } catch (error) {
      console.error("❌ [ShopManager] Erreur lors du chargement des prix d'objets:", error);
      this.createDefaultPrices();
    }
  }

  private loadItemPricesFromPath(filePath: string): void {
    console.log(`📖 [ShopManager] Lecture des prix depuis: ${filePath}`);
    
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      console.log(`📄 [ShopManager] Taille items.json: ${fileContent.length} caractères`);
      
      const itemsData = JSON.parse(fileContent);
      console.log(`🔍 [ShopManager] Première clé items.json:`, Object.keys(itemsData)[0]);
      console.log(`🔍 [ShopManager] Structure premier objet:`, Object.keys(itemsData[Object.keys(itemsData)[0]]));
      
      // ✅ ADAPTATION POUR VOTRE STRUCTURE EXISTANTE
      let pricesLoaded = 0;
      for (const [itemId, itemData] of Object.entries(itemsData)) {
        const item = itemData as any;
        
        // ✅ VOTRE STRUCTURE: item.price (pas item.price)
        if (item.price !== null && item.price !== undefined && typeof item.price === 'number') {
          this.itemPrices.set(itemId, item.price);
          pricesLoaded++;
          
          // ✅ DEBUG: Log des premiers prix chargés
          if (pricesLoaded <= 5) {
            console.log(`💰 [ShopManager] Prix chargé: ${itemId} = ${item.price}₽`);
          }
        } else {
          // ✅ DEBUG: Log des prix non trouvés
          if (pricesLoaded <= 5) {
            console.log(`⚠️ [ShopManager] Pas de prix pour ${itemId}: ${item.price}`);
          }
        }
      }

      console.log(`💰 [ShopManager] ${pricesLoaded} prix d'objets chargés avec succès sur ${Object.keys(itemsData).length} objets`);
      
      // ✅ DEBUG: Afficher quelques prix importants
      const testItems = ['potion', 'poke_ball', 'antidote', 'escape_rope', 'super_potion'];
      console.log(`📊 [ShopManager] Vérification prix importants:`);
      testItems.forEach(itemId => {
        const price = this.itemPrices.get(itemId);
        console.log(`  💰 ${itemId}: ${price !== undefined ? price + '₽' : 'MANQUANT'}`);
      });
      
    } catch (parseError) {
      console.error("❌ [ShopManager] Erreur parsing items.json:", parseError);
      if (parseError instanceof Error) {
        console.error("❌ Stack trace:", parseError.stack);
      }
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Erreur parsing items.json: ${errorMessage}`);
    }
  }

  private createDefaultPrices(): void {
    console.log(`🔧 [ShopManager] === CRÉATION PRIX PAR DÉFAUT ===`);
    
    // ✅ Prix basés sur votre items.json existant
    const defaultPrices = {
      'poke_ball': 200,
      'great_ball': 600,
      'ultra_ball': 1200,
      'potion': 300,
      'super_potion': 700,
      'hyper_potion': 1200,
      'max_potion': 2500,
      'full_restore': 3000,
      'revive': 1500,
      'max_revive': 4000,
      'antidote': 100,
      'parlyz_heal': 200,
      'awakening': 250,
      'burn_heal': 250,
      'ice_heal': 250,
      'full_heal': 600,
      'escape_rope': 550,
      'repel': 350,
      'super_repel': 500,
      'max_repel': 700
    };
    
    for (const [itemId, price] of Object.entries(defaultPrices)) {
      this.itemPrices.set(itemId, price);
    }
    
    console.log(`✅ [ShopManager] ${Object.keys(defaultPrices).length} prix par défaut créés`);
  }

  // ✅ MÉTHODE getShopDefinition AVEC DEBUG DÉTAILLÉ
  getShopDefinition(shopId: string): ShopDefinition | undefined {
    console.log(`🔍 [ShopManager] getShopDefinition appelé pour: ${shopId}`);
    
    // 1. Chercher dans les shops officiels
    let shop = this.shopDefinitions.get(shopId);
    if (shop) {
      console.log(`✅ [ShopManager] Shop officiel trouvé: ${shopId} - ${shop.name} (${shop.items.length} items)`);
      return shop;
    }

    // 2. Chercher dans les shops temporaires
    shop = this.temporaryShops.get(shopId);
    if (shop) {
      console.log(`🔄 [ShopManager] Shop temporaire trouvé: ${shopId}`);
      return shop;
    }

    // 3. DEBUG: Afficher les shops disponibles
    console.log(`❌ [ShopManager] Shop ${shopId} non trouvé`);
    console.log(`📋 [ShopManager] Shops officiels disponibles: [${Array.from(this.shopDefinitions.keys()).join(', ')}]`);
    console.log(`📋 [ShopManager] Shops temporaires disponibles: [${Array.from(this.temporaryShops.keys()).join(', ')}]`);

    // 4. Créer un shop temporaire si aucun n'existe
    console.warn(`⚠️ [ShopManager] Shop ${shopId} introuvable, création d'un shop temporaire`);
    return this.createTemporaryShop(shopId);
  }

  // ✅ MÉTHODE getItemPrice CORRIGÉE AVEC DEBUG
  getItemPrice(itemId: string, customPrice?: number): number {
    if (customPrice !== undefined) {
      console.log(`💰 [ShopManager] Prix custom utilisé pour ${itemId}: ${customPrice}₽`);
      return customPrice;
    }
    
    const price = this.itemPrices.get(itemId);
    if (price !== undefined) {
      console.log(`💰 [ShopManager] Prix trouvé pour ${itemId}: ${price}₽`);
      return price;
    }
    
    // Prix par défaut si introuvable
    console.warn(`⚠️ [ShopManager] Prix manquant pour ${itemId}, utilisation du prix par défaut (100₽)`);
    console.log(`🔍 [ShopManager] Debug itemPrices contient ${this.itemPrices.size} prix`);
    
    // ✅ DEBUG: Afficher quelques prix disponibles
    const availablePrices = Array.from(this.itemPrices.entries()).slice(0, 3);
    console.log(`📋 [ShopManager] Exemples de prix disponibles:`, availablePrices);
    
    return 100;
  }

  // ✅ NOUVELLE MÉTHODE DE DEBUG COMPLÈTE
  debugShopManager(): void {
    console.log(`🔍 [ShopManager] === ÉTAT COMPLET ===`);
    console.log(`📊 Shops officiels: ${this.shopDefinitions.size}`);
    this.shopDefinitions.forEach((shop, id) => {
      console.log(`  🏪 ${id}: ${shop.name} (${shop.items.length} items, temporary: ${shop.isTemporary})`);
    });
    
    console.log(`📊 Shops temporaires: ${this.temporaryShops.size}`);
    this.temporaryShops.forEach((shop, id) => {
      console.log(`  🔄 ${id}: ${shop.name} (${shop.items.length} items)`);
    });
    
    console.log(`💰 Prix disponibles: ${this.itemPrices.size}`);
    const samplePrices = Array.from(this.itemPrices.entries()).slice(0, 8);
    console.log(`📋 Exemples de prix:`);
    samplePrices.forEach(([itemId, price]) => {
      console.log(`  💰 ${itemId}: ${price}₽`);
    });
    
    // ✅ TEST SPÉCIFIQUE DU SHOP LAVANDIASHOP
    console.log(`🧪 === TEST SHOP LAVANDIASHOP ===`);
    const lavandiaShop = this.getShopDefinition("lavandiashop");
    if (lavandiaShop && !lavandiaShop.isTemporary) {
      console.log(`✅ Shop lavandiashop chargé depuis le fichier JSON`);
    } else if (lavandiaShop && lavandiaShop.isTemporary) {
      console.log(`⚠️ Shop lavandiashop créé comme temporaire (fichier JSON pas trouvé)`);
    } else {
      console.log(`❌ Shop lavandiashop complètement manquant`);
    }
  }

  // === MÉTHODES HÉRITÉES (inchangées) ===
  
  private createTemporaryShop(shopId: string, npcId?: number): ShopDefinition {
    console.log(`🔧 Création d'un shop temporaire pour ${shopId} (NPC: ${npcId})`);
    
    const temporaryShop: ShopDefinition = {
      id: shopId,
      name: "Marchand Itinérant",
      type: "temporary",
      description: "Un marchand temporaire avec des objets de base.",
      npcId: npcId,
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
    console.log(`✅ Shop temporaire créé: ${temporaryShop.name} avec ${temporaryShop.items.length} objets`);
    return temporaryShop;
  }

  getShopByNpcId(npcId: number): ShopDefinition | undefined {
    let shop = Array.from(this.shopDefinitions.values()).find(shop => shop.npcId === npcId);
    if (shop) return shop;

    shop = Array.from(this.temporaryShops.values()).find(shop => shop.npcId === npcId);
    if (shop) {
      console.log(`🔄 Shop temporaire trouvé pour NPC ${npcId}`);
      return shop;
    }

    const temporaryShopId = `temp_npc_${npcId}`;
    console.warn(`⚠️ Aucun shop trouvé pour NPC ${npcId}, création d'un shop temporaire`);
    return this.createTemporaryShop(temporaryShopId, npcId);
  }

  getItemBuyPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return 0;

    const shopItem = shop.items.find(item => item.itemId === itemId);
    const basePrice = this.getItemPrice(itemId, shopItem?.customPrice);
    
    return Math.floor(basePrice * shop.buyMultiplier);
  }

  getItemSellPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return 0;

    const basePrice = this.getItemPrice(itemId);
    return Math.floor(basePrice * shop.sellMultiplier);
  }

  canBuyItem(shopId: string, itemId: string, quantity: number = 1, playerGold: number, playerLevel: number = 1): {
    canBuy: boolean;
    reason?: string;
    totalCost?: number;
  } {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return { canBuy: false, reason: "Shop introuvable" };

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem) return { canBuy: false, reason: "Objet non vendu dans ce magasin" };

    if (shopItem.unlockLevel && playerLevel < shopItem.unlockLevel) {
      return { canBuy: false, reason: `Niveau ${shopItem.unlockLevel} requis` };
    }

    if (shopItem.stock !== undefined && shopItem.stock !== -1) {
      if (shopItem.stock < quantity) {
        return { 
          canBuy: false, 
          reason: shopItem.stock === 0 ? "Rupture de stock" : `Stock insuffisant (${shopItem.stock} disponible(s))` 
        };
      }
    }

    const totalCost = this.getItemBuyPrice(shopId, itemId) * quantity;
    if (playerGold < totalCost) {
      return { canBuy: false, reason: "Pas assez d'argent", totalCost };
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
    console.log(`🛒 Tentative d'achat: ${quantity}x ${itemId} dans ${shopId} pour ${username}`);

    const buyCheck = this.canBuyItem(shopId, itemId, quantity, playerGold, playerLevel);
    if (!buyCheck.canBuy) {
      return { success: false, message: buyCheck.reason || "Achat impossible" };
    }

    const shop = this.getShopDefinition(shopId)!;
    const shopItem = shop.items.find(item => item.itemId === itemId)!;
    const totalCost = buyCheck.totalCost!;

    try {
      console.log(`📦 Ajout ${quantity}x ${itemId} à l'inventaire de ${username}`);
      await InventoryManager.addItem(username, itemId, quantity);
      console.log(`✅ Objet ajouté à l'inventaire avec succès`);

      const newGold = playerGold - totalCost;

      const shopStockChanged: { itemId: string; newStock: number }[] = [];
      if (shopItem.stock !== undefined && shopItem.stock !== -1) {
        shopItem.stock -= quantity;
        shopStockChanged.push({ itemId: itemId, newStock: shopItem.stock });
      }

      const newQuantityInInventory = await InventoryManager.getItemCount(username, itemId);

      const shopMessage = shop.isTemporary 
        ? `[TEMP_SHOP] Bought ${quantity}x ${itemId} for ${totalCost} gold`
        : `Bought ${quantity}x ${itemId} for ${totalCost} gold`;

      console.log(`✅ Achat réussi: ${quantity}x ${itemId} ${shop.isTemporary ? '(temp)' : ''}`);

      return {
        success: true,
        message: shopMessage,
        newGold: newGold,
        itemsChanged: [{
          itemId: itemId,
          quantityChanged: quantity,
          newQuantity: newQuantityInInventory
        }],
        shopStockChanged: shopStockChanged
      };

    } catch (error) {
      console.error(`❌ Erreur lors de l'achat:`, error);
      
      try {
        console.log(`🔄 Tentative de rollback pour ${username}...`);
        await InventoryManager.removeItem(username, itemId, quantity);
        console.log(`✅ Rollback réussi`);
      } catch (rollbackError) {
        console.error(`❌ Erreur lors du rollback:`, rollbackError);
      }

      return { success: false, message: "Erreur lors de la transaction" };
    }
  }

  async sellItem(username: string, shopId: string, itemId: string, quantity: number): Promise<TransactionResult> {
    console.log(`💰 Tentative de vente: ${quantity}x ${itemId} dans ${shopId} par ${username}`);

    const shop = this.getShopDefinition(shopId);
    if (!shop) return { success: false, message: "Shop introuvable" };

    try {
      const playerHasQuantity = await InventoryManager.getItemCount(username, itemId);
      if (playerHasQuantity < quantity) {
        return { success: false, message: "Pas assez d'objets à vendre" };
      }

      const removeSuccess = await InventoryManager.removeItem(username, itemId, quantity);
      if (!removeSuccess) {
        return { success: false, message: "Impossible de retirer l'objet de l'inventaire" };
      }

      const sellPrice = this.getItemSellPrice(shopId, itemId);
      const totalValue = sellPrice * quantity;
      const newQuantityInInventory = await InventoryManager.getItemCount(username, itemId);

      const shopMessage = shop.isTemporary 
        ? `[TEMP_SHOP] Sold ${quantity}x ${itemId} for ${totalValue} gold`
        : `Sold ${quantity}x ${itemId} for ${totalValue} gold`;

      console.log(`✅ Vente réussie: ${quantity}x ${itemId} ${shop.isTemporary ? '(temp)' : ''}`);

      return {
        success: true,
        message: shopMessage,
        newGold: totalValue,
        itemsChanged: [{ itemId: itemId, quantityChanged: -quantity, newQuantity: newQuantityInInventory }]
      };

    } catch (error) {
      console.error(`❌ Erreur lors de la vente:`, error);
      return { success: false, message: "Erreur lors de la transaction" };
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

    const availableItems = shop.items.map(shopItem => {
      const buyPrice = this.getItemBuyPrice(shopId, shopItem.itemId);
      const sellPrice = this.getItemSellPrice(shopId, shopItem.itemId);
      const unlocked = !shopItem.unlockLevel || playerLevel >= shopItem.unlockLevel;
      
      return {
        ...shopItem,
        itemId: shopItem.itemId,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        canBuy: unlocked && (shopItem.stock === undefined || shopItem.stock === -1 || shopItem.stock > 0),
        canSell: true,
        unlocked: unlocked
      };
    });

    return {
      shopInfo: shop,
      availableItems: availableItems
    };
  }

  restockShop(shopId: string): boolean {
    const shop = this.getShopDefinition(shopId);
    if (!shop || shop.restockInterval === 0) return false;

    if (shop.isTemporary) {
      console.log(`🔄 Shop temporaire ${shopId} - pas de restock nécessaire`);
      return false;
    }

    const now = Date.now();
    const lastRestock = shop.lastRestock || 0;
    const timeSinceRestock = now - lastRestock;
    const restockIntervalMs = shop.restockInterval * 60 * 1000;

    if (timeSinceRestock >= restockIntervalMs) {
      shop.items.forEach(item => {
        if (item.stock !== undefined && item.stock !== -1) {
          if (item.itemId.includes('ball')) {
            item.stock = 50;
          } else if (item.itemId.includes('potion')) {
            item.stock = 30;
          } else {
            item.stock = 20;
          }
        }
      });

      shop.lastRestock = now;
      console.log(`🔄 Shop ${shopId} restocké`);
      return true;
    }

    return false;
  }

  getAllShops(): ShopDefinition[] {
    const allShops = [
      ...Array.from(this.shopDefinitions.values()),
      ...Array.from(this.temporaryShops.values())
    ];
    return allShops;
  }

  createCustomTemporaryShop(
    shopId: string, 
    name: string, 
    items: ShopItem[], 
    npcId?: number
  ): ShopDefinition {
    const temporaryShop: ShopDefinition = {
      id: shopId,
      name: name,
      type: "temporary",
      description: "Un marchand temporaire personnalisé.",
      npcId: npcId,
      buyMultiplier: 1.0,
      sellMultiplier: 0.5,
      currency: "gold",
      restockInterval: 0,
      isTemporary: true,
      items: items
    };

    this.temporaryShops.set(shopId, temporaryShop);
    console.log(`✅ Shop temporaire personnalisé créé: ${name} avec ${items.length} objets`);
    
    return temporaryShop;
  }

  removeTemporaryShop(shopId: string): boolean {
    const removed = this.temporaryShops.delete(shopId);
    if (removed) {
      console.log(`🗑️ Shop temporaire ${shopId} supprimé`);
    }
    return removed;
  }

  isTemporaryShop(shopId: string): boolean {
    const shop = this.getShopDefinition(shopId);
    return shop?.isTemporary || false;
  }

  clearTemporaryShops(): number {
    const count = this.temporaryShops.size;
    this.temporaryShops.clear();
    console.log(`🧹 ${count} shops temporaires supprimés`);
    return count;
  }

  addItemToShop(shopId: string, item: ShopItem): boolean {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return false;

    const existingIndex = shop.items.findIndex(i => i.itemId === item.itemId);
    if (existingIndex >= 0) {
      shop.items[existingIndex] = item;
    } else {
      shop.items.push(item);
    }

    return true;
  }

  removeItemFromShop(shopId: string, itemId: string): boolean {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return false;

    const itemIndex = shop.items.findIndex(i => i.itemId === itemId);
    if (itemIndex >= 0) {
      shop.items.splice(itemIndex, 1);
      return true;
    }

    return false;
  }

  updateItemStock(shopId: string, itemId: string, newStock: number): boolean {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return false;

    const item = shop.items.find(i => i.itemId === itemId);
    if (item) {
      item.stock = newStock;
      return true;
    }

    return false;
  }
}
