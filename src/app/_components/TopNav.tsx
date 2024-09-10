// src/app/_components/TopNav.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWeb3Auth } from "@/context/Web3AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

const AeithLogo: React.FC = () => (
  <Link href="/" className="flex items-center">
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
  </Link>
);

const TopNav: React.FC = () => {
  const { user, login, logout, isLoading } = useWeb3Auth();

  useEffect(() => {
    console.log("TopNav component rendered", { user, isLoading });
  }, [user, isLoading]);

  const handleConnect = async () => {
    console.log("Attempting login...");
    try {
      await login();
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 p-5 flex justify-between items-center z-50 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg border-b border-cyan-500 border-opacity-30">
      <AeithLogo />
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="neon-btn">
              Pages
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border border-cyan-500">
            <DropdownMenuLabel className="text-cyan-400">Navigation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/" className="w-full text-cyan-400 hover:text-white">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/chat" className="w-full text-cyan-400 hover:text-white">Chat</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/game" className="w-full text-cyan-400 hover:text-white">Game</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/dashboard" className="w-full text-cyan-400 hover:text-white">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/group-chat" className="w-full text-cyan-400 hover:text-white">Group</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="neon-btn">
                {(user.email as string) || 'User'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border border-cyan-500">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-cyan-400 hover:bg-cyan-900 hover:text-white"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="neon-btn login-btn"
          >
            {isLoading ? "Connecting..." : "Connect"}
          </Button>
        )}
      </div>
    </nav>
  );
};

export default TopNav;