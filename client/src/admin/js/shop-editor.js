// client/src/admin/js/shop-editor.js - Module d'édition des boutiques REFAIT

export class ShopEditorModule {
    constructor(adminPanel) {
        this.name = 'shopEditor';
        this.adminPanel = adminPanel;
        this.currentShop = null;
        this.selectedZone = null;
        this.allShops = [];
        this.allItems = {};
        this.isEditMode = false;
        this.availableZones = [];
        
        console.log('🏪 [ShopEditor] Module initialized');
        this.init();
    }

    async init() {
        try {
            console.log('🏪 [ShopEditor] Starting initialization...');
            
            // Charger les zones depuis le fichier de config
            this.loadZonesFromConfig();
            
            console.log('✅ [ShopEditor] Initialization completed');
        } catch (error) {
            console.error('❌ [ShopEditor] Initialization failed:', error);
        }
    }

    loadZonesFromConfig() {
        // Import des zones depuis le fichier de configuration
        this.availableZones = [
            { id: 'beach', name: '🏖️ Plage', description: 'Zone de plage avec boutiques touristiques' },
            { id: 'village', name: '🏘️ Village', description: 'Village principal avec commerces de base' },
            { id: 'lavandia', name: '🏙️ Lavandia', description: 'Grande ville avec centres commerciaux' },
            { id: 'road1', name: '🛤️ Route 1', description: 'Route avec magasins de voyage' },
            { id: 'road2', name: '🛤️ Route 2', description: 'Route intermédiaire' },
            { id: 'road3', name: '🛤️ Route 3', description: 'Route avancée avec équipements' },
            { id: 'noctherbcave1', name: '🕳️ Grotte Noctherb 1', description: 'Première grotte' },
            { id: 'noctherbcave2', name: '🕳️ Grotte Noctherb 2', description: 'Deuxième grotte' },
            { id: 'wraithmoor', name: '👻 Lande Spectrale', description: 'Zone mystérieuse' }
        ];
        
        console.log(`✅ [ShopEditor] ${this.availableZones.length} zones loaded from config`);
    }

    onTabActivated() {
        console.log('🏪 [ShopEditor] Tab activated');
        
        try {
            this.render();
            this.loadInitialData();
        } catch (error) {
            console.error('❌ [ShopEditor] Error in onTabActivated:', error);
        }
    }

