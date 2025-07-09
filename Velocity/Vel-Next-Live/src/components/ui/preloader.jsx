"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styled from "styled-components";

const Preloader = () => {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + Math.random() * 5;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 100);

    // For Next.js, handle window load differently
    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        setProgress(100);
        clearInterval(interval);
      } else {
        const handleLoad = () => {
          setProgress(100);
          clearInterval(interval);
        };
        window.addEventListener("load", handleLoad);
        return () => {
          clearInterval(interval);
          window.removeEventListener("load", handleLoad);
        };
      }
    }

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Don't render on server
  if (!mounted) {
    return null;
  }

  return (
    <StyledWrapper>
      <div className="loader">
        <div className="box">
          <div className="logo">
            <div className="image-container">
              <Image
                src="https://thinkvelocity.in/next-assets/VEL_LOGO.png"
                alt="Velocity Logo"
                className="logo-img"
                width={200}
                height={200}
                priority
              />
            </div>
          </div>
        </div>
        <div className="box" />
        <div className="box" />
        <div className="box" />
        <div className="box" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:rgb(255, 255, 255);
  z-index: 50;

  .loader {
    --size: 350px; /* Increased from 250px to make overall container larger */
    --duration: 2s;
    --logo-color: grey;
    --background: #cdf6fe;
    height: var(--size);
    aspect-ratio: 1;
    position: relative;
    margin-bottom: 2rem;
  }

  .loader .box {
    position: absolute;
    background: var(--background);
    border-radius: 50%;
    border: 2px solid black;
    box-shadow: 4px 4px 4px black;
    animation: ripple var(--duration) infinite ease-in-out;
  }

  .loader .box:nth-child(1) {
    inset: 40%;
    z-index: 99;
  }
  .loader .box:nth-child(2) {
    inset: 30%;
    z-index: 98;
    animation-delay: 0.2s;
  }
  .loader .box:nth-child(3) {
    inset: 20%;
    z-index: 97;
    animation-delay: 0.4s;
  }
  .loader .box:nth-child(4) {
    inset: 10%;
    z-index: 96;
    animation-delay: 0.6s;
  }
  .loader .box:nth-child(5) {
    inset: 0%;
    z-index: 95;
    animation-delay: 0.8s;
  }

  .loader .logo {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    padding: 20%; /* Reduced from 30% to make logo larger relative to container */
  }

  .image-container {
    position: relative;
    width: 100%;
    max-width: 200px;
    aspect-ratio: 1;
  }

  .logo-img {
    width: 100% !important;
    height: auto !important;
    max-width: 200px;
    object-fit: contain;
    animation: color-change var(--duration) infinite ease-in-out;
    filter: grayscale(100%);
  }

  .loading-text {
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 2rem; /* Increased from margin-bottom to margin-top to shift text down */
  }

  @keyframes ripple {
    0% {
      transform: scale(1);
      box-shadow: 4px 4px 4px black;
    }
    50% {
      transform: scale(1.3);
      box-shadow: 4px 4px 4px black;
    }
    100% {
      transform: scale(1);
      box-shadow: 4px 4px 4px black;
    }
  }

  @keyframes color-change {
    0% {
      filter: grayscale(100%);
    }
    50% {
      filter: grayscale(0%);
    }
    100% {
      filter: grayscale(100%);
    }
  }
`;

export default Preloader;
