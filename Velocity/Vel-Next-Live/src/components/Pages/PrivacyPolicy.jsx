"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, X, Menu, ArrowUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import NavbarOut from "@/components/layout/NavbarOut";

export default function PrivacyPolicyContent() {
  const [activeSection, setActiveSection] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRefs = useRef({});

  const contentBlocks = [
    {
      id: "overview",
      title: "1. Overview",
      content: (
        <div className="text-black">
          <p className="font-dm-sans-semibold">
            At Velocity (Product of Totem Interactive) ("we," "us," "our"), your
            privacy is paramount. This Privacy Policy outlines how we collect,
            use, share, and protect your personal data in compliance with global
            privacy laws, including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>GDPR (EU)</li>
            <li>CCPA (California, USA)</li>
            <li>India's Digital Personal Data Protection (DPDP) Act, 2023</li>
          </ul>
          <p className="mt-2 font-dm-sans-semibold">
            By using Velocity, you consent to the practices described in this
            policy.
            <br />
            <br />
            <strong>Effective Date:</strong> 15th March 2025
          </p>
        </div>
      ),
    },
    {
      id: "information-we-collect",
      title: "2. Information We Collect",
      content: (
        <>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                2.1. Information Provided by You
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                User-Provided Information:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (securely hashed)</li>
                <li>
                  User-generated content (e.g., prompts, text inputs,
                  AI-generated outputs)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                2.2. Information Collected Automatically
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                Technical Data:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>Device identifiers</li>
                <li>IP address</li>
                <li>Browser type/version</li>
                <li>Operating system details</li>
                <li>Usage analytics</li>
              </ul>
              <p className="text-black mt-2 mb-2 font-dm-sans-semibold">
                Tracking Technologies:
              </p>
              <ul className="list-disc pl-5 text-black">
                <li>
                  Cookies and similar mechanisms to personalize your experience
                  and maintain session integrity
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                2.3. Information from Third-Party Integrations
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                Google Authentication:
              </p>
              <ul className="list-disc pl-5 text-black">
                <li>
                  Authentication details as governed by Google's privacy
                  standards
                </li>
              </ul>
              <p className="text-black mt-2 mb-2 font-dm-sans-semibold">
                Other AI Platforms:
              </p>
              <ul className="list-disc pl-5 text-black">
                <li>
                  Relevant metadata processed to enhance service features when
                  connected
                </li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "account-transaction-management",
      title: "3. Account and Transaction Management",
      content: (
        <>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                3.1. Account and Authentication Data
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                When you register for Velocity, we collect:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (hashed)</li>
                <li>Account creation and last login timestamps</li>
                <li>Google account details (if using Google Sign-In)</li>
                <li>Account preferences and settings</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                3.2. Payment Terms
              </h3>
              <p className="text-black font-dm-sans-semibold">
                Velocity currently operates on a pay-as-you-go model. All
                payments are processed securely via Payment Gateway. No refunds
                are available for completed transactions, except as required by
                applicable law. Transactions are handled by Payment Gateway
                Software Private Limited, in full compliance with their privacy
                and security standards.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                3.3. Payment Information We Collect
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                For transaction processing, we collect:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>Transaction IDs (via Payment Gateway)</li>
                <li>Payment status and history</li>
                <li>Payment timestamps</li>
                <li>Service usage details related to each transaction</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "how-we-use-your-information",
      title: "4. How We Use Your Information",
      content: (
        <>
          <p className="text-black mb-4 font-dm-sans-semibold">
            Your data is used to:
          </p>
          <ul className="space-y-3 text-black pl-4">
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">
                  Operate and improve services
                </strong>
                : Enhancing Velocity's AI features
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">
                  Personalize your experience
                </strong>
                : Delivering tailored recommendations
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">
                  Ensure security & compliance
                </strong>
                : Preventing fraud and safeguarding user accounts
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Communicate effectively</strong>:
                Sending service updates, security alerts, and marketing emails
                (opt-out available)
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "information-sharing",
      title: "5. Information Sharing & Third-Party Services",
      content: (
        <>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                5.1. Data Sharing Policy
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                Your information is never sold. It may be shared:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>
                  With trusted vendors (e.g., payment processors, analytics
                  providers) under strict confidentiality agreements
                </li>
                <li>
                  In business transactions (e.g., mergers, acquisitions, asset
                  transfers) in accordance with this policy
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-dm-sans-bold text-black mb-3">
                5.2. Third-Party Services Used
              </h3>
              <p className="text-black mb-2 font-dm-sans-semibold">
                Payment Gateway Payment Gateway:
              </p>
              <ul className="list-disc pl-5 text-black space-y-1">
                <li>
                  Payments are processed by Payment Gateway Software Private
                  Limited
                </li>
                <li>
                  By using Velocity, you agree to Payment Gateway's Privacy
                  Policy and Terms of Service
                </li>
                <li>
                  Contact: No. 22, 1st Floor, SJR Cyber Laskar – Hosur Road,
                  Adugodi, Bangalore – 560030
                </li>
              </ul>
              <p className="text-black mt-2 mb-2 font-dm-sans-semibold">
                Google Authentication:
              </p>
              <ul className="list-disc pl-5 text-black">
                <li>
                  Your authentication data is managed per Google's privacy
                  policies
                </li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "user-rights",
      title: "6. User Rights and Controls",
      content: (
        <>
          <p className="text-black mb-4 font-dm-sans-semibold">
            Under GDPR, CCPA, and the DPDP Act, you have the right to:
          </p>
          <ul className="space-y-3 text-black pl-4">
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                Access & Modify your account information
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                Export your AI prompt history
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                Cancel transactions (please note that completed payments are
                non-refundable except as required by law)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                Request account deletion
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                To exercise these rights, please contact:{" "}
                <a
                  href="mailto:support@toteminteractive.in"
                  className="text-blue-400 hover:text-blue-300"
                >
                  support@toteminteractive.in
                </a>
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "international-transactions",
      title: "8. International Transactions & Compliance",
      content: (
        <p className="text-black font-dm-sans-semibold">
          Velocity supports international transactions via Payment Gateway and
          complies with applicable VAT, GST, or sales tax regulations. For any
          disputes, Indian law applies, with alternative dispute resolution
          available based on local jurisdiction.
        </p>
      ),
    },
    {
      id: "data-retention",
      title: "9. Data Retention",
      content: (
        <p className="text-black font-dm-sans-semibold">
          We retain your personal data only as long as necessary for service
          functionality or as required by law. Once data is no longer required,
          it is securely deleted or anonymized.
        </p>
      ),
    },
    {
      id: "security-measures",
      title: "10. Security Measures",
      content: (
        <>
          <ul className="space-y-3 text-black pl-4">
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Encryption</strong>:
                Industry-standard encryption for data in transit and at rest.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Access Controls</strong>:
                Strictly limited access to personal data.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Regular Audits</strong>: Routine
                security checks to prevent vulnerabilities.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "cookies-tracking",
      title: "11. Cookies and Tracking Technologies",
      content: (
        <>
          <ul className="space-y-3 text-black pl-4">
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Usage</strong>: Cookies are used
                to enhance functionality and analyze usage trends.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span>
                <strong className="text-black">Management</strong>: You can
                manage or disable cookies via your browser settings.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "international-data-transfers",
      title: "12. International Data Transfers",
      content: (
        <p className="text-black font-dm-sans-semibold">
          Velocity complies with global data transfer standards under GDPR,
          CCPA, and DPDP. We use globally recognized providers to secure your
          data during international transfers.
        </p>
      ),
    },
    {
      id: "policy-updates",
      title: "13. Policy Updates and Notifications",
      content: (
        <p className="text-black font-dm-sans-semibold">
          Significant changes will be communicated via email and in-app
          notifications. Historical versions will remain accessible.
        </p>
      ),
    },
    {
      id: "contact",
      title: "14. Contact Information",
      content: (
        <div className="text-black">
          <p className="mb-4 font-dm-sans-semibold">
            For privacy-related inquiries:
          </p>
          <address className="not-italic font-dm-sans-semibold">
            Totem Interactive
            <br />
            Shree Krishna Complex,
            <br />
            Veera Desai Industrial Estate,
            <br />
            Andheri West, Mumbai,
            <br />
            Maharashtra 400053
            <br />
            <br />
            Email:{" "}
            <a
              href="mailto:velocity@toteminteractive.in"
              className="text-blue-400 hover:text-blue-300"
            >
              velocity@toteminteractive.in
            </a>
            <br />
            Contact US no:{" "}
            <a
              href="tel:+91 98102 05205"
              className="text-blue-400 hover:text-blue-300"
            >
              +91 98102 05205
            </a>
          </address>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-50% 0px -50% 0px",
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id) setActiveSection(id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );
    const currentRefs = sectionRefs.current;

    Object.values(currentRefs).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(currentRefs).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  useEffect(() => {
    // Detect if current device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Update on window resize
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Show back to top button when user scrolls down
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    const section = sectionRefs.current[sectionId];
    if (section) {
      const windowHeight = window.innerHeight;
      const elementTop =
        section.getBoundingClientRect().top + window.pageYOffset;
      const offset = windowHeight / 2 - section.offsetHeight / 2;
      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });
      setActiveSection(sectionId);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-white text-black font-[Amenti]">
      {/* Header - Fixed position with higher z-index */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        {/* <NavbarOut /> */}
      </div>

      {/* Content container with padding for navbar height */}
      <div className="pt-32 md:pt-40">
        {/* Title */}
        <div className="w-full py-4 md:py-8 text-center">
          <h1 className="text-3xl md:text-5xl font-dm-sans-bold">
            Privacy Policy
          </h1>
        </div>

        {/* Back to Top Button - Mobile only */}
        {showBackToTop && (
          <div className="md:hidden fixed right-4 bottom-4 z-40">
            <button
              onClick={scrollToTop}
              className="bg-black text-white p-2 rounded-full shadow-md"
              aria-label="Back to top"
            >
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Main Container */}
        <div className="w-[95%] md:w-[85%] mx-auto flex flex-col md:flex-row px-2 md:px-4 pb-16">
          {/* Sidebar - Desktop Only */}
          {!isMobile && (
            <aside className="md:w-[32%] md:sticky md:top-32 md:self-start rounded-sm">
              <div className="bg-[#ffffff] rounded-md border-2 border-black p-4 md:p-6 shadow-[2px_2px_2px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center mb-6">
                  <img
                    src="https://thinkvelocity.in/next-assets/VEL_LOGO.png"
                    alt="Velocity Logo"
                    className="w-8 h-8 mr-2"
                  />
                  <h2 className="text-xl font-dm-sans-bold">Content</h2>
                </div>
                <div className="bg-[#CDF6FE] overflow-hidden border border-black rounded-xl shadow-[2px_2px_2px_0px_rgba(0,0,0,1)]">
                  <div className="space-y-2 max-h-[100vh] md:max-h-none overflow-y-auto p-1">
                    {contentBlocks.map((block, index) => (
                      <div
                        key={block.id}
                        onClick={() => scrollToSection(block.id)}
                        className={`
                        p-2 cursor-pointer hover:bg-gray-100 transition-colors rounded
                        ${
                          activeSection === block.id
                            ? "bg-gray-100 font-medium"
                            : ""
                        }
                      `}
                      >
                        <p className="text-sm font-dm-sans-semibold">
                          <span className="mr-2">{index + 1}.</span>
                          {block.title.replace(/^\d+\.\s+/, "")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Main Content - Full width on mobile */}
          <main
            className={`w-full ${
              !isMobile
                ? "md:w-[68%] md:pl-20 md:ml-12 md:border-l-2 border-black"
                : ""
            } mt-4 md:mt-0 px-2`}
          >
            {/* Content sections */}
            {contentBlocks.map((block) => (
              <section
                key={block.id}
                id={block.id}
                ref={(el) => (sectionRefs.current[block.id] = el)}
                className="mb-8 md:mb-12 pb-6 md:pb-8 border-b-2 border-black"
              >
                <h2 className="text-xl md:text-2xl font-dm-sans-bold uppercase mb-4 md:mb-6">
                  {block.title.replace(/^\d+\.\s+/, "")}
                </h2>
                <div className="text-black text-justify text-sm md:text-base">
                  {block.content}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
