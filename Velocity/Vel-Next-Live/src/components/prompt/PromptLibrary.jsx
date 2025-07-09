"use client";

import React, { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import PropTypes from "prop-types";
import Image from "next/image";
import velocitylogo from "../../assets/velocitylogo.png";

export default function PromptLibraryPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Featured");

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu when a tab is selected
  };

  const renderPromptCards = () => {
    return (
      <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <PromptCard
          title="The Storyteller's Muse"
          description="Craft compelling narratives with AI-powered inspiration"
          color="bg-[#00a99d]"
          tags={["Creative Writing", "Storytelling"]}
          delay="delay-[100ms]"
        />
        <PromptCard
          title="Code Whisperer"
          description="Optimize your programming workflow with precision prompts"
          color="bg-[#4ecdc4]"
          tags={["Coding", "Software Development"]}
          delay="delay-[200ms]"
        />
        <PromptCard
          title="Design Alchemist"
          description="Transform concepts into visual masterpieces"
          color="bg-[#f7d488]"
          tags={["Visual Design", "UI/UX", "Creative Arts"]}
          delay="delay-[300ms]"
        />
        <PromptCard
          title="Data Detective"
          description="Uncover insights and patterns in complex datasets"
          color="bg-[#00a99d]"
          tags={["Data Analysis", "Research", "Visualization"]}
          delay="delay-[400ms]"
        />
        <PromptCard
          title="Brand Builder"
          description="Craft a strong brief for a holistic brand identity"
          color="bg-[#4ecdc4]"
          tags={["Image Generation", "Marketing"]}
          delay="delay-[500ms]"
        />
        <PromptCard
          title="Academic Accelerator"
          description="Elevate your research and writing to scholarly pursuits"
          color="bg-[#f7d488]"
          tags={["Academic Writing", "Thesis"]}
          delay="delay-[600ms]"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col p-4 md:p-12 md:flex-row min-h-screen bg-[#000000] text-white relative overflow-hidden">
      {/* Circular Glow Effect at the top */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div
          className="absolute -top-1/4 left-2/3 transform -translate-x-1/2 
          w-[800px] h-[800px] 
          bg-[#008bcb83] 
          rounded-full 
          blur-[150px] 
          opacity-50 
          z-0"
        ></div>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="md:hidden fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-4">
        <div className="flex-grow flex ">
          <Image
            src={velocitylogo}
            className="h-8"
            alt="Velocity Logo"
            width={32}
            height={32}
          />
        </div>
        <button onClick={toggleMobileMenu} className="bg-[#111] p-2 rounded-md">
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar for Mobile */}
      <div
        className={`
          fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:w-[20%] md:block md:mr-8
          overflow-y-auto
      `}
      >
        <div className="p-6 bg-gradient-to-b from-[#242424] to-[#000000] md:rounded-xl md:border md:border-gray-700">
          <div className="mb-8 flex justify-end items-center md:hidden">
            <button onClick={toggleMobileMenu} className="text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-4">All Prompts</h2>
              <div className="space-y-3">
                <p
                  className={`text-sm cursor-pointer ${
                    activeTab === "Featured"
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => handleTabChange("Featured")}
                >
                  Featured
                </p>
                <p
                  className={`text-sm cursor-pointer ${
                    activeTab === "New"
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => handleTabChange("New")}
                >
                  New Arrivals
                </p>
                <p
                  className={`text-sm cursor-pointer ${
                    activeTab === "Popular"
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => handleTabChange("Popular")}
                >
                  Most Popular
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3">Categories</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Writing
                </p>
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Coding
                </p>
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Design
                </p>
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Marketing
                </p>
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Research
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3">Learn</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Prompt Crafting Tips
                </p>
                <p className="text-sm text-gray-400 hover:text-white cursor-pointer">
                  Tutorials
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow overflow-auto z-10 md:mt-0 mt-16">
        {/* Header */}
        <div className="p-8 md:p-10 bg-transparent">
          <h1 className="text-2xl md:text-3xl font-[Amenti] mb-1 text-center">
            Discover the Power of Precision Prompting
          </h1>
          <p className="text-gray-400 mb-8 text-center">
            Level up your prompting skills
          </p>

          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Research Paper"
              className="w-full bg-[#111]/50 border border-[#333]/50 rounded-md py-2 pl-10 pr-4 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 md:px-8 border-b border-[#222] flex space-x-8">
          <button
            className={`pb-2 text-xs md:text-base font-medium ${
              activeTab === "Featured"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("Featured")}
          >
            Featured Prompts
          </button>
          <button
            className={`pb-2 text-xs md:text-base font-medium ${
              activeTab === "New"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("New")}
          >
            New Arrivals
          </button>
          <button
            className={`pb-2 text-xs md:text-base font-medium ${
              activeTab === "Popular"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("Popular")}
          >
            Most Popular
          </button>
        </div>

        {/* Prompt Cards Grid */}
        {renderPromptCards()}

        {/* Bottom Section */}
        <div className="p-8 bg-transparent">
          <h2 className="text-xl font-bold mb-6">
            Start here to supercharge your AI interactions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <LargeCard
              title="The Art of Precision Prompting"
              description="Discover the secrets of crafting perfect prompts"
              color="bg-[#1a1a1a]"
              delay="delay-[700ms]"
            />
            <LargeCard
              title="Unlocking Industry Potential"
              description="Specialized AI prompting for business use cases"
              color="bg-[#4ecdc4]"
              delay="delay-[800ms]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LargeCard
              title="From Novice to AI Whisperer: Your Learning Path"
              description="A step-by-step guide to mastering AI prompts"
              color="bg-[#3d7e9a]"
              delay="delay-[900ms]"
            />
            <LargeCard
              title="Measuring & Improving Your Prompt Performance"
              description="Analytical insights to refine your prompt strategies"
              color="bg-[#3d7e9a]"
              delay="delay-[1000ms]"
            />
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleMobileMenu}
        ></div>
      )}
    </div>
  );
}

function PromptCard({ title, description, color, tags, delay = "" }) {
  return (
    <div
      className={`flex flex-col h-full opacity-0 translate-y-4 animate-[fadeInUp_0.6s_ease-out_forwards] ${delay}`}
    >
      <div className={`${color} rounded-lg h-48 mb-3`}></div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">{description}</p>
      <div className="flex flex-wrap gap-1 mt-auto">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="text-xs bg-[#4d4d4d] text-gray-200 px-2 py-0.5 rounded-xl"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

PromptCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  delay: PropTypes.string,
};

function LargeCard({ title, description, color, delay = "" }) {
  return (
    <div
      className={`flex flex-col h-full opacity-0 translate-y-4 animate-[fadeInUp_0.6s_ease-out_forwards] ${delay}`}
    >
      <div className={`${color} rounded-lg h-52 mb-3`}></div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

LargeCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  delay: PropTypes.string,
};
