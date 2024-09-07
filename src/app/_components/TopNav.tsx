'use client';

import React from 'react';
import Image from 'next/image';
import { useWeb3Auth } from "@/components/Web3AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AeithLogo: React.FC = () => (
  <div className="flex items-center">
    <Image
      src="/svgs/aeith-logo.svg"
      alt="Aeith Logo"
      width={32}
      height={32}
      className="object-contain mr-2"
    />
    <span className="text-3xl font-bold neon-text">
      Aeith
    </span>
  </div>
);

const TopNav: React.FC = () => {
  const { user, login, logout, isLoading } = useWeb3Auth();

  return (
    <nav className="fixed top-0 left-0 right-0 p-5 flex justify-between items-center z-50 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg border-b border-cyan-500 border-opacity-30">
      <AeithLogo />
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="neon-btn">
              {(user.email as string) || 'User'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border border-cyan-500">
            <DropdownMenuItem onClick={() => void logout()} className="text-cyan-400 hover:bg-cyan-900 hover:text-white">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={() => void login()}
          disabled={isLoading}
          className="neon-btn login-btn"
        >
          {isLoading ? "Connecting..." : "Connect"}
        </Button>
      )}
      <style jsx global>{`
        .neon-text {
          color: #00ffff;
          text-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 20px #00ffff;
        }
        
        .neon-btn {
          background: transparent;
          color: #00ffff;
          border: 2px solid #00ffff;
          padding: 0.5em 1em;
          font-size: 1rem;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
          text-shadow: 0 0 5px #00ffff;
          box-shadow: 0 0 5px #00ffff, 0 0 25px #00ffff;
        }

        .neon-btn:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 0 0 5px #00ffff, 0 0 25px #00ffff, 0 0 50px #00ffff;
        }

        .neon-btn:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(0, 255, 255, 0.4),
            transparent
          );
          transition: all 0.4s;
        }

        .neon-btn:hover:before {
          left: 100%;
        }

        .login-btn {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
        }
      `}</style>
    </nav>
  );
};

export default TopNav;