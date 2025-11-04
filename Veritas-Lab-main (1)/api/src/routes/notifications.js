const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middlewares/auth');


async function createNotification(userId, type, title, message, link = null, relatedId = null, relatedUserId = null) {
    try {
        await db.query(
            `INSERT INTO notifications (user_id, type, title, message, link, related_id, related_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, type, title, message, link, relatedId, relatedUserId]
        );
    } catch (err) {
        console.error('Erro ao criar notificação:', err);
    }
}


router.get('/', verifyToken, async (req, res) => {
    const userId = req.user.id; 

    try {
        const result = await db.query(
            `SELECT n.*, 
                    u.full_name as related_user_name,
                    u.avatar_url as related_user_avatar
             FROM notifications n
             LEFT JOIN users u ON n.related_user_id = u.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId]
        );

        
        const unreadResult = await db.query(
            'SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            notifications: result.rows,
            unreadCount: unreadResult.rows[0].unread_count
        });
    } catch (err) {
        console.error('Erro ao buscar notificações:', err);
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});


router.get('/unread-count', verifyToken, async (req, res) => {
    const userId = req.user.id; 

    try {
        const result = await db.query(
            'SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ unreadCount: result.rows[0].unread_count });
    } catch (err) {
        console.error('Erro ao contar notificações:', err);
        res.status(500).json({ error: 'Erro ao contar notificações' });
    }
});


router.put('/:id/read', verifyToken, async (req, res) => {
    const userId = req.user.id; 
    const notificationId = parseInt(req.params.id);

    try {
        const result = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificação não encontrada' });
        }

        res.json({ notification: result.rows[0] });
    } catch (err) {
        console.error('Erro ao marcar notificação:', err);
        res.status(500).json({ error: 'Erro ao marcar notificação' });
    }
});


router.put('/read-all', verifyToken, async (req, res) => {
    const userId = req.user.id; 

    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (err) {
        console.error('Erro ao marcar todas como lidas:', err);
        res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
});


router.delete('/:id', verifyToken, async (req, res) => {
    const userId = req.user.id; 
    const notificationId = parseInt(req.params.id);

    try {
        const result = await db.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificação não encontrada' });
        }

        res.json({ message: 'Notificação deletada com sucesso' });
    } catch (err) {
        console.error('Erro ao deletar notificação:', err);
        res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
});

module.exports = { router, createNotification };