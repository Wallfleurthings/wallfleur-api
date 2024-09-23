// model.js
const mongoose = require('mongoose');

const bagSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    customer_id: { type: Number, required: true },
    product_id: { type: Number, required: true },
    quantity: { type: Number, required: true },
});

module.exports = mongoose.model('AddtoBag', bagSchema,'AddtoBag');

