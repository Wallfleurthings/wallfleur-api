require('dotenv').config();
const Order = require('../models/payment.model');
const Bag = require('../models/bag.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const {transporter} = require('../config/email');
const { generateOrderConfirmationEmailTemplate } = require('../utils/emailTemplates/orderEmailTemplate');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../config/logger');

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
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const { amount, userData, products } = req.body;

        if (!amount) {
            return res.status(400).json({ message: 'Amount is missing in request body.' });
        }

        const amountInCents = Math.round(amount * 100);

        const productIds = products.map(product => product.id);
        const productDetails = await Product.find({ id: { $in: productIds } }).select(`id name quantity inrprice`); 

        const productPriceMap = productDetails.reduce((map, product) => {
            map[product.id.toString()] = product.inrprice;
            return map;
        }, {});

        const availableQuantities = productDetails.reduce((map, product) => {
            map[product.id.toString()] = product.quantity;
            return map;
        }, {});

        for (const product of products) {
            const availableQuantity = availableQuantities[product.id];
            if (availableQuantity < product.quantity) {
                return res.status(400).json({
                    message: `Insufficient quantity for product ${product.name}. Available: ${availableQuantity}, Requested: ${product.quantity}`
                });
            }
        }


        const totalAmountFromProducts = products.reduce((total, product) => {
            const productPrice = productPriceMap[product.id];
            return total + (product.quantity * (productPrice || 0));
        }, 0);

        let deliveryCharge = totalAmountFromProducts >= 4000 ? 350 : 150;

        const totalAmountWithDelivery = totalAmountFromProducts + deliveryCharge;

        const calculatedAmountInCents = Math.round(totalAmountWithDelivery * 100);

        if (amountInCents !== calculatedAmountInCents) {
            return res.status(400).json({ message: 'Amount mismatch' });
        }

        const options = {
            amount: amountInCents,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        const orderCount = await Order.countDocuments({ customer_id: customerId });

        const invoiceId = `INV_${customerId}-${orderCount + 1}-${Date.now().toString().slice(-4)}`;

        const newOrder = new Order({
            customer_id: customerId,
            customer_name: userData.name,
            mobile: userData.mobile,
            dialcode: userData.dialcode,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            country: userData.country,
            postalCode: userData.postalCode,
            amount: amount,
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
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



const verifyPayment = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
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
                    logger.error('An error occurred:', { message: error.message, stack: error.stack });
                } else {
                    logger.info('Order confirmation email sent:', info.response);
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
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


async function generateAccessToken(){
    const response = await axios({
        url : `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
        method: 'post',
        data: 'grant_type=client_credentials',
        auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_CLIENT_SECRET
        }
    });
    return response.data.access_token;
}



const createPayPalOrder = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const { amount, userData, products } = req.body;

        if (!amount) {
            return res.status(400).json({ message: 'Amount is missing in request body.' });
        }

        const productIds = products.map(product => product.id);
        const productDetails = await Product.find({ id: { $in: productIds } }).select(`id name quantity usdprice`);

        const productPriceMap = productDetails.reduce((map, product) => {
            map[product.id.toString()] =  product.usdprice;
            return map;
        }, {});

        const availableQuantities = productDetails.reduce((map, product) => {
            map[product.id.toString()] = product.quantity;
            return map;
        }, {});

        for (const product of products) {
            const availableQuantity = availableQuantities[product.id];
            if (availableQuantity < product.quantity) {
                return res.status(400).json({
                    message: `Insufficient quantity for product ${product.name}. Available: ${availableQuantity}, Requested: ${product.quantity}`
                });
            }
        }

        const totalAmountFromProducts = products.reduce((total, product) => {
            const productPrice = productPriceMap[product.id];
            return total + (product.quantity * (productPrice || 0));
        }, 0);

        let deliveryCharge = totalAmountFromProducts >= 130 ? 35 : 20;

        const totalAmountWithDelivery = totalAmountFromProducts + deliveryCharge;

        const calculatedAmountInCents = Math.round(totalAmountWithDelivery * 100);

        if (Math.round(amount * 100) !== calculatedAmountInCents) {
            return res.status(400).json({ message: 'Amount mismatch' });
        }

        const items = products.map(product => ({
            name: product.name,
            quantity: product.quantity,
            unit_amount: {
                currency_code: 'USD',
                value: productPriceMap[product.id].toFixed(2)
            }
        }));

        const accessToken = await generateAccessToken();

        // Make the API call to PayPal only at this point
        const response = await axios({
            url: `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            data: {
                intent: "CAPTURE",
                purchase_units: [
                    {
                        items: items,
                        amount: {
                            currency_code: 'USD',
                            value: totalAmountWithDelivery.toFixed(2),
                            breakdown: {
                                item_total: {
                                    currency_code: 'USD',
                                    value: totalAmountFromProducts.toFixed(2),
                                },
                                shipping: {
                                    currency_code: 'USD',
                                    value: deliveryCharge.toFixed(2),
                                }
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: `https://www.wallfleurthings.com/paypal`,
                    cancel_url: 'https://www.wallfleurthings.com/checkout',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    brand_name: 'Wallfleurthings'
                }
            }
        });

        // Generate invoice ID after receiving response
        const orderCount = await Order.countDocuments({ customer_id: customerId });
        const invoiceId = `INV_${customerId}-${orderCount + 1}-${Date.now().toString().slice(-4)}`;

        const newOrder = new Order({
            customer_id: customerId,
            customer_name: userData.name,
            mobile: userData.mobile,
            dialcode: userData.dialcode,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            country: userData.country,
            postalCode: userData.postalCode,
            amount: amount,
            currency: 'USD',
            receipt: response.data.id,
            order_id: response.data.id,
            invoice_id: invoiceId,
            products: products.map(product => ({
                product_id: product.id,
                quantity: product.quantity
            })),
            ordered_date: new Date(), 
            updated_date: new Date()
        });

        await newOrder.save();

        const approvalUrl = response.data.links.find(link => link.rel === 'approve').href;
        const orderId = response.data.id;

        res.status(201).json({ approvalUrl: `${approvalUrl}&order_id=${orderId}` });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const capturePayPalPayment = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const { order_id } = req.body;

        if (!order_id) {
            return res.status(400).json({ message: 'Order ID is missing in request body.' });
        }


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

        const accessToken = await generateAccessToken();
        const url = `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${order_id}/capture`;

        const response = await axios.post(url, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data.status === "COMPLETED") {
            transaction_id= response.data.purchase_units[0].payments.captures[0].id;

            order.payment_id = transaction_id;
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
                    logger.error('An error occurred:', { message: error.message, stack: error.stack });
                } else {
                    logger.info('Order confirmation email sent:', info.response);
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
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};





module.exports = {
    createOrder,
    verifyPayment,
    createPayPalOrder,
    capturePayPalPayment
};
