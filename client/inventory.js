// inventory.js - Version ES6 Module avec connexion serveur

console.log('🎒 Chargement du système d\'inventaire...');

// Variables globales du module
let inventoryOverlay = null;
let inventoryIcon = null;
let isVisible = false;
let gameRoom = null;
let currentPocket = 'items';
let inventoryData = {};

// Connexion au serveur
function connectToServer() {
  // Attendre que gameRoom soit disponible
  const checkGameRoom = () => {
    if (window.gameRoom) {
      gameRoom = window.gameRoom;
      setupServerListeners();
      console.log('🎒 Connecté au serveur de jeu');
      
      // Demander l'inventaire initial après 1 seconde
      setTimeout(() => {
        requestInventoryData();
      }, 1000);
    } else {
      setTimeout(checkGameRoom, 500);
    }
  };
  checkGameRoom();
}

// Configuration des listeners serveur
function setupServerListeners() {
  if (!gameRoom) return;

  gameRoom.onMessage("inventoryData", (data) => {
    console.log('📦 Données inventaire reçues:', data);
    inventoryData = data;
    updateInventoryDisplay();
  });

  gameRoom.onMessage("inventoryUpdate", (data) => {
    console.log('🔄 Mise à jour inventaire:', data);
    handleInventoryUpdate(data);
  });

  gameRoom.onMessage("itemUseResult", (data) => {
    console.log('✨ Résultat utilisation:', data);
    showNotification(
      data.message || (data.success ? "Objet utilisé !" : "Erreur !"), 
      data.success ? "success" : "error"
    );
    if (data.success) {
      requestInventoryData(); // Recharger l'inventaire
    }
  });

  gameRoom.onMessage("inventoryError", (data) => {
    console.error('❌ Erreur inventaire:', data);
    showNotification(data.message, "error");
  });
}

// Fonctions serveur
function requestInventoryData() {
  if (gameRoom) {
    console.log('📤 Demande des données d\'inventaire...');
    gameRoom.send("getInventory");
  }
}

function useItem(itemId) {
  if (gameRoom) {
    console.log('📤 Utilisation de l\'objet:', itemId);
    gameRoom.send("useItem", { itemId, context: "field" });
  }
}

function testAddItem(itemId, quantity = 1) {
  if (gameRoom) {
    console.log('🧪 Test ajout objet:', itemId, 'x', quantity);
    gameRoom.send("testAddItem", { itemId, quantity });
  }
}

// Gestion des mises à jour d'inventaire
function handleInventoryUpdate(data) {
  const { type, itemId, quantity, pocket } = data;
  
  if (type === 'add') {
    addItemToLocal(itemId, quantity, pocket);
    showNotification(`+${quantity} ${formatItemName(itemId)}`, "success");
  } else if (type === 'remove') {
    removeItemFromLocal(itemId, quantity, pocket);
    showNotification(`-${quantity} ${formatItemName(itemId)}`, "info");
  }
  
  updateInventoryDisplay();
}

function addItemToLocal(itemId, quantity, pocket) {
  if (!inventoryData[pocket]) inventoryData[pocket] = [];
  
  const existingItem = inventoryData[pocket].find(item => item.itemId === itemId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    inventoryData[pocket].push({ itemId, quantity, data: {} });
  }
}

function removeItemFromLocal(itemId, quantity, pocket) {
  if (!inventoryData[pocket]) return;
  
  const itemIndex = inventoryData[pocket].findIndex(item => item.itemId === itemId);
  if (itemIndex >= 0) {
    const item = inventoryData[pocket][itemIndex];
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      inventoryData[pocket].splice(itemIndex, 1);
    }
  }
}

