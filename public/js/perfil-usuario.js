document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/logincadastro.html';
        return;
    }


    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }


    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        alert('ID do usuário não especificado');
        window.location.href = '/feed.html';
        return;
    }


    const userFullname = document.getElementById('user-fullname');
    const userUsername = document.getElementById('user-username');
    const userEmail = document.getElementById('user-email');
    const userBioEl = document.getElementById('user-bio');
    const statPublicationsEl = document.getElementById('stat-publications');
    const statCitationsEl = document.getElementById('stat-citations');
    const statRatingEl = document.getElementById('stat-rating');
    const articlesTbody = document.getElementById('articles-tbody');
    const logoutButton = document.getElementById('logout-button');
    const profileAvatar = document.getElementById('profile-avatar');
    const headerAvatar = document.getElementById('header-avatar');




    if (headerAvatar && user.avatar_url) {
        headerAvatar.style.backgroundImage = `url("${user.avatar_url}")`;
    }
    async function fetchWithAuth(url, options = {}) {
        const defaultHeaders = { 'Authorization': `Bearer ${token}` };
        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }
        options.headers = { ...defaultHeaders, ...options.headers };

        const response = await fetch(url, options);
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/logincadastro.html';
            throw new Error('Não autorizado');
        }
        return response;
    }

    async function loadUserProfile() {
        try {
            const response = await fetchWithAuth(`/api/users/${userId}`);
            const data = await response.json();

            if (data.user) {
                const user = data.user;
                userFullname.textContent = user.full_name || 'Nome não informado';
                userUsername.textContent = `@${user.username}`;
                userEmail.textContent = user.email;

                if (userBioEl) userBioEl.textContent = user.bio || 'Ainda sem biografia.';
                if (statPublicationsEl) statPublicationsEl.textContent = user.publications_count != null ? String(user.publications_count) : '—';
                if (statCitationsEl) statCitationsEl.textContent = user.citations != null ? String(user.citations) : '—';
                if (statRatingEl) statRatingEl.textContent = user.rating != null ? String(user.rating) : '—';


                if (user.avatar_url) {
                    const avatarUrl = `${user.avatar_url}?t=${new Date().getTime()}`;
                    profileAvatar.style.backgroundImage = `url(${avatarUrl})`;
                } else {
                    const defaultAvatar = `https://i.pravatar.cc/128?u=${user.username}`;
                    profileAvatar.style.backgroundImage = `url(${defaultAvatar})`;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            alert('Erro ao carregar perfil do usuário');
            window.location.href = '/feed.html';
        }
    }

    async function loadUserArticles() {
        articlesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Carregando artigos...</td></tr>';
        try {
            const response = await fetchWithAuth(`/api/users/${userId}/articles`);
            const data = await response.json();
            articlesTbody.innerHTML = '';

            if (data.articles && data.articles.length > 0) {
                data.articles.forEach(article => {
                    const row = `
                        <tr class="border-t border-t-border-dark hover:bg-[#283039]/50">
                            <td class="h-[72px] px-6 py-2 text-text-main-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${article.title}">${article.title}</div></td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal">
                                ${new Date(article.published_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td class="h-[72px] px-6 py-2 text-primary text-base font-semibold leading-normal cursor-pointer hover:underline">
                                <a href="/detalhes.html?id=${article.id}" class="text-primary hover:underline">Ver</a>
                            </td>
                        </tr>`;
                    articlesTbody.innerHTML += row;
                });
            } else {
                articlesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Nenhum artigo publicado.</td></tr>';
            }
        } catch (error) {
            console.error('Erro ao carregar artigos:', error);
            articlesTbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-red-500">Erro ao carregar artigos.</td></tr>';
        }
    }


    loadUserProfile();
    loadUserArticles();
});
