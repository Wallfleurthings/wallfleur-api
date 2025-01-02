const generateOrderConfirmationEmailTemplate = (userData, order, products) => {
    const date = new Date().toLocaleDateString();
    return `
        <table
            style="
              max-width: 680px;
              margin: 0 auto;
              padding: 45px 30px 60px;
              background: #f8e7eb;
              font-family: 'Poppins', sans-serif;
              font-size: 14px;
              color: #434343;
            "
          >
            <tr>
              <td>
                <table style="width: 100%;">
                  <tr>
                    <td>
                      <img
                        alt="Wallfleur Logo"
                        src="https://wallfleur-images.s3.ap-south-1.amazonaws.com/common/Logo.png"
                        height="70px"
                      />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #000;">${date}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table
                  style="
                    margin-top: 70px;
                    padding: 92px 30px 115px;
                    background: #ffffff;
                    border-radius: 30px;
                    width: 100%;
                  "
                >
                  <tr>
                    <td>
                      <h1 style="text-align: center; margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Order Confirmation</h1>
                      <p style="margin-top: 17px; font-size: 16px; font-weight: 500;">Dear ${userData.name},</p>
                      <p
                        style="
                          margin: 0;
                          margin-top: 17px;
                          font-weight: 500;
                          letter-spacing: 0.56px;
                        "
                      >
                        Thank you for your order! Your order ID is <strong>${order.order_id}</strong> and Payment ID is <strong>${order.payment_id}</strong>.
                      </p>
                      <p
                        style="
                          margin: 0;
                          margin-top: 17px;
                          font-weight: 500;
                          letter-spacing: 0.56px;
                        "
                      >
                        We will update your order status after confirming your payment.
                      </p>
                      <p
                        style="
                          margin: 0;
                          margin-top: 60px;
                          font-size: 16px;
                          font-weight: 600;
                          letter-spacing: 1px;
                          color: #1f1f1f;
                        "
                      >
                        <strong>Order Details:</strong>
                      </p>
                      <table width="100%" cellpadding="10" cellspacing="0" border="1" style="border-collapse: collapse; background-color: #ffffff;">
                        <thead>
                          <tr>
                            <th style="text-align: left; background-color: #f1f1f1;">Product</th>
                            <th style="text-align: left; background-color: #f1f1f1;">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${products.map(product => `
                            <tr>
                              <td style="padding: 10px; text-align: left; vertical-align: middle;">
                                <img width="45px" height="45px" alt="product image" src="https://wallfleur-images.s3.ap-south-1.amazonaws.com/products/${product.image1}" style="display: inline-block; vertical-align: middle; margin-right: 10px;"/>
                                ${product.name}
                              </td>
                              <td style="padding: 10px; text-align: left; vertical-align: middle;">${product.quantity}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <p style="margin-top: 20px; font-weight: 500; text-align: left;">
                        <strong>Total Amount:</strong> ${order.currency} ${order.amount}
                      </p>
                      <p style="margin-top: 10px; font-weight: 500; text-align: left;">
                        <strong>Shipping Address:</strong>${order.customer_name}, ${order.address}, ${order.city}, ${order.state}, ${order.country}, ${order.postalCode}
                      </p>
                      <p style="margin-top: 10px; font-weight: 500; text-align: left;">
                        <strong>Status:</strong> Order Confirmed.
                      </p>
                      <p style="margin-top: 10px; font-weight: 500; text-align: left;">
                        Date of Order: ${new Date(order.ordered_date).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <p
                  style="
                    max-width: 400px;
                    margin: 90px auto 0;
                    text-align: center;
                    font-weight: 500;
                    color: #8c8c8c;
                  "
                >
                  Need help? Ask at
                  <a href="mailto:wallfleurthings@gmail.com" style="color: #499fb6; text-decoration: none;">wallfleurthings@gmail.com</a>
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <table style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
                  <tr>
                    <td>
                      <p style="margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">Wallfleur</p>
                      <p style="margin: 0; margin-top: 8px; color: #434343;">H/no.-76, Forest Colony, Dimapur, 797112, Nagaland, India.</p>
                      <div style="margin: 0; margin-top: 16px;">
                        <a href="https://www.instagram.com/wallfleurthings/?hl=en" target="_blank" style="display: inline-block; margin-left: 8px;">
                          <img
                            width="36px"
                            alt="Instagram"
                            src="https://wallfleur-images.s3.ap-south-1.amazonaws.com/common/instagram.png"
                          />
                        </a>
                      </div>
                      <p style="margin: 0; margin-top: 16px; color: #434343;">Copyright © ${new Date().getFullYear()}, Wallfleur.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
    `;
};

module.exports = { generateOrderConfirmationEmailTemplate };
