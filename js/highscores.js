function ensureDefaultHighscores() {
    if (!Storage.data.highscores || !Array.isArray(Storage.data.highscores) || Storage.data.highscores.length === 0) {
        Storage.data.highscores = [
            { name: "APEX_PREDATOR", time: 745, wave: 18, kills: 480, difficulty: "hard", date: "12.08" },
            { name: "COMMANDER_MAX", time: 610, wave: 14, kills: 395, difficulty: "normal", date: "12.08" },
            { name: "SHADOW_SLAYER", time: 480, wave: 11, kills: 270, difficulty: "normal", date: "11.08" },
            { name: "ZOMBIE_HUNTER", time: 320, wave: 7, kills: 185, difficulty: "easy", date: "10.08" },
            { name: "RECRUIT_99", time: 195, wave: 4, kills: 92, difficulty: "normal", date: "09.08" }
        ];
        Storage.data.highScoreSeconds = 745;
        Storage.save();
    }
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

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (tableWrapper) tableWrapper.classList.add('hidden');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(ONLINE_API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const json = await res.json();
            const rawList = json && json.data && Array.isArray(json.data.highscores) ? json.data.highscores : (Array.isArray(json) ? json : []);
            if (rawList.length > 0) {
                const onlineScores = rawList.map(item => ({
                    name: item.name || 'SPIELER',
                    time: Number(item.time) || 0,
                    wave: Number(item.wave) || 1,
                    kills: Number(item.kills) || 0,
                    difficulty: item.difficulty || 'normal',
                    date: item.date || ''
                }));

                const allScores = [...(Storage.data.highscores || []), ...onlineScores];
                const uniqueScores = [];
                const seen = new Set();
                allScores.forEach(s => {
                    const key = `${s.name}_${s.time}_${s.wave}_${s.kills}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueScores.push(s);
                    }
                });

                uniqueScores.sort((a, b) => b.wave !== a.wave ? b.wave - a.wave : (b.kills !== a.kills ? b.kills - a.kills : b.time - a.time));
                Storage.data.highscores = uniqueScores.slice(0, 10);
                if (Storage.data.highscores.length > 0) {
                    Storage.data.highScoreSeconds = Math.max(Storage.data.highScoreSeconds || 0, Storage.data.highscores[0].time);
                }
                Storage.save();
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
    const maxWave = list.length > 0 ? list[0].wave : 1;
    const menuHighscoreEl = document.getElementById('menu-highscore');
    if (menuHighscoreEl) menuHighscoreEl.innerText = `Welle ${maxWave}`;
    
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
        list.forEach((entry, idx) => {
            let rankBadge = '';
            if (idx === 0) rankBadge = '<span class="text-amber-400 font-bold">🥇 1.</span>';
            else if (idx === 1) rankBadge = '<span class="text-slate-300 font-bold">🥈 2.</span>';
            else if (idx === 2) rankBadge = '<span class="text-amber-600 font-bold">🥉 3.</span>';
            else rankBadge = `<span class="text-slate-500 font-bold ml-1">${idx + 1}.</span>`;
            
            const em = Math.floor(entry.time / 60).toString().padStart(2, '0');
            const es = (entry.time % 60).toString().padStart(2, '0');
            
            let diffText = 'M';
            let diffClass = 'text-amber-500';
            if (entry.difficulty === 'easy') {
                diffText = 'L';
                diffClass = 'text-emerald-400';
            } else if (entry.difficulty === 'hard') {
                diffText = 'S';
                diffClass = 'text-rose-500';
            }
            
            const row = document.createElement('tr');
            row.className = "border-b border-slate-900/60 hover:bg-slate-800/40 transition-colors";
            row.innerHTML = `
                <td class="py-2 px-1 font-mono">${rankBadge}</td>
                <td class="py-2 px-2 font-bold text-white tracking-wide uppercase text-[10px] sm:text-xs">${entry.name}</td>
                <td class="py-2 px-2 font-mono text-amber-400">${em}:${es}</td>
                <td class="py-2 px-2 font-mono text-center text-slate-300">${entry.wave}</td>
                <td class="py-2 px-2 font-mono text-center text-emerald-400">${entry.kills}</td>
                <td class="py-2 px-1 text-center font-bold text-[10px] sm:text-xs ${diffClass}" title="${entry.difficulty}">${diffText}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function checkHighscoreQualification(wave, kills, sec) {
    if (wave <= 0) return false;
    const list = Storage.data.highscores || [];
    if (list.length < 10) return true;
    const last = list[list.length - 1];
    if (wave > last.wave) return true;
    if (wave === last.wave && kills > last.kills) return true;
    if (wave === last.wave && kills === last.kills && sec > last.time) return true;
    return false;
}

async function submitHighscore() {
    const nameInput = document.getElementById('hs-player-name');
    if (!nameInput) return;
    let name = nameInput.value.trim().toUpperCase();
    if (!name) name = 'SPIELER';
    
    Storage.data.lastPlayerName = name;
    
    if (window.lastRunStats) {
        const newEntry = {
            name: name,
            time: window.lastRunStats.time,
            wave: window.lastRunStats.wave,
            kills: window.lastRunStats.kills,
            difficulty: window.lastRunStats.difficulty,
            date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        };
        
        let scores = Storage.data.highscores || [];
        scores.push(newEntry);
        scores.sort((a, b) => b.wave !== a.wave ? b.wave - a.wave : (b.kills !== a.kills ? b.kills - a.kills : b.time - a.time));
        scores = scores.slice(0, 10);
        Storage.data.highscores = scores;
        if (scores.length > 0) {
            Storage.data.highScoreSeconds = Math.max(Storage.data.highScoreSeconds || 0, scores[0].time);
        }
        Storage.save();
        updateHighscoreUI();
        
        const statusDot = document.getElementById('online-status-dot');
        const statusText = document.getElementById('online-status-text');
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1.5";
        if (statusText) statusText.innerText = "SENDEN...";

        try {
            const updatedScores = Storage.data.highscores || [];
            await fetch(ONLINE_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: "Zombie Game Highscores",
                    data: { highscores: updatedScores }
                })
            });
            if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5";
            if (statusText) statusText.innerText = "ONLINE";
        } catch (e) {
            console.warn("Online sync error:", e);
            if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-slate-500 mr-1.5";
            if (statusText) statusText.innerText = "LOKAL";
        }
    }
    
    const entryEl = document.getElementById('highscore-entry');
    if (entryEl) entryEl.classList.add('hidden');
}

function clearHighscores() {
    if (confirm("Möchtest du wirklich alle Highscores zurücksetzen?")) {
        Storage.data.highscores = [];
        Storage.data.highScoreSeconds = 0;
        Storage.save();
        ensureDefaultHighscores();
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

