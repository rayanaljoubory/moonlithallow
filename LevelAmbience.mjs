// Creates a different synthesized ambient sound profile for each level.
export class LevelAmbience {
        constructor(status) {    
            this.status = status;
            this.levelIndex = 0;
            this.context = null;
            this.enabled = true;
        }

        // Change the active sound profile when the game enters another level.
        setLevel(levelIndex) {
            this.levelIndex = levelIndex;
            if (this.context) this.applyLevelProfile();
            this.updateControls();
        }

        // Create or resume audio after browser autoplay restrictions allow it.
        async start() {
            if (!this.context) this.createAudioGraph();
            if (this.context.state !== "running") {
                await this.context.resume();
            }
            if (this.context.state !== "running") {
                throw new Error("The browser has suspended audio. Interact with the page to resume it.");
            }
            this.applyLevelProfile();
            this.rampMaster(0.18);
            this.updateControls();
        }

        isRunning() {
            return this.context?.state === "running";
        }

        // Show an audio startup problem in the page's accessible status area.
        showStartError(error) {
            this.status.textContent = `Ambience could not start: ${error.message}`;
        }

        // Build connected Web Audio nodes for noise, tones, filtering, and modulation.
        createAudioGraph() {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                throw new Error("This browser does not support background audio.");
            }

            this.context = new AudioContext();
            const context = this.context;
            context.addEventListener("statechange", () => {
                if (context.state === "running" && this.enabled) {
                    this.applyLevelProfile();
                    this.rampMaster(0.18);
                }
                this.updateControls();
            });
            this.masterGain = context.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(context.destination);

            const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
            const samples = noiseBuffer.getChannelData(0);
            for (let i = 0; i < samples.length; i += 1) {
                samples[i] = Math.random() * 2 - 1;
            }
            this.noiseSource = context.createBufferSource();
            this.noiseSource.buffer = noiseBuffer;
            this.noiseSource.loop = true;
            this.noiseFilter = context.createBiquadFilter();
            this.noiseFilter.type = "bandpass";
            this.noiseGain = context.createGain();
            this.noiseSource.connect(this.noiseFilter);
            this.noiseFilter.connect(this.noiseGain);
            this.noiseGain.connect(this.masterGain);
            this.noiseSource.start();

            this.tones = [context.createOscillator(), context.createOscillator()];
            this.toneGains = [context.createGain(), context.createGain()];
            this.tones.forEach((tone, index) => {
                tone.type = "sine";
                tone.connect(this.toneGains[index]);
                this.toneGains[index].connect(this.masterGain);
                tone.start();
            });

            this.filterWobble = context.createOscillator();
            this.filterWobble.type = "sine";
            this.filterWobbleGain = context.createGain();
            this.filterWobble.connect(this.filterWobbleGain);
            this.filterWobbleGain.connect(this.noiseFilter.frequency);
            this.filterWobble.start();

            this.toneWobble = context.createOscillator();
            this.toneWobble.type = "sine";
            this.toneWobbleGain = context.createGain();
            this.toneWobble.connect(this.toneWobbleGain);
            this.toneWobbleGain.connect(this.tones[1].frequency);
            this.toneWobble.start();
        }

        // Apply the frequencies and effect levels selected for this level.
        applyLevelProfile() {
            const profiles = [
                { frequency: 130, resonance: 1.4, noise: 0.42, tones: [55, 58.27], toneGain: 0.055, wobble: 0.045, depth: 45, toneWobble: 0.07, toneDepth: 1.8 },
                { frequency: 520, resonance: 3.5, noise: 0.24, tones: [73.42, 77.78], toneGain: 0.04, wobble: 0.11, depth: 180, toneWobble: 0.09, toneDepth: 3.5 },
                { frequency: 210, resonance: 2.4, noise: 0.38, tones: [41.2, 43.65], toneGain: 0.07, wobble: 0.06, depth: 60, toneWobble: 0.05, toneDepth: 1.4 }
            ];
            const profile = profiles[this.levelIndex];
            const now = this.context.currentTime;
            this.noiseFilter.Q.setTargetAtTime(profile.resonance, now, 0.5);
            this.noiseFilter.frequency.setTargetAtTime(profile.frequency, now, 0.5);
            this.noiseGain.gain.setTargetAtTime(profile.noise, now, 0.5);
            this.filterWobble.frequency.setTargetAtTime(profile.wobble, now, 0.5);
            this.filterWobbleGain.gain.setTargetAtTime(profile.depth, now, 0.5);
            this.toneWobble.frequency.setTargetAtTime(profile.toneWobble, now, 0.5);
            this.toneWobbleGain.gain.setTargetAtTime(profile.toneDepth, now, 0.5);
            this.tones.forEach((tone, index) => {
                tone.frequency.setTargetAtTime(profile.tones[index], now, 0.8);
                this.toneGains[index].gain.setTargetAtTime(profile.toneGain, now, 0.8);
            });
        }

        // Fade the overall ambience in or out to avoid abrupt volume changes.
        rampMaster(volume) {
            const now = this.context.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(volume, now, 0.35);
        }

        // Keep the audio message in sync with playback state and current level.
        updateControls() {
            const running = this.isRunning();
            const levelNames = ["The Graveyard", "The Witchwood", "The Haunted Keep"];
            this.status.textContent = running
                ? `Eerie ambience playing: ${levelNames[this.levelIndex]}.`
                : "Eerie ambience starts automatically. Interact with the page if your browser blocks autoplay.";
        }
    }