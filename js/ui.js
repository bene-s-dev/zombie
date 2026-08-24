let activeShopTab = 'weapons';
let gameInstance = null;
let isShopOpen = false;

const savedData = Storage.load();
const mainMusicToggle = document.getElementById('toggle-music');
if (mainMusicToggle) mainMusicToggle.checked = savedData.musicEnabled;
const mainSfxToggle = document.getElementById('toggle-sfx');
if (mainSfxToggle) mainSfxToggle.checked = savedData.sfxEnabled;
if (document.getElementById('cam-zoom')) document.getElementById('cam-zoom').value = savedData.cameraZoom;
if (document.getElementById('cam-angle')) document.getElementById('cam-angle').value = savedData.cameraAngle;

function toggleAudio(type, enabled) {
    if (type === 'music') {
        Storage.data.musicEnabled = enabled;
        if (!enabled) {
            if (typeof audio !== 'undefined') audio.stopMusic();
        } else if (gameInstance && !gameInstance.isGameOver && !gameInstance.isPaused) {
            if (typeof audio !== 'undefined') audio.startMusic();
        }
    } else if (type === 'sfx') {
        Storage.data.sfxEnabled = enabled;
    }
    Storage.save();
    ['toggle-music', 'pause-toggle-music'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = Storage.data.musicEnabled;
    });
    ['toggle-sfx', 'pause-toggle-sfx'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = Storage.data.sfxEnabled;
    });
}

function toggleExtra(extraType, enabled) {
    if (extraType === 'ac130') {
        Storage.data.extraAc130Enabled = !!enabled;
    } else if (extraType === 'airstrike') {
        Storage.data.extraAirstrikeEnabled = !!enabled;
    } else if (extraType === 'nuke') {
        Storage.data.extraNukeEnabled = !!enabled;
    }
    Storage.save();
    syncExtrasUI();
    updateTacticalExtrasHUD();
}

function setAllExtras(enabled) {
    Storage.data.extraAc130Enabled = !!enabled;
    Storage.data.extraAirstrikeEnabled = !!enabled;
    Storage.data.extraNukeEnabled = !!enabled;
    Storage.save();
    syncExtrasUI();
    updateTacticalExtrasHUD();
}

function syncExtrasUI() {
    const ac130 = Storage.data.extraAc130Enabled !== false;
    const airstrike = Storage.data.extraAirstrikeEnabled !== false;
    const nuke = Storage.data.extraNukeEnabled !== false;

    const elMenuAc130 = document.getElementById('menu-extra-ac130');
    if (elMenuAc130) elMenuAc130.checked = ac130;
    const elMenuAirstrike = document.getElementById('menu-extra-airstrike');
    if (elMenuAirstrike) elMenuAirstrike.checked = airstrike;
    const elMenuNuke = document.getElementById('menu-extra-nuke');
    if (elMenuNuke) elMenuNuke.checked = nuke;

    const elPauseAc130 = document.getElementById('pause-extra-ac130');
    if (elPauseAc130) elPauseAc130.checked = ac130;
    const elPauseAirstrike = document.getElementById('pause-extra-airstrike');
    if (elPauseAirstrike) elPauseAirstrike.checked = airstrike;
    const elPauseNuke = document.getElementById('pause-extra-nuke');
    if (elPauseNuke) elPauseNuke.checked = nuke;
}

function updateTacticalExtrasHUD() {
    const ac130 = Storage.data.extraAc130Enabled !== false;
    const airstrike = Storage.data.extraAirstrikeEnabled !== false;
    const nuke = Storage.data.extraNukeEnabled !== false;

    const btnAc130 = document.getElementById('hud-ac130-btn');
    if (btnAc130) {
        if (ac130) btnAc130.classList.remove('hidden');
        else btnAc130.classList.add('hidden');
    }

    const btnAirstrike = document.getElementById('hud-airstrike-btn');
    if (btnAirstrike) {
        if (airstrike) btnAirstrike.classList.remove('hidden');
        else btnAirstrike.classList.add('hidden');
    }

    const btnNuke = document.getElementById('hud-nuke-btn');
    if (btnNuke) {
        if (nuke) btnNuke.classList.remove('hidden');
        else btnNuke.classList.add('hidden');
    }

    const dock = document.getElementById('hud-tactical-skills');
    if (dock) {
        if (!ac130 && !airstrike && !nuke) {
            dock.classList.add('hidden');
        } else {
            dock.classList.remove('hidden');
        }
    }
}

