import { eventBus, events } from '../events.js';
import { LFGlottalSource } from './LFGlottalSource.js';
import { NoiseGenerator } from './NoiseGenerator.js';
import { FormantFilterBank } from './FormantFilterBank.js';
import { EnvelopeGenerator } from './EnvelopeGenerator.js';

// Debug logging
const debug = (message, ...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DogSynthesizer] ${message}`, ...args);
  }
};

export class DogSynthesizer {
    constructor() {
        try {
            debug('Initializing DogSynthesizer...');
            
            // Check for Web Audio API support
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API is not supported in this browser');
            }
            
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            debug('AudioContext created');
            
            // Initialize components
            this.envelope = new EnvelopeGenerator();
            debug('EnvelopeGenerator initialized');
            
            this.glottis = new LFGlottalSource(this.audioContext);
            debug('LFGlottalSource initialized');
            
            this.noise = new NoiseGenerator(this.audioContext);
            debug('NoiseGenerator initialized');
            
            this.formants = new FormantFilterBank(this.audioContext);
            debug('FormantFilterBank initialized');
            
            // Output gain
            this.output = this.audioContext.createGain();
            this.output.gain.value = 0.5;
            debug('Output gain node created');
            
            // Connect components
            this.glottis.connect(this.formants.input);
            this.noise.connect(this.formants.input);
            this.formants.connect(this.output);
            this.output.connect(this.audioContext.destination);
            debug('Audio nodes connected');
            
        } catch (error) {
            console.error('Error initializing DogSynthesizer:', error);
            throw error; // Re-throw to be caught by the controller
        }
        
        // Default parameters
        this.params = {
            pitch: 220,
            jitter: 0.05,
            shimmer: 0.1,
            breathiness: 0.2,
            noiseColor: 1000,
            formants: [800, 1200, 2500, 3500],
            formantQs: [10, 8, 6, 4],
            'amp-attack': 0.01,
            'amp-decay': 0.1,
            'amp-sustain': 0.5,
            'amp-release': 0.2
        };
        
        // Apply initial parameters
        this.updateParams();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Notify that audio is ready
        eventBus.emit(events.AUDIO_READY);
    }
    
    setupEventListeners() {
        // Forward parameter changes to the event bus
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            this.setParam(param, value);
        });
        
        // Handle preset loading
        eventBus.on(events.PRESET_LOAD, (preset) => {
            this.loadPreset(preset);
        });
    }
    
    // Set a parameter value
    setParam(param, value) {
        if (this.params.hasOwnProperty(param)) {
            this.params[param] = value;
            
            // Emit the parameter change event
            eventBus.emit(events.PARAM_CHANGE, { param, value });
            
            // Special handling for formant parameters
            if (param.startsWith('formant')) {
                this.updateFormants();
            }
        }
    }
    
    // Update all parameters
    updateParams() {
        // Update all parameters
        Object.entries(this.params).forEach(([param, value]) => {
            eventBus.emit(events.PARAM_CHANGE, { param, value });
        });
    }
    
    // Update formant-related parameters
    updateFormants() {
        eventBus.emit(events.PARAM_CHANGE, {
            param: 'formants',
            value: this.params.formants
        });
        
        eventBus.emit(events.PARAM_CHANGE, {
            param: 'formantQs',
            value: this.params.formantQs
        });
    }
    
    // Load a preset
    loadPreset(preset) {
        Object.entries(preset).forEach(([param, value]) => {
            if (this.params.hasOwnProperty(param)) {
                this.params[param] = value;
                eventBus.emit(events.PARAM_CHANGE, { param, value });
            }
        });
    }
    
    // Play a note
    playNote(duration = 1.0, velocity = 0.7) {
        eventBus.emit(events.NOTE_ON, {
            frequency: this.params.pitch,
            velocity
        });
        
        // Schedule note off
        setTimeout(() => {
            eventBus.emit(events.NOTE_OFF);
        }, duration * 1000);
    }
    
    // Connect to audio destination
    connect(destination) {
        this.output.connect(destination);
    }
    
    // Disconnect all audio nodes
    disconnect() {
        this.glottis.disconnect();
        this.noise.disconnect();
        this.formants.disconnect();
        this.output.disconnect();
    }
}
