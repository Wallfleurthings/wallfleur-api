const generateThankYouEmailTemplate = (date) => `
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
            text-align: center;
            width: 100%;
          "
        >
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Thank You for Subscribing!</h1>
              <p style="margin-top: 17px; font-size: 16px; font-weight: 500;">Hello,</p>
              <p
                style="
                  margin: 0;
                  margin-top: 17px;
                  font-weight: 500;
                  letter-spacing: 0.56px;
                "
              >
                Thank you for subscribing to our newsletter! We're excited to have you on board. Stay tuned for updates and special offers from Wallfleur.
              </p>
              <p
                style="
                  margin: 0;
                  margin-top: 60px;
                  font-size: 16px;
                  font-weight: 500;
                "
              >
                If you have any questions, feel free to reach out to us at 
                <a href="mailto:wallfleurthings@gmail.com" style="color: #ba3d4f; text-decoration: none;">wallfleurthings@gmail.com</a>.
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
              <p style="margin: 0; margin-top: 16px; color: #434343;">Copyright © 2021, Wallfleur.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

module.exports = { generateThankYouEmailTemplate };
