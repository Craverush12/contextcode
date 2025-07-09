"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Paypal from "@/components/Paypal";
import Cashfree from "@/components/Cashfree";
import Phonepe from "@/components/Phonepe"; // Add PhonePe import

// Import safe analytics wrapper
import SafeAnalytics, {
  safeTrack,
  safeEventTrack,
  safeEventTrackError,
  safeButtonTrack,
  safeMetaPixelTrack,
} from "../utils/safeAnalytics";

const BuyCredits = ({
  isOpen,
  onClose,
  setTopUpAmount,
  handlePayment,
  tokenInfo,
}) => {
  const getInitialPaymentMethod = () => {
    // Return null initially to avoid localStorage errors during server rendering
    return null;
  };

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showError, setShowError] = useState(false);
  const [batteryFill, setBatteryFill] = useState(0);
  const [userRegion, setUserRegion] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    getInitialPaymentMethod
  );
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPricingOptions, setShowPricingOptions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showCashfreePopup, setShowCashfreePopup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Load saved payment method from localStorage after component mounts
  useEffect(() => {
    try {
      const savedMethod = localStorage.getItem("preferredPaymentMethod");
      if (savedMethod) {
        const parsedMethod = JSON.parse(savedMethod);
        if (parsedMethod?.id && parsedMethod?.name) {
          setSelectedPaymentMethod(parsedMethod);
        }
      }
    } catch (error) {
      console.error("Error initializing payment method:", error);
      localStorage.removeItem("preferredPaymentMethod");
    }
  }, []);

  const paymentMethods = [
    {
      id: "razorpay",
      name: "RazorPay",
      icon: "🔄",
      description: "Instant payments with razorpay (India only).",
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: "💳",
      description: "Fast and secure international transactions.",
    },
    {
      id: "cashfree",
      name: "Cashfree",
      icon: "💸",
      description: "Secure payments with Cashfree.",
    },
    {
      id: "phonepe",
      name: "PhonePe",
      icon: "📱",
      description: "Quick and secure payments with PhonePe.",
    }, // Add PhonePe option
  ];

  useEffect(() => {
    const validateSavedMethod = () => {
      if (
        selectedPaymentMethod &&
        !paymentMethods.some((m) => m.id === selectedPaymentMethod.id)
      ) {
        setSelectedPaymentMethod(null);
        localStorage.removeItem("preferredPaymentMethod");
      }
    };
    validateSavedMethod();
  }, [selectedPaymentMethod]);

  const togglePaymentOptions = () => {
    setShowPricingOptions(false);
    setShowPaymentOptions(true);
  };

  const selectPaymentMethod = (method) => {
    try {
      if (!method?.id || !method?.name)
        throw new Error("Invalid payment method");
      setSelectedPaymentMethod(method);
      if (method.id === "cashfree") {
        setShowCashfreePopup(true);
      } else {
        setShowPaymentOptions(false);
        setShowPricingOptions(true);
      }
      localStorage.setItem("preferredPaymentMethod", JSON.stringify(method));

      // Track payment method selection with both Analytics and EventTracking
      safeTrack("payment_method_selected", {
        methodId: method.id,
        timestamp: new Date().toISOString(),
      });

      // More detailed tracking with EventTracking
      safeEventTrack("Payment Method Selected", {
        payment_method: method.id,
        payment_method_name: method.name,
        location: "buy_credits_modal",
        amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
        credits: credits,
      });
    } catch (error) {
      console.error("Error saving payment method:", error);
      setShowError(true);

      // Track error
      safeEventTrackError("Payment Method Selection", error.message, {
        payment_method: method?.id,
      });
    }
  };

  const handleCashfreePhoneSubmit = () => {
    if (phoneNumber.length >= 10) {
      // Basic validation, adjust as needed
      setShowCashfreePopup(false);
      setShowPaymentOptions(false);
      setShowPricingOptions(true);
    } else {
      setShowError(true);
    }
  };

  const fetchUserRegion = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setUserRegion({
        countryCode: data.country_code,
        regionName: data.region,
      });
    } catch (error) {
      console.error("Failed to fetch user region:", error);
      const browserLang = navigator.language || navigator.userLanguage;
      const countryCode = browserLang ? browserLang.split("-")[1] : "US";
      setUserRegion({ countryCode: countryCode || "US" });
    }
  };

  useEffect(() => {
    fetchUserRegion();
  }, []);

  const getRegionPricing = () => {
    if (!userRegion) return { currency: "INR", symbol: "₹", rate: 1 };
    switch (userRegion.countryCode) {
      case "IN":
        return { currency: "INR", symbol: "₹", rate: 1 };
      case "DE":
        return { currency: "EUR", symbol: "€", rate: 0.03 };
      case "GB":
        return { currency: "GBP", symbol: "£", rate: 0.019 };
      case "US":
      default:
        return { currency: "USD", symbol: "$", rate: 0.03 };
    }
  };

  const regionPricing = getRegionPricing();
  const creditOptions = [
    { amount: Math.round(400 * regionPricing.rate), credits: 100 },
    { amount: Math.round(1000 * regionPricing.rate), credits: 250 },
    { amount: Math.round(2000 * regionPricing.rate), credits: 500 },
    { amount: Math.round(4000 * regionPricing.rate), credits: 1000 },
    { amount: Math.round(10000 * regionPricing.rate), credits: 2500 },
  ];

  const totalCredits = 1000;
  const currentCredits =
    (tokenInfo?.token_received || 0) - (tokenInfo?.tokens_used || 0);

  useEffect(() => {
    let animationFrame;
    const startTime = performance.now();
    const duration = 2000;
    const animateBattery = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const creditsForBattery = Math.min(currentCredits, totalCredits);
      const fillPercentage =
        progress * (creditsForBattery / totalCredits) * 100;
      setBatteryFill(fillPercentage);
      if (progress < 1) animationFrame = requestAnimationFrame(animateBattery);
    };
    animationFrame = requestAnimationFrame(animateBattery);
    return () => cancelAnimationFrame(animationFrame);
  }, [currentCredits, totalCredits]);

  const calculateCreditsPerRupee = () => {
    const referenceOption = creditOptions[0];
    return referenceOption.credits / referenceOption.amount;
  };

  const handleAmountSelect = (amount, credits) => {
    setIsOtherSelected(false);
    setSelectedAmount(amount);
    setCredits(credits);
    setTopUpAmount({ amount, credits });
    setShowError(false);

    // Track amount selection
    safeEventTrack("Credit Amount Selected", {
      amount: amount,
      credits: credits,
      currency: regionPricing.currency,
      is_custom: false,
    });
  };

  const handleOtherSelect = () => {
    setIsOtherSelected(true);
    setSelectedAmount(null);
    setCredits(0);
    setCustomAmount("");

    // Track custom amount option selected
    safeEventTrack("Custom Amount Option Selected", {
      currency: regionPricing.currency,
    });
  };

  const handleCustomInputChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    const numValue = parseFloat(value);
    if (value) {
      if (numValue > 10000) value = "10000";
      if (numValue < 4) value = "50";
      setCustomAmount(value);
      const creditsPerRupee = calculateCreditsPerRupee();
      const calculatedCredits = Math.round(numValue * creditsPerRupee);
      setCredits(calculatedCredits);
      setTopUpAmount({ amount: numValue, credits: calculatedCredits });
      setShowError(numValue > 10000 || numValue < 4);

      // Only track if the value is valid and has changed significantly
      if (numValue >= 4 && numValue <= 10000) {
        // Debounce tracking to avoid excessive events
        if (window.customAmountTrackingTimeout) {
          clearTimeout(window.customAmountTrackingTimeout);
        }
        window.customAmountTrackingTimeout = setTimeout(() => {
          safeEventTrack("Custom Credit Amount Entered", {
            amount: numValue,
            credits: calculatedCredits,
            currency: regionPricing.currency,
          });
        }, 500);
      }
    } else {
      setCustomAmount("");
      setCredits(0);
      setTopUpAmount({ amount: 0, credits: 0 });
      setShowError(false);
    }
  };

  const handlePaypalSuccess = async (details, data) => {
    setIsLoading(true);
    try {
      const paymentData = isOtherSelected
        ? { 
            amount: parseFloat(customAmount), 
            credits,
            paymentMethod: "paypal",
            transactionData: {
              transactionId: data.orderID,
              paymentDetails: details
            }
          }
        : { 
            amount: selectedAmount, 
            credits,
            paymentMethod: "paypal",
            transactionData: {
              transactionId: data.orderID,
              paymentDetails: details
            }
          };

      if (!paymentData.amount || paymentData.amount < 50) {
        setShowError(true);
        setIsLoading(false);
        return;
      }

      // Track PayPal payment success
      safeEventTrack("PayPal Payment Successful", {
        amount: paymentData.amount,
        credits: paymentData.credits,
        transaction_id: data.orderID,
      });

      await handlePayment(paymentData);
      setShowError(false);
      onClose();
    } catch (error) {
      console.error("PayPal payment failed:", error);
      setShowError(true);
      
      // Track PayPal payment error
      safeEventTrackError("PayPal Payment Error", error.message, {
        amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
        credits: credits,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashfreeSuccess = async (cashfreePaymentData) => {
    setIsLoading(true);
    try {
      const data = isOtherSelected
        ? { 
            amount: parseFloat(customAmount), 
            credits, 
            phone: phoneNumber,
            paymentMethod: "cashfree",
            transactionData: {
              transactionId: cashfreePaymentData?.transactionId || cashfreePaymentData?.orderId,
              paymentDetails: cashfreePaymentData
            }
          }
        : { 
            amount: selectedAmount, 
            credits, 
            phone: phoneNumber,
            paymentMethod: "cashfree",
            transactionData: {
              transactionId: cashfreePaymentData?.transactionId || cashfreePaymentData?.orderId,
              paymentDetails: cashfreePaymentData
            }
          };

      if (!data.amount || data.amount < 50) {
        setShowError(true);
        setIsLoading(false);
        return;
      }

      // Track Cashfree payment success
      safeEventTrack("Cashfree Payment Successful", {
        amount: data.amount,
        credits: data.credits,
        transaction_id: data.transactionData.transactionId,
        phone: phoneNumber,
      });

      await handlePayment(data);
      setShowError(false);
      onClose();
    } catch (error) {
      console.error("Cashfree payment failed:", error);
      setShowError(true);
      
      // Track Cashfree payment error
      safeEventTrackError("Cashfree Payment Error", error.message, {
        amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
        credits: credits,
        phone: phoneNumber,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextClick = async () => {
    if (
      !selectedPaymentMethod ||
      selectedPaymentMethod.id === "paypal" ||
      selectedPaymentMethod.id === "cashfree" ||
      selectedPaymentMethod.id === "phonepe"
    )
      return;

    // Track payment initiation
    safeButtonTrack("Payment Next", {
      payment_method: selectedPaymentMethod.id,
      amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
      credits: credits,
      currency: regionPricing.currency,
    });

    setIsLoading(true);
    try {
      const paymentData = isOtherSelected
        ? { 
            amount: parseFloat(customAmount), 
            credits,
            paymentMethod: selectedPaymentMethod.id,
            transactionData: {
              currency: regionPricing.currency,
              paymentMethodInfo: selectedPaymentMethod
            }
          }
        : { 
            amount: selectedAmount, 
            credits,
            paymentMethod: selectedPaymentMethod.id,
            transactionData: {
              currency: regionPricing.currency,
              paymentMethodInfo: selectedPaymentMethod
            }
          };

      if (!paymentData.amount || paymentData.amount < 50) {
        setShowError(true);
        setIsLoading(false);

        // Track validation error
        safeEventTrackError("Payment Validation", "Invalid amount", {
          payment_method: selectedPaymentMethod.id,
          amount: paymentData.amount,
          min_required: 50,
        });
        return;
      }

      // Track payment processing
      safeEventTrack("Payment Processing", {
        payment_method: selectedPaymentMethod.id,
        amount: paymentData.amount,
        credits: credits,
        currency: regionPricing.currency,
      });

      await handlePayment(paymentData);

      // Track payment success in Mixpanel
      safeEventTrack("Payment Completed", {
        payment_method: selectedPaymentMethod.id,
        amount: paymentData.amount,
        credits: credits,
        currency: regionPricing.currency,
      });

      // Track purchase in Meta Pixel
      safeMetaPixelTrack("purchase", {
        value: paymentData.amount,
        currency: regionPricing.currency,
        content_type: "product",
        content_ids: ["credits_purchase"],
        contents: [
          {
            id: "credits",
            quantity: credits,
            item_price: paymentData.amount / credits,
          },
        ],
        num_items: 1,
      });

      setShowError(false);
      onClose();
    } catch (error) {
      console.error("Payment failed:", error);
      setShowError(true);

      // Track payment error
      safeEventTrackError("Payment Error", error.message, {
        payment_method: selectedPaymentMethod.id,
        amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
        credits: credits,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showPhonepeButton = useMemo(() => {
    const amountValue = isOtherSelected
      ? parseFloat(customAmount)
      : selectedAmount;
    return (
      selectedPaymentMethod?.id === "phonepe" &&
      amountValue &&
      amountValue >= 50
    );
  }, [selectedPaymentMethod, selectedAmount, customAmount, isOtherSelected]);

  const showPaypalButton = useMemo(() => {
    const amountValue = isOtherSelected
      ? parseFloat(customAmount)
      : selectedAmount;
    return (
      selectedPaymentMethod?.id === "paypal" && amountValue && amountValue >= 50
    );
  }, [selectedPaymentMethod, selectedAmount, customAmount, isOtherSelected]);

  const showCashfreeButton = useMemo(() => {
    const amountValue = isOtherSelected
      ? parseFloat(customAmount)
      : selectedAmount;
    return (
      selectedPaymentMethod?.id === "cashfree" &&
      amountValue &&
      amountValue >= 50 &&
      phoneNumber &&
      phoneNumber.length >= 10
    );
  }, [
    selectedPaymentMethod,
    selectedAmount,
    customAmount,
    phoneNumber,
    isOtherSelected,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-3xl p-3 sm:p-6"
        style={{
          border: "2px solid #000000",
          boxShadow: "6px 6px 2px rgba(0, 0, 0, 1)",
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-[#e9f9ff] bg-opacity-50 flex items-center justify-center rounded-3xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0078FF]"></div>
          </div>
        )}

        {/* Cashfree Phone Number Popup */}
        {showCashfreePopup && (
          <div className="absolute inset-0 bg-black razorpay bg-opacity-50 flex items-center justify-center z-60">
            <div
              className="bg-[#e9f9ff] border-2 border-black rounded-2xl p-6 w-80"
              style={{ boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)" }}
            >
              <h3 className="text-black text-lg mb-4">Enter Phone Number</h3>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="Enter your phone number"
                className="w-full px-4 py-2 rounded-xl bg-white text-black placeholder-gray-400 mb-4 border-2 border-black"
                style={{ boxShadow: "2px 2px 2px rgba(0, 0, 0, 1)" }}
                maxLength={15}
              />
              {showError && phoneNumber.length < 10 && (
                <p className="text-red-500 text-sm mb-4">
                  Please enter a valid phone number
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCashfreePopup(false);
                    setSelectedPaymentMethod(null);
                    setPhoneNumber("");
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCashfreePhoneSubmit}
                  className="px-4 py-2 bg-[#00D2FF] text-white rounded-md hover:bg-[#00C5F0] border-2 border-black"
                  style={{ boxShadow: "2px 2px 2px rgba(0, 0, 0, 1)" }}
                  disabled={phoneNumber.length < 10}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
          }}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-600 hover:text-gray-800"
          style={{
            boxShadow: "2px 2px 1px rgb(0, 0, 0)",
            borderRadius: "10px",
            border: "2px solid #000000",
            height: "28px",
            width: "28px",
          }}
        >
          ✕
        </button>
        <div className="flex items-center justify-center mb-2 sm:mb-4">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="https://thinkvelocity.in/next-assets/VEL_LOGO2.png"
              width={32}
              height={32}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 object-contain"
              alt="Velocity Logo"
            />
            <span
              className="text-2xl sm:text-3xl text-gray-800 font-normal font-dm-sans"
              style={{
                fontWeight: "600",
              }}
            >
              Velocity
            </span>
          </div>
        </div>
        {/* <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col items-start">
            <span className="text-gray-700 text-lg font-medium">{regionPricing.symbol}{selectedAmount || parseFloat(customAmount) || 0}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-700 text-lg font-medium">{credits} Credits</span>
          </div>
        </div> */}
        <div className="mb-4 sm:mb-8 border-t border-gray-200 pt-3 sm:pt-6">
          {showPricingOptions ? (
            <>
              <h1 className="text-lg sm:text-xl mb-3 sm:mb-6 text-center text-gray-700 font-medium">
                Buy Credits
              </h1>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                {creditOptions.slice(0, 3).map(({ amount, credits }, index) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount, credits)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "2px 2px 1px rgb(0, 0, 0)";
                    }}
                    className={`py-2 sm:py-3 px-2 sm:px-6 rounded-2xl text-sm sm:text-lg text-black transition-all duration-200`}
                    style={{
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 1px rgb(0, 0, 0)",
                    }}
                  >
                    {regionPricing.symbol}
                    {amount}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-6">
                {creditOptions.slice(3, 5).map(({ amount, credits }, index) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount, credits)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "2px 2px 1px rgb(0, 0, 0)";
                    }}
                    className={`py-2 sm:py-3 px-2 sm:px-6 rounded-2xl text-sm sm:text-lg text-black transition-all duration-200`}
                    style={{
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 1px rgb(0, 0, 0)",
                    }}
                  >
                    {regionPricing.symbol}
                    {amount}
                  </button>
                ))}
                <button
                  onClick={handleOtherSelect}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "2px 2px 1px rgb(0, 0, 0)";
                  }}
                  className={`py-2 sm:py-3 px-2 sm:px-6 rounded-2xl text-sm sm:text-lg text-black transition-all duration-200`}
                  style={{
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 1px rgb(0, 0, 0)",
                  }}
                >
                  Other
                </button>
              </div>

              <div className="text-center mb-3 sm:mb-4">
                <p className="text-gray-700 mb-2 text-sm sm:text-base">
                  Credits you will get
                </p>
                <div
                  className="inline-block border border-black rounded-lg py-2 sm:py-3 px-4 sm:px-8"
                  style={{ borderRadius: "10px" }}
                >
                  <span className="text-lg sm:text-xl font-medium text-black">
                    {credits} Credits
                  </span>
                </div>
              </div>

              {isOtherSelected && (
                <div className="flex flex-col items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div
                    className={`text-sm sm:text-base ${
                      showError
                        ? "text-red-500 font-semibold animate-pulse"
                        : "text-gray-700"
                    }`}
                  >
                    {parseFloat(customAmount) < 50
                      ? `Minimum amount is ${regionPricing.symbol}50`
                      : parseFloat(customAmount) > 10000
                      ? `Maximum amount is ${regionPricing.symbol}10000`
                      : `Amount: ${regionPricing.symbol}${customAmount || 0}`}
                  </div>
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {regionPricing.symbol}
                    </span>
                    <input
                      value={customAmount}
                      onChange={handleCustomInputChange}
                      placeholder={`Enter amount in ${regionPricing.currency}`}
                      className="w-full px-12 py-3 rounded-xl bg-gray-100 text-black placeholder-gray-400 text-center"
                      min="50"
                      type="number"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="flex justify-between items-center mb-2"
                style={{ borderRadius: "10px" }}
              >
                <h1
                  className="text-lg text-gray-800 font-normal font-dm-sans"
                  style={{
                    fontWeight: "600",
                  }}
                >
                  Payment Method
                </h1>
                <button
                  onClick={() => {
                    setShowPaymentOptions(false);
                    setShowPricingOptions(true);
                  }}
                  className="text-[#0078FF] hover:text-[#0066DD] text-xs"
                >
                  Back to pricing
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-4">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => selectPaymentMethod(method)}
                    className={`py-2 px-4 rounded-xl text-base text-gray-800 ${
                      selectedPaymentMethod?.id === method.id
                        ? "bg-[#e9f9ff]"
                        : "bg-[#e9f9ff] hover:bg-opacity-80"
                    } transition-all duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {method.id === "paypal" && (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Image
                              src="https://thinkvelocity.in/next-assets/PayPal.png"
                              alt="PayPal"
                              width={24}
                              height={24}
                              className="w-6 h-6"
                            />
                          </div>
                        )}
                        {method.id === "razorpay" && (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Image
                              src="https://thinkvelocity.in/next-assets/razorpay.png"
                              alt="razorpay"
                              width={40}
                              height={40}
                              className="w-10 h-5"
                            />
                          </div>
                        )}
                        {method.id === "cashfree" && (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Image
                              src="https://thinkvelocity.in/next-assets/Cashfree.png"
                              alt="Cashfree"
                              width={24}
                              height={24}
                              className="w-6 h-6"
                            />
                          </div>
                        )}
                        {method.id === "phonepe" && (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Image
                              src="https://thinkvelocity.in/next-assets/Phonepe.png"
                              alt="PhonePe"
                              width={24}
                              height={24}
                              className="w-6 h-6"
                            />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="text-gray-800 font-medium">
                            {method.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {method.description}
                          </div>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center">
                        {selectedPaymentMethod?.id === method.id && (
                          <div className="w-3 h-3 rounded-full bg-[#0078FF]"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="border-t border-gray-200 pt-3 sm:pt-6">
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm sm:text-base">
                Total Price:
              </span>
              <span className="text-gray-700 text-base sm:text-lg font-medium">
                {regionPricing.symbol}
                {(selectedAmount || parseFloat(customAmount) || 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex flex-row gap-2 sm:gap-4 items-end">
            <div className="flex flex-col">
              <h3 className="text-gray-700 text-xs sm:text-sm mb-2 sm:mb-3">
                Payment Method
              </h3>
              <button
                onClick={togglePaymentOptions}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
                }}
                className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none flex items-center justify-between p-2 bg-gray-100 rounded-lg border-2 border-black text-xs sm:text-sm text-gray-700 w-[120px] sm:w-[150px] h-[32px] sm:h-[40px]"
                style={{
                  boxShadow: "2px 2px 2px rgba(0, 0, 0, 1)",
                  borderRadius: "10px",
                }}
              >
                {selectedPaymentMethod ? (
                  <div className="flex items-center gap-1 sm:gap-3">
                    {selectedPaymentMethod.id === "paypal" && (
                      <div className="w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center">
                        <Image
                          src="https://thinkvelocity.in/next-assets/PayPal.png"
                          alt="PayPal"
                          width={24}
                          height={24}
                          className="w-4 h-4 sm:w-6 sm:h-6"
                        />
                      </div>
                    )}
                    {selectedPaymentMethod.id === "razorpay" && (
                      <div className="w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center">
                        <Image
                          src="https://thinkvelocity.in/next-assets/razorpay.png"
                          alt="razorpay"
                          width={40}
                          height={40}
                          className="w-6 h-3 sm:w-10 sm:h-5"
                        />
                      </div>
                    )}
                    {selectedPaymentMethod.id === "cashfree" && (
                      <div className="w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center">
                        <Image
                          src="https://thinkvelocity.in/next-assets/Cashfree.png"
                          alt="Cashfree"
                          width={24}
                          height={24}
                          className="w-4 h-4 sm:w-6 sm:h-6"
                        />
                      </div>
                    )}
                    {selectedPaymentMethod.id === "phonepe" && (
                      <div className="w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center">
                        <Image
                          src="https://thinkvelocity.in/next-assets/Phonepe.png"
                          alt="PhonePe"
                          width={24}
                          height={24}
                          className="w-4 h-4 sm:w-6 sm:h-6"
                        />
                      </div>
                    )}
                    <div className="text-gray-700 font-medium text-xs sm:text-sm">
                      {selectedPaymentMethod.name}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm">Select Payment</span>
                )}
              </button>
            </div>
            <div className="flex-1">
              {showPaypalButton ? (
                <Paypal
                  amount={
                    isOtherSelected ? parseFloat(customAmount) : selectedAmount
                  }
                  credits={credits}
                  currency={regionPricing.currency}
                  onSuccess={handlePaypalSuccess}
                  onError={(error) => {
                    console.error("PayPal error:", error);
                    setShowError(true);
                    setIsLoading(false);
                  }}
                  onCancel={() => setIsLoading(false)}
                  disabled={!selectedAmount && !customAmount}
                />
              ) : showCashfreeButton ? (
                <Cashfree
                  amount={
                    isOtherSelected ? parseFloat(customAmount) : selectedAmount
                  }
                  credits={credits}
                  currency={regionPricing.currency}
                  customer_phone={phoneNumber} // Passing phone number to Cashfree component
                  onSuccess={handleCashfreeSuccess}
                  onError={(error) => {
                    console.error("Cashfree error:", error);
                    setShowError(true);
                    setIsLoading(false);
                  }}
                  onCancel={() => setIsLoading(false)}
                  disabled={!selectedAmount && !customAmount}
                />
              ) : showPhonepeButton ? (
                <Phonepe
                  amount={
                    isOtherSelected ? parseFloat(customAmount) : selectedAmount
                  }
                  credits={credits}
                />
              ) : (
                <button
                  onClick={handleNextClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "2px 2px 1px rgb(0, 0, 0)";
                  }}
                  disabled={
                    !selectedPaymentMethod ||
                    isLoading ||
                    (isOtherSelected
                      ? !customAmount || parseFloat(customAmount) < 50
                      : !selectedAmount || selectedAmount < 50)
                  }
                  className={`w-full py-2 px-4 sm:px-6 rounded-full text-white text-center font-medium border-2 border-black text-sm sm:text-base ${
                    selectedPaymentMethod &&
                    !isLoading &&
                    (isOtherSelected
                      ? customAmount && parseFloat(customAmount) >= 50
                      : selectedAmount && selectedAmount >= 50)
                      ? "bg-[#00D2FF] hover:bg-[#00C5F0]"
                      : "bg-[#00D2FF80] cursor-not-allowed"
                  } transition-colors duration-200`}
                  style={{
                    boxShadow: "1px 1px 2px rgba(0, 0, 0, 1)",
                    borderRadius: "10px",
                    border: "2px solid #000000",
                  }}
                >
                  Proceed to Pay
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCredits;
