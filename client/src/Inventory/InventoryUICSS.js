// Inventory/InventoryUICSS.js - Styles pour l'interface d'inventaire complète
// 🎨 Styles extraits et modulaires pour InventoryUI

export const INVENTORY_UI_STYLES = `
  /* ===== OVERLAY PRINCIPAL ===== */
  .inventory-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
    transition: opacity 0.3s ease;
  }

  .inventory-overlay.hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* ===== CONTENEUR PRINCIPAL ===== */
  .inventory-container {
    width: 90%;
    max-width: 900px;
    height: 85%;
    max-height: 700px;
    background: linear-gradient(145deg, #2a3f5f, #1e2d42);
    border: 3px solid #4a90e2;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    color: white;
    font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }

  .inventory-overlay:not(.hidden) .inventory-container {
    transform: scale(1);
  }

  /* ===== HEADER ===== */
  .inventory-header {
    background: linear-gradient(90deg, #4a90e2, #357abd);
    padding: 15px 20px;
    border-radius: 17px 17px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #357abd;
  }

  .inventory-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .bag-icon {
    width: 28px;
    height: 28px;
  }

  .inventory-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .inventory-close-btn {
    background: rgba(220, 53, 69, 0.8);
    border: none;
    color: white;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.3s ease;
  }

  .inventory-close-btn:hover {
    background: rgba(220, 53, 69, 1);
  }

  /* ===== CONTENU ===== */
  .inventory-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* ===== SIDEBAR (ONGLETS DES POCHES) ===== */
  .inventory-sidebar {
    width: 200px;
    background: rgba(0, 0, 0, 0.3);
    border-right: 2px solid #357abd;
    padding: 10px 0;
  }

  .pocket-tabs {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .pocket-tab {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    border-left: 4px solid transparent;
    margin: 0 5px;
    border-radius: 0 8px 8px 0;
  }

  .pocket-tab:hover {
    background: rgba(74, 144, 226, 0.2);
    border-left-color: #4a90e2;
  }

  .pocket-tab.active {
    background: rgba(74, 144, 226, 0.4);
    border-left-color: #4a90e2;
    color: #87ceeb;
  }

  .pocket-icon {
    font-size: 20px;
    width: 24px;
    text-align: center;
  }

  /* ===== ZONE PRINCIPALE ===== */
  .inventory-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ===== GRILLE D'OBJETS ===== */
  .items-grid {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
    align-content: start;
  }

  .item-slot {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
  }

  .item-slot:hover {
    background: rgba(74, 144, 226, 0.2);
    border-color: #4a90e2;
    transform: translateY(-2px);
  }

  .item-slot.selected {
    background: rgba(74, 144, 226, 0.4);
    border-color: #87ceeb;
    box-shadow: 0 0 15px rgba(74, 144, 226, 0.5);
  }

  .item-icon {
    font-size: 24px;
    margin-bottom: 5px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-name {
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 3px;
    line-height: 1.2;
    max-height: 2.4em;
    overflow: hidden;
  }

  .item-quantity {
    position: absolute;
    bottom: 5px;
    right: 8px;
    background: rgba(255, 193, 7, 0.9);
    color: #000;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
  }

  /* ===== ZONE DE DÉTAILS ===== */
  .item-details {
    border-top: 2px solid #357abd;
    background: rgba(0, 0, 0, 0.2);
    padding: 20px;
    min-height: 150px;
    display: flex;
    flex-direction: column;
  }

  .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    text-align: center;
  }

  .no-selection-icon {
    font-size: 36px;
    margin-bottom: 10px;
    opacity: 0.5;
  }

  .item-detail-content {
    display: flex;
    gap: 20px;
  }

  .item-detail-icon {
    font-size: 48px;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    flex-shrink: 0;
  }

  .item-detail-info {
    flex: 1;
  }

  .item-detail-name {
    font-size: 18px;
    font-weight: bold;
    color: #87ceeb;
    margin-bottom: 8px;
  }

  .item-detail-type {
    font-size: 12px;
    color: #ffc107;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }

  .item-detail-description {
    color: #ddd;
    line-height: 1.4;
    margin-bottom: 10px;
  }

  .item-detail-stats {
    display: flex;
    gap: 15px;
    margin-top: 10px;
  }

  .item-stat {
    background: rgba(255, 255, 255, 0.1);
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 12px;
  }

  /* ===== FOOTER ===== */
  .inventory-footer {
    background: rgba(0, 0, 0, 0.3);
    padding: 15px 20px;
    border-top: 2px solid #357abd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0 0 17px 17px;
  }

  .pocket-info {
    color: #ccc;
    font-size: 14px;
  }

  .inventory-actions {
    display: flex;
    gap: 10px;
  }

  .inventory-btn {
    background: rgba(74, 144, 226, 0.8);
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .inventory-btn:hover:not(:disabled) {
    background: rgba(74, 144, 226, 1);
    transform: translateY(-1px);
  }

  .inventory-btn:disabled {
    background: rgba(108, 117, 125, 0.5);
    cursor: not-allowed;
  }

  .inventory-btn.secondary {
    background: rgba(108, 117, 125, 0.8);
  }

  .inventory-btn.secondary:hover {
    background: rgba(108, 117, 125, 1);
  }

  /* ===== POCHE VIDE ===== */
  .empty-pocket {
    grid-column: 1 / -1;
    text-align: center;
    color: #888;
    padding: 40px 20px;
    font-style: italic;
  }

  .empty-pocket-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.3;
  }

  /* ===== SCROLLBAR CUSTOM ===== */
  .items-grid::-webkit-scrollbar {
    width: 8px;
  }

  .items-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .items-grid::-webkit-scrollbar-thumb {
    background: rgba(74, 144, 226, 0.6);
    border-radius: 4px;
  }

  .items-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(74, 144, 226, 0.8);
  }

  /* ===== ANIMATIONS ===== */
  @keyframes itemAppear {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .item-slot.new {
    animation: itemAppear 0.4s ease;
  }

  @keyframes pocketSwitch {
    0% { opacity: 0; transform: translateX(20px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  .items-grid.switching {
    animation: pocketSwitch 0.3s ease;
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  /* ===== NOTIFICATIONS ===== */
  .inventory-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1002;
    animation: slideInRight 0.4s ease;
    max-width: 300px;
  }

  .inventory-notification.success {
    background: rgba(40, 167, 69, 0.95);
  }

  .inventory-notification.error {
    background: rgba(220, 53, 69, 0.95);
  }

  .inventory-notification.info {
    background: rgba(74, 144, 226, 0.95);
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .inventory-container {
      width: 95%;
      height: 90%;
    }

    .inventory-sidebar {
      width: 160px;
    }

    .pocket-tab {
      padding: 10px 12px;
      gap: 8px;
    }

    .pocket-tab span {
      font-size: 12px;
    }

    .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      padding: 15px;
    }

    .item-slot {
      min-height: 80px;
      padding: 8px 6px;
    }

    .item-icon {
      font-size: 20px;
    }

    .item-name {
      font-size: 10px;
    }
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .inventory-sidebar {
      width: 180px;
    }

    .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 12px;
    }

    .item-slot {
      min-height: 90px;
      padding: 10px 6px;
    }

    .item-icon {
      font-size: 22px;
    }

    .item-name {
      font-size: 10.5px;
    }
  }

  /* ===== ÉTATS SPÉCIAUX ===== */
  .inventory-overlay.disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  .inventory-container.loading {
    opacity: 0.7;
  }

  .inventory-container.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border: 4px solid rgba(74, 144, 226, 0.3);
    border-top: 4px solid #4a90e2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  /* ===== EFFETS VISUELS AVANCÉS ===== */
  .item-slot.highlight {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
    border-color: #ffd700;
  }

  .item-slot.highlight::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, transparent, rgba(255, 215, 0, 0.3), transparent);
    border-radius: 14px;
    z-index: -1;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .pocket-tab.has-new-items::after {
    content: '●';
    color: #ff4757;
    font-size: 12px;
    margin-left: auto;
    animation: pulse 2s infinite;
  }

  /* ===== ACCESSIBILITÉ ===== */
  .inventory-overlay:focus-within {
    outline: 2px solid #4a90e2;
    outline-offset: 2px;
  }

  .item-slot:focus {
    outline: 2px solid #87ceeb;
    outline-offset: 2px;
  }

  .inventory-btn:focus {
    outline: 2px solid #87ceeb;
    outline-offset: 2px;
  }

  /* ===== TRANSITIONS FLUIDES ===== */
  .inventory-container * {
    transition: all 0.3s ease;
  }

  .item-slot {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pocket-tab {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .inventory-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

export default INVENTORY_UI_STYLES;

console.log('🎨 [InventoryUICSS] Styles d\'interface complets chargés');
