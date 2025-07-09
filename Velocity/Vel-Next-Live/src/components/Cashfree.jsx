import React, { useEffect, useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

const Cashfree = ({ amount, credits, customer_phone }) => {
  const [cashfree, setCashfree] = useState(null);
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token"); // Replace with your actual toke

  useEffect(() => {
    const initializeSDK = async () => {
      const cashfreeInstance = await load({
        mode: "production",
      });
      setCashfree(cashfreeInstance);
    };

    initializeSDK();
  }, []);

  const fetchOrderDetails = async (orderId) => {
    try {
      const orderDetailsResponse = await fetch(
        `https://thinkvelocity.in/backend-V1-D/token/cashfree/cashfree-order-details/${userId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: orderId }),
        }
      );

      if (!orderDetailsResponse.ok) {
        throw new Error("Failed to fetch order details");
      }

      const orderData = await orderDetailsResponse.json();
      // console.log("Order details and email sent:", orderData);
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const handleClick = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/token/cashfree/create-order",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currency: "INR",
            amount: amount,
            credits: credits,
            customer_phone: customer_phone,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to create order");
      }
      const data = await response.json();
      let checkoutOptions = {
        paymentSessionId: data.data.payment_session_id,
        redirectTarget: "_modal",
      };
      // console.log("cashfree checkout options:", checkoutOptions);

      cashfree
        .checkout(checkoutOptions)
        .then(async (res) => {
          // console.log(res);
          fetchOrderDetails(data.orderId);
        })
        .catch((error) => {
          fetchOrderDetails(data.orderId);
          throw error;
        });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="text-white pl-10">
      <button
        className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full py-2 rounded-lg text-white text-center font-semibold"
        onClick={handleClick}
        style={{
          backgroundColor: "#00C8F0",
          boxShadow: "2px 2px 1px rgb(0, 0, 0)",
          borderRadius: "10px",
          border: "2px solid #000000",
        }}
      >
        Pay with Cashfree
      </button>
    </div>
  );
};

export default Cashfree;
