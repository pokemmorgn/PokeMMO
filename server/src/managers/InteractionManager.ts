// Modifications dans InteractionManager.ts pour les dialogues de quêtes

// ✅ MÉTHODE MODIFIÉE: handleNpcInteraction avec dialogues
async handleNpcInteraction(player: Player, npcId: number): Promise<NpcInteractionResult> {
  console.log(`🔍 === INTERACTION MANAGER ===`);
  console.log(`👤 Player: ${player.name}`);
  console.log(`🤖 NPC ID: ${npcId}`);
  
  // Récupérer le NPC
  const npcManager = this.getNpcManager(player.currentZone);
  if (!npcManager) {
    return { type: "error", message: "NPCs non disponibles dans cette zone." };
  }

  const npc = npcManager.getNpcById(npcId);
  if (!npc) {
    return { type: "error", message: "NPC inconnu." };
  }

  console.log(`🔍 NPC trouvé: ${npc.name}, propriétés:`, npc.properties);

  // Vérifier la proximité (64px)
  const dx = Math.abs(player.x - npc.x);
  const dy = Math.abs(player.y - npc.y);
  if (dx > 64 || dy > 64) {
    return { type: "error", message: "Trop loin du NPC." };
  }

  // ✅ === NOUVELLE LOGIQUE : VÉRIFIER D'ABORD LES OBJECTIFS TALK ===
  
  const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
  if (talkValidationResult) {
    console.log(`💬 Objectif talk validé pour NPC ${npcId}`);
    return talkValidationResult;
  }

  // ✅ === PROGRESSION NORMALE (sans validation talk) ===
  
  console.log(`💬 Déclenchement updateQuestProgress pour talk avec NPC ${npcId}`);
  
  let questProgress: any[] = [];
  try {
    questProgress = await this.questManager.updateQuestProgress(player.name, {
      type: 'talk',
      npcId: npcId,
      targetId: npcId.toString()
    });
    console.log(`📊 Résultats progression quêtes:`, questProgress);
  } catch (error) {
    console.error(`❌ Erreur lors de updateQuestProgress:`, error);
  }

  // ✅ === VÉRIFIER LES QUÊTES APRÈS PROGRESSION ===
  
  // 1. Vérifier les quêtes prêtes à compléter manuellement
  const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
  
  if (readyToCompleteQuests.length > 0) {
    console.log(`🎉 Quêtes prêtes à compléter: ${readyToCompleteQuests.length}`);
    
    // Utiliser le dialogue de completion de la première quête
    const firstQuest = readyToCompleteQuests[0];
    const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
    const completionDialogue = this.getQuestDialogue(questDefinition, 'questComplete');
    
    // Compléter automatiquement toutes les quêtes prêtes
    const completionResults = [];
    for (const quest of readyToCompleteQuests) {
      const result = await this.questManager.completeQuestManually(player.name, quest.id);
      if (result) {
        completionResults.push(result);
      }
    }
    
    if (completionResults.length > 0) {
      const totalRewards = completionResults.reduce((acc, result) => {
        return [...acc, ...(result.questRewards || [])];
      }, []);
      
      const questNames = completionResults.map(r => r.questName).join(', ');
      
      return {
        type: "questComplete",
        questId: completionResults[0].questId,
        questName: questNames,
        questRewards: totalRewards,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name,
        lines: completionDialogue, // ✅ NOUVEAU: Dialogue spécifique
        message: `Félicitations ! Vous avez terminé : ${questNames}`
      };
    }
  }

  // 2. Vérifier les quêtes disponibles
  const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
  
  if (availableQuests.length > 0) {
    console.log(`📋 Quêtes disponibles: ${availableQuests.length}`);
    
    // ✅ NOUVEAU: Utiliser le dialogue d'offre de la première quête
    const firstQuest = availableQuests[0];
    const questOfferDialogue = this.getQuestDialogue(firstQuest, 'questOffer');
    
    const serializedQuests = availableQuests.map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      category: quest.category,
      steps: quest.steps.map((step: any) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        objectives: step.objectives,
        rewards: step.rewards
      }))
    }));

    return {
      type: "questGiver",
      message: questOfferDialogue.join(' '), // ✅ NOUVEAU: Message d'offre
      lines: questOfferDialogue, // ✅ NOUVEAU: Dialogue complet
      availableQuests: serializedQuests,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name
    };
  }

  // 3. Vérifier les quêtes en cours
  const activeQuests = await this.questManager.getActiveQuests(player.name);
  const questsForThisNpc = activeQuests.filter(q => 
    q.startNpcId === npcId || q.endNpcId === npcId
  );

  if (questsForThisNpc.length > 0) {
    console.log(`📈 Quêtes en cours pour ce NPC: ${questsForThisNpc.length}`);
    
    // ✅ NOUVEAU: Utiliser le dialogue de progression de la quête
    const firstQuest = questsForThisNpc[0];
    const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
    const progressDialogue = this.getQuestDialogue(questDefinition, 'questInProgress');
    
    return {
      type: "dialogue",
      lines: progressDialogue,
      npcId: npcId,
      npcName: npc.name,
      questProgress: questProgress
    };
  }

  // ✅ === COMPORTEMENT NPC NORMAL ===
  
  console.log(`💬 Aucune quête, dialogue normal`);

  // Types d'interaction classiques selon les propriétés du NPC
  if (npc.properties.shop) {
    return { 
      type: "shop", 
      shopId: npc.properties.shop,
      npcId: npcId,
      npcName: npc.name,
      questProgress: questProgress
    };
  } else if (npc.properties.healer) {
    return { 
      type: "heal", 
      message: "Vos Pokémon sont soignés !",
      npcId: npcId,
      npcName: npc.name,
      questProgress: questProgress
    };
  } else if (npc.properties.dialogue) {
    const lines = Array.isArray(npc.properties.dialogue)
      ? npc.properties.dialogue
      : [npc.properties.dialogue];
    return { 
      type: "dialogue", 
      lines,
      npcId: npcId,
      npcName: npc.name,
      questProgress: questProgress
    };
  } else {
    // Dialogue par défaut
    const defaultDialogue = await this.getDefaultDialogueForNpc(npc);
    return { 
      type: "dialogue", 
      lines: defaultDialogue,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name
    };
  }
}

