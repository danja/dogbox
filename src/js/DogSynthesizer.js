// ===========================================
// Dog Synthesizer Class
// ===========================================

export class DogSynthesizer {
    constructor() {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize components
        this.envelope = new EnvelopeGenerator();
        this.glottis = new LFGlottalSource(this.audioContext);
        this.noise = new NoiseGenerator(this.audioContext);
        this.formants = new FormantFilterBank(this.audioContext);
        
        // Output gain
        this.output = this.audioContext.createGain();
        this.output.gain.value = 0.5;
        
        // Connect components
        this.glottis.connect(this.formants);
        this.noise.connect(this.formants);
        this.formants.connect(this.output);
        this.output.connect(this.audioContext.destination);
        
        // Default parameters
        this.params = {
            pitch: 220,
            jitter: 0.05,
            shimmer: 0.1,
            breathiness: 0.2,
            noiseColor: 1000,
            formants: [800, 1200, 2500, 3500],
            formantQs: [10, 8, 6, 4],
            ampAttack: 0.01,
            ampDecay: 0.1,
            ampSustain: 0.5,
            ampRelease: 0.2
        };
        
        // Apply initial parameters
        this.updateParams();
    }
    
    // Set a parameter value
    setParam(param, value) {
        if (this.params.hasOwnProperty(param)) {
            this.params[param] = value;
            this.updateParams();
        }
    }
    
    // Update all parameters
    updateParams() {
        // Update glottal source
        this.glottis.setFrequency(this.params.pitch);
        this.glottis.jitter = this.params.jitter;
        this.glottis.shimmer = this.params.shimmer;
        
        // Update noise
        this.noise.setLevel(this.params.breathiness);
        this.noise.setFrequency(this.params.noiseColor);
        
        // Update formants
        this.formants.setFormants(...this.params.formants);
        this.formants.setBandwidths(...this.params.formantQs);
        
        // Update envelope
        this.envelope.setADSR(
            this.params.ampAttack,
            this.params.ampDecay,
            this.params.ampSustain,
            this.params.ampRelease
        );
    }
    
    // Play a note
    playNote(duration = 1.0, velocity = 0.7) {
        const now = this.audioContext.currentTime;
        
        // Trigger glottal source
        this.glottis.noteOn(now, velocity);
        
        // Trigger noise
        this.noise.trigger(velocity * this.params.breathiness, duration);
        
        // Schedule note off
        this.glottis.noteOff(now + duration);
    }
}
