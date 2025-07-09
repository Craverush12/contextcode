"use client";

import { useState, useEffect } from "react";
import { FiSend, FiCheck } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EventTracking from "@/utils/eventTracking";
import ButtonTracking from "@/utils/buttonTracking";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);

  // Track page visit when component mounts
  useEffect(() => {
    EventTracking.trackVisit({
      page_name: "Contact Us",
      page_category: "support",
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Track form submission event
    EventTracking.track("Form Submitted", {
      form_name: "Contact Us",
      form_type: "contact",
      has_name: !!formData.name,
      has_email: !!formData.email,
      has_message: !!formData.message,
    });

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/help-us",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Track successful submission
        EventTracking.track("Form Submission Success", {
          form_name: "Contact Us",
        });

        setFormData({
          name: "",
          email: "",
          message: "",
        });
        setShowThankYouPopup(true);
        setTimeout(() => {
          setShowThankYouPopup(false);
        }, 5000);
      } else {
        // Track submission error
        EventTracking.trackError("Form Submission", data.error, {
          form_name: "Contact Us",
        });

        alert("Error: " + data.error);
      }
    } catch (error) {
      // Track error
      EventTracking.trackError("Form Submission", error.message, {
        form_name: "Contact Us",
      });

      console.error("Error submitting help Message:", error);
      alert("Failed to submit Contact.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col relative">
      {/* Navbar */}
      {/* <Navbar /> */}

      {/* Thank You Popup */}
      {showThankYouPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="bg-gray-900 border border-blue-500 rounded-lg p-6 max-w-md mx-auto z-10 text-center shadow-lg transform transition-all">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <FiCheck className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-dm-sans-bold text-white mb-2">
              Thank You!
            </h3>
            <p className="text-blue-200 mb-5 font-dm-sans-semibold">
              Thanks for contacting us. We will get back to you as soon as
              possible.
            </p>
            <button
              onClick={() => setShowThankYouPopup(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-dm-sans-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Background Image */}
      <div className="absolute inset-0" />

      {/* Logo positioned at top left - only visible on desktop */}
      <div className="fixed top-8 left-8 z-20 p-2 sm:p-4 hidden lg:block">
        {/* <Link
          href="/"
          className="flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Image
            src={"https://thinkvelocity.in/next-assets/velocitylogo.png"}
            className="h-14 w-14 transition-all duration-300"
            alt="Velocity Logo"
            width={56}
            height={56}
          />
        </Link> */}
      </div>

      <div className="relative flex items-center justify-center lg:min-h-screen z-10 pointer-events-auto px-4 py-4 pt-10 sm:pt-20 lg:pt-4">
        {/* Layout container */}
        <div className="w-full max-w-7xl flex flex-col lg:flex-row justify-between items-center">
          {/* Left Side - Enhanced Title and Description */}
          <div className="w-full lg:w-[50%] mb-0 lg:mb-0 px-4">
            <div className="w-full max-w-2xl p-4 sm:p-6 lg:p-8 mt-5">
              {/* Mobile/Tablet Logo + Title Layout */}
              <div className="flex items-center mb-6 lg:hidden">
                <Link href="/home" className="mr-4 flex-shrink-0">
                  <Image
                    src={
                      "https://thinkvelocity.in/next-assets/velocitylogo.png"
                    }
                    className="h-12 w-12 sm:h-14 sm:w-14 transition-all duration-300"
                    alt="Velocity Logo"
                    width={48}
                    height={48}
                  />
                </Link>
                <h1
                  className="text-3xl font-dm-sans sm:text-4xl md:text-5xl text-gray-800 leading-tight"
                  style={{
                    color: "#152A32",
                    fontWeight: "900",
                  }}
                >
                  Contact Us
                </h1>
              </div>

              {/* Desktop Title (hidden on mobile/tablet) */}
              <h1 className="hidden lg:block text-5xl xl:text-7xl font-dm-sans-bold mb-7 text-left text-gray-800 leading-tight">
                Contact Us
              </h1>

              {/* Description - hidden on mobile, visible on larger screens */}
              <div className="hidden md:block">
                <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed font-dm-sans-semibold mb-6">
                  We're here to assist you! Whether you have a question, need
                  support, or just want to say hello, our team is ready to help.
                  Reach out to us and experience our commitment to excellence
                  firsthand.
                </p>
                <p
                  className="text-lg text-gray-500 mt-6 italic"
                  style={{
                    color: "#000000",
                    fontStyle: "italic",
                    fontWeight: "bold",
                    backgroundColor: "#ffffff",
                    alignContent: "left",
                    width: "70%", // Added width property
                    maxWidth: "400px", // Added max-width for larger screens
                    margin: "0", // Changed from "0 auto" to "0" to left-align
                    padding: "10px 15px", // Added some padding for better text spacing
                    borderRadius: "10px",
                    boxShadow: "2px 2px 1px rgb(0, 0, 0)",
                    border: "1px solid rgb(0, 0, 0)",
                    borderRadius: "2px",
                  }}
                >
                  "Your feedback drives our innovation."
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form - Right Side */}
          <div className="w-full lg:w-[40%]">
            <div
              className="w-full max-w-lg  rounded-lg shadow-xl p-6 sm:p-8  font-amenti mt-6 sm:mt-8 lg:mt-16"
              style={{
                backgroundColor: "#CDF6FE",
                boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                border: "1px solid rgb(0, 0, 0)",
                borderRadius: "10px",
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="text-lg sm:text-xl font-dm-sans-semibold block mb-4 text-gray-800"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full px-3 py-2 text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="text-lg sm:text-xl font-dm-sans-semibold block mb-2 text-gray-800"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your email"
                    className="w-full px-3 py-2 text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="text-lg sm:text-xl font-dm-sans-semibold block mb-2 text-gray-800"
                  >
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please share your message..."
                    className="w-full px-3 py-2 text-gray-800 bg-white rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-300"
                    rows="4"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none
                    w-full  hover:bg-blue-600 text-black font-dm-sans-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 flex items-center justify-center"
                  style={{
                    backgroundColor: "#00C8F0",
                    boxShadow: "4px 4px 2px rgb(0, 0, 0)",
                    border: "1px solid rgb(0, 0, 0)",
                    borderRadius: "999px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    // Track button hover
                    ButtonTracking.trackButtonClick(
                      "Contact Form Submit Hover",
                      {
                        form_name: "Contact Us",
                        interaction_type: "hover",
                      }
                    );
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "4px 4px 1px rgb(0, 0, 0)";
                  }}
                  onClick={() => {
                    // Track button click (in addition to form submission tracking)
                    ButtonTracking.trackButtonClick("Contact Form Submit", {
                      form_name: "Contact Us",
                      has_name: !!formData.name,
                      has_email: !!formData.email,
                      has_message: !!formData.message,
                    });
                  }}
                >
                  <FiSend className="mr-2" />
                  Send Message
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

export default ContactUs;
