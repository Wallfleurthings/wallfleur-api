const mongoose = require('mongoose');
const Counter = require('./counter.model');

const categorySchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String},
    slug: { type: String},
    status: { type: Number, default: false },
    image: { type: String, default: null },
    added_date: { type: Date, default: Date.now },
    show_on_homepage: { type: Number, required: true },
    updated_date: { type: Date, default: Date.now }
});

categorySchema.pre('save', async function (next) {
    const doc = this;
    if (!doc.isNew) return next(); // Skip if not a new document

    try {
        const counter = await Counter.findOneAndUpdate({ _id: 'catgoryId' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        doc.id = counter.seq; // Assign the incremented value to the custom id field
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Category', categorySchema,'Category');

