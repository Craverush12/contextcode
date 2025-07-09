"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";

import Analytics from "../../config/analytics";
import {
  trackUserLogin,
  trackUserSignup,
  trackError,
} from "../../utils/eventTracking";
import { Shadow } from "@react-three/drei";
import VerifiableButton from "../../components/common/VerifiableButton";

const Login = ({ setIsLoggedIn }) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    resetEmail: "",
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true when component mounts on client
    setIsClient(true);

    // Check for existing token only on client side and only after component mounts
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("firebaseUser");
    if (storedToken && storedUser) {
      if (typeof setIsLoggedIn === "function") {
        setIsLoggedIn(true);
      }
      router.push("/profile");
    }

    // Check URL for accountExists parameter (coming from registration page)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("accountExists") === "true") {
      setMessage(
        <span style={{ color: "orange" }}>
          Account exists. Please sign in with your credentials.
        </span>
      );
    }
  }, [router, setIsLoggedIn]);

  const validateField = (field, value) => {
    let error = "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (field) {
      case "email":
      case "resetEmail":
        if (!value) error = "Email is required";
        else if (!emailRegex.test(value)) error = "Please enter a valid email";
        break;
      case "password":
        if (!value) error = "Password is required";
        break;
      default:
        break;
    }
    return error;
  };

  const handleFieldChange = (field, value) => {
    switch (field) {
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        break;
      case "resetEmail":
        setResetEmail(value);
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

  const handleSubmit = async (event) => {
    // If event is provided, prevent default form submission
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    setMessage("");

    const errors = {
      email: validateField("email", email),
      password: validateField("password", password),
    };

    setFieldErrors((prev) => ({
      ...prev,
      email: errors.email,
      password: errors.password,
    }));

    if (Object.values(errors).some((error) => error)) {
      setMessage(
        <span style={{ color: "red" }}>
          Please fix the errors before submitting
        </span>
      );
      return false; // Return false to indicate verification failure
    }

    setIsLoading(true);
    setMessage(<span style={{ color: "#2563eb" }}>Processing login...</span>);

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      // Check if the response indicates success
      if (!data.success) {
        throw new Error(data.message || "Login failed");
      }

      // Check if token exists in the response
      if (!data.token) {
        throw new Error("Authentication successful but no token provided");
      }

      // Store token first to ensure it's available
      localStorage.setItem("token", data.token);

      // Then store the rest of the user data
      localStorage.setItem("authMethod", "email");
      localStorage.setItem("userId", data.userdata.userId);
      localStorage.setItem("userEmail", data.userdata.userEmail);
      localStorage.setItem("userName", data.userdata.userName);
      localStorage.setItem("tutorialShown", data.userdata.userTutorial);

      // Track login with Mixpanel
      Analytics.track("User Login", {
        method: "email",
        userId: data.userdata.userId,
        email: data.userdata.userEmail,
        username: data.userdata.userName,
        last_login: new Date().toISOString(),
      });

      if (typeof setIsLoggedIn === "function") {
        setIsLoggedIn(true);
      }

      setMessage(<span style={{ color: "green" }}>Login successful!</span>);
      // Add a small delay before redirecting to ensure storage is complete
      setTimeout(() => {
        router.push("/profile?showLLMOption=true");
      }, 500);

      return true; // Return true to indicate verification success
    } catch (error) {
      // Provide a more specific error message based on the error
      if (error.message === "No token provided or invalid format") {
        setMessage(
          <span style={{ color: "red" }}>
            Invalid credentials. Please check your email and password.
          </span>
        );
      } else if (error.message.includes("token")) {
        setMessage(
          <span style={{ color: "red" }}>
            Server authentication error. Please try again later.
          </span>
        );
      } else {
        setMessage(
          <span style={{ color: "red" }}>
            {error.message || "Login failed. Please try again."}
          </span>
        );
      }

      // Track login error with Mixpanel
      Analytics.track("Login Error", {
        method: "email",
        error_message: error.message || "Unknown error",
        email: email,
      });

      return false; // Return false to indicate verification failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (event) => {
    // If event is provided, prevent default
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    setIsLoading(true);
    setMessage(
      <span style={{ color: "#2563eb" }}>Connecting to Google...</span>
    );

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: result.user.email,
            googleId: result.user.uid,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 404 ||
          data.message?.toLowerCase().includes("not found")
        ) {
          const registerResponse = await fetch(
            "https://thinkvelocity.in/backend-V1-D/register",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: result.user.email,
                name: result.user.displayName || user.email,
                googleId: result.user.uid,
                avatar: result.user.photoURL,
              }),
            }
          );

          const registerData = await registerResponse.json();

          if (registerResponse.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("tutorialShown", data.userdata.tutorial);
            localStorage.setItem("userId", data.userdata.userId);
            localStorage.setItem("userEmail", data.userdata.email);
            localStorage.setItem("userName", data.userdata.name || user.email);
            localStorage.setItem("authMethod", "google");
            localStorage.setItem(
              "firebaseUser",
              JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
              })
            );

            // Track signup with Mixpanel
            Analytics.track("User Signup", {
              method: "google",
              userId: registerData.userdata.userId,
              email: result.user.email,
              username: result.user.displayName || user.email,
              signup_date: new Date().toISOString(),
              has_profile_image: !!result.user.photoURL,
            });

            if (typeof setIsLoggedIn === "function") {
              setIsLoggedIn(true);
            }
            router.push("/onboarding");
            return true;
          } else {
            throw new Error(registerData.message || "Registration failed");
          }
        } else if (response.status === 401) {
          setMessage(
            <span style={{ color: "red" }}>
              This email is registered but not with Google. Please use
              email/password login.
            </span>
          );
          localStorage.clear();
          await auth.signOut();
          setIsLoading(false);
          return false;
        } else {
          throw new Error(data.message || "Login failed");
        }
      }

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("authMethod", "google");
        localStorage.setItem("userId", data.userdata.userId);
        localStorage.setItem("userEmail", data.userdata.userEmail);
        localStorage.setItem("userName", data.userdata.userName);
        localStorage.setItem("tutorialShown", data.userdata.userTutorial);
        localStorage.setItem(
          "firebaseUser",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
          })
        );

        // Track login with Mixpanel
        Analytics.track("User Login", {
          method: "google",
          userId: data.userdata.userId,
          email: data.userdata.userEmail,
          username: data.userdata.userName,
          last_login: new Date().toISOString(),
          has_profile_image: !!user.photoURL,
        });

        if (typeof setIsLoggedIn === "function") {
          setIsLoggedIn(true);
        }
        setMessage(<span style={{ color: "green" }}>Login successful!</span>);
        router.push("/profile?showLLMOption=true");
        return true;
      }
    } catch (error) {
      // Track the error with Mixpanel
      Analytics.track("Login Error", {
        method: "google",
        error_type: error.code || "unknown_error",
        error_message: error.message || "Unknown error occurred",
        email: result?.user?.email || "",
      });

      if (error.code === "auth/popup-closed-by-user") {
        setMessage(
          <span style={{ color: "red" }}>
            Login cancelled. Please try again.
          </span>
        );
      } else if (error.code === "auth/popup-blocked") {
        setMessage(
          <span style={{ color: "red" }}>
            Popup was blocked. Please allow popups and try again.
          </span>
        );
      } else {
        setMessage(
          <span style={{ color: "red" }}>Login failed. Please try again.</span>
        );
      }
      localStorage.clear();
      await auth.signOut();
      return false;
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowResetModal(true);
    setResetEmail(email); // Pre-fill with login email if available
  };

  const handleSendResetLink = async (e) => {
    // If event is provided, prevent default
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const error = validateField("resetEmail", resetEmail);
    setFieldErrors((prev) => ({ ...prev, resetEmail: error }));

    if (error) {
      setResetMessage(
        <span style={{ color: "red" }}>Please enter a valid email</span>
      );
      return false;
    }

    setIsResetLoading(true);
    setResetMessage(
      <span style={{ color: "#2563eb" }}>Sending reset link...</span>
    );

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setResetMessage(
          <span style={{ color: "red" }}>
            {data.message || "Failed to send reset email"}
          </span>
        );
        throw new Error(data.message || "Failed to send reset email");
      }

      // Track password reset request with Mixpanel
      Analytics.track("Password Reset Requested", {
        email: resetEmail,
        timestamp: new Date().toISOString(),
      });

      setResetMessage(
        <span style={{ color: "green" }}>
          Password reset link sent! Please check your email.
        </span>
      );

      // Close modal after a delay
      setTimeout(() => {
        setShowResetModal(false);
        setResetMessage("");
      }, 3000);

      return true;
    } catch (error) {
      setResetMessage(
        <span style={{ color: "red" }}>
          {error.message || "Failed to send reset email. Please try again."}
        </span>
      );

      // Track password reset error with Mixpanel
      Analytics.track("Password Reset Error", {
        email: resetEmail,
        error_message: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      });

      return false;
    } finally {
      setIsResetLoading(false);
    }
  };

  // Use a separate useEffect for analytics initialization with proper client-side check
  useEffect(() => {
    // Analytics initialization happens here after component mounts on client
    if (isClient) {
      // Any GTM or analytics initialization can go here
    }
  }, [isClient]);

  // Close modal when clicking outside
  const handleCloseModal = (e) => {
    if (e.target.id === "reset-modal-backdrop") {
      setShowResetModal(false);
      setResetMessage("");
    }
  };

  // Progress bar component for the left column
  const ProgressBar = ({ label, color, completed, isMobile }) => {
    return (
      <div className="flex flex-col">
        <span
          className={`${isMobile ? "text-xs" : "text-lg"} font-medium mb-${
            isMobile ? "1" : "2"
          } text-left`}
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
            <div className="mb-[1rem]">
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

          {/* Right Column - Login Form */}
          <div className="w-full md:w-1/2 flex flex-col md:items-center p-2">
            {/* Mobile only welcome text - now outside the form container */}
            <div className="md:hidden text-center mb-2 mt-8">
              <h1 className="text-3xl font-dm-sans-bold text-black">
                Welcome to Velocity
              </h1>
            </div>

            <div className="flex justify-center items-center w-full h-full mt-2 md:mt-8">
              <div
                className="bg-white  px-6 sm:px-8 py-6 sm:py-8 w-11/12 sm:w-10/12 md:w-11/12 max-w-xl"
                style={{
                  boxShadow: "4px 4px 2px rgba(0, 0, 0, 1)",
                  border: "1px solid rgb(0, 0, 0)",
                  borderRadius: "10px",
                }}
              >
                <div className="mb-5">
                  <h2 className="text-2xl text-black font-dm-sans-bold text-Left mb-2">
                    Login
                  </h2>
                  <p className="text-gray-600 text-left text-sm font-dm-sans-semibold">
                    Welcome back! Please enter your details.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      value={email}
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value)
                      }
                      disabled={isLoading}
                    />
                    {fieldErrors.email && (
                      <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
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
                      value={password}
                      onChange={(e) =>
                        handleFieldChange("password", e.target.value)
                      }
                      disabled={isLoading}
                    />
                    {fieldErrors.password && (
                      <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleForgotPassword}
                      type="button"
                      className="text-sm text-blue-500 hover:text-blue-700 font-dm-sans-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="pt-2">
                    <VerifiableButton
                      className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full bg-[#00C2FF] text-black font-dm-sans-bold py-2 rounded-full hover:bg-[#00B3F0] transition-colors duration-300 text-base"
                      type="submit"
                      disabled={isLoading}
                      style={{
                        boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                        border: "1px solid rgb(0, 0, 0)",
                      }}
                      buttonName="Login"
                      verificationType="credentials"
                      onClick={handleSubmit}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "2px 2px 1px rgb(0, 0, 0)";
                      }}
                      loadingText="Signing in..."
                      additionalProps={{
                        email_provided: !!email,
                        password_provided: !!password,
                      }}
                    >
                      Log In
                    </VerifiableButton>
                  </div>

                  <div className="pt-2">
                    <VerifiableButton
                      onClick={handleGoogleSignIn}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "2px 2px 1px rgb(0, 0, 0)";
                      }}
                      type="button"
                      className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none w-full flex justify-center items-center gap-2 bg-white border border-gray-300 text-black font-dm-sans-bold py-2 rounded-full hover:bg-gray-50 transition-colors duration-300 text-base"
                      disabled={isLoading}
                      style={{
                        boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                        border: "1px solid rgb(0, 0, 0)",
                      }}
                      buttonName="Google Login"
                      verificationType="google_auth"
                      loadingText="Connecting to Google..."
                      additionalProps={{
                        login_method: "google",
                      }}
                    >
                      <Image
                        src="https://thinkvelocity.in/next-assets/googlelogo.png"
                        width={24}
                        height={24}
                        alt="Google"
                        className="w-5"
                      />
                      Log in with Google
                    </VerifiableButton>
                  </div>

                  {message && (
                    <div className="mt-3 text-center text-sm font-dm-sans-semibold">
                      {message}
                    </div>
                  )}
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 font-dm-sans-semibold">
                    Don't have an account?{" "}
                    <Link
                      href="/register"
                      className="text-blue-500 hover:text-blue-700 font-dm-sans-semibold"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal - Keeping the existing functionality */}
      {showResetModal && (
        <div
          id="reset-modal-backdrop"
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            style={{
              border: "2px solid #000000",
              boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-dm-sans-bold text-gray-800">
                Reset Password
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-4 font-dm-sans-semibold">
              Enter your email for a password reset link.
            </p>

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label
                  htmlFor="resetEmail"
                  className="block text-sm font-dm-sans-semibold text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="resetEmail"
                  className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={resetEmail}
                  onChange={(e) =>
                    handleFieldChange("resetEmail", e.target.value)
                  }
                  disabled={isResetLoading}
                  placeholder="Enter your email"
                />
                {fieldErrors.resetEmail && (
                  <p className="text-red-500 text-xs mt-1 font-dm-sans-semibold">
                    {fieldErrors.resetEmail}
                  </p>
                )}
              </div>

              <VerifiableButton
                type="submit"
                className="w-full bg-[#00C8F0] text-black font-dm-sans-bold py-2 rounded-full border-2 border-black hover:bg-blue-600 transition-colors duration-300"
                style={{
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 1px rgba(0, 0, 0, 1)",
                }}
                disabled={isResetLoading}
                buttonName="Password Reset"
                verificationType="password_reset"
                onClick={handleSendResetLink}
                loadingText="Sending..."
                additionalProps={{
                  email: resetEmail,
                }}
              >
                Send Reset Link
              </VerifiableButton>

              {resetMessage && (
                <div className="mt-3 text-center text-sm font-dm-sans-semibold">
                  {resetMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
