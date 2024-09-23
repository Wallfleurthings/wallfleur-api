const HomepageModel = require('../models/homepage.model');
const Category = require('../models/category.model');
const Product = require('../models/product.model');

const get_homedata = async (req, res) => {
    try {
        const result = {};
        result['category'] = await Category.find({is_deleted: 0,status:1});
        const products = await Product.find({ is_deleted: 0, show_on_website: 1, show_on_homepage: 1 });

        const isInternational = req.session.is_international || false; 

        result['product'] = products.map(product => ({
            ...product.toObject(), 
            price: isInternational ? product.usdprice : product.inrprice
        }));

        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const search = async (req, res) => {
    try {
        const { query } = req.query;
        const products = await Product.find({
            name: new RegExp(query, 'i') // Case-insensitive search
        }, 'name slug'); // Only return the 'name' field
        res.json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const set_international_session = async (req, res) => {
    try {
        req.session.is_international = true;
        console.log('setsession:',req.sessionID);
        res.status(200).json(req.session.is_international );
    } catch (error) {
        console.error('Error unable to set session:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const get_international_session = async (req, res) => {
    try {
        console.log('session:',req.session);
        res.status(200).json(req.session );
    } catch (error) {
        console.error('Error unable to set session:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


module.exports = {
    get_homedata,
    search,
    set_international_session,
    get_international_session
};
