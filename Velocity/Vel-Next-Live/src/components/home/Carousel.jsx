import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function FoundersSection({
  videoId = "hSrHpIZV72w",
  subtitle = "Hear directly from the founders as they share their inspiring journey, their unwavering passion, and their ambitious vision for the future of Velocity.",
  ctaText = "Try velocity >",
  ctaLink = "https://chromewebstore.google.com/detail/velocity/ggiecgdncaiedmdnbmgjhpfniflebfpa",
  // imageUrl = "https://via.placeholder.com/800x450",
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
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

  const words = ["journey", "vision", "passion"];
  const wordColors = {
    passion: "#FF4D6A", // Brighter pink-red
    vision: "#FFD700", // Bright gold
    journey: "#9D4ED0", // Bright mint green
  };

  const typingSpeed = 150; // Speed of typing
  const deletingSpeed = 100; // Speed of deleting
  const pauseBeforeDelete = 1500; // Time to wait before deleting
  const pauseBeforeNextWord = 500; // Time to wait before typing next word

  useEffect(() => {
    let timeout;

    const type = () => {
      const currentWord = words[wordIndex];

      if (!isDeleting) {
        // Typing
        setDisplayText(currentWord.substring(0, displayText.length + 1));

        if (displayText.length === currentWord.length) {
          // Word complete - wait before deleting
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseBeforeDelete);
          return;
        }

        timeout = setTimeout(type, typingSpeed);
      } else {
        // Deleting
        setDisplayText(currentWord.substring(0, displayText.length - 1));

        if (displayText.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
          timeout = setTimeout(type, pauseBeforeNextWord);
          return;
        }

        timeout = setTimeout(type, deletingSpeed);
      }
    };

    timeout = setTimeout(type, typingSpeed);
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex, words]);

  return (
    <div
      className=""
      style={{
        backgroundColor: "#ffffff",
      }}
      ref={sectionRef}
    >
      <div className="text-black py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="max-w-[1920px] mx-auto text-center mb-6">
          <div
            className={`mx-auto mb-8 px-4 md:px-8 py-3 md:py-5 fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              maxWidth: "1620px",
              width: "100%",
              backgroundColor: "#CDF6FE",
              border: "2px solid black",
              boxShadow: "2px 2px 2px black",
              borderRadius: "4px",
              overflow: "hidden",
              transitionDelay: animationsTriggered ? "0s" : "0s",
            }}
          >
            <div className="relative">
              <h2
                className="text-xl sm:text-3xl md:text-4xl lg:text-6xl font-dm-sans flex justify-center items-center whitespace-nowrap overflow-x-auto"
                style={{
                  fontWeight: "900",
                  color: "#152A32",
                  lineHeight: "1.3",
                  textAlign: "center",
                }}
              >
                <span>Creators sharing their vision</span>
              </h2>
            </div>
          </div>
        </div>

        <div
          className={`relative rounded-lg overflow-hidden mt-6 border-2 border-black fade-in-element ${
            animationsTriggered ? "fade-in-visible" : ""
          }`}
          style={{
            width: "100%",
            height: "100%",
            border: "4px solid black",
            boxShadow: "6px 6px 1px rgb(0, 0, 0)",
            borderRadius: "10px",
            transitionDelay: animationsTriggered ? "0.4s" : "0s",
          }}
        >
          {showVideo ? (
            <div className="aspect-video w-full">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video"
              ></iframe>
            </div>
          ) : (
            <div
              className="relative aspect-video cursor-pointer flex items-center justify-center"
              onClick={() => setShowVideo(true)}
            >
              <Image
                src="https://thinkvelocity.in/next-assets/Creators.png"
                alt="Founders"
                width={400}
                height={300}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="rounded-full bg-black/50 border-white hover:bg-black/70 p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-6 w-6 text-white"
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
      </div>

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

        @keyframes cursor-blink {
          0%,
          100% {
            border-right-color: transparent;
          }
          50% {
            border-right-color: black;
          }
        }

        .typing-container span {
          display: inline-block;
          position: relative;
          font-weight: 900;
        }

        .typing-text {
          -webkit-text-stroke: 1px rgba(0, 0, 0, 0.27);
          text-stroke: 1px rgba(0, 0, 0, 0.27);

          letter-spacing: 1px;
        }

        @media (max-width: 640px) {
          .typing-container {
            min-width: 120px !important;
          }
          .typing-text {
            -webkit-text-stroke: 1px black;
            text-stroke: 1px black;
          }
        }
      `}</style>
    </div>
  );
}
