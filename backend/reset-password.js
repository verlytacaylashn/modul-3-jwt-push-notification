
const bcrypt = require('bcryptjs');
const readline = require('readline');
const db = require('./db');

const emailTarget = 'belajar@gmail.com';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Masukkan password baru: ', async (password) => {
    try {
        if (password.length < 8) {
            console.log('Password minimal 8 karakter.');
            return;
        }

        const [users] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [emailTarget]
        );

        if (users.length !== 1) {
            console.log('Akun tidak ditemukan atau hasil tidak sesuai.');
            return;
        }

        const hash = await bcrypt.hash(password, 10);

        const [hasil] = await db.execute(
            'UPDATE users SET password = ? WHERE id = ? AND email = ?',
            [hash, users[0].id, emailTarget]
        );

        if (hasil.affectedRows === 1) {
            console.log('Password berhasil diperbarui.');
        } else {
            console.log('Password tidak diperbarui.');
        }
    } catch (error) {
        console.log('Gagal memperbarui password:', error.message);
    } finally {
        password = '';
        rl.close();
        await db.end();
    }
});
