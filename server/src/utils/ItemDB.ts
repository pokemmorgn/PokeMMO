// utils/ItemDB.ts
import fs from "fs";
import path from "path";

export type ItemData = {
  id: string;
  type: string;
  price: number | null;
  sell_price: number | null;
  usable_in_battle: boolean;
  usable_in_field: boolean;
  stackable: boolean;
  [key: string]: any;
};

const itemDBPath = path.join(__dirname, "..", "data", "items.json");
export const ITEMS: { [id: string]: ItemData } = JSON.parse(fs.readFileSync(itemDBPath, "utf-8"));
