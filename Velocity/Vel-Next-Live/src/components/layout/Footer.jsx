"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  return (
    <footer
      className="relative z-[21] bg-white text-black py-5 px-4 lg:px-8"
      style={{
        borderTop: "2px solid #000000",
      }}
    >
      <div className="container mx-auto max-w-9xl">
        {/* Main content - different layouts for mobile, tablet, and desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-0">
          {/* Left column with logo and tagline */}
          <div className="flex flex-col">
            <div className="flex items-center gap-4">
              <Image
                src="https://thinkvelocity.in/next-assets/VEL_LOGO2.png"
                alt="Logo"
                width={75}
                height={75}
                className="object-contain"
                style={{
                  borderRadius: "100%",
                  border: "3px solid #000000",
                  boxShadow: "5px 5px 2px 0px rgb(0, 0, 0)",
                }}
              />
              <div>
                <h2
                  className="text-6xl lg:text-7xl font-dm-sans "
                  style={{
                    color: "#152A32",
                    fontWeight: "600",
                  }}
                >
                  Velocity
                </h2>
              </div>
            </div>

            {/* Address for small mobile view */}
            <div className="block sm:hidden mt-6">
              <h2 className="font-bold text-lg mb-2">Address</h2>
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                Shree Krishna Complex, Veera Desai
                <br />
                Industrial Estate, Andheri West,
                <br />
                Mumbai, Maharashtra 400053
              </address>
            </div>
          </div>

          {/* Right section with a vertical divider, Address and Get in Touch - for desktop */}
          <div className="flex lg:justify-between relative hidden lg:flex">
            {/* Vertical divider visible only on lg and above */}
            <div className="hidden lg:block absolute h-full w-[2px] bg-black left-[-20px]"></div>

            {/* Address for desktop view only */}
            <div className="mr-12 hidden lg:block">
              <h2 className="font-bold text-lg mb-2">Address</h2>
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                Shree Krishna Complex, Veera Desai
                <br />
                Industrial Estate, Andheri West,
                <br />
                Mumbai, Maharashtra 400053
              </address>
            </div>

            {/* Quick Links */}
            <div className="mr-12 relative">
              <div className="hidden lg:block absolute h-full w-[2px] bg-black left-[-20px]"></div>
              <h2 className="font-bold text-lg mb-2">Quick Links</h2>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <Link
                    href="/"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacypolicy"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact-us"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get in Touch for desktop */}
            <div>
              <h2 className="font-bold text-lg mb-3 text-center">
                Get in Touch
              </h2>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <a
                    href="https://www.instagram.com/thinkvelocity/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Instagram"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/Insta.png"
                      alt="Instagram"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                  <span className="text-xs mt-1 inline">Instagram</span>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://x.com/VelocityThink"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Twitter"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/X.png"
                      alt="Twitter"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                  <span className="text-xs mt-1 inline">Twitter</span>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://www.linkedin.com/company/totem-interactive/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="LinkedIn"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/linkden.png"
                      alt="LinkedIn"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                  <span className="text-xs mt-1 inline">Linked In</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet view - single row layout */}
          <div className="hidden sm:flex lg:hidden mt-6 justify-between items-start w-full">
            {/* Address for tablet view */}
            <div>
              <h2 className="font-bold text-lg mb-2">Address</h2>
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                Shree Krishna Complex, Veera Desai
                <br />
                Industrial Estate, Andheri West,
                <br />
                Mumbai, Maharashtra 400053
              </address>
            </div>

            {/* Quick Links for tablet */}
            <div>
              <h2 className="font-bold text-lg mb-2">Quick Links</h2>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <Link
                    href="/"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacypolicy"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact-us"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get in Touch for tablet */}
            <div>
              <h2 className="font-bold text-lg mb-3 text-center">
                Get in Touch
              </h2>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <a
                    href="https://www.instagram.com/thinkvelocity/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Instagram"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/Insta.png"
                      alt="Instagram"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://x.com/VelocityThink"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Twitter"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/X.png"
                      alt="Twitter"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://www.linkedin.com/company/totem-interactive/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="LinkedIn"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/linkden.png"
                      alt="LinkedIn"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only content for Quick Links and Get in Touch */}
          <div className="flex justify-between sm:hidden">
            {/* Quick Links for mobile */}
            <div className="mr-4">
              <h2 className="font-bold text-lg mb-2">Quick Links</h2>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <Link
                    href="/"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacypolicy"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact-us"
                    className="hover:text-[#00C8F0] transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get in Touch for mobile */}
            <div>
              <h2 className="font-bold text-lg mb-3 text-center">
                Get in Touch
              </h2>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <a
                    href="https://www.instagram.com/thinkvelocity/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Instagram"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/Insta.png"
                      alt="Instagram"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://x.com/VelocityThink"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="Twitter"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/X.png"
                      alt="Twitter"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="https://www.linkedin.com/company/totem-interactive/"
                    className="p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    aria-label="LinkedIn"
                    style={{
                      backgroundColor: "#00C8F0",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 1px 0px rgb(0, 0, 0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "2px 2px 2px black";
                    }}
                  >
                    <Image
                      src="https://thinkvelocity.in/next-assets/linkden.png"
                      alt="LinkedIn"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright text */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-xs text-gray-600">
            © Copyright 2025 VELOCITY | Designed by TOTEM INTERACTIVE
          </p>
          <a
            href="#top"
            className="bg-[#00C8F0] text-white p-1 rounded-md flex items-center justify-center w-8 h-8 text-lg"
            aria-label="Back to top"
            style={{
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px 0px rgb(0, 0, 0)",
            }}
          >
            ↑
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
