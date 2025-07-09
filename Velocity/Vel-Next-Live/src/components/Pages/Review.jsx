import { useState, useCallback, useEffect } from "react";
import { FiSend, FiUpload, FiX } from "react-icons/fi";
import dynamic from "next/dynamic";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Dynamically import Particles with no SSR
const Particles = dynamic(
  () => import("react-tsparticles").then((mod) => mod.default),
  {
    ssr: false,
  }
);
// Dynamically import loadFull with no SSR
const ParticlesLoader = dynamic(
  () => import("tsparticles").then((mod) => ({ loadFull: mod.loadFull })),
  { ssr: false }
);

const Review = () => {
  const BaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://thinkvelocity.in/backend-V1-D";
  const [selectedReason, setSelectedReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [image, setImage] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track extension uninstall when user visits this page
  useEffect(() => {
    const trackUninstall = async () => {
      if (!isClient) return;

      const user_id = localStorage.getItem("user_id") || "0";

      try {
        const response = await fetch(`${BaseUrl}/ext-install`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user_id,
            installed: false,
          }),
        });

        if (response.ok) {
          console.log("Uninstall tracked successfully");
        } else {
          console.error("Failed to track uninstall");
        }
      } catch (error) {
        console.error("Error tracking uninstall:", error);
      }
    };

    trackUninstall();
  }, [isClient, BaseUrl]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB. Please upload a smaller image.");
        return;
      }

      setImage(
        // file
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );
    }
    if (rejectedFiles && rejectedFiles.length > 0) {
      rejectedFiles.forEach((file) => {
        file.errors.forEach((err) => {
          console.error(`File ${file.file.name} error: ${err.message}`);
        });
      });
      alert("Please upload a valid image file (jpg, jpeg, or png ).");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Default to "0" for guests - using client-side check
    const user_id = isClient ? localStorage.getItem("userId") || "0" : "0";

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("selectedReason", selectedReason);
    formData.append("feedback", feedback);
    if (image) formData.append("image", image);

    try {
      const response = await fetch(`${BaseUrl}/reviews`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        alert("Thank you for your feedback!");
        setSelectedReason("");
        setFeedback("");
        setImage(null);
      } else {
        alert("Error: Experiencing High load Try again later ");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit review.");
    }
  };

  const removeImage = () => {
    URL.revokeObjectURL(image.preview);
    setImage(null);
  };

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image]);

  return (
    <div className="min-h-screen bg-[#CDF6FE] text-gray-800 flex flex-col relative">
      {/* Navbar */}
      {/* <Navbar /> */}

      <div className="relative flex items-center justify-center lg:min-h-screen z-10 pointer-events-auto px-4 py-4 pt-10 sm:pt-20 lg:pt-4">
        {/* Layout container */}
        <div className="w-full max-w-7xl flex flex-col lg:flex-row justify-between items-center">
          {/* Left Side - Title and Description */}
          <div className="w-full lg:w-[50%] mb-6 lg:mb-0 px-4">
            <div className="w-full max-w-2xl p-4 sm:p-6 lg:p-8 mt-5 text-left">
              {/* Mobile/Tablet Title Layout */}
              <div className="flex items-center mb-6 lg:hidden">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
                  We're sorry to see you go!
                </h1>
              </div>

              {/* Desktop Title (hidden on mobile/tablet) */}
              <h1 className="hidden lg:block text-5xl xl:text-7xl font-bold mb-7 text-left text-gray-800 leading-tight">
                We're sorry to see you go!
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-light mb-6 text-left">
                We're sorry to see you go! We're here to help you improve your
                experience. Please take a moment to share your feedback.
              </p>
            </div>
          </div>

          {/* Review Form - Right Side - Keeping your existing form structure */}
          <div className="w-full lg:w-[40%]">
            <div
              className="rounded-lg shadow-xl p-3 sm:p-4 font-amenti"
              style={{
                width: "100%",
                maxWidth: "450px",
                margin: "0 auto",
                backgroundColor: "#ffffff",
                boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                border: "1px solid rgb(0, 0, 0)",
                borderRadius: "10px",
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2 text-gray-800">
                    Why are you uninstalling Velocity?
                  </h3>
                  <div className="space-y-1">
                    {[
                      "Not useful",
                      "Too buggy",
                      "Difficult to use",
                      "Other",
                    ].map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="radio"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="hidden"
                        />
                        <span
                          className={`w-4 h-4 inline-block mr-2 rounded-full border ${
                            selectedReason === reason
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-400"
                          } flex-shrink-0 transition duration-300 flex items-center justify-center`}
                        >
                          {selectedReason === reason && (
                            <span className="block w-1.5 h-1.5 rounded-full bg-white"></span>
                          )}
                        </span>
                        <span
                          className={`text-sm ${
                            selectedReason === reason
                              ? "text-blue-600"
                              : "text-gray-700"
                          } group-hover:text-gray-900 transition duration-300`}
                        >
                          {reason}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="feedback"
                    className="text-sm sm:text-base font-semibold block mb-1 text-gray-800"
                  >
                    Additional feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Please share any additional thoughts..."
                    className="w-full px-2 py-1 text-sm text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                    rows="3"
                    required={selectedReason === "Other"}
                  />
                </div>
                <div>
                  <label className="text-sm sm:text-base font-semibold block mb-1 text-gray-800">
                    Attach a screenshot (optional)
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed border-gray-400 rounded-lg p-2 text-center cursor-pointer transition duration-300 ${
                      isDragActive
                        ? "border-blue-500 bg-blue-100"
                        : "hover:border-blue-500 hover:bg-blue-50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {image ? (
                      <div className="relative">
                        <img
                          src={image.preview || "/placeholder.svg"}
                          alt="Preview"
                          className="max-h-24 mx-auto"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <FiUpload className="text-2xl mb-1 text-blue-400" />
                        <p className="text-xs text-gray-700">
                          Drag & drop an image here, or click to select one
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full hover:bg-blue-600 text-black font-bold py-2 px-3 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: "#00C8F0",
                    boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                    border: "1px solid rgb(0, 0, 0)",
                    borderRadius: "999px",
                  }}
                >
                  <FiSend className="mr-2" size={14} />
                  Submit Feedback
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Review;
