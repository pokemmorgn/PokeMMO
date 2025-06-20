import { Inventory, IInventory, IInventoryItem } from "../models/Inventory";
import { getItemData, isValidItemId, getItemPocket } from "../utils/ItemDB";
import { EventDispatcher } from "../utils/EventDispatcher";

// Type des events d’inventaire
type InventoryEvents = {
  addItem: { username: string; itemId: string; quantity: number };
  removeItem: { username: string; itemId: string; quantity: number };
  clear: { username: string };
};

// Liste de toutes les poches gérées
const ALL_POCKETS = [
  "items", "medicine", "balls", "berries", "key_items",
  "tms", "battle_items", "valuables", "held_items"
] as const;
type PocketName = typeof ALL_POCKETS[number];

// Limite de slots PAR POCHE
const MAX_SLOTS_PER_POCKET = 30;

// Helper pour accéder/créer la bonne poche
function getPocketList(inv: IInventory, pocket: string) {
  if (!inv[pocket]) inv[pocket] = [];
  return inv[pocket] as IInventoryItem[];
}

export class InventoryManager {
  static events = new EventDispatcher<InventoryEvents>();

  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create(Object.fromEntries([
        ["username", username],
        ...ALL_POCKETS.map<[string, IInventoryItem[]]>(pocket => [pocket, [] as IInventoryItem[]])
      ]));
    }
    return inv;
  }

  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    if (!isValidItemId(itemId)) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const itemData = getItemData(itemId);
    const pocket = getItemPocket(itemId);
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);

    const hasItem = list.find((i: IInventoryItem) => i.itemId === itemId);

    if (!hasItem && list.length >= MAX_SLOTS_PER_POCKET)
      throw new Error(`[InventoryManager] Poche "${pocket}" pleine (${MAX_SLOTS_PER_POCKET} slots max)`);

    if (!itemData.stackable) {
      if (hasItem)
        throw new Error(`[InventoryManager] "${itemId}" déjà possédé (objet non stackable)`);
      list.push({ itemId, quantity: 1 });
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId, quantity: 1 });
      return inv;
    } else {
      if (hasItem) {
        hasItem.quantity += qty;
      } else {
        list.push({ itemId, quantity: qty });
      }
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId, quantity: qty });
      return inv;
    }
  }

  static async removeItem(username: string, itemId: string, qty: number = 1): Promise<boolean> {
    if (!isValidItemId(itemId)) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const itemData = getItemData(itemId);
    const pocket = getItemPocket(itemId);
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    const item = list.find((i: IInventoryItem) => i.itemId === itemId);

    if (!item) return false;
    if (!itemData.stackable && qty > 1)
      throw new Error(`[InventoryManager] Impossible de retirer plusieurs exemplaires d’un non-stackable`);
    if (item.quantity < qty) return false;

    item.quantity -= qty;
    if (item.quantity <= 0) {
      const idx = list.findIndex((i: IInventoryItem) => i.itemId === itemId);
      if (idx >= 0) list.splice(idx, 1);
    }
    await inv.save();
    InventoryManager.events.emit("removeItem", { username, itemId, quantity: qty });
    return true;
  }

  static async getItemCount(username: string, itemId: string): Promise<number> {
    if (!isValidItemId(itemId)) return 0;
    const pocket = getItemPocket(itemId);
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    const item = list.find((i: IInventoryItem) => i.itemId === itemId);
    return item ? item.quantity : 0;
  }

  // Retourne tous les items à plat
  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number; data: any; pocket: string }[]> {
    const inv = await InventoryManager.getInventory(username);
    const result: { itemId: string; quantity: number; data: any; pocket: string }[] = [];
    for (const pocket of ALL_POCKETS) {
      const list = getPocketList(inv, pocket);
      for (const i of list) {
        result.push({ itemId: i.itemId, quantity: i.quantity, data: getItemData(i.itemId), pocket });
      }
    }
    return result;
  }

  // Liste tous les items d’une poche (UI/onglet)
  static async getItemsByPocket(username: string, pocket: string): Promise<{ itemId: string; quantity: number; data: any }[]> {
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    return list.map((i: IInventoryItem) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      data: getItemData(i.itemId)
    }));
  }

  // Groupe tout l’inventaire par poche
  static async getAllItemsGroupedByPocket(username: string): Promise<Record<string, { itemId: string; quantity: number; data: any }[]>> {
    const inv = await InventoryManager.getInventory(username);
    const grouped: Record<string, { itemId: string; quantity: number; data: any }[]> = {};
    for (const pocket of ALL_POCKETS) {
      const list = getPocketList(inv, pocket);
      grouped[pocket] = list.map((i: IInventoryItem) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        data: getItemData(i.itemId)
      }));
    }
    return grouped;
  }

  // Vérifie si une poche a un slot libre
  static async hasFreeSlot(username: string, pocket: string): Promise<boolean> {
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    return list.length < MAX_SLOTS_PER_POCKET;
  }

  // Vide toutes les poches
  static async clear(username: string) {
    const inv = await InventoryManager.getInventory(username);
    for (const pocket of ALL_POCKETS) {
      inv[pocket] = [];
    }
    await inv.save();
    InventoryManager.events.emit("clear", { username });
  }

  // Sauvegarde/export inventaire complet (sans _id, ni __v)
  static async exportInventory(username: string): Promise<any> {
    const inv = await InventoryManager.getInventory(username);
    const raw: { [key: string]: any } = {};
    for (const pocket of ALL_POCKETS) {
      raw[pocket] = inv[pocket]?.map((i: IInventoryItem) => ({ itemId: i.itemId, quantity: i.quantity })) || [];
    }
    raw["username"] = username;
    return raw;
  }

  // Restaure un inventaire (remplace tout !)
  static async importInventory(username: string, data: any) {
    let inv = await Inventory.findOne({ username });
    if (!inv) inv = await Inventory.create({ username });
    for (const pocket of ALL_POCKETS) {
      inv[pocket] = (data[pocket] || []).map((i: { itemId: string; quantity: number }) => ({ itemId: i.itemId, quantity: i.quantity }));
    }
    await inv.save();
  }

  // Vérifie si le joueur peut utiliser l’objet dans ce contexte
  static async canUseItem(username: string, itemId: string, context: "battle" | "field"): Promise<boolean> {
    if (!isValidItemId(itemId)) return false;
    const itemData = getItemData(itemId);
    const qty = await InventoryManager.getItemCount(username, itemId);
    if (qty <= 0) return false;
    if (context === "battle" && !itemData.usable_in_battle) return false;
    if (context === "field" && !itemData.usable_in_field) return false;
    return true;
  }
}
