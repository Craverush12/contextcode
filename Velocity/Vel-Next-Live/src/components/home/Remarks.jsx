import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

const Remarks = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const slideContainerRef = useRef(null);
  const sectionRef = useRef(null);
  const autoPlayRef = useRef(null);
  const autoPlayInterval = 5000; // 5 seconds

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

  const productHuntReviewsUrl =
    "https://www.producthunt.com/products/velocity-prompt-co-pilot/reviews";

  const reviews = [
    {
      id: 1,
      name: "Ashish Parmar",
      review:
        "Writing the perfect prompt can be tricky, and having an AI co-pilot to refine them sounds great. All the best for the launch.",
      stars: 4,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/ashish.jpg",
      platform: "producthunt",
    },
    {
      id: 2,
      name: "Sam @CRANQ",
      review:
        "Smart move, this platform will grow as AI expands. It teaches key shortcuts and helps users effectively!",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/sam.jpg",
      platform: "chrome",
    },
    {
      id: 3,
      name: "Parth Yadav",
      review:
        "This is a big problem saver. Your input shapes AI's output. A game changer for the future!",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/parth.jpg",
      platform: "chrome",
    },
    {
      id: 4,
      name: "Seunghwan",
      review:
        "Crafting prompts is tough in MidJourney. This product seems like the perfect fix for me.",
      stars: 4,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/asian1.jpg",
      platform: "producthunt",
    },
    {
      id: 5,
      name: "Prakash Lakhiani",
      review:
        "Velocity transformed my ChatGPT use, making prompts clear and saving time effortlessly!",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/prakash.jpg",
      platform: "chrome",
    },
    {
      id: 6,
      name: "Mansi Purohit",
      review:
        "Need of the hour SaaS product. Time is money, this is saving 262627 minutes. 💯",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/mansi.jpg",
      platform: "producthunt",
    },
    {
      id: 7,
      name: "Rinku Dhawan",
      review:
        "Velocity drives innovation by generating new ideas and opening possibilities.",
      stars: 4,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/rinku.jpg",
      platform: "chrome",
    },
    {
      id: 8,
      name: "Valentine Sisman",
      review:
        "Finally, a product to replace those '100000 ChatGPT prompts' digital bundles!",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/valentina.jpg",
      platform: "producthunt",
    },
    {
      id: 9,
      name: "Vikram P",
      review:
        "Finally someone to teach ChatGPT what to do. Teaching the master.",
      stars: 4,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/vikram.jpg",
      platform: "producthunt",
    },
    {
      id: 10,
      name: "Rahul",
      review:
        "A brilliant tool for AI prompt creation. Intuitive and effort-saving!",
      stars: 5,
      image: "https://thinkvelocity.in/next-assets/reviewPfp/rahul.jpg",
      platform: "chrome",
    },
  ];

  const getPreviousIndex = () =>
    currentIndex === 0 ? reviews.length - 1 : currentIndex - 1;
  const getNextIndex = () =>
    currentIndex === reviews.length - 1 ? 0 : currentIndex + 1;

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
      setIsAnimating(false);
    }, 500);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
      setIsAnimating(false);
    }, 500);
  };

  const handleDragStart = (e) => {
    setIsPaused(true);
    setIsDragging(true);
    setStartPos(e.type === "mousedown" ? e.pageX : e.touches[0].clientX);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentPosition =
      e.type === "mousemove" ? e.pageX : e.touches[0].clientX;
    const diff = currentPosition - startPos;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handlePrevious();
      else handleNext();
      setIsDragging(false);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Resume auto-play after a short delay
    setTimeout(() => setIsPaused(false), 1000);
  };

  const handleCardClick = (e) => {
    if (!isDragging) {
      window.open(productHuntReviewsUrl, "_blank");
    }
  };

  const handleDotClick = (index) => {
    if (index === currentIndex || isAnimating) return;
    setIsPaused(true);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
      // Resume auto-play after a short delay
      setTimeout(() => setIsPaused(false), 1000);
    }, 500);
  };

  // Handle auto-rotation
  useEffect(() => {
    // Function for auto-rotation
    const play = () => {
      if (!isPaused) {
        handleNext();
      }
    };

    // Set up auto-rotation with ref for cleanup
    autoPlayRef.current = play;
  }, [currentIndex, isPaused]);

  // Set up the interval for auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      if (autoPlayRef.current) {
        autoPlayRef.current();
      }
    }, autoPlayInterval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Pause autoplay when hovering over the carousel
  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const StarRating = ({ rating }) => {
    return (
      <div className="flex gap-1 justify-start">
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="#FFA033"
            width="14"
            height="14"
            className={`${index < rating ? "text-blue-500" : "text-gray-300"}`}
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
    );
  };

  // Platform Icon component
  const PlatformIcon = ({ platform }) => {
    // Chrome icon
    if (platform === "chrome") {
      return (
        <div className="ml-2 w-5 h-5 relative">
          <Image
            src="https://thinkvelocity.in/next-assets/ChromeLogo.png"
            alt="Chrome"
            width={20}
            height={20}
            className="object-contain"
          />
        </div>
      );
    }
    // Product Hunt icon - using the image URL
    return (
      <div className="ml-2 w-5 h-5 relative">
        <Image
          src="https://thinkvelocity.in/next-assets/producthunt.png"
          alt="Product Hunt"
          width={20}
          height={20}
          className="object-contain"
        />
      </div>
    );
  };

  // Create a single card component for reuse
  const ReviewCard = ({ review, position, isActive }) => {
    return (
      <div
        className={`bg-white rounded-3xl p-4 sm:p-4 md:p-5 border-[3px] border-black transition-all duration-500 ease-in-out ${
          isAnimating ? `animate-${position}-${isAnimating}` : ""
        }`}
        style={{
          boxShadow: "7px 7px 0px black",
          opacity: isActive ? 1 : 0.7,
          transform: `scale(${isActive ? 1 : 0.9})`,
        }}
      >
        {/* Quote mark at top */}
        <div className="mb-2 sm:mb-3 md:mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 text-[#00C8F0]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>

        <div className="flex flex-col justify-between h-[144px] sm:h-[162px] md:h-[180px]">
          {/* Description */}
          <p className="text-gray-800 font-dm-sans text-sm sm:text-md md:text-lg leading-relaxed text-left w-full line-clamp-3 sm:line-clamp-4">
            {review.review}
          </p>

          {/* Profile section with pic and name in one row */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 mt-3 sm:mt-3">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-gray-200">
              <Image
                src={review.image}
                alt={review.name}
                width={43}
                height={43}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm sm:text-sm font-dm-sans font-medium text-black flex items-center">
                {review.name}
                <PlatformIcon platform={review.platform || "producthunt"} />
              </h3>
              {/* Star rating */}
              <StarRating rating={review.stars} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full" ref={sectionRef}>
      <div
        className="grid place-items-center p-4 md:p-8 pt-[3rem] md:pt-[4rem] pb-[4rem] md:pb-[4rem] relative overflow-hidden"
        style={{
          backgroundColor: "#CDF6FE",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          height: "100%",
          width: "100%",
        }}
      >
        {/* First row - Title */}
        <div className="flex flex-col items-center justify-center w-full max-w-7xl px-2 sm:px-4 mb-14">
          {/* Center Title */}
          <h2
            className={`font-dm-sans text-2xl sm:text-4xl md:text-4xl lg:text-5xl font-light text-white text-center fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              color: "#152A32",
              fontWeight: "900",
              transitionDelay: animationsTriggered ? "0s" : "0s",
            }}
          >
            Trusted By Power Users
          </h2>
          <p
            className={`text-center max-w-[630px] mt-4 text-[#152A32] text-base md:text-lg fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              transitionDelay: animationsTriggered ? "0.3s" : "0s",
            }}
          >
            Don't just take our word for it. Here's what our users say about
            Velocity.
          </p>
        </div>

        {/* Review Cards */}
        <div
          className="w-full max-w-[98rem] px-2 sm:px-4"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Three card layout - Hidden on mobile, shown on md+ screens */}
          <div
            className={`hidden md:grid grid-cols-3 gap-3 lg:gap-5 fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              transitionDelay: animationsTriggered ? "0.6s" : "0s",
            }}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
          >
            {/* Previous Card */}
            <div
              className="transition-all duration-500 ease-in-out cursor-pointer"
              onClick={handlePrevious}
            >
              <ReviewCard
                review={reviews[getPreviousIndex()]}
                position="left"
                isActive={false}
              />
            </div>

            {/* Current Card */}
            <div
              className="transition-all duration-500 ease-in-out z-10 cursor-pointer"
              onClick={handleCardClick}
            >
              <ReviewCard
                review={reviews[currentIndex]}
                position="center"
                isActive={true}
              />
            </div>

            {/* Next Card */}
            <div
              className="transition-all duration-500 ease-in-out cursor-pointer"
              onClick={handleNext}
            >
              <ReviewCard
                review={reviews[getNextIndex()]}
                position="right"
                isActive={false}
              />
            </div>
          </div>

          {/* Single Card Layout - Only visible on mobile and tablet */}
          <div
            className={`block md:hidden relative min-h-[250px] sm:min-h-[300px] fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              transitionDelay: animationsTriggered ? "0.6s" : "0s",
            }}
          >
            <div className="relative mx-auto max-w-3xl">
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className={`absolute w-full transition-all duration-500 ease-in-out p-4 sm:p-5 bg-white rounded-3xl border-[3px] border-black
                    ${
                      index === currentIndex
                        ? "opacity-100 translate-x-0 z-10"
                        : "opacity-0 translate-x-full z-0"
                    }
                    ${
                      isAnimating && index === currentIndex
                        ? "animate-fade-out"
                        : ""
                    }
                    ${
                      isAnimating &&
                      index === (currentIndex + 1) % reviews.length
                        ? "animate-fade-in"
                        : ""
                    }`}
                  style={{ boxShadow: "8px 8px 0px black" }}
                  onTouchStart={handleDragStart}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                  onClick={handleCardClick}
                >
                  {/* Quote mark at top */}
                  <div className="mb-2 sm:mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 sm:h-10 sm:w-10 text-[#00C8F0]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  <div className="flex flex-col justify-between min-h-[160px] sm:min-h-[180px]">
                    {/* Description */}
                    <p className="text-gray-800 font-[Amenti] text-sm sm:text-md leading-relaxed text-left w-full line-clamp-3 sm:line-clamp-4">
                      {review.review}
                    </p>

                    {/* Profile section with pic and name in one row */}
                    <div className="flex flex-row items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gray-200">
                        <Image
                          src={review.image}
                          alt={review.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-medium text-black flex items-center">
                          {review.name}
                          <PlatformIcon
                            platform={review.platform || "producthunt"}
                          />
                        </h3>
                        {/* Star rating */}
                        <StarRating rating={review.stars} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicator dots */}
          <div
            className={`flex justify-center items-center gap-2 sm:gap-3 md:gap-3 mt-7 sm:mt-9 md:mt-10 z-10 relative fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              transitionDelay: animationsTriggered ? "0.9s" : "0s",
            }}
          >
            {reviews.map((_, index) => (
              <div
                key={index}
                className={`h-[2px] rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-5 md:w-7 lg:w-10 bg-black"
                    : "w-3 md:w-3 lg:w-5 bg-gray-400"
                }`}
                onClick={() => handleDotClick(index)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>
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

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-100%);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s forwards;
        }

        .animate-fade-out {
          animation: fade-out 0.5s forwards;
        }

        @keyframes slide-left {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slide-right {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slide-center {
          from {
            transform: scale(0.9);
            opacity: 0.7;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-left-true {
          animation: slide-left 0.5s forwards;
        }

        .animate-right-true {
          animation: slide-right 0.5s forwards;
        }

        .animate-center-true {
          animation: slide-center 0.5s forwards;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .heading-shadow {
          text-shadow: -2px -2px 0px #000, 0px -2px 0px #000, 2px -2px 0px #000,
            -2px 0px 0px #000, 2px 0px 0px #000, -2px 2px 0px #000,
            0px 2px 0px #000, 2px 2px 0px #000, 4px 4px 0px rgba(0, 0, 0, 1);
          letter-spacing: 2px;
        }
      `}</style>
    </div>
  );
};

export default Remarks;
