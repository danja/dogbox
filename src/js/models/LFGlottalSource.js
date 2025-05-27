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
        this.osc.type = 'sawtooth'; // Changed to sawtooth for more harmonic content
        this.osc.frequency.setValueAtTime(this.f0, audioContext.currentTime);
        
        // Create gain for amplitude control
        this.gain = audioContext.createGain();
        this.gain.gain.value = 0;
        
        // Connect nodes
        this.osc.connect(this.gain);
        
        // Start oscillator
        this.osc.start();
        
        // Set initial volume
        this.gain.gain.value = 0.5;
        
        // Track active notes
        this.activeNotes = new Map();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('LFGlottalSource initialized');
    }
    
    setupEventListeners() {
        // Only log parameter changes in development
        const debug = false;
        
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            if (debug) console.log(`LFGlottalSource: ${param} = ${value}`);
            
            try {
                const numValue = parseFloat(value);
                const now = this.audioContext.currentTime;
                
                switch (param) {
                    case 'pitch':
                        this.f0 = numValue;
                        this.osc.frequency.cancelScheduledValues(now);
                        this.osc.frequency.setValueAtTime(numValue, now);
                        break;
                    case 'jitter':
                        this.jitter = numValue;
                        break;
                    case 'shimmer':
                        this.shimmer = numValue;
                        break;
                    case 'amp':
                    case 'gain':
                        // Direct gain control
                        this.gain.gain.cancelScheduledValues(now);
                        this.gain.gain.setValueAtTime(numValue, now);
                        break;
                    case 'amp-attack':
                    case 'amp-decay':
                    case 'amp-sustain':
                    case 'amp-release':
                        if (this.envelope?.setParam) {
                            this.envelope.setParam(param, numValue);
                        }
                        break;
                }
            } catch (error) {
                if (debug) console.error(`Error handling ${param}:`, error);
            }
        });
        
        eventBus.on(events.NOTE_ON, (event = {}) => {
            const { frequency, velocity = 0.7, time, id } = event;
            this.noteOn(time, velocity, frequency, id);
        });
        
        eventBus.on(events.NOTE_OFF, (event = {}) => {
            const { time, id } = event;
            this.noteOff(time, id);
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
    
    noteOn(time = this.audioContext.currentTime, velocity = 1.0, frequency, id) {
        try {
            if (!this.audioContext) {
                console.error('AudioContext not available');
                return;
            }
            
            const now = this.audioContext.currentTime;
            const startTime = Math.max(now, time);
            
            // Create a new gain node for this note
            const noteGain = this.audioContext.createGain();
            noteGain.gain.value = 0;
            
            // Connect the oscillator through this gain node
            this.osc.disconnect();
            this.osc.connect(noteGain);
            noteGain.connect(this.gain);
            
            // Set frequency if provided, otherwise use current
            if (frequency) {
                this.setFrequency(frequency);
            } else {
                frequency = this.f0;
            }
            
            // Apply shimmer to amplitude
            const shimmerFactor = 1 + (Math.random() * 2 - 1) * (this.shimmer || 0);
            const amp = Math.min(1, velocity * shimmerFactor);
            
            console.log(`NoteOn [${id || 'unknown'}]: time=${time.toFixed(3)}, freq=${frequency}, vel=${velocity}, amp=${amp.toFixed(3)}`);
            
            // Schedule the note on
            noteGain.gain.cancelScheduledValues(now);
            noteGain.gain.setValueAtTime(0, now);
            
            if (startTime > now) {
                // If starting in the future, set a ramp
                noteGain.gain.linearRampToValueAtTime(0, startTime);
                noteGain.gain.linearRampToValueAtTime(amp, startTime + 0.01);
            } else {
                // Start immediately
                noteGain.gain.linearRampToValueAtTime(amp, now + 0.01);
            }
            
            // Store the note
            if (id) {
                this.activeNotes.set(id, {
                    gain: noteGain,
                    startTime: now
                });
            }
            
        } catch (error) {
            console.error('Error in noteOn:', error);
        }
    }
    
    noteOff(time = this.audioContext?.currentTime, id) {
        try {
            if (!this.audioContext) {
                console.error('AudioContext not available in noteOff');
                return;
            }
            
            const now = this.audioContext.currentTime;
            const releaseTime = Math.max(now, time || now);
            
            if (id && this.activeNotes.has(id)) {
                // Handle specific note
                const note = this.activeNotes.get(id);
                const gain = note.gain.gain;
                const currentValue = gain.value;
                
                console.log(`NoteOff [${id}]: time=${releaseTime.toFixed(3)}, currentValue=${currentValue.toFixed(3)}`);
                
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
                
                // Clean up after release
                setTimeout(() => {
                    if (this.activeNotes.has(id)) {
                        const noteToClean = this.activeNotes.get(id);
                        noteToClean.gain.disconnect();
                        this.activeNotes.delete(id);
                    }
                }, (releaseTime - now + 0.15) * 1000); // Slightly longer than the release time
                
            } else if (!id) {
                // Fallback: if no ID, use the main gain
                const gain = this.gain.gain;
                const currentValue = gain.value;
                
                console.log(`NoteOff [all]: time=${releaseTime.toFixed(3)}, currentValue=${currentValue.toFixed(3)}`);
                
                // Schedule the release
                gain.cancelScheduledValues(now);
                gain.setValueAtTime(currentValue, now);
                gain.linearRampToValueAtTime(0, releaseTime + 0.1);
            }
            
        } catch (error) {
            console.error('Error in noteOff:', error);
        }
    }
}
