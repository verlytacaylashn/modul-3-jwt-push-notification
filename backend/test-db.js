const db = require('./db');

async function testConnection() {
    try {
        const connection = await db.getConnection();

        console.log('Koneksi ke database MySQL berhasil!');

        connection.release();
        await db.end();
    } catch (error) {
        console.error('Koneksi database gagal:', error.message);
        process.exitCode = 1;
    }
}

testConnection();