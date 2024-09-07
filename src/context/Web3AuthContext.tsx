// src/context/Web3AuthContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK } from "@web3auth/mpc-core-kit";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { CHAIN_NAMESPACES, CustomChainConfig } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { makeEthereumSigner } from "@web3auth/mpc-core-kit";

interface UserInfo {
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
  verifierId?: string;
}

interface Web3AuthContextType {
  web3auth: Web3AuthMPCCoreKit | null;
  provider: EthereumSigningProvider | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  user: UserInfo | null;
}

const Web3AuthContext = createContext<Web3AuthContextType>({
  web3auth: null,
  provider: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  user: null,
});

export const useWeb3Auth = () => useContext(Web3AuthContext);

// Galadriel chain configuration
const chainConfig: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "696969", // Galadriel Devnet chain ID
  rpcTarget: process.env.NEXT_PUBLIC_GALADRIEL_RPC_URL || "https://devnet.galadriel.com",
  displayName: "Galadriel",
  blockExplorerUrl: "https://explorer.galadriel.com",
  ticker: "GAL",
  tickerName: "Galadriel",
};

export const Web3AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [web3auth, setWeb3auth] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<EthereumSigningProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize the Web3Auth instance
        const web3authInstance = new Web3AuthMPCCoreKit({
          web3AuthClientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
          web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
          tssLib: tssLib,
          storage: window.localStorage, // Set up storage
          manualSync: true, // Recommended for sync
        });

        // Initialize the instance
        await web3authInstance.init();

        // Setup the signing provider for Galadriel
        const ethereumProvider = new EthereumSigningProvider({ config: { chainConfig } });
        await ethereumProvider.setupProvider(makeEthereumSigner(web3authInstance));

        setWeb3auth(web3authInstance);
        setProvider(ethereumProvider);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Login function using OAuth
  const login = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    try {
      await web3auth.loginWithOAuth({
        subVerifierDetails: {
          typeOfLogin: 'google',
          verifier: 'grandhard-firebase', // Use your Firebase verifier
          clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
        },
      });
      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  // Logout function
  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setUser(null);
  };

  return (
    <Web3AuthContext.Provider value={{ web3auth, provider, isLoading, login, logout, user }}>
      {children}
    </Web3AuthContext.Provider>
  );
};