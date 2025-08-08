export class ItemEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.name = 'itemEditor';

        // État
        this.items = [];
        this.filteredItems = [];
        this.selectedItemId = null;
        this.currentItem = null;
        this.unsavedChanges = false;

        // Filtres & pagination
        this.currentFilters = { search: '', category: 'all', generation: 'all', rarity: 'all' };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.totalPages = 1;

        // Cache stats
        this.stats = null;

        // Timer recherche
        this.searchTimeout = null;

        console.log('✅ [ItemEditor] Module initialisé');
    }

    // ===== LIFECYCLE =====
    async onTabActivated() {
        console.log('📦 [ItemEditor] Activation de l’onglet Items');
        try {
            await this.waitForDOM();
            await this.loadStats();
            this.setupEventListeners();
            await this.loadItems();
            this.initializeDropdowns();
            console.log('✅ [ItemEditor] Activation terminée');
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur activation:', error);
            this.adminPanel?.showNotification?.('Erreur lors du chargement des items', 'error');
        }
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            const checkDOM = () => {
                const list = document.querySelector('[id*="itemsList"], .items-list, .item-editor-list');
                if (list) return resolve();
                setTimeout(checkDOM, 100);
            };
            checkDOM();
        });
    }

    // ===== EVENTS =====
    setupEventListeners() {
        console.log('🔧 [ItemEditor] Configuration events');

        // Changement selects (catégorie / génération / rareté)
        document.addEventListener('change', (e) => {
            const tag = (e.target?.tagName || '').toUpperCase();
            if (tag !== 'SELECT') return;

            const id = (e.target.id || '');
            const cls = (e.target.className || '');

            const isCat = id.includes('category') || cls.includes('category') || e.target.closest('[class*="category"]');
            const isGen = id.includes('generation') || cls.includes('generation') || e.target.closest('[class*="generation"]');
            const isRar = id.includes('rarity') || cls.includes('rarity') || e.target.closest('[class*="rarity"]');

            if (isCat) {
                this.currentFilters.category = e.target.value;
            } else if (isGen) {
                this.currentFilters.generation = e.target.value;
            } else if (isRar) {
                this.currentFilters.rarity = e.target.value;
            } else {
                return;
            }
            this.currentPage = 1;
            this.applyFilters();
        });

        // Recherche (debounce)
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

        // Sauvegarde Ctrl+S
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's' && this.selectedItemId) {
                e.preventDefault();
                this.saveItem();
            }
        });

        // Marquer les changements du formulaire
        const form = this.findElement('[id*="editorForm"], .editor-form, form');
        if (form) {
            form.addEventListener('input', () => { this.unsavedChanges = true; });
            form.addEventListener('change', () => { this.unsavedChanges = true; });
        }

        console.log('✅ [ItemEditor] Events OK');
    }

    // ===== DATA LOAD =====
    async loadStats() {
        console.log('📊 [ItemEditor] Chargement statistiques...');
        try {
            const response = await this.adminPanel.apiCall('/api/admin/items/stats');
            if (response?.success) {
                this.stats = response.stats;
                console.log('✅ [ItemEditor] Stats OK', this.stats);
            } else {
                throw new Error(response?.error || 'Erreur stats');
            }
        } catch (e) {
            console.error('❌ [ItemEditor] Stats:', e);
            this.stats = { total: 0, active: 0, byCategory: {}, byGeneration: {}, byRarity: {} };
        }
    }

    async loadItems() {
        console.log('📦 [ItemEditor] Chargement items...');
        const loading = this.findElement('[id*="loading"], .loading, .spinner');
        if (loading) loading.style.display = 'block';

        try {
            let all = [];
            let page = 1;
            const limit = 100;

            // Fetch paginé côté serveur
            // (on agrège tout, puis on pagine côté client avec itemsPerPage)
            while (true) {
                const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
                const resp = await this.adminPanel.apiCall(`/api/admin/items/list?${qs}`);
                if (!resp?.success) throw new Error(resp?.error || 'Erreur liste');
                all.push(...(resp.items || []));
                if (!resp.items || resp.items.length < limit) break;
                page++;
            }

            this.items = all;
            this.totalItems = all.length;
            console.log(`✅ [ItemEditor] ${this.items.length} items chargés`);

            this.applyFilters();
        } catch (e) {
            console.error('❌ [ItemEditor] Chargement items:', e);
            this.adminPanel.showNotification?.(`Erreur chargement items: ${e.message}`, 'error');
            this.items = [];
            this.filteredItems = [];
            this.updateDisplay();
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    // ===== FILTERING =====
    applyFilters() {
        // Recherche serveur si texte (>=2)
        const q = (this.currentFilters.search || '').trim();
        if (q.length >= 2) return this.performSearch();

        // Filtrage local sinon
        this.filteredItems = this.items.filter(item => {
            if (this.currentFilters.category !== 'all' && item.category !== this.currentFilters.category) return false;
            if (this.currentFilters.generation !== 'all' && item.generation !== parseInt(this.currentFilters.generation)) return false;
            if (this.currentFilters.rarity !== 'all' && item.rarity !== this.currentFilters.rarity) return false;
            return true;
        });

        // Borne la page
        this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        this.updateDisplay();
    }

    async performSearch() {
        try {
            const body = {
                query: this.currentFilters.search.trim(),
                category: this.currentFilters.category !== 'all' ? this.currentFilters.category : undefined,
                generation: this.currentFilters.generation !== 'all' ? this.currentFilters.generation : undefined,
                rarity: this.currentFilters.rarity !== 'all' ? this.currentFilters.rarity : undefined,
                limit: 500
            };

            const resp = await this.adminPanel.apiCall('/api/admin/items/search', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (resp?.success) {
                this.filteredItems = resp.results || [];
                this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
                if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
                if (this.currentPage < 1) this.currentPage = 1;
                this.updateDisplay();
            } else {
                throw new Error(resp?.error || 'Erreur recherche');
            }
        } catch (e) {
            console.error('❌ [ItemEditor] Recherche:', e);
            // Fallback
            this.filteredItems = [];
            this.totalPages = 1;
            this.currentPage = 1;
            this.updateDisplay();
        }
    }

    // ===== RENDER =====
    updateDisplay() {
        this.updateItemsList();
        this.updatePagination();
        this.updateUI();
    }

    updateItemsList() {
        const list = this.findElement('[id*="itemsList"], .items-list, .item-editor-list');
        if (!list) { console.error('❌ [ItemEditor] itemsList introuvable'); return; }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const toShow = this.filteredItems.slice(start, end);

        if (toShow.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: .5rem;"><i class="fas fa-search"></i></div>
                    <h4>Aucun item trouvé</h4>
                    <p>Modifiez vos critères.</p>
                    ${this.hasActiveFilters() ? '<button onclick="window.itemEditorClearFilters()" style="margin-top:1rem;padding:.5rem 1rem;background:#007bff;color:#fff;border:0;border-radius:4px;">Effacer les filtres</button>' : ''}
                </div>`;
            return;
        }

        list.innerHTML = toShow.map(item => `
            <div class="item-card ${this.selectedItemId === item.itemId ? 'selected' : ''}"
                 onclick="window.itemEditorSelectItem('${item.itemId}')"
                 style="border:1px solid #ddd;padding:1rem;margin:.5rem;border-radius:4px;cursor:pointer;${this.selectedItemId===item.itemId?'background:#e3f2fd;':''}">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="font-size:1.5rem;color:#666;"><i class="fas fa-cube"></i></div>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:1.1rem;">${this.escapeHtml(item.name)}</div>
                        <div style="color:#666;font-size:.9rem;">
                            <span style="background:#f0f0f0;padding:.2rem .5rem;border-radius:3px;margin-right:.5rem;">
                                ${this.formatCategoryName(item.category)}
                            </span>
                            <span>Gen ${item.generation}</span>
                            <span style="margin-left:.5rem;color:${this.getRarityColor(item.rarity)};">
                                ${this.formatRarityName(item.rarity)}
                            </span>
                            ${item.price ? `<span style="margin-left:.5rem;">${item.price}₽</span>` : ''}
                        </div>
                        <div style="font-size:.8rem;color:#888;margin-top:.25rem;">
                            ${item.effectCount>0?`<span style="margin-right:.5rem;"><i class="fas fa-magic"></i> ${item.effectCount} effets</span>`:''}
                            ${item.obtainMethodCount>0?`<span><i class="fas fa-map-marker-alt"></i> ${item.obtainMethodCount} méthodes</span>`:''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updatePagination() {
        // Recalcule (sécurité)
        this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

        const info = this.findElement('[id*="paginationInfo"], .pagination-info');
        if (info) {
            if (this.filteredItems.length === 0) {
                info.textContent = `0-0 sur 0 items`;
            } else {
                const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
                const endItem = Math.min(startItem + this.itemsPerPage - 1, this.filteredItems.length);
                info.textContent = `${startItem}-${endItem} sur ${this.filteredItems.length} items`;
            }
        }

        const pageInfo = this.findElement('[id*="pageInfo"], .page-info');
        if (pageInfo) pageInfo.textContent = `${this.currentPage} / ${this.totalPages}`;

        const prevBtn = this.findElement('[id*="prevBtn"], .prev-btn, [onclick*="previous"]');
        const nextBtn = this.findElement('[id*="nextBtn"], .next-btn, [onclick*="next"]');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
            nextBtn.style.opacity = this.currentPage >= this.totalPages ? '0.5' : '1';
        }
    }

    initializeDropdowns() {
        console.log('🎛️ [ItemEditor] Init dropdowns');
        if (!this.stats) return;

        // Catégories
        const cat = this.findElement('[id*="category"], select[class*="category"]');
        if (cat) {
            const keep = cat.value;
            cat.innerHTML = '<option value="all">Toutes les catégories</option>';
            Object.entries(this.stats.byCategory || {})
                .sort(([a],[b]) => this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)))
                .forEach(([k,c]) => {
                    const o = document.createElement('option');
                    o.value = k; o.textContent = `${this.formatCategoryName(k)} (${c})`;
                    cat.appendChild(o);
                });
            cat.value = keep || 'all';
        }

        // Générations
        const gen = this.findElement('[id*="generation"], select[class*="generation"]');
        if (gen) {
            const keep = gen.value;
            gen.innerHTML = '<option value="all">Toutes les générations</option>';
            Object.entries(this.stats.byGeneration || {})
                .sort(([a],[b]) => parseInt(a.replace('gen_','')) - parseInt(b.replace('gen_','')))
                .forEach(([k,c]) => {
                    const n = k.replace('gen_','');
                    const o = document.createElement('option');
                    o.value = n; o.textContent = `Génération ${n} (${c})`;
                    gen.appendChild(o);
                });
            gen.value = keep || 'all';
        }

        // Raretés
        const rar = this.findElement('[id*="rarity"], select[class*="rarity"]');
        if (rar) {
            const keep = rar.value;
            rar.innerHTML = '<option value="all">Toutes les raretés</option>';
            const order = ['common','uncommon','rare','epic','legendary','mythical'];
            Object.entries(this.stats.byRarity || {})
                .sort(([a],[b]) => order.indexOf(a)-order.indexOf(b))
                .forEach(([k,c]) => {
                    const o = document.createElement('option');
                    o.value = k; o.textContent = `${this.formatRarityName(k)} (${c})`;
                    rar.appendChild(o);
                });
            rar.value = keep || 'all';
        }
        console.log('✅ [ItemEditor] Dropdowns OK');
    }

    updateUI() {
        if (this.selectedItemId) this.showItemEditor();
        else this.showEmptyState();
    }

    showEmptyState() {
        const empty = this.findElement('[id*="editorEmpty"], .editor-empty');
        const form = this.findElement('[id*="editorForm"], .editor-form, form');
        const actions = this.findElement('[id*="editorActions"], .editor-actions');
        const title = this.findElement('[id*="editorTitle"], .editor-title, h1, h2, h3');

        if (empty) empty.style.display = 'flex';
        if (form) form.style.display = 'none';
        if (actions) actions.style.display = 'none';
        if (title) title.innerHTML = '<i class="fas fa-cube"></i> Sélectionnez un item';
    }

    showItemEditor() {
        const empty = this.findElement('[id*="editorEmpty"], .editor-empty');
        const form = this.findElement('[id*="editorForm"], .editor-form, form');
        const actions = this.findElement('[id*="editorActions"], .editor-actions');
        const title = this.findElement('[id*="editorTitle"], .editor-title, h1, h2, h3');

        if (empty) empty.style.display = 'none';
        if (form) form.style.display = 'block';
        if (actions) actions.style.display = 'flex';
        if (title && this.currentItem) {
            title.innerHTML = `<i class="fas fa-cube"></i> ${this.escapeHtml(this.currentItem.name)}
                <span style="color:#666;font-size:.8em;">(${this.currentItem.itemId})</span>`;
        }
    }

    // ===== SELECT & EDIT =====
    async selectItem(itemId) {
        console.log(`📦 [ItemEditor] Sélection item: ${itemId}`);
        if (this.unsavedChanges && !confirm('Modifications non sauvegardées. Continuer ?')) return;

        try {
            const resp = await this.adminPanel.apiCall(`/api/admin/items/details/${itemId}`);
            if (!resp?.success) throw new Error(resp?.error || 'Item non trouvé');

            this.selectedItemId = itemId;
            this.currentItem = resp.item;
            this.unsavedChanges = false;

            this.populateForm(this.currentItem);
            this.updateDisplay();
            console.log(`✅ [ItemEditor] Item ${itemId} chargé`);
        } catch (e) {
            console.error('❌ [ItemEditor] Sélection:', e);
            this.adminPanel.showNotification?.('Erreur: ' + e.message, 'error');
        }
    }

    populateForm(item) {
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

        if (Array.isArray(item.tags)) this.setFieldValue('itemTags', item.tags.join(', '));

        this.populateEffects(item.effects || []);
        this.populateObtainMethods(item.obtainMethods || []);
    }

    populateEffects(effects) {
        const container = this.findElement('[id*="effectsList"], .effects-list');
        if (!container) return;

        if (effects.length === 0) {
            container.innerHTML = `
                <div style="padding:2rem;text-align:center;color:#666;">
                    <i class="fas fa-magic" style="font-size:2rem;margin-bottom:.5rem;"></i>
                    <p>Aucun effet défini</p>
                    <button onclick="window.itemEditorAddEffect()" style="padding:.5rem 1rem;background:#28a745;color:#fff;border:0;border-radius:4px;">
                        <i class="fas fa-plus"></i> Ajouter un effet
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = effects.map((effect, i) => `
            <div style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>${this.escapeHtml(effect.name || effect.id)}</strong>
                        <span style="margin-left:.5rem;color:#666;font-size:.9rem;">${effect.trigger || ''}</span>
                    </div>
                    <div>
                        <button onclick="window.itemEditorEditEffect(${i})" style="padding:.25rem .5rem;margin:0 .25rem;background:#007bff;color:#fff;border:0;border-radius:3px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.itemEditorRemoveEffect(${i})" style="padding:.25rem .5rem;background:#dc3545;color:#fff;border:0;border-radius:3px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${effect.description ? `<div style="margin-top:.5rem;font-size:.9rem;color:#666;">${this.escapeHtml(effect.description)}</div>` : ''}
                <div style="margin-top:.5rem;font-size:.8rem;color:#888;">
                    Actions: ${effect.actions?.length || 0} | Conditions: ${effect.conditions?.length || 0}
                    ${effect.priority ? ` | Priorité: ${effect.priority}` : ''}
                </div>
            </div>
        `).join('') + `
            <div style="text-align:center;margin:1rem 0;">
                <button onclick="window.itemEditorAddEffect()" style="padding:.5rem 1rem;background:#28a745;color:#fff;border:0;border-radius:4px;">
                    <i class="fas fa-plus"></i> Ajouter un effet
                </button>
            </div>`;
    }

    populateObtainMethods(methods) {
        const container = this.findElement('[id*="obtainMethodsList"], .obtain-methods-list');
        if (!container) return;

        if (methods.length === 0) {
            container.innerHTML = `
                <div style="padding:2rem;text-align:center;color:#666;">
                    <i class="fas fa-map-marker-alt" style="font-size:2rem;margin-bottom:.5rem;"></i>
                    <p>Aucune méthode définie</p>
                    <button onclick="window.itemEditorAddObtainMethod()" style="padding:.5rem 1rem;background:#28a745;color:#fff;border:0;border-radius:4px;">
                        <i class="fas fa-plus"></i> Ajouter une méthode
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = methods.map((m, i) => `
            <div style="border:1px solid #ddd;padding:1rem;margin:.5rem 0;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>${this.formatMethodName(m.method)}</strong>
                        ${m.location ? `<span style="margin-left:.5rem;color:#666;">- ${this.escapeHtml(m.location)}</span>` : ''}
                    </div>
                    <div>
                        <button onclick="window.itemEditorEditObtainMethod(${i})" style="padding:.25rem .5rem;margin:0 .25rem;background:#007bff;color:#fff;border:0;border-radius:3px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.itemEditorRemoveObtainMethod(${i})" style="padding:.25rem .5rem;background:#dc3545;color:#fff;border:0;border-radius:3px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div style="margin-top:.5rem;font-size:.8rem;color:#888;">
                    ${m.chance ? `Chance: ${m.chance}% | ` : ''}${m.cost ? `Coût: ${m.cost} ${m.currency || 'money'} | ` : ''}${m.npc ? `NPC: ${m.npc}` : ''}
                </div>
            </div>
        `).join('') + `
            <div style="text-align:center;margin:1rem 0;">
                <button onclick="window.itemEditorAddObtainMethod()" style="padding:.5rem 1rem;background:#28a745;color:#fff;border:0;border-radius:4px;">
                    <i class="fas fa-plus"></i> Ajouter une méthode
                </button>
            </div>`;
    }

    // ===== ACTIONS =====
    async saveItem() {
        console.log('💾 [ItemEditor] Sauvegarde item');
        if (!this.validateForm()) return;

        try {
            const data = this.gatherFormData();
            let resp;

            if (this.selectedItemId === 'new') {
                resp = await this.adminPanel.apiCall('/api/admin/items', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            } else {
                resp = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
            }

            if (!resp?.success) throw new Error(resp?.error || 'Erreur sauvegarde');

            this.unsavedChanges = false;
            this.adminPanel.showNotification?.(
                this.selectedItemId === 'new' ? 'Item créé' : 'Item mis à jour', 'success'
            );

            await this.loadItems();
            await this.loadStats();
            this.initializeDropdowns();

            if (this.selectedItemId === 'new') {
                // Après création, resélectionner par ID saisi
                this.selectedItemId = data.itemId;
                await this.selectItem(this.selectedItemId);
            }
        } catch (e) {
            console.error('❌ [ItemEditor] Sauvegarde:', e);
            this.adminPanel.showNotification?.('Erreur: ' + e.message, 'error');
        }
    }

    validateForm() {
        const id = this.getFieldValue('itemId');
        const name = this.getFieldValue('itemName');
        if (!id || !name) {
            this.adminPanel.showNotification?.('ID et nom requis', 'error');
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
            tags: (this.getFieldValue('itemTags') || '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean),
            effects: this.currentItem?.effects || [],
            obtainMethods: this.currentItem?.obtainMethods || [],
            version: '2.0.0',
            sourceFile: 'admin_editor'
        };
    }

    async createNewItem() {
        console.log('📦 [ItemEditor] Nouveau');
        if (this.unsavedChanges && !confirm('Modifications non sauvegardées. Continuer ?')) return;

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

        setTimeout(() => {
            const first = this.findElement('[id*="itemId"], input[name*="id"]');
            if (first) first.focus();
        }, 50);
    }

    async deleteItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification?.('Sélectionnez un item à supprimer', 'warning');
            return;
        }
        const name = this.currentItem?.name || this.selectedItemId;
        if (!confirm(`Supprimer "${name}" ?`)) return;

        try {
            const resp = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}`, { method: 'DELETE' });
            if (!resp?.success) throw new Error(resp?.error || 'Erreur suppression');

            this.adminPanel.showNotification?.('Item supprimé', 'success');
            this.selectedItemId = null;
            this.currentItem = null;
            this.unsavedChanges = false;

            await this.loadItems();
            await this.loadStats();
            this.initializeDropdowns();
            this.updateUI();
        } catch (e) {
            console.error('❌ [ItemEditor] Suppression:', e);
            this.adminPanel.showNotification?.('Erreur: ' + e.message, 'error');
        }
    }

    async duplicateItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification?.('Sélectionnez un item à dupliquer', 'warning');
            return;
        }
        try {
            const resp = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}/duplicate`, { method: 'POST' });
            if (!resp?.success) throw new Error(resp?.error || 'Erreur duplication');

            this.adminPanel.showNotification?.('Item dupliqué', 'success');
            await this.loadItems();
            await this.loadStats();
            this.initializeDropdowns();

            if (resp.newItemId) await this.selectItem(resp.newItemId);
        } catch (e) {
            console.error('❌ [ItemEditor] Duplication:', e);
            this.adminPanel.showNotification?.('Erreur: ' + e.message, 'error');
        }
    }

    // ===== PAGINATION =====
    previousPage() {
        if (this.currentPage <= 1) return;
        this.currentPage--;
        this.updateDisplay();
    }
    nextPage() {
        this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
        if (this.currentPage >= this.totalPages) return;
        this.currentPage++;
        this.updateDisplay();
    }

    // ===== QUICK ACTIONS =====
    async refreshItems() {
        console.log('🔄 [ItemEditor] Refresh');
        try {
            await this.loadItems();
            await this.loadStats();
            this.initializeDropdowns();
            this.adminPanel.showNotification?.('Liste actualisée', 'info');
        } catch (e) {
            console.error('❌ [ItemEditor] Refresh:', e);
        }
    }

    clearFilters() {
        console.log('🧹 [ItemEditor] Effacer filtres');
        this.currentFilters = { search: '', category: 'all', generation: 'all', rarity: 'all' };
        this.currentPage = 1;

        const search = this.findElement('input[placeholder*="recherch"]');
        const cat = this.findElement('[id*="category"], select[class*="category"]');
        const gen = this.findElement('[id*="generation"], select[class*="generation"]');
        const rar = this.findElement('[id*="rarity"], select[class*="rarity"]');

        if (search) search.value = '';
        if (cat) cat.value = 'all';
        if (gen) gen.value = 'all';
        if (rar) rar.value = 'all';

        this.applyFilters();
    }

    // ===== EFFECTS / METHODS =====
    addEffect() {
        if (!this.currentItem) return this.adminPanel.showNotification?.('Sélectionnez un item', 'warning');
        const newEffect = { id: `effect_${Date.now()}`, name: 'Nouvel effet', trigger: 'on_use', actions: [], conditions: [] };
        (this.currentItem.effects ||= []).push(newEffect);
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
        if (!this.currentItem) return this.adminPanel.showNotification?.('Sélectionnez un item', 'warning');
        const newMethod = { method: 'shop', location: '', cost: null };
        (this.currentItem.obtainMethods ||= []).push(newMethod);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
    }
    removeObtainMethod(index) {
        if (!this.currentItem?.obtainMethods || !confirm('Supprimer cette méthode ?')) return;
        this.currentItem.obtainMethods.splice(index, 1);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
    }

    // ===== UTILS =====
    findElement(selector) { return document.querySelector(selector); }

    setFieldValue(fieldId, value, type = 'text') {
        const el = this.findElement(`[id*="${fieldId}"], [name*="${fieldId}"]`);
        if (!el) return;
        if (type === 'checkbox') el.checked = Boolean(value);
        else el.value = (value ?? '') === null ? '' : value;
    }

    getFieldValue(fieldId, type = 'text') {
        const el = this.findElement(`[id*="${fieldId}"], [name*="${fieldId}"]`);
        if (!el) return '';
        return type === 'checkbox' ? !!el.checked : (el.value || '');
    }

    hasActiveFilters() {
        const f = this.currentFilters;
        return f.search !== '' || f.category !== 'all' || f.generation !== 'all' || f.rarity !== 'all';
    }

    parseNumber(value) {
        if (value == null || String(value).trim() === '') return null;
        const n = parseInt(value, 10);
        return Number.isNaN(n) ? null : n;
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
            'evolution_items': "Objets d'évolution",
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

    cleanup() { console.log('🧹 [ItemEditor] Cleanup'); }
}

// ===== GLOBALS =====
window.itemEditorSelectItem = (id) => window.adminPanel?.itemEditor?.selectItem(id);
window.itemEditorCreateNew = () => window.adminPanel?.itemEditor?.createNewItem();
window.itemEditorSave = () => window.adminPanel?.itemEditor?.saveItem();
window.itemEditorDuplicate = () => window.adminPanel?.itemEditor?.duplicateItem();
window.itemEditorDelete = () => window.adminPanel?.itemEditor?.deleteItem();
window.itemEditorRefresh = () => window.adminPanel?.itemEditor?.refreshItems();
window.itemEditorClearFilters = () => window.adminPanel?.itemEditor?.clearFilters();
window.itemEditorPreviousPage = () => window.adminPanel?.itemEditor?.previousPage();
window.itemEditorNextPage = () => window.adminPanel?.itemEditor?.nextPage();
window.itemEditorAddEffect = () => window.adminPanel?.itemEditor?.addEffect();
window.itemEditorEditEffect = (i) => console.log(`✏️ Édition effet ${i} - À implémenter`);
window.itemEditorRemoveEffect = (i) => window.adminPanel?.itemEditor?.removeEffect(i);
window.itemEditorAddObtainMethod = () => window.adminPanel?.itemEditor?.addObtainMethod();
window.itemEditorEditObtainMethod = (i) => console.log(`✏️ Édition méthode ${i} - À implémenter`);
window.itemEditorRemoveObtainMethod = (i) => window.adminPanel?.itemEditor?.removeObtainMethod(i);
