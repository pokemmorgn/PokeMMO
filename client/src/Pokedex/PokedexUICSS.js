// Pokedex/PokedexUICSS.js - Styles pour l'interface Pokédx complète
// 🎨 Design nostalgique inspiré Game Boy + modernité

export const POKEDEX_UI_STYLES = `
  /* ===== OVERLAY PRINCIPAL ===== */
  .pokedex-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 30% 20%, rgba(29, 78, 216, 0.15), transparent 50%),
      radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.15), transparent 50%),
      rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(8px);
    transition: opacity 0.3s ease;
    font-family: 'Segoe UI', 'Arial', sans-serif;
  }

  .pokedex-overlay.hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* ===== CONTENEUR PRINCIPAL STYLE POKÉDX ===== */
  .pokedex-container {
    width: 95%;
    max-width: 1200px;
    height: 90%;
    max-height: 800px;
    background: 
      linear-gradient(145deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
    border: 4px solid #3b82f6;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    color: white;
    box-shadow: 
      0 25px 80px rgba(0, 0, 0, 0.8),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 40px rgba(59, 130, 246, 0.3);
    transform: scale(0.9);
    transition: transform 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .pokedex-overlay:not(.hidden) .pokedex-container {
    transform: scale(1);
  }

  /* Effet Game Boy vintage */
  .pokedex-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(45deg, 
        transparent 25%, 
        rgba(255, 255, 255, 0.05) 25%, 
        rgba(255, 255, 255, 0.05) 50%, 
        transparent 50%, 
        transparent 75%, 
        rgba(255, 255, 255, 0.05) 75%);
    background-size: 4px 4px;
    pointer-events: none;
    opacity: 0.3;
  }

  /* ===== HEADER STYLE GAME BOY ===== */
  .pokedex-header {
    background: linear-gradient(145deg, #1e40af, #3b82f6);
    border-radius: 16px 16px 0 0;
    border-bottom: 3px solid #1e3a8a;
    position: relative;
  }

.pokedex-top-section {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  width: 100%; /* 🆕 S'assurer que la section prend toute la largeur */
}

.pokedex-logo {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1; /* 🆕 Le logo prend l'espace disponible à gauche */
}

  .logo-light {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    box-shadow: 
      0 0 10px currentColor,
      inset 0 2px 0 rgba(255, 255, 255, 0.5);
    animation: logoLightPulse 3s infinite;
  }

  .logo-light.red {
    background: radial-gradient(circle, #ef4444, #dc2626);
    color: #ef4444;
  }

  .logo-light.yellow {
    background: radial-gradient(circle, #f59e0b, #d97706);
    color: #f59e0b;
    animation-delay: 1s;
  }

  .logo-light.green {
    background: radial-gradient(circle, #10b981, #059669);
    color: #10b981;
    animation-delay: 2s;
  }

  @keyframes logoLightPulse {
    0%, 80%, 100% { opacity: 1; }
    40% { opacity: 0.6; }
  }

  .logo-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .logo-title {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 2px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    background: linear-gradient(45deg, #ffffff, #e2e8f0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .logo-subtitle {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #94a3b8;
    margin-top: -2px;
  }

  .logo-lights {
    display: flex;
    gap: 8px;
  }

.pokedex-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 🆕 Forcer l'alignement à droite */
  flex-shrink: 0; /* 🆕 Empêcher le rétrécissement */
  margin-left: auto; /* 🆕 Pousser complètement à droite */
}

.pokedex-close-btn {
  background: linear-gradient(145deg, #dc2626, #b91c1c);
  border: 2px solid #ef4444;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 12px rgba(220, 38, 38, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  /* 🆕 Supprime tout positionnement qui pourrait interférer */
  position: relative;
  margin-left: 20px; /* 🆕 Espace entre le logo et le bouton */
}

  .pokedex-close-btn:hover {
    background: linear-gradient(145deg, #ef4444, #dc2626);
    transform: scale(1.1);
    box-shadow: 
      0 6px 16px rgba(220, 38, 38, 0.6),
      inset 0 2px 0 rgba(255, 255, 255, 0.4);
  }

  .pokedex-close-btn:active {
    transform: scale(0.95);
  }

  /* ===== TABS NAVIGATION ===== */
  .pokedex-tabs {
    display: flex;
    background: rgba(0, 0, 0, 0.2);
    padding: 0 10px;
  }

  .tab-button {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 8px 8px 0 0;
    margin: 0 2px;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tab-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    transform: translateY(-2px);
  }

  .tab-button.active {
    background: linear-gradient(145deg, #0f172a, #1e293b);
    color: #60a5fa;
    border: 2px solid #3b82f6;
    border-bottom: none;
    box-shadow: 
      0 -4px 12px rgba(59, 130, 246, 0.3),
      inset 0 2px 0 rgba(255, 255, 255, 0.1);
  }

  .tab-icon {
    font-size: 14px;
  }

  /* ===== CONTENU PRINCIPAL ===== */
  .pokedex-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: linear-gradient(145deg, #0f172a, #1e293b);
    position: relative;
  }

  .pokedex-view {
    flex: 1;
    display: none;
    flex-direction: column;
    overflow: hidden;
  }

  .pokedex-view.active {
    display: flex;
  }

  /* ===== VUE NATIONALE ===== */
  .national-view {
    padding: 20px;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .progress-summary {
    display: flex;
    gap: 20px;
  }

  .progress-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .progress-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 1px;
  }

  .progress-value {
    font-size: 18px;
    font-weight: 900;
    color: #60a5fa;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
  }

  .view-controls {
    display: flex;
    gap: 10px;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(145deg, #374151, #4b5563);
    border: 1px solid #6b7280;
    border-radius: 8px;
    color: #e5e7eb;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .control-btn:hover {
    background: linear-gradient(145deg, #4b5563, #6b7280);
    border-color: #9ca3af;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .btn-icon {
    font-size: 14px;
  }

  /* ===== GRILLE POKÉMON ===== */
  .pokemon-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;
    overflow-y: auto;
    padding: 10px 0;
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #1e293b;
  }

  .pokemon-grid::-webkit-scrollbar {
    width: 8px;
  }

  .pokemon-grid::-webkit-scrollbar-track {
    background: #1e293b;
    border-radius: 4px;
  }

  .pokemon-grid::-webkit-scrollbar-thumb {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border-radius: 4px;
  }

  .pokemon-grid::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(145deg, #60a5fa, #3b82f6);
  }

  /* ===== ENTRÉES POKÉMON ===== */
  .pokemon-entry {
    background: linear-gradient(145deg, #1e293b, #374151);
    border: 2px solid #4b5563;
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 160px;
    position: relative;
    overflow: hidden;
  }

  .pokemon-entry::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .pokemon-entry:hover::before {
    opacity: 1;
  }

  .pokemon-entry:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: #60a5fa;
    box-shadow: 
      0 12px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(96, 165, 250, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .pokemon-entry.caught {
    border-color: #10b981;
    background: linear-gradient(145deg, #1e293b, #065f46);
  }

  .pokemon-entry.caught:hover {
    border-color: #34d399;
    box-shadow: 
      0 12px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(52, 211, 153, 0.4);
  }

  .pokemon-entry.seen:not(.caught) {
    border-color: #f59e0b;
    background: linear-gradient(145deg, #1e293b, #92400e);
  }

  .pokemon-entry.seen:not(.caught):hover {
    border-color: #fbbf24;
    box-shadow: 
      0 12px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(251, 191, 36, 0.4);
  }

  .pokemon-entry.unknown {
    border-color: #6b7280;
    background: linear-gradient(145deg, #1e293b, #374151);
    opacity: 0.6;
  }

  .pokemon-entry.unknown:hover {
    opacity: 0.8;
    border-color: #9ca3af;
  }

  /* Animation d'apparition */
  .pokemon-entry {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }

  .pokemon-entry.entry-appear {
    animation: entryAppear 0.5s ease forwards;
  }

  @keyframes entryAppear {
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 4px;
  }

  .entry-number {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
  }

  .favorite-star {
    color: #fbbf24;
    font-size: 12px;
    text-shadow: 0 0 4px rgba(251, 191, 36, 0.6);
    animation: starTwinkle 2s infinite;
  }

  @keyframes starTwinkle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .shiny-indicator {
    color: #ec4899;
    font-size: 12px;
    text-shadow: 0 0 6px rgba(236, 72, 153, 0.8);
    animation: shinySparkle 1.5s infinite;
  }

  @keyframes shinySparkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.1); }
  }

  .entry-sprite {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    margin: 4px 0;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .entry-sprite img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated; /* Style pixel art */
  }

  .entry-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
      margin-top: -4px;
  }

  .entry-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    text-transform: capitalize;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-status {
    display: flex;
    gap: 4px;
  }

  .status-badge {
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.caught {
    background: linear-gradient(145deg, #059669, #047857);
    color: #dcfce7;
    border: 1px solid #10b981;
  }

  .status-badge.seen {
    background: linear-gradient(145deg, #d97706, #b45309);
    color: #fef3c7;
    border: 1px solid #f59e0b;
  }

  .status-badge.unknown {
    background: linear-gradient(145deg, #4b5563, #374151);
    color: #d1d5db;
    border: 1px solid #6b7280;
  }

  /* ===== PAGINATION ===== */
  .pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .page-btn {
    padding: 8px 16px;
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border: 1px solid #60a5fa;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .page-btn:hover:not(:disabled) {
    background: linear-gradient(145deg, #60a5fa, #3b82f6);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(145deg, #374151, #4b5563);
    border-color: #6b7280;
  }

  .page-info {
    font-size: 12px;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
  }

  /* ===== VUE RECHERCHE ===== */
  .search-view {
    padding: 20px;
  }

  .search-container {
    margin-bottom: 20px;
  }

  .search-input-group {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .search-input {
    flex: 1;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #4b5563;
    border-radius: 10px;
    color: white;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .search-input:focus {
    outline: none;
    border-color: #60a5fa;
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
  }

  .search-btn {
    padding: 12px 16px;
    background: linear-gradient(145deg, #10b981, #059669);
    border: 1px solid #34d399;
    border-radius: 10px;
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .search-btn:hover {
    background: linear-gradient(145deg, #34d399, #10b981);
    transform: scale(1.05);
  }

  .search-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-group label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .type-filter {
    padding: 4px 8px;
    background: linear-gradient(145deg, #374151, #4b5563);
    border: 1px solid #6b7280;
    border-radius: 6px;
    color: #e5e7eb;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
  }

  .type-filter:hover {
    border-color: #9ca3af;
    transform: scale(1.05);
  }

  .type-filter.selected {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border-color: #60a5fa;
    color: white;
  }

  .status-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: #e5e7eb;
  }

  .filter-checkbox input[type="checkbox"] {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #6b7280;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .filter-checkbox input[type="checkbox"]:checked {
    background: linear-gradient(145deg, #10b981, #059669);
    border-color: #34d399;
  }

  .filter-checkbox input[type="checkbox"]:checked::before {
    content: '✓';
    display: block;
    text-align: center;
    color: white;
    font-size: 10px;
    font-weight: bold;
    line-height: 12px;
  }

  .region-select {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #4b5563;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    cursor: pointer;
  }

  .region-select:focus {
    outline: none;
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
  }

  .region-select option {
    background: #1e293b;
    color: white;
  }

  .apply-filters-btn {
    grid-column: 1 / -1;
    padding: 10px 20px;
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border: 1px solid #60a5fa;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .apply-filters-btn:hover {
    background: linear-gradient(145deg, #60a5fa, #3b82f6);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .clear-filters-btn {
    grid-column: 1 / -1;
    padding: 8px 16px;
    background: linear-gradient(145deg, #374151, #4b5563);
    border: 1px solid #6b7280;
    border-radius: 8px;
    color: #e5e7eb;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .clear-filters-btn:hover {
    background: linear-gradient(145deg, #4b5563, #6b7280);
    border-color: #9ca3af;
  }

  .search-results {
    flex: 1;
    overflow-y: auto;
  }

  /* ===== VUE FAVORIS ===== */
  .favorites-view {
    padding: 20px;
  }

  .favorites-header {
    text-align: center;
    margin-bottom: 20px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .favorites-header h3 {
    font-size: 18px;
    font-weight: 700;
    color: #fbbf24;
    margin: 0 0 8px 0;
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  }

  .favorites-subtitle {
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
  }

  .favorites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;
    overflow-y: auto;
  }

  /* ===== VUE STATISTIQUES ===== */
  .stats-view {
    padding: 20px;
    overflow-y: auto;
  }

  .stats-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }

  .stat-card {
    background: linear-gradient(145deg, #1e293b, #374151);
    border: 2px solid #4b5563;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    border-color: #60a5fa;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .stat-icon {
    font-size: 36px;
    opacity: 0.8;
  }

  .stat-info {
    flex: 1;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 900;
    color: #60a5fa;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
    line-height: 1;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }

  .detailed-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
  }

  .stats-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .stats-section h4 {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0 0 15px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ===== PANNEAU DE DÉTAILS ===== */
  .pokemon-details-panel {
    position: absolute;
    top: 0;
    right: -400px;
    width: 380px;
    height: 100%;
    background: linear-gradient(145deg, #0f172a, #1e293b);
    border-left: 3px solid #3b82f6;
    transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #1e293b;
  }

  .pokemon-details-panel.open {
    right: 0;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  }

  .details-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px;
    background: linear-gradient(145deg, #1e40af, #3b82f6);
    border-bottom: 2px solid #60a5fa;
    position: sticky;
    top: 0;
    z-index: 11;
  }

  .details-close {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .details-close:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  .details-title {
    font-size: 16px;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  .details-content {
    padding: 20px;
  }

  .pokemon-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .pokemon-main-info {
    display: flex;
    gap: 15px;
    flex: 1;
  }

  .pokemon-sprite-large {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 60px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    border: 2px solid #4b5563;
  }

  .pokemon-sprite-large img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .pokemon-identity {
    flex: 1;
  }

  .pokemon-name {
    font-size: 20px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 4px 0;
    text-transform: capitalize;
  }

  .pokemon-number {
    font-size: 12px;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
    margin: 0 0 8px 0;
  }

  .pokemon-types {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .type-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid currentColor;
  }

  /* Types Pokémon */
  .type-normal { background: #a8a878; color: white; }
  .type-fire { background: #f08030; color: white; }
  .type-water { background: #6890f0; color: white; }
  .type-electric { background: #f8d030; color: black; }
  .type-grass { background: #78c850; color: white; }
  .type-ice { background: #98d8d8; color: black; }
  .type-fighting { background: #c03028; color: white; }
  .type-poison { background: #a040a0; color: white; }
  .type-ground { background: #e0c068; color: black; }
  .type-flying { background: #a890f0; color: white; }
  .type-psychic { background: #f85888; color: white; }
  .type-bug { background: #a8b820; color: white; }
  .type-rock { background: #b8a038; color: white; }
  .type-ghost { background: #705898; color: white; }
  .type-dragon { background: #7038f8; color: white; }
  .type-dark { background: #705848; color: white; }
  .type-steel { background: #b8b8d0; color: black; }
  .type-fairy { background: #ee99ac; color: white; }

  .pokemon-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #6b7280;
    background: linear-gradient(145deg, #374151, #4b5563);
    color: #9ca3af;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-action-btn:hover {
    border-color: #fbbf24;
    color: #fbbf24;
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
  }

  .detail-action-btn.favorited {
    border-color: #fbbf24;
    color: #fbbf24;
    background: linear-gradient(145deg, #92400e, #b45309);
  }

  .pokemon-stats-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-item .stat-label {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-item .stat-value {
    font-size: 12px;
    color: #e2e8f0;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }

  .pokemon-description {
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .pokemon-description h4 {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 8px 0;
  }

  .pokemon-description p {
    font-size: 13px;
    color: #e2e8f0;
    line-height: 1.5;
    margin: 0;
  }

  .evolution-chain {
    margin-bottom: 20px;
  }

  .evolution-chain h4 {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 10px 0;
  }

  .evolution-list {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .evolution-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    min-width: 80px;
  }

  .evo-sprite {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
  }

  .evo-name {
    font-size: 10px;
    color: #e2e8f0;
    font-weight: 600;
    text-align: center;
  }

  .evo-condition {
    font-size: 8px;
    color: #94a3b8;
    text-align: center;
  }

  .evolution-arrow {
    font-size: 16px;
    color: #60a5fa;
    font-weight: bold;
  }

  /* ===== FOOTER ===== */
  .pokedex-footer {
    background: linear-gradient(145deg, #1e40af, #3b82f6);
    border-top: 2px solid #60a5fa;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0 0 16px 16px;
  }

  .footer-info {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 11px;
    color: #e2e8f0;
  }

  .system-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: statusPulse 2s infinite;
  }

  .status-indicator.online {
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }

  .status-indicator.offline {
    background: #ef4444;
    box-shadow: 0 0 6px #ef4444;
  }

  @keyframes statusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .last-sync {
    color: #94a3b8;
    font-family: 'Courier New', monospace;
  }

  .footer-actions {
    display: flex;
    gap: 8px;
  }

  .footer-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid #60a5fa;
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .footer-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: #93c5fd;
    transform: scale(1.1);
    color: white;
  }

  .footer-btn.syncing {
    animation: syncSpin 1s linear infinite;
  }

  @keyframes syncSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ===== ÉTATS VIDES ===== */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    opacity: 0.7;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state p {
    color: #94a3b8;
    margin: 0 0 8px 0;
    font-size: 14px;
  }

  .empty-subtitle {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
  }

  /* ===== ANIMATIONS GLOBALES ===== */
  @keyframes pokedexFadeIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes pokedexFadeOut {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    to {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
  }

  .pokedex-overlay.ui-fade-in .pokedex-container {
    animation: pokedexFadeIn 0.3s ease-out forwards;
  }

  .pokedex-overlay.ui-fade-out .pokedex-container {
    animation: pokedexFadeOut 0.2s ease-in forwards;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .pokedex-container {
      width: 98%;
      height: 95%;
      max-height: none;
    }

    .pokedex-tabs {
      flex-wrap: wrap;
    }

    .tab-button {
      flex: 1 1 calc(50% - 4px);
      min-width: 120px;
    }

    .pokemon-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .pokemon-entry {
      min-height: 120px;
      padding: 12px;
    }

    .entry-sprite {
      width: 50px;
      height: 50px;
      font-size: 32px;
    }

    .pokemon-details-panel {
      width: 100%;
      right: -100%;
    }

    .view-header {
      flex-direction: column;
      gap: 15px;
    }

    .progress-summary {
      justify-content: center;
    }

    .search-filters {
      grid-template-columns: 1fr;
    }

    .stats-overview {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .detailed-stats {
      grid-template-columns: 1fr;
    }

    .logo-title {
      font-size: 16px;
    }

    .logo-subtitle {
      font-size: 9px;
    }
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .pokedex-container {
      width: 90%;
      height: 88%;
    }

    .pokemon-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .pokemon-details-panel {
      width: 350px;
    }
  }

  /* ===== ACCESSIBILITÉ ===== */
  .pokedex-overlay:focus-within {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }

  .pokemon-entry:focus {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }

  .tab-button:focus,
  .control-btn:focus,
  .page-btn:focus,
  .footer-btn:focus,
  .detail-action-btn:focus {
    outline: 2px solid #93c5fd;
    outline-offset: 2px;
  }

  /* ===== PERFORMANCE ===== */
  .pokemon-grid {
    will-change: scroll-position;
  }

  .pokemon-entry {
    will-change: transform;
  }

  .pokemon-details-panel {
    will-change: transform;
  }

  /* ===== EFFET SCANLINE VINTAGE ===== */
  .pokedex-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      transparent 50%,
      rgba(0, 255, 0, 0.03) 50%
    );
    background-size: 100% 4px;
    pointer-events: none;
    opacity: 0.5;
  }

  /* ===== GLOW EFFECTS ===== */
  .pokedex-container {
    position: relative;
  }

  .pokedex-container::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, #3b82f6, #10b981, #f59e0b, #ef4444, #8b5cf6);
    background-size: 400% 400%;
    border-radius: 22px;
    opacity: 0.1;
    filter: blur(20px);
    animation: gradientShift 6s ease infinite;
    z-index: -1;
  }

  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  /* ===== THÈME SOMBRE RENFORCÉ ===== */
  .pokedex-overlay {
    color-scheme: dark;
  }

  /* ===== SPRITES ET STATUTS POKÉMON ===== */
.pokemon-sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  transition: all 0.3s ease;
}

.pokemon-sprite.captured {
  filter: none;
  opacity: 1;
}

.pokemon-sprite.silhouette {
  filter: brightness(0) contrast(1);
  opacity: 0.8;
}

.pokemon-sprite.unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: #6b7280;
  opacity: 0.6;
}
/* ===== EFFETS SPÉCIAUX POUR SHINY ===== */
.pokemon-sprite.shiny {
  position: relative;
  animation: shinyGlow 2s ease-in-out infinite;
}

.pokemon-sprite.shiny::after {
  content: '✨';
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 12px;
  animation: sparkle 1.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shinyGlow {
  0%, 100% { 
    filter: brightness(1) saturate(1);
  }
  50% { 
    filter: brightness(1.2) saturate(1.3) drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
  }
}

@keyframes sparkle {
  0%, 100% { 
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% { 
    opacity: 0.7;
    transform: scale(1.2) rotate(180deg);
  }
}

/* Effet shiny pour les entrées Pokémon */
.pokemon-entry.caught .pokemon-sprite.shiny {
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 8px;
}
  /* ===== TYPES POKÉMON ===== */
  .entry-types {
    display: flex;
    gap: 4px;
    margin-top: 2px;
    flex-wrap: wrap;
    justify-content: center;
  }

  /* ===== PROGRESSION PAR TYPE ===== */
  .type-progress-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .type-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
  }

  .type-stats {
    font-size: 11px;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
  }

  .type-progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.6s ease;
    border-radius: 3px;
  }

  .type-percentage {
    font-size: 11px;
    color: #e2e8f0;
    font-weight: 600;
    min-width: 35px;
    text-align: right;
    font-family: 'Courier New', monospace;
  }

  /* ===== ÉTAT DE CHARGEMENT ===== */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    opacity: 0.7;
  }

  .loading-icon {
    font-size: 48px;
    margin-bottom: 16px;
    animation: spin 2s linear infinite;
  }

  .loading-state p {
    color: #94a3b8;
    margin: 0;
    font-size: 14px;
  }

  /* ===== POKÉMON ENTRÉES SELON STATUT ===== */
  .pokemon-entry.unknown {
    border-color: #6b7280;
    background: linear-gradient(145deg, #1e293b, #374151);
    opacity: 0.7;
  }

  .pokemon-entry.unknown:hover {
    opacity: 0.8;
    border-color: #9ca3af;
    transform: translateY(-2px) scale(1.02);
  }

  .pokemon-entry.unknown .entry-name {
    color: #9ca3af;
    font-style: italic;
  }

  .pokemon-entry.seen:not(.caught) {
    border-color: #f59e0b;
    background: linear-gradient(145deg, #1e293b, #92400e);
  }

  .pokemon-entry.seen:not(.caught):hover {
    border-color: #fbbf24;
    box-shadow: 
      0 12px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(251, 191, 36, 0.4);
  }

  .pokemon-entry.seen:not(.caught) .entry-name {
    color: #fbbf24;
  }

  .pokemon-entry.caught {
    border-color: #10b981;
    background: linear-gradient(145deg, #1e293b, #065f46);
  }

  .pokemon-entry.caught:hover {
    border-color: #34d399;
    box-shadow: 
      0 12px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(52, 211, 153, 0.4);
  }

  .pokemon-entry.caught .entry-name {
    color: #34d399;
  }

  /* ===== FILTRES DE TYPE ===== */
  .type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .type-filter {
    padding: 4px 8px;
    background: linear-gradient(145deg, #374151, #4b5563);
    border: 1px solid #6b7280;
    border-radius: 6px;
    color: #e5e7eb;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
  }

  .type-filter:hover {
    border-color: #9ca3af;
    transform: scale(1.05);
  }

  .type-filter.selected {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border-color: #60a5fa;
    color: white;
  }

  /* ===== STYLES RESPONSIVES AMÉLIORÉS ===== */
  @media (max-width: 768px) {
    .pokemon-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
    }

    .pokemon-entry {
      min-height: 100px;
      padding: 8px;
    }

    .entry-sprite {
      width: 45px;
      height: 45px;
      font-size: 28px;
    }

    .entry-types {
      flex-direction: column;
      gap: 2px;
    }

    .type-badge {
      font-size: 8px;
      padding: 2px 4px;
    }
  }

  /* ===== ANIMATIONS D'ENTRÉE POKÉMON ===== */
  .pokemon-entry {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }

  .pokemon-entry.entry-appear {
    animation: pokemonEntryAppear 0.4s ease forwards;
  }

  @keyframes pokemonEntryAppear {
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ===== EFFETS SPÉCIAUX POUR SHINY ===== */
  .pokemon-entry.caught .shiny-indicator {
    animation: shinySparkle 1.5s infinite;
  }

  .pokemon-entry.caught.has-shiny {
    position: relative;
    overflow: visible;
  }

  .pokemon-entry.caught.has-shiny::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ec4899, #f59e0b, #10b981, #3b82f6, #8b5cf6);
    background-size: 400% 400%;
    border-radius: 14px;
    z-index: -1;
    animation: shinyBorder 3s ease infinite;
    opacity: 0.6;
  }

  @keyframes shinyBorder {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  /* ===== AMÉLIORATION DE LA GRILLE ===== */
  .pokemon-grid {
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #1e293b;
  }

  .pokemon-grid::-webkit-scrollbar {
    width: 8px;
  }

  .pokemon-grid::-webkit-scrollbar-track {
    background: #1e293b;
    border-radius: 4px;
  }

  .pokemon-grid::-webkit-scrollbar-thumb {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    border-radius: 4px;
  }

  .pokemon-grid::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(145deg, #60a5fa, #3b82f6);
  }
`;

export default POKEDEX_UI_STYLES;

console.log('🎨 [PokedexUICSS] Styles complets du Pokédx chargés - Design nostalgique moderne !');
