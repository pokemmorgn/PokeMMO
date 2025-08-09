export class ItemEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.name = 'itemEditor';

        // État du module
        this.items = [];
        this.filteredItems = [];
        this.selectedItemId = null;
        this.currentItem = null;
        this.unsavedChanges = false;

        // Filtres et pagination
        this.currentFilters = {
            search: '',
            category: 'all',
            generation: 'all',
            rarity: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.totalPages = 1;

        // Cache pour les statistiques
        this.stats = null;

        // Préfixe API auto-détecté
        this.apiPrefix = '';

        console.log('✅ [ItemEditor] Module initialisé');
    }

    // ===== HELPERS API =====

    async detectApiPrefix() {
        // Essaie d'abord /api/admin, puis sans préfixe
        const candidates = ['/api/admin', ''];
        for (const p of candidates) {
            try {
                const r = await this.adminPanel.apiCall(`${p}/items/stats`);
                if (r && r.success) {
                    this.apiPrefix = p;
                    console.log(`🔗 [ItemEditor] API prefix: "${this.apiPrefix}"`);
                    return;
                }
            } catch (_) {}
        }
        this.apiPrefix = '';
        console.warn('⚠ [ItemEditor] Impossible de détecter /items/stats, fallback apiPrefix=""');
    }

    api(path, init) {
        return this.adminPanel.apiCall(`${this.apiPrefix}${path}`, init);
    }

    // ===== LIFECYCLE METHODS =====

   async onTabActivated() {
    console.log('📦 [ItemEditor] Activation de l\'onglet Items');

    try {
        await this.waitForDOM();
        
        // ✅ VÉRIFICATION DES ÉLÉMENTS SPÉCIFIQUES
        this.checkItemEditorElements();

        await this.detectApiPrefix();
        await this.loadStats();
        this.updateStatsHeader();
        this.setupEventListeners();
        await this.loadItems();
        this.initializeDropdowns();

        console.log('✅ [ItemEditor] Activation terminée');

    } catch (error) {
        console.error('❌ [ItemEditor] Erreur activation:', error);
        this.adminPanel.showNotification('Erreur lors du chargement des items', 'error');
    }
}
    async waitForDOM() {
        return new Promise((resolve) => {
            const checkDOM = () => {
                const itemsList = document.querySelector('[id*="itemsList"], .items-list, .item-editor-list');
                if (itemsList) {
                    console.log('✅ [ItemEditor] DOM prêt');
                    resolve();
                } else {
                    console.log('⏳ [ItemEditor] Attente DOM...');
                    setTimeout(checkDOM, 100);
                }
            };
            checkDOM();
        });
    }

  setupEventListeners() {
    console.log('🔧 [ItemEditor] Configuration des event listeners');

    // ✅ PRÉVENIR LA SOUMISSION DU FORMULAIRE avec délégation d'événements
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'itemEditorForm') {
            console.log('🛑 [ItemEditor] Prévention soumission formulaire itemEditorForm');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });

    // DÉLÉGATION D'ÉVÉNEMENTS pour les sélects
    document.addEventListener('change', (e) => {
        const tag = (e.target?.tagName || '').toUpperCase();
        if (tag !== 'SELECT') return;

        const id = (e.target.id || '').toLowerCase();
        const cls = (e.target.className || '').toLowerCase();

        // Catégorie
        if (id.includes('category') || cls.includes('category') || e.target.closest('[class*="category"]')) {
            this.currentFilters.category = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
            return;
        }
        // Génération
        if (id.includes('generation') || cls.includes('generation') || e.target.closest('[class*="generation"]')) {
            this.currentFilters.generation = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
            return;
        }
        // Rareté
        if (id.includes('rarity') || cls.includes('rarity') || e.target.closest('[class*="rarity"]')) {
            this.currentFilters.rarity = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
            return;
        }
    });

    // Recherche avec debounce
    document.addEventListener('input', (e) => {
        const isText = e.target?.tagName === 'INPUT' || e.target?.type === 'text';
        const hasSearchPlaceholder = (e.target?.placeholder || '').toLowerCase().includes('recherch');
        if (!isText || !hasSearchPlaceholder) return;

        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentFilters.search = e.target.value || '';
            this.currentPage = 1;
            this.applyFilters();
        }, 300);
    });

    // ✅ PRÉVENIR TOUS LES CLICS SUR LES BOUTONS DANS LE FORMULAIRE
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // Si le bouton est dans le formulaire itemEditorForm
        const form = button.closest('#itemEditorForm');
        if (form) {
            console.log('🛑 [ItemEditor] Prévention comportement bouton dans formulaire:', button);
            e.preventDefault();
            e.stopPropagation();
            
            // Identifier le type de bouton et exécuter l'action appropriée
            if (button.classList.contains('add-effect-btn')) {
                this.addEffect();
            } else if (button.classList.contains('add-method-btn')) {
                this.addObtainMethod();
            } else if (button.classList.contains('edit-effect-btn')) {
                const index = parseInt(button.getAttribute('data-index'));
                this.editEffect(index);
            } else if (button.classList.contains('remove-effect-btn')) {
                const index = parseInt(button.getAttribute('data-index'));
                this.removeEffect(index);
            } else if (button.classList.contains('edit-method-btn')) {
                const index = parseInt(button.getAttribute('data-index'));
                this.editObtainMethod(index);
            } else if (button.classList.contains('remove-method-btn')) {
                const index = parseInt(button.getAttribute('data-index'));
                this.removeObtainMethod(index);
            }
            
            return false;
        }
    });

    // Raccourci clavier: Ctrl+S
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's' && this.selectedItemId) {
            e.preventDefault();
            this.saveItem();
        }
    });

    // ✅ CORRECTION : itemForm n'est pas défini ici, utiliser getElementById
    const itemForm = document.getElementById('itemEditorForm');
    if (itemForm) {
        itemForm.addEventListener('input', () => { this.unsavedChanges = true; });
        itemForm.addEventListener('change', () => { this.unsavedChanges = true; });
    }

    console.log('✅ [ItemEditor] Event listeners configurés avec prévention submit');
}

    // ===== CHARGEMENT DES DONNÉES =====
