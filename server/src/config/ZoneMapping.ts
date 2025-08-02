// server/src/config/ZoneMapping.ts
export const CLIENT_TO_DB_ZONE_MAPPING: Record<string, string> = {
  'Road1Scene': 'road1',
  'VillageLabScene': 'villagelab',
  'VillageHouse1Scene': 'villagehouse1',
  'VillageFloristScene': 'villageflorist',
  'Road1HouseScene': 'road1house',
  'Road1HiddenScene': 'road1hidden',
  'Road3Scene': 'road3',
  'LavandiaAnalysisScene': 'lavandiaanalysis',
  'LavandiaCelebiTempleScene': 'lavandiacelebitemple',
  'LavandiaEquipmentScene': 'lavandiaequipment',
  'LavandiaFurnitureScene': 'lavandiafurniture',
  'LavandiaHealingCenterScene': 'lavandiahealingcenter',
  'LavandiaShopScene': 'lavandiashop',
  'LavandiaHouse1Scene': 'lavandiahouse1',
  'LavandiaHouse2Scene': 'lavandiahouse2',
  'LavandiaHouse3Scene': 'lavandiahouse3',
  'LavandiaHouse4Scene': 'lavandiahouse4',
  'LavandiaHouse5Scene': 'lavandiahouse5',
  'LavandiaHouse6Scene': 'lavandiahouse6',
  'LavandiaHouse7Scene': 'lavandiahouse7',
  'LavandiaHouse8Scene': 'lavandiahouse8',
  'LavandiaHouse9Scene': 'lavandiahouse9',
  'NoctherbCave1Scene': 'noctherbcave1',
  'NoctherbCave2Scene': 'noctherbcave2',
  'WraithmoorScene': 'wraithmoor'
};

export function getDbZoneName(clientZone: string): string {
  const mapped = CLIENT_TO_DB_ZONE_MAPPING[clientZone];
  if (mapped) {
    console.log(`🗺️ [ZoneMapping] ${clientZone} → ${mapped}`);
    return mapped;
  }
  
  console.warn(`⚠️ [ZoneMapping] Zone non mappée: ${clientZone}, utilisation lowercase`);
  return clientZone.toLowerCase();
}
