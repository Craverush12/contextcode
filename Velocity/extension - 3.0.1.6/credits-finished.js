// credits-finished.js - Credits depleted notification that prompts users to refill

// Single global instance to prevent duplicates
var creditsFinishedInstance = null;

function createCreditsFinishedNotification() {
    // If an instance already exists, remove it first
    if (creditsFinishedInstance && creditsFinishedInstance.parentNode) {
        creditsFinishedInstance.parentNode.removeChild(creditsFinishedInstance);
    }

    // Create the main container
    const creditsPopup = document.createElement("div");
    creditsPopup.id = "credits-finished-popup";
    creditsPopup.classList.add("credits-finished");
    
    // Store as global instance
    creditsFinishedInstance = creditsPopup;
  
    // Base styles similar to trail-finished
    const baseStyles = `
      position: fixed;
      z-index: 9999999; /* Increased z-index to be higher than message boxes */
      cursor: move;
      user-select: none;
      max-width: 310px;
      width: 310px;
      overflow: hidden;
      border-radius: 12px;
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      visibility: hidden;
      display: flex;
      flex-direction: column;
      padding: 22px;
    `;
  
    // Platform-specific styles updated with new color palette
    const platformStyles = {
      default: {
        boxCssLight: `
          ${baseStyles}
          background-color: hsl(190, 95%, 90%);
          box-shadow: rgba(0, 0, 0, 0.6) 2px 4px 10px;  
          border: 2px solid rgba(8, 0, 0, 0.85);
        `,
        boxCssDark: `
          ${baseStyles}
          background-color: hsl(197, 40%, 14%);
          box-shadow: rgba(0, 0, 0, 0.6) 2px 4px 10px;
          border: 2px solid rgba(0, 0, 0, 0.85);
        `
      }
    };
  
    // Add visibility state tracking
    let isPopupVisible = false;
    let isDarkMode = false;
    let isUpdatingStyles = false;
  
    // Update the applyStyles function to handle both dark mode and visibility
    function applyStyles(darkMode) {
      if (isUpdatingStyles) return;
      isUpdatingStyles = true;
      
      isDarkMode = darkMode;
      const styles = platformStyles.default;
  
      creditsPopup.style.cssText = darkMode ? styles.boxCssDark : styles.boxCssLight;
      creditsPopup.style.opacity = isPopupVisible ? '1' : '0';
      creditsPopup.style.pointerEvents = isPopupVisible ? 'auto' : 'none';
      creditsPopup.style.visibility = isPopupVisible ? 'visible' : 'hidden';
      
      // Update text colors if elements exist
      updateTextColors();
      
      isUpdatingStyles = false;
    }
    
    // Function to update text colors without rebuilding the entire content
    function updateTextColors() {
      // Update close button color if it exists
      const closeButton = creditsPopup.querySelector("div[style*='position: absolute']");
      if (closeButton) {
        closeButton.style.color = isDarkMode ? '#888' : '#666';
      }
      
      // Update title color if it exists
      const titleElement = creditsPopup.querySelector("div[style*='font-size: 18px']");
      if (titleElement) {
        titleElement.style.color = isDarkMode ? '#ffffff' : '#000000';
      }
      
      // Update message color if it exists
      const messageElement = creditsPopup.querySelector("div[style*='font-size: 14px']");
      if (messageElement) {
        messageElement.style.color = isDarkMode ? '#ffffff' : '#0B0B0BB2';
      }
      
      // Update button text color if it exists
      const buyButton = creditsPopup.querySelector("button");
      if (buyButton) {
        buyButton.style.color = isDarkMode ? '#ffffff' : '#000000';
      }
    }
  
    // Initialize styles based on current dark mode setting
    chrome.storage.local.get(["darkMode"], (result) => {
      applyStyles(result.darkMode === true);
    });
  
    // Listen for dark mode changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "darkMode" in changes) {
        applyStyles(changes.darkMode.newValue);
      }
    });
  
    // Dragging functionality
    let isDragging = false;
    let currentX = window.innerWidth - 420;  // Initial X position
    let currentY = window.innerHeight / 2;   // Initial Y position
    let initialX;
    let initialY;
  
    function dragStart(e) {
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      
      const rect = creditsPopup.getBoundingClientRect();
      currentX = rect.left;
      currentY = rect.top;
      
      initialX = e.type === "touchstart" ? e.touches[0].clientX - currentX : e.clientX - currentX;
      initialY = e.type === "touchstart" ? e.touches[0].clientY - currentY : e.clientY - currentY;
        
      // Set cursor to grabbing during drag
      creditsPopup.style.cursor = 'grabbing';
    }
  
    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
  
      // Constrain within window bounds
      const maxX = window.innerWidth - creditsPopup.offsetWidth;
      const maxY = window.innerHeight - creditsPopup.offsetHeight;
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
  
      // Apply the new position
      creditsPopup.style.left = `${currentX}px`;
      creditsPopup.style.top = `${currentY}px`;
      creditsPopup.style.transform = 'none';  // Remove transform to avoid conflicts
    }
  
    function dragEnd() {
      isDragging = false;
      creditsPopup.style.cursor = 'move';  // Reset cursor
        
      // Update initial positions to current position
      initialX = currentX;
      initialY = currentY;
    }
  
    creditsPopup.addEventListener("mousedown", dragStart, false);
    creditsPopup.addEventListener("touchstart", dragStart, false);
    document.addEventListener("mousemove", drag, false);
    document.addEventListener("touchmove", drag, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("touchend", dragEnd, false);
  
    // Watch for style changes to update position
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "style" && creditsPopup.style.opacity === "1") {
          const rect = creditsPopup.getBoundingClientRect();
          currentX = rect.left;
          currentY = rect.top;
        }
      });
    });
  
    observer.observe(creditsPopup, { attributes: true, attributeFilter: ['style'] });
  
    // Hide the popup
    function hideCreditsPopup() {
      isPopupVisible = false;
      applyStyles(isDarkMode);
    }
  
    // Create the content for the credits-finished notification
    creditsPopup.updateContent = function() {
      // Hide all message boxes again to ensure they stay hidden
      hideAllMessageBoxes();
      
      // Clear all content
      while (creditsPopup.firstChild) {
        creditsPopup.removeChild(creditsPopup.firstChild);
      }
      
      // Create close button in top right
      const closeButton = document.createElement("div");
      closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        cursor: pointer;
        color: ${isDarkMode ? '#888' : '#666'};
        font-size: 16px;
        line-height: 1;
      `;
      closeButton.innerHTML = "×";
      closeButton.addEventListener("click", hideCreditsPopup);
      creditsPopup.appendChild(closeButton);
      
      // Create a container for coins and text in horizontal layout
      const contentContainer = document.createElement("div");
      contentContainer.style.cssText = `
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        width: 100%;
        margin: 15px 0px;
      `;
      
      // Coin image on the left
      const coinImage = document.createElement("img");
      coinImage.src = chrome.runtime.getURL("assets/Tokens.png");
      coinImage.style.cssText = `
        width: 40px;
        height: 40px;
        margin-right: 12px;
      `;
      contentContainer.appendChild(coinImage);
      
      // Text container for title and message
      const textContainer = document.createElement("div");
      textContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        flex: 1;
      `;
      
      // Add title
      const titleElement = document.createElement("div");
      titleElement.textContent = "You are out of credits !";
      titleElement.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        color: ${isDarkMode ? '#ffffff' : '#000000'};
      `;
      textContainer.appendChild(titleElement);
      
      // Add message
      const messageElement = document.createElement("div");
      messageElement.textContent = "Get more from your profile";
      messageElement.style.cssText = `
        font-size: 14px;
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        color: ${isDarkMode ? '#ffffff' : '#0B0B0BB2'};
      `;
      textContainer.appendChild(messageElement);
      
      // Add text container to the main content container
      contentContainer.appendChild(textContainer);
      
      // Add the content container to the popup
      creditsPopup.appendChild(contentContainer);
      
      // Add buy more button
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText = `
        width: 100%;
      `;

      const buyButton = document.createElement("button");
      buyButton.textContent = "Buy more";
      buyButton.style.cssText = `
        background: hsl(190, 100%, 47%);
        color: ${isDarkMode ? '#ffffff' : '#000000'};
        border: 2px solid ${isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.85)'};
        border-radius: 40px;
        padding: 10px 0px;
        font-size: 14px;
        font-weight: 600;
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 100%;
        text-align: center;
        box-shadow: rgb(0 0 0 / 60%) 2px 3px 2px;
      `;

      buyButton.addEventListener("mouseover", () => {
        buyButton.style.backgroundColor = isDarkMode ? "hsl(190, 100%, 37%)" : "hsl(190, 100%, 37%)";
      });

      buyButton.addEventListener("mouseout", () => {
        buyButton.style.backgroundColor = "hsl(190, 100%, 47%)";
      });

      buyButton.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Open profile page for credit refill
        window.open("https://thinkvelocity.in/profile", "_blank");
        
        // Hide the popup
        hideCreditsPopup();
      });

      buttonContainer.appendChild(buyButton);
      creditsPopup.appendChild(buttonContainer);
      
      // Make the box visible
      isPopupVisible = true;
      applyStyles(isDarkMode);
      
      // Position the popup
      positionRelativeToButton(creditsPopup);
    };
    
    // Function to position UI relative to the button that triggered it
    function positionRelativeToButton(uiElement) {
      // Look for the velocity button - the one that was clicked
      const button = document.querySelector('.velocity-button-container button, .custom-injected-button button');
      
      setTimeout(() => {
        const uiWidth = uiElement.offsetWidth || 280;
        const uiHeight = uiElement.offsetHeight || 150;
        
        if (button) {
          // Get button's position
          const buttonRect = button.getBoundingClientRect();
          
          // Position the popup to the right of the button
          let leftPosition = buttonRect.right + 30; // 15px gap to the right
          let topPosition = buttonRect.top + (buttonRect.height / 2) - (uiHeight / 2);
          
          // Ensure the popup stays within viewport bounds
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // If not enough space to the right, try positioning to the left of the button
          if (leftPosition + uiWidth > viewportWidth - 10) {
            leftPosition = buttonRect.left - uiWidth - 15; // 15px gap to the left
          }
          
          // If still no space horizontally (too narrow viewport), try above or below
          if (leftPosition < 10) {
            leftPosition = buttonRect.left + (buttonRect.width / 2) - (uiWidth / 2);
            topPosition = buttonRect.top - uiHeight - 15; // Try above
            
            // If not enough space above, try below
            if (topPosition < 10) {
              topPosition = buttonRect.bottom + 15;
            }
          }
          
          // Ensure we stay within vertical bounds too
          if (topPosition < 10) topPosition = 10;
          if (topPosition + uiHeight > viewportHeight - 10) {
            topPosition = viewportHeight - uiHeight - 10;
          }
          
          // Final fallback to center if all else fails
          if (topPosition < 10 || topPosition + uiHeight > viewportHeight - 10 ||
              leftPosition < 10 || leftPosition + uiWidth > viewportWidth - 10) {
            leftPosition = (viewportWidth - uiWidth) / 2;
            topPosition = (viewportHeight - uiHeight) / 2;
          }
          
          uiElement.style.left = `${leftPosition}px`;
          uiElement.style.top = `${topPosition}px`;
          
        } else {
          // Fallback to center positioning if button not found
          
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          const leftPosition = (viewportWidth - uiWidth) / 2;
          const topPosition = (viewportHeight - uiHeight) / 2;
          
          uiElement.style.left = `${leftPosition}px`;
          uiElement.style.top = `${topPosition}px`;
        }
      }, 50);
    }

    // Return the popup
    return creditsPopup;
}

// Add function to hide all message boxes
function hideAllMessageBoxes() {
  document.querySelectorAll('.velocity-message-box').forEach(box => {
    if (box.parentNode) {
      box.style.display = 'none';
      box.style.visibility = 'hidden';
      box.style.opacity = '0';
    }
  });
}

// Function to show the credits-finished notification
function showCreditsFinishedNotification() {
  // Hide all message boxes first
  hideAllMessageBoxes();

  // Create a new notification popup
  const ui = createCreditsFinishedNotification();
  
  // Append to document
  document.body.appendChild(ui);
  
  // Update the content
  ui.updateContent();
  
  // Return the UI element in case needed for future manipulation
  return ui;
}

// Ensure the global function is only defined once
if (!window.showCreditsFinishedNotification) {
    window.showCreditsFinishedNotification = showCreditsFinishedNotification;
}


