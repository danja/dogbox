// Import all required classes
import { EnvelopeGenerator } from './EnvelopeGenerator.js';

// Export events and event bus
export * from './events.js';

// Export models
export * from './EnvelopeGenerator.js';
export * from './LFGlottalSource.js';
export * from './NoiseGenerator.js';
export * from './FormantFilterBank.js';
export * from './DogSynthesizer.js';

// Export controllers
export * from './UIController.js';

// ===========================================
// Envelope Generator Class
// ===========================================
class EnvelopeGenerator {
    constructor() {
        this.attack = 0.01;
        this.decay = 0.1;
        this.sustain = 0.5;
        this.release = 0.2;
    }
    
    setADSR(attack, decay, sustain, release) {
        this.attack = attack;
        this.decay = decay;
        this.sustain = sustain;
        this.release = release;
    }
    
    applyEnvelope(param, startValue, peakValue, sustainValue, startTime, duration) {
        const audioContext = param.context || new (window.AudioContext || window.webkitAudioContext)();
        
        // Set initial value
        param.setValueAtTime(startValue, startTime);
        
        // Attack
        const attackEnd = startTime + this.attack;
        param.linearRampToValueAtTime(peakValue, attackEnd);
        
        // Decay
        const decayEnd = attackEnd + this.decay;
        param.linearRampToValueAtTime(sustainValue, decayEnd);
        
        // Release
        const releaseStart = startTime + duration - this.release;
        param.linearRampToValueAtTime(sustainValue, releaseStart);
        param.linearRampToValueAtTime(0, startTime + duration);
    }
}

// ===========================================
// LF Glottal Source Class
// ===========================================
class LFGlottalSource {
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
    }
    
    // Set fundamental frequency
    setFrequency(f0) {
        this.f0 = f0;
        this.osc.frequency.setValueAtTime(f0, this.audioContext.currentTime);
    }
    
    // Generate a glottal pulse
    pulse(time) {
        const period = 1 / this.f0;
        const te = period * (1 - this.rd);
        const t = time % period;
        
        if (t < te) {
            // Open phase (exponential decay)
            return Math.exp(-3 * t / te);
        } else {
            // Return phase (parabolic)
            const tr = (t - te) / (period - te);
            return 1 - tr * tr;
        }
    }
    
    // Connect to destination
    connect(destination) {
        this.gain.connect(destination);
        return destination;
    }
    
    // Disconnect
    disconnect() {
        this.gain.disconnect();
    }
    
    // Trigger a note
    noteOn(time = 0, velocity = 1.0) {
        const now = this.audioContext.currentTime + time;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(0, now);
        this.gain.gain.linearRampToValueAtTime(velocity, now + 0.01);
    }
    
    // Release the note
    noteOff(time = 0) {
        const now = this.audioContext.currentTime + time;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(this.gain.gain.value, now);
        this.gain.gain.linearRampToValueAtTime(0, now + 0.1);
    }
}

