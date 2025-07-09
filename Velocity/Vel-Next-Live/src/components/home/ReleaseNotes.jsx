import React, { useCallback, useState } from "react";
import { Rocket, Wrench } from "lucide-react";
import Navbar from "../layout/Navbar";
import NavbarOut from "../layout/NavbarOut";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

const releaseNotes = [
  {
    version: "2.0.6",
    date: "20-03-25", // Updated to March 17, 2025
    newFeatures: [
      "New Prompt Clarification Feature – Velocity now asks clarifying questions to help refine user input for better results.",
      "Context-Aware Prompt Refinements – Analyzes input and suggests ways to make it more effective before sending it to the AI model.",
      "Framework-Based Prompt Handling – AI outputs are now structured for multiple platforms, including ChatGPT, Claude, Leonardo, Perplexity, and more.",
      "Faster & More Efficient Processing – Optimized API load and query performance for speedier responses with less processing cost.",
      "Expanded AI Platform Support – Seamless integration with more AI models, including ChatGPT, Claude, Gemini, Mistral, LLaMA, Mercury, Runway, Leonardo AI, Qwen, Perplexity AI, Kimi, and Nemotron.",
      "Refined Onboarding Flow – A simplified, structured introduction to help users get started faster.",
      "Updated Enhance Button UI – Smoother prompt refinement & profile management controls.",
      "Landing Page UI Refresh – Sleek design, improved layout, and better usability.",
      "API Call Optimization – Reduced unnecessary API calls for smoother and more cost-effective performance.",
      "Security Enhancements – End-to-end encryption, authentication, and backend security improvements.",
    ],
    improvements: [
      "Performance Optimization – Faster and more responsive prompt processing.",
      "Enhanced UI Elements – Improved visual feedback and interactions.",
      "Bug Fixes – Resolved minor issues and improved stability.",
      "Privacy Policy & UI Fixes – More transparent privacy settings with an overall UI polish.",
    ],
  },
  {
    version: "2.0.5",
    date: "20-02-25",
    newFeatures: [
      "Enhanced User Prompt Analysis – Analyzes the user's prompt on a deep level across its context, completeness, clarity, and effectiveness.",
      "AI-Powered Optimization – Velocity intelligently enhances prompts for optimal AI interaction.",
      "Seamless Browser Integration – Works effortlessly with supported browsers to streamline prompt refinement.",
      "User-Friendly Interface – Intuitive design ensures an easy and efficient user experience.",
    ],
    improvements: [
      "Performance Optimization – Faster and more responsive prompt processing",
      "Enhanced UI Elements – Improved visual feedback and interactions",
      "Bug Fixes – Resolved minor issues and improved stability",
    ],
  },
  {
    version: "2.0.4",
    date: "20-02-20",
    newFeatures: [
      "Advanced Analytics Dashboard",
      "Real-time Collaboration Tools",
      "Custom Template Support",
    ],
    improvements: [
      "Improved Loading Times",
      "Enhanced Error Handling",
      "Better Mobile Responsiveness",
    ],
  },
  {
    version: "2.0.3",
    date: "20-02-15",
    newFeatures: [
      "Multi-language Support",
      "Dark Mode Implementation",
      "Export Functionality",
    ],
    improvements: [
      "UI/UX Refinements",
      "Performance Optimizations",
      "Security Enhancements",
    ],
  },
  {
    version: "2.0.2",
    date: "20-02-10",
    newFeatures: [
      "Cloud Sync Feature",
      "Advanced Search Capabilities",
      "Custom Notifications",
    ],
    improvements: [
      "Backend Optimizations",
      "Frontend Performance",
      "API Improvements",
    ],
  },
];

