const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

/**
 * Upload an image file to S3 in the specified folder
 * @param {Object} file - The file object (from multer)
 * @param {String} folderType - The folder type ('category', 'product', 'common')
 * @returns {Promise} - Resolves with the uploaded image data or rejects with an error
 */
const uploadImageToS3 = (file,imageName, folderType = '') => {
  const validFolders = ['category', 'products', 'common'];
  const folderName = validFolders.includes(folderType) ? folderType : '';

  const key = folderName ? `${folderName}/${imageName}` : imageName;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ACL: 'public-read',
    ContentType: file.mimetype
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.error('Error uploading to S3:', err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = { uploadImageToS3 };
