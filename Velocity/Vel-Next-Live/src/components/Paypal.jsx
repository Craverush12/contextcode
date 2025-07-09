import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import EventTracking from "../utils/eventTracking";
import MetaPixel from "../utils/metaPixel";

const Paypal = ({ amount, credits }) => {
  // Get userId from localStorage instead of hardcoding
  const userId = localStorage.getItem("userId");
  // Get token from localStorage instead of hardcoding
  const token = localStorage.getItem("token");

  const initialOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENTID,
    components: "buttons",
    currency: "USD",
    intent: "capture",
  };

  const styles = {
    shape: "rect",
    layout: "vertical",
    size: "responsive",
    color: "blue",
    label: "paypal",
    tagline: false,
  };

  const createOrder = async (data, actions) => {
    console.log("PayPal: Creating order", { amount, credits, userId });

    // Track payment initiation in Mixpanel
    // EventTracking.track("Payment Initiated", {
    //   payment_method: "paypal",
    //   amount: amount,
    //   credits: credits,
    //   currency: "USD",
    // });

    // // Track InitiateCheckout in Meta Pixel
    // MetaPixel.trackInitiateCheckout({
    //   value: amount,
    //   currency: "USD",
    //   content_type: "product",
    //   content_ids: ["credits_purchase"],
    //   contents: [
    //     { id: "credits", quantity: credits, item_price: amount / credits },
    //   ],
    //   num_items: 1,
    // });

    try {
      if (!amount || !credits) {
        alert("Please select a credits package before proceeding");

        // Track validation error
        EventTracking.trackError(
          "Payment Validation",
          "No credits package selected",
          {
            payment_method: "paypal",
          }
        );

        throw new Error("No credits package selected");
      }

      console.log("PayPal: Creating PayPal order directly with SDK");

      // Create PayPal order directly using PayPal SDK actions
      return actions.order
        .create({
          purchase_units: [
            {
              amount: {
                value: (amount * 0.03).toFixed(2), // Your pricing calculation
                currency_code: "USD",
              },
              description: `${credits} Credits Purchase - Velocity AI`,
              custom_id: `user_${userId}_${Date.now()}`, // Custom identifier for tracking
            },
          ],
          application_context: {
            brand_name: "Velocity AI",
            landing_page: "BILLING",
            user_action: "PAY_NOW",
            return_url: `${window.location.origin}/payment-success`,
            cancel_url: `${window.location.origin}/payment-cancel`,
          },
        })
        .then((orderId) => {
          console.log("PayPal: Order created successfully", orderId);

          // Track successful order creation
          // EventTracking.track("PayPal Order Created", {
          //   order_id: orderId,
          //   amount: amount,
          //   credits: credits,
          // });

          // Optionally notify your backend about the order creation
          // This is non-blocking and won't affect the PayPal flow
          fetch(
            `https://thinkvelocity.in/backend-V1-D/token/paypal/create-order`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paypal_order_id: orderId,
                amount: amount * 0.03,
                credits: credits,
                currency: "USD",
                user_id: userId,
              }),
            }
          ).catch((error) => {
            console.warn("Backend notification failed (non-critical):", error);
            // Don't throw here - PayPal order is already created successfully
          });

          return orderId;
        });
    } catch (error) {
      console.error("Error creating PayPal order:", error);

      // Track error
      // EventTracking.trackError("PayPal Order Creation", error.message, {
      //   amount: amount,
      //   credits: credits,
      // });

      // Show user-friendly error
      alert(`Payment initialization failed: ${error.message}`);
      throw error;
    }
  };

  const onApprove = async (data) => {
    // Track payment approval
    // EventTracking.track("Payment Approved", {
    //   payment_method: "paypal",
    //   order_id: data.orderID,
    //   amount: amount,
    //   credits: credits,
    //   currency: "USD",
    // });

    console.log(data);

    try {
      if (!data?.orderID) {
        // Track error
        EventTracking.trackError(
          "PayPal Payment Verification",
          "Order ID is required",
          {
            data: JSON.stringify(data),
          }
        );

        throw new Error("Order ID is required");
      }

      const response = await fetch(
        `https://thinkvelocity.in/backend-V1-D/token/paypal/paypal-verify-payment/${data.orderID}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();

      if (!responseData.success) {
        // Track verification failure
        // EventTracking.trackError(
        //   "PayPal Payment Verification",
        //   "Payment verification failed",
        //   {
        //     order_id: data.orderID,
        //     response: JSON.stringify(responseData),
        //   }
        // );

        throw new Error("Payment failed");
      }

      const paymentStatus = responseData.verifiedPaymentResponse.status;

      if (paymentStatus === "COMPLETED") {
        // Track payment completion in Mixpanel
        // EventTracking.track("Payment Completed", {
        //   payment_method: "paypal",
        //   order_id: data.orderID,
        //   transaction_id:
        //     responseData.verifiedPaymentResponse.id || data.orderID,
        //   amount: amount,
        //   credits: credits,
        //   currency: "USD",
        //   status: paymentStatus,
        // });

        // Track purchase in Meta Pixel
        // MetaPixel.trackPurchase({
        //   value: amount,
        //   currency: "USD",
        //   content_type: "product",
        //   content_ids: ["credits_purchase"],
        //   contents: [
        //     { id: "credits", quantity: credits, item_price: amount / credits },
        //   ],
        //   num_items: 1,
        // });

        try {
          const response = await fetch(
            `https://thinkvelocity.in/backend-V1-D/token/paypal/fetch-order-details/${userId}/${data.orderID}`
          );

          if (!response.ok) {
            // Track order details fetch error
            EventTracking.trackError(
              "PayPal Order Details",
              "Failed to fetch order details",
              {
                order_id: data.orderID,
                status_code: response.status,
              }
            );

            throw new Error("Failed to fetch order details");
          }

          // Track successful order details fetch
          // EventTracking.track("Order Details Fetched", {
          //   payment_method: "paypal",
          //   order_id: data.orderID,
          // });
        } catch (error) {
          // Track error
          // EventTracking.trackError("PayPal Order Details", error.message, {
          //   order_id: data.orderID,
          // });

          throw new Error("Failed to fetch order details", error);
        }

        window.location.reload();
      } else {
        // Track payment status not completed
        // EventTracking.trackError(
        //   "PayPal Payment Status",
        //   "Payment status not completed",
        //   {
        //     order_id: data.orderID,
        //     status: paymentStatus,
        //   }
        // );

        throw new Error("Payment failed");
      }
    } catch (error) {
      // Track verification error
      // EventTracking.trackError("PayPal Payment Verification", error.message, {
      //   order_id: data?.orderID,
      // });

      throw new Error("Failed to verify PayPal order", error);
    }
  };

  const onError = async (data, error) => {
    // Track payment error
    EventTracking.trackError(
      "PayPal Payment Error",
      error?.message || "Unknown error",
      {
        order_id: data?.orderID,
        amount: amount,
        credits: credits,
      }
    );

    try {
      if (!data?.orderID) {
        throw new Error("Order ID is missing");
      }

      const response = await fetch(
        `https://thinkvelocity.in/backend-V1-D/token/paypal/fetch-order-details/${userId}/${data.orderID}`
      );

      if (!response.ok) {
        // Track order details fetch error
        EventTracking.trackError(
          "PayPal Order Details",
          "Failed to fetch order details on error",
          {
            order_id: data.orderID,
            status_code: response.status,
          }
        );

        throw new Error("Failed to fetch order details");
      }
    } catch (fetchError) {
      // Track fetch error
      EventTracking.trackError("PayPal Order Details", fetchError.message, {
        order_id: data?.orderID,
      });

      throw new Error("Failed to fetch order details", fetchError);
    }

    throw new Error("Payment failed", error);
  };

  const onCancel = async (data) => {
    // Track payment cancellation
    EventTracking.track("Payment Cancelled", {
      payment_method: "paypal",
      order_id: data?.orderID,
      amount: amount,
      credits: credits,
      currency: "USD",
    });

    try {
      if (!data?.orderID) {
        return; // No need to fetch details if order ID is missing
      }

      const response = await fetch(
        `https://thinkvelocity.in/backend-V1-D/token/paypal/fetch-order-details/${userId}/${data.orderID}`
      );

      if (!response.ok) {
        // Track order details fetch error
        EventTracking.trackError(
          "PayPal Order Details",
          "Failed to fetch order details on cancel",
          {
            order_id: data.orderID,
            status_code: response.status,
          }
        );

        throw new Error("Failed to fetch order details");
      }

      // Track successful order details fetch
      EventTracking.track("Order Details Fetched On Cancel", {
        payment_method: "paypal",
        order_id: data.orderID,
      });
    } catch (error) {
      // Track fetch error
      EventTracking.trackError("PayPal Order Details", error.message, {
        order_id: data?.orderID,
        context: "cancel",
      });

      throw new Error("Failed to fetch order details", error);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          style={styles}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onCancel={onCancel}
          fundingSource="paypal"
        />
      </PayPalScriptProvider>
    </div>
  );
};

export default Paypal;
