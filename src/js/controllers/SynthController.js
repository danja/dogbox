import { eventBus, events } from '../events.js';
import { DogSynthesizer } from '../models/DogSynthesizer.js';

export class SynthController {
    constructor() {
        this.synth = null;
        this.initialized = false;
        this.uiElements = {};
        this.presets = this.getDefaultPresets();
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    async initialize() {
        try {
            this.setupUIElements();
            this.setupEventListeners();
            
            // Initialize audio on user interaction
            this.uiElements.startBtn.addEventListener('click', () => this.initAudio());
            this.uiElements.testBtn.addEventListener('click', () => this.playTestSound());
            
            // Set initial UI state
            this.updateStatus('Click Initialize to begin', '#4facfe');
            
            // Notify UI is ready
            eventBus.emit(events.UI_READY);
            
        } catch (error) {
            console.error('Error initializing controller:', error);
            this.updateStatus('Initialization failed. Check console for errors.', '#e74c3c');
        }
    }
    
    async initAudio() {
        try {
            this.updateStatus('Initializing audio...', '#4facfe');
            
            // Log browser info for debugging
            console.log('Browser info:', {
                userAgent: navigator.userAgent,
                secureContext: window.isSecureContext,
                hasAudioContext: !!(window.AudioContext || window.webkitAudioContext),
                location: window.location.href
            });
            
            // Check if we're in a secure context (required for AudioContext)
            if (window.isSecureContext === false) {
                throw new Error('Page must be served over HTTPS or localhost to use Web Audio API');
            }
            
            // Check for Web Audio API support
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API is not supported in this browser');
            }
            
            // Create the synthesizer
            console.log('Creating DogSynthesizer instance...');
            this.synth = new DogSynthesizer();
            
            // Log audio context state
            console.log('AudioContext state:', this.synth.audioContext.state);
            
            // If suspended, we'll need a user gesture to start it
            if (this.synth.audioContext.state === 'suspended') {
                console.log('AudioContext is suspended, awaiting user interaction...');
                this.updateStatus('Click anywhere to enable audio...', '#f39c12');
                
                // Add a one-time click handler to resume the audio context
                const resumeAudio = async () => {
                    try {
                        await this.synth.audioContext.resume();
                        console.log('AudioContext resumed successfully');
                        this.updateStatus('Audio ready! Click Test or adjust parameters.', '#2ecc71');
                        document.removeEventListener('click', resumeAudio);
                    } catch (error) {
                        console.error('Error resuming AudioContext:', error);
                        this.updateStatus('Error enabling audio. Try refreshing the page.', '#e74c3c');
                    }
                };
                
                document.addEventListener('click', resumeAudio, { once: true });
            } else {
                this.updateStatus('Audio ready! Click Test or adjust parameters.', '#2ecc71');
            }
            
            this.initialized = true;
            
            // Enable test button
            this.uiElements.testBtn.disabled = false;
            this.uiElements.startBtn.disabled = true;
            
            this.updateStatus('Audio initialized! Click Test or adjust parameters.', '#2ecc71');
            
            // Play a test sound after a short delay to ensure everything is ready
            setTimeout(() => {
                this.playTestSound();
            }, 100);
            
        } catch (error) {
            console.error('Error initializing audio:', error);
            let errorMessage = 'Error initializing audio: ' + error.message;
            
            // Provide more user-friendly error messages
            if (error.message.includes('secure context')) {
                errorMessage = 'Audio requires a secure context (HTTPS or localhost)';
            } else if (error.message.includes('Web Audio API')) {
                errorMessage = 'Web Audio API not supported in this browser';
            }
            
            this.updateStatus(errorMessage, '#e74c3c');
            
            // Log additional debug info
            console.log('Browser info:', {
                userAgent: navigator.userAgent,
                secureContext: window.isSecureContext,
                hasAudioContext: !!(window.AudioContext || window.webkitAudioContext),
                audioContextState: this.synth?.audioContext?.state
            });
        }
    }
    
