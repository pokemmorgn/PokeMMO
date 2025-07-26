// client/src/admin/js/shop-editor.js - Module d'édition des boutiques

export class ShopEditorModule {
    constructor(adminPanel) {
        this.name = 'shopEditor';
        this.adminPanel = adminPanel;
        this.currentShop = null;
        this.selectedZone = null;
        this.allShops = [];
        this.allItems = {};
        this.isEditMode = false;
        
        console.log('🏪 [ShopEditor] Module initialized');
    }

    onTabActivated() {
        console.log('🏪 [ShopEditor] Tab activated');
        this.render();
        this.loadInitialData();
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadAllItems(),
                this.loadShopsStats(),
                this.loadZonesList()
            ]);
        } catch (error) {
            console.error('❌ [ShopEditor] Error loading initial data:', error);
            this.adminPanel.showNotification('Erreur lors du chargement initial', 'error');
        }
    }

    async loadAllItems() {
        try {
            console.log('📦 [ShopEditor] Loading all items...');
            this.allItems = await this.adminPanel.apiCall('/items');
            console.log(`✅ [ShopEditor] ${Object.keys(this.allItems).length} items loaded`);
        } catch (error) {
            console.error('❌ [ShopEditor] Error loading items:', error);
            this.allItems = {};
        }
    }

    async loadShopsStats() {
        try {
            const response = await this.adminPanel.apiCall('/shops/stats');
            this.updateStatsDisplay(response.stats);
        } catch (error) {
            console.error('❌ [ShopEditor] Error loading stats:', error);
        }
    }

    async loadZonesList() {
        try {
            // Récupérer la liste des zones depuis les cartes disponibles
            const response = await this.adminPanel.apiCall('/maps/list');
            this.zones = response.maps.map(map => map.id);
        } catch (error) {
            console.error('❌ [ShopEditor] Error loading zones:', error);
            this.zones = [];
        }
    }

    render() {
        const container = document.getElementById('shops');
        if (!container) return;

        container.innerHTML = `
            <div class="shop-editor-container">
                <!-- Header avec stats et contrôles -->
                <div class="shop-header">
                    <div class="header-controls">
                        <div class="zone-selector">
                            <label for="zoneSelect" class="form-label">🗺️ Zone:</label>
                            <select id="zoneSelect" class="form-select" onchange="adminPanel.shopEditor.selectZone(this.value)">
                                <option value="">Toutes les zones</option>
                            </select>
                        </div>
                        
                        <div class="header-actions">
                            <button class="btn btn-success" onclick="adminPanel.shopEditor.createNewShop()">
                                <i class="fas fa-plus"></i> Nouvelle Boutique
                            </button>
                            <button class="btn btn-info" onclick="adminPanel.shopEditor.refreshShops()">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                            <button class="btn btn-warning" onclick="adminPanel.shopEditor.importShops()">
                                <i class="fas fa-upload"></i> Importer
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.shopEditor.exportShops()">
                                <i class="fas fa-download"></i> Exporter
                            </button>
                        </div>
                    </div>

                    <div class="zone-stats" id="shopStats">
                        <div class="stats-row">
                            <div class="stat-item">
                                <div class="stat-value" id="totalShops">0</div>
                                <div class="stat-label">Total</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="activeShops">0</div>
                                <div class="stat-label">Actives</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="temporaryShops">0</div>
                                <div class="stat-label">Temporaires</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="shopTypes">0</div>
                                <div class="stat-label">Types</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="shop-main-area">
                    <!-- Panel liste des boutiques -->
                    <div class="shops-list-panel">
                        <div class="list-header">
                            <h3>Boutiques</h3>
                            <div class="list-filters">
                                <input type="text" class="search-input" id="shopSearch" 
                                       placeholder="Rechercher boutiques..." 
                                       oninput="adminPanel.shopEditor.filterShops(this.value)">
                                <select class="form-select" id="typeFilter" onchange="adminPanel.shopEditor.filterByType(this.value)">
                                    <option value="">Tous les types</option>
                                    <option value="pokemart">Poké Mart</option>
                                    <option value="department">Grand Magasin</option>
                                    <option value="specialist">Spécialisé</option>
                                    <option value="gym_shop">Boutique d'Arène</option>
                                    <option value="game_corner">Casino</option>
                                    <option value="temporary">Temporaire</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="shops-list" id="shopsList">
                            <div class="empty-list">
                                <div style="text-align: center; padding: 40px; color: #6c757d;">
                                    <i class="fas fa-store" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                                    <p>Aucune boutique trouvée</p>
                                    <button class="btn btn-primary" onclick="adminPanel.shopEditor.createNewShop()">
                                        Créer la première boutique
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel éditeur -->
                    <div class="shop-editor-panel">
                        <div class="editor-header">
                            <h3 id="editorTitle">Éditeur de Boutique</h3>
                            <div class="editor-actions" id="editorActions" style="display: none;">
                                <button class="btn btn-success" onclick="adminPanel.shopEditor.saveShop()">
                                    <i class="fas fa-save"></i> Sauvegarder
                                </button>
                                <button class="btn btn-warning" onclick="adminPanel.shopEditor.duplicateShop()">
                                    <i class="fas fa-copy"></i> Dupliquer
                                </button>
                                <button class="btn btn-danger" onclick="adminPanel.shopEditor.deleteShop()">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                                <button class="btn btn-secondary" onclick="adminPanel.shopEditor.cancelEdit()">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                            </div>
                        </div>
                        
                        <div class="editor-content" id="editorContent">
                            <div class="no-selection">
                                <div style="text-align: center; padding: 60px; color: #95a5a6;">
                                    <i class="fas fa-store" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                                    <h3>Aucune boutique sélectionnée</h3>
                                    <p>Choisissez une boutique dans la liste ou créez-en une nouvelle</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.populateZoneSelect();
    }

    populateZoneSelect() {
        const zoneSelect = document.getElementById('zoneSelect');
        if (!zoneSelect || !this.zones) return;

        // Garder l'option "Toutes les zones"
        const currentValue = zoneSelect.value;
        zoneSelect.innerHTML = '<option value="">Toutes les zones</option>';
        
        this.zones.forEach(zone => {
            const option = document.createElement('option');
            option.value = zone;
            option.textContent = this.formatZoneName(zone);
            zoneSelect.appendChild(option);
        });

        zoneSelect.value = currentValue;
    }

    formatZoneName(zone) {
        return zone.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .replace(/_/g, ' ');
    }

    async selectZone(zoneId) {
        this.selectedZone = zoneId || null;
        console.log(`🗺️ [ShopEditor] Zone selected: ${zoneId || 'All'}`);
        await this.loadShops();
    }

    async loadShops() {
        try {
            console.log(`🏪 [ShopEditor] Loading shops for zone: ${this.selectedZone || 'all'}`);
            
            let endpoint = '/shops/list';
            if (this.selectedZone) {
                endpoint = `/shops/by-zone/${this.selectedZone}`;
            }
            
            const response = await this.adminPanel.apiCall(endpoint);
            this.allShops = response.shops || [];
            
            console.log(`✅ [ShopEditor] ${this.allShops.length} shops loaded`);
            this.renderShopsList();
            
        } catch (error) {
            console.error('❌ [ShopEditor] Error loading shops:', error);
            this.adminPanel.showNotification('Erreur lors du chargement des boutiques', 'error');
            this.allShops = [];
            this.renderShopsList();
        }
    }

    renderShopsList() {
        const shopsList = document.getElementById('shopsList');
        if (!shopsList) return;

        if (this.allShops.length === 0) {
            shopsList.innerHTML = `
                <div class="empty-list">
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-store" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>Aucune boutique trouvée</p>
                        <button class="btn btn-primary" onclick="adminPanel.shopEditor.createNewShop()">
                            Créer une boutique
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const shopsHtml = this.allShops.map(shop => this.renderShopItem(shop)).join('');
        shopsList.innerHTML = shopsHtml;
    }

    renderShopItem(shop) {
        const isSelected = this.currentShop && this.currentShop.shopId === shop.shopId;
        
        return `
            <div class="shop-item ${isSelected ? 'selected' : ''}" 
                 onclick="adminPanel.shopEditor.selectShop('${shop.shopId}')">
                
                <div class="shop-icon">
                    ${this.getShopTypeIcon(shop.type)}
                </div>
                
                <div class="shop-info">
                    <div class="shop-name">${shop.name || shop.shopId}</div>
                    <div class="shop-details">
                        <span class="shop-type">${this.formatShopType(shop.type)}</span>
                        <span class="shop-zone">${shop.location?.zone || 'Zone inconnue'}</span>
                        <span class="shop-currency">${this.formatCurrency(shop.currency)}</span>
                        ${shop.isTemporary ? '<span class="shop-temp">TEMP</span>' : ''}
                        ${!shop.isActive ? '<span class="shop-inactive">INACTIF</span>' : ''}
                    </div>
                    <div class="shop-stats">
                        <span>${shop.itemCount || 0} articles</span>
                    </div>
                </div>
                
                <div class="shop-status">
                    ${shop.isActive ? '✅' : '❌'}
                </div>
            </div>
        `;
    }

    getShopTypeIcon(type) {
        const icons = {
            pokemart: '🏪',
            department: '🏬',
            specialist: '🔧',
            gym_shop: '🏟️',
            contest_shop: '🎭',
            game_corner: '🎰',
            black_market: '🌑',
            trainer_shop: '👤',
            temporary: '⏰',
            vending_machine: '🏷️',
            online_shop: '💻'
        };
        return icons[type] || '🏪';
    }

    formatShopType(type) {
        const types = {
            pokemart: 'Poké Mart',
            department: 'Grand Magasin',
            specialist: 'Spécialisé',
            gym_shop: 'Boutique d\'Arène',
            contest_shop: 'Boutique Concours',
            game_corner: 'Casino',
            black_market: 'Marché Noir',
            trainer_shop: 'Boutique Dresseur',
            temporary: 'Temporaire',
            vending_machine: 'Distributeur',
            online_shop: 'Boutique en Ligne'
        };
        return types[type] || type;
    }

    formatCurrency(currency) {
        const currencies = {
            gold: '💰 Gold',
            battle_points: '⚔️ Points Combat',
            contest_points: '🎭 Points Concours',
            game_tokens: '🎰 Jetons',
            rare_candy: '🍬 Bonbons Rares'
        };
        return currencies[currency] || currency;
    }

    async selectShop(shopId) {
        try {
            console.log(`🏪 [ShopEditor] Selecting shop: ${shopId}`);
            
            // Récupérer les détails complets de la boutique
            const response = await this.adminPanel.apiCall(`/shops/details/${shopId}`);
            this.currentShop = response.shop;
            
            this.isEditMode = true;
            this.renderShopEditor();
            this.renderShopsList(); // Re-render pour mettre à jour la sélection
            
        } catch (error) {
            console.error('❌ [ShopEditor] Error selecting shop:', error);
            this.adminPanel.showNotification('Erreur lors de la sélection de la boutique', 'error');
        }
    }

    renderShopEditor() {
        const editorContent = document.getElementById('editorContent');
        const editorTitle = document.getElementById('editorTitle');
        const editorActions = document.getElementById('editorActions');
        
        if (!editorContent) return;

        if (!this.currentShop) {
            editorContent.innerHTML = `
                <div class="no-selection">
                    <div style="text-align: center; padding: 60px; color: #95a5a6;">
                        <i class="fas fa-store" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                        <h3>Aucune boutique sélectionnée</h3>
                        <p>Choisissez une boutique dans la liste ou créez-en une nouvelle</p>
                    </div>
                </div>
            `;
            editorTitle.textContent = 'Éditeur de Boutique';
            editorActions.style.display = 'none';
            return;
        }

        editorTitle.textContent = `Édition: ${this.currentShop.name || this.currentShop.shopId}`;
        editorActions.style.display = 'flex';

        editorContent.innerHTML = `
            <div class="shop-form-builder">
                ${this.renderBasicInfoSection()}
                ${this.renderLocationSection()}
                ${this.renderCommercialSection()}
                ${this.renderItemsSection()}
                ${this.renderShopKeeperSection()}
                ${this.renderAccessSection()}
                ${this.renderAdvancedSection()}
            </div>
        `;
    }

    renderBasicInfoSection() {
        const shop = this.currentShop;
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>📋 Informations de Base</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content active">
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">ID de la Boutique <span class="required">*</span></label>
                            <input type="text" class="form-input" id="shopId" value="${shop.shopId || ''}" 
                                   ${this.isEditMode ? 'readonly' : ''}>
                            <div class="field-help">Identifiant unique de la boutique</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Nom <span class="required">*</span></label>
                            <input type="text" class="form-input" id="shopName" value="${shop.name || ''}">
                            <div class="field-help">Nom affiché de la boutique</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Type <span class="required">*</span></label>
                            <select class="form-select" id="shopType">
                                ${this.renderShopTypeOptions(shop.type)}
                            </select>
                            <div class="field-help">Type de boutique</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Région</label>
                            <input type="text" class="form-input" id="shopRegion" value="${shop.region || ''}">
                            <div class="field-help">Région Pokémon (ex: Kanto, Johto)</div>
                        </div>
                    </div>
                    
                    <div class="fields-grid">
                        <div class="boolean-field">
                            <input type="checkbox" class="form-checkbox" id="shopIsActive" 
                                   ${shop.isActive !== false ? 'checked' : ''}>
                            <label class="checkbox-label" for="shopIsActive">Boutique active</label>
                        </div>
                        
                        <div class="boolean-field">
                            <input type="checkbox" class="form-checkbox" id="shopIsTemporary" 
                                   ${shop.isTemporary ? 'checked' : ''}>
                            <label class="checkbox-label" for="shopIsTemporary">Boutique temporaire</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderShopTypeOptions(selectedType) {
        const types = [
            { value: 'pokemart', label: 'Poké Mart' },
            { value: 'department', label: 'Grand Magasin' },
            { value: 'specialist', label: 'Spécialisé' },
            { value: 'gym_shop', label: 'Boutique d\'Arène' },
            { value: 'contest_shop', label: 'Boutique Concours' },
            { value: 'game_corner', label: 'Casino/Jeux' },
            { value: 'black_market', label: 'Marché Noir' },
            { value: 'trainer_shop', label: 'Boutique Dresseur' },
            { value: 'temporary', label: 'Temporaire' },
            { value: 'vending_machine', label: 'Distributeur' },
            { value: 'online_shop', label: 'Boutique en Ligne' }
        ];
        
        return types.map(type => 
            `<option value="${type.value}" ${selectedType === type.value ? 'selected' : ''}>${type.label}</option>`
        ).join('');
    }

    renderLocationSection() {
        const shop = this.currentShop;
        const location = shop.location || {};
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>📍 Localisation</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">Zone <span class="required">*</span></label>
                            <select class="form-select" id="shopZone">
                                <option value="">Sélectionner une zone</option>
                                ${this.zones.map(zone => 
                                    `<option value="${zone}" ${location.zone === zone ? 'selected' : ''}>${this.formatZoneName(zone)}</option>`
                                ).join('')}
                            </select>
                            <div class="field-help">Zone/carte où se trouve la boutique</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Ville</label>
                            <input type="text" class="form-input" id="shopCity" value="${location.city || ''}">
                            <div class="field-help">Nom de la ville</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Bâtiment</label>
                            <input type="text" class="form-input" id="shopBuilding" value="${location.building || ''}">
                            <div class="field-help">Nom du bâtiment</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCommercialSection() {
        const shop = this.currentShop;
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>💰 Configuration Commerciale</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">Devise <span class="required">*</span></label>
                            <select class="form-select" id="shopCurrency">
                                <option value="gold" ${shop.currency === 'gold' ? 'selected' : ''}>Gold</option>
                                <option value="battle_points" ${shop.currency === 'battle_points' ? 'selected' : ''}>Points de Combat</option>
                                <option value="contest_points" ${shop.currency === 'contest_points' ? 'selected' : ''}>Points de Concours</option>
                                <option value="game_tokens" ${shop.currency === 'game_tokens' ? 'selected' : ''}>Jetons</option>
                                <option value="rare_candy" ${shop.currency === 'rare_candy' ? 'selected' : ''}>Bonbons Rares</option>
                            </select>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Multiplicateur d'Achat</label>
                            <input type="number" class="form-input" id="shopBuyMultiplier" 
                                   value="${shop.buyMultiplier || 1.0}" min="0.1" max="10" step="0.1">
                            <div class="field-help">Multiplicateur pour les prix d'achat (défaut: 1.0)</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Multiplicateur de Vente</label>
                            <input type="number" class="form-input" id="shopSellMultiplier" 
                                   value="${shop.sellMultiplier || 0.5}" min="0.1" max="1" step="0.1">
                            <div class="field-help">Multiplicateur pour les prix de vente (défaut: 0.5)</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Taux de Taxe (%)</label>
                            <input type="number" class="form-input" id="shopTaxRate" 
                                   value="${shop.taxRate || 0}" min="0" max="50" step="0.5">
                            <div class="field-help">Taxe régionale en pourcentage</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderItemsSection() {
        const shop = this.currentShop;
        const items = shop.items || [];
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>📦 Articles en Vente (${items.length})</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div style="margin-bottom: 15px;">
                        <button class="btn btn-primary" onclick="adminPanel.shopEditor.addItem()">
                            <i class="fas fa-plus"></i> Ajouter Article
                        </button>
                        <button class="btn btn-secondary" onclick="adminPanel.shopEditor.importItemsFromTemplate()">
                            <i class="fas fa-copy"></i> Modèle
                        </button>
                    </div>
                    
                    <div id="shopItemsList">
                        ${items.length === 0 ? 
                            '<div style="text-align: center; padding: 20px; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 8px;">Aucun article configuré</div>' :
                            items.map((item, index) => this.renderShopItem(item, index)).join('')
                        }
                    </div>
                </div>
            </div>
        `;
    }

    renderShopItem(item, index) {
        const itemData = this.allItems[item.itemId] || {};
        
        return `
            <div class="shop-item-editor" data-index="${index}">
                <div class="item-header">
                    <div class="item-info">
                        <strong>${itemData.name || item.itemId}</strong>
                        <span class="item-category">${this.formatCategory(item.category)}</span>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.shopEditor.removeItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="fields-grid" style="margin-top: 10px;">
                    <div class="form-field">
                        <label class="field-label">ID Article</label>
                        <select class="form-select" onchange="adminPanel.shopEditor.updateItemId(${index}, this.value)">
                            ${this.renderItemOptions(item.itemId)}
                        </select>
                    </div>
                    
                    <div class="form-field">
                        <label class="field-label">Prix Personnalisé</label>
                        <input type="number" class="form-input" value="${item.basePrice || ''}" 
                               placeholder="Prix par défaut" min="0"
                               onchange="adminPanel.shopEditor.updateItemField(${index}, 'basePrice', this.value)">
                    </div>
                    
                    <div class="form-field">
                        <label class="field-label">Stock</label>
                        <input type="number" class="form-input" value="${item.stock || -1}" 
                               onchange="adminPanel.shopEditor.updateItemField(${index}, 'stock', this.value)">
                        <div class="field-help">-1 = illimité</div>
                    </div>
                    
                    <div class="form-field">
                        <label class="field-label">Niveau Requis</label>
                        <input type="number" class="form-input" value="${item.unlockLevel || ''}" 
                               min="1" max="100" placeholder="Optionnel"
                               onchange="adminPanel.shopEditor.updateItemField(${index}, 'unlockLevel', this.value)">
                    </div>
                </div>
                
                <div class="boolean-field" style="margin-top: 10px;">
                    <input type="checkbox" class="form-checkbox" id="featured_${index}" 
                           ${item.featured ? 'checked' : ''}
                           onchange="adminPanel.shopEditor.updateItemField(${index}, 'featured', this.checked)">
                    <label class="checkbox-label" for="featured_${index}">Article mis en avant</label>
                </div>
            </div>
        `;
    }

    renderItemOptions(selectedItemId) {
        if (!this.allItems || Object.keys(this.allItems).length === 0) {
            return '<option value="">Chargement des items...</option>';
        }

        let options = '<option value="">Sélectionner un item</option>';
        
        // Grouper les items par catégorie
        const itemsByCategory = {};
        Object.entries(this.allItems).forEach(([itemId, itemData]) => {
            const category = itemData.category || 'other';
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push({ id: itemId, ...itemData });
        });

        // Générer les options groupées
        Object.entries(itemsByCategory).forEach(([category, items]) => {
            options += `<optgroup label="${this.formatCategory(category)}">`;
            items.forEach(item => {
                const selected = selectedItemId === item.id ? 'selected' : '';
                options += `<option value="${item.id}" ${selected}>${item.name || item.id}</option>`;
            });
            options += '</optgroup>';
        });

        return options;
    }

    formatCategory(category) {
        const categories = {
            pokeballs: 'Poké Balls',
            medicine: 'Médicaments',
            berries: 'Baies',
            tms_hms: 'CTs & CSs',
            battle_items: 'Objets de Combat',
            held_items: 'Objets Tenus',
            key_items: 'Objets Clés',
            decorations: 'Décorations',
            clothes: 'Vêtements',
            accessories: 'Accessoires',
            contest_items: 'Objets Concours',
            rare_items: 'Objets Rares'
        };
        return categories[category] || category;
    }

    renderShopKeeperSection() {
        const shop = this.currentShop;
        const keeper = shop.shopKeeper || {};
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>👤 Marchand</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">ID NPC (Optionnel)</label>
                            <input type="number" class="form-input" id="keeperNpcId" 
                                   value="${keeper.npcId || ''}" placeholder="ID du NPC existant">
                            <div class="field-help">Référence vers un NPC existant</div>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Nom du Marchand</label>
                            <input type="text" class="form-input" id="keeperName" 
                                   value="${keeper.name || ''}" placeholder="Nom du marchand">
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Personnalité</label>
                            <select class="form-select" id="keeperPersonality">
                                <option value="">Sélectionner</option>
                                <option value="friendly" ${keeper.personality === 'friendly' ? 'selected' : ''}>Amical</option>
                                <option value="stern" ${keeper.personality === 'stern' ? 'selected' : ''}>Sévère</option>
                                <option value="cheerful" ${keeper.personality === 'cheerful' ? 'selected' : ''}>Joyeux</option>
                                <option value="mysterious" ${keeper.personality === 'mysterious' ? 'selected' : ''}>Mystérieux</option>
                                <option value="grumpy" ${keeper.personality === 'grumpy' ? 'selected' : ''}>Grincheux</option>
                                <option value="professional" ${keeper.personality === 'professional' ? 'selected' : ''}>Professionnel</option>
                            </select>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Spécialisation</label>
                            <input type="text" class="form-input" id="keeperSpecialization" 
                                   value="${keeper.specialization || ''}" placeholder="Ex: Expert en Poké Balls">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAccessSection() {
        const shop = this.currentShop;
        const access = shop.accessRequirements || {};
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>🔒 Conditions d'Accès</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">Niveau Minimum</label>
                            <input type="number" class="form-input" id="accessMinLevel" 
                                   value="${access.minLevel || ''}" min="1" max="100" placeholder="Optionnel">
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Badges Requis</label>
                            <textarea class="form-input" id="accessBadges" rows="3" 
                                      placeholder="Un badge par ligne">${(access.requiredBadges || []).join('\n')}</textarea>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Quêtes Requises</label>
                            <textarea class="form-input" id="accessQuests" rows="3" 
                                      placeholder="Une quête par ligne">${(access.requiredQuests || []).join('\n')}</textarea>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Membership Requis</label>
                            <select class="form-select" id="accessMembership">
                                <option value="">Aucun</option>
                                <option value="bronze" ${access.membershipRequired === 'bronze' ? 'selected' : ''}>Bronze</option>
                                <option value="silver" ${access.membershipRequired === 'silver' ? 'selected' : ''}>Argent</option>
                                <option value="gold" ${access.membershipRequired === 'gold' ? 'selected' : ''}>Or</option>
                                <option value="platinum" ${access.membershipRequired === 'platinum' ? 'selected' : ''}>Platine</option>
                            </select>
                        </div>
                    </div>
                    
                    ${this.renderTimeRestrictionsSection(access.timeRestrictions)}
                </div>
            </div>
        `;
    }

    renderTimeRestrictionsSection(timeRestrictions = {}) {
        return `
            <div style="margin-top: 20px; padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
                <h5 style="margin-bottom: 15px;">⏰ Horaires d'Ouverture</h5>
                
                <div class="fields-grid">
                    <div class="form-field">
                        <label class="field-label">Heure d'Ouverture</label>
                        <input type="number" class="form-input" id="timeOpenHour" 
                               value="${timeRestrictions.openHour || ''}" min="0" max="23" placeholder="0-23">
                    </div>
                    
                    <div class="form-field">
                        <label class="field-label">Heure de Fermeture</label>
                        <input type="number" class="form-input" id="timeCloseHour" 
                               value="${timeRestrictions.closeHour || ''}" min="0" max="23" placeholder="0-23">
                    </div>
                </div>
                
                <div class="form-field">
                    <label class="field-label">Jours Fermés</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px;">
                        ${['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day, index) => `
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" ${(timeRestrictions.closedDays || []).includes(index) ? 'checked' : ''} 
                                       onchange="adminPanel.shopEditor.updateClosedDay(${index}, this.checked)">
                                <span>${day}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderAdvancedSection() {
        const shop = this.currentShop;
        const restock = shop.restockInfo || {};
        
        return `
            <div class="form-section">
                <div class="section-header" onclick="this.parentElement.querySelector('.section-content').classList.toggle('active')">
                    <h4>⚙️ Configuration Avancée</h4>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <h5 style="margin-bottom: 15px;">🔄 Restock Automatique</h5>
                    
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">Intervalle (minutes)</label>
                            <input type="number" class="form-input" id="restockInterval" 
                                   value="${restock.interval || ''}" min="0" placeholder="0 = désactivé">
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Variation Stock (%)</label>
                            <input type="number" class="form-input" id="restockVariation" 
                                   value="${restock.stockVariation || 10}" min="0" max="100">
                        </div>
                        
                        <div class="boolean-field">
                            <input type="checkbox" class="form-checkbox" id="restockAuto" 
                                   ${restock.autoRestock !== false ? 'checked' : ''}>
                            <label class="checkbox-label" for="restockAuto">Restock automatique</label>
                        </div>
                    </div>
                    
                    <h5 style="margin: 20px 0 15px 0;">💬 Dialogues Personnalisés</h5>
                    
                    <div class="form-field">
                        <label class="field-label">Messages d'Accueil</label>
                        <textarea class="form-input" id="dialoguesWelcome" rows="3" 
                                  placeholder="Un message par ligne">${(shop.dialogues?.welcome || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="fields-grid">
                        <div class="form-field">
                            <label class="field-label">Messages d'Achat</label>
                            <textarea class="form-input" id="dialoguesPurchase" rows="2" 
                                      placeholder="Un message par ligne">${(shop.dialogues?.purchase || []).join('\n')}</textarea>
                        </div>
                        
                        <div class="form-field">
                            <label class="field-label">Messages d'Au Revoir</label>
                            <textarea class="form-input" id="dialoguesGoodbye" rows="2" 
                                      placeholder="Un message par ligne">${(shop.dialogues?.farewell || []).join('\n')}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Méthodes de gestion des items
    addItem() {
        if (!this.currentShop.items) {
            this.currentShop.items = [];
        }
        
        const newItem = {
            itemId: '',
            category: 'pokeballs',
            stock: -1,
            featured: false
        };
        
        this.currentShop.items.push(newItem);
        this.renderShopEditor();
    }

    removeItem(index) {
        if (confirm('Supprimer cet article de la boutique ?')) {
            this.currentShop.items.splice(index, 1);
            this.renderShopEditor();
        }
    }

    updateItemId(index, itemId) {
        if (!this.currentShop.items[index]) return;
        
        this.currentShop.items[index].itemId = itemId;
        
        // Auto-détecter la catégorie
        const itemData = this.allItems[itemId];
        if (itemData && itemData.category) {
            this.currentShop.items[index].category = itemData.category;
        }
        
        this.renderShopEditor();
    }

    updateItemField(index, field, value) {
        if (!this.currentShop.items[index]) return;
        
        // Conversion des types
        if (field === 'basePrice' || field === 'stock' || field === 'unlockLevel') {
            value = value ? parseInt(value) : undefined;
        }
        
        this.currentShop.items[index][field] = value;
    }

    updateClosedDay(dayIndex, isChecked) {
        if (!this.currentShop.accessRequirements) {
            this.currentShop.accessRequirements = {};
        }
        if (!this.currentShop.accessRequirements.timeRestrictions) {
            this.currentShop.accessRequirements.timeRestrictions = {};
        }
        if (!this.currentShop.accessRequirements.timeRestrictions.closedDays) {
            this.currentShop.accessRequirements.timeRestrictions.closedDays = [];
        }
        
        const closedDays = this.currentShop.accessRequirements.timeRestrictions.closedDays;
        const index = closedDays.indexOf(dayIndex);
        
        if (isChecked && index === -1) {
            closedDays.push(dayIndex);
        } else if (!isChecked && index > -1) {
            closedDays.splice(index, 1);
        }
    }

    // Méthodes de gestion principale
    async createNewShop() {
        console.log('🏪 [ShopEditor] Creating new shop');
        
        this.currentShop = {
            shopId: `shop_${Date.now()}`,
            name: 'Nouvelle Boutique',
            type: 'pokemart',
            location: {
                zone: this.selectedZone || '',
                city: '',
                building: ''
            },
            currency: 'gold',
            buyMultiplier: 1.0,
            sellMultiplier: 0.5,
            items: [],
            isActive: true,
            isTemporary: false
        };
        
        this.isEditMode = false;
        this.renderShopEditor();
        
        // Scroll vers l'éditeur
        document.getElementById('editorContent').scrollIntoView({ behavior: 'smooth' });
    }

    async saveShop() {
        try {
            console.log('💾 [ShopEditor] Saving shop...');
            
            // Collecter les données du formulaire
            const shopData = this.collectFormData();
            
            // Validation
            const validation = this.validateShopData(shopData);
            if (!validation.valid) {
                this.adminPanel.showNotification(`Erreur de validation: ${validation.errors.join(', ')}`, 'error');
                return;
            }
            
            // Sauvegarder
            let endpoint, method;
            if (this.isEditMode) {
                endpoint = `/shops/${shopData.shopId}`;
                method = 'PUT';
            } else {
                endpoint = '/shops';
                method = 'POST';
            }
            
            const response = await this.adminPanel.apiCall(endpoint, {
                method,
                body: JSON.stringify(shopData)
            });
            
            this.adminPanel.showNotification(
                this.isEditMode ? 'Boutique mise à jour avec succès' : 'Boutique créée avec succès', 
                'success'
            );
            
            this.currentShop = response.shop;
            this.isEditMode = true;
            await this.loadShops();
            
        } catch (error) {
            console.error('❌ [ShopEditor] Error saving shop:', error);
            this.adminPanel.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    collectFormData() {
        const data = {
            shopId: document.getElementById('shopId')?.value || '',
            name: document.getElementById('shopName')?.value || '',
            type: document.getElementById('shopType')?.value || 'pokemart',
            region: document.getElementById('shopRegion')?.value || '',
            location: {
                zone: document.getElementById('shopZone')?.value || '',
                city: document.getElementById('shopCity')?.value || '',
                building: document.getElementById('shopBuilding')?.value || ''
            },
            currency: document.getElementById('shopCurrency')?.value || 'gold',
            buyMultiplier: parseFloat(document.getElementById('shopBuyMultiplier')?.value) || 1.0,
            sellMultiplier: parseFloat(document.getElementById('shopSellMultiplier')?.value) || 0.5,
            taxRate: parseFloat(document.getElementById('shopTaxRate')?.value) || 0,
            isActive: document.getElementById('shopIsActive')?.checked !== false,
            isTemporary: document.getElementById('shopIsTemporary')?.checked || false,
            items: this.currentShop?.items || []
        };
        
        // Marchand
        const keeperNpcId = document.getElementById('keeperNpcId')?.value;
        const keeperName = document.getElementById('keeperName')?.value;
        const keeperPersonality = document.getElementById('keeperPersonality')?.value;
        const keeperSpecialization = document.getElementById('keeperSpecialization')?.value;
        
        if (keeperNpcId || keeperName || keeperPersonality || keeperSpecialization) {
            data.shopKeeper = {
                npcId: keeperNpcId ? parseInt(keeperNpcId) : undefined,
                name: keeperName || '',
                personality: keeperPersonality || 'friendly',
                specialization: keeperSpecialization || ''
            };
        }
        
        // Conditions d'accès
        const minLevel = document.getElementById('accessMinLevel')?.value;
        const badges = document.getElementById('accessBadges')?.value;
        const quests = document.getElementById('accessQuests')?.value;
        const membership = document.getElementById('accessMembership')?.value;
        
        if (minLevel || badges || quests || membership) {
            data.accessRequirements = {
                minLevel: minLevel ? parseInt(minLevel) : undefined,
                requiredBadges: badges ? badges.split('\n').filter(b => b.trim()) : undefined,
                requiredQuests: quests ? quests.split('\n').filter(q => q.trim()) : undefined,
                membershipRequired: membership || undefined
            };
        }
        
        // Restock
        const restockInterval = document.getElementById('restockInterval')?.value;
        const restockVariation = document.getElementById('restockVariation')?.value;
        const restockAuto = document.getElementById('restockAuto')?.checked;
        
        if (restockInterval) {
            data.restockInfo = {
                interval: parseInt(restockInterval),
                autoRestock: restockAuto,
                stockVariation: parseInt(restockVariation) || 10,
                lastRestock: new Date()
            };
        }
        
        return data;
    }

    validateShopData(data) {
        const errors = [];
        
        if (!data.shopId || data.shopId.trim().length === 0) {
            errors.push('ID de boutique requis');
        }
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Nom de boutique requis');
        }
        
        if (!data.location.zone || data.location.zone.trim().length === 0) {
            errors.push('Zone requise');
        }
        
        if (data.buyMultiplier <= data.sellMultiplier) {
            errors.push('Le multiplicateur d\'achat doit être supérieur au multiplicateur de vente');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    async duplicateShop() {
        if (!this.currentShop) return;
        
        if (confirm('Dupliquer cette boutique ?')) {
            try {
                const response = await this.adminPanel.apiCall(`/shops/${this.currentShop.shopId}/duplicate`, {
                    method: 'POST'
                });
                
                this.adminPanel.showNotification('Boutique dupliquée avec succès', 'success');
                await this.loadShops();
                
            } catch (error) {
                console.error('❌ [ShopEditor] Error duplicating shop:', error);
                this.adminPanel.showNotification('Erreur lors de la duplication', 'error');
            }
        }
    }

    async deleteShop() {
        if (!this.currentShop) return;
        
        if (confirm(`Supprimer définitivement la boutique "${this.currentShop.name}" ?`)) {
            try {
                await this.adminPanel.apiCall(`/shops/${this.currentShop.shopId}`, {
                    method: 'DELETE'
                });
                
                this.adminPanel.showNotification('Boutique supprimée avec succès', 'success');
                this.currentShop = null;
                this.renderShopEditor();
                await this.loadShops();
                
            } catch (error) {
                console.error('❌ [ShopEditor] Error deleting shop:', error);
                this.adminPanel.showNotification('Erreur lors de la suppression', 'error');
            }
        }
    }

    cancelEdit() {
        this.currentShop = null;
        this.isEditMode = false;
        this.renderShopEditor();
        this.renderShopsList();
    }

    async refreshShops() {
        await this.loadShops();
        await this.loadShopsStats();
        this.adminPanel.showNotification('Liste des boutiques actualisée', 'success');
    }

    filterShops(searchTerm) {
        // Implémentation de filtrage côté client
        const shopItems = document.querySelectorAll('.shop-item');
        searchTerm = searchTerm.toLowerCase();
        
        shopItems.forEach(item => {
            const shopName = item.querySelector('.shop-name').textContent.toLowerCase();
            const shopType = item.querySelector('.shop-type').textContent.toLowerCase();
            const shopZone = item.querySelector('.shop-zone').textContent.toLowerCase();
            
            const matches = shopName.includes(searchTerm) || 
                          shopType.includes(searchTerm) || 
                          shopZone.includes(searchTerm);
            
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    filterByType(type) {
        const shopItems = document.querySelectorAll('.shop-item');
        
        shopItems.forEach(item => {
            if (!type) {
                item.style.display = 'flex';
                return;
            }
            
            const shopTypeSpan = item.querySelector('.shop-type');
            const shopType = shopTypeSpan.textContent;
            const matches = this.formatShopType(type) === shopType;
            
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    updateStatsDisplay(stats) {
        if (!stats) return;
        
        document.getElementById('totalShops').textContent = stats.total || 0;
        document.getElementById('activeShops').textContent = stats.active || 0;
        document.getElementById('temporaryShops').textContent = stats.temporary || 0;
        document.getElementById('shopTypes').textContent = Object.keys(stats.byType || {}).length;
    }

    async importShops() {
        // TODO: Implémenter l'import depuis JSON
        this.adminPanel.showNotification('Fonctionnalité d\'import en développement', 'info');
    }

    async exportShops() {
        try {
            const response = await this.adminPanel.apiCall('/shops/export/all');
            
            // Télécharger le fichier JSON
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shops_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.adminPanel.showNotification('Export terminé avec succès', 'success');
            
        } catch (error) {
            console.error('❌ [ShopEditor] Error exporting shops:', error);
            this.adminPanel.showNotification('Erreur lors de l\'export', 'error');
        }
    }

    importItemsFromTemplate() {
        // Templates d'items prédéfinis selon le type de boutique
        const templates = {
            pokemart: [
                { itemId: 'pokeball', category: 'pokeballs', stock: 50 },
                { itemId: 'great_ball', category: 'pokeballs', stock: 30 },
                { itemId: 'potion', category: 'medicine', stock: 40 },
                { itemId: 'super_potion', category: 'medicine', stock: 25 }
            ],
            department: [
                { itemId: 'pokeball', category: 'pokeballs', stock: 100 },
                { itemId: 'great_ball', category: 'pokeballs', stock: 50 },
                { itemId: 'ultra_ball', category: 'pokeballs', stock: 20 },
                { itemId: 'potion', category: 'medicine', stock: 80 },
                { itemId: 'super_potion', category: 'medicine', stock: 60 },
                { itemId: 'hyper_potion', category: 'medicine', stock: 40 }
            ]
        };
        
        const shopType = this.currentShop?.type || 'pokemart';
        const template = templates[shopType] || templates.pokemart;
        
        if (confirm(`Ajouter ${template.length} articles du modèle "${this.formatShopType(shopType)}" ?`)) {
            if (!this.currentShop.items) {
                this.currentShop.items = [];
            }
            
            template.forEach(item => {
                this.currentShop.items.push({ ...item });
            });
            
            this.renderShopEditor();
            this.adminPanel.showNotification(`${template.length} articles ajoutés depuis le modèle`, 'success');
        }
    }

    cleanup() {
        // Nettoyage lors de la fermeture du module
        this.currentShop = null;
        this.selectedZone = null;
        this.allShops = [];
    }
}
