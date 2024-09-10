'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import '@/styles/Hero.css';
import Link from 'next/link';

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
            <span className="neon-text">AEITH ON-CHAIN MURDER MYSTERY GAME</span>
          </h1>
          <h2 className="hero-subtitle">Galadriel-Powered AI Agents</h2>
          <p className="hero-description">
            Step into a turn-based murder mystery set in a haunted mansion. Play as Blue Fish, Orange Crab, Green Turtle, or Red Donkey, each with unique abilities and objectives. Use chat-based commands and movement inputs to solve the mystery or hide the truth. Powered by Galadriel’s on-chain AI and managed by the Game Master through the Gemini API.
          </p>
          <div className="button-group">
          <Link href="/game">
  <button className="btn btn-primary neon-btn">Play Now</button>
</Link>

            <button className="btn btn-secondary">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;