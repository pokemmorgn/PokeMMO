// inventory.js - ES6 Module Version

console.log('🎒 Loading inventory system...');

// Module global variables
let inventoryOverlay = null;
let inventoryIcon = null;
let isVisible = false;

// Create the icon immediately
function createInventoryIcon() {
  // Check if the icon already exists
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
      '<div class="icon-label">Bag</div>' +
    '</div>';

  // Inline styles to ensure they apply
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

  // Events
  icon.addEventListener('click', () => {
    console.log('🎒 Inventory icon clicked');
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
  console.log('✅ Inventory icon created');
}

// Create the inventory interface
function createInventoryInterface() {
  // Check if overlay already exists
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
          <span>🎒 Bag</span>
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
              <span>Items</span>
            </div>
            <div class="pocket-tab" data-pocket="medicine">
              <div class="pocket-icon">💊</div>
              <span>Medicine</span>
            </div>
            <div class="pocket-tab" data-pocket="balls">
              <div class="pocket-icon">⚪</div>
              <span>Poké Balls</span>
            </div>
            <div class="pocket-tab" data-pocket="berries">
              <div class="pocket-icon">🍇</div>
              <span>Berries</span>
            </div>
            <div class="pocket-tab" data-pocket="key_items">
              <div class="pocket-icon">🗝️</div>
              <span>Key Items</span>
            </div>
            <div class="pocket-tab" data-pocket="tms">
              <div class="pocket-icon">💿</div>
              <span>TMs/HMs</span>
            </div>
          </div>
        </div>

        <div class="inventory-main">
          <div class="items-grid" id="items-grid">
            <div class="demo-content" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
              <h3 style="color: #87ceeb; margin-bottom: 20px;">🎒 Inventory Demo</h3>
              <p style="color: #ccc; margin-bottom: 20px;">Interface is working! Waiting for server connection...</p>
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
                  <div style="font-size: 11px; margin-top: 5px;">Secret Key</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="item-details" id="item-details">
            <div class="no-selection">
              <div class="no-selection-icon">📋</div>
              <p>Inventory interface loaded successfully!</p>
              <p style="font-size: 12px; color: #888;">Shortcut: Press 'I' to open/close</p>
            </div>
          </div>
        </div>
      </div>

      <div class="inventory-footer">
        <div class="pocket-info">
          <span id="pocket-count">Demo Mode</span>
          <span id="pocket-limit">- Interface OK</span>
        </div>
        <div class="inventory-actions">
          <button class="inventory-btn" onclick="console.log('Use button clicked')">Use</button>
          <button class="inventory-btn secondary" onclick="console.log('Sort button clicked')">Sort</button>
        </div>
      </div>
    </div>
  `;

  // Inline styles for demo elements
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

  // Events
  const closeBtn = overlay.querySelector('.inventory-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideInventory();
    });
  }

  // Close when clicking outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideInventory();
    }
  });

  // Pocket tabs events
  const tabs = overlay.querySelectorAll('.pocket-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Activate the clicked tab
      tab.classList.add('active');
      console.log('Selected pocket:', tab.dataset.pocket);
    });
  });

  document.body.appendChild(overlay);
  inventoryOverlay = overlay;
  console.log('✅ Inventory interface created');
}

// Utility functions
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
  console.log('🎒 Opening inventory');
  if (inventoryOverlay) {
    inventoryOverlay.classList.remove('hidden');
    isVisible = true;
  }
}

function hideInventory() {
  console.log('🎒 Closing inventory');
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

// Global event setup
function setupGlobalEvents() {
  // Keyboard shortcut I
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'i' && canOpenInventory()) {
      e.preventDefault();
      toggleInventory();
    }
    // Close with ESC
    if (e.key === 'Escape' && isInventoryVisible()) {
      hideInventory();
    }
  });
}

// Initialization
function initializeInventorySystem() {
  createInventoryIcon();
  createInventoryInterface();
  setupGlobalEvents();

  // Expose functions globally
  window.openInventory = openInventory;
  window.hideInventory = hideInventory;
  window.toggleInventory = toggleInventory;

  // Simulate a basic inventory system
  window.inventorySystem = {
    toggle: toggleInventory,
    show: openInventory,
    hide: hideInventory,
    isOpen: isInventoryVisible,
    canPlayerInteract: () => !isInventoryVisible() && canOpenInventory()
  };

  console.log('✅ Basic inventory system created');
}

// Initialization function with gameRoom
window.initializeInventory = function(gameRoom) {
  console.log('🎒 Initialized with gameRoom:', gameRoom);
  // System is already created, just logging for now
};

// Immediate initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeInventorySystem);
} else {
  initializeInventorySystem();
}

console.log('✅ inventory.js module loaded');
