const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const { createNotification } = require('./notifications');
const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
    const { articleId } = req.params;
    try {
        const q = `
            SELECT c.id,
                   c.content,
                   c.created_at,
                   c.parent_comment_id AS parent_id,
                   c.user_id,
                   u.full_name,
                   u.username,
                   u.avatar_url,
                   (c.user_id = a.created_by) AS is_article_author,
                   COALESCE(l.likes_count, 0) AS likes_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN articles a ON c.article_id = a.id
            LEFT JOIN (
                SELECT comment_id, COUNT(*) AS likes_count
                FROM comment_likes
                GROUP BY comment_id
            ) l ON l.comment_id = c.id
            WHERE c.article_id = $1
            ORDER BY 
                COALESCE(c.parent_comment_id, c.id) ASC,
                c.parent_comment_id NULLS FIRST,
                c.created_at ASC
        `;
        const result = await db.query(q, [articleId]);

        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const data = jwt.verify(token, process.env.JWT_SECRET);
                const userId = data.id;
                const likedRes = await db.query(`
                    SELECT cl.comment_id
                    FROM comment_likes cl
                    JOIN comments c ON c.id = cl.comment_id
                    WHERE cl.user_id = $1 AND c.article_id = $2
                `, [userId, articleId]);

                const likedSet = new Set(likedRes.rows.map(r => r.comment_id));
                const rowsWithLike = result.rows.map(r => ({ ...r, liked_by_me: likedSet.has(r.id) }));
                return res.json({ comments: rowsWithLike });
            } catch (e) {
                console.warn('Invalid token for optional comments like check');
            }
        }

        res.json({ comments: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no banco de dados' });
    }
});


router.post('/', verifyToken, async (req, res) => {
    const { articleId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content) {
        return res.status(400).json({ error: 'O conteúdo do comentário não pode ser vazio.' });
    }

    try {

        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!userCheck.rows.length) {
            return res.status(400).json({ error: 'Usuário não encontrado no banco de dados.' });
        }


        const articleCheck = await db.query('SELECT id FROM articles WHERE id = $1', [articleId]);
        if (!articleCheck.rows.length) {
            return res.status(400).json({ error: 'Artigo não encontrado.' });
        }

        const q = `
            INSERT INTO comments (content, article_id, user_id, parent_comment_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await db.query(q, [content, articleId, userId, parent_id || null]);


        const newCommentQuery = `
            SELECT c.id,
                   c.content,
                   c.created_at,
                   c.parent_comment_id AS parent_id,
                   c.user_id,
                   u.full_name,
                   u.username,
                   u.avatar_url,
                   (c.user_id = a.created_by) AS is_article_author,
                   COALESCE(l.likes_count, 0) AS likes_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN articles a ON c.article_id = a.id
            LEFT JOIN (
                SELECT comment_id, COUNT(*) AS likes_count
                FROM comment_likes
                GROUP BY comment_id
            ) l ON l.comment_id = c.id
            WHERE c.id = $1
        `;
        const newCommentResult = await db.query(newCommentQuery, [result.rows[0].id]);


        if (parent_id) {
            const parentCommentInfo = await db.query(
                `SELECT c.user_id, c.content, a.title, u.full_name as replier_name
                 FROM comments c
                 JOIN articles a ON c.article_id = a.id
                 JOIN users u ON u.id = $1
                 WHERE c.id = $2`,
                [userId, parent_id]
            );

            if (parentCommentInfo.rows.length > 0) {
                const parentComment = parentCommentInfo.rows[0];

                if (parentComment.user_id !== userId) {
                    const contentPreview = content.substring(0, 50) + (content.length > 50 ? '...' : '');
                    await createNotification(
                        parentComment.user_id,
                        'comment_reply',
                        'Nova resposta ao seu comentário',
                        `${parentComment.replier_name} respondeu ao seu comentário: "${contentPreview}"`,
                        `/detalhes.html?id=${articleId}`,
                        result.rows[0].id,
                        userId
                    );
                }
            }
        }

        res.status(201).json({ comment: newCommentResult.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no banco de dados' });
    }
});


router.post('/:commentId/like', verifyToken, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    try {

        const commentInfo = await db.query(
            `SELECT c.user_id, c.content, a.id as article_id, a.title, u.full_name
             FROM comments c
             JOIN articles a ON c.article_id = a.id
             JOIN users u ON u.id = $1
             WHERE c.id = $2`,
            [userId, commentId]
        );


        const insertResult = await db.query(
            'INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [userId, commentId]
        );


        if (insertResult.rows.length > 0 && commentInfo.rows.length > 0) {
            const comment = commentInfo.rows[0];
            if (comment.user_id !== userId) {

                const contentPreview = comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '');
                await createNotification(
                    comment.user_id,
                    'comment_like',
                    'Curtida em comentário',
                    `${comment.full_name} curtiu seu comentário: "${contentPreview}"`,
                    `/detalhes.html?id=${comment.article_id}`,
                    parseInt(commentId),
                    userId
                );
            }
        }

        const r = await db.query('SELECT COUNT(*)::int AS likes_count FROM comment_likes WHERE comment_id = $1', [commentId]);
        res.json({ likes_count: r.rows[0].likes_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao curtir comentário' });
    }
});


router.delete('/:commentId/like', verifyToken, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    try {
        await db.query('DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2', [userId, commentId]);
        const r = await db.query('SELECT COUNT(*)::int AS likes_count FROM comment_likes WHERE comment_id = $1', [commentId]);
        res.json({ likes_count: r.rows[0].likes_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover curtida' });
    }
});

module.exports = router;