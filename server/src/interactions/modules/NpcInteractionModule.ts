if (deliveryResult.hasDeliveries && deliveryResult.totalDeliveries > 0) {
  
  // ✅ NOUVEAU : Logs de debug
  console.log(`📦 [executeDeliveryAction] ✅ Données de livraison DETECTÉES:`, {
    totalDeliveries: deliveryResult.totalDeliveries,
    readyDeliveries: deliveryResult.readyDeliveries,
    deliveries: deliveryResult.deliveries.length,
    firstDelivery: deliveryResult.deliveries[0]
  });
  
  // Construire le résultat
  const result = {
    success: true,
    type: "questDelivery" as const,  // ✅ Cast pour TypeScript
    message: `${npc.name || `NPC #${npcId}`} attend une livraison de votre part.`,
    lines: [`J'attends que vous me livriez quelque chose, ${player.name}...`],
    
    // ✅ DONNÉES DE LIVRAISON pour le client
    deliveryData: {
      npcId: deliveryResult.npcId,
      npcName: npc.name || `NPC #${npcId}`,
      deliveries: deliveryResult.deliveries,
      allItemsAvailable: deliveryResult.allItemsAvailable,
      totalDeliveries: deliveryResult.totalDeliveries,
      readyDeliveries: deliveryResult.readyDeliveries
    },
    
    questProgress: questProgress,
    npcId: npcId,
    npcName: npc.name || `NPC #${npcId}`,
    isUnifiedInterface: false,
    capabilities: capabilities,
    contextualData: this.buildContextualDataFromCapabilities(capabilities)
  };
  
  // ✅ NOUVEAU : Log du résultat COMPLET avant envoi
  console.log(`📦 [executeDeliveryAction] ✅ Résultat COMPLET avant return:`);
  console.log(`   - Type: ${result.type}`);
  console.log(`   - DeliveryData présent: ${!!result.deliveryData}`);
  console.log(`   - Nombre de livraisons: ${result.deliveryData?.totalDeliveries}`);
  console.log(`   - JSON complet:`, JSON.stringify(result, null, 2));
  
  // ✅ RETOURNER LE RÉSULTAT
  return result;
  
} else {
  // Fallback vers dialogue si plus de livraisons
  console.log(`❌ [executeDeliveryAction] Aucune livraison trouvée, fallback dialogue`);
  return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
}
