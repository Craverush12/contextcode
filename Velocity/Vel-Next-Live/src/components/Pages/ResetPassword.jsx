"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import Particles with no SSR
const Particles = dynamic(() => import("react-tsparticles").then((mod) => mod.default), {
  ssr: false,
});
// Dynamically import loadFull with no SSR
const ParticlesLoader = dynamic(
  () => import("tsparticles").then((mod) => ({ loadFull: mod.loadFull })),
  { ssr: false }
);

const ResetPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    // Get token from URL query parameters
    const urlToken = searchParams?.get("resetToken");
    if (urlToken) {
      setResetToken(urlToken);
    } else {
      setMessage(
        <span style={{ color: "red" }}>
          Invalid reset token. Please request a new password reset.
        </span>
      );
    }
  }, [searchParams]);

  const particlesInit = useCallback(async (engine) => {
    const { loadFull } = await ParticlesLoader;
    await loadFull(engine);
  }, []);

  const particlesConfig = {
    autoPlay: true,
    background: {
      color: {
        value: "#CDF6FE",
      },
      opacity: 1,
    },
    fullScreen: {
      enable: false,
    },
    detectRetina: true,
    fpsLimit: 120,
    particles: {
      color: {
        value: "#ffffff",
      },
      links: {
        color: "#ffffff",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: true,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 30,
      },
      opacity: {
        value: 0.3,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
  };

  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "newPassword":
        if (!value) error = "New password is required";
        else if (value.length < 6)
          error = "Password must be at least 6 characters";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm your password";
        else if (value !== passwords.newPassword)
          error = "Passwords do not match";
        break;
      default:
        break;
    }
    return error;
  };

  const handleFieldChange = (field, value) => {
    setPasswords((prev) => ({
      ...prev,
      [field]: value,
    }));

    const error = validateField(field, value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!resetToken) {
      setMessage(
        <span style={{ color: "red" }}>
          Invalid reset token. Please request a new password reset.
        </span>
      );
      return;
    }

    const errors = {
      newPassword: validateField("newPassword", passwords.newPassword),
      confirmPassword: validateField(
        "confirmPassword",
        passwords.confirmPassword
      ),
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

    setIsLoading(true);
    setMessage(<span style={{ color: "#2563eb" }}>Resetting password...</span>);

    try {
      const response = await fetch("http://thinkvelocity.in/backend-V1-D/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: passwords.newPassword,
          confirmPassword: passwords.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setMessage(
        <span style={{ color: "green" }}>
          Password reset successful! You can now login with your new password.
        </span>
      );

      // Redirect to login after success
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setMessage(
        <span style={{ color: "red" }}>
          {error.message || "Failed to reset password. Please try again."}
        </span>
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#CDF6FE] text-gray-800 flex flex-col relative"
      >
         {/* <div className="mt-4">
              <Link href="/">
                <Image
                  src="https://thinkvelocity.in/next-assets/velocitylogo.png"
                  width={120}
                  height={30}
                  className="h-auto w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
                  alt="Velocity Logo"
                />
              </Link>
            </div> */}
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-32 items-center mx-auto mt-48 px-4">
        {/* Left Side - Title and Description */}
        <div className="w-full lg:w-[50%] mb-0 lg:mb-0">
          <div className="w-full max-w-2xl p-4 sm:p-6 lg:p-8 mt-5 text-left">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-7xl font-bold mb-7 text-left text-gray-800 leading-tight">
              Reset <br />Password
            </h1>

            {/* Description */}
            <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed font-light mb-6 text-left">
              Please enter your new password below to regain access to your account.
            </p>
            
           
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-[45%]">
          <div className="rounded-lg shadow-xl p-6 sm:p-8 font-amenti mt-6 sm:mt-8 lg:mt-16"
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "0 auto",
              padding: "30px",
              backgroundColor: "#ffffff",
              boxShadow: "4px 4px 2px rgb(0, 0, 0)",
              border: "1px solid rgb(0, 0, 0)",
              borderRadius: "10px",
            }}>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="text-lg sm:text-xl font-semibold block mb-2 text-gray-800"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  className="w-full px-3 py-2 text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                  value={passwords.newPassword}
                  onChange={(e) =>
                    handleFieldChange("newPassword", e.target.value)
                  }
                  disabled={isLoading}
                  suppressHydrationWarning
                />
                {fieldErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-lg sm:text-xl font-semibold block mb-2 text-gray-800"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full px-3 py-2 text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    handleFieldChange("confirmPassword", e.target.value)
                  }
                  disabled={isLoading}
                  suppressHydrationWarning
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full text-black font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 flex items-center justify-center"
                style={{
                  backgroundColor: "#00C8F0",
                  boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                  border: "1px solid rgb(0, 0, 0)",
                  borderRadius: "999px",
                }}
                disabled={isLoading || !resetToken}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              {message && (
                <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600">
                  {message}
                </div>
              )}
              
              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-xs sm:text-sm text-gray-700">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
