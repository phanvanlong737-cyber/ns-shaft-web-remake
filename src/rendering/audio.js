const melodies = [64, 67, 71, 67, 62, 66, 69, 66, 60, 64, 67, 64, 62, 66, 69, 71];
const noteFrequency = midi => 440 * 2 ** ((midi - 69) / 12);

export class AudioSystem {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.nodes = new Set();
    this.beat = 0;
    this.nextBeat = 0;
    this.musicPlaying = false;
  }

  async unlock() {
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.music = this.context.createGain(); this.sfx = this.context.createGain();
        this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(this.context.destination);
        this.setSettings(this.settings);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio is optional: browser restrictions must not interrupt play. */ }
  }

  setSettings(settings) {
    this.settings = settings;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.mute ? 0 : settings.masterVolume, now, 0.03);
    this.music.gain.setTargetAtTime(settings.musicVolume * 0.17, now, 0.03);
    this.sfx.gain.setTargetAtTime(settings.sfxVolume * 0.25, now, 0.03);
  }

  tone(frequency, when, duration, bus, waveform = 'sine', endFrequency) {
    if (!this.context || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, when);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.exponentialRampToValueAtTime(0.65, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(gain); gain.connect(bus);
    this.nodes.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(oscillator); };
    oscillator.start(when); oscillator.stop(when + duration + 0.02);
  }

  stopMusic() {
    for (const node of this.nodes) {
      try { node.stop(); } catch { /* Already ended. */ }
    }
    this.musicPlaying = false;
  }

  update(state) {
    if (!this.context || this.context.state !== 'running') return;
    if (state !== 'playing') {
      if (this.musicPlaying) this.stopMusic();
      return;
    }
    const now = this.context.currentTime;
    if (!this.musicPlaying) { this.musicPlaying = true; this.nextBeat = now; }
    // Schedule only 80ms ahead so pausing immediately silences scheduled music.
    while (this.nextBeat < now + 0.08) {
      this.tone(noteFrequency(melodies[this.beat % melodies.length]), this.nextBeat, 0.25, this.music, 'sine');
      if (this.beat % 4 === 0) this.tone(noteFrequency(melodies[this.beat % melodies.length] - 24), this.nextBeat, 0.6, this.music, 'triangle');
      this.beat++; this.nextBeat += 0.4;
    }
  }

  playSfx(type) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const cues = {
      ui_click: [480, 0.07, 'sine', 650], land: [240, 0.08, 'sine', 170],
      hurt: [160, 0.18, 'triangle', 60], heal: [660, 0.15, 'sine', 880],
      spring: [230, 0.2, 'triangle', 900], fake_crack: [110, 0.08, 'triangle', 90],
      fake_break: [100, 0.2, 'triangle', 35], game_over: [260, 0.45, 'triangle', 65],
    };
    if (type === 'challenge_complete' || type === 'new_record') {
      for (const [i, note] of [72, 76, 79, 84].entries()) this.tone(noteFrequency(note), now + i * 0.1, 0.25, this.sfx);
    } else if (cues[type]) {
      const [frequency, duration, waveform, end] = cues[type];
      this.tone(frequency, now, duration, this.sfx, waveform, end);
    }
  }
}
