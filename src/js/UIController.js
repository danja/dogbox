// ===========================================
// UI Controller Class
// ===========================================

export class UIController {
    constructor(synthesizer) {
        this.synth = synthesizer;
        this.initialized = false;
        this.isPlayingPreview = false;
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        // Main controls
        this.startBtn = document.getElementById('startBtn');
        this.testBtn = document.getElementById('testBtn');
        this.statusEl = document.getElementById('status');
        this.debugEl = document.getElementById('debug');
        
        // Parameter sliders
        this.sliders = {
            // Glottal source
            pitch: document.getElementById('pitch'),
            jitter: document.getElementById('jitter'),
            shimmer: document.getElementById('shimmer'),
            
            // Vocal tract
            tract: document.getElementById('tract'),
            constriction: document.getElementById('constriction'),
            mouth: document.getElementById('mouth'),
            
            // Formants
            f1: document.getElementById('f1'),
            f2: document.getElementById('f2'),
            f3: document.getElementById('f3'),
            
            // Noise
            breathiness: document.getElementById('breathiness'),
            noiseColor: document.getElementById('noiseColor'),
            
            // Envelopes
            'amp-attack': document.getElementById('amp-attack'),
            'amp-decay': document.getElementById('amp-decay'),
            'amp-sustain': document.getElementById('amp-sustain'),
            'amp-release': document.getElementById('amp-release'),
            'pitch-attack': document.getElementById('pitch-attack'),
            'pitch-decay': document.getElementById('pitch-decay'),
            'pitch-sustain': document.getElementById('pitch-sustain'),
            'pitch-release': document.getElementById('pitch-release'),
            'filter-attack': document.getElementById('filter-attack'),
            'filter-decay': document.getElementById('filter-decay'),
            'filter-sustain': document.getElementById('filter-sustain'),
            'filter-release': document.getElementById('filter-release')
        };
        
        // Preset buttons
        this.presetBtns = document.querySelectorAll('.preset-btn');
    }
    
    attachEventListeners() {
        // Initialize button
        this.startBtn.addEventListener('click', () => this.initialize());
        
        // Test button
        this.testBtn.addEventListener('click', () => this.playTestSound());
        
        // Slider changes
        Object.entries(this.sliders).forEach(([id, slider]) => {
            if (slider) {
                slider.addEventListener('input', () => this.onSliderChange(id, slider));
            }
        });
        
        // Preset buttons
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.loadPreset(btn.dataset.preset));
        });
    }
    
    async initialize() {
        try {
            this.updateStatus('Initializing audio...', '#4facfe');
            
            // Resume audio context if it's suspended
            if (this.synth.audioContext.state === 'suspended') {
                await this.synth.audioContext.resume();
            }
            
            // Enable test button
            this.testBtn.disabled = false;
            this.startBtn.disabled = true;
            this.initialized = true;
            
            this.updateStatus('Ready! Click Test or adjust parameters.', '#2ecc71');
            
            // Play a test sound
            this.playTestSound();
            
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.updateStatus('Error initializing audio. Please check console.', '#e74c3c');
        }
    }
    
    playTestSound() {
        if (!this.initialized) return;
        
        try {
            this.synth.playNote(1.5, 0.7);
            this.updateStatus('Playing test sound...', '#2ecc71');
        } catch (error) {
            console.error('Error playing sound:', error);
            this.updateStatus('Error playing sound', '#e74c3c');
        }
    }
    
    onSliderChange(id, slider) {
        if (!this.initialized) return;
        
        const value = parseFloat(slider.value);
        
        // Update the display value if it exists
        const valueEl = document.getElementById(`${id}-value`);
        if (valueEl) {
            valueEl.textContent = value.toFixed(2);
        }
        
        // Map slider IDs to synth parameters
        const paramMap = {
            pitch: 'pitch',
            jitter: 'jitter',
            shimmer: 'shimmer',
            breathiness: 'breathiness',
            noiseColor: 'noiseColor',
            'amp-attack': 'ampAttack',
            'amp-decay': 'ampDecay',
            'amp-sustain': 'ampSustain',
            'amp-release': 'ampRelease'
        };
        
        // Update the synth parameter
        if (paramMap[id]) {
            this.synth.setParam(paramMap[id], value);
        } else if (id === 'tract') {
            // Update vocal tract length (affects formants)
            const baseFreqs = [800, 1200, 2500, 3500];
            const scale = 12 / value; // Scale factor based on default 12cm
            const formants = baseFreqs.map(f => f * scale);
            this.synth.setParam('formants', formants);
        } else if (id === 'constriction' || id === 'mouth') {
            // Update formant Q values based on constriction/mouth
            const qBase = id === 'constriction' ? 5 + (1 - value) * 15 : 5 + value * 15;
            const qs = [qBase, qBase * 0.8, qBase * 0.6, qBase * 0.4];
            this.synth.setParam('formantQs', qs);
        } else if (id.startsWith('f')) {
            // Update individual formant frequencies
            const formantNum = parseInt(id[1]) - 1;
            if (!isNaN(formantNum) && formantNum >= 0 && formantNum < 4) {
                const formants = [...this.synth.params.formants];
                formants[formantNum] = value;
                this.synth.setParam('formants', formants);
            }
        }
        
        // Play a short preview when adjusting parameters
        if (!this.isPlayingPreview) {
            this.playParameterPreview();
        }
    }
    
    async playParameterPreview() {
        if (this.isPlayingPreview) return;
        
        this.isPlayingPreview = true;
        this.synth.playNote(0.3, 0.4);
        
        // Debounce preview
        await new Promise(resolve => setTimeout(resolve, 300));
        this.isPlayingPreview = false;
    }
    
    loadPreset(presetName) {
        const presets = {
            bark: {
                pitch: 220,
                jitter: 0.05,
                shimmer: 0.08,
                tract: 12.0,
                constriction: 0.3,
                mouth: 0.4,
                breathiness: 0.1,
                noiseColor: 0.7,
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
                tract: 10.0,
                constriction: 0.5,
                mouth: 0.3,
                breathiness: 0.15,
                noiseColor: 0.8,
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
                tract: 15.0,
                constriction: 0.2,
                mouth: 0.6,
                breathiness: 0.2,
                noiseColor: 0.4,
                f1: 500,
                f2: 900,
                f3: 1800,
                'amp-attack': 0.05,
                'amp-decay': 0.2,
                'amp-sustain': 0.8,
                'amp-release': 0.4
            }
        };
        
        const preset = presets[presetName];
        if (!preset) return;
        
        // Update sliders
        Object.entries(preset).forEach(([id, value]) => {
            const slider = this.sliders[id];
            if (slider) {
                slider.value = value;
                // Trigger input event to update display and synth
                const event = new Event('input');
                slider.dispatchEvent(event);
            }
        });
        
        this.updateStatus(`Loaded preset: ${presetName}`, '#9b59b6');
    }
    
    updateStatus(message, color = '#4facfe') {
        this.statusEl.textContent = message;
        this.statusEl.style.color = color;
        console.log(message);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const synth = new DogSynthesizer();
    const ui = new UIController(synth);
    
    // Make synth available globally for debugging
    window.synth = synth;
    window.ui = ui;
});
