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

    playMinigunShot() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            
            // High-velocity rotary minigun kinetic crack
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2400 + Math.random() * 400, now);
            filter.Q.setValueAtTime(1.5, now);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.035);

            // Fast mechanical rotary clack
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320 + Math.random() * 60, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.03);
            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
        } catch(e) {}
    }

    playGatlingImpact() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx || !this._noiseBuffer) return;
        try {
            const now = this.ctx.currentTime;
            // High-velocity bullet kinetic dirt thud & ricochet snap (NO bomb explosion!)
            const noise = this.ctx.createBufferSource();
            noise.buffer = this._noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(750 + Math.random() * 250, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + 0.05);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.05);
        } catch(e) {}
    }

    playExplosion() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
            if (this.ctx) {
                const now = this.ctx.currentTime;
                
                // 1. Sharp Supersonic Shockwave Crack Transient
                const snapBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
                const snapData = snapBuffer.getChannelData(0);
                for (let i = 0; i < snapData.length; i++) snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
                const snapSource = this.ctx.createBufferSource();
                snapSource.buffer = snapBuffer;
                const snapFilter = this.ctx.createBiquadFilter();
                snapFilter.type = 'bandpass';
                snapFilter.frequency.setValueAtTime(1100, now);
                snapFilter.Q.setValueAtTime(1.8, now);
                const snapGain = this.ctx.createGain();
                snapGain.gain.setValueAtTime(0.75, now);
                snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                snapSource.connect(snapFilter);
                snapFilter.connect(snapGain);
                snapGain.connect(this.ctx.destination);
                snapSource.start(now);

                // 2. Heavy Subterranean Seismic Blast Rumble (Deep Ground Shock - NO pitch slide!)
                const subOsc = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                subOsc.type = 'triangle';
                subOsc.frequency.setValueAtTime(42, now); // Steady seismic sub-bass
                const subFilter = this.ctx.createBiquadFilter();
                subFilter.type = 'lowpass';
                subFilter.frequency.setValueAtTime(95, now);
                subGain.gain.setValueAtTime(0.9, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
                subOsc.connect(subFilter);
                subFilter.connect(subGain);
                subGain.connect(this.ctx.destination);
                subOsc.start(now);
                subOsc.stop(now + 0.9);

                // 3. Rolling Blast Debris & Shockwave Tail
                const tailBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 1.1), this.ctx.sampleRate);
                const tailData = tailBuffer.getChannelData(0);
                for (let i = 0; i < tailData.length; i++) tailData[i] = Math.random() * 2 - 1;
                const tailSource = this.ctx.createBufferSource();
                tailSource.buffer = tailBuffer;
                const tailFilter = this.ctx.createBiquadFilter();
                tailFilter.type = 'lowpass';
                tailFilter.frequency.setValueAtTime(420, now);
                tailFilter.frequency.exponentialRampToValueAtTime(40, now + 1.1);
                const tailGain = this.ctx.createGain();
                tailGain.gain.setValueAtTime(0.65, now);
                tailGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
                tailSource.connect(tailFilter);
                tailFilter.connect(tailGain);
                tailGain.connect(this.ctx.destination);
                tailSource.start(now);
                tailSource.stop(now + 1.15);
                return;
            }
        } catch(e) {}
    }

    playHeavyBomb() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
            if (this.ctx) {
                const now = this.ctx.currentTime;

                // 1. Massive Initial Shockwave Snap
                const snapBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.18), this.ctx.sampleRate);
                const snapData = snapBuffer.getChannelData(0);
                for (let i = 0; i < snapData.length; i++) snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
                const snapSource = this.ctx.createBufferSource();
                snapSource.buffer = snapBuffer;
                const snapFilter = this.ctx.createBiquadFilter();
                snapFilter.type = 'bandpass';
                snapFilter.frequency.setValueAtTime(1400, now);
                snapFilter.Q.setValueAtTime(1.5, now);
                const snapGain = this.ctx.createGain();
                snapGain.gain.setValueAtTime(1.2, now);
                snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                snapSource.connect(snapFilter);
                snapFilter.connect(snapGain);
                snapGain.connect(this.ctx.destination);
                snapSource.start(now);

                // 2. Earth-Shaking Sub-Bass Detonation Core (34 Hz & 48 Hz dual seismic thud - NO drum pitch drops!)
                const subOsc1 = this.ctx.createOscillator();
                const subOsc2 = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                subOsc1.type = 'triangle';
                subOsc2.type = 'sine';
                subOsc1.frequency.setValueAtTime(34, now);
                subOsc2.frequency.setValueAtTime(48, now);
                const subFilter = this.ctx.createBiquadFilter();
                subFilter.type = 'lowpass';
                subFilter.frequency.setValueAtTime(110, now);
                subGain.gain.setValueAtTime(1.4, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                subOsc1.connect(subFilter);
                subOsc2.connect(subFilter);
                subFilter.connect(subGain);
                subGain.connect(this.ctx.destination);
                subOsc1.start(now);
                subOsc2.start(now);
                subOsc1.stop(now + 1.85);
                subOsc2.stop(now + 1.85);

                // 3. Extended Rolling Thunder Echo & Debris Collapse (1.9s)
                const tailBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 1.9), this.ctx.sampleRate);
                const tailData = tailBuffer.getChannelData(0);
                for (let i = 0; i < tailData.length; i++) tailData[i] = Math.random() * 2 - 1;
                const tailSource = this.ctx.createBufferSource();
                tailSource.buffer = tailBuffer;
                const tailFilter = this.ctx.createBiquadFilter();
                tailFilter.type = 'lowpass';
                tailFilter.frequency.setValueAtTime(550, now);
                tailFilter.frequency.exponentialRampToValueAtTime(35, now + 1.9);
                const tailGain = this.ctx.createGain();
                tailGain.gain.setValueAtTime(1.1, now);
                tailGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
                tailSource.connect(tailFilter);
                tailFilter.connect(tailGain);
                tailGain.connect(this.ctx.destination);
                tailSource.start(now);
                tailSource.stop(now + 1.95);
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

    playDogGrowl() {}

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

    playCoin() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                // Pleasant metallic 2-tone coin chime (B5 -> E6)
                const osc1 = this.ctx.createOscillator();
                const gain1 = this.ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(987.77, now);
                gain1.gain.setValueAtTime(0.45, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc1.connect(gain1); gain1.connect(this.ctx.destination);
                osc1.start(now); osc1.stop(now + 0.08);

                const osc2 = this.ctx.createOscillator();
                const gain2 = this.ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1318.51, now + 0.075);
                gain2.gain.setValueAtTime(0.55, now + 0.075);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc2.connect(gain2); gain2.connect(this.ctx.destination);
                osc2.start(now + 0.075); osc2.stop(now + 0.28);
                return;
            }
        } catch(e) {}
        try {
            const sampleRate = 22050;
            const dur = 0.28;
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
                if (t < 0.075) s = Math.sin(2 * Math.PI * 987.77 * t) * 0.6 * (1 - t / 0.075);
                else {
                    const t2 = t - 0.075;
                    s = Math.sin(2 * Math.PI * 1318.51 * t2) * 0.75 * Math.exp(-t2 * 12);
                }
                v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true);
            }
            const url = URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
            const el = new Audio(url); el.volume = 0.9; el.play().catch(() => {});
            setTimeout(() => URL.revokeObjectURL(url), 1500);
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

    playRadioSquelch() {
        if (!Storage.data.sfxEnabled) return;
        try {
            if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
            if (this.ctx) {
                const now = this.ctx.currentTime;
                // 1. Radio Static Squelch burst
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2500;
                filter.Q.value = 3.5;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);

                // 2. Military Chirp Beep
                const osc = this.ctx.createOscillator();
                const beepGain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1750, now + 0.04);
                osc.frequency.exponentialRampToValueAtTime(850, now + 0.09);
                beepGain.gain.setValueAtTime(0.35, now + 0.04);
                beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                osc.connect(beepGain);
                beepGain.connect(this.ctx.destination);
                osc.start(now + 0.04);
                osc.stop(now + 0.09);
            }
        } catch(e) {}
    }

    playAc130RadioChatter(text) {
        // Voice chatter removed as requested
    }

    startAc130EngineSound() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        try {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            if (!this.ctx) return;

            this.stopAc130EngineSound();

            const now = this.ctx.currentTime;
            this.ac130EngineNodes = [];

            // Master Engine Gain Node with smooth cinematic fade-in
            const masterGain = this.ctx.createGain();
            masterGain.gain.setValueAtTime(0.01, now);
            masterGain.gain.linearRampToValueAtTime(0.60, now + 0.4);
            masterGain.connect(this.ctx.destination);
            this.ac130EngineMasterGain = masterGain;

            // 4 Turboprop Engine Frequencies (Allison T56 turboprop 4-blade harmonic phasing)
            const freqs = [55, 58, 62, 65, 116, 124];
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                // Low-pass filter for deep muffled aircraft cabin rumble
                const lp = this.ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 240 + idx * 35;
                lp.Q.value = 2.5;

                gain.gain.value = 0.35 / freqs.length;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(masterGain);

                osc.start(now);
                this.ac130EngineNodes.push(osc);
            });

            // Sub-bass heavy vibration rumble (~38 Hz)
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(38, now);
            subGain.gain.value = 0.45;
            subOsc.connect(subGain);
            subGain.connect(masterGain);
            subOsc.start(now);
            this.ac130EngineNodes.push(subOsc);

            // Propeller Blade Churning / Air Chopping Noise modulated by an LFO
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 160;
            noiseFilter.Q.value = 1.9;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.value = 0.28;

            // LFO for propeller blade pulsation (13.8 Hz prop chop)
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(13.8, now);
            lfoGain.gain.setValueAtTime(0.14, now);

            lfo.connect(noiseGain.gain);
            whiteNoise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);

            whiteNoise.start(now);
            lfo.start(now);
            this.ac130EngineNodes.push(whiteNoise, lfo);
        } catch(e) {}
    }

    stopAc130EngineSound() {
        try {
            if (this.ac130EngineMasterGain && this.ctx) {
                const now = this.ctx.currentTime;
                this.ac130EngineMasterGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
                setTimeout(() => {
                    if (this.ac130EngineNodes) {
                        this.ac130EngineNodes.forEach(node => {
                            try { node.stop(); } catch(e) {}
                            try { node.disconnect(); } catch(e) {}
                        });
                        this.ac130EngineNodes = [];
                    }
                }, 900);
            }
        } catch(e) {}
    }

    pauseAc130EngineSound() {
        try {
            if (this.ac130EngineMasterGain && this.ctx) {
                const now = this.ctx.currentTime;
                this.ac130EngineMasterGain.gain.setValueAtTime(this.ac130EngineMasterGain.gain.value, now);
                this.ac130EngineMasterGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
            }
        } catch(e) {}
    }

    resumeAc130EngineSound() {
        try {
            if (this.ac130EngineMasterGain && this.ctx) {
                const now = this.ctx.currentTime;
                this.ac130EngineMasterGain.gain.setValueAtTime(0.001, now);
                this.ac130EngineMasterGain.gain.linearRampToValueAtTime(0.60, now + 0.2);
            }
        } catch(e) {}
    }

    playMissileLaunch() {
        if (!Storage.data.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            
            // 1. Heavy Rocket Motor Ignition & Supersonic Thruster Hiss
            const bufferSize = Math.floor(this.ctx.sampleRate * 1.6);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(320, now + 1.5);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.70, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 1.55);
            
            // 2. Steady Low-Frequency Combustion Drone (56 Hz steady burner tone)
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(56, now);
            
            const oscFilter = this.ctx.createBiquadFilter();
            oscFilter.type = 'lowpass';
            oscFilter.frequency.setValueAtTime(140, now);
            
            oscGain.gain.setValueAtTime(0.01, now);
            oscGain.gain.linearRampToValueAtTime(0.45, now + 0.08);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
            
            osc.connect(oscFilter);
            oscFilter.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.45);
        } catch(e) {}
    }

    playRadioSquelch() {
        // Disabled radio sound
    }

    playRadioChatter() {
        // Disabled radio sound
    }

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

    playNukeJetSound() {
        this.playSlowJetFlyover();
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
