// migrate-shops-to-mongodb.ts
// Script de migration complet JSON → MongoDB avec shops Pokémon réalistes

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// ===== DÉTECTION AUTOMATIQUE DES CHEMINS =====
async function loadModules() {
  try {
    console.log('🔍 [Migration] Chargement des modules...');
    
    // Chemins relatifs depuis server/src/scripts/
    const shopDataPath = '../models/ShopData';
    
    const { ShopData } = await import(shopDataPath);
    
    console.log('✅ [Migration] Modules chargés avec succès !');
    return { ShopData };
    
  } catch (error) {
    console.error('❌ [Migration] Erreur chargement modules:', error);
    throw error;
  }
}

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';
const DRY_RUN = process.env.DRY_RUN === 'true';

// ===== DONNÉES POKÉMON RÉALISTES =====

const POKEMON_REGIONS = {
  kanto: {
    cities: ['pallet_town', 'viridian_city', 'pewter_city', 'cerulean_city', 'vermilion_city', 
             'lavender_town', 'celadon_city', 'fuchsia_city', 'saffron_city', 'cinnabar_island'],
    gyms: ['pewter_gym', 'cerulean_gym', 'vermilion_gym', 'celadon_gym', 'fuchsia_gym', 
           'saffron_gym', 'cinnabar_gym', 'viridian_gym']
  },
  johto: {
    cities: ['new_bark_town', 'cherrygrove_city', 'violet_city', 'azalea_town', 'goldenrod_city',
             'ecruteak_city', 'olivine_city', 'cianwood_city', 'mahogany_town', 'blackthorn_city'],
    gyms: ['violet_gym', 'azalea_gym', 'goldenrod_gym', 'ecruteak_gym', 'olivine_gym',
           'cianwood_gym', 'mahogany_gym', 'blackthorn_gym']
  }
};

