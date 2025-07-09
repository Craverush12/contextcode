import { useRouter } from "next/navigation";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { useCallback, useEffect } from "react";
import Analytics from "../../config/analytics";

const QrPage = () => {
  const router = useRouter();

  useEffect(() => {
    Analytics.track("QR Page View", {
      deviceType: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(
        navigator.userAgent
      )
        ? "mobile"
        : "desktop",
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      userAgent: navigator.userAgent,
      language: navigator.language,
    });
  }, []);

  const handleDownloadClick = () => {
    Analytics.track("Download Button Clicked", {
      location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
      timestamp: new Date().toISOString(),
    });
  };

  const handleSocialClick = (platform) => {
    Analytics.track("Social Link Clicked", {
      platform,
      location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
    });
  };

  // const copyPromoCode = () => {
  //   navigator.clipboard.writeText("Student100");
  //   Analytics.track("Promo Code Copied", {
  //     code: "Student100",
  //     location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
  //   });
  // };

  const handleTryNow = (e) => {
    e.preventDefault();
    Analytics.track("Button Clicked", {
      buttonName: "Try for Free",
      location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
    });
    window.open(
      "https://chromewebstore.google.com/detail/velocity/ggiecgdncaiedmdnbmgjhpfniflebfpa",
      "_blank"
    );

    // Navigate to home page and scroll to PromptBox
    // router.push("/");
    // setTimeout(() => {
    //   const promptBox = document.getElementById("promptarea");
    //   if (promptBox) {
    //     promptBox.scrollIntoView({ behavior: "smooth" });
    //   }
    // }, 100); // Small delay to ensure navigation completes
  };

  const particlesInit = useCallback(async (engine) => {
    // console.log("Initializing particles");
    try {
      await loadFull(engine);
    } catch (error) {
      // console.error("Error loading particles:", error);
    }
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles loaded:", container);
  }, []);

  const particlesConfig = {
    autoPlay: true,
    background: {
      color: {
        value: "#000000",
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Particles
          id="tsparticles"
          init={particlesInit}
          loaded={particlesLoaded}
          options={particlesConfig}
          className="w-full h-full"
        />
      </div>
      <div className="relative flex items-center justify-center min-h-screen z-10 pointer-events-auto px-4 py-4">
        <div className="absolute h-full w-full inset-0 bg-[radial-gradient(circle_at_center,_#008ACB_0%,_transparent_40%)] opacity-30 animate-gradient-move pointer-events-none" />
        <div className="w-full max-w-lg border border-gray-800 rounded-lg shadow-xl p-6 sm:p-8 bg-opacity-30 bg-gray-900 pointer-events-auto">
          <div className="w-full max-w-full mx-auto">
            {/* Mobile Layout */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-center pb-2">
                <h1 className="text-3xl font-dm-sans-bold text-white">
                  Think Velocity
                </h1>
                <p className="text-gray-400 mt-2 text-base font-dm-sans-semibold">
                  For full experience use it on desktop
                </p>
              </div>

              <div className="w-full aspect-video bg-[#093042]/20 rounded-lg overflow-hidden">
                <video
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  muted
                  poster="/placeholder.svg?height=480&width=640"
                  onPlay={() =>
                    Analytics.track("Video Play", { view: "mobile" })
                  }
                  onPause={() =>
                    Analytics.track("Video Pause", { view: "mobile" })
                  }
                >
                  <source
                    src="https://thinkvelocity.in/next-assets/demo-video.webm"
                    type="video/webm"
                  />
                  Your browser does not support the video tag.
                </video>
              </div>

              <button
                className="text-white px-8 py-5 text-lg rounded-md transition-all hover:scale-105 glowing-button flex items-center justify-center"
                onClick={handleTryNow}
              >
                <img
                  src="https://thinkvelocity.in/next-assets/Chrome_Webstoreicon.png"
                  alt="Chrome Web Store"
                  className="h-7 sm:h-6 md:h-12 mr-2 sm:mr-2"
                />
                <span className="font-dm-sans-bold">Download Now!</span>
              </button>

              <div
                onClick={() => {
                  router.push("/profile");
                }}
                className="bg-[#093042] hover:bg-[#093042]/90 text-white px-8 py-2.5 text-base rounded-md transition-all hover:scale-105 cursor-pointer"
              >
                <p className="text-white font-dm-sans-bold">Redeem</p>
              </div>
              <p className="text-white font-dm-sans-semibold text-base">
                Use Code:{" "}
                <span className="font-dm-sans-bold py-1">Student100</span>
              </p>

              <div className="flex gap-8 mt-4">
                {/* Instagram Icon */}
                <a
                  href="https://www.instagram.com/thinkvelocity/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Instagram"
                  onClick={() => handleSocialClick("instagram")}
                >
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>

                {/* LinkedIn Icon */}
                <a
                  href="https://www.linkedin.com/company/totem-interactive/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                  onClick={() => handleSocialClick("linkedin")}
                >
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>

                {/* Linktree Icon */}
                <a
                  href="https://linktr.ee/thinkvelocity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Linktree"
                  onClick={() => handleSocialClick("linktree")}
                >
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 417 512.238"
                    fill="currentColor"
                    stroke="none"
                  >
                    <path d="M171.274 344.942h74.09v167.296h-74.09V344.942zM0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Web Layout */}
            <div className="hidden md:grid grid-cols-2 gap-8 items-center py-12">
              <div className="flex flex-col items-center gap-8">
                <div className="text-center">
                  <h1 className="text-5xl font-dm-sans-bold text-white">
                    Think Velocity
                  </h1>
                  <p className="text-gray-400 mt-2 text-lg font-dm-sans-semibold">
                    For full experience use it on desktop
                  </p>
                </div>

                <div className="w-full aspect-video bg-[#093042]/20 rounded-lg overflow-hidden">
                  <video
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                    muted
                    poster="/placeholder.svg?height=480&width=640"
                    onPlay={() =>
                      Analytics.track("Video Play", { view: "desktop" })
                    }
                    onPause={() =>
                      Analytics.track("Video Pause", { view: "desktop" })
                    }
                  >
                    <source src="https://thinkvelocity.in/next-assets/demo-video.webm" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8">
                <button
                  className="text-white px-8 py-3 text-lg rounded-md transition-all hover:scale-105 glowing-button flex items-center justify-center"
                  onClick={handleTryNow}
                >
                  <img
                    src="https://thinkvelocity.in/next-assets/Chrome_Webstoreicon.png"
                    alt="Chrome Web Store"
                    className="h-7 sm:h-6 md:h-12 mr-2 sm:mr-2"
                  />
                  <span className="font-dm-sans-bold">Download Now!</span>
                </button>

                <div
                  onClick={() => {
                    router.push("/profile");
                  }}
                  className="bg-[#093042] hover:bg-[#093042]/90 text-white px-6 py-2.5 text-base rounded-md transition-all hover:scale-105 w-full max-w-md cursor-pointer text-center"
                >
                  <p className="text-white m-0 font-dm-sans-bold">Redeem</p>
                </div>
                <p className="text-white font-dm-sans-semibold">
                  Use Code:{" "}
                  <span className="font-dm-sans-bold">Student100</span>
                </p>

                <div className="flex gap-8 mt-4">
                  {/* Instagram Icon */}
                  <a
                    href="https://www.instagram.com/thinkvelocity/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="Instagram"
                    onClick={() => handleSocialClick("instagram")}
                  >
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>

                  {/* LinkedIn Icon */}
                  <a
                    href="https://www.linkedin.com/company/totem-interactive/posts/?feedView=all"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="LinkedIn"
                    onClick={() => handleSocialClick("linkedin")}
                  >
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>

                  {/* Linktree Icon */}
                  <a
                    href="https://linktr.ee/thinkvelocity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="Linktree"
                    onClick={() => handleSocialClick("linktree")}
                  >
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 417 512.238"
                      fill="currentColor"
                      stroke="none"
                    >
                      <path d="M171.274 344.942h74.09v167.296h-74.09V344.942zM0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrPage;
