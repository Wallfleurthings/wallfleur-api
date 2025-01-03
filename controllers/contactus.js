const Contactus = require('../models/contactus.model');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const manage_get_all_contactus = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info('Authorization header is missing.');
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [contactus, totalContactus] = await Promise.all([
            Contactus.find().sort({ created_date: -1 }).skip(skip).limit(limit),
            Contactus.countDocuments()
        ]);
        res.status(200).json({ contactus, totalContactus });
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    manage_get_all_contactus,
};