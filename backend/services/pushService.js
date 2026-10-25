
async function kirimPushNotification(expoPushToken, judul, pesan) {
    const response = await fetch(
        'https://exp.host/--/api/v2/push/send',
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                sound: 'default',
                title: judul,
                body: pesan,
            }),
        }
    );

    if (!response.ok) {
        throw new Error('Gagal mengirim permintaan notifikasi ke Expo.');
    }

    return await response.json();
}

module.exports = { kirimPushNotification };
