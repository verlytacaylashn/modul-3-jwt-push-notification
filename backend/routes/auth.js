
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { wajibLogin } = require('../middleware/auth');

const router = express.Router();

// Registrasi
router.post('/register', async (req, res) => {
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
        console.error('Register error:', error.message);

        return res.status(500).json({
            message: 'Terjadi kesalahan pada server.'
        });
    }
});

// Login dengan JWT
router.post('/login', async (req, res) => {
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
        const cocok = await bcrypt.compare(password, user.password);

        if (!cocok) {
            return res.status(401).json({
                message: 'Email atau password salah.'
            });
        }

        const token = jwt.sign(
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
            token,
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

// Mengecek pengguna dengan token
router.get('/me', wajibLogin, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, nama, email FROM users WHERE id = ?',
            [req.user.id]
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
        console.error('Auth me error:', error.message);

        return res.status(500).json({
            message: 'Terjadi kesalahan pada server.'
        });
    }
});

module.exports = router;