// Créer l'icône immédiatement
function createInventoryIcon() {
  // Vérifier si l'icône existe déjà
  if (document.getElementById('inventory-icon')) {
    return;
  }

  const icon = document.createElement('div');
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

  const iconBg = icon.querySelector('.icon-background');
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

  const iconEmoji = icon.querySelector('.icon-emoji');
  if (iconEmoji) {
    iconEmoji.style.cssText = `
      font-size: 28px;
      transition: transform 0.3s ease;
    `;
  }

  const iconLabel = icon.querySelector('.icon-label');
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
  icon.addEventListener('click', () => {
    console.log('🎒 Clic sur l\'icône d\'inventaire');
    toggleInventory();
  });

  icon.addEventListener('mouseenter', () => {
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

  icon.addEventListener('mouseleave', () => {
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

  document.body.appendChild(icon);
  inventoryIcon = icon;
  console.log('✅ Icône d\'inventaire créée');
}

// Créer l'interface d'inventaire
function createInventoryInterface() {
  // Vérifier si l'overlay existe déjà
  if (document.getElementById('inventory-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
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
            <div class="loading-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #87ceeb;">
              <h3>🔄 Chargement de l'inventaire...</h3>
              <p style="color: #ccc;">Connexion au serveur en cours...</p>
            </div>
          </div>
          
          <div class="item-details" id="item-details">
            <div class="no-selection">
              <div class="no-selection-icon">📋</div>
              <p>Sélectionnez un objet pour voir ses détails</p>
            </div>
          </div>
        </div>
      </div>

      <div class="inventory-footer">
        <div class="pocket-info">
          <span id="pocket-count">0 objets</span>
          <span id="pocket-limit">/ 30 max</span>
        </div>
        <div class="inventory-actions">
          <button class="inventory-btn" id="use-item-btn" disabled>Utiliser</button>
          <button class="inventory-btn secondary" id="refresh-btn">Actualiser</button>
          <button class="inventory-btn secondary" id="test-btn">Test</button>
        </div>
      </div>
    </div>
  `;

  // Événements
  const closeBtn = overlay.querySelector('.inventory-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideInventory();
    });
  }

  // Bouton actualiser
  const refreshBtn = overlay.querySelector('#refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      requestInventoryData();
      showNotification("Inventaire actualisé", "info");
    });
  }

  // Bouton test
  const testBtn = overlay.querySelector('#test-btn');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      testAddItem("poke_ball", 5);
      testAddItem("potion", 3);
      testAddItem("bicycle", 1);
    });
  }

  // Bouton utiliser
  const useBtn = overlay.querySelector('#use-item-btn');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      const selected = overlay.querySelector('.item-slot.selected');
      if (selected) {
        const itemId = selected.dataset.itemId;
        useItem(itemId);
      }
    });
  }

  // Fermeture en cliquant à l'extérieur
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideInventory();
    }
  });

  // Événements des onglets
  const tabs = overlay.querySelectorAll('.pocket-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchToPocket(tab.dataset.pocket);
    });
  });

  document.body.appendChild(overlay);
  inventoryOverlay = overlay;
  console.log('✅ Interface d\'inventaire créée');
}

// Changer de poche
function switchToPocket(pocketName) {
  currentPocket = pocketName;
  
  // Mettre à jour les onglets
  if (inventoryOverlay) {
    const tabs = inventoryOverlay.querySelectorAll('.pocket-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.pocket === pocketName);
    });
  }
  
  updateInventoryDisplay();
  console.log('📂 Poche changée:', pocketName);
}

// Mettre à jour l'affichage de l'inventaire
function updateInventoryDisplay() {
  if (!inventoryOverlay) return;
  
  const itemsGrid = inventoryOverlay.querySelector('#items-grid');
  const pocketData = inventoryData[currentPocket] || [];
  
  itemsGrid.innerHTML = '';
  
  if (pocketData.length === 0) {
    itemsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;">📭</div>
        <p>Aucun objet dans cette poche</p>
      </div>
    `;
  } else {
    pocketData.forEach((item, index) => {
      const itemElement = createItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }
  
  // Mettre à jour le compteur
  const countElement = inventoryOverlay.querySelector('#pocket-count');
  if (countElement) {
    countElement.textContent = `${pocketData.length} objets`;
  }
}

// Créer un élément d'objet
function createItemElement(item, index) {
  const itemElement = document.createElement('div');
  itemElement.className = 'item-slot';
  itemElement.dataset.itemId = item.itemId;
  
  const itemIcon = getItemIcon(item.itemId);
  const itemName = formatItemName(item.itemId);
  
  itemElement.innerHTML = `
    <div class="item-icon">${itemIcon}</div>
    <div class="item-name">${itemName}</div>
    ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
  `;
  
  itemElement.addEventListener('click', () => {
    selectItem(itemElement, item);
  });
  
  return itemElement;
}

// Sélectionner un objet
function selectItem(element, item) {
  if (!inventoryOverlay) return;
  
  // Désélectionner tous les autres
  inventoryOverlay.querySelectorAll('.item-slot').forEach(slot => {
    slot.classList.remove('selected');
  });
  
  // Sélectionner celui-ci
  element.classList.add('selected');
  
  // Activer le bouton utiliser
  const useBtn = inventoryOverlay.querySelector('#use-item-btn');
  if (useBtn) {
    useBtn.disabled = false;
  }
  
  console.log('🎯 Objet sélectionné:', item.itemId);
}

// Obtenir l'icône d'un objet
function getItemIcon(itemId) {
  const iconMap = {
    'poke_ball': '⚪', 'great_ball': '🟡', 'ultra_ball': '🟠', 'master_ball': '🟣',
    'potion': '💊', 'super_potion': '💉', 'hyper_potion': '🧪', 'max_potion': '🍼',
    'antidote': '🟢', 'parlyz_heal': '🟡', 'awakening': '🔵', 'burn_heal': '🔴',
    'bicycle': '🚲', 'town_map': '🗺️', 'old_rod': '🎣'
  };
  return iconMap[itemId] || '📦';
}

// Formater le nom d'un objet
function formatItemName(itemId) {
  return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Afficher une notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1002;
    max-width: 300px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  switch (type) {
    case 'success':
      notification.style.background = 'rgba(40, 167, 69, 0.95)';
      break;
    case 'error':
      notification.style.background = 'rgba(220, 53, 69, 0.95)';
      break;
    default:
      notification.style.background = 'rgba(74, 144, 226, 0.95)';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Fonctions utilitaires
function canOpenInventory() {
  const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
  const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
  const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
  
  return !questDialogOpen && !chatOpen && !dialogueOpen;
}

function isInventoryVisible() {
  return inventoryOverlay && !inventoryOverlay.classList.contains('hidden');
}

function openInventory() {
  console.log('🎒 Ouverture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.remove('hidden');
    isVisible = true;
    
    // Demander les données à jour
    requestInventoryData();
  }
}

function hideInventory() {
  console.log('🎒 Fermeture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.add('hidden');
    isVisible = false;
  }
}

function toggleInventory() {
  if (isInventoryVisible()) {
    hideInventory();
  } else {
    openInventory();
  }
}

// Configuration des événements globaux
function setupGlobalEvents() {
  // Raccourci clavier I
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'i' && canOpenInventory()) {
      e.preventDefault();
      toggleInventory();
    }
    // Fermeture avec ESC
    if (e.key === 'Escape' && isInventoryVisible()) {
      hideInventory();
    }
  });
}

// Initialisation
function initializeInventorySystem() {
  createInventoryIcon();
  createInventoryInterface();
  setupGlobalEvents();
  connectToServer();

  // Exposer les fonctions globalement
  window.openInventory = openInventory;
  window.hideInventory = hideInventory;
  window.toggleInventory = toggleInventory;
  window.testAddItem = testAddItem;

  // Simuler un système d'inventaire basique
  window.inventorySystem = {
    toggle: toggleInventory,
    show: openInventory,
    hide: hideInventory,
    isOpen: isInventoryVisible,
    canPlayerInteract: () => !isInventoryVisible() && canOpenInventory(),
    testAdd: testAddItem,
    refresh: requestInventoryData
  };

  console.log('✅ Système d\'inventaire basique créé');
}

// Fonction d'initialisation avec gameRoom
window.initializeInventory = function(gameRoom) {
  console.log('🎒 Initialisation avec gameRoom:', gameRoom);
  // Le système est déjà créé, on peut juste logger
};

// Initialisation immédiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeInventorySystem);
} else {
  initializeInventorySystem();
}

console.log('✅ Module inventory.js chargé');if (document.getElementById('inventory-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
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
            <div class="loading-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #87ceeb;">
              <h3>🔄 Chargement de l'inventaire...</h3>
              <p style="color: #ccc;">Connexion au serveur en cours...</p>
            </div>
          </div>
          
          <div class="item-details" id="item-details">
            <div class="no-selection">
              <div class="no-selection-icon">📋</div>
              <p>Sélectionnez un objet pour voir ses détails</p>
            </div>
          </div>
        </div>
      </div>

      <div class="inventory-footer">
        <div class="pocket-info">
          <span id="pocket-count">0 objets</span>
          <span id="pocket-limit">/ 30 max</span>
        </div>
        <div class="inventory-actions">
          <button class="inventory-btn" id="use-item-btn" disabled>Utiliser</button>
          <button class="inventory-btn secondary" id="refresh-btn">Actualiser</button>
          <button class="inventory-btn secondary" id="test-btn">Test</button>
        </div>
      </div>
    </div>
  `;

  // Événements
  const closeBtn = overlay.querySelector('.inventory-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideInventory();
    });
  }

  // Bouton actualiser
  const refreshBtn = overlay.querySelector('#refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      requestInventoryData();
      showNotification("Inventaire actualisé", "info");
    });
  }

  // Bouton test
  const testBtn = overlay.querySelector('#test-btn');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      testAddItem("poke_ball", 5);
      testAddItem("potion", 3);
      testAddItem("bicycle", 1);
    });
  }

  // Bouton utiliser
  const useBtn = overlay.querySelector('#use-item-btn');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      const selected = overlay.querySelector('.item-slot.selected');
      if (selected) {
        const itemId = selected.dataset.itemId;
        useItem(itemId);
      }
    });
  }

  // Fermeture en cliquant à l'extérieur
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideInventory();
    }
  });

  // Événements des onglets
  const tabs = overlay.querySelectorAll('.pocket-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchToPocket(tab.dataset.pocket);
    });
  });

  document.body.appendChild(overlay);
  inventoryOverlay = overlay;
  console.log('✅ Interface d\'inventaire créée');
}

// Changer de poche
function switchToPocket(pocketName) {
  currentPocket = pocketName;
  
  // Mettre à jour les onglets
  const tabs = inventoryOverlay.querySelectorAll('.pocket-tab');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.pocket === pocketName);
  });
  
  updateInventoryDisplay();
  console.log('📂 Poche changée:', pocketName);
}

// Mettre à jour l'affichage de l'inventaire
function updateInventoryDisplay() {
  if (!inventoryOverlay) return;
  
  const itemsGrid = inventoryOverlay.querySelector('#items-grid');
  const pocketData = inventoryData[currentPocket] || [];
  
  itemsGrid.innerHTML = '';
  
  if (pocketData.length === 0) {
    itemsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;">📭</div>
        <p>Aucun objet dans cette poche</p>
      </div>
    `;
  } else {
    pocketData.forEach((item, index) => {
      const itemElement = createItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }
  
  // Mettre à jour le compteur
  const countElement = inventoryOverlay.querySelector('#pocket-count');
  if (countElement) {
    countElement.textContent = `${pocketData.length} objets`;
  }
}

// Créer un élément d'objet
function createItemElement(item, index) {
  const itemElement = document.createElement('div');
  itemElement.className = 'item-slot';
  itemElement.dataset.itemId = item.itemId;
  
  const itemIcon = getItemIcon(item.itemId);
  const itemName = formatItemName(item.itemId);
  
  itemElement.innerHTML = `
    <div class="item-icon">${itemIcon}</div>
    <div class="item-name">${itemName}</div>
    ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
  `;
  
  itemElement.addEventListener('click', () => {
    selectItem(itemElement, item);
  });
  
  return itemElement;
}

// Sélectionner un objet
function selectItem(element, item) {
  // Désélectionner tous les autres
  inventoryOverlay.querySelectorAll('.item-slot').forEach(slot => {
    slot.classList.remove('selected');
  });
  
  // Sélectionner celui-ci
  element.classList.add('selected');
  
  // Activer le bouton utiliser
  const useBtn = inventoryOverlay.querySelector('#use-item-btn');
  if (useBtn) {
    useBtn.disabled = false;
  }
  
  console.log('🎯 Objet sélectionné:', item.itemId);
}

// Obtenir l'icône d'un objet
function getItemIcon(itemId) {
  const iconMap = {
    'poke_ball': '⚪', 'great_ball': '🟡', 'ultra_ball': '🟠', 'master_ball': '🟣',
    'potion': '💊', 'super_potion': '💉', 'hyper_potion': '🧪', 'max_potion': '🍼',
    'antidote': '🟢', 'parlyz_heal': '🟡', 'awakening': '🔵', 'burn_heal': '🔴',
    'bicycle': '🚲', 'town_map': '🗺️', 'old_rod': '🎣'
  };
  return iconMap[itemId] || '📦';
}

// Formater le nom d'un objet
function formatItemName(itemId) {
  return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Afficher une notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1002;
    max-width: 300px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  switch (type) {
    case 'success':
      notification.style.background = 'rgba(40, 167, 69, 0.95)';
      break;
    case 'error':
      notification.style.background = 'rgba(220, 53, 69, 0.95)';
      break;
    default:
      notification.style.background = 'rgba(74, 144, 226, 0.95)';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Fonctions utilitaires
function canOpenInventory() {
  const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
  const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
  const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
  
  return !questDialogOpen && !chatOpen && !dialogueOpen;
}

function isInventoryVisible() {
  return inventoryOverlay && !inventoryOverlay.classList.contains('hidden');
}

function openInventory() {
  console.log('🎒 Ouverture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.remove('hidden');
    isVisible = true;
    
    // Demander les données à jour
    requestInventoryData();
  }
}

function hideInventory() {
  console.log('🎒 Fermeture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.add('hidden');
    isVisible = false;
  }
}

function toggleInventory() {
  if (isInventoryVisible()) {
    hideInventory();
  } else {
    openInventory();
  }
}

// Configuration des événements globaux
function setupGlobalEvents() {
  // Raccourci clavier I
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'i' && canOpenInventory()) {
      e.preventDefault();
      toggleInventory();
    }
    // Fermeture avec ESC
    if (e.key === 'Escape' && isInventoryVisible()) {
      hideInventory();
    }
  });
}

// Initialisation
function initializeInventorySystem() {
  createInventoryIcon();
  createInventoryInterface();
  setupGlobalEvents();
  connectToServer();

  // Exposer les fonctions globalement
  window.openInventory = openInventory;
  window.hideInventory = hideInventory;
  window.toggleInventory = toggleInventory;
  window.testAddItem = testAddItem;

  // Simuler un système d'inventaire basique
  window.inventorySystem = {
    toggle: toggleInventory,
    show: openInventory,
    hide: hideInventory,
    isOpen: isInventoryVisible,
    canPlayerInteract: () => !isInventoryVisible() && canOpenInventory(),
    testAdd: testAddItem,
    refresh: requestInventoryData
  };

  console.log('✅ Système d\'inventaire basique créé');
}

// Fonction d'initialisation avec gameRoom
window.initializeInventory = function(gameRoom) {
  console.log('🎒 Initialisation avec gameRoom:', gameRoom);
  // Le système est déjà créé, on peut juste logger
};

// Initialisation immédiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeInventorySystem);
} else {
  initializeInventorySystem();
}

console.log('✅ Module inventory.js chargé');

console.log('🎒 Chargement du système d\'inventaire...');

// Variables globales du module
let inventoryOverlay = null;
let inventoryIcon = null;
let isVisible = false;

// Créer l'icône immédiatement
function createInventoryIcon() {
  // Vérifier si l'icône existe déjà
  if (document.getElementById('inventory-icon')) {
    return;
  }

  const icon = document.createElement('div');
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

  const iconBg = icon.querySelector('.icon-background');
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

  const iconEmoji = icon.querySelector('.icon-emoji');
  if (iconEmoji) {
    iconEmoji.style.cssText = `
      font-size: 28px;
      transition: transform 0.3s ease;
    `;
  }

  const iconLabel = icon.querySelector('.icon-label');
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
  icon.addEventListener('click', () => {
    console.log('🎒 Clic sur l\'icône d\'inventaire');
    toggleInventory();
  });

  icon.addEventListener('mouseenter', () => {
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

  icon.addEventListener('mouseleave', () => {
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

  document.body.appendChild(icon);
  inventoryIcon = icon;
  console.log('✅ Icône d\'inventaire créée');
}

// Créer l'interface d'inventaire
function createInventoryInterface() {
  // Vérifier si l'overlay existe déjà
  if (document.getElementById('inventory-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
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
  const style = document.createElement('style');
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
  const closeBtn = overlay.querySelector('.inventory-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideInventory();
    });
  }

  // Fermeture en cliquant à l'extérieur
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideInventory();
    }
  });

  // Événements des onglets
  const tabs = overlay.querySelectorAll('.pocket-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Désactiver tous les onglets
      tabs.forEach(t => t.classList.remove('active'));
      // Activer l'onglet cliqué
      tab.classList.add('active');
      console.log('Poche sélectionnée:', tab.dataset.pocket);
    });
  });

  document.body.appendChild(overlay);
  inventoryOverlay = overlay;
  console.log('✅ Interface d\'inventaire créée');
}

// Fonctions utilitaires
function canOpenInventory() {
  const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
  const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
  const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
  
  return !questDialogOpen && !chatOpen && !dialogueOpen;
}

function isInventoryVisible() {
  return inventoryOverlay && !inventoryOverlay.classList.contains('hidden');
}

function openInventory() {
  console.log('🎒 Ouverture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.remove('hidden');
    isVisible = true;
  }
}

function hideInventory() {
  console.log('🎒 Fermeture de l\'inventaire');
  if (inventoryOverlay) {
    inventoryOverlay.classList.add('hidden');
    isVisible = false;
  }
}

function toggleInventory() {
  if (isInventoryVisible()) {
    hideInventory();
  } else {
    openInventory();
  }
}

// Configuration des événements globaux
function setupGlobalEvents() {
  // Raccourci clavier I
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'i' && canOpenInventory()) {
      e.preventDefault();
      toggleInventory();
    }
    // Fermeture avec ESC
    if (e.key === 'Escape' && isInventoryVisible()) {
      hideInventory();
    }
  });
}

// Initialisation
function initializeInventorySystem() {
  createInventoryIcon();
  createInventoryInterface();
  setupGlobalEvents();

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
    canPlayerInteract: () => !isInventoryVisible() && canOpenInventory()
  };

  console.log('✅ Système d\'inventaire basique créé');
}

// Fonction d'initialisation avec gameRoom
window.initializeInventory = function(gameRoom) {
  console.log('🎒 Initialisation avec gameRoom:', gameRoom);
  // Le système est déjà créé, on peut juste logger
};

// Initialisation immédiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeInventorySystem);
} else {
  initializeInventorySystem();
}

console.log('✅ Module inventory.js chargé');
