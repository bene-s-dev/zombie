const RANDOM_NAME_PREFIXES = [
    'VIPER', 'GHOST', 'HUNTER', 'SHADOW', 'ALPHA', 'TITAN', 'SURVIVOR', 'RAVEN',
    'EAGLE', 'RECON', 'WOLF', 'STORM', 'SPECTRE', 'VALKYRIE', 'HAWK', 'BLAZE',
    'STRIKER', 'PHANTOM', 'CYPHER', 'APEX', 'NOVA', 'ROGUE', 'SENTINEL', 'FALCON'
];

function generateRandomPlayerName() {
    const prefix = RANDOM_NAME_PREFIXES[Math.floor(Math.random() * RANDOM_NAME_PREFIXES.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${prefix}-${num}`;
}

const DEFAULT_COMMUNITY_HIGHSCORES = [
    { name: 'ZOMBIEBERGER', wave: 28, kills: 3367, time: 1759, difficulty: 'medium' },
    { name: 'OPPI 3', wave: 28, kills: 2574, time: 1193, difficulty: 'medium' },
    { name: 'OPPI 2', wave: 27, kills: 2276, time: 1048, difficulty: 'medium' },
    { name: 'OPPI', wave: 25, kills: 2466, time: 1125, difficulty: 'medium' },
    { name: 'HERETODIE', wave: 21, kills: 1744, time: 1021, difficulty: 'medium' },
    { name: 'HERETODIE', wave: 19, kills: 1216, time: 943, difficulty: 'medium' },
    { name: 'HERETODIE', wave: 14, kills: 798, time: 672, difficulty: 'medium' },
    { name: 'VIPER-07', wave: 12, kills: 620, time: 540, difficulty: 'medium' }
];

function ensureDefaultHighscores() {
    if (!Storage.data || !Storage.data.highscores) {
        Storage.load();
    }
    if (!Storage.data.highscores || !Array.isArray(Storage.data.highscores) || Storage.data.highscores.length === 0) {
        Storage.data.highscores = [...DEFAULT_COMMUNITY_HIGHSCORES];
        Storage.save();
    }
    if (Storage.data.customPlayerName === undefined) {
        if (Storage.data.lastPlayerName && Storage.data.lastPlayerName !== 'SPIELER') {
            Storage.data.customPlayerName = Storage.data.lastPlayerName;
        } else {
            Storage.data.customPlayerName = '';
        }
        Storage.save();
    }
}

function setPlayerName(name) {
    let clean = (name || '').toString().trim().toUpperCase().slice(0, 12);
    Storage.data.customPlayerName = clean;
    Storage.data.lastPlayerName = clean;
    Storage.save();
    
    ['menu-player-name', 'hs-player-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== clean) el.value = clean;
    });
}

function randomizeMenuPlayerName() {
    const newName = generateRandomPlayerName();
    setPlayerName(newName);
    if (typeof audio !== 'undefined' && audio.playCoin) audio.playCoin();
}

function isRunBetter(a, b) {
    if (!b) return true;
    if (!a) return false;
    const waveA = Number(a.wave) || 1;
    const waveB = Number(b.wave) || 1;
    if (waveA !== waveB) return waveA > waveB;

    const killsA = Number(a.kills) || 0;
    const killsB = Number(b.kills) || 0;
    if (killsA !== killsB) return killsA > killsB;

    const timeA = Number(a.time) || 0;
    const timeB = Number(b.time) || 0;
    return timeA > timeB;
}

function deduplicateAndSortScores(list) {
    if (!Array.isArray(list)) return [];
    const normalized = list.map(item => ({
        name: (item.name || '').toString().trim().toUpperCase().slice(0, 12) || generateRandomPlayerName(),
        time: Number(item.time) || 0,
        wave: Number(item.wave) || 1,
        kills: Number(item.kills) || 0,
        difficulty: item.difficulty || 'medium',
        date: item.date || ''
    }));

    // Deduplicate exact duplicate runs (same name + wave + kills + time + date)
    const uniqueScores = [];
    const seen = new Set();
    for (const score of normalized) {
        const key = `${score.name}_${score.wave}_${score.kills}_${score.time}_${score.date}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueScores.push(score);
        }
    }

    // Sort all entries: Wave (desc), Kills (desc), Time (desc)
    uniqueScores.sort((a, b) => {
        const waveDiff = (Number(b.wave) || 1) - (Number(a.wave) || 1);
        if (waveDiff !== 0) return waveDiff;
        const killDiff = (Number(b.kills) || 0) - (Number(a.kills) || 0);
        if (killDiff !== 0) return killDiff;
        return (Number(b.time) || 0) - (Number(a.time) || 0);
    });

    // Exactly Top 30 total
    return uniqueScores.slice(0, 30);
}

