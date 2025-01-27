const { Queue, Worker } = require('bullmq');
const Bag = require('../models/bag.model');
const { connection } = require('../config/bullMq');
const logger = require('../config/logger');

const removeExpiredCartItemsQueue = new Queue('removeExpiredCartItems', { connection });
const removeExpiredCartItemsWorker = new Worker('removeExpiredCartItems', async (job) => {
    const expirationTime = 3 * 60 * 1000;  // 3 minutes
    const expirationDate = new Date(Date.now() - expirationTime);
  
    try {
        const batch = await Bag.find({
            addedAt: { $lt: expirationDate }
        }).limit(100);
    
        if (batch.length === 0) {
            logger.jobs('No expired cart items to remove.');
            return;
        }
    
        const result = await Bag.deleteMany({
            _id: { $in: batch.map(doc => doc._id) }
        });
  
        logger.jobs(`Expired cart items removed: ${result}`);
    } catch (error) {
        logger.error('Error removing expired cart items:', error);
    }
  }, { connection });
  

removeExpiredCartItemsWorker.on('active', () => {
  logger.jobs('Remove Expired Worker is active and processing jobs.');
});

removeExpiredCartItemsWorker.on('failed', (job, err) => {
  logger.error('Remove Expired Job failed:', job.id, err);
});

removeExpiredCartItemsWorker.on('completed', (job) => {
  logger.jobs('Remove Expired Job completed:', job.id);
});

removeExpiredCartItemsWorker.on('idle', () => {
  logger.jobs('Remove Expired Worker is idle (not processing any jobs).');
});

module.exports = removeExpiredCartItemsQueue;
