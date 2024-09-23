const admin = require('../models/adminuser.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();
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
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};


const addAdminUser = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, password } = req.body;
    
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
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const delete_api = async (req,res) =>{
    const { id,database } = req.body;
    console.log(database);

    try {
        const Model = require(`../models/${database}.model`); // Adjust the path as per your model location

        const result = await Model.findOneAndUpdate(
            { id: id },
            { $set: { is_deleted: true } },
            { new: true } // Return the updated document
        );

        if (!result) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        res.json({ message: 'Admin user deleted successfully', data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};



module.exports = {
    check_adminuser,
    addAdminUser,
    delete_api
};