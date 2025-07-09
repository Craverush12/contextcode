import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Webstore = ({ name = "there" }) => {
  const router = useRouter();
  const [aiPlatform, setAiPlatform] = useState(""); // State to store the AI platform

  useEffect(() => {
    // Get the onboarding data from localStorage
    if (typeof window !== "undefined") {
      try {
        const onboardingData = JSON.parse(
          localStorage.getItem("onboardingData")
        );
        if (onboardingData && onboardingData.llmPlatform) {
          // Set the AI platform from the saved data
          setAiPlatform(formatPlatformName(onboardingData.llmPlatform));
        }
      } catch (error) {
        console.error("Error parsing onboarding data:", error);
      }
    }
  }, []);

  // Function to format platform name for display
  const formatPlatformName = (platform) => {
    const platformMap = {
      chatgpt: "ChatGPT",
      claude: "Claude",
      gemini: "Gemini",
    };
    return platformMap[platform] || platform;
  };

  // Function to handle platform click
  const handlePlatformClick = (e) => {
    if (e) {
      e.preventDefault();
    }

    let url = "";

    switch (aiPlatform.toLowerCase()) {
      case "chatgpt":
        url = "https://chat.openai.com/";
        break;
      case "claude":
        url = "https://claude.ai/";
        break;
      case "gemini":
        url = "https://gemini.google.com/";
        break;
      default:
        url = "https://chat.openai.com/";
    }

    // Open the platform URL in a new tab
    window.open(url, "_blank");

    // Navigate to profile page using Next.js router
    router.push("/profile?showLLMOption=true");
  };

  // Function to handle navigation to profile page
  const handleGetExtension = (e) => {
    if (e) {
      e.preventDefault();
    }

    // Open Chrome Web Store in a new tab
    window.open(
      "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
      "_blank"
    );

    // Navigate to profile page using Next.js router
    router.push("/profile?showLLMOption=true");
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

  // Always render as a standalone page
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#C0F3FD" }}>
      <div className="min-h-screen flex items-stretch">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left Column - Hidden on mobile, visible on desktop */}
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
                  completed={100}
                  isMobile={false}
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-black font-bold mb-4">
                Get Started Instantly
              </h2>
              <p className="text-gray-800 text-base md:text-lg">
                Add The Extension To Unlock Faster, Smarter Prompt Workflows.
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

          {/* Right Column - Extension Card */}
          <div className="w-full md:w-1/2 flex flex-col justify-center p-4">
            {/* Mobile only progress bar */}
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
                  completed={100}
                  isMobile={true}
                />
              </div>
            </div>

            {/* Mobile only title */}
            <div className="md:hidden mb-4 px-4">
              <h2 className="text-2xl text-black font-bold">
                Get Started Instantly
              </h2>
              <p className="text-sm text-gray-800">
                Add The Extension To Unlock Faster Prompting.
              </p>
            </div>

            <div className="flex justify-center items-center w-full">
              <div
                className="bg-white rounded-lg w-11/12 sm:w-4/5 md:w-[90%] max-w-lg"
                style={{
                  borderRadius: "10px",
                  boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
                  border: "1px solid rgb(0, 0, 0)",
                }}
              >
                <div className="px-4 sm:px-8 py-8 sm:py-10 w-full flex flex-col h-full">
                  {/* Row 1: Title */}
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl text-black font-bold text-left mb-3">
                      Get Velocity Extension
                    </h2>
                  </div>

                  {/* Row 2: Extension Preview Card */}
                  <div className="flex-grow mb-6">
                    <div
                      className=" rounded-lg w-full h-[200px] sm:h-[250px] bg-blue-50 flex items-center justify-center relative"
                      style={{
                        border: "3px solid rgb(0, 0, 0)",
                        boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
                        borderRadius: "10px",
                      }}
                    >
                      <div
                        className="absolute"
                        style={{
                          transform: "translateY(23px)",
                        }}
                      >
                        <Image
                          src="https://thinkvelocity.in/next-assets/Get-Extension.png"
                          alt="Velocity Logo"
                          className="object-contain max-w-[90%] max-h-[90%]"
                          width={500}
                          height={300}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Buttons and Terms */}
                  <div className="mt-auto">
                    {/* Download Button */}
                    <div className="mb-4">
                      <button
                        onClick={handleGetExtension}
                        className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full sm:w-64 mx-auto block bg-[#00C2FF] text-black font-medium py-3 rounded-full hover:bg-[#00B3F0] transition-colors duration-300 text-lg"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow =
                            "2px 2px 1px rgb(0, 0, 0)";
                        }}
                        style={{
                          border: "2px solid #000000",
                          boxShadow: "2px 2px 1px rgb(0, 0, 0)",
                        }}
                      >
                        Get It For Free
                      </button>
                    </div>

                    {/* Terms text */}
                    <div className="text-center mb-4">
                      <p className="text-xs text-gray-500">
                        By continuing, you agree to our Terms and Privacy Policy
                      </p>
                    </div>

                    {/* Optional AI Platform Button */}
                    {aiPlatform && (
                      <div className="hidden lg:block text-center">
                        <button
                          onClick={handlePlatformClick}
                          className="text-blue-500 hover:text-blue-600 font-medium text-base"
                        >
                          Already Have Extension?
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Webstore;
