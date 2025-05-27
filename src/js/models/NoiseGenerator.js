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
        this.filter.frequency.setValueAtTime(1000, audioContext.currentTime);
        this.filter.Q.value = 1.0; // Slightly higher Q for more pronounced effect
        
        // Set initial gain to 0 (will be controlled by note events)
        this.gain.gain.value = 0;
        
        // Connect nodes
        this.noise.connect(this.filter);
        this.filter.connect(this.gain);
        
        // Start noise source
        this.noise.start();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Only log parameter changes in development
        const debug = false;
        
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            if (debug) console.log(`NoiseGenerator: ${param} = ${value}`);
            
            try {
                const numValue = parseFloat(value);
                const now = this.audioContext.currentTime;
                
                switch (param) {
                    case 'breathiness':
                        this.gain.gain.cancelScheduledValues(now);
                        this.gain.gain.setValueAtTime(numValue, now);
                        break;
                    case 'noiseColor':
                        this.filter.frequency.cancelScheduledValues(now);
                        this.filter.frequency.setValueAtTime(numValue, now);
                        break;
                    case 'noiseQ':
                    case 'q':
                        this.filter.Q.cancelScheduledValues(now);
                        this.filter.Q.setValueAtTime(Math.max(0.1, numValue), now);
                        break;
                    case 'amp':
                    case 'gain':
                        this.gain.gain.cancelScheduledValues(now);
                        this.gain.gain.setValueAtTime(numValue, now);
                        break;
                }
            } catch (error) {
                if (debug) console.error(`Error handling ${param}:`, error);
            }
        });
        
        eventBus.on(events.NOTE_ON, (event = {}) => {
            const { velocity = 0.5, time } = event;
            this.noteOn(time, velocity);
        });
        
        eventBus.on(events.NOTE_OFF, (event = {}) => {
            const { time } = event;
            this.noteOff(time);
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
    
    noteOn(time = this.audioContext.currentTime, velocity = 0.5) {
        const now = this.audioContext.currentTime;
        const startTime = Math.max(now, time);
        const gain = this.gain.gain;
        
        // Schedule the note on
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0, now);
        
        if (startTime > now) {
            // If starting in the future, set a ramp
            gain.linearRampToValueAtTime(0, startTime);
            gain.linearRampToValueAtTime(velocity, startTime + 0.01);
        } else {
            // Start immediately
            gain.linearRampToValueAtTime(velocity, now + 0.01);
        }
    }
    
    noteOff(time = this.audioContext.currentTime) {
        const now = this.audioContext.currentTime;
        const releaseTime = Math.max(now, time);
        const gain = this.gain.gain;
        
        // Get current value at the release time
        const currentValue = gain.value;
        
        // Schedule the release
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(currentValue, now);
        
        if (releaseTime > now) {
            // If releasing in the future, schedule it
            gain.linearRampToValueAtTime(currentValue, releaseTime);
            gain.linearRampToValueAtTime(0, releaseTime + 0.1);
        } else {
            // Release immediately
            gain.linearRampToValueAtTime(0, now + 0.1);
        }
    }
    
    // For backward compatibility
    trigger(velocity = 0.5, duration = 1.0) {
        const now = this.audioContext.currentTime;
        this.noteOn(now, velocity);
        this.noteOff(now + duration);
    }
}
