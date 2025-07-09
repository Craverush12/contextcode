import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import ButtonTracking from "../../utils/buttonTracking";
import Link from "next/link";

const ScrollAnchor = ({ scrollRefs }) => {
  const [selected, setSelected] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: 2,
      label: "How it works",
      refKey: "howItWorksRef",
    },
    {
      id: 5,
      label: "Built For",
      refKey: "builtRef",
    },
    {
      id: 6,
      label: "Reviews",
      refKey: "remarksRef",
    },

    {
      id: 4,
      label: "Patch Notes",
      type: "link",
      path: "/patch-notes",
    },
  ];

  const handleScroll = () => {
    for (const item of navigationItems) {
      const targetRef = scrollRefs[item.refKey];
      if (targetRef?.current) {
        const rect = targetRef.current.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 3;
        if (sectionCenter >= 0 && sectionCenter <= window.innerHeight) {
          setSelected(item.id);
          break;
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRefs]);

  const handleClick = (id, refKey, type, path) => {
    setSelected(id);
    setIsMobileMenuOpen(false);

    // Track navigation click
    ButtonTracking.trackButtonClick("Navigation", {
      section: refKey || path,
      item_name:
        navigationItems.find((item) => item.id === id)?.label || "Unknown",
      device: window.innerWidth < 640 ? "mobile" : "desktop",
    });

    if (type === "link") {
      // Navigation will be handled by the Link component
      return;
    }

    const targetRef = scrollRefs[refKey];
    if (targetRef?.current) {
      const navbarHeight = window.innerWidth < 640 ? 70 : 100;
      const elementPosition =
        targetRef.current.getBoundingClientRect().top + window.scrollY; // Using scrollY instead of pageYOffset
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="sm:hidden">
        <button
          onClick={() => {
            // Track mobile menu toggle
            ButtonTracking.trackButtonClick("Mobile Menu Toggle", {
              action: isMobileMenuOpen ? "close" : "open",
              device: "mobile",
            });
            setIsMobileMenuOpen(!isMobileMenuOpen);
          }}
          className="p-2 rounded-full bg-gray-100 border border-gray-200"
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-4 right-4 bg-white border border-gray-200 rounded-xl p-2 sm:hidden z-50 shadow-md">
          <div className="flex flex-col space-y-2">
            {navigationItems.map((item) =>
              item.type === "link" ? (
                <Link href={item.path} key={item.id} passHref>
                  <button
                    className={`flex items-center transition-all duration-300 text-base sm:text-lg px-4 py-2 rounded-lg w-full font-dm-sans ${
                      selected === item.id ? "text-black" : "text-black"
                    }`}
                    style={{ fontWeight: 300 }}
                    onClick={() =>
                      handleClick(item.id, null, item.type, item.path)
                    }
                  >
                    {item.label}
                  </button>
                </Link>
              ) : (
                <button
                  key={item.id}
                  className={`flex items-center transition-all duration-300 text-base sm:text-lg px-4 py-2 rounded-lg w-full font-dm-sans ${
                    selected === item.id ? "text-black" : "text-black"
                  }`}
                  style={{ fontWeight: 300 }}
                  onClick={() =>
                    handleClick(item.id, item.refKey, item.type, null)
                  }
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Tablet/Desktop Menu */}
      <div className="hidden sm:flex justify-center items-center">
        <div className="flex items-center justify-between flex-nowrap gap-8">
          {navigationItems.map((item) =>
            item.type === "link" ? (
              <Link href={item.path} key={item.id} passHref>
                <button
                  className={`text-xl sm:text-xl transition-all duration-300 font-dm-sans ${
                    selected === item.id
                      ? "text-black"
                      : "text-black hover:text-[#00C8F0]"
                  }`}
                  style={{
                    fontWeight: 500,
                    color: "#152A32",
                    verticalAlign: "middle",
                  }}
                  onClick={() =>
                    handleClick(item.id, null, item.type, item.path)
                  }
                >
                  {item.label}
                </button>
              </Link>
            ) : (
              <button
                key={item.id}
                className={`text-xl sm:text-xl transition-all duration-300 font-dm-sans ${
                  selected === item.id
                    ? "text-black"
                    : "text-black hover:text-[#00C8F0]"
                }`}
                style={{
                  fontWeight: 500,
                  color: "#152A32",
                  verticalAlign: "middle",
                }}
                onClick={() =>
                  handleClick(item.id, item.refKey, item.type, null)
                }
              >
                {item.label}
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default ScrollAnchor;