    async loadInitialData() {
        try {
            console.log('🏪 [ShopEditor] Loading initial data...');
            
            await Promise.all([
                this.loadAllItems(),
                this.loadShopsStats()
            ]);
            
            console.log('✅ [ShopEditor] All initial data loaded successfully');
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

    render() {
        const container = document.getElementById('shops');
        if (!container) return;

        container.innerHTML = `
            <div class="shops-editor-container">
                <!-- Header avec stats et contrôles -->
                <div class="shops-editor-header">
                    <div class="shops-header-controls">
                        <div class="shops-zone-selector">
                            <label for="shopsZoneSelect" class="shops-field-label">🗺️ Zone:</label>
                            <select id="shopsZoneSelect" class="shops-form-select" onchange="adminPanel.shopEditor.selectZone(this.value)">
                                <option value="">Toutes les zones</option>
                                ${this.availableZones.map(zone => 
                                    `<option value="${zone.id}">${zone.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="shops-header-actions">
                            <button class="shops-btn shops-btn-success" onclick="adminPanel.shopEditor.createNewShop()">
                                <i class="fas fa-plus"></i> Nouvelle Boutique
                            </button>
                            <button class="shops-btn shops-btn-info" onclick="adminPanel.shopEditor.refreshShops()">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                            <button class="shops-btn shops-btn-secondary" onclick="adminPanel.shopEditor.exportShops()">
                                <i class="fas fa-download"></i> Exporter
                            </button>
                        </div>
                    </div>

                    <div class="shops-zone-stats" id="shopsStats">
                        <div class="shops-stats-row">
                            <div class="shops-stat-item">
                                <div class="shops-stat-value" id="shopsTotalShops">0</div>
                                <div class="shops-stat-label">Total</div>
                            </div>
                            <div class="shops-stat-item">
                                <div class="shops-stat-value" id="shopsActiveShops">0</div>
                                <div class="shops-stat-label">Actives</div>
                            </div>
                            <div class="shops-stat-item">
                                <div class="shops-stat-value" id="shopsTemporaryShops">0</div>
                                <div class="shops-stat-label">Temporaires</div>
                            </div>
                            <div class="shops-stat-item">
                                <div class="shops-stat-value" id="shopsShopTypes">0</div>
                                <div class="shops-stat-label">Types</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="shops-main-area">
                    <!-- Panel liste des boutiques -->
                    <div class="shops-list-panel">
                        <div class="shops-list-header">
                            <h3>Boutiques</h3>
                            <div class="shops-list-filters">
                                <input type="text" class="shops-search-input" id="shopsSearchInput" 
                                       placeholder="Rechercher boutiques..." 
                                       oninput="adminPanel.shopEditor.filterShops(this.value)">
                                <select class="shops-type-filter" id="shopsTypeFilter" onchange="adminPanel.shopEditor.filterByType(this.value)">
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
                        
                        <div class="shops-list-container" id="shopsListContainer">
                            <div class="shops-empty-list">
                                <div style="text-align: center; padding: 40px; color: #6c757d;">
                                    <i class="fas fa-store" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                                    <p>Aucune boutique trouvée</p>
                                    <button class="shops-btn shops-btn-primary" onclick="adminPanel.shopEditor.createNewShop()">
                                        Créer la première boutique
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel éditeur -->
                    <div class="shops-editor-panel">
                        <div class="shops-editor-header-panel">
                            <h3 class="shops-editor-title" id="shopsEditorTitle">Éditeur de Boutique</h3>
                            <div class="shops-editor-actions" id="shopsEditorActions" style="display: none;">
                                <button class="shops-btn shops-btn-success" onclick="adminPanel.shopEditor.saveShop()">
                                    <i class="fas fa-save"></i> Sauvegarder
                                </button>
                                <button class="shops-btn shops-btn-warning" onclick="adminPanel.shopEditor.duplicateShop()">
                                    <i class="fas fa-copy"></i> Dupliquer
                                </button>
                                <button class="shops-btn shops-btn-danger" onclick="adminPanel.shopEditor.deleteShop()">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                                <button class="shops-btn shops-btn-secondary" onclick="adminPanel.shopEditor.cancelEdit()">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                            </div>
                        </div>
                        
                        <div class="shops-editor-content" id="shopsEditorContent">
                            <div class="shops-no-selection">
                                <i class="fas fa-store"></i>
                                <h3>Aucune boutique sélectionnée</h3>
                                <p>Choisissez une boutique dans la liste ou créez-en une nouvelle</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
        const shopsList = document.getElementById('shopsListContainer');
        if (!shopsList) return;

        if (this.allShops.length === 0) {
            shopsList.innerHTML = `
                <div class="shops-empty-list">
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-store" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>Aucune boutique trouvée</p>
                        <button class="shops-btn shops-btn-primary" onclick="adminPanel.shopEditor.createNewShop()">
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
            <div class="shops-list-item ${isSelected ? 'shops-item-selected' : ''}" 
                 onclick="adminPanel.shopEditor.selectShop('${shop.shopId}')">
                
                <div class="shops-item-icon">
                    ${this.getShopTypeIcon(shop.type)}
                </div>
                
                <div class="shops-item-info">
                    <div class="shops-item-name">${shop.name || shop.shopId}</div>
                    <div class="shops-item-details">
                        <span class="shops-item-type">${this.formatShopType(shop.type)}</span>
                        <span class="shops-item-zone">${shop.location?.zone || 'Zone inconnue'}</span>
                        <span class="shops-item-currency">${this.formatCurrency(shop.currency)}</span>
                        ${shop.isTemporary ? '<span class="shops-item-temp">TEMP</span>' : ''}
                        ${!shop.isActive ? '<span class="shops-item-inactive">INACTIF</span>' : ''}
                    </div>
                    <div class="shops-item-stats">
                        <span>${shop.itemCount || 0} articles</span>
                    </div>
                </div>
                
                <div class="shops-item-status">
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
            game_corner: '🎰',
            temporary: '⏰'
        };
        return icons[type] || '🏪';
    }

    formatShopType(type) {
        const types = {
            pokemart: 'Poké Mart',
            department: 'Grand Magasin',
            specialist: 'Spécialisé',
            gym_shop: 'Boutique d\'Arène',
            game_corner: 'Casino',
            temporary: 'Temporaire'
        };
        return types[type] || type;
    }

    formatCurrency(currency) {
        const currencies = {
            gold: '💰 Gold',
            battle_points: '⚔️ Points Combat',
            game_tokens: '🎰 Jetons'
        };
        return currencies[currency] || currency;
    }

    async selectShop(shopId) {
        try {
            console.log(`🏪 [ShopEditor] Selecting shop: ${shopId}`);
            
            const response = await this.adminPanel.apiCall(`/shops/details/${shopId}`);
            this.currentShop = response.shop;
            
            this.isEditMode = true;
            this.renderShopEditor();
            this.renderShopsList();
            
        } catch (error) {
            console.error('❌ [ShopEditor] Error selecting shop:', error);
            this.adminPanel.showNotification('Erreur lors de la sélection de la boutique', 'error');
        }
    }

    renderShopEditor() {
        const editorContent = document.getElementById('shopsEditorContent');
        const editorTitle = document.getElementById('shopsEditorTitle');
        const editorActions = document.getElementById('shopsEditorActions');
        
        if (!editorContent) return;

        if (!this.currentShop) {
            editorContent.innerHTML = `
                <div class="shops-no-selection">
                    <i class="fas fa-store"></i>
                    <h3>Aucune boutique sélectionnée</h3>
                    <p>Choisissez une boutique dans la liste ou créez-en une nouvelle</p>
                </div>
            `;
            editorTitle.textContent = 'Éditeur de Boutique';
            editorActions.style.display = 'none';
            return;
        }

        editorTitle.textContent = `Édition: ${this.currentShop.name || this.currentShop.shopId}`;
        editorActions.style.display = 'flex';

editorContent.innerHTML = `
    <div class="shops-form-builder">
        <div class="shops-form-sections">
            ${this.renderBasicInfoSection()}
            ${this.renderLocationSection()}
            ${this.renderCommercialSection()}
            ${this.renderStockSection()}
            ${this.renderAccessRequirementsSection()}
            ${this.renderShopKeeperSection()}
            ${this.renderDialoguesSection()}
            ${this.renderItemsSection()}
        </div>
    </div>
`;
    }

    renderBasicInfoSection() {
        const shop = this.currentShop;
        
        return `
            <div class="shops-form-section">
                <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                    <h4 class="shops-section-title">📋 Informations de Base</h4>
                    <span class="shops-section-toggle">▼</span>
                </div>
                <div class="shops-section-content shops-section-active">
                    <div class="shops-fields-grid">
                        <div class="shops-form-field">
                            <label class="shops-field-label">ID de la Boutique <span class="shops-field-required">*</span></label>
                            <input type="text" class="shops-form-input" id="shopsShopId" value="${shop.shopId || ''}" 
                                   ${this.isEditMode ? 'readonly' : ''}>
                        </div>
                        
<div class="shops-fields-grid">
    <div class="shops-form-field">
        <label class="shops-field-label">ID de la Boutique <span class="shops-field-required">*</span></label>
        <input type="text" class="shops-form-input" id="shopsShopId" value="${shop.shopId || ''}" 
               ${this.isEditMode ? 'readonly' : ''}>
    </div>
    
    <div class="shops-form-field">
        <label class="shops-field-label">Clé de nom (Localisation) <span class="shops-field-required">*</span></label>
        <input type="text" class="shops-form-input" id="shopsShopNameKey" value="${shop.nameKey || `shop.name.${shop.shopId || ''}`}">
        <div class="shops-field-help">ID de localisation pour le nom</div>
    </div>
    
    <div class="shops-form-field">
        <label class="shops-field-label">Type <span class="shops-field-required">*</span></label>
        <select class="shops-form-select" id="shopsShopType">
            ${this.renderShopTypeOptions(shop.type)}
        </select>
    </div>
    
    <div class="shops-form-field">
        <label class="shops-field-label">Région</label>
        <select class="shops-form-select" id="shopsShopRegion">
            <option value="">Aucune région</option>
            <option value="kanto" ${shop.region === 'kanto' ? 'selected' : ''}>Kanto</option>
            <option value="johto" ${shop.region === 'johto' ? 'selected' : ''}>Johto</option>
            <option value="hoenn" ${shop.region === 'hoenn' ? 'selected' : ''}>Hoenn</option>
            <option value="sinnoh" ${shop.region === 'sinnoh' ? 'selected' : ''}>Sinnoh</option>
            <option value="unova" ${shop.region === 'unova' ? 'selected' : ''}>Unova</option>
            <option value="kalos" ${shop.region === 'kalos' ? 'selected' : ''}>Kalos</option>
            <option value="alola" ${shop.region === 'alola' ? 'selected' : ''}>Alola</option>
            <option value="galar" ${shop.region === 'galar' ? 'selected' : ''}>Galar</option>
            <option value="paldea" ${shop.region === 'paldea' ? 'selected' : ''}>Paldea</option>
        </select>
    </div>
    
    <div class="shops-form-field">
        <label class="shops-field-label">Devise</label>
        <select class="shops-form-select" id="shopsShopCurrency">
            <option value="gold" ${shop.currency === 'gold' ? 'selected' : ''}>Gold</option>
            <option value="battle_points" ${shop.currency === 'battle_points' ? 'selected' : ''}>Points de Combat</option>
            <option value="contest_points" ${shop.currency === 'contest_points' ? 'selected' : ''}>Points de Concours</option>
            <option value="game_tokens" ${shop.currency === 'game_tokens' ? 'selected' : ''}>Jetons</option>
            <option value="rare_candy" ${shop.currency === 'rare_candy' ? 'selected' : ''}>Super Bonbon</option>
        </select>
    </div>
    
    <div class="shops-form-field">
        <label class="shops-field-label">Version</label>
        <input type="text" class="shops-form-input" id="shopsShopVersion" value="${shop.version || '1.0.0'}">
    </div>
</div>
                    
                    <div class="shops-fields-grid">
                        <div class="shops-boolean-field">
                            <input type="checkbox" class="shops-form-checkbox" id="shopsShopIsActive" 
                                   ${shop.isActive !== false ? 'checked' : ''}>
                            <label class="shops-checkbox-label" for="shopsShopIsActive">Boutique active</label>
                        </div>
                        
                        <div class="shops-boolean-field">
                            <input type="checkbox" class="shops-form-checkbox" id="shopsShopIsTemporary" 
                                   ${shop.isTemporary ? 'checked' : ''}>
                            <label class="shops-checkbox-label" for="shopsShopIsTemporary">Boutique temporaire</label>
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
            { value: 'game_corner', label: 'Casino/Jeux' },
            { value: 'temporary', label: 'Temporaire' }
        ];
        
        return types.map(type => 
            `<option value="${type.value}" ${selectedType === type.value ? 'selected' : ''}>${type.label}</option>`
        ).join('');
    }

    renderLocationSection() {
        const shop = this.currentShop;
        const location = shop.location || {};
        
        return `
            <div class="shops-form-section">
                <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                    <h4 class="shops-section-title">📍 Localisation</h4>
                    <span class="shops-section-toggle">▼</span>
                </div>
                <div class="shops-section-content">
                    <div class="shops-fields-grid">
                        <div class="shops-form-field">
                            <label class="shops-field-label">Zone <span class="shops-field-required">*</span></label>
                            <select class="shops-form-select" id="shopsShopZone">
                                <option value="">Sélectionner une zone</option>
                                ${this.availableZones.map(zone => 
                                    `<option value="${zone.id}" ${location.zone === zone.id ? 'selected' : ''}>${zone.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
<div class="shops-form-field">
    <label class="shops-field-label">Clé de ville (Localisation)</label>
    <input type="text" class="shops-form-input" id="shopsShopCityKey" value="${location.cityKey || ''}">
    <div class="shops-field-help">ID de localisation (ex: location.city.lavender_town)</div>
</div>

<div class="shops-form-field">
    <label class="shops-field-label">Clé de bâtiment (Localisation)</label>
    <input type="text" class="shops-form-input" id="shopsShopBuildingKey" value="${location.buildingKey || ''}">
    <div class="shops-field-help">ID de localisation (ex: location.building.pokemon_center)</div>
</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCommercialSection() {
        const shop = this.currentShop;
        
        return `
            <div class="shops-form-section">
                <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                    <h4 class="shops-section-title">💰 Configuration Commerciale</h4>
                    <span class="shops-section-toggle">▼</span>
                </div>
                <div class="shops-section-content">
                    <div class="shops-fields-grid">
                        <div class="shops-form-field">
                            <label class="shops-field-label">Multiplicateur d'Achat</label>
                            <input type="number" class="shops-form-input" id="shopsShopBuyMultiplier" 
                                   value="${shop.buyMultiplier || 1.0}" min="0.1" max="10" step="0.1">
                        </div>
                        
                        <div class="shops-form-field">
                            <label class="shops-field-label">Multiplicateur de Vente</label>
                            <input type="number" class="shops-form-input" id="shopsShopSellMultiplier" 
                                   value="${shop.sellMultiplier || 0.5}" min="0.1" max="1" step="0.1">
                        </div>
                        <div class="shops-form-field">
    <label class="shops-field-label">Taux de Taxe (%)</label>
    <input type="number" class="shops-form-input" id="shopsShopTaxRate" 
           value="${shop.taxRate || 0}" min="0" max="50" step="0.1">
    <div class="shops-field-help">Taxe régionale appliquée aux achats</div>
</div>
                    </div>
                </div>
            </div>
        `;
    }
    renderStockSection() {
    const shop = this.currentShop;
    const restockInfo = shop.restockInfo || {};
    
    return `
        <div class="shops-form-section">
            <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                <h4 class="shops-section-title">📦 Système de Stock</h4>
                <span class="shops-section-toggle">▼</span>
            </div>
            <div class="shops-section-content">
                <div class="shops-boolean-field">
                    <input type="checkbox" class="shops-form-checkbox" id="shopsStockAutoRestock" 
                           ${restockInfo.autoRestock !== false ? 'checked' : ''}>
                    <label class="shops-checkbox-label" for="shopsStockAutoRestock">Restock automatique</label>
                </div>
                
                <div class="shops-fields-grid">
                    <div class="shops-form-field">
                        <label class="shops-field-label">Intervalle de Restock (minutes)</label>
                        <input type="number" class="shops-form-input" id="shopsStockInterval" 
                               value="${restockInfo.interval || 60}" min="1">
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Variation du Stock (%)</label>
                        <input type="number" class="shops-form-input" id="shopsStockVariation" 
                               value="${restockInfo.stockVariation || 10}" min="0" max="100">
                        <div class="shops-field-help">Variation aléatoire du stock lors du restock</div>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Dernier Restock</label>
                        <input type="datetime-local" class="shops-form-input" id="shopsStockLastRestock" 
                               value="${restockInfo.lastRestock ? new Date(restockInfo.lastRestock).toISOString().slice(0, 16) : ''}">
                    </div>
                </div>
            </div>
        </div>
    `;
}

renderAccessRequirementsSection() {
    const shop = this.currentShop;
    const access = shop.accessRequirements || {};
    const timeRestrictions = access.timeRestrictions || {};
    
    return `
        <div class="shops-form-section">
            <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                <h4 class="shops-section-title">🔒 Conditions d'Accès</h4>
                <span class="shops-section-toggle">▼</span>
            </div>
            <div class="shops-section-content">
                <div class="shops-fields-grid">
                    <div class="shops-form-field">
                        <label class="shops-field-label">Niveau Minimum</label>
                        <input type="number" class="shops-form-input" id="shopsAccessMinLevel" 
                               value="${access.minLevel || ''}" min="1" max="100">
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Badges Requis</label>
                        <input type="text" class="shops-form-input" id="shopsAccessRequiredBadges" 
                               value="${(access.requiredBadges || []).join(', ')}" 
                               placeholder="boulder, cascade, thunder">
                        <div class="shops-field-help">Séparer par des virgules</div>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Quêtes Requises</label>
                        <input type="text" class="shops-form-input" id="shopsAccessRequiredQuests" 
                               value="${(access.requiredQuests || []).join(', ')}" 
                               placeholder="quest_elite_four, quest_champion">
                        <div class="shops-field-help">Séparer par des virgules</div>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Membership Requis</label>
                        <input type="text" class="shops-form-input" id="shopsAccessMembershipRequired" 
                               value="${access.membershipRequired || ''}" 
                               placeholder="vip, premium, elite">
                    </div>
                </div>
                
                <div class="shops-subsection">
                    <h5 class="shops-subsection-title">⏰ Horaires d'Ouverture</h5>
                    <div class="shops-fields-grid">
                        <div class="shops-form-field">
                            <label class="shops-field-label">Heure d'Ouverture</label>
                            <input type="number" class="shops-form-input" id="shopsTimeOpenHour" 
                                   value="${timeRestrictions.openHour || ''}" min="0" max="23">
                        </div>
                        
                        <div class="shops-form-field">
                            <label class="shops-field-label">Heure de Fermeture</label>
                            <input type="number" class="shops-form-input" id="shopsTimeCloseHour" 
                                   value="${timeRestrictions.closeHour || ''}" min="0" max="23">
                        </div>
                        
                        <div class="shops-form-field">
                            <label class="shops-field-label">Jours Fermés</label>
                            <input type="text" class="shops-form-input" id="shopsTimeClosedDays" 
                                   value="${(timeRestrictions.closedDays || []).join(', ')}" 
                                   placeholder="0, 6 (0=Dimanche, 6=Samedi)">
                            <div class="shops-field-help">0=Dimanche, 1=Lundi, ..., 6=Samedi</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

renderShopKeeperSection() {
    const shop = this.currentShop;
    const shopKeeper = shop.shopKeeper || {};
    
    return `
        <div class="shops-form-section">
            <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                <h4 class="shops-section-title">👤 Marchand</h4>
                <span class="shops-section-toggle">▼</span>
            </div>
            <div class="shops-section-content">
                <div class="shops-fields-grid">
                    <div class="shops-form-field">
                        <label class="shops-field-label">ID NPC (optionnel)</label>
                        <input type="number" class="shops-form-input" id="shopsKeeperNpcId" 
                               value="${shopKeeper.npcId || ''}" min="1">
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Clé de Nom (Localisation)</label>
                        <input type="text" class="shops-form-input" id="shopsKeeperNameKey" 
                               value="${shopKeeper.nameKey || `npc.shopkeeper.${shop.shopId || 'default'}`}">
                        <div class="shops-field-help">ID de localisation pour le nom du marchand</div>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Personnalité</label>
                        <select class="shops-form-select" id="shopsKeeperPersonality">
                            <option value="friendly" ${shopKeeper.personalityKey === 'friendly' ? 'selected' : ''}>Amical</option>
                            <option value="stern" ${shopKeeper.personalityKey === 'stern' ? 'selected' : ''}>Sévère</option>
                            <option value="cheerful" ${shopKeeper.personalityKey === 'cheerful' ? 'selected' : ''}>Joyeux</option>
                            <option value="mysterious" ${shopKeeper.personalityKey === 'mysterious' ? 'selected' : ''}>Mystérieux</option>
                            <option value="grumpy" ${shopKeeper.personalityKey === 'grumpy' ? 'selected' : ''}>Grincheux</option>
                            <option value="professional" ${shopKeeper.personalityKey === 'professional' ? 'selected' : ''}>Professionnel</option>
                        </select>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Spécialisation (Localisation)</label>
                        <input type="text" class="shops-form-input" id="shopsKeeperSpecialization" 
                               value="${shopKeeper.specializationKey || ''}">
                        <div class="shops-field-help">ID de localisation pour la spécialisation</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

renderDialoguesSection() {
    const shop = this.currentShop;
    const dialogues = shop.dialogues || {};
    
    return `
        <div class="shops-form-section">
            <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                <h4 class="shops-section-title">💬 Dialogues (IDs de Localisation)</h4>
                <span class="shops-section-toggle">▼</span>
            </div>
            <div class="shops-section-content">
                <div class="shops-fields-grid">
                    <div class="shops-form-field">
                        <label class="shops-field-label">Messages d'Accueil</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesWelcome" rows="3">${(dialogues.welcomeKeys || []).join('\n')}</textarea>
                        <div class="shops-field-help">Un ID de localisation par ligne</div>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Messages d'Achat</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesPurchase" rows="3">${(dialogues.purchaseKeys || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Messages de Vente</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesSale" rows="3">${(dialogues.saleKeys || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Pas Assez d'Argent</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesNoMoney" rows="3">${(dialogues.notEnoughMoneyKeys || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Messages d'Au Revoir</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesGoodbye" rows="3">${(dialogues.comeBackLaterKeys || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Boutique Fermée</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesClosed" rows="3">${(dialogues.closedKeys || []).join('\n')}</textarea>
                    </div>
                    
                    <div class="shops-form-field">
                        <label class="shops-field-label">Accès Refusé</label>
                        <textarea class="shops-form-textarea" id="shopsDialoguesRestricted" rows="3">${(dialogues.restrictedKeys || []).join('\n')}</textarea>
                    </div>
                </div>
                
                <div class="shops-dialogue-actions">
                    <button class="shops-btn shops-btn-info" onclick="adminPanel.shopEditor.generateDefaultDialogues()">
                        <i class="fas fa-magic"></i> Générer Dialogues par Défaut
                    </button>
                </div>
            </div>
        </div>
    `;
}

    renderItemsSection() {
        const shop = this.currentShop;
        const items = shop.items || [];
        
        return `
            <div class="shops-form-section">
                <div class="shops-section-header" onclick="this.parentElement.querySelector('.shops-section-content').classList.toggle('shops-section-active')">
                    <h4 class="shops-section-title">📦 Articles en Vente (${items.length})</h4>
                    <span class="shops-section-toggle">▼</span>
                </div>
                <div class="shops-section-content">
                    <div class="shops-items-header">
                        <div class="shops-items-actions">
                            <button class="shops-btn shops-btn-primary" onclick="adminPanel.shopEditor.addItem()">
                                <i class="fas fa-plus"></i> Ajouter Article
                            </button>
                        </div>
                    </div>
                    
                    <div id="shopsItemsList" class="shops-items-list">
                        ${items.length === 0 ? 
                            '<div class="shops-items-empty"><i class="fas fa-box-open"></i><div>Aucun article configuré</div></div>' :
                            items.map((item, index) => this.renderShopItemEditor(item, index)).join('')
                        }
                    </div>
                </div>
            </div>
        `;
    }

    renderShopItemEditor(item, index) {
        const itemData = this.allItems[item.itemId] || {};
        
        return `
            <div class="shops-item-editor" data-index="${index}">
                <div class="shops-item-header">
                    <div class="shops-item-info-header">
                        <span class="shops-item-name-display">${itemData.name || item.itemId}</span>
                        <span class="shops-item-category-badge">${item.category || 'unknown'}</span>
                    </div>
                    <button class="shops-item-remove-btn" onclick="adminPanel.shopEditor.removeItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="shops-item-fields">
                    <div class="shops-item-field">
                        <label class="shops-item-field-label">ID Article</label>
                        <select class="shops-item-field-select" onchange="adminPanel.shopEditor.updateItemId(${index}, this.value)">
                            ${this.renderItemOptions(item.itemId)}
                        </select>
                    </div>
                    
                    <div class="shops-item-field">
                        <label class="shops-item-field-label">Prix Personnalisé</label>
                        <input type="number" class="shops-item-field-input" value="${item.basePrice || ''}" 
                               placeholder="Prix par défaut" min="0"
                               onchange="adminPanel.shopEditor.updateItemField(${index}, 'basePrice', this.value)">
                    </div>
                    
                    <div class="shops-item-field">
                        <label class="shops-item-field-label">Stock</label>
                        <input type="number" class="shops-item-field-input" value="${item.stock || -1}" 
                               onchange="adminPanel.shopEditor.updateItemField(${index}, 'stock', this.value)">
                        <div class="shops-field-help">-1 = illimité</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderItemOptions(selectedItemId) {
        if (!this.allItems || Object.keys(this.allItems).length === 0) {
            return '<option value="">Chargement des items...</option>';
        }

        let options = '<option value="">Sélectionner un item</option>';
        
        Object.entries(this.allItems).forEach(([itemId, itemData]) => {
            const selected = selectedItemId === itemId ? 'selected' : '';
            options += `<option value="${itemId}" ${selected}>${itemData.name || itemId}</option>`;
        });

        return options;
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
            basePrice: null
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
        
        if (field === 'basePrice' || field === 'stock') {
            value = value ? parseInt(value) : (field === 'basePrice' ? null : -1);
        }
        
        this.currentShop.items[index][field] = value;
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
        const editorContent = document.getElementById('shopsEditorContent');
        if (editorContent) {
            editorContent.scrollIntoView({ behavior: 'smooth' });
        }
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
            this.adminPanel.showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    }

    collectFormData() {
        const data = {
            shopId: document.getElementById('shopsShopId')?.value || '',
            name: document.getElementById('shopsShopName')?.value || '',
            type: document.getElementById('shopsShopType')?.value || 'pokemart',
            location: {
                zone: document.getElementById('shopsShopZone')?.value || '',
                city: document.getElementById('shopsShopCity')?.value || '',
                building: document.getElementById('shopsShopBuilding')?.value || ''
            },
            currency: document.getElementById('shopsShopCurrency')?.value || 'gold',
            buyMultiplier: parseFloat(document.getElementById('shopsShopBuyMultiplier')?.value) || 1.0,
            sellMultiplier: parseFloat(document.getElementById('shopsShopSellMultiplier')?.value) || 0.5,
            isActive: document.getElementById('shopsShopIsActive')?.checked !== false,
            isTemporary: document.getElementById('shopsShopIsTemporary')?.checked || false,
            items: this.currentShop?.items || []
        };
        
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
                this.adminPanel.showNotification('Erreur lors de la duplication: ' + error.message, 'error');
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
                this.adminPanel.showNotification('Erreur lors de la suppression: ' + error.message, 'error');
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
        const shopItems = document.querySelectorAll('.shops-list-item');
        searchTerm = searchTerm.toLowerCase();
        
        shopItems.forEach(item => {
            const shopName = item.querySelector('.shops-item-name').textContent.toLowerCase();
            const shopType = item.querySelector('.shops-item-type').textContent.toLowerCase();
            const shopZone = item.querySelector('.shops-item-zone').textContent.toLowerCase();
            
            const matches = shopName.includes(searchTerm) || 
                          shopType.includes(searchTerm) || 
                          shopZone.includes(searchTerm);
            
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    filterByType(type) {
        const shopItems = document.querySelectorAll('.shops-list-item');
        
        shopItems.forEach((item, index) => {
            if (!type) {
                item.style.display = 'flex';
                return;
            }
            
            const shopTypeSpan = item.querySelector('.shops-item-type');
            const shopType = shopTypeSpan.textContent;
            const matches = this.formatShopType(type) === shopType;
            
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    updateStatsDisplay(stats) {
        if (!stats) return;
        
        document.getElementById('shopsTotalShops').textContent = stats.total || 0;
        document.getElementById('shopsActiveShops').textContent = stats.active || 0;
        document.getElementById('shopsTemporaryShops').textContent = stats.temporary || 0;
        document.getElementById('shopsShopTypes').textContent = Object.keys(stats.byType || {}).length;
    }

    parseCommaSeparatedString(value) {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(s => s);
}

parseCommaSeparatedNumbers(value) {
    if (!value) return [];
    return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
}

parseTextareaLines(value) {
    if (!value) return [];
    return value.split('\n').map(s => s.trim()).filter(s => s);
}

generateDefaultDialogues(shopType = null) {
    const type = shopType || this.currentShop?.type || 'pokemart';
    
    return {
        welcomeKeys: [`shop.dialogue.${type}.welcome.1`, `shop.dialogue.generic.welcome.1`],
        purchaseKeys: [`shop.dialogue.${type}.purchase.1`],
        saleKeys: [`shop.dialogue.${type}.sale.1`],
        notEnoughMoneyKeys: [`shop.dialogue.${type}.no_money.1`],
        comeBackLaterKeys: [`shop.dialogue.${type}.goodbye.1`],
        closedKeys: [`shop.dialogue.${type}.closed.1`],
        restrictedKeys: [`shop.dialogue.${type}.restricted.1`]
    };
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
            this.adminPanel.showNotification('Erreur lors de l\'export: ' + error.message, 'error');
        }
    }

    // Méthodes utilitaires
    getCurrentZone() {
        return this.selectedZone;
    }

    getCurrentShops() {
        return [...this.allShops];
    }

    getAvailableZones() {
        return [...this.availableZones];
    }

    isShopEditorReady() {
        return this.availableZones.length > 0;
    }

    // Méthode de nettoyage
    cleanup() {
        this.currentShop = null;
        this.selectedZone = null;
        this.allShops = [];
        this.allItems = {};
        this.isEditMode = false;
        this.availableZones = [];
        
        console.log('🧹 [ShopEditor] Module cleanup completed');
    }
}
