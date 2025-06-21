// server/src/managers/ShopManager.ts

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
  type: 'general' | 'pokemart' | 'specialist' | 'black_market';
  description?: string;
  npcId?: number;
  items: ShopItem[];
  buyMultiplier?: number; // Multiplicateur pour les prix d'achat (défaut: 1.0)
  sellMultiplier?: number; // Multiplicateur pour les prix de vente (défaut: 0.5)
  currency?: 'gold' | 'tokens' | 'battle_points'; // Type de monnaie (défaut: gold)
  restockInterval?: number; // Minutes entre les restocks (0 = pas de restock)
  lastRestock?: number; // Timestamp du dernier restock
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
  
  constructor(
    shopsDataPath: string = "../data/shops/shops.json",
    itemsDataPath: string = "../data/items/items.json"
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
      
      // Charger les prix depuis le fichier items
      if (itemsData.items) {
        for (const item of itemsData.items) {
          if (item.price !== undefined) {
            this.itemPrices.set(item.id, item.price);
          }
        }
      }

      console.log(`💰 ${this.itemPrices.size} prix d'objets chargés`);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des prix d'objets:", error);
    }
  }

  // ✅ === MÉTHODES PUBLIQUES ===

  getShopDefinition(shopId: string): ShopDefinition | undefined {
    return this.shopDefinitions.get(shopId);
  }

  getShopByNpcId(npcId: number): ShopDefinition | undefined {
    return Array.from(this.shopDefinitions.values()).find(shop => shop.npcId === npcId);
  }

  getItemPrice(itemId: string, customPrice?: number): number {
    if (customPrice !== undefined) {
      return customPrice;
    }
    return this.itemPrices.get(itemId) || 100; // Prix par défaut si introuvable
  }

  getItemBuyPrice(shopId: string, itemId: string): number {
    const shop = this.shopDefinitions.get(shopId);
    if (!shop) return 0;

    const shopItem = shop.items.find(item => item.itemId === itemId);
    const basePrice = this.getItemPrice(itemId, shopItem?.customPrice);
    
    return Math.floor(basePrice * shop.buyMultiplier);
  }

  getItemSellPrice(shopId: string, itemId: string): number {
    const shop = this.shopDefinitions.get(shopId);
    if (!shop) return 0;

    const basePrice = this.getItemPrice(itemId);
    return Math.floor(basePrice * shop.sellMultiplier);
  }

  canBuyItem(shopId: string, itemId: string, quantity: number = 1, playerGold: number, playerLevel: number = 1): {
    canBuy: boolean;
    reason?: string;
    totalCost?: number;
  } {
    const shop = this.shopDefinitions.get(shopId);
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

    const shop = this.shopDefinitions.get(shopId)!;
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

      console.log(`✅ Achat réussi: ${quantity}x ${itemId} pour ${totalCost} gold`);

      return {
        success: true,
        message: `Vous avez acheté ${quantity}x ${itemId} pour ${totalCost} gold`,
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

    const shop = this.shopDefinitions.get(shopId);
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
      console.log(`✅ Vente réussie: ${quantity}x ${itemId} pour ${totalValue} gold`);

      return {
        success: true,
        message: `Vous avez vendu ${quantity}x ${itemId} pour ${totalValue} gold`,
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

  // ✅ === MÉTHODES UTILITAIRES ===

  getShopCatalog(shopId: string, playerLevel: number = 1): {
    shopInfo: ShopDefinition;
    availableItems: (ShopItem & {
      name: string;
      description: string;
      buyPrice: number;
      sellPrice: number;
      canBuy: boolean;
      canSell: boolean;
      unlocked: boolean;
    })[];
  } | null {
    const shop = this.shopDefinitions.get(shopId);
    if (!shop) return null;

    const availableItems = shop.items.map(shopItem => {
      const buyPrice = this.getItemBuyPrice(shopId, shopItem.itemId);
      const sellPrice = this.getItemSellPrice(shopId, shopItem.itemId);
      const unlocked = !shopItem.unlockLevel || playerLevel >= shopItem.unlockLevel;
      
      return {
        ...shopItem,
        name: this.getItemName(shopItem.itemId),
        description: this.getItemDescription(shopItem.itemId),
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

  private getItemName(itemId: string): string {
    // TODO: Charger depuis un fichier de localisation ou items.json
    const nameMap: { [key: string]: string } = {
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'fishing_line': 'Ligne de Pêche',
      'escape_rope': 'Corde Sortie',
      'antidote': 'Antidote',
      'paralyz_heal': 'Anti-Para',
      'awakening': 'Réveil',
      'burn_heal': 'Anti-Brûlure',
      'ice_heal': 'Antigel',
      'repel': 'Repousse',
      'super_repel': 'Super Repousse',
      'max_repel': 'Max Repousse'
    };
    return nameMap[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getItemDescription(itemId: string): string {
    // TODO: Charger depuis un fichier de localisation
    const descMap: { [key: string]: string } = {
      'potion': 'Soigne 20 PV à un Pokémon.',
      'fishing_line': 'Une ligne de pêche de qualité pour capturer des Pokémon aquatiques.',
      'poke_ball': 'Une Ball pour capturer des Pokémon sauvages.',
      'repel': 'Repousse les Pokémon sauvages pendant 100 pas.'
    };
    return descMap[itemId] || 'Description non disponible.';
  }

  // ✅ === MÉTHODES DE RESTOCK ===

  restockShop(shopId: string): boolean {
    const shop = this.shopDefinitions.get(shopId);
    if (!shop || shop.restockInterval === 0) return false;

    const now = Date.now();
    const lastRestock = shop.lastRestock || 0;
    const timeSinceRestock = now - lastRestock;
    const restockIntervalMs = shop.restockInterval * 60 * 1000;

    if (timeSinceRestock >= restockIntervalMs) {
      // Remettre le stock à son maximum pour tous les objets
      shop.items.forEach(item => {
        if (item.stock !== undefined && item.stock !== -1) {
          // TODO: Définir un stock maximum par objet
          item.stock = 50; // Stock par défaut
        }
      });

      shop.lastRestock = now;
      console.log(`🔄 Shop ${shopId} restocké`);
      return true;
    }

    return false;
  }

  getAllShops(): ShopDefinition[] {
    return Array.from(this.shopDefinitions.values());
  }

  // ✅ === MÉTHODES D'ADMINISTRATION ===

  addItemToShop(shopId: string, item: ShopItem): boolean {
    const shop = this.shopDefinitions.get(shopId);
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
    const shop = this.shopDefinitions.get(shopId);
    if (!shop) return false;

    const itemIndex = shop.items.findIndex(i => i.itemId === itemId);
    if (itemIndex >= 0) {
      shop.items.splice(itemIndex, 1);
      return true;
    }

    return false;
  }

  updateItemStock(shopId: string, itemId: string, newStock: number): boolean {
    const shop = this.shopDefinitions.get(shopId);
    if (!shop) return false;

    const item = shop.items.find(i => i.itemId === itemId);
    if (item) {
      item.stock = newStock;
      return true;
    }

    return false;
  }
}
