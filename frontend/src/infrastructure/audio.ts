export interface AudioPlayer {
  playClick: () => void;
}

const createClickBuffer = (ctx: AudioContext): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const duration = 0.08;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const frequency = 800 * Math.exp(-t * 30);
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 25) * 0.3;
  }

  return buffer;
};

export const createAudioPlayer = (): AudioPlayer => {
  let ctx: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let lastPlayTime = 0;
  const MIN_INTERVAL_MS = 30;

  return {
    playClick() {
      try {
        const now = performance.now();
        if (now - lastPlayTime < MIN_INTERVAL_MS) {
          return;
        }
        lastPlayTime = now;

        if (!ctx) {
          ctx = new AudioContext();
          buffer = createClickBuffer(ctx);
        }

        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => {
            source.disconnect();
          };
          source.start();
        }
      } catch {
        alert('Audio not supported');
      }
    },
  };
};

