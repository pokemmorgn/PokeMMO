// server/src/scripts/seed-dialog-strings.ts
// Script pour insérer des DialogStrings d'exemple dans MongoDB
// Usage: npx ts-node server/src/scripts/seed-dialog-strings.ts

import mongoose from 'mongoose';
import { DialogStringModel, CreateDialogStringData, DialogCategory } from '../models/DialogString';

// Configuration base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';

// ===================================================================
// 🎭 DONNÉES DIALOGSTRINGS D'EXEMPLE
// ===================================================================

const EXAMPLE_DIALOG_STRINGS: CreateDialogStringData[] = [
  
  // === 🛒 DIALOGUES BOUTIQUE ===
  
  // Boutique générique
  {
    dialogId: 'generic.shop.welcome',
    eng: 'Welcome to my shop, %s! What can I sell you today?',
    fr: 'Bienvenue dans ma boutique, %s ! Que puis-je vous vendre aujourd\'hui ?',
    category: 'shop',
    context: 'welcome',
    variables: ['s'],
    priority: 5,
    tags: ['shop', 'welcome', 'generic']
  },
  
  // Professor Oak shop (si il avait une boutique)
  {
    dialogId: 'professor_oak.shop.greeting',
    eng: 'Ah %s! I have some rare research items for sale. Level %l trainers like you might find them useful!',
    fr: 'Ah %s ! J\'ai quelques objets de recherche rares à vendre. Les dresseurs niveau %l comme vous pourriez les trouver utiles !',
    category: 'shop',
    context: 'greeting',
    variables: ['s', 'l'],
    priority: 8,
    tags: ['professor_oak', 'shop', 'research', 'items']
  },
  
  // Poké Mart standard
  {
    dialogId: 'pokemart_clerk.shop.greeting',
    eng: 'Welcome to the Poké Mart, %s! We have everything a trainer needs. You have %g coins - what would you like to buy?',
    fr: 'Bienvenue au Poké Mart, %s ! Nous avons tout ce qu\'il faut pour un dresseur. Vous avez %g pièces - que souhaitez-vous acheter ?',
    category: 'shop',
    context: 'greeting',
    variables: ['s', 'g'],
    priority: 7,
    tags: ['pokemart', 'shop', 'standard', 'coins']
  },

  // === 🏥 DIALOGUES SOIGNEUR ===
  
  // Soigneur générique
  {
    dialogId: 'generic.healer.welcome',
    eng: 'Your Pokémon are healed, %s! They are now in perfect health.',
    fr: 'Vos Pokémon sont soignés, %s ! Ils sont maintenant en parfaite santé.',
    category: 'healer',
    context: 'welcome',
    variables: ['s'],
    priority: 5,
    tags: ['healer', 'generic', 'pokemon', 'health']
  },
  
  // Nurse Joy spécifique
  {
    dialogId: 'nurse_joy.healer.greeting',
    eng: 'Welcome to the Pokémon Center, %s! Your Pokémon look tired from your adventures. Let me heal them right away!',
    fr: 'Bienvenue au Centre Pokémon, %s ! Vos Pokémon semblent fatigués de vos aventures. Laissez-moi les soigner tout de suite !',
    category: 'healer',
    context: 'greeting',
    variables: ['s'],
    priority: 9,
    tags: ['nurse_joy', 'pokemon_center', 'healer', 'care']
  },
  
  // Soigneur de route
  {
    dialogId: 'route_healer.healer.greeting',
    eng: 'A level %l trainer like you must have been through tough battles! Let me restore your team\'s strength.',
    fr: 'Un dresseur niveau %l comme vous a dû traverser des combats difficiles ! Laissez-moi restaurer la force de votre équipe.',
    category: 'healer',
    context: 'greeting',
    variables: ['l'],
    priority: 6,
    tags: ['route', 'healer', 'battles', 'team']
  },

  // === 💬 DIALOGUES GÉNÉRIQUES DE SALUTATION ===
  
  // Salutation générique par défaut
  {
    dialogId: 'generic.greeting.default',
    eng: 'Hello %s! I am %n. Nice to meet you!',
    fr: 'Bonjour %s ! Je suis %n. Ravi de vous rencontrer !',
    category: 'greeting',
    context: 'default',
    variables: ['s', 'n'],
    priority: 5,
    tags: ['greeting', 'generic', 'default', 'polite']
  },
  
  // Professor Oak salutation
  {
    dialogId: 'professor_oak.greeting.default',
    eng: 'Ah, %s! Welcome to my laboratory. As a level %l trainer, you must be making great progress on your journey!',
    fr: 'Ah, %s ! Bienvenue dans mon laboratoire. En tant que dresseur niveau %l, vous devez faire de grands progrès dans votre aventure !',
    category: 'greeting',
    context: 'default',
    variables: ['s', 'l'],
    priority: 9,
    tags: ['professor_oak', 'laboratory', 'journey', 'progress']
  },
  
  // Rival salutation
  {
    dialogId: 'blue.greeting.default',
    eng: 'Hey %s! I\'m Blue, Professor Oak\'s grandson. I\'ll show you how a real trainer battles!',
    fr: 'Salut %s ! Je suis Blue, le petit-fils du Professeur Chen. Je vais te montrer comment un vrai dresseur se bat !',
    category: 'greeting',
    context: 'default',
    variables: ['s'],
    priority: 8,
    tags: ['blue', 'rival', 'battle', 'confident']
  },

  // === 🎯 DIALOGUES DE QUÊTES ===
  
  // Offre de quête générique
  {
    dialogId: 'generic.quest.questOffer',
    eng: 'I have a task for you, %s. Would you like to help me?',
    fr: 'J\'ai une tâche pour vous, %s. Souhaitez-vous m\'aider ?',
    category: 'quest',
    context: 'questOffer',
    variables: ['s'],
    priority: 5,
    tags: ['quest', 'offer', 'generic', 'help']
  },
  
  // Complétion de quête générique
  {
    dialogId: 'generic.quest.questComplete',
    eng: 'Excellent work, %s! You have completed the quest "%q". Here is your reward!',
    fr: 'Excellent travail, %s ! Vous avez terminé la quête "%q". Voici votre récompense !',
    category: 'quest',
    context: 'questComplete',
    variables: ['s', 'q'],
    priority: 5,
    tags: ['quest', 'complete', 'reward', 'success']
  },
  
  // Quête en cours
  {
    dialogId: 'generic.quest.questInProgress',
    eng: 'You\'re working on the quest "%q", %s. Keep it up!',
    fr: 'Vous travaillez sur la quête "%q", %s. Continuez comme ça !',
    category: 'quest',
    context: 'questInProgress',
    variables: ['s', 'q'],
    priority: 5,
    tags: ['quest', 'progress', 'encouragement']
  },
  
  // Quête spécifique - Professor Oak
  {
    dialogId: 'quest.pokedex_research.questOffer',
    eng: 'Hello %s! I need your help with my Pokédex research. Will you help me catalog Pokémon species?',
    fr: 'Bonjour %s ! J\'ai besoin de votre aide pour mes recherches sur le Pokédex. Voulez-vous m\'aider à cataloguer les espèces Pokémon ?',
    category: 'quest',
    context: 'questOffer',
    variables: ['s'],
    priority: 8,
    tags: ['pokedex', 'research', 'pokemon', 'catalog']
  },
  
  {
    dialogId: 'quest.pokedex_research.questComplete',
    eng: 'Amazing work, %s! You\'ve greatly contributed to Pokédex research. Science thanks you!',
    fr: 'Travail formidable, %s ! Vous avez grandement contribué à la recherche du Pokédex. La science vous remercie !',
    category: 'quest',
    context: 'questComplete',
    variables: ['s'],
    priority: 8,
    tags: ['pokedex', 'research', 'science', 'contribution']
  },

  // === 🤖 DIALOGUES IA (pour les réponses intelligentes) ===
  
  // Réponse IA contextuelle
  {
    dialogId: 'generic.ai.contextual_response',
    eng: 'Based on our previous conversations, %s, I think you might be interested in this...',
    fr: 'D\'après nos conversations précédentes, %s, je pense que ceci pourrait vous intéresser...',
    category: 'ai',
    context: 'contextual_response',
    variables: ['s'],
    priority: 7,
    tags: ['ai', 'contextual', 'personalized', 'memory']
  },
  
  // Aide proactive IA
  {
    dialogId: 'generic.ai.proactive_help',
    eng: 'I noticed you\'re level %l now, %s. You might want to consider visiting %z for stronger opponents!',
    fr: 'J\'ai remarqué que vous êtes maintenant niveau %l, %s. Vous devriez peut-être envisager de visiter %z pour des adversaires plus forts !',
    category: 'ai',
    context: 'proactive_help',
    variables: ['s', 'l', 'z'],
    priority: 8,
    tags: ['ai', 'proactive', 'leveling', 'advice']
  },

  // === 🏪 DIALOGUES SPÉCIALISÉS ===
  
  // Brock (Gym Leader + potentiel shop)
  {
    dialogId: 'brock.shop.greeting',
    eng: 'Hey %s! As a Rock-type specialist, I sell stones and minerals. Perfect for a level %l trainer!',
    fr: 'Salut %s ! En tant que spécialiste du type Roche, je vends des pierres et minéraux. Parfait pour un dresseur niveau %l !',
    category: 'shop',
    context: 'greeting',
    variables: ['s', 'l'],
    priority: 8,
    tags: ['brock', 'gym_leader', 'rock_type', 'stones']
  },
  
  // Misty salutation
  {
    dialogId: 'misty.greeting.default',
    eng: 'Hi there, %s! I\'m Misty, the Cerulean City Gym Leader. Water-types are my specialty!',
    fr: 'Salut, %s ! Je suis Ondine, le Champion d\'Azuria. Les types Eau sont ma spécialité !',
    category: 'greeting',
    context: 'default',
    variables: ['s'],
    priority: 8,
    tags: ['misty', 'gym_leader', 'water_type', 'cerulean']
  },

  // === 🎨 DIALOGUES AVEC CONDITIONS ===
  
  // Dialogue conditionnel niveau élevé
  {
    dialogId: 'generic.greeting.high_level',
    eng: 'Wow, %s! A level %l trainer! You must be very experienced.',
    fr: 'Wouah, %s ! Un dresseur niveau %l ! Vous devez être très expérimenté.',
    category: 'greeting',
    context: 'high_level',
    variables: ['s', 'l'],
    conditions: [
      {
        type: 'level',
        operator: '>=',
        value: 20,
        description: 'Niveau joueur >= 20'
      }
    ],
    priority: 7,
    tags: ['greeting', 'conditional', 'high_level', 'experienced']
  },
  
  // Dialogue conditionnel riche
  {
    dialogId: 'generic.shop.wealthy_customer',
    eng: 'Welcome, %s! With %g coins, you can afford our premium items!',
    fr: 'Bienvenue, %s ! Avec %g pièces, vous pouvez vous offrir nos objets premium !',
    category: 'shop',
    context: 'wealthy_customer',
    variables: ['s', 'g'],
    conditions: [
      {
        type: 'item',
        operator: '>=',
        value: 10000,
        description: 'Or >= 10000'
      }
    ],
    priority: 8,
    tags: ['shop', 'conditional', 'wealthy', 'premium']
  },

  // === 🌍 DIALOGUES ZONE-SPÉCIFIQUES ===
  
  // Pallet Town NPC
  {
    dialogId: 'pallet_town_npc.greeting.default',
    eng: 'Welcome to Pallet Town, %s! This peaceful place is where many great trainers began their journey.',
    fr: 'Bienvenue à Bourg Palette, %s ! Cet endroit paisible est où de nombreux grands dresseurs ont commencé leur aventure.',
    category: 'greeting',
    context: 'default',
    variables: ['s'],
    priority: 6,
    tags: ['pallet_town', 'peaceful', 'journey_start', 'hometown']
  },
  
  // Viridian City Guide
  {
    dialogId: 'viridian_city_guide.greeting.default',
    eng: 'Hello %s! Viridian City has a Gym, but the Leader is rarely here. Try the Pokémon Center instead!',
    fr: 'Bonjour %s ! Jadielle a une Arène, mais le Champion est rarement là. Essayez plutôt le Centre Pokémon !',
    category: 'greeting',
    context: 'default',
    variables: ['s'],
    priority: 6,
    tags: ['viridian_city', 'gym', 'pokemon_center', 'guide']
  }
];

