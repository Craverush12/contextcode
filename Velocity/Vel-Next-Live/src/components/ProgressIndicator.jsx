import React from 'react';
import PropTypes from 'prop-types';

const GaugeMeter = ({ 
  value = 1, 
  maxValue = 10, 
  label = "Example", 
  backgroundColor = "transparent"
}) => {
  // Calculate how many dashes should be active based on value/maxValue
  const numberOfDashes = 24; // Total number of dashes
  const activeDashes = Math.round((value / maxValue) * numberOfDashes);
  
  // Function to determine the color based on the value
  const getValueColor = (val) => {
    if (val <= 3) return '#EF4444'; // Red for low values
    if (val <= 7) return '#EAB308'; // Yellow for medium values
    return '#22C55E'; // Green for high values
  };

  // Function to generate the dashes dynamically based on SVG size
  const generateDashes = (size) => {
    const dashes = [];
    const radius = size / 2 - 6; // Adjust radius relative to SVG size (留出空間)
    const innerRadius = radius - 4; // Length of dash

    for (let i = 0; i < numberOfDashes; i++) {
      // Calculate position on the semi-circle (from 0 to π)
      const angle = (Math.PI * (numberOfDashes - 1 - i)) / (numberOfDashes - 1); // Reverse the angle
      const center = size / 2;

      // Calculate start and end positions
      const x1 = center + innerRadius * Math.cos(angle);
      const y1 = center - innerRadius * Math.sin(angle);
      const x2 = center + radius * Math.cos(angle);
      const y2 = center - radius * Math.sin(angle);

      // Determine if this dash should be active
      const isActive = i < activeDashes;

      dashes.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isActive ? getValueColor(value) : "#d1d5db"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    }
    return dashes;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 104 104"
        className="w-full h-auto max-w-[7rem] sm:max-w-[8rem] md:max-w-[9rem]" // Responsive max-width
        preserveAspectRatio="xMidYMid meet" // Maintain aspect ratio
      >
        {/* Optional background circle */}
        {backgroundColor !== "transparent" && (
          <circle cx="52" cy="52" r="50" fill={backgroundColor} />
        )}

        {/* Render dashes dynamically */}
        {generateDashes(104)} {/* Pass the base viewBox size */}

        {/* Value text */}
        <text
          x="52"
          y="60"
          fontFamily="Amenti"
          fontSize="clamp(20px, 4vw, 32px)" // Scale font size responsively
          fontWeight="700"
          fill={getValueColor(value)}
          textAnchor="middle"
        >
          {value}
        </text>

        {/* Label text */}
        <text
          x="52"
          y="85"
          fontFamily="sans-serif"
          fontSize="clamp(18px, 2.5vw, 14px)" // Scale label font size
          fontWeight="500"
          fill="white"
          textAnchor="middle"
        >
          {label}
        </text>
      </svg>
    </div>
  );
};

// PropTypes validation
GaugeMeter.propTypes = {
  value: PropTypes.number,
  maxValue: PropTypes.number,
  label: PropTypes.string,
  backgroundColor: PropTypes.string,
};

export default GaugeMeter;