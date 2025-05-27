import { eventBus, events } from '../events.js';

export class EnvelopeGenerator {
    constructor() {
        this.attack = 0.01;
        this.decay = 0.1;
        this.sustain = 0.5;
        this.release = 0.2;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        eventBus.on(events.PARAM_CHANGE, ({ param, value }) => {
            if (param.startsWith('amp-')) {
                const paramName = param.split('-')[1];
                this[paramName] = value;
            }
        });
    }
    
    setADSR(attack, decay, sustain, release) {
        this.attack = attack;
        this.decay = decay;
        this.sustain = sustain;
        this.release = release;
    }
    
    applyEnvelope(param, startValue, peakValue, sustainValue, startTime, duration) {
        const audioContext = param.context;
        const now = audioContext.currentTime;
        
        // Calculate times
        const attackEnd = startTime + this.attack;
        const decayEnd = attackEnd + this.decay;
        const releaseStart = startTime + duration - this.release;
        
        // Set initial value
        param.cancelScheduledValues(now);
        param.setValueAtTime(startValue, startTime);
        
        // Attack phase
        param.linearRampToValueAtTime(peakValue, attackEnd);
        
        // Decay phase
        param.linearRampToValueAtTime(sustainValue, decayEnd);
        
        // Sustain phase (if there is one)
        if (releaseStart > decayEnd) {
            param.linearRampToValueAtTime(sustainValue, releaseStart);
        }
        
        // Release phase
        param.linearRampToValueAtTime(0, startTime + duration);
        
        return startTime + duration;
    }
}
