import React, { useState, useEffect, useRef } from "react";
import SignupVerification from "./SignupVerification";
import { Copy, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";
import GaugeMeter from "./ProgressIndicator";

// Card component for analysis results
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-[#121212] border border-[#1E1E1E] rounded-lg p-4 flex ${className}`}
  >
    {children}
  </div>
);

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const ResponseBox = ({
  responseData,
  onReset,
  originalPrompt,
  selectedStyle,
  onProcessingComplete,
  isProcessingInBackground,
}) => {
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [displayedPrompt, setDisplayedPrompt] = useState(""); // For streaming effect
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const [autoRotateMetrics, setAutoRotateMetrics] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false); // Initially false to allow streaming
  const [pendingResponseData, setPendingResponseData] = useState(null);
  const [trialCount, setTrialCount] = useState(null);
  const [verificationCompleted, setVerificationCompleted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [modalOpacity, setModalOpacity] = useState(0); // State for modal opacity

  const rotationTimerRef = useRef(null);
  const inputAreaRef = useRef(null);
  const verificationAttemptedRef = useRef(false);
  const streamIntervalRef = useRef(null);
  const verificationTimerRef = useRef(null);

  const metrics = ["Action", "Context", "Example", "Result"];

  useEffect(() => {
    if (responseData) {
      // console.log("Received responseData:", responseData); // Debug log
      const prompt = responseData.enhanced?.enhanced_prompt || "No enhanced prompt available";
      setEnhancedPrompt(prompt);
      setAnalysisData(responseData);
      setPendingResponseData(responseData);
      startStreaming(prompt); // Start streaming with the prompt
      setModalOpacity(1); // Set opacity to 1 to trigger fade-in
    } else {
      console.error("No responseData received");
    }
  }, [responseData]);

  // Start streaming enhanced prompt immediately
  const startStreaming = (text) => {
    if (text && !isStreaming) {
      setIsStreaming(true);
      setDisplayedPrompt(""); // Reset to empty before streaming

      let currentIndex = 0;

      streamIntervalRef.current = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedPrompt(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(streamIntervalRef.current);
          setIsStreaming(false);
        }
      }, 20); // Speed: 50ms per character

      // Trigger verification check after 2-3 seconds
      verificationTimerRef.current = setTimeout(() => {
        if (!verificationAttemptedRef.current) {
          verificationAttemptedRef.current = true;
          setIsVerifying(true);
          checkTrialAvailability();
        }
      }, 2000); // 2-second delay

      return () => {
        clearInterval(streamIntervalRef.current);
        clearTimeout(verificationTimerRef.current);
      };
    } else {
      console.error("No text to stream or already streaming");
    }
  };

  useEffect(() => {
    if (analysisData && autoRotateMetrics) {
      if (!activeMetric) {
        rotationTimerRef.current = setTimeout(() => {
          setActiveMetric(metrics[0]);
        }, 500);
        return;
      }

      rotationTimerRef.current = setTimeout(() => {
        const currentIndex = metrics.indexOf(activeMetric);
        const nextIndex = (currentIndex + 1) % metrics.length;
        setActiveMetric(metrics[nextIndex]);
      }, 3000);

      return () => {
        if (rotationTimerRef.current) {
          clearTimeout(rotationTimerRef.current);
        }
      };
    }
  }, [analysisData, activeMetric, autoRotateMetrics]);

  useEffect(() => {
    if (verificationCompleted && pendingResponseData) {
      finalizeResponse();
    }
  }, [verificationCompleted, pendingResponseData]);

  const handleMetricClick = (metric) => {
    setAutoRotateMetrics(false);
    setActiveMetric(metric);
  };

  const fetchTrialCount = async () => {
    try {
      const response = await fetch(
        "https://thinkvelocity.in/post/check-free-trial",
        // "https://thinkvelocity.in/api/api/users/check-free-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await response.json();
      // console.log("Trial count response:", data); // Debug log
      if (data.success && data.threshold !== undefined) {
        setTrialCount(data.threshold);
        return data.threshold;
      }
      return null;
    } catch (error) {
      console.error("Error fetching trial count:", error);
      return null;
    }
  };

  const decrementTrial = async () => {
    try {
      const response = await fetch(
        "https://thinkvelocity.in/post/decrement-trial",
        // "https://thinkvelocity.in/api/api/users/decrement-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await response.json();
      // console.log("Decrement trial response:", data); // Debug log
      if (data.success) {
        const newCount = await fetchTrialCount();
        if (newCount === null) {
          console.error("Failed to fetch updated trial count");
        }
      } else {
        console.error("Decrement failed:", data);
      }
    } catch (error) {
      console.error("Error decrementing trial:", error);
    }
  };

  const checkTrialAvailability = async () => {
    try {
      const trialResponse = await fetch(
        "https://thinkvelocity.in/post/check-free-trial",
        // "https://thinkvelocity.in/api/api/users/check-free-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const trialData = await trialResponse.json();
      // console.log("Trial check response:", trialData); // Debug log
      if (trialData.success && trialData.threshold !== undefined) {
        setTrialCount(trialData.threshold);
        if (trialData.threshold === 0) {
          setIsTrialExpired(true);
          setIsModalOpen(true);
          return;
        }
        await decrementTrial();
        setVerificationCompleted(true);
      } else if (trialData.message === "No free trial token found.") {
        setIsTrialExpired(false);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error checking trial availability:", error);
      setIsModalOpen(true);
    }
  };

  const handleVerificationSuccess = async () => {
    setIsModalOpen(false);
    setModalOpacity(1); // Set opacity to 1 to trigger fade-in
    try {
      const newCount = await fetchTrialCount();
      if (newCount !== null && newCount > 0) {
        await decrementTrial();
      }
      setVerificationCompleted(true);
    } catch (error) {
      console.error("Error post-verification:", error);
      setVerificationCompleted(true);
    }
  };

  const finalizeResponse = () => {
    setIsVerifying(false);
    onProcessingComplete && onProcessingComplete();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(enhancedPrompt); // Copy full text
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleEnhanceAgain = () => {
    onReset();
  };

  return (
    <div id="responsebox" className="relative pb-0" style={{ opacity: modalOpacity, transition: 'opacity 3s ease-in' }}>
      <div id="responsearea" className="space-y-6 pt-28 sm:pt-36 pb-16 sm:pb-16">
        <div className="text-center space-y-2 mb-4 sm:mb-8">
          <h1 className="font-[Amenti] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center text-white">
            Enhanced Prompt
          </h1>
          <p className="font-[Amenti] text-gray-400 text-xs sm:text-sm">
            {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} style enhancement complete
            {trialCount !== null && !isVerifying && ` - ${trialCount} ${trialCount === 1 ? 'trial' : 'trials'} remaining`}
          </p>
        </div>

        <div
          id="response-box"
          className="relative max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4"
        >
          <div className="relative p-4" ref={inputAreaRef}>
            <textarea
              value={displayedPrompt} // Use displayedPrompt for streaming
              onChange={(e) => setDisplayedPrompt(e.target.value)} // Allow editing after streaming
              placeholder="Enhanced prompt"
              className="w-full h-24 sm:h-40 bg-[#121212] border border-[#1E1E1E] rounded-xl p-3 sm:p-4 text-white 
                placeholder:text-gray-500 text-xs sm:text-base focus:outline-none focus:border-[#008ACB] resize-none"
              disabled={isVerifying || isStreaming} // Disable while streaming or verifying
            />

            <div className="flex justify-end space-x-2 md:space-x-3 lg:space-x-4 mt-4">
              <button
                type="button"
                onClick={handleCopyPrompt}
                 onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '2px 2px 1px rgb(0, 0, 0)';
                        }}
                disabled={isVerifying || isStreaming}
                className="px-3 md:px-4 flex justify-center items-center bg-gray-700 text-white rounded-lg md:rounded-xl text-xs md:text-sm py-2 md:py-2 font-medium transition-all hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {copySuccess ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleEnhanceAgain}
                disabled={isVerifying || isStreaming}
                className="px-3 md:px-4 flex justify-center items-center bg-[#008ACB] text-white rounded-lg md:rounded-xl text-xs md:text-sm py-2 md:py-2 font-medium transition-all hover:bg-[#0099E6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Try Again
              </button>
            </div>

            {isVerifying && (
              <div className="absolute inset-0 border border-gray-900/80 backdrop-blur-sm bg-black/60 rounded-xl z-10 flex items-center justify-center">
                {isModalOpen && (
                  <div className="w-11/12 max-w-md" style={{ opacity: modalOpacity, transition: 'opacity 3s ease-in' }}>
                    <SignupVerification
                      isOpen={isModalOpen}
                      onClose={() => {
                        setIsModalOpen(false);
                        setVerificationCompleted(true);
                      }}
                      onVerify={handleVerificationSuccess}
                      isTrialExpired={isTrialExpired}
                      message={
                        isTrialExpired
                          ? "Your free trial has expired. Please extend your trial or subscribe to continue enhancing prompts."
                          : "Please verify your email to start your free trial."
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {analysisData ? (
            <div className={`mt-4 space-y-6`}>
              <Card className="w-full flex-col">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-[40%]">
                    <h4 className="font-[Amenti] text-sm font-semibold text-blue-400 mb-2">
                      Suggested Platform
                    </h4>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 text-gray-200 text-sm sm:text-base lg:text-lg">
                      {analysisData.suggested?.platform || "N/A"}
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 text-gray-200 text-sm sm:text-base lg:text-lg mt-2">
                      {analysisData.suggested?.reason || "No reason provided"}
                    </div>
                  </div>

                  <div className="w-full md:w-[60%] flex flex-col gap-4">
                    <div>
                      <h4 className="font-[Amenti] text-md font-semibold text-blue-400 mb-2">
                        Analysis
                      </h4>
                      <div className="grid grid-cols-4 sm:flex flex-row justify-center gap-2">
                        {metrics.map((metric) => (
                          <div
                            key={metric}
                            onClick={() => handleMetricClick(metric)}
                            className={`cursor-pointer border rounded-lg p-1 transition-all duration-300 ${
                              activeMetric === metric
                                ? "border-[#00A3FF] bg-[#00A3FF]/20 shadow-md shadow-[#00A3FF]/40"
                                : "border-white/50"
                            }`}
                          >
                            <GaugeMeter
                              value={Math.min(
                                Math.max(
                                  analysisData.analyzed?.metrics?.[metric] || 0,
                                  0
                                ),
                                10
                              )}
                              maxValue={10}
                              label={metric}
                              className="text-lg sm:text-xl md:text-2xl font-[Amenti]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#008ACB80] rounded-lg p-6">
                      <h4 className="font-[Amenti] text-base sm:text-lg lg:text-xl font-semibold text-center text-white mb-2">
                        Recommendations
                      </h4>
                      <div className="text-gray-200 text-sm sm:text-base lg:text-lg transition-opacity duration-300 min-h-[150px]">
                        {activeMetric
                          ? analysisData.analyzed?.recommendations?.[
                              `${activeMetric.toLowerCase()}_improvement`
                            ] || "No recommendations available"
                          : "Select a metric to see recommendations"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

ResponseBox.propTypes = {
  responseData: PropTypes.object.isRequired,
  onReset: PropTypes.func.isRequired,
  originalPrompt: PropTypes.string.isRequired,
  selectedStyle: PropTypes.string.isRequired,
  onProcessingComplete: PropTypes.func,
  isProcessingInBackground: PropTypes.bool,
};

export default ResponseBox;