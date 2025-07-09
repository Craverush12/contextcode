"use client";

import { useState, useEffect } from "react";
import VerificationTracking from "@/utils/verificationTracking";

/**
 * VerifiableButton Component
 *
 * A button component that tracks verification processes.
 * Handles tracking of verification start, completion, and abandonment.
 *
 * @param {ReactNode} children - Button content
 * @param {string} buttonName - Name of the button for tracking
 * @param {string} verificationType - Type of verification (e.g., 'payment', 'login')
 * @param {function} onClick - Function to execute on click (should return a Promise)
 * @param {function} onVerificationStart - Optional callback when verification starts
 * @param {function} onVerificationComplete - Optional callback when verification completes
 * @param {number} abandonTimeout - Timeout in ms after which verification is considered abandoned (default: 60000)
 * @param {boolean} trackAbandonment - Whether to track abandonment (default: true)
 * @param {object} additionalProps - Additional properties to track
 */
const VerifiableButton = ({
  children,
  buttonName,
  verificationType,
  onClick,
  onVerificationStart,
  onVerificationComplete,
  abandonTimeout = 60000,
  trackAbandonment = true,
  additionalProps = {},
  className = "",
  loadingText = "Verifying...",
  ...props
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [abandonTimer, setAbandonTimer] = useState(null);

  // Clean up abandon timer on unmount
  useEffect(() => {
    return () => {
      if (abandonTimer) {
        clearTimeout(abandonTimer);

        // If component unmounts during verification, track as abandoned
        if (isVerifying && trackAbandonment) {
          VerificationTracking.trackVerificationAbandoned(
            buttonName,
            verificationType,
            "component_unmounted",
            additionalProps
          );
        }
      }
    };
  }, [
    abandonTimer,
    isVerifying,
    buttonName,
    verificationType,
    trackAbandonment,
    additionalProps,
  ]);

  const handleClick = async (e) => {
    // Prevent multiple clicks
    if (isVerifying) return;

    // Start verification process
    setIsVerifying(true);
    VerificationTracking.trackVerificationStart(
      buttonName,
      verificationType,
      additionalProps
    );

    // Set up abandonment tracking
    if (trackAbandonment) {
      const timer = setTimeout(() => {
        if (isVerifying) {
          VerificationTracking.trackVerificationAbandoned(
            buttonName,
            verificationType,
            "timeout",
            additionalProps
          );
          setIsVerifying(false);
        }
      }, abandonTimeout);

      setAbandonTimer(timer);
    }

    // Call onVerificationStart callback if provided
    if (onVerificationStart) {
      await onVerificationStart(e);
    }

    try {
      // Call the original onClick handler
      const result = await onClick(e);
      const success = result !== false; // Consider anything but explicit false as success

      // Track verification completion
      VerificationTracking.trackVerificationComplete(
        buttonName,
        verificationType,
        success,
        additionalProps
      );

      // Call onVerificationComplete callback if provided
      if (onVerificationComplete) {
        onVerificationComplete(success);
      }

      return result;
    } catch (error) {
      // Track verification failure
      VerificationTracking.trackVerificationComplete(
        buttonName,
        verificationType,
        false,
        {
          error: error.message,
          ...additionalProps,
        }
      );

      // Call onVerificationComplete callback if provided
      if (onVerificationComplete) {
        onVerificationComplete(false, error);
      }

      // Re-throw the error for the caller to handle
      throw error;
    } finally {
      // Clean up
      setIsVerifying(false);
      if (abandonTimer) {
        clearTimeout(abandonTimer);
        setAbandonTimer(null);
      }
    }
  };

  // Combine provided className with verification state
  const buttonClassName = `${className} ${
    isVerifying ? "verifying" : ""
  }`.trim();

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isVerifying || props.disabled}
      className={buttonClassName}
    >
      {isVerifying ? (
        <span className="verification-indicator">{loadingText}</span>
      ) : (
        children
      )}
    </button>
  );
};

export default VerifiableButton;
