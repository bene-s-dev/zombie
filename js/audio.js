class SoundEngine {
    constructor() {
        this.ctx = null;
        this.musicInterval = null;
        this._noiseBuffer = null;
    }
    init() {
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            this.ensureNoiseBuffer();
        } catch (e) {
            console.warn("Audio Context init error:", e);
        }
        const atomicEl = document.getElementById('audio-atomic');
        if (atomicEl) {
            try { atomicEl.load(); } catch(e) {}
        }
    }

    ensureNoiseBuffer() {
        if (this._noiseBuffer || !this.ctx) return this._noiseBuffer;
        try {
            const sr = this.ctx.sampleRate || 44100;
            const sz = Math.floor(sr * 0.5);
            this._noiseBuffer = this.ctx.createBuffer(1, sz, sr);
            const data = this._noiseBuffer.getChannelData(0);
            for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1;
        } catch(e) {
            console.warn("Failed to create noise buffer", e);
        }
        return this._noiseBuffer;
    }
    playPistol() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + 0.05);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.05);

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        } catch(e) {}
    }

    playRifle() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + 0.06);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.22, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.06);

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.06);
            oscGain.gain.setValueAtTime(0.35, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch(e) {}
    }

    playShotgun() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(700, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + 0.14);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.45, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.14);

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 0.14);
            oscGain.gain.setValueAtTime(0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch(e) {}
    }

    playTesla() {
        if (!Storage.data.sfxEnabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch(e) {}
    }

    playRocket() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.2);

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
            oscGain.gain.setValueAtTime(0.45, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch(e) {}
    }

    playExplosion() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
            if (this.ctx && this._noiseBuffer) {
                const now = this.ctx.currentTime;
                const noise = this.ctx.createBufferSource();
                noise.buffer = this._noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(650, now);
                filter.frequency.exponentialRampToValueAtTime(45, now + 0.45);
                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(0.7, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.45);

                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(130, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
                oscGain.gain.setValueAtTime(0.75, now);
                oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
                osc.connect(oscGain); oscGain.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.35);
                return;
            }
        } catch(e) {}
        try {
            const sampleRate = 22050;
            const dur = 0.4;
            const n = Math.floor(sampleRate * dur);
            const ab = new ArrayBuffer(44 + n * 2);
            const v = new DataView(ab);
            const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
            ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
            ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
            v.setUint16(20, 1, true); v.setUint16(22, 1, true);
            v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
            v.setUint16(32, 2, true); v.setUint16(34, 16, true);
            ws(36, 'data'); v.setUint32(40, n * 2, true);
            for (let i = 0; i < n; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * 8);
                const noise = (Math.random() * 2 - 1) * 0.8 * env;
                const boom = Math.sin(2 * Math.PI * (120 - t * 200) * t) * 0.7 * env;
                v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, noise + boom)) * 32767), true);
            }
            const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
            const el = new Audio(url); el.volume = 0.9; el.play().catch(() => {});
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch(e) {}
    }

    playHeavyBomb() {
        if (!Storage.data.sfxEnabled) return;
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.85);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1200, now);
                filter.frequency.exponentialRampToValueAtTime(35, now + 0.85);
                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(2.2, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.85);
                noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(this.ctx.destination);
                noise.start(now);

                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(18, now + 0.65);
                oscGain.gain.setValueAtTime(2.0, now);
                oscGain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);
                osc.connect(oscGain); oscGain.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.65);
                return;
            }
        } catch(e) {}
        this.playExplosion();
    }

    playZombieHit() {
        if (!Storage.data.sfxEnabled || !this.ctx) return;
        const nowMs = performance.now();
        if (nowMs - (this._lastZombieHitSound || 0) < 80) return;
        this._lastZombieHitSound = nowMs;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch(e) {}
    }

    playDogBark() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Vocal formant
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(380 + Math.random() * 40, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(350, now + 0.14);
            filter.Q.setValueAtTime(2.5, now);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);

            // Breath/Throat noise burst
            if (this._noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this._noiseBuffer;
                const nFilter = this.ctx.createBiquadFilter();
                nFilter.type = 'lowpass';
                nFilter.frequency.setValueAtTime(900, now);
                nFilter.frequency.exponentialRampToValueAtTime(200, now + 0.12);

                const nGain = this.ctx.createGain();
                nGain.gain.setValueAtTime(0.18, now);
                nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                noise.connect(nFilter);
                nFilter.connect(nGain);
                nGain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.14);
            }
        } catch(e) {}
    }

    playDogGrowl() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(75 + Math.random() * 15, now);
            osc.frequency.linearRampToValueAtTime(65, now + 0.35);

            // LFO for growl shudder
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(22, now);
            lfoGain.gain.setValueAtTime(0.15, now);
            lfo.connect(gain.gain);
            lfo.start(now);
            lfo.stop(now + 0.35);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch(e) {}
    }

    playDogBite() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Snap impact
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);

            // Bite crunch noise
            if (this._noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this._noiseBuffer;
                const nFilter = this.ctx.createBiquadFilter();
                nFilter.type = 'bandpass';
                nFilter.frequency.setValueAtTime(1400, now);
                nFilter.Q.setValueAtTime(1.8, now);

                const nGain = this.ctx.createGain();
                nGain.gain.setValueAtTime(0.3, now);
                nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

                noise.connect(nFilter);
                nFilter.connect(nGain);
                nGain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.07);
            }
        } catch(e) {}
    }

    playConfirmBip() {
        if (!Storage.data.sfxEnabled) return;
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const osc1 = this.ctx.createOscillator();
                const gain1 = this.ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(800, now);
                gain1.gain.setValueAtTime(0.5, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc1.connect(gain1); gain1.connect(this.ctx.destination);
                osc1.start(now); osc1.stop(now + 0.06);

                const osc2 = this.ctx.createOscillator();
                const gain2 = this.ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1200, now + 0.065);
                gain2.gain.setValueAtTime(0.6, now + 0.065);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
                osc2.connect(gain2); gain2.connect(this.ctx.destination);
                osc2.start(now + 0.065); osc2.stop(now + 0.13);
                return;
            }
        } catch(e) {}
        try {
            const sampleRate = 22050;
            const dur = 0.14;
            const n = Math.floor(sampleRate * dur);
            const ab = new ArrayBuffer(44 + n * 2);
            const v = new DataView(ab);
            const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
            ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
            ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
            v.setUint16(20, 1, true); v.setUint16(22, 1, true);
            v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
            v.setUint16(32, 2, true); v.setUint16(34, 16, true);
            ws(36, 'data'); v.setUint32(40, n * 2, true);
            for (let i = 0; i < n; i++) {
                const t = i / sampleRate;
                let s = 0;
                if (t < 0.06) s = Math.sin(2 * Math.PI * 800 * t) * 0.7 * (1 - t / 0.06);
                else if (t >= 0.065 && t < 0.13) {
                    const t2 = t - 0.065;
                    s = Math.sin(2 * Math.PI * 1200 * t2) * 0.8 * (1 - t2 / 0.065);
                }
                v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true);
            }
            const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
            const el = new Audio(url); el.volume = 1.0; el.play().catch(() => {});
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch(e) {}
    }

    playRadioChatter() {}

    playRadioVoice(onCompleteCallback) {
        if (!Storage.data.sfxEnabled) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        this.playConfirmBip();

        const radio = new Audio('radio.mp3');
        radio.volume = 1.0;

        let isCallbackDone = false;
        let hasSkippedSec2to3 = false;
        const finishCallback = () => {
            if (isCallbackDone) return;
            isCallbackDone = true;
            try { radio.pause(); } catch(e) {}
            if (onCompleteCallback) onCompleteCallback();
        };

        radio.play().then(() => {
            radio.volume = 1.0;

            const startTime = performance.now();
            const interval = setInterval(() => {
                if (!hasSkippedSec2to3 && radio.currentTime >= 2.0 && radio.currentTime < 3.5) {
                    hasSkippedSec2to3 = true;
                    try { radio.currentTime = 3.5; } catch(e) {}
                }

                const elapsed = (performance.now() - startTime) / 1000;
                if (elapsed < 7.5) {
                    radio.volume = 1.0;
                } else if (elapsed <= 8.3) {
                    const fadeProgress = (elapsed - 7.5) / 0.8;
                    radio.volume = Math.max(0.0, 1.0 * (1.0 - fadeProgress));
                } else {
                    radio.volume = 0.0;
                    clearInterval(interval);
                    finishCallback();
                }
            }, 50);

            setTimeout(() => {
                clearInterval(interval);
                finishCallback();
            }, 8500);
        }).catch(e => {
            console.log('radio.mp3 play blocked/error', e);
            finishCallback();
        });
    }

    stopJetFlyover() {
        if (this.activeJetNodes) {
            this.activeJetNodes.forEach(node => {
                try { node.stop(); } catch(e) {}
                try { node.disconnect(); } catch(e) {}
            });
            this.activeJetNodes = [];
        }
        if (this.activeJetAudios) {
            this.activeJetAudios.forEach(el => {
                try { el.pause(); } catch(e) {}
            });
            this.activeJetAudios = [];
        }
    }

    suspendAll() {
        this.stopJetFlyover();
        if (this.bgMusic) {
            try { this.bgMusic.pause(); } catch(e) {}
        }
        if (this.ctx && this.ctx.state === 'running') {
            try { this.ctx.suspend(); } catch(e) {}
        }
    }

    resumeAll() {
        if (Storage.data.musicEnabled && this.bgMusic && (!gameInstance || !gameInstance.isPaused)) {
            try { this.bgMusic.play().catch(() => {}); } catch(e) {}
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            try { this.ctx.resume(); } catch(e) {}
        }
    }

    playJetFlyover() {
        if (!Storage.data.sfxEnabled) return;
        if (!this.activeJetNodes) this.activeJetNodes = [];
        if (!this.activeJetAudios) this.activeJetAudios = [];
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const duration = 3.5;
                const bufferSize = Math.floor(this.ctx.sampleRate * duration);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
                const jetNoise = this.ctx.createBufferSource();
                jetNoise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.exponentialRampToValueAtTime(1800, now + 0.5);
                filter.frequency.exponentialRampToValueAtTime(150, now + duration);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.75, now + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                jetNoise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                jetNoise.start(now);
                this.activeJetNodes.push(jetNoise);
                return;
            }
        } catch(e) {}
        try {
            const sampleRate = 22050;
            const dur = 2.5;
            const n = Math.floor(sampleRate * dur);
            const ab = new ArrayBuffer(44 + n * 2);
            const v = new DataView(ab);
            const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
            ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
            ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
            v.setUint16(20, 1, true); v.setUint16(22, 1, true);
            v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
            v.setUint16(32, 2, true); v.setUint16(34, 16, true);
            ws(36, 'data'); v.setUint32(40, n * 2, true);
            for (let i = 0; i < n; i++) {
                const t = i / sampleRate;
                const env = Math.sin(Math.PI * (t / dur));
                const noise = (Math.random() * 2 - 1) * 0.7 * env;
                v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, noise)) * 32767), true);
            }
            const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
            const el = new Audio(url); el.volume = 0.85; el.play().catch(() => {});
            this.activeJetAudios.push(el);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch(e) {}
    }

    playAtomicSound() {
        if (!Storage.data.sfxEnabled) return;
        try {
            let a = document.getElementById('audio-atomic');
            if (!a) {
                a = new Audio('atomic.mp3');
            }
            this.currentAtomicAudio = a;

            const maxVol = 0.10;
            a.pause();
            a.currentTime = 0;
            a.volume = maxVol;
            a.loop = false;

            const setupFade = (audioEl) => {
                audioEl.ontimeupdate = () => {
                    const cur = audioEl.currentTime;
                    if (cur >= 6.5) {
                        try {
                            audioEl.pause();
                            audioEl.currentTime = 0;
                        } catch(e) {}
                        audioEl.ontimeupdate = null;
                    } else if (cur >= 5.0) {
                        const fadeProgress = (cur - 5.0) / 1.5;
                        audioEl.volume = Math.max(0, maxVol * (1.0 - fadeProgress));
                    } else {
                        audioEl.volume = maxVol;
                    }
                };
            };

            setupFade(a);

            const playPromise = a.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    if (this._atomicTimer) clearTimeout(this._atomicTimer);
                    this._atomicTimer = setTimeout(() => {
                        try {
                            a.pause();
                            a.currentTime = 0;
                        } catch(e) {}
                        a.ontimeupdate = null;
                    }, 6500);
                }).catch(err => {
                    console.warn("DOM audio-atomic blocked, trying fallback Audio()", err);
                    const fallback = new Audio('atomic.mp3');
                    fallback.volume = maxVol;
                    fallback.currentTime = 0;
                    this.currentAtomicAudio = fallback;
                    setupFade(fallback);
                    fallback.play().catch(e2 => console.error("Atomic fallback play failed", e2));
                });
            }
        } catch(e) {
            console.error("playAtomicSound error", e);
        }
    }

    startNuclearSiren() {
        if (!Storage.data.sfxEnabled) return;
        this.stopNuclearSiren();
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(350, now);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(90, now);

                let t = 0;
                for (let cycle = 0; cycle < 8; cycle++) {
                    osc.frequency.linearRampToValueAtTime(200, now + t + 3.0);
                    osc.frequency.linearRampToValueAtTime(90, now + t + 6.0);
                    t += 6.0;
                }

                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.8);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);

                this._nukeSirenOsc = osc;
                this._nukeSirenGain = gain;
            }
        } catch(e) {}
    }

    stopNuclearSiren() {
        if (this.currentAtomicAudio) {
            try {
                this.currentAtomicAudio.pause();
                this.currentAtomicAudio.currentTime = 0;
            } catch(e) {}
        }

        if (this._nukeSirenGain && this.ctx) {
            try {
                const now = this.ctx.currentTime;
                this._nukeSirenGain.gain.setValueAtTime(this._nukeSirenGain.gain.value, now);
                this._nukeSirenGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
                setTimeout(() => {
                    try { if (this._nukeSirenOsc) this._nukeSirenOsc.stop(); } catch(e) {}
                    this._nukeSirenOsc = null;
                    this._nukeSirenGain = null;
                }, 350);
            } catch(e) {
                this._nukeSirenOsc = null;
                this._nukeSirenGain = null;
            }
        }
    }

    playSlowJetFlyover() {
        if (!Storage.data.sfxEnabled) return;
        if (!this.activeJetNodes) this.activeJetNodes = [];
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const duration = 4.5;
                const bufferSize = Math.floor(this.ctx.sampleRate * duration);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
                const jetNoise = this.ctx.createBufferSource();
                jetNoise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(250, now);
                filter.frequency.exponentialRampToValueAtTime(1400, now + 1.2);
                filter.frequency.exponentialRampToValueAtTime(120, now + duration);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(1.8, now + 1.2);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                jetNoise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                jetNoise.start(now);
                this.activeJetNodes.push(jetNoise);
            }
        } catch(e) {}
    }

    playHeavyAtomicExplosion() {
        if (!Storage.data.sfxEnabled) return;
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                const duration = 9.5;

                const punchOsc = this.ctx.createOscillator();
                const punchGain = this.ctx.createGain();
                punchOsc.type = 'triangle';
                punchOsc.frequency.setValueAtTime(180, now);
                punchOsc.frequency.exponentialRampToValueAtTime(20, now + 0.18);
                punchGain.gain.setValueAtTime(2.6, now);
                punchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
                punchOsc.connect(punchGain);
                punchGain.connect(this.ctx.destination);
                punchOsc.start(now);
                punchOsc.stop(now + 0.18);

                const subOsc1 = this.ctx.createOscillator();
                const subOsc2 = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                
                subOsc1.type = 'sine';
                subOsc2.type = 'sawtooth';
                subOsc1.frequency.setValueAtTime(65, now);
                subOsc1.frequency.exponentialRampToValueAtTime(8, now + duration);
                subOsc2.frequency.setValueAtTime(45, now);
                subOsc2.frequency.exponentialRampToValueAtTime(6, now + duration);

                const subFilter = this.ctx.createBiquadFilter();
                subFilter.type = 'lowpass';
                subFilter.frequency.setValueAtTime(220, now);

                subGain.gain.setValueAtTime(2.8, now);
                subGain.gain.linearRampToValueAtTime(1.8, now + 0.5);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                subOsc1.connect(subFilter);
                subOsc2.connect(subFilter);
                subFilter.connect(subGain);
                subGain.connect(this.ctx.destination);

                subOsc1.start(now);
                subOsc2.start(now);
                subOsc1.stop(now + duration);
                subOsc2.stop(now + duration);

                const bufferSize = Math.floor(this.ctx.sampleRate * duration);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = buffer.getChannelData(0);
                const sampleRate = this.ctx.sampleRate;

                for (let i = 0; i < bufferSize; i++) {
                    const t = i / sampleRate;
                    const echoMod = 1.0 + 0.35 * Math.sin(Math.PI * 2 * 1.8 * t) * Math.exp(-t * 0.4);
                    const raw = (Math.random() * 2 - 1);
                    output[i] = raw * echoMod;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(3200, now);
                noiseFilter.frequency.exponentialRampToValueAtTime(18, now + duration);
                noiseFilter.Q.setValueAtTime(4.0, now);

                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(3.2, now);
                noiseGain.gain.linearRampToValueAtTime(1.6, now + 0.6);
                noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.ctx.destination);

                noise.start(now);
                noise.stop(now + duration);
            }
        } catch(e) {}
    }

    startMusic() {
        if (!Storage.data.musicEnabled) return;
        if (!this.bgMusic) {
            this.bgMusic = new Audio('music.mp3');
            this.bgMusic.loop = true;
            this.bgMusic.volume = 0.18;
        }
        this.bgMusic.play().catch(e => console.log("Music playback error", e));
    }

    stopMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
    }

    fadeMusicVolume(targetVolume, durationMs = 450) {
        if (!this.bgMusic) return;
        if (this.musicFadeInterval) clearInterval(this.musicFadeInterval);

        const startVolume = this.bgMusic.volume;
        const startTime = performance.now();

        this.musicFadeInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1.0, elapsed / durationMs);

            this.bgMusic.volume = startVolume + (targetVolume - startVolume) * progress;

            if (progress >= 1.0) {
                clearInterval(this.musicFadeInterval);
            }
        }, 30);
    }

    duckMusic() {
        this.fadeMusicVolume(0.04, 450);
    }

    unduckMusic() {
        this.fadeMusicVolume(0.45, 450);
    }
}

const audio = new SoundEngine();
