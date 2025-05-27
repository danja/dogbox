import { EventBus } from 'evb';

export const events = {
  // System events
  APP_INIT: 'app:init',
  AUDIO_READY: 'audio:ready',
  
  // Playback events
  NOTE_ON: 'note:on',
  NOTE_OFF: 'note:off',
  
  // Parameter change events
  PARAM_CHANGE: 'param:change',
  PRESET_LOAD: 'preset:load',
  
  // UI events
  UI_READY: 'ui:ready',
  UI_ERROR: 'ui:error'
};

// Create and export the event bus instance
export const eventBus = new EventBus();

// Debug all events in development
if (process.env.NODE_ENV === 'development') {
  Object.values(events).forEach(event => {
    eventBus.on(event, (data) => {
      console.log(`[Event] ${event}`, data);
    });
  });
}
