.mongodb-data-cell {
    max-width: /* MongoDB Professional Interface Styles - ISOLÉS */

.mongodb-pro-interface {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
}

/* Header MongoDB */
.mongodb-pro-header {
    background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
    color: white;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 100;
}

.mongodb-pro-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
}

.mongodb-pro-title {
    font-size: 1.3rem;
}

.mongodb-pro-version {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
}

.mongodb-connection-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.mongodb-connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
}

.mongodb-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
    animation: mongodb-pulse 2s infinite;
}

.mongodb-server-info {
    font-size: 0.75rem;
    opacity: 0.8;
    font-family: monospace;
}

@keyframes mongodb-pulse {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}

/* Layout principal MongoDB */
.mongodb-pro-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Sidebar MongoDB */
.mongodb-pro-sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.mongodb-sidebar-header {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mongodb-sidebar-header h3 {
    margin: 0;
    font-size: 0.95rem;
    color: #333;
    font-weight: 600;
}

.mongodb-btn-icon {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    border-radius: 4px;
    color: #666;
    transition: all 0.2s ease;
}

.mongodb-btn-icon:hover {
    background: #e3f2fd;
    color: #1976d2;
}

/* Arbre des bases MongoDB */
.mongodb-db-tree {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

.mongodb-tree-loading {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    font-size: 0.9rem;
}

.mongodb-tree-node {
    margin-bottom: 2px;
}

.mongodb-node-content {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.mongodb-node-content:hover {
    background: #f0f7ff;
}

.mongodb-database-node.expanded > .mongodb-node-content {
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 500;
}

.mongodb-collection-node .mongodb-node-content:hover {
    background: #fff3e0;
}

.mongodb-collection-node .mongodb-node-content.active {
    background: #ff9800;
    color: white;
}

.mongodb-node-icon {
    margin-right: 8px;
    width: 16px;
    text-align: center;
    color: #666;
}

.mongodb-database-node .mongodb-node-icon {
    color: #4CAF50;
}

.mongodb-collection-node .mongodb-node-icon {
    color: #ff9800;
}

.mongodb-node-label {
    flex: 1;
    font-weight: 500;
}

.mongodb-node-expand {
    margin-left: auto;
    font-size: 0.7rem;
    transition: transform 0.3s ease;
    color: #999;
}

.mongodb-node-children {
    margin-left: 20px;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all 0.3s ease;
}

.mongodb-collection-node {
    margin-bottom: 1px;
}

.mongodb-collection-node .mongodb-node-content {
    padding: 6px 12px;
    font-size: 0.85rem;
}

/* Zone principale MongoDB */
.mongodb-pro-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Toolbar MongoDB */
.mongodb-pro-toolbar {
    background: white;
    border-bottom: 1px solid #e0e0e0;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.mongodb-toolbar-left,
.mongodb-toolbar-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.mongodb-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #666;
}

.mongodb-breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.mongodb-breadcrumb-item.active {
    color: #333;
    font-weight: 600;
}

.mongodb-breadcrumb-separator {
    color: #ccc;
    font-size: 0.7rem;
}

.mongodb-view-modes {
    display: flex;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 2px;
}

.mongodb-view-btn {
    padding: 6px 10px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    color: #666;
    transition: all 0.2s ease;
    font-size: 0.85rem;
}

.mongodb-view-btn.active,
.mongodb-view-btn:hover {
    background: white;
    color: #333;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.mongodb-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.mongodb-btn:hover {
    border-color: #bbb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.mongodb-btn-primary {
    background: #1976d2;
    border-color: #1976d2;
    color: white;
}

.mongodb-btn-primary:hover {
    background: #1565c0;
    border-color: #1565c0;
}

.mongodb-btn-success {
    background: #4CAF50;
    border-color: #4CAF50;
    color: white;
}

.mongodb-btn-success:hover {
    background: #43a047;
    border-color: #43a047;
}

/* Contenu MongoDB */
.mongodb-pro-content {
    flex: 1;
    overflow: hidden;
    background: #fafafa;
}

/* Écran d'accueil MongoDB */
.mongodb-welcome-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
}

.mongodb-welcome-content {
    text-align: center;
    max-width: 500px;
    padding: 40px;
}

.mongodb-welcome-icon {
    font-size: 4rem;
    color: #4CAF50;
    margin-bottom: 20px;
}

.mongodb-welcome-content h2 {
    color: #333;
    margin-bottom: 15px;
    font-weight: 300;
}

.mongodb-welcome-content p {
    color: #666;
    margin-bottom: 30px;
    line-height: 1.5;
}

.mongodb-quick-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
}

.mongodb-quick-btn {
    padding: 12px 20px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 140px;
}

.mongodb-quick-btn:hover {
    background: #e3f2fd;
    border-color: #1976d2;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
}

.mongodb-quick-btn i {
    font-size: 1.5rem;
    color: #1976d2;
}

/* Zone documents MongoDB */
.mongodb-documents-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
}

.mongodb-collection-stats {
    padding: 15px 20px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
}

