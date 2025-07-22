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
            <div class="db-interface">
                <!-- Header avec logo et connexion -->
                <div class="db-header">
                    <div class="db-logo">
                        <i class="fas fa-leaf" style="color: #4CAF50;"></i>
                        <span class="db-title">MongoDB Explorer</span>
                        <span class="db-version">v4.4</span>
                    </div>
                    <div class="db-connection-info">
                        <div class="connection-status">
                            <div class="status-dot connected"></div>
                            <span>Connected to MongoDB</span>
                        </div>
                        <div class="server-info">localhost:27017</div>
                    </div>
                </div>

                <!-- Layout principal -->
                <div class="db-layout">
                    <!-- Sidebar gauche : Explorer -->
                    <div class="db-sidebar">
                        <div class="sidebar-header">
                            <h3><i class="fas fa-sitemap"></i> Database Explorer</h3>
                            <button class="btn-icon" onclick="adminPanel.mongodb.refreshDatabases()" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        
                        <div class="db-tree" id="databaseTree">
                            <div class="tree-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading databases...
                            </div>
                        </div>
                    </div>

                    <!-- Zone principale -->
                    <div class="db-main">
                        <!-- Toolbar -->
                        <div class="db-toolbar">
                            <div class="toolbar-left">
                                <div class="breadcrumb" id="breadcrumb">
                                    <span class="breadcrumb-item">
                                        <i class="fas fa-database"></i> Select Database
                                    </span>
                                </div>
                            </div>
                            
                            <div class="toolbar-right">
                                <div class="view-modes">
                                    <button class="view-btn active" data-view="table" onclick="adminPanel.mongodb.setViewMode('table')" title="Table View">
                                        <i class="fas fa-table"></i>
                                    </button>
                                    <button class="view-btn" data-view="json" onclick="adminPanel.mongodb.setViewMode('json')" title="JSON View">
                                        <i class="fas fa-code"></i>
                                    </button>
                                    <button class="view-btn" data-view="tree" onclick="adminPanel.mongodb.setViewMode('tree')" title="Tree View">
                                        <i class="fas fa-sitemap"></i>
                                    </button>
                                </div>
                                
                                <button class="btn btn-primary" onclick="adminPanel.mongodb.showQueryBuilder()" title="Query Builder">
                                    <i class="fas fa-search"></i> Query
                                </button>
                                
                                <button class="btn btn-success" onclick="adminPanel.mongodb.createDocument()" title="Insert Document">
                                    <i class="fas fa-plus"></i> Insert
                                </button>
                            </div>
                        </div>

                        <!-- Zone de contenu -->
                        <div class="db-content">
                            <!-- État initial -->
                            <div class="welcome-screen" id="welcomeScreen">
                                <div class="welcome-content">
                                    <i class="fas fa-leaf welcome-icon"></i>
                                    <h2>Welcome to MongoDB Explorer</h2>
                                    <p>Select a database and collection from the left panel to start exploring your data.</p>
                                    <div class="quick-actions">
                                        <button class="quick-btn" onclick="adminPanel.mongodb.showDatabaseStats()">
                                            <i class="fas fa-chart-pie"></i>
                                            Database Statistics
                                        </button>
                                        <button class="quick-btn" onclick="adminPanel.mongodb.showServerInfo()">
                                            <i class="fas fa-server"></i>
                                            Server Information
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Zone documents -->
                            <div class="documents-view" id="documentsView" style="display: none;">
                                <!-- Stats de collection -->
                                <div class="collection-stats" id="collectionStats">
                                    <div class="stats-cards">
                                        <div class="stat-card">
                                            <div class="stat-number" id="totalDocs">-</div>
                                            <div class="stat-label">Documents</div>
                                        </div>
                                        <div class="stat-card">
                                            <div class="stat-number" id="avgDocSize">-</div>
                                            <div class="stat-label">Avg Size</div>
                                        </div>
                                        <div class="stat-card">
                                            <div class="stat-number" id="collectionSize">-</div>
                                            <div class="stat-label">Collection Size</div>
                                        </div>
                                        <div class="stat-card">
                                            <div class="stat-number" id="indexesCount">-</div>
                                            <div class="stat-label">Indexes</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Query Bar -->
                                <div class="query-bar" id="queryBar">
                                    <div class="query-input-group">
                                        <label>Filter:</label>
                                        <input type="text" class="query-input" id="filterInput" 
                                               placeholder="{ }" value="{}"
                                               onkeypress="if(event.key==='Enter') adminPanel.mongodb.executeFilter()">
                                        <button class="btn btn-primary btn-sm" onclick="adminPanel.mongodb.executeFilter()">
                                            <i class="fas fa-play"></i>
                                        </button>
                                        <button class="btn btn-secondary btn-sm" onclick="adminPanel.mongodb.clearFilter()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                    
                                    <div class="result-info">
                                        <span id="resultCount">0 documents</span>
                                        <div class="pagination-simple">
                                            <button class="btn-icon" onclick="adminPanel.mongodb.previousPage()" id="prevBtn" disabled>
                                                <i class="fas fa-chevron-left"></i>
                                            </button>
                                            <span id="pageIndicator">Page 1</span>
                                            <button class="btn-icon" onclick="adminPanel.mongodb.nextPage()" id="nextBtn" disabled>
                                                <i class="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Contenu documents -->
                                <div class="documents-content" id="documentsContent">
                                    <!-- Table View -->
                                    <div class="table-view" id="tableView">
                                        <div class="table-container">
                                            <table class="data-table" id="documentsTable">
                                                <thead id="tableHeader"></thead>
                                                <tbody id="tableBody"></tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- JSON View -->
                                    <div class="json-view" id="jsonView" style="display: none;">
                                        <div class="json-container" id="jsonContainer"></div>
                                    </div>

                                    <!-- Tree View -->
                                    <div class="tree-view" id="treeView" style="display: none;">
                                        <div class="tree-container" id="treeContainer"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel détails document -->
                    <div class="db-inspector" id="documentInspector" style="display: none;">
                        <div class="inspector-header">
                            <h3><i class="fas fa-file-code"></i> Document Inspector</h3>
                            <button class="btn-icon" onclick="adminPanel.mongodb.closeInspector()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="inspector-content">
                            <div class="inspector-tabs">
                                <button class="tab-btn active" data-tab="document">Document</button>
                                <button class="tab-btn" data-tab="schema">Schema</button>
                                <button class="tab-btn" data-tab="history">History</button>
                            </div>
                            
                            <div class="inspector-body" id="inspectorBody">
                                <!-- Contenu sera généré dynamiquement -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading overlay -->
                <div class="db-loading" id="dbLoading" style="display: none;">
                    <div class="loading-content">
                        <div class="spinner-ring"></div>
                        <div class="loading-text">Executing query...</div>
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
            <div class="tree-node database-node" onclick="adminPanel.mongodb.selectDatabase('${db}')">
                <div class="node-content">
                    <i class="node-icon fas fa-database"></i>
                    <span class="node-label">${db}</span>
                    <i class="node-expand fas fa-chevron-right"></i>
                </div>
                <div class="node-children" id="collections-${db}"></div>
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
            <div class="tree-node collection-node" onclick="adminPanel.mongodb.selectCollection('${database}', '${collection}')">
                <div class="node-content">
                    <i class="node-icon fas fa-table"></i>
                    <span class="node-label">${collection}</span>
                    <span class="node-info">...</span>
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
                <div class="empty-state">
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
                <th class="select-column">
                    <input type="checkbox" onchange="adminPanel.mongodb.toggleAllRows(this.checked)">
                </th>
                ${columns.map(col => `
                    <th class="sortable" onclick="adminPanel.mongodb.sortBy('${col.key}')">
                        ${col.name}
                        <i class="fas fa-sort sort-icon"></i>
                    </th>
                `).join('')}
                <th class="actions-column">Actions</th>
            </tr>
        `
        
        // Body
        tableBody.innerHTML = documents.map((doc, index) => `
            <tr class="document-row" onclick="adminPanel.mongodb.selectDocumentRow(${index})">
                <td class="select-column">
                    <input type="checkbox" onclick="event.stopPropagation()">
                </td>
                ${columns.map(col => `
                    <td class="data-cell" title="${this.formatCellTooltip(doc[col.key])}">
                        ${this.formatCellValue(doc[col.key], col.type)}
                    </td>
                `).join('')}
                <td class="actions-column">
                    <button class="btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.editDocument('${doc._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.deleteDocument('${doc._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.inspectDocument('${doc._id}')" title="Inspect">
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
            <div class="json-document" onclick="adminPanel.mongodb.selectDocument(${index})">
                <div class="json-header">
                    <span class="doc-index">#${index + 1}</span>
                    <span class="doc-id">${doc._id}</span>
                    <div class="doc-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.copyJSON('${doc._id}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); adminPanel.mongodb.editDocument('${doc._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <pre class="json-content"><code>${JSON.stringify(doc, null, 2)}</code></pre>
            </div>
        `).join('')

        // Afficher la vue JSON
        document.getElementById('tableView').style.display = 'none'
        document.getElementById('jsonView').style.display = 'block'
        document.getElementById('treeView').style.display = 'none'
    }

    // Utilitaires
    detectColumns(documents) {
        const columnSet = new Set()
        documents.forEach(doc => {
            Object.keys(doc).forEach(key => columnSet.add(key))
        })
        
        const columns = Array.from(columnSet).map(key => ({
            key,
            name: this.formatColumnName(key),
            type: this.detectColumnType(key, documents)
        }))
        
        // Mettre _id en premier
        return columns.sort((a, b) => {
            if (a.key === '_id') return -1
            if (b.key === '_id') return 1
            return a.name.localeCompare(b.name)
        }).slice(0, 10) // Limiter à 10 colonnes
    }

    formatColumnName(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    }

    detectColumnType(key, documents) {
        const sample = documents.find(doc => doc[key] !== undefined)?.[key]
        if (sample === null || sample === undefined) return 'null'
        return typeof sample
    }

    formatCellValue(value, type) {
        if (value === null || value === undefined) return '<span class="null-value">null</span>'
        
        switch (type) {
            case 'string':
                return value.length > 50 ? value.substring(0, 50) + '...' : value
            case 'number':
                return value.toLocaleString()
            case 'boolean':
                return `<span class="boolean-value">${value}</span>`
            case 'object':
                if (Array.isArray(value)) {
                    return `<span class="array-value">Array(${value.length})</span>`
                }
                return `<span class="object-value">Object</span>`
            default:
                return String(value)
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
            <span class="breadcrumb-item ${index === items.length - 1 ? 'active' : ''}">
                <i class="${item.icon}"></i>
                ${item.text}
            </span>
            ${index < items.length - 1 ? '<i class="breadcrumb-separator fas fa-chevron-right"></i>' : ''}
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
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'))
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
