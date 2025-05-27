// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const synth = new DogSynthesizer();
        const ui = new UIController(synth);
        
        // Make synth available globally for debugging
        window.synth = synth;
        window.ui = ui;
        
        console.log('Dog Synthesizer initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Dog Synthesizer:', error);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Initialization failed. Check console for errors.';
            statusEl.style.color = 'red';
        }
    }
});
