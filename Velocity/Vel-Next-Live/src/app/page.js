'use client';

import { useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Home from '@/components/home';
import HowItWorks from '@/components/home/HowItWorks';
import Marque from '@/components/layout/Marque';
import Remarks from '@/components/home/Remarks';
import BuiltFor from '@/components/home/BuiltFor';
import ReleaseNotes from '@/components/home/ReleaseNotes';
import TokenPricing from '@/components/home/TokenPricing';
import Carousel from '@/components/home/Carousel';
import GetExtension from '@/components/home/GetExtension';
import Footer from '@/components/layout/Footer';
import Problem from '@/components/home/Problem';
import BottomText from '@/components/home/BottomText';
import Blog_Comp from '@/components/Blogs/Blog_Comp';

export default function HomePage() {
  // Define refs for scrolling
  const howItWorksRef = useRef(null);
  const homeRef = useRef(null);
  const releaseNotesRef = useRef(null);
  const builtRef = useRef(null);
  const promptBoxRef = useRef(null);
  const tokenPricingRef = useRef(null);
  const remarksRef = useRef(null);
  const carouselRef = useRef(null);
  const getExtensionRef = useRef(null);
  
  // Add scroll functions
  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <main className="scrollable-container">
      <Navbar
        howItWorksRef={howItWorksRef}
        homeRef={homeRef}
        releaseNotesRef={releaseNotesRef}
        builtRef={builtRef}
        promptBoxRef={promptBoxRef}
        tokenPricingRef={tokenPricingRef}
        remarksRef={remarksRef}
        carouselRef={carouselRef}
        getExtensionRef={getExtensionRef}
        scrollToSection={scrollToSection}
      />
      <div ref={homeRef} className="section">
        <Home />
      </div>
      <div className="section">
        <Marque />
        </div>
       <div ref={promptBoxRef} className="section">

        <Problem />
      </div>
      <div ref={howItWorksRef} className="section">
        <HowItWorks />
      </div>
       {/* <div className="section">
        <BottomText />
      </div> */}
      <div ref={builtRef} className="section">
        <Blog_Comp />
      </div>
      {/* <div ref={builtRef} className="section">
        <BuiltFor />
      </div> */}
      {/* <div ref={tokenPricingRef} className="section">
        <TokenPricing />
      </div> */}
      <div ref={remarksRef} className="section">
        <Remarks />
      </div>
      {/* <div ref={releaseNotesRef} className="section">
        <ReleaseNotes />
      </div> */}
      <div ref={carouselRef} className="section">
        <Carousel />
      </div>
     
      <div ref={getExtensionRef} className="section">
        <GetExtension />
      </div>
      <Footer />
    </main>
  );
}