import sgMail from "@sendgrid/mail";
import db from "../../config/postgresDB.js";
import { findUserById } from "../../models/userModel.js";
import dotenv from "dotenv";
import { logger } from "../../utils/winstonLogger.js";
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendPaypalPaymentSuccessEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const {
    paymentGateway,
    orderId,
    status,
    createdAt,
    DBuserId,
    userFirstName,
    userLastName,
    userEmail,
    currency,
    amount,
    countryCode,
  } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Paypal payment success: userDetails=${JSON.stringify(userDetails)}`
  );

  try {
    const mailOptions = {
      from: userEmail,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment ${status}`,
      html: `
          <h1>${paymentGateway} Payment ${status}</h1>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>
          <p><strong>Customer:</strong> ${userFirstName} ${userLastName}</p>
          <p><strong>Customer Email:</strong> ${userEmail}</p>
          <p><strong>Customer DB Name:</strong> ${name}</p>
          <p><strong>Customer DB Email:</strong> ${email}</p>
          <p><strong>Country Code:</strong> ${countryCode}</p>
          <p><strong>Amount:</strong> ${currency} ${amount}</p>
          <p><strong>Order Status:</strong> ${status}</p>
          <p><strong>Order Created At:</strong> ${createdAt}</p>
          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Success Email sent successfully`);
  } catch (error) {
    logger.error(
      `Error sending ${paymentGateway} payment success email: ${error}`
    );
  }
};

export const sendPaypalPaymentFailureEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const { paymentGateway, DBuserId } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Paypal payment failure: userDetails=${JSON.stringify(userDetails)}`
  );

  try {
    const mailOptions = {
      from: email || process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment Failed`,
      html: `
          <h1>${paymentGateway} Payment Failed</h1>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>

          <p><strong>DB Customer Name:</strong> ${name}</p>
          <p><strong>DB Customer Email:</strong> ${email}</p>
        
          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Failure Email sent successfully`);
  } catch (error) {
    logger.error(`Error sending payment failure email: ${error}`);
  }
};

export const sendRazorpayPaymentSuccessEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const { paymentGateway, DBuserId } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Razorpay payment success: userDetails=${JSON.stringify(userDetails)}`
  );

  const userEmail = orderData.email ? orderData.email : email;

  try {
    const mailOptions = {
      from: userEmail || process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment ${orderData.status}`,
      html: `
          <h1>${paymentGateway} Payment ${orderData.status}</h1>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>

          <p><strong>DB Customer Name:</strong> ${name}</p>
          <p><strong>DB Customer Email:</strong> ${email}</p>

          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Success Email sent successfully`);
  } catch (error) {
    logger.error(`Error sending payment failure email: ${error}`);
  }
};

export const sendRazorpayPaymentFailureEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const { paymentGateway, DBuserId } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Razorpay payment failure: userDetails=${JSON.stringify(userDetails)}`
  );

  const userEmail = orderData?.email ? orderData.email : email;

  try {
    const mailOptions = {
      from: userEmail || process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment ${
        orderData.status ? orderData.status : "Failed"
      }`,
      html: `
          <h1>${paymentGateway} Payment ${
        orderData.status ? orderData.status : "Failed"
      }</h1>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>

          <p><strong>DB Customer Name:</strong> ${name}</p>
          <p><strong>DB Customer Email:</strong> ${email}</p>

          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Failure Email sent successfully`);
  } catch (error) {
    logger.error(`Error sending payment failure email: ${error}`);
  }
};

export const sendCashfreePaymentSuccessEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const { paymentGateway, DBuserId } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Cashfree payment success: userDetails=${JSON.stringify(userDetails)}`
  );

  const userEmail = orderData.customer_details?.customer_email || email;

  try {
    const mailOptions = {
      from: userEmail || process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment ${
        orderData.order_status || "Success"
      }`,
      html: `
          <h1>${paymentGateway} Payment ${
        orderData.order_status || "Success"
      }</h1>
          <p><strong>Order ID:</strong> ${orderData.order_id || "N/A"}</p>
          <p><strong>CF Order ID:</strong> ${orderData.cf_order_id || "N/A"}</p>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>
          <p><strong>Customer Name:</strong> ${
            orderData.customer_details?.customer_name || "N/A"
          }</p>
          <p><strong>Customer Email:</strong> ${userEmail}</p>
          <p><strong>Customer Phone:</strong> ${
            orderData.customer_details?.customer_phone || "N/A"
          }</p>
          <p><strong>Customer DB Name:</strong> ${name}</p>
          <p><strong>Customer DB Email:</strong> ${email}</p>
          <p><strong>Amount:</strong> ${orderData.order_currency || "INR"} ${
        orderData.order_amount || "N/A"
      }</p>
          <p><strong>Order Status:</strong> ${
            orderData.order_status || "N/A"
          }</p>
          <p><strong>Order Created At:</strong> ${
            orderData.created_at || "N/A"
          }</p>
          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Success Email sent successfully`);
  } catch (error) {
    logger.error(
      `Error sending ${paymentGateway} payment success email: ${error}`
    );
  }
};

export const sendCashfreePaymentFailureEmail = async (
  orderData,
  orderDetails
) => {
  const client = await db.connect();

  const { paymentGateway, DBuserId } = orderDetails;

  const userDetails = await findUserById(DBuserId, "usertable");
  const { name, email } = userDetails;
  logger.info(
    `Cashfree payment failure: userDetails=${JSON.stringify(userDetails)}`
  );

  const userEmail = orderData.customer_details?.customer_email || email;

  try {
    const mailOptions = {
      from: userEmail || process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: `${paymentGateway} Payment Failed/Not verified`,
      html: `
          <h1>${paymentGateway} Payment Failed/Notverified</h1>
          <p><strong>Order ID:</strong> ${orderData.order_id || "N/A"}</p>
          <p><strong>CF Order ID:</strong> ${orderData.cf_order_id || "N/A"}</p>
          <p><strong>Payment Gateway:</strong> ${paymentGateway}</p>
          <p><strong>Customer DB Name:</strong> ${name}</p>
          <p><strong>Customer DB Email:</strong> ${email}</p>
          <h2>Complete Order Details:</h2>
          <pre>${JSON.stringify(orderData, null, 2)}</pre>
        `,
    };

    await sgMail.send(mailOptions);
    logger.info(`${paymentGateway} Failure Email sent successfully`);
  } catch (error) {
    logger.error(
      `Error sending ${paymentGateway} payment failure email: ${error}`
    );
  }
};
