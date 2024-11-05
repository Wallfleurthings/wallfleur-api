// generateAccessToken.js
const axios = require('axios');
require('dotenv').config();

async function generateAccessToken() {
    try {
        const response = await axios({
            url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
            method: 'post',
            data: 'grant_type=client_credentials',
            auth: {
                username: 'Abli_WHNmQ_fJtcYYRRzMsQ4Qsr3qsMjMHEBSTYTn1A888WydzCBToHUfQwjCSEPO5w8dNI-I8G1lw6C',
                password: 'EFMbcps_8Nlvq0MX9vwhpP-SwZBaV9HnLvTWJ3pF2qMhi-_ExevNi6QizhwOqDh6GBsnZv0uNB60CVgJ'
            }
        });
        return response.data.access_token;
        console.log('Access Token:', response.data.access_token);
    } catch (error) {
        console.error('Error generating access token:', error);
    }
}



async function capturePayPalPayment(orderId) {
    const url = `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`;
    const accessToken = await generateAccessToken();

    try {
        const response = await axios.post(url, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('Payment captured successfully:', response.data);
    } catch (error) {
        console.error('Error verifying payment:', error.response.data);
    }
}

// Usage
capturePayPalPayment('5KJ612673S137005U');
