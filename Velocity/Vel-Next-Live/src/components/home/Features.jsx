import React from 'react';
import Image from 'next/image';

const Features = () => {
  return (
    <div className="py-10">
      <div className= "bg-black text-white flex items-center justify-center py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 w-full">
          <h2 className="text-center font-[Amenti] text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-2 sm:mb-10 md:mb-12 lg:mb-16 text-white bg-clip-text text-transparent">
            Future of AI
          </h2>
          <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start pt-4 md:pt-12 lg:pt-16">
            {/* Hero Section - Left Side */}
            <div className="w-full md:w-2/5 lg:w-1/3 pl-0 md:pl-4 lg:pl-8 mb-0 md:mb-12 md:mb-0">
              <div className="mb-8 md:mb-20 lg:mb-32">
                <h1 className="font-[Amenti] text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-center md:text-left">
                <span className="inline sm:inline md:block lg:block">Accelerating</span>{' '}
                <span className="inline sm:inline md:block lg:block">AI Revolution</span>
                </h1>
                <button 
                  onClick={() => window.open('https://chromewebstore.google.com/detail/velocity/ggiecgdncaiedmdnbmgjhpfniflebfpa', '_blank')}
                  className="flex mx-auto md:mx-0 bg-blue-500 text-white px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full text-sm md:text-base hover:bg-blue-400 transition-colors items-center gap-2"
                >
                  <Image
                    src="/assets/extension_velocity.png"
                    alt="Velocity Icon"
                    width={20}
                    height={20}
                    className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                  />
                  Experience Velocity
                </button>
              </div>
            </div>

            {/* Features Grid - Right Side */}
            <div className="w-full md:w-3/5 lg:w-2/3 pl-0 md:pl-8 lg:pl-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 sm:gap-y-8 md:gap-y-10 lg:gap-y-16 gap-x-6 sm:gap-x-6 md:gap-x-10 lg:gap-x-16">
                {/* Feature 1 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Image 
                      src="/assets/workflow.png" 
                      alt="Workflow" 
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-[Amenti] text-base sm:text-lg md:text-base lg:text-xl xl:text-2xl font-semibold mb-0.5 sm:mb-1 md:mb-2">
                      Seamless Workflow Integration
                    </h3>
                    <p className="text-gray-400 text-sm sm:text-base md:text-sm lg:text-lg leading-relaxed">
                      One-click enhancements within your LLM's chatbox
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Image 
                      src="/assets/multi_llm.png" 
                      alt="Multi LLM" 
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-[Amenti] text-base sm:text-lg md:text-base lg:text-xl xl:text-2xl font-semibold mb-0.5 sm:mb-1 md:mb-2">
                      Multi LLM Model Capabilities
                    </h3>
                    <p className="text-gray-400 text-sm sm:text-base md:text-sm lg:text-lg leading-relaxed">
                      Seamlessly integrates with major LLMs
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Image 
                      src="/assets/personalized.png" 
                      alt="Personalized" 
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-[Amenti] text-base sm:text-lg md:text-base lg:text-xl xl:text-2xl font-semibold mb-0.5 sm:mb-1 md:mb-2">
                      Context-Aware Suggestions
                    </h3>
                    <p className="text-gray-400 text-sm sm:text-base md:text-sm lg:text-lg leading-relaxed">
                      Velocity adapts style & context, & provides highly relevant refinements
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start gap-4 relative">
                  <div className="flex-shrink-0 mt-1">
                    <Image 
                      src="/assets/promptlib_bg.png" 
                      alt="Prompt Library" 
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="relative">
                    <h3 className="font-[Amenti] text-base sm:text-lg md:text-base lg:text-xl xl:text-2xl font-semibold mb-0.5 sm:mb-1 md:mb-2">
                      Access Your Prompt Library
                    </h3>
                    <p className="text-gray-400 text-sm sm:text-base md:text-sm lg:text-lg leading-relaxed">
                      Access past prompts with Velocity's intuitive prompt history
                    </p>
                    <div className="absolute -top-4 sm:-top-5 md:-top-7 right-0 bg-blue-500 text-white text-[9px] sm:text-xs md:text-xs font-medium px-1.5 sm:px-2 md:px-3 py-0.5 md:py-1 rounded-md shadow-md shadow-blue-500/30 border border-blue-400">
                      Coming Soon
                    </div>
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

export default Features;