const SHOP_TEMPLATES = {
  pokemart: {
    nameKey: 'shop.name.pokemart',
    type: 'pokemart' as const,
    currency: 'gold' as const,
    buyMultiplier: 1.0,
    sellMultiplier: 0.5,
    items: [
      { itemId: 'poke_ball', category: 'pokeballs' as const, stock: 100 },
      { itemId: 'great_ball', category: 'pokeballs' as const, stock: 50, unlockLevel: 10 },
      { itemId: 'ultra_ball', category: 'pokeballs' as const, stock: 25, unlockLevel: 20 },
      { itemId: 'potion', category: 'medicine' as const, stock: 50 },
      { itemId: 'super_potion', category: 'medicine' as const, stock: 30, unlockLevel: 5 },
      { itemId: 'hyper_potion', category: 'medicine' as const, stock: 20, unlockLevel: 15 },
      { itemId: 'max_potion', category: 'medicine' as const, stock: 10, unlockLevel: 25 },
      { itemId: 'revive', category: 'medicine' as const, stock: 15, unlockLevel: 10 },
      { itemId: 'max_revive', category: 'medicine' as const, stock: 5, unlockLevel: 30 },
      { itemId: 'antidote', category: 'medicine' as const, stock: 20 },
      { itemId: 'paralyz_heal', category: 'medicine' as const, stock: 20 },
      { itemId: 'awakening', category: 'medicine' as const, stock: 15 },
      { itemId: 'burn_heal', category: 'medicine' as const, stock: 15 },
      { itemId: 'ice_heal', category: 'medicine' as const, stock: 15 },
      { itemId: 'full_heal', category: 'medicine' as const, stock: 10, unlockLevel: 12 }
    ]
  },

  department: {
    nameKey: 'shop.name.department',
    type: 'department' as const,
    currency: 'gold' as const,
    buyMultiplier: 0.95,
    sellMultiplier: 0.6,
    items: [
      // Poké Balls variés
      { itemId: 'poke_ball', category: 'pokeballs' as const, stock: 200 },
      { itemId: 'great_ball', category: 'pokeballs' as const, stock: 100 },
      { itemId: 'ultra_ball', category: 'pokeballs' as const, stock: 50 },
      { itemId: 'timer_ball', category: 'pokeballs' as const, stock: 30, unlockLevel: 15 },
      { itemId: 'net_ball', category: 'pokeballs' as const, stock: 30, unlockLevel: 15 },
      // Médecine complète
      { itemId: 'potion', category: 'medicine' as const, stock: 100 },
      { itemId: 'super_potion', category: 'medicine' as const, stock: 75 },
      { itemId: 'hyper_potion', category: 'medicine' as const, stock: 50 },
      { itemId: 'max_potion', category: 'medicine' as const, stock: 25 },
      { itemId: 'full_restore', category: 'medicine' as const, stock: 15, unlockLevel: 20 },
      // Objets de combat
      { itemId: 'x_attack', category: 'battle_items' as const, stock: 20, unlockLevel: 10 },
      { itemId: 'x_defense', category: 'battle_items' as const, stock: 20, unlockLevel: 10 },
      { itemId: 'x_speed', category: 'battle_items' as const, stock: 20, unlockLevel: 10 },
      // Objets tenus basiques
      { itemId: 'leftovers', category: 'held_items' as const, stock: 5, unlockLevel: 25 },
      { itemId: 'focus_band', category: 'held_items' as const, stock: 3, unlockLevel: 30 }
    ]
  },

  gym_shop: {
    nameKey: 'shop.name.gym_shop',
    type: 'gym_shop' as const,
    currency: 'gold' as const,
    buyMultiplier: 1.1,
    sellMultiplier: 0.55,
    items: [
      { itemId: 'super_potion', category: 'medicine' as const, stock: 30 },
      { itemId: 'hyper_potion', category: 'medicine' as const, stock: 20 },
      { itemId: 'revive', category: 'medicine' as const, stock: 15 },
      { itemId: 'x_attack', category: 'battle_items' as const, stock: 10 },
      { itemId: 'x_defense', category: 'battle_items' as const, stock: 10 },
      { itemId: 'x_speed', category: 'battle_items' as const, stock: 10 },
      { itemId: 'dire_hit', category: 'battle_items' as const, stock: 8 },
      { itemId: 'guard_spec', category: 'battle_items' as const, stock: 8 }
    ]
  },

  fishing_shop: {
    nameKey: 'shop.name.fishing_shop',
    type: 'specialist' as const,
    currency: 'gold' as const,
    buyMultiplier: 0.9,
    sellMultiplier: 0.6,
    items: [
      { itemId: 'old_rod', category: 'key_items' as const, stock: 5, basePrice: 1000 },
      { itemId: 'good_rod', category: 'key_items' as const, stock: 3, basePrice: 5000, unlockLevel: 15 },
      { itemId: 'super_rod', category: 'key_items' as const, stock: 1, basePrice: 15000, unlockLevel: 30 },
      { itemId: 'net_ball', category: 'pokeballs' as const, stock: 25 },
      { itemId: 'dive_ball', category: 'pokeballs' as const, stock: 20, unlockLevel: 20 },
      { itemId: 'potion', category: 'medicine' as const, stock: 15 },
      { itemId: 'super_potion', category: 'medicine' as const, stock: 10 }
    ]
  },

  berry_shop: {
    nameKey: 'shop.name.berry_shop',
    type: 'specialist' as const,
    currency: 'gold' as const,
    buyMultiplier: 1.2,
    sellMultiplier: 0.7,
    items: [
      { itemId: 'oran_berry', category: 'berries' as const, stock: 50 },
      { itemId: 'sitrus_berry', category: 'berries' as const, stock: 30 },
      { itemId: 'pecha_berry', category: 'berries' as const, stock: 25 },
      { itemId: 'cheri_berry', category: 'berries' as const, stock: 25 },
      { itemId: 'chesto_berry', category: 'berries' as const, stock: 25 },
      { itemId: 'rawst_berry', category: 'berries' as const, stock: 25 },
      { itemId: 'aspear_berry', category: 'berries' as const, stock: 25 },
      { itemId: 'leppa_berry', category: 'berries' as const, stock: 20, unlockLevel: 10 },
      { itemId: 'lum_berry', category: 'berries' as const, stock: 15, unlockLevel: 15 }
    ]
  },

  game_corner: {
    nameKey: 'shop.name.game_corner',
    type: 'game_corner' as const,
    currency: 'game_tokens' as const,
    buyMultiplier: 1.0,
    sellMultiplier: 0.3,
    items: [
      { itemId: 'tm_thunderbolt', category: 'tms_hms' as const, stock: 1, basePrice: 4000 },
      { itemId: 'tm_ice_beam', category: 'tms_hms' as const, stock: 1, basePrice: 4000 },
      { itemId: 'tm_flamethrower', category: 'tms_hms' as const, stock: 1, basePrice: 4000 },
      { itemId: 'silk_scarf', category: 'held_items' as const, stock: 3, basePrice: 1000 },
      { itemId: 'amulet_coin', category: 'held_items' as const, stock: 1, basePrice: 10000 }
    ]
  },

  black_market: {
    nameKey: 'shop.name.black_market',
    type: 'black_market' as const,
    currency: 'gold' as const,
    buyMultiplier: 2.5,
    sellMultiplier: 1.2,
    items: [
      { itemId: 'master_ball', category: 'pokeballs' as const, stock: 1, basePrice: 100000, unlockLevel: 50 },
      { itemId: 'max_revive', category: 'medicine' as const, stock: 3, basePrice: 50000, unlockLevel: 40 },
      { itemId: 'pp_max', category: 'medicine' as const, stock: 2, basePrice: 25000, unlockLevel: 35 },
      { itemId: 'rare_candy', category: 'rare_items' as const, stock: 5, basePrice: 10000, unlockLevel: 25 },
      { itemId: 'nugget', category: 'rare_items' as const, stock: 10, basePrice: 5000 }
    ]
  }
};

