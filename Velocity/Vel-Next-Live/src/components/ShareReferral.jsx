import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import Analytics from '../config/analytics';


const ShareReferral = ({ userId, authToken }) => {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateAndShareReferral = async () => {
    try {
      // Track analytics event
      Analytics.track('Button Clicked', {
        buttonName: "Share",
      });
      
      // Generate referral code on demand when share button is clicked
      const response = await fetch('https://thinkvelocity.in/backend-V1-D/generate-referral-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      const generatedCode = data.referralCode;
      setReferralCode(generatedCode);
      
      // Share the generated referral code
      if (navigator.share) {
        await navigator.share({
          title: 'Join Velocity AI',
          text: `Join Velocity AI using my referral code: ${generatedCode}`,
          url: `https://thinkvelocity.in/register?ref=${generatedCode}`,
        });
      } else {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error generating or sharing referral code:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        `Join Velocity AI using my referral code: ${referralCode}\nhttps://thinkvelocity.in/register?ref=${referralCode}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <>
      <button
        onClick={generateAndShareReferral}
        className="bg-[#00D2FF] text-black font-semibold px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
        style={{
          border: '2px solid #000000',
          boxShadow: '2px 2px 0px #000000',
          borderRadius: '10px',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translate(2px, 2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
            e.currentTarget.style.transform = 'translate(0, 0)';
          }}
      >
        <span>Refer a friend</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-4 w-full max-w-md border border-[#333333]">
            <h3 className="text-lg text-white mb-2 text-center">Share Your Referral Code</h3>

            <div className="bg-black/30 p-2 rounded-xl flex justify-between items-center mb-4">
              <span className="text-white font-mono">{referralCode}</span>
              <button
                onClick={copyToClipboard}
               
          style={{
            border: '2px solid #000000',
                }}
                  
                className="hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none text-[#0084CC] hover:text-[#0095e8] transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-black/30 text-white font-medium py-2 rounded-xl hover:bg-black/40 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareReferral;