import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

const HowItWorks = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const componentRef = useRef(null);
  const sectionRef = useRef(null);
  const scrollTimer = useRef(null);
  const autoScrollTimer = useRef(null);
  const totalSteps = 4;

  // Intersection Observer to trigger animations when section comes into view
  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animationsTriggered) {
            // Add a small delay before triggering animations
            setTimeout(() => {
              setAnimationsTriggered(true);
            }, 200);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the section is visible
        rootMargin: "0px 0px -50px 0px", // Trigger a bit before the section is fully visible
      }
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [animationsTriggered]);

  const handleStepChange = (stepNumber) => {
    if (isTransitioning || stepNumber === currentStep) return;
    setIsTransitioning(true);

    // Set the new step
    setCurrentStep(stepNumber);

    // Reset transition state after a small delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Auto scroll functionality
  useEffect(() => {
    if (autoScrollEnabled) {
      autoScrollTimer.current = setInterval(() => {
        if (!isTransitioning) {
          const nextStep = currentStep < totalSteps ? currentStep + 1 : 1;
          handleStepChange(nextStep);
        }
      }, 5000); // Change step every 5 seconds
    }

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentStep, isTransitioning, autoScrollEnabled]);

  // Disable auto-scroll when user interacts
  const pauseAutoScroll = () => {
    setAutoScrollEnabled(false);
    // Re-enable auto-scroll after 30 seconds of inactivity
    setTimeout(() => {
      setAutoScrollEnabled(true);
    }, 30000);
  };

  // Handle scroll events to navigate through steps
  useEffect(() => {
    const handleScroll = (e) => {
      // Only enable scroll navigation on desktop
      if (window.innerWidth < 1024) return;

      // Prevent rapid scroll transitions
      if (isTransitioning) return;

      // Pause auto-scroll when user manually scrolls
      pauseAutoScroll();

      // Clear existing timer
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }

      // Set a small delay to prevent overly sensitive scrolling
      scrollTimer.current = setTimeout(() => {
        const scrollDirection = e.deltaY > 0 ? 1 : -1;
        const nextStep = currentStep + scrollDirection;

        // Make sure the step is within bounds
        if (nextStep >= 1 && nextStep <= totalSteps) {
          handleStepChange(nextStep);
        }
      }, 100);
    };

    // Add wheel event listener to the component
    const componentElement = componentRef.current;
    if (componentElement) {
      componentElement.addEventListener("wheel", handleScroll, {
        passive: false,
      });
    }

    // Cleanup event listener
    return () => {
      if (componentElement) {
        componentElement.removeEventListener("wheel", handleScroll);
      }
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, [currentStep, isTransitioning]);

  return (
    <div className="w-full bg-[#CDF6FE]" ref={sectionRef}>
      {/* Main Container */}
      <div
        className="container mx-auto py-12 px-10 sm:px-6 md:px-16 lg:px-10 max-w-7xl"
        ref={componentRef}
      >
        {/* Row 1: Title */}
        <div className="mb-8 md:mb-12 text-center">
          <h2
            className={`font-dm-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-black text-center fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              color: "#152A32",
              fontWeight: "900",
              animationDelay: "0s",
            }}
          >
            How It Works
          </h2>
        </div>

        {/* Mobile and Tablet View: GIF First */}
        <div className="lg:hidden mb-8 flex justify-center">
          <div
            className={`relative w-full max-w-3xl rounded-xl overflow-hidden bg-white border border-black fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              aspectRatio: "16/9",
              border: "2px solid #000000",
              boxShadow: "6px 6px 2px rgba(0, 0, 0, 0.8)",
              animationDelay: "0.3s",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={`https://thinkvelocity.in/next-assets/${currentStep}.gif`}
                alt={`Step ${currentStep}`}
                className="w-full h-full object-contain transition-opacity duration-300"
                width={800}
                height={450}
                priority
              />
            </div>
          </div>
        </div>

        {/* Steps Container */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6 justify-center items-center">
          {/* Steps Section - Full width on mobile and tablet */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3 sm:gap-2 max-w-2xl mx-auto">
            {/* Step 1 */}
            <div
              className={`bg-[#CDF6FE] border border-[#000000] text-black rounded-xl p-3 sm:p-3 cursor-pointer transition-all duration-300 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              } ${
                currentStep === 1
                  ? "ring-2 ring-blue-500 transform scale-[1.02] bg-white"
                  : "shadow-md"
              }`}
              style={{
                ...(currentStep === 1
                  ? { boxShadow: "8px 8px 0px #000000" }
                  : {}),
                animationDelay: "0.2s",
              }}
              onClick={() => {
                handleStepChange(1);
                pauseAutoScroll();
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Union.png"
                    alt="Rocket"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl">
                    Install Velocity
                  </h3>
                  <p className="text-sm sm:text-base mt-1">
                    Go to the Chrome Web Store, download the extension, and log
                    in.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`bg-[#CDF6FE] border border-[#000000] text-black rounded-xl p-3 sm:p-3 cursor-pointer transition-all duration-300 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              } ${
                currentStep === 2
                  ? "ring-2 ring-blue-500 transform scale-[1.02] bg-white"
                  : "shadow-md"
              }`}
              style={{
                ...(currentStep === 2
                  ? { boxShadow: "8px 8px 0px #000000" }
                  : {}),
                animationDelay: "0.4s",
              }}
              onClick={() => {
                handleStepChange(2);
                pauseAutoScroll();
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-1 text-[#FF9900]">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Sun.png"
                    alt="Sun"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl">
                    Open any AI Platform
                  </h3>
                  <p className="text-sm sm:text-base mt-1">
                    Choose your desired AI platform (e.g., GPT, DALL-E)
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`bg-[#CDF6FE] border border-[#000000] text-black rounded-xl p-3 sm:3 cursor-pointer transition-all duration-300 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              } ${
                currentStep === 3
                  ? "ring-2 ring-blue-500 transform scale-[1.02] bg-white"
                  : "shadow-md"
              }`}
              style={{
                ...(currentStep === 3
                  ? { boxShadow: "8px 8px 0px #000000" }
                  : {}),
                animationDelay: "0.6s",
              }}
              onClick={() => {
                handleStepChange(3);
                pauseAutoScroll();
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-1 text-[#9747FF]">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Feature.png"
                    alt="Feature"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl">
                    Type your prompt
                  </h3>
                  <p className="text-sm sm:text-base mt-1">
                    Just type your prompt and hit generate
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div
              className={`bg-[#CDF6FE] border border-[#000000] text-black rounded-xl p-3 sm:p-3 cursor-pointer transition-all duration-300 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              } ${
                currentStep === 4
                  ? "ring-2 ring-blue-500 transform scale-[1.02] bg-white"
                  : "shadow-md"
              }`}
              style={{
                ...(currentStep === 4
                  ? { boxShadow: "8px 8px 0px #000000" }
                  : {}),
                animationDelay: "0.8s",
              }}
              onClick={() => {
                handleStepChange(4);
                pauseAutoScroll();
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-1 text-[#00A779]">
                  <Image
                    src="https://thinkvelocity.in/next-assets/GreenBlade.png"
                    alt="Green Blade"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl">
                    Enhance in One Click
                  </h3>
                  <p className="text-sm sm:text-base mt-1">
                    Hit generate and watch AI craft tailored results just for
                    you!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop View: GIF Area */}
          <div className="hidden lg:flex w-2/3 items-center justify-center">
            <div
              className={`relative w-full max-w-4xl rounded-xl overflow-hidden bg-white border border-black fade-in-from-right ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                aspectRatio: "16/9",
                maxHeight: "600px",
                border: "2px solid #000000",
                boxShadow: "6px 6px 2px rgba(0, 0, 0, 0.8)",
                animationDelay: "1s",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src={`https://thinkvelocity.in/next-assets/${currentStep}.gif`}
                  alt={`Step ${currentStep}`}
                  className="w-full h-full object-contain transition-opacity duration-300"
                  width={800}
                  height={450}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS styles for animations */}
      <style jsx>{`
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

        /* Fade-in from right for video */
        .fade-in-from-right {
          opacity: 0;
          transform: translateX(50px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .fade-in-from-right.fade-in-visible {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </div>
  );
};

export default HowItWorks;
