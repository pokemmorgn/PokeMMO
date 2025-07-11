// Inventory/InventoryIconCSS.js - Styles pour l'icône d'inventaire
// 🎨 Styles extraits et modulaires pour InventoryIcon

export const INVENTORY_ICON_STYLES = `
  /* ===== INVENTORY ICON STYLES ===== */
  .inventory-icon {
    position: fixed;
    bottom: 20px;
    right: 20px; /* Position principale pour l'inventaire */
    width: 70px;
    height: 80px;
    cursor: pointer;
    z-index: 500;
    transition: all 0.3s ease;
    user-select: none;
  }

  .inventory-icon:hover {
    transform: scale(1.1);
  }

  .inventory-icon .icon-background {
    width: 100%;
    height: 70px;
    background: linear-gradient(145deg, #2a3f5f, #1e2d42);
    border: 2px solid #4a90e2;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    position: relative;
    transition: all 0.3s ease;
  }

  .inventory-icon:hover .icon-background {
    background: linear-gradient(145deg, #3a4f6f, #2e3d52);
    border-color: #5aa0f2;
    box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
  }

  .inventory-icon .icon-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inventory-icon .icon-emoji {
    font-size: 28px;
    transition: transform 0.3s ease;
  }

  .inventory-icon:hover .icon-emoji {
    transform: scale(1.2);
  }

  .inventory-icon .icon-label {
    font-size: 11px;
    color: #87ceeb;
    font-weight: 600;
    text-align: center;
    padding: 4px 0;
    background: rgba(74, 144, 226, 0.2);
    width: 100%;
    border-radius: 0 0 13px 13px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .inventory-icon .icon-notification {
    position: absolute;
    top: -5px;
    right: -5px;
    width: 20px;
    height: 20px;
    background: #ff4757;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    animation: pulse 2s infinite;
  }

  .inventory-icon .notification-count {
    color: white;
    font-size: 10px;
    font-weight: bold;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  /* Open animation */
  .inventory-icon.opening .icon-emoji {
    animation: bagOpen 0.6s ease;
  }

  @keyframes bagOpen {
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.2) rotate(-5deg); }
    50% { transform: scale(1.1) rotate(5deg); }
    75% { transform: scale(1.15) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  /* ===== ÉTATS UIMANAGER ===== */
  .inventory-icon.ui-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(20px);
  }

  .inventory-icon.ui-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(50%);
  }

  .inventory-icon.ui-disabled:hover {
    transform: none !important;
  }

  /* ===== ANIMATIONS UIMANAGER ===== */
  .inventory-icon.ui-fade-in {
    animation: uiFadeIn 0.3s ease-out forwards;
  }

  .inventory-icon.ui-fade-out {
    animation: uiFadeOut 0.2s ease-in forwards;
  }

  .inventory-icon.ui-pulse {
    animation: uiPulse 0.15s ease-out;
  }

  @keyframes uiFadeIn {
    from { opacity: 0; transform: translateY(20px) scale(0.8); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes uiFadeOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(20px) scale(0.8); }
  }

  @keyframes uiPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .inventory-icon {
      bottom: 15px;
      right: 15px;
      width: 60px;
      height: 70px;
    }

    .inventory-icon .icon-background {
      height: 60px;
    }

    .inventory-icon .icon-emoji {
      font-size: 24px;
    }

    .inventory-icon .icon-label {
      font-size: 10px;
    }
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .inventory-icon {
      width: 65px;
      height: 75px;
    }

    .inventory-icon .icon-background {
      height: 65px;
    }

    .inventory-icon .icon-emoji {
      font-size: 26px;
    }
  }

  /* ===== ÉTATS SPÉCIAUX ===== */
  .inventory-icon.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .inventory-icon.hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(20px);
  }

  /* Appear animation */
  .inventory-icon.appearing {
    animation: iconAppear 0.5s ease;
  }

  @keyframes iconAppear {
    from {
      opacity: 0;
      transform: translateY(50px) scale(0.5);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ===== GROUPEMENT AVEC AUTRES ICÔNES ===== */
  .ui-icons-group {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 10px;
    align-items: flex-end;
    z-index: 500;
  }

  /* Ajustements quand dans un groupe */
  .ui-icons-group .inventory-icon,
  .ui-icons-group .quest-icon,
  .ui-icons-group .team-icon {
    position: relative;
    bottom: auto;
    right: auto;
    margin: 0;
  }

  /* Animation de groupe lors de l'ajout/suppression d'icônes */
  .ui-icons-group.adding-icon {
    animation: groupExpand 0.3s ease;
  }

  .ui-icons-group.removing-icon {
    animation: groupContract 0.3s ease;
  }

  @keyframes groupExpand {
    0% { transform: scale(0.95); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }

  @keyframes groupContract {
    0% { transform: scale(1); }
    50% { transform: scale(0.98); }
    100% { transform: scale(1); }
  }

  /* Responsive position avec ajustement pour autres icônes */
  .inventory-icon.with-quest-icon {
    right: 20px; /* Garde la position principale */
  }

  .inventory-icon.with-team-icon {
    right: 20px; /* Garde la position principale */
  }
`;

export default INVENTORY_ICON_STYLES;

console.log('🎨 [InventoryIconCSS] Styles modulaires chargés');