const ReleaseNotes = () => {
  const [activeVersion, setActiveVersion] = useState(0);
  const [selectedReason, setSelectedReason] = useState("Suggestions");
  const [feedback, setFeedback] = useState("");
  const [image, setImage] = useState(null);
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [expandedImprovements, setExpandedImprovements] = useState({});

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB. Please upload a smaller image.");
        return;
      }
      setImage(
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
      alert("Please upload a valid image file (jpg, jpeg, or png).");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: false,
  });

  const handleSend = async (e) => {
    e.preventDefault();

    const user_id = localStorage.getItem("user_id") || 0;
    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("selectedReason", selectedReason);
    formData.append("feedback", feedback);
    if (image) formData.append("image", image);

    // console.log("Submitted:", { selectedReason, feedback, image });

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/reviews",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert("Thank you for your feedback!");
        setSelectedReason("");
        setFeedback("");
        setImage(null);
      } else {
        alert("Error: " + data.error);
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

  // Toggle expanded state for features
  const toggleFeatures = (versionIndex) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [versionIndex]: !prev[versionIndex],
    }));
  };

  // Toggle expanded state for improvements
  const toggleImprovements = (versionIndex) => {
    setExpandedImprovements((prev) => ({
      ...prev,
      [versionIndex]: !prev[versionIndex],
    }));
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-none font-dm-sans bg-white"
      style={{
        fontFamily: "DM Sans, sans-serif",
        color: "#152A32",
        fontWeight: "300",
        backgroundColor: "white",
        backgroundImage:
          "url(https://thinkvelocity.in/next-assets/Mask_group3.png)",
        backgroundPosition: "center",
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* <NavbarOut /> */}
      {/* <Navbar /> */}
      <div className="relative z-10 px-6 pt-20 pb-16 md:pb-36 text-black h-full">
        <div
          className="mx-auto mb-8 px-4 md:px-8 py-8 relative"
          style={{
            maxWidth: "1000px",
            width: "100%",
          }}
        >
          <div className="flex items-center justify-center relative">
            <h1
              className="text-5xl sm:text-5xl md:text-5xl lg:text-7xl release-note-heading text-center font-dm-sans"
              style={{
                color: "#152A32",
                fontWeight: "900",
              }}
            >
              Patch N
              <span
                className="inline-flex items-center justify-center relative"
                style={{
                  width: "0.8em",
                  height: "1em",
                  verticalAlign: "middle",
                }}
              >
                <Image
                  src="https://thinkvelocity.in/next-assets/VEL_LOGO2.png"
                  alt="o"
                  width={40}
                  height={40}
                  className="w-[35px] h-[35px] sm:w-[30px] sm:h-[30px] md:w-[35px] md:h-[35px] lg:w-[45px] lg:h-[45px] absolute border-2 border-black rounded-full"
                  style={{
                    transform: "translateY(-1px)",
                  }}
                />
              </span>
              tes
            </h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto h-full flex-col"></div>

        <div className="max-w-6xl mx-auto h-full flex-col">
          <div className="flex flex-none gap-3 mx-auto mb-4">
            <button
              onClick={() => setActiveVersion(0)}
              className={`px-4 py-2 text-sm font-dm-sans transition-all duration-300 rounded-md hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none ${
                activeVersion === 0
                  ? "bg-[#00C8F0] text-black"
                  : "bg-white text-black border border-gray-300 hover:bg-gray-100"
              }`}
              style={{
                border: "2px solid #000000",
                boxShadow: "3px 3px 2px 0px rgb(0, 0, 0)",
                borderRadius: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "1px 1px 1px 0px rgb(0, 0, 0)";
              }}
            >
              Latest
            </button>
            {[1, 2, 3, 4].map((num, index) => (
              <button
                key={index}
                onClick={() => setActiveVersion(index + 1)}
                className={`px-4 py-2 min-w-[40px] text-sm font-dm-sans transition-all duration-300 rounded-md hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none ${
                  activeVersion === index + 1
                    ? "bg-[#00C8F0] text-black"
                    : "bg-white text-black border border-gray-300 hover:bg-gray-100"
                }`}
                style={{
                  border: "2px solid #000000",
                  boxShadow: "1px 1px 1px 0px rgb(0, 0, 0)",
                  borderRadius: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "3px 3px 1px rgb(0, 0, 0)";
                }}
              >
                {num}
              </button>
            ))}
          </div>

          <div
            className="flex-1 relative  backdrop-blur -mt-2  custom-scrollbar border border-gray-200 shadow-md"
            style={{
              backgroundColor: "#CDF6FE",
              border: "2px solid #000000",
              borderRadius: "10px",
              boxShadow: "1px 1px 1px 0px rgb(0, 0, 0)",
            }}
          >
            {releaseNotes.map((note, index) => (
              <div
                key={index}
                className={`transition-all duration-500 ease-in-out ${
                  activeVersion === index
                    ? "relative opacity-100"
                    : "absolute inset-0 opacity-0 pointer-events-none"
                }`}
              >
                <div className="min-h-[10vh] md:min-h-[10vh] transition-all duration-500">
                  <div className="flex items-start justify-between p-0 lg:p-4">
                    <h2
                      className="font-dm-sans release-note-title text-5xl md:text-7xl lg:text-7xl mt-8 md:mt-2 ml-2 md:ml-8 text-black font-dm-sans-bold"
                      style={{
                        color: "#152A32 ",
                        fontWeight: "600",
                      }}
                    >
                      RELEASE NOTE
                    </h2>
                    <div className="text-right mt-2 md:mt-0 mr-2 md:mr-0">
                      <p
                        className="text-sm md:text-lg xl:text-xl text-black font-dm-sans"
                        style={{ color: "#152A32", fontWeight: "300" }}
                      >
                        Date: {note.date}
                      </p>
                      <p
                        className="text-sm md:text-lg xl:text-xl text-black font-dm-sans"
                        style={{ color: "#152A32", fontWeight: "300" }}
                      >
                        Version: {note.version}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 scrollbar-hide">
                  <div className="space-y-6">
                    <section
                      style={{
                        backgroundColor: "#EAF1F4",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgb(0, 0, 0)",
                        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Image
                          src="https://thinkvelocity.in/next-assets/Union.png"
                          alt="Rocket"
                          width={24}
                          height={24}
                        />

                        <h3
                          className="text-lg font-dm-sans text-black"
                          style={{
                            color: "#152A32",
                            fontWeight: "300",
                          }}
                        >
                          New Features
                        </h3>
                      </div>
                      <ul className="space-y-3 text-gray-800 font-dm-sans">
                        {note.newFeatures
                          .slice(
                            0,
                            expandedFeatures[index]
                              ? note.newFeatures.length
                              : 4
                          )
                          .map((feature, i) => (
                            <li
                              key={i}
                              className="flex gap-2 font-dm-sans"
                              style={{ color: "#152A32", fontWeight: "300" }}
                            >
                              <span className="text-blue-600">•</span>
                              {feature}
                            </li>
                          ))}
                      </ul>
                      {note.newFeatures.length > 4 && (
                        <button
                          onClick={() => toggleFeatures(index)}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {expandedFeatures[index] ? "Show Less" : "Read More"}
                        </button>
                      )}
                    </section>

                    <section
                      style={{
                        backgroundColor: "#EAF1F4",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgb(0, 0, 0)",
                        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Image
                          src="https://thinkvelocity.in/next-assets/Star.png"
                          alt="Rocket"
                          width={24}
                          height={24}
                        />
                        <h3
                          className="text-lg font-dm-sans text-black"
                          style={{
                            color: "#152A32",
                            fontWeight: "300",
                          }}
                        >
                          Improvements
                        </h3>
                      </div>
                      <ul className="space-y-3 text-gray-800 font-dm-sans">
                        {note.improvements
                          .slice(
                            0,
                            expandedImprovements[index]
                              ? note.improvements.length
                              : 4
                          )
                          .map((improvement, i) => (
                            <li
                              key={i}
                              className="flex gap-2 font-dm-sans"
                              style={{ color: "#152A32", fontWeight: "300" }}
                            >
                              <span className="text-green-600">•</span>
                              {improvement}
                            </li>
                          ))}
                      </ul>
                      {note.improvements.length > 4 && (
                        <button
                          onClick={() => toggleImprovements(index)}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {expandedImprovements[index]
                            ? "Show Less"
                            : "Read More"}
                        </button>
                      )}
                    </section>

                    {/* Message Box with Image Upload */}
                    <div className="mt-8 flex justify-center">
                      <div className="w-full max-w-2xl h-16 flex items-center justify-between bg-gray-100 px-6 py-2 rounded-[12px] border border-gray-300 focus-within:border-gray-400">
                        <div
                          {...getRootProps()}
                          className="flex items-center justify-center cursor-pointer"
                        >
                          <input {...getInputProps()} />
                          {image ? (
                            <div className="relative">
                              <Image
                                src={image.preview}
                                alt="Preview"
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover rounded"
                              />
                              <button
                                onClick={removeImage}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                              >
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 337 337"
                              className="h-[24px] text-gray-500 hover:text-gray-700 transition-all duration-300"
                            >
                              <circle
                                strokeWidth={20}
                                stroke="currentColor"
                                fill="none"
                                r="158.5"
                                cy="168.5"
                                cx="168.5"
                              />
                              <path
                                strokeLinecap="round"
                                strokeWidth={25}
                                stroke="currentColor"
                                d="M167.759 79V259"
                              />
                              <path
                                strokeLinecap="round"
                                strokeWidth={25}
                                stroke="currentColor"
                                d="M79 167.138H259"
                              />
                            </svg>
                          )}
                        </div>
                        <input
                          required
                          placeholder="Help us get better!"
                          type="text"
                          id={`messageInput-${index}`}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full h-full bg-transparent outline-none border-none px-4 text-gray-800 text-lg font-dm-sans"
                          style={{ color: "#152A32", fontWeight: "300" }}
                        />
                        <button
                          id={`sendButton-${index}`}
                          onClick={handleSend}
                          className="w-fit h-full bg-transparent outline-none border-none flex items-center justify-center cursor-pointer transition-all duration-300 group"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 664 663"
                            className="h-[24px] text-gray-500 group-hover:text-gray-700 transition-all duration-300"
                          >
                            <path
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              strokeWidth="33.67"
                              stroke="currentColor"
                              d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotes;
