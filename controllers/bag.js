const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Bag = require('../models/bag.model');
const logger = require('../config/logger');

const check_bag = async (req, res) => {
    try {
        const token = req.headers.authorization;
        let jwtToken;

        if (token) {
            jwtToken = token.split(' ')[1];
        } else {
            logger.info("Authorization header is missing.");
            return res.status(401).json({ message: 'Authorization token is missing.' });
        }

        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        // Fetch bag items for the customer
        const bagItems = await Bag.find({ customer_id: customerId });

        // Create a lookup dictionary for product_id -> quantity
        const productQuantities = {};
        bagItems.forEach(item => {
            productQuantities[item.product_id] = item.quantity;
        });

        // Fetch products based on product IDs in the bag
        const productIds = bagItems.map(item => item.product_id);
        let products = await Product.find({ id: { $in: productIds } });
        
        // Determine if the user is international
        const isInternational = req.session.is_international || false; 

        // Map products to include the correct quantity and price
        products = products.map(prod => ({
            ...prod.toObject(),
            price: isInternational ? prod.usdprice : prod.inrprice,
            currency: isInternational ? '$' : '₹',
            quantity: productQuantities[prod.id] || 1 
        }));

        res.status(200).json({ products });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        if (error.name === 'JsonWebTokenError') {
            res.status(400).json({ message: 'Invalid token. Please provide a valid token.' });
        } else if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token expired. Please log in again.' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};

const addtobag = async (req, res) => {
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
  
      const { products } = req.body;

      await Bag.deleteMany({ customer_id: customerId });
  
      if (!products || (Array.isArray(products) && products.length === 0)) {
        return res.status(200).json({ message: 'Product data is missing in request body.' });
      }

      await Bag.deleteMany({ customer_id: customerId });
  
      const productIds = products.map(prod => prod.id);
  
      const existingBagItems = await Bag.find({ customer_id: customerId }).select('product_id');
      const existingProductIds = existingBagItems.map(item => item.product_id);
  
      const existingProductIdsSet = new Set(existingProductIds.map(id => id.toString()));
      const newBagItems = products
        .filter(prod => !existingProductIdsSet.has(prod.id.toString()))
        .map(prod => ({
          _id: new mongoose.Types.ObjectId(),
          customer_id: customerId,
          product_id: prod.id,
          quantity: prod.quantity
        }));
  
      if (newBagItems.length > 0) {
        await Bag.insertMany(newBagItems);
      }
  
      res.status(200).json({ message: 'Products added to bag successfully.' });
  
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
      if (err.name === 'JsonWebTokenError') {
        res.status(400).json({ message: 'Invalid token. Please provide a valid token.' });
      } else if (err.name === 'TokenExpiredError') {
        res.status(401).json({ message: 'Token expired. Please log in again.' });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  };
  


const removefrombag = (req, res) => {
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

        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is missing in request body.' });
        }

        Bag.findOneAndDelete({ customer_id: customerId, product_id: productId })
            .then((result) => {
                if (result) {
                    res.status(200).json({ message: 'Product removed from bag successfully.' });
                } else {
                    res.status(404).json({ message: 'Product not found in bag.' });
                }
            })
            .catch((err) => {
                logger.error('An error occurred:', { message: err.message, stack: err.stack });
                res.status(500).json({ message: 'Internal Server Error' });
            });
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

const cartCount = async (req, res) => {
    try {
        const token = req.headers.authorization;
        let jwtToken;

        if (token) {
            jwtToken = token.split(' ')[1];
        } else {
            logger.info("Authorization header is missing.");
            return res.status(401).json({ message: 'Authorization token is missing.' });
        }

        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const bagItems = await Bag.find({ customer_id: customerId });
        const count = bagItems.length

        res.status(200).json({ count });
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        if (error.name === 'JsonWebTokenError') {
            res.status(400).json({ message: 'Invalid token. Please provide a valid token.' });
        } else if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token expired. Please log in again.' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};

const check_products = async (req, res) => {
    const { products } = req.body;  // Array of products with { productId, quantity }
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.SECRET_KEY);

        // Extract all productIds from the cart
        const productIds = products.map(product => product.productId);
        const isInternational = req.session.is_international || false; 

        // Query all products in a single database call
        const productData = await Product.find({ id: { $in: productIds } });

        const productMap = productData.reduce((map, product) => {
            map[product.id] = product;  // Map product data by productId
            return map;
        }, {});

        const results = [];

        // Process each product in the cart
        for (const { productId, quantity } of products) {
            const product = productMap[productId];

            if (!product) {
                results.push({ productId, message: 'Product not found' });
                continue;
            }

            // Check stock status and update message accordingly
            let message = '';
            if (product.quantity <= 0) {
                message = 'Out of stock';
            } else if ((product.quantity - 2) < quantity) {
                message = 'Quantity changed';
            }

            // Get the appropriate price based on international status
            const price = isInternational == true ? product.usdprice : product.inrprice;
            const currency = isInternational == true ? '$' : '₹';

            // Push result with price and availability message
            results.push({
                productId,
                name: product.name,
                price,
                currency,
                message
            });
        }

        // Send the result back to the client
        res.status(200).json({ results });

    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server error' });
    }
};



module.exports = {
    check_bag,
    addtobag,
    removefrombag,
    check_products,
    cartCount
};
