'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import '@/styles/Hero.css';

const Cube: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="cube"
    style={{
      '--index': index,
      '--delay': `${index * 0.5}s`,
    } as React.CSSProperties}
  >
    {['front', 'back', 'right', 'left', 'top', 'bottom'].map((face) => (
      <div key={face} className={`cube-face ${face}`}>
        {(face === 'front' || face === 'back') && (
          <Image
            src="/svgs/aeith-logo.svg"
            alt="Aeith Logo"
            width={50}
            height={50}
            className="w-full h-full object-contain opacity-80"
          />
        )}
      </div>
    ))}
  </div>
);

const HeroSection: React.FC = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createParticles = () => {
      const container = particlesRef.current;
      if (!container) return;

      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        container.appendChild(particle);
      }
    };

    createParticles();
  }, []);

  return (
    <div className="hero-container">
      <div className="cyber-grid"></div>
      <div ref={particlesRef} className="particles-container"></div>
      <div className="floating-cubes">
        {Array.from({ length: 5 }).map((_, index) => (
          <Cube key={index} index={index} />
        ))}
      </div>
      <div className="content-wrapper">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="neon-text">AEITH ON-CHAIN GALADRIEL AI</span>
          </h1>
          <h2 className="hero-subtitle">AGENTS, AGENTS, AGENTS</h2>
          <p className="hero-description">
            Empowering the future with cutting-edge on-chain AI and agentive frameworks.
            Build, deploy, and innovate in the decentralized world of tomorrow.
          </p>
          <div className="button-group">
            <button className="btn btn-primary neon-btn">Login</button>
            <button className="btn btn-secondary">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;