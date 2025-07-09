import React, { useState, useEffect } from "react";
import launchlist from "../assets/launchlist.webp";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import Analytics from "../config/analytics";
import EventTracking from "../utils/eventTracking";
import MetaPixel from "../utils/metaPixel";
import Image from "next/image";

const LaunchlistModal = ({ isOpen, onClose, onSuccessfulJoin }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Track when the launchlist modal is shown
  useEffect(() => {
    if (isOpen) {
      // Track modal view in both Mixpanel and Meta Pixel
      Analytics.track("Launchlist Modal Shown", {
        timestamp: new Date().toISOString(),
        page: typeof window !== 'undefined' ? window.location.pathname : '',
      });

      // Track as a custom event in Meta Pixel
      try {
        MetaPixel.trackCustomEvent("LaunchlistModalShown", {
          page: typeof window !== 'undefined' ? window.location.pathname : '',
        });
      } catch (error) {
        console.error('Error tracking LaunchlistModalShown event:', error);
      }
    }
  }, [isOpen]);

  // Check if user has already joined or closed the launchlist
  if (!isOpen || localStorage.getItem("hasJoinedLaunchlist") === "true") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    // Get visitor type and attribution data
    let visitorType = 'First Time Visitor';
    let attributionData = {};

    if (typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('token');
      const hasVisited = !!localStorage.getItem('hasVisitedBefore');

      if (hasToken) {
        visitorType = 'User';
      } else if (hasVisited) {
        visitorType = 'Window Shopper';
      }

      // Get first touch attribution data if available
      try {
        const firstTouchData = localStorage.getItem('first_touch_data');
        if (firstTouchData) {
          attributionData = JSON.parse(firstTouchData);
        }
      } catch (error) {
        console.error('Error parsing first touch data:', error);
      }
    }

    // Track button click with enhanced data
    EventTracking.trackButtonClick("Get Notified", {
      component: "LaunchlistModal",
      email_provided: !!email,
      email_domain: email.split('@')[1] || '',
      visitor_type: visitorType,
      ...attributionData
    });

    try {
      // Track form submission attempt
      Analytics.track("Launchlist Submission Attempt", {
        email_domain: email.split('@')[1] || '',
        timestamp: new Date().toISOString(),
        visitor_type: visitorType
      });

      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/help-us",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Track successful submission in Mixpanel with enhanced data
        Analytics.track("Joined Launchlist", {
          type: "success",
          email,
          email_domain: email.split('@')[1] || '',
          timestamp: new Date().toISOString(),
          visitor_type: visitorType,
          ...attributionData
        });

        // Track lead generation in Meta Pixel
        try {
          MetaPixel.trackCustomEvent("LeadGenerated", {
            category: "newsletter",
            email_domain: email.split('@')[1] || '',
            lead_type: "launchlist"
          });
        } catch (error) {
          console.error('Error tracking LeadGenerated event:', error);
        }

        // Store in localStorage
        localStorage.setItem("hasJoinedLaunchlist", "true");
        localStorage.setItem("launchlistEmail", email);
        localStorage.setItem("launchlistJoinDate", new Date().toISOString());

        // Update UI
        setFeedback({
          type: "success",
          message: "Successfully joined the launch list! 🎉",
        });

        // Call success callback
        onSuccessfulJoin();

        // Close modal after delay
        setTimeout(() => {
          setEmail("");
          onClose();
        }, 1500);
      } else {
        // Track failed submission
        Analytics.track("Launchlist Submission Failed", {
          type: "api_error",
          email,
          email_domain: email.split('@')[1] || '',
          error: data.error || "API Error",
          timestamp: new Date().toISOString(),
          visitor_type: visitorType
        });

        // Track error in Meta Pixel
        try {
          MetaPixel.trackCustomEvent("FormSubmissionError", {
            form_type: "launchlist",
            error_type: "api_error",
            error_message: data.error || "API Error"
          });
        } catch (error) {
          console.error('Error tracking FormSubmissionError event:', error);
        }

        throw new Error(data.error || "Something went wrong");
      }
    } catch (error) {
      // Track error in analytics
      EventTracking.trackError(
        "launchlist_submission_error",
        error.message || "Unknown error",
        {
          email_domain: email.split('@')[1] || '',
          visitor_type: visitorType
        }
      );

      // Update UI with error message
      setFeedback({
        type: "error",
        message: "Oops! Something went wrong. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100 p-2 sm:p-4">
      <div className="relative w-full max-w-2xl mx-auto bg-white rounded-2xl p-4 sm:p-8 border border-gray-800"
        style={{
          border: "2px solid black",
          boxShadow: "6px 6px 2px rgba(0, 0, 0, 1)",
        }}
      >
        <button
          onClick={() => {
            // Track close button click
            EventTracking.trackButtonClick("Close Launchlist Modal", {
              component: "LaunchlistModal",
              action: "dismiss",
              email_entered: email.length > 0
            });

            // Call the original onClose function
            onClose();
          }}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-800 rounded-full"
          aria-label="Close newsletter signup"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Image with Bounce Animation Always Active */}
          <div className="w-32 sm:w-48 md:w-60 flex-shrink-0 animate-bounce">
            <Image
              src={"https://thinkvelocity.in/next-assets/launchlist.webp"}
              alt="Launchlist"
              className="w-full h-full object-contain"
              loading="eager"
              draggable="false"
              layout="responsive"
              width={500}
              height={500}
            />
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4">
            <h2
              className="font-dm-sans text-2xl sm:text-3xl font-bold text-center sm:text-left"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              Join the NewsLetter
            </h2>
            <p
              className="font-dm-sans text-xs sm:text-sm md:text-base text-center sm:text-left"
              style={{
                color: "#152A32",
                fontWeight: "600",
              }}
            >
              Get important launch updates and special recommendations weekly.
            </p>

            {feedback.message && (
              <div
                className={`rounded-lg p-3 sm:p-4 border flex items-center gap-2 transition-all duration-300 text-xs sm:text-sm
                                ${
                                  feedback.type === "success"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : feedback.type === "warning"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-red-100 text-red-800 border-red-200"
                                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                )}
                <p>{feedback.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => {
                  // Track when user focuses on the email input
                  Analytics.track("Launchlist Email Input Focused", {
                    timestamp: new Date().toISOString()
                  });
                }}
                onBlur={() => {
                  // Track when user has entered an email (on blur)
                  if (email.length > 0) {
                    Analytics.track("Launchlist Email Entered", {
                      email_domain: email.split('@')[1] || '',
                      email_length: email.length,
                      has_at_symbol: email.includes('@'),
                      timestamp: new Date().toISOString()
                    });
                  }
                }}
                placeholder="Your Email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#CDF6FE] border border-gray-700 rounded-xl
                                text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
                aria-label="Email address for newsletter"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none bg-[#00C8F0] rounded-full border-1 border-black px-4 sm:px-5 py-2.5 sm:py-3 text-base sm:text-lg flex justify-center items-center gap-2
                                ${
                                  isSubmitting
                                    ? "opacity-70 cursor-not-allowed"
                                    : ""
                                }`}
                style={{
                  border: "1px solid black",
                  boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                  fontWeight: "600",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "3px 3px 1px rgb(0, 0, 0)";
                }}
              >
                {isSubmitting ? "Processing..." : "Get Notified"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchlistModal;
