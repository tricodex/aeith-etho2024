// src/context/Web3AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK } from "@web3auth/mpc-core-kit";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { CHAIN_NAMESPACES, CustomChainConfig } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { makeEthereumSigner } from "@web3auth/mpc-core-kit";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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
  chainId: "0xaa289", // Galadriel Devnet chain ID
  rpcTarget: process.env.NEXT_PUBLIC_GALADRIEL_RPC_URL || "https://devnet.galadriel.com",
  displayName: "Galadriel",
  blockExplorerUrl: "https://explorer.galadriel.com",
  ticker: "GAL",
  tickerName: "Galadriel",
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const Web3AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [web3auth, setWeb3auth] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<EthereumSigningProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Initializing Web3Auth...");
        const web3authInstance = new Web3AuthMPCCoreKit({
          web3AuthClientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
          web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET,
          tssLib: tssLib,
          storage: window.localStorage,
          manualSync: true,
        });

        await web3authInstance.init();
        console.log("Web3Auth initialized successfully");

        const ethereumProvider = new EthereumSigningProvider({ config: { chainConfig } });
        await ethereumProvider.setupProvider(makeEthereumSigner(web3authInstance));
        console.log("Ethereum provider set up successfully");

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

  const login = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    try {
      console.log("Attempting to login with Firebase...");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.idToken;

      if (token) {
        console.log("Firebase authentication successful, logging in with Web3Auth...");
        await web3auth.loginWithJWT({
          verifier: "grandhard-firebase", // Use the name you set in Web3Auth dashboard
          verifierId: result.user.email!,
          idToken: token,
        });
        console.log("Web3Auth login successful");
        const userInfo = await web3auth.getUserInfo();
        console.log("User info:", userInfo);
        setUser(userInfo);
      } else {
        console.error("No token received from Firebase");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    try {
      await web3auth.logout();
      await auth.signOut();
      setUser(null);
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <Web3AuthContext.Provider value={{ web3auth, provider, isLoading, login, logout, user }}>
      {children}
    </Web3AuthContext.Provider>
  );
};