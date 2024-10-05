const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customer_id: {
        type: Number,
        required: true,
    },
    customer_name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    dialcode: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    postalCode: {
        type: Number,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    receipt: {
        type: String,
        required: true,
    },
    order_id: {
        type: String,
        required: true,
    },
    payment_id: {
        type: String,
    },
    signature: {
        type: String,
    },
    status: {
        type: String,
        default: 'created',
    },
    products: [{
        product_id: {
            type: mongoose.Schema.Types.Number,
            ref: 'Product', 
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    products: [{
        product_id: Number,
        quantity: Number
    }],
    ordered_date: {
        type: Date,
        default: Date.now
    },
    updated_date: {
        type: Date,
        default: Date.now
    },
    transactionId: {
        type: String,
    },
    invoice_id: {
        type: String,
    }
});

module.exports = mongoose.model('Order', OrderSchema);
