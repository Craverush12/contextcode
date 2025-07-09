import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

const FeedbackMessage = ({ type, message }) => {
  if (!message) return null;

  const Icon = type === "success" ? CheckCircle : AlertCircle;
  const styles =
    type === "success"
      ? "bg-green-900/30 text-green-300 border-green-700"
      : "bg-red-900/30 text-red-300 border-red-700";

  return (
    <div
      className={`rounded-lg p-2 sm:p-4 border flex items-center gap-1.5 sm:gap-2 animate-fade-in ${styles} text-xs sm:text-sm`}
    >
      <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
      <p className="text-xs sm:text-sm leading-tight">{message}</p>
    </div>
  );
};

const SignupVerification = ({ isOpen, onClose, onVerify, isTrialExpired, message }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent body scrolling when modal is open
    document.body.style.overflow = "auto";
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.body.style.overflow = "auto";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      // First check if the user has free trials remaining
      const checkTrialResponse = await fetch(
        "https://thinkvelocity.in/post/check-free-trial",
        // "https://thinkvelocity.in/api/api/users/check-free-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          withCredentials: true,
        }
      );

      const trialData = await checkTrialResponse.json();
      // console.log("Trial check response:", trialData);

      if (trialData.success && trialData.threshold > 0) {
        // User has free trials remaining, close modal and proceed
        onVerify?.();
        return;
      }

      // If no free trials remaining, proceed with email verification
      const response = await fetch(
        "https://thinkvelocity.in/post/SignupVerification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        }
      );

      const data = await response.json();
      // console.log("Verification data:", data);

      if (response.ok) {
        if (data.success === false) {
          // User already exists, redirect to login
          setRedirecting(true);
          // console.log("Redirecting to login...");
          router.push("/login?accountExists=true");
        } else {
          // Email submitted successfully, we need to check if a cookie was set
          localStorage.setItem("userEmail", email);
          localStorage.setItem("isUserVerified", "true");
          // console.log("Email verified successfully!");
          // setFeedback({
          //   type: "success",
          //   message: "Verification Successful! Enjoy your enhanced prompts.",
          // });

          // Verify the cookie was set
          // console.log("Checking cookies after verification:", document.cookie);
          
          // Give time for success message to be seen
          setTimeout(() => {
            onVerify?.();
          }, 1500);
        }
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setFeedback({
        type: "error",
        message: "Verification failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:px-6">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm pointer-events-none border border-gray-700 rounded-lg"
        onClick={onClose}
      ></div>
      
      <div className="w-full max-w-sm sm:max-w-md bg-[#000000] border border-gray-800 rounded-lg shadow-lg overflow-hidden relative z-20 animate-fade-in">
        {/* <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button> */}
        
        <div className="p-4 sm:p-6 space-y-4">
          {isTrialExpired ? (
            // Content for when trials are exhausted
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Your Free Trial Has Ended
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6">
                Continue enjoying enhanced prompts with our browser extension
              </p>
              <button
                onClick={() =>
                  (window.location.href =
                    "https://chromewebstore.google.com/detail/velocity/ggiecgdncaiedmdnbmgjhpfniflebfpa")
                }
                className="w-full px-1.5 sm:px-5 py-2 sm:py-3 bg-[#008ACB] text-white text-sm sm:text-base rounded-lg 
                  transition-all duration-300 hover:bg-[#0099E6] focus:outline-none 
                  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                  focus:ring-offset-[#121212]"
              >
                Get Extension
              </button>
            </div>
          ) : (
            // Original content for email verification
            <>
              <div className="text-center">
                <h2 className="text-sm sm:text-xl font-bold text-white mb-2">
                  We Have Crafted Your Perfect Prompt...
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Drop in your email to see your prompt!
                </p>
              </div>

              {/* <FeedbackMessage
                type={feedback.type}
                message={feedback.message}
              /> */}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#161b29] border border-gray-700 
                      rounded-lg text-sm sm:text-base text-white placeholder-gray-500 
                      focus:outline-none focus:border-blue-500 focus:ring-1 
                      focus:ring-blue-500 transition-colors"
                    required
                    disabled={isSubmitting || redirecting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || redirecting}
                  className={`w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-[#008ACB] text-white text-sm sm:text-base rounded-lg 
                    transition-all duration-300 focus:outline-none
                    ${
                      isSubmitting || redirecting
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-[#0099E6]"
                    }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Email"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render the modal at the root level for mobile compatibility
  return modalContent;
};

export default SignupVerification;