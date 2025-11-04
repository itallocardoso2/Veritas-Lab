const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const submissionsRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const { router: notificationsRoutes } = require('./routes/notifications');

const app = express();

// Configuração de CORS MELHORADA para Vercel
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://veritas-lab.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requisições sem origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Se origin está na lista permitida
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Em desenvolvimento, permitir qualquer origin
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use('/api/articles/:articleId/comments', commentsRoutes);

app.get('/api', (req, res) => res.send({ ok: true, service: 'veritaslab backend' }));

// Para desenvolvimento local
if (require.main === module) {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

// Exporta o app para o Vercel (serverless)
module.exports = app;