// ===================================================================
// 🔧 FONCTIONS UTILITAIRES
// ===================================================================

/**
 * Connexion à MongoDB
 */
async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    throw error;
  }
}

/**
 * Nettoyage des DialogStrings existants (optionnel)
 */
async function clearExistingDialogStrings(): Promise<void> {
  try {
    const deleteResult = await DialogStringModel.deleteMany({});
    console.log(`🧹 ${deleteResult.deletedCount} DialogStrings supprimés`);
  } catch (error) {
    console.error('❌ Erreur suppression DialogStrings:', error);
    throw error;
  }
}

/**
 * Insertion des DialogStrings d'exemple
 */
async function insertDialogStrings(dialogStrings: CreateDialogStringData[]): Promise<void> {
  try {
    console.log(`📦 Insertion de ${dialogStrings.length} DialogStrings...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dialogData of dialogStrings) {
      try {
        const dialog = new DialogStringModel(dialogData);
        await dialog.save();
        
        console.log(`✅ ${dialogData.dialogId} [${dialogData.category}]`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Erreur ${dialogData.dialogId}:`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Résultat insertion:`);
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📈 Total: ${dialogStrings.length}`);
    
  } catch (error) {
    console.error('❌ Erreur générale insertion:', error);
    throw error;
  }
}

