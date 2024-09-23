// model.js
const mongoose = require('mongoose');

const featuredProductSchema = new mongoose.Schema({
    _id: {type:Number, required : true},
    id: {type:Number, required : true},
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    slug: { type: String, required: true },
});

module.exports = mongoose.model('Featured_Products', featuredProductSchema,'Featured_Products');
