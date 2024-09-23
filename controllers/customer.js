const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Customer = require('../models/customer.model');
const {transporter} = require('../config/email');
const { generateOTPEmailTemplate } = require('../utils/emailTemplates/otpEmailTemplates');
const { generateForgotPasswordTemplate } = require('../utils/emailTemplates/forgotPasswordTemplate');
const { encryptToken,decryptToken } = require('../utils/encrypt/encrypt');


const user_login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Customer.findOne({
            email,
            status: 1,
            is_verified: 1
          });
          
        if (!user) {
            return res.status(400).json({ message: 'User does not exist. Please register first.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email
                }, 
                `${process.env.SECRET_KEY}`, 
                { expiresIn: '2h' }
            );

            res.status(200).json({ token });
        } else {
            res.status(400).json({ message: 'Incorrect password. Please enter correct password.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const register_customer = async (req, res) => {
    try {
        const { name, phoneNumber, email, password } = req.body;

        const existingCustomer = await Customer.findOne({ $or: [{ phone: phoneNumber }, { email: email },{ is_verified:0}] });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Phone number or email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000);

        const newCustomer = new Customer({
            name: name,
            phone: phoneNumber,
            password: hashedPassword,
            email: email,
            otp: otp,
            otp_expiry: Date.now() + 10 * 60 * 1000, // OTP valid for 10 minutes
            status: 0,
            is_deleted: 0,
            is_verified: 0
        });

        await newCustomer.save();

        const emailDate = new Date().toLocaleDateString();
        const emailTemplate = generateOTPEmailTemplate(otp, emailDate);

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'WallfleurThings Registration OTP',
            html: emailTemplate
        };


        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending OTP email:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(201).json({ message: 'Please check your email to verify your account.' });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
}      
};

const profile = async (req,res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;

        const customer = await Customer.findOne({ id: customerId });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const get_all_customer = async (req, res) => {
    try {
        const result = await Customer.find({is_deleted: 0,status:1});
        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_customer = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [customers, totalCustomers] = await Promise.all([
            Customer.find({is_deleted: 0}).sort({ added_date: -1 }).skip(skip).limit(limit),
            Customer.countDocuments({ is_deleted: 0 })
        ]);

        res.status(200).json({ customers, totalCustomers });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_customer_with_id = async (req, res) => {
    try {
        const { id } = req.params;
        const customerdata = await Customer.find({ id: id }); // Use a different variable name
        if (!customerdata) {
            return res.status(404).json({ message: 'No Category' });
        }
        res.status(200).json(customerdata);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const add_customer = async (req, res) => {
    try {
        let { id, name, phone, email, address_1, address_2, address_3, country, state, city, pinCode, status } = req.body;

        id = id || ''; 
        name = name || '';
        phone = phone || '';
        email = email || '';
        address_1 = address_1 || '';
        country = country || '';
        state = state || '';
        city = city || '';
        pinCode = pinCode || '';
        status = status ? 1 : 0; // Convert to 1 or 0 based on isChecked

        if (id) {
            // Update existing customer
            const updatedCustomer = await Customer.findOneAndUpdate({ id: id }, {
                name,
                phone,
                email,
                address_1,
                country,
                state,
                city,
                pinCode,
                status,
            }, { new: true });

            if (!updatedCustomer) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            res.status(200).json({ message: 'Customer updated successfully', customer: updatedCustomer });
        } else {
            // Create new customer
            const newCustomer = new Customer({
                name,
                phone,
                email,
                address_1,
                country,
                state,
                city,
                pinCode,
                status,
                added_date: new Date(),
                is_deleted: 0,
                is_verified: 1
            });

            await newCustomer.save();

            res.status(201).json({ message: 'Customer added successfully', customer: newCustomer });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const update_website_customer = async (req, res) => {
    const token = req.headers.authorization;
    let jwtToken;

    if (token) {
        jwtToken = token.split(' ')[1];
    } else {
        console.log("Authorization header is missing.");
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }
    try {
        const decodedToken = jwt.verify(jwtToken, process.env.SECRET_KEY);
        const customerId = decodedToken.userId;
        let {  name, phone,address_1,country, state, city, pinCode,status } = req.body;

        name = name || '';
        phone = phone || '';
        address_1 = address_1 || '';
        country = country || '';
        state = state || '';
        city = city || '';
        pinCode = pinCode || '';
        status = status ? 1 : 0; 

        const updatedCustomer = await Customer.findOneAndUpdate({ id: customerId }, {
            name,
            phone,
            address_1,
            country,
            state,
            city,
            pinCode,
            status,
        }, { new: true });

        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ message: 'Profile updated successfully', customer: updatedCustomer });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const customer = await Customer.findOne({ email: email });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        if (customer.otp != otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (customer.otp_expiry < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        customer.status = 1; // Activate account
        customer.is_verified = 1; // Activate account
        customer.otp = undefined; // Clear OTP
        customer.otp_expiry = undefined; // Clear OTP expiry
        await customer.save();

        res.status(200).json({ message: 'OTP verified successfully. Your account is now active.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user by email
        const user = await Customer.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Generate a reset token and its expiration time
        const token = crypto.randomBytes(20).toString('hex');
        const resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        // Encrypt the token (only the token is passed)
        const dataToEncrypt = `${email}:${token}`;
        const encryptedToken = encryptToken(dataToEncrypt);

        // Save the plain token and expiration time to the user's record
        user.resetPasswordToken = token;
        user.resetPasswordExpires = resetPasswordExpires;
        await user.save();

        // Generate the password reset link using the encrypted token
        const resetLink = `http://localhost:3002/forgotpassword?token=${encodeURIComponent(encryptedToken)}`;

        // Prepare email content
        const emailDate = new Date().toLocaleDateString();
        const emailTemplate = generateForgotPasswordTemplate(resetLink, emailDate);

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'WallfleurThings Password Reset',
            html: emailTemplate
        };

        // Send the reset email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending reset email:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(200).json({ message: 'Please check your email to reset your password.' });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Decrypt the token to get the email
        const emailToken = decryptToken(token);

        // Separate the email and token
        const [email, plainToken] = emailToken.split(':');        

        const user = await Customer.findOne({
            email,
            resetPasswordToken: plainToken,
            resetPasswordExpires: { $gt: Date.now() } // Check if token is expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
  

module.exports = {
    register_customer,
    user_login,
    profile,
    get_all_customer,
    manage_get_all_customer,
    get_customer_with_id,
    add_customer,
    update_website_customer,
    verifyOtp,
    forgotPassword,
    resetPassword
};
