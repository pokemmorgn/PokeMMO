// Modification dans client/src/components/ShopUI.js
// Méthode updateActionButton() - Gestion des items verrouillés

updateActionButton() {
  const actionBtn = this.overlay.querySelector('#shop-action-btn');
  const btnIcon = actionBtn.querySelector('.btn-icon');
  const btnText = actionBtn.querySelector('.btn-text');

  if (!this.selectedItem) {
    actionBtn.disabled = true;
    actionBtn.className = 'shop-btn primary';
    btnIcon.textContent = '🛒';
    btnText.textContent = this.currentTab === 'buy' ? 'Buy' : 'Sell';
    actionBtn.removeAttribute('data-unlock-level');
    return;
  }

  if (this.currentTab === 'buy') {
    const isUnlocked = this.selectedItem.unlocked !== false;
    const canAfford = this.playerGold >= this.selectedItem.buyPrice;
    const inStock = this.selectedItem.stock === undefined || 
                   this.selectedItem.stock === -1 || 
                   this.selectedItem.stock > 0;
    
    // ✅ NOUVEAU : Gestion des différents états
    if (!isUnlocked) {
      // Item verrouillé
      actionBtn.disabled = true;
      actionBtn.className = 'shop-btn primary locked-item';
      btnIcon.textContent = '🔒';
      btnText.textContent = `Level ${this.selectedItem.unlockLevel || '?'} Required`;
      actionBtn.setAttribute('data-unlock-level', this.selectedItem.unlockLevel || '?');
    } else if (!canAfford) {
      // Pas assez d'argent
      actionBtn.disabled = true;
      actionBtn.className = 'shop-btn primary';
      btnIcon.textContent = '💰';
      btnText.textContent = 'Not Enough Gold';
    } else if (!inStock) {
      // Rupture de stock
      actionBtn.disabled = true;
      actionBtn.className = 'shop-btn primary';
      btnIcon.textContent = '📦';
      btnText.textContent = 'Out of Stock';
    } else {
      // Achetable
      actionBtn.disabled = false;
      actionBtn.className = 'shop-btn primary';
      btnIcon.textContent = '🛒';
      btnText.textContent = 'Buy';
      actionBtn.removeAttribute('data-unlock-level');
    }
  } else {
    // Onglet vente - logic existante
    actionBtn.disabled = false; // TODO: Check player inventory
    actionBtn.className = 'shop-btn primary';
    btnIcon.textContent = '💰';
    btnText.textContent = 'Sell';
    actionBtn.removeAttribute('data-unlock-level');
  }
}
