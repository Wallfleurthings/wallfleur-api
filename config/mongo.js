const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,{dbName: 'Wallfleur',})
  .then(() => {
    console.log('Connected to the MongoDB database');
  })
  .catch(err => {
    console.error('Cannot connect to the database!', err);
    process.exit();
  });
