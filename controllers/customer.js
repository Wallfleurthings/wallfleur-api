const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Customer = require('../models/customer.model');
const Contact_US = require('../models/contactus.model');
const NewsLetter = require('../models/newsletter.model');
const {transporter} = require('../config/email');
const { generateOTPEmailTemplate } = require('../utils/emailTemplates/otpEmailTemplates');
const { generateForgotPasswordTemplate } = require('../utils/emailTemplates/forgotPasswordTemplate');
const { generateThankYouEmailTemplate } = require('../utils/emailTemplates/newsLetter');
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
        const { name, phoneNumber, email, password,dialCode } = req.body;

        const existingCustomer = await Customer.findOne({ $or: [{ phone: phoneNumber }, { email: email }] });
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
            dialcode: dialCode,
            otp_expiry: Date.now() + 10 * 60 * 1000,
            status: 0,
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

const get_customer_by_search = async (req, res) => {
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
        const { search } = req.query;

        let Customers;
        if (search) {
            Customers = await Customer.find(
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } }
                    ]
                },
                { id: 1, name: 1, quantity: 1, added_date: 1, status: 1 }
            );
        }else {
            Customers = await Customer.find().sort({ added_date: -1 }).skip(0).limit(10);
        }
        if (Customers.length === 0) {
            return res.status(404).json({ message: 'No Customers found' });
        }

        res.status(200).json(Customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const save_address = async (req, res) => {
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

        const { address, country, state, city, postalCode } = req.body;

        if (!address || !country || !state || !city || !postalCode) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const customer = await Customer.findOne({ id: customerId });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        customer.address_1 = address;
        customer.country = country;
        customer.state = state;
        customer.city = city;
        customer.pinCode = postalCode;

        await customer.save();

        res.status(200).json({ message: 'Address saved successfully', customer });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_all_customer = async (req, res) => {
    try {
        const result = await Customer.find({status:1});
        res.status(200).json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const manage_get_all_customer = async (req, res) => {
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

        const [customers, totalCustomers] = await Promise.all([
            Customer.find().sort({ added_date: -1 }).skip(skip).limit(limit),
            Customer.countDocuments()
        ]);

        res.status(200).json({ customers, totalCustomers });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const get_customer_with_id = async (req, res) => {
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
        const customerdata = await Customer.find({ id: id });
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
        let { id, name, phone, email, dialcode ,address_1, address_2, address_3, country, state, city, pinCode, status } = req.body;

        id = id || ''; 
        name = name || '';
        phone = phone || '';
        email = email || '';
        dialcode = dialcode || '';
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
                dialcode,
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
                dialcode,
                address_1,
                country,
                state,
                city,
                pinCode,
                status,
                added_date: new Date(),
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
        let {  name, phone,address_1,country, state, dialcode, city, pinCode,status } = req.body;

        name = name || '';
        phone = phone || '';
        address_1 = address_1 || '';
        dialcode = dialcode || '';
        country = country || '';
        state = state || '';
        city = city || '';
        pinCode = pinCode || '';
        status = status ? 1 : 0; 

        const updatedCustomer = await Customer.findOneAndUpdate({ id: customerId }, {
            name,
            phone,
            address_1,
            dialcode,
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
        const user = await Customer.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        const dataToEncrypt = `${email}:${token}`;
        const encryptedToken = encryptToken(dataToEncrypt);

        user.resetPasswordToken = token;
        user.resetPasswordExpires = resetPasswordExpires;
        await user.save();

        const resetLink = `https://www.wallfleurthings.com/forgotpassword?token=${encodeURIComponent(encryptedToken)}`;

        const emailDate = new Date().toLocaleDateString();
        const emailTemplate = generateForgotPasswordTemplate(resetLink, emailDate);

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'WallfleurThings Password Reset',
            html: emailTemplate
        };

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
        const emailToken = decryptToken(token);

        const [email, plainToken] = emailToken.split(':');        

        const user = await Customer.findOne({
            email,
            resetPasswordToken: plainToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

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

const contact_us = async (req, res) => {
    try {
      const { email, name, message } = req.body;
  
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
      const existingMessage = await Contact_US.findOne({
        email: email,
        created_date: { $gte: twentyFourHoursAgo }
      });
  
      if (existingMessage) {
        return res.status(200).json({ message: 'Message already received. We will contact you soon.' });
      }
  
      const newContactus = new Contact_US({
        name: name,
        email: email,
        message: message,
        created_date: new Date()
      });
  
      await newContactus.save();
      res.status(200).json({ message: 'Thank you, We will contact you soon!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
};

const newsletter = async (req, res) => {
    try {
      const { email } = req.body;
    
      const existingMessage = await NewsLetter.findOne({
        email: email
      });
  
      if (existingMessage) {
        return res.status(200).json({ message: 'You Have already Subscribed, Thank You' });
      }
  
      const newSubscriber = new NewsLetter({
        email: email,
        created_date: new Date()
      });
      await newSubscriber.save();

      const emailDate = new Date().toLocaleDateString();
      const emailTemplate = generateThankYouEmailTemplate(emailDate);

      const mailOptions = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'Subscribed to WallfleurThings News Letter',
          html: emailTemplate
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(201).json({ message: 'Thank you, For Subscribing' });
    });

      res.status(200).json({ message: 'Thank you, For Subscribing' });
    } catch (error) {
      console.error(error);
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
    resetPassword,
    save_address,
    contact_us,
    newsletter,
    get_customer_by_search
};
