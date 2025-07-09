// To install phonepe-pg-sdk-node RUN ->
// npm i https://phonepe.mycloudrepo.io/public/repositories/phonepe-pg-sdk-node/releases/v2/phonepe-pg-sdk-node.tgz

import Razorpay from "razorpay";
import crypto, { randomUUID } from "crypto";
import dotenv from "dotenv";
dotenv.config();
import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
} from "pg-sdk-node";
import {
  sendPaypalPaymentSuccessEmail,
  sendPaypalPaymentFailureEmail,
  sendRazorpayPaymentSuccessEmail,
  sendRazorpayPaymentFailureEmail,
  sendCashfreePaymentSuccessEmail,
  sendCashfreePaymentFailureEmail,
} from "./paymentEmailController.js";
import { logger } from "../../utils/winstonLogger.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paypalClient = process.env.PAYPAL_CLIENT_ID;
const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;

const CF_API_VERSION = process.env.CASHFREE_API_VERSION;
const CF_KEY_ID = process.env.CASHFREE_KEY_ID;
const CF_KEY_SECRET = process.env.CASHFREE_KEY_SECRET;

const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = Number(process.env.PHONEPE_CLIENT_VERSION);
const phonepeEnv = Env.PRODUCTION;

const phonepeClient = StandardCheckoutClient.getInstance(
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,
  phonepeEnv
);

export const razorpayCreateOrder = async (req, res) => {
  const { amount, currency } = req.body;
  logger.info(
    `Creating Razorpay order: amount=${amount}, currency=${currency}`
  );
  try {
    const options = {
      amount: amount,
      currency: currency,
      receipt: "order_" + Date.now(),
    };

    logger.info(`Razorpay options: ${JSON.stringify(options)}`);

    const order = await razorpay.orders.create(options);
    logger.info(
      `Razorpay order created successfully of Currency : ${currency} and Amount : ${amount}`
    );
    res.json({
      success: true,
      message: "Razorpay order created successfully",
      order,
    });
  } catch (error) {
    logger.error(`Error creating Razorpay order: ${error}`);
    res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};

export const razorpayVerifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (expectedSignature === razorpay_signature) {
      logger.info("Razorpay payment verified successfully");
      res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      logger.warn("Razorpay payment verification failed : Invalid signature");
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    logger.error(`Error verifying razorpay payment ; Error : ${error}`);
    res
      .status(500)
      .json({ message: "Error verifying payment", error: error.message });
  }
};

