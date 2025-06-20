// inventory.js - Version corrigée sans modules ES6

console.log('🎒 Chargement du système d\'inventaire...');

// Fonction d'initialisation simple et immédiate
function createInventorySystem() {
  
  // Créer l'icône immédiatement
  function createInventoryIcon() {
    // Vérifier si l'icône existe déjà
    if (document.getElementById('inventory-icon')) {
      return;
    }

    var icon = document.createElement('div');
    icon.id = 'inventory-icon';
    icon.className = 'inventory-icon';
    
    icon.innerHTML = 
      '<div class="icon-background">' +
        '<div class="icon-content">' +
          '<span class="icon-emoji">🎒</span>' +
        '</div>' +
        '<div class="icon-label">Sac</div>' +
      '</div>';

    // Styles inline pour s'assurer qu'ils s'appliquent
    icon.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 70px;
      height: 80px;
      cursor: pointer;
      z-index: 500;
      transition: all 0.3s ease;
      user-select: none;
    `;

    var iconBg = icon.querySelector('.icon-background');
    if (iconBg) {
      iconBg.style.cssText = `
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
      `;
    }

    var iconEmoji = icon.querySelector('.icon-emoji');
    if (iconEmoji) {
      iconEmoji.style.cssText = `
        font-size: 28px;
        transition: transform 0.3s ease;
      `;
    }

    var iconLabel = icon.querySelector('.icon-label');
    if (iconLabel) {
      iconLabel.style.cssText = `
        font-size: 11px;
        color: #87ceeb;
        font-weight: 600;
        text-align: center;
        padding: 4px 0;
        background: rgba(74, 144, 226, 0.2);
        width: 100%;
        border-radius: 0 0 13px 13px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      `;
    }

    // Événements
    icon.addEventListener('click', function() {
      console.log('🎒 Clic sur l\'icône d\'inventaire');
      openInventory();
    });

    icon.addEventListener('mouseenter', function() {
      icon.style.transform = 'scale(1.1)';
      if (iconBg) {
        iconBg.style.background = 'linear-gradient(145deg, #3a4f6f, #2e3d52)';
        iconBg.style.borderColor = '#5aa0f2';
        iconBg.style.boxShadow = '0 6px 20px rgba(74, 144, 226, 0.4)';
      }
      if (iconEmoji) {
        iconEmoji.style.transform = 'scale(1.2)';
      }
    });

    icon.addEventListener('mouseleave', function() {
      icon.style.transform = 'scale(1)';
      if (iconBg) {
        iconBg.style.background = 'linear-gradient(145deg, #2a3f5f, #1e2d42)';
        iconBg.style.borderColor = '#4a90e2';
        iconBg.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
      }
      if (iconEmoji) {
        iconEmoji.style.transform = 'scale(1)';
      }
    });

    // Raccourci clavier I
    document.addEventListener('keydown', function(e) {
      if (e.key.toLowerCase() === 'i' && canOpenInventory()) {
        e.preventDefault();
        openInventory();
      }
    });

    document.body.appendChild(icon);
    console.log('✅ Icône d\'inventaire créée');
  }

  // Créer l'interface d'inventaire
  function createInventoryInterface() {
    // Vérifier si l'overlay existe déjà
    if (document.getElementById('inventory-overlay')) {
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = 'inventory-overlay hidden';

    overlay.innerHTML = `
      <div class="inventory-container">
        <div class="inventory-header">
          <div class="inventory-title">
            <span>🎒 Sac</span>
          </div>
          <div class="inventory-controls">
            <button class="inventory-close-btn">✕</button>
          </div>
        </div>

        <div class="inventory-content">
          <div class="inventory-sidebar">
            <div class="pocket-tabs">
              <div class="pocket-tab active" data-pocket="items">
                <div class="pocket-icon">📦</div>
                <span>Objets</span>
              </div>
              <div class="pocket-tab" data-pocket="medicine">
                <div class="pocket-icon">💊</div>
                <span>Soins</span>
              </div>
              <div class="pocket-tab" data-pocket="balls">
                <div class="pocket-icon">⚪</div>
                <span>Poké Balls</span>
              </div>
              <div class="pocket-tab" data-pocket="berries">
                <div class="pocket-icon">🍇</div>
                <span>Baies</span>
              </div>
              <div class="pocket-tab" data-pocket="key_items">
                <div class="pocket-icon">🗝️</div>
                <span>Objets Clés</span>
              </div>
              <div class="pocket-tab" data-pocket="tms">
                <div class="pocket-icon">💿</div>
                <span>CTs/CSs</span>
              </div>
            </div>
          </div>

          <div class="inventory-main">
            <div class="items-grid" id="items-grid">
              <div class="demo-content" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: #87ceeb; margin-bottom: 20px;">🎒 Inventaire Demo</h3>
                <p style="color: #ccc; margin-bottom: 20px;">L'interface fonctionne ! En attente de la connexion serveur...</p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                  <div class="demo-item">
                    <div style="font-size: 24px;">⚪</div>
                    <div style="font-size: 11px; margin-top: 5px;">Poké Ball</div>
                    <div style="font-size: 10px; background: rgba(255, 193, 7, 0.9); color: #000; padding: 2px 6px; border-radius: 10px; margin-top: 3px;">5</div>
                  </div>
                  <div class="demo-item">
                    <div style="font-size: 24px;">💊</div>
                    <div style="font-size: 11px; margin-top: 5px;">Potion</div>
                    <div style="font-size: 10px; background: rgba(255, 193, 7, 0.9); color: #000; padding: 2px 6px; border-radius: 10px; margin-top: 3px;">3</div>
                  </div>
                  <div class="demo-item">
                    <div style="font-size: 24px;">🗝️</div>
                    <div style="font-size: 11px; margin-top: 5px;">Clé Secrète</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="item-details" id="item-details">
              <div class="no-selection">
                <div class="no-selection-icon">📋</div>
                <p>Interface d'inventaire chargée avec succès !</p>
                <p style="font-size: 12px; color: #888;">Raccourci : Appuyez sur 'I' pour ouvrir/fermer</p>
              </div>
            </div>
          </div>
        </div>

        <div class="inventory-footer">
          <div class="pocket-info">
            <span id="pocket-count">Mode Demo</span>
            <span id="pocket-limit">- Interface OK</span>
          </div>
          <div class="inventory-actions">
            <button class="inventory-btn" onclick="console.log('Bouton Utiliser cliqué')">Utiliser</button>
            <button class="inventory-btn secondary" onclick="console.log('Bouton Trier cliqué')">Trier</button>
          </div>
        </div>
      </div>
    `;

    // Styles inline pour les éléments demo
    var style = document.createElement('style');
    style.textContent = `
      .demo-item {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 12px 8px;
        text-align: center;
        min-width: 80px;
        position: relative;
        color: white;
      }
      .demo-item:hover {
        background: rgba(74, 144, 226, 0.2);
        border-color: #4a90e2;
        transform: translateY(-2px);
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);

    // Événements
    var closeBtn = overlay.querySelector('.inventory-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        hideInventory();
      });
    }

    // Fermeture avec ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isInventoryVisible()) {
        hideInventory();
      }
    });

    // Fermeture en cliquant à l'extérieur
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        hideInventory();
      }
    });

    // Événements des onglets
    var tabs = overlay.querySelectorAll('.pocket-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function() {
        // Désactiver tous les onglets
        var allTabs = overlay.querySelectorAll('.pocket-tab');
        for (var j = 0; j < allTabs.length; j++) {
          allTabs[j].classList.remove('active');
        }
        // Activer l'onglet cliqué
        this.classList.add('active');
        console.log('Poche sélectionnée:', this.dataset.pocket);
      });
    }

    document.body.appendChild(overlay);
    console.log('✅ Interface d\'inventaire créée');
  }

  // Fonctions utilitaires
  function canOpenInventory() {
    var questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    var chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    var dialogueOpen = document.querySelector('#dialogue-box') && 
                       document.querySelector('#dialogue-box').style.display !== 'none';
    
    return !questDialogOpen && !chatOpen && !dialogueOpen;
  }

  function isInventoryVisible() {
    var overlay = document.getElementById('inventory-overlay');
    return overlay && !overlay.classList.contains('hidden');
  }

  function openInventory() {
    console.log('🎒 Ouverture de l\'inventaire');
    var overlay = document.getElementById('inventory-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  function hideInventory() {
    console.log('🎒 Fermeture de l\'inventaire');
    var overlay = document.getElementById('inventory-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  function toggleInventory() {
    if (isInventoryVisible()) {
      hideInventory();
    } else {
      openInventory();
    }
  }

  // Créer l'inventaire
  createInventoryIcon();
  createInventoryInterface();

  // Exposer les fonctions globalement
  window.openInventory = openInventory;
  window.hideInventory = hideInventory;
  window.toggleInventory = toggleInventory;

  // Simuler un système d'inventaire basique
  window.inventorySystem = {
    toggle: toggleInventory,
    show: openInventory,
    hide: hideInventory,
    isOpen: isInventoryVisible,
    canPlayerInteract: function() {
      return !isInventoryVisible() && canOpenInventory();
    }
  };

  console.log('✅ Système d\'inventaire basique créé');
}

// Fonction d'initialisation simplifiée
window.initializeInventory = function(gameRoom) {
  console.log('🎒 Initialisation avec gameRoom:', gameRoom);
  createInventorySystem();
};

// Créer immédiatement le système si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createInventorySystem);
} else {
  createInventorySystem();
}

console.log('✅ Script inventory.js chargé');
