// server/src/managers/ShopManager.ts - VERSION COMPLÈTE AVEC FALLBACK TEMPORAIRE

import fs from "fs";
import path from "path";

export interface ShopItem {
  itemId: string;
  customPrice?: number;
  stock?: number; // -1 = illimité, 0+ = stock limité
  unlockLevel?: number; // Level requis pour acheter
  unlockQuest?: string; // Quête requise pour débloquer
}

export interface ShopDefinition {
  id: string;
  name: string;
  type: 'general' | 'pokemart' | 'specialist' | 'black_market' | 'temporary'; // ✅ Ajout type temporary
  description?: string;
  npcId?: number;
  items: ShopItem[];
  buyMultiplier?: number; // Multiplicateur pour les prix d'achat (défaut: 1.0)
  sellMultiplier?: number; // Multiplicateur pour les prix de vente (défaut: 0.5)
  currency?: 'gold' | 'tokens' | 'battle_points'; // Type de monnaie (défaut: gold)
  restockInterval?: number; // Minutes entre les restocks (0 = pas de restock)
  lastRestock?: number; // Timestamp du dernier restock
  isTemporary?: boolean; // ✅ Marque les shops temporaires
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
  private temporaryShops: Map<string, ShopDefinition> = new Map(); // ✅ Cache pour shops temporaires
  
  constructor(
    shopsDataPath: string = "../data/shops.json",
    itemsDataPath: string = "../data/items.json"
  ) {
    this.loadShopDefinitions(shopsDataPath);
    this.loadItemPrices(itemsDataPath);
  }

  private loadShopDefinitions(shopsDataPath: string): void {
    try {
      const resolvedPath = path.resolve(__dirname, shopsDataPath);
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`⚠️ Fichier de shops introuvable : ${resolvedPath}`);
        return;
      }

      const shopsData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      
      for (const shop of shopsData.shops) {
        // Valeurs par défaut
        shop.buyMultiplier = shop.buyMultiplier || 1.0;
        shop.sellMultiplier = shop.sellMultiplier || 0.5;
        shop.currency = shop.currency || 'gold';
        shop.restockInterval = shop.restockInterval || 0;
        shop.isTemporary = false; // ✅ Les shops du fichier ne sont pas temporaires
        
        this.shopDefinitions.set(shop.id, shop);
      }

