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
            
            // Create a gain node for mixing glottis and noise
            this.mixer = this.audioContext.createGain();
            this.mixer.gain.value = 1.0;
            
            // Connect components with proper routing
            this.glottis.connect(this.mixer);
            this.noise.connect(this.mixer);
            this.mixer.connect(this.formants.input);
            this.formants.connect(this.output);
            this.output.connect(this.audioContext.destination);
            debug('Audio nodes connected');
            
            // Set initial volume to a safe level
            this.output.gain.value = 0.5;
            
            // Keep track of active notes
            this.activeNotes = new Set();
            
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
        // Only log parameter changes in development
        const debug = false;
        
        if (!this.params.hasOwnProperty(param)) {
            if (debug) console.warn(`Unknown parameter: ${param}`);
            return;
        }
        
        try {
            // Convert to number if it's a numeric parameter
            const numValue = typeof this.params[param] === 'number' ? parseFloat(value) : value;
            const currentValue = this.params[param];
            
            // Skip if value hasn't changed (within floating point precision)
            if (typeof numValue === 'number' && Math.abs(numValue - currentValue) < 0.0001) {
                return;
            }
            
            this.params[param] = numValue;
            if (debug) console.log(`Setting parameter: ${param} = ${numValue}`);
            
            // Direct parameter handling for performance
            const now = this.audioContext?.currentTime || 0;
            
            // Handle common parameters directly
            switch (param) {
                case 'pitch':
                case 'jitter':
                case 'shimmer':
                    if (this.glottis) {
                        this.glottis.setParam(param, numValue);
                    }
                    break;
                    
                case 'breathiness':
                case 'noiseColor':
                case 'noiseQ':
                case 'q':
                    if (this.noise) {
                        this.noise.setParam(param, numValue);
                    }
                    break;
                    
                case 'formants':
                    if (this.formants) {
                        this.formants.setParam(param, numValue);
                        this.updateFormants();
                    }
                    break;
                    
                case 'amp':
                case 'gain':
                    if (this.output) {
                        this.output.gain.cancelScheduledValues(now);
                        this.output.gain.setValueAtTime(numValue, now);
                    }
                    break;
                    
                default:
                    // For envelope parameters and others
                    if (this.envelope?.setParam) {
                        this.envelope.setParam(param, numValue);
                    }
            }
            
            // Emit the parameter change event
            eventBus.emit(events.PARAM_CHANGE, { param, value: numValue });
            
        } catch (error) {
            if (debug) console.error(`Error setting ${param}:`, error);
        }
    }
    
    // Update all parameters without triggering events
    updateParams() {
        // Update all parameters directly without emitting events
        // to prevent infinite loops
        Object.entries(this.params).forEach(([param, value]) => {
            // Update the glottis, noise, and formants directly
            if (this.glottis && typeof this.glottis.setParam === 'function') {
                this.glottis.setParam(param, value);
            }
            if (this.noise && typeof this.noise.setParam === 'function') {
                this.noise.setParam(param, value);
            }
            if (this.formants && typeof this.formants.setParam === 'function') {
                this.formants.setParam(param, value);
            }
        });
        
        // Update formants specifically if needed
        this.updateFormants();
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
        try {
            if (!this.audioContext) {
                console.error('Cannot play note: AudioContext not available');
                return;
            }
            
            const now = this.audioContext.currentTime;
            const endTime = now + Math.max(0.1, duration); // Ensure minimum duration
            const noteId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
            
            console.log(`Playing note [${noteId}]: duration=${duration}s, velocity=${velocity}, pitch=${this.params.pitch}Hz`);
            
            // Store active note
            this.activeNotes.add(noteId);
            
            // Emit note on with current time
            eventBus.emit(events.NOTE_ON, {
                frequency: this.params.pitch,
                velocity,
                time: now,
                id: noteId
            });
            
            // Schedule note off using audio context timing
            const noteOffEvent = () => {
                if (this.activeNotes.has(noteId)) {
                    eventBus.emit(events.NOTE_OFF, {
                        time: this.audioContext.currentTime,
                        id: noteId
                    });
                    this.activeNotes.delete(noteId);
                }
            };
            
            // Schedule the note off
            const timeout = setTimeout(noteOffEvent, (endTime - now) * 1000);
            
            // Store timeout for cleanup
            this.activeNotes.add({
                id: noteId,
                timeout: timeout,
                cancel: () => clearTimeout(timeout)
            });
            
            console.log(`Scheduled note off [${noteId}] at: ${endTime.toFixed(3)}s`);
            
        } catch (error) {
            console.error('Error in playNote:', error);
        }
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
