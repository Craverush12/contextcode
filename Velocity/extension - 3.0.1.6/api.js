const BACKEND_URL = "https://thinkvelocity.in/backend-V1-D";
// const BACKEND_URL = "http://localhost:3005";

// YO YO Logging helper for extension API usage
async function logToBackend(logType, message, metadata) {
  try {
    // Try to get userId from chrome.storage.local
    let userId = 'unknown';
    try {
      const storage = await new Promise((resolve) => {
        chrome.storage.local.get(['userId'], resolve);
      });
      if (storage.userId) userId = storage.userId;
    } catch (e) {}
    await fetch(`${BACKEND_URL}/extension/logs/${logType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message,
        metadata: Object.assign({
          platform: 'api.js',
          timestamp: new Date().toISOString(),
        }, metadata || {})
      })
    });
  } catch (e) {
    // Silent fail for logging errors
  }
}

export async function EnhancePromptV2(
  userPrompt,
  selectedStyle,
  platform,
  intent,
  intent_description,
  wsIntentData = null
) {
  let logMeta = { userPrompt, selectedStyle, platform, intent, intent_description };
  try {
    // Validate required parameters
    if (!userPrompt) {
      throw new Error("User prompt is required");
    }

    // Get user auth data from storage
    const userData = await new Promise((resolve) => {
      chrome.storage.local.get(["userId", "token", "FreeUser"], (result) => {
        // Ensure userId is properly set
        const userId = result.userId || "free-trial";
        const authToken = result.token ? `${result.token}` : "free-trial";
        
        resolve({
          userId: userId,
          authToken: authToken,
          isFreeUser: result.FreeUser === true
        });
      });
    });

    // Ensure prompt is a string
    const promptString = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);

    // Get intent data from WebSocket response or parameters. Prioritize intent from the message.
    const finalIntent = intent || wsIntentData?.main_intent?.category || "";
    const finalIntentDescription = intent_description || wsIntentData?.main_intent?.description || "";

    // Map platform to backend value if needed
    const platformMap = {
      claude: 'anthropic',
      chatgpt: 'openai',
      gemini: 'google',
      perplexity: 'perplexity',
      gamma: 'gamma',
      vercel: 'vercel',
      bolt: 'bolt',
      grok: 'grok',
      suno: 'suno',
      lovable: 'lovable',
      replit: 'replit',
      mistral: 'mistral',
    };
    const mappedPlatform = platformMap[(platform || '').toLowerCase()] || platform || '';

    const requestBody = {
      prompt: promptString,
      user_id: userData.userId,
      auth_token: userData.authToken,
      style: selectedStyle || "",
      platform: mappedPlatform,
      intent: finalIntent,
      intent_description: finalIntentDescription,
      chat_history: ["", "", ""],
      context: "",
      domain: ""
    };

    // Inject context_id from chrome.storage.local if available
    const contextIdResult = await new Promise(resolve => {
      chrome.storage.local.get(["velocityContextId"], resolve);
    });
    if (contextIdResult.velocityContextId) {
      requestBody.context_id = contextIdResult.velocityContextId;
    }

    // Log the request body for debugging
    // console.log('[Velocity Enhance] Request body for enhance/stream:', requestBody);

    // Cache active tab to avoid repeated queries
    const activeTab = await new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        resolve(tabs[0]);
      });
    });

    // Optimized message sending function
    const sendMessageToContentScript = (message) => {
      if (activeTab) {
        chrome.tabs.sendMessage(activeTab.id, message);
      }
    };

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000); // 15 second timeout

    // Make streaming request
    const response = await fetch("https://thinkvelocity.in/python-backend-D/enhance/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await getAuthorizationKey()
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal
    });

    // Clear timeout since request succeeded
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the response reader
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = "";
    let buffer = "";

    // Process the streaming response
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);
            
            if (data.type === "content") {
              // Send chunk immediately to content script (optimized)
              sendMessageToContentScript({
                type: "velocityEnhanceChunk",
                chunk: data.chunk
              });
              accumulatedContent += data.chunk;
              
            } else if (data.type === "complete") {
              // Store final response
              const finalResponse = {
                success: true,
                data: {
                  ...data,
                  enhanced_prompt: accumulatedContent,
                },
              };
              
              // Send completion to content script (optimized)
              sendMessageToContentScript({
                type: "velocityEnhanceComplete",
                response: finalResponse
              });
              
              await logToBackend('info', 'EnhancePromptV2 executed successfully', {
                ...logMeta,
                result: 'success',
                enhancedLength: accumulatedContent.length
              });
              return finalResponse;
            } else if (data.error) {
              // Handle error case
              const errorResponse = {
                success: false,
                error: data.error,
              };
              
              // Send error to content script (optimized)
              sendMessageToContentScript({
                type: "velocityEnhanceError",
                error: errorResponse
              });
              
              await logToBackend('error', 'EnhancePromptV2 error from backend', {
                ...logMeta,
                error: data.error
              });
              return errorResponse;
            }
          } catch (e) {
            console.warn("[Velocity API] Failed to parse SSE data:", line, e);
          }
        }
      }
    }

    // If we get here, something went wrong
    throw new Error("Stream ended without completion or error");

  } catch (error) {
    // Clear timeout if it exists
    if (typeof timeoutId !== 'undefined') {
      clearTimeout(timeoutId);
    }
    
    // Handle aborted requests specifically
    if (error.name === 'AbortError') {
      sendMessageToContentScript({
        type: "velocityEnhanceError",
        error: {
          success: false,
          error: "Request timed out. Please try again."
        }
      });
      await logToBackend('error', 'EnhancePromptV2 execution error', {
        ...logMeta,
        error: "Request timed out. Please try again."
      });
      return {
        success: false,
        error: "Request timed out. Please try again.",
      };
    }
    
    // Send error to content script
    await new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "velocityEnhanceError",
            error: {
              success: false,
              error: error.message
            }
          }, resolve);
        } else {
          resolve();
        }
      });
    });
    
    await logToBackend('error', 'EnhancePromptV2 execution error', {
      ...logMeta,
      error: error.message
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function promptAnalysis(message) {
  let logMeta = { ...message };
  try {
    // Create request body with the prompt
    const requestBody = {
      query: message.prompt,
      platform: message.platform || "unknown",
      style: message.style || "default",
    };

    const response = await fetch(
      "https://thinkvelocity.in/python-backend-D/analyze",
      {
        method: "POST",
        headers: {
          Authorization: await getAuthorizationKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the API response
    const apiResponse = await response.json();

    // Return the raw API response without transformation
    // This preserves the original structure including framework_analysis
    await logToBackend('info', 'promptAnalysis executed successfully', {
      ...logMeta,
      result: apiResponse
    });
    return { success: true, data: apiResponse };
  } catch (error) {
    console.error("[Velocity DEBUG] promptMetricsAnalysis error:", error);
    await logToBackend('error', 'promptAnalysis error', {
      ...logMeta,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

export async function validateCredits(message) {
  let logMeta = { ...message };
  try {
    const storage = await chrome.storage.local.get(["userId", "token"]);
    const userId = storage.userId;
    const token = storage.token;

    if (!userId || !token) {
      throw new Error("User authentication required");
    }

    // Get feature credits first
    const creditsResponse = await fetch(
      `${BACKEND_URL}/token/fetch-credits`, // Updated endpoint
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const creditsData = await creditsResponse.json();

    if (!creditsData.success) {
      throw new Error(creditsData.message || "Failed to fetch credits");
    }

    let totalRequiredCredits = 0;

    // Basic prompt credits
    const basicPromptCredit = creditsData.credits.basic_prompt; // Updated to match new response structure

    if (!basicPromptCredit) {
      throw new Error("Basic prompt feature not found");
    }
    totalRequiredCredits += basicPromptCredit;

    // Style credits if style is selected
    if (message.style && message.style !== "") {
      const styleCredit = creditsData.credits.style_prompt;
      if (!styleCredit) {
        throw new Error("Style feature not found");
      }
      totalRequiredCredits += styleCredit;
    }

    // Platform credits if platform is selected
    if (message.platform && message.platform !== "") {
      const platformCredit = creditsData.credits.platform;
      if (!platformCredit) {
        throw new Error("Platform feature not found");
      }
      totalRequiredCredits += platformCredit;
    }

    // Get user's token balance
    const balanceResponse = await fetch(
      `${BACKEND_URL}/token/fetch-tokens/${userId}`, // Updated endpoint
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const balanceData = await balanceResponse.json();

    if (!balanceData.success) {
      throw new Error(balanceData.message || "Failed to fetch tokens");
    }

    const availableTokens = balanceData.tokens; // Updated to match new response structure

    if (availableTokens < totalRequiredCredits) {
      throw new Error("Insufficient tokens available");
    }

    return {
      success: true,
      requiredCredits: totalRequiredCredits,
      availableTokens: availableTokens,
    };
  } catch (error) {
    await logToBackend('error', 'validateCredits error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function deductCredits(creditsToDeduct) {
  let logMeta = { creditsToDeduct };
  try {
    const storage = await chrome.storage.local.get(["userId", "token"]);
    const userId = storage.userId;
    const token = storage.token;

    if (!userId || !token) {
      throw new Error("User authentication required");
    }

    // Fetch current token balance (optional, since the new endpoint doesn't require it)
    const balanceResponse = await fetch(
      `${BACKEND_URL}/token/fetch-tokens/${userId}`, // Updated endpoint
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const balanceData = await balanceResponse.json();

    if (!balanceData.success) {
      throw new Error(balanceData.message || "Failed to fetch tokens");
    }

    // Deduct tokens using the new endpoint
    const requestBody = {
      user_id: userId,
      amount: creditsToDeduct,
    };

    const deductResponse = await fetch(
      `${BACKEND_URL}/token/deduct-tokens`, // Updated endpoint
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const deductData = await deductResponse.json();

    if (!deductData.success) {
      throw new Error(deductData.message || "Failed to deduct tokens");
    }

    await logToBackend('info', 'deductCredits executed successfully', {
      ...logMeta,
      result: deductData
    });
    return { success: true, data: deductData };
  } catch (error) {
    await logToBackend('error', 'deductCredits error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

// export async function savePromptToHistory(message) {
//   try {
//     const storage = await chrome.storage.local.get(["userId", "token"]);
//     const userId = storage.userId;
//     const token = storage.token;

//     if (!userId || !token) {
//       throw new Error("User authentication required");
//     }

//     const requestBody = {
//       user_id: userId,
//       prompt: message.prompt,
//       enhanced_prompt: message.enhanced_prompt || "", // Add enhanced_prompt
//       ai_type: message.platform,
//       style: message.style,
//       domain: message.domain || "", // Add domain
//       processing_time_ms: message.processing_time_ms || null, // Add processing_time_ms
//       intent: message.intent || "", // Add intent
//       intent_description: message.intent_description || "", // Add intent_description
//       relevance_analysis: message.relevance_analysis || null, // Add relevance_analysis
//       tokens_used: message.tokens_used || 0, // Keep tokens_used for backward compatibility
//     };

//     const response = await fetch(
//       `${BACKEND_URL}/prompt/save-prompt`, // Updated endpoint
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(requestBody),
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         `HTTP error! Status: ${response.status}, Message: ${
//           data.message || "Unknown error"
//         }`
//       );
//     }

//     if (!data.success) {
//       throw new Error(data.message || "Failed to save prompt: Unknown error");
//     }

//     return data;
//   } catch (error) {
//     console.error("❌ Error saving prompt to history:", {
//       error: error.message,
//       stack: error.stack,
//       name: error.name,
//       cause: error.cause,
//     });
//     console.error("❌ Full error object:", error);
//     throw error;
//   }
// }

// export async function saveResponseToHistory(
//   enhancedPrompt,
//   originalPromptId,
//   message
// ) {
//   try {
//     const storage = await chrome.storage.local.get(["userId", "token"]);
//     const userId = storage.userId;
//     const token = storage.token;

//     if (!userId || !token) {
//       throw new Error("User authentication required");
//     }

//     // Get the original prompt from the message
//     const originalPrompt = message?.prompt || "";

//     // Get AI type and style from the message or use defaults
//     const aiType = message?.platform || "";
//     const style = message?.style || "";

//     // Only use window.* if available (content script), otherwise use message data (background)
//     let intent = message?.intent || "";
//     let intentDescription = message?.intent_description || "";
//     let processingTime = message?.processing_time_ms || null;
//     let relevanceAnalysis = message?.relevance_analysis || null;

//     if (typeof window !== "undefined") {
//       if (window.velocityWebSocketResponse?.main_intent) {
//         intent = window.velocityWebSocketResponse.main_intent.category || intent;
//         intentDescription = window.velocityWebSocketResponse.main_intent.description || intentDescription;
//       }
//       if (window.velocityEnhanceResponse?.fullResponse) {
//         const enhanceResponse = window.velocityEnhanceResponse.fullResponse;
//         processingTime = enhanceResponse.processing_time_ms || processingTime;
//         relevanceAnalysis = enhanceResponse.relevance_analysis || relevanceAnalysis;
//       }
//     }

//     const requestBody = {
//       user_id: userId,
//       prompt: originalPrompt,
//       enhanced_prompt: enhancedPrompt,
//       ai_type: aiType,
//       style: style,
//       domain: message?.domain || "general",
//       processing_time_ms: processingTime,
//       intent: intent,
//       intent_description: intentDescription,
//       relevance_analysis: relevanceAnalysis
//     };

//     const response = await fetch(`${BACKEND_URL}/prompt/save-prompt-review`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify(requestBody)
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[Velocity API] Save API Error Response:', errorText);
//       throw new Error(`Failed to save response: ${errorText}`);
//     }

//     const data = await response.json();

//     return data;
//   } catch (error) {
//     console.error('[Velocity API] Error in saveResponseToHistory:', error);
//     throw error;
//   }
// }

// Cache for authorization key to reduce storage calls

let cachedAuthKey = null;
let authKeyCacheTime = 0;
const AUTH_KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getAuthorizationKey() {
  const now = Date.now();
  
  // Return cached key if still valid
  if (cachedAuthKey && (now - authKeyCacheTime) < AUTH_KEY_CACHE_DURATION) {
    return cachedAuthKey;
  }
  
  // Fetch from storage
  const result = await chrome.storage.local.get(["apiAuthKey"]);
  if (result.apiAuthKey) {
    cachedAuthKey = result.apiAuthKey;
    authKeyCacheTime = now;
    return cachedAuthKey;
  }
  
  return null;
}

export async function saveFeedback(promptReviewId, feedback) {
  let logMeta = { promptReviewId, feedback };
  try {
    const storage = await chrome.storage.local.get(["token"]);
    const token = storage.token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BACKEND_URL}/prompt/insert-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt_review_id: promptReviewId,
        feedback: feedback,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Feedback save failed:", errorText);
      throw new Error(
        `Failed to save feedback: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'saveFeedback executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'saveFeedback error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function getRecommendation(prompt) {
  let logMeta = { prompt };
  try {
    const response = await fetch(
      "https://thinkvelocity.in/python-backend-D/recommendation",
      {
        method: "POST",
        headers: {
          Authorization: await getAuthorizationKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Recommendation request failed:", errorText);
      throw new Error(
        `Failed to get recommendation: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'getRecommendation executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'getRecommendation error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get clarifying questions for a prompt
 * @param {string} prompt - The prompt to get questions for
 * @returns {Promise<Object>} Response with questions array
 */
export async function getClarifyingQuestions(prompt) {
  let logMeta = { prompt };
  try {
    const response = await fetch(
      "https://thinkvelocity.in/python-backend-D/clarify",
      {
        method: "POST",
        headers: {
          Authorization: await getAuthorizationKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Clarify request failed:", errorText);
      throw new Error(
        `Failed to get clarifying questions: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'getClarifyingQuestions executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'getClarifyingQuestions error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

/**
 * Refine prompt based on questions and answers
 * @param {string} originalPrompt - The original prompt
 * @param {Array} qaArray - Array of {question, answer} objects
 * @returns {Promise<Object>} Response with refined prompt
 */
export async function refinePrompt(originalPrompt, qaArray) {
  let logMeta = { originalPrompt, qaArray };
  try {
    const response = await fetch(
      "https://thinkvelocity.in/python-backend-D/refine",
      {
        method: "POST",
        headers: {
          Authorization: await getAuthorizationKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          qa_pairs: qaArray,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Refine request failed:", errorText);
      console.error("[Velocity API] Refine response status:", response.status);
      console.error(
        "[Velocity API] Refine response statusText:",
        response.statusText
      );
      throw new Error(
        `Failed to refine prompt: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'refinePrompt executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'refinePrompt error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function saveUserPreference(preferences) {
  let logMeta = { ...preferences };
  try {
    const storage = await chrome.storage.local.get(["token"]);
    const token = storage.token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BACKEND_URL}/prompt/save-preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Save preference failed:", errorText);
      throw new Error(
        `Failed to save preferences: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'saveUserPreference executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'saveUserPreference error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function fetchUserPreference(userId) {
  let logMeta = { userId };
  try {
    const storage = await chrome.storage.local.get(["token"]);
    const token = storage.token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(
      `${BACKEND_URL}/prompt/fetch-preference/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Fetch preference failed:", errorText);
      throw new Error(
        `Failed to fetch preferences: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'fetchUserPreference executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'fetchUserPreference error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function insertRefinedPrompt(promptReviewId, refinedPrompt) {
  let logMeta = { promptReviewId, refinedPrompt };
  try {
    const storage = await chrome.storage.local.get(["token"]);
    const token = storage.token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(
      `${BACKEND_URL}/prompt/insert-refined-prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt_review_id: promptReviewId,
          refined_prompt: refinedPrompt,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Velocity API] Insert refined prompt failed:", errorText);
      throw new Error(
        `Failed to save refined prompt: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'insertRefinedPrompt executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'insertRefinedPrompt error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}

export async function savePromptReview(
  userId,
  prompt,
  enhancedPrompt,
  aiType,
  style,
  domain,
  additionalData = {}
) {
  let logMeta = { userId, prompt, enhancedPrompt, aiType, style, domain, additionalData };
  try {
    const storage = await chrome.storage.local.get(["token"]);
    const token = storage.token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    // Validate required fields
    if (!userId || !prompt || !enhancedPrompt || !aiType || !style || !domain) {
      throw new Error("Missing required fields for savePromptReview");
    }

    // Extract data from additionalData or enhance response
    let intent = additionalData.intent || "";
    let intent_description = additionalData.intent_description || "";
    let processing_time_ms = additionalData.processing_time_ms || null;
    let relevance_analysis = additionalData.relevance_analysis || null;

    // If we have enhance response data, use it
    if (
      typeof window !== "undefined" &&
      window.velocityEnhanceResponse?.fullResponse
    ) {
      const enhanceData = window.velocityEnhanceResponse.fullResponse;

      // Use enhance response data if not provided in additionalData
      if (!intent && enhanceData.intent) intent = enhanceData.intent;
      if (!intent_description && enhanceData.intent_description)
        intent_description = enhanceData.intent_description;
      if (!processing_time_ms && enhanceData.processing_time_ms)
        processing_time_ms = enhanceData.processing_time_ms;
      if (!relevance_analysis && enhanceData.relevance_analysis)
        relevance_analysis = enhanceData.relevance_analysis;
    }

    // Create request body with all fields
    const requestBody = {
      user_id: userId,
      prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      ai_type: aiType,
      style: style,
      domain: domain,
      processing_time_ms: processing_time_ms,
      intent: intent,
      intent_description: intent_description,
      relevance_analysis: relevance_analysis,
    };

    const response = await fetch(`${BACKEND_URL}/prompt/save-prompt-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[Velocity API] savePromptReview - HTTP error response:",
        errorText
      );
      console.error(
        "[Velocity API] savePromptReview - Response status:",
        response.status
      );
      throw new Error(
        `Failed to save prompt review: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    await logToBackend('info', 'savePromptReview executed successfully', {
      ...logMeta,
      result
    });
    return result;
  } catch (error) {
    await logToBackend('error', 'savePromptReview error', {
      ...logMeta,
      error: error.message
    });
    throw error;
  }
}
