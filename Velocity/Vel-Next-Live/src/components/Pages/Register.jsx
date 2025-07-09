"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import Analytics from "../../config/analytics";
import EmailVerification from "../EmailVerification";
import { setAuthData } from "../../utils/authUtils";
import Image from "next/image";

const Register = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Extract referral code from URL if present
  useEffect(() => {
    setIsClient(true);

    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Get the URL search parameters (everything after '?' in the URL)
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get("ref");

      // If referral code exists in URL, update the state
      if (refCode) {
        setReferralCode(refCode);
        console.log("Referral code detected:", refCode);
      }
    }
  }, []);

  const validateField = (field, value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let error = "";
    switch (field) {
      case "firstName":
        if (!value.trim()) error = "First name is required";
        else if (value.length < 2)
          error = "First name must be at least 2 characters";
        break;
      case "lastName":
        if (!value.trim()) error = "Last name is required";
        else if (value.length < 2)
          error = "Last name must be at least 2 characters";
        break;
      case "email":
        if (!value) error = "Email is required";
        else if (!emailRegex.test(value)) error = "Please enter a valid email";
        break;
      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 6)
          error = "Password must be at least 6 characters";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm your password";
        else if (value !== password) error = "Passwords do not match";
        break;
      case "referralCode":
        if (value && value.length !== 10) error = "Invalid referral code";
        break;
      default:
        break;
    }
    return error;
  };

  const handleFieldChange = (field, value) => {
    switch (field) {
      case "firstName":
        setFirstName(value);
        break;
      case "lastName":
        setLastName(value);
        break;
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        if (confirmPassword) {
          setFieldErrors((prev) => ({
            ...prev,
            confirmPassword:
              value !== confirmPassword ? "Passwords do not match" : "",
          }));
        }
        break;
      case "confirmPassword":
        setConfirmPassword(value);
        break;
      case "referralCode":
        setReferralCode(value.toUpperCase());
        break;
      default:
        break;
    }

    const error = validateField(field, value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const applyReferral = async (userId, token) => {
    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/apply-referral",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            referral_code: referralCode,
            user_id: userId,
          }),
        }
      );
      const referealdata = await response.json();
      if (response.ok) {
        Analytics.track("Referral Used");
      }
      if (!response.ok) {
        setMessage(
          <span style={{ color: "orange" }}>
            Account created, but referral bonus could not be applied
          </span>
        );
      }
    } catch (error) {
      // Error handling
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    // If verification code is shown, this is a verification submission
    if (showVerificationInput && verificationCode) {
      await handleVerify();
      return;
    }

    // Regular registration flow below
    // Combine first and last name for the API
    const name = `${firstName} ${lastName}`.trim();

    const errors = {
      firstName: validateField("firstName", firstName),
      lastName: validateField("lastName", lastName),
      email: validateField("email", email),
      password: validateField("password", password),
      confirmPassword: validateField("confirmPassword", confirmPassword),
      referralCode: validateField("referralCode", referralCode),
    };

    setFieldErrors(errors);

    if (Object.values(errors).some((error) => error)) {
      setMessage(
        <span style={{ color: "red" }}>
          Please fix the errors before submitting
        </span>
      );
      return;
    }

    if (!agreeToTerms) {
      setMessage(
        <span style={{ color: "red" }}>
          You must agree to the Terms and Conditions to register
        </span>
      );
      return;
    }

    setIsLoading(true);
    setMessage(
      <span style={{ color: "#2563eb" }}>Processing registration...</span>
    );

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("tutorialShown", data.userdata.tutorial);
        localStorage.setItem("userId", data.userdata.userId);
        localStorage.setItem("userEmail", data.userdata.email);
        localStorage.setItem("userName", data.userdata.name || name);

        Analytics.track("User Register", {
          method: "email",
          timestamp: new Date(),
        });
        Analytics.identify(data.userdata.userId);
        Analytics.setUserProperties({
          email: data.userdata.email,
          username: data.userdata.name,
        });

        if (referralCode) {
          await applyReferral(data.userdata.userId, data.token);
        }

        setMessage(
          <span style={{ color: "green" }}>
            Registration successful! Please verify your email.
          </span>
        );

        // Show verification input and send verification code
        setRegistrationComplete(true);
        setShowVerificationInput(true);
        await handleSendOTP();
      } else {
        switch (response.status) {
          case 400:
            setMessage(
              <span style={{ color: "red" }}>
                Error: {data.message || "Invalid input data"}
              </span>
            );
            break;
          case 409:
            setMessage(
              <span style={{ color: "red" }}>
                Email already registered. Please login instead.
              </span>
            );
            break;
          default:
            setMessage(
              <span style={{ color: "red" }}>
                Error: {data.message || "Registration failed"}
              </span>
            );
        }
      }
    } catch (error) {
      setMessage(
        <span style={{ color: "red" }}>Network error. Please try again.</span>
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = () => {
    router.push("/onboarding");
  };

  const handleGoogleSignUp = async (e) => {
    e.preventDefault();
    if (!agreeToTerms) {
      setMessage(
        <span style={{ color: "red" }}>
          You must agree to the Terms and Conditions to register
        </span>
      );
      return;
    }

    setIsLoading(true);
    setMessage(
      <span style={{ color: "#2563eb" }}>Connecting to Google...</span>
    );

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const apiResponse = await fetch(
        "https://thinkvelocity.in/backend-V1-D/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.displayName || user.email,
            email: user.email,
            googleId: user.uid,
            avatar: user.photoURL,
          }),
        }
      );

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        localStorage.setItem("tutorialShown", data.userdata.tutorial);
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userdata.userId);
        localStorage.setItem("userEmail", data.userdata.email);
        localStorage.setItem(
          "userName",
          data.userdata.username || user.displayName || user.email
        );
        Analytics.track("User Register", {
          method: "google",
          timestamp: new Date(),
        });
        Analytics.identify(data.userdata.userId);
        Analytics.setUserProperties({
          email: data.userdata.email,
          username: data.userdata.username || user.displayName || user.email,
        });

        if (referralCode) {
          await applyReferral(data.userdata.userId, data.userdata.token);
        }

        setMessage(
          <span style={{ color: "green" }}>
            Registration successful! Redirecting...
          </span>
        );
        router.push("/onboarding");
      } else if (apiResponse.status === 409) {
        setMessage(
          <span style={{ color: "orange" }}>
            Account exists. Redirecting to login...
          </span>
        );
        router.push("/login?accountExists=true");
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      setMessage(
        <span style={{ color: "red" }}>
          Failed to connect with Google. Please try again.
        </span>
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerify = (e) => {
    e.preventDefault();

    // Email validation before sending verification code
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: !email ? "Email is required" : "Please enter a valid email",
      }));
      return;
    }

    // Show verification code input field
    setShowVerificationInput(true);
    handleSendOTP();
  };

  const handleVerify = async () => {
    try {
      setIsLoadingVerify(true);
      console.log("Verifying email with code:", verificationCode);
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/verify-email",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            otp: verificationCode,
          }),
        }
      );

      const data = await response.json();
      console.log("Verification response:", data);

      if (response.ok) {
        setIsVerified(true);
        setMessage(
          <span style={{ color: "green" }}>
            Email verified successfully! Redirecting...
          </span>
        );
        console.log("Verification successful, redirecting to onboarding");

        // Force redirect after small delay
        setTimeout(() => {
          console.log("Executing redirect now");
          window.location.href = "/onboarding";
        }, 1500);
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage(
        <span style={{ color: "red" }}>
          Verification failed: {error.message}
        </span>
      );
    } finally {
      setIsLoadingVerify(false);
    }
  };

  const handleSendOTP = async () => {
    try {
      setIsLoadingSend(true);
      console.log("Sending verification email to:", email);
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/send-verification-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
          }),
        }
      );

      const data = await response.json();
      console.log("Verification email response:", data);

      if (response.ok) {
        console.log("Verification email sent successfully");
        setMessage(
          <span style={{ color: "green" }}>
            Verification code sent! Please check your email.
          </span>
        );
      } else {
        console.error("Failed to send verification email:", data.message);
        throw new Error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error in send verification process:", error);
      setMessage(<span style={{ color: "red" }}>Error: {error.message}</span>);
    } finally {
      setIsLoadingSend(false);
    }
  };

  const handleVerificationCodeChange = (e) => {
    setVerificationCode(e.target.value);
  };

  // Add a resend code handler
  const handleResendCode = async (e) => {
    e.preventDefault();
    setMessage(
      <span style={{ color: "#2563eb" }}>Resending verification code...</span>
    );
    await handleSendOTP();
  };

  // Progress bar component for the left column
  const ProgressBar = ({ label, color, completed, isMobile }) => {
    return (
      <div className="flex flex-col">
        <span
          className={`${
            isMobile ? "text-xs" : "text-lg"
          } font-dm-sans-semibold mb-${isMobile ? "1" : "2"} text-left`}
        >
          {label}
        </span>
        <div
          className={`${
            isMobile ? "w-20 h-1" : "w-32 h-2"
          } bg-white border border-black rounded-full`}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${completed}%`,
              backgroundColor: color,
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#CDF6FE" }}>
      <div className="min-h-screen flex items-stretch">
        <div className="flex flex-col md:flex-row w-full">
          {/* Left Column */}
          <div className="hidden md:flex md:w-1/2 flex-col mt-32 px-8 md:px-16 lg:px-24 py-10">
            {/* Progress Bars */}
            <div className="">
              <div className="flex space-x-6 text-black">
                <ProgressBar
                  label="Create Profile"
                  color="#000000"
                  completed={100}
                  isMobile={false}
                />
                <ProgressBar
                  label="Customize"
                  color="#000000"
                  completed={0}
                  isMobile={false}
                />
                <ProgressBar
                  label="Chrome Extension"
                  color="#000000"
                  completed={0}
                  isMobile={false}
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-[1rem] mt-[4rem]">
              <h1 className="text-6xl md:text-7xl font-dm-sans-bold text-black mb-2">
                Welcome to
                <br />
                Velocity
              </h1>
            </div>

            {/* AI Platform Logos */}
            <div>
              <p className="text-lg text-black font-dm-sans-semibold mb-4">
                Works Where You Work
              </p>
              <div className="flex flex-wrap gap-4">
                {/* First row - 4 logos */}
                <div className="flex gap-4 w-full mb-4">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Gemini-Logo.png"
                    width={150}
                    height={45}
                    alt="Gemini logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Grok-Logo.png"
                    width={120}
                    height={45}
                    alt="Grok logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/ChatGPT-Logo.png"
                    width={150}
                    height={45}
                    alt="ChatGPT logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Claude.png"
                    width={120}
                    height={45}
                    alt="Claude logo"
                    className="h-12 w-auto"
                  />
                </div>

                {/* Second row - 3 logos */}
                <div className="flex gap-4 w-full">
                  <Image
                    src="https://thinkvelocity.in/next-assets/Bolt-Logo.png"
                    width={150}
                    height={45}
                    alt="Bolt logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Perplexity-Logo.png"
                    width={150}
                    height={45}
                    alt="Perplexity logo"
                    className="h-12 w-auto"
                  />
                  <Image
                    src="https://thinkvelocity.in/next-assets/Vercel-Logo.png"
                    width={150}
                    height={45}
                    alt="Vercel logo"
                    className="h-12 w-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Register Form */}
          <div className="w-full md:w-1/2 flex flex-col md:items-center p-2">
            {/* Mobile only progress bar - replaces welcome text */}
            <div className="md:hidden mt-4 mb-4 px-4">
              <div className="flex justify-start space-x-2 text-black">
                <ProgressBar
                  label="Create Profile"
                  color="#000000"
                  completed={100}
                  isMobile={true}
                />
                <ProgressBar
                  label="Customize"
                  color="#000000"
                  completed={0}
                  isMobile={true}
                />
                <ProgressBar
                  label="Chrome Extension"
                  color="#000000"
                  completed={0}
                  isMobile={true}
                />
              </div>
            </div>

            <div className="flex justify-center items-center w-full h-full mt-2 md:mt-8">
              <div
                className="bg-white rounded-lg px-6 sm:px-8 py-6 sm:py-8 w-11/12 sm:w-10/12 md:w-11/12 max-w-xl"
                style={{
                  boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
                  border: "1px solid rgb(0, 0, 0)",
                  borderRadius: "10px",
                }}
              >
                <div className="mb-4">
                  <h2 className="text-2xl text-black font-dm-sans-bold text-left mb-2">
                    Create an account
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First Name and Last Name row */}
                  <div className="flex flex-row gap-4">
                    <div className="w-1/2">
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        placeholder="Enter first name"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        style={{ borderRadius: "10px" }}
                        value={firstName}
                        onChange={(e) =>
                          handleFieldChange("firstName", e.target.value)
                        }
                        required
                        disabled={isLoading}
                      />
                      {fieldErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                          {fieldErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="w-1/2">
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        placeholder="Enter last name"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        style={{ borderRadius: "10px" }}
                        value={lastName}
                        onChange={(e) =>
                          handleFieldChange("lastName", e.target.value)
                        }
                        required
                        disabled={isLoading}
                      />
                      {fieldErrors.lastName && (
                        <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                          {fieldErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        placeholder="Enter your email"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        style={{ borderRadius: "10px" }}
                        value={email}
                        onChange={(e) =>
                          handleFieldChange("email", e.target.value)
                        }
                        required
                        disabled={isLoading || showVerificationInput}
                      />
                      {!showVerificationInput && (
                        <button
                          type="button"
                          onClick={handleEmailVerify}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 font-dm-sans-semibold hover:text-blue-700 transition-colors duration-300 text-sm"
                          style={{ borderRadius: "10px" }}
                          disabled={isLoading || !email}
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    {fieldErrors.email && (
                      <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Verification Code Input - appears after clicking verify */}
                  {showVerificationInput && (
                    <div>
                      <label
                        htmlFor="verificationCode"
                        className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                      >
                        Verification Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="verificationCode"
                          placeholder="Enter verification code"
                          className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                          style={{ borderRadius: "10px" }}
                          value={verificationCode}
                          onChange={handleVerificationCodeChange}
                          required
                          disabled={isLoadingVerify}
                        />
                        <button
                          type="button"
                          onClick={handleResendCode}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 font-dm-sans-semibold hover:text-blue-700 transition-colors duration-300 text-sm"
                          style={{ borderRadius: "10px" }}
                          disabled={isLoadingSend}
                        >
                          {isLoadingSend ? "Sending..." : "Resend"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-dm-sans-semibold">
                        Enter the verification code sent to your email
                      </p>
                    </div>
                  )}

                  {/* Password and Confirm Password row */}
                  <div className="flex flex-row gap-4">
                    <div className="w-1/2">
                      <label
                        htmlFor="password"
                        className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        style={{ borderRadius: "10px" }}
                        value={password}
                        onChange={(e) =>
                          handleFieldChange("password", e.target.value)
                        }
                        required
                        disabled={isLoading}
                      />
                      {fieldErrors.password && (
                        <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    <div className="w-1/2">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                      >
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        style={{ borderRadius: "10px" }}
                        value={confirmPassword}
                        onChange={(e) =>
                          handleFieldChange("confirmPassword", e.target.value)
                        }
                        required
                        disabled={isLoading}
                      />
                      {fieldErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div>
                    <label
                      htmlFor="referralCode"
                      className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                    >
                      Referral Code (Optional)
                    </label>
                    <input
                      type="text"
                      id="referralCode"
                      placeholder="Enter referral code"
                      className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      style={{ borderRadius: "10px" }}
                      value={referralCode}
                      onChange={(e) =>
                        handleFieldChange("referralCode", e.target.value)
                      }
                      disabled={isLoading}
                    />
                    {fieldErrors.referralCode && (
                      <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                        {fieldErrors.referralCode}
                      </p>
                    )}
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  <div className="flex items-start mt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 mr-2 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-600 font-dm-sans-semibold"
                    >
                      I agree to the{" "}
                      <a
                        href="https://thinkvelocity.in/terms-and-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 font-dm-sans-semibold"
                      >
                        Terms and Conditions
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://thinkvelocity.in/privacypolicy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 font-dm-sans-semibold"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Register Button */}
                  <div className="pt-2">
                    <button
                      className={`hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full ${
                        agreeToTerms
                          ? "bg-[#00C2FF] hover:bg-[#00B3F0]"
                          : "bg-gray-300"
                      } text-black font-dm-sans-bold py-2.5 rounded-full transition-colors duration-300 text-base`}
                      type="submit"
                      disabled={
                        isLoading ||
                        !agreeToTerms ||
                        (showVerificationInput && !verificationCode)
                      }
                      onMouseEnter={(e) => {
                        if (agreeToTerms)
                          e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        if (agreeToTerms)
                          e.currentTarget.style.boxShadow =
                            "2px 2px 1px rgb(0, 0, 0)";
                      }}
                      style={{
                        boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                        border: "1px solid rgb(0, 0, 0)",
                      }}
                    >
                      {isLoading
                        ? "Processing..."
                        : showVerificationInput
                        ? "Verify"
                        : "Register"}
                    </button>
                  </div>

                  {/* Google Sign Up Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleGoogleSignUp}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "2px 2px 1px rgb(0, 0, 0)";
                      }}
                      type="button"
                      className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full flex justify-center items-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 text-black font-dm-sans-bold py-2.5 rounded-full transition-colors duration-300 text-base"
                      disabled={isLoading}
                      style={{
                        boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                        border: "1px solid rgb(0, 0, 0)",
                      }}
                    >
                      <Image
                        src="https://thinkvelocity.in/next-assets/googlelogo.png"
                        width={20}
                        height={20}
                        alt="Google"
                        className="w-5"
                      />
                      Sign up with Google
                    </button>
                  </div>

                  {/* Message Area */}
                  {message && (
                    <div className="mt-3 text-center text-sm">{message}</div>
                  )}
                </form>

                {/* Link to Login */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Log In
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
