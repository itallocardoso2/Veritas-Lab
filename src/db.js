const { Pool } = require('pg');
require('dotenv').config();

// Log para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 DATABASE_URL configurada:', !!process.env.DATABASE_URL);
}

// Verificar se DATABASE_URL existe
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO: DATABASE_URL não está definida!');
    console.error('Configure a variável de ambiente DATABASE_URL');
    throw new Error('DATABASE_URL is required');
}

// Configuração otimizada para Vercel (serverless)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Configurações para serverless
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
});

// Log de erros do pool
pool.on('error', (err, client) => {
    console.error('❌ Erro inesperado no pool de conexões:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
