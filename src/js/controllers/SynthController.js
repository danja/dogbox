import { eventBus, events } from '../events.js';
import { DogSynthesizer } from '../models/DogSynthesizer.js';

export class SynthController {
    constructor() {
        this.synth = null;
        this.initialized = false;
        this.initializing = false;
        this.isLoadingPreset = false;
        this.paramUpdateTimeout = null;
        this.uiElements = {};
        this.presets = this.getDefaultPresets();
        
        // Bind methods
        this.loadPreset = this.loadPreset.bind(this);
        this.playTestSound = this.playTestSound.bind(this);
        this.initAudio = this.initAudio.bind(this);
        this.initialize = this.initialize.bind(this);
        this.onSliderChange = this.onSliderChange.bind(this);
        this.updateSynthFromSlider = this.updateSynthFromSlider.bind(this);
        
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
        // Prevent multiple initializations
        if (this.initializing) return;
        this.initializing = true;
        
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
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                throw new Error('Web Audio API is not supported in this browser');
            }
            
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
            
            // Handle audio context state
            const handleAudioContextState = async () => {
                try {
                    if (this.synth.audioContext.state === 'suspended') {
                        console.log('AudioContext is suspended, resuming...');
                        await this.synth.audioContext.resume();
                    }
                    
                    console.log('AudioContext state after resume:', this.synth.audioContext.state);
                    
                    if (this.synth.audioContext.state === 'running') {
                        this.initialized = true;
                        this.initializing = false;
                        this.uiElements.testBtn.disabled = false;
                        this.uiElements.startBtn.disabled = true;
                        this.updateStatus('Audio ready! Click Test or adjust parameters.', '#2ecc71');
                        
                        // Enable test and play buttons
                        this.uiElements.testBtn.disabled = false;
                        if (this.uiElements.playBtn) {
                            this.uiElements.playBtn.disabled = false;
                        }
                        
                        // Play test sound after a short delay
                        setTimeout(() => {
                            this.playTestSound();
                        }, 300);
                    }
                } catch (error) {
                    console.error('Error handling audio context state:', error);
                    this.updateStatus('Error initializing audio. Try clicking Initialize again.', '#e74c3c');
                    this.initializing = false;
                }
            };
            
            // Set up user interaction handler
            const handleUserInteraction = async () => {
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
                document.removeEventListener('touchstart', handleUserInteraction);
                
                try {
                    await handleAudioContextState();
                } catch (error) {
                    console.error('Error in user interaction handler:', error);
                    this.updateStatus('Error enabling audio. Try refreshing the page.', '#e74c3c');
                    this.initializing = false;
                }
            };
            
