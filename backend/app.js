
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'Backend JWT dan Push Notification berjalan!'
    });
});

app.use('/auth', authRoutes);
app.use('/notifications', notificationRoutes);

module.exports = app;
