const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    created_date: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('ContactUs', contactUsSchema,'ContactUs');

