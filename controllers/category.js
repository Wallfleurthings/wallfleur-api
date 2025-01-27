const Category = require('../models/category.model');
const Products = require('../models/product.model');
const { uploadImageToS3 } = require('../config/s3');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const get_all_category = async (req, res) => {
    try {
        const result = await Category.find({status:1});
        res.status(200).json(result);
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_category = async (req, res) => {
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [categories, totalCategory] = await Promise.all([
            Category.find().sort({ added_date: -1 }).skip(skip).limit(limit),
            Category.countDocuments()
        ]);
        res.status(200).json({ categories, totalCategory });
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_id = async (req, res) => {
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
        const categories = await Category.find({ status: 1})
            .sort({ addedDate: -1 })
            .select('id name');

        res.status(200).json(categories);
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_by_search = async (req, res) => {
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

        let categories;
        if (search) {
            categories = await Category.find(
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } }
                    ]
                },
                { id: 1, name: 1, added_date: 1, updated_date: 1, status: 1 }
            );
        }else {
            categories = await Category.find().sort({ added_date: -1 }).skip(0).limit(10);
        }
        if (categories.length === 0) {
            return res.status(404).json({ message: 'No Category found' });
        }

        res.status(200).json(categories);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_product = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = {};
        const category = await Category.findOne({ slug,status: 1 }, 'id name');
        if (!category) {
            return res.status(200).json({ message: 'Category not found' });
        }
        const id = category.id;
        result['category_name'] = category.name;
        product = await Products.find({
            $or: [
                { category_id: id },
                { sub_category_id: id }
            ],
            show_on_website: 1
        }).select('id name image1 inrprice usdprice slug quantity coming_soon preorder');

        if (!product) {
            return res.status(404).json({ message: 'No Products' });
        }
        const isInternational = req.session.is_international || false; 
        result['product'] = product.map(prod => ({
            ...prod.toObject(), 
            price: isInternational ? prod.usdprice : prod.inrprice,
            currency: isInternational ? '$' : '₹'
        }));

        result['currency'] = isInternational ? 'Global' : 'India';
        res.status(200).json(result);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_with_id = async (req, res) => {
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
        const categoryData = await Category.find({ id: id });
        if (!categoryData) {
            return res.status(404).json({ message: 'No Category' });
        }
        res.status(200).json(categoryData);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_category = async (req, res) => {

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
        let { id, name, slug, status,show_on_homepage } = req.body;

        id = id || ''; 
        name = name || '';
        slug = slug || '';
        status = status || false;
        show_on_homepage = show_on_homepage || false;

        if (id) {
            const updatedCategory = await Category.findOneAndUpdate({ id: id }, {
                name,
                slug,
                status,
                show_on_homepage,
                $set: { updated_date: new Date() }
            }, { new: true });

            if (!updatedCategory) {
                return res.status(404).json({ message: 'Category not found' });
            }

            res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
        } else {
            const newCategory = new Category({
                name,
                slug,
                status,
                show_on_homepage,
                added_date: new Date(),
                updated_date: new Date()
            });

            await newCategory.save();

            res.status(201).json({ message: 'Category added successfully', category: newCategory });
        }
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_category_image = async (req, res) => {
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
        let { id, image } = req.body;
        const file = req.file;

        id = id || ''; 

        if (file) {
            await uploadImageToS3(file, image,'category'); 
        }
        if (id) {
            const updatedCategory = await Category.findOneAndUpdate({ id: id }, {
                image,
                $set: { updated_date: new Date() }
            }, { new: true });

            if (!updatedCategory) {
                return res.status(404).json({ message: 'Category not found' });
            }

            res.status(200).json({ message: 'Category Image updated successfully', category: updatedCategory });
        }
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



module.exports = {
    get_all_category,
    manage_get_all_category,
    get_category_product,
    add_category,
    get_category_with_id,
    get_category_id,
    add_category_image,
    get_category_by_search
};
