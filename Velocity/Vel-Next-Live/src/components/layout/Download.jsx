"use client";

import React from "react";

const Download = () => {
  const handleDownload = () => {
    window.open(
      "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
      "_blank"
    );
  };

  return (
    <div className="w-full bg-[#CDF6FE] px-6 py-12 md:py-16 rounded-lg shadow-sm">
      <div className="w-full mx-4 md:mx-8 pl-32 pr-56 flex flex-col md:flex-row items-center justify-between gap-10 md:gap-16 lg:gap-20">
        {/* Left side content */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 font-dmsans">
            Get Velocity Extension.
          </h2>
          <p className="text-gray-700 text-base md:text-lg lg:text-xl font-dmsans">
            No prompt expertise needed, just one click and clearer results,
            instantly!
          </p>
        </div>

        {/* Right side download button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleDownload}
            className="bg-white border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-gray-900 font-semibold px-8 py-4 md:px-10 md:py-5 text-lg md:text-xl rounded-full  shadow-sm transition-colors duration-200 flex items-center gap-3 font-dmsans whitespace-nowrap"
            style={{
              boxShadow: "1px 1px 2px black",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "2px 2px 2px black";
            }}
          >
            Download Now for Free
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Download;
