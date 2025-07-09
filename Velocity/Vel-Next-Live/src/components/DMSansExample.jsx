import React from "react";

const DMSansExample = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl mb-6 font-bold" style={{ fontFamily: "DM Sans" }}>
        DM Sans Font Example
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Using inline style */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl mb-3" style={{ fontFamily: "DM Sans" }}>
            Using inline style
          </h2>
          <p style={{ fontFamily: "DM Sans", fontWeight: 400 }}>
            This text uses DM Sans with normal weight (400)
          </p>
          <p style={{ fontFamily: "DM Sans", fontWeight: 500 }}>
            This text uses DM Sans with medium weight (500)
          </p>
          <p style={{ fontFamily: "DM Sans", fontWeight: 700 }}>
            This text uses DM Sans with bold weight (700)
          </p>
        </div>

        {/* Using Tailwind classes */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl mb-3 font-dm-sans">
            Using Tailwind font-dm-sans class
          </h2>
          <p className="font-dm-sans font-normal">
            This text uses the DM Sans font family defined in Tailwind
          </p>
          <p className="font-dm-sans font-medium">
            This text uses the DM Sans font with medium weight
          </p>
          <p className="font-dm-sans font-bold">
            This text uses the DM Sans font with bold weight
          </p>
        </div>
      </div>

      {/* Variable font weight demonstration */}
      <div className="mt-8 p-4 border rounded-lg">
        <h2 className="text-xl mb-3" style={{ fontFamily: "DM Sans" }}>
          Variable Font Weight Demo
        </h2>
        <div className="space-y-2">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
            <p
              key={weight}
              style={{ fontFamily: "DM Sans", fontWeight: weight }}
            >
              DM Sans with font-weight: {weight}
            </p>
          ))}
        </div>
      </div>

      {/* CSS Utility Classes */}
      <div className="mt-8 p-4 border rounded-lg">
        <h2 className="text-xl mb-3 font-dm-sans">Using CSS Utility Classes</h2>
        <p className="font-dm-sans">
          Default DM Sans (using font-dm-sans class)
        </p>
        <p className="font-dm-sans-light">
          Light DM Sans (using font-dm-sans-light class)
        </p>
        <p className="font-dm-sans-regular">
          Regular DM Sans (using font-dm-sans-regular class)
        </p>
        <p className="font-dm-sans-medium">
          Medium DM Sans (using font-dm-sans-medium class)
        </p>
        <p className="font-dm-sans-bold">
          Bold DM Sans (using font-dm-sans-bold class)
        </p>
      </div>
    </div>
  );
};

export default DMSansExample;
