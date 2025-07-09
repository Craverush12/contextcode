import React, { useEffect, useState } from "react";
import referralBg from "../assets/subtract.png"; // Updated path to correct location
import Image from "next/image";

const CouponRedeem = ({ onSuccessfulRedeem }) => {
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponAmount, setCouponAmount] = useState(0);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Move localStorage access to useEffect
  useEffect(() => {
    setAuthToken(localStorage.getItem("token"));
    setUserId(localStorage.getItem("userId"));
  }, []);

  useEffect(() => {
    let timer;
    if (message.text) {
      if (message.type === "success") {
        timer = setTimeout(() => {
          onSuccessfulRedeem();
          setMessage({ text: "", type: "" });
        }, 3000);
      } else {
        // For error and pending messages
        timer = setTimeout(() => {
          setMessage({ text: "", type: "" });
        }, 3000);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, onSuccessfulRedeem]);

  const handleChange = (e) => {
    setCouponCode(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRedeem();
    }
  };

  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      setMessage({
        text: "Please enter a coupon code",
        type: "error",
      });
      return;
    }

    const capitalizedCouponCode = couponCode.toUpperCase();
    try {
      setMessage({ text: "Redeeming coupon...", type: "pending" });

      const response = await fetch(
        `https://thinkvelocity.in/backend-V1-D/token/redeem-coupon`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ couponCode: capitalizedCouponCode, userId }),
        }
      );
      const data = await response.json();
      console.log("coupon data", data);

      if (data.success) {
        setMessage({
          text: `Coupon redeemed! Credited ${data.amount} credits`,
          type: "success",
        });
        setCouponCode("");
        setCouponAmount(data.amount);
      } else {
        setMessage({
          text: data.message || "Invalid coupon code. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "Error redeeming coupon. Please try again later.",
        type: "error",
      });
    }
  };

  return (
    <div
      className="w-full font-[Amenti] rounded-3xl p-6 relative overflow-hidden"
      style={{
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Image
        src={"https://thinkvelocity.in/next-assets/subtractR.png"}
        alt="Background"
        className="absolute inset-0 w-full h-full  "
        width={24}
        height={24}
      />

      {/* Header Section */}
      <div className="text-center mb-3 sm:mb-4 relative z-10">
        {/* SVG Icon - Only show on desktop */}
        <svg
          width="28"
          height="25"
          viewBox="0 0 26 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-2 hidden sm:block"
        >
          <path
            d="M24 7.00175H19.615C19.6637 6.96049 19.7137 6.9205 19.7612 6.87675C20.1409 6.53947 20.4468 6.12748 20.66 5.66656C20.8731 5.20564 20.9889 4.70569 21 4.198C21.0164 3.64259 20.9191 3.08968 20.7142 2.57323C20.5092 2.05677 20.2008 1.58766 19.8079 1.1947C19.4151 0.801739 18.9461 0.493215 18.4297 0.288071C17.9133 0.0829262 17.3604 -0.0145095 16.805 0.00174518C16.2971 0.012685 15.7969 0.128351 15.3358 0.341504C14.8746 0.554656 14.4624 0.860706 14.125 1.2405C13.6581 1.78161 13.2785 2.3923 13 3.0505C12.7215 2.3923 12.3419 1.78161 11.875 1.2405C11.5376 0.860706 11.1254 0.554656 10.6642 0.341504C10.2031 0.128351 9.70291 0.012685 9.195 0.00174518C8.63959 -0.0145095 8.08671 0.0829262 7.57032 0.288071C7.05392 0.493215 6.58491 0.801739 6.19206 1.1947C5.79922 1.58766 5.49083 2.05677 5.28584 2.57323C5.08085 3.08968 4.98358 3.64259 5 4.198C5.01111 4.70569 5.12686 5.20564 5.34001 5.66656C5.55315 6.12748 5.85911 6.53947 6.23875 6.87675C6.28625 6.918 6.33625 6.958 6.385 7.00175H2C1.46957 7.00175 0.960859 7.21246 0.585786 7.58753C0.210714 7.9626 0 8.47131 0 9.00175V13.0017C0 13.5322 0.210714 14.0409 0.585786 14.416C0.960859 14.791 1.46957 15.0017 2 15.0017V23.0017C2 23.5322 2.21071 24.0409 2.58579 24.416C2.96086 24.791 3.46957 25.0017 4 25.0017H22C22.5304 25.0017 23.0391 24.791 23.4142 24.416C23.7893 24.0409 24 23.5322 24 23.0017V15.0017C24.5304 15.0017 25.0391 14.791 25.4142 14.416C25.7893 14.0409 26 13.5322 26 13.0017V9.00175C26 8.47131 25.7893 7.9626 25.4142 7.58753C25.0391 7.21246 24.5304 7.00175 24 7.00175ZM15.625 2.5655C15.7833 2.39065 15.9761 2.25042 16.1912 2.15362C16.4063 2.05682 16.6391 2.00554 16.875 2.003H16.9363C17.2127 2.00472 17.486 2.06161 17.7402 2.17033C17.9944 2.27905 18.2244 2.43742 18.4166 2.63614C18.6088 2.83486 18.7594 3.06995 18.8596 3.32763C18.9597 3.5853 19.0075 3.86038 19 4.13675C18.9975 4.37262 18.9462 4.60542 18.8494 4.82053C18.7526 5.03564 18.6123 5.22841 18.4375 5.38675C17.2512 6.43675 15.2825 6.80675 14.0625 6.93675C14.2125 5.613 14.625 3.68924 15.625 2.5655ZM7.61375 2.6105C8.00118 2.22311 8.52588 2.00433 9.07375 2.00175H9.135C9.37087 2.00429 9.60367 2.05557 9.81878 2.15237C10.0339 2.24917 10.2267 2.3894 10.385 2.56425C11.4338 3.74925 11.8038 5.71424 11.9338 6.92924C10.7188 6.80424 8.75375 6.42924 7.56875 5.3805C7.3939 5.22216 7.25367 5.02939 7.15687 4.81428C7.0608 4.59917 7.00879 4.36637 7.00625 4.1305C6.9985 3.84954 7.0479 3.56994 7.15147 3.30865C7.25504 3.04736 7.41061 2.80984 7.60875 2.6105H7.61375ZM2 9.00175H12V13.0017H2V9.00175ZM4 15.0017H12V23.0017H4V15.0017ZM22 23.0017H14V15.0017H22V23.0017ZM24 13.0017H14V9.00175H24V13.0017Z"
            fill="#008ACB"
          />
        </svg>
        <h2
          className="text-xl sm:text-2xl text-black font-dm-sans"
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          Redeem your Prize
        </h2>
      </div>

      {/* Input and Button Section */}
      <div className="bg-black/30 p-3 rounded-xl flex items-center justify-between gap-2 sm:gap-4 mb-2 z-10">
        <input
          type="text"
          name="redeemcode"
          id="redeemcode"
          className=" text-center flex-1 bg-transparent text-black placeholder:text-[#999999] focus:outline-none text-sm sm:text-base z-10"
          style={{
            border: "2px solid #000000",
            borderRadius: "5px",
            height: "40px",
          }}
          placeholder="Enter Coupon Code"
          value={couponCode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-[#00C8F0] font-dm-sans hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none text-black font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-full transition-all duration-200 text-sm sm:text-base whitespace-nowrap z-10"
          onClick={handleRedeem}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
          }}
          style={{
            color: "#152A32",
            fontWeight: "600",
            border: "2px solid #000000",
            boxShadow: "2px 2px 1px rgb(0, 0, 0)",
          }}
        >
          Redeem
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div
          className={`mt-2 p-2 rounded-lg text-center relative z-10 font-dm-sans ${
            message.type === "success"
              ? "bg-green-100"
              : message.type === "error"
              ? "bg-red-100 "
              : "bg-blue-100 "
          }`}
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          <p
            className={`text-xs sm:text-sm font-medium ${
              message.type === "success"
                ? "text-green-700"
                : message.type === "error"
                ? "text-red-700"
                : "text-blue-700"
            }`}
          >
            {message.text}
            {message.type === "success" && <span className="ml-1">🎉</span>}
            {message.type === "error" && <span className="ml-1">❌</span>}
          </p>
        </div>
      )}
    </div>
  );
};

export default CouponRedeem;
