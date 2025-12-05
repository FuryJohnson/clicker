import { useState, useRef, useEffect, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { Box, Typography, ButtonBase } from '@mui/material';
import { useSettings } from '../../hooks/useSettings';
import { useSound } from '../../hooks/useSound';

interface ClickButtonProps {
  clicks: number;
  onClick: () => void;
}

interface FloatingNumber {
  id: number;
  left: number;
  top: number;
}

const MAX_FLOATING_NUMBERS = 10;
const BUTTON_ARIA_LABEL = 'Click to earn points';
const PRESSED_CLASS = 'pressed';

const floatUp = keyframes`
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -120px) scale(1.5);
  }
`;

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
  position: 'relative',
});

const ClicksDisplay = styled(Typography)(({ theme }) => ({
  fontSize: 56,
  fontWeight: 700,
  color: theme.palette.text.primary,
  textShadow: '0 0 30px rgba(0, 152, 234, 0.4)',
}));

const Button = styled(ButtonBase)(({ theme }) => ({
  'width': 200,
  'height': 200,
  'borderRadius': '50%',
  'background': 'transparent',
  'boxShadow': `
    0 0 40px rgba(0, 152, 234, 0.3),
    0 0 80px rgba(0, 152, 234, 0.15)
  `,
  'transition': 'transform 0.1s ease, box-shadow 0.1s ease',
  'display': 'flex',
  'alignItems': 'center',
  'justifyContent': 'center',
  'userSelect': 'none',
  'WebkitTapHighlightColor': 'transparent',
  'overflow': 'hidden',
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: `
      0 0 50px rgba(0, 152, 234, 0.4),
      0 0 100px rgba(0, 152, 234, 0.2)
    `,
  },
  '&:active, &.pressed': {
    transform: 'scale(0.95)',
    boxShadow: `
      0 0 30px rgba(0, 152, 234, 0.2),
      0 0 60px rgba(0, 152, 234, 0.1)
    `,
  },
  '&:focus-visible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: 4,
  },
}));

const CoinImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '50%',
  pointerEvents: 'none',
});

const FloatingNum = styled('span')(({ theme }) => ({
  position: 'absolute',
  fontSize: 28,
  fontWeight: 700,
  color: theme.palette.primary.main,
  textShadow: '0 0 15px rgba(0, 152, 234, 0.8)',
  pointerEvents: 'none',
  animation: `${floatUp} 0.8s ease-out forwards`,
}));

export const ClickButton = ({ clicks, onClick }: ClickButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const { settings } = useSettings();
  const { playClick } = useSound(settings.soundEnabled);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const idCounterRef = useRef(0);

  useEffect(() => {
    const floatTimers = floatTimersRef.current;
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      floatTimers.forEach((timer) => clearTimeout(timer));
      floatTimers.clear();
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
    pressTimerRef.current = setTimeout(() => {
      setIsPressed(false);
      pressTimerRef.current = null;
    }, 100);

    const rect = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - rect.left;
    const top = e.clientY - rect.top;

    const id = ++idCounterRef.current;

    setFloatingNumbers((prev) => {
      const next = [...prev, { id, left, top }];
      return next.length > MAX_FLOATING_NUMBERS ? next.slice(-MAX_FLOATING_NUMBERS) : next;
    });

    const floatTimer = setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== id));
      floatTimersRef.current.delete(floatTimer);
    }, 800);

    floatTimersRef.current.add(floatTimer);

    playClick();
    onClick();
  }, [playClick, onClick]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playClick();
      onClick();
    }
  };

  return (
    
    <Container>
      <ClicksDisplay>{clicks.toLocaleString()}</ClicksDisplay>
      <Button
        className={isPressed ? PRESSED_CLASS : ''}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={BUTTON_ARIA_LABEL}
        tabIndex={0}
      >
        <CoinImage src="/coin.jpg" alt="Coin" draggable={false} />
      </Button>
      {floatingNumbers.map(({ id, left, top }) => (
        <FloatingNum key={id} style={{ left, top }}>
          +1
        </FloatingNum>
      ))}
    </Container>
  );
};
