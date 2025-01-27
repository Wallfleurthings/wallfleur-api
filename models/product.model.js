const mongoose = require('mongoose');
const Counter = require('./counter.model');

const productSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image1: { type: String },
    image2: { type: String },
    image3: { type: String },
    image4: { type: String },
    image5: { type: String },
    image6: { type: String },
    inrprice: { type: Number, required: true },
    usdprice: { type: Number, required: true },
    slug: { type: String, required: true },
    category_id: { type: Number, required: true },
    sub_category_id: { type: Number, required: true },
    note: { type: String },
    quantity: { type: Number, required: true },
    maxquantity: { type: Number, required: true },
    show_on_website: { type: Number, required: true },
    show_on_homepage: { type: Number, required: true },
    coming_soon: { type: Number, required: true },
    preorder: { type: Number, required: true },
    added_date: { type: Date, default: Date.now },
    updated_date: { type: Date, default: Date.now }
});


productSchema.pre('save', async function (next) {
    const doc = this;
    if (!doc.isNew) return next();

    try {
        const counter = await Counter.findOneAndUpdate({ _id: 'productId' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        doc.id = counter.seq;
        next();
    } catch (error) {
        next(error);
    }
});
module.exports = mongoose.model('Products', productSchema,'Products');