'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3Auth } from './Web3AuthProvider';
import { ethers } from 'ethers';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const WalletInfo: React.FC = () => {
  const { provider, user } = useWeb3Auth();
  const [balance, setBalance] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    const getAccountInfo = async () => {
      if (provider) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            const userAddress = accounts[0];
            setAddress(userAddress);

            const balance = await provider.request({
              method: 'eth_getBalance',
              params: [userAddress, 'latest'],
            }) as string;

            setBalance(ethers.formatEther(balance));
          }
        } catch (error) {
          console.error("Error fetching account info:", error);
        }
      }
    };

    getAccountInfo();
  }, [provider]);

  const handleSendTransaction = async () => {
    if (provider && address) {
      try {
        const tx = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            to: "0x...", // Replace with recipient address
            from: address,
            value: ethers.parseEther("0.001").toString(16),
            gas: '0x5208', // 21000 gas
          }],
        });
        console.log("Transaction sent:", tx);
      } catch (error) {
        console.error("Error sending transaction:", error);
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Info</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Address: {address}</p>
        <p>Balance: {balance} ETH</p>
        <Button onClick={handleSendTransaction}>Send Transaction</Button>
      </CardContent>
    </Card>
  );
};

export default WalletInfo;