"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Analytics from "@/config/analytics";
import EventTracking from "@/utils/eventTracking";
import Preloader from "@/components/ui/preloader";
import HelpForm from "@/components/HelpForm";
import Marque from "@/components/layout/Marque";
import LaunchlistModal from "@/components/Launchlist";

const Home = () => {
  // const [showTrialModal, setShowTrialModal] = useState(false);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMarquee, setShowMarquee] = useState(false);
  const [showLaunchlist, setShowLaunchlist] = useState(false);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const homeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  // Function to handle closing the launchlist modal
  const handleCloseLaunchlist = () => {
    setShowLaunchlist(false);
    localStorage.setItem("hasJoinedLaunchlist", "true");
  };

  // Function to handle successful join
  const handleSuccessfulJoin = () => {
    // This function is called when a user successfully joins the launchlist
    // No need to do anything extra as the component already sets localStorage
  };

  const handleTryNow = (e) => {
    if (localStorage.getItem("verifiedUserEmail")) {
      window.location.href = "/login";
      return;
    }
    e.preventDefault(); // Prevent default anchor behavior
    Analytics.track("Button Clicked", {
      buttonName: "Try for Free",
    });

    // Scroll to the PromptBox
    const promptBox = document.getElementById("promptarea");
    if (promptBox) {
      promptBox.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Set loading to false after the specified duration
      // Trigger animations after loading is complete
      setTimeout(() => {
        setAnimationsTriggered(true);
      }, 100);
    }, 1000); // Change this value to extend the loading time (e.g., 5000 for 5 seconds)

    return () => clearTimeout(timer);
  }, []);

  // Check if user has already joined the launchlist
  useEffect(() => {
    const hasJoinedLaunchlist = localStorage.getItem("hasJoinedLaunchlist");
    // Only show the launchlist modal if the user hasn't joined already
    if (!hasJoinedLaunchlist) {
      // Small delay to ensure it appears after page load
      const timer = setTimeout(() => {
        setShowLaunchlist(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  // Track page visit when component mounts
  useEffect(() => {
    // Track the website visit event
    EventTracking.trackVisit({
      page: "home",
      section: "landing",
    });
  }, []);

  const handlePlayVideo = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <div
      className="relative min-h-[81vh] sm:min-h-screen w-full overflow-auto bg-[#CDF6FE]"
      ref={homeRef}
    >
      <LaunchlistModal
        isOpen={showLaunchlist}
        onClose={handleCloseLaunchlist}
        onSuccessfulJoin={handleSuccessfulJoin}
      />
      {/* Top-left glow effect */}
      <div className="absolute top-0 left-0 w-[760px] h-[760px] rounded-full bg-[#00C8F0] opacity-40 blur-[142px] -translate-x-1/2 -translate-y-1/2 z-0"></div>

      {/* Bottom-right glow effect */}
      {/* <div className="absolute bottom-0 right-[475px] w-[760px] h-[760px] rounded-full bg-[#00C8F0] opacity-40 blur-[142px] translate-x-1/2 translate-y-1/2 z-0"></div> */}

      {/* Preloader with transition */}
      <div
        className={`fixed inset-0 flex items-center justify-center bg-white z-50 transition-opacity duration-500 ${
          loading ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Preloader />
      </div>

      {/* Content layer with transition */}
      <div
        className={`relative flex flex-col items-center justify-center min-h-[81vh] sm:min-h-screen pt-20 sm:pt-24 md:pt-20 lg:pt-9 px-4 sm:px-6 md:px-4 lg:px-9 z-10 pointer-events-auto transition-opacity duration-500 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Two-column layout container */}
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-7 items-center md:h-auto lg:h-[66vh] mt-[28px] sm:mt-[38px] md:mt-[47px] lg:mt-0">
          {/* Left column with text and button - order is now reversed on mobile */}
          <div className="flex flex-col justify-center h-full space-y-4 sm:space-y-6 md:space-y-6 lg:space-y-7 order-1 md:order-1">
            {/* First row - Co-Pilot text */}
            <div
              className={`relative z-10 flex flex-col items-start text-left fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{ animationDelay: "0.2s" }}
            >
              <h1
                className="text-[1.7rem] xs:text-[1.7rem] sm:text-[1.7rem] md:text-[1.7rem] lg:text-[2.85rem] sm:pb-4 text-black font-dm-sans font-bold"
                style={{
                  color: "#152A32",
                  fontWeight: "900",
                }}
              >
                Prompt Like An Expert
                <br />
                In Just{" "}
                <span className="text-white heading-shadow">One Click</span>
              </h1>
              <p className="hidden sm:block text-black font-dm-sans-semibold text-[0.8rem] xs:text-[0.9rem] sm:text-[1.08rem] md:text-[1.08rem] lg:text-[1.14rem] mt-2 mb-3 sm:mb-6 md:mb-6 lg:mb-9 pl-0 text-left">
                Velocity simplifies prompts, maximizes results, and fuels{" "}
                <br className="hidden lg:block" /> creativity right at the tip
                of your cursor.
              </p>
            </div>

            {/* Second row - Button */}
            <div
              className={`flex flex-row items-center justify-start w-full gap-2 sm:gap-4 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{ animationDelay: "0.4s" }}
            >
              <a
                href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Track the button click event
                  EventTracking.trackButtonClick("Get Extension", {
                    location: "hero_section",
                    destination: "chrome_web_store",
                    source_origin: "landing_page",
                  });

                  // Track redirection to webstore
                  EventTracking.trackRedirectToWebstore("landing_page", {
                    button: "Try For Free",
                    location: "hero_section",
                  });
                }}
                style={{
                  backgroundColor: "white",
                  color: "black",
                  border: "2px solid rgb(0, 0, 0)",
                  borderRadius: "28px",
                  padding: "0.38rem 0.76rem",
                  fontSize: "0.71rem",
                  fontWeight: "bold",
                  display: "inelative",
                  transition: "all 0.3s ease",
                  boxShadow: "2.85px 2.85px 1px rgb(0, 0, 0)",
                }}
                className="hover:translate-x-[2.85px] hover:translate-y-[2.85px] hover:shadow-none"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "2.85px 2.85px 1px rgb(0, 0, 0)";
                }}
              >
                <span className="relative z-10 flex items-center gap-1 font-dm-sans-bold rounded-full">
                  <Image
                    src="https://thinkvelocity.in/next-assets/ChromeLogo.png"
                    alt="Try Now"
                    width={19}
                    height={19}
                    className="w-[1.19rem] h-[1.19rem] sm:w-[1.9rem] sm:h-[1.9rem] lg:w-[2.38rem] lg:h-[2.38rem]"
                  />
                  <span className="text-[0.68rem] sm:text-[0.8rem] lg:text-[0.9rem]">
                    Download<span className="hidden sm:inline"> Extension</span>
                  </span>
                  <span
                    className="inline-flex items-center justify-center ml-1 rounded-full"
                    style={{
                      backgroundColor: "#CDF6FE",
                      width: "30px",
                      height: "30px",
                      boxShadow: "1.9px 1.9px 1.9px black",
                      border: "1px solid black",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </a>

              {/* Product Hunt Badge */}
              <a
                href="https://www.producthunt.com/posts/velocity-8e217b40-841d-4623-885c-c8dcb25c53e1?embed=true&#0045;8e217b40&#0045;841d&#0045;4623&#0045;885c&#0045;c8dcb25c53e1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=960114&theme=neutral&t=1747415990614"
                  alt="Product Hunt Badge"
                  width={114}
                  height={114}
                  className="h-auto w-auto"
                  style={{
                    border: "2px solid black",
                    borderRadius: "28px",
                    boxShadow: "2.85px 2.85px 1px rgb(0, 0, 0)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      "translate(2.85px, 2.85px)";
                    e.currentTarget.style.duration = "0.3s";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.duration = "0.3s";
                    e.currentTarget.style.boxShadow =
                      "2.85px 2.85px 1px rgb(0, 0, 0)";
                  }}
                />
              </a>
            </div>
          </div>

          {/* Right column with video - order now changed to below text on mobile */}
          <div
            className={`relative w-full h-full flex justify-center items-center order-2 md:order-2 mt-7 md:mt-7 lg:mt-0 mb-11 md:mb-11 lg:mb-0 fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{ animationDelay: "0.6s" }}
          >
            {/* Top left KPI badge */}
            <div
              className={`absolute top-1 sm:top-[5.2rem] left-1 sm:left-[-28px] z-10 text-black px-2 py-1 sm:py-2 flex items-center gap-1 sm:gap-2 shadow-lg border-black border-2 rounded-md floating-animation fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                backgroundColor: "#CDF6FE",
                borderRadius: "4.75px",
                animationDelay: "0.8s",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="hidden lg:block"
              >
                <path
                  d="M7 17L17 7M17 7H8M17 7V16"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <span className="font-dm-sans-bold text-[9px] xs:text-[0.68rem] sm:text-[0.8rem]">
                  +40%
                </span>
                <span className="font-dm-sans-semibold text-[7px] xs:text-[0.68rem] block">
                  Productivity
                </span>
              </div>
            </div>

            {/* Video container with thumbnail and play button */}
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "760px",
                aspectRatio: "16/9",
                border: "3.8px solid black",
                boxShadow: "5.7px 5.7px 1px rgb(0, 0, 0)",
                borderRadius: "9.5px",
              }}
            >
              {isPlaying ? (
                <div className="w-full h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    controls
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source
                      src="https://thinkvelocity.in/next-assets/HeroSec.webm"
                      type="video/webm"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div
                  className="relative w-full h-full cursor-pointer flex items-center justify-center"
                  onClick={handlePlayVideo}
                >
                  <Image
                    src="https://thinkvelocity.in/next-assets/5.gif"
                    alt="Video Thumbnail"
                    fill
                    unoptimized
                    priority
                    className="object-cover"
                    style={{ animation: "none" }}
                    loading="eager"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="rounded-full bg-black/50 border-white hover:bg-black/70 p-[0.68rem]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-[1.37rem] w-[1.37rem] text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5.25 5.25l13.5 6.75-13.5 6.75V5.25z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom right KPI badge */}
            <div
              className={`absolute bottom-1 sm:bottom-[5.2rem] right-1 sm:right-[-28px] z-10 text-black px-2 py-1 sm:py-2 border-black border-2 rounded-md flex items-center gap-1 sm:gap-2 shadow-lg floating-animation fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                backgroundColor: "#CDF6FE",
                borderRadius: "4.75px",
                animationDelay: "1.0s",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="hidden lg:block"
              >
                <path
                  d="M13 7H7V13H13V7Z"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 11H11V17H17V11Z"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <span className="font-dm-sans-bold text-[9px] xs:text-[0.68rem] sm:text-[0.8rem]">
                  3x
                </span>
                <span className="font-dm-sans-semibold text-[7px] xs:text-[0.68rem] block">
                  Faster Results
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Marque component below the video */}
      <div className="w-full mt-4 px-4 sm:px-0">
        {/* <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-4 text-center"
        style={{
          color: 'black',
          fontWeight: 'bold',
          fontFamily: 'Amenti',
        }}>Compatible with all your favorite AI tools</h3> */}
        {/* <Marque /> */}
      </div>

      {/* Nvidia Inception Program Badge */}
      <a
        href="https://thinkvelocity.in/"
        target="_blank"
        rel="noopener noreferrer"
        className={`absolute sm:fixed left-4 md:left-7 bottom-4 md:bottom-7 z-20 fade-in-element ${
          animationsTriggered ? "fade-in-visible" : ""
        }`}
        aria-label="Nvidia Inception Program"
        style={{ animationDelay: "1.4s" }}
      >
        <Image
          src="https://thinkvelocity.in/Nvidia_badge.png"
          alt="Nvidia Inception Program Badge"
          width={285}
          height={119}
          className="w-[76px] h-[32px] sm:w-[126px] sm:h-[53px] md:w-[159px] md:h-[66px] lg:w-[190px] lg:h-[79px] object-contain"
          priority={false}
        />
      </a>

      {/* Help Button - Moved outside other containers */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Track the button click event with the new utility
          EventTracking.trackButtonClick("Help", {
            location: "global_fixed",
            action: showHelpForm ? "close" : "open",
            page: "home",
          });
          setShowHelpForm((prev) => !prev);
        }}
        className={`fixed right-4 bottom-4 md:right-7 md:bottom-7 transition-all duration-300 z-20 overflow-hidden hover:translate-x-[4.75px] hover:translate-y-[4.75px] fade-in-element ${
          animationsTriggered ? "fade-in-visible" : ""
        }`}
        style={{
          width: !showHelpForm ? "85px" : "38px", // Adjust width based on state
          height: "38px",
          backgroundColor: "#ffffff",
          color: "black",
          fontWeight: "normal",
          border: "2px solid #000000",
          borderRadius: "19px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          boxShadow: "1.9px 1.9px 1.9px rgba(0, 0, 0, 1)",
          fontSize: "0.83rem",
          animationDelay: "1.8s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "3.8px 3.8px 1px rgb(0, 0, 0)";
        }}
      >
        {!showHelpForm ? (
          <div className="flex items-center justify-center w-full">
            <span className="roll-in-text font-dm-sans-bold">Help</span>
          </div>
        ) : (
          <svg
            className="rotate-animation"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              animation: "rollIn 0.5s ease-out forwards",
            }}
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Help Form Modal */}
      {showHelpForm && <HelpForm onClose={() => setShowHelpForm(false)} />}

      {/* Add this style tag before the closing div of your component */}
      <style jsx>{`
        .heading-shadow {
          text-shadow: -1px -1px 0px #000, 0px -1px 0px #000, 1px -1px 0px #000,
            -1px 0px 0px #000, 1px 0px 0px #000, -1px 1px 0px #000,
            0px 1px 0px #000, 1px 1px 0px #000, 1.9px 1.9px 0px rgba(0, 0, 0, 1);
          letter-spacing: 1.9px;
        }

        /* Fade-in animation styles */
        .fade-in-element {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes rollIn {
          0% {
            transform: rotate(-180deg) scale(0);
            opacity: 0;
          }
          100% {
            transform: rotate(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes rollOut {
          0% {
            transform: rotate(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(180deg) scale(0);
            opacity: 0;
          }
        }

        .roll-in-text {
          animation: rollIn 0.5s ease-out forwards;
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-9.5px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes floatVideo {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-14.25px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .floating-animation {
          animation: float 3s ease-in-out infinite;
        }

        .floating-video {
          animation: floatVideo 4s ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .heading-shadow {
            text-shadow: -1.9px -1.9px 0px #000, -1px -1.9px 0px #000,
              0px -1.9px 0px #000, 1px -1.9px 0px #000, 1.9px -1.9px 0px #000,
              -1.9px -1px 0px #000, 1.9px -1px 0px #000, -1.9px 0px 0px #000,
              1.9px 0px 0px #000, -1.9px 1px 0px #000, 1.9px 1px 0px #000,
              -1.9px 1.9px 0px #000, -1px 1.9px 0px #000, 0px 1.9px 0px #000,
              1px 1.9px 0px #000, 1.9px 1.9px 0px #000,
              3.8px 3.8px 0px rgba(0, 0, 0, 1);
            letter-spacing: 0.95px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
