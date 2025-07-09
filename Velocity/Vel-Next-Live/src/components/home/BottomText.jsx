import React from "react";

const BottomText = () => {
  return (
    <div
      style={{
        height: "530px",
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
      <div className="max-w-6xl text-center px-4">
        <div
          className="font-dm-sans text-[#152A32] text-3xl md:text-4xl lg:text-5xl leading-normal md:leading-relaxed"
          style={{
            fontWeight: "700",
            marginBottom: "10px",
            whiteSpace: "pre-line",
            letterSpacing: "0.02em",
            lineHeight: "1.5",
          }}
        >
          "WE AIM TO SPEED UP ADOPTION EVOLUTION OF AI" "BY MAKING AI ACCESSIBLE
          AND INCLUSIVE FOR EVERYONE" "WITHOUT ANY EXPERTISE."
        </div>
      </div>
    </div>
  );
};

export default BottomText;
