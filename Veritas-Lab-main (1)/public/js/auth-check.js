document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    const avatarElementIds = ['header-avatar', 'comment-form-avatar'];

    function revealAdminLinks() {
        ['admin-link', 'admin-panel-link'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
    }

    function setupLogoutButton() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/logincadastro.html';
            });
        }
    }

    function applyAvatarForUser(user) {
        try {
            if (!user) return;
            const avatarUrl = user.avatar_url ? user.avatar_url : `https://i.pravatar.cc/40?u=${user.username}`;
            avatarElementIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.style.backgroundImage = `url('${avatarUrl}')`;
            });
            if (user.role === 'admin') revealAdminLinks();
        } catch (e) {
            console.error('Erro ao aplicar avatar do usuário:', e);
        }
    }

    async function fetchAndApplyUser() {
        if (!token) return;
        try {
            const resp = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.user) {
                try {
                    localStorage.setItem('user', JSON.stringify(data.user));
                } catch (e) {
                    console.warn('Não foi possível gravar user no localStorage:', e);
                }
                applyAvatarForUser(data.user);
            }
        } catch (e) {
            console.debug('auth-check: falha ao buscar /api/auth/me', e);
        }
    }

    if (userString) {
        try {
            const user = JSON.parse(userString);
            applyAvatarForUser(user);
        } catch (e) {
            console.error('Erro ao processar dados do usuário no localStorage:', e);
        }
    }


    if (token) {

        let needFetch = false;
        try {
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user.role) needFetch = true;
        } catch (e) {
            needFetch = true;
        }
        if (needFetch) fetchAndApplyUser();
    }

    setupLogoutButton();
});