// ✅ === NOUVELLE MÉTHODE: Vérifier validation objectif talk ===
private async checkTalkObjectiveValidation(username: string, npcId: number): Promise<NpcInteractionResult | null> {
  try {
    const activeQuests = await this.questManager.getActiveQuests(username);
    
    for (const quest of activeQuests) {
      const currentStep = quest.steps[quest.currentStepIndex];
      if (!currentStep) continue;
      
      // Chercher des objectifs talk pour ce NPC
      for (const objective of currentStep.objectives) {
        if (objective.type === 'talk' && 
            objective.target === npcId.toString() && 
            !objective.completed) {
          
          console.log(`🎯 Objectif talk trouvé: ${objective.description}`);
          
          // Déclencher la progression
          const progressResults = await this.questManager.updateQuestProgress(username, {
            type: 'talk',
            npcId: npcId,
            targetId: npcId.toString()
          });
          
          if (progressResults.length > 0) {
            const result = progressResults[0];
            
            // Si l'objectif a été complété, utiliser le dialogue de validation
            if (result.objectiveCompleted) {
              const validationDialogue = objective.validationDialogue || [
                "Merci de m'avoir parlé !",
                "C'était exactement ce qu'il fallait faire."
              ];
              
              return {
                type: "dialogue",
                lines: validationDialogue,
                npcId: npcId,
                npcName: await this.getNpcName(npcId),
                questProgress: progressResults,
                message: result.message
              };
            }
          }
        }
      }
    }
    
    return null; // Aucun objectif talk à valider
    
  } catch (error) {
    console.error(`❌ Erreur checkTalkObjectiveValidation:`, error);
    return null;
  }
}

// ✅ === NOUVELLE MÉTHODE: Récupérer dialogue de quête ===
private getQuestDialogue(questDefinition: any, dialogueType: 'questOffer' | 'questInProgress' | 'questComplete'): string[] {
  if (!questDefinition?.dialogues?.[dialogueType]) {
    // Dialogues par défaut selon le type
    switch (dialogueType) {
      case 'questOffer':
        return ["J'ai quelque chose pour vous...", "Acceptez-vous cette mission ?"];
      case 'questInProgress':
        return ["Comment avance votre mission ?", "Revenez me voir quand c'est terminé !"];
      case 'questComplete':
        return ["Excellent travail !", "Voici votre récompense bien méritée !"];
      default:
        return ["Bonjour !"];
    }
  }
  
  return questDefinition.dialogues[dialogueType];
}

// ✅ === MÉTHODE HELPER: Récupérer nom NPC ===
private async getNpcName(npcId: number): string {
  // TODO: Récupérer depuis le NPCManager si besoin
  const npcNames: { [key: number]: string } = {
    1: "Professeur Oak",
    87: "Bob le pêcheur", 
    5: "Le collecteur de baies",
    10: "Le maître dresseur"
  };
  
  return npcNames[npcId] || `NPC #${npcId}`;
}
}
