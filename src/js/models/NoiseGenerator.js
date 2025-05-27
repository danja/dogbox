import { eventBus, events } from '../events.js';

export class NoiseGenerator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.bufferSize = 4096;
        this.noiseBuffer = this.createNoiseBuffer();
        this.gain = audioContext.createGain();
        this.gain.gain.value = 0;
        
        // Create noise source
        this.noise = audioContext.createBufferSource();
        this.noise.buffer = this.noiseBuffer;
        this.noise.loop = true;
        
        // Create filter for noise color
        this.filter = audioContext.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.filter.frequency.value = 1000;
        this.filter.Q.value = 0.5;
        
        // Connect nodes
        this.noise.connect(this.filter);
        this.filter.connect(this.gain);
        
        // Start noise source
        this.noise.start();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            switch (param) {
                case 'breathiness':
                    this.setLevel(value);
                    break;
                case 'noiseColor':
                    this.setFrequency(value);
                    break;
            }
        });
        
        eventBus.on(events.NOTE_ON, ({ velocity }) => {
            this.trigger(velocity);
        });
    }
    
    createNoiseBuffer() {
        const buffer = this.audioContext.createBuffer(
            1, 
            this.bufferSize, 
            this.audioContext.sampleRate
        );
        
        const output = buffer.getChannelData(0);
        for (let i = 0; i < this.bufferSize; i++) {
            output[i] = Math.random() * 2 - 1; // White noise
        }
        
        return buffer;
    }
    
    setFrequency(freq) {
        this.filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
    
    setQ(q) {
        this.filter.Q.setValueAtTime(q, this.audioContext.currentTime);
    }
    
    setLevel(level) {
        this.gain.gain.setValueAtTime(level, this.audioContext.currentTime);
    }
    
    connect(destination) {
        this.gain.connect(destination);
    }
    
    disconnect() {
        this.gain.disconnect();
    }
    
    trigger(level = 0.5, duration = 1.0) {
        const now = this.audioContext.currentTime;
        const gain = this.gain.gain;
        
        // Quick attack
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0, now);
        gain.linearRampToValueAtTime(level, now + 0.01);
        
        // Release
        gain.linearRampToValueAtTime(0, now + duration);
    }
}
