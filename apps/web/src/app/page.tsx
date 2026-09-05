'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingPreviewMockup from '@/components/landing/LandingPreviewMockup';
import LandingFeaturesGrid from '@/components/landing/LandingFeaturesGrid';
import LandingWorkflowTabs from '@/components/landing/LandingWorkflowTabs';
import LandingStats from '@/components/landing/LandingStats';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingPreFooter from '@/components/landing/LandingPreFooter';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -60px 0px', // trigger slightly before entering fully
      }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    // Instant active trigger for hero so the first fold looks loaded immediately
    const firstFold = document.querySelector('.hero-fold');
    if (firstFold) {
      firstFold.classList.add('active');
    }

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <LandingHeader />
      
      {/* Hero first-fold loads instantly */}
      <div className="reveal-on-scroll hero-fold">
        <LandingHero />
      </div>

      <div className="reveal-on-scroll">
        <LandingPreviewMockup />
      </div>

      {/* Platform section tag */}
      <div id="platform" className="reveal-on-scroll">
        <LandingWorkflowTabs />
      </div>

      <div className="reveal-on-scroll">
        <LandingFeaturesGrid />
      </div>
      
      <div className="reveal-on-scroll">
        <LandingStats />
      </div>

      <div id="pricing" className="reveal-on-scroll">
        <LandingPricing />
      </div>

      <div id="faq" className="reveal-on-scroll">
        <LandingFAQ />
      </div>

      <div className="reveal-on-scroll">
        <LandingPreFooter />
      </div>

      <LandingFooter />
    </div>
  );
}
