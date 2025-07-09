"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";

export default function BuiltFor() {
  const [selectedOption, setSelectedOption] = useState("developers");
  const optionsContainerRef = useRef(null);
  const optionsScrollRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const options = [
    {
      id: "designers",
      label: "Designers & Artists",
      message:
        "Create stunning visuals and artwork with AI-powered assistance.",
      image: "https://thinkvelocity.in/next-assets/Making_art.png",
    },
    {
      id: "marketers",
      label: "Marketers & Copywriters",
      message:
        "Generate an engaging social media ad for a new eco-friendly product.",
      image: "https://thinkvelocity.in/next-assets/Marketing_art.png",
    },
    {
      id: "developers",
      label: "Developers & Researchers",
      message: "Build and debug code faster with intelligent suggestions.",
      image: "https://thinkvelocity.in/next-assets/Programmer_art.png",
    },
    {
      id: "students",
      label: "Students & Educators",
      message: "Enhance learning with interactive educational content.",
      image: "https://thinkvelocity.in/next-assets/Teaching_art.png",
    },
    {
      id: "professionals",
      label: "Professionals & Teams",
      message:
        "Streamline workflows and boost productivity for your entire team.",
      image: "https://thinkvelocity.in/next-assets/Team_art.png",
    },
  ];

  const selectedItem =
    options.find((option) => option.id === selectedOption) || options[2];
  const selectedIndex = options.findIndex(
    (option) => option.id === selectedOption
  );

  // Handle auto-rotation through options with infinite loop
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      const currentIndex = options.findIndex(
        (option) => option.id === selectedOption
      );
      const nextIndex = (currentIndex + 1) % options.length;

      setSelectedOption(options[nextIndex].id);

      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 700); // Match this with the transition duration
    }, 3000); // Increased interval for better readability

    return () => clearInterval(interval);
  }, [selectedOption, options, autoRotate, isTransitioning]);

  // Pause auto-rotation when user interacts with options
  const handleOptionClick = (optionId) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setSelectedOption(optionId);
    setAutoRotate(false);

    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 700);

    // Resume auto-rotation after 10 seconds of inactivity
    setTimeout(() => {
      setAutoRotate(true);
    }, 10000);
  };

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
      if (optionsContainerRef.current) {
        setContainerHeight(optionsContainerRef.current.clientHeight);
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll to center the selected option in mobile/tablet view
  useEffect(() => {
    if (isMobileOrTablet && optionsScrollRef.current) {
      const selectedElement = optionsScrollRef.current.querySelector(
        `button[data-id="${selectedOption}"]`
      );
      if (selectedElement) {
        const scrollContainer = optionsScrollRef.current;
        const scrollLeft =
          selectedElement.offsetLeft -
          scrollContainer.clientWidth / 2 +
          selectedElement.clientWidth / 2;
        scrollContainer.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [selectedOption, isMobileOrTablet]);

  // Calculate the offset to center the selected option for desktop view
  const getScrollOffset = () => {
    const buttonHeight = 48; // Approximate height of each button
    const spacing = 16; // Spacing between buttons
    const totalItemHeight = buttonHeight + spacing;

    // Calculate position to center the selected item at the arrow
    const centerPosition = containerHeight / 2 - buttonHeight / 2;
    const selectedPosition = selectedIndex * totalItemHeight;

    return centerPosition - selectedPosition;
  };

  return (
    <main
      className={`flex flex-col md:flex-row max-h-[75vh] ${
        isMobileOrTablet ? "min-h-[50vh]" : "min-h-[90vh]"
      } transition-all duration-700 ease-in-out`}
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      {/* Mobile and Tablet View */}
      {isMobileOrTablet && (
        <div className="flex flex-col w-full">
          {/* Title Section */}
          <div className="w-full bg-white p-4 md:p-6 flex justify-center">
            <h2
              className="text-2xl md:text-4xl font-dm-sans text-black"
              style={{
                color: "#152A32",
                fontWeight: "900",
              }}
            >
              Built For
            </h2>
          </div>

          {/* Horizontal Options Scroll */}
          <div
            ref={optionsScrollRef}
            className="w-full overflow-x-auto py-6 flex gap-4 no-scrollbar px-4"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {options.map((option) => (
              <button
                key={option.id}
                data-id={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={`text-xl md:text-2xl font-dm-sans py-2 px-4 rounded-[30px] flex-shrink-0 transition-all duration-500 ease-in-out text-black ${
                  selectedOption === option.id
                    ? "bg-white rounded-[30px] border-2 border-black shadow-md"
                    : "hover:bg-white/50"
                }`}
                style={{
                  scrollSnapAlign: "center",
                  opacity: selectedOption === option.id ? 1 : 0.7,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Card Section - Added more top margin for space */}
          <div className="w-full p-4 flex flex-col items-center mt-16 md:mt-20">
            <div className="relative mb-12 max-w-[90%] md:max-w-[80%] pt-20">
              {/* Background card */}
              <div
                className="absolute bg-[#0B0B0B1A] rounded-xl shadow-md"
                style={{
                  width: "100%",
                  height: "230px",
                  border: "2px solid black",
                  top: "50px",
                  left: "15px",
                  zIndex: 0,
                }}
              ></div>

              {/* Image - Repositioned to be on top of card */}
              <div
                className="absolute left-1/2 transform -translate-x-1/2"
                style={{
                  top: "-50px",
                  zIndex: 1,
                  transition:
                    "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 2), opacity 0.4s ease-out",
                }}
                key={selectedOption}
              >
                <Image
                  src={selectedItem.image || "/placeholder.svg"}
                  alt={`Illustration for ${selectedItem.label}`}
                  width={180}
                  height={180}
                  className="object-contain md:w-[220px] md:h-[220px]"
                />
              </div>

              {/* Foreground white card */}
              <div
                className="relative bg-white rounded-xl shadow-md p-4 md:p-6 z-1"
                style={{
                  width: "100%",
                  height: "230px",
                  border: "2px solid black",
                  zIndex: 2,
                }}
              >
                <p className="text-lg md:text-xl font-dm-sans mb-6 text-black pt-16 md:pt-20">
                  {selectedItem.message}
                </p>
                <div className="absolute bottom-4 left-4 inline-flex items-center px-3 py-1 bg-blue-100 rounded-full">
                  <span className="mr-2 text-black font-dm-sans">≡</span>
                  <span className="text-black font-dm-sans">Descriptive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop View */}
      {!isMobileOrTablet && (
        <>
          {/* Left Column - White */}
          <div
            className="w-1/5 bg-white p-7 flex flex-col items-start relative border-r-2 border-black"
            style={{
              boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.36)",
            }}
          >
            <div className="mt-[12rem] flex items-center">
              <h2
                className="text-4xl mr-[7px] mt-[70px] font-dm-sans text-black"
                style={{
                  color: "#152A32",
                  fontWeight: "900",
                }}
              >
                Built For
              </h2>
            </div>

            {/* Fixed position arrow */}
            {/* <div className="absolute right-0 top-1/2 transform -translate-y-1/4 translate-x-[-25%]">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-black shadow-[2px_2px_2px_rgba(0,0,0,1)]">
                <ArrowRight className="h-6 w-6 text-black" />
              </div>
            </div> */}
          </div>

          {/* Middle Column - Transparent to show gradient background */}
          <div className="w-2/5 p-5 flex flex-col justify-center relative ">
            <div
              ref={optionsContainerRef}
              className="space-y-2 max-w-[28rem] mx-auto h-[24rem] overflow-hidden"
            >
              <div
                className="transition-transform duration-700 ease-in-out"
                style={{
                  transform: `translateY(${getScrollOffset()}px)`,
                  opacity: isTransitioning ? 0.7 : 1,
                }}
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    className={`text-2xl font-dm-sans py-1 px-2 rounded-[9px] w-auto text-left transition-all duration-500 ease-in-out text-black mb-2 ${
                      selectedOption === option.id
                        ? "bg-white rounded-[9px] border-2 border-black shadow-md"
                        : "hover:bg-white/50"
                    }`}
                    style={{
                      color: "#152A32",
                      fontWeight: "900",
                      transform:
                        selectedOption === option.id
                          ? "translateX(7px)"
                          : "none",
                      opacity: selectedOption === option.id ? 1 : 0.7,
                      position: "relative",
                      pointerEvents: isTransitioning ? "none" : "auto",
                    }}
                  >
                    {selectedOption === option.id && (
                      <Image
                        src={
                          "https://thinkvelocity.in/next-assets/BuiltForStar.png"
                        }
                        alt="Star"
                        width={25}
                        height={25}
                        className="absolute -top-3 -left-2"
                      />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Transparent to show gradient background */}
          <div className="w-2/5 p-5 flex flex-col mt-[12rem] items-center">
            <div className="relative mt-[1rem] mb-16">
              {/* Background green card */}
              <div
                className="absolute bg-[#0B0B0B1A] rounded-xl shadow-md p-4"
                style={{
                  width: "380px",
                  height: "200px",
                  border: "2px solid black",
                  top: "-22px",
                  left: "27px",
                  zIndex: 0,
                }}
              ></div>

              {/* Image positioned on top of both cards */}
              <div
                className="absolute"
                style={{
                  top: "-190px",
                  left: "95px",
                  zIndex: 1,
                  transform: `translateY(${selectedOption ? "0" : "50px"})`,
                  opacity: selectedOption ? 1 : 0,
                  transition:
                    "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 2), opacity 0.4s ease-out",
                  animation: `spring-in 1s ease-in-out, float-animation 1s ease-in-out`,
                }}
                key={selectedOption}
              >
                <Image
                  src={selectedItem.image || "/placeholder.svg"}
                  alt={`Illustration for ${selectedItem.label}`}
                  width={220}
                  height={220}
                  className="object-contain"
                />
              </div>

              {/* Foreground white card */}
              <div
                className="relative bg-white rounded-xl shadow-md p-4 z-10"
                style={{
                  width: "380px",
                  height: "200px",
                  border: "2px solid black",
                }}
              >
                <p className="text-lg font-dm-sans mb-4 text-black pt-12">
                  {selectedItem.message}
                </p>
                <div className="absolute bottom-4 left-4 inline-flex items-center px-2 py-1 bg-blue-100 rounded-full">
                  <span className="mr-1 text-black font-dm-sans text-sm">
                    ≡
                  </span>
                  <span className="text-black font-dm-sans text-sm">
                    Descriptive
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes spring-in {
          0% {
            transform: scale(0.2);
            opacity: 0;
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes float-animation {
          0% {
            top: -35px;
          }
          100% {
            top: -190px;
          }
        }

        /* For mobile animation */
        @media (max-width: 1024px) {
          @keyframes float-animation {
            0% {
              top: -10px;
            }
            100% {
              top: -50px;
            }
          }
        }

        /* Hide scrollbar for clean UI */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }
      `}</style>
    </main>
  );
}