// ===========================================
// Noise Generator Class
// ===========================================
class NoiseGenerator {
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
    }
    
    // Create a buffer with white noise
    createNoiseBuffer() {
        const buffer = this.audioContext.createBuffer(1, this.bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < this.bufferSize; i++) {
            // Generate white noise
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    // Set the center frequency of the noise
    setFrequency(freq) {
        this.filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
    
    // Set the Q (bandwidth) of the noise
    setQ(q) {
        this.filter.Q.setValueAtTime(q, this.audioContext.currentTime);
    }
    
    // Set the noise level (0-1)
    setLevel(level) {
        this.gain.gain.setTargetAtTime(level, this.audioContext.currentTime, 0.01);
    }
    
    // Connect to destination
    connect(destination) {
        this.gain.connect(destination);
        return destination;
    }
    
    // Disconnect
    disconnect() {
        this.gain.disconnect();
    }
    
    // Trigger the noise
    trigger(level = 0.5, duration = 1.0) {
        const now = this.audioContext.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(0, now);
        this.gain.gain.linearRampToValueAtTime(level, now + 0.01);
        this.gain.gain.linearRampToValueAtTime(0, now + duration);
    }
}

// ===========================================
// Formant Filter Bank Class
// ===========================================
class FormantFilterBank {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.filters = [];
        this.gains = [];
        this.mix = 0.5;
        
        // Create formant filters (F1-F4)
        for (let i = 0; i < 4; i++) {
            // Create bandpass filter for each formant
            const filter = audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 10;
            
            // Create gain for each formant
            const gain = audioContext.createGain();
            gain.gain.value = 0.25; // Default equal gain for all formants
            
            // Connect filter to gain
            filter.connect(gain);
            
            this.filters.push(filter);
            this.gains.push(gain);
        }
        
        // Set default formant frequencies (vowel "ah")
        this.setFormants(800, 1200, 2500, 3500);
    }
    
    // Set formant frequencies in Hz
    setFormants(f1, f2, f3, f4) {
        const now = this.audioContext.currentTime;
        
        // Set filter frequencies
        this.filters[0].frequency.setValueAtTime(f1, now);
        this.filters[1].frequency.setValueAtTime(f2, now);
        this.filters[2].frequency.setValueAtTime(f3, now);
        this.filters[3].frequency.setValueAtTime(f4, now);
    }
    
    // Set formant bandwidths in octaves
    setBandwidths(bw1, bw2, bw3, bw4) {
        const now = this.audioContext.currentTime;
        
        // Convert bandwidth in octaves to Q value
        const bwToQ = (bw) => Math.SQRT2 / (Math.pow(2, bw/2) - Math.pow(2, -bw/2));
        
        // Set filter Q values
        this.filters[0].Q.setValueAtTime(bwToQ(bw1), now);
        this.filters[1].Q.setValueAtTime(bwToQ(bw2), now);
        this.filters[2].Q.setValueAtTime(bwToQ(bw3), now);
        this.filters[3].Q.setValueAtTime(bwToQ(bw4), now);
    }
    
    // Set formant gains (0-1)
    setGains(g1, g2, g3, g4) {
        const now = this.audioContext.currentTime;
        
        // Set gain for each formant
        this.gains[0].gain.setValueAtTime(g1, now);
        this.gains[1].gain.setValueAtTime(g2, now);
        this.gains[2].gain.setValueAtTime(g3, now);
        this.gains[3].gain.setValueAtTime(g4, now);
    }
    
    // Set mix between dry and wet signal (0-1)
    setMix(level) {
        this.mix = Math.max(0, Math.min(1, level));
    }
    
    // Connect to destination
    connect(destination) {
        // Create dry/wet mixer
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        this.mixer = this.audioContext.createGain();
        
        // Set initial gains
        this.dryGain.gain.value = 1 - this.mix;
        this.wetGain.gain.value = this.mix;
        
        // Connect all formant gains to wet gain
        this.gains.forEach(gain => {
            gain.connect(this.wetGain);
        });
        
        // Connect dry and wet to mixer
        this.dryGain.connect(this.mixer);
        this.wetGain.connect(this.mixer);
        
        // Connect mixer to destination
        this.mixer.connect(destination);
        
        // Return the dry gain for input connection
        return this.dryGain;
    }
    
    // Connect input to the filter bank
    connectInput(source) {
        // Connect source to all filters (in parallel)
        this.filters.forEach(filter => {
            source.connect(filter);
        });
        
        // Also connect to dry path
        source.connect(this.dryGain);
    }
    
    // Disconnect
    disconnect() {
        this.filters.forEach(filter => filter.disconnect());
        this.gains.forEach(gain => gain.disconnect());
        if (this.dryGain) this.dryGain.disconnect();
        if (this.wetGain) this.wetGain.disconnect();
        if (this.mixer) this.mixer.disconnect();
    }
}
