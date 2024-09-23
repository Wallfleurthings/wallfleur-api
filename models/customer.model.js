const mongoose = require('mongoose');
const Counter = require('./counter.model');

const customerSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    phone: { type: Number, required: true },
    password: { type: String },
    email: { type: String, required: true },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pinCode: { type: Number },
    status: { type: Number, default: 0 }, // 0 for inactive, 1 for active
    address_1: { type: String },
    address_2: { type: String },
    address_3: { type: String },
    added_date: { type: Date, default: Date.now },
    is_deleted: { type: Number, default: 0 },
    otp: { type: Number },
    otp_expiry: { type: Date },
    is_verified: { type: Number },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});

customerSchema.pre('save', async function (next) {
    const doc = this;
    if (!doc.isNew) return next(); // Skip if not a new document

    try {
        const counter = await Counter.findOneAndUpdate({ _id: 'customerId' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        doc.id = counter.seq; // Assign the incremented value to the custom id field
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Customer', customerSchema, 'Customer');
