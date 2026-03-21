const API_URL = 'http://localhost:3000/api';

let currentEditId = null;

// Charger tous les articles au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    
    // Écouteurs d'événements
    document.getElementById('createForm').addEventListener('submit', createArticle);
    document.getElementById('searchBtn').addEventListener('click', searchArticles);
    document.getElementById('resetSearchBtn').addEventListener('click', resetSearch);
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    document.getElementById('editForm').addEventListener('submit', updateArticle);
    
    // Fermeture du modal
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
});

// Charger tous les articles
async function loadArticles() {
    try {
        const response = await fetch(`${API_URL}/articles`);
        const articles = await response.json();
        displayArticles(articles);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('articlesList').innerHTML = '<div class="empty">❌ Erreur de connexion au serveur</div>';
    }
}

// Afficher les articles
function displayArticles(articles) {
    const container = document.getElementById('articlesList');
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<div class="empty">📭 Aucun article trouvé</div>';
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <div class="article-item">
            <div class="article-header">
                <div class="article-title">${escapeHtml(article.titre)}</div>
                <div class="article-date">${new Date(article.date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="article-content">${escapeHtml(article.contenu)}</div>
            <div class="article-meta">
                <span class="article-author">✍️ ${escapeHtml(article.auteur)}</span>
                ${article.categorie ? `<span class="article-categorie">📁 ${escapeHtml(article.categorie)}</span>` : ''}
                ${article.tags ? `<span class="article-tags">🏷️ ${escapeHtml(article.tags)}</span>` : ''}
            </div>
            <div class="article-actions">
                <button onclick="editArticle(${article.id})" class="btn-secondary">✏️ Modifier</button>
                <button onclick="deleteArticle(${article.id})" class="btn-danger">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

// Créer un article
async function createArticle(e) {
    e.preventDefault();
    
    const article = {
        titre: document.getElementById('titre').value,
        contenu: document.getElementById('contenu').value,
        auteur: document.getElementById('auteur').value,
        categorie: document.getElementById('categorie').value,
        tags: document.getElementById('tags').value
    };
    
    try {
        const response = await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(article)
        });
        
        if (response.ok) {
            alert('✅ Article créé avec succès !');
            document.getElementById('createForm').reset();
            loadArticles();
        } else {
            const error = await response.json();
            alert(`❌ Erreur: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur de connexion au serveur');
    }
}

// Rechercher des articles
async function searchArticles() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        alert('Veuillez entrer un terme de recherche');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/articles/search?query=${encodeURIComponent(query)}`);
        const articles = await response.json();
        displayArticles(articles);
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la recherche');
    }
}

// Réinitialiser la recherche
function resetSearch() {
    document.getElementById('searchInput').value = '';
    loadArticles();
}

// Appliquer les filtres
async function applyFilters() {
    const categorie = document.getElementById('filterCategorie').value;
    const auteur = document.getElementById('filterAuteur').value;
    const date = document.getElementById('filterDate').value;
    
    let url = `${API_URL}/articles?`;
    const params = [];
    if (categorie) params.push(`categorie=${encodeURIComponent(categorie)}`);
    if (auteur) params.push(`auteur=${encodeURIComponent(auteur)}`);
    if (date) params.push(`date=${date}`);
    
    if (params.length === 0) {
        alert('Veuillez remplir au moins un filtre');
        return;
    }
    
    url += params.join('&');
    
    try {
        const response = await fetch(url);
        const articles = await response.json();
        displayArticles(articles);
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de l\'application des filtres');
    }
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('filterCategorie').value = '';
    document.getElementById('filterAuteur').value = '';
    document.getElementById('filterDate').value = '';
    loadArticles();
}

// Modifier un article
async function editArticle(id) {
    try {
        const response = await fetch(`${API_URL}/articles/${id}`);
        const article = await response.json();
        
        currentEditId = id;
        document.getElementById('editTitre').value = article.titre;
        document.getElementById('editContenu').value = article.contenu;
        document.getElementById('editCategorie').value = article.categorie || '';
        document.getElementById('editTags').value = article.tags || '';
        
        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du chargement de l\'article');
    }
}

// Mettre à jour un article
async function updateArticle(e) {
    e.preventDefault();
    
    const updates = {};
    const titre = document.getElementById('editTitre').value;
    const contenu = document.getElementById('editContenu').value;
    const categorie = document.getElementById('editCategorie').value;
    const tags = document.getElementById('editTags').value;
    
    if (titre) updates.titre = titre;
    if (contenu) updates.contenu = contenu;
    if (categorie) updates.categorie = categorie;
    if (tags) updates.tags = tags;
    
    try {
        const response = await fetch(`${API_URL}/articles/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        if (response.ok) {
            alert('✅ Article modifié avec succès !');
            document.getElementById('editModal').style.display = 'none';
            loadArticles();
        } else {
            const error = await response.json();
            alert(`❌ Erreur: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la modification');
    }
}

// Supprimer un article
async function deleteArticle(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    try {
        const response = await fetch(`${API_URL}/articles/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('✅ Article supprimé avec succès !');
            loadArticles();
        } else {
            const error = await response.json();
            alert(`❌ Erreur: ${error.error}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

// Échapper les caractères HTML pour éviter les injections XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}