// ===== CLASSE DE MIGRATION =====
class ShopMigrator {
  private ShopData: any;
  private migratedCount = 0;
  private createdCount = 0;
  private errors: string[] = [];

  constructor(modules: any) {
    this.ShopData = modules.ShopData;
  }

  async runMigration(): Promise<void> {
    console.log('\n🚀 === MIGRATION SHOPS JSON → MONGODB ===\n');
    
    if (DRY_RUN) {
      console.log('🔍 MODE DRY RUN - Aucune modification ne sera appliquée\n');
    }

    try {
      await this.connectToMongoDB();
      await this.clearExistingShops();
      await this.migrateExistingJSONShops();
      await this.createPokemonShops();
      await this.validateMigration();
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Erreur critique dans la migration:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  // === SETUP ===

  private async connectToMongoDB(): Promise<void> {
    console.log('📀 [Setup] Connexion à MongoDB...');
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ [Setup] MongoDB connecté');
      
      // Vérifier la collection
      const existingCount = await this.ShopData.countDocuments();
      console.log(`📊 [Setup] Shops existants en base: ${existingCount}`);
      
    } catch (error) {
      throw new Error(`Échec connexion MongoDB: ${error}`);
    }
  }

  private async clearExistingShops(): Promise<void> {
    if (DRY_RUN) {
      console.log('🔍 [DryRun] Suppression des shops existants (simulation)');
      return;
    }

    console.log('🧹 [Migration] Suppression des shops existants...');
    const deletedCount = await this.ShopData.deleteMany({});
    console.log(`✅ [Migration] ${deletedCount.deletedCount} shops supprimés`);
  }

  // === MIGRATION JSON EXISTANTS ===

  private async migrateExistingJSONShops(): Promise<void> {
    console.log('\n📄 [Migration] Recherche des shops JSON existants...');
    
    // Chercher le fichier shops.json
    const shopsJsonPath = this.findShopsJsonFile();
    
    if (!shopsJsonPath) {
      console.log('⚠️ [Migration] Aucun fichier shops.json trouvé, création uniquement des nouveaux shops');
      return;
    }

    console.log(`📁 [Migration] Fichier trouvé: ${shopsJsonPath}`);
    
    try {
      const fileContent = fs.readFileSync(shopsJsonPath, 'utf-8');
      const shopsData = JSON.parse(fileContent);
      
      if (!shopsData.shops || !Array.isArray(shopsData.shops)) {
        throw new Error('Structure JSON invalide');
      }

      console.log(`📦 [Migration] ${shopsData.shops.length} shops JSON à migrer`);

      for (const jsonShop of shopsData.shops) {
        try {
          await this.migrateJSONShop(jsonShop);
          this.migratedCount++;
        } catch (error) {
          const errorMsg = `Shop ${jsonShop.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          this.errors.push(errorMsg);
          console.error(`❌ [Migration] ${errorMsg}`);
        }
      }

      console.log(`✅ [Migration] ${this.migratedCount} shops JSON migrés avec succès`);

    } catch (error) {
      throw new Error(`Erreur lecture shops.json: ${error}`);
    }
  }

  private findShopsJsonFile(): string | null {
    const scriptDir = __dirname; // server/src/scripts/
    const srcDir = path.dirname(scriptDir); // server/src/
    
    const possiblePaths = [
      path.join(srcDir, 'data/shops.json'),
      path.join(process.cwd(), 'server/src/data/shops.json'),
      path.join(process.cwd(), 'data/shops.json'),
      path.join(srcDir, '../data/shops.json'),
      path.join(process.cwd(), 'server/data/shops.json')
    ];

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }

    return null;
  }

  private async migrateJSONShop(jsonShop: any): Promise<void> {
    if (DRY_RUN) {
      console.log(`🔍 [DryRun] Migration shop: ${jsonShop.id} - ${jsonShop.name}`);
      return;
    }

    // Enrichir le shop JSON avec des données Pokémon
    const enrichedShop = this.enrichJSONShop(jsonShop);
    
    const mongoShop = await this.ShopData.createFromJson(enrichedShop);
    console.log(`📦 [Migration] Shop migré: ${mongoShop.shopId} → ${mongoShop.nameKey}`);
  }

  private enrichJSONShop(jsonShop: any): any {
    // Deviner la région et la ville depuis l'ID ou le nom
    const region = this.guessRegion(jsonShop.id, jsonShop.name);
    const city = this.guessCity(jsonShop.id, jsonShop.name);
    
    return {
      ...jsonShop,
      region: region,
      location: {
        zone: jsonShop.zone || 'unknown',
        cityKey: city ? `location.city.${city}` : undefined
      },
      shopKeeper: {
        nameKey: `npc.shopkeeper.${jsonShop.id}`,
        personalityKey: 'personality.friendly'
      },
      restockInfo: jsonShop.restockInterval ? {
        interval: jsonShop.restockInterval,
        lastRestock: new Date(),
        autoRestock: true,
        stockVariation: 10
      } : undefined
    };
  }

  // === CRÉATION SHOPS POKÉMON ===

  private async createPokemonShops(): Promise<void> {
    console.log('\n🎮 [Creation] Création des shops Pokémon thématiques...');

    // Créer des Poké Marts dans toutes les villes importantes
    await this.createPokeMarts();
    
    // Créer des boutiques spécialisées
    await this.createSpecialistShops();
    
    // Créer des boutiques d'arènes
    await this.createGymShops();
    
    // Créer des boutiques rares
    await this.createRareShops();

    console.log(`✅ [Creation] ${this.createdCount} nouveaux shops Pokémon créés`);
  }

  private async createPokeMarts(): Promise<void> {
    console.log('🏪 [Creation] Création des Poké Marts...');

    for (const [regionName, regionData] of Object.entries(POKEMON_REGIONS)) {
      for (const city of regionData.cities) {
        const shopData = {
          shopId: `pokemart_${city}`,
          ...SHOP_TEMPLATES.pokemart,
          region: regionName,
          location: {
            zone: city,
            cityKey: `location.city.${city}`
          },
          shopKeeper: {
            nameKey: `npc.shopkeeper.pokemart_${city}`,
            personalityKey: 'personality.professional',
            specializationKey: 'specialization.pokemon_items'
          },
          restockInfo: {
            interval: 720, // 12 heures
            lastRestock: new Date(),
            autoRestock: true,
            stockVariation: 15
          }
        };

        await this.createShop(shopData, `Poké Mart - ${city}`);
      }
    }
  }

  private async createSpecialistShops(): Promise<void> {
    console.log('🎣 [Creation] Création des boutiques spécialisées...');

    // Boutiques de pêche près de l'eau
    const fishingLocations = ['vermilion_city', 'olivine_city', 'cianwood_city', 'cinnabar_island'];
    for (const location of fishingLocations) {
      const shopData = {
        shopId: `fishing_shop_${location}`,
        ...SHOP_TEMPLATES.fishing_shop,
        region: location.includes('olivine') || location.includes('cianwood') ? 'johto' : 'kanto',
        location: {
          zone: location,
          cityKey: `location.city.${location}`
        },
        shopKeeper: {
          nameKey: `npc.shopkeeper.fishing_${location}`,
          personalityKey: 'personality.cheerful',
          specializationKey: 'specialization.fishing'
        }
      };

      await this.createShop(shopData, `Boutique de Pêche - ${location}`);
    }

    // Herboristeries pour les baies
    const berryLocations = ['celadon_city', 'goldenrod_city', 'azalea_town'];
    for (const location of berryLocations) {
      const shopData = {
        shopId: `berry_shop_${location}`,
        ...SHOP_TEMPLATES.berry_shop,
        region: location.includes('goldenrod') || location.includes('azalea') ? 'johto' : 'kanto',
        location: {
          zone: location,
          cityKey: `location.city.${location}`
        },
        shopKeeper: {
          nameKey: `npc.shopkeeper.berry_${location}`,
          personalityKey: 'personality.friendly',
          specializationKey: 'specialization.berries'
        }
      };

      await this.createShop(shopData, `Herboristerie - ${location}`);
    }

    // Grands Magasins
    const departmentLocations = ['celadon_city', 'goldenrod_city'];
    for (const location of departmentLocations) {
      const shopData = {
        shopId: `department_${location}`,
        ...SHOP_TEMPLATES.department,
        region: location.includes('goldenrod') ? 'johto' : 'kanto',
        location: {
          zone: location,
          cityKey: `location.city.${location}`
        },
        shopKeeper: {
          nameKey: `npc.shopkeeper.department_${location}`,
          personalityKey: 'personality.professional',
          specializationKey: 'specialization.department'
        },
        accessRequirements: {
          timeRestrictions: {
            openHour: 9,
            closeHour: 21,
            closedDays: new Array<number>()
          }
        }
      };

      await this.createShop(shopData, `Grand Magasin - ${location}`);
    }
  }

  private async createGymShops(): Promise<void> {
    console.log('⚔️ [Creation] Création des boutiques d\'arènes...');

    for (const [regionName, regionData] of Object.entries(POKEMON_REGIONS)) {
      for (const gym of regionData.gyms) {
        const gymCity = gym.replace('_gym', '');
        
        const shopData = {
          shopId: `gym_shop_${gym}`,
          ...SHOP_TEMPLATES.gym_shop,
          region: regionName,
          location: {
            zone: gymCity,
            cityKey: `location.city.${gymCity}`,
            buildingKey: `location.building.${gym}`
          },
          shopKeeper: {
            nameKey: `npc.shopkeeper.gym_${gym}`,
            personalityKey: 'personality.stern',
            specializationKey: 'specialization.battle'
          },
          accessRequirements: {
            minLevel: 10
          }
        };

        await this.createShop(shopData, `Boutique d'Arène - ${gym}`);
      }
    }
  }

  private async createRareShops(): Promise<void> {
    console.log('🎰 [Creation] Création des boutiques rares...');

    // Game Corner
    const gameCornerData = {
      shopId: 'game_corner_celadon',
      ...SHOP_TEMPLATES.game_corner,
      region: 'kanto',
      location: {
        zone: 'celadon_city',
        cityKey: 'location.city.celadon_city',
        buildingKey: 'location.building.game_corner'
      },
      shopKeeper: {
        nameKey: 'npc.shopkeeper.game_corner',
        personalityKey: 'personality.mysterious',
        specializationKey: 'specialization.gambling'
      },
      accessRequirements: {
        minLevel: 15
      }
    };

    await this.createShop(gameCornerData, 'Game Corner');

    // Marché Noir (caché)
    const blackMarketData = {
      shopId: 'black_market_hideout',
      ...SHOP_TEMPLATES.black_market,
      region: 'kanto',
      location: {
        zone: 'lavender_town',
        cityKey: 'location.city.lavender_town',
        buildingKey: 'location.building.hideout'
      },
      shopKeeper: {
        nameKey: 'npc.shopkeeper.black_market',
        personalityKey: 'personality.grumpy',
        specializationKey: 'specialization.rare_items'
      },
      accessRequirements: {
        minLevel: 40,
        requiredQuests: ['find_black_market'],
        timeRestrictions: {
          openHour: 22,
          closeHour: 4,
          closedDays: [0] as number[] // Fermé le dimanche
        }
      },
      isTemporary: false
    };

    await this.createShop(blackMarketData, 'Marché Noir');
  }

  // === UTILITAIRES ===

  private async createShop(shopData: any, displayName: string): Promise<void> {
    if (DRY_RUN) {
      console.log(`🔍 [DryRun] Création shop: ${displayName}`);
      this.createdCount++;
      return;
    }

    try {
      const mongoShop = new this.ShopData(shopData);
      await mongoShop.save();
      console.log(`🏪 [Creation] ${displayName} créé (${shopData.shopId})`);
      this.createdCount++;
    } catch (error) {
      const errorMsg = `${displayName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      this.errors.push(errorMsg);
      console.error(`❌ [Creation] ${errorMsg}`);
    }
  }

  private guessRegion(shopId: string, shopName: string): string {
    const text = `${shopId} ${shopName}`.toLowerCase();
    
    if (text.includes('johto') || text.includes('gold') || text.includes('silver')) return 'johto';
    if (text.includes('kanto') || text.includes('red') || text.includes('blue')) return 'kanto';
    if (text.includes('hoenn') || text.includes('ruby') || text.includes('sapphire')) return 'hoenn';
    if (text.includes('sinnoh') || text.includes('diamond') || text.includes('pearl')) return 'sinnoh';
    
    return 'kanto'; // Défaut
  }

  private guessCity(shopId: string, shopName: string): string | null {
    const text = `${shopId} ${shopName}`.toLowerCase();
    
    // Rechercher des noms de villes connus
    for (const regionData of Object.values(POKEMON_REGIONS)) {
      for (const city of regionData.cities) {
        if (text.includes(city)) return city;
      }
    }
    
    return null;
  }

  // === VALIDATION ===

  private async validateMigration(): Promise<void> {
    console.log('\n🔍 [Validation] Vérification de la migration...');

    const totalShops = await this.ShopData.countDocuments();
    const activeShops = await this.ShopData.countDocuments({ isActive: true });
    const shopsByType = await this.ShopData.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const shopsByRegion = await this.ShopData.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`📊 [Validation] Shops totaux: ${totalShops}`);
    console.log(`📊 [Validation] Shops actifs: ${activeShops}`);
    
    console.log(`📊 [Validation] Répartition par type:`);
    shopsByType.forEach(({ _id, count }: { _id: string; count: number }) => {
      console.log(`  - ${_id}: ${count} shops`);
    });
    
    console.log(`📊 [Validation] Répartition par région:`);
    shopsByRegion.forEach(({ _id, count }: { _id: string; count: number }) => {
      console.log(`  - ${_id || 'Non défini'}: ${count} shops`);
    });

    // Vérifier l'intégrité des données
    const shopsWithoutItems = await this.ShopData.countDocuments({ 
      $or: [
        { items: { $exists: false } },
        { items: { $size: 0 } }
      ]
    });

    if (shopsWithoutItems > 0) {
      this.errors.push(`${shopsWithoutItems} shops sans items détectés`);
    }

    console.log(`✅ [Validation] Migration validée`);
  }

  // === RÉSULTATS ===

  private displayResults(): void {
    console.log('\n📊 === RÉSULTATS DE LA MIGRATION ===\n');
    
    console.log(`📦 Shops JSON migrés: ${this.migratedCount}`);
    console.log(`🏪 Nouveaux shops créés: ${this.createdCount}`);
    console.log(`📈 Total traité: ${this.migratedCount + this.createdCount}`);
    
    if (this.errors.length > 0) {
      console.log(`\n🚨 ERREURS (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (DRY_RUN) {
      console.log('\n🔍 MODE DRY RUN - Aucune modification appliquée');
      console.log('🚀 Pour appliquer la migration, relancez sans DRY_RUN=true');
    } else {
      console.log('\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS ! 🎉');
      console.log('✅ Votre base MongoDB contient maintenant un écosystème de shops Pokémon complet');
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 [Cleanup] Fermeture de la connexion MongoDB...');
    await mongoose.disconnect();
    console.log('✅ [Cleanup] Terminé');
  }
}

// ===== EXÉCUTION =====

async function main() {
  console.log('🚀 === MIGRATION SHOPS POKÉMON ===');
  console.log('📁 Détection automatique de la structure du projet...\n');
  
  try {
    // Charger les modules
    const modules = await loadModules();
    
    // Créer et lancer la migration
    const migrator = new ShopMigrator(modules);
    await migrator.runMigration();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
  });
}

export { ShopMigrator };
