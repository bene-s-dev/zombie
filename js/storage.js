const Storage = {
    KEY: 'zombie_siege_3d_profile_v1',
    SESSION_KEY: 'zombie_siege_3d_saved_session_v1',
    data: {
        highScoreSeconds: 0,
        difficulty: 'medium',
        musicEnabled: true,
        sfxEnabled: true,
        swapTouchControls: true,
        cameraZoom: 1.0,
        cameraAngle: 0.5,
        extraAc130Enabled: true,
        extraAirstrikeEnabled: true,
        extraNukeEnabled: true,
        highscores: [],
        lastPlayerName: '',
        customPlayerName: ''
    },
    load() {
        try {
            const saved = localStorage.getItem(this.KEY);
            if (saved) {
                this.data = { ...this.data, ...JSON.parse(saved) };
            }
            if (this.data.swapTouchControls === undefined) this.data.swapTouchControls = true;
            if (this.data.extraAc130Enabled === undefined) this.data.extraAc130Enabled = true;
            if (this.data.extraAirstrikeEnabled === undefined) this.data.extraAirstrikeEnabled = true;
            if (this.data.extraNukeEnabled === undefined) this.data.extraNukeEnabled = true;
            if (!this.data.highscores) this.data.highscores = [];
            if (this.data.customPlayerName === undefined) {
                this.data.customPlayerName = (this.data.lastPlayerName && this.data.lastPlayerName !== 'SPIELER') ? this.data.lastPlayerName : '';
            }
        } catch(e) { console.error("Could not load save profile", e); }
        return this.data;
    },
    save() {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(this.data));
        } catch(e) { console.error("Could not save profile", e); }
    },
    saveSession(sessionData) {
        try {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        } catch(e) { console.error("Could not save game session", e); }
    },
    loadSession() {
        try {
            const saved = localStorage.getItem(this.SESSION_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch(e) { return null; }
    },
    clearSession() {
        try {
            localStorage.removeItem(this.SESSION_KEY);
        } catch(e) {}
    }
};
