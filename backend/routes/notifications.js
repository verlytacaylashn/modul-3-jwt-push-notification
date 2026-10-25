
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { wajibLogin } = require('../middleware/auth');

const router = express.Router();

// Mendaftarkan Expo Push Token pengguna
router.post('/register-token', wajibLogin, async (req, res) => {
    try {
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
            [req.user.id, expo_push_token]
        );

        return res.status(201).json({
            message: 'Expo Push Token berhasil disimpan.'
        });
    } catch (error) {
        console.error('Register push token error:', error.message);

        return res.status(500).json({
            message: 'Terjadi kesalahan pada server.'
        });
    }
});


const { Expo } = require('expo-server-sdk');

const expo = new Expo();

router.post('/test', wajibLogin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT expo_push_token
             FROM user_push_tokens
             WHERE user_id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Expo Push Token belum terdaftar.'
            });
        }

        const messages = [];

        for (const row of rows) {
            const pushToken = row.expo_push_token;

            if (!Expo.isExpoPushToken(pushToken)) {
                continue;
            }

            messages.push({
                to: pushToken,
                sound: 'default',
                title: 'Tes Notifikasi',
                body: 'Push notification Modul 3 berhasil dikirim!',
                data: { type: 'test' },
            });
        }

        if (messages.length === 0) {
            return res.status(400).json({
                message: 'Tidak ada Expo Push Token yang valid.'
            });
        }

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk =
                await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        return res.json({
            message: 'Permintaan notifikasi dikirim ke Expo Push Service.',
            tickets
        });
    } catch (error) {
        console.error('Send push notification error:', error.message);

        return res.status(500).json({
            message: 'Gagal mengirim notifikasi.'
        });
    }
});


module.exports = router;
