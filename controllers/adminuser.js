require('dotenv').config();
const admin = require('../models/adminuser.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const secretKey = process.env.ADMIN_SECRET_KEY;


const check_adminuser = async (req, res) => {
    let { username, password } = req.body;

    try {
        const user = await admin.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    username: user.username
                }, 
                `${process.env.MANAGE_SECRET_KEY}`, 
                { expiresIn: '12h' }
            );
            res.json({ exists: true, token });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
        res.status(500).json({ error: 'Server error' });
    }
};


const addAdminUser = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const existingUser = await admin.findOne({ username });

        if (existingUser) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdminUser = new admin({
            username,
            password: hashedPassword
        });

        await newAdminUser.save();

        res.json({ message: 'Admin user added successfully' });
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
        res.status(500).json({ error: 'Server error' });
    }
};


const delete_api = async (req, res) => {
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
        const { id, database } = req.body;

        const Model = require(`../models/${database}.model`);

        const result = await Model.deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        res.json({ message: 'Admin user deleted successfully' });
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
        res.status(500).json({ error: 'Server error' });
    }
};

const manage_delete_api = async (req, res) => {
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
        const { _id, database } = req.body;

        const Model = require(`../models/${database}.model`);

        const result = await Model.deleteOne({ _id: _id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        res.json({ message: 'Admin user deleted successfully' });
    } catch (err) {
        logger.error('An error occurred:', { message: err.message, stack: err.stack });
        res.status(500).json({ error: 'Server error' });
    }
};




module.exports = {
    check_adminuser,
    addAdminUser,
    delete_api,
    manage_delete_api
};