const express = require('express');
const cors = require('cors');
const route = require('./routes/route');
const session = require('express-session');
require('dotenv').config();
require('./config/mongo');
const logger = require('./config/logger');

const app = express();

const allowedOrigins = process.env.REACT_APP_ALLOWED_ORIGINS ? process.env.REACT_APP_ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: process.env.ADMIN_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(route);

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error: ', { message: err.message, stack: err.stack });

  res.status(500).json({
    error: 'Something went wrong, please try again later.'
  });
};

app.use(errorHandler);

module.exports = app;
