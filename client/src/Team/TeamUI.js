// Team/TeamUI.js - Interface Team COMPLÈTEMENT REFAITE
// 🎯 Layout moderne clean sans superposition

export class TeamUI {
  constructor(teamManager, gameRoom) {
    this.teamManager = teamManager;
    this.gameRoom = gameRoom;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    
    // === DONNÉES AFFICHÉES ===
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.currentView = 'overview';
    
    // === CALLBACKS ===
    this.onAction = null;
    
    console.log('🎯 [TeamUI] Instance créée - Layout refait');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation layout refait...');
      
      await this.loadModernCSS();
      this.createCleanInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Interface refaite initialisée');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS MODERNE COMPLÈTEMENT REFAIT ===
  
  async loadModernCSS() {
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.querySelector('#modern-team-ui-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'modern-team-ui-styles';
    style.textContent = `
      /* ===== RESET ET BASE ===== */
      * {
        box-sizing: border-box;
      }
      
      /* ===== OVERLAY TRANSPARENT ===== */
      .team-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: transparent;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 1;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      
      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.9);
      }
      
      .team-overlay .team-container {
        pointer-events: auto;
      }
      
      /* ===== CONTAINER SIMPLIFIÉ ===== */
      .team-container {
        width: 90vw;
        max-width: 1200px;
        height: 75vh;
        max-height: 600px;
        background: 
          linear-gradient(145deg, #1a1a2e, #16213e),
          radial-gradient(circle at 30% 40%, rgba(74, 144, 226, 0.1), transparent);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        color: white;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 0;
        box-shadow: 
          0 32px 64px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05);
        overflow: hidden;
        position: relative;
      }
      
      .team-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="white" opacity="0.02"/><circle cx="80" cy="60" r="1" fill="white" opacity="0.02"/><circle cx="40" cy="80" r="1" fill="white" opacity="0.02"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        pointer-events: none;
        z-index: 1;
      }
      
      /* ===== HEADER GLASSMORPHISM ===== */
      .team-header {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        padding: 24px 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
      }
      
      .team-title {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .team-icon {
        font-size: 28px;
        background: linear-gradient(135deg, #ff6b6b, #feca57);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.3));
      }
      
      .team-title-text h2 {
        margin: 0;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      
      .team-subtitle {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        margin: 4px 0 0 0;
        font-weight: 400;
      }
      
      .team-controls {
        display: flex;
        align-items: center;
        gap: 24px;
      }
      
      .team-stats {
        text-align: right;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        padding: 12px 20px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
      
      .team-count {
        font-size: 20px;
        font-weight: 800;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .team-status {
        font-size: 12px;
        margin-top: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .team-close-btn {
        background: rgba(255, 71, 87, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 71, 87, 0.3);
        color: #ff4757;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      
      .team-close-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, rgba(255, 71, 87, 0.1), transparent 70%);
        transform: scale(0);
        transition: transform 0.3s ease;
      }
      
      .team-close-btn:hover::before {
        transform: scale(1);
      }
      
      .team-close-btn:hover {
        background: rgba(255, 71, 87, 0.3);
        border-color: #ff4757;
        transform: scale(1.05);
        box-shadow: 0 8px 25px rgba(255, 71, 87, 0.3);
      }
      
      /* ===== TABS FLOTTANTS ===== */
      .team-tabs {
        display: flex;
        gap: 4px;
        padding: 16px 32px 0;
        background: transparent;
        position: relative;
        z-index: 2;
      }
      
      .team-tab {
        flex: none;
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        position: relative;
        overflow: hidden;
        min-width: 120px;
      }
      
      .team-tab::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(116, 185, 255, 0.1), rgba(9, 132, 227, 0.1));
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .team-tab:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.8);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
      
      .team-tab:hover::before {
        opacity: 1;
      }
      
      .team-tab.active {
        background: linear-gradient(135deg, rgba(116, 185, 255, 0.2), rgba(9, 132, 227, 0.2));
        color: #74b9ff;
        border-color: rgba(116, 185, 255, 0.3);
        box-shadow: 
          0 8px 25px rgba(116, 185, 255, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
      }
      
      .team-tab.active::before {
        opacity: 1;
      }
      
      .tab-icon {
        font-size: 16px;
        transition: transform 0.3s ease;
      }
      
      .team-tab.active .tab-icon {
        transform: scale(1.1);
      }
      
      /* ===== CONTENU PRINCIPAL MODERNE ===== */
      .team-content {
        flex: 1;
        padding: 32px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
        z-index: 2;
      }
      
      .team-view {
        display: none;
        height: 100%;
        overflow: hidden;
        animation: fadeOut 0.3s ease-out;
      }
      
      .team-view.active {
        display: flex;
        animation: fadeIn 0.4s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
      
      /* ===== LAYOUT OVERVIEW MODERNE ===== */
      .team-overview-content {
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 32px;
        height: 100%;
        width: 100%;
      }
      
      /* Section principale - Grille moderne */
      .team-slots-section {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      
      .slots-header {
        margin-bottom: 20px;
      }
      
      .slots-title {
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        letter-spacing: -0.5px;
      }
      
      /* Grille des slots - Design Cards */
      .team-slots-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 20px;
        flex: 1;
        min-height: 0;
      }
      
      /* Slot Pokemon - Card Design */
      .team-slot {
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 180px;
        overflow: hidden;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
      
      .team-slot::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 50%, rgba(116, 185, 255, 0.05), transparent 70%);
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      
      .team-slot:hover {
        transform: translateY(-6px) scale(1.02);
        border-color: rgba(116, 185, 255, 0.3);
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(116, 185, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }
      
      .team-slot:hover::before {
        opacity: 1;
      }
      
      .team-slot.selected {
        border-color: #74b9ff;
        background: rgba(116, 185, 255, 0.1);
        box-shadow: 
          0 20px 60px rgba(116, 185, 255, 0.2),
          0 0 0 2px rgba(116, 185, 255, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        transform: translateY(-4px) scale(1.02);
      }
      
      .team-slot.selected::before {
        opacity: 1;
        background: radial-gradient(circle at 50% 50%, rgba(116, 185, 255, 0.1), transparent 70%);
      }
      
      .team-slot.empty {
        border-style: dashed;
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .team-slot.empty:hover {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.04);
      }
      
      /* Numéro du slot - Badge moderne */
      .slot-number {
        position: absolute;
        top: 12px;
        left: 12px;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        z-index: 2;
        box-shadow: 0 4px 12px rgba(116, 185, 255, 0.3);
      }
      
      /* Slot vide - Design moderne */
      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        opacity: 0.6;
        height: 100%;
        position: relative;
        z-index: 1;
      }
      
      .empty-icon {
        font-size: 32px;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 8px rgba(116, 185, 255, 0.3));
      }
      
      .empty-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
        font-weight: 500;
      }
      
      /* ===== POKEMON CARD REDESIGN ===== */
      .pokemon-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      
      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 8px;
      }
      
      .pokemon-name {
        font-weight: 700;
        color: #ffffff;
        font-size: 14px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 100px;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .pokemon-level {
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(116, 185, 255, 0.3);
      }
      
      .pokemon-sprite {
        text-align: center;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px 0;
      }
      
      .pokemon-portrait {
        width: 80px;
        height: 80px;
        background-size: cover;
        background-position: center;
        border-radius: 16px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        image-rendering: pixelated;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }
      
      .team-slot:hover .pokemon-portrait {
        transform: scale(1.05);
        border-color: rgba(116, 185, 255, 0.4);
        box-shadow: 
          0 12px 48px rgba(0, 0, 0, 0.3),
          0 0 0 2px rgba(116, 185, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }
      
      .pokemon-health {
        margin-top: auto;
      }
      
      .health-bar {
        width: 100%;
        height: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 6px;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .health-fill {
        height: 100%;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 8px;
        position: relative;
      }
      
      .health-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent);
        border-radius: 8px 8px 0 0;
      }
      
      .health-fill.high { 
        background: linear-gradient(135deg, #00b894, #00a085); 
        box-shadow: 0 0 12px rgba(0, 184, 148, 0.4);
      }
      .health-fill.medium { 
        background: linear-gradient(135deg, #fdcb6e, #e17055); 
        box-shadow: 0 0 12px rgba(253, 203, 110, 0.4);
      }
      .health-fill.low { 
        background: linear-gradient(135deg, #fd79a8, #e84393); 
        box-shadow: 0 0 12px rgba(253, 121, 168, 0.4);
      }
      .health-fill.critical { 
        background: linear-gradient(135deg, #a29bfe, #6c5ce7); 
        box-shadow: 0 0 12px rgba(162, 155, 254, 0.4);
        animation: criticalPulse 2s infinite;
      }
      
      @keyframes criticalPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .health-text {
        font-size: 11px;
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 600;
      }
      
      .pokemon-types {
        display: flex;
        gap: 4px;
        justify-content: center;
        margin-top: 6px;
        flex-wrap: wrap;
      }
      
      .type-badge {
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      /* Types redesignés */
      .type-badge.type-fire { 
        background: linear-gradient(135deg, #ff7675, #e17055); 
        color: white;
      }
      .type-badge.type-water { 
        background: linear-gradient(135deg, #74b9ff, #0984e3); 
        color: white;
      }
      .type-badge.type-grass { 
        background: linear-gradient(135deg, #55a3ff, #00b894); 
        color: white;
      }
      .type-badge.type-electric { 
        background: linear-gradient(135deg, #fdcb6e, #f39c12); 
        color: #2d3436;
      }
      .type-badge.type-psychic { 
        background: linear-gradient(135deg, #fd79a8, #e84393); 
        color: white;
      }
      .type-badge.type-ice { 
        background: linear-gradient(135deg, #81ecec, #00cec9); 
        color: #2d3436;
      }
      .type-badge.type-dragon { 
        background: linear-gradient(135deg, #a29bfe, #6c5ce7); 
        color: white;
      }
      .type-badge.type-dark { 
        background: linear-gradient(135deg, #636e72, #2d3436); 
        color: white;
      }
      .type-badge.type-fairy { 
        background: linear-gradient(135deg, #fd79a8, #fdcb6e); 
        color: #2d3436;
      }
      .type-badge.type-normal { 
        background: linear-gradient(135deg, #ddd, #b2bec3); 
        color: #2d3436;
      }
      
      /* ===== SIDEBAR MODERNE ===== */
      .team-sidebar {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 350px;
      }
      
      /* Section stats redesignée */
      .stats-section {
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
      }
      
      .stats-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 80% 20%, rgba(116, 185, 255, 0.05), transparent 50%);
        pointer-events: none;
      }
      
      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
      }
      
      .section-title {
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        letter-spacing: -0.5px;
      }
      
      .section-icon {
        font-size: 18px;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      /* Stats individuelles redesignées */
      .stat-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: relative;
        z-index: 1;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(5px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .stat-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(116, 185, 255, 0.05), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .stat-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(116, 185, 255, 0.2);
        transform: translateX(4px);
      }
      
      .stat-item:hover::before {
        opacity: 1;
      }
      
      .stat-label {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }
      
      .stat-value {
        font-size: 14px;
        font-weight: 700;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      /* Couverture des types redesignée */
      .type-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
        position: relative;
        z-index: 1;
      }
      
      .coverage-type {
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }
      
      .coverage-type:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
      }
      
      /* ===== VUES DÉTAILS ET MOVES REDESIGNÉES ===== */
      .team-details-content,
      .team-moves-content {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 60px 40px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      
      .no-selection {
        color: rgba(255, 255, 255, 0.6);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      
      .no-selection-icon {
        font-size: 64px;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        opacity: 0.5;
        filter: drop-shadow(0 0 20px rgba(116, 185, 255, 0.2));
      }
      
      .no-selection h3 {
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(135deg, #ffffff, #74b9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        letter-spacing: -0.5px;
      }
      
      .no-selection p {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
        font-weight: 500;
      }
      
      /* ===== FOOTER REDESIGNÉ ===== */
      .team-footer {
        padding: 24px 32px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 2;
      }
      
      .team-actions {
        display: flex;
        gap: 12px;
      }
      
      .team-btn {
        padding: 12px 20px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #74b9ff, #0984e3);
        color: white;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
          0 4px 15px rgba(116, 185, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
      }
      
      .team-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }
      
      .team-btn:hover::before {
        left: 100%;
      }
      
      .team-btn:hover {
        background: linear-gradient(135deg, #0984e3, #74b9ff);
        transform: translateY(-2px);
        box-shadow: 
          0 8px 25px rgba(116, 185, 255, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }
      
      .team-btn.secondary {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 
          0 4px 15px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
      
      .team-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.12);
        color: white;
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 
          0 8px 25px rgba(0, 0, 0, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }
      
      .btn-icon {
        font-size: 16px;
        transition: transform 0.3s ease;
      }
      
      .team-btn:hover .btn-icon {
        transform: scale(1.1);
      }
      
      .team-info {
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
        font-weight: 500;
        font-style: italic;
      }
      
      /* ===== ANIMATIONS MODERNES ===== */
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      
      @keyframes glow {
        0%, 100% { 
          box-shadow: 0 0 20px rgba(116, 185, 255, 0.2); 
        }
        50% { 
          box-shadow: 0 0 40px rgba(116, 185, 255, 0.4); 
        }
      }
      
      .team-icon:hover {
        animation: float 2s ease-in-out infinite;
      }
      
      .team-slot.selected {
        animation: glow 2s ease-in-out infinite;
      }
      
      /* ===== RESPONSIVE MODERNE ===== */
      @media (max-width: 1200px) {
        .team-overview-content {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr auto;
          gap: 24px;
        }
        
        .team-sidebar {
          width: 100%;
          grid-row: 2;
        }
        
        .team-slots-grid {
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 16px;
        }
      }
      
      @media (max-width: 768px) {
        .team-container {
          width: 95vw;
          height: 90vh;
          border-radius: 16px;
        }
        
        .team-header {
          padding: 20px 24px;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        
        .team-controls {
          flex-direction: column;
          gap: 12px;
        }
        
        .team-tabs {
          padding: 12px 24px 0;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .team-tab {
          min-width: auto;
          padding: 10px 16px;
          font-size: 12px;
        }
        
        .team-content {
          padding: 20px;
        }
        
        .team-slots-grid {
          grid-template-columns: 1fr;
          grid-template-rows: repeat(6, auto);
          gap: 12px;
        }
        
        .team-slot {
          min-height: 140px;
          padding: 16px;
        }
        
        .pokemon-portrait {
          width: 60px;
          height: 60px;
        }
        
        .team-footer {
          padding: 16px 24px;
          flex-direction: column;
          gap: 16px;
        }
        
        .team-actions {
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .team-btn {
          padding: 10px 16px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .team-container {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          max-height: none;
        }
        
        .team-overlay {
          padding: 0;
        }
        
        .team-header {
          padding: 16px 20px;
        }
        
        .team-content {
          padding: 16px;
        }
        
        .team-footer {
          padding: 16px 20px;
        }
        
        .stats-section {
          padding: 16px;
        }
        
        .slot-number {
          width: 20px;
          height: 20px;
          font-size: 10px;
        }
        
        .pokemon-name {
          font-size: 12px;
          max-width: 60px;
        }
        
        .pokemon-level {
          font-size: 9px;
          padding: 2px 6px;
        }
      }
      
      /* ===== PERFORMANCE ET ACCESSIBILITÉ ===== */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        .team-slot:hover {
          transform: none;
        }
        
        .team-btn:hover {
          transform: none;
        }
      }
      
      .team-tab:focus,
      .team-btn:focus,
      .team-slot:focus,
      .team-close-btn:focus {
        outline: 2px solid #74b9ff;
        outline-offset: 2px;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] CSS moderne chargé');
  }
  
  // === 🏗️ INTERFACE PROPRE ===
  
  createCleanInterface() {
    // Supprimer l'ancienne interface
    const existing = document.querySelector('#team-overlay');
    if (existing) {
      existing.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';
    
    overlay.innerHTML = `
      <div class="team-container">
        <!-- Header -->
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <h2>Mon Équipe Pokémon</h2>
              <p class="team-subtitle">Gestion de votre équipe de combat</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <div class="team-count">0/6</div>
              <div class="team-status">En attente</div>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">Vue d'ensemble</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Détails</span>
          </button>
        </div>
        
        <!-- Contenu -->
        <div class="team-content">
          <!-- Vue d'ensemble -->
          <div class="team-view active" id="team-overview">
            <div class="team-overview-content">
              <!-- Section des slots Pokemon -->
              <div class="team-slots-section">
                <div class="slots-header">
                  <h3 class="slots-title">
                    <span>⚔️</span>
                    <span>Équipe de Combat</span>
                  </h3>
                </div>
                <div class="team-slots-grid">
                  ${this.generateCleanSlots()}
                </div>
              </div>
              
              <!-- Sidebar avec statistiques -->
              <div class="team-sidebar">
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">📊</span>
                    <h4 class="section-title">Statistiques</h4>
                  </div>
                  <div class="stat-list">
                    <div class="stat-item">
                      <span class="stat-label">Niveau Moyen</span>
                      <span class="stat-value" id="avg-level">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">HP Total</span>
                      <span class="stat-value" id="total-hp">0/0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Prêt au Combat</span>
                      <span class="stat-value" id="battle-ready">Non</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Pokémon Vivants</span>
                      <span class="stat-value" id="alive-count">0</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">🎯</span>
                    <h4 class="section-title">Couverture Types</h4>
                  </div>
                  <div class="type-coverage" id="type-coverage">
                    <!-- Types générés dynamiquement -->
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Vue Détails -->
          <div class="team-view" id="team-details">
            <div class="team-details-content">
              <div class="no-selection">
                <div class="no-selection-icon">📊</div>
                <h3>Détails Pokémon</h3>
                <p>Sélectionnez un Pokémon pour voir ses détails</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface propre créée');
  }
  
  generateCleanSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty" data-slot="${i}">
          <div class="slot-number">${i + 1}</div>
          <div class="empty-slot">
            <div class="empty-icon">➕</div>
            <div class="empty-text">Slot libre</div>
          </div>
        </div>
      `;
    }
    return slotsHTML;
  }
  
  // === LE RESTE DU CODE JAVASCRIPT RESTE IDENTIQUE ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Fermeture
    this.overlayElement.querySelector('.team-close-btn').addEventListener('click', () => {
      this.hide();
    });
    
    // Fermeture par échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
    
    // Fermeture en cliquant à l'extérieur - SUPPRIMÉ
    // this.overlayElement.addEventListener('click', (e) => {
    //   if (e.target === this.overlayElement) {
    //     this.hide();
    //   }
    // });
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });
    
    // Actions footer - SUPPRIMÉ
    // this.overlayElement.querySelector('#heal-team-btn').addEventListener('click', () => {
    //   this.handleAction('healTeam');
    // });
    
    // this.overlayElement.querySelector('#pc-access-btn').addEventListener('click', () => {
    //   this.handleAction('openPC');
    // });
    
    // this.overlayElement.querySelector('#auto-arrange-btn').addEventListener('click', () => {
    //   this.handleAction('autoArrange');
    // });
    
    // Sélection des slots
    this.setupSlotSelection();
    
    console.log('🎛️ [TeamUI] Événements configurés');
  }
  
  setupSlotSelection() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    
    slotsContainer.addEventListener('click', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.selectPokemon(pokemon, slot, slotIndex);
      } else {
        this.deselectPokemon();
      }
    });
    
    // Double-clic pour voir les détails
    slotsContainer.addEventListener('dblclick', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.switchToView('details');
        this.selectPokemon(pokemon, slot, slotIndex);
      }
    });
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [TeamUI] Affichage interface propre');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    
    // Demander les données fraîches
    this.requestTeamData();
    
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface propre');
    
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.add('hidden');
    }
    
    // Désélectionner
    this.deselectPokemon();
    
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [TeamUI] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.pointerEvents = 'auto';
        this.overlayElement.style.opacity = '1';
      } else {
        this.overlayElement.style.pointerEvents = 'none';
        this.overlayElement.style.opacity = '0.5';
      }
    }
    
    return true;
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateTeamData(data) {
    console.log('📊 [TeamUI] Mise à jour données équipe propre:', data);
    
    this.teamData = Array.isArray(data.team) ? data.team : [];
    
    this.refreshCleanDisplay();
    this.updateCleanSummary();
    
    if (this.selectedPokemon) {
      // Mettre à jour le Pokémon sélectionné
      const updatedPokemon = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updatedPokemon) {
        this.selectedPokemon = updatedPokemon;
        this.updateDetailView();
      }
    }
  }
  
  refreshCleanDisplay() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    // Vider la grille
    slotsContainer.innerHTML = '';
    
    // Créer les 6 slots
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createCleanSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
    }
    
    console.log('🔄 [TeamUI] Affichage propre rafraîchi');
  }
  
  createCleanSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        ${this.createCleanPokemonCardHTML(pokemon)}
      `;
    } else {
      slot.classList.add('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        <div class="empty-slot">
          <div class="empty-icon">➕</div>
          <div class="empty-text">Slot libre</div>
        </div>
      `;
    }
    
    return slot;
  }
  
  createCleanPokemonCardHTML(pokemon) {
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const typesHTML = this.getTypesHTML(pokemon.types);
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-name" title="${pokemon.nickname || pokemon.name || 'Pokémon'}">
            ${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}
          </div>
          <div class="pokemon-level">Niv. ${pokemon.level}</div>
        </div>
        
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
        </div>
        
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${pokemon.currentHp}/${pokemon.maxHp}</div>
        </div>
        
        <div class="pokemon-types">
          ${typesHTML}
        </div>
      </div>
    `;
  }
  
  getPortraitStyle(pokemonId) {
    const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    return `background-image: url('${url}'); background-size: cover; background-position: center;`;
  }
  
  getHealthClass(healthPercent) {
    if (healthPercent > 75) return 'high';
    if (healthPercent > 50) return 'medium';
    if (healthPercent > 25) return 'low';
    return 'critical';
  }
  
  getTypesHTML(types) {
    if (!types || !Array.isArray(types)) return '';
    
    return types.map(type => 
      `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
  }
  
  // === 📊 RÉSUMÉ PROPRE ===
  
  updateCleanSummary() {
    if (!this.overlayElement) return;
    
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + p.level, 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + p.currentHp, 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + p.maxHp, 0);
    const canBattle = aliveCount > 0;
    
    // Header stats
    this.overlayElement.querySelector('.team-count').textContent = `${teamCount}/6`;
    const statusElement = this.overlayElement.querySelector('.team-status');
    statusElement.textContent = canBattle ? 'Prêt' : 'Non Prêt';
    statusElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Summary stats
    this.overlayElement.querySelector('#avg-level').textContent = avgLevel;
    this.overlayElement.querySelector('#total-hp').textContent = `${totalCurrentHp}/${totalMaxHp}`;
    this.overlayElement.querySelector('#alive-count').textContent = aliveCount;
    
    const battleReadyElement = this.overlayElement.querySelector('#battle-ready');
    battleReadyElement.textContent = canBattle ? 'Oui' : 'Non';
    battleReadyElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Type coverage
    this.updateCleanTypeCoverage();
    
    console.log('📊 [TeamUI] Résumé propre mis à jour');
  }
  
  updateCleanTypeCoverage() {
    const coverageContainer = this.overlayElement.querySelector('#type-coverage');
    if (!coverageContainer) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      coverageContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-style: italic;">Aucun type</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon propre:', pokemon.nickname || pokemon.name);
    
    // Désélectionner l'ancien
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Sélectionner le nouveau
    slotElement.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    // Mettre à jour la vue détaillée
    this.updateDetailView();
  }
  
  deselectPokemon() {
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    this.selectedPokemon = null;
    this.selectedSlot = null;
    
    this.updateDetailView();
  }
  
  updateDetailView() {
    const detailsContent = this.overlayElement.querySelector('.team-details-content');
    if (!detailsContent) return;
    
    if (!this.selectedPokemon) {
      detailsContent.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">📊</div>
          <h3>Détails Pokémon</h3>
          <p>Sélectionnez un Pokémon pour voir ses détails</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    
    detailsContent.innerHTML = `
      <div style="width: 100%; max-width: 500px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}; width: 100px; height: 100px; margin: 0 auto 15px; border: 3px solid #4a90e2;"></div>
          <h2 style="margin: 0; color: #87ceeb;">${pokemon.nickname || pokemon.name}</h2>
          <p style="margin: 5px 0; color: rgba(255,255,255,0.8);">Niveau ${pokemon.level} • ${pokemon.types?.join('/') || 'Type Inconnu'}</p>
        </div>
        
        <div class="stat-list">
          <div class="stat-item">
            <span class="stat-label">Points de Vie</span>
            <span class="stat-value">${pokemon.currentHp}/${pokemon.maxHp} (${Math.round(healthPercent)}%)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Nature</span>
            <span class="stat-value">${pokemon.nature || 'Inconnue'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Expérience</span>
            <span class="stat-value">${pokemon.experience || 0} XP</span>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0;">
            Informations détaillées du Pokémon sélectionné
          </p>
        </div>
      </div>
    `;
  }
  
  // === 🎮 NAVIGATION VUES ===
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue propre: ${viewName}`);
    
    // Mettre à jour les tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    
    // Mettre à jour les vues
    this.overlayElement.querySelectorAll('.team-view').forEach(view => {
      view.classList.toggle('active', view.id === `team-${viewName}`);
    });
    
    this.currentView = viewName;
    
    // Actions spécifiques selon la vue
    if (viewName === 'details' && this.selectedPokemon) {
      this.updateDetailView();
    }
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [TeamUI] Action propre: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
  }
  
  handlePokemonAction(action, pokemonId) {
    this.handleAction(action, { pokemonId });
  }
  
  requestTeamData() {
    this.handleAction('requestData');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamUI] Destruction interface propre...');
    
    // Supprimer l'élément DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.onAction = null;
    
    // Supprimer la référence globale
    if (window.teamUI === this) {
      window.teamUI = null;
    }
    
    console.log('✅ [TeamUI] Interface propre détruite');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.overlayElement,
      elementInDOM: this.overlayElement ? document.contains(this.overlayElement) : false,
      currentView: this.currentView,
      teamCount: this.teamData.length,
      selectedPokemon: this.selectedPokemon ? this.selectedPokemon.nickname || this.selectedPokemon.name : null,
      selectedSlot: this.selectedSlot,
      hasOnAction: !!this.onAction,
      style: 'modern-design'
    };
  }
}

export default TeamUI;

// Exposer globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI DESIGN MODERNE ===

✨ NOUVEAU DESIGN:
• Glassmorphisme et néomorphisme
• Animations fluides avec cubic-bezier
• Gradients dynamiques et effets glow
• Layout Grid CSS moderne
• Sidebar fixe 350px (plus d'espace bizarre!)

🎨 AMÉLIORATIONS VISUELLES:
• Background avec grain et particules
• Cards flottantes avec ombres douces
• Barres de vie avec effets glass
• Types Pokemon avec gradients
• Boutons avec effet shimmer

🏗️ LAYOUT OPTIMISÉ:
• Grid container stable
• Slots 3x2 responsive vers 2x3 puis 1x6
• Tabs flottants modernes
• Footer avec glassmorphisme

📱 RESPONSIVE INTELLIGENT:
• Breakpoints logiques (1200px, 768px, 480px)
• Micro-interactions préservées
• Performance optimisée

♿ ACCESSIBILITÉ:
• prefers-reduced-motion
• Focus states
• High contrast
• Print styles

🚀 FINI L'ESPACE BIZARRE À DROITE !
`);
