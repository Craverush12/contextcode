window.platforms = {
  chatgpt: {
    urlPattern: /^https:\/\/chatgpt\.com/,
    textAreaSelector: '.ProseMirror',
    suggestionSelector: "div[class='relative flex w-full flex-auto flex-col']",
    // Define anchor positions for ChatGPT
    anchorPositions: {
      topLeft: { top: "0", left: "0%" },
      topRight: { top: "0", right: "0%" },
      bottomLeft: { bottom: "0%", left: "0%" },
      bottomRight: { bottom: "14%", right: "17%" },
      defaultAnchor: "topRight" // The default anchor to use for this platform
    }
  },
  claude: {
    urlPattern: /^https:\/\/claude\.ai/,
    textAreaSelector: '.ProseMirror',
    suggestionSelector: 'div[class="max-h-96 w-full overflow-y-auto break-words min-h-[3rem]"]',
    // Define anchor positions for Claude
    anchorPositions: {
      topLeft: { top: "0", left: "0%" },
      topRight: { top: "0", right: "0%" },
      bottomLeft: { bottom: "8%", left: "0%" },
      bottomRight: { bottom: "28%", right: "32%" },
      defaultAnchor: "bottomRight" // Claude works better with bottom-right positioning
    }
  },
  gemini: {
    urlPattern: /^https:\/\/gemini\.google\.com/,
    textAreaSelector: '.ql-editor',
    suggestionSelector: "div[class='text-input-field_textarea-wrapper ng-tns-c1711834494-3']",
    // Define anchor positions for Gemini
    anchorPositions: {
      topLeft: { top: "0", left: "5%" },
      topRight: { top: "0", right: "5%" },
      bottomLeft: { bottom: "18%", left: "3%" },
      bottomRight: { bottom: "31%", right: "12%" },
      defaultAnchor: "bottomRight" // Gemini works better with bottom-right positioning
    }
  },
  grok: {
    urlPattern: /^https:\/\/grok\.com/,
    textAreaSelector: 'textarea',
    suggestionSelector: "div[class='relative z-10']",
    // Define anchor positions for Grok
    anchorPositions: {
      topLeft: { top: "2%", left: "22%" },
      topRight: { top: "2%", right: "22%" },
      bottomLeft: { bottom: "10%", left: "22%" },
      bottomRight: { bottom: "32%", right: "33%" },
      defaultAnchor: "topRight" // Default anchor for Grok
    }
  },
  // perplexity: {
  //   urlPattern: /^https:\/\/(?:www\.)?perplexity\.ai/,
  //   textAreaSelector: "div[contenteditable='true'], textarea",
  //   suggestionSelector: "div[class*='col-start-1 col-end-4 pb-sm overflow-hidden relative flex h-full w-full']",
  //   // Define anchor positions for Perplexity
  //   anchorPositions: {
  //     topLeft: { top: "0", left: "3%" },
  //     topRight: { top: "0", right: "0%" },
  //     bottomLeft: { bottom: "5%", left: "5%" },
  //     bottomRight: { bottom: "26%", right: "34%" },
  //     defaultAnchor: "bottomRight" // Perplexity works better with bottom-right positioning
  //   }
  // },
  // Updated platform: Bolt
  bolt: {
    urlPattern: /^https:\/\/(www\.)?bolt\.new/,
    textAreaSelector: 'div[class="relative -z-1"]',
    suggestionSelector: "div[class='relative select-none']",
    // Define anchor positions for Bolt
    anchorPositions: {
      topLeft: { top: "10%", left: "6%" },
      topRight: { top: "10%", right: "5%" },
      bottomLeft: { bottom: "15%", left: "5%" },
      bottomRight: { bottom: "30%", right: "14%" },
      defaultAnchor: "topRight" // Default anchor for Bolt
    }
  },
  vercelv0: {
    urlPattern: /^https:\/\/(www\.)?v0\.dev/,
    textAreaSelector: 'textarea',
    suggestionSelector: "div[class='@container/textarea bg-background-subtle relative z-10 grid min-h-[100px] rounded-xl']",
    // Define anchor positions for Vercel V0
    anchorPositions: {
      topLeft: { top: "0", left: "2%" },
      topRight: { top: "0", right: "2%" },
      bottomLeft: { bottom: "10%", left: "2%" },
      bottomRight: { bottom: "10%", right: "2%" },
      defaultAnchor: "bottomRight" // Vercel V0 works better with bottom-right positioning
    }
  },
  gamma: {
    urlPattern: /^https:\/\/(www\.)?gamma\.app\/create\/generate/,
    textAreaSelector: 'textarea, div[contenteditable="true"], [role="textbox"], input[type="text"]',
    suggestionSelector: "div[class='chakra-input__group css-13qjysg']",
    // Define anchor positions for Gamma
    anchorPositions: {
      topLeft: { top: "0", left: "2%" },
      topRight: { top: "0", right: "2%" },
      bottomLeft: { bottom: "12%", left: "2%" },
      bottomRight: { bottom: "12%", right: "2%" },
      defaultAnchor: "bottomRight" // Gamma works better with bottom-right positioning
    }
  },
  // mistral: {
  //   urlPattern: /^https:\/\/(www\.)?chat\.mistral\.ai\/chat/,
  //   textAreaSelector: "div[class='relative overflow-hidden mb-2 min-h-10 w-full']",
  //   suggestionSelector: "div[class='relative overflow-hidden mb-2 min-h-10 w-full']",
  //   // Define anchor positions for Mistral
  //   anchorPositions: {
  //     topLeft: { top: "0", left: "3%" },
  //     topRight: { top: "0", right: "3%" },
  //     bottomLeft: { bottom: "4%", left: "4%" },
  //     bottomRight: { bottom: "4%", right: "4%" },
  //     defaultAnchor: "topRight" // Default anchor for Mistral
  //   }
  // },
  lovable: {
    urlPattern: /^https:\/\/(www\.)?lovable\.dev/,
    textAreaSelector: 'textarea',
    suggestionSelector: "div[class='relative overflow-hidden mb-2 min-h-10 w-full']",
    // Define anchor positions for Lovable
    anchorPositions: {
      topLeft: { top: "2%", left: "2%" },
      topRight: { top: "2", right: "2%" },
      bottomLeft: { bottom: "9%", left: "2%" },
      bottomRight: { bottom: "9%", right: "2%" },
      defaultAnchor: "topRight" // Default anchor for Lovable
    }
  },
  replit: {
    urlPattern: /^https:\/\/(www\.)?replit\.com/,
    textAreaSelector: 'div[class="cm-content cm-lineWrapping"]',
    suggestionSelector: "div[class='relative overflow-hidden mb-2 min-h-10 w-full']",
    // Define anchor positions for Replit
    anchorPositions: {
      topLeft: { top: "2", left: "2%" },
      topRight: { top: "2", right: "2%" },
      bottomLeft: { bottom: "8%", left: "2%" },
      bottomRight: { bottom: "8%", right: "2%" },
      defaultAnchor: "topRight" // Default anchor for Replit
    }
  },
  suno: {
    urlPattern: /^https:\/\/(www\.)?suno\.com\/(create|home|signup_source=splashpage|referrer|redirected_from=signup|wid=default)/,
    textAreaSelector: 'div[class="w-full flex-1 p-4 focus:outline-none custom-textarea font-sans text-14px text placeholder:lighterGray placeholder:select-none resize-none h-full bg-transparent placeholder:brightness-150 px-4 py-0"]',
    suggestionSelector: "div[class='relative flex flex-col']",
    // Define anchor positions for Suno
    anchorPositions: {
      topLeft: { top: "5%", left: "5%" },
      topRight: { top: "5%", right: "5%" },
      bottomLeft: { bottom: "15%", left: "5%" },
      bottomRight: { bottom: "15%", right: "5%" },
      defaultAnchor: "bottomRight" // Default anchor for Suno
    }
  }
};