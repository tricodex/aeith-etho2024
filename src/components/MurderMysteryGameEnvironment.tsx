// src/components/MurderMysteryGameEnvironment.tsx

'use client';

import React, { useState, useCallback } from 'react';
import MurderMysteryGame from './MurderMysteryGame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from '@/styles/MurderMystery.module.css';

const MurderMysteryGameEnvironment: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<string>('Entrance Hall');
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  const handleRoomChange = useCallback((newRoom: string) => {
    setCurrentRoom(newRoom);
  }, []);

  const startGame = () => {
    setGameStarted(true);
  };

  return (
    <div className={styles.gameEnvironmentContainer}>
      {!gameStarted ? (
        <Card className={styles.initializationContainer}>
          <CardHeader>
            <CardTitle className={styles.gameTitle}>Murder Mystery in the Haunted Mansion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.gameDescription}>
              Step into the Haunted Mansion and solve the murder mystery. Will you
              uncover the truth, or will the culprit remain hidden?
            </p>
            <Button
              onClick={startGame}
              className={styles.startButton}
            >
              Start Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.gameContainer}>
          <Card className={styles.gameHeader}>
            <CardHeader>
              <CardTitle>Current Room: {currentRoom}</CardTitle>
            </CardHeader>
          </Card>
          <MurderMysteryGame onRoomChange={handleRoomChange} />
        </div>
      )}
    </div>
  );
};

export default MurderMysteryGameEnvironment;