async loadStats() {
    console.log("📊 [ItemEditor] Chargement statistiques...");
    const response = await this.api('/items/stats');
    console.log("DEBUG API /items/stats:", response);

    let statsData = null;

    // Cas 1 : API brut { success, data }
    if (response && typeof response === 'object' && 'data' in response) {
        statsData = response.data;
    }
    // Cas 2 : API brut { success, stats }
    else if (response && typeof response === 'object' && 'stats' in response) {
        statsData = response.stats;
    }
    // Cas 3 : helper renvoie déjà l'objet stats
    else if (response && typeof response === 'object') {
        statsData = response;
    }

    this.stats = statsData || { total: 0, active: 0, byCategory: {} };
    console.log("✅ [ItemEditor] Stats OK", this.stats);

    this.updateStatsHeader();
}



    async loadItems() {
        console.log('📦 [ItemEditor] Chargement items...');

        const loadingElement = this.findElement('[id*="loading"], .loading, .spinner');
        if (loadingElement) loadingElement.style.display = 'block';

        try {
            // Charger tous les items en plusieurs appels si nécessaire
            let allItems = [];
            let page = 1;
            const limit = 100;

            while (true) {
                const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
                const response = await this.api(`/items/list?${qs}`);

                if (!response.success) throw new Error(response.error);

                allItems.push(...(response.items || []));

                if (!response.items || response.items.length < limit) break;
                page++;
            }

            this.items = allItems;
            this.totalItems = allItems.length;

            console.log(`✅ [ItemEditor] ${this.items.length} items chargés`);

            // Appliquer les filtres et afficher
            this.applyFilters();

        } catch (error) {
            console.error('❌ [ItemEditor] Erreur chargement items:', error);
            this.adminPanel.showNotification('Erreur chargement items: ' + error.message, 'error');
            this.items = [];
            this.filteredItems = [];
            this.updateDisplay();
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // ===== FILTRAGE =====

    applyFilters() {
        console.log('🔍 [ItemEditor] Application des filtres:', this.currentFilters);

        // Si recherche textuelle, utiliser l'API
        if ((this.currentFilters.search || '').trim().length >= 2) {
            this.performSearch();
            return;
        }

        // Sinon filtrer côté client
        this.filteredItems = this.items.filter(item => {
            if (this.currentFilters.category !== 'all' && item.category !== this.currentFilters.category) return false;
            if (this.currentFilters.generation !== 'all' && item.generation !== parseInt(this.currentFilters.generation)) return false;
            if (this.currentFilters.rarity !== 'all' && item.rarity !== this.currentFilters.rarity) return false;
            return true;
        });

        // Pagination bornée
        this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        console.log(`🔍 [ItemEditor] ${this.filteredItems.length} items après filtrage`);
        this.updateDisplay();
    }

    async performSearch() {
        try {
            const searchData = {
                query: this.currentFilters.search.trim(),
                category: this.currentFilters.category !== 'all' ? this.currentFilters.category : undefined,
                generation: this.currentFilters.generation !== 'all' ? this.currentFilters.generation : undefined,
                rarity: this.currentFilters.rarity !== 'all' ? this.currentFilters.rarity : undefined,
                limit: 500
            };

            const response = await this.api('/items/search', {
                method: 'POST',
                body: JSON.stringify(searchData)
            });

            if (response.success) {
                this.filteredItems = response.results || [];
                this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
                if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
                if (this.currentPage < 1) this.currentPage = 1;
                console.log(`✅ [ItemEditor] Recherche: ${this.filteredItems.length} résultats`);
                this.updateDisplay();
            } else {
                throw new Error(response.error || 'Erreur recherche');
            }
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur recherche:', error);
            // Fallback sur filtrage local si dispo
            this.applyFilters();
        }
    }

    // ===== AFFICHAGE =====

    updateDisplay() {
        this.updateItemsList();
        this.updatePagination();
        this.updateUI();
    }

   updateItemsList() {
    const listElement = this.findElement('[id*="itemsList"], .items-list, .item-editor-list');
    if (!listElement) {
        console.error('❌ [ItemEditor] Liste items non trouvée');
        return;
    }

    // Pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const itemsToShow = this.filteredItems.slice(startIndex, endIndex);

    if (itemsToShow.length === 0) {
        listElement.innerHTML = `
            <div class="empty-state" style="padding: 2rem; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-search"></i>
                </div>
                <h4>Aucun item trouvé</h4>
                <p>Essayez de modifier vos critères de recherche.</p>
                ${this.hasActiveFilters() ? '<button onclick="window.itemEditorClearFilters()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px;">Effacer les filtres</button>' : ''}
            </div>
        `;
        return;
    }

    listElement.innerHTML = itemsToShow.map(item => `
        <div class="item-card ${this.selectedItemId === item.itemId ? 'selected' : ''}"
             onclick="window.itemEditorSelectItem('${item.itemId}')"
             style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem; cursor: pointer; border-radius: 4px; ${this.selectedItemId === item.itemId ? 'background: #e3f2fd;' : ''}">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 1.5rem; color: #666;">
                    <i class="fas fa-cube"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 1.1rem;">${this.escapeHtml(item.name)}</div>
                    <div style="color: #666; font-size: 0.9rem;">
                        <span style="background: #f0f0f0; padding: 0.2rem 0.5rem; border-radius: 3px; margin-right: 0.5rem;">
                            ${this.formatCategoryName(item.category)}
                        </span>
                        <span>Gen ${item.generation}</span>
                        <span style="margin-left: 0.5rem; color: ${this.getRarityColor(item.rarity)};">
                            ${this.formatRarityName(item.rarity)}
                        </span>
                        ${item.price ? `<span style="margin-left: 0.5rem;">${item.price}₽</span>` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.25rem;">
                        ${item.effectCount > 0 ? `<span style="margin-right: 0.5rem;"><i class="fas fa-magic"></i> ${item.effectCount} effets</span>` : ''}
                        ${item.obtainMethodCount > 0 ? `<span><i class="fas fa-map-marker-alt"></i> ${item.obtainMethodCount} méthodes</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    console.log(`✅ [ItemEditor] ${itemsToShow.length} items affichés (page ${this.currentPage})`);
    
    // ✅ MISE À JOUR STATS SÉCURISÉE
    this.updateStatsHeader();

    // ✅ MISE À JOUR PAGINATION SÉCURISÉE
    const totalItems = this.filteredItems.length;
    const startDisplay = startIndex + 1;
    const endDisplay = Math.min(endIndex, totalItems);

    // Vérifier l'existence des éléments avant mise à jour
    const paginationInfoElement = document.getElementById('itemsPaginationInfo');
    if (paginationInfoElement) {
        paginationInfoElement.textContent = `${startDisplay}-${endDisplay} sur ${totalItems} items`;
    } else {
        console.warn('❌ [ItemEditor] Element "itemsPaginationInfo" non trouvé');
    }

    const pageInfoElement = document.getElementById('itemsPageInfo');
    if (pageInfoElement) {
        pageInfoElement.textContent = `${this.currentPage} / ${Math.max(1, Math.ceil(totalItems / this.itemsPerPage))}`;
    } else {
        console.warn('❌ [ItemEditor] Element "itemsPageInfo" non trouvé');
    }
}

    // ✅ NOUVELLE MÉTHODE : Vérification de l'interface utilisateur
checkUIElements() {
    const requiredElements = [
        'totalItems',
        'activeItems', 
        'categoriesCount',
        'itemsPaginationInfo',
        'itemsPageInfo',
        'itemsList'
    ];

    const missingElements = [];
    
    requiredElements.forEach(elementId => {
        if (!document.getElementById(elementId)) {
            missingElements.push(elementId);
        }
    });

    if (missingElements.length > 0) {
        console.warn('⚠️ [ItemEditor] Éléments DOM manquants:', missingElements);
        console.log('💡 [ItemEditor] Vérifiez que le HTML contient tous les éléments requis');
    } else {
        console.log('✅ [ItemEditor] Tous les éléments DOM requis sont présents');
    }

    return missingElements.length === 0;
}


    updatePagination() {
    const totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
    this.totalPages = totalPages;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    // ✅ SÉLECTEURS CORRIGÉS basés sur le diagnostic
    const infoElement = document.getElementById('itemsPaginationInfo');
    if (infoElement) {
        if (this.filteredItems.length === 0) {
            infoElement.textContent = `0-0 sur 0 items`;
        } else {
            const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(startItem + this.itemsPerPage - 1, this.filteredItems.length);
            infoElement.textContent = `${startItem}-${endItem} sur ${this.filteredItems.length} items`;
        }
    }

    // ✅ Pour les boutons de pagination, chercher les bons IDs
    const prevBtn = document.getElementById('itemsPrevBtn');
    const nextBtn = document.getElementById('itemsNextBtn');

    if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
        prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
    }

    if (nextBtn) {
        nextBtn.disabled = this.currentPage >= totalPages;
        nextBtn.style.opacity = this.currentPage >= totalPages ? '0.5' : '1';
    }
}
checkItemEditorElements() {
    console.log('🔍 [ItemEditor] === VÉRIFICATION ÉLÉMENTS SPÉCIFIQUES ===');
    
    const elements = [
        'itemEditorEmpty',
        'itemEditorForm', 
        'itemEditorActions',
        'itemEditorTitle',
        'itemEffectsList',
        'itemObtainMethodsList',
        'itemsPaginationInfo',
        'itemsPrevBtn',
        'itemsNextBtn'
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}:`, {
                found: true,
                display: getComputedStyle(element).display,
                visibility: getComputedStyle(element).visibility
            });
        } else {
            console.error(`❌ ${id}: NON TROUVÉ`);
        }
    });
    
    console.log('🔍 [ItemEditor] === FIN VÉRIFICATION ===');
}

    initializeDropdowns() {
        console.log('🎛️ [ItemEditor] Initialisation des dropdowns');

        if (!this.stats) return;

        // Dropdown catégories
        const categoryFilter = this.findElement('[id*="category"], select[class*="category"]');
        if (categoryFilter) {
            const currentValue = categoryFilter.value;
            categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>';

            Object.entries(this.stats.byCategory || {})
                .sort(([a], [b]) => this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)))
                .forEach(([category, count]) => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = `${this.formatCategoryName(category)} (${count})`;
                    categoryFilter.appendChild(option);
                });

            categoryFilter.value = currentValue || 'all';
        }

        // Dropdown générations
        const generationFilter = this.findElement('[id*="generation"], select[class*="generation"]');
        if (generationFilter) {
            const currentValue = generationFilter.value;
            generationFilter.innerHTML = '<option value="all">Toutes les générations</option>';

            Object.entries(this.stats.byGeneration || {})
                .sort(([a], [b]) => parseInt(a.replace('gen_', '')) - parseInt(b.replace('gen_', '')))
                .forEach(([genKey, count]) => {
                    const genNumber = genKey.replace('gen_', '');
                    const option = document.createElement('option');
                    option.value = genNumber;
                    option.textContent = `Génération ${genNumber} (${count})`;
                    generationFilter.appendChild(option);
                });

            generationFilter.value = currentValue || 'all';
        }

        // Dropdown raretés
        const rarityFilter = this.findElement('[id*="rarity"], select[class*="rarity"]');
        if (rarityFilter) {
            const currentValue = rarityFilter.value;
            rarityFilter.innerHTML = '<option value="all">Toutes les raretés</option>';

            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
            Object.entries(this.stats.byRarity || {})
                .sort(([a], [b]) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b))
                .forEach(([rarity, count]) => {
                    const option = document.createElement('option');
                    option.value = rarity;
                    option.textContent = `${this.formatRarityName(rarity)} (${count})`;
                    rarityFilter.appendChild(option);
                });

            rarityFilter.value = currentValue || 'all';
        }

        console.log('✅ [ItemEditor] Dropdowns initialisés');
    }

    updateUI() {
    console.log('🔧 [ItemEditor] updateUI() appelée');
    console.log('🔧 [ItemEditor] selectedItemId:', this.selectedItemId);
    console.log('🔧 [ItemEditor] currentItem:', this.currentItem);
    
    if (this.selectedItemId) {
        console.log('🔧 [ItemEditor] Affichage du formulaire d\'édition');
        this.showItemEditor();
    } else {
        console.log('🔧 [ItemEditor] Affichage de l\'état vide');
        this.showEmptyState();
    }
}

   showEmptyState() {
    console.log('📝 [ItemEditor] showEmptyState() - Début');
    
    const emptyElement = document.getElementById('itemEditorEmpty');
    const formElement = document.getElementById('itemEditorForm');
    const actionsElement = document.getElementById('itemEditorActions');
    const titleElement = document.getElementById('itemEditorTitle');

    if (emptyElement) emptyElement.style.display = 'flex';
    if (formElement) formElement.style.display = 'none';
    if (actionsElement) actionsElement.style.display = 'none';
    if (titleElement) titleElement.innerHTML = '<i class="fas fa-cube"></i> Sélectionnez un item';
    
    console.log('📝 [ItemEditor] État vide affiché');
}


   showItemEditor() {
    console.log('📝 [ItemEditor] showItemEditor() - Début (version corrigée)');
    
    // ✅ SÉLECTEURS CORRIGÉS basés sur le diagnostic
    const emptyElement = document.getElementById('itemEditorEmpty');
    const formElement = document.getElementById('itemEditorForm'); 
    const actionsElement = document.getElementById('itemEditorActions');
    const titleElement = document.getElementById('itemEditorTitle');

    console.log('📝 [ItemEditor] Éléments trouvés avec IDs spécifiques:');
    console.log('  - emptyElement:', emptyElement);
    console.log('  - formElement:', formElement);
    console.log('  - actionsElement:', actionsElement);
    console.log('  - titleElement:', titleElement);

    // Masquer l'état vide
    if (emptyElement) {
        console.log('📝 [ItemEditor] Masquage état vide');
        emptyElement.style.display = 'none';
    } else {
        console.warn('⚠️ [ItemEditor] Element itemEditorEmpty non trouvé');
    }

    // ✅ AFFICHER LE BON FORMULAIRE
    if (formElement) {
        console.log('📝 [ItemEditor] Affichage du formulaire itemEditorForm');
        formElement.style.display = 'block';
    } else {
        console.error('❌ [ItemEditor] Formulaire itemEditorForm non trouvé !');
    }

    // Afficher les actions
    if (actionsElement) {
        console.log('📝 [ItemEditor] Affichage actions');
        actionsElement.style.display = 'flex';
    } else {
        console.warn('⚠️ [ItemEditor] Element itemEditorActions non trouvé');
    }

    // Mettre à jour le titre
    if (titleElement && this.currentItem) {
        console.log('📝 [ItemEditor] Mise à jour titre');
        titleElement.innerHTML = `<i class="fas fa-cube"></i> ${this.escapeHtml(this.currentItem.name)}
            <span style="color: #666; font-size: 0.8em;">(${this.currentItem.itemId})</span>`;
    } else {
        console.warn('⚠️ [ItemEditor] Element itemEditorTitle non trouvé ou item manquant');
    }

    console.log('📝 [ItemEditor] showItemEditor() - Fin');
}


    
    // ===== SÉLECTION ET ÉDITION =====

    async selectItem(itemId) {
    console.log(`📦 [ItemEditor] Sélection item: ${itemId}`);

    if (this.unsavedChanges && !confirm('Modifications non sauvegardées. Continuer ?')) {
        return;
    }

    try {
        const response = await this.api(`/items/details/${itemId}`);

        if (response.success) {
            this.selectedItemId = itemId;
            this.currentItem = response.item;
            this.unsavedChanges = false;

            console.log('📦 [ItemEditor] Item chargé:', this.currentItem);
            
            this.populateForm(this.currentItem);
            
            // ✅ DIAGNOSTIC AVANT UPDATEUI
            console.log('🔧 [ItemEditor] Lancement diagnostic avant updateUI...');
            this.diagnoseInterface();
            
            this.updateDisplay();

            console.log(`✅ [ItemEditor] Item ${itemId} sélectionné`);
        } else {
            throw new Error(response.error || 'Item non trouvé');
        }
    } catch (error) {
        console.error('❌ [ItemEditor] Erreur sélection:', error);
        this.adminPanel.showNotification('Erreur: ' + error.message, 'error');
    }
}

    populateForm(item) {
    console.log('📝 [ItemEditor] Remplissage formulaire:', item.itemId);

    // Désactiver l'autocomplétion et la soumission du formulaire
    const form = document.getElementById('itemEditorForm');
    if (form) {
        form.setAttribute('autocomplete', 'off');
        form.setAttribute('onsubmit', 'return false;');
        
        // S'assurer que tous les boutons dans le formulaire ont type="button"
        form.querySelectorAll('button:not([type])').forEach(btn => {
            btn.setAttribute('type', 'button');
        });
    }

    // Remplir tous les champs
    this.setFieldValue('itemId', item.itemId);
    this.setFieldValue('itemName', item.name);
    this.setFieldValue('itemDescription', item.description);
    this.setFieldValue('itemCategory', item.category);
    this.setFieldValue('itemGeneration', item.generation);
    this.setFieldValue('itemRarity', item.rarity);
    this.setFieldValue('itemSprite', item.sprite);
    this.setFieldValue('itemPrice', item.price);
    this.setFieldValue('itemSellPrice', item.sellPrice);
    this.setFieldValue('itemStackable', item.stackable, 'checkbox');
    this.setFieldValue('itemConsumable', item.consumable, 'checkbox');
    this.setFieldValue('itemIsActive', item.isActive, 'checkbox');

    // Tags
    if (item.tags && Array.isArray(item.tags)) {
        this.setFieldValue('itemTags', item.tags.join(', '));
    }

    // Effets et méthodes
    this.populateEffects(item.effects || []);
    this.populateObtainMethods(item.obtainMethods || []);
}

   populateEffects(effects) {
    const container = document.getElementById('itemEffectsList');
    if (!container) {
        console.warn('⚠️ [ItemEditor] Container itemEffectsList non trouvé');
        return;
    }

    if (effects.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
                <i class="fas fa-magic" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>Aucun effet défini</p>
                <button type="button" class="add-effect-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px;">
                    <i class="fas fa-plus"></i> Ajouter un effet
                </button>
            </div>
        `;
        
        // Ajouter l'event listener après avoir créé le bouton
        const addBtn = container.querySelector('.add-effect-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.addEffect();
                return false;
            });
        }
        return;
    }

    container.innerHTML = effects.map((effect, index) => `
        <div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${this.escapeHtml(effect.name || effect.id)}</strong>
                    <span style="margin-left: 0.5rem; color: #666; font-size: 0.9rem;">${effect.trigger}</span>
                </div>
                <div>
                    <button type="button" class="edit-effect-btn" data-index="${index}" style="padding: 0.25rem 0.5rem; margin: 0 0.25rem; background: #007bff; color: white; border: none; border-radius: 3px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="remove-effect-btn" data-index="${index}" style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${effect.description ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">${this.escapeHtml(effect.description)}</div>` : ''}
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #888;">
                Actions: ${effect.actions?.length || 0} |
                Conditions: ${effect.conditions?.length || 0}
                ${effect.priority ? ` | Priorité: ${effect.priority}` : ''}
            </div>
        </div>
    `).join('') + `
        <div style="text-align: center; margin: 1rem 0;">
            <button type="button" class="add-effect-btn" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px;">
                <i class="fas fa-plus"></i> Ajouter un effet
            </button>
        </div>
    `;

    // Ajouter les event listeners après avoir créé les boutons
    this.setupEffectButtonListeners(container);
}

// Nouvelle méthode pour configurer les event listeners
setupEffectButtonListeners(container) {
    // Bouton "Ajouter effet"
    const addBtn = container.querySelector('.add-effect-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 [ItemEditor] Bouton Ajouter effet cliqué');
            this.addEffect();
            return false;
        });
    }

    // Boutons "Modifier effet"
    container.querySelectorAll('.edit-effect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('🔘 [ItemEditor] Bouton Modifier effet cliqué, index:', index);
            this.editEffect(index);
            return false;
        });
    });

    // Boutons "Supprimer effet"
    container.querySelectorAll('.remove-effect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('🔘 [ItemEditor] Bouton Supprimer effet cliqué, index:', index);
            this.removeEffect(index);
            return false;
        });
    });
}


    editEffect(index) {
    console.log(`✏️ [ItemEditor] Édition effet ${index}`);
    
    if (!this.currentItem || !this.currentItem.effects?.[index]) {
        console.error('❌ [ItemEditor] Effet non trouvé à l\'index', index);
        return;
    }

    const effect = this.currentItem.effects[index];
    
    // Pour l'instant, édition simple du nom et description
    const newName = prompt('Nom de l\'effet:', effect.name || effect.id || '');
    if (newName !== null && newName.trim()) {
        effect.name = newName.trim();
        
        const newDescription = prompt('Description (optionnel):', effect.description || '');
        if (newDescription !== null) {
            effect.description = newDescription.trim();
        }
        
        // Re-générer l'affichage des effets
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
        
        console.log(`✅ [ItemEditor] Effet ${index} modifié`);
    }
}

editObtainMethod(index) {
    console.log(`✏️ [ItemEditor] Édition méthode ${index}`);
    
    if (!this.currentItem || !this.currentItem.obtainMethods?.[index]) {
        console.error('❌ [ItemEditor] Méthode non trouvée à l\'index', index);
        return;
    }

    const method = this.currentItem.obtainMethods[index];
    
    // Édition des propriétés principales
    const newLocation = prompt('Localisation:', method.location || '');
    if (newLocation !== null) {
        method.location = newLocation.trim();
        
        const newChance = prompt('Chance (%):', method.chance || '');
        if (newChance !== null && newChance.trim()) {
            method.chance = parseInt(newChance) || null;
        }
        
        const newCost = prompt('Coût:', method.cost || '');
        if (newCost !== null && newCost.trim()) {
            method.cost = parseInt(newCost) || null;
        }
        
        // Re-générer l'affichage des méthodes
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
        
        console.log(`✅ [ItemEditor] Méthode ${index} modifiée`);
    }
}

// 6. ✅ AJOUTER cancelEdit() manquante
cancelEdit() {
    console.log('❌ [ItemEditor] Annulation édition');
    
    if (this.unsavedChanges && !confirm('Modifications non sauvegardées. Continuer ?')) {
        return;
    }

    this.selectedItemId = null;
    this.currentItem = null;
    this.unsavedChanges = false;
    
    this.showEmptyState();
    this.updateDisplay();
}

// 7. ✅ AJOUTER exportItems() manquante
exportItems() {
    console.log('📤 [ItemEditor] Export des items');
    
    try {
        const dataStr = JSON.stringify(this.items, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `items_export_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        
        this.adminPanel.showNotification('Export réussi', 'success');
    } catch (error) {
        console.error('❌ [ItemEditor] Erreur export:', error);
        this.adminPanel.showNotification('Erreur export: ' + error.message, 'error');
    }
}
    
