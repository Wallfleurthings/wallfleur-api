const Category = require('../models/category.model');
const Products = require('../models/product.model');
const { uploadImageToS3 } = require('../config/s3');
const jwt = require('jsonwebtoken');

const get_all_category = async (req, res) => {
    try {
        const result = await Category.find({status:1});
        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_category = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
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
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_id = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const categories = await Category.find({ status: 1})
            .sort({ addedDate: -1 })
            .select('id name');

        res.status(200).json(categories);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_product = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = {};
        const category = await Category.findOne({ slug }, 'id name');
        const id = category.id;
        result['category_name'] = category.name;
        product = await Products.find({ category_id:id,show_on_website:1 });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        if (!product) {
            return res.status(404).json({ message: 'No Products' });
        }
        const isInternational = req.session.is_international || false; 
        result['product'] = product.map(prod => ({
            ...prod.toObject(), 
            price: isInternational ? prod.usdprice : prod.inrprice
        }));
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_category_with_id = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
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
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_category = async (req, res) => {

    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        let { id, name, slug, status } = req.body;

        id = id || ''; 
        name = name || '';
        slug = slug || '';
        status = status || false;

        if (id) {
            const updatedCategory = await Category.findOneAndUpdate({ id: id }, {
                name,
                slug,
                status,
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
                added_date: new Date(),
                updated_date: new Date()
            });

            await newCategory.save();

            res.status(201).json({ message: 'Category added successfully', category: newCategory });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_category_image = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
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
        console.error('Error:', error);
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
    add_category_image
};