syncExtrasUI();
updateTacticalExtrasHUD();

        let previewScene, previewCamera, previewRenderer, previewPlayer;
        function initCameraPreview() {
            const container = document.getElementById('cam-preview-container');
            if (!container) return;
            
            const width = container.clientWidth || 300;
            const height = container.clientHeight || 96;

            if (!previewRenderer) {
                previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                previewRenderer.setSize(width, height);
                container.appendChild(previewRenderer.domElement);

                previewScene = new THREE.Scene();
                const light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(5, 10, 5);
                previewScene.add(light);
                previewScene.add(new THREE.AmbientLight(0xffffff, 0.5));

                previewCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);

                const mat = new THREE.MeshStandardMaterial({color: 0x0284c7});
                previewPlayer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), mat);
                previewScene.add(previewPlayer);
                
                const gridHelper = new THREE.GridHelper(10, 10, 0x475569, 0x1e293b);
                gridHelper.position.y = -1;
                previewScene.add(gridHelper);
            } else {
                previewRenderer.setSize(width, height);
                previewCamera.aspect = width / height;
                previewCamera.updateProjectionMatrix();
            }

            updateCameraPreview();
        }

        let _camSaveTimeout = null;
        function updateCameraPreview() {
            const zoomEl = document.getElementById('cam-zoom');
            const angleEl = document.getElementById('cam-angle');
            if (!zoomEl || !angleEl) return;

            const zoom = parseFloat(zoomEl.value);
            const angle = parseFloat(angleEl.value);
            
            Storage.data.cameraZoom = zoom;
            Storage.data.cameraAngle = angle;

            const label = document.getElementById('cam-angle-label');
            if (label) {
                if (angle >= 0.98) label.innerText = '84° Vogelpersp.';
                else if (angle <= 0.02) label.innerText = '28° 3D Flach';
                else label.innerText = `${Math.round(28 + angle * 56)}°`;
            }
            
            if (_camSaveTimeout) clearTimeout(_camSaveTimeout);
            _camSaveTimeout = setTimeout(() => { Storage.save(); }, 300);

            if (previewCamera && previewRenderer) {
                const dist = 14 * zoom;
                const pitchDeg = 28.0 + (angle * 56.0);
                const pitchRad = (pitchDeg * Math.PI) / 180;
                previewCamera.position.set(0, dist * Math.sin(pitchRad), dist * Math.cos(pitchRad));
                previewCamera.lookAt(0, 0, 0);
                previewRenderer.render(previewScene, previewCamera);
            }

            if (gameInstance) {
                gameInstance.updateCameraSettings();
            }
        }

        const SHARED_BULLET_GEO = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 6);
        SHARED_BULLET_GEO.rotateX(Math.PI / 2);

        const SHARED_PARTICLE_GEO = new THREE.BoxGeometry(0.15, 0.15, 0.15);

        function checkWallCollision(px, pz, entityRadius, wall) {
            const wWidth = wall.userData.wWidth || 3.6;
            const wDepth = wall.userData.wDepth || 1.0;
            if (wall.userData._cos === undefined) {
                const rot = wall.rotation.y;
                wall.userData._cos = Math.cos(-rot);
                wall.userData._sin = Math.sin(-rot);
            }

            const dx = px - wall.position.x;
            const dz = pz - wall.position.z;

            const localX = dx * wall.userData._cos - dz * wall.userData._sin;
            const localZ = dx * wall.userData._sin + dz * wall.userData._cos;

            return Math.abs(localX) < (wWidth * 0.5 + entityRadius) && Math.abs(localZ) < (wDepth * 0.5 + entityRadius);
        }


        function triggerEarlyWave() {
            if (!gameInstance) return;
            gameInstance.triggerEarlyWave();
        }

        function switchShopTab(tabId) {
            activeShopTab = tabId;
            const inactiveClass = "shop-tab-btn px-1.5 py-2 sm:px-3 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1.5 text-center min-h-[40px] transition";
            const activeClass = "shop-tab-btn px-1.5 py-2 sm:px-3 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs bg-red-600 text-white flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1.5 text-center min-h-[40px] transition shadow-lg shadow-red-950/40";

            document.querySelectorAll('.shop-tab-btn').forEach(btn => {
                btn.className = inactiveClass;
            });
            document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.add('hidden'));

            const activeBtn = document.getElementById(`tab-btn-${tabId}`);
            if (activeBtn) activeBtn.className = activeClass;

            const activeContent = document.getElementById(`shop-tab-${tabId}`);
            if (activeContent) activeContent.classList.remove('hidden');

            renderShopCatalog();
        }

        function renderShopCatalog() {
            if (!gameInstance) return;

            const weaponsContainer = document.getElementById('shop-weapons-container');
            weaponsContainer.innerHTML = '';

            Object.values(WEAPONS).forEach(w => {
                const isUnlocked = gameInstance.unlockedWeapons.includes(w.id);
                const isEquipped = gameInstance.currentWeapon.id === w.id;
                const lvl = gameInstance.weaponLevels[w.id] || 1;
                const upgradeCost = Math.round(w.cost * 0.7 * lvl) || 120;
                const currentDmg = Math.round(w.damage * (1 + (lvl - 1) * 0.35));
                const canAffordBuy = gameInstance.money >= w.cost;
                const canAffordUpgrade = gameInstance.money >= upgradeCost;

                const card = document.createElement('div');
                card.className = `p-4 rounded-2xl border flex justify-between items-center ${isEquipped ? 'bg-amber-950/30 border-amber-500' : 'bg-slate-950 border-slate-800'}`;

                card.innerHTML = `
                    <div>
                        <div class="font-bold text-white text-sm flex items-center space-x-2">
                            <span>${w.name}</span>
                            ${isUnlocked ? `<span class="bg-slate-800 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded-full">Lvl ${lvl}</span>` : ''}
                        </div>
                        <div class="text-xs text-slate-400 mt-1">Schaden: ${currentDmg} | Cadence: ${w.firerate}ms</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${isUnlocked ? `
                            <button onclick="upgradeWeapon('${w.id}')" ${canAffordUpgrade ? '' : 'disabled'} class="px-3 py-2 ${canAffordUpgrade ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-lg text-xs font-bold flex items-center space-x-1 min-h-[36px] transition">
                                <i class="fa-solid fa-arrow-up"></i><span>+$${upgradeCost}</span>
                            </button>
                            <button onclick="equipWeapon('${w.id}')" class="px-3 py-2 ${isEquipped ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 cursor-default' : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'} rounded-lg text-xs font-bold min-h-[36px]">
                                ${isEquipped ? 'Aktiv' : 'Wählen'}
                            </button>
                        ` : `
                            <button onclick="buyWeapon('${w.id}')" ${canAffordBuy ? '' : 'disabled'} class="px-4 py-2 ${canAffordBuy ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-lg text-xs font-bold min-h-[36px] transition">$${w.cost}</button>
                        `}
                    </div>
                `;
                weaponsContainer.appendChild(card);
            });

            const turretsContainer = document.getElementById('shop-turrets-container');
            if (turretsContainer) {
                turretsContainer.innerHTML = '';
                Object.values(TURRET_TYPES).forEach(t => {
                    const canAfford = gameInstance.money >= t.cost;
                    const card = document.createElement('div');
                    card.className = "p-4 rounded-2xl border bg-slate-950 border-slate-800 flex justify-between items-center";
                    let statsLine = '';
                    if (t.isHangar) {
                        statsLine = `<div class="text-[10px] text-emerald-400 font-mono mt-0.5"><i class="fa-solid fa-satellite-dish mr-1"></i>3x Drohnen | Global (Unbegrenzte Reichweite) | Reparatur ~225 HP/s</div>`;
                    } else if (t.isLightMast) {
                        statsLine = `<div class="text-[10px] text-amber-300 font-mono mt-0.5"><i class="fa-solid fa-lightbulb mr-1"></i>360° Rundum-LED-Flutlicht | Leuchtradius: ${t.range}m | Nacht-Beleuchtung</div>`;
                    } else {
                        statsLine = `<div class="text-[10px] text-amber-400 font-mono mt-0.5">Dmg: ${t.damage} | Reichweite: ${t.range}m | Kadenz: ${t.firerate}ms</div>`;
                    }
                    card.innerHTML = `
                        <div class="pr-2">
                            <div class="font-bold text-white text-sm">${t.name}</div>
                            <div class="text-xs text-slate-400 mt-1">${t.desc}</div>
                            ${statsLine}
                        </div>
                        <button onclick="startBuildPlacement('turret', '${t.id}')" ${canAfford ? '' : 'disabled'} class="px-4 py-2 ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-lg text-xs font-bold flex items-center space-x-1 min-h-[36px] flex-shrink-0 transition">
                            <i class="fa-solid fa-hammer text-xs"></i>
                            <span>Bauen $${t.cost}</span>
                        </button>
                    `;
                    turretsContainer.appendChild(card);
                });
            }

            let activeUpgradeCategory = window.activeUpgradeCategory || 'all';

            function setUpgradeCategory(cat) {
                window.activeUpgradeCategory = cat;
                ['all', 'player', 'hq', 'companion'].forEach(c => {
                    const btn = document.getElementById(`upg-cat-${c}`);
                    if (!btn) return;
                    if (c === cat) {
                        btn.className = "upg-cat-btn flex-1 min-w-[70px] py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-600 text-white transition flex items-center justify-center space-x-1 shadow-md shadow-amber-950/40";
                    } else {
                        btn.className = "upg-cat-btn flex-1 min-w-[70px] py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex items-center justify-center space-x-1";
                    }
                });
                renderShopCatalog();
            }
            window.setUpgradeCategory = setUpgradeCategory;

            const upgradesContainer = document.getElementById('shop-upgrades-container');
            if (upgradesContainer) {
                upgradesContainer.innerHTML = '';
                const cat = window.activeUpgradeCategory || 'all';

                // Helper to create Section Headers
                const createSectionHeader = (icon, title, colorClass) => {
                    const h = document.createElement('div');
                    h.className = `col-span-1 sm:col-span-2 text-xs font-bold ${colorClass} uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-1.5 pt-2`;
                    h.innerHTML = `<i class="${icon}"></i><span>${title}</span>`;
                    return h;
                };

                // Helper to create Upgrade Cards
                const createUpgradeCard = (key, upg) => {
                    const currentLvl = (key === 'companion_dog') ? Math.max(1, gameInstance.upgrades[key] || 1) : (gameInstance.upgrades[key] || 0);
                    const cost = getUpgradeCost(key, currentLvl);
                    const isMax = currentLvl >= upg.maxLevel;
                    const canAfford = gameInstance.money >= cost;
                    const isDisabled = isMax || !canAfford;

                    let descText = upg.desc;
                    if (key === 'companion_dog') {
                        const currentDmg = 50 + (currentLvl * 28);
                        if (currentLvl < upg.maxLevel) {
                            const nextDmg = 50 + ((currentLvl + 1) * 28);
                            descText = `Dein treuer K9-Begleiter kämpft an deiner Seite! (Aktuell: <b>${currentDmg} Dmg / Biss</b>). Nächste Stufe: <b>${nextDmg} Dmg</b>, schnelleres Anstürmen & stärkere Verlangsamung!`;
                        } else {
                            const maxDmg = 50 + (currentLvl * 28);
                            descText = `MAX-STUFE: K9-Alpha-Rudelführer (<b>${maxDmg} Dmg</b>, maximaler Sprungradius, Verlangsamung & Reißbiss).`;
                        }
                    } else if (key === 'scavenger') {
                        const totalBonusPct = Math.round((Math.pow(1.035, currentLvl) - 1) * 100);
                        descText = `Erhöht erbeutetes Geld pro Zombie um +3.5% multiplikativ pro Stufe (Aktueller Bonus: <b>+${totalBonusPct}%</b>, unbegrenzt)`;
                    }

                    const card = document.createElement('div');
                    card.className = "p-3.5 rounded-2xl border bg-slate-950 border-slate-800 flex justify-between items-center hover:border-slate-700 transition";
                    card.innerHTML = `
                        <div class="pr-2">
                            <div class="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
                                <span>${upg.name}</span>
                                <span class="bg-slate-800 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded-full">Lvl ${currentLvl}${upg.maxLevel === Infinity ? '' : '/' + upg.maxLevel}</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1 leading-snug">${descText}</div>
                        </div>
                        <button onclick="buyUpgrade('${key}')" ${isDisabled ? 'disabled' : ''} class="px-3.5 py-2 ${isDisabled ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40 cursor-pointer'} rounded-xl text-xs font-bold min-h-[36px] flex-shrink-0 transition">
                            ${isMax ? 'MAX' : '$' + cost}
                        </button>
                    `;
                    return card;
                };

                // --- 1. SPIELER KATEGORIE ---
                if (cat === 'player' || cat === 'all') {
                    if (cat === 'all') upgradesContainer.appendChild(createSectionHeader('fa-solid fa-person-rifle', '👤 Überlebender & Spieler-Status', 'text-cyan-400'));

                    // Medkit Sofortheilung
                    const canHeal = gameInstance.playerHp < gameInstance.maxPlayerHp && gameInstance.money >= 80;
                    const healCard = document.createElement('div');
                    healCard.className = "p-3.5 rounded-2xl border bg-slate-950 border-emerald-900/40 flex justify-between items-center";
                    healCard.innerHTML = `
                        <div class="pr-2">
                            <div class="font-bold text-emerald-400 text-xs sm:text-sm flex items-center space-x-1.5">
                                <i class="fa-solid fa-kit-medical"></i><span>Medkit Sofortheilung</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Stellt volle Spieler-HP wieder her.</div>
                        </div>
                        <button onclick="healPlayer()" ${canHeal ? '' : 'disabled'} class="px-3.5 py-2 ${canHeal ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-xl text-xs font-bold min-h-[36px] flex-shrink-0 transition">$80</button>
                    `;
                    upgradesContainer.appendChild(healCard);

                    // Player Upgrades
                    ['player_hp', 'player_speed', 'scavenger'].forEach(key => {
                        if (UPGRADES[key]) upgradesContainer.appendChild(createUpgradeCard(key, UPGRADES[key]));
                    });
                }

                // --- 2. HQ & BASIS KATEGORIE ---
                if (cat === 'hq' || cat === 'all') {
                    if (cat === 'all') upgradesContainer.appendChild(createSectionHeader('fa-solid fa-building-shield', '🏰 Hauptquartier & Basis-Verteidigung', 'text-sky-400'));

                    // Basis Sofort-Reparatur
                    const canRepair = gameInstance.baseHp < gameInstance.maxBaseHp && gameInstance.money >= 120;
                    const repairCard = document.createElement('div');
                    repairCard.className = "p-3.5 rounded-2xl border bg-slate-950 border-sky-900/40 flex justify-between items-center";
                    repairCard.innerHTML = `
                        <div class="pr-2">
                            <div class="font-bold text-sky-400 text-xs sm:text-sm flex items-center space-x-1.5">
                                <i class="fa-solid fa-wrench"></i><span>Basis Schnell-Reparatur (+600 HP)</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Stellt Basis-Gesundheit im Notfall wieder her.</div>
                        </div>
                        <button onclick="repairBase()" ${canRepair ? '' : 'disabled'} class="px-3.5 py-2 ${canRepair ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-xl text-xs font-bold min-h-[36px] flex-shrink-0 transition">$120</button>
                    `;
                    upgradesContainer.appendChild(repairCard);

                    // HQ Upgrades
                    ['base_hp', 'auto_repair', 'base_spikes'].forEach(key => {
                        if (UPGRADES[key]) upgradesContainer.appendChild(createUpgradeCard(key, UPGRADES[key]));
                    });
                }

                // --- 3. BEGLEITER & DROHNEN KATEGORIE ---
                if (cat === 'companion' || cat === 'all') {
                    if (cat === 'all') upgradesContainer.appendChild(createSectionHeader('fa-solid fa-dog', '🐾 Kampf-Begleiter & Drohnen', 'text-emerald-400'));

                    ['companion_dog', 'combat_drone'].forEach(key => {
                        if (UPGRADES[key]) upgradesContainer.appendChild(createUpgradeCard(key, UPGRADES[key]));
                    });
                }
            }
        }

        function confirmPlacement() {
            if (!gameInstance) return;
            gameInstance.confirmPlacement();
        }

        function startBuildPlacement(kind, specId) {
            if (!gameInstance) return;
            const spec = kind === 'turret' ? TURRET_TYPES[specId] : WALL_TYPES[specId];
            if (!spec || gameInstance.money < spec.cost) return;
            gameInstance.startPlacementMode(kind, specId);
        }

        function rotatePlacement() {
            if (!gameInstance || !gameInstance.isPlacementMode || !gameInstance.ghostMesh) return;
            gameInstance.placementRotation = ((gameInstance.placementRotation || 0) + Math.PI / 4) % (Math.PI * 2);
            gameInstance.ghostMesh.rotation.y = gameInstance.placementRotation;
            if (gameInstance.pointerWorldPos) {
                gameInstance.updateGhostPosition(gameInstance.ghostMesh.position.x, gameInstance.ghostMesh.position.z);
            }
        }

        function cancelPlacement() {
            if (!gameInstance) return;
            gameInstance.cancelPlacement();
        }

        function closeInspectModal(e) {
            if (e) {
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
                if (typeof e.preventDefault === 'function') e.preventDefault();
            }
            const modal = document.getElementById('inspect-modal');
            if (modal) modal.classList.add('hidden');
            if (gameInstance) {
                gameInstance.selectedStructure = null;
                gameInstance.ignoreNextSelectionUntil = Date.now() + 250;
                if (!gameInstance.isPlacementMode && !isShopOpen && !isPauseModalOpen) {
                    gameInstance.isPaused = false;
                }
            }
            if (typeof updateMusicDucking === 'function') {
                updateMusicDucking();
            }
        }

        function applyTurretLevelUpgrades(struct, targetLevel) {
            if (!struct || !struct.userData || !struct.userData.isTurret) return;
            const ud = struct.userData;
            const currentLvl = ud.level || 1;
            if (targetLevel <= currentLvl) return;

            for (let lvl = currentLvl + 1; lvl <= targetLevel; lvl++) {
                ud.level = lvl;
                // High-impact upgrades: +85% dmg, +16% firerate, +3.5m range, +45% HP
                // For rocket turrets: Damage scales powerfully (+85%), while explosion radius (splashRadius) remains constant
                if (ud.isLightMast) {
                    ud.range += 6.0;
                    if (ud.lightSource) {
                        ud.lightSource.distance = ud.range + 8;
                        ud.lightSource.intensity *= 1.25;
                    }
                    if (ud.groundGlow) {
                        ud.groundGlow.scale.multiplyScalar(1.15);
                    }
                } else {
                    ud.damage = Math.round(ud.damage * 1.85);
                    ud.firerate = Math.max(70, Math.round(ud.firerate * 0.84));
                    ud.range += 3.5;
                }
                const hpBonus = Math.round(ud.maxHp * 0.45);
                ud.maxHp += hpBonus;
                ud.hp += hpBonus;

                if (ud.head) {
                    ud.head.scale.multiplyScalar(1.06);

                    const ringMat = new THREE.MeshBasicMaterial({ 
                        color: lvl % 2 === 0 ? 0x06b6d4 : 0xfacc15 
                    });
                    const levelRing = new THREE.Mesh(
                        new THREE.TorusGeometry(1.2 + lvl * 0.04, 0.06, 8, 16),
                        ringMat
                    );
                    levelRing.rotation.x = Math.PI / 2;
                    levelRing.position.y = 0.2 + lvl * 0.22;
                    struct.add(levelRing);

                    if (lvl === 2) {
                        const armorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
                        const plateL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.8), armorMat);
                        plateL.position.set(-0.65, 0, 0);
                        const plateR = plateL.clone();
                        plateR.position.set(0.65, 0, 0);
                        ud.head.add(plateL);
                        ud.head.add(plateR);
                    } 
                    else if (lvl === 3) {
                        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 });
                        const topBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9), barrelMat);
                        topBarrel.rotation.x = Math.PI / 2;
                        topBarrel.position.set(0, 0.38, 0.6);
                        ud.head.add(topBarrel);
                    }
                }
            }
        }

        function upgradeSelectedStructure() {
            if (!gameInstance || !gameInstance.selectedStructure) return;
            const struct = gameInstance.selectedStructure;
            const ud = struct.userData;
            if (!ud.isTurret) return;

            const cost = Math.round(ud.totalInvested * 0.80);
            if (gameInstance.money >= cost) {
                gameInstance.money -= cost;
                applyTurretLevelUpgrades(struct, ud.level + 1);
                ud.totalInvested += cost;

                gameInstance.syncHUD();
                gameInstance.inspectStructure(gameInstance.selectedStructure);
                showPurchaseToast(`⚡ Turm auf Level ${ud.level} aufgewertet!`);
            }
        }

        function repairSelectedStructure() {
            if (!gameInstance || !gameInstance.selectedStructure) return;
            const ud = gameInstance.selectedStructure.userData;

            let repairCost = 0;
            if (ud.isTurret) {
                repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);
            } else if (ud.isWall) {
                repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.6);
            }

            if (repairCost > 0 && gameInstance.money >= repairCost) {
                gameInstance.money -= repairCost;
                ud.hp = ud.maxHp;
                gameInstance.syncHUD();
                gameInstance.inspectStructure(gameInstance.selectedStructure);
            }
        }

        function sellSelectedStructure() {
            if (!gameInstance || !gameInstance.selectedStructure) return;
            const struct = gameInstance.selectedStructure;
            const ud = struct.userData;

            const refund = Math.round(ud.totalInvested * 0.7);
            gameInstance.money += refund;

            if (ud.activeDronesList && Array.isArray(ud.activeDronesList)) {
                ud.activeDronesList.forEach(d => {
                    gameInstance.scene.remove(d);
                });
                ud.activeDronesList = [];
            }

            if (ud.isTurret) {
                const idx = gameInstance.turrets.indexOf(struct);
                if (idx !== -1) gameInstance.turrets.splice(idx, 1);
            } else if (ud.isWall) {
                const idx = gameInstance.walls.indexOf(struct);
                if (idx !== -1) gameInstance.walls.splice(idx, 1);
            }

            gameInstance.scene.remove(struct);
            gameInstance.syncHUD();
            closeInspectModal();
        }

        function updateMusicDucking() {
            const intelModal = document.getElementById('intel-modal');
            const isIntelOpen = intelModal && !intelModal.classList.contains('hidden');
            const isPausedAny = isShopOpen || isPauseModalOpen || isIntelOpen || (gameInstance && (gameInstance.isPaused || gameInstance.isGameOver));

            if (isPausedAny) {
                audio.duckMusic();
                audio.stopJetFlyover();
            } else {
                audio.unduckMusic();
            }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Only auto-pause when page is truly hidden (tab switch, phone lock)
                if (gameInstance && gameInstance.isRunning && !gameInstance.isGameOver) {
                    if (!isPauseModalOpen) togglePauseModal();
                    else gameInstance.isPaused = true;
                }
                audio.suspendAll();
            } else {
                // Resume audio when page becomes visible again
                if (!isShopOpen && !isPauseModalOpen && gameInstance && !gameInstance.isPaused) {
                    audio.resumeAll();
                }
            }
        });

        // NOTE: window.blur intentionally removed — on mobile/touch devices it fires on
        // every HUD button tap, causing unwanted pause menu, music cutoff and fullscreen exit.
        window.addEventListener('focus', () => {
            // Resume audio on refocus (e.g. after notification, without opening pause menu)
            if (!isShopOpen && !isPauseModalOpen && gameInstance && !gameInstance.isPaused) {
                audio.resumeAll();
            }
        });

        function closeIntelModal() {
            const modal = document.getElementById('intel-modal');
            if (modal) modal.classList.add('hidden');
            if (gameInstance && !isShopOpen && !isPauseModalOpen && !gameInstance.isPlacementMode) {
                gameInstance.isPaused = false;
            }
            updateMusicDucking();
        }

        function triggerAc130() {
            if (Storage.data.extraAc130Enabled === false) return;
            if (gameInstance) {
                gameInstance.triggerAc130();
                gameInstance.saveGameSession();
            }
        }

        function triggerAirstrike() {
            if (Storage.data.extraAirstrikeEnabled === false) return;
            if (gameInstance) {
                gameInstance.triggerAirstrike();
                gameInstance.saveGameSession();
            }
        }

        function triggerNuke() {
            if (Storage.data.extraNukeEnabled === false) return;
            if (gameInstance) {
                gameInstance.triggerNuke();
                gameInstance.saveGameSession();
            }
        }

        let isPauseModalOpen = false;

        function updatePauseSaveStatus() {
            const statusText = document.getElementById('pause-save-status-text');
            if (!statusText) return;
            const session = Storage.loadSession();
            if (session && session.savedAtFormatted) {
                statusText.innerText = `Zuletzt: ${session.savedAtFormatted}`;
            } else if (session && session.savedAtTime) {
                const timeStr = new Date(session.savedAtTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                statusText.innerText = `Zuletzt: ${timeStr}`;
            } else {
                statusText.innerText = "Noch nicht gespeichert";
            }
        }

        function manualSaveInPauseMenu() {
            if (!gameInstance || gameInstance.isGameOver) return;
            gameInstance.saveGameSession();
            updatePauseSaveStatus();

            const btnText = document.getElementById('pause-save-now-btn-text');
            const btn = document.getElementById('pause-save-now-btn');
            if (btnText) btnText.innerText = "GESPEICHERT!";
            if (btn) btn.className = "px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg border border-emerald-400 flex items-center space-x-1.5 transition scale-105";

            setTimeout(() => {
                if (btnText) btnText.innerText = "JETZT SPEICHERN";
                if (btn) btn.className = "px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 active:bg-emerald-600 text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/40 flex items-center space-x-1.5 transition";
            }, 1500);
        }

        function togglePauseModal() {
            if (!gameInstance || gameInstance.isGameOver) return;
            isPauseModalOpen = !isPauseModalOpen;
            gameInstance.isPaused = isPauseModalOpen || isShopOpen || gameInstance.isPlacementMode;

            const modal = document.getElementById('pause-modal');
            if (isPauseModalOpen) {
                if (gameInstance.isAc130Active && typeof audio !== 'undefined' && audio.pauseAc130EngineSound) {
                    audio.pauseAc130EngineSound();
                }
                gameInstance.saveGameSession();
                updatePauseSaveStatus();
                document.getElementById('pause-toggle-music').checked = Storage.data.musicEnabled;
                document.getElementById('pause-toggle-sfx').checked = Storage.data.sfxEnabled;
                syncExtrasUI();
                updateTouchSwapUI();
                updateEnvironmentThemeUI();
                modal.classList.remove('hidden');
                setTimeout(() => { initCameraPreview(); }, 50);
            } else {
                modal.classList.add('hidden');
                if (gameInstance.isAc130Active && typeof audio !== 'undefined' && audio.resumeAc130EngineSound) {
                    audio.resumeAc130EngineSound();
                }
            }
            updateMusicDucking();
        }

        function toggleEnvironmentTheme() {
            const current = Storage.data.environmentTheme || 'tactical';
            const next = current === 'tactical' ? 'classic' : 'tactical';
            Storage.data.environmentTheme = next;
            Storage.save();
            updateEnvironmentThemeUI();
            if (gameInstance && typeof gameInstance.setEnvironmentTheme === 'function') {
                gameInstance.setEnvironmentTheme(next);
            }
            if (typeof showPurchaseToast === 'function') {
                showPurchaseToast(next === 'tactical' ? '🎨 Taktischer Look aktiviert!' : '🎨 Classic Clean Look aktiviert!');
            }
        }

        function updateEnvironmentThemeUI() {
            const theme = Storage.data.environmentTheme || 'tactical';
            const statusText = document.getElementById('pause-theme-status-text');
            const btnText = document.getElementById('pause-theme-btn-text');
            if (statusText) {
                statusText.innerText = (theme === 'tactical') ? "Taktisch (Neu & Detailliert)" : "Classic Clean (Retro-Gitter)";
            }
            if (btnText) {
                btnText.innerText = (theme === 'tactical') ? "CLEANER LOOK" : "NEUER LOOK";
            }
        }

        function surrenderGame() {
            if (!gameInstance || gameInstance.isGameOver) return;
            if (confirm("Möchtest du die Operation beenden und deine Truppen evakuieren? Dein Highscore wird abgespeichert.")) {
                if (isPauseModalOpen) togglePauseModal();
                gameInstance.triggerGameOver('surrender');
            }
        }

        function toggleTouchSwap() {
            Storage.data.swapTouchControls = !Storage.data.swapTouchControls;
            Storage.save();
            updateTouchSwapUI();
        }

        function updateTouchSwapUI() {
            const isSwapped = Storage.data.swapTouchControls;
            const label = document.getElementById('pause-touch-swap-label');
            if (label) {
                label.innerText = isSwapped ? "Joystick links / Feuer rechts" : "Joystick rechts / Feuer links";
            }
        }

        function returnToMainMenu() {
            const hsEntry = document.getElementById('highscore-entry');
            if (hsEntry && !hsEntry.classList.contains('hidden') && window.lastRunStats && typeof submitHighscore === 'function') {
                submitHighscore();
            }
            if (isPauseModalOpen) togglePauseModal();
            if (isShopOpen) toggleShop();
            const goModal = document.getElementById('game-over-modal');
            if (goModal) goModal.classList.add('hidden');

            if (gameInstance) {
                if (!gameInstance.isGameOver) gameInstance.saveGameSession();
                gameInstance.isRunning = false;
                clearInterval(gameInstance.secondTimer);
                clearInterval(gameInstance.spawnTimer);
                clearInterval(gameInstance.turretTimer);
            }
            audio.stopMusic();

            document.getElementById('game-hud').classList.add('hidden');
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
                mainMenu.style.display = 'flex';
                mainMenu.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
            }
            updateMainMenuResumeButton();
            if (typeof fetchOnlineHighscores === 'function') {
                fetchOnlineHighscores();
            }
        }

        function toggleShop(explicitState) {
            isShopOpen = explicitState !== undefined ? explicitState : !isShopOpen;
            const shopModal = document.getElementById('shop-modal');
            if (gameInstance) {
                gameInstance.isPaused = isShopOpen || isPauseModalOpen || gameInstance.isPlacementMode;
                if (isShopOpen) gameInstance.saveGameSession();
            }
            if (isShopOpen) {
                renderShopCatalog();
                shopModal.classList.remove('hidden');
            } else {
                shopModal.classList.add('hidden');
            }
            updateMusicDucking();
        }

        function showPurchaseToast(msg) {
            audio.playCoin();

            let toast = document.getElementById('shop-purchase-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'shop-purchase-toast';
                toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[150] bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-2xl flex items-center space-x-1.5 transition-all duration-300 transform -translate-y-4 opacity-0 pointer-events-none';
                document.body.appendChild(toast);
            }

            toast.innerHTML = `<i class="fa-solid fa-circle-check text-base"></i> <span>${msg}</span>`;
            toast.classList.remove('-translate-y-4', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            if (window.shopToastTimeout) clearTimeout(window.shopToastTimeout);
            window.shopToastTimeout = setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('-translate-y-4', 'opacity-0');
            }, 1600);
        }

        function showWarningToast(msg) {
            let toast = document.getElementById('game-warning-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'game-warning-toast';
                toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-rose-600 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-2xl flex items-center space-x-1.5 transition-all duration-300 transform -translate-y-4 opacity-0 pointer-events-none';
                document.body.appendChild(toast);
            }
            toast.innerHTML = `<i class="fa-solid fa-coins text-base animate-bounce"></i> <span>${msg}</span>`;
            toast.classList.remove('-translate-y-4', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            if (window.warningToastTimeout) clearTimeout(window.warningToastTimeout);
            window.warningToastTimeout = setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('-translate-y-4', 'opacity-0');
            }, 1600);
        }

        function buyWeapon(id) {
            if (!gameInstance) return;
            const w = WEAPONS[id];
            if (!w || gameInstance.money < w.cost) return;

            gameInstance.money -= w.cost;
            gameInstance.unlockedWeapons.push(id);
            gameInstance.currentWeapon = w;
            gameInstance.syncHUD();
            renderShopCatalog();
            gameInstance.saveGameSession();
            showPurchaseToast(`${w.name} gekauft & ausgerüstet!`);
            if (typeof audio !== 'undefined' && typeof audio.playCoin === 'function') audio.playCoin();
        }

        function upgradeWeapon(id) {
            if (!gameInstance) return;
            const w = WEAPONS[id];
            if (!w) return;
            const lvl = gameInstance.weaponLevels[id] || 1;
            const cost = Math.round(w.cost * 0.7 * lvl) || 120;

            if (lvl >= w.maxLevel || gameInstance.money < cost) return;

            gameInstance.money -= cost;
            gameInstance.weaponLevels[id] = lvl + 1;
            gameInstance.syncHUD();
            renderShopCatalog();
            gameInstance.saveGameSession();
            showPurchaseToast(`${w.name} auf Level ${lvl + 1} verbessert!`);
            if (typeof audio !== 'undefined' && typeof audio.playCoin === 'function') audio.playCoin();
        }

        function equipWeapon(id) {
            if (!gameInstance) return;
            gameInstance.currentWeapon = WEAPONS[id];
            gameInstance.syncHUD();
            renderShopCatalog();
            showPurchaseToast(`${WEAPONS[id].name} ausgerüstet`);
        }

        function getUpgradeCost(key, currentLvl) {
            const upg = UPGRADES[key];
            if (!upg) return 0;
            if (key === 'companion_dog') {
                return Math.round(upg.costBase * Math.pow(1.6, Math.max(0, currentLvl - 1)));
            }
            if (key === 'scavenger') {
                return Math.round(upg.costBase * Math.pow(1.40, currentLvl));
            }
            return Math.round(upg.costBase * Math.pow(1.6, currentLvl));
        }

        function buyUpgrade(key) {
            if (!gameInstance) return;
            const upg = UPGRADES[key];
            if (!upg) return;
            const currentLvl = (key === 'companion_dog') ? Math.max(1, gameInstance.upgrades[key] || 1) : (gameInstance.upgrades[key] || 0);
            const cost = getUpgradeCost(key, currentLvl);

            if (currentLvl >= upg.maxLevel || gameInstance.money < cost) return;

            gameInstance.money -= cost;
            gameInstance.upgrades[key] = currentLvl + 1;

            if (key === 'companion_dog') {
                if (!gameInstance.dogGroup) gameInstance.createDogMesh();
                audio.playDogBark();
            }
            if (key === 'combat_drone') {
                if (!gameInstance.droneGroup) gameInstance.createDroneMesh();
            }
            if (key === 'player_hp') {
                gameInstance.maxPlayerHp += 35;
                gameInstance.playerHp += 35;
            }
            if (key === 'base_hp') {
                gameInstance.maxBaseHp += 600;
                gameInstance.baseHp += 600;
                if (gameInstance.turrets) {
                    gameInstance.turrets.forEach(t => {
                        if (t && t.userData && !t.userData.isIndestructible) {
                            const hpBonus = Math.round(t.userData.maxHp * 0.15);
                            t.userData.maxHp += hpBonus;
                            t.userData.hp += hpBonus;
                            gameInstance.updateTurretHpBar(t);
                        }
                    });
                }
            }

            gameInstance.syncHUD();
            renderShopCatalog();
            gameInstance.saveGameSession();
            showPurchaseToast(`${upg.name} auf Level ${currentLvl + 1} verbessert!`);
            if (typeof audio !== 'undefined' && typeof audio.playCoin === 'function') audio.playCoin();
        }

        function repairBase() {
            if (!gameInstance) return;
            if (gameInstance.baseHp >= gameInstance.maxBaseHp || gameInstance.money < 120) return;
            gameInstance.money -= 120;
            gameInstance.baseHp = Math.min(gameInstance.maxBaseHp, gameInstance.baseHp + 600);
            gameInstance.syncHUD();
            gameInstance.saveGameSession();
            renderShopCatalog();
            showPurchaseToast("Basis repariert! (+600 HP)");
        }

        function healPlayer() {
            if (!gameInstance) return;
            if (gameInstance.playerHp >= gameInstance.maxPlayerHp || gameInstance.money < 80) return;
            gameInstance.money -= 80;
            gameInstance.playerHp = gameInstance.maxPlayerHp;
            gameInstance.syncHUD();
            gameInstance.saveGameSession();
            renderShopCatalog();
            showPurchaseToast("Spieler vollständig geheilt!");
        }

        function updateMainMenuResumeButton() {
            const btn = document.getElementById('resume-game-btn');
            const textEl = document.getElementById('resume-game-btn-text');
            if (!btn || !textEl) return;

            const session = Storage.loadSession();
            if (session && session.currentWave && (session.baseHp > 0 || (session.baseLives !== undefined && session.baseLives > 0)) && (session.playerHp > 0 || (session.playerLives !== undefined && session.playerLives > 0))) {
                const m = Math.floor((session.gameSeconds || 0) / 60).toString().padStart(2, '0');
                const s = ((session.gameSeconds || 0) % 60).toString().padStart(2, '0');
                textEl.innerText = `SPIEL FORTSETZEN (WELLE ${session.currentWave} • ${m}:${s})`;
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
            updateMenuAudioUI();
        }

        function switchMenuTab(tab) {
            const playCol = document.getElementById('menu-play-col');
            const hsCol = document.getElementById('menu-hs-col');
            const tabPlayBtn = document.getElementById('menu-tab-play');
            const tabHsBtn = document.getElementById('menu-tab-hs');
            
            if (!playCol || !hsCol) return;
            
            if (tab === 'play') {
                playCol.classList.remove('hidden');
                hsCol.classList.add('hidden');
                hsCol.classList.remove('flex');
                if (tabPlayBtn) {
                    tabPlayBtn.className = "flex-1 py-2 rounded-xl font-teko text-base sm:text-lg font-bold tracking-wider uppercase transition bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg flex items-center justify-center space-x-1.5";
                }
                if (tabHsBtn) {
                    tabHsBtn.className = "flex-1 py-2 rounded-xl font-teko text-base sm:text-lg font-bold tracking-wider uppercase transition text-slate-400 hover:text-white bg-slate-900/60 flex items-center justify-center space-x-1.5";
                }
            } else {
                playCol.classList.add('hidden');
                hsCol.classList.remove('hidden');
                hsCol.classList.add('flex');
                if (tabPlayBtn) {
                    tabPlayBtn.className = "flex-1 py-2 rounded-xl font-teko text-base sm:text-lg font-bold tracking-wider uppercase transition text-slate-400 hover:text-white bg-slate-900/60 flex items-center justify-center space-x-1.5";
                }
                if (tabHsBtn) {
                    tabHsBtn.className = "flex-1 py-2 rounded-xl font-teko text-base sm:text-lg font-bold tracking-wider uppercase transition bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg flex items-center justify-center space-x-1.5";
                }
                if (typeof fetchOnlineHighscores === 'function') {
                    fetchOnlineHighscores();
                }
            }
        }

        function toggleMenuAudio() {
            const isMuted = !Storage.data.musicEnabled && !Storage.data.sfxEnabled;
            const next = isMuted;
            toggleAudio('music', next);
            toggleAudio('sfx', next);
            updateMenuAudioUI();
            if (typeof showPurchaseToast === 'function') {
                showPurchaseToast(next ? "🔊 Ton aktiviert" : "🔇 Ton stummgeschaltet");
            }
        }

        function updateMenuAudioUI() {
            const btn = document.getElementById('menu-audio-btn');
            if (!btn) return;
            const isMuted = !Storage.data.musicEnabled && !Storage.data.sfxEnabled;
            btn.innerHTML = isMuted 
                ? `<i class="fa-solid fa-volume-xmark text-rose-400 text-sm"></i><span class="hidden sm:inline text-rose-400 font-mono text-[10px] font-bold">STUMM</span>`
                : `<i class="fa-solid fa-volume-high text-emerald-400 text-sm"></i><span class="hidden sm:inline text-emerald-400 font-mono text-[10px] font-bold">AUDIO</span>`;
        }

        function updateLoadingUI(percent, text) {
            const bar = document.getElementById('loading-bar-fill');
            const percentEl = document.getElementById('loading-percent-text');
            const statusEl = document.getElementById('loading-status-text');
            if (bar) bar.style.width = `${percent}%`;
            if (percentEl) percentEl.innerText = `${Math.round(percent)}%`;
            if (statusEl && text) statusEl.innerText = text;
        }

        function triggerFullscreen() {
            try {
                const el = document.documentElement;
                const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
                if (!isFs) {
                    if (el.requestFullscreen) {
                        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                    } else if (el.webkitRequestFullscreen) {
                        el.webkitRequestFullscreen().catch(() => {});
                    } else if (el.webkitEnterFullscreen) {
                        el.webkitEnterFullscreen().catch(() => {});
                    } else if (el.mozRequestFullScreen) {
                        el.mozRequestFullScreen().catch(() => {});
                    } else if (el.msRequestFullscreen) {
                        el.msRequestFullscreen().catch(() => {});
                    }
                }
                window.scrollTo(0, 0);
                setTimeout(() => window.scrollTo(0, 0), 80);
            } catch(e) {}
        }

        async function loadAndStartGame(sessionToRestore = null) {
            triggerFullscreen();
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.classList.remove('hidden');

            const startTime = performance.now();
            const totalDurationMs = 2200;

            let isFinished = false;
            let currentStatus = 'Initialisiere 3D-Engine & Materialien...';

            function animLoop() {
                if (isFinished) return;
                const elapsed = performance.now() - startTime;
                const progress = Math.min(100, (elapsed / totalDurationMs) * 100);

                if (progress < 35) {
                    currentStatus = 'Initialisiere 3D-Engine & Materialien...';
                } else if (progress < 70) {
                    currentStatus = 'Pre-Instanziierung aller Zombie-Typen...';
                } else {
                    currentStatus = 'Kompiliere WebGL-Pipeline & Starte...';
                }

                updateLoadingUI(progress, currentStatus);

                if (progress < 100) {
                    requestAnimationFrame(animLoop);
                }
            }
            requestAnimationFrame(animLoop);

            try {
                audio.init();
                if (gameInstance) {
                    try { gameInstance.destroy(); } catch(e) {}
                    gameInstance = null;
                }
                const container = document.getElementById('three-container');
                if (container) container.innerHTML = '';

                await new Promise(r => setTimeout(r, 150));

                gameInstance = new Game3D();
                if (sessionToRestore) {
                    gameInstance.restoreGameSession(sessionToRestore);
                }
                gameInstance.saveGameSession();
                await new Promise(r => setTimeout(r, 200));

                if (gameInstance && gameInstance.renderer && gameInstance.scene && gameInstance.camera) {
                    try {
                        gameInstance.renderer.compile(gameInstance.scene, gameInstance.camera);
                        gameInstance.renderer.render(gameInstance.scene, gameInstance.camera);
                    } catch(e) {}
                }

                const remainingTime = Math.max(0, totalDurationMs - (performance.now() - startTime));
                await new Promise(r => setTimeout(r, remainingTime));
            } catch (err) {
                console.error("Game startup error:", err);
            } finally {
                isFinished = true;
                updateLoadingUI(100, 'Vorbereitung abgeschlossen!');

                audio.startMusic();
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) {
                    mainMenu.classList.add('opacity-0', 'pointer-events-none', 'hidden');
                    mainMenu.style.display = 'none';
                }
                const gameHud = document.getElementById('game-hud');
                if (gameHud) gameHud.classList.remove('hidden');
                updateTacticalExtrasHUD();

                if (loadingScreen) loadingScreen.classList.add('hidden');

                // Ensure fullscreen & optimal viewport recalculation
                triggerFullscreen();
                window.dispatchEvent(new Event('resize'));
            }
        }

        const unlockAudioContext = () => {
            if (audio) {
                audio.init();
                if (audio.ctx && audio.ctx.state === 'suspended') {
                    audio.ctx.resume().catch(() => {});
                }
            }
        };
        window.addEventListener('click', unlockAudioContext, { passive: true });
        window.addEventListener('touchstart', unlockAudioContext, { passive: true });
        window.addEventListener('pointerdown', unlockAudioContext, { passive: true });

        function startNewGame() {
            triggerFullscreen();
            Storage.clearSession();
            updateMainMenuResumeButton();
            loadAndStartGame(null);
        }

        function resumeGame() {
            triggerFullscreen();
            const session = Storage.loadSession();
            if (!session) {
                startNewGame();
                return;
            }
            loadAndStartGame(session);
        }

        function startGame() {
            triggerFullscreen();
            startNewGame();
        }

        function restartGame() {
            triggerFullscreen();
            const hsEntry = document.getElementById('highscore-entry');
            if (hsEntry && !hsEntry.classList.contains('hidden') && window.lastRunStats && typeof submitHighscore === 'function') {
                submitHighscore();
            }
            document.getElementById('game-over-modal').classList.add('hidden');
            startNewGame();
        }

        // Auto-initialize resume button on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                updateMainMenuResumeButton();
            });
        } else {
            updateMainMenuResumeButton();
        }

        // Universal Fast Multi-touch Pointer Trigger for all interactive buttons and HUD elements
        (function setupFastMultitouchButtons() {
            let lastTriggerTime = 0;
            let lastTriggerTarget = null;

            const handleFastTrigger = (e) => {
                const btn = e.target.closest('button, [role="button"], .shop-tab-btn, .shop-buy-btn, [data-fast-touch]');
                if (!btn) return;

                // Only handle mobile/touch interactions
                if (e.type === 'touchstart' || (e.pointerType && e.pointerType !== 'mouse')) {
                    const now = performance.now();
                    if (lastTriggerTarget === btn && (now - lastTriggerTime) < 200) {
                        if (e.cancelable) e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    lastTriggerTime = now;
                    lastTriggerTarget = btn;

                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();

                    // Direct trigger without waiting for touchend / single-touch synthesis
                    if (typeof btn.onclick === 'function') {
                        btn.onclick(e);
                    } else {
                        btn.click();
                    }
                }
            };

            document.addEventListener('pointerdown', handleFastTrigger, { passive: false, capture: true });
            document.addEventListener('touchstart', handleFastTrigger, { passive: false, capture: true });
        })();

        // Auto-save session on page unload/hide (e.g. reload, close tab, switch apps)
        window.addEventListener('beforeunload', () => {
            if (gameInstance && gameInstance.isRunning && !gameInstance.isGameOver) {
                gameInstance.saveGameSession();
            }
        });
        window.addEventListener('pagehide', () => {
            if (gameInstance && gameInstance.isRunning && !gameInstance.isGameOver) {
                gameInstance.saveGameSession();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && gameInstance && gameInstance.isRunning && !gameInstance.isGameOver) {
                gameInstance.saveGameSession();
            }
        });