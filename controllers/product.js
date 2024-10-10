const Products = require('../models/product.model');
const Categorymodel = require('../models/category.model');
const { uploadImageToS3 } = require('../config/s3');
const jwt = require('jsonwebtoken');
const categoryModel = require('../models/category.model');

const get_all_product = async (req, res) => {
    try {
        const result = await Products.find({show_on_website:1});
        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_product = async (req, res) => {
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

        const [products, totalProducts] = await Promise.all([
            Products.find().sort({ added_date: -1 }).skip(skip).limit(limit),
            Products.countDocuments()
        ]);

        res.status(200).json({ products, totalProducts });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_product = async (req, res) => {
    try {
        const { slug } = req.params;
        product = await Products.find({ slug:slug });
        if (!product) {
            return res.status(404).json({ message: 'No Products' });
        }
        const isInternational = req.session.is_international || false; 

        category = await categoryModel.find({ id:product[0].category_id }).select('name'); 
        const categoryName = category.length ? category[0].name : null;



        product = product.map(prod => ({
            ...prod.toObject(), 
            price: isInternational ? prod.usdprice : prod.inrprice,
            category_name : categoryName
        }));

        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
const get_product_with_id = async (req, res) => {
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
        let product = await Products.find({ id:id });
        if (!product) {
            return res.status(404).json({ message: 'No Products' });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_alternate_product = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const product = await Products.findOne({ slug: slug });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const category_id = product.category_id;
        const prod_id = product.id;

        const isInternational = req.session.is_international || false; 

        alternateProducts = await Products.find({ 
            category_id: category_id,
            id: { $ne: prod_id },
            show_on_website: 1
        });

        alternateProducts = alternateProducts.map(prod => ({
            ...prod.toObject(), 
            price: isInternational ? prod.usdprice : prod.inrprice
        }));
        
        
        if (!alternateProducts || alternateProducts.length === 0) {
            return res.status(200).json({ message: 'No alternate products found' });
        }
        
        res.status(200).json(alternateProducts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const add_product = async (req, res) => {
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

        let { id, name, slug, dimension, description, quantity, maxquantity, inrprice, usdprice, category_id, sub_category_id, show_on_website, show_on_homepage } = req.body;
        id = id || ''; 
        name = name || '';
        slug = slug || '';
        dimension = dimension || '';
        description = description || '';
        quantity = quantity || 0; 
        maxquantity = maxquantity || 0;
        inrprice = inrprice || 0;
        usdprice = usdprice || 0;
        category_id = category_id || '';
        sub_category_id = sub_category_id || '';
        show_on_website = show_on_website || 0;
        show_on_homepage = show_on_homepage || 0;

        if (id) {
            const updatedProduct = await Products.findOneAndUpdate({ id: id }, {
                name,
                slug,
                dimension,
                quantity,
                maxquantity,
                description,
                inrprice,
                usdprice,
                category_id,
                sub_category_id,
                show_on_website,
                show_on_homepage,
                $set: { updated_date: new Date() } 
            }, { new: true });

            if (!updatedProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
        } else {
            const newProduct = new Products({
                name,
                slug,
                dimension,
                description,
                quantity,
                maxquantity,
                inrprice,
                usdprice,
                category_id,
                sub_category_id,
                show_on_website,
                show_on_homepage,
                added_date: new Date(),
                updated_date:  new Date()
            });

            await newProduct.save();

            res.status(200).json({ message: 'Product added successfully', product_id: newProduct.id  });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_product_image = async (req, res) => {
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
        const { product_id } = req.body;
        const images = req.files;

        if (!product_id) {
        return res.status(400).json({ message: 'Product ID is required' });
        }

        if (!images || images.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
        }

        const imageFields = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6'];
        const imageUrls = {};

        for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const imageName = `${file.originalname}`;
        
        try {
            const result = await uploadImageToS3(file, imageName, 'products');
            
            imageUrls[imageFields[i]] = imageName;
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ message: 'Error uploading images' });
            }
        }

        const updateData = { updated_date: new Date() };
        Object.assign(updateData, imageUrls);

        const updatedProduct = await Products.findOneAndUpdate(
            { id: product_id },
            { $set: updateData },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Images added/updated successfully', product: updatedProduct });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const reduce_quantity = async (req, res) => {
    const { products } = req.body;
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.SECRET_KEY);

        const results = [];

        for (const { productId, quantityToReduce } of products) {
            const product = await Products.findOne({ id: productId });

            if (!product) {
                results.push({ productId, message: 'Product not found' });
                continue;
            }

            if (product.quantity < quantityToReduce) {
                results.push({ productId, message: 'Insufficient stock' });
                continue;
            }

            product.quantity -= quantityToReduce;

            await product.save();
            results.push({ productId, message: 'Product quantity reduced successfully' });
        }

        res.status(200).json({ results });
    } catch (error) {
        console.error('Error reducing product quantity:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const restore_quantity = async (req, res) => {
    const { products } = req.body;
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.SECRET_KEY);

        const results = [];

        for (const { productId, quantityToRestore } of products) {
            const product = await Products.findOne({ id: productId });

            if (!product) {
                results.push({ productId, message: 'Product not found' });
                continue;
            }

            product.quantity += quantityToRestore;

            await product.save();
            results.push({ productId, message: 'Product quantity restored successfully' });
        }

        res.status(200).json({ results });
    } catch (error) {
        console.error('Error restoring product quantity:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


  

module.exports = {
    get_product,
    get_all_product,
    manage_get_all_product,
    get_alternate_product,
    add_product,
    add_product_image,
    get_product_with_id,
    reduce_quantity,
    restore_quantity

};
