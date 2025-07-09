"use client";

import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import Image from "next/image";

const TokenPricing = () => {
  const [customAmount, setCustomAmount] = useState("");
  const [activeIndex, setActiveIndex] = useState(1); // Start with the popular card (index 1)
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [userRegion, setUserRegion] = useState(null); // Store geolocation data
  const carouselRef = useRef(null);

  const pricePerToken = 4; // Base price per token in INR
  const promptsPerToken = 0.5;

  // Fetch user's region using ip-api
  useEffect(() => {
    const fetchUserRegion = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setUserRegion({
          countryCode: data.country_code, // e.g., "US", "IN"
          regionName: data.region, // e.g., "California"
        });
      } catch (error) {
        console.error("Failed to fetch user region:", error);
        const browserLang = navigator.language || navigator.userLanguage;
        const countryCode = browserLang ? browserLang.split("-")[1] : "IN"; // Default to IN
        setUserRegion({ countryCode: countryCode || "IN" });
      }
    };

    fetchUserRegion();
  }, []);

  // Check if we're on mobile or tablet
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    // Only allow numbers up to 1000000
    if (
      value === "" ||
      (parseFloat(value) >= 0 && parseFloat(value) <= 1000000)
    ) {
      setCustomAmount(value);
    }
  };

  // Define pricing based on region (base currency is INR)
  const getRegionPricing = () => {
    if (!userRegion) return { currency: "INR", symbol: "₹", rate: 1 }; // Default to INR

    switch (userRegion.countryCode) {
      case "IN":
        return { currency: "INR", symbol: "₹", rate: 1 }; // Base currency
      case "US":
        return { currency: "USD", symbol: "$", rate: 0.012 }; // 1 INR ≈ 0.012 USD
      case "DE":
        return { currency: "EUR", symbol: "€", rate: 0.011 }; // 1 INR ≈ 0.011 EUR
      case "GB":
        return { currency: "GBP", symbol: "£", rate: 0.0095 }; // 1 INR ≈ 0.0095 GBP
      default:
        return { currency: "INR", symbol: "₹", rate: 1 }; // Default to INR
    }
  };

  const regionPricing = getRegionPricing();

  // Calculate tokens based on input amount
  const calculateTokens = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return Math.floor(numAmount / (pricePerToken * regionPricing.rate));
  };

  const bundles = [
    {
      id: 1,
      amount: 100,
      price: Math.round(100 * pricePerToken * regionPricing.rate * 100) / 100,
      promptUses: 100 * promptsPerToken,
      popular: false,
      isBase: true,
    },
    {
      id: 2,
      amount: 500,
      price: Math.round(500 * pricePerToken * regionPricing.rate * 100) / 100,
      promptUses: 500 * promptsPerToken,
      popular: true,
    },
    {
      id: 3,
      amount: 1000,
      price: Math.round(1000 * pricePerToken * regionPricing.rate * 100) / 100,
      promptUses: 1000 * promptsPerToken,
      popular: false,
      isPremium: true,
    },
  ];

  const handleBuyCustom = () => {
    // Use URL with appropriate query parameters
    const url = `/profile?buyCredits=true&source=pricing_page&amount=${customAmount}`;
    window.location.href = url;
  };

  // Handle touch events for swiping
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // Swipe left
      setActiveIndex((prev) => (prev < bundles.length - 1 ? prev + 1 : prev));
    }

    if (touchEnd - touchStart > 100) {
      // Swipe right
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  // Handle dot navigation
  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  return (
    <PricingSection>
      <h1 className=" mt-[-160px] text-3xl sm:text-4xl md:text-5xl lg:text-7xl pricing-title text-center font-dm-sans font-semibold text-[#333]">
        Pricing
      </h1>

      {/* Custom Amount Calculator Row */}
      <div className="custom-calculator-row">
        <div className="calculator-container">
          <div className="input-group">
            <span className="currency-symbol">{regionPricing.symbol}</span>
            <input
              type="number"
              value={customAmount}
              onChange={handleCustomInputChange}
              placeholder="Amount"
              className="amount-input"
              min="1"
              max="1000000"
              onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
            />
          </div>
          <div className="token-display">
            <span className={`token-amount font-dm-sans font-semibold`}>
              {calculateTokens(customAmount)}
            </span>
            <span className="token-label font-dm-sans font-semibold">
              Credits
            </span>
          </div>
          <button
            onClick={handleBuyCustom}
            className="buy-custom-button font-dm-sans font-semibold"
            disabled={!customAmount || parseFloat(customAmount) <= 0}
          >
            Buy Now
          </button>
        </div>
      </div>

      <div
        className="pricing-container"
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isSmallScreen ? (
          <div className="mobile-carousel">
            <TokenCard
              bundle={bundles[activeIndex]}
              currencySymbol={regionPricing.symbol}
            />
            <div className="carousel-dots">
              {bundles.map((_, index) => (
                <div
                  key={index}
                  className={`dot ${activeIndex === index ? "active" : ""}`}
                  onClick={() => handleDotClick(index)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Desktop view - show all cards
          bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`card-wrapper ${bundle.popular ? "popular-card" : ""}`}
            >
              <TokenCard
                bundle={bundle}
                currencySymbol={regionPricing.symbol}
              />
            </div>
          ))
        )}
      </div>
    </PricingSection>
  );
};

