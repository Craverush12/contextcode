"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import ShareReferral from "./ShareReferral";

const PromptGrid = () => {
  const [visiblePrompts, setVisiblePrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [createClicked, setCreateClicked] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("professional"); // Default theme
  const [selectedModel, setSelectedModel] = useState(null);
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userId, setUserId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [shareButtonClicked, setShareButtonClicked] = useState(false);
  const [copyButtonClicked, setCopyButtonClicked] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const observerRef = useRef(null);

  const ITEMS_PER_PAGE = 30;

  // Model filter buttons (move to top level)
  const modelButtons = [
    {
      key: "all",
      label: "All Models",
      onClick: () => setSelectedModel(null),
      selected: selectedModel === null,
      icon: null,
    },
    {
      key: "chatgpt",
      label: "ChatGPT",
      onClick: () => setSelectedModel("ChatGPT"),
      selected: selectedModel === "ChatGPT",
      icon: "https://thinkvelocity.in/next-assets/Chatgp_Sm_LOGO.png",
    },
    {
      key: "claude",
      label: "Claude",
      onClick: () => setSelectedModel("Claude"),
      selected: selectedModel === "Claude",
      icon: "https://thinkvelocity.in/next-assets/claude_icon.png",
    },
    {
      key: "gemini",
      label: "Gemini",
      onClick: () => setSelectedModel("Gemini"),
      selected: selectedModel === "Gemini",
      icon: "https://thinkvelocity.in/next-assets/gemini_icon.png",
    },
    {
      key: "perplexity",
      label: "Perplexity",
      onClick: () => setSelectedModel("Perplexity"),
      selected: selectedModel === "Perplexity",
      icon: "https://thinkvelocity.in/next-assets/peplixity_Icon.png",
    },
    {
      key: "grok",
      label: "Grok",
      onClick: () => setSelectedModel("Grok"),
      selected: selectedModel === "Grok",
      icon: "https://thinkvelocity.in/next-assets/grok_icon.png",
    },
    {
      key: "bolt",
      label: "Bolt",
      onClick: () => setSelectedModel("Bolt"),
      selected: selectedModel === "Bolt",
      icon: "https://thinkvelocity.in/next-assets/Bolt_icon.png",
    },
    {
      key: "vercel",
      label: "Vercel",
      onClick: () => setSelectedModel("Vercel"),
      selected: selectedModel === "Vercel",
      icon: "https://thinkvelocity.in/next-assets/Vercel_icon.png",
    },
    {
      key: "gamma",
      label: "Gamma",
      onClick: () => setSelectedModel("Gamma"),
      selected: selectedModel === "Gamma",
      icon: "https://thinkvelocity.in/next-assets/Gamma_icon.png",
    },
    {
      key: "lovable",
      label: "Lovable",
      onClick: () => setSelectedModel("Lovable"),
      selected: selectedModel === "Lovable",
      icon: "https://thinkvelocity.in/next-assets/lovable_icon.png",
    },
  ];

  // Initialize userId and authToken safely after component mounts
  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      setUserId(localStorage.getItem("userId") || "");
      setAuthToken(localStorage.getItem("token") || "");
    }
  }, []);

  // Theme definitions for style labels only
  const themes = {
    creative: {
      bgColor: "bg-[#009C99]",
      textColor: "text-black",
    },
    professional: {
      bgColor: "bg-[#338AE8]",
      textColor: "text-black",
    },
    concise: {
      bgColor: "bg-[#4A3AD1]",
      textColor: "text-black",
    },
    descriptive: {
      bgColor: "bg-[#FE553D]",
      textColor: "text-black",
    },
    refined: {
      // Add the new refined theme
      bgColor: "bg-[#9333EA]", // Purple color for refined style
      textColor: "text-black",
    },
  };

  const fetchPromptHistory = useCallback(
    async (pageNum) => {
      // Don't fetch if userId or authToken is not available
      if (!userId || !authToken) return;

      try {
        setLoading(true);
        const response = await fetch(
          `https://thinkvelocity.in/backend-V1-D/prompt/fetch-user-history/${userId}?limit=${ITEMS_PER_PAGE}&page=${pageNum}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch prompt history");
        }

        const data = await response.json();
        console.log("prompt grid data", data);

        // Save total pages information
        if (data.history?.total_pages) {
          setTotalPages(data.history.total_pages);
          setHasMore(pageNum < data.history.total_pages);
        } else {
          setTotalPages(1);
          setHasMore(false);
        }

        // Get prompt history from the new data structure
        const promptHistory = data.history?.user_prompt_history || [];

        // Add a theme to each prompt based on selected_style
        const promptsWithThemes = promptHistory.map((prompt) => {
          const style = prompt.selected_style || "professional";
          const normalizedStyle = style.toLowerCase();
          const validTheme = Object.keys(themes).includes(normalizedStyle)
            ? normalizedStyle
            : "professional";

          return {
            ...prompt,
            theme: validTheme,
            prompt: prompt.prompt,
            enhancedPrompt: prompt.enhanced_prompt,
            prompt_id: prompt.id,
            ai_type: prompt.llm_used?.toLowerCase() || "",
            content_type: "response", // Since this is the response data
            created_at: prompt.created_at,
          };
        });

        // Sort by creation date (newest first)
        const sortedPrompts = promptsWithThemes.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Always replace prompts on page change - don't append
        setVisiblePrompts(sortedPrompts);
      } catch (err) {
        console.error("Error fetching prompt history:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId, authToken, ITEMS_PER_PAGE]
  );

  // Initial data fetch
  useEffect(() => {
    if (userId && authToken) {
      fetchPromptHistory(1);
    }
  }, [fetchPromptHistory, userId, authToken]);

  // Function to handle page changes
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      fetchPromptHistory(newPage);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !authToken) return;

      try {
        const profileResponse = await fetch(
          `https://thinkvelocity.in/backend-V1-D/getProfile/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          // console.log("profileData",profileData);

          if (profileData.user?.name) {
            setName(profileData.user.name);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Clear auth data and redirect to login
        localStorage.removeItem("userId");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    };

    fetchUserData();
  }, [fetchPromptHistory, userId, authToken, page]);

  const copyToClipboard = (text, index, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      // For the overlay copy button
      if (index === -1) {
        setCopyButtonClicked(true);
        setTimeout(() => setCopyButtonClicked(false), 1000);
      }
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const getResponseText = (item) => {
    return item.prompt || "No text available";
  };

  const handleShare = (item, e) => {
    e.stopPropagation();
    // Set button state for visual feedback
    setShareButtonClicked(true);
    setTimeout(() => setShareButtonClicked(false), 1000);

    // Implement your share functionality here
    if (navigator.share) {
      navigator
        .share({
          title: "Shared Prompt",
          text: item.prompt,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
        });
    } else {
      // Fallback for browsers that don't support the Web Share API
      alert("Sharing is not supported in this browser");
    }
  };

  // Filter prompts based on search query and selected model
  const filteredPrompts = visiblePrompts.filter((item) => {
    // First filter by content_type - only show response type
    if (item.content_type !== "response") return false;

    // Then filter by search query
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.prompt?.toLowerCase().includes(searchQuery.toLowerCase());

    // Then filter by selected model if one is selected
    if (selectedModel === null) return matchesSearch;

    // Get the AI type from the prompt, handle case variations
    const promptAiType = (item.ai_type || "").toLowerCase();
    const selectedAiType = selectedModel.toLowerCase();

    // Match the AI type based on the selected model
    const matchesModel = (() => {
      switch (selectedAiType) {
        case "chatgpt":
          return promptAiType === "chatgpt" || promptAiType === "gpt";
        case "gemini":
          return promptAiType === "gemini";
        case "claude":
          return promptAiType === "claude";
        case "grok":
          return promptAiType === "grok";
        case "perplexity":
          return promptAiType === "perplexity";
        case "bolt":
          return promptAiType === "bolt";
        case "vercel":
          return promptAiType === "vercel";
        case "gamma":
          return promptAiType === "gamma";
        case "lovable":
          return promptAiType === "lovable";
        default:
          return true;
      }
    })();

    return matchesSearch && matchesModel;
  });

  // Add new functions for profile management
  const handleEditProfile = () => {
    setIsEditing(true);
    setShowDropdown(false);
  };

  const handleChange = (e) => {
    setName(e.target.value);
  };

  const handleSave = async () => {
    setIsEditing(false);
  };

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        // Clear all local storage and session storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies
        document.cookie.split(";").forEach((cookie) => {
          const name = cookie.split("=")[0].trim();
          document.cookie = `${name}=;expires=${new Date(
            0
          ).toUTCString()};path=/;`;
        });

        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  // Pagination component
  const Pagination = () => {
    // Calculate visible page numbers
    const getPageNumbers = () => {
      const visiblePageCount = 5; // Show 5 page numbers at a time
      let startPage = Math.max(1, page - Math.floor(visiblePageCount / 2));
      let endPage = startPage + visiblePageCount - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - visiblePageCount + 1);
      }

      return Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
      );
    };

    return (
      <div className="flex justify-center items-center mt-8 mb-4">
        {/* First page button */}
        <button
          onClick={() => handlePageChange(1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
          }}
          disabled={page === 1 || loading}
          className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none pagination-button mx-1 px-3 py-1 rounded-md border-2 
            ${
              page === 1 || loading
                ? "border-black text-black cursor-not-allowed"
                : "border-black text-black hover:bg-gray-100"
            }`}
          style={{
            boxShadow: page === 1 || loading ? "none" : "2px 2px 0px black",
            borderRadius: "10px",
          }}
        >
          &laquo;
        </button>

        {/* Previous page button */}
        <button
          onClick={() => handlePageChange(page - 1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
          }}
          disabled={page === 1 || loading}
          className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none pagination-button mx-1 px-3 py-1 rounded-md border-2
            ${
              page === 1 || loading
                ? "border-black -300 text-black cursor-not-allowed"
                : "border-black text-black hover:bg-gray-100"
            }`}
          style={{
            boxShadow: page === 1 || loading ? "none" : "2px 2px 0px black",
            borderRadius: "10px",
          }}
        >
          &lsaquo;
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "2px 2px 2px rgb(0, 0, 0)";
            }}
            disabled={loading}
            className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none pagination-button mx-1 px-3 py-1 rounded-md border-2
              ${
                pageNum === page
                  ? "bg-[#CDF6FE] text-black border-black"
                  : "border-black text-black hover:bg-gray-100"
              }`}
            style={{
              boxShadow: loading ? "none" : "2px 2px 2px black",
              borderRadius: "10px",
            }}
          >
            {pageNum}
          </button>
        ))}

        {/* Next page button */}
        <button
          onClick={() => handlePageChange(page + 1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 2px rgb(0, 0, 0)";
          }}
          disabled={page === totalPages || loading}
          className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none pagination-button mx-1 px-3 py-1 rounded-md border-2
            ${
              page === totalPages || loading
                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                : "border-black text-black hover:bg-gray-100"
            }`}
          style={{
            boxShadow:
              page === totalPages || loading ? "none" : "2px 2px 2px black",
            borderRadius: "10px",
          }}
        >
          &rsaquo;
        </button>

        {/* Last page button */}
        <button
          onClick={() => handlePageChange(totalPages)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 2px rgb(0, 0, 0)";
          }}
          disabled={page === totalPages || loading}
          className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none pagination-button mx-1 px-3 py-1 rounded-md border-2
            ${
              page === totalPages || loading
                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                : "border-black text-black hover:bg-gray-100"
            }`}
          style={{
            boxShadow:
              page === totalPages || loading ? "none" : "2px 2px 2px black",
            borderRadius: "10px",
          }}
        >
          &raquo;
        </button>
      </div>
    );
  };

  // Function to handle prompt click
  const handlePromptClick = (item) => {
    // If this card's prompt is already selected, close the overlay
    if (selectedPrompt && selectedPrompt.id === item.id) {
      setSelectedPrompt(null);
      return;
    }

    // Set the selected prompt with both original and enhanced versions
    setSelectedPrompt({
      id: item.id,
      userPrompt: item.prompt,
      enhancedPrompt: item.enhancedPrompt,
      created_at: item.created_at,
      ai_type: item.ai_type,
      selected_style: item.selected_style
    });
  };

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="pb-10 pr-4 sm:pr-10 pl-4 w-full relative font-dm-sans">
      {/* Update Profile Section with responsive classes */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-4 mb-6 mt-10">
        <h3
          className="text-black text-xl sm:text-2xl font-medium font-dm-sans"
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          History
        </h3>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              window.open(
                "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
                "_blank"
              );
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "2px 2px 2px black";
            }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border-2 border-black rounded-lg bg-white text-black font-dm-sans hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none whitespace-nowrap"
            style={{
              fontWeight: "600",
              color: "#152A32",
              borderRadius: "10px",
              boxShadow: "2px 2px 2px black",
            }}
          >
            Add to chrome
          </button>
          <div>
            <ShareReferral userId={userId} authToken={authToken} />
          </div>
        </div>
      </div>

      <div
        className="flex justify-between items-center mb-6"
        style={{
          border: "1px solid #000000",
          borderRadius: "9999px",
        }}
      ></div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border-2 border-black rounded-lg bg-white text-black"
            style={{
              borderRadius: "10px",
            }}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-[#00D2FF] text-black border-2 border-black rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 whitespace-nowrap flex items-center justify-center sm:justify-start gap-2"
            style={{
              borderRadius: "10px",
              boxShadow: "2px 2px 2px black",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "2px 2px 2px black";
            }}
          >
            {selectedModel === null ? "All Models" : selectedModel}
            <svg
              className={`w-4 h-4 transition-transform ${
                showModelDropdown ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Model Dropdown */}
          {showModelDropdown && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-lg shadow-lg z-50"
              style={{
                borderRadius: "10px",
                boxShadow: "2px 2px 2px black",
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    setSelectedModel(null);
                    setShowModelDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-[#CDF6FE] text-black flex items-center gap-2 ${
                    selectedModel === null ? "font-bold" : ""
                  }`}
                >
                  <span className="inline-block w-5 h-5"></span> All Models
                </button>
                {modelButtons
                  .filter((m) => m.key !== "all")
                  .map((model) => (
                    <button
                      key={model.key}
                      onClick={() => {
                        setSelectedModel(model.label);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-[#CDF6FE] text-black flex items-center gap-2 ${
                        selectedModel === model.label ? "font-bold" : ""
                      }`}
                    >
                      {model.icon && (
                        <Image
                          src={model.icon}
                          alt={model.label}
                          width={20}
                          height={20}
                          className="w-5 h-5"
                          style={
                            model.key === "vercel"
                              ? { filter: "brightness(0)" }
                              : {}
                          }
                        />
                      )}
                      {model.label}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredPrompts.length === 0 && !loading && (
        <p
          className="text-gray-400 text-sm sm:text-lg py-2 sm:py-4 font-dm-sans"
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          {selectedModel
            ? `No responses found for ${selectedModel}. Try selecting a different AI model.`
            : "No responses found in your history."}
        </p>
      )}

      {/* Update layout to match design */}
      <div className="flex flex-col space-y-2 w-full">
        {filteredPrompts.map((item, index) => {
          const uniqueKey = `${item.prompt_id}-${index}`;
          const aiType = (item.ai_type || "").toLowerCase();

          const truncateText = (text) => {
            const words = text.split(" ");
            if (words.length > 10) {
              return words.slice(0, 10).join(" ") + "...";
            }
            return text;
          };

          const displayText = truncateText(item.prompt || "No text available");

          // Get the appropriate icon based on AI type
          let modelIcon = "";
          switch (aiType) {
            case "chatgpt":
              modelIcon =
                "https://thinkvelocity.in/next-assets/Chatgp_Sm_LOGO.png";
              break;
            case "claude":
              modelIcon =
                "https://thinkvelocity.in/next-assets/claude_icon.png";
              break;
            case "gemini":
              modelIcon =
                "https://thinkvelocity.in/next-assets/gemini_icon.png";
              break;
            case "perplexity":
              modelIcon =
                "https://thinkvelocity.in/next-assets/peplixity_Icon.png";
              break;
            case "grok":
              modelIcon = "https://thinkvelocity.in/next-assets/grok_icon.png";
              break;
            case "bolt":
              modelIcon = "https://thinkvelocity.in/next-assets/Bolt_icon.png";
              break;
            case "vercel":
              modelIcon =
                "https://thinkvelocity.in/next-assets/Vercel_icon.png";
              break;
            case "gamma":
              modelIcon = "https://thinkvelocity.in/next-assets/Gamma_icon.png";
              break;
            case "lovable":
              modelIcon =
                "https://thinkvelocity.in/next-assets/lovable_icon.png";
              break;
            default:
              modelIcon =
                "https://thinkvelocity.in/next-assets/Chatgp_Sm_LOGO.png";
          }

          const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          return (
            <div
              key={uniqueKey}
              className="flex flex-col sm:flex-row sm:items-center p-4 bg-[#CDF6FE] rounded-xl"
            >
              {/* Icon and Text/Date container */}
              <div className="flex flex-1 items-start sm:items-center">
                {/* Model Icon */}
                <div className="flex-shrink-0 mr-4">
                  <Image
                    src={modelIcon}
                    alt={aiType}
                    width={40}
                    height={40}
                    className="w-10 h-10"
                    style={aiType === "vercel" ? { filter: "brightness(0)" } : {}}
                  />
                </div>

                {/* Prompt Text and Date */}
                <div className="flex-grow">
                  <p className="text-black text-base">{displayText}</p>
                  <p className="text-gray-600 text-sm mt-1 sm:hidden">{formattedDate}</p>
                </div>
              </div>

              {/* Date and Action Buttons container */}
              <div className="flex items-center justify-end sm:justify-start mt-3 sm:mt-0">
                 {/* Date for larger screens */}
                <p className="text-gray-600 text-sm whitespace-nowrap hidden sm:block mr-6">{formattedDate}</p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {/* Eye Button */}
                  <button
                    onClick={() => handlePromptClick(item)}
                    className="p-2 sm:p-3 rounded-full border-2 border-black bg-[#99EEFF] hover:bg-opacity-80 transition-all"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 4.37C3.75 4.37 1.25 10 1.25 10C1.25 10 3.75 15.63 10 15.63C16.25 15.63 18.75 10 18.75 10C18.75 10 16.25 4.37 10 4.37Z"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 13.13C11.7259 13.13 13.125 11.7309 13.125 10.005C13.125 8.27911 11.7259 6.88 10 6.88C8.27411 6.88 6.875 8.27911 6.875 10.005C6.875 11.7309 8.27411 13.13 10 13.13Z"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.prompt, index, e);
                    }}
                    className="p-2 sm:p-3 rounded-full border-2 border-black bg-[#99EEFF] hover:bg-opacity-80 transition-all"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      viewBox="0 0 16 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.95117 18H3.23633C1.68547 18 0.423828 16.7384 0.423828 15.1875V5.66016C0.423828 4.1093 1.68547 2.84766 3.23633 2.84766H9.95117C11.502 2.84766 12.7637 4.1093 12.7637 5.66016V15.1875C12.7637 16.7384 11.502 18 9.95117 18ZM3.23633 4.25391C2.46097 4.25391 1.83008 4.8848 1.83008 5.66016V15.1875C1.83008 15.9629 2.46097 16.5938 3.23633 16.5938H9.95117C10.7265 16.5938 11.3574 15.9629 11.3574 15.1875V5.66016C11.3574 4.8848 10.7265 4.25391 9.95117 4.25391H3.23633ZM15.5762 13.4297V2.8125C15.5762 1.26164 14.3145 0 12.7637 0H4.95898C4.57062 0 4.25586 0.314758 4.25586 0.703125C4.25586 1.09149 4.57062 1.40625 4.95898 1.40625H12.7637C13.539 1.40625 14.1699 2.03714 14.1699 2.8125V13.4297C14.1699 13.8181 14.4847 14.1328 14.873 14.1328C15.2614 14.1328 15.5762 13.8181 15.5762 13.4297Z"
                        fill="black"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="w-full flex justify-center py-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        </div>
      )}

      {/* Display page information */}
      {!loading && filteredPrompts.length > 0 && (
        <div
          className="w-full text-center mt-4 mb-2 text-gray-500 font-dm-sans"
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        >
          Page {page} of {totalPages} — Showing {filteredPrompts.length} items
        </div>
      )}

      {/* Display pagination controls */}
      {!loading && filteredPrompts.length > 0 && <Pagination />}

      {/* Show message when no responses are found */}
      {!loading && filteredPrompts.length === 0 && (
        <div
          className="w-full text-center py-6 text-gray-500 font-dm-sans"
          style={{
            color: "#152A32",
            fontWeight: "600",
          }}
        ></div>
      )}

      {selectedPrompt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10 p-4"
          onClick={() => setSelectedPrompt(null)}
        >
          <div
            className="bg-[#F3F4F6] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border-2 border-black"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "24px", boxShadow: "4px 4px 0px black" }}
          >
            {/* Overlay Header */}
            <div
              className="flex justify-between items-center p-4 border-b border-gray-300 bg-[#CDF6FE]"
              style={{
                borderTopLeftRadius: "22px",
                borderTopRightRadius: "22px",
              }}
            >
              <h3
                className="text-lg font-semibold text-black font-dm-sans"
                style={{
                  color: "#152A32",
                  fontWeight: "600",
                }}
              >
                Prompt Details
              </h3>
              <button
                onClick={() => setSelectedPrompt(null)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "2px 2px 1px rgb(0, 0, 0)";
                }}
                className="text-gray-500 hover:translate-x-[1px] hover:translate-y-[1px] hover:text-black p-1 rounded-full border border-black bg-white"
                style={{ boxShadow: "1px 1px 0px black" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Overlay Content - Scrollable */}
            <div className="px-6 pt-4 overflow-y-auto flex-grow">
              {/* Input Prompt Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-black font-dm-sans flex items-center px-3 py-1 rounded text-md"
                      style={{
                        color: "#151515",
                        fontWeight: "700",
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                      </svg>
                      User Prompt
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-dm-sans"
                    style={{
                      color: "#152A32",
                      fontWeight: "200",
                    }}>
                    {selectedPrompt && new Date(selectedPrompt.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <div className="font-dm-sans font-semibold bg-white p-4 min-h-20 max-h-48 overflow-y-auto shadow-sm"
                  style={{
                    color: "#152A32",
                    fontWeight: "600",
                    borderRadius: "16px",
                  }}>
                  <p className="text-black text-base whitespace-pre-wrap font-dm-sans"
                    style={{
                      color: "#152A32",
                      fontWeight: "600",
                    }}>
                    {selectedPrompt?.userPrompt}
                  </p>
                </div>
              </div>

              {/* Enhanced Prompt Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="font-dm-sans text-black flex items-center px-3 py-1 rounded text-md font-semibold"
                      style={{
                        color: "#151515",
                        fontWeight: "700",
                      }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                      Enhanced Prompt
                    </span>
                  </div>
                </div>
                <div className="font-switzer bg-white border-black border border-black p-4 min-h-56 overflow-y-auto shadow-sm"
                  style={{
                    borderRadius: "16px",
                  }}>
                  <p className="text-black text-base whitespace-pre-wrap font-dm-sans"
                    style={{
                      color: "#152A32",
                      fontWeight: "600",
                    }}>
                    {selectedPrompt?.enhancedPrompt}
                  </p>
                </div>
              </div>
            </div>

            {/* Overlay Footer (optional, for actions like copy/share) */}
            <div className="flex justify-between items-center px-4 pb-4 ">
              {/* Left side - Theme label */}
              <span
                className={`px-3 py-2 text-sm font-medium text-black border border-black flex items-center font-dm-sans`}
                style={{
                  backgroundColor: "#CDF6FE",
                  color:
                    themes[selectedPrompt.selected_style]?.textColor ||
                    themes.professional.textColor,
                  border: "1px solid rgb(126, 126, 126)",
                  borderRadius: "999px",
                  boxShadow: "1px 1px 1px rgba(0,0,0,0.2)",
                }}
              >
                {selectedPrompt.selected_style.charAt(0).toUpperCase() +
                  selectedPrompt.selected_style.slice(1)}
              </span>

              {/* Right side - Action buttons */}
              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  className={`flex items-center gap-1 border border-gray-300 p-2.5 rounded-full hover:translate-x-[1px] hover:translate-y-[1px] text-sm
                           ${
                             shareButtonClicked
                               ? "bg-green-200"
                               : "bg-white hover:bg-gray-100"
                           }`}
                  style={{
                    border: "1px solid #000000",
                    boxShadow: "2px 2px 1px black",
                    borderRadius: "999px",
                    transition: "background-color 0.3s, transform 0.2s",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(selectedPrompt, e);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "2px 2px 1px rgb(0, 0, 0)";
                  }}
                  title="Share"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 19 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block"
                  >
                    <path
                      d="M13.2656 0.838867C13.8959 0.532897 14.6128 0.431726 15.3066 0.545898L15.6025 0.607422C16.2875 0.783557 16.8859 1.16551 17.3145 1.68652L17.4873 1.91797C17.8651 2.47692 18.0398 3.13241 17.9912 3.78613L17.9561 4.06543C17.8275 4.80984 17.4123 5.48847 16.7832 5.96582C16.2322 6.3838 15.5528 6.62039 14.8486 6.64062L14.5459 6.63574C13.7354 6.58754 12.9767 6.25408 12.416 5.70703L12.1377 5.43555L11.8057 5.63867L7.48535 8.28418L7.12207 8.50586L7.2832 8.90039C7.57327 9.60903 7.57329 10.3939 7.2832 11.1025L7.12207 11.4971L7.48535 11.7188L11.8057 14.3643L12.1387 14.5674L12.417 14.2949C12.6803 14.0369 12.9901 13.8242 13.332 13.667L13.4805 13.6025C13.8312 13.4615 14.2054 13.3804 14.5859 13.3623L14.749 13.3584H14.75C15.3623 13.3582 15.9586 13.5215 16.4727 13.8252L16.6875 13.9639C17.2459 14.3558 17.6539 14.9042 17.8564 15.5264C18.0588 16.1483 18.047 16.8153 17.8223 17.4307C17.5974 18.0464 17.1695 18.5822 16.5967 18.9561C16.0235 19.33 15.3369 19.5211 14.6377 19.498L14.377 19.4795C13.859 19.4228 13.3641 19.2492 12.9336 18.9746L12.7236 18.8291C12.2481 18.4702 11.8921 17.9951 11.6904 17.4609L11.6143 17.2285C11.435 16.6006 11.4714 15.9349 11.7188 15.3271L11.8789 14.9336L11.5166 14.7119L7.19531 12.0664L6.86328 11.8633L6.58496 12.1357C6.19187 12.5201 5.699 12.8009 5.15527 12.9502L4.91895 13.0059C4.36137 13.117 3.78473 13.0872 3.24609 12.9219L3.01758 12.8428C2.49137 12.639 2.03424 12.31 1.68848 11.8916L1.54688 11.707C1.18917 11.2007 1 10.6062 1 10.001C1.00008 9.47162 1.14513 8.95116 1.4209 8.49023L1.54688 8.2959C1.86011 7.85261 2.29109 7.49383 2.79688 7.25488L3.01758 7.16016C3.54405 6.9563 4.11692 6.88712 4.67871 6.95801L4.91895 6.99609C5.556 7.12302 6.13562 7.42784 6.58496 7.86719L6.86328 8.13965L7.19531 7.93652L11.5166 5.29102L11.8789 5.06934L11.7188 4.67578C11.467 4.05894 11.433 3.3843 11.6182 2.75195L11.7109 2.48438C11.9587 1.86554 12.4121 1.33788 13.0039 0.981445L13.2656 0.838867ZM15.7939 13.9844C15.2946 13.7874 14.7464 13.7368 14.2178 13.8369C13.7552 13.9246 13.3232 14.1249 12.9639 14.4199L12.8145 14.5518C12.4766 14.8736 12.2301 15.275 12.1016 15.7168L12.0537 15.9092C11.9593 16.3618 11.99 16.8287 12.1406 17.2637L12.2129 17.4482C12.3976 17.873 12.693 18.2407 13.0664 18.5186L13.2314 18.6328C13.6828 18.92 14.2116 19.0713 14.75 19.0713C15.3811 19.0712 15.9929 18.8625 16.4824 18.4805L16.6846 18.3057C17.2027 17.8122 17.499 17.1376 17.499 16.4287C17.499 15.9665 17.3727 15.5152 17.1367 15.1182L17.0293 14.9512C16.7243 14.5166 16.2934 14.1814 15.7939 13.9844ZM5.29688 7.55664C4.85982 7.38421 4.38497 7.32326 3.91895 7.37793L3.7207 7.40918C3.25796 7.49685 2.82521 7.69702 2.46582 7.99219L2.31641 8.12402C1.97859 8.44579 1.73309 8.84736 1.60449 9.28906L1.55664 9.48145C1.46215 9.9341 1.49295 10.4009 1.64355 10.8359L1.71582 11.0205C1.90055 11.4453 2.19588 11.813 2.56934 12.0908L2.73438 12.2051C3.1856 12.4921 3.71368 12.6435 4.25195 12.6436C4.88328 12.6436 5.49563 12.435 5.98535 12.0527L6.1875 11.8789C6.7056 11.3854 7.00195 10.7099 7.00195 10.001C7.00187 9.53886 6.8756 9.08744 6.63965 8.69043L6.53223 8.52441C6.26534 8.14396 5.90184 7.83887 5.48047 7.63672L5.29688 7.55664ZM14.75 0.931641C14.1187 0.931641 13.5063 1.14028 13.0166 1.52246L12.8145 1.69629C12.2963 2.18978 12 2.8653 12 3.57422C12.0001 4.03637 12.1263 4.48773 12.3623 4.88477L12.4697 5.05078C12.7747 5.48549 13.2056 5.82147 13.7051 6.01855C14.2044 6.21556 14.7526 6.26614 15.2812 6.16602C15.7438 6.07838 16.1759 5.87797 16.5352 5.58301L16.6846 5.45117C17.0224 5.12939 17.2689 4.72787 17.3975 4.28613L17.4453 4.09375C17.5533 3.57635 17.4973 3.04043 17.2861 2.55469C17.075 2.06916 16.7192 1.65753 16.2676 1.37012C15.8164 1.08304 15.2883 0.931725 14.75 0.931641Z"
                      fill="#343330"
                      stroke="black"
                    />
                  </svg>
                </button>

                {/* Copy Button in Overlay */}
                <button
                  className={`flex items-center gap-1 border border-gray-300 p-2.5 rounded-full hover:translate-x-[1px] hover:translate-y-[1px] text-sm
                           ${
                             copyButtonClicked
                               ? "bg-green-200"
                               : "bg-white hover:bg-gray-100"
                           }`}
                  style={{
                    border: "1px solid #000000",
                    boxShadow: "2px 2px 1px black",
                    borderRadius: "999px",
                    transition: "background-color 0.3s, transform 0.2s",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(selectedPrompt.prompt, -1, e);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "2px 2px 1px rgb(0, 0, 0)";
                  }}
                  title={copyButtonClicked ? "Copied!" : "Copy Response"}
                >
                  <svg
                    width="14"
                    height="16"
                    viewBox="0 0 16 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block"
                  >
                    <path
                      d="M9.95117 18H3.23633C1.68547 18 0.423828 16.7384 0.423828 15.1875V5.66016C0.423828 4.1093 1.68547 2.84766 3.23633 2.84766H9.95117C11.502 2.84766 12.7637 4.1093 12.7637 5.66016V15.1875C12.7637 16.7384 11.502 18 9.95117 18ZM3.23633 4.25391C2.46097 4.25391 1.83008 4.8848 1.83008 5.66016V15.1875C1.83008 15.9629 2.46097 16.5938 3.23633 16.5938H9.95117C10.7265 16.5938 11.3574 15.9629 11.3574 15.1875V5.66016C11.3574 4.8848 10.7265 4.25391 9.95117 4.25391H3.23633ZM15.5762 13.4297V2.8125C15.5762 1.26164 14.3145 0 12.7637 0H4.95898C4.57062 0 4.25586 0.314758 4.25586 0.703125C4.25586 1.09149 4.57062 1.40625 4.95898 1.40625H12.7637C13.539 1.40625 14.1699 2.03714 14.1699 2.8125V13.4297C14.1699 13.8181 14.4847 14.1328 14.873 14.1328C15.2614 14.1328 15.5762 13.8181 15.5762 13.4297Z"
                      fill="black"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add responsive styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Mobile and iPad styles */
          @media (max-width: 1023px) {
            .grid {
              padding-left: 1rem;
              padding-right: 1rem;
            }
            
            .filter-button {
              padding: 0.5rem !important;
              font-size: 0.875rem !important;
            }
            
            .filter-text {
              display: none;
            }
            
            .pagination-button {
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
            }
          }
          
          /* Desktop styles */
          @media (min-width: 1024px) {
            .grid {
              padding-left: 2rem;
              padding-right: 2rem;
            }
            
            .filter-button {
              padding: 0.75rem 1rem !important;
            }
            
            .filter-text {
              display: inline;
            }
            
            .pagination-button {
              padding: 0.5rem 1rem !important;
              font-size: 0.875rem !important;
            }
          }
          
          /* Ensure cards are full width on mobile and iPad */
          @media (max-width: 1023px) {
            .grid > div {
              width: 100% !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
          }
          `,
        }}
      />
    </div>
  );
};

export default PromptGrid;
