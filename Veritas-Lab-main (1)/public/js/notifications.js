

let notificationsModal = null;
let notificationsList = null;
let unreadBadge = null;


function initNotifications() {
    
    const notificationBtn = document.getElementById('notificationBtn');
    const badge = document.getElementById('unreadBadge');

    if (!notificationBtn || !badge) {
        console.error('Botão de notificações ou badge não encontrado no DOM');
        return;
    }

    console.log('✅ Sistema de notificações inicializado');

    createNotificationsModal();
    updateUnreadCount();

    
    setInterval(updateUnreadCount, 30000);
}


function createNotificationsModal() {
    const modalHTML = `
        <div id="notificationsModal" class="notifications-modal" style="display: none;">
            <div class="notifications-header">
                <h3>🔔 Notificações</h3>
                <div class="notifications-actions">
                    <button id="markAllReadBtn" class="btn-mark-all">Marcar todas como lidas</button>
                    <button id="closeNotificationsBtn" class="btn-close-modal">✕</button>
                </div>
            </div>
            <div id="notificationsList" class="notifications-list">
                <div class="loading">Carregando...</div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    notificationsModal = document.getElementById('notificationsModal');
    notificationsList = document.getElementById('notificationsList');
    unreadBadge = document.getElementById('unreadBadge');

    
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationsModal);
    document.getElementById('closeNotificationsBtn').addEventListener('click', closeNotificationsModal);
    document.getElementById('markAllReadBtn').addEventListener('click', markAllAsRead);

    
    notificationsModal.addEventListener('click', (e) => {
        if (e.target === notificationsModal) {
            closeNotificationsModal();
        }
    });
}


function toggleNotificationsModal() {
    if (notificationsModal.style.display === 'none') {
        openNotificationsModal();
    } else {
        closeNotificationsModal();
    }
}

function openNotificationsModal() {
    notificationsModal.style.display = 'flex';
    loadNotifications();
}

function closeNotificationsModal() {
    notificationsModal.style.display = 'none';
}


async function updateUnreadCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️ Token não encontrado, usuário não autenticado');
            return;
        }

        if (!unreadBadge) {
            unreadBadge = document.getElementById('unreadBadge');
        }

        if (!unreadBadge) {
            console.error('❌ Badge não encontrado no DOM');
            return;
        }

        console.log('🔄 Buscando contador de notificações...');

        const response = await fetch('/api/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.unreadCount;

            console.log(`📊 Notificações não lidas: ${count}`);

            if (count > 0) {
                unreadBadge.textContent = count > 99 ? '99+' : count;
                unreadBadge.style.display = 'block';
                console.log('✅ Badge exibido com sucesso');
            } else {
                unreadBadge.style.display = 'none';
                console.log('ℹ️ Nenhuma notificação não lida');
            }
        } else {
            console.error('❌ Erro na resposta:', response.status);
        }
    } catch (err) {
        console.error('❌ Erro ao buscar contador:', err);
    }
}


async function loadNotifications() {
    try {
        notificationsList.innerHTML = '<div class="loading">Carregando...</div>';

        const token = localStorage.getItem('token');
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar notificações');
        }

        const data = await response.json();
        displayNotifications(data.notifications);
    } catch (err) {
        console.error('Erro ao carregar notificações:', err);
        notificationsList.innerHTML = '<div class="error">Erro ao carregar notificações</div>';
    }
}


function displayNotifications(notifications) {
    if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-notifications">📭 Nenhuma notificação</div>';
        return;
    }

    notificationsList.innerHTML = notifications.map(notif => {
        const icon = getNotificationIcon(notif.type);
        const timeAgo = formatTimeAgo(notif.created_at);
        const unreadClass = notif.is_read ? '' : 'unread';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notif.id}" data-link="${notif.link || ''}">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${!notif.is_read ? '<div class="notification-unread-dot"></div>' : ''}
                <button class="notification-delete" data-id="${notif.id}" title="Excluir">🗑️</button>
            </div>
        `;
    }).join('');

    
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('notification-delete')) {
                handleNotificationClick(item);
            }
        });
    });

    
    document.querySelectorAll('.notification-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNotification(btn.dataset.id);
        });
    });
}


function getNotificationIcon(type) {
    const icons = {
        'comment_like': '❤️',
        'comment_reply': '💬',
        'submission_approved': '✅',
        'submission_rejected': '❌'
    };
    return icons[type] || '🔔';
}


function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d atrás`;

    return date.toLocaleDateString('pt-BR');
}


async function handleNotificationClick(item) {
    const id = item.dataset.id;
    const link = item.dataset.link;

    
    if (item.classList.contains('unread')) {
        await markAsRead(id);
    }

    
    if (link && link !== 'null' && link !== '') {
        window.location.href = link;
    }
}


async function markAsRead(id) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        updateUnreadCount();
    } catch (err) {
        console.error('Erro ao marcar como lida:', err);
    }
}


async function markAllAsRead() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadNotifications();
            updateUnreadCount();
        }
    } catch (err) {
        console.error('Erro ao marcar todas como lidas:', err);
    }
}


async function deleteNotification(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadNotifications();
            updateUnreadCount();
        }
    } catch (err) {
        console.error('Erro ao excluir notificação:', err);
    }
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}