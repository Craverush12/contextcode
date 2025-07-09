import React from "react";

const Marque = () => {
  return (
    <div className="w-full overflow-hidden bg-white">
      <div
        className="animate-marquee whitespace-nowrap"
        style={{
          background: "url(https://thinkvelocity.in/next-assets/Marque.png)",
          backgroundRepeat: "repeat-x",
          height: "74px",
          width: "400%",
          animation: "marquee 40s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }

        @media (max-width: 768px) {
          .animate-marquee {
            height: 40px !important;
            background-size: auto 40px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Marque;
