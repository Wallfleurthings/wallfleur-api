const Advertisement = require('../models/advertisement.model');
const { uploadImageToS3 } = require('../config/s3');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const manage_get_all_advertisement = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info('Authorization header is missing.');
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [advertisement, totalAdvertisement] = await Promise.all([
            Advertisement.find().sort({ added_date: -1 }).skip(skip).limit(limit),
            Advertisement.countDocuments()
        ]);
        res.status(200).json({ advertisement, totalAdvertisement });
    } catch (e) {
        logger.error('An error occurred:', { message: e.message, stack: e.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_advertisement = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        logger.info('Authorization header is missing.');
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        jwt.verify(jwtToken, process.env.MANAGE_SECRET_KEY);
        let { id, banner_image,banner_url,status } = req.body;
        const file = req.file;

        _id = id || '';
        banner_url = banner_url || '';

        if (file) {
            await uploadImageToS3(file, banner_image,'advertisement'); 
        }

        if (_id) {
            const updatedAdvertisement = await Advertisement.findOneAndUpdate({ _id: _id }, {
                banner_image,
                banner_url,
                status,
                $set: { updated_date: new Date() }
            }, { new: true });

            if (!updatedAdvertisement) {
                return res.status(404).json({ message: 'Advertisement not found' });
            }

            res.status(200).json({ message: 'Advertisement Image updated successfully', category: updatedAdvertisement });
        }else {
            const newAdvertisement = new Advertisement({
                banner_image,
                banner_url,
                status,
                added_date: new Date(),
                updated_date: new Date()
            });

            await newAdvertisement.save();

            res.status(201).json({ message: 'Advertisement added successfully', category: newAdvertisement });
        }
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_advertisement_with_id = async (req, res) => {
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
        const { _id } = req.params;
        const advertisementData = await Advertisement.find({ _id: _id });
        if (!advertisementData) {
            return res.status(404).json({ message: 'No Category' });
        }
        res.status(200).json(advertisementData);
    } catch (error) {
        logger.error('An error occurred:', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    manage_get_all_advertisement,
    add_advertisement,
    get_advertisement_with_id
};