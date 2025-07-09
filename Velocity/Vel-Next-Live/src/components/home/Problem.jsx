import React, { useState, useEffect, useRef } from "react";

const Problem = () => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Intersection Observer to trigger animations when section comes into view
  useEffect(() => {
    if (!isMounted || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animationsTriggered) {
            // Add a small delay before triggering animations
            setTimeout(() => {
              setAnimationsTriggered(true);
            }, 300);
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of the section is visible
        rootMargin: "0px 0px -100px 0px", // Trigger a bit before the section is fully visible
      }
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isMounted, animationsTriggered]);

  // Default values for server-side rendering
  const height = "70vh";
  const minHeight = "530px";
  const titleFontSize = "1.75rem";

  // Only update responsive values after component is mounted on client
  const responsiveHeight = isMounted
    ? windowWidth >= 1024
      ? "60vh"
      : "0vh"
    : height;
  const responsiveMinHeight = isMounted
    ? windowWidth >= 1024
      ? "530px"
      : "190px"
    : minHeight;
  const responsiveTitleFontSize = isMounted
    ? windowWidth >= 1280
      ? "6.5rem"
      : windowWidth >= 1024
      ? "3rem"
      : windowWidth >= 768
      ? "2.25rem"
      : "1.5rem"
    : titleFontSize;

  return (
    <div
      ref={sectionRef}
      style={{
        height: responsiveHeight,
        minHeight: responsiveMinHeight,
        backgroundColor: "white",
        backgroundImage:
          "url(https://thinkvelocity.in/next-assets/Mask_group3.png)",
        backgroundPosition: "center",
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ padding: "0 1rem" }}>
        <div
          className={`fade-in-element ${
            animationsTriggered ? "fade-in-visible" : ""
          }`}
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: responsiveTitleFontSize,
            fontWeight: "900",
            marginBottom: "10px",
            color: "#152A32",
            animationDelay: "0s",
          }}
        >
          AI CAN'T HELP YOU IF
        </div>
        <div
          className={`fade-in-element ${
            animationsTriggered ? "fade-in-visible" : ""
          }`}
          style={{
            fontSize: responsiveTitleFontSize,
            display: "flex",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            animationDelay: "0.8s",
          }}
        >
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              color: "#152A32",
              fontWeight: "900",
            }}
          >
            YOUR
          </span>
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              color: "#ff0000",
              fontWeight: "900",
            }}
          >
            PROMPT SUCKS!
          </span>
        </div>
      </div>

      {/* Add the same CSS styles as index.jsx */}
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

export default Problem;
