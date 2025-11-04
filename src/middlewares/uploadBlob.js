const { put, del } = require('@vercel/blob');
const multer = require('multer');

// Configurar multer para usar memória (não disco)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 30 * 1024 * 1024 // 30MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});

// Middleware para fazer upload para Vercel Blob
const uploadToBlob = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        // Gerar nome único
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = req.file.originalname.split('.').pop();
        const filename = `${timestamp}-${random}.${extension}`;

        // Upload para Vercel Blob
        const blob = await put(filename, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        req.file.path = blob.url;
        req.fileUrl = blob.url;

        next();
    } catch (error) {
        console.error('Erro ao fazer upload para Blob:', error);
        res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
    }
};

const deleteFromBlob = async (url) => {
    try {
        if (!url || !url.includes('blob.vercel-storage.com')) {
            return;
        }

        await del(url, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
    } catch (error) {
        console.error('Erro ao deletar do Blob:', error);
    }
};

module.exports = { upload, uploadToBlob, deleteFromBlob };
