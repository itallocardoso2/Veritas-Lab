document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/logincadastro.html';
        return;
    }


    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.classList.remove('hidden');
        }
    }


    const userFullname = document.getElementById('user-fullname');
    const userUsername = document.getElementById('user-username');
    const userEmail = document.getElementById('user-email');
    const submissionsTbody = document.getElementById('submissions-tbody');
    const logoutButton = document.getElementById('logout-button');


    const headerAvatar = document.getElementById('header-avatar');
    const profileAvatar = document.getElementById('profile-avatar');
    const avatarInput = document.getElementById('avatar-input');


    const editProfileButton = document.getElementById('edit-profile-button');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editFullnameInput = document.getElementById('edit-fullname-input');
    const editBioInput = document.getElementById('edit-bio-input');
    const editMessageContainer = document.getElementById('edit-message-container');

    let currentUser = null;


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
            const response = await fetchWithAuth('/api/auth/me');
            const data = await response.json();
            if (data.user) {
                currentUser = data.user;

                userFullname.textContent = currentUser.full_name || 'Nome não informado';
                userUsername.textContent = `@${currentUser.username}`;
                userEmail.textContent = currentUser.email;


                const userBioEl = document.getElementById('user-bio');
                const statPublicationsEl = document.getElementById('stat-publications');
                const statCitationsEl = document.getElementById('stat-citations');
                const statRatingEl = document.getElementById('stat-rating');
                if (userBioEl) userBioEl.textContent = currentUser.bio || 'Ainda sem biografia.';

                if (statPublicationsEl) statPublicationsEl.textContent = currentUser.publications_count != null ? String(currentUser.publications_count) : '—';
                if (statCitationsEl) statCitationsEl.textContent = currentUser.citations != null ? String(currentUser.citations) : '—';
                if (statRatingEl) statRatingEl.textContent = currentUser.rating != null ? String(currentUser.rating) : '—';


                if (currentUser.avatar_url) {
                    const avatarUrl = `${currentUser.avatar_url}?t=${new Date().getTime()}`;
                    headerAvatar.style.backgroundImage = `url(${avatarUrl})`;
                    profileAvatar.style.backgroundImage = `url(${avatarUrl})`;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        }
    }

    async function loadUserSubmissions() {

        submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Carregando submissões...</td></tr>';
        try {
            const response = await fetchWithAuth('/api/submissions/mine');
            const data = await response.json();
            submissionsTbody.innerHTML = '';
            if (data.submissions && data.submissions.length > 0) {
                data.submissions.forEach(sub => {
                    const statusColors = { pending: 'bg-yellow-500/20 text-yellow-300', approved: 'bg-green-500/20 text-green-300', rejected: 'bg-red-500/20 text-red-300' };
                    const statusText = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

                    const authorName = sub.author_name || currentUser?.full_name || currentUser?.username || '—';



                    let viewHref;
                    if (sub.status === 'approved' && sub.article_id) {
                        viewHref = `/detalhes.html?id=${sub.article_id}`;
                    } else if (sub.status === 'draft') {
                        viewHref = `/submissao.html?draftId=${sub.id}`;
                    } else {
                        viewHref = `/detalhes.html?id=${sub.id}`;
                    }

                    const row = `
                        <tr class="border-t border-t-border-dark hover:bg-[#283039]/50">
                            <td class="h-[72px] px-6 py-2 text-text-main-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${sub.title}">${sub.title}</div></td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${authorName}">${authorName}</div></td>
                            <td class="h-[72px] px-6 py-2 text-base font-normal leading-normal">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[sub.status] || 'bg-gray-500/20 text-gray-300'}">
                                    ${statusText[sub.status] || sub.status}
                                </span>
                            </td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal">
                                ${new Date(sub.submitted_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td class="h-[72px] px-6 py-2 text-primary text-base font-semibold leading-normal cursor-pointer hover:underline"><a href="${viewHref}" class="text-primary hover:underline">Ver</a></td>
                        </tr>`;
                    submissionsTbody.innerHTML += row;
                });
            } else {
                submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhuma submissão encontrada.</td></tr>';
            }
        } catch (error) {
            console.error('Erro ao carregar submissões:', error);
            submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar submissões.</td></tr>';
        }
    }


    avatarInput.addEventListener('change', async () => {
        if (avatarInput.files.length === 0) return;

        const file = avatarInput.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetchWithAuth('/api/auth/avatar', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Falha no upload da imagem.');
            }


            const newAvatarUrl = `${data.avatar_url}?t=${new Date().getTime()}`;
            headerAvatar.style.backgroundImage = `url(${newAvatarUrl})`;
            profileAvatar.style.backgroundImage = `url(${newAvatarUrl})`;
            currentUser.avatar_url = newAvatarUrl;
            localStorage.setItem('user', JSON.stringify(currentUser));

        } catch (error) {
            alert(error.message);
        }
    });


    function openModal() {
        if (currentUser) {
            editFullnameInput.value = currentUser.full_name || '';
            if (editBioInput) editBioInput.value = currentUser.bio || '';
        }
        editMessageContainer.innerHTML = '';
        editProfileModal.classList.remove('hidden');
    }

    function closeModal() {
        editProfileModal.classList.add('hidden');
    }

    editProfileButton.addEventListener('click', openModal);
    closeModalButton.addEventListener('click', closeModal);
    cancelEditButton.addEventListener('click', closeModal);

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newFullName = editFullnameInput.value;
        const newBio = editBioInput ? editBioInput.value : undefined;

        try {
            const response = await fetchWithAuth('/api/auth/me', {
                method: 'PATCH',
                body: JSON.stringify({ full_name: newFullName, bio: newBio })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Não foi possível atualizar o perfil.');
            }

            userFullname.textContent = data.user.full_name;
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            closeModal();

        } catch (error) {
            editMessageContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    });



    loadUserProfile();
    loadUserSubmissions();

    const tabFavorites = document.getElementById('tab-favorites');
    const tabArticles = document.getElementById('tab-articles');

    function setActiveTab(activeTab) {

        [tabArticles, tabFavorites].forEach(tab => {
            if (tab) {
                tab.classList.remove('border-b-primary', 'text-text-main-dark');
                tab.classList.add('border-b-transparent', 'text-text-secondary-dark');
            }
        });


        if (activeTab) {
            activeTab.classList.remove('border-b-transparent', 'text-text-secondary-dark');
            activeTab.classList.add('border-b-primary', 'text-text-main-dark');
        }
    }

    if (tabFavorites) {
        tabFavorites.addEventListener('click', async (e) => {
            e.preventDefault();
            setActiveTab(tabFavorites);
            try {
                const resp = await fetchWithAuth('/api/users/me/favorites');
                const data = await resp.json();
                submissionsTbody.innerHTML = '';
                if (data.favorites && data.favorites.length) {
                    data.favorites.forEach(a => {
                        const row = `
                        <tr class="border-t border-t-border-dark hover:bg-[#283039]/50">
                            <td class="h-[72px] px-6 py-2 text-text-main-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${a.title}">${a.title}</div></td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${a.author_name || '—'}">${a.author_name || '—'}</div></td>
                            <td class="h-[72px] px-6 py-2 text-base font-normal leading-normal">Publicado</td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal">${new Date(a.published_at).toLocaleDateString('pt-BR')}</td>
                            <td class="h-[72px] px-6 py-2 text-primary text-base font-semibold leading-normal cursor-pointer hover:underline"><a href="/detalhes.html?id=${a.id}">Ver</a></td>
                        </tr>`;
                        submissionsTbody.innerHTML += row;
                    });
                } else {
                    submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhum favorito encontrado.</td></tr>';
                }
            } catch (err) {
                console.error('Erro ao carregar favoritos:', err);
            }
        });
    }
    if (tabArticles) {
        tabArticles.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveTab(tabArticles);
            loadUserSubmissions();
        });
    }
});