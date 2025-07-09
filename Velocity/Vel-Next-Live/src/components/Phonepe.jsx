import React from "react";

const Phonepe = ({ amount, credits }) => {
  const userId = localStorage.getItem("userId");
  // Get token from localStorage instead of hardcoding
  const token = localStorage.getItem("token");

  const handleClick = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/token/phonepe/create-order",
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
          }),
        }
      );

      // console.log("PhonePe response:", response);

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const data = await response.json();
      // console.log("PhonePe response data:", data);

      // Redirect to PhonePe checkout URL if successful
      if (!data.success) {
        throw new Error("Failed to create order");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Error creating PhonePe order:", error);
    }
  };

  return (
    <div className="text-white w-full">
      <button
        className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full py-2 rounded-lg text-white text-center font-semibold"
        style={{
          backgroundColor: "#00C8F0",
          boxShadow: "2px 2px 1px rgb(0, 0, 0)",
          borderRadius: "10px",
          border: "2px solid #000000",
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
        }}
      >
        Pay with PhonePe
      </button>
    </div>
  );
};

export default Phonepe;
