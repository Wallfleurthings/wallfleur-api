const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    email: { type: String, required: true },
    created_date: {
        type: Date,
        default: Date.now
    },
    status: { type: Number, default: 0 },
});

module.exports = mongoose.model('NewsLetter', newsletterSchema,'NewsLetter');

