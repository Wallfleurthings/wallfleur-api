require('dotenv').config();
const Order = require('../models/payment.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const jwt = require('jsonwebtoken');
const {transporter} = require('../config/email');
const logger = require('../config/logger');
const { generateOrderStatusEmailTemplate } = require('../utils/emailTemplates/orderStatusEmailTemplate');

const manage_get_all_orders = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { currency } = req.query;

        const filter = currency ? { currency } : {};

        const [orders, totalOrders] = await Promise.all([
            Order.find(filter).sort({ ordered_date: -1 }).skip(skip).limit(limit),
            Order.countDocuments(filter)
        ]);

        res.status(200).json({ orders, totalOrders });
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_order_by_search = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const { search } = req.query;

        let Orders;
        if (search) {
            Orders = await Order.find(
                {
                    $or: [
                        { customer_name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { order_id: { $regex: search, $options: 'i' } }
                    ]
                },
                { _id: 1, customer_name: 1, amount: 1, status: 1, ordered_date: 1, order_id: 1 }
            );
        }else {
            Orders = await Order.find().sort({ ordered_date: -1 }).skip(0).limit(10);
        }
        if (Orders.length === 0) {
            return res.status(404).json({ message: 'No Orders found' });
        }

        res.status(200).json(Orders);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_order_with_id = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);        
        const { id } = req.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
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

        res.status(200).json({ order, products });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_orders_by_customer_id = async (req, res) => {
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

        const orders = await Order.find({ customer_id: customerId }).sort({ ordered_date: -1 });

        const orderDetails = await Promise.all(
            orders.map(async order => {
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

                return { order, products };
            })
        );

        res.status(200).json({ orderDetails });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};




const get_all_order = async (req, res) => {
    try {
        const result = await Order.find();
        res.status(200).json(result);
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const upsertOrder = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const { _id, customerDetails, products, totals,currency } = req.body;

        if (!_id) {

            const formattedProducts = products.map(product => ({
                product_id: product.id,
                quantity: product.quantity
            }));


            const invoiceId = `INV_${Date.now()}`; 
            const receipt= `receipt_${Date.now()}`;
            const order_id= `order_cus_${Date.now()}`;

            const newOrder = new Order({
                customer_id: 0,
                customer_name: customerDetails.name,
                email: customerDetails.email,
                mobile: customerDetails.phoneNo,
                address: customerDetails.address,
                city: customerDetails.city,
                dialcode: customerDetails.dialcode,
                state: customerDetails.state,
                country: customerDetails.country,
                postalCode: customerDetails.pincode,
                amount: totals.grandTotal,
                currency: currency,
                receipt: receipt,
                order_id: order_id,
                invoice_id: invoiceId,
                products: formattedProducts,
                trackingId: customerDetails.trackingId || '',
                ordered_date: new Date(),
                updated_date: new Date()
            });

            await newOrder.save();
            res.status(200).json(newOrder);

        } else {
            // Handle order update
            const order = await Order.findOne({ _id });

            if (!order) {
                return res.status(404).json({ message: 'Order not found.' });
            }

            const oldStatus = order.status;
            order.customer_name = customerDetails.name || order.customer_name;
            order.email = customerDetails.email || order.email;
            order.address = customerDetails.address || order.address;
            order.mobile = customerDetails.phoneNo || order.mobile;
            order.dialcode = customerDetails.dialcode || order.dialcode;
            order.country = customerDetails.country || order.country;
            order.state = customerDetails.state || order.state;
            order.city = customerDetails.city || order.city;
            order.postalCode = customerDetails.pincode || order.postalCode;
            order.status = customerDetails.status || order.status;
            order.currency = currency || order.currency;
            order.trackingId = customerDetails.trackingId;
            order.updated_date = new Date();

            const formattedProducts = products.map(product => ({
                product_id: product.id,
                quantity: product.quantity
            }));

            order.products = formattedProducts || order.products;
            order.totals = totals || order.totals;

            await order.save();

            if (order.status !== oldStatus) {
              
                const user = await Customer.findOne({
                    id: order.customer_id,
                    status: 1,
                    is_verified: 1
                  });
                const emailTemplate = generateOrderStatusEmailTemplate(user,order,products,);

                const mailOptions = {
                    from: process.env.GMAIL_USER,
                    to: customerDetails.email ?? user.email, 
                    subject: 'Wallfleur Order Status Updated',
                    html: emailTemplate
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        logger.error('An error occurred:', { message: error.message, stack: error.stack });
                    }
                });
            }

            res.status(200).json(order);
        }
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const search_all_product = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const searchQuery = req.query.query || '';

        const regex = new RegExp(searchQuery, 'i');

        const result = await Product.find({
            show_on_website: 1,
            name: { $regex: regex }
        });

        res.status(200).json(result);
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_orders_by_filter_for_invoice = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const { filterType, rangeFrom, rangeTo, status } = req.query;
        let query = {};

        if (!rangeFrom || !rangeTo) {
            return res.status(400).json({ message: 'Invalid date range' });
        }


        if (filterType === 'date') {

            const fromDate = new Date(rangeFrom);
            const toDate = new Date(rangeTo);
            toDate.setDate(toDate.getDate() + 1);

            query.ordered_date = { $gte: fromDate, $lte: toDate };
        }

        if (filterType === 'order_id') {

            query.order_id = { $gte: rangeFrom, $lte: rangeTo };
        }

        if (status) {
            query.status = status;
        }

        // Fetch orders that match the query
        const orders = await Order.find(query).sort({ ordered_date: -1 });

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }

        // Fetch product information for each order
        const orderDetailsWithProducts = await Promise.all(
            orders.map(async (order) => {
                const productDetails = order.products; // Get product details from order

                if (Array.isArray(productDetails) && productDetails.length > 0) {
                    const productIds = productDetails.map((detail) => detail.product_id);

                    // Fetch products based on product_id
                    const fetchedProducts = await Product.find({ id: { $in: productIds } });

                    // Map the fetched products to their details and merge with order
                    const products = fetchedProducts.map((product) => {
                        const detail = productDetails.find(
                            (d) => d.product_id.toString() === product.id.toString()
                        );
                        return {
                            ...product.toObject(),
                            price: order.currency === 'INR' ? product.inrprice : product.usdprice,
                            quantity: detail ? detail.quantity : 0,
                        };
                    });

                    return {
                        ...order.toObject(),
                        products,
                    };
                } else {
                    return {
                        ...order.toObject(),
                        products: [], // No products
                    };
                }
            })
        );

        res.status(200).json({ orders: orderDetailsWithProducts });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_orders_export_list = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const { rangeFrom, rangeTo, status } = req.query;
        let query = {};

        if (!rangeFrom || !rangeTo) {
            return res.status(400).json({ message: 'Invalid date range' });
        }



            const fromDate = new Date(rangeFrom);
            const toDate = new Date(rangeTo);
            toDate.setDate(toDate.getDate() + 1);

            query.ordered_date = { $gte: fromDate, $lte: toDate };

        if (status) {
            query.status = status;
        }

        // Fetch orders that match the query
        const orders = await Order.find(query).sort({ ordered_date: -1 });

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }

        // Fetch product information for each order
        const orderDetailsWithProducts = await Promise.all(
            orders.map(async (order) => {
                const productDetails = order.products; // Get product details from order

                if (Array.isArray(productDetails) && productDetails.length > 0) {
                    const productIds = productDetails.map((detail) => detail.product_id);

                    // Fetch products based on product_id
                    const fetchedProducts = await Product.find({ id: { $in: productIds } });

                    // Map the fetched products to their details and merge with order
                    const products = fetchedProducts.map((product) => {
                        const detail = productDetails.find(
                            (d) => d.product_id.toString() === product.id.toString()
                        );
                        return {
                            ...product.toObject(),
                            price: order.currency === 'INR' ? product.inrprice : product.usdprice,
                            quantity: detail ? detail.quantity : 0,
                        };
                    });

                    return {
                        ...order.toObject(),
                        products,
                    };
                } else {
                    return {
                        ...order.toObject(),
                        products: [], // No products
                    };
                }
            })
        );

        res.status(200).json({ orders: orderDetailsWithProducts });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    manage_get_all_orders,
    get_order_with_id,
    get_orders_by_customer_id,
    get_all_order,
    upsertOrder,
    get_orders_by_filter_for_invoice,
    get_orders_export_list,
    search_all_product,
    get_order_by_search
};