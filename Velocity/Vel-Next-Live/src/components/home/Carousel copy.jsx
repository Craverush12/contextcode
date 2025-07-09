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
  const [currentWord, setCurrentWord] = useState("journey");
  const words = ["journey", "vision", "passion"];
  const wordColors = {
    passion: "#90ff43",
    vision: "#fcff2d",
    journey: "#ff7575",
  };
  const [wordIndex, setWordIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("fade-in");

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationClass("fade-out");

      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setCurrentWord(words[(wordIndex + 1) % words.length]);
        setAnimationClass("fade-in");
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [wordIndex, words]);

  return (
    <div
      className="pt-12 "
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      <div className="text-black py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="max-w-[1920px] mx-auto text-center mb-6">
          <div
            className="mx-auto mb-8 px-4 md:px-8 py-3 md:py-5"
            style={{
              maxWidth: "1620px",
              width: "100%",
              backgroundColor: "#CDF6FE",
              border: "2px solid black",
              boxShadow: "2px 2px 2px black",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div className="relative">
              <h2
                className="text-xl sm:text-3xl md:text-4xl lg:text-6xl font-dm-sans flex justify-start items-center whitespace-nowrap overflow-x-auto"
                style={{
                  fontWeight: "900",
                  color: "#152A32",
                  lineHeight: "1.3",
                  paddingLeft: "5%",
                }}
              >
                <span>Founders sharing their</span>
                <span
                  className="animated-word-container ml-2"
                  style={{
                    display: "inline-block",
                    width: "100px",
                    textAlign: "left",
                  }}
                >
                  <span
                    className={animationClass}
                    style={{
                      color: wordColors[currentWord],
                      display: "inline-block",
                      padding: "0 0 2px 0",
                    }}
                  >
                    {currentWord}
                  </span>
                </span>
              </h2>
            </div>
          </div>
        </div>

        <div
          className="relative rounded-lg overflow-hidden mt-6 border-2 border-black"
          style={{
            width: "100%",
            height: "100%",
            border: "4px solid black",
            boxShadow: "6px 6px 1px rgb(0, 0, 0)",
            borderRadius: "10px",
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
        .fade-in {
          animation: fadeIn 0.5s ease-in forwards;
          display: inline-block;
        }
        .fade-out {
          animation: fadeOut 0.5s ease-out forwards;
          display: inline-block;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        @media (max-width: 640px) {
          .animated-word-container {
            width: 70px !important;
          }
        }
      `}</style>
    </div>
  );
}
