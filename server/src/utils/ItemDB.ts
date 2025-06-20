import fs from "fs";
import path from "path";

// Type complet (tu peux l’enrichir selon items.json)
export type ItemData = {
  id: string;
  type: string;
  pocket: string; // <-- Ajout
  price: number | null;
  sell_price: number | null;
  usable_in_battle: boolean;
  usable_in_field: boolean;
  stackable: boolean;
  [key: string]: any;
};

const itemDBPath = path.join(__dirname, "..", "data", "items.json");
export const ITEMS: { [id: string]: ItemData } = JSON.parse(fs.readFileSync(itemDBPath, "utf-8"));

/**
 * Vérifie qu’un item existe
 */
export function isValidItemId(itemId: string): boolean {
  return !!ITEMS[itemId];
}

/**
 * Renvoie la fiche d’un item, throw si inconnu
 */
export function getItemData(itemId: string): ItemData {
  const d = ITEMS[itemId];
  if (!d) throw new Error(`[ItemDB] Item "${itemId}" inconnu`);
  return d;
}

/**
 * Renvoie la pocket d’un item (ex: "medicine", "balls", etc.)
 */
export function getItemPocket(itemId: string): string {
  const item = getItemData(itemId);
  return item.pocket;
}
