// Main application entry point
import { SynthController } from './controllers/SynthController.js';

// Initialize the application when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SynthController();
    });
} else {
    new SynthController();
}

// Make the controller available globally for debugging
window.app = {
    SynthController
};