/**
 * Validation et statistiques post-insertion
 */
async function validateAndShowStats(): Promise<void> {
  try {
    console.log('\n📊 === STATISTIQUES POST-INSERTION ===');
    
    // Total par catégorie
    const categories = await DialogStringModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n🏷️ Par catégorie:');
    categories.forEach((cat: { _id: string; count: number }) => {
      console.log(`   ${cat._id}: ${cat.count}`);
    });
    
    // NPCs avec dialogues
    const npcs = await DialogStringModel.distinct('npcId', { isActive: true });
    console.log(`\n🎭 NPCs avec dialogues: ${npcs.length}`);
    console.log(`   ${npcs.slice(0, 10).join(', ')}${npcs.length > 10 ? '...' : ''}`);
    
    // Variables utilisées
    const variablesUsed = await DialogStringModel.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$variables' },
      { $group: { _id: '$variables', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🔤 Variables les plus utilisées:');
    variablesUsed.slice(0, 5).forEach((variable: { _id: string; count: number }) => {
      console.log(`   %${variable._id}: ${variable.count} fois`);
    });
    
    // Test de récupération
    console.log('\n🧪 === TESTS DE RÉCUPÉRATION ===');
    
    const testCases = [
      'generic.shop.welcome',
      'professor_oak.greeting.default',
      'nurse_joy.healer.greeting',
      'generic.quest.questOffer'
    ];
    
    for (const dialogId of testCases) {
      const dialog = await DialogStringModel.findOne({ dialogId, isActive: true });
      if (dialog) {
        const frenchText = dialog.getLocalizedText('fr');
        console.log(`✅ ${dialogId}: "${frenchText.substring(0, 50)}${frenchText.length > 50 ? '...' : ''}"`);
      } else {
        console.log(`❌ ${dialogId}: NON TROUVÉ`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur validation:', error);
  }
}

// ===================================================================
// 🚀 SCRIPT PRINCIPAL
// ===================================================================

async function main(): Promise<void> {
  console.log('🎭 === SEED DIALOG STRINGS ===\n');
  
  try {
    // 1. Connexion base de données
    await connectToDatabase();
    
    // 2. Option: Nettoyer les données existantes
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      console.log('🧹 Nettoyage des DialogStrings existants...');
      await clearExistingDialogStrings();
    }
    
    // 3. Insertion des nouveaux DialogStrings
    await insertDialogStrings(EXAMPLE_DIALOG_STRINGS);
    
    // 4. Validation et statistiques
    await validateAndShowStats();
    
    console.log('\n🎉 Script terminé avec succès !');
    
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    // 5. Fermer la connexion
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// ===================================================================
// 🎯 EXÉCUTION
// ===================================================================

// Gérer les arguments de ligne de commande
if (process.argv.includes('--help')) {
  console.log(`
🎭 Seed Dialog Strings Script

Usage:
  npx ts-node server/src/scripts/seed-dialog-strings.ts [options]

Options:
  --clear    Supprimer tous les DialogStrings existants avant insertion  
  --help     Afficher cette aide

Exemples:
  npx ts-node server/src/scripts/seed-dialog-strings.ts
  npx ts-node server/src/scripts/seed-dialog-strings.ts --clear

Variables supportées dans les dialogues:
  %s = playerName (nom du joueur)
  %n = npcName (nom du NPC)  
  %l = playerLevel (niveau du joueur)
  %g = playerGold (or du joueur)
  %z = zoneName (nom de la zone)
  %q = questName (nom de la quête)
  %i = itemName (nom de l'objet)
  %a = amount (quantité)
`);
  process.exit(0);
}

// Exécuter le script principal
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erreur non gérée:', error);
    process.exit(1);
  });
}

export default main;
