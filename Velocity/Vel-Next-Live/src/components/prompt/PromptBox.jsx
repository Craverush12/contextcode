import React, { useState, useEffect } from "react";
import { AlignLeft, Feather, ArrowDown, AlignCenter } from "lucide-react";
import ResponseBox from "@/components/ResponseBox";
import SkeletonResponseBox from "@/components/ui/skeletonresponse";
import PropTypes from "prop-types";

/* global Promise */

// Utility function to generate a unique request ID
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Validate the input data before making API calls
const validateInputData = (prompt, style) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return false;
  }
  if (!style || typeof style !== 'string') {
    return false;
  }
  return true;
};

// Determine if we're running in development mode
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

// Mock data for development/testing to avoid CORS issues
const getMockResponse = (type, prompt, style) => {
  console.log(`[DEV MODE] Returning mock ${type} data for prompt: "${prompt.substring(0, 30)}..."`);
  
  const mockResponses = {
    enhance: {
      enhancedPrompt: `Enhanced: ${prompt} (${style} style)`,
      score: 0.85,
      metadata: { processingTime: "0.5s", model: "mock-gpt" }
    },
    analyze: {
      clarity: 8,
      specificity: 7,
      creativity: 9,
      context: 6,
      suggestions: ["Add more details", "Be more specific", "Consider adding examples"]
    },
    suggest: {
      variations: [
        `Variation 1: ${prompt} with more details`,
        `Variation 2: ${prompt} with different approach`,
        `Variation 3: A more creative version of ${prompt}`
      ]
    }
  };
  
  return mockResponses[type] || null;
};

const StyleOption = ({
  icon: Icon,
  title,
  description,
  isSelected,
  onClick,
}) => (
  <div
    className={`flex items-start p-4 rounded-lg cursor-pointer transition-all duration-200 border 
      ${
        isSelected
          ? "border-blue-400 bg-gray-700/40"
          : "border-gray-700/45 bg-gray-900/45"
      } 
      hover:border-blue-400/80 hover:bg-gray-800`}
    onClick={onClick}
  >
    <Icon
      className={`w-6 h-6 mr-3 ${
        isSelected ? "text-blue-500" : "text-gray-400"
      }`}
    />
    <div>
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 leading-snug hidden sm:block">
        {description}
      </p>
    </div>
  </div>
);

