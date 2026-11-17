const sounds = {
  hover: [440, 0.025, 0.04],
  click: [660, 0.04, 0.06],
  whoosh: [220, 0.18, 0.035],
  chime: [880, 0.22, 0.06],
};

export function createSoundManager() {
  let enabled = true;
  let context;
  const play = (name) => {
    if (!enabled) return;
    context ||= new AudioContext();
    const [frequency, duration, volume] = sounds[name] || sounds.click;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  };
  return {
    play,
    setEnabled(value) {
      enabled = value;
      if (enabled && context?.state === 'suspended') context.resume();
    },
  };
}
