import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Chatgpt_icon from "../assets/Chatgpt_icon.png";
import Claude_icon from "../assets/Claude_icon.png";
import Gemini_icon from "../assets/Gemini_icon.png";

function LLMOption({ embedded = false }) {
  const searchParams = useSearchParams();

  // Determine whether the modal should display
  const [isVisible, setIsVisible] = useState(false);

  // Add check for desktop screen
  const [isDesktop, setIsDesktop] = useState(false);

  // AI platform data with names and URLs
  const platforms = [
    {
      name: "ChatGPT",
      url: "https://chat.openai.com",
      icon: "https://thinkvelocity.in/next-assets/Chatgp_Sm_LOGO.png",
    },
    {
      name: "Claude",
      url: "https://claude.ai",
      icon: "https://thinkvelocity.in/next-assets/claude_icon.png",
    },
    {
      name: "Gemini",
      url: "https://gemini.google.com",
      icon: "https://thinkvelocity.in/next-assets/gemini_icon.png",
    },
    {
      name: "Perplexity",
      url: "https://www.perplexity.ai",
      icon: "https://thinkvelocity.in/next-assets/peplixity_Icon.png",
    },
    {
      name: "Grok",
      url: "https://grok.com",
      icon: "https://thinkvelocity.in/next-assets/grok_icon.png",
    },
    {
      name: "Bolt",
      url: "https://bolt.new",
      icon: "https://thinkvelocity.in/next-assets/Bolt_icon.png",
    },
    {
      name: "Vercel",
      url: "https://v0.dev",
      icon: "https://thinkvelocity.in/next-assets/Vercel_icon.png",
    },
    {
      name: "Gamma",
      url: "https://gamma.app/create/generate",
      icon: "https://thinkvelocity.in/next-assets/Gamma_icon.png",
    },
    {
      name: "Lovable",
      url: "https://lovable.dev",
      icon: "https://thinkvelocity.in/next-assets/lovable_icon.png",
    },
  ];

  // Calculate how many platforms to show per column (aiming for 3 per column)
  const platformsPerColumn = 3;

  // Initialize on client-side only
  useEffect(() => {
    // Check for showLLMOption URL parameter
    const showLLMOption = searchParams.get("showLLMOption");

    // Set initial visibility based on URL param or localStorage
    setIsVisible(
      showLLMOption === "true" || !localStorage.getItem("llmOptionShown")
    );

    // Set initial desktop state
    setIsDesktop(window.innerWidth >= 1024);

    // Add event listener for window resize
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [searchParams]);

  const handleClose = () => {
    // Set flag so that it does not show again, even if the user manually closes it.
    localStorage.setItem("llmOptionShown", "true");
    setIsVisible(false);
  };

  // Helper to close the modal and open the given URL in a new tab.
  const openLLM = (url) => {
    handleClose();
    window.open(url, "_blank");
  };

  // If not desktop or already dismissed, don't render anything
  if (!isDesktop || !isVisible) return null;

  // Adjust overlay style based on the `embedded` prop
  const overlayStyle = {
    position: embedded ? "absolute" : "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    backdropFilter: "blur(5px)",
    backgroundColor: "rgba(0, 0, 0, 0.3)", // semi-transparent overlay for better effect
    zIndex: embedded ? 100 : 9999998,
  };

  // Calculate number of columns needed
  const numColumns = Math.ceil(platforms.length / platformsPerColumn);

  // Prepare columns array
  const columns = [];
  for (let i = 0; i < numColumns; i++) {
    const startIdx = i * platformsPerColumn;
    const endIdx = Math.min(startIdx + platformsPerColumn, platforms.length);
    columns.push(platforms.slice(startIdx, endIdx));
  }

  // Adjust modal container style based on the mockup with solid black border
  const modalStyle = {
    position: embedded ? "absolute" : "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#CDF6FE",
    color: "#000000",
    padding: "20px",
    borderRadius: "16px",
    zIndex: embedded ? 111 : 9999999,
    fontFamily: "Arial, sans-serif",
    width: "650px",
    height: "300px",
    border: "2px solid #000000",
    boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
    textAlign: "center",
  };

  // Styling for option buttons based on mockup
  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    padding: "10px 15px",
    margin: "6px",
    backgroundColor: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "180px",
    textAlign: "left",
    fontSize: "16px",
    fontWeight: "500",
    transition: "background-color 0.2s ease",
  };

  // Styling for the close button
  const closeButtonStyle = {
    position: "absolute",
    top: "10px",
    right: "15px",
    background: "transparent",
    border: "none",
    color: "#000",
    fontSize: "24px",
    cursor: "pointer",
    fontWeight: "bold",
  };

  return (
    <>
      {/* Overlay to blur background */}
      <div style={overlayStyle}></div>

      {/* Modal Content */}
      <div style={modalStyle}>
        <button style={closeButtonStyle} onClick={handleClose}>
          &times;
        </button>

        <h2
          className="font-dm-sans"
          style={{
            fontSize: "28px",
            fontWeight: "900",
            marginBottom: "20px",
            color: "#152A32",
            textAlign: "center",
            paddingBottom: "5px",
          }}
        >
          Choose Your Platform
        </h2>

        {/* Columns layout for platform options */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {columns.map((column, colIndex) => (
            <div
              key={colIndex}
              style={{ display: "flex", flexDirection: "column" }}
            >
              {column.map((platform, platformIndex) => (
                <button
                  key={platformIndex}
                  style={{
                    ...buttonStyle,
                    backgroundColor:
                      platform.name === "ChatGPT" ? "#e6f7ff" : "#ffffff",
                  }}
                  onClick={() => openLLM(platform.url)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      platform.name === "ChatGPT" ? "#d4f1ff" : "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      platform.name === "ChatGPT" ? "#e6f7ff" : "#ffffff";
                  }}
                >
                  <span
                    style={{
                      marginRight: "10px",
                      fontSize: "18px",
                      minWidth: "24px",
                      textAlign: "center",
                    }}
                  >
                    {platform.icon.startsWith("http") ? (
                      <img
                        src={platform.icon}
                        alt={platform.name}
                        style={{
                          width: "24px",
                          height: "24px",
                          objectFit: "contain",
                          filter:
                            platform.name === "Vercel"
                              ? "brightness(0)"
                              : "none",
                        }}
                      />
                    ) : (
                      platform.icon
                    )}
                  </span>
                  {platform.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default LLMOption;
