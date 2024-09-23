const Products = require('../models/product.model');
const { uploadImageToS3 } = require('../config/s3');

const get_all_product = async (req, res) => {
    try {
        const result = await Products.find({is_deleted: 0,show_on_website:1});
        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_product = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            Products.find({is_deleted: 0}).sort({ added_date: -1 }).skip(skip).limit(limit),
            Products.countDocuments({ is_deleted: 0 })
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

        product = product.map(prod => ({
            ...prod.toObject(), 
            price: isInternational ? prod.usdprice : prod.inrprice
        }));
        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
const get_product_with_id = async (req, res) => {
    try {
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

        const alternateProducts = await Products.find({ 
            category_id: category_id,
            id: { $ne: prod_id }
        });
        
        if (!alternateProducts || alternateProducts.length === 0) {
            return res.status(404).json({ message: 'No alternate products found' });
        }
        
        res.status(200).json(alternateProducts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const add_product = async (req, res) => {
    try {
        let { id, name, slug, dimension, description, quantity, inrprice, usdprice, category_id, sub_category_id, show_on_website, show_on_homepage } = req.body;
        id = id || ''; 
        name = name || '';
        slug = slug || '';
        dimension = dimension || '';
        description = description || '';
        quantity = quantity || 0; 
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
                inrprice,
                usdprice,
                category_id,
                sub_category_id,
                show_on_website,
                show_on_homepage,
                added_date: new Date(),
                updated_date:  new Date(),
                is_deleted:0
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
    try {
        const { product_id } = req.body;
        const images = req.files; // Using multer to get the uploaded files

        if (!product_id) {
        return res.status(400).json({ message: 'Product ID is required' });
        }

        if (!images || images.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
        }

        // Process each image
        const imageFields = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6'];
        const imageUrls = {};

        // Iterate over images and their fields
        for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const imageName = `${file.originalname}`;
        
        try {
            // Upload image to S3
            const result = await uploadImageToS3(file, imageName, 'products');
            
            imageUrls[imageFields[i]] = imageName;
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ message: 'Error uploading images' });
            }
        }

        // Update product with image URLs
        const updateData = { updated_date: new Date() };
        Object.assign(updateData, imageUrls); // Merge imageUrls into updateData

        const updatedProduct = await Products.findOneAndUpdate(
            { id: product_id },
            { $set: updateData }, // Save the image URLs
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
    const { productId, quantityToReduce } = req.body;

    try {
        const product = await Product.findOne({ id: productId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if quantity to reduce is valid
        if (product.quantity < quantityToReduce) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        // Subtract the quantity
        product.quantity -= quantityToReduce;

        // Save the updated product
        await product.save();

        res.status(200).json({ message: 'Product quantity reduced successfully' });
    } catch (error) {
        console.error('Error reducing product quantity:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
  

module.exports = {
    get_product,
    get_all_product,
    manage_get_all_product,
    get_alternate_product,
    add_product,
    get_product_with_id,
    reduce_quantity,

};