let isSyncingHighscores = false;

async function fetchOnlineHighscores() {
    if (isSyncingHighscores) return;
    isSyncingHighscores = true;
    ensureDefaultHighscores();

    const statusDot = document.getElementById('online-status-dot');
    const statusText = document.getElementById('online-status-text');
    const loadingEl = document.getElementById('highscore-list-loading');
    const emptyEl = document.getElementById('highscore-list-empty');
    const tableWrapper = document.getElementById('highscore-list-table-wrapper');

    if (statusDot) statusDot.className = "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping mr-1.5";
    if (statusText) statusText.innerText = "LÄDT...";

    const currentScores = Storage.data.highscores || [];
    if (loadingEl && currentScores.length === 0) {
        loadingEl.classList.remove('hidden');
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(ONLINE_API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const json = await res.json();
            const rawList = json && json.data && Array.isArray(json.data.highscores) ? json.data.highscores : (Array.isArray(json) ? json : []);
            
            // Merge online scores with existing local scores (Top 30)
            const localScores = Storage.data.highscores || [];
            const merged = deduplicateAndSortScores([...rawList, ...localScores]);

            Storage.data.highscores = merged;
            if (merged.length > 0) {
                Storage.data.highScoreSeconds = Math.max(Storage.data.highScoreSeconds || 0, merged[0].time);
            }
            Storage.save();

            // Background sync if cleaned/merged list differs from raw server list
            if (JSON.stringify(merged) !== JSON.stringify(rawList)) {
                fetch(ONLINE_API_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: "Zombie Game Highscores",
                        data: { highscores: merged }
                    })
                }).catch(() => {});
            }

            if (statusDot) statusDot.className = "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
            if (statusText) statusText.innerText = "ONLINE";
        } else {
            throw new Error("HTTP " + res.status);
        }
    } catch (e) {
        console.warn("Using local highscores:", e);
        if (statusDot) statusDot.className = "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-500 mr-1.5";
        if (statusText) statusText.innerText = "LOKAL";
    } finally {
        isSyncingHighscores = false;
        if (loadingEl) loadingEl.classList.add('hidden');
        updateHighscoreUI();
    }
}

