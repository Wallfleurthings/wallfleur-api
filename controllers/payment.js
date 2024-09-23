const Order = require('../models/payment.model');
const Bag = require('../models/bag.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const {transporter} = require('../config/email');
const { generateOrderConfirmationEmailTemplate } = require('../utils/emailTemplates/orderEmailTemplate');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const { amount, userData, products } = req.body;

        if (!amount) {
            return res.status(400).json({ message: 'Amount is missing in request body.' });
        }

        const isInternational = req.session.is_international || false; 
        const amountInCents = Math.round(amount * 100);

        // Fetch product prices from the database
        const productIds = products.map(product => product.id);
        const productDetails = await Product.find({ id: { $in: productIds } }).select(isInternational ? 'usdprice id' : 'inrprice id'); 

        // Create a map for quick lookup of product prices
        const productPriceMap = productDetails.reduce((map, product) => {
            map[product.id.toString()] = isInternational ? product.usdprice : product.inrprice;
            return map;
        }, {});

        const deliveryCharge = 500;

        // Calculate the expected amount based on product prices and quantities
        const totalAmountFromProducts = products.reduce((total, product) => {
            const productPrice = productPriceMap[product.id];
            return total + (product.quantity * (productPrice || 0));
        }, 0);



        // Add delivery charge to the total amount
        const totalAmountWithDelivery = totalAmountFromProducts + deliveryCharge;

        // Convert to cents
        const calculatedAmountInCents = Math.round(totalAmountWithDelivery * 100);


        // Compare the received amount with the calculated amount
        if (amountInCents !== calculatedAmountInCents) {
            return res.status(400).json({ message: 'Amount mismatch' });
        }

        // Create order options for Razorpay
        const options = {
            amount: amountInCents,
            currency: isInternational ? 'USD' : 'INR',
            receipt: `receipt_${Date.now()}`
        };

        // Create a new order with Razorpay
        const order = await razorpay.orders.create(options);
        const orderCount = await Order.countDocuments({ customer_id: customerId });

        const invoiceId = `INV_${customerId}-${orderCount + 1}-${Date.now().toString().slice(-4)}`;

        const newOrder = new Order({
            customer_id: customerId,
            customer_name: userData.name,
            mobile: userData.mobile,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            country: userData.country,
            postalCode: userData.postalCode,
            amount: totalAmountFromProducts, // Store amount as a float
            currency: order.currency,
            receipt: order.receipt,
            order_id: order.id,
            invoice_id: invoiceId,
            products: products.map(product => ({
                product_id: product.id,
                quantity: product.quantity
            })),
            ordered_date: new Date(), 
            updated_date: new Date()
        });

        await newOrder.save();
        res.status(200).json(order);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



const verifyPayment = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const { order_id, payment_id, signature } = req.body;

        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ message: 'Order ID, Payment ID or Signature is missing in request body.' });
        }

        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                          .update(order_id + "|" + payment_id)
                                          .digest('hex');

        const order = await Order.findOne({ order_id, customer_id: customerId });
        const user = await Customer.findOne({
            id: customerId,
            status: 1,
            is_verified: 1
          });

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const productDetails = order.products; 

        let products = [];

        if (Array.isArray(productDetails) && productDetails.length > 0) {
            const productIds = productDetails.map(detail => detail.product_id); 

            let fetchedProducts = await Product.find({ id: { $in: productIds } });

            products = fetchedProducts.map(product => {

                const detail = productDetails.find(d => d.product_id.toString() === product.id.toString());
                return {
                    ...product.toObject(),
                    price: order.currency === 'INR' ? product.inrprice : product.usdprice,
                    quantity: detail ? detail.quantity : 0 
                };
            });
        }


        if (generated_signature === signature) {
            order.payment_id = payment_id;
            order.signature = signature;
            order.status = 'paid';
            order.updated_date = new Date(); 
            await order.save();
            await Bag.deleteMany({ customer_id: customerId });

            const emailTemplate = generateOrderConfirmationEmailTemplate({
                name: user.name,
                email: user.email,
            }, order,products);

            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: user.email,
                subject: 'Wallfleur Order Confirmation',
                html: emailTemplate
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending order confirmation email:', error);
                } else {
                    console.log('Order confirmation email sent:', info.response);
                }
            });


            res.status(200).json({ status: 'success' });
        } else {
            order.status = 'failed';
            order.updated_date = new Date();
            await order.save();
            res.status(400).json({ status: 'failure' });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    createOrder,
    verifyPayment
};
