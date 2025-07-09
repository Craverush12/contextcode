import express from "express";
import { redeemCoupon } from "../controllers/tokenControllers/couponController.js";
import { verifyAuthToken } from "../middlewares/auth.js";
import {
  apiLimiter,
  fetchLimiter,
  jwtBasedLimiter,
} from "../middlewares/rateLimit.js";
import {
  fetchTokens,
  updateUserTokens,
  deductTokens,
  fetchAllCredits,
} from "../controllers/tokenControllers/tokenController.js";
import {
  razorpayCreateOrder,
  razorpayVerifyPayment,
  fetchRazorpayOrderDetailsAndEmail,
  paypalCreateOrder,
  paypalVerifyPayment,
  fetchPaypalOrderDetailsAndEmail,
  cashfreeCreateOrder,
  fetchCashfreeOrderDetailsAndEmail,
  phonepeCreateOrder,
} from "../controllers/tokenControllers/tokenPaymentController.js";

const tokenRoutes = express.Router();

//fetch tokens
tokenRoutes.get("/fetch-tokens/:id", fetchTokens);

//fetch credits
tokenRoutes.get("/fetch-credits", fetchAllCredits);

//update tokens
tokenRoutes.put(
  "/update-tokens",
  verifyAuthToken,
  jwtBasedLimiter,
  updateUserTokens
);
tokenRoutes.put("/deduct-tokens", verifyAuthToken, deductTokens);

//redeem coupon
tokenRoutes.post("/redeem-coupon", redeemCoupon);

//razorpay payment routes
tokenRoutes.post(
  "/razorpay/create-order",
  verifyAuthToken,
  razorpayCreateOrder
);
tokenRoutes.post(
  "/razorpay/verify-payment",
  verifyAuthToken,
  razorpayVerifyPayment
);
tokenRoutes.post(
  "/razorpay/fetch-order-details/:userId",
  verifyAuthToken,
  fetchRazorpayOrderDetailsAndEmail
);

//paypal payment routes
tokenRoutes.post("/paypal/create-order", verifyAuthToken, paypalCreateOrder);
tokenRoutes.post(
  "/paypal/verify-payment/:paymentId",
  verifyAuthToken,
  paypalVerifyPayment
);
tokenRoutes.post(
  "/paypal/fetch-order-details/:userId/:paymentId",
  verifyAuthToken,
  fetchPaypalOrderDetailsAndEmail
);

//cashfree payment routes
tokenRoutes.post(
  "/cashfree/create-order",
  verifyAuthToken,
  cashfreeCreateOrder
);
tokenRoutes.post(
  "/cashfree/cashfree-order-details/:userId",
  verifyAuthToken,
  fetchCashfreeOrderDetailsAndEmail
);

//phonepe payment routes
tokenRoutes.post("/phonepe/create-order", verifyAuthToken, phonepeCreateOrder);

export default tokenRoutes;
