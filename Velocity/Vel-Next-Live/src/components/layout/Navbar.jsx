"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Auth from "@/lib/auth";
import Analytics from "@/lib/analytics";
import EventTracking from "@/utils/eventTracking";
import { UserRound } from "lucide-react";
import ScrollAnchor from "./ScrollAnchor";

const Navbar = ({
  howItWorksRef,
  homeRef,
  releaseNotesRef,
  builtRef,
  promptBoxRef,
  tokenPricingRef,
  remarksRef,
  carouselRef,
  getExtensionRef,
  isLoggedIn: propIsLoggedIn,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Simple check - if userId exists in localStorage, user is logged in
    const checkAuth = () => {
      const userId = localStorage.getItem("userId");
      setIsLoggedIn(!!userId);
    };

    // Check on mount
    checkAuth();

    // Add event listener for storage changes (in case of login in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Set up scroll refs for ScrollAnchor component
  const scrollRefs = {
    home: homeRef,
    howItWorksRef: howItWorksRef,
    builtRef: builtRef,
    releaseNotesRef: releaseNotesRef,
    tokenPricingRef: tokenPricingRef,
    remarksRef: remarksRef,
    carouselRef: carouselRef,
    getExtensionRef: getExtensionRef,
    promptBoxRef: promptBoxRef,
  };

  // Handle logout
  const handleLogout = async () => {
    Auth.logout();
    Analytics.track("User Logged Out");
    setIsLoggedIn(false);
    router.push("/login");
  };

  // Handle profile click
  const handleProfileClick = (e) => {
    e.preventDefault();
    router.push("/profile");
  };

  return (
    <div className="flex justify-center bg-[#CDF6FE]">
      <nav className="text-primary fixed top-2 sm:top-5 z-50 w-full flex justify-center">
        <div
          className="w-full sm:w-[1500px] max-w-[90%] sm:max-w-[95%] bg-white border-2 border-black rounded-xl overflow-hidden"
          style={{ boxShadow: "4px 4px 2px black" }}
        >
          {/* Mobile and Tablet view */}
          <div className="lg:hidden w-full flex items-center justify-between py-3 px-5">
            <Link
              href="/"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="flex items-center cursor-pointer">
                <Image
                  src="https://thinkvelocity.in/next-assets/VEL_LOGO2.png"
                  alt="Velocity Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <span
                  className="ml-2 font-dm-sans text-2xl"
                  style={{
                    fontWeight: "600",
                    color: "#152A32",
                  }}
                >
                  Velocity
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-black focus:outline-none"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: "#152A32" }}
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop view */}
          <div className="hidden lg:grid w-full items-center py-2 sm:py-5 px-3 sm:px-11 md:px-14 grid-cols-[auto,1fr,auto]">
            {/* Logo - Left Column */}
            <div className="flex items-center">
              <Link
                href="/"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <div className="flex items-center cursor-pointer">
                  <Image
                    src="https://thinkvelocity.in/next-assets/VEL_LOGO2.png"
                    alt="Velocity Logo"
                    width={108}
                    height={108}
                    className="object-contain w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                    style={{
                      border: "2px solid rgb(0, 0, 0)",
                      boxShadow: "4px 4px 2px 0px rgb(0, 0, 0)",
                      borderRadius: "9999px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "3px 3px 1px rgb(0, 0, 0)";
                    }}
                  />
                  <span
                    className="ml-2 font-dm-sans text-lg sm:text-3xl md:text-4xl lg:text-4xl"
                    style={{
                      fontWeight: "600",
                      color: "#152A32",
                    }}
                  >
                    Velocity
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation - Center Column (Desktop only) */}
            <div className="hidden lg:flex justify-center items-center">
              <ScrollAnchor scrollRefs={scrollRefs} />
            </div>

            {/* Button/Profile - Right Column */}
            <div className="flex items-center">
              {/* Desktop Get Started Button - Only visible on desktop */}
              <div className="hidden lg:flex items-center">
                {!isLoggedIn ? (
                  <Link
                    href="/register"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button
                      style={{
                        backgroundColor: "#00C8F0",
                        color: "black",
                        border: "2px solid rgb(0, 0, 0)",
                        borderRadius: "9999px",
                        fontSize: "1.125rem",
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "144px",
                        height: "36px",
                        overflow: "hidden",
                        position: "relative",
                        transition: "all 0.3s ease",
                        boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                      }}
                      className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "4px 4px 1px rgb(0, 0, 0)";
                      }}
                      onClick={() => {
                        EventTracking.trackButtonClick("Get Started", {
                          location: "navbar_desktop",
                          destination: "register_page",
                          button_style: "standard",
                          source_origin: "navbar",
                        });
                        EventTracking.trackRedirectToRegister(
                          "navbar_desktop",
                          {
                            button: "Get Started",
                            button_style: "standard",
                          }
                        );
                      }}
                    >
                      Get Started
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      EventTracking.trackButtonClick("Profile", {
                        location: "navbar_desktop",
                        userLoggedIn: true,
                        source_origin: "navbar",
                      });
                      handleProfileClick(e);
                    }}
                    className="focus:outline-none"
                  >
                    <UserRound className="border border-black rounded-full w-11 h-11 lg:w-14 lg:h-14 p-1 text-black hover:bg-gray-100 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile and Tablet Menu */}
          {isMenuOpen && (
            <div
              className="lg:hidden fixed right-0 top-[60px] bg-white border-2 border-black rounded-xl p-4 mr-4 z-50"
              style={{ boxShadow: "4px 4px 2px black" }}
            >
              <div className="flex flex-col space-y-3">
                {isLoggedIn && (
                  <button
                    onClick={(e) => {
                      EventTracking.trackButtonClick("Profile", {
                        location: "navbar_mobile",
                        userLoggedIn: true,
                        source_origin: "navbar",
                      });
                      handleProfileClick(e);
                    }}
                    className="flex items-center gap-2 text-black hover:text-[#00C8F0] transition-colors font-dm-sans-semibold text-sm"
                  >
                    <UserRound className="w-4 h-4 " />
                    Profile
                  </button>
                )}
                <div
                  onClick={() => {
                    scrollRefs.howItWorksRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                    setIsMenuOpen(false);
                  }}
                  className="text-black cursor-pointer hover:text-[#00C8F0] transition-colors font-dm-sans-semibold text-sm"
                >
                  How it works
                </div>
                <div
                  onClick={() => {
                    scrollRefs.tokenPricingRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                    setIsMenuOpen(false);
                  }}
                  className="text-black cursor-pointer hover:text-[#00C8F0] transition-colors font-dm-sans-semibold text-sm"
                >
                  Pricing
                </div>
                <div
                  onClick={() => {
                    scrollRefs.releaseNotesRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                    setIsMenuOpen(false);
                  }}
                  className="text-black cursor-pointer hover:text-[#00C8F0] transition-colors font-dm-sans-semibold text-sm"
                >
                  Patch Notes
                </div>
                {!isLoggedIn ? (
                  <Link href="/login" className="w-full">
                    <button
                      className="w-full rounded-full bg-[#00C8F0] text-black border-2 border-black py-1.5 px-3 text-sm font-dm-sans-bold"
                      style={{ boxShadow: "2px 2px 1px rgb(0, 0, 0)" }}
                      onClick={() => {
                        EventTracking.trackButtonClick("Get Started", {
                          location: "navbar_mobile",
                          destination: "login_page",
                          source_origin: "navbar",
                        });
                        EventTracking.trackRedirectToRegister("navbar_mobile", {
                          button: "Get Started",
                        });
                      }}
                    >
                      Get Started
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      EventTracking.trackButtonClick("Logout", {
                        location: "mobile_menu",
                        userLoggedIn: true,
                        source_origin: "mobile_menu",
                      });
                      handleLogout(e);
                    }}
                    className="text-red-600 hover:text-red-700 transition-colors font-dm-sans-semibold text-sm"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
