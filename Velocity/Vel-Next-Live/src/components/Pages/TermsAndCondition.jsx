import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, X, Menu, ArrowUp } from "lucide-react";
import NavbarOut from "@/components/layout/NavbarOut";
import Footer from "@/components/layout/Footer";

const TermsAndCondition = () => {
  const [activeSection, setActiveSection] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRefs = useRef({});

  const contentBlocks = [
    {
      id: "introduction",
      title: "1. Introduction",
      content: (
        <>
          <p className="text-black mb-6 font-dm-sans-semibold">
            Effective Date: 15th March 2025
          </p>
          <p className="text-black mb-4 font-dm-sans-semibold">
            Welcome to Velocity. These Terms and Conditions ("Terms") govern
            your use of our services. By using Velocity, you agree to be bound
            by these Terms. Please read them carefully.
          </p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "2. Acceptable Use",
      content: (
        <>
          <p className="text-black mb-4 font-dm-sans-semibold">
            You agree to use Velocity responsibly and in accordance with all
            applicable laws. Prohibited activities include, but are not limited
            to:
          </p>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Unauthorized Access</strong>:
                Reverse engineering, automated data scraping, or any
                unauthorized exploitation of our services.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">
                  Malicious or Disruptive Behavior
                </strong>
                : Exploiting vulnerabilities, distributing malware, or engaging
                in any activities that could harm Velocity or its users.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Interference</strong>: Disrupting
                or degrading the functionality or security of Velocity.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "user-responsibilities",
      title: "3. User Responsibilities",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Account Security</strong>: You
                are responsible for maintaining the confidentiality of your
                login credentials and for all activities that occur under your
                account.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Compliance</strong>: Use Velocity
                in accordance with all applicable laws and these Terms.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Ethical Conduct</strong>: Act
                responsibly and report any unauthorized or suspicious activity
                immediately.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "intellectual-property",
      title: "4. Intellectual Property Rights",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">User-Generated Content</strong>:
                You retain ownership of content you create using Velocity.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Proprietary Rights</strong>:
                Velocity retains all rights to its proprietary software,
                technology, designs, and any enhancements or modifications
                thereof.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "limitation-of-liability",
      title: "5. Limitation of Liability",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Disclaimer</strong>: Velocity is
                not liable for any indirect, incidental, consequential, or
                punitive damages arising from your use of our services.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Liability Cap</strong>: Our total
                liability shall not exceed the amount you have paid for Velocity
                in the preceding 12 months.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "indemnification",
      title: "6. Indemnification",
      content: (
        <>
          <p className="text-black font-dm-sans-semibold">
            You agree to indemnify and hold Velocity, its affiliates, and their
            officers and directors harmless from any claims, damages, or
            expenses arising from your misuse of our services, breach of these
            Terms, or violation of any applicable laws.
          </p>
        </>
      ),
    },
    {
      id: "dispute-resolution",
      title: "7. Dispute Resolution & Arbitration",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Initial Mediation</strong>: We
                will endeavor to resolve any disputes through good-faith
                negotiations and mediation.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Arbitration</strong>: If
                mediation is unsuccessful, disputes will be resolved by binding
                arbitration under the Arbitration & Conciliation Act, 1996.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Jurisdiction</strong>: All legal
                proceedings shall be conducted exclusively in the courts of
                India.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "termination",
      title: "8. Termination",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Right to Terminate</strong>:
                Velocity reserves the right to suspend or terminate your access
                without prior notice if you violate these Terms or engage in
                harmful activities.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Effect of Termination</strong>:
                Termination does not absolve you of any obligations incurred
                prior to termination.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "data-retention",
      title: "9. Data Retention",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Retention Policy</strong>: We may
                retain certain account and usage data for as long as necessary
                to provide, support, and improve our services or as required by
                law.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Deletion</strong>: Upon
                termination or at your request, such data will be deleted or
                anonymized in accordance with our retention policies.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "policy-updates",
      title: "10. Policy Updates",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Amendments</strong>: We reserve
                the right to modify these Terms periodically. Significant
                changes will be communicated via email and in-app notifications.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Acceptance</strong>: Continued
                use of Velocity constitutes acceptance of the updated Terms.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "detailed-acceptable-use",
      title: "11. Detailed Acceptable Use and User Responsibilities",
      content: (
        <>
          <ul className="space-y-2 md:space-y-3 text-black pl-2 md:pl-4">
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Specific Prohibitions</strong>:
                You must not engage in reverse engineering, unauthorized
                scraping, or any actions that exploit vulnerabilities to
                compromise Velocity's systems or data security.
              </span>
            </li>
            <li className="flex gap-1 md:gap-2">
              <span className="text-black min-w-[1rem]">•</span>
              <span className="font-dm-sans-semibold">
                <strong className="text-black">Expected Conduct</strong>: You
                are expected to act ethically and responsibly, ensuring a safe
                and productive environment for all users.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "contact",
      title: "12. Contact Information",
      content: (
        <div className="text-black">
          <p className="mb-4 font-dm-sans-semibold">
            For any questions regarding these Terms and Conditions, please
            contact:
          </p>
          <address className="not-italic px-2 md:px-0 font-dm-sans-semibold">
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
              href="mailto:info@toteminteractive.in"
              className="text-blue-400 hover:text-blue-300 break-words"
            >
              info@toteminteractive.in
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
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(sectionRefs.current).forEach((ref) => {
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

    // Close mobile menu on window resize
    const handleResize = () => {
      checkMobile();
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    // Show back to top button when user scrolls down
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    setIsMobileMenuOpen(false);
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

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-white text-black font-[Amenti]">
      {/* Header - Fixed position with higher z-index */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        {/* <NavbarOut /> */}
      </div>

      {/* Content container with padding for navbar height */}
      <div className="pt-20 md:pt-24">
        {/* Title */}
        <div className="w-full py-4 md:py-8 text-center">
          <h1 className="text-3xl md:text-5xl font-dm-sans-bold">
            Terms & Conditions
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
                <h2 className="text-xl md:text-2xl font-bold uppercase mb-4 md:mb-6">
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

      {/* Prevent body scroll when mobile menu is open */}
      {isMobileMenuOpen && (
        <style jsx global>{`
          body {
            overflow: hidden;
          }
        `}</style>
      )}
    </div>
  );
};

export default TermsAndCondition;

// <style jsx global>{`
//   /* Neo-brutalist styles */
//   section {
//     position: relative;
//     background: white;
//   }

//   section:hover {
//     background: #f9f9f9;
//   }

//   h2 {
//     font-family: "Amenti", sans-serif;
//     letter-spacing: 0.05em;
//   }

//   p,
//   li {
//     font-family: monospace;
//     line-height: 1.6;
//   }

//   .shadow-brutal {
//     box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 1);
//   }

//   /* Remove previous glow effects */
//   .glow-blue::after {
//     display: none;
//   }
// `}</style>;
