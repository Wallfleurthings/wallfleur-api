const Category = require('../models/category.model');
const Product = require('../models/product.model');
const Advertisement = require('../models/advertisement.model');
const logger = require('../config/logger');

const get_homedata = async (req, res) => {
    try {
        const result = {};
        result['category'] = await Category.find({status: 1, show_on_homepage: 1}).select('image slug name');
        result['advertisement'] = await Advertisement.find({status:1}).select('banner_image banner_url');
        const products = await Product.find({show_on_website: 1, show_on_homepage: 1 }).select('image1 quantity slug name preorder inrprice usdprice coming_soon');
        const PreOrderproducts = await Product.find({show_on_website: 1, preorder: 1 }).select('image1 quantity slug name preorder inrprice usdprice coming_soon');

        const isInternational = req.session.is_international || false; 

        result['product'] = products.map(product => ({
            ...product.toObject(), 
            price: isInternational ? product.usdprice : product.inrprice,
            currency: isInternational ? '$' : '₹'
        }));

        result['PreOrderproducts'] = PreOrderproducts.map(PreOrderproduct => ({
            ...PreOrderproduct.toObject(), 
            price: isInternational ? PreOrderproduct.usdprice : PreOrderproduct.inrprice,
            currency: isInternational ? '$' : '₹'
        }));

        result['currency'] = isInternational ? 'Global' : 'India';

        res.status(200).json(result);
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const search = async (req, res) => {
    try {
        const { query } = req.query;

        const products = await Product.find({
            name: new RegExp(query, 'i'),  // Case-insensitive search
            show_on_website: 1  // Check if the product's status is 1
        }, 'name slug');

        res.json(products);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Server error' });
    }
};


const set_international_session = async (req, res) => {
    try {
        req.session.is_international = req.body.flag === 1 ? false : true;
        res.status(200).json(req.session.is_international );
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Server error' });
    }
};

const get_international_session = async (req, res) => {
    try {
        res.status(200).json(req.session );
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Server error' });
    }
};


module.exports = {
    get_homedata,
    search,
    set_international_session,
    get_international_session
};
