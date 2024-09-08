  // src/app/_components/TopNav.tsx

  'use client'; // Indicates that this component is client-side rendered.

  import React, { useEffect } from 'react';
  import Image from 'next/image';
  import { useWeb3Auth } from "@/context/Web3AuthContext"; // Custom hook to handle Web3Auth authentication.
  import { Button } from "@/components/ui/button"; // UI button component from your project.
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"; // UI components for dropdown functionality.

  // AeithLogo component renders the logo image and text for the app.
  const AeithLogo: React.FC = () => {
    console.log("AeithLogo component rendered");

    return (
      <div className="flex items-center">
        {/* Logo image with the Aeith branding */}
        <Image
          src="/svgs/aeith-logo.svg"
          alt="Aeith Logo"
          width={32}
          height={32}
          className="object-contain mr-2"
        />
        {/* Application title */}
        <span className="text-3xl font-bold neon-text">
          Aeith
        </span>
      </div>
    );
  };

  // TopNav component renders the navigation bar at the top of the page.
  // It handles login/logout actions depending on the authentication state.
  const TopNav: React.FC = () => {
    const { user, login, logout, isLoading } = useWeb3Auth(); // Destructuring the Web3Auth context.

    useEffect(() => {
      console.log("TopNav component rendered");
      console.log("User:", user);
      console.log("IsLoading:", isLoading);
    }, [user, isLoading]); // Logs the user and loading state when they change.

    // Handles the user connection process.
    const handleConnect = async () => {
      console.log("handleConnect called");
      try {
        console.log("Attempting login...");
        await login(); // Initiates the login process.
        console.log("Login successful");
      } catch (error) {
        console.error("Login error:", error);
      }
    };

    // Logs the user out by calling the logout function from Web3Auth.
    const handleLogout = () => {
      console.log("Logout clicked");
      logout();
    };

    return (
      <nav className="fixed top-0 left-0 right-0 p-5 flex justify-between items-center z-50 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg border-b border-cyan-500 border-opacity-30">
        <AeithLogo />
        {/* If the user is authenticated, show a dropdown menu with a logout option */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="neon-btn">
                {/* Log messages should be moved outside JSX to avoid the void issue */}
                {(user.email as string) || 'User'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border border-cyan-500">
              <DropdownMenuItem
                onClick={handleLogout} // Calls the handleLogout function.
                className="text-cyan-400 hover:bg-cyan-900 hover:text-white"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // If the user is not authenticated, show a button to connect (login)
          <Button
            onClick={handleConnect} // Calls the handleConnect function to log in the user.
            disabled={isLoading} // Disables the button while login is in progress.
            className="neon-btn login-btn"
          >
            {isLoading ? "Connecting..." : "Connect"} {/* Changes button text based on loading state */}
          </Button>
        )}
      </nav>
    );
  };

  export default TopNav;