// Add prop types validation for StyleOption
StyleOption.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const PromptBox = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("descriptive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  // Check if we should use mock data in development mode
  useEffect(() => {
    if (isDevelopment()) {
      // Check if we want to use mock data or real API
      // You can toggle this based on your needs
      const shouldUseMockData = false; // Set to false to use real API in dev
      setUseMockData(shouldUseMockData);
      
      if (shouldUseMockData) {
        console.log("[DEV MODE] Using mock data for API responses");
      }
    }
  }, []);

  const styles = [
    {
      id: "descriptive",
      icon: AlignLeft,
      title: "Descriptive",
      description: "Adds detailed context",
    },
    {
      id: "creative",
      icon: Feather,
      title: "Creative",
      description: "Inspires unique, artistic outputs",
    },
    {
      id: "professional",
      icon: ArrowDown,
      title: "Professional",
      description: "Delivers polished, formal results",
    },
    {
      id: "concise",
      icon: AlignCenter,
      title: "Concise",
      description: "Focuses on brevity and clarity",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (prompt.trim() === "") {
      setNotification("Please enter a prompt before generating.");
      return;
    }

    if (!selectedStyle) {
      setNotification("Please select a writing style.");
      return;
    }

    // Validate input data
    if (!validateInputData(prompt, selectedStyle)) {
      setNotification("Invalid input data. Please check your prompt and style.");
      return;
    }

    setNotification("");
    setIsGenerating(true);
    setIsLoading(true);
    
    // Start API calls immediately in the background
    try {
      const data = await startBackgroundProcessing();
      if (data) {
        setResponseData(data);
      } else {
        setNotification("Failed to generate response. Please try again.");
        setIsGenerating(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during prompt generation:", error);
      setNotification(`Error: ${error.message || "An error occurred. Please try again."}`);
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const startBackgroundProcessing = async () => {
    try {
      // Create array to track individual response status
      const responsePromises = [
        enhancePromptResponse(),
        analyzePromptResponse(),
        suggestPromptResponse()
      ];

      // Wait for all responses to complete
      const results = await Promise.allSettled(responsePromises);
      
      // Log the status of each promise for debugging
      console.log("API response statuses:", results.map(r => r.status));
      
      // Extract successful responses
      const [enhancedData, analyzedData, suggestedData] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );

      // Check if we have valid data
      if (!enhancedData && !analyzedData && !suggestedData) {
        throw new Error("Failed to get valid response data");
      }

      // Store the response data
      const responseData = {
        enhanced: enhancedData,
        analyzed: analyzedData,
        suggested: suggestedData,
        originalPrompt: prompt,
        style: selectedStyle
      };
      
      return responseData;
    } catch (error) {
      console.error("Error generating responses in background:", error);
      return null;
    }
  };

  // Get auth token from secure storage - using localStorage as specified to maintain functionality
  // Note: For production, consider using HTTP-only cookies or NextAuth.js for better security
  const getAuthToken = () => {
    try {
      return localStorage.getItem('authToken') || null;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  };

  // Common function to create request headers with security enhancements
  const createSecureHeaders = () => {
    // Keep it simple - only use headers that won't break the existing API
    const headers = {
      "Content-Type": "application/json",
      "X-Request-Id": generateRequestId(),
    };

    // Only add auth token if it exists - don't break existing functionality
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      // Continue without auth token if there's an error
    }

    return headers;
  };

  const enhancePromptResponse = async () => {
    try {
      // If in development and using mock data, return mock response
      if (useMockData) {
        return getMockResponse('enhance', prompt, selectedStyle);
      }
      
      // Otherwise make the real API call
      const apiUrl = "https://thinkvelocity.in/python-api/enhance";
      
      console.log("Calling enhance API:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: createSecureHeaders(),
        body: JSON.stringify({
          prompt: prompt,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Enhance API error:", response.status, errorText);
        throw new Error(`Network response was not ok (${response.status}): ${errorText}`);
      }
      
      const enhancePromptData = await response.json();
      console.log("Enhance API success");
      return enhancePromptData;
    } catch (error) {
      console.error("Error in enhancePromptResponse:", error);
      // Consider integrating with a logging service like Sentry for error tracking in production
      return null;
    }
  };

  const analyzePromptResponse = async () => {
    try {
      // If in development and using mock data, return mock response
      if (useMockData) {
        return getMockResponse('analyze', prompt, selectedStyle);
      }
      
      // Otherwise make the real API call
      const apiUrl = "https://thinkvelocity.in/python-api/analyze";
      
      console.log("Calling analyze API:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: createSecureHeaders(),
        body: JSON.stringify({
          prompt: prompt,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Analyze API error:", response.status, errorText);
        throw new Error(`Network response was not ok (${response.status}): ${errorText}`);
      }
      
      const analyzePromptData = await response.json();
      console.log("Analyze API success");
      return analyzePromptData;
    } catch (error) {
      console.error("Error in analyzePromptResponse:", error);
      return null;
    }
  };

  const suggestPromptResponse = async () => {
    try {
      // If in development and using mock data, return mock response
      if (useMockData) {
        return getMockResponse('suggest', prompt, selectedStyle);
      }
      
      // Otherwise make the real API call
      const apiUrl = "https://thinkvelocity.in/python-api/suggest";
      
      console.log("Calling suggest API:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: createSecureHeaders(),
        body: JSON.stringify({
          prompt: prompt,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Suggest API error:", response.status, errorText);
        throw new Error(`Network response was not ok (${response.status}): ${errorText}`);
      }
      
      const suggestPromptData = await response.json();
      console.log("Suggest API success");
      return suggestPromptData;
    } catch (error) {
      console.error("Error in suggestPromptResponse:", error);
      return null;
    }
  };

  const resetPrompt = () => {
    setResponseData(null);
    setIsGenerating(false);
    setIsLoading(false);
  };

  return (
    <div id="promptbox-container" className="relative pb-0">
      {/* Show loading indicator while generating */}
      {isLoading && isGenerating && !responseData ? (
        <SkeletonResponseBox />
      ) : responseData ? (
        <ResponseBox 
          responseData={responseData} 
          onReset={resetPrompt}
          originalPrompt={prompt}
          selectedStyle={selectedStyle}
          onProcessingComplete={() => {
            setIsLoading(false);
          }}
          isProcessingInBackground={isGenerating && !isLoading}
        />
      ) : (
        <div id="promptarea" className="space-y-6 pt-28 sm:pt-36 pb-16 sm:pb-16">
          <div className="text-center space-y-2 mb-4 sm:mb-8">
            <h1 className="font-[Amenti] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center text-white">
              Try for Free
            </h1>
            <p className="font-[Amenti] text-gray-400 text-xs sm:text-sm">
              Experience the power of AI-enhanced prompts
            </p>
          </div>
          <div
            id="prompt-box"
            className="relative max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <h3 className="font-[Amenti] text-sm sm:text-lg font-semibold text-white relative pl-4 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 sm:before:h-6 before:bg-blue-500 before:rounded-full">
                Choose Your Style
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-base">
                {styles.map((style) => (
                  <StyleOption
                    key={style.id}
                    icon={style.icon}
                    title={style.title}
                    description={style.description}
                    isSelected={selectedStyle === style.id}
                    onClick={() => setSelectedStyle(style.id)}
                  />
                ))}
              </div>

              {notification && (
                <div className="bg-red-500 text-white p-2 sm:p-3 rounded mb-2 sm:mb-4">
                  {notification}
                </div>
              )}

              <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); // Prevents adding a new line
                      handleSubmit(e); // Calls the same submit handler as the button
                    }
                  }}
                  placeholder="Example: Describe a futuristic cityscape at sunset"
                  className="w-full h-24 sm:h-40 bg-[#121212] border border-[#1E1E1E] rounded-xl p-3 sm:p-4 text-white 
                    placeholder:text-gray-500 text-xs sm:text-base focus:outline-none focus:border-[#008ACB] resize-none"
                />

                <div className="flex justify-end space-x-2 md:space-x-3 lg:space-x-4">
                  <button
                    type="submit"
                    disabled={!prompt || !selectedStyle || isLoading || isGenerating}
                    className="px-4 flex justify-center items-center bg-[#008ACB] text-white rounded-xl text-sm
                      py-2 font-medium transition-all hover:bg-[#0099E6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating || isLoading ? (
                      "Generating..."
                    ) : (
                      <span>
                        <span className="sm:hidden">Enhance</span>
                        <span className="hidden sm:inline">Generate Enhanced Prompt</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptBox;