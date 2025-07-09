import React, { useState, useEffect } from "react";

const EmailVerification = ({ onVerificationComplete }) => {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);

  // Add useEffect to handle browser back button
  useEffect(() => {
    // Push a new state to handle the modal
    window.history.pushState(null, "", window.location.pathname);

    // Handle popstate (back button)
    const handlePopState = (event) => {
      event.preventDefault();
      window.history.pushState(null, "", window.location.pathname);
      // Navigate back to login page
      window.location.href = "/login";
    };

    window.addEventListener("popstate", handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleResendOTP = async () => {
    try {
      setIsLoadingSend(true);
      const response = await fetch(
        // "http://localhost:3000/api/users/send-verification-email",
        "https://thinkvelocity.in/post/send-verification-email",

        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessage("Verification code sent! Please check your email.");
      } else {
        throw new Error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoadingSend(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      setIsLoadingVerify(true);
      const response = await fetch(
        // "http://localhost:3000/api/users/verify-email",
        "https://thinkvelocity.in/post/verify-email",

        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessage("Email verified successfully!");
        setTimeout(() => {
          onVerificationComplete();
        }, 1500);
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoadingVerify(false);
    }
  };

  const handleClose = () => {
    // Navigate back to login page
    window.location.href = "/onboarding";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-black rounded-3xl p-8 max-w-md w-full mx-4 relative shadow-[0_0_15px_rgba(0,138,203,0.5)]">
        {/* Add close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 text-white">
          Verify Your Email
        </h2>

        {/* Get OTP Section */}
        <div className="mb-6">
          <p className="text-gray-400 mb-3">
            Click below to receive a verification code on your email.
          </p>
          <button
            onClick={handleResendOTP}
            disabled={isLoadingSend}
            className="w-full bg-[#008ACB] text-white py-3 rounded-lg hover:bg-[#0099E6] transition-colors mb-4"
          >
            {isLoadingSend ? "Sending..." : "Resend Verification Code"}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-4"></div>

        {/* Enter OTP Section */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <p className="text-gray-400 mb-3">
              Enter the verification code sent to your email:
            </p>
            <p className="text-yellow-500 text-sm mb-3">
              Please do not refresh or exit the page during verification.
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter verification code"
              className="w-full p-3 border rounded-lg text-white bg-gray-900 border-gray-800"
              maxLength={6}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes("success") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoadingVerify || !otp}
            className={`w-full py-3 rounded-lg transition-colors ${
              otp
                ? "bg-[#008ACB] hover:bg-[#0099E6] text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isLoadingVerify ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailVerification;
