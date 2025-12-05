import { useCallback, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from '../infrastructure/audio';

export const useSound = (enabled: boolean) => {
  const playerRef = useRef<AudioPlayer | null>(null);

  const playClick = useCallback(() => {
    if (!enabled) return;

    if (!playerRef.current) {
      playerRef.current = createAudioPlayer();
    }

    playerRef.current.playClick();
  }, [enabled]);

  return { playClick };
};
