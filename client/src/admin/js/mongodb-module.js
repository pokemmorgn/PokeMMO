// client/src/admin/js/mongodb-module.js - Interface professionnelle DB
export class MongoDBModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'mongodb'
        this.currentCollection = null
        this.currentDatabase = null
        this.databases = []
        this.collections = []
        this.currentPage = 0
        this.pageSize = 25
        this.currentQuery = {}
        this.selectedDocument = null
        this.viewMode = 'table' // table, json, tree
        this.documentStats = {}
        console.log('🗄️ [MongoDB] Module constructeur OK')
    }

    async onTabActivated() {
        console.log('🗄️ [MongoDB] Module activé')
        try {
            await this.initializeMongoDBPanel()
        } catch (error) {
            console.error('❌ [MongoDB] Erreur initialisation:', error)
            this.showError('Erreur lors de l\'initialisation : ' + error.message)
        }
    }

    async initializeMongoDBPanel() {
        console.log('🔄 [MongoDB] Initialisation du panel professionnel...')
        
        try {
            this.renderProfessionalInterface()
            await this.loadDatabases()
            console.log('✅ [MongoDB] Interface professionnelle initialisée')
        } catch (error) {
            console.error('❌ [MongoDB] Erreur initialisation panel:', error)
            this.showError('Erreur de chargement : ' + error.message)
        }
    }

    renderProfessionalInterface() {
        console.log('🎨 [MongoDB] Rendu interface professionnelle...')
        
        const container = document.getElementById('mongodb')
        if (!container) {
            console.error('❌ [MongoDB] Container #mongodb non trouvé !')
            return
        }

        container.innerHTML = `
            <div class="mongodb-pro-interface">
                <!-- Header avec logo et connexion -->
                <div class="mongodb-pro-header">
                    <div class="mongodb-pro-logo">
                        <i class="fas fa-leaf" style="color: #4CAF50;"></i>
                        <span class="mongodb-pro-title">MongoDB Explorer</span>
                        <span class="mongodb-pro-version">v4.4</span>
                    </div>
                    <div class="mongodb-connection-info">
                        <div class="mongodb-connection-status">
                            <div class="mongodb-status-dot connected"></div>
                            <span>Connected to MongoDB</span>
                        </div>
                        <div class="mongodb-server-info">localhost:27017</div>
                    </div>
                </div>

                <!-- Layout principal -->
                <div class="mongodb-pro-layout">
                    <!-- Sidebar gauche : Explorer -->
                    <div class="mongodb-pro-sidebar">
                        <div class="mongodb-sidebar-header">
                            <h3><i class="fas fa-sitemap"></i> Database Explorer</h3>
                            <button class="mongodb-btn-icon" onclick="adminPanel.mongodb.refreshDatabases()" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        
                        <div class="mongodb-db-tree" id="databaseTree">
                            <div class="mongodb-tree-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading databases...
                            </div>
                        </div>
                    </div>

                    <!-- Zone principale -->
                    <div class="mongodb-pro-main">
                        <!-- Toolbar -->
                        <div class="mongodb-pro-toolbar">
                            <div class="mongodb-toolbar-left">
                                <div class="mongodb-breadcrumb" id="breadcrumb">
                                    <span class="mongodb-breadcrumb-item">
                                        <i class="fas fa-database"></i> Select Database
                                    </span>
                                </div>
                            </div>
                            
                            <div class="mongodb-toolbar-right">
                                <div class="mongodb-view-modes">
                                    <button class="mongodb-view-btn active" data-view="table" onclick="adminPanel.mongodb.setViewMode('table')" title="Table View">
                                        <i class="fas fa-table"></i>
                                    </button>
                                    <button class="mongodb-view-btn" data-view="json" onclick="adminPanel.mongodb.setViewMode('json')" title="JSON View">
                                        <i class="fas fa-code"></i>
                                    </button>
                                    <button class="mongodb-view-btn" data-view="tree" onclick="adminPanel.mongodb.setViewMode('tree')" title="Tree View">
                                        <i class="fas fa-sitemap"></i>
                                    </button>
                                </div>
                                
                                <button class="mongodb-btn mongodb-btn-primary" onclick="adminPanel.mongodb.showQueryBuilder()" title="Query Builder">
                                    <i class="fas fa-search"></i> Query
                                </button>
                                
                                <button class="mongodb-btn mongodb-btn-success" onclick="adminPanel.mongodb.createDocument()" title="Insert Document">
                                    <i class="fas fa-plus"></i> Insert
                                </button>
                            </div>
                        </div>

                        <!-- Zone de contenu -->
                        <div class="mongodb-pro-content">
                            <!-- État initial -->
                            <div class="mongodb-welcome-screen" id="welcomeScreen">
                                <div class="mongodb-welcome-content">
                                    <i class="fas fa-leaf mongodb-welcome-icon"></i>
                                    <h2>Welcome to MongoDB Explorer</h2>
                                    <p>Select a database and collection from the left panel to start exploring your data.</p>
                                    <div class="mongodb-quick-actions">
                                        <button class="mongodb-quick-btn" onclick="adminPanel.mongodb.showDatabaseStats()">
                                            <i class="fas fa-chart-pie"></i>
                                            Database Statistics
                                        </button>
                                        <button class="mongodb-quick-btn" onclick="adminPanel.mongodb.showServerInfo()">
                                            <i class="fas fa-server"></i>
                                            Server Information
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Zone documents -->
                            <div class="mongodb-documents-view" id="documentsView" style="display: none;">
                                <!-- Stats de collection -->
                                <div class="mongodb-collection-stats" id="collectionStats">
                                    <div class="mongodb-stats-cards">
                                        <div class="mongodb-stat-card">
                                            <div class="mongodb-stat-number" id="totalDocs">-</div>
                                            <div class="mongodb-stat-label">Documents</div>
                                        </div>
                                        <div class="mongodb-stat-card">
                                            <div class="mongodb-stat-number" id="avgDocSize">-</div>
                                            <div class="mongodb-stat-label">Avg Size</div>
                                        </div>
                                        <div class="mongodb-stat-card">
                                            <div class="mongodb-stat-number" id="collectionSize">-</div>
                                            <div class="mongodb-stat-label">Collection Size</div>
                                        </div>
                                        <div class="mongodb-stat-card">
                                            <div class="mongodb-stat-number" id="indexesCount">-</div>
                                            <div class="mongodb-stat-label">Indexes</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Query Bar -->
                                <div class="mongodb-query-bar" id="queryBar">
                                    <div class="mongodb-query-input-group">
                                        <label>Filter:</label>
                                        <input type="text" class="mongodb-query-input" id="filterInput" 
                                               placeholder="{ }" value="{}"
                                               onkeypress="if(event.key==='Enter') adminPanel.mongodb.executeFilter()">
                                        <button class="mongodb-btn mongodb-btn-primary mongodb-btn-sm" onclick="adminPanel.mongodb.executeFilter()">
                                            <i class="fas fa-play"></i>
                                        </button>
                                        <button class="mongodb-btn mongodb-btn-sm" onclick="adminPanel.mongodb.clearFilter()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                    
                                    <div class="mongodb-result-info">
                                        <span id="resultCount">0 documents</span>
                                        <div class="mongodb-pagination-simple">
                                            <button class="mongodb-btn-icon" onclick="adminPanel.mongodb.previousPage()" id="prevBtn" disabled>
                                                <i class="fas fa-chevron-left"></i>
                                            </button>
                                            <span id="pageIndicator">Page 1</span>
                                            <button class="mongodb-btn-icon" onclick="adminPanel.mongodb.nextPage()" id="nextBtn" disabled>
                                                <i class="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Contenu documents -->
                                <div class="mongodb-documents-content" id="documentsContent">
                                    <!-- Table View -->
                                    <div class="mongodb-table-view" id="tableView">
                                        <div class="mongodb-table-container">
                                            <table class="mongodb-data-table" id="documentsTable">
                                                <thead id="tableHeader"></thead>
                                                <tbody id="tableBody"></tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- JSON View -->
                                    <div class="mongodb-json-view" id="jsonView" style="display: none;">
                                        <div class="mongodb-json-container" id="jsonContainer"></div>
                                    </div>

                                    <!-- Tree View -->
                                    <div class="mongodb-tree-view" id="treeView" style="display: none;">
                                        <div class="mongodb-tree-container" id="treeContainer"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading overlay -->
                <div class="mongodb-db-loading" id="dbLoading" style="display: none;">
                    <div class="mongodb-loading-content">
                        <div class="mongodb-spinner-ring"></div>
                        <div class="mongodb-loading-text">Executing query...</div>
                    </div>
                </div>
            </div>
        `

        console.log('✅ [MongoDB] Interface professionnelle injectée')
        this.setupEventListeners()
    }

    setupEventListeners() {
        console.log('🔧 [MongoDB] Configuration des événements professionnels...')
        
        // Recherche en temps réel
        const filterInput = document.getElementById('filterInput')
        if (filterInput) {
            filterInput.addEventListener('input', this.debounce(() => {
                this.validateJSON(filterInput.value)
            }, 300))
        }

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'f':
                        e.preventDefault()
                        document.getElementById('filterInput')?.focus()
                        break
                    case 'r':
                        e.preventDefault()
                        this.refreshDatabases()
                        break
                }
            }
        })
    }

    async loadDatabases() {
        console.log('📡 [MongoDB] Chargement des bases de données...')
        
        this.showLoading(true)
        
        try {
            const data = await this.adminPanel.apiCall('/mongodb/databases')
            
            if (data.success && data.databases) {
                this.databases = data.databases
                console.log('✅ [MongoDB] Bases chargées:', this.databases.length)
                this.renderDatabaseTree()
            } else {
                throw new Error('Réponse API invalide')
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement databases:', error)
            this.adminPanel.showNotification('Erreur chargement databases: ' + error.message, 'error')
        } finally {
            this.showLoading(false)
        }
    }

    renderDatabaseTree() {
        const treeContainer = document.getElementById('databaseTree')
        if (!treeContainer) return

        treeContainer.innerHTML = this.databases.map(db => `
            <div class="mongodb-tree-node mongodb-database-node" onclick="adminPanel.mongodb.selectDatabase('${db}')">
                <div class="mongodb-node-content">
                    <i class="mongodb-node-icon fas fa-database"></i>
                    <span class="mongodb-node-label">${db}</span>
                    <i class="mongodb-node-expand fas fa-chevron-right"></i>
                </div>
                <div class="mongodb-node-children" id="collections-${db}"></div>
            </div>
        `).join('')

        console.log('✅ [MongoDB] Arbre des bases rendu')
    }

    async selectDatabase(database) {
        console.log(`📊 [MongoDB] Sélection base: ${database}`)
        
        this.currentDatabase = database
        this.currentCollection = null
        
        // Mettre à jour l'UI
        this.updateBreadcrumb([
            { icon: 'fas fa-database', text: database }
        ])
        
        // Charger les collections
        try {
            const data = await this.adminPanel.apiCall(`/mongodb/collections/${database}`)
            
            if (data.success && data.collections) {
                this.collections = data.collections
                this.renderCollections(database, data.collections)
                
                // Animer l'expansion
                const dbNode = document.querySelector(`[onclick="adminPanel.mongodb.selectDatabase('${database}')"]`)
                if (dbNode) {
                    dbNode.classList.add('expanded')
                    const expandIcon = dbNode.querySelector('.node-expand')
                    if (expandIcon) expandIcon.style.transform = 'rotate(90deg)'
                }
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement collections:', error)
            this.adminPanel.showNotification('Erreur chargement collections: ' + error.message, 'error')
        }
    }

    renderCollections(database, collections) {
        const container = document.getElementById(`collections-${database}`)
        if (!container) return

        container.innerHTML = collections.map(collection => `
            <div class="mongodb-tree-node mongodb-collection-node" onclick="adminPanel.mongodb.selectCollection('${database}', '${collection}')">
                <div class="mongodb-node-content">
                    <i class="mongodb-node-icon fas fa-table"></i>
                    <span class="mongodb-node-label">${collection}</span>
                    <span class="mongodb-node-info">...</span>
                </div>
            </div>
        `).join('')

        // Animer l'apparition
        container.style.maxHeight = collections.length * 35 + 'px'
        container.style.opacity = '1'
    }

    async selectCollection(database, collection) {
        console.log(`📋 [MongoDB] Sélection collection: ${database}.${collection}`)
        
        this.currentDatabase = database
        this.currentCollection = collection
        this.currentPage = 0
        
        // Mettre à jour l'UI
        this.updateBreadcrumb([
            { icon: 'fas fa-database', text: database },
            { icon: 'fas fa-table', text: collection }
        ])
        
        // Masquer l'écran d'accueil
        document.getElementById('welcomeScreen').style.display = 'none'
        document.getElementById('documentsView').style.display = 'block'
        
        // Charger les documents
        await this.loadDocuments()
    }

    async loadDocuments(query = {}) {
        console.log(`📄 [MongoDB] Chargement documents: ${this.currentCollection}`)
        
        this.showLoading(true)
        
        try {
            const data = await this.adminPanel.apiCall('/mongodb/documents', {
                method: 'POST',
                body: JSON.stringify({
                    database: this.currentDatabase,
                    collection: this.currentCollection,
                    query: query,
                    page: this.currentPage,
                    limit: this.pageSize
                })
            })

            if (data.success) {
                this.updateCollectionStats(data.total)
                this.renderDocuments(data.documents || [], data.total || 0)
                this.updatePagination(data.total || 0)
                
                console.log('✅ [MongoDB] Documents chargés:', data.documents?.length)
            } else {
                throw new Error('Erreur chargement documents')
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement documents:', error)
            this.adminPanel.showNotification('Erreur chargement documents: ' + error.message, 'error')
        } finally {
            this.showLoading(false)
        }
    }

    renderDocuments(documents, total) {
        // ✅ DEBUG : Afficher la structure des documents
        if (documents.length > 0) {
            console.log('🔍 [MongoDB] Premier document:', documents[0])
            console.log('🔍 [MongoDB] Clés disponibles:', Object.keys(documents[0]))
            console.log('🔍 [MongoDB] Username trouvé:', documents[0].username)
        }

        if (this.viewMode === 'table') {
            this.renderTableView(documents)
        } else if (this.viewMode === 'json') {
            this.renderJSONView(documents)
        } else if (this.viewMode === 'tree') {
            this.renderTreeView(documents)
        }

        // Mettre à jour les info de résultat
        document.getElementById('resultCount').textContent = `${documents.length} of ${total} documents`
    }

    renderTableView(documents) {
        if (!documents.length) {
            document.getElementById('tableView').innerHTML = `
                <div class="mongodb-empty-state">
                    <i class="fas fa-table"></i>
                    <h3>No documents found</h3>
                    <p>This collection is empty or your filter returned no results.</p>
                </div>
            `
            return
        }

        // Détecter les colonnes automatiquement
        const columns = this.detectColumns(documents)
        
        const tableHeader = document.getElementById('tableHeader')
        const tableBody = document.getElementById('tableBody')
        
        // Header
        tableHeader.innerHTML = `
            <tr>
                <th class="mongodb-select-column">
                    <input type="checkbox" onchange="adminPanel.mongodb.toggleAllRows(this.checked)">
                </th>
                ${columns.map(col => `
                    <th class="sortable" onclick="adminPanel.mongodb.sortBy('${col.key}')">
                        ${col.name}
                        <i class="fas fa-sort mongodb-sort-icon"></i>
                    </th>
                `).join('')}
                <th class="mongodb-actions-column">Actions</th>
            </tr>
        `
        
        // Body avec amélioration pour les valeurs imbriquées
        tableBody.innerHTML = documents.map((doc, index) => `
            <tr class="mongodb-document-row" onclick="adminPanel.mongodb.selectDocumentRow(${index})">
                <td class="mongodb-select-column">
                    <input type="checkbox" onclick="event.stopPropagation()">
                </td>
                ${columns.map(col => {
                    const value = this.getNestedValue(doc, col.key)
                    return `
                        <td class="mongodb-data-cell" title="${this.formatCellTooltip(value)}">
                            ${this.formatCellValue(value, col.type)}
                        </td>
                    `
                }).join('')}
                <td class="mongodb-actions-column">
                    <button class="mongodb-btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.editDocument('${doc._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="mongodb-btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.deleteDocument('${doc._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="mongodb-btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.inspectDocument('${doc._id}')" title="Inspect">
                        <i class="fas fa-search"></i>
                    </button>
                </td>
            </tr>
        `).join('')

        // Afficher la vue table
        document.getElementById('tableView').style.display = 'block'
        document.getElementById('jsonView').style.display = 'none'
        document.getElementById('treeView').style.display = 'none'
    }

    renderJSONView(documents) {
        const container = document.getElementById('jsonContainer')
        
        container.innerHTML = documents.map((doc, index) => `
            <div class="mongodb-json-document" onclick="adminPanel.mongodb.selectDocument(${index})">
                <div class="mongodb-json-header">
                    <span class="mongodb-doc-index">#${index + 1}</span>
                    <span class="mongodb-doc-id">${doc._id}</span>
                    <div class="mongodb-doc-actions">
                        <button class="mongodb-btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.copyJSON('${doc._id}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="mongodb-btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.editDocument('${doc._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <pre class="mongodb-json-content"><code>${JSON.stringify(doc, null, 2)}</code></pre>
            </div>
        `).join('')

        // Afficher la vue JSON
        document.getElementById('tableView').style.display = 'none'
        document.getElementById('jsonView').style.display = 'block'
        document.getElementById('treeView').style.display = 'none'
    }

    // Améliorer la détection des colonnes avec priorité pour les champs importants
    detectColumns(documents) {
        const columnSet = new Set()
        const columnFrequency = new Map()
        
        // ✅ CHAMPS PRIORITAIRES dans l'ordre exact souhaité
        const priorityFields = [
            '_id',           // ID MongoDB
            'username',      // Nom d'utilisateur (LE PLUS IMPORTANT)
            'email',         // Email
            'level',         // Niveau du joueur
            'gold',          // Argent
            'experience',    // Expérience
            'lastMap',       // Dernière carte
            'lastX',         // Position X
            'lastY',         // Position Y
            'isDev',         // Développeur
            'isActive',      // Compte actif
            'isBanned',      // Banni
            'lastLogin',     // Dernière connexion
            'loginCount',    // Nombre de connexions
            'createdAt',     // Date de création
            'totalPlaytime'  // Temps de jeu total
        ]
        
        // Analyser tous les documents pour trouver TOUS les champs
        documents.forEach(doc => {
            this.extractAllKeys(doc).forEach(key => {
                columnSet.add(key)
                columnFrequency.set(key, (columnFrequency.get(key) || 0) + 1)
            })
        })
        
        // Séparer les colonnes en prioritaires et autres
        const priorityColumns = []
        const otherColumns = []
        
        // D'abord ajouter les champs prioritaires dans l'ordre exact
        priorityFields.forEach(field => {
            if (columnSet.has(field)) {
                priorityColumns.push({
                    key: field,
                    name: this.formatColumnName(field),
                    type: this.detectColumnType(field, documents),
                    frequency: columnFrequency.get(field) || 0,
                    isPriority: true
                })
                columnSet.delete(field) // Retirer pour éviter les doublons
            }
        })
        
        // Puis ajouter les autres champs triés par fréquence
        Array.from(columnSet).forEach(key => {
            otherColumns.push({
                key,
                name: this.formatColumnName(key),
                type: this.detectColumnType(key, documents),
                frequency: columnFrequency.get(key) || 0,
                isPriority: false
            })
        })
        
        // Trier les autres colonnes par fréquence puis alphabétiquement
        otherColumns.sort((a, b) => {
            if (b.frequency !== a.frequency) return b.frequency - a.frequency
            return a.name.localeCompare(b.name)
        })
        
        // Combiner : prioritaires en premier, puis autres
        const allColumns = [...priorityColumns, ...otherColumns]
        
        console.log('📋 [MongoDB] Colonnes prioritaires:', priorityColumns.map(c => c.key))
        console.log('📋 [MongoDB] Autres colonnes:', otherColumns.map(c => `${c.key} (${c.frequency})`))
        console.log('📋 [MongoDB] Total colonnes:', allColumns.length)
        
        return allColumns
    }

    // Extraire récursivement toutes les clés d'un objet (même imbriquées)
    extractAllKeys(obj, prefix = '') {
        const keys = new Set()
        
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key
                keys.add(fullKey)
                
                // Si c'est un objet imbriqué (pas trop profond)
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && prefix.split('.').length < 2) {
                    this.extractAllKeys(obj[key], fullKey).forEach(nestedKey => {
                        keys.add(nestedKey)
                    })
                }
            })
        }
        
        return keys
    }

    // Améliorer la récupération de valeur (même imbriquée)
    getNestedValue(obj, key) {
        if (!key.includes('.')) {
            return obj[key]
        }
        
        const keys = key.split('.')
        let value = obj
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k]
            } else {
                return undefined
            }
        }
        
        return value
    }

    formatColumnName(key) {
        // Gérer les clés imbriquées
        if (key.includes('.')) {
            const parts = key.split('.')
            return parts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, ' $1')
            ).join(' → ')
        }
        
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    }

    detectColumnType(key, documents) {
        // Essayer de trouver une valeur non-null pour déterminer le type
        for (const doc of documents) {
            const sample = this.getNestedValue(doc, key)
            if (sample !== null && sample !== undefined) {
                if (Array.isArray(sample)) return 'array'
                return typeof sample
            }
        }
        return 'unknown'
    }

    formatCellValue(value, type) {
        if (value === null || value === undefined) return '<span class="mongodb-null-value">null</span>'
        
        switch (type) {
            case 'string':
                // Tronquer les chaînes trop longues mais afficher plus que 50 caractères
                return value.length > 80 ? value.substring(0, 80) + '...' : value
            case 'number':
                return value.toLocaleString()
            case 'boolean':
                return `<span class="mongodb-boolean-value">${value}</span>`
            case 'array':
                if (Array.isArray(value)) {
                    return `<span class="mongodb-array-value">Array(${value.length})</span>`
                }
                return `<span class="mongodb-array-value">Array</span>`
            case 'object':
                if (Array.isArray(value)) {
                    return `<span class="mongodb-array-value">Array(${value.length})</span>`
                }
                // Afficher le premier niveau de l'objet si petit
                if (value && typeof value === 'object') {
                    const keys = Object.keys(value)
                    if (keys.length <= 3) {
                        const preview = keys.map(k => `${k}: ${value[k]}`).join(', ')
                        return preview.length > 60 ? `<span class="mongodb-object-value">{${keys.length} keys}</span>` : `{${preview}}`
                    }
                    return `<span class="mongodb-object-value">{${keys.length} keys}</span>`
                }
                return `<span class="mongodb-object-value">Object</span>`
            default:
                const str = String(value)
                return str.length > 80 ? str.substring(0, 80) + '...' : str
        }
    }

    formatCellTooltip(value) {
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2)
        }
        return String(value)
    }

    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb')
        if (!breadcrumb) return

        breadcrumb.innerHTML = items.map((item, index) => `
            <span class="mongodb-breadcrumb-item ${index === items.length - 1 ? 'active' : ''}">
                <i class="${item.icon}"></i>
                ${item.text}
            </span>
            ${index < items.length - 1 ? '<i class="mongodb-breadcrumb-separator fas fa-chevron-right"></i>' : ''}
        `).join('')
    }

    updateCollectionStats(total) {
        document.getElementById('totalDocs').textContent = total.toLocaleString()
        document.getElementById('avgDocSize').textContent = '~1.2KB'
        document.getElementById('collectionSize').textContent = '~' + (total * 1.2).toFixed(1) + 'KB'
        document.getElementById('indexesCount').textContent = '3'
    }

    updatePagination(total) {
        const totalPages = Math.ceil(total / this.pageSize)
        const currentPage = this.currentPage + 1
        
        document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`
        document.getElementById('prevBtn').disabled = this.currentPage === 0
        document.getElementById('nextBtn').disabled = this.currentPage >= totalPages - 1
    }

    setViewMode(mode) {
        this.viewMode = mode
        
        // Mettre à jour les boutons
        document.querySelectorAll('.mongodb-view-btn').forEach(btn => btn.classList.remove('active'))
        document.querySelector(`[data-view="${mode}"]`).classList.add('active')
        
        // Recharger avec la nouvelle vue
        if (this.currentCollection) {
            this.loadDocuments(this.currentQuery)
        }
    }

    validateJSON(jsonString) {
        const input = document.getElementById('filterInput')
        try {
            JSON.parse(jsonString)
            input.classList.remove('json-error')
            input.classList.add('json-valid')
        } catch (e) {
            input.classList.remove('json-valid')
            input.classList.add('json-error')
        }
    }

    executeFilter() {
        const filterValue = document.getElementById('filterInput').value
        try {
            const query = JSON.parse(filterValue)
            this.currentQuery = query
            this.currentPage = 0
            this.loadDocuments(query)
        } catch (error) {
            this.adminPanel.showNotification('Requête JSON invalide: ' + error.message, 'error')
        }
    }

    clearFilter() {
        document.getElementById('filterInput').value = '{}'
        this.currentQuery = {}
        this.currentPage = 0
        this.loadDocuments({})
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--
            this.loadDocuments(this.currentQuery)
        }
    }

    nextPage() {
        this.currentPage++
        this.loadDocuments(this.currentQuery)
    }

    showLoading(show) {
        const loading = document.getElementById('dbLoading')
        if (loading) {
            loading.style.display = show ? 'flex' : 'none'
        }
    }

    debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }

    // Méthodes publiques (placeholders)
    refreshDatabases() { this.loadDatabases() }
    createDocument() { this.adminPanel.showNotification('Création de document en développement', 'info') }
    editDocument(id) { this.adminPanel.showNotification('Édition de document en développement', 'info') }
    deleteDocument(id) { this.adminPanel.showNotification('Suppression de document en développement', 'info') }
    inspectDocument(id) { this.adminPanel.showNotification('Inspection de document en développement', 'info') }
    showQueryBuilder() { this.adminPanel.showNotification('Query Builder en développement', 'info') }
    showDatabaseStats() { this.adminPanel.showNotification('Statistiques DB en développement', 'info') }
    showServerInfo() { this.adminPanel.showNotification('Info serveur en développement', 'info') }
    
    cleanup() {
        console.log('🧹 [MongoDB] Module cleanup')
    }
}
