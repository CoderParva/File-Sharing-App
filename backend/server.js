const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Store file metadata (in production, use MongoDB)
const fileStore = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Generate unique 6-character code
function generateCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const code = generateCode();
        const fileData = {
            code: code,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadTime: new Date(),
            expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        fileStore.set(code, fileData);

        // Auto-delete after 24 hours
        setTimeout(() => {
            const filePath = path.join(uploadsDir, fileData.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            fileStore.delete(code);
            console.log(`File ${code} auto-deleted after expiry`);
        }, 24 * 60 * 60 * 1000);

        res.json({
            success: true,
            code: code,
            filename: req.file.originalname,
            size: req.file.size,
            expiryTime: fileData.expiryTime
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Download endpoint
app.get('/api/download/:code', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const fileData = fileStore.get(code);

        if (!fileData) {
            return res.status(404).json({ error: 'File not found or expired' });
        }

        // Check if file has expired
        if (new Date() > fileData.expiryTime) {
            fileStore.delete(code);
            return res.status(410).json({ error: 'File has expired' });
        }

        const filePath = path.join(uploadsDir, fileData.filename);
        
        if (!fs.existsSync(filePath)) {
            fileStore.delete(code);
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, fileData.originalName);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Get file info endpoint (to show details before download)
app.get('/api/fileinfo/:code', (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const fileData = fileStore.get(code);

        if (!fileData) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (new Date() > fileData.expiryTime) {
            fileStore.delete(code);
            return res.status(410).json({ error: 'File has expired' });
        }

        res.json({
            filename: fileData.originalName,
            size: fileData.size,
            uploadTime: fileData.uploadTime,
            expiryTime: fileData.expiryTime
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        activeFiles: fileStore.size,
        timestamp: new Date()
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Active files: ${fileStore.size}`);
});