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
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background-color: #f8f9fa;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                }
                .container {
                    width: 600px;
                    height: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    border: 2px solid black;
                            box-shadow: 4px 4px 2px rgba(0, 0, 0, 1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                /* Row 1: Logo and Title */
                .row-1 {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    flex-direction: column;
                    padding: 30px 40px 20px 40px;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 10px;
                    align-self: flex-start;
                }
                .logo {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, #00d4aa, #00bfa5);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 24px;
                }
                .brand-name {
                    font-size: 28px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0;
                }
                
                /* Row 2: Email Verification Header and Content */
                .row-2 {
                    flex: 1.2;
                    padding: 0 40px;
                    text-align: left;
                }
                .verification-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0 0 16px 0;
                }
                .verification-text {
                    font-size: 16px;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.5;
                }
                
                /* Row 3: OTP Code */
                .row-3 {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 0 40px;
                }
                .otp-code {
                    font-size: 36px;
                    font-weight: 700;
                    color: #2563eb;
                    background: #eff6ff;
                    padding: 20px 40px;
                    border-radius: 12px;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                }
                
                /* Row 4: Additional Content */
                .row-4 {
                    flex: 1.3;
                    padding: 20px 40px 40px 40px;
                    text-align: left;
                }
                .expiry-text {
                    font-size: 14px;
                    color: #6b7280;
                    margin: 0 0 12px 0;
                }
                .disclaimer-text {
                    font-size: 14px;
                    color: #6b7280;
                    margin: 0 0 24px 0;
                }
                .footer-text {
                    font-size: 14px;
                    color: #9ca3af;
                    margin: 0;
                    line-height: 1.4;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Row 1: Logo and Brand -->
                <div class="row-1">
                    <div class="logo-section">
                        <div class="logo">V</div>
                        <h1 class="brand-name">Velocity</h1>
                    </div>
                </div>
                
                <!-- Row 2: Email Verification Header -->
                <div class="row-2">
                    <h2 class="verification-title">Email Verification</h2>
                    <p class="verification-text">Use the verification code below to complete your sign-up process:</p>
                </div>
                
                <!-- Row 3: OTP Code -->
                <div class="row-3">
                    <div class="otp-code">${otp}</div>
                </div>
                
                <!-- Row 4: Additional Content -->
                <div class="row-4">
                    <p class="expiry-text">This code will expire in 10 minutes.</p>
                    <p class="disclaimer-text">If you didn't request this, please ignore this email</p>
                    <p class="footer-text">Thank you,<br>Team Velocity.</p>
                </div>
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