// Nouvelle méthode pour configurer les event listeners des méthodes
setupMethodButtonListeners(container) {
    // Bouton "Ajouter méthode"
    const addBtn = container.querySelector('.add-method-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 [ItemEditor] Bouton Ajouter méthode cliqué');
            this.addObtainMethod();
            return false;
        });
    }

    // Boutons "Modifier méthode"
    container.querySelectorAll('.edit-method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('🔘 [ItemEditor] Bouton Modifier méthode cliqué, index:', index);
            this.editObtainMethod(index);
            return false;
        });
    });

    // Boutons "Supprimer méthode"
    container.querySelectorAll('.remove-method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('🔘 [ItemEditor] Bouton Supprimer méthode cliqué, index:', index);
            this.removeObtainMethod(index);
            return false;
        });
    });
}

    // ===== ACTIONS =====

    async saveItem() {
    console.log('💾 [ItemEditor] Sauvegarde item (prévention rechargement)');

    if (!this.validateForm()) {
        console.log('❌ [ItemEditor] Validation formulaire échouée');
        return false;
    }

    try {
        const formData = this.gatherFormData();
        let response;

        if (this.selectedItemId === 'new') {
            response = await this.api('/items', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        } else {
            response = await this.api(`/items/${this.selectedItemId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        }

        if (response.success) {
            this.unsavedChanges = false;
            this.adminPanel.showNotification(
                this.selectedItemId === 'new' ? 'Item créé' : 'Item mis à jour',
                'success'
            );

            await this.loadItems();
            await this.loadStats();
            this.updateStatsHeader();
            this.initializeDropdowns();

            if (this.selectedItemId === 'new') {
                this.selectedItemId = formData.itemId;
                await this.selectItem(this.selectedItemId);
            }
            
            console.log('✅ [ItemEditor] Sauvegarde réussie');
            return true;
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('❌ [ItemEditor] Erreur sauvegarde:', error);
        this.adminPanel.showNotification('Erreur: ' + error.message, 'error');
        return false;
    }
}

    validateForm() {
        const itemId = this.getFieldValue('itemId');
        const name = this.getFieldValue('itemName');

        if (!itemId || !name) {
            this.adminPanel.showNotification('ID et nom requis', 'error');
            return false;
        }
        return true;
    }

    gatherFormData() {
        return {
            itemId: this.getFieldValue('itemId'),
            name: this.getFieldValue('itemName'),
            description: this.getFieldValue('itemDescription'),
            category: this.getFieldValue('itemCategory'),
            generation: parseInt(this.getFieldValue('itemGeneration')) || 1,
            rarity: this.getFieldValue('itemRarity') || 'common',
            sprite: this.getFieldValue('itemSprite'),
            price: this.parseNumber(this.getFieldValue('itemPrice')),
            sellPrice: this.parseNumber(this.getFieldValue('itemSellPrice')),
            stackable: this.getFieldValue('itemStackable', 'checkbox'),
            consumable: this.getFieldValue('itemConsumable', 'checkbox'),
            isActive: this.getFieldValue('itemIsActive', 'checkbox') !== false,
            tags: this.getFieldValue('itemTags') ?
                this.getFieldValue('itemTags').split(',').map(t => t.trim()).filter(t => t) : [],
            effects: this.currentItem?.effects || [],
            obtainMethods: this.currentItem?.obtainMethods || [],
            version: '2.0.0',
            sourceFile: 'admin_editor'
        };
    }

    async createNewItem() {
        console.log('📦 [ItemEditor] Création nouvel item');

        if (this.unsavedChanges && !confirm('Modifications non sauvegardées. Continuer ?')) {
            return;
        }

        this.selectedItemId = 'new';
        this.currentItem = {
            itemId: '',
            name: '',
            description: '',
            category: 'battle_items',
            generation: 1,
            rarity: 'common',
            effects: [],
            obtainMethods: [],
            isActive: true
        };

        this.unsavedChanges = false;
        this.populateForm(this.currentItem);
        this.updateUI();

        // Focus sur le premier champ
        setTimeout(() => {
            const firstField = this.findElement('[id*="itemId"], input[name*="id"]');
            if (firstField) firstField.focus();
        }, 100);
    }

    async deleteItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification('Sélectionnez un item à supprimer', 'warning');
            return;
        }

        const itemName = this.currentItem?.name || this.selectedItemId;
        if (!confirm(`Supprimer "${itemName}" ?`)) return;

        try {
            const response = await this.api(`/items/${this.selectedItemId}`, { method: 'DELETE' });

            if (response.success) {
                this.adminPanel.showNotification('Item supprimé', 'success');
                this.selectedItemId = null;
                this.currentItem = null;
                this.unsavedChanges = false;

                await this.loadItems();
                await this.loadStats();
                this.updateStatsHeader();   // <-- NEW

                this.initializeDropdowns();
                this.updateUI();
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur suppression:', error);
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error');
        }
    }

    async duplicateItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification('Sélectionnez un item à dupliquer', 'warning');
            return;
        }

        try {
            const response = await this.api(`/items/${this.selectedItemId}/duplicate`, { method: 'POST' });

            if (response.success) {
                this.adminPanel.showNotification('Item dupliqué', 'success');
                await this.loadItems();
                await this.loadStats();
                this.updateStatsHeader();   // <-- NEW

                this.initializeDropdowns();

                if (response.newItemId) {
                    await this.selectItem(response.newItemId);
                }
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur duplication:', error);
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error');
        }
    }


    // --- NEW: met à jour les compteurs en haut
updateStatsHeader() {
    const total = this.items.length;
    const actifs = this.items.filter(item => item.isActive).length;
    const categories = new Set(this.items.map(item => item.category)).size;

    // ✅ VÉRIFICATION SÉCURISÉE des éléments DOM avant mise à jour
    const totalElement = document.getElementById("totalItems");
    const activeElement = document.getElementById("activeItems");
    const categoriesElement = document.getElementById("categoriesCount");

    if (totalElement) {
        totalElement.textContent = total;
    } else {
        console.warn('❌ [ItemEditor] Element "totalItems" non trouvé dans le DOM');
    }

    if (activeElement) {
        activeElement.textContent = actifs;
    } else {
        console.warn('❌ [ItemEditor] Element "activeItems" non trouvé dans le DOM');
    }

    if (categoriesElement) {
        categoriesElement.textContent = categories;
    } else {
        console.warn('❌ [ItemEditor] Element "categoriesCount" non trouvé dans le DOM');
    }

    console.log(`📊 [ItemEditor] Stats header updated: ${total} total, ${actifs} actifs, ${categories} catégories`);
}

    
    // ===== PAGINATION =====

    previousPage() {
        if (this.currentPage <= 1) return;
        this.currentPage--;
        this.updateDisplay();
    }

    nextPage() {
        const totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
        if (this.currentPage >= totalPages) return;
        this.currentPage++;
        this.updateDisplay();
    }

    // ===== ACTIONS RAPIDES =====

    async refreshItems() {
        console.log('🔄 [ItemEditor] Actualisation');
        try {
            await this.loadItems();
            await this.loadStats();
            
            this.updateStatsHeader();   // <-- NEW

            this.initializeDropdowns();
            this.adminPanel.showNotification('Liste actualisée', 'info');
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur refresh:', error);
        }
    }

    clearFilters() {
        console.log('🧹 [ItemEditor] Effacement filtres');

        this.currentFilters = {
            search: '',
            category: 'all',
            generation: 'all',
            rarity: 'all'
        };
        this.currentPage = 1;

        // Reset des champs
        const searchInput = this.findElement('input[placeholder*="recherch"]');
        const categoryFilter = this.findElement('[id*="category"], select[class*="category"]');
        const generationFilter = this.findElement('[id*="generation"], select[class*="generation"]');
        const rarityFilter = this.findElement('[id*="rarity"], select[class*="rarity"]');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (generationFilter) generationFilter.value = 'all';
        if (rarityFilter) rarityFilter.value = 'all';

        this.applyFilters();
    }

    // ===== GESTION DES EFFETS ET MÉTHODES =====

    addEffect() {
        if (!this.currentItem) {
            this.adminPanel.showNotification('Sélectionnez un item', 'warning');
            return;
        }

        const newEffect = {
            id: `effect_${Date.now()}`,
            name: 'Nouvel effet',
            trigger: 'on_use',
            actions: [],
            conditions: []
        };

        if (!this.currentItem.effects) this.currentItem.effects = [];
        this.currentItem.effects.push(newEffect);
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
    }

    removeEffect(index) {
        if (!this.currentItem?.effects || !confirm('Supprimer cet effet ?')) return;
        this.currentItem.effects.splice(index, 1);
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
    }

    addObtainMethod() {
        if (!this.currentItem) {
            this.adminPanel.showNotification('Sélectionnez un item', 'warning');
            return;
        }

        const newMethod = {
            method: 'shop',
            location: '',
            cost: null
        };

        if (!this.currentItem.obtainMethods) this.currentItem.obtainMethods = [];
        this.currentItem.obtainMethods.push(newMethod);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
    }

    removeObtainMethod(index) {
        if (!this.currentItem?.obtainMethods || !confirm('Supprimer cette méthode ?')) return;
        this.currentItem.obtainMethods.splice(index, 1);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
    }


    updatePaginationInfo() {
    const start = this.currentPage * this.itemsPerPage + 1;
    const end = Math.min((this.currentPage + 1) * this.itemsPerPage, this.items.length);
    const total = this.items.length;

    document.getElementById("itemsPaginationInfo").textContent = 
        total > 0 ? `${start}-${end} sur ${total} items` : `0-0 sur 0 items`;

    document.getElementById("itemsPageInfo").textContent = 
        `${this.currentPage + 1} / ${Math.max(1, Math.ceil(total / this.itemsPerPage))}`;
}

    
    // ===== UTILITAIRES =====

    findElement(selector) {
    console.log(`🔍 [ItemEditor] Recherche élément: "${selector}"`);
    
    const element = document.querySelector(selector);
    
    if (element) {
        console.log(`✅ [ItemEditor] Élément trouvé:`, element);
        console.log(`   - Tag: ${element.tagName}`);
        console.log(`   - ID: ${element.id}`);
        console.log(`   - Classes: ${element.className}`);
        console.log(`   - Display: ${getComputedStyle(element).display}`);
        console.log(`   - Visibility: ${getComputedStyle(element).visibility}`);
    } else {
        console.warn(`❌ [ItemEditor] Élément non trouvé: "${selector}"`);
        
        // Essayer de trouver des éléments similaires
        const parts = selector.split(',').map(s => s.trim());
        parts.forEach(part => {
            if (part.includes('*=')) {
                // Sélecteur d'attribut partiel
                const attrMatch = part.match(/\[([^*=]+)\*="([^"]+)"\]/);
                if (attrMatch) {
                    const [, attr, value] = attrMatch;
                    const similar = document.querySelectorAll(`[${attr}*="${value}"]`);
                    console.log(`🔍 [ItemEditor] Éléments similaires pour ${part}:`, similar.length, similar);
                }
            } else if (part.startsWith('.')) {
                // Sélecteur de classe
                const className = part.substring(1);
                const similar = document.querySelectorAll(`[class*="${className}"]`);
                console.log(`🔍 [ItemEditor] Éléments similaires pour ${part}:`, similar.length, similar);
            }
        });
    }
    
    return element;
}


    setFieldValue(fieldId, value, type = 'text') {
        const field = this.findElement(`[id*="${fieldId}"], [name*="${fieldId}"]`);
        if (!field) return;

        if (type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value ?? '';
        }
    }
diagnoseInterface() {
    console.log('🏥 [ItemEditor] === DIAGNOSTIC INTERFACE ===');
    
    // 1. Vérifier la structure générale
    const adminPanel = document.querySelector('.admin-panel, #admin-panel, [class*="admin"]');
    console.log('🏥 [ItemEditor] Admin panel:', adminPanel);
    
    // 2. Vérifier l'onglet items
    const itemsTab = document.querySelector('[data-tab="items"], #items-tab, .items-tab');
    console.log('🏥 [ItemEditor] Items tab:', itemsTab);
    
    // 3. Chercher tous les formulaires
    const allForms = document.querySelectorAll('form');
    console.log('🏥 [ItemEditor] Tous les formulaires:', allForms.length);
    allForms.forEach((form, index) => {
        console.log(`  Form ${index}:`, {
            id: form.id,
            classes: form.className,
            display: getComputedStyle(form).display,
            visibility: getComputedStyle(form).visibility,
            parent: form.parentElement?.tagName
        });
    });
    
    // 4. Chercher tous les éléments avec "editor" dans l'ID ou classe
    const editorElements = document.querySelectorAll('[id*="editor"], [class*="editor"]');
    console.log('🏥 [ItemEditor] Éléments "editor":', editorElements.length);
    editorElements.forEach((el, index) => {
        console.log(`  Editor ${index}:`, {
            tag: el.tagName,
            id: el.id,
            classes: el.className,
            display: getComputedStyle(el).display
        });
    });
    
    // 5. Chercher la structure attendue
    const expectedElements = [
        '[id*="itemsList"]',
        '[id*="editorForm"]', 
        '[id*="editorEmpty"]',
        '[id*="editorActions"]',
        '[id*="editorTitle"]'
    ];
    
    console.log('🏥 [ItemEditor] Éléments attendus:');
    expectedElements.forEach(selector => {
        const found = document.querySelector(selector);
        console.log(`  ${selector}:`, found ? '✅ Trouvé' : '❌ Manquant');
    });
    
    console.log('🏥 [ItemEditor] === FIN DIAGNOSTIC ===');
}
    getFieldValue(fieldId, type = 'text') {
        const field = this.findElement(`[id*="${fieldId}"], [name*="${fieldId}"]`);
        if (!field) return '';

        if (type === 'checkbox') {
            return field.checked;
        }
        return field.value || '';
    }

    hasActiveFilters() {
        return this.currentFilters.search !== '' ||
               this.currentFilters.category !== 'all' ||
               this.currentFilters.generation !== 'all' ||
               this.currentFilters.rarity !== 'all';
    }

    parseNumber(value) {
        if (value == null || String(value).trim() === '') return null;
        const num = parseInt(value, 10);
        return Number.isNaN(num) ? null : num;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatCategoryName(category) {
        const names = {
            'medicine': 'Médicaments',
            'pokeballs': 'Poké Balls',
            'battle_items': 'Objets de combat',
            'key_items': 'Objets importants',
            'berries': 'Baies',
            'machines': 'Machines (TM/HM)',
            'evolution_items': 'Objets d\'évolution',
            'held_items': 'Objets tenus',
            'z_crystals': 'Cristaux Z',
            'treasure': 'Trésors'
        };
        return names[category] || category;
    }

    formatRarityName(rarity) {
        const names = {
            'common': 'Commun',
            'uncommon': 'Peu commun',
            'rare': 'Rare',
            'epic': 'Épique',
            'legendary': 'Légendaire',
            'mythical': 'Mythique'
        };
        return names[rarity] || rarity;
    }

    formatMethodName(method) {
        const names = {
            'shop': 'Magasin',
            'wild_drop': 'Drop sauvage',
            'trainer_reward': 'Récompense dresseur',
            'gift': 'Cadeau',
            'found_item': 'Objet trouvé',
            'quest_reward': 'Récompense de quête'
        };
        return names[method] || method;
    }

    getRarityColor(rarity) {
        const colors = {
            'common': '#888',
            'uncommon': '#1eff00',
            'rare': '#0070dd',
            'epic': '#a335ee',
            'legendary': '#ff8000',
            'mythical': '#e6cc80'
        };
        return colors[rarity] || '#888';
    }

    cleanup() {
        console.log('🧹 [ItemEditor] Cleanup module');
    }
}

// ===== FONCTIONS GLOBALES =====

window.itemEditorSelectItem = (itemId) => {
    window.adminPanel?.itemEditor?.selectItem(itemId);
};

window.itemEditorCreateNew = () => {
    window.adminPanel?.itemEditor?.createNewItem();
};

window.itemEditorSave = () => {
    const result = window.adminPanel?.itemEditor?.saveItem();
    return false; // Toujours prévenir le comportement par défaut
};

window.itemEditorDuplicate = () => {
    window.adminPanel?.itemEditor?.duplicateItem();
};

window.itemEditorDelete = () => {
    window.adminPanel?.itemEditor?.deleteItem();
};

window.itemEditorRefresh = () => {
    window.adminPanel?.itemEditor?.refreshItems();
};

window.itemEditorClearFilters = () => {
    window.adminPanel?.itemEditor?.clearFilters();
};

window.itemEditorPreviousPage = () => {
    window.adminPanel?.itemEditor?.previousPage();
};

window.itemEditorNextPage = () => {
    window.adminPanel?.itemEditor?.nextPage();
};

window.itemEditorAddEffect = () => {
    window.adminPanel?.itemEditor?.addEffect();
};

window.itemEditorEditEffect = (index) => {
    console.log(`✏️ [ItemEditor] Édition effet ${index}`);
    
    const itemEditor = window.adminPanel?.itemEditor;
    if (!itemEditor || !itemEditor.currentItem) {
        console.error('❌ [ItemEditor] Pas d\'item sélectionné');
        return false;
    }

    const effect = itemEditor.currentItem.effects?.[index];
    if (!effect) {
        console.error('❌ [ItemEditor] Effet non trouvé à l\'index', index);
        return false;
    }

    // Pour l'instant, ouvrir une boîte de dialogue simple
    const newName = prompt('Nom de l\'effet:', effect.name || effect.id || '');
    if (newName !== null && newName.trim()) {
        effect.name = newName.trim();
        itemEditor.populateEffects(itemEditor.currentItem.effects);
        itemEditor.unsavedChanges = true;
        console.log(`✅ [ItemEditor] Effet ${index} modifié`);
    }
    
    return false;
};

window.itemEditorRemoveEffect = (index) => {
    window.adminPanel?.itemEditor?.removeEffect(index);
};

window.itemEditorAddObtainMethod = () => {
    window.adminPanel?.itemEditor?.addObtainMethod();
};

window.itemEditorEditObtainMethod = (index) => {
    console.log(`✏️ [ItemEditor] Édition méthode ${index}`);
    
    const itemEditor = window.adminPanel?.itemEditor;
    if (!itemEditor || !itemEditor.currentItem) {
        console.error('❌ [ItemEditor] Pas d\'item sélectionné');
        return false;
    }

    const method = itemEditor.currentItem.obtainMethods?.[index];
    if (!method) {
        console.error('❌ [ItemEditor] Méthode non trouvée à l\'index', index);
        return false;
    }

    // Pour l'instant, modifier la localisation
    const newLocation = prompt('Localisation:', method.location || '');
    if (newLocation !== null) {
        method.location = newLocation.trim();
        itemEditor.populateObtainMethods(itemEditor.currentItem.obtainMethods);
        itemEditor.unsavedChanges = true;
        console.log(`✅ [ItemEditor] Méthode ${index} modifiée`);
    }
    
    return false;
};


window.itemEditorRemoveObtainMethod = (index) => {
    window.adminPanel?.itemEditor?.removeObtainMethod(index);
};
