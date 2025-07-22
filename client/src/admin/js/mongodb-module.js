// client/src/admin/js/mongodb-module.js
export class MongoDBModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'mongodb'
        this.currentCollection = null
        this.currentDatabase = null
        this.databases = []
        this.collections = []
        this.currentPage = 0
        this.pageSize = 20
        this.currentQuery = {}
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
        console.log('🔄 [MongoDB] Initialisation du panel...')
        
        try {
            // D'abord rendre l'interface
            this.renderMongoDBPanel()
            
            // Puis charger les données
            await this.loadDatabases()
            
            console.log('✅ [MongoDB] Panel initialisé avec succès')
        } catch (error) {
            console.error('❌ [MongoDB] Erreur initialisation panel:', error)
            this.showError('Erreur de chargement : ' + error.message)
        }
    }

    renderMongoDBPanel() {
        console.log('🎨 [MongoDB] Rendu de l\'interface...')
        
        const container = document.getElementById('mongodb')
        if (!container) {
            console.error('❌ [MongoDB] Container #mongodb non trouvé !')
            return
        }

        console.log('✅ [MongoDB] Container trouvé, injection HTML...')

        container.innerHTML = `
            <div class="mongodb-container">
                <!-- Header -->
                <div class="mongodb-header">
                    <h2 style="margin-bottom: 25px; color: #2c3e50;">
                        <i class="fas fa-database"></i> Explorateur MongoDB
                    </h2>
                    
                    <div class="mongodb-navigation">
                        <div class="nav-section">
                            <label for="databaseSelect" class="form-label">Base de données:</label>
                            <select id="databaseSelect" class="form-select" style="min-width: 200px;">
                                <option value="">Chargement des bases...</option>
                            </select>
                            <button class="btn btn-primary" onclick="adminPanel.mongodb.refreshDatabases()" style="margin-left: 10px;">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                        </div>
                        
                        <div class="nav-section" id="collectionsSection" style="display: none;">
                            <label for="collectionSelect" class="form-label">Collection:</label>
                            <select id="collectionSelect" class="form-select" style="min-width: 200px;">
                                <option value="">Sélectionnez une collection...</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Status -->
                <div id="mongoStatus" style="padding: 10px; background: #e8f5e8; border-radius: 5px; margin-bottom: 20px;">
                    <strong>Status:</strong> <span id="statusText">Initialisation...</span>
                </div>

                <!-- Query Section -->
                <div class="mongodb-query-section" id="querySection" style="display: none;">
                    <div class="query-header">
                        <h3>Requête MongoDB</h3>
                        <div class="query-actions">
                            <button class="btn btn-success" onclick="adminPanel.mongodb.executeQuery()">
                                <i class="fas fa-play"></i> Exécuter
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.mongodb.clearQuery()">
                                <i class="fas fa-times"></i> Effacer
                            </button>
                        </div>
                    </div>
                    
                    <div class="query-builder">
                        <textarea id="mongoQuery" class="form-textarea" rows="4" 
                                  placeholder='{"username": "john", "level": {"$gte": 5}}'>{}</textarea>
                        <div class="query-help">
                            <small>Syntaxe MongoDB JSON. Exemple: {"level": {"$gte": 10}, "isActive": true}</small>
                        </div>
                    </div>
                </div>

                <!-- Results Section -->
                <div class="mongodb-results" id="resultsSection" style="display: none;">
                    <div class="results-header">
                        <h3>Documents <span id="resultsCount" class="badge badge-primary">0</span></h3>
                        <div class="results-actions">
                            <button class="btn btn-success" onclick="adminPanel.mongodb.createDocument()">
                                <i class="fas fa-plus"></i> Nouveau
                            </button>
                            <div class="pagination-controls">
                                <button id="prevPage" class="btn btn-secondary btn-sm" onclick="adminPanel.mongodb.previousPage()">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span id="pageInfo">Page 1</span>
                                <button id="nextPage" class="btn btn-secondary btn-sm" onclick="adminPanel.mongodb.nextPage()">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="documents-container" id="documentsContainer">
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            Sélectionnez une collection pour voir les documents
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div class="loading" id="documentsLoading" style="display: none;">
                    <div class="spinner"></div>
                    Chargement...
                </div>
            </div>
        `

        console.log('✅ [MongoDB] HTML injecté, configuration des événements...')
        this.setupEventListeners()
    }

    setupEventListeners() {
        console.log('🔧 [MongoDB] Configuration des événements...')
        
        // Database selection
        const dbSelect = document.getElementById('databaseSelect')
        if (dbSelect) {
            dbSelect.addEventListener('change', async (e) => {
                const database = e.target.value
                if (database) {
                    await this.loadCollections(database)
                } else {
                    this.updateCollectionsList([])
                }
                this.updateVisibility()
            })
            console.log('✅ [MongoDB] Événement database select configuré')
        }

        // Collection selection
        const collSelect = document.getElementById('collectionSelect')
        if (collSelect) {
            collSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadDocuments(e.target.value)
                }
                this.updateVisibility()
            })
            console.log('✅ [MongoDB] Événement collection select configuré')
        }
    }

    async loadDatabases() {
        console.log('📡 [MongoDB] Chargement des bases de données...')
        
        this.updateStatus('Chargement des bases de données...')
        
        try {
            const data = await this.adminPanel.apiCall('/mongodb/databases')
            
            console.log('✅ [MongoDB] Réponse API:', data)
            
            if (data.success && data.databases) {
                this.databases = data.databases
                console.log('✅ [MongoDB] Bases chargées:', this.databases.length)
                
                this.updateDatabasesList()
                this.updateStatus(`${this.databases.length} base(s) de données disponible(s)`)
            } else {
                throw new Error('Réponse API invalide')
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement databases:', error)
            this.updateStatus('Erreur de chargement des bases : ' + error.message)
            this.adminPanel.showNotification('Erreur chargement databases: ' + error.message, 'error')
        }
    }

    updateDatabasesList() {
        const dbSelect = document.getElementById('databaseSelect')
        if (!dbSelect) return

        dbSelect.innerHTML = '<option value="">Sélectionnez une base...</option>' +
            this.databases.map(db => 
                `<option value="${db}">${db}</option>`
            ).join('')
        
        console.log('✅ [MongoDB] Liste des bases mise à jour')
    }

    updateCollectionsList(collections = []) {
        const collSelect = document.getElementById('collectionSelect')
        if (!collSelect) return

        this.collections = collections
        collSelect.innerHTML = '<option value="">Sélectionnez une collection...</option>' +
            this.collections.map(coll => 
                `<option value="${coll}">${coll}</option>`
            ).join('')
        
        console.log('✅ [MongoDB] Liste des collections mise à jour:', collections.length)
    }

    async loadCollections(database) {
        console.log(`📡 [MongoDB] Chargement collections pour: ${database}`)
        
        this.updateStatus(`Chargement collections de ${database}...`)
        this.currentDatabase = database
        
        try {
            const data = await this.adminPanel.apiCall(`/mongodb/collections/${database}`)
            
            if (data.success && data.collections) {
                this.updateCollectionsList(data.collections)
                this.updateStatus(`${data.collections.length} collection(s) dans ${database}`)
                
                // Afficher la section collections
                const collectionsSection = document.getElementById('collectionsSection')
                if (collectionsSection) {
                    collectionsSection.style.display = 'block'
                }
                
                console.log('✅ [MongoDB] Collections chargées:', data.collections.length)
            } else {
                throw new Error('Erreur chargement collections')
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement collections:', error)
            this.updateStatus('Erreur chargement collections: ' + error.message)
            this.adminPanel.showNotification('Erreur chargement collections: ' + error.message, 'error')
        }
    }

    async loadDocuments(collection, page = 0, query = {}) {
        console.log(`📡 [MongoDB] Chargement documents: ${collection}`)
        
        this.updateStatus(`Chargement documents de ${collection}...`)
        this.currentCollection = collection
        this.currentPage = page
        this.currentQuery = query
        
        this.showLoading(true)
        
        try {
            const data = await this.adminPanel.apiCall('/mongodb/documents', {
                method: 'POST',
                body: JSON.stringify({
                    database: this.currentDatabase,
                    collection: collection,
                    query: query,
                    page: page,
                    limit: this.pageSize
                })
            })

            if (data.success) {
                this.renderDocuments(data.documents || [], data.total || 0)
                this.updateStatus(`${data.documents?.length || 0}/${data.total || 0} documents affichés`)
                
                // Afficher les sections
                const querySection = document.getElementById('querySection')
                const resultsSection = document.getElementById('resultsSection')
                if (querySection) querySection.style.display = 'block'
                if (resultsSection) resultsSection.style.display = 'block'
                
                console.log('✅ [MongoDB] Documents chargés:', data.documents?.length)
            } else {
                throw new Error('Erreur chargement documents')
            }
            
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement documents:', error)
            this.updateStatus('Erreur chargement documents: ' + error.message)
            this.adminPanel.showNotification('Erreur chargement documents: ' + error.message, 'error')
        } finally {
            this.showLoading(false)
        }
    }

    renderDocuments(documents, total) {
        const container = document.getElementById('documentsContainer')
        const countBadge = document.getElementById('resultsCount')
        const pageInfo = document.getElementById('pageInfo')

        if (countBadge) countBadge.textContent = total
        if (pageInfo) {
            const currentPage = this.currentPage + 1
            const totalPages = Math.ceil(total / this.pageSize)
            pageInfo.textContent = `Page ${currentPage} / ${totalPages}`
        }

        if (!container) return

        if (documents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-database" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Aucun document trouvé</p>
                </div>
            `
            return
        }

        container.innerHTML = `
            <div class="documents-table">
                ${documents.map((doc, index) => `
                    <div class="document-card">
                        <div class="document-header">
                            <div class="document-id">
                                <strong>ID:</strong> ${doc._id}
                            </div>
                            <div class="document-actions">
                                <button class="btn btn-info btn-sm" onclick="adminPanel.mongodb.editDocument('${doc._id}')">
                                    <i class="fas fa-edit"></i> Éditer
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.mongodb.deleteDocument('${doc._id}')">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                        <div class="document-content">
                            <pre><code>${JSON.stringify(doc, null, 2)}</code></pre>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    }

    updateVisibility() {
        const collectionsSection = document.getElementById('collectionsSection')
        const querySection = document.getElementById('querySection')
        const resultsSection = document.getElementById('resultsSection')

        if (collectionsSection) {
            collectionsSection.style.display = this.currentDatabase ? 'block' : 'none'
        }
        if (querySection) {
            querySection.style.display = this.currentCollection ? 'block' : 'none'
        }
        if (resultsSection) {
            resultsSection.style.display = this.currentCollection ? 'block' : 'none'
        }
    }

    updateStatus(message) {
        const statusText = document.getElementById('statusText')
        if (statusText) {
            statusText.textContent = message
        }
        console.log('📊 [MongoDB] Status:', message)
    }

    showLoading(show) {
        const loading = document.getElementById('documentsLoading')
        if (loading) {
            loading.style.display = show ? 'block' : 'none'
        }
    }

    showError(message) {
        const container = document.getElementById('mongodb')
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <div style="color: #e74c3c; font-size: 1.2rem; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erreur MongoDB
                    </div>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Recharger
                    </button>
                </div>
            `
        }
    }

    // Méthodes publiques pour les boutons
    async refreshDatabases() {
        await this.loadDatabases()
    }

    executeQuery() {
        const queryText = document.getElementById('mongoQuery')?.value || '{}'
        try {
            const query = JSON.parse(queryText)
            this.loadDocuments(this.currentCollection, 0, query)
        } catch (error) {
            this.adminPanel.showNotification('Requête JSON invalide: ' + error.message, 'error')
        }
    }

    clearQuery() {
        const queryText = document.getElementById('mongoQuery')
        if (queryText) {
            queryText.value = '{}'
            this.loadDocuments(this.currentCollection, 0, {})
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.loadDocuments(this.currentCollection, this.currentPage - 1, this.currentQuery)
        }
    }

    nextPage() {
        this.loadDocuments(this.currentCollection, this.currentPage + 1, this.currentQuery)
    }

    editDocument(documentId) {
        console.log('🔧 [MongoDB] Édition document:', documentId)
        this.adminPanel.showNotification('Éditeur de document en développement', 'info')
    }

    deleteDocument(documentId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            console.log('🗑️ [MongoDB] Suppression document:', documentId)
            this.adminPanel.showNotification('Suppression en développement', 'info')
        }
    }

    createDocument() {
        console.log('➕ [MongoDB] Création nouveau document')
        this.adminPanel.showNotification('Création de document en développement', 'info')
    }

    cleanup() {
        console.log('🧹 [MongoDB] Module cleanup')
    }
}
