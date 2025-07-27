// server/src/services/DialogStringService.ts
// Service simple pour utiliser le système DialogString avec alias

import { DialogStringModel, IDialogString, SupportedLanguage, DialogCategory } from '../models/DialogString';

/**
 * Interface pour les variables communes
 */
export interface DialogVariables {
  playerName?: string;      // %s
  targetName?: string;      // %t  
  playerLevel?: number;     // %l
  playerGold?: number;      // %g
  npcName?: string;         // %n
  zoneName?: string;        // %z
  itemName?: string;        // %i
  questName?: string;       // %q
  amount?: number;          // %a
  customVars?: Record<string, string>; // Variables personnalisées
}

export class DialogStringService {
  
  /**
   * Récupère un texte localisé avec remplacement des variables
   */
  async getText(
    dialogId: string,
    language: SupportedLanguage = 'fr',
    variables?: DialogVariables
  ): Promise<string> {
    
    try {
      const dialogue = await DialogStringModel.findOne({ 
        dialogId, 
        isActive: true 
      });
      
      if (!dialogue) {
        console.warn(`⚠️ DialogId '${dialogId}' non trouvé`);
        return `[MISSING: ${dialogId}]`;
      }
      
      return this.replaceVariables(dialogue.getLocalizedText(language), variables);
      
    } catch (error) {
      console.error(`❌ Erreur récupération texte '${dialogId}':`, error);
      return `[ERROR: ${dialogId}]`;
    }
  }

  /**
   * Version rapide avec paramètres directs (rétrocompatibilité)
   */
  async getTextQuick(
    dialogId: string,
    language: SupportedLanguage = 'fr',
    playerName?: string,
    targetName?: string,
    customVars?: Record<string, string>
  ): Promise<string> {
    return this.getText(dialogId, language, {
      playerName,
      targetName,
      customVars
    });
  }

  /**
   * Remplace toutes les variables avec les alias
   */
  private replaceVariables(text: string, variables?: DialogVariables): string {
    if (!variables) return text;
    
    // Alias principaux
    if (variables.playerName) text = text.replace(/%s/g, variables.playerName);
    if (variables.targetName) text = text.replace(/%t/g, variables.targetName);
    if (variables.playerLevel !== undefined) text = text.replace(/%l/g, variables.playerLevel.toString());
    if (variables.playerGold !== undefined) text = text.replace(/%g/g, variables.playerGold.toString());
    if (variables.npcName) text = text.replace(/%n/g, variables.npcName);
    if (variables.zoneName) text = text.replace(/%z/g, variables.zoneName);
    if (variables.itemName) text = text.replace(/%i/g, variables.itemName);
    if (variables.questName) text = text.replace(/%q/g, variables.questName);
    if (variables.amount !== undefined) text = text.replace(/%a/g, variables.amount.toString());
    
    // Variables personnalisées (%x format)
    if (variables.customVars) {
      for (const [key, value] of Object.entries(variables.customVars)) {
        if (key.length === 1) { // Seulement les alias à 1 caractère
          const regex = new RegExp(`%${key}`, 'g');
          text = text.replace(regex, value);
        }
      }
    }
    
    return text;
  }

  /**
   * Récupère plusieurs textes en une fois
   */
  async getMultipleTexts(
    dialogIds: string[],
    language: SupportedLanguage = 'fr',
    variables?: DialogVariables
  ): Promise<Record<string, string>> {
    
    const results: Record<string, string> = {};
    
    const promises = dialogIds.map(async (dialogId) => {
      const text = await this.getText(dialogId, language, variables);
      return { dialogId, text };
    });
    
    const resolved = await Promise.allSettled(promises);
    
    resolved.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.dialogId] = result.value.text;
      }
    });
    
    return results;
  }

  /**
   * Recherche dialogues par NPC
   */
  async getDialoguesByNPC(npcId: string): Promise<IDialogString[]> {
    return DialogStringModel.find({ 
      npcId,
      isActive: true 
    }).sort({ category: 1, context: 1, priority: -1 });
  }

  /**
   * Recherche par pattern (ex: "professor_oak.*", "*.greeting.welcome")
   */
  async findByPattern(pattern: string): Promise<IDialogString[]> {
    return DialogStringModel.find({
      dialogId: { $regex: pattern.replace('*', '.*'), $options: 'i' },
      isActive: true
    }).sort({ dialogId: 1 });
  }

  /**
   * Recherche par catégorie et contexte
   */
  async findByCategoryContext(
    category: DialogCategory,
    context?: string
  ): Promise<IDialogString[]> {
    const query: any = { category, isActive: true };
    if (context) query.context = context;
    
    return DialogStringModel.find(query).sort({ npcId: 1, priority: -1 });
  }

  /**
   * Trouve tous les NPCs ayant un contexte spécifique
   */
  async findNPCsByContext(context: string): Promise<string[]> {
    const results = await DialogStringModel.distinct('npcId', {
      context: context,
      isActive: true
    });
    return results;
  }

  /**
   * Vérifie si un dialogue existe
   */
  async exists(dialogId: string): Promise<boolean> {
    const count = await DialogStringModel.countDocuments({ 
      dialogId, 
      isActive: true 
    });
    return count > 0;
  }

  /**
   * Statistiques par NPC
   */
  async getNPCStats(npcId: string): Promise<{
    totalDialogues: number;
    categories: Record<string, number>;
    contexts: string[];
  }> {
    const dialogues = await this.getDialoguesByNPC(npcId);
    
    const stats = {
      totalDialogues: dialogues.length,
      categories: {} as Record<string, number>,
      contexts: [] as string[]
    };
    
    const contextSet = new Set<string>();
    
    dialogues.forEach(dialogue => {
      // Compter par catégorie
      stats.categories[dialogue.category] = (stats.categories[dialogue.category] || 0) + 1;
      
      // Collecter contextes uniques
      if (dialogue.context) {
        contextSet.add(dialogue.context);
      }
    });
    
    stats.contexts = Array.from(contextSet).sort();
    
    return stats;
  }
}

// ===================================================================
// 🔧 CONSTANTES ET ALIAS
// ===================================================================

/**
 * Mapping des alias vers leurs descriptions
 */
export const DIALOG_ALIASES = {
  's': 'playerName',    // Nom du joueur
  't': 'targetName',    // Nom de la cible/opponent
  'l': 'playerLevel',   // Niveau du joueur
  'g': 'playerGold',    // Or du joueur
  'n': 'npcName',       // Nom du NPC
  'z': 'zoneName',      // Nom de la zone
  'i': 'itemName',      // Nom de l'item
  'q': 'questName',     // Nom de la quête
  'a': 'amount',        // Quantité/montant
} as const;

/**
 * Fonction utilitaire pour créer rapidement des variables
 */
export function createDialogVars(data: {
  player?: { name: string; level?: number; gold?: number };
  target?: string;
  npc?: string;
  zone?: string;
  item?: string;
  quest?: string;
  amount?: number;
  custom?: Record<string, string>;
}): DialogVariables {
  return {
    playerName: data.player?.name,
    playerLevel: data.player?.level,
    playerGold: data.player?.gold,
    targetName: data.target,
    npcName: data.npc,
    zoneName: data.zone,
    itemName: data.item,
    questName: data.quest,
    amount: data.amount,
    customVars: data.custom
  };
}

// Singleton
let dialogStringService: DialogStringService | null = null;

export function getDialogStringService(): DialogStringService {
  if (!dialogStringService) {
    dialogStringService = new DialogStringService();
  }
  return dialogStringService;
}

export default DialogStringService;
