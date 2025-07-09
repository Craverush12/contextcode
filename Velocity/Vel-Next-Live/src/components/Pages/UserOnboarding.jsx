"use client";

import { useState, useCallback, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import Image from "next/image";

import { useRouter } from "next/navigation";
import Webstore from "./webstore";

export default function UserOnboarding() {
  const [formData, setFormData] = useState({
    llmPlatform: "",
    occupation: "",
    source: "",
    socialPlatform: "",
    customOccupation: "",
    extensionInstalled: null,
  });

  const [errorMessages, setErrorMessages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Start with step 1
  const [highestStepReached, setHighestStepReached] = useState(1); // Track the furthest step reached
  const [showWebstore, setShowWebstore] = useState(false);
  const [userName, setUserName] = useState("there");
  const router = useRouter();

  // Load saved state on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load user name
      const storedName =
        localStorage.getItem("user_name") || localStorage.getItem("name");
      if (storedName) {
        setUserName(storedName);
      }

      // Load webstore visibility state
      const webstoreVisible =
        localStorage.getItem("webstoreVisible") === "true";
      setShowWebstore(webstoreVisible);

      // Load saved form data
      const savedFormData = localStorage.getItem("onboardingFormData");
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setFormData(parsedData);
        } catch (error) {
          console.error("Error parsing saved form data:", error);
        }
      }

      // Load saved progress
      const savedStep = localStorage.getItem("onboardingCurrentStep");
      const savedHighestStep = localStorage.getItem("onboardingHighestStep");

      if (savedStep) {
        setCurrentStep(parseInt(savedStep, 10));
      }

      if (savedHighestStep) {
        setHighestStepReached(parseInt(savedHighestStep, 10));
      }
    }
  }, []);

  // Save step progress whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("onboardingCurrentStep", currentStep.toString());
      localStorage.setItem(
        "onboardingHighestStep",
        highestStepReached.toString()
      );
    }
  }, [currentStep, highestStepReached]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get userId from localStorage (assuming it's stored during login/signup)
      const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
      
      if (!userId) {
        console.error("User ID not found");
        // You might want to redirect to login or show an error
        setIsLoading(false);
        return;
      }

      // Prepare API payload
      const apiPayload = {
        userId: userId,
        llmPlatform: formData.llmPlatform,
        occupation: formData.occupation === "other" ? formData.customOccupation : formData.occupation,
        source: formData.source === "social" ? `${formData.source}-${formData.socialPlatform}` : formData.source,
        problems_faced: formData.aiStruggle || null,
        use_case: formData.useCase || null,
      };

      // Call the onboarding API
      const response = await fetch("https://thinkvelocity.in/backend-V1-D/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Onboarding data submitted successfully:", result);

      // Store the form data in localStorage for backup
      if (typeof window !== "undefined") {
        localStorage.setItem("onboardingData", JSON.stringify(formData));
        localStorage.setItem("onboardingFormData", JSON.stringify(formData));
        localStorage.setItem("onboardingCompleted", "true");
      }

      // Redirect to extension download page
      router.push("/extension-download");
    } catch (error) {
      console.error("Error submitting onboarding data:", error);
      // You might want to show an error message to the user
      setErrorMessages({ submit: "Failed to submit data. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    const updatedFormData = { ...formData, [field]: value };

    // Handle special cases for source and occupation
    if (field === "source" && value !== "social") {
      updatedFormData.socialPlatform = "";
    }
    if (field === "occupation" && value !== "other") {
      updatedFormData.customOccupation = "";
    }

    // Update state
    setFormData(updatedFormData);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "onboardingFormData",
        JSON.stringify(updatedFormData)
      );
    }
  };

  // Progress bar component for the left column
  const ProgressBar = ({ label, color, completed, isMobile }) => {
    return (
      <div className="flex flex-col">
        <span
          className={`${isMobile ? "text-xs" : "text-lg"} font-medium mb-${
            isMobile ? "1" : "2"
          } text-left`}
        >
          {label}
        </span>
        <div
          className={`${
            isMobile ? "w-20 h-1" : "w-32 h-2"
          } bg-white border border-black rounded-full`}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${completed}%`,
              backgroundColor: color,
            }}
          ></div>
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    return (
      <>
        <h2 className="text-xl text-black font-bold text-left mb-6">
          Help Us Learn About You
        </h2>

        {/* Occupation */}
        <div className="mb-8 flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-3">
            I work in
          </span>
          <div className="flex-1">
            <select
              value={formData.occupation}
              onChange={handleChange("occupation")}
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Your Role
              </option>
              <option value="student">Student</option>
              <option value="engineer">Engineer</option>
              <option value="developer">Software Developer</option>
              <option value="marketing">Marketing</option>
              <option value="hr">HR</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {formData.occupation === "other" && (
          <div className="mb-8 ml-[calc(40px+0.75rem)]">
            <input
              type="text"
              placeholder="Please specify"
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
              value={formData.customOccupation || ""}
              onChange={handleChange("customOccupation")}
            />
          </div>
        )}

        {/* AI Platform */}
        <div className="mb-8 flex items-center flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-3">
            I mostly use
          </span>
          <div className="flex-1 mr-2">
            <select
              value={formData.llmPlatform}
              onChange={handleChange("llmPlatform")}
              className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Choose an AI you use
              </option>
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          <span className="text-sm font-medium text-gray-700 mx-2">for</span>

          <div className="flex-1 mt-2 sm:mt-0">
            <select
              value={formData.useCase || ""}
              onChange={handleChange("useCase")}
              className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Use Case
              </option>
              <option value="writing">Writing</option>
              <option value="coding">Coding</option>
              <option value="research">Research</option>
              <option value="creativity">Creative Work</option>
            </select>
          </div>
        </div>

        {/* AI Struggles */}
        <div className="mb-8 flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-3">
            I struggle with AI because
          </span>
          <div className="flex-1">
            <select
              value={formData.aiStruggle || ""}
              onChange={handleChange("aiStruggle")}
              className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Target Problem
              </option>
              <option value="prompting">Hard to craft prompts</option>
              <option value="context">Limited context window</option>
              <option value="knowledge">Outdated knowledge</option>
              <option value="time">Takes too much time</option>
            </select>
          </div>
        </div>

        {/* Source */}
        <div className="mb-8 flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-3">
            I found this tool through
          </span>
          <div className="flex-1">
            <select
              value={formData.source}
              onChange={handleChange("source")}
              className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Tell us how you found us
              </option>
              <option value="social">Social Media</option>
              <option value="community">Community</option>
              <option value="referred">Referral</option>
              <option value="search">Search Engine</option>
              <option value="producthunt">Product Hunt</option>
            </select>
          </div>
        </div>

        {formData.source === "social" && (
          <div className="mb-8 ml-[calc(40px+0.75rem)]">
            <select
              value={formData.socialPlatform}
              onChange={handleChange("socialPlatform")}
              className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full px-3 py-2 border border-gray-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-sm text-xs"
              style={{
                boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                border: "1px solid rgb(0, 0, 0)",
                height: "40px",
                paddingRight: "30px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
              }}
            >
              <option value="" disabled>
                Which social platform?
              </option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
        )}

        {/* Error Message */}
        {errorMessages.submit && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errorMessages.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-10">
          <button
            type="submit"
            className="w-full bg-[#00C2FF] hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-nonetext-black font-medium py-3 rounded-full hover:bg-[#00B3F0] transition-colors duration-300"
            disabled={isLoading}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
            }}
            style={{
              border: "2px solid #000000",
              boxShadow: "2px 2px 1px rgb(0, 0, 0)",
            }}
          >
            {isLoading ? "Processing..." : "Continue"}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#CDF6FE" }}>
      <div className="min-h-screen flex items-stretch">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left Column */}
          <div className="hidden md:flex md:w-1/2 flex-col justify-center px-8 md:px-16 lg:px-24 py-10">
            {/* Progress Bars */}
            <div className="mb-8">
              <div className="flex space-x-6 text-black">
                <ProgressBar
                  label="Create Profile"
                  color="#000000"
                  completed={100}
                  isMobile={false}
                />
                <ProgressBar
                  label="Customize"
                  color="#000000"
                  completed={100}
                  isMobile={false}
                />
                <ProgressBar
                  label="Chrome Extension"
                  color="#000000"
                  completed={0}
                  isMobile={false}
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-black font-bold mb-4">
                Help us learn about you
              </h2>
              <p className="text-gray-800 text-base md:text-lg">
                No prompt expertise needed, just tell us a bit about yourself
                and get started!
              </p>
            </div>

            {/* AI Platform Logos */}
            <div className="mt-6">
              <p className="text-lg text-black font-medium mb-4">
                Works Where You Work
              </p>
              <div className="flex flex-wrap gap-4">
                {/* First row - 4 logos */}
                <div className="flex gap-4 w-full mb-4">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Gemini-Logo.png"
                    width={150}
                    height={45}
                    alt="Gemini logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Grok-Logo.png"
                    width={120}
                    height={45}
                    alt="Grok logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/ChatGPT-Logo.png"
                    width={150}
                    height={45}
                    alt="ChatGPT logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Claude.png"
                    width={120}
                    height={45}
                    alt="Claude logo"
                    className="h-12 w-auto"
                  />
                </div>

                {/* Second row - 3 logos */}
                <div className="flex gap-4 w-full">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Bolt-Logo.png"
                    width={150}
                    height={45}
                    alt="Bolt logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Perplexity-Logo.png"
                    width={150}
                    height={45}
                    alt="Perplexity logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Vercel-Logo.png"
                    width={150}
                    height={45}
                    alt="Vercel logo"
                    className="h-12 w-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Onboarding Form */}
          <div className="w-full md:w-1/2 flex flex-col justify-center p-4">
            {/* Mobile only progress bar - replaces welcome text */}
            <div className="md:hidden mt-4 mb-4 px-4">
              <div className="flex justify-start space-x-2 text-black">
                <ProgressBar
                  label="Create Profile"
                  color="#000000"
                  completed={100}
                  isMobile={true}
                />
                <ProgressBar
                  label="Customize"
                  color="#000000"
                  completed={100}
                  isMobile={true}
                />
                <ProgressBar
                  label="Chrome Extension"
                  color="#000000"
                  completed={0}
                  isMobile={true}
                />
              </div>
            </div>

            <div className="flex justify-center items-center w-full">
              <div
                className="bg-white rounded-lg px-4 sm:px-8 py-8 sm:py-10 w-11/12 sm:w-4/5 md:w-[90%] max-w-lg"
                style={{
                  borderRadius: "10px",
                  boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
                  border: "1px solid rgb(0, 0, 0)",
                  height: "500px",
                  overflowY: "auto",
                }}
              >
                <form onSubmit={handleSubmit} className="space-y-10">
                  {renderQuestions()}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
