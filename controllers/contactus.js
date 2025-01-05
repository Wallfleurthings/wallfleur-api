const Contactus = require('../models/contactus.model');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const {transporter} = require('../config/email');

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

const reply_support = async (req, res) => {
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
        let { description,_id,email } = req.body;
        const replydata = await Contactus.find({ _id:_id });

        if(replydata){
            if(replydata[0]?.email != email){
                return res.status(201).json({ message:'Invalid email' });
            }
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'WallfleurThings Support',
            text: description
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error('An error occurred:', { message: error.message, stack: error.stack });
            }else{
                logger.info('reply send successfull.')
            }
        });
        await Contactus.updateOne({ _id }, { status: 1 });
        res.status(200).json({ message:'Reply Send successfully' });
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        return false;
    }
};





module.exports = {
    manage_get_all_contactus,
    reply_support
};