function updateHighscoreUI() {
    ensureDefaultHighscores();
    const list = Storage.data.highscores || [];
    const maxWave = list.length > 0 ? list[0].wave : 0;
    const bestSeconds = list.length > 0 ? list[0].time : 0;
    const menuHighscoreEl = document.getElementById('menu-highscore');
    if (menuHighscoreEl) {
        if (maxWave > 0) {
            const bm = Math.floor(bestSeconds / 60).toString().padStart(2, '0');
            const bs = (bestSeconds % 60).toString().padStart(2, '0');
            menuHighscoreEl.innerText = `Welle ${maxWave} (${bm}:${bs})`;
        } else {
            menuHighscoreEl.innerText = 'Kein Rekord';
        }
    }

    const menuNameInput = document.getElementById('menu-player-name');
    if (menuNameInput) {
        menuNameInput.value = Storage.data.customPlayerName || '';
    }
    
    const tbody = document.getElementById('highscore-list-body');
    const emptyEl = document.getElementById('highscore-list-empty');
    const tableWrapper = document.getElementById('highscore-list-table-wrapper');
    
    if (!tbody) return;
    
    if (list.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (tableWrapper) tableWrapper.classList.add('hidden');
    } else {
        if (emptyEl) emptyEl.classList.add('hidden');
        if (tableWrapper) tableWrapper.classList.remove('hidden');
        
        tbody.innerHTML = '';
        const currentPlayer = (Storage.data.customPlayerName || Storage.data.lastPlayerName || '').trim().toUpperCase();
        
        list.forEach((entry, idx) => {
            let rankBadge = '';
            if (idx === 0) rankBadge = '<span class="text-amber-400 font-bold">🥇 1.</span>';
            else if (idx === 1) rankBadge = '<span class="text-slate-300 font-bold">🥈 2.</span>';
            else if (idx === 2) rankBadge = '<span class="text-amber-600 font-bold">🥉 3.</span>';
            else rankBadge = `<span class="text-slate-500 font-bold ml-1">${idx + 1}.</span>`;
            
            const em = Math.floor(entry.time / 60).toString().padStart(2, '0');
            const es = (entry.time % 60).toString().padStart(2, '0');
            
            const isMe = !!currentPlayer && entry.name === currentPlayer;
            const rowClass = isMe
                ? "border-b border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                : "border-b border-slate-900/60 hover:bg-slate-800/40 transition-colors";
            
            const nameColor = isMe ? "text-amber-300 font-black" : "text-white font-bold";

            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td class="py-2 px-1 font-mono">${rankBadge}</td>
                <td class="py-2 px-2 tracking-wide uppercase text-[10px] sm:text-xs ${nameColor}">${entry.name}${isMe ? ' <span class="text-[9px] text-amber-400 font-mono font-normal">(DU)</span>' : ''}</td>
                <td class="py-2 px-2 font-mono text-amber-400">${em}:${es}</td>
                <td class="py-2 px-2 font-mono text-center text-slate-300">${entry.wave}</td>
                <td class="py-2 px-2 font-mono text-center text-emerald-400">${entry.kills}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function checkHighscoreQualification(wave, kills, sec) {
    const w = Number(wave) || 0;
    if (w <= 0) return false;
    const list = Storage.data.highscores || [];
    const currentRun = { wave: w, kills: Number(kills) || 0, time: Number(sec) || 0 };

    if (list.length < 30) return true;
    const last = list[list.length - 1];
    return isRunBetter(currentRun, last);
}

async function submitHighscore(customName, hideUI = true) {
    const entryEl = document.getElementById('highscore-entry');
    const nameInput = document.getElementById('hs-player-name');
    
    let rawName = customName !== undefined && customName !== null ? customName : (nameInput ? nameInput.value : '');
    if (!rawName && Storage.data.customPlayerName) {
        rawName = Storage.data.customPlayerName;
    }
    
    let name = (rawName || '').toString().trim().toUpperCase().slice(0, 12);
    if (!name || name === 'SPIELER') {
        name = generateRandomPlayerName();
    } else {
        Storage.data.customPlayerName = name;
        Storage.data.lastPlayerName = name;
        Storage.save();
    }
    
    if (nameInput && Storage.data.customPlayerName) {
        nameInput.value = Storage.data.customPlayerName;
    }
    
    const menuNameInput = document.getElementById('menu-player-name');
    if (menuNameInput && Storage.data.customPlayerName) {
        menuNameInput.value = Storage.data.customPlayerName;
    }
    
    if (window.lastRunStats) {
        const stats = window.lastRunStats;
        if (hideUI && entryEl) {
            entryEl.classList.add('hidden');
        }
        
        const newEntry = {
            name: name,
            time: Number(stats.time) || 0,
            wave: Number(stats.wave) || 1,
            kills: Number(stats.kills) || 0,
            difficulty: stats.difficulty || Storage.data.difficulty || 'medium',
            date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        };
        
        // Optimistic local update & instant UI render
        let localScores = Storage.data.highscores || [];
        localScores = deduplicateAndSortScores([...localScores, newEntry]);
        Storage.data.highscores = localScores;
        if (localScores.length > 0) {
            Storage.data.highScoreSeconds = Math.max(Storage.data.highScoreSeconds || 0, localScores[0].time);
        }
        Storage.save();
        updateHighscoreUI();
        
        const statusDot = document.getElementById('online-status-dot');
        const statusText = document.getElementById('online-status-text');
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1.5";
        if (statusText) statusText.innerText = "SENDEN...";

        try {
            let latestOnline = [];
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                const fetchRes = await fetch(ONLINE_API_URL, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (fetchRes.ok) {
                    const json = await fetchRes.json();
                    const raw = json && json.data && Array.isArray(json.data.highscores) ? json.data.highscores : (Array.isArray(json) ? json : []);
                    latestOnline = raw;
                }
            } catch (e) {
                console.warn("Could not fetch latest before sync, using local merged list:", e);
            }
            
            const merged = deduplicateAndSortScores([...latestOnline, ...localScores, newEntry]);
            Storage.data.highscores = merged;
            if (merged.length > 0) {
                Storage.data.highScoreSeconds = Math.max(Storage.data.highScoreSeconds || 0, merged[0].time);
            }
            Storage.save();
            updateHighscoreUI();

            await fetch(ONLINE_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: "Zombie Game Highscores",
                    data: { highscores: merged }
                })
            });
            if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
            if (statusText) statusText.innerText = "ONLINE";
        } catch (e) {
            console.warn("Online sync error:", e);
            if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-slate-500 mr-1.5";
            if (statusText) statusText.innerText = "LOKAL";
        }
    } else {
        if (hideUI && entryEl) entryEl.classList.add('hidden');
    }
}

async function clearHighscores() {
    if (confirm("Möchtest du wirklich alle Highscores zurücksetzen?")) {
        Storage.data.highscores = [];
        Storage.data.highScoreSeconds = 0;
        Storage.save();
        updateHighscoreUI();

        try {
            await fetch(ONLINE_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: "Zombie Game Highscores",
                    data: { highscores: [] }
                })
            });
        } catch (e) {
            console.warn("Could not clear online scores:", e);
        }
    }
}

// Auto-sync online highscores on initial start screen load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fetchOnlineHighscores();
    });
} else {
    fetchOnlineHighscores();
}

