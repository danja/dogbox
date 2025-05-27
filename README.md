# DogBox - Canine Vocal Synthesizer

A web-based synthesizer that generates realistic dog vocalizations using the Web Audio API. This project implements a formant-based synthesis approach with additional features like jitter, shimmer, and breathiness controls to create a wide range of dog sounds.

[Demo](https://danja.github.io/dogbox/)

## Features

- **Formant-based synthesis** for realistic dog vocalizations
- **Multiple sound presets** (bark, whine, growl)
- **Real-time parameter control** for fine-tuning sounds
- **Modular architecture** using MVC pattern
- **Event-based communication** between components
- **Responsive UI** that works on desktop and mobile

## Project Structure

```
src/
├── css/              # Stylesheets
├── html/             # HTML templates
└── js/               # JavaScript source files
    ├── controllers/  # Application controllers
    ├── models/      # Audio processing models
    └── events.js    # Event bus and event definitions
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/danja/dogbox.git
   cd dogbox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

This will start a local development server at `http://localhost:9000` with hot module replacement enabled.

### Building for Production

Create a production build:
```bash
npm run build
```

The production files will be generated in the `dist/` directory.

## Architecture

The application follows the Model-View-Controller (MVC) pattern with the following components:

- **Models**: Handle audio processing and state
  - `DogSynthesizer`: Main synthesizer class
  - `LFGlottalSource`: Generates the glottal waveform
  - `NoiseGenerator`: Adds breath and aspiration
  - `FormantFilterBank`: Shapes the sound with formant filters
  - `EnvelopeGenerator`: Controls amplitude and filter envelopes

- **Controllers**: Handle user input and application logic
  - `SynthController`: Manages the synthesizer and UI interactions

- **Events**: Centralized event bus for component communication

## Usage

1. Click the "Initialize Audio" button to start the audio context (required by modern browsers)
2. Use the sliders to adjust parameters:
   - **Pitch**: Controls the fundamental frequency
   - **Jitter**: Adds pitch variation
   - **Shimmer**: Adds amplitude variation
   - **Breathiness**: Controls the amount of noise in the sound
   - **Formants (F1-F3)**: Adjust the formant frequencies
3. Click "Test" to play the current sound
4. Use the preset buttons to load different dog vocalizations

## Building Blocks

### Formant Synthesis

The synthesizer uses formant synthesis to create realistic dog vocalizations. Each sound is shaped by multiple formant filters that simulate the vocal tract resonances.

### LF Glottal Source

The LF (Liljencrants-Fant) model is used to generate the glottal waveform, which is then processed through the formant filters.

### Parameter Automation

All parameters can be automated in real-time, allowing for dynamic sound design and expressive performances.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The LF glottal pulse model
- Web Audio API
- The `evb` library for event bus functionality

## Future Work

- Add more presets and sound variations
- Implement MIDI input support
- Add recording and export functionality
- Port to C++ for standalone application

---

Created by [Your Name] - [Your Website]