.mongodb-stats-cards {
    display: flex;
    gap: 20px;
}

.mongodb-stat-card {
    text-align: center;
    padding: 12px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    min-width: 100px;
}

.mongodb-stat-number {
    font-size: 1.4rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
}

.mongodb-stat-label {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Barre de requête MongoDB */
.mongodb-query-bar {
    padding: 15px 20px;
    border-bottom: 1px solid #e0e0e0;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.mongodb-query-input-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.mongodb-query-input-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #666;
    min-width: 40px;
}

.mongodb-query-input {
    flex: 1;
    max-width: 400px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    background: #fafafa;
}

.mongodb-query-input:focus {
    outline: none;
    border-color: #1976d2;
    background: white;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.mongodb-query-input.json-valid {
    border-color: #4CAF50;
    background: #f8fff8;
}

.mongodb-query-input.json-error {
    border-color: #f44336;
    background: #fff8f8;
}

.mongodb-result-info {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 0.85rem;
    color: #666;
}

.mongodb-pagination-simple {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mongodb-btn-sm {
    padding: 4px 8px;
    font-size: 0.75rem;
}

/* Table View MongoDB */
.mongodb-table-view {
    flex: 1;
    overflow: hidden;
}

.mongodb-table-container {
    height: 100%;
    overflow: auto;
    /* Permettre le scroll horizontal si beaucoup de colonnes */
    overflow-x: auto;
    overflow-y: auto;
}

.mongodb-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    /* Largeur minimale pour éviter que les colonnes soient trop compressées */
    min-width: max-content;
}

.mongodb-data-table th {
    background: #f5f5f5;
    padding: 12px 8px;
    text-align: left;
    border-bottom: 2px solid #e0e0e0;
    font-weight: 600;
    color: #333;
    position: sticky;
    top: 0;
    z-index: 10;
}

.mongodb-data-table th.sortable {
    cursor: pointer;
    user-select: none;
}

.mongodb-data-table th.sortable:hover {
    background: #eeeeee;
}

.mongodb-sort-icon {
    margin-left: 4px;
    font-size: 0.7rem;
    color: #999;
}

.mongodb-data-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
}

.mongodb-document-row {
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.mongodb-document-row:hover {
    background: #f9f9f9;
}

.mongodb-document-row.selected {
    background: #e3f2fd;
}

.mongodb-select-column {
    width: 40px;
    text-align: center;
}

.mongodb-actions-column {
    width: 120px;
    text-align: center;
}

.mongodb-data-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mongodb-null-value {
    color: #999;
    font-style: italic;
}

.mongodb-boolean-value {
    color: #1976d2;
    font-weight: 500;
}

.mongodb-array-value {
    color: #ff9800;
    font-weight: 500;
}

.mongodb-object-value {
    color: #9c27b0;
    font-weight: 500;
}

/* JSON View MongoDB */
.mongodb-json-view {
    flex: 1;
    overflow: auto;
    padding: 20px;
}

.mongodb-json-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.mongodb-json-document {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mongodb-json-document:hover {
    border-color: #1976d2;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.mongodb-json-header {
    background: #fafafa;
    padding: 10px 15px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mongodb-doc-index {
    font-size: 0.8rem;
    color: #666;
    font-weight: 500;
}

.mongodb-doc-id {
    font-family: monospace;
    font-size: 0.8rem;
    color: #333;
}

.mongodb-doc-actions {
    display: flex;
    gap: 4px;
}

.mongodb-json-content {
    margin: 0;
    padding: 15px;
    background: #fafafa;
    font-family: monospace;
    font-size: 0.8rem;
    line-height: 1.4;
    overflow-x: auto;
}

/* Loading MongoDB */
.mongodb-db-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.mongodb-loading-content {
    text-align: center;
    color: #666;
}

.mongodb-spinner-ring {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4CAF50;
    border-radius: 50%;
    animation: mongodb-spin 1s linear infinite;
    margin: 0 auto 15px;
}

.mongodb-loading-text {
    font-size: 0.9rem;
}

@keyframes mongodb-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Empty State MongoDB */
.mongodb-empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
}

.mongodb-empty-state i {
    font-size: 3rem;
    margin-bottom: 20px;
    opacity: 0.3;
}

.mongodb-empty-state h3 {
    margin-bottom: 10px;
    color: #333;
    font-weight: 300;
}

.mongodb-empty-state p {
    margin: 0;
    font-size: 0.9rem;
}

/* Responsive MongoDB */
@media (max-width: 1200px) {
    .mongodb-pro-sidebar {
        width: 240px;
    }
}

@media (max-width: 768px) {
    .mongodb-pro-layout {
        flex-direction: column;
    }
    
    .mongodb-pro-sidebar {
        width: 100%;
        height: 200px;
    }
    
    .mongodb-pro-toolbar {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
    }
    
    .mongodb-toolbar-left,
    .mongodb-toolbar-right {
        justify-content: center;
    }
    
    .mongodb-stats-cards {
        overflow-x: auto;
        padding-bottom: 10px;
    }
    
    .mongodb-query-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
}
