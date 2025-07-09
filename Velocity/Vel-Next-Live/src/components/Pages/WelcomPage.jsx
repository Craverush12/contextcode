"use client";
import React, { useEffect } from "react";

const stepImages = [
  "https://thinkvelocity.in/next-assets/S1.png",
  "https://thinkvelocity.in/next-assets/S2.png",
  "https://thinkvelocity.in/next-assets/S3.png",
];

const stepIcons = [
  "https://thinkvelocity.in/next-assets/Sun.png", // Step 1
  "https://thinkvelocity.in/next-assets/Union.png", // Step 2
  "https://thinkvelocity.in/next-assets/Feature.png", // Step 3
];

// Add keyframes for fade-in animation
const fadeInAnimation = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default function WelcomPage() {
  useEffect(() => {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );

    window.fbq("init", "1097418550681578");
    window.fbq("track", "PageView");
    window.fbq("track", "Lead");
  }, []);

  return (
    <>
      <style>{fadeInAnimation}</style>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=1097418550681578&ev=PageView&noscript=1"
        />
      </noscript>
      <div
        className="relative min-h-screen w-full font-dm-sans bg-white"
        style={{
          fontFamily: "DM Sans, sans-serif",
          color: "#152A32",
          fontWeight: 300,
          backgroundColor: "white",
          backgroundImage:
            "url(https://thinkvelocity.in/next-assets/Mask_group3.png)",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "60px",
        }}
      >
        {/* Main Heading */}
        <h1
          className="font-dm-sans"
          style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
            marginTop: 100,
            animation: "fadeIn 0.8s ease-out forwards",
          }}
        >
          Craft Better Prompts with Velocity!
        </h1>
        {/* Subheading */}
        <div
          className="font-dm-sans"
          style={{
            fontSize: 24,
            fontWeight: 400,
            maxWidth: 850,
            textAlign: "center",
            marginBottom: 40,
            lineHeight: 1.5,
            animation: "fadeIn 0.8s ease-out 0.2s forwards",
            opacity: 0,
          }}
        >
          Hate writing prompts? You're not alone — and that's okay. The struggle
          ends here. With Velocity, you'll write smarter, quicker, and with way
          less effort.
        </div>
        {/* Steps Heading */}
        <h2
          className="font-dm-sans"
          style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 32,
            animation: "fadeIn 0.8s ease-out 0.4s forwards",
            opacity: 0,
          }}
        >
          <span style={{ color: "#4ED6FF  " }}>Get Started</span> in 3 easy
          steps
        </h2>
        {/* Steps Row */}
        <div
          className="font-dm-sans"
          style={{
            display: "flex",
            gap: 257,
            marginBottom: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2].map((idx) => (
            <div
              className="font-dm-sans"
              key={idx}
              style={{
                background: "#fff",
                border: "2px solid #222",
                borderRadius: 16,
                padding: "18px 28px 18px 28px",
                minWidth: 260,
                maxWidth: 300,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                boxShadow: "none",
                animation: `fadeIn 0.8s ease-out ${0.6 + idx * 0.2}s forwards`,
                opacity: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <img
                  src={stepIcons[idx]}
                  alt={`Step ${idx + 1} Icon`}
                  style={{ width: 28, height: 28, objectFit: "contain" }}
                />
                <span
                  style={{ fontWeight: 600, fontSize: 16, color: "#666" }}
                >{`Step ${idx + 1}`}</span>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 0,
                  textAlign: "left",
                }}
              >
                {
                  [
                    "Open any AI Platform",
                    "Enter your prompt",
                    "Enhance in One Click",
                  ][idx]
                }
              </div>
            </div>
          ))}
        </div>
        {/* Step Images Row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 40,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              style={{
                background: "#fff",
                border: "2px solid #222",
                borderRadius: 16,
                width: 478,
                height: 280,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                overflow: "hidden",
                animation: `fadeIn 0.8s ease-out ${1.2 + idx * 0.2}s forwards`,
                opacity: 0,
              }}
            >
              <img
                src={stepImages[idx]}
                alt={`Step ${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
