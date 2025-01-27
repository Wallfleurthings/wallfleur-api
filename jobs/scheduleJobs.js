const cron = require('node-cron');
const { removeExpiredCartItemsQueue } = require('./removeExpiredCartItems'); 

const scheduleJobs = () => {

  cron.schedule('* * * * *', async () => {
    await removeExpiredCartItemsQueue.add('removeExpiredCartItems');
  });
  
};

module.exports = scheduleJobs;