export const fetchRazorpayOrderDetailsAndEmail = async (req, res) => {
  const { userId } = req.params;
  const { orderId, paymentId } = req.body;
  logger.info(
    `Fetching Razorpay order details: userId=${userId}, orderId=${orderId}, paymentId=${paymentId}`
  );

  try {
    if (!paymentId && !orderId) {
      logger.warn(
        "At least one of Payment ID or Order ID is required for Razorpay fetch."
      );
      return res.status(400).json({
        success: false,
        message: "At least one of Payment ID or Order ID is required",
      });
    }

    let payment = null;
    let order = null;

    if (paymentId) {
      payment = await razorpay.payments.fetch(paymentId);
    }

    if (orderId) {
      order = await razorpay.orders.fetch(orderId);
    }

    const orderDetails = {
      paymentGateway: "Razorpay",
      DBuserId: userId,
    };

    if (payment) {
      if (
        payment.status === "paid" ||
        payment.status === "captured" ||
        payment.status === "success"
      ) {
        await sendRazorpayPaymentSuccessEmail(payment, orderDetails);
      } else {
        await sendRazorpayPaymentFailureEmail(payment, orderDetails);
      }
    } else if (order) {
      if (
        order.status === "paid" ||
        order.status === "captured" ||
        order.status === "success"
      ) {
        await sendRazorpayPaymentSuccessEmail(order, orderDetails);
      } else if (order.status === "created") {
        await sendRazorpayPaymentSuccessEmail(order, orderDetails);
      } else {
        await sendRazorpayPaymentFailureEmail(order, orderDetails);
      }
    }

    logger.info(`Razorpay order details fetched successfully`);
    res.json({
      success: true,
      message: "Razorpay order details fetched successfully",
      payment,
      order,
    });
  } catch (error) {
    logger.error(`Error fetching Razorpay order details: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error fetching Razorpay order details",
      error: error.message,
    });
  }
};

export const getPaypalAccessToken = async () => {
  // Create base64 encoded credentials
  const credentials = Buffer.from(`${paypalClient}:${paypalSecret}`).toString(
    "base64"
  );
  try {
    const response = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
      {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      logger.warn("Paypal access token creation failed : PayPal API error");
      throw new Error(`PayPal API error: ${JSON.stringify(data)}`);
    }

    return data.access_token;
    // res.json(
    //   success: true,
    //   message: "Paypal access token created successfully",
    //   accessToken: data.access_token,
    // });
  } catch (error) {
    logger.error(
      `Error creating PayPal access token; PayPal API error: ${error}`
    );
    throw new Error(`PayPal API error: ${JSON.stringify(error)}`);
  }
};

export const paypalCreateOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    logger.info(`Paypal create order: amount=${amount}, currency=${currency}`);

    const accessToken = await getPaypalAccessToken();
    // console.log("paypal access token:", accessToken);

    if (!amount || amount <= 0) {
      logger.warn("Paypal create order failed: Invalid Amount");
      return res.status(400).json({
        success: false,
        message: "Invalid Amount",
      });
    }

    let paypalOrder = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
            breakdown: {
              item_total: {
                currency_code: currency,
                value: amount,
              },
            },
          },
          // lookup item details in `cart` from database
          items: [
            {
              name: "Tokens",
              description: "Velocity Tokens",
              unit_amount: {
                currency_code: currency,
                value: amount,
              },
              quantity: "1",
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          application_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            payment_method_selected: "PAYPAL",
            brand_name: "ThinkVelocity",
            shipping_preference: "NO_SHIPPING",
            locale: "en-US",
            user_action: "PAY_NOW",
            return_url: `https://thinkvelocity.in/profile`,
            cancel_url: `https://thinkvelocity.in/profile`,
            // return_url: `http://localhost:3000/profile`,
            // cancel_url: `http://localhost:3000/profile`,
          },
        },
      },
    };

    try {
      const response = await fetch(
        `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(paypalOrder),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`PayPal API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      // logger.info(`Paypal order response: ${JSON.stringify(data)}`);

      logger.info(`Paypal order created successfully`);
      res.json({
        success: true,
        message: "Paypal order created successfully",
        orderId: data.id,
        data,
      });
    } catch (error) {
      logger.error(`Error creating PayPal order: ${error}`);
      res.status(500).json({
        success: false,
        message: "Paypal order not created",
        error: error.message,
      });
    }
  } catch (error) {
    logger.error(`Error creating PayPal order: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error creating PayPal order",
      error: error.message,
    });
  }
};

export const paypalVerifyPayment = async (req, res) => {
  try {
    const accessToken = await getPaypalAccessToken();
    // console.log("paypal verify payment access token:" + accessToken);

    const { paymentId } = req.params;
    logger.info(`Paypal verify paymentId: ${paymentId}`);

    if (!paymentId) {
      logger.warn("Paypal verify payment failed: Payment ID is required.");
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const captureResponse = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${paymentId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          Prefer: "return=representation",
        },
      }
    );

    const captureData = await captureResponse.json();
    // console.log("captureData:", captureData);

    if (!captureResponse.ok) {
      logger.error(`PayPal capture Failed `);
      return res.status(captureResponse.status).json({
        success: false,
        message: "PayPal Capture failed",
        error: captureData,
      });
    }

    logger.info(`Paypal captured successfully`);

    res.json({
      success: true,
      message: "Paypal payment verified successfully",
      verifiedPaymentResponse: captureData,
    });
  } catch (error) {
    logger.error(`Error verifying PayPal payment: ${error}`);
    res.status(500).json({
      message: "Error verifying PayPal payment",
      error: error.message,
    });
  }
};

export const fetchPaypalOrderDetailsAndEmail = async (req, res) => {
  const userId = req.params.userId;
  logger.info(`Fetching Paypal order details: userId=${userId}`);
  const { paymentId } = req.params;
  logger.info(`Paypal paymentId: ${paymentId}`);
  const accessToken = await getPaypalAccessToken();
  try {
    if (!paymentId) {
      logger.warn("Paypal fetch order failed: Payment ID is required.");
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const fetchOrderResponse = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const orderData = await fetchOrderResponse.json();

    if (!fetchOrderResponse.ok) {
      return res.status(fetchOrderResponse.status).json({
        success: false,
        message: "Paypal order not found",
      });
    }

    const orderDetails = {
      paymentGateway: "Paypal",
      orderId: orderData.id || "N/A",
      status: orderData.status || "N/A",
      createdAt: orderData.create_time || "N/A",
      DBuserId: userId,
      userFirstName:
        orderData.payer?.name?.given_name ||
        orderData.payment_source?.paypal?.name?.given_name ||
        "N/A",
      userLastName:
        orderData.payer?.name?.surname ||
        orderData.payment_source?.paypal?.name?.surname ||
        "N/A",
      userEmail:
        orderData.payer?.email_address ||
        orderData.payment_source?.paypal?.email_address ||
        "N/A",
      currency: orderData.purchase_units?.[0]?.amount?.currency_code || "N/A",
      amount: orderData.purchase_units?.[0]?.amount?.value || "N/A",
      countryCode:
        orderData.payment_source?.paypal?.address?.country_code ||
        orderData.payer?.address?.country_code ||
        "N/A",
    };

    const paymentStatus = orderData.status;

    if (paymentStatus === "COMPLETED") {
      await sendPaypalPaymentSuccessEmail(orderData, orderDetails);
    } else if (paymentStatus === "APPROVED") {
      await sendPaypalPaymentSuccessEmail(orderData, orderDetails);
    } else {
      await sendPaypalPaymentFailureEmail(orderData, orderDetails);
    }

    logger.info("Paypal order details fetched successfully");
    res.json({
      success: true,
      message: "Paypal order details fetched successfully",
      orderData,
      orderDetails,
    });
  } catch (error) {
    logger.error(`Error fetching PayPal order: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error fetching PayPal order",
      error: error.message,
    });
  }
};

