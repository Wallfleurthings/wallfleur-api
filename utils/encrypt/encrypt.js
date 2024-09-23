const crypto = require('crypto');
const dotenv = require("dotenv")
dotenv.config()

const algorithm = 'aes-256-cbc'; // Encryption algorithm
const secretKey = process.env.SECRET_KEY; // Ensure this is set securely in your environment variables

// Function to encrypt the token
function encryptToken(token) {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(token);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return the IV and encrypted token
}

// Function to decrypt the token
function decryptToken(encryptedToken) {
    const [ivHex, encrypted] = encryptedToken.split(':');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString(); // Return the decrypted token
}

module.exports = {
    encryptToken,
    decryptToken
};
