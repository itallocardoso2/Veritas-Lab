document.addEventListener('DOMContentLoaded', () => {
    const articlesContainer = document.getElementById('articles-container');
    const loadMoreButton = document.getElementById('load-more-button');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    let currentPage = 1;
    let isLoading = false;
    let currentSearchTerm = ''; // Variável para guardar o termo de busca atual
    let activeFilters = {};

    function escapeHtml(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    // Função que cria o HTML para um único card de artigo
    function createArticleCard(article) {
        // Formata a data para um formato legível
        const publishedDate = new Date(article.published_at).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Limita o resumo a um número de caracteres
        const abstractSnippet = article.abstract && article.abstract.length > 200 ?
            `${article.abstract.substring(0, 200)}...` :
            (article.abstract || '');


        const authorsHtml = article.authors
            ? (Array.isArray(article.authors)
                ? article.authors.map(a => {
                    const name = escapeHtml(a.name || a);
                    return a.user_id ? `<a href="/perfil-usuario.html?id=${a.user_id}" class="hover:underline text-primary">${name}</a>` : name;
                }).join(', ')
                : escapeHtml(article.author_name || ''))
            : escapeHtml(article.author_name || '');
        const journal = escapeHtml(article.journal || '');
        const tagsHtml = (article.tags && article.tags.length > 0) ? article.tags.map(t => `<div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-background-dark px-4"><p class="text-white text-sm font-medium leading-normal">${escapeHtml(t)}</p></div>`).join('\n') : '';

        return `
            <div class="bg-[#1E1E1E] rounded-xl p-6 transition-all hover:bg-primary/10 w-full max-w-4xl" data-article-id="${article.id}">
                <div class="flex flex-col gap-4 min-w-0">
                    <div class="min-w-0">
                        <h3 class="text-white tracking-light text-2xl font-bold leading-tight break-words overflow-wrap-anywhere">
                            <a href="/detalhes.html?id=${article.id}" class="hover:underline break-words">${escapeHtml(article.title)}</a>
                        </h3>
                        <p class="text-[#B3B3B3] text-sm mt-1 break-words">${authorsHtml} ${journal ? `| ${journal}` : ''} | Publicado em ${publishedDate}</p>
                    </div>
                        <p class="text-[#E0E0E0] text-base leading-relaxed break-words">
                        ${escapeHtml(abstractSnippet)}
                        <a class="text-primary hover:underline" href="/detalhes.html?id=${article.id}">ver mais</a>
                    </p>
                    <div class="flex gap-3 flex-wrap pr-4">${tagsHtml}</div>
                    <div class="flex items-center gap-6 text-[#B3B3B3] pt-4 border-t border-[#2a2a2a] flex-wrap">
                        <button class="save-btn flex items-center gap-2 hover:text-primary" data-id="${article.id}"><span class="material-symbols-outlined">bookmark_border</span><span class="save-label"> Salvar</span></button>
                        <button class="share-btn flex items-center gap-2 hover:text-primary" data-id="${article.id}"><span class="material-symbols-outlined">share</span> Compartilhar</button>
                        <button class="cite-btn flex items-center gap-2 hover:text-primary" data-id="${article.id}" data-title="${escapeHtml(article.title || '')}" data-authors="${article.authors ? (Array.isArray(article.authors) ? article.authors.map(a => escapeHtml(a.name || a)).join(', ') : escapeHtml(article.author_name || '')) : escapeHtml(article.author_name || '')}"><span class="material-symbols-outlined">format_quote</span> Ver Citações</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Função principal que busca os artigos da API
    async function loadArticles(newSearch = false) {
        if (isLoading) return; // Previne múltiplas requisições simultâneas
        isLoading = true;
        loadMoreButton.textContent = 'Carregando...';

        if (newSearch) {
            currentPage = 1; // Reseta a página para 1 se for uma nova busca
            articlesContainer.innerHTML = ''; // Limpa os resultados antigos
        }

        try {

            const params = new URLSearchParams({ page: currentPage, search: currentSearchTerm });
            Object.keys(activeFilters).forEach(k => { if (activeFilters[k]) params.append(k, activeFilters[k]); });
            const response = await fetch(`/api/articles?${params.toString()}`);
            const data = await response.json();

            if (data.articles && data.articles.length > 0) {
                data.articles.forEach(article => {
                    articlesContainer.innerHTML += createArticleCard(article);
                });

                attachCardHandlers();

                const token = localStorage.getItem('token');
                if (token) {
                    data.articles.forEach(async (article) => {
                        try {
                            const r = await fetch(`/api/articles/${article.id}/favorite-status`, { headers: { Authorization: 'Bearer ' + token } });
                            if (r.ok) {
                                const js = await r.json();
                                if (js.isFavorited) {
                                    const btn = document.querySelector(`.save-btn[data-id="${article.id}"]`);
                                    if (btn) {
                                        btn.classList.add('saved');
                                        const label = btn.querySelector('.save-label');
                                        const icon = btn.querySelector('.material-symbols-outlined');
                                        if (label) label.textContent = ' Salvo';
                                        if (icon) icon.textContent = 'bookmark_added';

                                        btn.classList.add('text-primary');
                                    }
                                }
                            }
                        } catch (e) { /* ignore per-article errors */ }
                    });
                }
                currentPage++;
                loadMoreButton.style.display = 'flex';
            } else {
                loadMoreButton.style.display = 'none';
                if (currentPage === 1) {
                    const message = currentSearchTerm ? `Nenhum artigo encontrado para "${currentSearchTerm}".` : 'Nenhum artigo publicado ainda.';
                    articlesContainer.innerHTML = `<p class="text-center text-white">${message}</p>`;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar artigos:', error);
            articlesContainer.innerHTML = '<p class="text-center text-error">Não foi possível carregar os artigos.</p>';
        } finally {
            isLoading = false;
            loadMoreButton.textContent = 'Carregar Mais';
        }
    }

    // Adiciona o "ouvinte" para o evento de submit do formulário de busca
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede que a página recarregue
        const searchTerm = searchInput.value.trim();

        // Só faz uma nova busca se o termo realmente mudou
        if (searchTerm !== currentSearchTerm) {
            currentSearchTerm = searchTerm;
            loadArticles(true); // Chama a função indicando que é uma nova busca
        }
    });

    // Adiciona o evento de clique ao botão "Carregar Mais"
    loadMoreButton.addEventListener('click', () => loadArticles(false));

    // Filter UI: toggles (multi-select)
    document.querySelectorAll('.filter-item').forEach(el => {
        el.addEventListener('click', () => {
            const t = el.dataset.filterType;
            const v = el.dataset.filterValue;
            // toggle visual
            const active = el.classList.toggle('bg-primary/20');
            if (!active) {
                // remove value from array
                if (Array.isArray(activeFilters[t])) {
                    activeFilters[t] = activeFilters[t].filter(x => x !== v);
                    if (activeFilters[t].length === 0) delete activeFilters[t];
                } else if (activeFilters[t] === v) {
                    delete activeFilters[t];
                }
            } else {
                // add
                if (!activeFilters[t]) activeFilters[t] = [];
                if (!Array.isArray(activeFilters[t])) activeFilters[t] = [activeFilters[t]];
                activeFilters[t].push(v);
            }
        });
    });

    document.getElementById('apply-filters-button').addEventListener('click', () => {

        loadArticles(true);
    });

    // Carrega a primeira página de artigos (com busca vazia) assim que a página é aberta
    loadArticles(true);
});


function attachCardHandlers() {
    document.querySelectorAll('.save-btn').forEach(b => {
        if (b._attached) return; b._attached = true;
        b.addEventListener('click', async (e) => {
            const id = b.dataset.id;
            await toggleFavorite(id, b);
        });
    });
    document.querySelectorAll('.share-btn').forEach(b => {
        if (b._attached) return; b._attached = true;
        b.addEventListener('click', (e) => {
            const id = b.dataset.id;
            openShareModal(id);
        });
    });
    document.querySelectorAll('.cite-btn').forEach(b => {
        if (b._attached) return; b._attached = true;
        b.addEventListener('click', (e) => {
            openCiteModal(b.dataset.id, b.dataset.title, b.dataset.authors);
        });
    });
}

async function toggleFavorite(articleId, btn) {
    const token = localStorage.getItem('token');
    if (!token) { alert('Você precisa estar logado para salvar artigos.'); return; }
    try {
        const isSaved = btn.classList.contains('saved');
        const method = isSaved ? 'DELETE' : 'POST';
        const r = await fetch(`/api/articles/${articleId}/favorite`, { method, headers: { Authorization: 'Bearer ' + token } });
        if (r.ok) {
            btn.classList.toggle('saved');
            const label = btn.querySelector('.save-label');
            const icon = btn.querySelector('.material-symbols-outlined');
            if (btn.classList.contains('saved')) {
                if (label) label.textContent = ' Salvo';
                if (icon) icon.textContent = 'bookmark_added';
                btn.classList.add('text-primary');
            } else {
                if (label) label.textContent = ' Salvar';
                if (icon) icon.textContent = 'bookmark_border';
                btn.classList.remove('text-primary');
            }
        } else {
            const err = await r.json();
            alert(err.error || 'Erro ao salvar');
        }
    } catch (err) { console.error(err); alert('Erro de rede ao salvar'); }
}

function openShareModal(articleId) {
    const modal = document.querySelector('#share-modal');
    const url = location.origin + '/detalhes.html?id=' + articleId;
    if (!modal) { navigator.clipboard?.writeText(url).then(() => alert('Link copiado: ' + url)).catch(() => alert(url)); return; }
    // populate input value
    const input = modal.querySelector('#share-link-input');
    if (input) input.value = url;
    // set social anchors
    const twitter = modal.querySelector('#share-twitter');
    const linkedin = modal.querySelector('#share-linkedin');
    const whatsapp = modal.querySelector('#share-whatsapp');
    const encoded = encodeURIComponent(url);
    if (twitter) twitter.href = `https://twitter.com/intent/tweet?url=${encoded}`;
    if (linkedin) linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
    if (whatsapp) whatsapp.href = `https://api.whatsapp.com/send?text=${encoded}`;
    modal.classList.remove('hidden');
    modal.classList.add('open');


    const onClick = (ev) => {
        if (ev.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('open');
            modal.removeEventListener('click', onClick);
        }
    };
    modal.addEventListener('click', onClick);
}

document.addEventListener('click', (e) => {
    // close buttons
    if (e.target && e.target.id === 'close-share-modal') {
        const m = document.getElementById('share-modal'); if (m) { m.classList.add('hidden'); m.classList.remove('open'); }
    }
    if (e.target && e.target.id === 'close-cite-modal') {
        const m = document.getElementById('cite-modal'); if (m) { m.classList.add('hidden'); m.classList.remove('open'); }
    }
    // copy link button
    if (e.target && e.target.id === 'copy-link-button') {
        const val = document.getElementById('share-link-input')?.value;
        if (val) navigator.clipboard.writeText(val).then(() => { const btn = e.target; const original = btn.textContent; btn.textContent = 'Copiado!'; setTimeout(() => btn.textContent = original, 1500); }).catch(() => alert('Erro ao copiar'));
    }

    if (e.target && e.target.classList && e.target.classList.contains('copy-button')) {
        const targetId = e.target.dataset.copyTarget;
        let textToCopy = '';
        if (targetId) {
            const el = document.getElementById(targetId);
            if (el) textToCopy = el.value || el.textContent || '';
        }
        if (textToCopy) navigator.clipboard.writeText(textToCopy).then(() => { const btn = e.target; const original = btn.textContent; btn.textContent = 'Copiado!'; setTimeout(() => btn.textContent = original, 1500); }).catch(() => alert('Erro ao copiar'));
    }
});

function openCiteModal(id, title, authors) {
    const modal = document.querySelector('#cite-modal');
    if (!modal) { alert(`${title} — ${authors}`); return; }

    const now = new Date();
    const year = now.getFullYear();
    const abnt = `${authors}. ${title.toUpperCase()}. VeritasLab, ${year}. Disponível em: ${location.origin}/detalhes.html?id=${id}.`;
    const apa = `${authors} (${year}). ${title}. VeritasLab. Recuperado de ${location.origin}/detalhes.html?id=${id}`;
    const abntEl = modal.querySelector('#abnt-citation');
    const apaEl = modal.querySelector('#apa-citation');
    if (abntEl) abntEl.textContent = abnt;
    if (apaEl) apaEl.textContent = apa;
    modal.classList.remove('hidden');
    modal.classList.add('open');

    const onClick = (ev) => {
        if (ev.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('open');
            modal.removeEventListener('click', onClick);
        }
    };
    modal.addEventListener('click', onClick);
}


function formatAuthors(authors) {
    if (!authors) return 'Autor desconhecido';
    if (Array.isArray(authors)) return authors.map(a => (a.name || a)).join(', ');
    return authors;
}