export const generateOrderId = async () => {
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(uniqueId);
  const orderId = hash.digest("hex");
  return orderId.substring(0, 12);
};

export const cashfreeCreateOrder = async (req, res) => {
  try {
    const { amount, currency, credits, customer_phone } = req.body;
    logger.info(
      `Cashfree create order: amount=${amount}, currency=${currency}`
    );

    if (!amount || amount <= 0) {
      logger.warn("Cashfree create order failed: Invalid Amount.");
      return res.status(400).json({
        success: false,
        message: "Invalid Amount",
      });
    }
    const orderId = await generateOrderId();
    logger.info(`Generated Cashfree order id: ${orderId}`);

    let order = {
      order_id: orderId,
      order_currency: currency,
      order_amount: amount,
      customer_details: {
        customer_id: "cust_" + orderId,
        customer_phone: customer_phone,
      },
      order_meta: {
        return_url: "https://thinkvelocity.in/profile",
      },
    };
    // console.log("cashfree order:", order);

    try {
      const options = {
        method: "POST",
        headers: {
          "x-api-version": CF_API_VERSION,
          "x-client-id": CF_KEY_ID,
          "x-client-secret": CF_KEY_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      };

      const response = await fetch(
        `${process.env.CASHFREE_BASE_URL}/pg/orders`,
        options
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cashfree API error: ${JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      // console.log("cashfree order response:", data);
      logger.info("Cashfree order created successfully");
      res.json({
        success: true,
        message: "Cashfree order created successfully",
        orderId,
        data,
      });
    } catch (error) {
      logger.error(`Error creating Cashfree order: ${error}`);
      res.status(500).json({
        message: "Error creating Cashfree order",
        error: error.message,
      });
    }
  } catch (error) {
    logger.error(`Error creating Cashfree order: ${error}`);
    res.status(500).json({
      message: "Error creating Cashfree order",
      error: error.message,
    });
  }
};

export const fetchCashfreeOrderDetailsAndEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { orderId } = req.body;

    if (!orderId) {
      logger.warn("Cashfree fetch order failed: Order ID is required.");
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const options = {
      method: "GET",
      headers: {
        "x-api-version": CF_API_VERSION,
        "x-client-id": CF_KEY_ID,
        "x-client-secret": CF_KEY_SECRET,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}`,
      options
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cashfree API error: ${JSON.stringify(errorData)}`);
    }

    const orderData = await response.json();

    const orderDetails = {
      paymentGateway: "Cashfree",
      orderId: orderData.order_id || "N/A",
      status: orderData.order_status || "N/A",
      createdAt: orderData.created_at || "N/A",
      DBuserId: userId,
      userFirstName:
        orderData.customer_details?.customer_name?.split(" ")[0] || "N/A",
      userLastName:
        orderData.customer_details?.customer_name?.split(" ")[1] || "N/A",
      userEmail: orderData.customer_details?.customer_email || "N/A",
      currency: orderData.order_currency || "INR",
      amount: orderData.order_amount || "N/A",
      countryCode: "IN",
    };

    if (orderData.order_status === "PAID") {
      await sendCashfreePaymentSuccessEmail(orderData, orderDetails);
    } else if (orderData.order_status === "ACTIVE") {
      // For active orders, we can consider them as pending/in progress
      await sendCashfreePaymentFailureEmail(orderData, orderDetails);
    } else {
      await sendCashfreePaymentFailureEmail(orderData, orderDetails);
    }

    res.json({
      success: true,
      message: "Cashfree order details fetched successfully",
      orderData,
      orderDetails,
    });
  } catch (error) {
    logger.error(`Error fetching Cashfree order details: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error fetching Cashfree order details",
      error: error.message,
    });
  }
};

export const phonepeCreateOrder = async (req, res) => {
  const { amount, currency, credits } = req.body;
  try {
    logger.info(`Phonepe create order: amount=${amount}, currency=${currency}`);

    if (!amount || amount <= 0) {
      logger.warn(
        "Phonepe create order failed: Amount must be a positive number."
      );
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    const amountInRupees = amount * 100;

    const merchantOrderId = randomUUID();
    // const redirectUrl = `http://localhost:5173/profile?merchantOrderId=${merchantOrderId}`;
    const redirectUrl = `https://thinkvelocity.in/profile`;

    const phonepeRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInRupees)
      .redirectUrl(redirectUrl)
      .build();

    const phonepeResponse = await phonepeClient.pay(phonepeRequest);

    logger.info("Phonepe order created successfully");
    res.json({
      success: true,
      message: "Phonepe order created successfully",
      checkoutUrl: phonepeResponse.redirectUrl,
      merchantOrderId,
    });
  } catch (error) {
    logger.error(`Error creating Phonepe order: ${error}`);
    res.status(500).json({
      message: "Error creating Phonepe order",
      error: error.message,
    });
  }
};
