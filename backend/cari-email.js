
require('dotenv').config();
const db = require('./db');

async function cariEmail() {
    try {
        const [users] = await db.execute(
            'SELECT id, nama, email FROM users'
        );

        console.table(users);
    } catch (error) {
        console.log('Gagal mengambil data:', error.message);
    } finally {
        await db.end();
    }
}

cariEmail();
