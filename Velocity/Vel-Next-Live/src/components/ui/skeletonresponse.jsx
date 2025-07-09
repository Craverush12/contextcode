import React from "react";
import { ArrowRight } from "lucide-react";

const SkeletonResponseBox = () => {
  return (
    <div className="space-y-6 pt-24 sm:pt-36 pb-8 sm:pb-16">
      {/* Header Section */}
      <div className="text-center space-y-2 mb-4 sm:mb-8">
        <div className="h-8 sm:h-10 bg-gray-700 animate-pulse rounded w-64 mx-auto mb-2"></div>
        <div className="h-3 sm:h-4 bg-gray-600 animate-pulse rounded w-72 mx-auto"></div>
      </div>

      {/* Prompt Box Area */}
      <div className="relative max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4">
        {/* Style Selection */}
        <div className="space-y-4 sm:space-y-6">
          <div className="h-6 bg-gray-700 animate-pulse rounded w-40 mb-4"></div>

          {/* Style Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {[...Array(4)].map((_, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg border border-gray-700/45 bg-gray-900/45 animate-pulse"
              >
                <div className="flex items-start">
                  <div className="w-6 h-6 mr-3 bg-gray-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-700 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-full hidden sm:block"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative mt-4">
            <div className="w-full h-24 sm:h-40 bg-[#121212] border border-[#1E1E1E] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="absolute bottom-5 right-5">
              <div className="h-8 w-48 bg-gray-700 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Analysis Results Section */}
        <div className="mt-8 space-y-6">
          <div className="bg-[#121212] border border-[#1E1E1E] rounded-lg p-4 flex-col">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Suggested Platform */}
              <div className="w-full md:w-[40%]">
                <div className="h-5 bg-gray-700 rounded w-36 mb-2"></div>
                <div className="bg-[#0A0A0A] rounded-lg p-3 mb-2">
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-3">
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
              
              {/* Analysis */}
              <div className="w-full md:w-[60%] flex flex-col gap-4">
                <div>
                  <div className="h-5 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="flex flex-row justify-center gap-3">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-gray-700 flex items-center justify-center animate-pulse">
                          <div className="h-8 w-8 bg-gray-600 rounded-full"></div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded w-12 mt-2"></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recommendations */}
                <div>
                  <div className="h-5 bg-gray-700 rounded w-36 mb-2"></div>
                  <div className="bg-[#0A0A0A] rounded-lg p-3">
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonResponseBox;