/**
 * Social Media Preview Component
 * Shows how your Open Graph data will appear on different platforms
 */

import React, { useState } from "react";
import Image from "next/image";

const SocialPreview = ({
  title = "Velocity - Co-Pilot for AI | One-Click Prompt Optimizer",
  description = "Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!",
  image = "https://thinkvelocity.in/next-assets/61.png",
  url = "https://thinkvelocity.in/",
  siteName = "Think Velocity",
}) => {
  const [activeTab, setActiveTab] = useState("facebook");

  const FacebookPreview = () => (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden max-w-md">
      <div className="relative h-52">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500 uppercase mb-1">
          {new URL(url).hostname}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
          {title}
        </h3>
        <p className="text-gray-600 text-xs line-clamp-2">{description}</p>
      </div>
    </div>
  );

  const TwitterPreview = () => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-md">
      <div className="relative h-52">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="p-3 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
          {title}
        </h3>
        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{description}</p>
        <div className="flex items-center text-gray-500 text-xs">
          <span>🔗</span>
          <span className="ml-1">{new URL(url).hostname}</span>
        </div>
      </div>
    </div>
  );

  const LinkedInPreview = () => (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden max-w-md">
      <div className="relative h-52">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
          {title}
        </h3>
        <p className="text-gray-600 text-xs line-clamp-3 mb-2">{description}</p>
        <div className="text-gray-500 text-xs">{new URL(url).hostname}</div>
      </div>
    </div>
  );

  const WhatsAppPreview = () => (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden max-w-sm">
      <div className="relative h-48">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="p-3 bg-gray-50">
        <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
          {title}
        </h3>
        <p className="text-gray-600 text-xs line-clamp-2 mb-2">{description}</p>
        <div className="text-blue-600 text-xs font-medium">
          {new URL(url).hostname}
        </div>
      </div>
    </div>
  );

  const DiscordPreview = () => (
    <div className="bg-gray-800 text-white rounded-lg overflow-hidden max-w-md p-4">
      <div className="flex">
        <div className="w-3 bg-blue-500 rounded-l"></div>
        <div className="flex-1 ml-3">
          <div className="text-blue-400 text-xs mb-1 font-medium">
            {siteName}
          </div>
          <h3 className="text-blue-400 text-sm font-semibold mb-1 line-clamp-1">
            {title}
          </h3>
          <p className="text-gray-300 text-xs line-clamp-3 mb-3">
            {description}
          </p>
          <div className="relative h-48 rounded">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const SlackPreview = () => (
    <div className="border-l-4 border-blue-500 pl-3 py-2 max-w-md">
      <div className="text-blue-600 text-sm font-semibold mb-1">{title}</div>
      <p className="text-gray-600 text-xs mb-2 line-clamp-2">{description}</p>
      <div className="relative h-32 rounded overflow-hidden mb-2">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="text-gray-500 text-xs">{new URL(url).hostname}</div>
    </div>
  );

  const renderPreview = () => {
    switch (activeTab) {
      case "facebook":
        return <FacebookPreview />;
      case "twitter":
        return <TwitterPreview />;
      case "linkedin":
        return <LinkedInPreview />;
      case "whatsapp":
        return <WhatsAppPreview />;
      case "discord":
        return <DiscordPreview />;
      case "slack":
        return <SlackPreview />;
      default:
        return <FacebookPreview />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Social Media Preview
      </h2>

      {/* Platform Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {[
          { id: "facebook", name: "Facebook", color: "bg-blue-600" },
          { id: "twitter", name: "Twitter", color: "bg-sky-500" },
          { id: "linkedin", name: "LinkedIn", color: "bg-blue-700" },
          { id: "whatsapp", name: "WhatsApp", color: "bg-green-500" },
          { id: "discord", name: "Discord", color: "bg-indigo-600" },
          { id: "slack", name: "Slack", color: "bg-purple-600" },
        ].map((platform) => (
          <button
            key={platform.id}
            onClick={() => setActiveTab(platform.id)}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
              activeTab === platform.id
                ? platform.color
                : "bg-gray-400 hover:bg-gray-500"
            }`}
          >
            {platform.name}
          </button>
        ))}
      </div>

      {/* Preview Area */}
      <div className="flex justify-center items-center min-h-96 bg-gray-100 rounded-lg p-6">
        {renderPreview()}
      </div>

      {/* Meta Data Display */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Current Meta Data:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Title:</strong>
            <p className="text-gray-600 break-words">{title}</p>
          </div>
          <div>
            <strong>Description:</strong>
            <p className="text-gray-600 break-words">{description}</p>
          </div>
          <div>
            <strong>Image:</strong>
            <p className="text-gray-600 break-words">{image}</p>
          </div>
          <div>
            <strong>URL:</strong>
            <p className="text-gray-600 break-words">{url}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default SocialPreview;
