const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Mengecek server
app.get('/', (req, res) => {
    res.json({
        message: 'Backend JWT dan Push Notification berjalan!'
    });
});

// Register akun baru
app.post('/auth/register', async (req, res) => {
    try {
        const { nama, email, password } = req.body;

        if (!nama || !email || !password) {
            return res.status(400).json({
                message: 'Nama, email, dan password wajib diisi.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password minimal 8 karakter.'
            });
        }

        const [users] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length > 0) {
            return res.status(409).json({
                message: 'Email sudah terdaftar.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            'INSERT INTO users (nama, email, password) VALUES (?, ?, ?)',
            [nama, email, hashedPassword]
        );

        return res.status(201).json({
            message: 'Registrasi berhasil.'
        });
    
} catch (error) {
    console.error('Register error:', error);

    return res.status(500).json({
        message: 'Terjadi kesalahan pada server.'
    });
}
});


// Login menggunakan JWT
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email dan password wajib diisi.'
            });
        }

        const [users] = await db.execute(
            'SELECT id, nama, email, password FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Email atau password salah.'
            });
        }

        const user = users[0];

        const passwordCocok = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCocok) {
            return res.status(401).json({
                message: 'Email atau password salah.'
            });
        }

        const token = require('jsonwebtoken').sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1d'
            }
        );

        return res.status(200).json({
            message: 'Login berhasil.',
            token: token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            message: 'Terjadi kesalahan pada server.'
        });
    }
});

// Mengecek data pengguna berdasarkan token JWT
app.get('/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Token tidak ditemukan.'
            });
        }

        const token = authHeader.split(' ')[1];

        const jwt = require('jsonwebtoken');

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const [users] = await db.execute(
            'SELECT id, nama, email FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'Pengguna tidak ditemukan.'
            });
        }

        return res.status(200).json({
            message: 'Token valid.',
            user: users[0]
        });

    } catch (error) {
        return res.status(401).json({
            message: 'Token tidak valid atau sudah kedaluwarsa.'
        });
    }
});

// Menyimpan Expo Push Token pengguna
app.post('/notifications/register-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Token tidak ditemukan.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { expo_push_token } = req.body;

        if (!expo_push_token) {
            return res.status(400).json({
                message: 'Expo Push Token wajib diisi.'
            });
        }

        await db.execute(
            `INSERT INTO user_push_tokens (user_id, expo_push_token)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
            [decoded.id, expo_push_token]
        );

        return res.status(201).json({
            message: 'Expo Push Token berhasil disimpan.'
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token tidak valid atau sudah kedaluwarsa.'
            });
        }

        console.error('Register push token error:', error.message);

        return res.status(500).json({
            message: 'Terjadi kesalahan pada server.'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});