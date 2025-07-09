import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TrialSignup = () => {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleImprovePrompt = () => {
    if (!prompt) {
      alert('Please enter a prompt first.');
      return;
    }

    // Example improvement logic
    const enhancedPrompt = `Enhanced: ${prompt.toUpperCase()}`;
    const suggestedPlatform = 'Chatgpt';
    const reasoning = "This platform is best suited for your input.";
    const suggestions = "Try refining your query for more precise results.";
    const analysis = [
      "Your original prompt was broad.",
      "Enhancing it made it more specific.",
      "You can further refine it based on feedback."
    ];

    // Redirect to ResponsePage with improved data
    navigate('/response', {
      state: {
        userPrompt: prompt,
        enhancedPrompt,
        suggestedPlatform,
        reasoning,
        suggestions,
        analysis,
      },
    });
  };

  return (
    <div className="min-h-screen flex p-8">
      <div className="w-1/2 p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Trial Signup</h1>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full p-3 border rounded-md mb-4"
          rows="4"
        />
        <button
          onClick={handleImprovePrompt}
          className="w-full py-2 text-white bg-blue-500 rounded-md"
        >
          Improve Prompt
        </button>
      </div>
    </div>
  );
};

export default TrialSignup;
