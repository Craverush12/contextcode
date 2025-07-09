// MESSAGE BOX FUNCTIONALITY COMMENTED OUT

function injectMessageBox() {
  // Create a stub element that won't actually be used
  // All messages will be handled by the centralized system
  const messageBoxPlaceholder = document.createElement("div");
  messageBoxPlaceholder.className = "custom-message-box";
  messageBoxPlaceholder.style.display = "none"; // Make it invisible

  // Return the placeholder that won't be visible
  return messageBoxPlaceholder;

  /* Original message box functionality commented out
  const messageBoxPlaceholder = document.createElement("div");
  messageBoxPlaceholder.className = "custom-message-box";
  messageBoxPlaceholder.style.display = "none"; // Make it invisible

  return messageBoxPlaceholder;
  */
}

window.injectMessageBox = injectMessageBox;