      console.log(`🏪 ${this.shopDefinitions.size} définitions de shops chargées`);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des shops:", error);
    }
  }

  private loadItemPrices(itemsDataPath: string): void {
    try {
      const resolvedPath = path.resolve(__dirname, itemsDataPath);
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`⚠️ Fichier d'objets introuvable : ${resolvedPath}`);
        return;
      }

      const itemsData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      
      // ✅ CORRECTION: Charger les prix depuis la structure correcte du fichier items.json
      for (const [itemId, itemData] of Object.entries(itemsData)) {
        const item = itemData as any;
        if (item.price !== null && item.price !== undefined) {
          this.itemPrices.set(itemId, item.price);
        }
      }

      console.log(`💰 ${this.itemPrices.size} prix d'objets chargés`);
      
      // ✅ DEBUG: Afficher quelques prix chargés
      console.log(`📊 Exemples de prix:`, {
        potion: this.itemPrices.get('potion'),
        poke_ball: this.itemPrices.get('poke_ball'),
        antidote: this.itemPrices.get('antidote')
      });
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement des prix d'objets:", error);
    }
  }

  // ✅ === NOUVELLE MÉTHODE : CRÉER SHOP TEMPORAIRE ===
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
        {
          itemId: "potion",
          customPrice: 300, // ✅ Prix du fichier items.json
          stock: 10
        },
        {
          itemId: "poke_ball",
          customPrice: 200, // ✅ Prix du fichier items.json
          stock: 5
        },
        {
          itemId: "antidote",
          customPrice: 100, // ✅ Prix du fichier items.json
          stock: 5
        },
        {
          itemId: "escape_rope",
          customPrice: 550, // ✅ Prix du fichier items.json
          stock: 3
        }
      ]
    };

    // Cache du shop temporaire
    this.temporaryShops.set(shopId, temporaryShop);
    
    console.log(`✅ Shop temporaire créé: ${temporaryShop.name} avec ${temporaryShop.items.length} objets`);
    return temporaryShop;
  }

  // ✅ === MÉTHODE MODIFIÉE : getShopDefinition avec fallback ===
  getShopDefinition(shopId: string): ShopDefinition | undefined {
    // 1. Chercher dans les shops officiels
    let shop = this.shopDefinitions.get(shopId);
    if (shop) {
      return shop;
    }

    // 2. Chercher dans les shops temporaires
    shop = this.temporaryShops.get(shopId);
    if (shop) {
      console.log(`🔄 Shop temporaire trouvé: ${shopId}`);
      return shop;
    }

    // 3. Créer un shop temporaire si aucun n'existe
    console.warn(`⚠️ Shop ${shopId} introuvable, création d'un shop temporaire`);
    return this.createTemporaryShop(shopId);
  }

  // ✅ === MÉTHODE MODIFIÉE : getShopByNpcId avec fallback ===
  getShopByNpcId(npcId: number): ShopDefinition | undefined {
    // 1. Chercher dans les shops officiels
    let shop = Array.from(this.shopDefinitions.values()).find(shop => shop.npcId === npcId);
    if (shop) {
      return shop;
    }

    // 2. Chercher dans les shops temporaires
    shop = Array.from(this.temporaryShops.values()).find(shop => shop.npcId === npcId);
    if (shop) {
      console.log(`🔄 Shop temporaire trouvé pour NPC ${npcId}`);
      return shop;
    }

    // 3. Créer un shop temporaire pour ce NPC
    const temporaryShopId = `temp_npc_${npcId}`;
    console.warn(`⚠️ Aucun shop trouvé pour NPC ${npcId}, création d'un shop temporaire`);
    return this.createTemporaryShop(temporaryShopId, npcId);
  }

  getItemPrice(itemId: string, customPrice?: number): number {
    if (customPrice !== undefined) {
      return customPrice;
    }
    
    const price = this.itemPrices.get(itemId);
    if (price !== undefined) {
      return price;
    }
    
    // ✅ Prix par défaut si introuvable
    console.warn(`⚠️ Prix manquant pour ${itemId}, utilisation du prix par défaut`);
    return 100;
  }

  getItemBuyPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop) return 0;

    const shopItem = shop.items.find(item => item.itemId === itemId);
    const basePrice = this.getItemPrice(itemId, shopItem?.customPrice);
    
    return Math.floor(basePrice * shop.buyMultiplier);
  }

  getItemSellPrice(shopId: string, itemId: string): number {
    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop) return 0;

    const basePrice = this.getItemPrice(itemId);
    return Math.floor(basePrice * shop.sellMultiplier);
  }

  canBuyItem(shopId: string, itemId: string, quantity: number = 1, playerGold: number, playerLevel: number = 1): {
    canBuy: boolean;
    reason?: string;
    totalCost?: number;
  } {
    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop) {
      return { canBuy: false, reason: "Shop introuvable" };
    }

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem) {
      return { canBuy: false, reason: "Objet non vendu dans ce magasin" };
    }

    // Vérifier le level requis
    if (shopItem.unlockLevel && playerLevel < shopItem.unlockLevel) {
      return { 
        canBuy: false, 
        reason: `Niveau ${shopItem.unlockLevel} requis` 
      };
    }

    // Vérifier le stock
    if (shopItem.stock !== undefined && shopItem.stock !== -1) {
      if (shopItem.stock < quantity) {
        return { 
          canBuy: false, 
          reason: shopItem.stock === 0 ? "Rupture de stock" : `Stock insuffisant (${shopItem.stock} disponible(s))` 
        };
      }
    }

    // Vérifier l'argent
    const totalCost = this.getItemBuyPrice(shopId, itemId) * quantity;
    if (playerGold < totalCost) {
      return { 
        canBuy: false, 
        reason: "Pas assez d'argent",
        totalCost 
      };
    }

    return { 
      canBuy: true, 
      totalCost 
    };
  }

  async buyItem(
    shopId: string, 
    itemId: string, 
    quantity: number, 
    playerGold: number, 
    playerLevel: number = 1
  ): Promise<TransactionResult> {
    console.log(`🛒 Tentative d'achat: ${quantity}x ${itemId} dans ${shopId}`);

    const buyCheck = this.canBuyItem(shopId, itemId, quantity, playerGold, playerLevel);
    if (!buyCheck.canBuy) {
      return {
        success: false,
        message: buyCheck.reason || "Achat impossible"
      };
    }

    const shop = this.getShopDefinition(shopId)!; // ✅ Ne peut pas être null grâce au fallback
    const shopItem = shop.items.find(item => item.itemId === itemId)!;
    const totalCost = buyCheck.totalCost!;

    try {
      // Déduire l'argent
      const newGold = playerGold - totalCost;

      // Mettre à jour le stock du shop
      const shopStockChanged: { itemId: string; newStock: number }[] = [];
      if (shopItem.stock !== undefined && shopItem.stock !== -1) {
        shopItem.stock -= quantity;
        shopStockChanged.push({
          itemId: itemId,
          newStock: shopItem.stock
        });
      }

      // ✅ Messages sans traduction côté serveur
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
          newQuantity: quantity // Cette valeur sera mise à jour par l'InventoryManager
        }],
        shopStockChanged: shopStockChanged
      };

    } catch (error) {
      console.error(`❌ Erreur lors de l'achat:`, error);
      return {
        success: false,
        message: "Erreur lors de la transaction"
      };
    }
  }

  async sellItem(
    shopId: string, 
    itemId: string, 
    quantity: number,
    playerHasQuantity: number
  ): Promise<TransactionResult> {
    console.log(`💰 Tentative de vente: ${quantity}x ${itemId} dans ${shopId}`);

    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop) {
      return {
        success: false,
        message: "Shop introuvable"
      };
    }

    // Vérifier que le joueur a assez d'objets
    if (playerHasQuantity < quantity) {
      return {
        success: false,
        message: "Pas assez d'objets à vendre"
      };
    }

    const sellPrice = this.getItemSellPrice(shopId, itemId);
    const totalValue = sellPrice * quantity;

    try {
      // ✅ Messages sans traduction côté serveur
      const shopMessage = shop.isTemporary 
        ? `[TEMP_SHOP] Sold ${quantity}x ${itemId} for ${totalValue} gold`
        : `Sold ${quantity}x ${itemId} for ${totalValue} gold`;

      console.log(`✅ Vente réussie: ${quantity}x ${itemId} ${shop.isTemporary ? '(temp)' : ''}`);

      return {
        success: true,
        message: shopMessage,
        newGold: totalValue, // Sera ajouté à l'or actuel
        itemsChanged: [{
          itemId: itemId,
          quantityChanged: -quantity,
          newQuantity: playerHasQuantity - quantity
        }]
      };

    } catch (error) {
      console.error(`❌ Erreur lors de la vente:`, error);
      return {
        success: false,
        message: "Erreur lors de la transaction"
      };
    }
  }

  // ✅ === MÉTHODES UTILITAIRES MODIFIÉES ===

  getShopCatalog(shopId: string, playerLevel: number = 1): {
    shopInfo: ShopDefinition;
    availableItems: (ShopItem & {
      itemId: string;     // ✅ Le client utilisera cet ID pour la localisation
      buyPrice: number;
      sellPrice: number;
      canBuy: boolean;
      canSell: boolean;
      unlocked: boolean;
    })[];
  } | null {
    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop) return null;

    const availableItems = shop.items.map(shopItem => {
      const buyPrice = this.getItemBuyPrice(shopId, shopItem.itemId);
      const sellPrice = this.getItemSellPrice(shopId, shopItem.itemId);
      const unlocked = !shopItem.unlockLevel || playerLevel >= shopItem.unlockLevel;
      
      return {
        ...shopItem,
        itemId: shopItem.itemId, // ✅ ID pour localisation côté client
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        canBuy: unlocked && (shopItem.stock === undefined || shopItem.stock === -1 || shopItem.stock > 0),
        canSell: true, // La plupart des shops acceptent la vente
        unlocked: unlocked
      };
    });

    return {
      shopInfo: shop,
      availableItems: availableItems
    };
  }

  // ✅ Le serveur n'a pas besoin de traduire, on renvoie juste l'itemId
  // Le client gère la localisation avec itemloca.json
  private getItemName(itemId: string): string {
    return itemId; // Le client traduira avec itemloca.json
  }

  private getItemDescription(itemId: string): string {
    return itemId; // Le client traduira avec itemloca.json
  }

  // ✅ === MÉTHODES DE RESTOCK MODIFIÉES ===

  restockShop(shopId: string): boolean {
    const shop = this.getShopDefinition(shopId); // ✅ Utilise la version avec fallback
    if (!shop || shop.restockInterval === 0) return false;

    // ✅ Ne pas restocker les shops temporaires
    if (shop.isTemporary) {
      console.log(`🔄 Shop temporaire ${shopId} - pas de restock nécessaire`);
      return false;
    }

    const now = Date.now();
    const lastRestock = shop.lastRestock || 0;
    const timeSinceRestock = now - lastRestock;
    const restockIntervalMs = shop.restockInterval * 60 * 1000;

    if (timeSinceRestock >= restockIntervalMs) {
      // Remettre le stock à son maximum pour tous les objets
      shop.items.forEach(item => {
        if (item.stock !== undefined && item.stock !== -1) {
          // Stock par défaut basé sur le type d'objet
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
    // ✅ Retourner shops officiels + temporaires
    const allShops = [
      ...Array.from(this.shopDefinitions.values()),
      ...Array.from(this.temporaryShops.values())
    ];
    return allShops;
  }

  // ✅ === NOUVELLES MÉTHODES DE GESTION DES SHOPS TEMPORAIRES ===

  // Créer un shop temporaire spécifique
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

  // Supprimer un shop temporaire
  removeTemporaryShop(shopId: string): boolean {
    const removed = this.temporaryShops.delete(shopId);
    if (removed) {
      console.log(`🗑️ Shop temporaire ${shopId} supprimé`);
    }
    return removed;
  }

  // Vérifier si un shop est temporaire
  isTemporaryShop(shopId: string): boolean {
    const shop = this.getShopDefinition(shopId);
    return shop?.isTemporary || false;
  }

  // Nettoyer tous les shops temporaires
  clearTemporaryShops(): number {
    const count = this.temporaryShops.size;
    this.temporaryShops.clear();
    console.log(`🧹 ${count} shops temporaires supprimés`);
    return count;
  }

  // ✅ === MÉTHODES D'ADMINISTRATION ===

  addItemToShop(shopId: string, item: ShopItem): boolean {
    const shop = this.getShopDefinition(shopId);
    if (!shop) return false;

    // Vérifier si l'objet existe déjà
    const existingIndex = shop.items.findIndex(i => i.itemId === item.itemId);
    if (existingIndex >= 0) {
      shop.items[existingIndex] = item; // Remplacer
    } else {
      shop.items.push(item); // Ajouter
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
