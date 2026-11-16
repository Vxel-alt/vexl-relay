class VexlAudioEngine {
    constructor() {
        this.ctx = null;
        this.gains = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // 1. Soft Rain
        const rainSource = this.createNoiseNode('white');
        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.value = 1000;
        rainFilter.Q.value = 0.5;

        const rainGain = this.ctx.createGain();
        rainGain.gain.value = 0;
        rainSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(this.ctx.destination);
        rainSource.start();
        this.gains['rain'] = rainGain;

        // 2. Brown Noise
        const noiseSource = this.createNoiseNode('brown');
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSource.start();
        this.gains['noise'] = noiseGain;

        // 3. Vinyl Crackle
        const vinylSource = this.createNoiseNode('white');
        const vinylFilter = this.ctx.createBiquadFilter();
        vinylFilter.type = 'highpass';
        vinylFilter.frequency.value = 3000;
        const vinylGain = this.ctx.createGain();
        vinylGain.gain.value = 0;
        vinylSource.connect(vinylFilter);
        vinylFilter.connect(vinylGain);
        vinylGain.connect(this.ctx.destination);
        vinylSource.start();
        this.gains['vinyl'] = vinylGain;

        // 4. Library Hum
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55;
        const libGain = this.ctx.createGain();
        libGain.gain.value = 0;
        osc.connect(libGain);
        libGain.connect(this.ctx.destination);
        osc.start();
        this.gains['library'] = libGain;

        this.isInitialized = true;
    }

    createNoiseNode(type) {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'brown') {
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            } else {
                output[i] = white * 0.2;
            }
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        return noise;
    }

    setVolume(track, percent) {
        if (!this.isInitialized) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (this.gains[track]) {
            const normalized = percent / 100;
            this.gains[track].gain.linearRampToValueAtTime(normalized * 0.15, this.ctx.destination.context.currentTime + 0.1);
        }
    }

    playChime() {
        if (!this.isInitialized) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
    }

    muteAll() {
        Object.keys(this.gains).forEach(key => {
            this.gains[key].gain.setValueAtTime(0, this.ctx.destination.context.currentTime);
        });
    }
}

window.vexlAudio = new VexlAudioEngine();