import React, { useState, useEffect } from "react";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Analytics from "../../config/analytics";
import PromptGrid from "../PromptGrid";
import BuyCredit from "../Buy_credit";
import ShareReferral from "../ShareReferral";
import CouponRedeem from "../CouponRedeem";
import NavbarOut from "../layout/NavbarOut";
import Image from "next/image";
import LLMOption from "../LLMoption";

const ProfilePage = ({ pricingRef }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const BaseUrl = "https://thinkvelocity.in/backend-V1-D"
    process.env.NEXT_PUBLIC_BASE_URL || "https://thinkvelocity.in/backend-V1-D";
  // State variables
  // const [isPremium, setIsPremium] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState({ amount: 0, credits: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPromptGrid, setShowPromptGrid] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Client-side only code
  const [userId, setUserId] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Add new state variables for profile section
  const [name, setName] = useState("User");
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Set mounted state to true once the component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize client-side values
  useEffect(() => {
    try {
      // Only access localStorage on the client side
      const storedUserId = localStorage.getItem("userId");
      const storedToken = localStorage.getItem("token");

      // console.log(
      //   "Retrieved from localStorage - userId:",
      //   storedUserId ? "present" : "missing"
      // );
      // console.log(
      //   "Retrieved from localStorage - token:",
      //   storedToken ? "present" : "missing"
      // );

      if (!storedUserId || !storedToken) {
        console.warn("Missing authentication data in localStorage");
        setError("Please log in to access your profile.");
        setIsLoading(false);
        return;
      }

      setUserId(storedUserId);
      setAuthToken(storedToken);
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      setError(
        "Unable to access stored authentication data. Please log in again."
      );
      setIsLoading(false);
    }
  }, []);

  // Add effect to fetch profile data when userId and authToken are available
  useEffect(() => {
    if (userId && authToken && !isInitialized) {
      // Add a small delay to ensure all components are mounted
      const timer = setTimeout(() => {
        fetchTokenDetails();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [userId, authToken, isInitialized]);

  // Check URL parameters for buyCredits flag
  useEffect(() => {
    // Only run if component is mounted
    if (isMounted) {
      const buyCredits = searchParams.get("buyCredits");
      if (buyCredits === "true") {
        // If an amount parameter is provided, set it to topUpAmount
        const amountParam = searchParams.get("amount");
        if (amountParam) {
          const amount = parseFloat(amountParam);
          if (!isNaN(amount)) {
            // Calculate credits based on amount (simplified example)
            // You may need to adjust this calculation based on your actual pricing logic
            const credits = Math.floor(amount / 4); // Assuming 4 is the price per credit
            setTopUpAmount({ amount, credits });
          }
        }

        setIsTopUpModalOpen(true);

        // Create a new URL without the buyCredits and amount parameters
        // App Router doesn't support router.replace with query manipulation like Pages Router
        // We'll use window.history instead
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("buyCredits");
          url.searchParams.delete("amount");
          window.history.replaceState({}, "", url);
        }
      }
    }
  }, [isMounted, searchParams]);

  // Network connectivity check
  const checkNetworkConnectivity = async () => {
    try {
      const response = await fetch(`${BaseUrl}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.error("Network connectivity check failed:", error);
      return false;
    }
  };

  // Retry fetch with exponential backoff
  const fetchWithRetry = async (url, options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // console.log(`Fetch attempt ${i + 1} for ${url}`);
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        console.error(`Fetch attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, i) * 1000;
        // console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Fetch token details and user profile
  const fetchTokenDetails = async () => {
    if (!userId || !authToken) {
      setError("Authentication information missing. Please log in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Check network connectivity first
      // console.log("Checking network connectivity...");
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        console.warn(
          "Network connectivity check failed, but proceeding with fetch..."
        );
      }
      console.log("Network connectivity check result:", isConnected);

      // First, fetch token details
      // console.log("Fetching token details for userId:", userId);
      // console.log("Using BaseUrl:", BaseUrl);

      const tokenResponse = await fetchWithRetry(
        `${BaseUrl}/token/fetch-tokens/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token fetch failed:", tokenResponse.status, errorText);
        throw new Error(
          `Failed to fetch token details: ${tokenResponse.status} ${tokenResponse.statusText}`
        );
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.success) {
        setTokenInfo(tokenData.tokens);
      } else {
        throw new Error(tokenData.message || "Failed to fetch token details");
      }

      // console.log("Token info:", tokenInfo);

      // Next, fetch user profile details
      const profileResponse = await fetchWithRetry(
        `${BaseUrl}/getProfile/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error(
          "Profile fetch failed:",
          profileResponse.status,
          errorText
        );
        throw new Error(
          `Failed to fetch user profile: ${profileResponse.status} ${profileResponse.statusText}`
        );
      }

      const profileData = await profileResponse.json();
      console.log("Profile details:", profileData);
      console.log("Profile details:", profileData.user.name);

      if (profileData.success) {
        // Set premium status if available in the API response
        if (profileData.user?.isPremium !== undefined) {
          // setIsPremium(profileData.user.isPremium);
        }
        // Set the user's name from profile data
        setName(profileData.user.name);
      } else {
        // Clear auth data and redirect to login
        localStorage.removeItem("userId");
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error(profileData.message || "Failed to fetch user profile");
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Error fetching user data:", error);

      // Provide more specific error messages
      let errorMessage = "An error occurred while fetching your information";

      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.message.includes("401")) {
        errorMessage = "Authentication expired. Please log in again.";
      } else if (error.message.includes("403")) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (error.message.includes("404")) {
        errorMessage = "User data not found. Please contact support.";
      } else if (error.message.includes("500")) {
        errorMessage = "Server error. Please try again later.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  // console.log("Token ghasdfw:", tokenInfo);

  const handleTopUp = async ({ amount, credits }) => {
    // Analytics.track("TopUp Initiated", {
    //   amount: amount,
    //   credits: credits,
    // });

    if (!authToken || !userId) {
      setError("Authentication required.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${BaseUrl}/token/update-tokens`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: credits,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to top up tokens: ${response.status}`);
      }

      const updatedData = await response.json();
      if (updatedData.success) {
        // Analytics.track("TopUp Successful", {
        //   amount: amount,
        //   credits: credits,
        // });

        // Fetch updated token details
        const tokenResponse = await fetch(
          `${BaseUrl}/token/fetch-tokens/${userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!tokenResponse.ok) {
          throw new Error("Failed to fetch updated token details");
        }

        const tokenData = await tokenResponse.json();
        if (tokenData.success) {
          setTokenInfo(tokenData.tokens);
        }

        return true;
      } else {
        // Analytics.track("TopUp Failed", {
        //   amount: amount,
        //   credits: credits,
        //   error: updatedData.message,
        // });
        throw new Error(updatedData.message || "Failed to top up tokens");
      }
    } catch (error) {
      console.error("Top-up error:", error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    } // Implementation
  };

  // Universal function to update tokens after successful payment
  const updateTokensAfterPayment = async ({ amount, credits, paymentMethod = "unknown", transactionId = null }) => {
    // Analytics.track("Payment Successful - Updating Tokens", {
    //   amount: amount,
    //   credits: credits,
    //   paymentMethod: paymentMethod,
    //   transactionId: transactionId,
    // });

    try {
      await handleTopUp({ amount, credits });
      
      // Analytics.track("Token Update Successful", {
      //   amount: amount,
      //   credits: credits,
      //   paymentMethod: paymentMethod,
      //   transactionId: transactionId,
      // });

      setIsTopUpModalOpen(false);
      alert("Payment successful! Tokens have been added to your account.");
      return true;
    } catch (error) {
      console.error("Token update failed after successful payment:", error);
      // Analytics.track("Token Update Failed", {
      //   amount: amount,
      //   credits: credits,
      //   paymentMethod: paymentMethod,
      //   error: error.message,
      // });
      alert("Payment was successful but token update failed. Please contact support.");
      throw error;
    }
  };

  const handlePayment = async ({ amount, credits, paymentMethod = "razorpay", transactionData = null }) => {
    // Analytics.track("Payment Initiated", {
    //   amount: amount,
    //   credits: credits,
    //   paymentMethod: paymentMethod,
    // });

    // If this is not a RazorPay payment, directly update tokens
    if (paymentMethod !== "razorpay") {
      try {
        await updateTokensAfterPayment({ 
          amount, 
          credits, 
          paymentMethod, 
          transactionId: transactionData?.transactionId 
        });
        return true;
      } catch (error) {
        throw error;
      }
    }

    // RazorPay specific handling
    try {
      const amountInINR = amount * 100;
      const orderResponse = await fetch(
        `${BaseUrl}/token/razorpay/create-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInINR,
            currency: "INR", // Razorpay expects amount in paise
          }),
        }
      );

      const orderData = await orderResponse.json();

      const fetchResponse = await fetch(
        `${BaseUrl}/token/razorpay/fetch-order-details/${userId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderData.order.id,
          }),
        }
      );
      const fetchData = await fetchResponse.json();

      const options = {
        key: "rzp_live_wUdGK1kHxZKCDS",
        amount: amountInINR,
        currency: "INR",
        name: "Velocity AI",
        description: `Token Top Up (${credits} Credits)`,
        order_id: orderData.order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              `${BaseUrl}/token/razorpay/verify-payment`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: userId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: amount,
                  amountInINR: amountInINR,
                  credits: credits,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            const fetchResponse = await fetch(
              `${BaseUrl}/token/razorpay/fetch-order-details/${userId}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                }),
              }
            );
            const fetchData = await fetchResponse.json();

            if (verifyData.success) {
              try {
                await updateTokensAfterPayment({ 
                  amount, 
                  credits, 
                  paymentMethod: "razorpay", 
                  transactionId: response.razorpay_payment_id 
                });
              } catch (error) {
                // Error already handled in updateTokensAfterPayment
              }
            }
          } catch (error) {
            // Analytics.track("Payment Failed", {
            //   amount: amount,
            //   credits: credits,
            //   error: error.message,
            //   paymentMethod: "razorpay",
            // });
            console.error("Payment verification failed:", error);
            alert("Payment verification failed. Please contact support.");
          }
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      alert("Unable to initiate payment. Please try again.");
      throw error;
    }
  };

  const togglePromptGrid = () => {
    setShowPromptGrid(!showPromptGrid);
    // Analytics.track("Button Clicked", {
    //   buttonName: "TogglePromptGrid",
    //   newState: !showPromptGrid ? "visible" : "hidden",
    // });

    // Add smooth scrolling after a small delay to ensure the grid is rendered
    setTimeout(() => {
      const promptGridElement = document.getElementById("prompt-grid");
      if (promptGridElement) {
        promptGridElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  // Credits Section Component - Improved responsiveness
  const CreditsSection = () => {
    return (
      <div
        className="flex flex-col w-full px-2 sm:px-3 md:px-4 pb-8 sm:py-10 md:py-12 lg:pb-16 font-dm-sans"
        style={{
          color: "#152A32",
          fontWeight: "600",
        }}
      >
        {/* Token Container */}
        <div className="max-w-md mx-auto space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
          {/* Token Display Container */}
          <div
            className="bg-[#CDF6FE] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-6 text-center border-2 border-[#000000] mb-10"
            style={{
              boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
            }}
          >
            {/* Token Amount */}
            <div
              className="text-black text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 font-dm-sans"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              {isLoading ? "Loading..." : tokenInfo}
            </div>

            {/* "Credits Left" Text */}
            <p
              className="text-black text-sm sm:text-base md:text-base lg:text-lg mb-2 sm:mb-3 md:mb-4 font-dm-sans"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              Credits Left
            </p>

            {/* Get More Credits Button */}
            <button
              onClick={() => {
                // Analytics.track("Button Clicked", {
                //   buttonName: "GetMoreCredits",
                // });

                setIsTopUpModalOpen(true);
              }}
              className="w-full bg-[#00C8F0] font-medium py-2 sm:py-2.5 px-3 sm:px-4 rounded-full 
                        hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none transition-colors duration-200 border-2 border-black font-dm-sans
                       "
              style={{
                boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
              disabled={isLoading}
            >
              <span
                className="text-black text-sm sm:text-base font-medium font-dm-sans"
                style={{
                  color: "#152A32",
                  fontWeight: "600",
                }}
              >
                Get More Credits
              </span>
            </button>

            {/* Warning Message */}
            <div
              className={`mt-3 sm:mt-4 flex items-center justify-center text-xs sm:text-sm text-black font-dm-sans ${
                !isLoading && tokenInfo <= 10 ? "block" : "hidden"
              }`}
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              <span className="text-yellow mr-2">⚠️</span>
              <span className="text-left">
                Running low?
                <br /> Don't miss out on your next big idea
              </span>
            </div>
          </div>

          {/* Referral Component */}
          <div className="transform scale-90 sm:scale-95 md:scale-95 lg:scale-100 origin-top mt-10">
            <CouponRedeem
              onSuccessfulRedeem={fetchTokenDetails}
              className="your-css-class"
            />
          </div>

          {/* Coupon Component */}
          {/* <div className="transform scale-90 sm:scale-95 md:scale-95 lg:scale-100 origin-top">
            <ShareReferral userId={userId} authToken={authToken} />
          </div> */}
          {/* Profile Section */}
          <div className="flex flex-col items-center justify-center mb-6 w-full lg:hidden">
            <div className="relative w-full">
              <div className="flex items-center bg-white border-2 border-black rounded-xl shadow-lg px-4 py-3 w-full max-w-full sm:max-w-md mx-auto" style={{ minWidth: '100%' }}>
                {/* Profile Picture */}
                <div className="w-12 h-12 rounded-full bg-[#CDF6FE] border-2 border-[#00C8F0] shadow flex items-center justify-center overflow-hidden mr-3">
                  <span className="text-[#00C8F0] text-lg font-bold">
                    {name.charAt(0) || "A"}
                  </span>
                </div>
                {/* User Name and Controls */}
                <div className="flex flex-col flex-1">
                  <span className="text-black font-bold text-base leading-tight">{name || "User"}</span>
                  <span className="text-xs text-gray-500 font-semibold">Welcome back!</span>
                </div>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ml-2 text-gray-400 hover:text-black"
                  title="More"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {showDropdown && (
                <div
                  className="absolute left-0 right-0 mx-auto mt-1 bg-white rounded-xl shadow-lg z-10 border-2 border-black w-full max-w-full sm:max-w-md"
                  style={{ minWidth: '100%' }}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-black hover:bg-[#CDF6FE] rounded-xl transition-all duration-200 font-semibold"
                  >
                    <svg className="inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={20} height={20}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Desktop Profile Section */}
          <div className="hidden lg:flex flex-col items-center justify-center mb-6 w-full">
            <div className="relative w-full">
              <div className="flex items-center bg-white border-2 border-black rounded-xl shadow-lg px-4 py-3 w-full" style={{ minWidth: '100%', maxWidth: '100%', boxShadow: '2px 2px 2px 0px rgb(0, 0, 0)' }}>
                {/* Profile Picture */}
                <div className="w-12 h-12 rounded-full bg-[#CDF6FE] border-2 border-[#00C8F0] shadow flex items-center justify-center overflow-hidden mr-3">
                  <span className="text-[#00C8F0] text-lg font-bold">
                    {name.charAt(0) || "A"}
                  </span>
                </div>
                {/* User Name and Controls */}
                <div className="flex flex-col flex-1">
                  <span className="text-black font-bold text-base leading-tight">{name || "User"}</span>
                  <span className="text-xs text-gray-500 font-semibold">Welcome back!</span>
                </div>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ml-2 text-gray-400 hover:text-black"
                  title="More"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {showDropdown && (
                <div
                  className="absolute left-0 right-0 mx-auto mt-1 bg-white rounded-xl shadow-lg z-10 border-2 border-black w-full"
                  style={{ minWidth: '100%', maxWidth: '100%' }}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-black hover:bg-[#CDF6FE] rounded-xl transition-all duration-200 font-semibold"
                  >
                    <svg className="inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={20} height={20}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Error message display
  const ErrorMessage = () => {
    if (!error) return null;

    return (
      <div
        className="w-full max-w-md mx-auto mt-3 sm:mt-4 bg-red-100 border border-red-400 text-red-700 p-3 sm:p-4 rounded-lg font-dm-sans"
        style={{
          color: "#152A32",
          fontWeight: "600",
        }}
      >
        <p className="text-xs sm:text-sm mb-2">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setError(null);
              setIsInitialized(false);
              if (userId && authToken) {
                fetchTokenDetails();
              }
            }}
            className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 font-dm-sans"
            disabled={isLoading}
          >
            {isLoading ? "Retrying..." : "Retry"}
          </button>
          <button
            onClick={() => {
              // Clear localStorage and redirect to login
              localStorage.removeItem("userId");
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 font-dm-sans"
          >
            Re-login
          </button>
        </div>
      </div>
    );
  };

  // Add new functions for profile section
  const handleChange = (e) => {
    setName(e.target.value);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Here you can add API call to save the name if needed
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[#fff] font-dm-sans"
      style={{
        color: "#152A32",
        fontWeight: "600",
      }}
    >
      {/* LLM Option Modal */}
      <LLMOption embedded={false} />

      {/* Buy Credit Modal */}
      <BuyCredit
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        setTopUpAmount={setTopUpAmount}
        handlePayment={handlePayment}
        tokenInfo={tokenInfo}
      />

      {/* Mobile Layout (Stacked) - Updated to match desktop theme */}
      <div className="lg:hidden flex flex-col w-full">
        {/* Changed gradient to solid color matching desktop */}
        <div
          className="fixed inset-0 z-0 lg:hidden"
          style={{
            backgroundColor: "#CDF6FE",
            pointerEvents: "none",
          }}
        ></div>

        {/* Content (now relative to the fixed background) */}
        <div className="relative z-10">
          {/* Added logo for mobile view to match desktop */}
          <div className="flex items-center justify-center pt-8 sm:pt-10 pb-1 sm:pb-2">
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2">
              <Image
                src={"https://thinkvelocity.in/next-assets/VEL_LOGO2.png"}
                width={30}
                height={30}
                alt="Velocity Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-black rounded-full"
                style={{
                  boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
                }}
              />
              <span
                className="text-2xl sm:text-3xl font-bold text-black font-dm-sans"
                style={{
                  color: "#152A32",
                  fontWeight: "600",
                }}
              >
                Velocity
              </span>
            </Link>
          </div>

          {/* Error Message */}
          {error && <ErrorMessage />}

          {/* Credits Section for Mobile */}
          <div className="mt-3 sm:mt-4 md:mt-6">
            <CreditsSection />
          </div>

          {/* Model Selector - Updated button style to match theme */}
          <div className="w-full max-w-md mx-auto px-4 mt-3 sm:mt-4">
            <button
              onClick={togglePromptGrid}
              className="w-3/4 mx-auto block bg-[#00C8F0] text-black font-medium text-base sm:text-lg md:text-xl py-2 sm:py-3 px-3 sm:px-4 rounded-full shadow-md hover:bg-gray-300 transition-colors duration-200 border-2 border-black font-dm-sans"
              style={{
                color: "#152A32",
                fontWeight: "600",
                boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
              }}
              disabled={isLoading}
            >
              {showPromptGrid
                ? "Hide Conversation Archive"
                : "Show Conversation Archive"}
            </button>
          </div>

          {/* Prompt Grid - Add an id to the container */}
          {showPromptGrid && (
            <div
              id="prompt-grid"
              className="w-full px-2 sm:px-3 mt-3 sm:mt-4 py-3 sm:py-4 md:py-6 overflow-y-auto"
              style={{
                maxHeight: "calc(100vh - 400px)",
              }}
            >
              {/* Custom styles for mobile view to show only icons in filters and smaller pagination */}
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  /* Hide text in filter buttons on mobile */
                  @media (max-width: 767px) {
                    #prompt-grid button span.filter-text {
                      display: none;
                    }
                    
                    /* Make filter buttons smaller and icon-only on mobile */
                    #prompt-grid button.filter-button {
                      padding: 0.5rem !important;
                      width: auto !important;
                    }
                    
                    /* Reduce pagination button size on mobile */
                    #prompt-grid .pagination-button {
                      padding: 0.25rem 0.5rem !important;
                      font-size: 0.75rem !important;
                      margin: 0 0.25rem !important;
                    }
                  }
                  
                  /* Responsive styles for tablets */
                  @media (min-width: 768px) and (max-width: 1023px) {
                    #prompt-grid {
                      padding: 1rem;
                    }
                    
                    #prompt-grid button.filter-button {
                      padding: 0.75rem 1rem !important;
                      font-size: 1rem !important;
                    }
                    
                    #prompt-grid .pagination-button {
                      padding: 0.5rem 0.75rem !important;
                      font-size: 1rem !important;
                    }
                    
                    #prompt-grid .prompt-card {
                      transform: none;
                    }
                  }
                `,
                }}
              />
              <PromptGrid isVisible={true} />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout (Side-by-side) - Kept as is, no gradient */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        {/* Sidebar for Credits */}
        <div
          className="w-80 md:w-88 lg:w-96 xl:w-[500px] flex-shrink-0 bg-[#CDF6FE] h-full flex flex-col overflow-hidden font-dm-sans "
          style={{
            borderRight: "2px solid #000000",
            boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
            borderRadius: "20px",
            zIndex: "10",
            msOverflowStyle: "none" /* IE and Edge */,
            scrollbarWidth: "none" /* Firefox */,
          }}
        >
          {/* Apply the WebKit scrollbar style using dangerouslySetInnerHTML */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            div.lg\\:flex > div:first-child::-webkit-scrollbar {
              display: none;
            }
            
            /* Responsive font sizes for different screen widths */
            @media (min-width: 1024px) and (max-width: 1279px) {
              .scale-for-laptop {
                transform: scale(0.9);
                transform-origin: top center;
              }
              .text-for-laptop {
                font-size: 85%;
              }
            }
          `,
            }}
          />

          <Link
            href="/"
            className="flex items-center space-x-2 md:space-x-3 pt-8 md:pt-10 lg:pt-12 xl:pt-10 px-6 md:px-8 xl:px-12"
          >
            <div className="flex items-center scale-for-laptop">
              <Image
                src={"https://thinkvelocity.in/next-assets/VEL_LOGO2.png"}
                width={60}
                height={60}
                alt="Velocity Logo"
                className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 border-2 border-black rounded-full"
                style={{
                  boxShadow: "2px 2px 2px 0px rgb(0, 0, 0)",
                }}
              />
              <span
                className="ml-2 md:ml-3 text-3xl md:text-4xl lg:text-5xl font-bold text-black font-dm-sans text-for-laptop"
                style={{
                  color: "#152A32",
                  fontWeight: "600",
                }}
              >
                VELOCITY
              </span>
            </div>
          </Link>

          <div className="flex-grow flex items-center">
            <CreditsSection />
          </div>

          {/* Error Message in Sidebar */}
          {error && (
            <div
              className="mx-4 md:mx-6 lg:mx-8 xl:mx-12 mb-4 p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg font-dm-sans"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              <p className="text-xs md:text-sm mb-2">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    setIsInitialized(false);
                    if (userId && authToken) {
                      fetchTokenDetails();
                    }
                  }}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 font-dm-sans"
                  disabled={isLoading}
                >
                  {isLoading ? "Retrying..." : "Retry"}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("userId");
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                  }}
                  className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 font-dm-sans"
                >
                  Re-login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div
          className="flex-1 overflow-y-auto font-dm-sans"
          style={{
            backgroundColor: "#fff",
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          <div className="relative flex flex-col">
            {/* Model Selector */}
            <div
              className="w-full px-3 md:px-4 lg:px-5 xl:px-6 py-3 md:py-4 lg:py-5 xl:py-6"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              <PromptGrid isVisible={showPromptGrid} />
            </div>
          </div>
        </div>
      </div>

      {/* Add global responsive styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Custom breakpoint for iPad horizontal and small laptops */
          @media (min-width: 768px) and (max-width: 1023px) {
            .lg\\:hidden {
              display: flex !important;
            }
            .hidden.lg\\:flex {
              display: none !important;
            }
            
            /* Keep original sizes for tablet view */
            .font-dm-sans {
              font-size: 1rem;
            }
            
            button, a {
              transform: none;
            }
            
            /* Adjust spacing for tablet view */
            #prompt-grid {
              padding: 1rem;
            }
            
            /* Make prompt grid take full width on tablet */
            #prompt-grid .prompt-grid-container {
              width: 100%;
              max-width: 100%;
            }
          }
          
          /* General scaling for elements on smaller screens */
          @media (min-width: 1024px) and (max-width: 1279px) {
            .font-dm-sans {
              font-size: 0.95rem;
            }
            
            button, a {
              transform: scale(0.95);
              transform-origin: center;
            }
          }
        `,
        }}
      />
    </div>
  );
};

export default ProfilePage;
