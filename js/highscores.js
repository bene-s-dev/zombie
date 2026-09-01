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

const DEFAULT_COMMUNITY_HIGHSCORES = [];

function ensureDefaultHighscores() {
    if (!Storage.data || !Storage.data.highscores) {
        Storage.load();
    }
    if (!Storage.data.highscores || !Array.isArray(Storage.data.highscores)) {
        Storage.data.highscores = [];
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
        id: item.id || '',
        name: (item.name || '').toString().trim().toUpperCase().slice(0, 12) || generateRandomPlayerName(),
        time: Number(item.time) || 0,
        wave: Number(item.wave) || 1,
        kills: Number(item.kills) || 0,
        difficulty: item.difficulty || 'medium',
        date: item.date || ''
    }));

    // Sort all entries: Wave (desc), Kills (desc), Time (desc)
    normalized.sort((a, b) => {
        const waveDiff = (Number(b.wave) || 1) - (Number(a.wave) || 1);
        if (waveDiff !== 0) return waveDiff;
        const killDiff = (Number(b.kills) || 0) - (Number(a.kills) || 0);
        if (killDiff !== 0) return killDiff;
        return (Number(b.time) || 0) - (Number(a.time) || 0);
    });

    // Return all entries 1:1 without deduplication
    return normalized;
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
        const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=name,wave,kills,time,difficulty,date,created_at&order=wave.desc,kills.desc,time.desc`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const rawList = await res.json();
            const onlineScores = deduplicateAndSortScores(Array.isArray(rawList) ? rawList : []);

            // Supabase is the single source of truth for online highscores
            Storage.data.highscores = onlineScores;
            Storage.data.highScoreSeconds = onlineScores.length > 0 ? (onlineScores[0].time || 0) : 0;
            Storage.save();

            if (statusDot) statusDot.className = "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
            if (statusText) statusText.innerText = "ONLINE";
        } else {
            throw new Error("HTTP " + res.status);
        }
    } catch (e) {
        console.warn("Using local highscores (Supabase):", e);
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
            if (idx === 0) rankBadge = '<span class="text-amber-400 font-bold drop-shadow">🥇 1.</span>';
            else if (idx === 1) rankBadge = '<span class="text-slate-300 font-bold drop-shadow">🥈 2.</span>';
            else if (idx === 2) rankBadge = '<span class="text-amber-600 font-bold drop-shadow">🥉 3.</span>';
            else rankBadge = `<span class="text-slate-500 font-bold pl-1">${idx + 1}.</span>`;
            
            const em = Math.floor(entry.time / 60).toString().padStart(2, '0');
            const es = (entry.time % 60).toString().padStart(2, '0');
            
            const isMe = !!currentPlayer && entry.name === currentPlayer;
            let rowClass = "border-b border-slate-800/40 hover:bg-slate-800/50 transition-colors";
            if (isMe) {
                rowClass = "border-b border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-colors";
            } else if (idx === 0) {
                rowClass = "border-b border-amber-500/20 bg-amber-950/20 hover:bg-amber-950/40 transition-colors";
            }
            
            const nameColor = isMe ? "text-amber-300 font-black" : (idx === 0 ? "text-amber-100 font-bold" : "text-white font-bold");
            const formattedKills = Number(entry.kills || 0).toLocaleString('de-DE');

            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td class="py-2.5 px-1.5 font-mono whitespace-nowrap">${rankBadge}</td>
                <td class="py-2.5 px-2 tracking-wide uppercase text-[11px] sm:text-xs ${nameColor} truncate max-w-[110px] sm:max-w-none">${entry.name}${isMe ? ' <span class="text-[9px] text-amber-400 font-mono font-normal">(DU)</span>' : ''}</td>
                <td class="py-2.5 px-2 font-mono text-amber-400 text-xs">${em}:${es}</td>
                <td class="py-2.5 px-2 font-mono text-center font-bold text-slate-200 text-xs">${entry.wave}</td>
                <td class="py-2.5 px-2 font-mono text-center text-emerald-400 text-xs">${formattedKills}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function checkHighscoreQualification(wave, kills, sec) {
    const w = Number(wave) || 0;
    return w > 0;
}

let lastSubmittedRunRecord = null;
let activeSubmissionPromise = null;

async function submitHighscore(customName, hideUI = true) {
    if (activeSubmissionPromise) {
        try {
            await activeSubmissionPromise;
        } catch (e) {}
    }

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
        
        const runTime = Number(stats.time) || 0;
        const runWave = Number(stats.wave) || 1;
        const runKills = Number(stats.kills) || 0;
        const runDiff = stats.difficulty || Storage.data.difficulty || 'medium';

        // Check if this run was already submitted earlier
        const isAlreadySubmitted = !!(lastSubmittedRunRecord &&
            lastSubmittedRunRecord.time === runTime &&
            lastSubmittedRunRecord.wave === runWave &&
            lastSubmittedRunRecord.kills === runKills);
        
        // If already submitted and name didn't change, do nothing
        if (isAlreadySubmitted && lastSubmittedRunRecord.name === name && lastSubmittedRunRecord.id) {
            return;
        }

        const prevSubmittedName = isAlreadySubmitted ? lastSubmittedRunRecord.name : null;

        const newEntry = {
            name: name,
            time: runTime,
            wave: runWave,
            kills: runKills,
            difficulty: runDiff,
            date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        };
        
        // Optimistic local update & instant UI render
        let localScores = Storage.data.highscores || [];
        if (isAlreadySubmitted && prevSubmittedName) {
            // Replace previous name in local scores for this exact run
            const existingIdx = localScores.findIndex(e =>
                e.name === prevSubmittedName &&
                e.time === runTime &&
                e.wave === runWave &&
                e.kills === runKills
            );
            if (existingIdx !== -1) {
                localScores[existingIdx] = newEntry;
            } else {
                localScores.push(newEntry);
            }
        } else {
            localScores.push(newEntry);
        }

        localScores = deduplicateAndSortScores(localScores);
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

        const executeNetworkSync = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                
                if (isAlreadySubmitted && lastSubmittedRunRecord && lastSubmittedRunRecord.id) {
                    // Update existing record in Supabase by ID
                    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${lastSubmittedRunRecord.id}`, {
                        method: 'PATCH',
                        signal: controller.signal,
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ name: name })
                    });
                    clearTimeout(timeoutId);

                    if (updateRes.ok) {
                        lastSubmittedRunRecord.name = name;
                        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
                        if (statusText) statusText.innerText = "ONLINE";
                        fetchOnlineHighscores();
                    } else {
                        throw new Error("HTTP " + updateRes.status);
                    }
                } else {
                    // Mark run as being submitted to prevent parallel POST inserts
                    lastSubmittedRunRecord = {
                        id: null,
                        name: name,
                        time: runTime,
                        wave: runWave,
                        kills: runKills
                    };

                    // Insert new record in Supabase and capture assigned ID
                    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(newEntry)
                    });
                    clearTimeout(timeoutId);

                    if (insertRes.ok) {
                        const createdRows = await insertRes.json();
                        const createdId = Array.isArray(createdRows) && createdRows.length > 0 ? createdRows[0].id : null;
                        lastSubmittedRunRecord.id = createdId;
                        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
                        if (statusText) statusText.innerText = "ONLINE";
                        fetchOnlineHighscores();
                    } else {
                        throw new Error("HTTP " + insertRes.status);
                    }
                }
            } catch (e) {
                console.warn("Online Supabase sync error:", e);
                if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-slate-500 mr-1.5";
                if (statusText) statusText.innerText = "LOKAL";
            } finally {
                activeSubmissionPromise = null;
            }
        };

        activeSubmissionPromise = executeNetworkSync();
        await activeSubmissionPromise;
    } else {
        if (hideUI && entryEl) entryEl.classList.add('hidden');
    }
}

async function clearHighscores() {
    if (confirm("Möchtest du wirklich alle lokalen Highscores zurücksetzen?")) {
        Storage.data.highscores = [];
        Storage.data.highScoreSeconds = 0;
        Storage.save();
        updateHighscoreUI();
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