const TokenCard = ({ bundle, currencySymbol }) => {
  const handleBuy = () => {
    // Redirect to profile page with URL parameters to open the buy credit modal
    const url = `/profile?buyCredits=true&source=pricing_page&amount=${bundle.price}`;
    window.location.href = url;
  };

  return (
    <StyledWrapper>
      <div className="card-container">
        {bundle.popular && (
          <div className="tag popular-tag font-dm-sans font-semibold">
            Popular
          </div>
        )}
        {bundle.isBase && (
          <div className="tag base-tag font-dm-sans font-semibold">Base</div>
        )}
        {bundle.isPremium && (
          <div className="tag premium-tag font-dm-sans font-semibold">
            Premium
          </div>
        )}
        <div className="card">
          <div className="price-box">
            <div className="token-info-row">
              <div className="token-amount">
                <div className="amount-wrapper">
                  <span className="amount-number font-dm-sans font-semibold">
                    {bundle.amount}
                  </span>
                  <span className="token-label font-dm-sans font-semibold">
                    Credits
                  </span>
                </div>
              </div>
              <div className="token-graphic">
                {bundle.id === 1 && (
                  <div className="coin-image">
                    <Image
                      src={"https://thinkvelocity.in/next-assets/Coin.png"}
                      alt="Single Coin"
                      width={60}
                      height={60}
                      className="token-Image"
                    />
                  </div>
                )}
                {bundle.id === 2 && (
                  <div className="coin-image">
                    <Image
                      src={"https://thinkvelocity.in/next-assets/CoinStack.png"}
                      alt="Coin Stack"
                      width={60}
                      height={60}
                      className="token-Image"
                    />
                  </div>
                )}
                {bundle.id === 3 && (
                  <div className="coin-image">
                    <Image
                      src={
                        "https://thinkvelocity.in/next-assets/treasureChest.png"
                      }
                      alt="Treasure Chest"
                      width={60}
                      height={60}
                      className="token-Image"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="divider"></div>
            <div className="price-info font-dm-sans font-semibold">
              {currencySymbol} {bundle.price}
            </div>
          </div>
          <button
            onClick={handleBuy}
            className="buy-button font-dm-sans font-semibold"
          >
            BUY NOW
          </button>
          <p className="prompt-uses font-dm-sans font-semibold">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.7131 3.29997C15.3598 5.94664 15.3131 10.2666 12.5798 12.8599C10.0531 15.2533 5.95315 15.2533 3.41981 12.8599C0.679812 10.2666 0.633137 5.94664 3.28647 3.29997C5.88647 0.693304 10.1131 0.693304 12.7131 3.29997Z"
                stroke="#666"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.16602 7.99995L7.05268 9.88661L10.8327 6.11328"
                stroke="#666"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {bundle.amount} credits = {bundle.promptUses} prompt uses
          </p>
        </div>
      </div>
    </StyledWrapper>
  );
};

const PricingSection = styled.section`
  height: 100vh;
  min-height: 700px;
  width: 100%;
  padding: 0 20px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;

  @media (max-width: 1023px) {
    height: 100vh;

  }

  @media (max-width: 1023px) and (orientation: landscape) {
    height: 100vh;
    padding: 0 40px;

    .mobile-carousel {
      transform: scale(0.75);
      margin-top: -40px;
      width: 100%;
      max-width: 400px;
    }
  }

  .pricing-title {
    position: absolute;
    top:  28vh;
    width: 100%;
    color: #333;

    @media (max-width: 1023px) {
      top: 5vh;
      margin-top: 0;
    }

    @media (max-width: 1023px) and (orientation: landscape) {
      top: 2vh;
      font-size: 2rem !important;
    }
  }

  .pricing-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 50px;
    max-width: 1400px;
    width: 100%;
    align-items: center;

    @media (max-width: 1023px) {
      gap: 0;
    }

    @media (max-width: 1023px) and (orientation: landscape) {
      padding: 0 20px;
    }
  }

  .card-wrapper {
    display: flex;
    justify-content: center;
    background Color: ""
  }

  .popular-card {
    z-index: 10;
    position: relative;
  }

  .mobile-carousel {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    @media (max-width: 1023px) and (orientation: landscape) {
      margin: 0 auto;
    }
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    gap: 10px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .dot.active {
    background-color: rgba(19, 146, 250, 0.8);
    transform: scale(1.2);
  }

  .custom-calculator-row {
    width: 100%;
    max-width: 500px;
    margin: 0 auto 30px;
    padding: 0 20px;

    @media (max-width: 1023px) {
      margin-top: 80px;
    }

    @media (max-width: 767px) {
      margin-top: 100px;
    }

    @media (max-width: 480px) {
      margin-top: 120px;
    }
  }

  .calculator-container {
    background: #CDF6FE;
    border: 2px solid black;
    border-radius: 16px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    box-shadow: 2px 2px 2px black;
  }

  .input-group {
    display: flex;
    align-items: center;
    background: rgba(50, 50, 50, 0.1);
    border: 1px solid rgba(80, 80, 80, 0.2);
    border-radius: 10px;
    padding: 6px 12px;
    min-width: 120px;
  }

  .currency-symbol {
    color: #333;
    font-size: 18px;
    margin-right: 6px;
    opacity: 0.8;
  }

  .amount-input {
    width: 80px;
    background: transparent;
    border: none;
    color: #333;
    font-size: 18px;
    outline: none;
    -webkit-appearance: none;
    -moz-appearance: textfield;

    &::placeholder {
      color: rgba(0, 0, 0, 0.4);
    }

    /* Remove spinner arrows */
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  .token-display {
    display: flex;
    align-items: baseline;
    color: #333;
    gap: 4px;
    min-width: 120px;
  }

  .token-amount {
    font-size: 22px;
    font-weight: 600;
    transition: all 0.3s ease;

    &.glow {
      color: #1392FA;
      text-shadow: 0 0 10px rgba(19, 146, 250, 0.7),
                   0 0 20px rgba(19, 146, 250, 0.5),
                   0 0 30px rgba(19, 146, 250, 0.3);
      animation: pulse 2s infinite;
    }
  }

  @keyframes pulse {
    0% {
      text-shadow: 0 0 10px rgba(19, 146, 250, 0.7),
                   0 0 20px rgba(19, 146, 250, 0.5),
                   0 0 30px rgba(19, 146, 250, 0.3);
    }
    50% {
      text-shadow: 0 0 15px rgba(19, 146, 250, 0.9),
                   0 0 25px rgba(19, 146, 250, 0.7),
                   0 0 35px rgba(19, 146, 250, 0.5);
    }
    100% {
      text-shadow: 0 0 10px rgba(19, 146, 250, 0.7),
                   0 0 20px rgba(19, 146, 250, 0.5),
                   0 0 30px rgba(19, 146, 250, 0.3);
    }
  }

  .token-label {
    font-size: 14px;
    opacity: 0.7;
    margin-left: 4px;
  }

  .buy-custom-button {
    background: rgba(19, 146, 250, 0.45);
    color: white;
    border: 2px solid black;
    border-radius: 10px;
    padding: 8px 20px;
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: rgba(4, 94, 155, 0.74);
      transform: translateY(-2px);
      box-shadow: 0 0 8px rgba(19, 146, 250, 0.4);
    }

    &:disabled {
      background: rgba(100, 100, 100, 0.3);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  @media (max-width: 768px) {
    .calculator-container {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 16px;
    }

    .input-group {
      flex: 1;
      min-width: 100px;
    }

    .token-display {
      flex: 1;
      justify-content: center;
    }

    .buy-custom-button {
      flex: 1;
      text-align: center;
      padding: 8px 15px;
    }
  }

  @media (max-width: 480px) {
    .calculator-container {
      flex-direction: column;
      align-items: stretch;
    }

    .input-group, .token-display {
      justify-content: center;
    }

    .buy-custom-button {
      flex: 1;
    }
  }
`;

const StyledWrapper = styled.div`
  .card-container {
    position: relative;
    width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease-in-out;
  }

  .card-container:hover {
    transform: scale(0.98) translateY(2px);
  }

  .card-container:hover .card {
    border: 2px solid black;
    box-shadow: 1px 1px 1px black;
  }

  .tag {
    position: absolute;
    top: -15px;
    right: 10px;
    text-align: center;
    padding: 8px 20px;
    font-size: 16px;
    font-weight: bold;
    font-family: "DM Sans", sans-serif;
    color: #000;
    border-radius: 12px;
    transform: rotate(0deg);
    z-index: 20;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .card-container:hover .tag {
    transform: scale(1.1);
    box-shadow: 0 0 25px rgba(255, 255, 255, 0.4);
  }

  .popular-tag {
    background: rgb(255, 129, 129);
    border: 2px solid black;
    box-shadow: 2px 2px 2px rgba(0, 0, 0);
  }

  .base-tag {
    background: rgb(188, 204, 255);
    border: 2px solid black;
    box-shadow: 2px 2px 2px rgba(0, 0, 0);
  }

  .premium-tag {
    background: rgb(151, 248, 132);
    border: 2px solid black;
    box-shadow: 2px 2px 2px rgba(0, 0, 0);
  }

  .custom-tag {
    background: linear-gradient(135deg, #00ff7f, #00ced1);
    box-shadow: 0 0 20px rgba(0, 255, 127, 0.7);
  }

  .card {
    position: relative;
    width: 340px;
    height: 380px;
    background: #cdf6fe;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 30px;
    gap: 15px;
    border-radius: 20px;
    cursor: pointer;
    color: #333;
    overflow: hidden;
    border: 2px solid black;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 2px 2px 2px black;
    animation: cardFloat 6s ease-in-out infinite;
    font-family: "DM Sans", sans-serif;
  }

  .card::before {
    content: "";
    position: absolute;
    inset: 0;
    left: -5px;
    margin: auto;
    width: 330px;
    height: 360px;
    border-radius: 18px;
    z-index: -10;
    pointer-events: none;
    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    opacity: 0;
    animation: none;
  }

  .card::after {
    content: "";
    z-index: -1;
    position: absolute;
    inset: 0;
    transform: translate3d(0, 0, 0) scale(0.95);
    filter: blur(0);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .card:hover::after {
    filter: blur(0);
    opacity: 0;
  }

  .popular-card .card-container:hover {
    transform: scale(0.98) translateY(2px);
  }

  .popular-card .card-container:hover .card {
    border: 2px solid black;
    box-shadow: 1px 1px 1px black;
  }

  .popular-card .tag {
    transform: scale(1.2);
  }

  .popular-card .card::before {
    opacity: 0;
  }

  .popular-card .card::after {
    opacity: 0;
  }

  .popular-card .buy-button {
    background: rgba(255, 107, 107, 0.6);
    border-color: rgba(255, 215, 0, 0.3);
  }

  .popular-card .buy-button:hover {
    background: rgba(255, 107, 107, 0.8);
    box-shadow: 0 0 25px rgba(255, 107, 107, 0.8);
    border-color: rgba(255, 215, 0, 0.8);
  }

  .price-box {
    background-color: #ffffff;
    padding: 15px 18px;
    border-radius: 16px;
    width: 100%;
    text-align: left;
    border: 2px solid black;
    box-shadow: 2px 2px 2px black;
    margin: 25px 0 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    color: #333;
  }

  .token-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0 5px;
  }

  .token-amount {
    font-size: 26px;
    font-weight: 700;
    color: #333;
    text-align: left;
  }

  .amount-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .amount-number {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
  }

  .token-label {
    font-size: 12px;
    font-weight: 400;
    opacity: 0.7;
    margin-top: 2px;
  }

  .custom-input {
    width: 140px;
    padding: 8px;
    font-size: 18px;
    font-weight: 600;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    text-align: left;
    outline: none;
    transition: all 0.3s ease;
    /* Remove spin buttons */
    -webkit-appearance: none; /* For WebKit browsers */
    -moz-appearance: textfield; /* For Firefox */
    appearance: none; /* Standard syntax */
  }

  /* Specifically target the spin buttons in WebKit browsers */
  .custom-input::-webkit-inner-spin-button,
  .custom-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .custom-input:focus {
    border-color: rgba(64, 201, 255, 0.7);
    box-shadow: 0 0 10px rgba(64, 201, 255, 0.4);
  }

  .custom-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .token-graphic {
    width: 80px;
    height: 80px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .coin-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
  }

  .token-Image {
    object-fit: contain;
    width: 100%;
    height: 100%;
    transform: scale(1.1);
    transition: transform 0.3s ease;
  }

  .card-container:hover .token-Image {
    transform: scale(1.2);
  }

  .divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(0, 0, 0, 0.2),
      transparent
    );
    margin: 0;
  }

  .price-info {
    font-size: 32px;
    font-weight: 600;
    display: flex;
    justify-content: flex-start;
    align-items: baseline;
    color: #333;
    width: 100%;
    text-align: left;
  }

  .buy-button {
    width: 85%;
    padding: 8px;
    background: rgba(19, 146, 250, 0.45);
    color: white;
    border: 2px solid black;
    box-shadow: 2px 2px 2px black;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 18px;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;
    text-align: center;
  }

  .buy-button:hover {
    background: rgba(4, 94, 155, 0.74);
    transform: translateY(-3px);
    box-shadow: 0 0 10px rgba(19, 146, 250, 0.5);
  }

  .buy-button:disabled {
    background: rgba(100, 100, 100, 0.3);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .buy-button::before {
    content: "center";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transform: translateX(-100%);
    transition: transform 0.6s;
    text-align: center;
  }

  .prompt-uses {
    font-size: 14px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 5px;
    margin-bottom: 0;
  }

  @media (max-width: 1023px) and (orientation: landscape) {
    .card-container {
      transform: scale(1.05);
    }

    .card-container:hover {
      transform: scale(1.05) translateY(-10px);
    }

    .card {
      height: 340px;
      max-width: 320px;
      margin: 0 auto;
    }

    .tag {
      transform: scale(1.2);
    }

    .card-container:hover .tag {
      transform: scale(1.3);
    }

    .popular-card .card-container {
      transform: scale(1.05);
    }

    .popular-card .card-container:hover {
      transform: scale(1.05) translateY(-10px);
    }
  }
`;

export default TokenPricing;
