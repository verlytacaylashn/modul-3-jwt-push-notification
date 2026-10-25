
const jwt = require('jsonwebtoken');
require('dotenv').config();

function wajibLogin(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            pesan: 'Token diperlukan.'
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({
            pesan: error.name === 'TokenExpiredError'
                ? 'Token kedaluwarsa.'
                : 'Token tidak valid.'
        });
    }
}

module.exports = { wajibLogin };
