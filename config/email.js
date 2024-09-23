const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    service: 'gmail',    auth: {
        user: 'tohotochophy329@gmail.com',
        pass: 'zqaa pami xvyg bjut'
    }
});

module.exports = { transporter };
