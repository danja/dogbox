import { eventBus, events } from '../events.js';

export class LFGlottalSource {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.rd = 0.8; // Return phase duration (0-1)
        this.jitter = 0.0; // Pitch jitter (0-1)
        this.shimmer = 0.0; // Amplitude shimmer (0-1)
        this.f0 = 220; // Fundamental frequency in Hz
        
        // Create audio nodes
        this.osc = audioContext.createOscillator();
        this.osc.type = 'sine';
        this.osc.frequency.value = this.f0;
        
        // Create gain for amplitude control
        this.gain = audioContext.createGain();
        this.gain.gain.value = 0;
        
        // Connect nodes
        this.osc.connect(this.gain);
        
        // Start oscillator
        this.osc.start();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            switch (param) {
                case 'pitch':
                    this.setFrequency(value);
                    break;
                case 'jitter':
                    this.jitter = value;
                    break;
                case 'shimmer':
                    this.shimmer = value;
                    break;
            }
        });
        
        eventBus.on(events.NOTE_ON, ({ frequency, velocity }) => {
            this.noteOn(0, velocity, frequency);
        });
        
        eventBus.on(events.NOTE_OFF, () => {
            this.noteOff();
        });
    }
    
    setFrequency(f0) {
        this.f0 = f0;
        this.osc.frequency.setValueAtTime(
            f0 * (1 + (Math.random() * 2 - 1) * this.jitter), 
            this.audioContext.currentTime
        );
    }
    
    connect(destination) {
        this.gain.connect(destination);
    }
    
    disconnect() {
        this.gain.disconnect();
    }
    
    noteOn(time = 0, velocity = 1.0, frequency) {
        if (frequency) {
            this.setFrequency(frequency);
        }
        
        const now = this.audioContext.currentTime;
        const gain = this.gain.gain;
        
        // Apply shimmer to amplitude
        const shimmerFactor = 1 + (Math.random() * 2 - 1) * this.shimmer;
        const amp = Math.min(1, velocity * shimmerFactor);
        
        // Quick attack
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0, now);
        gain.linearRampToValueAtTime(amp, now + 0.01);
    }
    
    noteOff(time = 0) {
        const now = this.audioContext.currentTime;
        const gain = this.gain.gain;
        
        // Quick release
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(0, now + 0.1);
    }
}