    setupUIElements() {
        // Main controls
        this.uiElements = {
            startBtn: document.getElementById('startBtn'),
            testBtn: document.getElementById('testBtn'),
            statusEl: document.getElementById('status'),
            debugEl: document.getElementById('debug'),
            sliders: {}
        };
        
        // Get all sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            this.uiElements.sliders[slider.id] = slider;
            
            // Add value display if it doesn't exist
            if (!document.getElementById(`${slider.id}-value`)) {
                const valueDisplay = document.createElement('span');
                valueDisplay.id = `${slider.id}-value`;
                valueDisplay.className = 'slider-value';
                valueDisplay.textContent = slider.value;
                slider.parentNode.insertBefore(valueDisplay, slider.nextSibling);
            }
        });
        
        // Get preset buttons
        this.uiElements.presetBtns = document.querySelectorAll('.preset-btn');
    }
    
    setupEventListeners() {
        // Slider changes
        Object.entries(this.uiElements.sliders).forEach(([id, slider]) => {
            slider.addEventListener('input', (e) => this.onSliderChange(id, e.target.value));
        });
        
        // Preset buttons
        this.uiElements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.loadPreset(btn.dataset.preset));
        });
    }
    
    onSliderChange(id, value) {
        if (!this.initialized) return;
        
        const numValue = parseFloat(value);
        
        // Update the display value
        const valueEl = document.getElementById(`${id}-value`);
        if (valueEl) {
            valueEl.textContent = numValue.toFixed(2);
        }
        
        // Map slider IDs to parameters
        const paramMap = {
            pitch: 'pitch',
            jitter: 'jitter',
            shimmer: 'shimmer',
            breathiness: 'breathiness',
            noiseColor: 'noiseColor',
            'f1': 'formants',
            'f2': 'formants',
            'f3': 'formants',
            'amp-attack': 'amp-attack',
            'amp-decay': 'amp-decay',
            'amp-sustain': 'amp-sustain',
            'amp-release': 'amp-release'
        };
        
        const param = paramMap[id];
        
        if (!param) return;
        
        // Handle formant updates
        if (id.startsWith('f')) {
            const formantIndex = parseInt(id[1]) - 1;
            const formants = [...this.synth.params.formants];
            formants[formantIndex] = numValue;
            this.synth.setParam('formants', formants);
            return;
        }
        
        // Emit parameter change
        eventBus.emit(events.PARAM_CHANGE, { param, value: numValue });
    }
    
    playTestSound() {
        if (!this.initialized) {
            this.updateStatus('Please initialize audio first', '#e67e22');
            return;
        }
        
        try {
            this.synth.playNote(1.5, 0.7);
            this.updateStatus('Playing test sound...', '#2ecc71');
        } catch (error) {
            console.error('Error playing sound:', error);
            this.updateStatus('Error playing sound', '#e74c3c');
        }
    }
    
    loadPreset(presetName) {
        if (!this.initialized) {
            this.updateStatus('Please initialize audio first', '#e67e22');
            return;
        }
        
        const preset = this.presets[presetName];
        if (!preset) return;
        
        // Update all sliders
        Object.entries(preset).forEach(([id, value]) => {
            const slider = this.uiElements.sliders[id];
            if (slider) {
                slider.value = value;
                // Trigger input event to update display and synth
                const event = new Event('input');
                slider.dispatchEvent(event);
            }
        });
        
        this.updateStatus(`Loaded preset: ${presetName}`, '#9b59b6');
    }
    
    getDefaultPresets() {
        return {
            bark: {
                pitch: 220,
                jitter: 0.05,
                shimmer: 0.08,
                breathiness: 0.1,
                noiseColor: 1000,
                f1: 650,
                f2: 1100,
                f3: 2200,
                'amp-attack': 0.01,
                'amp-decay': 0.05,
                'amp-sustain': 0.6,
                'amp-release': 0.2
            },
            whine: {
                pitch: 450,
                jitter: 0.03,
                shimmer: 0.04,
                breathiness: 0.15,
                noiseColor: 1200,
                f1: 800,
                f2: 1600,
                f3: 2800,
                'amp-attack': 0.01,
                'amp-decay': 0.1,
                'amp-sustain': 0.7,
                'amp-release': 0.3
            },
            growl: {
                pitch: 120,
                jitter: 0.1,
                shimmer: 0.12,
                breathiness: 0.2,
                noiseColor: 800,
                f1: 500,
                f2: 900,
                f3: 1800,
                'amp-attack': 0.05,
                'amp-decay': 0.2,
                'amp-sustain': 0.8,
                'amp-release': 0.4
            }
        };
    }
    
    updateStatus(message, color = '#4facfe') {
        if (this.uiElements.statusEl) {
            this.uiElements.statusEl.textContent = message;
            this.uiElements.statusEl.style.color = color;
        }
        console.log(`[Status] ${message}`);
    }
    
    logDebug(message) {
        if (this.uiElements.debugEl) {
            const logEntry = document.createElement('div');
            logEntry.textContent = `[${new Date().toISOString()}] ${message}`;
            this.uiElements.debugEl.prepend(logEntry);
            
            // Keep only the last 10 log entries
            while (this.uiElements.debugEl.children.length > 10) {
                this.uiElements.debugEl.removeChild(this.uiElements.debugEl.lastChild);
            }
        }
        console.debug(`[Debug] ${message}`);
    }
}
