const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    banner_image: { type: String },
    banner_url: { type: String },
    status: { type: Number, default: 0 },
    created_date: {
        type: Date,
        default: Date.now
    },
    updated_date: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('Advertisement', advertisementSchema,'Advertisement');