            // If already running, proceed, otherwise wait for user interaction
            if (this.synth.audioContext.state === 'running') {
                await handleAudioContextState();
            } else {
                this.updateStatus('Click or tap anywhere to enable audio...', '#f39c12');
                document.addEventListener('click', handleUserInteraction, { once: true });
                document.addEventListener('keydown', handleUserInteraction, { once: true });
                document.addEventListener('touchstart', handleUserInteraction, { once: true });
            }
            
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
            playBtn: document.getElementById('playBtn'),
            status: document.getElementById('status'),
            sliders: {}
        };
        
        // Initialize all sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            this.uiElements.sliders[slider.id] = slider;
            
            // Set initial value display
            const valueEl = document.getElementById(`${slider.id}-value`);
            if (valueEl) {
                valueEl.textContent = slider.value;
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
        
        // Play button
        if (this.uiElements.playBtn) {
            this.uiElements.playBtn.addEventListener('click', () => this.playTestSound());
        }
    }
    
    updateSynthFromSlider(id, value) {
        if (!this.initialized || !this.synth || this.isLoadingPreset) return;
        
        const numValue = parseFloat(value);
        
        // Clear any pending updates
        if (this.paramUpdateTimeout) {
            clearTimeout(this.paramUpdateTimeout);
        }
        
        // Debounce the parameter updates to prevent rapid firing
        this.paramUpdateTimeout = setTimeout(() => {
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
            
            try {
                // Handle formant updates
                if (id.startsWith('f')) {
                    const formantIndex = parseInt(id[1]) - 1;
                    const formants = [...this.synth.params.formants];
                    formants[formantIndex] = numValue;
                    this.synth.setParam('formants', formants);
                } else {
                    this.synth.setParam(param, numValue);
                }
            } catch (error) {
                console.error('Error updating parameter:', error);
            }
        }, 16); // ~60fps update rate
    }
    
    onSliderChange(id, value) {
        if (!this.initialized || this.isLoadingPreset) return;
        
        const numValue = parseFloat(value);
        
        // Update the display value
        const valueEl = document.getElementById(`${id}-value`);
        if (valueEl) {
            valueEl.textContent = numValue.toFixed(2);
        }
        
        // Update the synth
        this.updateSynthFromSlider(id, numValue);
    }
    
    loadPreset(presetName) {
        if (!this.initialized) {
            this.updateStatus('Please initialize audio first', '#e67e22');
            return;
        }
        
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`Preset '${presetName}' not found`);
            return;
        }
        
        // Clear any pending updates
        if (this.paramUpdateTimeout) {
            clearTimeout(this.paramUpdateTimeout);
            this.paramUpdateTimeout = null;
        }
        
        try {
            // Set a flag to indicate we're programmatically updating sliders
            this.isLoadingPreset = true;
            
            // Batch all parameter updates
            const updates = [];
            
            // First, collect all updates
            Object.entries(preset).forEach(([id, value]) => {
                const slider = this.uiElements.sliders?.[id];
                if (slider) {
                    // Update the slider value without triggering the input event
                    slider.value = value;
                    // Update the display value
                    const valueEl = document.getElementById(`${id}-value`);
                    if (valueEl) {
                        valueEl.textContent = parseFloat(value).toFixed(2);
                    }
                    // Collect the update
                    updates.push({ id, value });
                }
            });
            
            // Apply all updates at once
            updates.forEach(({ id, value }) => {
                this.updateSynthFromSlider(id, value);
            });
            
            this.updateStatus(`Loaded preset: ${presetName}`, '#9b59b6');
            
            // Play the preset sound
            this.playTestSound();
            
        } catch (error) {
            console.error('Error loading preset:', error);
            this.updateStatus('Error loading preset', '#e74c3c');
        } finally {
            // Clear the flag when done
            this.isLoadingPreset = false;
        }
    }
        
    async playTestSound() {
        if (!this.synth) {
            console.warn('Cannot play test sound: No synth instance');
            this.updateStatus('Audio not ready. Click Initialize first.', '#e74c3c');
            return;
        }
        
        try {
            const audioCtx = this.synth.audioContext;
            
            // Create a resume promise if needed
            if (audioCtx.state === 'suspended') {
                console.log('AudioContext suspended, attempting to resume...');
                await audioCtx.resume();
            }
            
            // Check if the context is actually running
            if (audioCtx.state !== 'running') {
                console.warn('AudioContext could not be resumed, state:', audioCtx.state);
                this.updateStatus('Audio not ready. Try clicking the Play button again.', '#e67e22');
                return;
            }
            
            console.log('Playing test sound with params:', {
                pitch: this.synth.params.pitch,
                state: audioCtx.state
            });
            
            // Play a short note (duration: 1.0s, velocity: 0.7)
            this.synth.playNote(1.0, 0.7);
            this.updateStatus('Playing test sound...', '#2ecc71');
            
        } catch (error) {
            console.error('Error playing test sound:', error);
            this.updateStatus('Error playing sound: ' + error.message, '#e74c3c');
        }
    }
    
    async initializeAudio() {
        if (this.synth) {
            console.log('Audio already initialized, playing test sound...');
            await this.playTestSound();
            return;
        }
        
        this.updateStatus('Initializing audio...', '#f39c12');
        
        try {
            // Create a new synthesizer instance
            this.synth = new DogSynthesizer();
            
            // Wait for the audio context to be ready
            await new Promise(resolve => {
                const checkReady = () => {
                    if (this.synth.audioContext && this.synth.audioContext.state === 'running') {
                        resolve();
                    } else {
                        setTimeout(checkReady, 50);
                    }
                };
                checkReady();
            });
            
            // Play a short test sound
            await this.playTestSound();
            
            this.updateStatus('Audio initialized!', '#2ecc71');
            
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.updateStatus('Error initializing audio: ' + error.message, '#e74c3c');
            throw error; // Re-throw to allow retry
        }
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
