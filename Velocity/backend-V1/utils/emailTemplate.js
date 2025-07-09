export const emailVerificationTemplate = (otp) => {
  return `
   <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                }
                h1 {
                    color: #333;
                }
                p {
                    font-size: 16px;
                    color: #555;
                }
                .otp {
                    font-size: 24px;
                    font-weight: bold;
                    color: #007bff;
                    background: #f0f8ff;
                    padding: 10px 20px;
                    display: inline-block;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Email Verification</h1>
                <p>Use the verification code below to complete your sign-up process:</p>
                <div class="otp">${otp}</div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p class="footer">Thank you,<br>Think Velocity</p>
            </div>
        </body>
        </html>
  `;
};

export const passwordResetTemplate = (resetLink) => {
  return `
   <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                }
                h1 {
                    color: #333;
                }
                p {
                    font-size: 16px;
                    color: #555;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .link {
                    word-break: break-all;
                    color: #007bff;
                    margin: 15px 0;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Password Reset</h1>
                <p>You requested to reset your password. Click the button below to create a new password:</p>
                <a href="${resetLink}" class="button">Reset Password</a>
                <p>Or copy and paste this link in your browser:</p>
                <p class="link">${resetLink}</p>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p class="footer">Thank you,<br>Think Velocity</p>
            </div>
        </body>
        </html>
  `;
};
