const Newsletter = require('../models/newsletter.model');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const {transporter} = require('../config/email');
const { generateNewLetterEmailTemplate } = require('../utils/emailTemplates/sendNewsLetter');

const manage_get_all_newsletter = async (req, res) => {
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

        const [newsletter, totalNewsletter] = await Promise.all([
            Newsletter.find().sort({ created_date: -1 }).skip(skip).limit(limit),
            Newsletter.countDocuments()
        ]);
        res.status(200).json({ newsletter, totalNewsletter });
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const sendEmail = async (email) => {
    try {
        const emailDate = new Date().toLocaleDateString();
        const emailTemplate = generateNewLetterEmailTemplate(emailDate);
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'WallfleurThings Newsletter',
            html: emailTemplate
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error('An error occurred:', { message: error.message, stack: error.stack });
            }else{
                console.log(`Email sent to: ${email}`);
                return true;
            }
        });


    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        return false;
    }
};


const send_newsletter = async(req,res) =>{
    try {
        const newsletters = await Newsletter.find({ send_status: { $ne: 1 } }).limit(10);

        if (newsletters.length === 0) {
            return res.status(200).json({ message: 'No emails to send.' });
        }

        const results = await Promise.all(
            newsletters.map(async (newsletter) => {
                const emailSent = await sendEmail(newsletter.email);
                if (emailSent) {
                    newsletter.send_status = 1;
                    await newsletter.save();
                }
                return { email: newsletter.email, success: emailSent };
            })
        );

        res.status(200).json({message: 'Emails processed.'});
    } catch (error) {
        console.error('Error in /send-newsletters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}




module.exports = {
    manage_get_all_newsletter,
    send_newsletter
};