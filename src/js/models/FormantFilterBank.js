import { eventBus, events } from '../events.js';

export class FormantFilterBank {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.filters = [];
        this.gains = [];
        this.mix = 0.5;
        
        // Create input and output nodes
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        
        // Create formant filters (F1-F4)
        for (let i = 0; i < 4; i++) {
            // Create bandpass filter for each formant
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 10;
            
            // Create gain for each formant
            const gain = this.audioContext.createGain();
            gain.gain.value = 0.25; // Default equal gain for all formants
            
            // Connect filter to gain
            filter.connect(gain);
            
            this.filters.push(filter);
            this.gains.push(gain);
        }
        
        // Set default formant frequencies (vowel "ah")
        this.setFormants(800, 1200, 2500, 3500);
        
        // Create dry/wet mixer
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        
        // Connect input to all filters in parallel
        this.filters.forEach(filter => {
            this.input.connect(filter);
        });
        
        // Connect all gains to wet gain
        this.gains.forEach(gain => {
            gain.connect(this.wetGain);
        });
        
        // Connect input to dry gain (for dry/wet mix)
        this.input.connect(this.dryGain);
        
        // Connect dry and wet gains to output
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);
        
        // Set initial gains
        this.setMix(this.mix);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            if (param === 'formants') {
                this.setFormants(...value);
            } else if (param === 'formantQs') {
                this.setBandwidths(...value);
            } else if (param === 'filterMix') {
                this.setMix(value);
            }
        });
    }
    
    setFormants(f1, f2, f3, f4) {
        const freqs = [f1, f2, f3, f4];
        freqs.forEach((freq, i) => {
            if (this.filters[i]) {
                this.filters[i].frequency.setValueAtTime(freq, this.audioContext.currentTime);
            }
        });
    }
    
    setBandwidths(bw1, bw2, bw3, bw4) {
        const bws = [bw1, bw2, bw3, bw4];
        bws.forEach((bw, i) => {
            if (this.filters[i]) {
                this.filters[i].Q.setValueAtTime(this.bwToQ(bw), this.audioContext.currentTime);
            }
        });
    }
    
    bwToQ(bw) {
        // Convert bandwidth in octaves to Q value
        const w0 = 2 * Math.PI * 1000 / this.audioContext.sampleRate; // Center frequency
        const A = Math.pow(2, bw / 2);
        return Math.sqrt(A) / (A - 1);
    }
    
    setGains(g1, g2, g3, g4) {
        const gains = [g1, g2, g3, g4];
        gains.forEach((gain, i) => {
            if (this.gains[i]) {
                this.gains[i].gain.setValueAtTime(gain, this.audioContext.currentTime);
            }
        });
    }
    
    setMix(level) {
        this.mix = level;
        const now = this.audioContext.currentTime;
        this.dryGain.gain.setValueAtTime(1 - level, now);
        this.wetGain.gain.setValueAtTime(level, now);
    }
    
    connect(destination) {
        if (destination instanceof AudioNode) {
            this.output.connect(destination);
        } else if (destination._input) {
            // Handle case where destination is a custom node with _input
            this.output.connect(destination._input);
        } else {
            throw new Error('Cannot connect to destination: not an AudioNode');
        }
        return destination;
    }
    
    disconnect() {
        this.output.disconnect();
    }
    
    get numberOfInputs() { return 1; }
    get numberOfOutputs() { return 1; }
    
    connectInput(source) {
        // Connect source to all filters (in parallel)
        this.filters.forEach(filter => {
            source.connect(filter);
        });
        
        // Also connect to dry path
        source.connect(this.dryGain);
    }
    
    disconnect() {
        this.filters.forEach(filter => filter.disconnect());
        this.gains.forEach(gain => gain.disconnect());
        if (this.dryGain) this.dryGain.disconnect();
        if (this.wetGain) this.wetGain.disconnect();
        if (this.mixer) this.mixer.disconnect();
    }
}
