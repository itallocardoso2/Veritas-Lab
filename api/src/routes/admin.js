const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { createNotification } = require('./notifications');
const router = express.Router();

router.post('/approve/:submissionId', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const subId = req.params.submissionId;
        const subResult = await db.query('SELECT * FROM submissions WHERE id=$1', [subId]);

        if (!subResult.rows.length) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        const s = subResult.rows[0];

        
        const authorsJsonString = JSON.stringify(s.authors);

        const createQ = `INSERT INTO articles (title, abstract, authors, content_url, status, published_at, created_by, submission_id)
    VALUES ($1, $2, $3, $4, 'published', now(), $5, $6) RETURNING *`;

        const art = await db.query(createQ, [s.title, s.abstract, authorsJsonString, s.file_url, s.submitted_by, subId]);

        const articleId = art.rows[0].id;

        
        if (s.keywords && Array.isArray(s.keywords) && s.keywords.length > 0) {
            for (const keyword of s.keywords) {
                if (!keyword || !keyword.trim()) continue;

                const trimmedKeyword = keyword.trim();

                
                const tagResult = await db.query(
                    'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                    [trimmedKeyword]
                );
                const tagId = tagResult.rows[0].id;

                
                await db.query(
                    'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [articleId, tagId]
                );
            }

            console.log(`✅ ${s.keywords.length} tags adicionadas ao artigo ${articleId}`);
        }

        await db.query('UPDATE submissions SET status=$1, decision_at=now(), decision_by=$2 WHERE id=$3', ['approved', req.user.id, subId]);

        
        try {
            await db.query('UPDATE users SET publications_count = COALESCE(publications_count,0) + 1 WHERE id=$1', [s.submitted_by]);
        } catch (err) {
            console.error('Erro ao atualizar publications_count:', err);
        }

        
        await createNotification(
            s.submitted_by,
            'submission_approved',
            'Submissão Aprovada! 🎉',
            `Sua submissão "${s.title}" foi aprovada e publicada!`,
            `/detalhes.html?id=${art.rows[0].id}`,
            parseInt(subId),
            req.user.id
        );

        res.json({ article: art.rows[0] });

    } catch (err) {
        console.error("Erro na rota de aprovação:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


router.get('/submissions', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const result = await db.query(`
            SELECT s.*, u.full_name as author_name, u2.full_name as submitter_name
            FROM submissions s
            LEFT JOIN users u ON s.submitted_by = u.id
            LEFT JOIN users u2 ON s.submitted_by = u2.id
            WHERE s.status = $1
            ORDER BY s.submitted_at DESC
        `, [status]);

        res.json({ submissions: result.rows });
    } catch (err) {
        console.error('Erro ao buscar submissões:', err);
        res.status(500).json({ error: 'Erro ao buscar submissões.' });
    }
});


router.post('/reject/:submissionId', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const subId = req.params.submissionId;
        const { reason } = req.body;

        const subResult = await db.query('SELECT * FROM submissions WHERE id=$1', [subId]);

        if (!subResult.rows.length) {
            return res.status(404).json({ error: 'Submissão não encontrada.' });
        }

        const s = subResult.rows[0];

        await db.query(
            'UPDATE submissions SET status=$1, decision_at=now(), decision_by=$2 WHERE id=$3',
            ['rejected', req.user.id, subId]
        );

        
        let reasonText = '';
        if (reason && reason.trim()) {
            reasonText = `\n\nMotivo: ${reason}`;
        }

        await createNotification(
            s.submitted_by,
            'submission_rejected',
            'Submissão Rejeitada',
            `Sua submissão "${s.title}" foi rejeitada.${reasonText}`,
            `/submissao.html`,
            s.id,
            req.user.id
        );

        res.json({ message: 'Submissão rejeitada com sucesso.', reason });
    } catch (err) {
        console.error('Erro na rota de rejeição:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;