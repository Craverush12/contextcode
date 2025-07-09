import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const GetExtension = () => {
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const sectionRef = useRef(null);

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

  return (
    <div
      className="bg-[#CDF6FE] py-8 px-4 md:px-8 md:rounded-lg relative"
      style={{
        minHeight: "300px",
        borderTop: "2px solid rgba(0, 0, 0, 0.31)",
      }}
      ref={sectionRef}
    >
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        {/* Left Column */}
        <div className="flex flex-col justify-center md:mb-0">
          <div className="order-1 md:order-2">
            <h2
              className={`font-font-dm-sans text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-black font-bold mb-4 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                transitionDelay: animationsTriggered ? "0s" : "0s",
              }}
            >
              Get Velocity Extension.
            </h2>
            <p
              className={`font-dm-sans font-semibold text-gray-800 text-base md:text-lg mb-6 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                transitionDelay: animationsTriggered ? "0.3s" : "0s",
              }}
            >
              No prompt expertise needed, just one click and clearer results,
              instantly!
            </p>
          </div>
          <div className="order-2 md:order-1 mb-6 md:mb-8">
            <Link
              href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
              target="_blank"
            >
              <button
                className={`font-dm-sans bg-[#00C2FF] text-black font-medium py-3 px-6 rounded-full hover:bg-[#00a8e0] transition-all transform hover:translate-x-[5px] hover:translate-y-[5px] shadow-[5px_5px_1px_rgba(0,0,0,1)] hover:shadow-none fade-in-element ${
                  animationsTriggered ? "fade-in-visible" : ""
                }`}
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "black",
                  fontWeight: "bold",
                  fontSize: "16px",
                  padding: "16px 40px",
                  borderRadius: "40px",
                  border: "1px solid #000000",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  transitionDelay: animationsTriggered ? "0.6s" : "0s",
                }}
              >
                Download Now for Free
              </button>
            </Link>
          </div>
        </div>

        {/* Right Column */}
        <div
          className={`relative w-full h-[240px] md:h-[300px] fade-in-element ${
            animationsTriggered ? "fade-in-visible" : ""
          }`}
          style={{
            transitionDelay: animationsTriggered ? "0.9s" : "0s",
          }}
        >
          <div
            className="w-full md:w-[90%] lg:w-[90%] xl:w-[700px] h-[300px] md:h-[300px] bg-white rounded-[5px] md:rounded-[10px] flex flex-col md:flex-row items-center justify-center mx-auto relative md:absolute md:bottom-[35px] md:translate-y-1/4 md:left-1/2 md:transform md:-translate-x-1/2"
            style={{
              border: "2px solid #000000",
              boxShadow: "6px 6px 2px rgba(0, 0, 0, 1)",
            }}
          >
            {/* Integration icons */}
            <div
              className="w-[95%] md:absolute md:w-auto mt-4 md:mt-0 md:top-4 md:left-auto md:right-4 lg:right-6 xl:right-12 bg-white/90 p-2 md:p-3 rounded-[5px] md:rounded-[10px]"
              style={{
                backgroundColor: "#CDF6FE",
                border: "2px solid #000000",
                maxWidth: "460px",
                height: "auto",
                minHeight: "70px",
                padding: "8px",
                zIndex: 10,
              }}
            >
              <div className="text-sm text-gray-500 mb-2">works with</div>
              <div className="flex flex-wrap gap-1 md:gap-2">
                <div
                  className="p-1 border text-black flex items-center gap-1 text-xs md:text-sm rounded-[5px] md:rounded-[10px]"
                  style={{
                    backgroundColor: "rgb(255, 255, 255)",
                    border: "1px solid #000000",
                  }}
                >
                  <Image
                    src="https://thinkvelocity.in/next-assets/Chatgp_Sm_LOGO.png"
                    alt="ChatGPTLogo"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                  <span>Chat GPT</span>
                </div>
                <div
                  className="p-1 border text-black flex items-center gap-1 text-xs md:text-sm rounded-[5px] md:rounded-[10px]"
                  style={{
                    backgroundColor: "rgb(255, 255, 255)",
                    border: "1px solid #000000",
                  }}
                >
                  <Image
                    src="https://thinkvelocity.in/next-assets/Gemini_Sm_LOGO.png"
                    alt="GeminiLogo"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                  <span>Gemini</span>
                </div>
                <div
                  className="p-1 border text-black flex items-center gap-1 text-xs md:text-sm rounded-[5px] md:rounded-[10px]"
                  style={{
                    backgroundColor: "rgb(255, 255, 255)",
                    border: "1px solid #000000",
                  }}
                >
                  <Image
                    src="https://thinkvelocity.in/next-assets/Claude_Sm_LOGO.png"
                    alt="ClaudeLogo"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                  <span>Claude</span>
                </div>
                <div
                  className="p-1 border text-black flex items-center gap-1 text-xs md:text-sm rounded-[5px] md:rounded-[10px]"
                  style={{
                    backgroundColor: "rgb(255, 255, 255)",
                    border: "1px solid #000000",
                  }}
                >
                  <Image
                    src="https://thinkvelocity.in/next-assets/Grok_Sm_LOGO.png"
                    alt="GrokLogo"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                  <span>Grok</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center h-[200px] md:h-full w-full mt-4 md:mt-0">
              <Image
                src="https://thinkvelocity.in/next-assets/Chrome_with_Vel.png"
                alt="Logo"
                width={300}
                height={260}
                className="object-contain w-auto h-auto max-w-[75%] md:max-w-[90%] md:translate-y-1/4"
              />
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
      `}</style>
    </div>
  );
};

export default GetExtension;
