// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs

import dotenv from "dotenv";
dotenv.config();
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const msg = {
  to: "vishwakarmaanurag2202@gmail.com",
  from: "anurag@toteminteractive.in",
  subject: "Sending with SendGrid is Fun",
  html: "<strong>Testing Sendgrid Email</strong>",
};
sgMail
  .send(msg)
  .then(() => {
    console.log("Email sent");
  })
  .catch((error) => {
    console.error(error);
  });
