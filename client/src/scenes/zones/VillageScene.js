// Dans VillageScene.js - Supprimez complètement cette partie dans setupZoneTransitions()

setupZoneTransitions() {
  // ... votre logique existante pour le layer "Worlds" ...

  // ❌ SUPPRIMEZ TOUT ÇA :
  /*
  // Layer Door
  const doorLayer = this.map.getObjectLayer('Door');
  if (!doorLayer) {
    console.warn("⚠️ Layer 'Door' non trouvé");
    return;
  }
  console.log(`🚪 Layer 'Door' trouvé, ${doorLayer.objects.length} objets`);

  const labDoor = doorLayer.objects.find(obj => obj.name === 'Labo');
  if (labDoor) {
    this.createTransitionZone(labDoor, 'VillageLabScene', 'north');
    console.log("🧪 Transition vers Laboratoire trouvée !");
  }

  const house1Door = doorLayer.objects.find(obj => obj.name === 'House1');
  if (house1Door) {
    this.createTransitionZone(house1Door, 'VillageHouse1Scene', 'inside');
    console.log("🏠 Transition vers VillageHouse1 trouvée !");
  }
  */
}

// ❌ SUPPRIMEZ AUSSI cette méthode complètement :
/*
createTransitionZone(transitionObj, targetScene, direction) {
  // ... toute cette méthode à supprimer
}
*/
