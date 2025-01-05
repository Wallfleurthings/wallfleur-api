const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: Number, default: 0 },
    created_date: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('ContactUs', contactUsSchema,'ContactUs');

