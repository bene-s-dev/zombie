        class Game3D {
            constructor() {
                this.container = document.getElementById('three-container');
                this.isRunning = false;
                this.isPaused = false;
                this.isGameOver = false;
                this.isWaveTransitioning = false;
                this.lastFrameTime = performance.now();
                this.playerWalkCycle = 0;

                this.isPlacementMode = false;
                this.pendingPlacement = null; 
                this.ghostMesh = null;
                this.selectedStructure = null; 

                this.airstrikeCooldown = 0;
                this.activeAirstrike = null; 
                this.nukeCooldown = 0;
                this.isNukeActive = false;
                this.activeNukeStrike = null;
                this.nukeSpawnBlockTimer = 0;
                this.cameraShake = 0;
                this.nukeTargetRing = null;
                this.activeMushroomClouds = [];
                this.intelShown = { runner: false, shield: false, tank: false, boss: false };

                this.touchJoystick = { active: false, touchId: null, startX: 0, startY: 0, vectorX: 0, vectorY: 0 };
                this.isTouchFiring = false;
                this.fireTouchId = null;

                const diff = Storage.data.difficulty;
                this.diffMult = 1.0;
                this.gameSpeed = 1;
                this.activeSimultaneousWaves = 1;
                
                this.money = 450;
                this.playerHp = 200;
                this.maxPlayerHp = 200;
                this.playerShield = 0;
                this.maxPlayerShield = 0;
                this.playerLives = 3;
                this.isInvulnerable = false;
                this.baseHp = 2500;
                this.maxBaseHp = 2500;
                this.baseShield = 0;
                this.maxBaseShield = 0;
                this.baseLives = 3;
                this.isBaseInvulnerable = false;
                this.currentWave = 1;
                this.zombiesLeftToSpawn = 12;
                this.gameSeconds = 0;
                this.totalKills = 0;

                // Modern Warfare AC-130 Gunship State
                this.ac130Cooldown = 0;
                this.isAc130Active = false;
                this.ac130MissionTimer = 0;
                this.ac130OrbitAngle = 0;
                this.ac130Last25mm = 0;
                this.ac130Last40mm = 0;
                this.ac130Last105mm = 0;
                this.ac130AimPos = new THREE.Vector3(0, 0, 0);
                this.ac130Projectiles = [];

                // Day / Night Cycle State (180s full cycle: 2.5 min Tag / Dämmerung, 30s Nacht)
                this.dayNightTime = 20; // Starts in bright pleasant daylight
                this.dayNightCycleDuration = 180;
                this._lastDayNightPhase = null;
                this._skyColor = new THREE.Color();

                this.unlockedWeapons = ['pistol'];
                this.weaponLevels = { pistol: 1, smg: 1, shotgun: 1, rifle: 1, sniper: 1, rpg: 1, minigun: 1, plasma: 1 };
                this.currentWeapon = WEAPONS.pistol;
                this.lastFired = 0;

                this.upgrades = {
                    companion_dog: 1, combat_drone: 0, player_speed: 0, player_hp: 0, player_shield: 0, scavenger: 0, crit_chance: 0,
                    base_hp: 0, base_shield: 0, auto_repair: 0, base_spikes: 0
                };
                this.droneGroup = null;
                this.lastDroneFired = 0;
                this.dogGroup = null;
                this.lastDogBite = 0;
                this.lastDogBarkTime = 0;
                this.lastDogGrowlTime = 0;
                this.dogState = 'follow';
                this.dogWalkPhase = 0;
                this.dogLungeTimer = 0;
                this.dogTargetZombie = null;

                this.zombies = [];
                this.bullets = [];
                this.turrets = [];
                this.walls = [];
                this.particles = [];

                // Cache once — avoids window/navigator query every frame
                this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                // Pre-allocated angle offsets array — never reallocated
                this._angleOffsets = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.0, -2.0];
                this._angleOffsetsMob = [0, 0.6, -0.6, 1.2, -1.2]; // fewer on mobile

                // Scratch Vectors for Zero-GC Math inside Game Loop
                this._v1 = new THREE.Vector3();
                this._v2 = new THREE.Vector3();
                this._v3 = new THREE.Vector3();

                // Spatial Grid Hashing for O(1) Collision Detection
                this.gridCellSize = 8;
                this.grid = new Map();

                // Object Pools & Performance Tuning
                this.bulletPool = [];
                this.particlePool = [];
                this.beaconLights = [];
                this.environmentObstacles = [];
                this.zombiePool = {
                    normal: [], runner: [], crawler: [], shield: [], exploder: [],
                    spitter: [], tank: [], summoner: [], raider: [], boss: [], minion_crawler: []
                };
                this.targetFps = 30;
                this._lastRenderTime = 0;
                this._pausedFrameRendered = false;

                this.environmentTheme = (typeof Storage !== 'undefined' && Storage.data && Storage.data.environmentTheme) ? Storage.data.environmentTheme : 'tactical';
                this.environmentGroup = null;
                this._frameCount = 0;
                this._shadowNeedsUpdate = true;

                this.keys = {};
                this.mousePos = new THREE.Vector2();
                this.pointerWorldPos = new THREE.Vector3();
                this.cameraOffset = new THREE.Vector3();
                this.cameraBasePos = new THREE.Vector3(0, 32, 24);
                this.cameraLookTarget = new THREE.Vector3(0, 0, 0);
                this.cameraShakeOffset = new THREE.Vector3(0, 0, 0);

                // Multi-Structure Selection & Hold State
                this.selectedStructuresList = [];
                this.selectionRingsGroup = null;
                this.multiSelectHoloGroup = null;
                this.holdTimer = null;
                this.isHoldSelecting = false;
                this.holdStartPos = null;

                this.initScene();
                this.initPools();
                this.updateCameraSettings();
                this.buildEnvironment();
                this.createBaseCore();
                this.initStockMarket();
                this.createPlayer();
                this.createDogMesh();
                this.setupControls();
                if (typeof updateTacticalExtrasHUD === 'function') updateTacticalExtrasHUD();

                this.secondTimer = setInterval(() => this.onSecondTick(), 1000);
                this.updateSpawnInterval();
                this.turretTimer = setInterval(() => this.updateTurrets(), 400);

                this.isRunning = true;
                this.animate();
                this.syncHUD();
                renderShopCatalog();
            }

            updateCameraSettings() {
                const zoom = Storage.data.cameraZoom || 1.0;
                const angle = Storage.data.cameraAngle !== undefined ? Storage.data.cameraAngle : 0.5;
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                
                // Base viewing distance
                const baseDist = (isMobile ? 17.5 : 28.0) * zoom;

                // Pitch angle from 28° (flach/isometrisch) bis 84° (Vogelperspektive)
                // Capping pitch angle at 84° avoids the 90° vertical singularity (Gimbal Lock) where camera orientation flips
                const pitchDeg = 28.0 + (angle * 56.0); // 0.0 -> 28°, 1.0 -> 84°
                const pitchRad = (pitchDeg * Math.PI) / 180;

                this.cameraOffset.x = 0;
                this.cameraOffset.y = baseDist * Math.sin(pitchRad);
                this.cameraOffset.z = baseDist * Math.cos(pitchRad);

                if (this.camera && this.playerGroup) {
                    this.cameraBasePos.set(
                        this.playerGroup.position.x + this.cameraOffset.x,
                        this.playerGroup.position.y + this.cameraOffset.y,
                        this.playerGroup.position.z + this.cameraOffset.z
                    );
                    this.camera.position.copy(this.cameraBasePos);
                    this.cameraLookTarget.set(
                        this.playerGroup.position.x,
                        this.playerGroup.position.y,
                        this.playerGroup.position.z
                    );
                    this.camera.lookAt(this.cameraLookTarget);
                }
            }

            setupControls() {
                window.addEventListener('keydown', (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    this.keys[e.code] = true;
                    if (e.key) {
                        this.keys[e.key] = true;
                        this.keys[e.key.toLowerCase()] = true;
                        this.keys[e.key.toUpperCase()] = true;
                    }
                    if (e.code === 'Space') {
                        if (this.isAc130Active) {
                            this.fireAc130Current();
                        }
                        e.preventDefault();
                    }
                    if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
                        if (typeof Storage === 'undefined' || Storage.data.extraAc130Enabled !== false) {
                            this.triggerAc130();
                        }
                    }
                    if (this.isAc130Active) {
                        if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
                            this.selectAc130Weapon('25mm');
                        }
                        if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
                            this.selectAc130Weapon('40mm');
                        }
                        if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') {
                            this.selectAc130Weapon('105mm');
                        }
                    }
                    if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
                        if (typeof isShopOpen !== 'undefined' && isShopOpen && typeof activeShopTab !== 'undefined' && activeShopTab === 'stocks') {
                            toggleShop(false);
                        } else {
                            toggleShop(true);
                            if (typeof switchShopTab === 'function') switchShopTab('stocks');
                        }
                    }
                    if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
                        if (typeof Storage === 'undefined' || Storage.data.extraAirstrikeEnabled !== false) {
                            this.triggerAirstrike();
                        }
                    }
                    if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') {
                        if (typeof Storage === 'undefined' || Storage.data.extraNukeEnabled !== false) {
                            this.triggerNuke();
                        }
                    }
                    if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
                        this.toggleGameSpeed();
                    }
                    if ((e.code === 'KeyR' || e.key === 'r' || e.key === 'R') && this.isPlacementMode) {
                        rotatePlacement();
                    }
                    if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
                        if (this.isPlacementMode) cancelPlacement();
                        else toggleShop();
                    }
                    if (e.code === 'KeyU' || e.key === 'u' || e.key === 'U') {
                        if (typeof openAllStructuresMultiUpgrade === 'function') openAllStructuresMultiUpgrade();
                    }
                    if (e.code === 'Escape' || e.key === 'Escape') {
                        const scavModal = document.getElementById('scavenger-info-modal');
                        if (scavModal && !scavModal.classList.contains('hidden')) {
                            if (typeof closeScavengerInfoModal === 'function') closeScavengerInfoModal();
                            else scavModal.classList.add('hidden');
                        } else {
                            const inspectModal = document.getElementById('inspect-modal');
                            if (inspectModal && !inspectModal.classList.contains('hidden')) {
                                closeInspectModal();
                            } else if (this.isPlacementMode) {
                                cancelPlacement();
                            } else if (typeof isShopOpen !== 'undefined' && isShopOpen) {
                                toggleShop(false);
                            } else {
                                togglePauseModal();
                            }
                        }
                    }
                });

                window.addEventListener('keyup', (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    this.keys[e.code] = false;
                    if (e.key) {
                        this.keys[e.key] = false;
                        this.keys[e.key.toLowerCase()] = false;
                        this.keys[e.key.toUpperCase()] = false;
                    }
                });

                window.addEventListener('blur', () => {
                    this.keys = {};
                });

                window.addEventListener('wheel', (e) => {
                    if (this.isAc130Active) {
                        const list = ['25mm', '40mm', '105mm'];
                        let curIdx = list.indexOf(this.ac130SelectedWeapon || '40mm');
                        if (e.deltaY > 0) curIdx = (curIdx + 1) % list.length;
                        else curIdx = (curIdx - 1 + list.length) % list.length;
                        this.selectAc130Weapon(list[curIdx]);
                    }
                }, { passive: true });

                window.addEventListener('contextmenu', (e) => {
                    if (this.isAc130Active) e.preventDefault();
                });

                window.addEventListener('mousedown', (e) => {
                    this.isMouseDown = true;
                    this.mouseButton = e.button;
                    if (this.isAc130Active) {
                        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
                        if (targetEl && targetEl.closest('button, input, #main-menu, #pause-modal')) return;
                        if (e.button === 0) {
                            this.fireAc130Current();
                        } else if (e.button === 2) {
                            e.preventDefault();
                            this.fireAc130_105mm();
                        }
                    } else if (e.button === 0 && !this.isPaused && !this.isPlacementMode && !isUiTarget(e)) {
                        this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
                        this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
                        this.raycaster.setFromCamera(this.mousePos, this.camera);
                        const groundHit = new THREE.Vector3();
                        if (this.raycaster.ray.intersectPlane(this.groundPlane, groundHit)) {
                            this.holdStartPos = {
                                screenX: e.clientX,
                                screenY: e.clientY,
                                groundX: groundHit.x,
                                groundZ: groundHit.z,
                                time: Date.now()
                            };
                        } else {
                            this.holdStartPos = {
                                screenX: e.clientX,
                                screenY: e.clientY,
                                groundX: 0,
                                groundZ: 0,
                                time: Date.now()
                            };
                        }

                        if (this.holdTimer) clearTimeout(this.holdTimer);
                        this.holdTimer = setTimeout(() => {
                            if (this.holdStartPos) {
                                this.isHoldSelecting = true;
                                this.updateMultiSelection(this.holdStartPos.groundX, this.holdStartPos.groundZ, 12.0);
                            }
                        }, 280);
                    }
                });

                window.addEventListener('mouseup', () => {
                    this.isMouseDown = false;
                    if (this.holdTimer) {
                        clearTimeout(this.holdTimer);
                        this.holdTimer = null;
                    }
                    if (this.isHoldSelecting) {
                        this.isHoldSelecting = false;
                        this.hideHoldSelectionPulse();
                        this.ignoreNextSelectionUntil = Date.now() + 500;
                        const count = this.selectedStructuresList.length;
                        if (count > 1) {
                            this.openMultiInspectModal(this.selectedStructuresList);
                        } else if (count === 1) {
                            this.inspectStructure(this.selectedStructuresList[0]);
                            this.clearSelectedStructures();
                        } else {
                            this.clearSelectedStructures();
                        }
                        this.holdStartPos = null;
                    } else {
                        this.holdStartPos = null;
                    }
                });

                const onPointerMove = (e) => {
                    this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
                    this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;

                    this.raycaster.setFromCamera(this.mousePos, this.camera);
                    const intersects = this._v3;
                    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                        this.pointerWorldPos.copy(intersects);
                        if (this.isPlacementMode && this.ghostMesh) {
                            this.updateGhostPosition(intersects.x, intersects.z);
                        }
                        if (this.isMouseDown && this.holdStartPos && !this.isPlacementMode && !this.isPaused) {
                            const dx = Math.abs(e.clientX - this.holdStartPos.screenX);
                            const dy = Math.abs(e.clientY - this.holdStartPos.screenY);
                            if (dx > 10 || dy > 10) {
                                this.isHoldSelecting = true;
                                if (this.holdTimer) { clearTimeout(this.holdTimer); this.holdTimer = null; }
                                this.updateDragBoxSelection(this.holdStartPos.groundX, this.holdStartPos.groundZ, intersects.x, intersects.z);
                            }
                        } else if (this.isHoldSelecting && this.holdStartPos) {
                            this.updateDragBoxSelection(this.holdStartPos.groundX, this.holdStartPos.groundZ, intersects.x, intersects.z);
                        }
                        if (this.isAc130Active && (!e.pointerType || e.pointerType === 'mouse')) {
                            this.ac130ScreenAim = {
                                x: THREE.MathUtils.clamp(e.clientX, 35, window.innerWidth - 35),
                                y: THREE.MathUtils.clamp(e.clientY, 45, window.innerHeight - 45)
                            };
                            this.ac130AimPos.copy(intersects);
                        }
                    }
                };

                this.findStructureAtScreenPoint = (clientX, clientY) => {
                    const ndc = new THREE.Vector2(
                        (clientX / window.innerWidth) * 2 - 1,
                        -(clientY / window.innerHeight) * 2 + 1
                    );
                    this.raycaster.setFromCamera(ndc, this.camera);

                    const allStructures = [...this.turrets, ...this.walls];
                    if (allStructures.length === 0) return null;

                    // 1. Direct Mesh Raycasting (Check all child meshes)
                    const clickableMeshes = [];
                    allStructures.forEach(struct => {
                        struct.traverse(child => {
                            if (child.isMesh) clickableMeshes.push(child);
                        });
                    });

                    const directIntersects = this.raycaster.intersectObjects(clickableMeshes, true);
                    if (directIntersects.length > 0) {
                        for (const hit of directIntersects) {
                            let curr = hit.object;
                            while (curr && curr !== this.scene) {
                                if (allStructures.includes(curr) || (curr.userData && (curr.userData.isTurret || curr.userData.isWall))) {
                                    return curr;
                                }
                                curr = curr.parent;
                            }
                        }
                    }

                    // 2. Ground-plane proximity fallback (essential for touch tap precision)
                    const groundHit = new THREE.Vector3();
                    if (this.raycaster.ray.intersectPlane(this.groundPlane, groundHit)) {
                        let closestStruct = null;
                        let minGroundDistSq = 3.2 * 3.2; // 3.2m tap tolerance radius

                        for (const struct of allStructures) {
                            const dx = struct.position.x - groundHit.x;
                            const dz = struct.position.z - groundHit.z;
                            const distSq = dx * dx + dz * dz;
                            if (distSq < minGroundDistSq) {
                                minGroundDistSq = distSq;
                                closestStruct = struct;
                            }
                        }
                        if (closestStruct) return closestStruct;
                    }

                    return null;
                };

                const handleSelection = (clientX, clientY, e) => {
                    if (this.ignoreNextSelectionUntil && Date.now() < this.ignoreNextSelectionUntil) return;
                    if (e && isUiTarget(e)) return;
                    if (this.isPaused && !this.isPlacementMode) return;

                    const targetEl = document.elementFromPoint(clientX, clientY);
                    if (targetEl) {
                        if (targetEl === this.renderer.domElement || targetEl.tagName === 'CANVAS' || targetEl.id === 'game-container' || targetEl.id === 'game-hud') {
                            // Valid ground/game target
                        } else if (targetEl.closest('button, input, select, textarea, label, a, #shop-modal, #main-menu, #pause-modal, #game-over-modal, #inspect-modal, #intel-modal, #scavenger-info-modal, #placement-hud, .pointer-events-auto, [onclick]')) {
                            return;
                        }
                    }

                    if (this.isPlacementMode) {
                        if (this.placementJustStarted) return;
                        this.mousePos.x = (clientX / window.innerWidth) * 2 - 1;
                        this.mousePos.y = -(clientY / window.innerHeight) * 2 + 1;
                        this.raycaster.setFromCamera(this.mousePos, this.camera);
                        const intersects = this._v3;
                        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                            this.pointerWorldPos.copy(intersects);
                            if (this.ghostMesh) {
                                this.updateGhostPosition(intersects.x, intersects.z);
                            }
                        }
                        this.confirmPlacement();
                        return;
                    }

                    const struct = this.findStructureAtScreenPoint(clientX, clientY);
                    if (struct) {
                        this.inspectStructure(struct);
                    }
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('click', (e) => handleSelection(e.clientX, e.clientY, e));

                const isUiTarget = (e, touch) => {
                    const interactiveSelector = 'button, input, select, textarea, label, a, #shop-modal, #main-menu, #pause-modal, #game-over-modal, #inspect-modal, #intel-modal, #scavenger-info-modal, #placement-hud, .pointer-events-auto, [onclick], [data-touch-action]';
                    
                    if (touch && typeof document.elementFromPoint === 'function') {
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (el) {
                            if (el === this.renderer.domElement || el.tagName === 'CANVAS' || el.id === 'game-container' || el.id === 'game-hud') {
                                return false;
                            }
                            if (el.closest(interactiveSelector)) {
                                return true;
                            }
                        }
                    }
                    if (e && e.target) {
                        const target = e.target;
                        if (target === this.renderer.domElement || target.tagName === 'CANVAS' || target.id === 'game-container' || target.id === 'game-hud') {
                            return false;
                        }
                        if (target.closest(interactiveSelector)) {
                            return true;
                        }
                    }
                    return false;
                };

                const onTouchStart = (e) => {
                    if (this.isPlacementMode) {
                        const touch = e.touches[0] || e.changedTouches[0];
                        if (touch && !isUiTarget(e, touch)) {
                            this.placementTouchStart = {
                                x: touch.clientX,
                                y: touch.clientY,
                                time: Date.now()
                            };
                            this.mousePos.x = (touch.clientX / window.innerWidth) * 2 - 1;
                            this.mousePos.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                            this.raycaster.setFromCamera(this.mousePos, this.camera);
                            const intersects = new THREE.Vector3();
                            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                                this.pointerWorldPos.copy(intersects);
                                if (this.ghostMesh) {
                                    this.updateGhostPosition(intersects.x, intersects.z);
                                }
                            }
                        }
                    }
                    if (this.isPaused || this.isGameOver) return;

                    // Virtual Joystick Aiming during AC-130 mode
                    if (this.isAc130Active) {
                        let acTouchHandled = false;
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (isUiTarget(e, touch)) continue;

                            if (!this.touchJoystick.active) {
                                acTouchHandled = true;
                                this.touchJoystick.active = true;
                                this.touchJoystick.touchId = touch.identifier;
                                this.touchJoystick.startX = touch.clientX;
                                this.touchJoystick.startY = touch.clientY;

                                const container = document.getElementById('joystick-container');
                                if (container) {
                                    container.style.left = `${touch.clientX}px`;
                                    container.style.top = `${touch.clientY}px`;
                                    container.classList.remove('hidden');
                                }
                                this.updateJoystickKnob(0, 0);
                            }
                        }
                        if (acTouchHandled && e.cancelable) e.preventDefault();
                        return;
                    }

                    let touchHandled = false;
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        const touch = e.changedTouches[i];
                        if (isUiTarget(e, touch)) continue;

                        touchHandled = true;
                        this.gameplayTouchStart = { x: touch.clientX, y: touch.clientY, time: Date.now(), id: touch.identifier };

                        const halfWidth = window.innerWidth / 2;
                        const isJoystickSide = Storage.data.swapTouchControls ? (touch.clientX <= halfWidth) : (touch.clientX > halfWidth);

                        if (isJoystickSide) {
                            if (!this.touchJoystick.active) {
                                this.touchJoystick.active = true;
                                this.touchJoystick.touchId = touch.identifier;
                                this.touchJoystick.startX = touch.clientX;
                                this.touchJoystick.startY = touch.clientY;

                                const container = document.getElementById('joystick-container');
                                if (container) {
                                    container.style.left = `${touch.clientX}px`;
                                    container.style.top = `${touch.clientY}px`;
                                    container.classList.remove('hidden');
                                }
                                this.updateJoystickKnob(0, 0);
                            }
                        } else {
                            if (this.fireTouchId === null) {
                                this.fireTouchId = touch.identifier;
                                this.isTouchFiring = true;

                                this.mousePos.x = (touch.clientX / window.innerWidth) * 2 - 1;
                                this.mousePos.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                                this.raycaster.setFromCamera(this.mousePos, this.camera);
                                const intersects = new THREE.Vector3();
                                if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                                    this.pointerWorldPos.copy(intersects);
                                }

                                const fireFeedback = document.getElementById('fire-touch-feedback');
                                if (fireFeedback) {
                                    fireFeedback.style.left = `${touch.clientX}px`;
                                    fireFeedback.style.top = `${touch.clientY}px`;
                                    fireFeedback.classList.remove('hidden');
                                }
                            }
                        }
                    }
                    if (touchHandled && e.cancelable) e.preventDefault();
                };

                const onTouchMove = (e) => {
                    if (this.isPlacementMode) {
                        const touch = e.touches[0] || e.changedTouches[0];
                        if (touch && !isUiTarget(e, touch)) {
                            this.mousePos.x = (touch.clientX / window.innerWidth) * 2 - 1;
                            this.mousePos.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                            this.raycaster.setFromCamera(this.mousePos, this.camera);
                            const intersects = new THREE.Vector3();
                            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                                this.pointerWorldPos.copy(intersects);
                                if (this.ghostMesh) {
                                    this.updateGhostPosition(intersects.x, intersects.z);
                                }
                            }
                        }
                    }

                    if (this.isPaused || this.isGameOver) return;

                    // Virtual Joystick or Direct Touch Aim Movement during AC-130 mode
                    if (this.isAc130Active) {
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (isUiTarget(e, touch)) continue;
                            if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
                                const dx = touch.clientX - this.touchJoystick.startX;
                                const dy = touch.clientY - this.touchJoystick.startY;
                                const dist = Math.hypot(dx, dy);
                                const maxRadius = 50;

                                const clampDist = Math.min(dist, maxRadius);
                                const angle = Math.atan2(dy, dx);

                                const knobX = Math.cos(angle) * clampDist;
                                const knobY = Math.sin(angle) * clampDist;

                                this.updateJoystickKnob(knobX, knobY);

                                this.touchJoystick.vectorX = (knobX / maxRadius);
                                this.touchJoystick.vectorY = (knobY / maxRadius);
                            } else {
                                this.ac130ScreenAim.x = touch.clientX;
                                this.ac130ScreenAim.y = touch.clientY;
                            }
                        }
                        if (e.cancelable) e.preventDefault();
                        return;
                    }

                    for (let i = 0; i < e.changedTouches.length; i++) {
                        const touch = e.changedTouches[i];
                        if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
                            const dx = touch.clientX - this.touchJoystick.startX;
                            const dy = touch.clientY - this.touchJoystick.startY;
                            const dist = Math.hypot(dx, dy);
                            const maxRadius = 50;

                            const clampDist = Math.min(dist, maxRadius);
                            const angle = Math.atan2(dy, dx);

                            const knobX = Math.cos(angle) * clampDist;
                            const knobY = Math.sin(angle) * clampDist;

                            this.updateJoystickKnob(knobX, knobY);

                            this.touchJoystick.vectorX = (knobX / maxRadius);
                            this.touchJoystick.vectorY = (knobY / maxRadius);
                        }

                        if (touch.identifier === this.fireTouchId) {
                            this.mousePos.x = (touch.clientX / window.innerWidth) * 2 - 1;
                            this.mousePos.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                            this.raycaster.setFromCamera(this.mousePos, this.camera);
                            const intersects = new THREE.Vector3();
                            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                                this.pointerWorldPos.copy(intersects);
                            }

                            const fireFeedback = document.getElementById('fire-touch-feedback');
                            if (fireFeedback) {
                                fireFeedback.style.left = `${touch.clientX}px`;
                                fireFeedback.style.top = `${touch.clientY}px`;
                            }
                        }
                    }
                };

                const onTouchEnd = (e) => {
                    if (this.isAc130Active) {
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
                                this.touchJoystick.active = false;
                                this.touchJoystick.touchId = null;
                                this.touchJoystick.vectorX = 0;
                                this.touchJoystick.vectorY = 0;
                                const container = document.getElementById('joystick-container');
                                if (container) container.classList.add('hidden');
                            }
                        }
                        return;
                    }

                    if (this.isPlacementMode) {
                        if (this.placementJustStarted) return;
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (isUiTarget(e, touch)) continue;

                            this.mousePos.x = (touch.clientX / window.innerWidth) * 2 - 1;
                            this.mousePos.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                            this.raycaster.setFromCamera(this.mousePos, this.camera);
                            const intersects = new THREE.Vector3();
                            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                                this.pointerWorldPos.copy(intersects);
                                if (this.ghostMesh) {
                                    this.updateGhostPosition(intersects.x, intersects.z);
                                }
                            }
                            if (this.placementTouchStart) {
                                const dx = Math.abs(touch.clientX - this.placementTouchStart.x);
                                const dy = Math.abs(touch.clientY - this.placementTouchStart.y);
                                const duration = Date.now() - this.placementTouchStart.time;

                                const isTap = (dx < 15 && dy < 15 && duration < 280);
                                if (isTap) {
                                    this.confirmPlacement();
                                }
                            }
                            break;
                        }
                    } else if (!this.isPaused && !this.isGameOver) {

                        for (let i = 0; i < e.changedTouches.length; i++) {
                            const touch = e.changedTouches[i];
                            if (this.ignoreNextSelectionUntil && Date.now() < this.ignoreNextSelectionUntil) continue;
                            if (isUiTarget(e, touch)) continue;

                            if (this.gameplayTouchStart && touch.identifier === this.gameplayTouchStart.id) {
                                const dx = Math.abs(touch.clientX - this.gameplayTouchStart.x);
                                const dy = Math.abs(touch.clientY - this.gameplayTouchStart.y);
                                const duration = Date.now() - this.gameplayTouchStart.time;

                                if (dx < 22 && dy < 22 && duration < 380) {
                                    const struct = this.findStructureAtScreenPoint(touch.clientX, touch.clientY);
                                    if (struct) {
                                        this.ignoreNextSelectionUntil = Date.now() + 500;
                                        this.inspectStructure(struct);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    for (let i = 0; i < e.changedTouches.length; i++) {
                        const touch = e.changedTouches[i];
                        if (this.touchJoystick.active && touch.identifier === this.touchJoystick.touchId) {
                            this.touchJoystick.active = false;
                            this.touchJoystick.touchId = null;
                            this.touchJoystick.vectorX = 0;
                            this.touchJoystick.vectorY = 0;

                            const container = document.getElementById('joystick-container');
                            if (container) container.classList.add('hidden');
                        }

                        if (touch.identifier === this.fireTouchId) {
                            this.fireTouchId = null;
                            this.isTouchFiring = false;
                            const fireFeedback = document.getElementById('fire-touch-feedback');
                            if (fireFeedback) fireFeedback.classList.add('hidden');
                        }
                    }
                };

                window.addEventListener('touchstart', onTouchStart, { passive: false });
                window.addEventListener('touchmove', onTouchMove, { passive: false });
                window.addEventListener('touchend', onTouchEnd, { passive: false });
                window.addEventListener('touchcancel', onTouchEnd, { passive: false });

                window.addEventListener('resize', () => {
                    if (this.camera && this.renderer) {
                        this.camera.aspect = window.innerWidth / window.innerHeight;
                        this.camera.updateProjectionMatrix();
                        this.renderer.setSize(window.innerWidth, window.innerHeight);
                    }
                });
            }

            updateJoystickKnob(x, y) {
                const knob = document.getElementById('joystick-knob');
                if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
            }

            spawnZombie() {
                if (this.isWaveTransitioning || this.isGameOver || this.zombiesLeftToSpawn <= 0) return;
                // Do not block spawn when paused — the interval still ticks during pause,
                // but we skip the actual spawn. zombiesLeftToSpawn is not decremented.
                if (this.isPaused) return;
                if (this.nukeSpawnBlockTimer > 0) return; // 3s post-nuke spawn grace period!

                this.zombiesLeftToSpawn--;

                // Spawn at the outer perimeter of the active combat area
                const side = Math.floor(Math.random() * 4); // 0: North, 1: South, 2: West, 3: East
                // If only 1-2 zombies left to spawn in this wave, spawn closer (26-32m) so the player isn't waiting forever
                const isLastSpawns = this.zombiesLeftToSpawn <= 2;
                const edgeDistance = (isLastSpawns ? 26 : 48) + Math.random() * 6; // 48 to 54m (26-32m for last zombies)
                const edgeOffset = (Math.random() - 0.5) * (isLastSpawns ? 52 : 96); // -48 to +48m along the perimeter
                let x, z;
                if (side === 0) {
                    x = edgeOffset;
                    z = -edgeDistance;
                } else if (side === 1) {
                    x = edgeOffset;
                    z = edgeDistance;
                } else if (side === 2) {
                    x = -edgeDistance;
                    z = edgeOffset;
                } else {
                    x = edgeDistance;
                    z = edgeOffset;
                }

                const waveHpScale = Math.pow(1.095, this.currentWave - 1);
                const waveDmgScale = Math.pow(1.04, this.currentWave - 1);

                const isBossWave = (this.currentWave % 7 === 0) && (this.zombiesLeftToSpawn === 0);

                let type = 'normal';
                let hp = (22 + Math.pow(this.currentWave - 1, 1.25) * 10) * waveHpScale;
                let speed = 0.048 + Math.min(0.045, (this.currentWave - 1) * 0.0035);
                let scale = 1.0;
                let color = 0x16a34a;
                let reward = 24;
                let dmgMult = 1.0 * waveDmgScale;
                let armorThreshold = 0;

                if (isBossWave) {
                    type = 'boss';
                    hp = 1400 * waveHpScale;
                    speed = 0.045 * this.diffMult;
                    scale = 2.4;
                    color = 0xdc2626;
                    reward = 350;
                    dmgMult = 3.5 * waveDmgScale;
                    armorThreshold = 45;
                } else {
                    const rnd = Math.random();
                    // SPACED OUT PROGRESSION: 1 new zombie type every 2 waves!
                    if (this.currentWave >= 2 && rnd < 0.20) {
                        type = 'runner';
                        hp = 38 * waveHpScale;
                        speed = 0.10 * this.diffMult;
                        scale = 0.85;
                        color = 0xeab308;
                        reward = 28;
                        dmgMult = 0.8 * waveDmgScale;
                    } else if (this.currentWave >= 4 && rnd < 0.35) {
                        type = 'crawler';
                        hp = 22 * waveHpScale;
                        speed = 0.115 * this.diffMult;
                        scale = 0.6;
                        color = 0x451a03;
                        reward = 20;
                        dmgMult = 0.7 * waveDmgScale;
                    } else if (this.currentWave >= 5 && rnd < 0.48) {
                        type = 'bat';
                        hp = 42 * waveHpScale;
                        speed = 0.096 * this.diffMult;
                        scale = 0.92;
                        color = 0x4c1d95; // Deep Mutant Bat Violet
                        reward = 36;
                        dmgMult = 1.0 * waveDmgScale;
                    } else if (this.currentWave >= 6 && rnd < 0.58) {
                        type = 'shield';
                        hp = 75 * waveHpScale;
                        speed = 0.058 * this.diffMult;
                        scale = 1.1;
                        color = 0x0284c7;
                        reward = 42;
                        dmgMult = 1.2 * waveDmgScale;
                    } else if (this.currentWave >= 8 && rnd < 0.68) {
                        type = 'exploder';
                        hp = 42 * waveHpScale;
                        speed = 0.09 * this.diffMult;
                        scale = 0.9;
                        color = 0xf97316;
                        reward = 38;
                        dmgMult = 1.0 * waveDmgScale;
                    } else if (this.currentWave >= 10 && rnd < 0.78) {
                        type = 'spitter';
                        hp = 65 * waveHpScale;
                        speed = 0.052 * this.diffMult;
                        scale = 1.0;
                        color = 0x84cc16;
                        reward = 50;
                        dmgMult = 1.1 * waveDmgScale;
                    } else if (this.currentWave >= 12 && rnd < 0.86) {
                        type = 'tank';
                        hp = 220 * waveHpScale;
                        speed = 0.04 * this.diffMult;
                        scale = 1.6;
                        color = 0x7c3aed;
                        reward = 65;
                        dmgMult = 2.0 * waveDmgScale;
                        armorThreshold = 32;
                    } else if (this.currentWave >= 14 && rnd < 0.94) {
                        type = 'summoner';
                        hp = 160 * waveHpScale;
                        speed = 0.042 * this.diffMult;
                        scale = 1.2;
                        color = 0x6b21a8;
                        reward = 80;
                        dmgMult = 1.0 * waveDmgScale;
                    } else if (this.currentWave >= 6 && this.money >= 50000 && Math.random() < 0.25) {
                        type = 'raider';
                        hp = 55 * waveHpScale;
                        speed = 0.115 * this.diffMult;
                        scale = 0.95;
                        color = 0xf59e0b;
                        reward = 60;
                        dmgMult = 1.2 * waveDmgScale;
                    }
                }

                if (type !== 'normal') {
                    this.showTacticalIntel(type);
                }

                let zombieGroup = null;
                if (this.zombiePool && this.zombiePool[type] && this.zombiePool[type].length > 0) {
                    zombieGroup = this.zombiePool[type].pop();
                    zombieGroup.position.set(x, type === 'bat' ? 3.4 : 0, z);
                    zombieGroup.rotation.set(0, 0, 0);
                    zombieGroup.visible = true;
                    if (!zombieGroup.parent) this.scene.add(zombieGroup);
                } else {
                    zombieGroup = this.createZombieMesh(type, scale, color);
                    zombieGroup.position.set(x, type === 'bat' ? 3.4 : 0, z);
                    this.scene.add(zombieGroup);
                }

                zombieGroup.userData = {
                    ...zombieGroup.userData,
                    type: type,
                    hp: hp,
                    maxHp: hp,
                    speed: speed,
                    scale: scale,
                    reward: reward,
                    dmgMult: dmgMult,
                    armorThreshold: armorThreshold,
                    isShield: (type === 'shield'),
                    isFlying: (type === 'bat'),
                    flySeed: Math.random() * 100,
                    walkCycle: Math.random() * Math.PI * 2,
                    bodyMaterials: zombieGroup.userData.bodyMaterials || []
                };

                if (this.isAc130Active) {
                    if (!this.whiteHotMat) this.whiteHotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    zombieGroup.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.userData.ac130OrigMat) child.userData.ac130OrigMat = child.material;
                            child.material = this.whiteHotMat;
                        }
                    });
                }

                this.zombies.push(zombieGroup);
            }

            createZombieMesh(type, scale, color) {
                const zombieGroup = new THREE.Group();

                if (!this._zombieMats) this._zombieMats = {};
                if (!this._zombieMats[type]) {
                    this._zombieMats[type] = {
                        bodyMat: new THREE.MeshLambertMaterial({ color: color }),
                        clothMat: new THREE.MeshLambertMaterial({ color: 0x1e293b }),
                        eyeMat: new THREE.MeshBasicMaterial({ color: type === 'spitter' ? 0xa3e635 : (type === 'summoner' ? 0xf472b6 : (type === 'raider' ? 0xfef08a : 0xef4444)) })
                    };
                }
                const { bodyMat, clothMat, eyeMat } = this._zombieMats[type];
                const bodyMaterials = [bodyMat, clothMat];

                if (!this._unitBoxGeo) this._unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
                if (!this._unitSphereGeo) this._unitSphereGeo = new THREE.SphereGeometry(1, 8, 8);

                if (type === 'bat') {
                    // 3D Mutant-Bat (Fledermaus / Flugzombie)
                    const batTorso = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    batTorso.scale.set(0.55 * scale, 0.65 * scale, 0.45 * scale);
                    batTorso.position.y = 0;
                    zombieGroup.add(batTorso);

                    const batHead = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    batHead.scale.set(0.42 * scale, 0.38 * scale, 0.42 * scale);
                    batHead.position.set(0, 0.35 * scale, 0.18 * scale);
                    zombieGroup.add(batHead);

                    // Pointy bat ears
                    const earGeo = new THREE.ConeGeometry(0.11 * scale, 0.28 * scale, 4);
                    const earL = new THREE.Mesh(earGeo, bodyMat);
                    earL.position.set(-0.16 * scale, 0.62 * scale, 0.12 * scale);
                    earL.rotation.z = 0.28;
                    const earR = new THREE.Mesh(earGeo, bodyMat);
                    earR.position.set(0.16 * scale, 0.62 * scale, 0.12 * scale);
                    earR.rotation.z = -0.28;
                    zombieGroup.add(earL);
                    zombieGroup.add(earR);

                    // Red glowing bat eyes
                    const eye1 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye1.scale.set(0.09 * scale, 0.09 * scale, 0.09 * scale);
                    eye1.position.set(-0.11 * scale, 0.38 * scale, 0.38 * scale);
                    zombieGroup.add(eye1);

                    const eye2 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye2.scale.set(0.09 * scale, 0.09 * scale, 0.09 * scale);
                    eye2.position.set(0.11 * scale, 0.38 * scale, 0.38 * scale);
                    zombieGroup.add(eye2);

                    // Articulated Wings with Pivot Groups
                    const wingMat = new THREE.MeshLambertMaterial({ color: 0x2e1065, side: THREE.DoubleSide });
                    bodyMaterials.push(wingMat);

                    // Left Wing Pivot & Mesh
                    const wingLPivot = new THREE.Group();
                    wingLPivot.position.set(-0.25 * scale, 0.10 * scale, 0);
                    const wingLMesh = new THREE.Mesh(this._unitBoxGeo, wingMat);
                    wingLMesh.scale.set(1.15 * scale, 0.04 * scale, 0.75 * scale);
                    wingLMesh.position.set(-0.58 * scale, 0, 0);
                    wingLPivot.add(wingLMesh);
                    zombieGroup.add(wingLPivot);

                    // Right Wing Pivot & Mesh
                    const wingRPivot = new THREE.Group();
                    wingRPivot.position.set(0.25 * scale, 0.10 * scale, 0);
                    const wingRMesh = new THREE.Mesh(this._unitBoxGeo, wingMat);
                    wingRMesh.scale.set(1.15 * scale, 0.04 * scale, 0.75 * scale);
                    wingRMesh.position.set(0.58 * scale, 0, 0);
                    wingRPivot.add(wingRMesh);
                    zombieGroup.add(wingRPivot);

                    zombieGroup.userData.wingL = wingLPivot;
                    zombieGroup.userData.wingR = wingRPivot;
                } else if (type === 'crawler' || type === 'minion_crawler') {
                    const torso = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    torso.scale.set(0.7 * scale, 0.4 * scale, 0.8 * scale);
                    torso.position.y = 0.25 * scale;
                    zombieGroup.add(torso);

                    const head = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    head.scale.set(0.4 * scale, 0.4 * scale, 0.4 * scale);
                    head.position.set(0, 0.4 * scale, 0.4 * scale);
                    zombieGroup.add(head);

                    const eye1 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye1.scale.set(0.08 * scale, 0.08 * scale, 0.08 * scale);
                    eye1.position.set(-0.1 * scale, 0.42 * scale, 0.58 * scale);
                    zombieGroup.add(eye1);

                    const eye2 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye2.scale.set(0.08 * scale, 0.08 * scale, 0.08 * scale);
                    eye2.position.set(0.1 * scale, 0.42 * scale, 0.58 * scale);
                    zombieGroup.add(eye2);
                } else {
                    const legL = new THREE.Mesh(this._unitBoxGeo, clothMat);
                    legL.scale.set(0.25 * scale, 0.7 * scale, 0.25 * scale);
                    legL.position.set(-0.2 * scale, 0.35 * scale, 0);
                    zombieGroup.add(legL);

                    const legR = new THREE.Mesh(this._unitBoxGeo, clothMat);
                    legR.scale.set(0.25 * scale, 0.7 * scale, 0.25 * scale);
                    legR.position.set(0.2 * scale, 0.35 * scale, 0);
                    zombieGroup.add(legR);

                    const torso = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    torso.scale.set(0.7 * scale, 0.9 * scale, 0.4 * scale);
                    torso.position.y = 1.15 * scale;
                    zombieGroup.add(torso);

                    const armL = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    armL.scale.set(0.2 * scale, 0.2 * scale, 0.8 * scale);
                    armL.position.set(-0.45 * scale, 1.2 * scale, 0.3 * scale);
                    zombieGroup.add(armL);

                    const armR = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    armR.scale.set(0.2 * scale, 0.2 * scale, 0.8 * scale);
                    armR.position.set(0.45 * scale, 1.2 * scale, 0.3 * scale);
                    zombieGroup.add(armR);

                    const head = new THREE.Mesh(this._unitBoxGeo, bodyMat);
                    head.scale.set(0.45 * scale, 0.45 * scale, 0.45 * scale);
                    head.position.y = 1.75 * scale;
                    zombieGroup.add(head);

                    const eye1 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye1.scale.set(0.08 * scale, 0.08 * scale, 0.08 * scale);
                    eye1.position.set(-0.12 * scale, 1.78 * scale, 0.22 * scale);
                    zombieGroup.add(eye1);

                    const eye2 = new THREE.Mesh(this._unitBoxGeo, eyeMat);
                    eye2.scale.set(0.08 * scale, 0.08 * scale, 0.08 * scale);
                    eye2.position.set(0.12 * scale, 1.78 * scale, 0.22 * scale);
                    zombieGroup.add(eye2);

                    if (type === 'exploder') {
                        const bombMat = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 40 });
                        const bombMesh = new THREE.Mesh(this._unitSphereGeo, bombMat);
                        bombMesh.scale.set(0.3 * scale, 0.3 * scale, 0.3 * scale);
                        bombMesh.position.set(0, 1.15 * scale, 0.25 * scale);
                        zombieGroup.add(bombMesh);
                        bodyMaterials.push(bombMat);
                    } else if (type === 'spitter') {
                        const acidPouchMat = new THREE.MeshPhongMaterial({ color: 0xa3e635, shininess: 60 });
                        const acidPouch = new THREE.Mesh(this._unitSphereGeo, acidPouchMat);
                        acidPouch.scale.set(0.28 * scale, 0.28 * scale, 0.28 * scale);
                        acidPouch.position.set(0, 1.3 * scale, -0.25 * scale);
                        zombieGroup.add(acidPouch);
                        bodyMaterials.push(acidPouchMat);
                    } else if (type === 'summoner') {
                        const orbMat = new THREE.MeshPhongMaterial({ color: 0xf0abfc, shininess: 80 });
                        const orbMesh = new THREE.Mesh(this._unitSphereGeo, orbMat);
                        orbMesh.scale.set(0.25 * scale, 0.25 * scale, 0.25 * scale);
                        orbMesh.position.set(0, 2.2 * scale, 0);
                        zombieGroup.add(orbMesh);
                        bodyMaterials.push(orbMat);
                    } else if (type === 'shield') {
                        const shieldMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 90 });
                        const shieldMesh = new THREE.Mesh(this._unitBoxGeo, shieldMat);
                        shieldMesh.scale.set(1.3 * scale, 1.5 * scale, 0.18 * scale);
                        shieldMesh.position.set(0, 1.1 * scale, 0.5 * scale);
                        zombieGroup.add(shieldMesh);
                        bodyMaterials.push(shieldMat);
                    }
                }

                zombieGroup.userData = { bodyMaterials: bodyMaterials };
                return zombieGroup;
            }

            spawnMinionCrawler(x, z) {
                if (this.isPaused || this.isGameOver) return;
                const waveHpScale = Math.pow(1.10, this.currentWave - 1);
                const waveDmgScale = Math.pow(1.05, this.currentWave - 1);
                const scale = 0.55;

                let zombieGroup = null;
                if (this.zombiePool && this.zombiePool['minion_crawler'] && this.zombiePool['minion_crawler'].length > 0) {
                    zombieGroup = this.zombiePool['minion_crawler'].pop();
                    zombieGroup.position.set(x, 0, z);
                    zombieGroup.rotation.set(0, 0, 0);
                    zombieGroup.visible = true;
                    if (!zombieGroup.parent) this.scene.add(zombieGroup);
                } else {
                    zombieGroup = this.createZombieMesh('minion_crawler', scale, 0x451a03);
                    zombieGroup.position.set(x, 0, z);
                    this.scene.add(zombieGroup);
                }

                zombieGroup.userData = {
                    type: 'minion_crawler',
                    hp: 18 * waveHpScale,
                    maxHp: 18 * waveHpScale,
                    speed: 0.115 * this.diffMult,
                    scale: scale,
                    reward: 15,
                    dmgMult: 0.6 * waveDmgScale,
                    armorThreshold: 0,
                    walkCycle: Math.random() * Math.PI * 2,
                    bodyMaterials: zombieGroup.userData.bodyMaterials || []
                };

                if (this.isAc130Active) {
                    if (!this.whiteHotMat) this.whiteHotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    zombieGroup.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.userData.ac130OrigMat) child.userData.ac130OrigMat = child.material;
                            child.material = this.whiteHotMat;
                        }
                    });
                }

                this.zombies.push(zombieGroup);
            }

            updateTurrets() {
                if (this.isPaused || this.isGameOver || this.zombies.length === 0 || this.turrets.length === 0) return;

                const now = performance.now();

                if (!this._turretBulletGeo) {
                    this._turretBulletGeo = new THREE.BoxGeometry(0.16, 0.16, 1.4);
                    this._turretBulletMatMG = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // Blau für Waffenstation
                    this._turretBulletMatGranate = new THREE.MeshBasicMaterial({ color: 0xff6600 }); // Orange für Granatwerfer
                }

                for (let ti = 0; ti < this.turrets.length; ti++) {
                    const turret = this.turrets[ti];
                    const ud = turret.userData;
                    if (ud.isHangar || ud.isLightMast || ud.firerate <= 0 || ud.damage <= 0) continue;
                    if (now < ud.lastFired + ud.firerate) continue;

                    let closestZombie = null;
                    let minDistSq = ud.range * ud.range;
                    const tx = turret.position.x;
                    const tz = turret.position.z;
                    const tr = ud.range;
                    const minR = ud.minRange || 0;
                    const minRSq = minR * minR;

                    for (let zi = 0; zi < this.zombies.length; zi++) {
                        const z = this.zombies[zi];
                        if (z.userData.hp <= 0 || z.userData.isDead) continue;

                        // EXCLUSIVE ANTI-AIR RULE:
                        // Ground turrets CANNOT target flying zombies!
                        if (!ud.isAntiAir && z.userData.isFlying) continue;
                        // Anti-Air turrets target ONLY flying zombies!
                        if (ud.isAntiAir && !z.userData.isFlying) continue;

                        const zx = z.position.x;
                        const zz = z.position.z;
                        if (Math.abs(zx - tx) > tr || Math.abs(zz - tz) > tr) continue; // Fast AABB box cull

                        const distSq = (zx - tx) * (zx - tx) + (zz - tz) * (zz - tz);
                        if (distSq < minRSq) continue; // Respect minimum artillery range

                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            closestZombie = z;
                        }
                    }

                    if (closestZombie) {
                        ud.lastFired = now;

                        // Predictive lead aiming so bullets hit moving zombies reliably
                        const targetDist = Math.hypot(closestZombie.position.x - tx, closestZombie.position.z - tz);
                        const bulletSpd = ud.isExplosive ? 60 : 90;
                        const flightTime = targetDist / bulletSpd;
                        const zToBx = this.baseGroup.position.x - closestZombie.position.x;
                        const zToBz = this.baseGroup.position.z - closestZombie.position.z;
                        const zToBDist = Math.hypot(zToBx, zToBz) || 1;
                        const zDirX = zToBx / zToBDist;
                        const zDirZ = zToBz / zToBDist;
                        const zSpeed = (closestZombie.userData.speed || 0.05) * 60;
                        const leadFactor = 0.65;
                        const aimTargetX = closestZombie.position.x + zDirX * zSpeed * flightTime * leadFactor;
                        const aimTargetZ = closestZombie.position.z + zDirZ * zSpeed * flightTime * leadFactor;

                        const angle = Math.atan2(
                            aimTargetX - tx,
                            aimTargetZ - tz
                        );
                        ud.head.rotation.y = angle;

                        if (ud.isAntiAir) {
                            // MANTIS 35mm C-RAM Rapid-Fire Autocannon Stream (Lila / High-Energy Purple)
                            if (typeof audio !== 'undefined' && audio.playMinigunShot) {
                                audio.playMinigunShot();
                            } else if (typeof audio !== 'undefined' && audio.playShoot) {
                                audio.playShoot(0.06);
                            }

                            if (!this._mantisBulletGeo) {
                                this._mantisBulletGeo = new THREE.BoxGeometry(0.14, 0.14, 1.2);
                                this._mantisBulletMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
                            }

                            const startPos = new THREE.Vector3(tx, 2.3, tz);
                            const targetPos = closestZombie.position.clone();
                            targetPos.x += (Math.random() - 0.5) * 0.25;
                            targetPos.y += (Math.random() - 0.5) * 0.25;
                            targetPos.z += (Math.random() - 0.5) * 0.25;

                            const dir = targetPos.clone().sub(startPos).normalize();

                            let bullet = this.bulletPool.pop();
                            if (!bullet) {
                                bullet = new THREE.Mesh(this._mantisBulletGeo, this._mantisBulletMat);
                                bullet.userData = { dir: new THREE.Vector3() };
                                this.scene.add(bullet);
                            } else {
                                bullet.geometry = this._mantisBulletGeo;
                                bullet.material = this._mantisBulletMat;
                            }

                            bullet.position.copy(startPos);
                            bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                            bullet.visible = true;

                            if (!bullet.userData.dir) bullet.userData.dir = new THREE.Vector3();
                            bullet.userData.dir.copy(dir);
                            bullet.userData.speed = 110; // High-velocity 35mm kinetic Flak
                            bullet.userData.damage = ud.damage;
                            bullet.userData.isExplosive = false;
                            bullet.userData.isTurretBullet = true;
                            bullet.userData.isAntiAirBullet = true;
                            bullet.userData.isEnemy = false;
                            bullet.userData.life = 0.85;

                            this.bullets.push(bullet);
                        } else if (ud.isArtillery) {
                            // Heavy Guided Missile (VLS Vertical Launch + Terminal Homing)
                            if (typeof audio !== 'undefined' && audio.playRocket) audio.playRocket();

                            const startX = tx;
                            const startY = 2.4;
                            const startZ = tz;
                            const targetZombie = closestZombie;
                            const targetX = targetZombie.position.x;
                            const targetZ = targetZombie.position.z;
                            const dist = Math.hypot(targetX - startX, targetZ - startZ);
                            const flightDuration = Math.max(1.15, Math.min(1.85, 0.95 + dist * 0.018));
                            const cruiseAltitude = Math.max(18, 14 + dist * 0.32);

                            if (!this._artilleryRocketGeo) {
                                this._artilleryRocketGeo = new THREE.CylinderGeometry(0.18, 0.14, 1.4, 8);
                                this._artilleryRocketGeo.rotateX(-Math.PI / 2);
                                this._artilleryRocketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
                            }

                            let rocket = this.artilleryPool ? this.artilleryPool.pop() : null;
                            if (!rocket) {
                                rocket = new THREE.Mesh(this._artilleryRocketGeo, this._artilleryRocketMat);
                                const warheadGeo = new THREE.ConeGeometry(0.18, 0.45, 8);
                                warheadGeo.rotateX(-Math.PI / 2);
                                const warhead = new THREE.Mesh(warheadGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
                                warhead.position.z = -0.90;
                                rocket.add(warhead);
                                this.scene.add(rocket);
                            }
                            rocket.position.set(startX, startY, startZ);
                            rocket.visible = true;

                            if (!this.ballisticRockets) this.ballisticRockets = [];
                            this.ballisticRockets.push({
                                mesh: rocket,
                                startX, startY, startZ,
                                targetZombie,
                                targetX, targetZ,
                                cruiseAltitude,
                                duration: flightDuration,
                                elapsed: 0,
                                damage: ud.damage,
                                splashRadius: ud.splashRadius || 8.0,
                                knockback: ud.knockback || 14.0
                            });
                        } else {
                            const bulletMat = ud.isExplosive ? this._turretBulletMatGranate : this._turretBulletMatMG;
                            
                            let bullet = this.bulletPool.pop();
                            if (!bullet) {
                                bullet = new THREE.Mesh(this._turretBulletGeo, bulletMat);
                                bullet.userData = { dir: new THREE.Vector3() };
                                this.scene.add(bullet);
                            } else {
                                bullet.geometry = this._turretBulletGeo;
                                bullet.material = bulletMat;
                            }

                            bullet.position.set(tx, 1.8, tz);
                            bullet.quaternion.identity();
                            bullet.rotation.set(0, angle, 0);
                            bullet.visible = true;

                            if (!bullet.userData.dir) bullet.userData.dir = new THREE.Vector3();
                            bullet.userData.dir.set(Math.sin(angle), 0, Math.cos(angle));
                            bullet.userData.speed = bulletSpd;
                            bullet.userData.damage = ud.damage;
                            bullet.userData.isExplosive = ud.isExplosive;
                            bullet.userData.splashRadius = ud.splashRadius || 0;
                            bullet.userData.isTurretBullet = true;
                            bullet.userData.isAntiAirBullet = false;
                            bullet.userData.isEnemy = false;
                            bullet.userData.life = 1.8;

                            this.bullets.push(bullet);

                            if (ud.isExplosive) audio.playRocket();
                            else audio.playPistol();
                        }
                    }
                }
            }

            createExplosion(pos, radius, damage, visualRadius = null, isHeavyBomb = false, damageFriendly = false, knockbackForce = 0) {
                if (isHeavyBomb || radius >= 10) {
                    audio.playHeavyBomb();
                } else {
                    audio.playExplosion();
                }

                const visRad = visualRadius !== null ? visualRadius : radius;
                const baseScale = visRad * 0.85;

                let expMesh = this.explosionPool ? this.explosionPool.pop() : null;
                if (!expMesh) {
                    if (!this._unitSphereGeo) this._unitSphereGeo = new THREE.SphereGeometry(1, 8, 8);
                    const expMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
                    expMesh = new THREE.Mesh(this._unitSphereGeo, expMat);
                    this.scene.add(expMesh);
                }

                expMesh.position.copy(pos);
                expMesh.visible = true;
                expMesh.material.opacity = 0.9;
                expMesh.userData.baseScale = baseScale;
                expMesh.userData.scaleProgress = 0.2;
                expMesh.scale.set(baseScale * 0.2, baseScale * 0.2, baseScale * 0.2);

                if (!this.activeExplosions) this.activeExplosions = [];
                this.activeExplosions.push(expMesh);

                this.createBloodSparks(pos, 0xfacc15);

                if (damage > 0) {
                    const radiusSq = radius * radius;
                    const px = pos.x;
                    const pz = pos.z;

                    for (let i = this.zombies.length - 1; i >= 0; i--) {
                        const z = this.zombies[i];
                        if (z.userData.isDead || z.userData.isFlying) continue;
                        const zx = z.position.x;
                        const zz = z.position.z;
                        if (Math.abs(zx - px) > radius || Math.abs(zz - pz) > radius) continue; // Fast AABB cull

                        const distSq = (zx - px) * (zx - px) + (zz - pz) * (zz - pz);
                        if (distSq <= radiusSq) {
                            const dist = Math.sqrt(distSq);
                            const falloff = 1 - (dist / radius) * 0.5;
                            z.userData.hp -= damage * falloff;
                            this.flashZombieHit(z);

                            if (knockbackForce > 0) {
                                const nx = dist > 0.001 ? (zx - px) / dist : (Math.random() - 0.5);
                                const nz = dist > 0.001 ? (zz - pz) / dist : (Math.random() - 0.5);
                                const force = knockbackForce * falloff;
                                z.position.x += nx * force;
                                z.position.z += nz * force;
                            }

                            if (z.userData.hp <= 0) this.killZombie(z);
                        }
                    }

                    if (damageFriendly) {
                        const plx = this.playerGroup.position.x;
                        const plz = this.playerGroup.position.z;
                        if (Math.abs(plx - px) <= radius && Math.abs(plz - pz) <= radius) {
                            const distPlayerSq = (plx - px) * (plx - px) + (plz - pz) * (plz - pz);
                            if (distPlayerSq <= radiusSq) {
                                const distP = Math.sqrt(distPlayerSq);
                                const falloff = 1 - (distP / radius) * 0.5;
                                let pDmg = damage * 0.6 * falloff;
                                if (this.playerShield > 0) {
                                    const absorbed = Math.min(this.playerShield, pDmg);
                                    this.playerShield -= absorbed;
                                    pDmg -= absorbed;
                                }
                                if (pDmg > 0) {
                                    this.playerHp = Math.max(0, this.playerHp - pDmg);
                                }
                                this.showDamageOverlay();
                                this._needHudSync = true;
                                if (this.playerHp <= 0) this.triggerGameOver('player');
                            }
                        }

                        const baseRadPlus = radius + 8.5;
                        const distBaseSq = pos.distanceToSquared(this.baseGroup.position);
                        if (!this.isBaseInvulnerable && distBaseSq <= baseRadPlus * baseRadPlus) {
                            const distBase = Math.sqrt(distBaseSq);
                            const falloff = 1 - (Math.max(0, distBase - 8.5) / radius) * 0.5;
                            let baseDmg = damage * 0.45 * falloff;
                            if (this.baseShield > 0) {
                                const absorbed = Math.min(this.baseShield, baseDmg);
                                this.baseShield -= absorbed;
                                baseDmg -= absorbed;
                            }
                            if (baseDmg > 0) {
                                this.baseHp = Math.max(0, this.baseHp - baseDmg);
                                this.triggerBaseAlarm();
                            }
                            this._needHudSync = true;
                            if (this.baseHp <= 0) this.handleBaseDeath();
                        }

                        for (let k = this.turrets.length - 1; k >= 0; k--) {
                            const t = this.turrets[k];
                            if (t.userData.isIndestructible) continue;
                            const distTSq = pos.distanceToSquared(t.position);
                            if (distTSq <= radiusSq) {
                                const distT = Math.sqrt(distTSq);
                                const falloff = 1 - (distT / radius) * 0.5;
                                t.userData.hp -= damage * 0.65 * falloff;
                                this.createBloodSparks(t.position, 0xf59e0b);
                                if (t.userData.hp <= 0) {
                                    audio.playExplosion();
                                    this.scene.remove(t);
                                    this.turrets.splice(k, 1);
                                }
                            }
                        }

                        for (let wIdx = this.walls.length - 1; wIdx >= 0; wIdx--) {
                            const w = this.walls[wIdx];
                            const distWSq = pos.distanceToSquared(w.position);
                            if (distWSq <= radiusSq) {
                                const distW = Math.sqrt(distWSq);
                                const falloff = 1 - (distW / radius) * 0.5;
                                w.userData.hp -= damage * 0.65 * falloff;
                                this.createBloodSparks(w.position, 0xeab308);
                                if (w.userData.hp <= 0) {
                                    this.destroyWall(w);
                                }
                            }
                        }
                    }
                }
            }

            triggerBaseAlarm() {
                const now = performance.now();
                if (now - (this._lastBaseAlarmTime || 0) < 1500) return;
                this._lastBaseAlarmTime = now;

                const alarmEl = document.getElementById('hud-base-alarm');
                if (alarmEl) {
                    alarmEl.classList.remove('hidden');
                    if (this._baseAlarmTimeout) clearTimeout(this._baseAlarmTimeout);
                    this._baseAlarmTimeout = setTimeout(() => {
                        alarmEl.classList.add('hidden');
                    }, 2200);
                }
            }

            startPlacementMode(kind, specId) {
                const spec = kind === 'turret' ? TURRET_TYPES[specId] : WALL_TYPES[specId];
                if (!spec || this.money < spec.cost) return;

                this.isPlacementMode = true;
                this.isPaused = true;
                this.placementJustStarted = true;
                this.placementRotation = 0;
                setTimeout(() => { this.placementJustStarted = false; }, 400);

                this.pendingPlacement = { kind, specId, cost: spec.cost, spec };

                if (this.ghostMesh) {
                    this.scene.remove(this.ghostMesh);
                    this.ghostMesh = null;
                }

                this.ghostMesh = new THREE.Group();
                const materials = [];

                if (kind === 'turret') {
                    const radius = spec.radius || (spec.id === 'drone_hangar' ? 2.2 : (spec.id === 'light_mast' ? 1.4 : 1.6));
                    const range = spec.range || 20;

                    // 1. Firing Range Projection Ring
                    const rangeGeo = new THREE.RingGeometry(Math.max(1, range - 0.35), range + 0.35, 64);
                    rangeGeo.rotateX(-Math.PI / 2);
                    const rangeMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false });
                    const rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
                    rangeRing.position.y = 0.08;
                    rangeRing.renderOrder = 997;
                    this.ghostMesh.add(rangeRing);

                    // 2. Glowing Base Footprint Disk
                    const diskGeo = new THREE.CircleGeometry(radius, 32);
                    diskGeo.rotateX(-Math.PI / 2);
                    const diskMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false });
                    const disk = new THREE.Mesh(diskGeo, diskMat);
                    disk.position.y = 0.10;
                    disk.renderOrder = 998;
                    this.ghostMesh.add(disk);

                    // 3. Crisp Footprint Border Ring
                    const borderGeo = new THREE.RingGeometry(radius * 0.92, radius * 1.05, 32);
                    borderGeo.rotateX(-Math.PI / 2);
                    const borderMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false });
                    const border = new THREE.Mesh(borderGeo, borderMat);
                    border.position.y = 0.12;
                    border.renderOrder = 999;
                    this.ghostMesh.add(border);

                    // 4. Vertical Holo-Beacon Column
                    const beamGeo = new THREE.CylinderGeometry(0.15, radius * 0.75, 4.5, 16, 1, true);
                    const beamMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false });
                    const beam = new THREE.Mesh(beamGeo, beamMat);
                    beam.position.y = 2.25;
                    beam.renderOrder = 1000;
                    this.ghostMesh.add(beam);

                    // 5. Solid + Wireframe 3D Holo Structure
                    let bodyGeo;
                    let bodyY = 0.8;
                    if (spec.id === 'drone_hangar') {
                        bodyGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.7, 12);
                        bodyY = 0.35;
                    } else if (spec.id === 'light_mast') {
                        bodyGeo = new THREE.CylinderGeometry(0.2, 0.6, 4.8, 8);
                        bodyY = 2.4;
                    } else {
                        bodyGeo = new THREE.CylinderGeometry(1.0, 1.4, 1.6, 12);
                        bodyY = 0.8;
                    }

                    const solidMat = new THREE.MeshStandardMaterial({
                        color: 0x22c55e,
                        transparent: true,
                        opacity: 0.70,
                        roughness: 0.2,
                        metalness: 0.1,
                        emissive: 0x15803d,
                        emissiveIntensity: 0.6,
                        depthWrite: false
                    });
                    const solidMesh = new THREE.Mesh(bodyGeo, solidMat);
                    solidMesh.position.y = bodyY;
                    solidMesh.renderOrder = 1001;
                    this.ghostMesh.add(solidMesh);

                    const wireMat = new THREE.MeshBasicMaterial({ color: 0x86efac, wireframe: true, transparent: true, opacity: 0.95, depthWrite: false });
                    const wireMesh = new THREE.Mesh(bodyGeo, wireMat);
                    wireMesh.position.y = bodyY;
                    wireMesh.renderOrder = 1002;
                    this.ghostMesh.add(wireMesh);

                    materials.push(rangeMat, diskMat, borderMat, beamMat, solidMat, wireMat);
                    this.ghostMesh.userData = { materials, solidMat, isValid: true, radius, kind: 'turret' };
                } else {
                    let wWidth = 3.6, wHeight = 1.8, wDepth = 1.0;
                    if (spec.id === 'concrete') { wWidth = 4.2; wHeight = 2.2; wDepth = 1.2; }
                    if (spec.id === 'laser_wall') { wWidth = 4.5; wHeight = 2.5; wDepth = 0.8; }

                    // 1. Base Plate Footprint
                    const baseGeo = new THREE.PlaneGeometry(wWidth + 0.6, wDepth + 0.6);
                    baseGeo.rotateX(-Math.PI / 2);
                    const baseMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false });
                    const basePlate = new THREE.Mesh(baseGeo, baseMat);
                    basePlate.position.y = 0.10;
                    basePlate.renderOrder = 998;
                    this.ghostMesh.add(basePlate);

                    // 2. Footprint Border
                    const borderGeo = new THREE.PlaneGeometry(wWidth + 0.8, wDepth + 0.8);
                    borderGeo.rotateX(-Math.PI / 2);
                    const borderMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true, transparent: true, opacity: 0.95, depthWrite: false });
                    const border = new THREE.Mesh(borderGeo, borderMat);
                    border.position.y = 0.12;
                    border.renderOrder = 999;
                    this.ghostMesh.add(border);

                    // 3. Solid Translucent Wall Box
                    const boxGeo = new THREE.BoxGeometry(wWidth, wHeight, wDepth);
                    const solidMat = new THREE.MeshStandardMaterial({
                        color: 0x22c55e,
                        transparent: true,
                        opacity: 0.70,
                        roughness: 0.2,
                        metalness: 0.1,
                        emissive: 0x15803d,
                        emissiveIntensity: 0.6,
                        depthWrite: false
                    });
                    const solidMesh = new THREE.Mesh(boxGeo, solidMat);
                    solidMesh.position.y = wHeight / 2;
                    solidMesh.renderOrder = 1001;
                    this.ghostMesh.add(solidMesh);

                    const wireMat = new THREE.MeshBasicMaterial({ color: 0x86efac, wireframe: true, transparent: true, opacity: 0.95, depthWrite: false });
                    const wireMesh = new THREE.Mesh(boxGeo, wireMat);
                    wireMesh.position.y = wHeight / 2;
                    wireMesh.renderOrder = 1002;
                    this.ghostMesh.add(wireMesh);

                    materials.push(baseMat, borderMat, solidMat, wireMat);
                    this.ghostMesh.userData = { materials, solidMat, isValid: true, radius: spec.radius || (wWidth / 2), kind: 'wall' };
                }

                this.scene.add(this.ghostMesh);

                // Initialize directly in front of the player
                let initX = 0, initZ = 0;
                if (this.playerGroup) {
                    const fAngle = (this.playerMesh && this.playerMesh.rotation) ? this.playerMesh.rotation.y : 0;
                    initX = this.playerGroup.position.x + Math.sin(fAngle) * 4.2;
                    initZ = this.playerGroup.position.z + Math.cos(fAngle) * 4.2;
                } else {
                    initX = 10; initZ = 10;
                }

                if (!this.pointerWorldPos) this.pointerWorldPos = new THREE.Vector3();
                this.pointerWorldPos.set(initX, 0, initZ);
                this.updateGhostPosition(initX, initZ);

                document.getElementById('placement-item-name').innerText = spec.name;
                document.getElementById('placement-hud').classList.remove('hidden');
                toggleShop(false);
            }

            updateGhostPosition(x, z) {
                if (!this.ghostMesh) return;

                this.ghostMesh.position.set(x, 0, z);
                this.ghostMesh.rotation.y = this.placementRotation || 0;

                let isValid = true;
                const distToBase = Math.hypot(x, z);
                if (distToBase < 7.2 || Math.abs(x) > 74 || Math.abs(z) > 74) {
                    isValid = false;
                }

                const r = this.ghostMesh.userData.radius || 1.5;
                const isBuildingWall = (this.ghostMesh.userData.kind === 'wall');

                this.turrets.forEach(t => {
                    if (Math.hypot(t.position.x - x, t.position.z - z) < r + 1.2) isValid = false;
                });
                this.walls.forEach(w => {
                    if (!isBuildingWall) {
                        if (Math.hypot(w.position.x - x, w.position.z - z) < r + w.userData.radius) isValid = false;
                    }
                });

                if (isValid && this.environmentObstacles) {
                    for (let i = 0; i < this.environmentObstacles.length; i++) {
                        const obs = this.environmentObstacles[i];
                        const odx = obs.x - x;
                        const odz = obs.z - z;
                        const maxDist = r + obs.radius;
                        if (Math.abs(odx) < maxDist && Math.abs(odz) < maxDist) {
                            if (odx * odx + odz * odz < maxDist * maxDist) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }

                this.ghostMesh.userData.isValid = isValid;
                const colorHex = isValid ? 0x22c55e : 0xef4444;
                const emissiveHex = isValid ? 0x15803d : 0x991b1b;
                if (this.ghostMesh.userData.materials) {
                    this.ghostMesh.userData.materials.forEach(m => {
                        m.color.setHex(colorHex);
                    });
                }
                if (this.ghostMesh.userData.solidMat) {
                    this.ghostMesh.userData.solidMat.emissive.setHex(emissiveHex);
                }
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            }

            confirmPlacement() {
                if (!this.isPlacementMode || !this.pendingPlacement || !this.ghostMesh) return;
                if (!this.ghostMesh.userData.isValid) return;

                const { kind, specId, cost, spec } = this.pendingPlacement;
                if (this.money < cost) {
                    this.cancelPlacement();
                    return;
                }

                this.money -= cost;

                const x = this.ghostMesh.position.x;
                const z = this.ghostMesh.position.z;
                const rot = this.ghostMesh.rotation.y;

                if (kind === 'turret') {
                    this.buildTurretAt(specId, x, z, rot);
                } else {
                    this.buildWallAt(specId, x, z, rot);
                }

                if (typeof audio !== 'undefined' && typeof audio.playCoin === 'function') {
                    audio.playCoin();
                }
                this.syncHUD();
                this.saveGameSession();

                // Multi-Bau: Bleibt aktiv, solange genug Geld für weitere Türme/Mauern vorhanden ist
                if (this.money >= cost) {
                    this.updateGhostPosition(x, z);
                } else {
                    this.ignoreNextSelectionUntil = Date.now() + 400;
                    this.cancelPlacement();
                }
            }

            cancelPlacement() {
                this.isPlacementMode = false;
                this.pendingPlacement = null;
                if (this.ghostMesh) {
                    this.scene.remove(this.ghostMesh);
                    this.ghostMesh = null;
                }
                const hud = document.getElementById('placement-hud');
                if (hud) hud.classList.add('hidden');
                if (typeof isShopOpen !== 'undefined' && typeof isPauseModalOpen !== 'undefined') {
                    this.isPaused = isShopOpen || isPauseModalOpen || (this.selectedStructure !== null && this.selectedStructure !== undefined);
                } else {
                    this.isPaused = false;
                }
            }

            buildTurretAt(turretTypeId, x, z, rot = 0) {
                const spec = TURRET_TYPES[turretTypeId];

                const turretGroup = new THREE.Group();
                turretGroup.position.set(x, 0, z);
                turretGroup.rotation.y = rot;

                // Invisible Touch HitBox genau in der Größe des Turmes für präzises Antippen
                const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
                const hitBoxRadius = spec.id === 'drone_hangar' ? 1.8 : 1.4;
                const hitBox = new THREE.Mesh(new THREE.CylinderGeometry(hitBoxRadius, hitBoxRadius, 2.2, 8), hitBoxMat);
                hitBox.position.y = 1.1;
                turretGroup.add(hitBox);

                if (spec.id === 'drone_hangar') {
                    // Octagonal landing platform base
                    const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
                    const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.45, 8), padMat);
                    padMesh.position.y = 0.22;
                    padMesh.castShadow = true;
                    turretGroup.add(padMesh);

                    // Neon Green Ring Border
                    const borderMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
                    const borderMesh = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.06, 8, 8), borderMat);
                    borderMesh.rotation.x = Math.PI / 2;
                    borderMesh.position.y = 0.46;
                    turretGroup.add(borderMesh);

                    // Central Landing Hangar Hatch
                    const hatchMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.9 });
                    const hatchMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 16), hatchMat);
                    hatchMesh.position.y = 0.48;
                    turretGroup.add(hatchMesh);

                    // 4 Corner Antenna Beacon Lights
                    for (let a = 0; a < 4; a++) {
                        const ang = (a * Math.PI) / 2 + Math.PI / 4;
                        const px = Math.sin(ang) * 1.35;
                        const pz = Math.cos(ang) * 1.35;
                        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
                        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), poleMat);
                        pole.position.set(px, 0.7, pz);
                        turretGroup.add(pole);

                        const lightMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
                        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), lightMat);
                        bulb.position.set(px, 1.02, pz);
                        turretGroup.add(bulb);
                    }

                    // 3 Docked Mini Drones on pad
                    const dockedDronesGroup = new THREE.Group();
                    dockedDronesGroup.position.y = 0.52;
                    for (let d = 0; d < 3; d++) {
                        const dAng = (d * Math.PI * 2) / 3;
                        const dx = Math.sin(dAng) * 0.55;
                        const dz = Math.cos(dAng) * 0.55;
                        const miniD = new THREE.Group();
                        miniD.position.set(dx, 0, dz);
                        const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), new THREE.MeshStandardMaterial({ color: 0x047857 }));
                        const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
                        light.position.y = 0.06;
                        miniD.add(body);
                        miniD.add(light);
                        dockedDronesGroup.add(miniD);
                    }
                    turretGroup.add(dockedDronesGroup);

                    // Holographic Rotating Cross / Tool Icon
                    const holoMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.8 });
                    const holoBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.06), holoMat);
                    const holoBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.06), holoMat);
                    const holoGroup = new THREE.Group();
                    holoGroup.add(holoBar1);
                    holoGroup.add(holoBar2);
                    holoGroup.position.set(0, 1.6, 0);
                    turretGroup.add(holoGroup);

                    turretGroup.userData = {
                        isTurret: true,
                        isHangar: true,
                        isIndestructible: true,
                        turretTypeId: spec.id,
                        typeId: spec.id,
                        name: spec.name,
                        hitBox: hitBox,
                        holoMesh: holoGroup,
                        dockedDrones: dockedDronesGroup,
                        range: spec.range,
                        damage: 0,
                        firerate: 0,
                        hp: 99999,
                        maxHp: 99999,
                        level: 1,
                        totalInvested: spec.cost,
                        dronesActive: true,
                        droneTimer: 0,
                        activeDronesList: [],
                        lastFired: 0
                    };
                    this.turrets.push(turretGroup);
                    this.scene.add(turretGroup);
                    this.launchRepairDrones(turretGroup);
                    return turretGroup;
                }

                if (spec.id === 'light_mast') {
                    // Mobile Disaster Relief Floodlight Trailer (THW / Katastrophenschutz)
                    // 1. Trailer Chassis (Emergency Blue & Safety Yellow)
                    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.35 });
                    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.4), chassisMat);
                    chassis.position.y = 0.45;
                    chassis.castShadow = true;
                    turretGroup.add(chassis);

                    // Emergency Generator Top Panel (Safety Yellow)
                    const genTopMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.4 });
                    const genTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.2), genTopMat);
                    genTop.position.y = 0.78;
                    turretGroup.add(genTop);

                    // 4 Trailer Rubber Wheels
                    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
                    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12);
                    wheelGeo.rotateZ(Math.PI / 2);
                    [[-0.62, 0.24, -0.4], [-0.62, 0.24, 0.4], [0.62, 0.24, -0.4], [0.62, 0.24, 0.4]].forEach(pos => {
                        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                        wheel.position.set(pos[0], pos[1], pos[2]);
                        turretGroup.add(wheel);
                    });

                    // 4 Corner Outrigger Feet (Stabilisatoren)
                    const footMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
                    [[ -0.75, 0.08, -0.8 ], [ 0.75, 0.08, -0.8 ], [ -0.75, 0.08, 0.8 ], [ 0.75, 0.08, 0.8 ]].forEach(pos => {
                        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 6), footMat);
                        foot.position.set(pos[0], pos[1], pos[2]);
                        turretGroup.add(foot);
                        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), footMat);
                        strut.position.set(pos[0] * 0.7, 0.35, pos[2] * 0.7);
                        turretGroup.add(strut);
                    });

                    // 2. High Telescopic Steel Mast (approx 4.8m height)
                    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.15 });
                    const mastPole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 2.4, 8), mastMat);
                    mastPole1.position.y = 1.9;
                    turretGroup.add(mastPole1);

                    const mastPole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 8), mastMat);
                    mastPole2.position.y = 3.6;
                    turretGroup.add(mastPole2);

                    // 3. 360° Hexagonal LED Floodlight Crown (Lichtkopf)
                    const headGroup = new THREE.Group();
                    headGroup.position.y = 4.7;

                    const headCenterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
                    const headCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), headCenterMat);
                    headGroup.add(headCenter);

                    // 6 Directional High-Power LED Floodlight Panels in 360° Ring
                    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
                    const ledCaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

                    for (let f = 0; f < 6; f++) {
                        const ang = (f * Math.PI * 2) / 6;
                        const panelGroup = new THREE.Group();
                        panelGroup.position.set(Math.sin(ang) * 0.45, 0, Math.cos(ang) * 0.45);
                        panelGroup.rotation.y = ang;
                        panelGroup.rotation.x = 0.25; // tilted slightly downwards to illuminate ground

                        const casing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.12), ledCaseMat);
                        const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.18), ledMat);
                        ledPanel.position.z = 0.065;
                        panelGroup.add(casing);
                        panelGroup.add(ledPanel);
                        headGroup.add(panelGroup);
                    }
                    turretGroup.add(headGroup);

                    // 4. Real-time Dynamic 360° Floodlight (PointLight)
                    const floodLight = new THREE.PointLight(0xf8fafc, 3.4, spec.range + 8, 1.2);
                    floodLight.position.set(0, 4.8, 0);
                    turretGroup.add(floodLight);

                    // Soft Ground Illumination Halo
                    const glowMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
                    const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(spec.range * 0.45, 24), glowMat);
                    groundGlow.rotation.x = -Math.PI / 2;
                    groundGlow.position.y = 0.03;
                    turretGroup.add(groundGlow);

                    // Health Bar
                    const hpBarGroup = new THREE.Group();
                    hpBarGroup.position.set(0, 5.3, 0);

                    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
                    const hpBgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), hpBgMat);
                    const hpFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
                    const hpFillMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.14), hpFillMat);
                    hpFillMesh.position.z = 0.01;

                    hpBarGroup.add(hpBgMesh);
                    hpBarGroup.add(hpFillMesh);
                    turretGroup.add(hpBarGroup);

                    const waveHpBonus = 1 + (this.currentWave - 1) * 0.12;
                    const hqArmorBonus = 1 + ((this.upgrades && this.upgrades.base_hp) || 0) * 0.15;
                    const scaledMaxHp = Math.round(spec.hp * waveHpBonus * hqArmorBonus);

                    turretGroup.userData = {
                        isTurret: true,
                        isLightMast: true,
                        turretTypeId: spec.id,
                        typeId: spec.id,
                        name: spec.name,
                        hitBox: hitBox,
                        head: headGroup,
                        lightSource: floodLight,
                        groundGlow: groundGlow,
                        range: spec.range,
                        damage: 0,
                        firerate: 0,
                        hp: scaledMaxHp,
                        maxHp: scaledMaxHp,
                        level: 1,
                        totalInvested: spec.cost,
                        lastFired: 0,
                        hpBarGroup: hpBarGroup,
                        hpBarFill: hpFillMesh,
                        hpBarMat: hpFillMat
                    };

                    this.turrets.push(turretGroup);
                    this.scene.add(turretGroup);
                    return turretGroup;
                }

                const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
                const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.2, 8), baseMat);
                baseMesh.position.y = 0.6;
                baseMesh.castShadow = true;
                turretGroup.add(baseMesh);

                const headGroup = new THREE.Group();
                headGroup.position.y = 1.4;

                let headColor = 0x0284c7;
                if (spec.id === 'cannon') headColor = 0xd97706;
                if (spec.id === 'tesla') headColor = 0xa855f7;
                if (spec.id === 'rocket') headColor = 0xef4444;
                if (spec.id === 'artillery') headColor = 0xd97706;
                if (spec.id === 'anti_air') headColor = 0x0284c7;

                const headMat = new THREE.MeshStandardMaterial({ color: headColor, metalness: 0.9, roughness: 0.2 });
                const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 1.2), headMat);
                headMesh.castShadow = true;
                headGroup.add(headMesh);

                const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 });
                if (spec.id === 'tesla') {
                    const coil = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xc084fc }));
                    coil.position.set(0, 0.4, 0);
                    headGroup.add(coil);
                } else if (spec.id === 'anti_air') {
                    // MANTIS 35mm C-RAM Rapid-Fire Air Defense Autocannon
                    const mantisGroup = new THREE.Group();
                    mantisGroup.position.set(0, 0.35, 0);

                    // 35mm Revolver Cannon Main Housing
                    const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
                    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.2), housingMat);
                    mantisGroup.add(housing);

                    // 35mm Heavy Autocannon Barrel pointing upwards ~45 deg
                    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.95 });
                    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.7, 8);
                    barrelGeo.rotateX(Math.PI / 2);
                    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
                    barrelMesh.position.set(0, 0.22, 0.75);
                    barrelMesh.rotation.x = -0.52; // Angled upwards ~30-45 deg
                    mantisGroup.add(barrelMesh);

                    // Perforated Muzzle Brake at barrel tip
                    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 });
                    const brakeGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.35, 8);
                    brakeGeo.rotateX(Math.PI / 2);
                    const brakeMesh = new THREE.Mesh(brakeGeo, brakeMat);
                    brakeMesh.position.set(0, 0.65, 1.45);
                    brakeMesh.rotation.x = -0.52;
                    mantisGroup.add(brakeMesh);

                    // Electro-Optical Sensor / Target Tracking Radar Sphere
                    const eosGroup = new THREE.Group();
                    eosGroup.position.set(0.48, 0.45, 0);

                    const eosDomeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.15 });
                    const eosDome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), eosDomeMat);
                    const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
                    lensGeo.rotateX(Math.PI / 2);
                    const eosLens = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
                    eosLens.position.set(0, 0, 0.22);
                    eosGroup.add(eosDome);
                    eosGroup.add(eosLens);
                    mantisGroup.add(eosGroup);

                    // Side Ammo Feed Box
                    const ammoBoxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
                    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.8), ammoBoxMat);
                    ammoBox.position.set(-0.55, 0.05, -0.1);
                    mantisGroup.add(ammoBox);

                    headGroup.add(mantisGroup);
                    turretGroup.userData.radarDish = eosGroup;
                } else if (spec.id === 'artillery') {
                    // Heavy Artillery Multi-Rocket Pod (Steep Launch Mortar Box)
                    const podGroup = new THREE.Group();
                    podGroup.position.set(0, 0.35, 0.1);
                    podGroup.rotation.x = -0.78; // Tilted upwards ~45-55 deg

                    const podMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
                    const podBody = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.75, 1.4), podMat);
                    podBody.castShadow = true;
                    podGroup.add(podBody);

                    // 4 Launch Tubes
                    const tubeGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.45, 8);
                    tubeGeo.rotateX(Math.PI / 2);
                    [[-0.32, 0.18], [0.32, 0.18], [-0.32, -0.18], [0.32, -0.18]].forEach(([tx, ty]) => {
                        const tube = new THREE.Mesh(tubeGeo, barrelMat);
                        tube.position.set(tx, ty, 0.05);
                        podGroup.add(tube);
                    });

                    // Warning Accent Trim
                    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5 });
                    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.15, 1.2), stripeMat);
                    stripe.position.y = 0.38;
                    podGroup.add(stripe);

                    headGroup.add(podGroup);
                } else if (spec.id === 'rocket') {
                    const launcher = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), barrelMat);
                    launcher.position.set(0, 0.2, 0.5);
                    headGroup.add(launcher);
                } else {
                    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0), barrelMat);
                    barrelL.rotation.x = Math.PI / 2;
                    barrelL.position.set(-0.32, 0.0, 0.65);
                    headGroup.add(barrelL);

                    const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0), barrelMat);
                    barrelR.rotation.x = Math.PI / 2;
                    barrelR.position.set(0.32, 0.0, 0.65);
                    headGroup.add(barrelR);
                }

                turretGroup.add(headGroup);

                // 3D Floating Health Bar
                const hpBarGroup = new THREE.Group();
                hpBarGroup.position.set(0, 2.85, 0);

                const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
                const hpBgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.22), hpBgMat);

                const hpFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
                const hpFillMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.16), hpFillMat);
                hpFillMesh.position.z = 0.01;

                hpBarGroup.add(hpBgMesh);
                hpBarGroup.add(hpFillMesh);
                turretGroup.add(hpBarGroup);

                const waveHpBonus = 1 + (this.currentWave - 1) * 0.12;
                const hqArmorBonus = 1 + ((this.upgrades && this.upgrades.base_hp) || 0) * 0.15;
                const scaledMaxHp = Math.round(spec.hp * waveHpBonus * hqArmorBonus);

                turretGroup.userData = {
                    isTurret: true,
                    turretTypeId: spec.id,
                    typeId: spec.id,
                    name: spec.name,
                    head: headGroup,
                    hitBox: hitBox,
                    range: spec.range,
                    minRange: spec.minRange || 0,
                    damage: spec.damage,
                    firerate: spec.firerate,
                    isExplosive: spec.isExplosive,
                    isArtillery: !!spec.isArtillery,
                    isAntiAir: !!spec.isAntiAir,
                    splashRadius: spec.splashRadius,
                    knockback: spec.knockback || 0,
                    hp: scaledMaxHp,
                    maxHp: scaledMaxHp,
                    level: 1,
                    totalInvested: spec.cost,
                    lastFired: 0,
                    hpBarGroup: hpBarGroup,
                    hpBarFill: hpFillMesh,
                    hpBarMat: hpFillMat
                };

                this.turrets.push(turretGroup);
                this.scene.add(turretGroup);
                return turretGroup;
            }

            updateTurretHpBar(t) {
                if (!t || !t.userData || !t.userData.hpBarFill) return;
                const hpRatio = Math.max(0, Math.min(1, t.userData.hp / t.userData.maxHp));
                t.userData.hpBarFill.scale.set(hpRatio, 1, 1);
                t.userData.hpBarFill.position.x = -0.76 * (1 - hpRatio);

                if (hpRatio > 0.5) {
                    t.userData.hpBarMat.color.setHex(0x22c55e);
                } else if (hpRatio > 0.25) {
                    t.userData.hpBarMat.color.setHex(0xf59e0b);
                } else {
                    t.userData.hpBarMat.color.setHex(0xef4444);
                }
            }

            buildWallAt(wallTypeId, x, z, rot = 0) {
                const spec = WALL_TYPES[wallTypeId];

                const wallGroup = new THREE.Group();
                wallGroup.position.set(x, 0, z);
                wallGroup.rotation.y = rot;

                let wallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
                let wallGeo = new THREE.BoxGeometry(3.6, 1.8, 1.0);
                let wWidth = 3.6, wDepth = 1.0;

                if (spec.id === 'concrete') {
                    wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.5 });
                    wallGeo = new THREE.BoxGeometry(4.2, 2.2, 1.2);
                    wWidth = 4.2; wDepth = 1.2;
                } else if (spec.id === 'laser_wall') {
                    wallMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.9 });
                    wallGeo = new THREE.BoxGeometry(4.5, 2.5, 0.8);
                    wWidth = 4.5; wDepth = 0.8;
                }

                const wallMesh = new THREE.Mesh(wallGeo, wallMat);
                wallMesh.position.y = wallGeo.parameters.height / 2;
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                wallGroup.add(wallMesh);

                if (spec.id === 'laser_wall') {
                    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                    const glowBar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 0.9), glowMat);
                    glowBar.position.y = 2.4;
                    wallGroup.add(glowBar);
                }

                const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
                const hitBox = new THREE.Mesh(new THREE.BoxGeometry(wWidth + 0.4, 2.5, wDepth + 0.4), hitBoxMat);
                hitBox.position.y = 1.25;
                wallGroup.add(hitBox);

                wallGroup.userData = {
                    isWall: true,
                    typeId: spec.id,
                    name: spec.name,
                    hp: spec.hp,
                    maxHp: spec.hp,
                    radius: spec.radius,
                    wWidth: wWidth,
                    wDepth: wDepth,
                    totalInvested: spec.cost
                };

                wallGroup.matrixAutoUpdate = false;
                wallGroup.updateMatrix();
                this.walls.push(wallGroup);
                this.scene.add(wallGroup);
                return wallGroup;
            }

            launchRepairDrones(hangarTurret) {
                if (!hangarTurret || !hangarTurret.userData) return;
                const ud = hangarTurret.userData;
                ud.dronesActive = true;
                if (ud.dockedDrones) ud.dockedDrones.visible = false;

                // Create 3 flying repair drones if not already present
                if (!ud.activeDronesList || ud.activeDronesList.length === 0) {
                    ud.activeDronesList = [];
                    for (let i = 0; i < 3; i++) {
                        const droneGroup = new THREE.Group();
                        droneGroup.position.copy(hangarTurret.position);
                        droneGroup.position.y = 1.2;

                        // Quadcopter Body
                        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x065f46, metalness: 0.8, roughness: 0.2 });
                        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), bodyMat);
                        droneGroup.add(body);

                        // Core Light
                        const coreLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
                        coreLight.position.y = 0.08;
                        droneGroup.add(coreLight);

                        // Rotors
                        const rotorMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.7 });
                        const rotors = [];
                        const rotorOffsets = [
                            [-0.28, 0.1, -0.28],
                            [0.28, 0.1, -0.28],
                            [-0.28, 0.1, 0.28],
                            [0.28, 0.1, 0.28]
                        ];
                        rotorOffsets.forEach(pos => {
                            const r = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.04), rotorMat);
                            r.position.set(pos[0], pos[1], pos[2]);
                            droneGroup.add(r);
                            rotors.push(r);
                        });

                        // Laser Line (for repair beam)
                        const laserGeo = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0, -1, 0)
                        ]);
                        const laserMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
                        const laserLine = new THREE.Line(laserGeo, laserMat);
                        laserLine.visible = false;
                        droneGroup.add(laserLine);

                        droneGroup.userData = {
                            rotors: rotors,
                            laserLine: laserLine,
                            droneIdx: i,
                            orbitAngle: (i * Math.PI * 2) / 3,
                            repairTarget: null,
                            lastSparks: 0
                        };

                        this.scene.add(droneGroup);
                        ud.activeDronesList.push(droneGroup);
                    }
                }
            }

            updateDayNightCycle(dt) {
                if (this.isPaused || this.isGameOver) return;
                const totalDuration = this.dayNightCycleDuration || 180;
                this.dayNightTime = ((this.dayNightTime || 0) + dt) % totalDuration;

                const dayDuration = 150; // 2.5 minutes Tag/Dämmerung
                const nightDuration = 30; // 30 seconds Nacht
                const t = this.dayNightTime;

                let dayFactor = 1.0;
                let phaseText = 'TAG';
                let phaseIcon = 'fa-sun text-amber-300';
                let phaseTextColor = 'text-amber-300';
                let sunAngle = 0;

                if (t < 15) {
                    // Morgendämmerung / Sonnenaufgang (0..15s)
                    const trans = t / 15;
                    dayFactor = trans;
                    sunAngle = (t / dayDuration) * Math.PI;
                    phaseText = 'DÄMMERUNG';
                    phaseIcon = 'fa-cloud-sun text-amber-400 animate-pulse';
                    phaseTextColor = 'text-amber-400';
                } else if (t < 135) {
                    // Strahlender Tag (15..135s = 2 Min voller Tag)
                    dayFactor = 1.0;
                    sunAngle = (t / dayDuration) * Math.PI;
                    phaseText = 'TAG';
                    phaseIcon = 'fa-sun text-amber-300';
                    phaseTextColor = 'text-amber-300';
                } else if (t < 150) {
                    // Abenddämmerung / Sonnenuntergang (135..150s)
                    const trans = 1.0 - ((t - 135) / 15);
                    dayFactor = trans;
                    sunAngle = (t / dayDuration) * Math.PI;
                    phaseText = 'DÄMMERUNG';
                    phaseIcon = 'fa-cloud-moon text-orange-400 animate-pulse';
                    phaseTextColor = 'text-orange-400';
                } else {
                    // Nacht (150..180s = 30s)
                    dayFactor = 0.0;
                    sunAngle = Math.PI + ((t - dayDuration) / nightDuration) * Math.PI;
                    const nightSecLeft = Math.ceil(totalDuration - t);
                    phaseText = `NACHT (${nightSecLeft}s - ZOMBIES SCHNELL)`;
                    phaseIcon = 'fa-moon text-red-400 animate-pulse';
                    phaseTextColor = 'text-red-400 font-bold';
                }

                // Zombie Speed Scaling: Fast & aggressive at night (+50% speed boost)
                if (dayFactor > 0.40) {
                    const dayNorm = (dayFactor - 0.40) / 0.60;
                    this.nightSpeedMult = 1.0 + 0.08 * (1.0 - dayNorm);
                } else {
                    const nightNorm = 1.0 - (dayFactor / 0.40);
                    this.nightSpeedMult = 1.08 + 0.45 * nightNorm; // Up to 1.53x at midnight
                }

                if (this._lastDayNightPhase !== phaseText) {
                    this._lastDayNightPhase = phaseText;
                    const iconEl = document.getElementById('hud-daynight-icon');
                    const textEl = document.getElementById('hud-daynight-text');
                    if (iconEl && textEl) {
                        iconEl.className = `fa-solid ${phaseIcon}`;
                        textEl.innerText = phaseText;
                        textEl.className = phaseTextColor;
                    }
                }

                // 1. FLASHLIGHT (TASCHENLAMPE - RICHTIGER HOCHLEISTUNGS-FLUTER):
                if (this.flashlight) {
                    if (dayFactor > 0.40) {
                        this.flashlight.visible = false;
                        this.flashlight.intensity = 0;
                        if (this.flashlightFill) {
                            this.flashlightFill.visible = false;
                            this.flashlightFill.intensity = 0;
                        }
                        if (this.flashlightGroundBeam) {
                            this.flashlightGroundBeam.visible = false;
                            this.flashlightGroundBeam.material.opacity = 0;
                        }
                    } else {
                        const nightIntensity = 1.0 - (dayFactor / 0.40);
                        this.flashlight.visible = true;
                        this.flashlight.intensity = 28.0 * nightIntensity;

                        if (this.flashlightFill) {
                            this.flashlightFill.visible = true;
                            this.flashlightFill.intensity = 6.5 * nightIntensity;
                        }
                        if (this.flashlightGroundBeam) {
                            this.flashlightGroundBeam.visible = true;
                            this.flashlightGroundBeam.material.opacity = 0.65 * nightIntensity;
                        }
                    }
                }

                // 2. DIRECTIONAL LIGHT (SONNEN- & MONDBEWEGUNG):
                if (this.dirLight) {
                    const sunX = Math.cos(sunAngle) * 55;
                    const sunY = Math.max(15, Math.sin(sunAngle) * 60 + 20);
                    const sunZ = Math.sin(sunAngle * 0.7) * 40;
                    this.dirLight.position.set(sunX, sunY, sunZ);

                    if (dayFactor > 0.40) {
                        const dayNorm = (dayFactor - 0.40) / 0.60;
                        const r = 0.96 + 0.04 * dayNorm;
                        const g = 0.65 + 0.33 * dayNorm;
                        const b = 0.20 + 0.72 * dayNorm;
                        this.dirLight.color.setRGB(r, g, b);
                        this.dirLight.intensity = (this.isMobile ? 2.1 : 1.8) * (0.8 + 0.5 * dayNorm);
                    } else {
                        const nightNorm = 1.0 - (dayFactor / 0.40);
                        const r = 0.40 + 0.18 * nightNorm;
                        const g = 0.60 + 0.20 * nightNorm;
                        const b = 0.95 + 0.05 * nightNorm;
                        this.dirLight.color.setRGB(r, g, b);
                        this.dirLight.intensity = 0.35 + 0.45 * nightNorm;
                    }
                }

                // 3. AMBIENT LIGHT:
                if (this.ambientLight) {
                    if (dayFactor > 0.40) {
                        const dayNorm = (dayFactor - 0.40) / 0.60;
                        const r = 0.40 + 0.32 * dayNorm;
                        const g = 0.46 + 0.32 * dayNorm;
                        const b = 0.58 + 0.30 * dayNorm;
                        this.ambientLight.color.setRGB(r, g, b);
                        this.ambientLight.intensity = (this.isMobile ? 2.0 : 1.7) * (0.9 + 0.35 * dayNorm);
                    } else {
                        const nightNorm = 1.0 - (dayFactor / 0.40);
                        const r = 0.18 - 0.07 * nightNorm;
                        const g = 0.22 - 0.07 * nightNorm;
                        const b = 0.35 - 0.08 * nightNorm;
                        this.ambientLight.color.setRGB(r, g, b);
                        this.ambientLight.intensity = this.isMobile ? (1.3 - 0.3 * nightNorm) : (1.1 - 0.3 * nightNorm);
                    }
                }

                // 4. SCENE BACKGROUND & FOG:
                if (this.scene) {
                    if (!this._skyColor) this._skyColor = new THREE.Color();

                    if (dayFactor > 0.50) {
                        const dNorm = (dayFactor - 0.50) / 0.50;
                        this._skyColor.setRGB(
                            0.08 + 0.14 * dNorm,
                            0.16 + 0.28 * dNorm,
                            0.28 + 0.42 * dNorm
                        );
                    } else if (dayFactor > 0.25) {
                        const sNorm = (dayFactor - 0.25) / 0.25;
                        this._skyColor.setRGB(
                            0.22 + 0.18 * sNorm,
                            0.08 + 0.12 * sNorm,
                            0.16 + 0.15 * sNorm
                        );
                    } else {
                        const nNorm = 1.0 - (dayFactor / 0.25);
                        this._skyColor.setRGB(
                            0.024 - 0.01 * nNorm,
                            0.04 - 0.015 * nNorm,
                            0.08 - 0.02 * nNorm
                        );
                    }

                    if (this.scene.background && this.scene.background.isColor) {
                        this.scene.background.copy(this._skyColor);
                    } else {
                        this.scene.background = this._skyColor.clone();
                    }

                    if (this.scene.fog) {
                        this.scene.fog.color.copy(this._skyColor);
                        if (this.scene.fog.isFog) {
                            this.scene.fog.near = dayFactor > 0.40 ? 80 : 65;
                            this.scene.fog.far = dayFactor > 0.40 ? 195 : 170;
                        }
                    }
                }

                // 5. KATASTROPHENSCHUTZ-LICHTMASTEN (360° LED Flutlicht-Automatik bei Nacht/Dämmerung)
                if (this.turrets && this.turrets.length > 0) {
                    for (let ti = 0; ti < this.turrets.length; ti++) {
                        const t = this.turrets[ti];
                        if (t && t.userData && t.userData.isLightMast && t.userData.lightSource) {
                            const light = t.userData.lightSource;
                            const glow = t.userData.groundGlow;
                            if (dayFactor > 0.45) {
                                light.intensity = 0.3;
                                if (glow) glow.visible = false;
                            } else {
                                const nightPower = 1.0 - (dayFactor / 0.45);
                                light.intensity = 3.8 * (0.6 + 0.4 * nightPower);
                                if (glow) {
                                    glow.visible = true;
                                    glow.material.opacity = 0.16 * nightPower;
                                }
                            }
                        }
                    }
                }
            }

            updateRepairDrones(dt) {
                const now = performance.now();
                for (let ti = 0; ti < this.turrets.length; ti++) {
                    const t = this.turrets[ti];
                    if (!t || !t.userData) continue;
                    const ud = t.userData;

                    if (ud.isHangar) {
                        if (ud.holoMesh) {
                            ud.holoMesh.rotation.y += dt * 1.5;
                        }

                        // Hangar drones are permanently active with global range
                        if (ud.dronesActive) {
                            if (ud.dockedDrones) ud.dockedDrones.visible = false;

                            // Find damaged turrets and damaged walls anywhere on the entire map
                            const damagedTargets = [];
                            this.turrets.forEach(turret => {
                                if (turret !== t && !turret.userData.isIndestructible && turret.userData.hp < turret.userData.maxHp) {
                                    damagedTargets.push({ obj: turret, isWall: false });
                                }
                            });
                            this.walls.forEach(wall => {
                                if (wall && wall.userData && wall.userData.hp < wall.userData.maxHp) {
                                    damagedTargets.push({ obj: wall, isWall: true });
                                }
                            });

                            if (ud.activeDronesList) {
                                ud.activeDronesList.forEach((drone, idx) => {
                                    // Spin rotors
                                    if (drone.userData.rotors) {
                                        drone.userData.rotors.forEach(r => { r.rotation.y += 0.45; });
                                    }

                                    let targetItem = null;
                                    if (damagedTargets.length > 0) {
                                        targetItem = damagedTargets[idx % damagedTargets.length];
                                    }

                                    if (targetItem && targetItem.obj) {
                                        const targetObj = targetItem.obj;
                                        // Hover target position above structure with offset per drone
                                        const offAng = (idx * Math.PI * 2) / 3;
                                        const targetX = targetObj.position.x + Math.sin(offAng) * 0.8;
                                        const targetZ = targetObj.position.z + Math.cos(offAng) * 0.8;
                                        const targetY = 3.2 + Math.sin(now * 0.005 + idx) * 0.2;

                                        // Fly rapidly across any distance on the map (no range limit)
                                        const flySpeed = dt * 4.5;
                                        drone.position.x += (targetX - drone.position.x) * Math.min(1.0, flySpeed);
                                        drone.position.z += (targetZ - drone.position.z) * Math.min(1.0, flySpeed);
                                        drone.position.y += (targetY - drone.position.y) * Math.min(1.0, flySpeed);

                                        // Check distance for repair
                                        const distToTarget = Math.hypot(targetObj.position.x - drone.position.x, targetObj.position.z - drone.position.z);
                                        if (distToTarget < 3.5) {
                                            // Repair structure (~75 HP/s per drone = ~225 HP/s total)
                                            targetObj.userData.hp = Math.min(targetObj.userData.maxHp, targetObj.userData.hp + (75 * dt));
                                            if (!targetItem.isWall) {
                                                this.updateTurretHpBar(targetObj);
                                            }

                                            // Laser beam to target
                                            if (drone.userData.laserLine) {
                                                drone.userData.laserLine.visible = true;
                                                const localTarget = new THREE.Vector3(
                                                    targetObj.position.x - drone.position.x,
                                                    (targetObj.position.y + 1.2) - drone.position.y,
                                                    targetObj.position.z - drone.position.z
                                                );
                                                drone.userData.laserLine.geometry.setFromPoints([
                                                    new THREE.Vector3(0, 0, 0),
                                                    localTarget
                                                ]);
                                            }

                                            // Spawn green repair sparks
                                            if (now - (drone.userData.lastSparks || 0) > 180) {
                                                drone.userData.lastSparks = now;
                                                this.createBloodSparks(targetObj.position, 0x22c55e);
                                            }
                                        } else {
                                            if (drone.userData.laserLine) drone.userData.laserLine.visible = false;
                                        }
                                    } else {
                                        // No damaged targets: orbit above hangar
                                        if (drone.userData.laserLine) drone.userData.laserLine.visible = false;
                                        drone.userData.orbitAngle += dt * 1.8;
                                        const orbitR = 2.4;
                                        const targetX = t.position.x + Math.sin(drone.userData.orbitAngle) * orbitR;
                                        const targetZ = t.position.z + Math.cos(drone.userData.orbitAngle) * orbitR;
                                        const targetY = 3.6 + Math.sin(now * 0.004 + idx) * 0.3;

                                        drone.position.x += (targetX - drone.position.x) * (dt * 3.0);
                                        drone.position.z += (targetZ - drone.position.z) * (dt * 3.0);
                                        drone.position.y += (targetY - drone.position.y) * (dt * 3.0);
                                    }
                                });
                            }
                        }
                    }
                }
            }

            inspectStructure(structureGroup) {
                this.selectedStructure = structureGroup;
                const ud = structureGroup.userData;
                this.isPaused = true;

                const modal = document.getElementById('inspect-modal');
                const title = document.getElementById('inspect-title');
                const subtitle = document.getElementById('inspect-subtitle');
                const stats = document.getElementById('inspect-stats');
                const hangarBox = document.getElementById('inspect-hangar-box');
                const stdActions = document.getElementById('inspect-standard-actions');
                const upgradeBtn = document.getElementById('inspect-upgrade-btn');
                const repairBtn = document.getElementById('inspect-repair-btn');

                title.innerText = ud.name;

                if (ud.isHangar) {
                    subtitle.innerText = `Unzerstörbare Drohnenstation`;
                    stats.innerHTML = `
                        <div>• Drohnengeschwader: <strong class="text-emerald-400">3x Autonome Reparaturdrohnen</strong></div>
                        <div>• Reichweite: <strong class="text-emerald-400">Global (Unbegrenzt)</strong></div>
                        <div>• Pushback / Rückstoß: <strong class="text-slate-400">Keiner (0m)</strong></div>
                        <div>• Reparatur-Fokus: <strong class="text-sky-400">Alle Türme & Barrikaden</strong></div>
                        <div>• Reparaturleistung: <strong class="text-emerald-400">~225 HP / Sekunde</strong></div>
                        <div>• Panzerung: <strong class="text-teal-300">100% (UNZERSTÖRBAR)</strong></div>
                    `;

                    if (hangarBox) {
                        hangarBox.classList.remove('hidden');
                    }
                    if (stdActions) stdActions.classList.add('hidden');
                } else if (ud.isLightMast) {
                    if (hangarBox) hangarBox.classList.add('hidden');
                    if (stdActions) stdActions.classList.remove('hidden');

                    subtitle.innerText = `Lvl ${ud.level} Lichtmast`;
                    stats.innerHTML = `
                        <div>• Haltbarkeit (HP): <strong class="text-emerald-400">${Math.ceil(ud.hp)} / ${ud.maxHp}</strong></div>
                        <div>• Beleuchtung: <strong class="text-amber-300">360° Rundum-LED-Flutlicht</strong></div>
                        <div>• Leuchtradius: <strong class="text-sky-400">${ud.range}m</strong></div>
                        <div>• Pushback: <strong class="text-slate-400">Keiner (0m - blendet nachts)</strong></div>
                        <div>• Taktischer Effekt: <strong class="text-amber-300">Bremst Zombies nachts auf Normaltempo</strong></div>
                        <div>• Nacht-Sensor: <strong class="text-emerald-400">Automatische Aktivierung</strong></div>
                    `;
                    const upgCost = Math.round(ud.totalInvested * 0.80);
                    const repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);

                    document.getElementById('inspect-upgrade-text').innerText = `Upgrade (${formatMoney(upgCost)})`;
                    document.getElementById('inspect-repair-text').innerText = repairCost > 0 ? `Reparieren (${formatMoney(repairCost)})` : 'Reparieren';

                    const canUpgrade = this.money >= upgCost;
                    upgradeBtn.disabled = !canUpgrade;
                    upgradeBtn.className = `py-3 ${canUpgrade ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer shadow-md shadow-amber-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    const canRepair = repairCost > 0 && this.money >= repairCost;
                    repairBtn.disabled = !canRepair;
                    repairBtn.className = `py-3 ${canRepair ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                } else if (ud.isAntiAir) {
                    if (hangarBox) hangarBox.classList.add('hidden');
                    if (stdActions) stdActions.classList.remove('hidden');

                    subtitle.innerText = `Lvl ${ud.level} Flugabwehr`;
                    stats.innerHTML = `
                        <div>• Haltbarkeit (HP): <strong class="text-emerald-400">${Math.ceil(ud.hp)} / ${ud.maxHp}</strong></div>
                        <div>• 35mm Flak-Schaden: <strong class="text-amber-400">${Math.round(ud.damage)} pro Schuss</strong></div>
                        <div>• Flugabwehr-Radius: <strong class="text-sky-400">${ud.range}m</strong></div>
                        <div>• Pushback: <strong class="text-sky-300">Gering (0.4m)</strong></div>
                        <div>• Schnellfeuer-Kadenz: <strong class="text-emerald-400">${ud.firerate}ms (~9 Schuss/Sek.)</strong></div>
                        <div>• Zielsuch-Sensor: <strong class="text-cyan-300">Elektro-Optisches Radar (EOS)</strong></div>
                        <div>• Spezialisierung: <strong class="text-rose-400">Schnellfeuer gegen fliegende Mutanten!</strong></div>
                    `;
                    const upgCost = Math.round(ud.totalInvested * 0.80);
                    const repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);

                    document.getElementById('inspect-upgrade-text').innerText = `Upgrade (${formatMoney(upgCost)})`;
                    document.getElementById('inspect-repair-text').innerText = repairCost > 0 ? `Reparieren (${formatMoney(repairCost)})` : 'Reparieren';

                    const canUpgrade = this.money >= upgCost;
                    upgradeBtn.disabled = !canUpgrade;
                    upgradeBtn.className = `py-3 ${canUpgrade ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer shadow-md shadow-amber-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    const canRepair = repairCost > 0 && this.money >= repairCost;
                    repairBtn.disabled = !canRepair;
                    repairBtn.className = `py-3 ${canRepair ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    upgradeBtn.classList.remove('hidden');
                    repairBtn.classList.remove('hidden');
                } else if (ud.isArtillery) {
                    if (hangarBox) hangarBox.classList.add('hidden');
                    if (stdActions) stdActions.classList.remove('hidden');

                    subtitle.innerText = `Lvl ${ud.level} Raketenwerfer`;
                    stats.innerHTML = `
                        <div>• Haltbarkeit (HP): <strong class="text-emerald-400">${Math.ceil(ud.hp)} / ${ud.maxHp}</strong></div>
                        <div>• Schaden: <strong class="text-amber-400">${Math.round(ud.damage)}</strong></div>
                        <div>• Reichweite: <strong class="text-sky-400">${ud.range}m (Min: ${ud.minRange || 7}m)</strong></div>
                        <div>• Pushback: <strong class="text-rose-400">Extrem (14.0m Druckwelle)</strong></div>
                        <div>• Nachladezeit: <strong class="text-emerald-400">${ud.firerate}ms</strong></div>
                        <div>• Flugbahn: <strong class="text-amber-300">Steiler Ballistischer Bogen</strong></div>
                        <div>• Flächenwirkung: <strong class="text-rose-400">${ud.splashRadius}m Radius</strong></div>
                    `;
                    const upgCost = Math.round(ud.totalInvested * 0.80);
                    const repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);

                    document.getElementById('inspect-upgrade-text').innerText = `Upgrade (${formatMoney(upgCost)})`;
                    document.getElementById('inspect-repair-text').innerText = repairCost > 0 ? `Reparieren (${formatMoney(repairCost)})` : 'Reparieren';

                    const canUpgrade = this.money >= upgCost;
                    upgradeBtn.disabled = !canUpgrade;
                    upgradeBtn.className = `py-3 ${canUpgrade ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer shadow-md shadow-amber-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    const canRepair = repairCost > 0 && this.money >= repairCost;
                    repairBtn.disabled = !canRepair;
                    repairBtn.className = `py-3 ${canRepair ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    upgradeBtn.classList.remove('hidden');
                    repairBtn.classList.remove('hidden');
                } else if (ud.isTurret) {
                    if (hangarBox) hangarBox.classList.add('hidden');
                    if (stdActions) stdActions.classList.remove('hidden');

                    const defaultName = ud.isExplosive ? 'Granatwerfer' : 'Waffenstation';
                    subtitle.innerText = `Lvl ${ud.level} ${ud.name || defaultName}`;
                    stats.innerHTML = `
                        <div>• Haltbarkeit (HP): <strong class="text-emerald-400">${Math.ceil(ud.hp)} / ${ud.maxHp}</strong></div>
                        <div>• Schaden: <strong class="text-amber-400">${Math.round(ud.damage)}</strong></div>
                        <div>• Reichweite: <strong class="text-sky-400">${ud.range}m</strong></div>
                        <div>• Pushback: <strong class="${ud.isExplosive ? 'text-amber-300' : 'text-sky-300'}">${ud.isExplosive ? 'Stark (6.0m)' : 'Gering (0.4m)'}</strong></div>
                        <div>• Kadenz: <strong class="text-emerald-400">${ud.firerate}ms</strong></div>
                    `;
                    const upgCost = Math.round(ud.totalInvested * 0.80);
                    const repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);

                    document.getElementById('inspect-upgrade-text').innerText = `Upgrade (${formatMoney(upgCost)})`;
                    document.getElementById('inspect-repair-text').innerText = repairCost > 0 ? `Reparieren (${formatMoney(repairCost)})` : 'Reparieren';

                    const canUpgrade = this.money >= upgCost;
                    upgradeBtn.disabled = !canUpgrade;
                    upgradeBtn.className = `py-3 ${canUpgrade ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white cursor-pointer shadow-md shadow-amber-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    const canRepair = repairCost > 0 && this.money >= repairCost;
                    repairBtn.disabled = !canRepair;
                    repairBtn.className = `py-3 ${canRepair ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    upgradeBtn.classList.remove('hidden');
                    repairBtn.classList.remove('hidden');
                } else {
                    if (hangarBox) hangarBox.classList.add('hidden');
                    if (stdActions) stdActions.classList.remove('hidden');

                    subtitle.innerText = `Schutzmauer Barriere`;
                    stats.innerHTML = `
                        <div>• Haltbarkeit (HP): <strong class="text-emerald-400">${Math.ceil(ud.hp)} / ${ud.maxHp}</strong></div>
                        <div>• Stoppt normale Zombies & Schüsse</div>
                        <div>• Endboss-Schutz: <strong class="text-rose-400">${ud.typeId === 'laser_wall' ? 'Hoch' : 'Mittel'}</strong></div>
                    `;
                    const repairCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.6);
                    document.getElementById('inspect-repair-text').innerText = repairCost > 0 ? `Reparieren (${formatMoney(repairCost)})` : 'Reparieren';
                    upgradeBtn.classList.add('hidden');

                    const canRepair = repairCost > 0 && this.money >= repairCost;
                    repairBtn.disabled = !canRepair;
                    repairBtn.className = `py-3 ${canRepair ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-950/40' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1`;

                    repairBtn.classList.remove('hidden');
                }

                const sellRefund = Math.round(ud.totalInvested * 0.7);
                document.getElementById('inspect-sell-text').innerText = `Verkaufen (+${formatMoney(sellRefund)})`;

                modal.classList.remove('hidden');
            }

            showDragBoxVisual(startX, startZ, endX, endZ) {
                if (!this.multiSelectHoloGroup) return;
                this.multiSelectHoloGroup.visible = true;

                while (this.multiSelectHoloGroup.children.length > 0) {
                    const c = this.multiSelectHoloGroup.children[0];
                    this.multiSelectHoloGroup.remove(c);
                    if (c.geometry) c.geometry.dispose();
                }

                const minX = Math.min(startX, endX);
                const maxX = Math.max(startX, endX);
                const minZ = Math.min(startZ, endZ);
                const maxZ = Math.max(startZ, endZ);

                const width = Math.max(1.2, maxX - minX);
                const depth = Math.max(1.2, maxZ - minZ);
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;

                // 1. Semi-transparent Ground Quad
                const planeGeo = new THREE.PlaneGeometry(width, depth);
                planeGeo.rotateX(-Math.PI / 2);
                const planeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
                const plane = new THREE.Mesh(planeGeo, planeMat);
                plane.position.set(centerX, 0.08, centerZ);
                plane.renderOrder = 996;
                this.multiSelectHoloGroup.add(plane);

                // 2. Glowing Amber Wireframe Border
                const borderGeo = new THREE.PlaneGeometry(width + 0.2, depth + 0.2);
                borderGeo.rotateX(-Math.PI / 2);
                const borderMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.90, depthWrite: false });
                const border = new THREE.Mesh(borderGeo, borderMat);
                border.position.set(centerX, 0.10, centerZ);
                border.renderOrder = 997;
                this.multiSelectHoloGroup.add(border);

                // 3. Corner Beacons
                const corners = [
                    [minX, minZ], [maxX, minZ], [minX, maxZ], [maxX, maxZ]
                ];
                for (const [cx, cz] of corners) {
                    const cGeo = new THREE.CylinderGeometry(0.12, 0.35, 3.5, 8, 1, true);
                    const cMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
                    const cMesh = new THREE.Mesh(cGeo, cMat);
                    cMesh.position.set(cx, 1.75, cz);
                    cMesh.renderOrder = 998;
                    this.multiSelectHoloGroup.add(cMesh);
                }
            }

            updateDragBoxSelection(startX, startZ, endX, endZ) {
                this.showDragBoxVisual(startX, startZ, endX, endZ);

                const minX = Math.min(startX, endX) - 1.2;
                const maxX = Math.max(startX, endX) + 1.2;
                const minZ = Math.min(startZ, endZ) - 1.2;
                const maxZ = Math.max(startZ, endZ) + 1.2;

                const allStructures = [...this.turrets];
                const found = [];

                for (const struct of allStructures) {
                    const sx = struct.position.x;
                    const sz = struct.position.z;
                    if (sx >= minX && sx <= maxX && sz >= minZ && sz <= maxZ) {
                        found.push(struct);
                    }
                }

                this.selectedStructuresList = found;
                this.updateSelectionRings();
            }

            showHoldSelectionPulse(groundX, groundZ, radius = 14) {
                if (!this.multiSelectHoloGroup) return;
                this.multiSelectHoloGroup.visible = true;

                while (this.multiSelectHoloGroup.children.length > 0) {
                    const c = this.multiSelectHoloGroup.children[0];
                    this.multiSelectHoloGroup.remove(c);
                    if (c.geometry) c.geometry.dispose();
                }

                // 1. Ground Disk
                const diskGeo = new THREE.CircleGeometry(radius, 32);
                diskGeo.rotateX(-Math.PI / 2);
                const diskMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
                const disk = new THREE.Mesh(diskGeo, diskMat);
                disk.position.set(groundX, 0.08, groundZ);
                disk.renderOrder = 996;
                this.multiSelectHoloGroup.add(disk);

                // 2. Glowing Outer Ring
                const ringGeo = new THREE.RingGeometry(Math.max(1, radius - 0.45), radius + 0.45, 48);
                ringGeo.rotateX(-Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(groundX, 0.10, groundZ);
                ring.renderOrder = 997;
                this.multiSelectHoloGroup.add(ring);

                // 3. Central Beacon Beam
                const beamGeo = new THREE.CylinderGeometry(0.2, 0.8, 5.5, 16, 1, true);
                const beamMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
                const beam = new THREE.Mesh(beamGeo, beamMat);
                beam.position.set(groundX, 2.75, groundZ);
                beam.renderOrder = 998;
                this.multiSelectHoloGroup.add(beam);
            }

            hideHoldSelectionPulse() {
                if (this.multiSelectHoloGroup) {
                    this.multiSelectHoloGroup.visible = false;
                }
            }

            updateMultiSelection(groundX, groundZ, radius = 14) {
                this.showHoldSelectionPulse(groundX, groundZ, radius);

                const allStructures = [...this.turrets];
                const found = [];
                const rSq = radius * radius;

                for (const struct of allStructures) {
                    const dx = struct.position.x - groundX;
                    const dz = struct.position.z - groundZ;
                    if (dx * dx + dz * dz <= rSq) {
                        found.push(struct);
                    }
                }

                this.selectedStructuresList = found;
                this.updateSelectionRings();
            }

            updateSelectionRings() {
                if (!this.selectionRingsGroup) return;

                while (this.selectionRingsGroup.children.length > 0) {
                    const c = this.selectionRingsGroup.children[0];
                    this.selectionRingsGroup.remove(c);
                    if (c.geometry) c.geometry.dispose();
                }

                for (const struct of this.selectedStructuresList) {
                    const r = (struct.userData && struct.userData.radius) ? struct.userData.radius : 1.5;
                    const ringGeo = new THREE.RingGeometry(r * 0.95, r * 1.25, 32);
                    ringGeo.rotateX(-Math.PI / 2);
                    const ringMat = new THREE.MeshBasicMaterial({
                        color: 0xf59e0b,
                        transparent: true,
                        opacity: 0.95,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(struct.position.x, 0.12, struct.position.z);
                    ring.renderOrder = 999;
                    this.selectionRingsGroup.add(ring);
                }
            }

            clearSelectedStructures() {
                this.selectedStructuresList = [];
                if (this.selectionRingsGroup) {
                    while (this.selectionRingsGroup.children.length > 0) {
                        const c = this.selectionRingsGroup.children[0];
                        this.selectionRingsGroup.remove(c);
                        if (c.geometry) c.geometry.dispose();
                    }
                }
                this.hideHoldSelectionPulse();
            }

            openMultiInspectModal(structuresList) {
                if (!structuresList || structuresList.length === 0) return;
                this.selectedStructuresList = structuresList;
                this.isPaused = true;
                if (!this.multiInspectFilter) this.multiInspectFilter = 'all';

                this.renderMultiInspectContent();

                const modal = document.getElementById('multi-inspect-modal');
                if (modal) modal.classList.remove('hidden');
            }

            setMultiInspectFilter(filterId) {
                this.multiInspectFilter = filterId;
                this.renderMultiInspectContent();
            }

            renderMultiInspectContent() {
                const structuresList = this.selectedStructuresList || [];
                const sub = document.getElementById('multi-inspect-subtitle');
                const moneyEl = document.getElementById('multi-inspect-money');
                const filterContainer = document.getElementById('multi-inspect-type-filters');
                const breakdown = document.getElementById('multi-inspect-breakdown');
                const upgBtn = document.getElementById('multi-inspect-upgrade-btn');
                const repBtn = document.getElementById('multi-inspect-repair-btn');
                const upgText = document.getElementById('multi-inspect-upgrade-text');
                const repText = document.getElementById('multi-inspect-repair-text');

                if (moneyEl) moneyEl.innerText = formatMoney(this.money);
                if (sub) sub.innerText = `${structuresList.length} ${structuresList.length === 1 ? 'TURM GEWÄHLT' : 'TÜRME GEWÄHLT'}`;

                // 1. Group structures by type for filter pills
                const typeCounts = { all: structuresList.length };
                const typeNames = { all: 'Alle' };
                const typesAvailable = ['all'];

                for (const s of structuresList) {
                    const ud = s.userData || {};
                    const typeKey = ud.specId || ud.name || 'turret';
                    if (!typeCounts[typeKey]) {
                        typeCounts[typeKey] = 0;
                        typeNames[typeKey] = ud.name || typeKey;
                        typesAvailable.push(typeKey);
                    }
                    typeCounts[typeKey]++;
                }

                if (!typesAvailable.includes(this.multiInspectFilter)) {
                    this.multiInspectFilter = 'all';
                }

                // Render Filter Tabs
                if (filterContainer) {
                    filterContainer.innerHTML = '';
                    typesAvailable.forEach(typeKey => {
                        const count = typeCounts[typeKey];
                        const isActive = this.multiInspectFilter === typeKey;
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.onclick = () => this.setMultiInspectFilter(typeKey);
                        btn.className = `px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center space-x-1 flex-shrink-0 cursor-pointer ${
                            isActive
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 border border-amber-500/60'
                                : 'bg-slate-950/90 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800'
                        }`;
                        btn.innerHTML = `<span>${typeNames[typeKey]}</span><span class="font-mono text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-amber-800 text-white' : 'bg-slate-800 text-amber-400'}">${count}</span>`;
                        filterContainer.appendChild(btn);
                    });
                }

                // 2. Filter structures based on active filter
                const filtered = (this.multiInspectFilter === 'all')
                    ? structuresList
                    : structuresList.filter(s => {
                        const ud = s.userData || {};
                        return (ud.specId === this.multiInspectFilter || ud.name === this.multiInspectFilter);
                    });

                // 3. Group filtered turrets by Level
                const groups = {};
                let totalFilterUpgCost = 0;
                let totalFilterRepCost = 0;

                for (const s of filtered) {
                    const ud = s.userData || {};
                    const lvl = ud.level || 1;
                    const typeKey = ud.specId || ud.name || 'turret';
                    const groupKey = `${typeKey}_lvl_${lvl}`;

                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            typeKey,
                            typeName: ud.name || 'Turm',
                            level: lvl,
                            isHangar: !!ud.isHangar,
                            isLightMast: !!ud.isLightMast,
                            structures: [],
                            upgradeCostPerUnit: 0,
                            totalGroupUpgCost: 0,
                            totalGroupRepCost: 0,
                            repCount: 0
                        };
                    }

                    const g = groups[groupKey];
                    g.structures.push(s);

                    // Upgrade cost per unit
                    if (ud.isTurret && !ud.isHangar && ud.totalInvested) {
                        const upgCost = Math.round(ud.totalInvested * 0.80);
                        g.upgradeCostPerUnit = upgCost;
                        g.totalGroupUpgCost += upgCost;
                        totalFilterUpgCost += upgCost;
                    }

                    // Repair cost
                    if (ud.hp < ud.maxHp && ud.totalInvested) {
                        const rCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);
                        if (rCost > 0) {
                            g.totalGroupRepCost += rCost;
                            g.repCount++;
                            totalFilterRepCost += rCost;
                        }
                    }
                }

                // Render Level Cards
                if (breakdown) {
                    breakdown.innerHTML = '';
                    const groupList = Object.values(groups).sort((a, b) => {
                        if (a.typeName !== b.typeName) return a.typeName.localeCompare(b.typeName);
                        return a.level - b.level;
                    });

                    if (groupList.length === 0) {
                        breakdown.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs">Keine Türme in dieser Kategorie gefunden.</div>`;
                    } else {
                        if (!this.multiInspectSliders) this.multiInspectSliders = {};

                        groupList.forEach(g => {
                            const count = g.structures.length;
                            const groupKey = `${g.typeKey}_lvl_${g.level}`;
                            const canUpg = !g.isHangar && g.upgradeCostPerUnit > 0;
                            const maxAffordable = (g.upgradeCostPerUnit > 0)
                                ? Math.min(count, Math.max(0, Math.floor(this.money / g.upgradeCostPerUnit)))
                                : count;

                            let selectedCount = this.multiInspectSliders[groupKey];
                            if (selectedCount === undefined || selectedCount > count || selectedCount < 1) {
                                selectedCount = (maxAffordable > 0) ? maxAffordable : count;
                                this.multiInspectSliders[groupKey] = selectedCount;
                            }

                            const currentUpgCost = selectedCount * g.upgradeCostPerUnit;
                            const canAffordUpg = canUpg && selectedCount > 0 && this.money >= currentUpgCost;
                            const canAffordRep = g.totalGroupRepCost > 0 && this.money >= g.totalGroupRepCost;

                            const card = document.createElement('div');
                            card.className = "bg-slate-950 border border-slate-800/90 rounded-2xl p-3 flex flex-col gap-2.5 hover:border-slate-700 transition";

                            let rightActions = '';
                            if (canUpg) {
                                rightActions += `
                                    <button type="button" id="upg-btn-${groupKey}" onclick="upgradeTurretGroup('${g.typeKey}', ${g.level}, ${selectedCount})" ${canAffordUpg ? '' : 'disabled'} class="flex-1 sm:flex-initial px-3.5 py-2 ${canAffordUpg ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 text-white shadow-md shadow-amber-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 min-h-[36px]">
                                        <i class="fa-solid fa-arrow-up text-[10px]"></i>
                                        <span id="upg-text-${groupKey}">${selectedCount}x Lvl ${g.level + 1} (${formatMoney(currentUpgCost)})</span>
                                    </button>
                                `;
                            } else if (g.isHangar) {
                                rightActions += `<span class="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 rounded-xl text-[10px] font-mono font-bold">UNZERSTÖRBAR</span>`;
                            } else {
                                rightActions += `<span class="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-[10px] font-mono">MAX LEVEL</span>`;
                            }

                            if (g.repCount > 0) {
                                rightActions += `
                                    <button type="button" onclick="repairTurretGroup('${g.typeKey}', ${g.level})" ${canAffordRep ? '' : 'disabled'} class="px-3 py-2 ${canAffordRep ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'} rounded-xl text-xs font-bold transition flex items-center space-x-1 min-h-[36px]" title="${g.repCount} beschädigte Einheiten dieser Stufe reparieren">
                                        <i class="fa-solid fa-wrench text-[10px]"></i>
                                        <span>${formatMoney(g.totalGroupRepCost)}</span>
                                    </button>
                                `;
                            }

                            // Slider HTML if more than 1 turret
                            let sliderHtml = '';
                            if (canUpg && count > 1) {
                                sliderHtml = `
                                    <div class="bg-slate-900/90 border border-slate-800/80 p-2 rounded-xl flex items-center space-x-2 w-full mt-0.5">
                                        <span class="text-[10px] text-slate-400 font-mono flex-shrink-0">Anzahl:</span>
                                        <input type="range" id="slider-input-${groupKey}" min="1" max="${count}" value="${selectedCount}" 
                                               oninput="onMultiInspectSliderChange('${groupKey}', this.value, '${g.typeKey}', ${g.level}, ${g.upgradeCostPerUnit})" 
                                               class="flex-1 accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer">
                                        <span id="slider-val-${groupKey}" class="font-mono text-amber-300 font-bold text-xs min-w-[36px] text-center">${selectedCount}/${count}x</span>
                                        <button type="button" onclick="setMultiInspectSliderMax('${groupKey}', ${count}, '${g.typeKey}', ${g.level}, ${g.upgradeCostPerUnit})" class="text-[9px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-lg border border-slate-700 cursor-pointer">MAX</button>
                                        ${maxAffordable > 0 && maxAffordable < count ? `
                                            <button type="button" onclick="setMultiInspectSliderVal('${groupKey}', ${maxAffordable}, '${g.typeKey}', ${g.level}, ${g.upgradeCostPerUnit})" class="text-[9px] font-bold px-2 py-1 bg-amber-950/70 hover:bg-amber-900 active:bg-amber-950 text-amber-400 rounded-lg border border-amber-500/50 cursor-pointer">LEISTBAR (${maxAffordable}x)</button>
                                        ` : ''}
                                    </div>
                                `;
                            }

                            card.innerHTML = `
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div class="flex items-center space-x-2.5 sm:space-x-3">
                                        <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-xs flex-shrink-0">
                                            L${g.level}
                                        </div>
                                        <div class="min-w-0">
                                            <div class="flex items-center space-x-1.5">
                                                <span class="font-bold text-white text-xs sm:text-sm truncate">${g.typeName}</span>
                                                <span class="bg-slate-800 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">${count}x</span>
                                            </div>
                                            <div class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                                                <span>Einzel: <strong class="text-amber-300">${g.upgradeCostPerUnit > 0 ? formatMoney(g.upgradeCostPerUnit) : '—'}</strong></span>
                                                ${g.repCount > 0 ? `<span class="text-rose-400 font-bold"><i class="fa-solid fa-wrench mr-0.5"></i>${g.repCount} beschädigt</span>` : `<span class="text-emerald-400"><i class="fa-solid fa-shield mr-0.5"></i>100% HP</span>`}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-1.5 flex-shrink-0">
                                        ${rightActions}
                                    </div>
                                </div>
                                ${sliderHtml}
                            `;
                            breakdown.appendChild(card);
                        });
                    }
                }

                // 4. Update Bottom Master Buttons with Smart-Affordability Calculation
                const upgradeableList = filtered
                    .filter(s => {
                        const ud = s.userData || {};
                        return ud.isTurret && !ud.isHangar && ud.totalInvested;
                    })
                    .sort((a, b) => ((a.userData?.level || 1) - (b.userData?.level || 1)));

                let affordableUpgCount = 0;
                let affordableUpgCost = 0;
                let runningMoney = this.money;
                let minSingleUpgCost = Infinity;

                for (const struct of upgradeableList) {
                    const cost = Math.round(struct.userData.totalInvested * 0.80);
                    if (cost < minSingleUpgCost) minSingleUpgCost = cost;
                    if (runningMoney >= cost) {
                        runningMoney -= cost;
                        affordableUpgCost += cost;
                        affordableUpgCount++;
                    }
                }

                const damagedList = filtered
                    .filter(s => {
                        const ud = s.userData || {};
                        return ud.hp < ud.maxHp && ud.totalInvested;
                    });

                let affordableRepCount = 0;
                let affordableRepCost = 0;
                let runningRepMoney = this.money;
                let minSingleRepCost = Infinity;

                for (const struct of damagedList) {
                    const rCost = Math.round((1 - struct.userData.hp / struct.userData.maxHp) * struct.userData.totalInvested * 0.5);
                    if (rCost > 0) {
                        if (rCost < minSingleRepCost) minSingleRepCost = rCost;
                        if (runningRepMoney >= rCost) {
                            runningRepMoney -= rCost;
                            affordableRepCost += rCost;
                            affordableRepCount++;
                        }
                    }
                }

                if (upgBtn) {
                    if (upgradeableList.length === 0) {
                        upgBtn.disabled = true;
                        if (upgText) upgText.innerText = 'Keine Upgrades';
                    } else if (affordableUpgCount === upgradeableList.length) {
                        upgBtn.disabled = false;
                        if (upgText) upgText.innerText = `TowerIQ: Alle ${upgradeableList.length} Upgraden (${formatMoney(totalFilterUpgCost)})`;
                    } else if (affordableUpgCount > 0) {
                        upgBtn.disabled = false;
                        if (upgText) upgText.innerText = `TowerIQ-Engine (${affordableUpgCount}x für ${formatMoney(affordableUpgCost)})`;
                    } else {
                        upgBtn.disabled = true;
                        if (upgText) upgText.innerText = `TowerIQ: Zu teuer (ab ${formatMoney(minSingleUpgCost)})`;
                    }
                }

                if (repBtn) {
                    if (damagedList.length === 0) {
                        repBtn.disabled = true;
                        if (repText) repText.innerText = 'Voll Intakt';
                    } else if (affordableRepCount === damagedList.length) {
                        repBtn.disabled = false;
                        if (repText) repText.innerText = `Alle Reparieren (${formatMoney(totalFilterRepCost)})`;
                    } else if (affordableRepCount > 0) {
                        repBtn.disabled = false;
                        if (repText) repText.innerText = `${affordableRepCount}x Reparieren (${formatMoney(affordableRepCost)})`;
                    } else {
                        repBtn.disabled = true;
                        if (repText) repText.innerText = `Zu wenig Geld (ab ${formatMoney(minSingleRepCost)})`;
                    }
                }
            }

            onMultiInspectSliderChange(groupKey, val, typeKey, level, costPerUnit) {
                const v = parseInt(val, 10) || 1;
                if (!this.multiInspectSliders) this.multiInspectSliders = {};
                this.multiInspectSliders[groupKey] = v;
                const cost = v * costPerUnit;
                const canAfford = this.money >= cost;

                const btn = document.getElementById(`upg-btn-${groupKey}`);
                const text = document.getElementById(`upg-text-${groupKey}`);
                const sliderVal = document.getElementById(`slider-val-${groupKey}`);
                const sliderInput = document.getElementById(`slider-input-${groupKey}`);

                if (sliderVal) {
                    const maxCount = sliderInput ? sliderInput.max : v;
                    sliderVal.innerText = `${v}/${maxCount}x`;
                }
                if (sliderInput) sliderInput.value = v;
                if (text) text.innerText = `${v}x Lvl ${level + 1} (${formatMoney(cost)})`;
                if (btn) {
                    btn.disabled = !canAfford;
                    btn.className = `flex-1 sm:flex-initial px-3.5 py-2 ${canAfford ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 text-white shadow-md shadow-amber-950/40 cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'} rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 min-h-[36px]`;
                    btn.onclick = () => this.upgradeTurretGroup(typeKey, level, v);
                }
            }

            upgradeTurretGroup(typeKey, level, targetCount = null) {
                const list = (this.selectedStructuresList || []).filter(s => {
                    const ud = s.userData || {};
                    const matchType = (typeKey === 'all' || ud.specId === typeKey || ud.name === typeKey);
                    return matchType && (ud.level || 1) === level && ud.isTurret && !ud.isHangar && ud.totalInvested;
                });

                const maxToUpgrade = (typeof targetCount === 'number' && targetCount > 0) ? targetCount : list.length;
                const toUpgradeList = list.slice(0, maxToUpgrade);

                let count = 0;
                for (const struct of toUpgradeList) {
                    const ud = struct.userData;
                    const cost = Math.round(ud.totalInvested * 0.80);
                    if (this.money >= cost) {
                        this.money -= cost;
                        if (typeof applyTurretLevelUpgrades === 'function') {
                            applyTurretLevelUpgrades(struct, ud.level + 1);
                        } else {
                            ud.level++;
                            ud.maxHp = Math.round(ud.maxHp * 1.35);
                            ud.hp = ud.maxHp;
                            if (ud.damage) ud.damage = Math.round(ud.damage * 1.35);
                            if (ud.range) ud.range = Math.round(ud.range * 1.06);
                        }
                        ud.totalInvested += cost;
                        this.createBloodSparks(struct.position, 0xfacc15);
                        count++;
                    }
                }

                if (count > 0) {
                    if (typeof audio !== 'undefined' && audio.playCash) audio.playCash();
                    this.syncHUD();
                    if (typeof showPurchaseToast === 'function') {
                        showPurchaseToast(`⚡ ${count}x Stufe ${level} Türme erfolgreich aufgewertet!`);
                    }
                }
                this.renderMultiInspectContent();
            }

            repairTurretGroup(typeKey, level) {
                const list = (this.selectedStructuresList || []).filter(s => {
                    const ud = s.userData || {};
                    const matchType = (typeKey === 'all' || ud.specId === typeKey || ud.name === typeKey);
                    return matchType && (ud.level || 1) === level && ud.hp < ud.maxHp && ud.totalInvested;
                });

                let count = 0;
                for (const struct of list) {
                    const ud = struct.userData;
                    const rCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);
                    if (rCost > 0 && this.money >= rCost) {
                        this.money -= rCost;
                        ud.hp = ud.maxHp;
                        this.createBloodSparks(struct.position, 0x22c55e);
                        count++;
                    }
                }

                if (count > 0) {
                    if (typeof audio !== 'undefined' && audio.playCash) audio.playCash();
                    this.syncHUD();
                    if (typeof showPurchaseToast === 'function') {
                        showPurchaseToast(`🔧 ${count}x Stufe ${level} Türme repariert!`);
                    }
                }
                this.renderMultiInspectContent();
            }

            upgradeAllSelectedStructures() {
                const targetList = (this.multiInspectFilter && this.multiInspectFilter !== 'all')
                    ? (this.selectedStructuresList || []).filter(s => {
                        const ud = s.userData || {};
                        return (ud.specId === this.multiInspectFilter || ud.name === this.multiInspectFilter);
                    })
                    : (this.selectedStructuresList || []);

                let upgradedCount = 0;

                // Sort by lowest level first to give best strategic efficiency
                const sorted = [...targetList].sort((a, b) => ((a.userData?.level || 1) - (b.userData?.level || 1)));

                for (const struct of sorted) {
                    const ud = struct.userData;
                    if (!ud || !ud.isTurret || ud.isHangar || !ud.totalInvested) continue;

                    const cost = Math.round(ud.totalInvested * 0.80);
                    if (this.money >= cost) {
                        this.money -= cost;
                        if (typeof applyTurretLevelUpgrades === 'function') {
                            applyTurretLevelUpgrades(struct, ud.level + 1);
                        } else {
                            ud.level++;
                            ud.maxHp = Math.round(ud.maxHp * 1.35);
                            ud.hp = ud.maxHp;
                            if (ud.damage) ud.damage = Math.round(ud.damage * 1.35);
                            if (ud.range) ud.range = Math.round(ud.range * 1.06);
                        }
                        ud.totalInvested += cost;
                        this.createBloodSparks(struct.position, 0xfacc15);
                        upgradedCount++;
                    }
                }

                if (upgradedCount > 0) {
                    if (typeof audio !== 'undefined' && audio.playCash) audio.playCash();
                    this.syncHUD();
                    if (typeof showPurchaseToast === 'function') {
                        showPurchaseToast(`⚡ ${upgradedCount} Türme erfolgreich aufgewertet!`);
                    }
                }
                this.renderMultiInspectContent();
            }

            repairAllSelectedStructures() {
                const targetList = (this.multiInspectFilter && this.multiInspectFilter !== 'all')
                    ? (this.selectedStructuresList || []).filter(s => {
                        const ud = s.userData || {};
                        return (ud.specId === this.multiInspectFilter || ud.name === this.multiInspectFilter);
                    })
                    : (this.selectedStructuresList || []);

                let repairedCount = 0;

                for (const struct of targetList) {
                    const ud = struct.userData;
                    if (!ud || !ud.totalInvested) continue;

                    if (ud.hp < ud.maxHp) {
                        const rCost = Math.round((1 - ud.hp / ud.maxHp) * ud.totalInvested * 0.5);
                        if (rCost > 0 && this.money >= rCost) {
                            this.money -= rCost;
                            ud.hp = ud.maxHp;
                            this.createBloodSparks(struct.position, 0x22c55e);
                            repairedCount++;
                        }
                    }
                }

                if (repairedCount > 0) {
                    if (typeof audio !== 'undefined' && audio.playCash) audio.playCash();
                    this.syncHUD();
                    if (typeof showPurchaseToast === 'function') {
                        showPurchaseToast(`🔧 ${repairedCount} Türme vollständig repariert!`);
                    }
                }
                this.renderMultiInspectContent();
            }

            closeMultiInspectModal() {
                const modal = document.getElementById('multi-inspect-modal');
                if (modal) modal.classList.add('hidden');
                this.clearSelectedStructures();
                this.isPaused = false;
            }

            destroyWall(wallGroup) {
                const idx = this.walls.indexOf(wallGroup);
                if (idx !== -1) {
                    this.createExplosion(wallGroup.position, 3.0, 0);
                    this.walls.splice(idx, 1);
                    this.scene.remove(wallGroup);
                }
            }

            killZombie(z) {
                const idx = this.zombies.indexOf(z);
                if (idx !== -1) this.zombies.splice(idx, 1);
                this.scene.remove(z);

                if (z.userData && z.userData.bodyMaterials) {
                    for (let mi = 0; mi < z.userData.bodyMaterials.length; mi++) {
                        const mat = z.userData.bodyMaterials[mi];
                        if (mat && mat.userData && mat.userData.origColor !== undefined) {
                            mat.color.setHex(mat.userData.origColor);
                        }
                    }
                }

                if (z.userData && z.userData.type === 'exploder' && !z.userData.hasExploded) {
                    z.userData.hasExploded = true;
                    this.createExplosion(z.position, 3.8, 85 * (z.userData.dmgMult || 1), 3.8, false, true);
                }
                const scavengerLvl = this.upgrades.scavenger || 0;
                const scavengerMult = Math.pow(1.05, scavengerLvl);
                this.money += Math.round((z.userData ? z.userData.reward : 20) * scavengerMult);
                this.totalKills++;
                audio.playCoin();

                // Object Pool Recycling
                const zType = (z.userData && z.userData.type) ? z.userData.type : 'normal';
                if (!this.zombiePool) this.zombiePool = {};
                if (!this.zombiePool[zType]) this.zombiePool[zType] = [];
                if (this.zombiePool[zType].length < 40) {
                    z.visible = false;
                    this.zombiePool[zType].push(z);
                }

                if (this.zombiesLeftToSpawn <= 0 && this.zombies.length === 0 && !this.isWaveTransitioning) {
                    this.nextWave();
                } else if (this.zombiesLeftToSpawn > 0 && this.zombies.length <= 1) {
                    // Flush immediate spawn if screen is almost empty so player never waits in silence
                    this.spawnZombie();
                }
                this.syncHUD();
            }

            tryShoot() {
                const now = performance.now();
                const spdMult = Math.max(1, this.gameSpeed || 1);
                if (now < this.lastFired + (this.currentWeapon.firerate / spdMult)) return;
                this.lastFired = now;

                if (this.muzzleFlashMesh) {
                    this.muzzleFlashMesh.visible = true;
                    this.muzzleLight.intensity = 5;
                    setTimeout(() => {
                        if (this.muzzleFlashMesh) this.muzzleFlashMesh.visible = false;
                        if (this.muzzleLight) this.muzzleLight.intensity = 0;
                    }, 40);
                }

                const baseAngle = this.playerGroup.rotation.y;

                const wLvl = this.weaponLevels[this.currentWeapon.id] || 1;
                let weaponDmg = this.currentWeapon.damage * (1 + (wLvl - 1) * 0.45);

                const isCrit = Math.random() < (this.upgrades.crit_chance * 0.10);
                if (isCrit) weaponDmg *= 2.0;

                if (!this._playerBulletGeo) {
                    this._playerBulletGeo = new THREE.BoxGeometry(0.16, 0.16, 1.4);
                    this._playerBulletMatCache = {};
                }

                const colorHex = isCrit ? 0xec4899 : this.currentWeapon.color;
                if (!this._playerBulletMatCache[colorHex]) {
                    this._playerBulletMatCache[colorHex] = new THREE.MeshBasicMaterial({ color: colorHex });
                }
                const bulletMat = this._playerBulletMatCache[colorHex];

                // Direct aim calculation: if locked on target, aim straight at it
                let aimAngle = baseAngle;
                if (this.lockedAimTarget && this.lockedAimTarget.userData && this.lockedAimTarget.userData.hp > 0 && !this.lockedAimTarget.userData.isDead) {
                    aimAngle = Math.atan2(
                        this.lockedAimTarget.position.x - this.playerGroup.position.x,
                        this.lockedAimTarget.position.z - this.playerGroup.position.z
                    );
                } else if (this.isMouseDown && this.pointerWorldPos && !this.isMobile) {
                    aimAngle = Math.atan2(
                        this.pointerWorldPos.x - this.playerGroup.position.x,
                        this.pointerWorldPos.z - this.playerGroup.position.z
                    );
                }

                // Snap player model rotation to aimAngle so body & gun are 100% aligned with bullet trajectory
                this.playerGroup.rotation.y = aimAngle;

                const muzzlePos = this._v1;
                if (this.gunMesh) {
                    this.gunMesh.getWorldPosition(muzzlePos);
                    muzzlePos.y = 1.45;
                } else {
                    muzzlePos.set(
                        this.playerGroup.position.x + Math.sin(aimAngle) * 0.65,
                        1.35,
                        this.playerGroup.position.z + Math.cos(aimAngle) * 0.65
                    );
                }

                for (let i = 0; i < this.currentWeapon.count; i++) {
                    const spreadAngle = aimAngle + (Math.random() - 0.5) * (this.currentWeapon.spread || 0);

                    let bullet = this.bulletPool.pop();
                    if (!bullet) {
                        bullet = new THREE.Mesh(this._playerBulletGeo, bulletMat);
                        bullet.userData = { dir: new THREE.Vector3() };
                        this.scene.add(bullet);
                    } else {
                        bullet.geometry = this._playerBulletGeo;
                        bullet.material = bulletMat;
                    }
                    bullet.position.copy(muzzlePos);
                    bullet.quaternion.identity();
                    bullet.rotation.set(0, spreadAngle, 0);
                    bullet.visible = true;

                    if (!bullet.userData.dir) bullet.userData.dir = new THREE.Vector3();
                    bullet.userData.dir.set(Math.sin(spreadAngle), 0, Math.cos(spreadAngle));
                    bullet.userData.speed = this.currentWeapon.speed;
                    bullet.userData.damage = weaponDmg;
                    bullet.userData.isExplosive = this.currentWeapon.isExplosive;
                    bullet.userData.splashRadius = this.currentWeapon.splashRadius || 0;
                    bullet.userData.life = 1.8;
                    bullet.userData.isEnemy = false;
                    bullet.userData.isTurretBullet = false;
                    bullet.userData.isAntiAirBullet = false;

                    this.bullets.push(bullet);
                }

                if (this.currentWeapon.isExplosive) audio.playRocket();
                else if (this.currentWeapon.id === 'shotgun') audio.playShotgun();
                else if (this.currentWeapon.id === 'minigun' && audio.playMinigunShot) audio.playMinigunShot();
                else if (this.currentWeapon.id === 'rifle') audio.playRifle();
                else audio.playPistol();
            }

            flashZombieHit(zombieGroup) {
                if (!zombieGroup.userData) return;
                zombieGroup.userData.flashTimer = 0.09;
                
                // Directly set color on cached bodyMaterials without group.traverse()
                if (zombieGroup.userData.bodyMaterials) {
                    for (let i = 0; i < zombieGroup.userData.bodyMaterials.length; i++) {
                        const mat = zombieGroup.userData.bodyMaterials[i];
                        if (mat) {
                            if (mat.userData.origColor === undefined) {
                                mat.userData.origColor = mat.color.getHex();
                            }
                            mat.color.setHex(0xffffff);
                        }
                    }
                }
            }

            createBloodSparks(pos, colorHex) {
                // Hard cap: never exceed 45 particles to maintain 60 FPS
                const MAX_PARTICLES = 45;
                if (this.particles.length >= MAX_PARTICLES) return;

                const particleCount = this.particles.length > 25 ? 1 : 2;

                if (!this._sparkMatCache) this._sparkMatCache = {};
                const colorKey = colorHex.toString(16);
                if (!this._sparkMatCache[colorKey]) {
                    this._sparkMatCache[colorKey] = new THREE.MeshBasicMaterial({ color: colorHex });
                }
                const pMat = this._sparkMatCache[colorKey];

                if (!this._partGeo) this._partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

                for (let i = 0; i < particleCount; i++) {
                    let p = this.particlePool.pop();
                    if (!p) {
                        p = new THREE.Mesh(this._partGeo, pMat);
                        p.userData = {};
                        this.scene.add(p);
                    } else {
                        p.material = pMat;
                    }
                    p.position.copy(pos);
                    p.visible = true;
                    const sc = 0.7 + Math.random() * 0.7;
                    p.scale.set(sc, sc, sc);
                    p.userData.velX = (Math.random() - 0.5) * 8.5;
                    p.userData.velY = Math.random() * 5.0 + 2.0;
                    p.userData.velZ = (Math.random() - 0.5) * 8.5;
                    p.userData.life = 0.25;
                    this.particles.push(p);
                }
            }

            createDroneMesh() {
                if (this.droneGroup) return;

                this.droneGroup = new THREE.Group();

                // Stealth Quadcopter Drone Body
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.75), bodyMat);
                body.castShadow = true;
                this.droneGroup.add(body);

                // 4 Rotor Arms & Glowing Discs
                const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
                const discMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 });

                this.droneRotors = [];
                [[-0.45, 0.45], [0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]].forEach(pt => {
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), armMat);
                    arm.position.set(pt[0] * 0.6, 0, pt[1] * 0.6);
                    this.droneGroup.add(arm);

                    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12), discMat);
                    rotor.position.set(pt[0], 0.1, pt[1]);
                    this.droneGroup.add(rotor);
                    this.droneRotors.push(rotor);
                });

                // Laser Turret Barrel under belly
                const cannonMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9 });
                const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45), cannonMat);
                cannon.rotation.x = Math.PI / 2;
                cannon.position.set(0, -0.15, 0.3);
                this.droneGroup.add(cannon);

                // Top LED Strobe Light
                const ledMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
                const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), ledMat);
                led.position.set(0, 0.12, 0);
                this.droneGroup.add(led);

                this.droneOrbitAngle = 0;
                this.droneGroup.position.copy(this.playerGroup.position);
                this.droneGroup.position.y = 3.6;

                this.scene.add(this.droneGroup);
            }

            updateDrone(dt) {
                if (!this.upgrades.combat_drone || this.upgrades.combat_drone <= 0) return;

                if (!this.droneGroup) {
                    this.createDroneMesh();
                }

                // Orbit & Follow Player Smoothly
                this.droneOrbitAngle += dt * 2.2;
                const targetX = this.playerGroup.position.x + Math.sin(this.droneOrbitAngle) * 1.8;
                const targetZ = this.playerGroup.position.z + Math.cos(this.droneOrbitAngle) * 1.8;
                const targetY = 3.4 + Math.sin(performance.now() * 0.004) * 0.22;

                this.droneGroup.position.x = THREE.MathUtils.lerp(this.droneGroup.position.x, targetX, 0.12);
                this.droneGroup.position.z = THREE.MathUtils.lerp(this.droneGroup.position.z, targetZ, 0.12);
                this.droneGroup.position.y = THREE.MathUtils.lerp(this.droneGroup.position.y, targetY, 0.12);

                if (this.droneRotors) {
                    this.droneRotors.forEach(r => r.rotation.y += dt * 25);
                }

                // Scan & Fire at closest Zombie
                if (this.zombies.length === 0) return;

                const now = performance.now();
                const droneLvl = this.upgrades.combat_drone;
                const firerate = Math.max(75, 320 - droneLvl * 15);
                if (now < this.lastDroneFired + firerate) return;

                let closestZombie = null;
                let minDistSq = 676.0;

                for (let zi = 0; zi < this.zombies.length; zi++) {
                    const z = this.zombies[zi];
                    if (!z || !z.userData || z.userData.hp <= 0 || z.userData.isDead || z.userData.isFlying) continue;
                    const distSq = this.droneGroup.position.distanceToSquared(z.position);
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestZombie = z;
                    }
                }

                if (closestZombie) {
                    this.lastDroneFired = now;

                    const angle = Math.atan2(
                        closestZombie.position.x - this.droneGroup.position.x,
                        closestZombie.position.z - this.droneGroup.position.z
                    );
                    this.droneGroup.rotation.y = angle;

                    if (!this._droneLaserMat) {
                        this._droneLaserMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
                    }

                    const droneDmg = Math.round(35 * Math.pow(1.08, droneLvl - 1) + (droneLvl * 28));
                    const shotCount = droneLvl >= 12 ? 3 : (droneLvl >= 5 ? 2 : 1);

                    for (let s = 0; s < shotCount; s++) {
                        const bullet = new THREE.Mesh(SHARED_BULLET_GEO, this._droneLaserMat);
                        bullet.position.copy(this.droneGroup.position);
                        bullet.position.y -= 0.18;
                        
                        const spread = (s - (shotCount - 1) / 2) * 0.08;
                        const shotAngle = angle + spread;
                        bullet.quaternion.identity();
                        bullet.rotation.set(0, shotAngle, 0);

                        bullet.userData = {
                            dir: new THREE.Vector3(Math.sin(shotAngle), 0, Math.cos(shotAngle)),
                            speed: 65,
                            damage: droneDmg,
                            isExplosive: false,
                            isTurretBullet: true,
                            isAntiAirBullet: false,
                            isEnemy: false,
                            life: 1.6
                        };

                        this.bullets.push(bullet);
                        this.scene.add(bullet);
                    }
                    audio.playPistol();
                }
            }

            createDogMesh() {
                if (this.dogGroup) return;

                this.dogGroup = new THREE.Group();

                // Stylized German Shepherd & Tactical K9 Materials
                const furBrownMat = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.8 });
                const furBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.85 });
                const furChestMat = new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.8 });
                const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
                const vestBadgeMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
                const noseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
                const tongueMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 });
                const teethMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

                // Main Torso Group (elevated above ground)
                this.dogTorsoGroup = new THREE.Group();
                this.dogTorsoGroup.position.set(0, 0.48, 0);

                // Body core (Tan base)
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.82), furBrownMat);
                body.castShadow = true;
                this.dogTorsoGroup.add(body);

                // Chest front fluff (lighter tone)
                const chest = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.36, 0.35), furChestMat);
                chest.position.set(0, -0.02, 0.26);
                chest.castShadow = true;
                this.dogTorsoGroup.add(chest);

                // Black Saddle overlay on back
                const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.65), furBlackMat);
                saddle.position.set(0, 0.13, -0.05);
                saddle.castShadow = true;
                this.dogTorsoGroup.add(saddle);

                // Tactical K9 Harness / Vest
                const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.40, 0.42), vestMat);
                vest.position.set(0, 0.02, 0.05);
                vest.castShadow = true;
                this.dogTorsoGroup.add(vest);

                // Tactical LED / Badge on top of harness
                const badge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), vestBadgeMat);
                badge.position.set(0, 0.24, 0.05);
                this.dogTorsoGroup.add(badge);

                // Head & Neck Group (Pivot from neck)
                this.dogHeadGroup = new THREE.Group();
                this.dogHeadGroup.position.set(0, 0.28, 0.38);

                // Neck
                const neck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 0.28), furBrownMat);
                neck.position.set(0, 0.08, 0.05);
                neck.rotation.x = -0.35;
                this.dogHeadGroup.add(neck);

                // Skull / Head
                const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), furBrownMat);
                skull.position.set(0, 0.22, 0.16);
                skull.castShadow = true;
                this.dogHeadGroup.add(skull);

                // Black mask on head / brow
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.26), furBlackMat);
                brow.position.set(0, 0.32, 0.18);
                this.dogHeadGroup.add(brow);

                // Snout / Muzzle (Black)
                const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.30), furBlackMat);
                snout.position.set(0, 0.17, 0.42);
                snout.castShadow = true;
                this.dogHeadGroup.add(snout);

                // Nose tip
                const nose = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.08), noseMat);
                nose.position.set(0, 0.21, 0.58);
                this.dogHeadGroup.add(nose);

                // Eyes (Left & Right)
                const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
                eyeL.position.set(-0.14, 0.26, 0.30);
                const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
                eyeR.position.set(0.14, 0.26, 0.30);
                this.dogHeadGroup.add(eyeL);
                this.dogHeadGroup.add(eyeR);

                // Pointy Shepherd Ears
                const earGeo = new THREE.ConeGeometry(0.09, 0.26, 4);
                const earL = new THREE.Mesh(earGeo, furBlackMat);
                earL.position.set(-0.14, 0.44, 0.12);
                earL.rotation.z = 0.22;
                earL.rotation.x = -0.15;
                const earR = new THREE.Mesh(earGeo, furBlackMat);
                earR.position.set(0.14, 0.44, 0.12);
                earR.rotation.z = -0.22;
                earR.rotation.x = -0.15;
                this.dogHeadGroup.add(earL);
                this.dogHeadGroup.add(earR);

                // Articulated Lower Jaw for Bite Attacks
                this.dogJawGroup = new THREE.Group();
                this.dogJawGroup.position.set(0, 0.11, 0.30);
                const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.26), furBrownMat);
                lowerJaw.position.set(0, -0.02, 0.12);
                this.dogJawGroup.add(lowerJaw);
                const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.18), tongueMat);
                tongue.position.set(0, 0.02, 0.10);
                this.dogJawGroup.add(tongue);
                // Top & Bottom Fangs
                const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 3), teethMat);
                fangL.position.set(-0.07, 0.04, 0.20);
                const fangR = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 3), teethMat);
                fangR.position.set(0.07, 0.04, 0.20);
                this.dogJawGroup.add(fangL);
                this.dogJawGroup.add(fangR);

                this.dogHeadGroup.add(this.dogJawGroup);
                this.dogTorsoGroup.add(this.dogHeadGroup);

                // Tail (Articulated wagging tail)
                this.dogTailGroup = new THREE.Group();
                this.dogTailGroup.position.set(0, 0.12, -0.40);
                const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.48), furBlackMat);
                tailMesh.position.set(0, 0.10, -0.20);
                tailMesh.rotation.x = -0.45;
                tailMesh.castShadow = true;
                this.dogTailGroup.add(tailMesh);
                this.dogTorsoGroup.add(this.dogTailGroup);

                // 4 Articulated Legs
                const legGeo = new THREE.BoxGeometry(0.14, 0.42, 0.16);
                const pawGeo = new THREE.BoxGeometry(0.15, 0.09, 0.20);

                // Front Left Leg
                this.dogLegFL = new THREE.Group();
                this.dogLegFL.position.set(-0.18, 0, 0.26);
                const legFL = new THREE.Mesh(legGeo, furBrownMat);
                legFL.position.y = -0.21;
                legFL.castShadow = true;
                this.dogLegFL.add(legFL);
                const pawFL = new THREE.Mesh(pawGeo, furBlackMat);
                pawFL.position.set(0, -0.38, 0.02);
                this.dogLegFL.add(pawFL);
                this.dogTorsoGroup.add(this.dogLegFL);

                // Front Right Leg
                this.dogLegFR = new THREE.Group();
                this.dogLegFR.position.set(0.18, 0, 0.26);
                const legFR = new THREE.Mesh(legGeo, furBrownMat);
                legFR.position.y = -0.21;
                legFR.castShadow = true;
                this.dogLegFR.add(legFR);
                const pawFR = new THREE.Mesh(pawGeo, furBlackMat);
                pawFR.position.set(0, -0.38, 0.02);
                this.dogLegFR.add(pawFR);
                this.dogTorsoGroup.add(this.dogLegFR);

                // Back Left Leg
                this.dogLegBL = new THREE.Group();
                this.dogLegBL.position.set(-0.18, 0, -0.26);
                const legBL = new THREE.Mesh(legGeo, furBrownMat);
                legBL.position.y = -0.21;
                legBL.castShadow = true;
                this.dogLegBL.add(legBL);
                const pawBL = new THREE.Mesh(pawGeo, furBlackMat);
                pawBL.position.set(0, -0.38, 0.02);
                this.dogLegBL.add(pawBL);
                this.dogTorsoGroup.add(this.dogLegBL);

                // Back Right Leg
                this.dogLegBR = new THREE.Group();
                this.dogLegBR.position.set(0.18, 0, -0.26);
                const legBR = new THREE.Mesh(legGeo, furBrownMat);
                legBR.position.y = -0.21;
                legBR.castShadow = true;
                this.dogLegBR.add(legBR);
                const pawBR = new THREE.Mesh(pawGeo, furBlackMat);
                pawBR.position.set(0, -0.38, 0.02);
                this.dogLegBR.add(pawBR);
                this.dogTorsoGroup.add(this.dogLegBR);

                this.dogGroup.add(this.dogTorsoGroup);

                // Place near player
                this.dogGroup.position.copy(this.playerGroup.position);
                this.dogGroup.position.x += 1.8;
                this.dogGroup.position.z += 1.2;
                this.dogGroup.position.y = 0;

                this.dogWalkPhase = 0;
                this.dogState = 'follow';
                this.dogLungeTimer = 0;
                this.dogTargetZombie = null;
                this.lastDogBarkTime = 0;
                this.lastDogGrowlTime = 0;

                this.scene.add(this.dogGroup);
            }

            updateDog(dt) {
                if (!this.dogGroup) {
                    this.createDogMesh();
                    return;
                }

                const now = performance.now();
                const dogLvl = Math.max(1, this.upgrades.companion_dog || 1);
                const playerPos = this.playerGroup.position;
                const dogPos = this.dogGroup.position;

                // Scale dog slightly with high level (capped at 1.7x size)
                const baseScale = Math.min(1.7, 1.0 + (dogLvl - 1) * 0.04);
                this.dogGroup.scale.set(baseScale, baseScale, baseScale);

                // Helper for angle wrapping without 360-degree spinning
                const smoothRotateY = (currentRot, targetAngle, lerpFactor) => {
                    let diff = (targetAngle - currentRot + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                    return currentRot + diff * Math.min(1.0, lerpFactor);
                };

                const distToPlayer = dogPos.distanceTo(playerPos);

                // Initialize state helpers if missing
                if (!this.dogState) this.dogState = 'follow';
                if (this.dogTargetLockTime === undefined) this.dogTargetLockTime = 0;

                // 1. LEASH & RETURN HYSTERESIS
                // Max chase distance from player: 22m. If exceeded, force RETURN until within 6m.
                if (distToPlayer > 22.0) {
                    this.dogState = 'return';
                    this.dogTargetZombie = null;
                }

                if (this.dogState === 'return') {
                    if (distToPlayer <= 6.0) {
                        this.dogState = 'follow';
                    }
                }

                // 2. TARGET SELECTION (Only when not in forced return)
                let currentTarget = this.dogTargetZombie;
                const isTargetValid = currentTarget && 
                    currentTarget.userData && 
                    currentTarget.userData.hp > 0 && 
                    !currentTarget.userData.isDead && 
                    playerPos.distanceTo(currentTarget.position) <= 22.0;

                if (!isTargetValid) {
                    currentTarget = null;
                    this.dogTargetZombie = null;
                }

                // If in follow mode and lock expired, scan for nearest threatening zombie
                if (this.dogState !== 'return' && (!currentTarget || now >= this.dogTargetLockTime)) {
                    const aggroRange = 16.0 + Math.min(6.0, dogLvl * 0.4);
                    const aggroRangeSq = aggroRange * aggroRange;
                    let bestZombie = null;
                    let bestScoreSq = aggroRangeSq;

                    for (let zi = 0; zi < this.zombies.length; zi++) {
                        const z = this.zombies[zi];
                        if (!z || !z.userData || z.userData.hp <= 0 || z.userData.isDead || z.userData.isFlying) continue;
                        
                        const distZToPlayer = playerPos.distanceTo(z.position);
                        if (distZToPlayer > 20.0) continue; // Don't aggro zombies too far from player

                        const distToDogSq = dogPos.distanceToSquared(z.position);
                        const distToPlayerSq = distZToPlayer * distZToPlayer;
                        const scoreSq = distToDogSq * 0.7 + distToPlayerSq * 0.3;

                        if (scoreSq < bestScoreSq) {
                            bestScoreSq = scoreSq;
                            bestZombie = z;
                        }
                    }

                    if (bestZombie) {
                        currentTarget = bestZombie;
                        this.dogTargetZombie = bestZombie;
                        this.dogTargetLockTime = now + 1600; // Commit to this target for 1.6s
                        this.dogState = 'chase';
                    } else {
                        this.dogTargetZombie = null;
                        if (this.dogState === 'chase') this.dogState = 'follow';
                    }
                }

                // 3. TARGET POSITION & MOVEMENT
                let targetX = playerPos.x;
                let targetZ = playerPos.z;
                let isMoving = false;
                let moveSpeed = 7.5 + (this.upgrades.player_speed || 0) * 0.9;

                if (this.dogLungeTimer > 0) {
                    this.dogLungeTimer -= dt;
                } else if (this.dogState === 'chase' && currentTarget) {
                    targetX = currentTarget.position.x;
                    targetZ = currentTarget.position.z;
                    moveSpeed = Math.min(22, 9.5 + (dogLvl * 0.75));

                    const distToZombie = dogPos.distanceTo(currentTarget.position);

                    // BITE ATTACK RANGE CHECK (~2.1 - 3.2 units)
                    const biteRange = 2.1 + Math.min(1.2, dogLvl * 0.06);
                    if (distToZombie <= biteRange) {
                        const biteCooldown = Math.max(180, 750 - dogLvl * 35);
                        if (now - this.lastDogBite >= biteCooldown) {
                            this.lastDogBite = now;
                            this.dogLungeTimer = 0.22;
                            
                            // Scaled base damage + percentage execute bonus for late-game waves
                            const baseDogDmg = Math.round(55 * Math.pow(1.08, dogLvl - 1) + (dogLvl * 40));
                            const percentBonus = Math.min(currentTarget.userData.maxHp * 0.035, 150 * dogLvl);
                            const isCrit = Math.random() < Math.min(0.50, 0.15 + (dogLvl * 0.01));
                            const finalDamage = Math.round(isCrit ? (baseDogDmg + percentBonus) * 2.2 : (baseDogDmg + percentBonus));

                            currentTarget.userData.hp -= finalDamage;
                            
                            // Level 3+ Cleave / Area Bite to surrounding zombies (3.5m radius)
                            if (dogLvl >= 3 && this.zombies.length > 1) {
                                const cleaveRadiusSq = 12.25;
                                for (let zi = 0; zi < this.zombies.length; zi++) {
                                    const otherZ = this.zombies[zi];
                                    if (!otherZ || otherZ === currentTarget || otherZ.userData.hp <= 0 || otherZ.userData.isDead) continue;
                                    if (dogPos.distanceToSquared(otherZ.position) <= cleaveRadiusSq) {
                                        const cleaveDmg = Math.round(finalDamage * 0.45);
                                        otherZ.userData.hp -= cleaveDmg;
                                        this.flashZombieHit(otherZ);
                                        if (otherZ.userData.hp <= 0) this.killZombie(otherZ);
                                    }
                                }
                            }

                            // Knockback zombie
                            const knockAngle = Math.atan2(currentTarget.position.x - dogPos.x, currentTarget.position.z - dogPos.z);
                            const knockbackForce = 0.4 + Math.min(1.2, dogLvl * 0.08);
                            currentTarget.position.x += Math.sin(knockAngle) * knockbackForce;
                            currentTarget.position.z += Math.cos(knockAngle) * knockbackForce;

                            // Level 2+ Slow / Bleed
                            if (dogLvl >= 2 && currentTarget.userData.speed) {
                                currentTarget.userData.speed = Math.max(0.015, currentTarget.userData.speed * (0.85 - Math.min(0.4, dogLvl * 0.02)));
                            }

                            // Flash and particles
                            this.flashZombieHit(currentTarget);
                            this._v2.set(currentTarget.position.x, 0.8 * currentTarget.userData.scale, currentTarget.position.z);
                            this.createBloodSparks(this._v2, 0xef4444);

                            // Sound
                            audio.playDogBite();
                            if (Math.random() < 0.4 || isCrit) {
                                audio.playDogBark();
                            }

                            if (currentTarget.userData.hp <= 0) {
                                this.killZombie(currentTarget);
                                this.dogTargetZombie = null;
                            }
                        }
                    }
                } else {
                    // FOLLOW / RETURN COMPANION MODE (Smooth heel positioning)
                    const pRot = this.playerMesh ? this.playerMesh.rotation.y : 0;
                    const flankOffsetX = Math.sin(pRot + 2.5) * 1.7;
                    const flankOffsetZ = Math.cos(pRot + 2.5) * 1.7;
                    targetX = playerPos.x + flankOffsetX;
                    targetZ = playerPos.z + flankOffsetZ;
                    if (this.dogState === 'return') {
                        moveSpeed = Math.min(24, moveSpeed * 1.5);
                    }
                }

                // Move toward target position
                const dx = targetX - dogPos.x;
                const dz = targetZ - dogPos.z;
                const distToTarget = Math.sqrt(dx * dx + dz * dz);

                const stopDist = (this.dogState === 'chase') ? 1.4 : 0.8;

                if (distToTarget > stopDist) {
                    isMoving = true;
                    const moveStep = Math.min(distToTarget, moveSpeed * dt);
                    dogPos.x += (dx / distToTarget) * moveStep;
                    dogPos.z += (dz / distToTarget) * moveStep;

                    const moveAngle = Math.atan2(dx, dz);
                    this.dogGroup.rotation.y = smoothRotateY(this.dogGroup.rotation.y, moveAngle, 0.25);
                } else if (currentTarget) {
                    const faceAngle = Math.atan2(currentTarget.position.x - dogPos.x, currentTarget.position.z - dogPos.z);
                    this.dogGroup.rotation.y = smoothRotateY(this.dogGroup.rotation.y, faceAngle, 0.35);
                }

                // Y-position / Ground clamping & Lunge physics
                if (this.dogLungeTimer > 0) {
                    const lungeProgress = this.dogLungeTimer / 0.24;
                    this.dogGroup.position.y = Math.sin(lungeProgress * Math.PI) * 0.45;
                } else {
                    this.dogGroup.position.y = THREE.MathUtils.lerp(this.dogGroup.position.y, 0, 0.2);
                }

                // 4. Dynamic Skeletal Animations
                if (isMoving) {
                    const animSpeed = moveSpeed * 1.8;
                    this.dogWalkPhase += dt * animSpeed;

                    const legSwing = Math.sin(this.dogWalkPhase) * 0.75;
                    this.dogLegFL.rotation.x = legSwing;
                    this.dogLegFR.rotation.x = -legSwing;
                    this.dogLegBL.rotation.x = -legSwing;
                    this.dogLegBR.rotation.x = legSwing;

                    this.dogTorsoGroup.position.y = 0.48 + Math.abs(Math.sin(this.dogWalkPhase * 2)) * 0.06;
                    this.dogTorsoGroup.rotation.z = Math.sin(this.dogWalkPhase) * 0.05;

                    const tailSpeed = (this.dogState === 'chase') ? 14 : 7;
                    this.dogTailGroup.rotation.y = Math.sin(now * 0.001 * tailSpeed) * 0.4;
                    this.dogTailGroup.rotation.x = (this.dogState === 'chase') ? -0.1 : 0.2;
                } else {
                    this.dogLegFL.rotation.x = THREE.MathUtils.lerp(this.dogLegFL.rotation.x, 0, 0.15);
                    this.dogLegFR.rotation.x = THREE.MathUtils.lerp(this.dogLegFR.rotation.x, 0, 0.15);
                    this.dogLegBL.rotation.x = THREE.MathUtils.lerp(this.dogLegBL.rotation.x, 0, 0.15);
                    this.dogLegBR.rotation.x = THREE.MathUtils.lerp(this.dogLegBR.rotation.x, 0, 0.15);

                    this.dogTorsoGroup.position.y = 0.48 + Math.sin(now * 0.003) * 0.02;
                    this.dogTorsoGroup.rotation.z = 0;

                    this.dogTailGroup.rotation.y = Math.sin(now * 0.004) * 0.35;
                    this.dogTailGroup.rotation.x = 0.15;
                }

                // Jaw snapping animation during bite lunge
                if (this.dogJawGroup) {
                    if (this.dogLungeTimer > 0) {
                        const jawProgress = this.dogLungeTimer / 0.24;
                        this.dogJawGroup.rotation.x = Math.sin(jawProgress * Math.PI) * 0.65;
                    } else {
                        this.dogJawGroup.rotation.x = Math.sin(now * 0.006) * 0.08 + 0.04;
                    }
                }
            }

            createNeonTargetMarker(targetX) {
                if (this.targetMarkerGroup) {
                    this.scene.remove(this.targetMarkerGroup);
                }

                const markerGroup = new THREE.Group();
                const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5 });
                const lineMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7 });

                // Center target laser line
                const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 130), laserMat);
                centerLine.rotation.x = -Math.PI / 2;
                centerLine.position.set(targetX, 0.05, 0);
                markerGroup.add(centerLine);

                // Left boundary marker (Jet 1 corridor)
                const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 130), lineMat);
                leftLine.rotation.x = -Math.PI / 2;
                leftLine.position.set(targetX - 9.5, 0.05, 0);
                markerGroup.add(leftLine);

                // Right boundary marker (Jet 2 corridor)
                const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 130), lineMat);
                rightLine.rotation.x = -Math.PI / 2;
                rightLine.position.set(targetX + 9.5, 0.05, 0);
                markerGroup.add(rightLine);

                // Crosshair dashes along Z axis
                for (let z = -55; z <= 55; z += 15) {
                    const dash = new THREE.Mesh(new THREE.PlaneGeometry(19, 0.25), lineMat);
                    dash.rotation.x = -Math.PI / 2;
                    dash.position.set(targetX, 0.05, z);
                    markerGroup.add(dash);
                }

                this.scene.add(markerGroup);
                this.targetMarkerGroup = markerGroup;
                this.targetMarkerLife = 10.0;
            }

            triggerAirstrike() {
                if (typeof Storage !== 'undefined' && Storage.data.extraAirstrikeEnabled === false) return;
                if (this.isPaused || this.isGameOver || this.airstrikeCooldown > 0 || (this.activeAirstrikes && this.activeAirstrikes.length > 0)) return;

                this.airstrikeCooldown = 45.0;

                // Lock player's exact X position when requested
                const lockX = this.playerGroup.position.x;
                this.createNeonTargetMarker(lockX);

                // 1. Play Radio Voice Speech (starts instantly)
                audio.playRadioVoice(() => {
                    if (this.isGameOver) return;

                    this.activeAirstrikes = [];

                    // Flight 1: Jet 1 (Left Flank Corridor: lockX - 5.5m)
                    this.spawnJetStrike(lockX - 5.5);

                    // Flight 2: Jet 2 (Right Flank Corridor: lockX + 5.5m, 1.2s later with Jet sound, NO RADIO!)
                    setTimeout(() => {
                        if (!this.isGameOver) {
                            this.spawnJetStrike(lockX + 5.5);
                        }
                    }, 1200);
                });
            }

            spawnJetStrike(targetX) {
                audio.playJetFlyover();

                const jetGroup = new THREE.Group();
                // Bright high-visibility metallic tactical titanium alloy fuselage
                const jetMat = new THREE.MeshStandardMaterial({ 
                    color: 0xf8fafc, 
                    metalness: 0.5, 
                    roughness: 0.2,
                    emissive: 0x334155,
                    emissiveIntensity: 0.35
                });
                const wingMat = new THREE.MeshStandardMaterial({ 
                    color: 0xe2e8f0, 
                    metalness: 0.6, 
                    roughness: 0.25,
                    emissive: 0x1e293b,
                    emissiveIntensity: 0.3
                });

                // Main Fuselage (streamlined supersonic body)
                const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.85, 5.2, 8), jetMat);
                fuselage.rotation.x = Math.PI / 2;
                jetGroup.add(fuselage);

                // Glowing Cyan Cockpit Canopy Glass
                const canopyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.8, 8), canopyMat);
                canopy.rotation.x = Math.PI / 2;
                canopy.position.set(0, 0.42, 0.3);
                canopy.scale.set(0.7, 1, 0.5);
                jetGroup.add(canopy);

                // Swept Delta Wings
                const wings = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 1.6), wingMat);
                wings.position.set(0, 0, -0.4);
                jetGroup.add(wings);

                // Twin Vertical Tail Stabilizers
                const finGeo = new THREE.BoxGeometry(0.1, 1.2, 0.9);
                const finL = new THREE.Mesh(finGeo, wingMat);
                finL.position.set(-0.75, 0.6, -1.9);
                finL.rotation.z = -0.15;
                jetGroup.add(finL);

                const finR = new THREE.Mesh(finGeo, wingMat);
                finR.position.set(0.75, 0.6, -1.9);
                finR.rotation.z = 0.15;
                jetGroup.add(finR);

                // === POSITIONS- & NAVIGATIONS-LICHTER ===
                // 1. Linke Tragfläche: ROTES Positionslicht (Port Light)
                const redNavMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
                const redNav = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), redNavMat);
                redNav.position.set(-2.8, 0, -0.4);
                jetGroup.add(redNav);

                // 2. Rechte Tragfläche: GRÜNES Positionslicht (Starboard Light)
                const greenNavMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
                const greenNav = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), greenNavMat);
                greenNav.position.set(2.8, 0, -0.4);
                jetGroup.add(greenNav);

                // 3. Heck-Strobe: Weisses Blitzlicht
                const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const tailStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), strobeMat);
                tailStrobe.position.set(0, 1.15, -2.2);
                jetGroup.add(tailStrobe);

                // 4. Bug-Scheinwerfer (Bright White Nose Light)
                const noseLightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
                const noseLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), noseLightMat);
                noseLight.position.set(0, -0.05, 2.55);
                jetGroup.add(noseLight);

                // 5. Dual Twin Glowing Jet Afterburners (Feurige Triebwerke)
                const burnerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
                const burnerL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.1, 1.0, 8), burnerMat);
                burnerL.rotation.x = Math.PI / 2;
                burnerL.position.set(-0.45, 0, -2.7);
                jetGroup.add(burnerL);

                const burnerR = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.1, 1.0, 8), burnerMat);
                burnerR.rotation.x = Math.PI / 2;
                burnerR.position.set(0.45, 0, -2.7);
                jetGroup.add(burnerR);

                // Dynamisches Boden-Licht (Beleuchtet Boden & Arena beim Überflug)
                const jetLight = new THREE.PointLight(0x38bdf8, 3.5, 45);
                jetLight.position.set(0, -2.0, 0);
                jetGroup.add(jetLight);

                jetGroup.position.set(targetX, 24, -188);
                jetGroup.rotation.y = 0;

                this.scene.add(jetGroup);

                if (!this.activeAirstrikes) this.activeAirstrikes = [];
                this.activeAirstrikes.push({
                    jetMesh: jetGroup,
                    speed: 75,
                    targetX: targetX,
                    droppedBombs: 0,
                    maxBombs: 16,
                    lastDropZ: -300,
                    dropDelay: 1.5,
                    tailStrobe: tailStrobe
                });
            }

            updateAirstrike(dt) {
                if (this.airstrikeCooldown > 0) {
                    this.airstrikeCooldown = Math.max(0, this.airstrikeCooldown - dt);
                    const cdSec = Math.ceil(this.airstrikeCooldown);

                    if (this._lastAirstrikeCdSec !== cdSec) {
                        this._lastAirstrikeCdSec = cdSec;
                        const statusText = document.getElementById('airstrike-status-text');
                        const btnIcon = document.getElementById('airstrike-icon');
                        const btn = document.getElementById('hud-airstrike-btn');
                        const progressFill = document.getElementById('airstrike-progress-fill');

                        const maxCd = 45.0;
                        const fillPct = Math.min(100, Math.max(0, Math.round(((maxCd - this.airstrikeCooldown) / maxCd) * 100)));

                        if (progressFill) {
                            progressFill.style.height = `${fillPct}%`;
                            progressFill.style.width = '100%';
                        }

                        if (this.airstrikeCooldown > 0) {
                            if (statusText) statusText.innerText = `${cdSec}s`;
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-slate-400 opacity-60 text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 border border-slate-700/60 text-slate-500 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center flex-shrink-0 pointer-events-auto";
                        } else {
                            if (statusText) statusText.innerText = "";
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-amber-400 airstrike-ready-blink text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 hover:bg-slate-900 active:scale-95 border border-amber-500/60 text-amber-400 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg shadow backdrop-blur-sm transition flex items-center justify-center flex-shrink-0 pointer-events-auto cursor-pointer";
                        }
                        if (typeof Storage !== 'undefined' && Storage.data.extraAirstrikeEnabled === false) {
                            if (btn && !btn.classList.contains('hidden')) btn.classList.add('hidden');
                        }
                    }
                } else if (this._lastAirstrikeCdSec !== 0) {
                    this._lastAirstrikeCdSec = 0;
                    const progressFill = document.getElementById('airstrike-progress-fill');
                    if (progressFill) {
                        progressFill.style.height = "100%";
                        progressFill.style.width = "100%";
                    }
                }

                if (this.targetMarkerGroup) {
                    this.targetMarkerLife -= dt;
                    if (this.targetMarkerLife <= 0) {
                        this.scene.remove(this.targetMarkerGroup);
                        this.targetMarkerGroup = null;
                    }
                }

                if (this.napalmZones && this.napalmZones.length > 0) {
                    for (let i = this.napalmZones.length - 1; i >= 0; i--) {
                        const zone = this.napalmZones[i];
                        zone.life -= dt;
                        zone.damageTimer = (zone.damageTimer || 0) + dt;

                        if (zone.damageTimer >= 0.2) {
                            zone.damageTimer = 0;
                            for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                                const z = this.zombies[zi];
                                if (z.userData.isDead) continue;
                                if (z.position.distanceTo(zone.pos) < 17.5) {
                                    z.userData.hp = -9999;
                                    this.flashZombieHit(z);
                                    this.killZombie(z);
                                }
                            }
                        }

                        if (zone.life <= 0) {
                            this.scene.remove(zone.mesh);
                            if (zone.mesh.geometry) zone.mesh.geometry.dispose();
                            if (zone.mesh.material) zone.mesh.material.dispose();
                            this.napalmZones.splice(i, 1);
                        }
                    }
                }

                if (this.activeAirstrikes && this.activeAirstrikes.length > 0) {
                    for (let k = this.activeAirstrikes.length - 1; k >= 0; k--) {
                        const strike = this.activeAirstrikes[k];
                        strike.jetMesh.position.z += strike.speed * dt;

                        if (strike.tailStrobe) {
                            strike.tailStrobe.visible = (Math.floor(performance.now() / 120) % 2 === 0);
                        }

                        // Count down initial drop delay (0.75s after jet flyover sound)
                        if (strike.dropDelay > 0) {
                            strike.dropDelay -= dt;
                            if (strike.dropDelay <= 0) {
                                // Delay just expired — reset lastDropZ so first bomb fires right away
                                strike.lastDropZ = strike.jetMesh.position.z - 9.5;
                            }
                        }

                        if (strike.dropDelay <= 0 && strike.droppedBombs < strike.maxBombs && strike.jetMesh.position.z >= (strike.lastDropZ + 9.5)) {
                            strike.droppedBombs++;
                            strike.lastDropZ = strike.jetMesh.position.z;

                            const isLeft = (strike.droppedBombs % 2 === 1);
                            const offsetX = isLeft ? -3.5 : 3.5;
                            const dropX = THREE.MathUtils.clamp(strike.targetX + offsetX + (Math.random() - 0.5) * 1.0, -72, 72);
                            const dropZ = strike.jetMesh.position.z;
                            const impactPos = new THREE.Vector3(dropX, 0, dropZ);

                            // INSTANT KILL EXPLOSION with 17.5m wide killzone radius, visual size stays original (6.5)!
                            this.createExplosion(impactPos, 17.5, 99999, 6.5, true);

                            const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8 });
                            const fireZone = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 0.15, 12), fireMat);
                            fireZone.position.copy(impactPos);
                            fireZone.position.y = 0.1;
                            this.scene.add(fireZone);

                            if (!this.napalmZones) this.napalmZones = [];
                            this.napalmZones.push({
                                mesh: fireZone,
                                pos: impactPos,
                                life: 1.2,
                                damageTimer: 0
                            });
                        }

                        if (strike.jetMesh.position.z > 80) {
                            this.scene.remove(strike.jetMesh);
                            this.activeAirstrikes.splice(k, 1);
                        }
                    }
                }
            }

            shakeScreen(intensity = 0.5) {
                this.cameraShake = Math.max(this.cameraShake || 0, intensity);
            }

            triggerNuke() {
                if (typeof Storage !== 'undefined' && Storage.data.extraNukeEnabled === false) return;
                if (this.isPaused || this.isGameOver || this.isNukeActive) return;

                if (this.nukeCooldown > 0) {
                    if (typeof showWarningToast === 'function') {
                        showWarningToast(`☢️ Atombombe lädt nach: noch ${Math.ceil(this.nukeCooldown)}s!`);
                    }
                    return;
                }

                this.nukeCooldown = 90.0;
                this.isNukeActive = true;

                if (typeof audio !== 'undefined') {
                    if (audio.playConfirmBip) audio.playConfirmBip();
                    if (audio.startMusic) audio.startMusic();
                    if (audio.playAtomicSound) audio.playAtomicSound();
                    if (audio.startNuclearSiren) audio.startNuclearSiren();
                }

                // Show Nuclear Warning HUD Banner
                const warnHud = document.getElementById('nuke-warning-hud');
                const warnSub = document.getElementById('nuke-warning-sub');
                if (warnHud) {
                    warnHud.classList.remove('hidden');
                    warnHud.style.opacity = '1';
                }
                if (warnSub) warnSub.innerText = "STRATEGISCHER STEALTH-BOMBER IM ANFLUG...";

                // Create Ground Target Warning Holo-Ring at center (0, 0.08, 0)
                if (this.nukeTargetRing) {
                    this.scene.remove(this.nukeTargetRing.group);
                    this.nukeTargetRing = null;
                }
                const ringGroup = new THREE.Group();
                ringGroup.position.set(0, 0.08, 0);

                // Outer pulsing red hazard ring
                const outerGeo = new THREE.RingGeometry(22, 23.5, 48);
                const outerMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
                const outerRing = new THREE.Mesh(outerGeo, outerMat);
                outerRing.rotation.x = -Math.PI / 2;
                ringGroup.add(outerRing);

                // Middle amber ring
                const midGeo = new THREE.RingGeometry(12, 13, 36);
                const midMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
                const midRing = new THREE.Mesh(midGeo, midMat);
                midRing.rotation.x = -Math.PI / 2;
                ringGroup.add(midRing);

                // Inner core red ring
                const coreGeo = new THREE.RingGeometry(2, 3.2, 24);
                const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
                const coreRing = new THREE.Mesh(coreGeo, coreMat);
                coreRing.rotation.x = -Math.PI / 2;
                ringGroup.add(coreRing);

                // Crosshairs
                const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.7 });
                const crossX = new THREE.Mesh(new THREE.BoxGeometry(46, 0.02, 0.4), crossMat);
                const crossZ = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 46), crossMat);
                ringGroup.add(crossX);
                ringGroup.add(crossZ);

                this.scene.add(ringGroup);
                this.nukeTargetRing = {
                    group: ringGroup,
                    outerMat: outerMat,
                    midMat: midMat,
                    coreMat: coreMat,
                    time: 0
                };

                this.shakeScreen(0.3);

                // After ~2 seconds of siren and tension -> Launch Stealth Bomber
                setTimeout(() => {
                    if (this.isGameOver) {
                        if (typeof audio !== 'undefined' && audio.stopNuclearSiren) audio.stopNuclearSiren();
                        this.isNukeActive = false;
                        if (this.nukeTargetRing) {
                            this.scene.remove(this.nukeTargetRing.group);
                            this.nukeTargetRing = null;
                        }
                        if (warnHud) warnHud.classList.add('hidden');
                        return;
                    }
                    this.spawnNukeJet();
                }, 2000);
            }

            spawnNukeJet() {
                if (typeof audio !== 'undefined' && audio.playNukeJetSound) {
                    audio.playNukeJetSound();
                }

                const warnSub = document.getElementById('nuke-warning-sub');
                if (warnSub) warnSub.innerText = "STEALTH-BOMBER IM ZIELRAUM - ABWURF ERFOLGT!";

                const jetGroup = new THREE.Group();
                const stealthBlackMat = new THREE.MeshStandardMaterial({ 
                    color: 0x0a0a0c, 
                    metalness: 0.85, 
                    roughness: 0.25,
                    emissive: 0x111114,
                    emissiveIntensity: 0.2
                });
                const wingMat = new THREE.MeshStandardMaterial({ 
                    color: 0x141418, 
                    metalness: 0.9, 
                    roughness: 0.2,
                    emissive: 0x09090b,
                    emissiveIntensity: 0.1
                });

                // Giant Supersonic Stealth Fuselage
                const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 11.0, 8), stealthBlackMat);
                fuselage.rotation.x = Math.PI / 2;
                jetGroup.add(fuselage);

                // Cockpit Canopy (Amber Gold Reflective Glass)
                const canopyMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
                const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.2, 8), canopyMat);
                canopy.rotation.x = Math.PI / 2;
                canopy.position.set(0, 0.7, 1.0);
                canopy.scale.set(0.7, 1, 0.5);
                jetGroup.add(canopy);

                // Massive Delta Stealth Flying Wings
                const wings = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.25, 4.5), wingMat);
                wings.position.set(0, 0, -1.2);
                jetGroup.add(wings);

                // Twin Canting Tail Fins
                const tailGeo = new THREE.BoxGeometry(0.18, 2.8, 2.0);
                const tailL = new THREE.Mesh(tailGeo, wingMat);
                tailL.position.set(-2.2, 1.2, -3.8);
                tailL.rotation.z = -0.35;
                jetGroup.add(tailL);

                const tailR = new THREE.Mesh(tailGeo, wingMat);
                tailR.position.set(2.2, 1.2, -3.8);
                tailR.rotation.z = 0.35;
                jetGroup.add(tailR);

                // Wingtip Navigation & Strobe Lights
                const redNavMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
                const redNav = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), redNavMat);
                redNav.position.set(-8.0, 0, -1.5);
                jetGroup.add(redNav);

                const greenNavMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
                const greenNav = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), greenNavMat);
                greenNav.position.set(8.0, 0, -1.5);
                jetGroup.add(greenNav);

                // Strobe Beacons on Wings
                const strobeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                const beaconL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), strobeMat);
                beaconL.position.set(-4.0, 0.4, 0);
                jetGroup.add(beaconL);

                const beaconR = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), strobeMat);
                beaconR.position.set(4.0, 0.4, 0);
                jetGroup.add(beaconR);

                // Quad Glowing Jet Exhaust Afterburners
                const burnerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
                const burnerCoreMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
                for (let bi = -2; bi <= 2; bi++) {
                    if (bi === 0) continue;
                    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 1.6, 8), burnerMat);
                    burner.rotation.x = Math.PI / 2;
                    burner.position.set(bi * 1.25, 0, -5.2);
                    jetGroup.add(burner);

                    const coreFlame = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.05, 2.2, 8), burnerCoreMat);
                    coreFlame.rotation.x = Math.PI / 2;
                    coreFlame.position.set(bi * 1.25, 0, -5.6);
                    jetGroup.add(coreFlame);
                }

                // Amber Tactical Ground Spotlight
                const spotLight = new THREE.PointLight(0xf59e0b, 6.0, 70);
                spotLight.position.set(0, -2.5, 0);
                jetGroup.add(spotLight);

                jetGroup.position.set(0, 38, -210);
                this.scene.add(jetGroup);

                this.activeNukeStrike = {
                    jetMesh: jetGroup,
                    speed: 85,
                    bombDropped: false,
                    nukeBombMesh: null,
                    bombVelocityY: 10,
                    exploded: false,
                    beacons: [beaconL, beaconR]
                };
            }

            detonateNuke(detonationPos) {
                // 1. Audio & Camera Rumble
                if (typeof audio !== 'undefined') {
                    if (audio.stopNuclearSiren) audio.stopNuclearSiren();
                    if (audio.playHeavyAtomicExplosion) audio.playHeavyAtomicExplosion();
                }

                this.shakeScreen(2.5);
                this.nukeSpawnBlockTimer = 3.5;

                // 2. Fullscreen Blinding Nuclear Flash & Fallout Color Ramp
                const flashOverlay = document.getElementById('nuke-flash-overlay');
                if (flashOverlay) {
                    flashOverlay.style.transition = 'none';
                    flashOverlay.style.background = '#ffffff';
                    flashOverlay.style.opacity = '1.0';
                    setTimeout(() => {
                        flashOverlay.style.transition = 'opacity 0.6s ease-in, background-color 0.8s ease-in';
                        flashOverlay.style.background = 'radial-gradient(circle, rgba(255,180,50,0.85) 0%, rgba(220,38,38,0.7) 65%, rgba(15,23,42,0.95) 100%)';
                        setTimeout(() => {
                            flashOverlay.style.transition = 'opacity 3.2s ease-out';
                            flashOverlay.style.opacity = '0';
                        }, 500);
                    }, 250);
                }

                // 3. Update HUD Warning Banner
                const warnHud = document.getElementById('nuke-warning-hud');
                const warnSub = document.getElementById('nuke-warning-sub');
                if (warnSub) warnSub.innerText = "☢️ DETONATION ERFOLGREICH - ALLE ZIELE VAPORISIERT ☢️";
                setTimeout(() => {
                    if (warnHud) {
                        warnHud.style.transition = 'opacity 1.5s ease-out';
                        warnHud.style.opacity = '0';
                        setTimeout(() => {
                            warnHud.classList.add('hidden');
                            warnHud.style.opacity = '1';
                        }, 1500);
                    }
                }, 3000);

                // 4. Disintegrate and Vaporize ALL Zombies
                for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                    const z = this.zombies[zi];
                    if (!z || z.userData.isDead) continue;
                    z.userData.hp = -99999;
                    this.createBloodSparks(z.position, 0xff4400);
                    this.createBloodSparks(z.position, 0xfacc15);
                    this.createExplosion(z.position, 8, 99999, 8, false);
                    this.killZombie(z);
                }

                // 5. Giant Scorched Radioactive Impact Crater Decal on Ground
                const craterGroup = new THREE.Group();
                craterGroup.position.copy(detonationPos);
                craterGroup.position.y = 0.05;

                // Dark burnt scorched soot circle
                const sootMat = new THREE.MeshStandardMaterial({ 
                    color: 0x09090b, 
                    roughness: 0.95, 
                    transparent: true, 
                    opacity: 0.9 
                });
                const sootMesh = new THREE.Mesh(new THREE.CircleGeometry(24, 32), sootMat);
                sootMesh.rotation.x = -Math.PI / 2;
                craterGroup.add(sootMesh);

                // Inner molten orange glowing fissure cracks
                const lavaMat = new THREE.MeshBasicMaterial({ 
                    color: 0xf97316, 
                    transparent: true, 
                    opacity: 0.85 
                });
                const lavaRing = new THREE.Mesh(new THREE.RingGeometry(2, 14, 24), lavaMat);
                lavaRing.rotation.x = -Math.PI / 2;
                lavaRing.position.y = 0.01;
                craterGroup.add(lavaRing);

                this.scene.add(craterGroup);

                // Slowly cool and fade crater over 45s
                setTimeout(() => {
                    let cTicks = 0;
                    const cFadeInterval = setInterval(() => {
                        cTicks++;
                        sootMat.opacity -= 0.02;
                        lavaMat.opacity -= 0.03;
                        if (cTicks >= 40) {
                            clearInterval(cFadeInterval);
                            this.scene.remove(craterGroup);
                        }
                    }, 100);
                }, 25000);

                // 6. BUILD GLORIOUS VOLUMETRIC THREE.JS 3D MUSHROOM CLOUD SIMULATION
                const cloudGroup = new THREE.Group();
                cloudGroup.position.copy(detonationPos);
                this.scene.add(cloudGroup);

                // Intense Dynamic Point Light
                const blastLight = new THREE.PointLight(0xffedd5, 35.0, 260);
                blastLight.position.set(0, 10, 0);
                cloudGroup.add(blastLight);

                const nukeColors = [0xffffff, 0xfff7ed, 0xfef08a, 0xfacc15, 0xf97316, 0xef4444, 0x991b1b, 0x27272a, 0x18181b];

                // --- Part A: Initial Multi-Layer Expanding Fireball ---
                const fireballs = [];
                for (let fi = 0; fi < 8; fi++) {
                    const col = nukeColors[fi % nukeColors.length];
                    const fbMat = new THREE.MeshBasicMaterial({ 
                        color: col, 
                        transparent: true, 
                        opacity: 0.95 
                    });
                    const fbGeo = new THREE.SphereGeometry(3.5 + fi * 0.8, 16, 16);
                    const fbMesh = new THREE.Mesh(fbGeo, fbMat);
                    fbMesh.position.set(
                        (Math.random() - 0.5) * 4,
                        3.0 + fi * 1.4,
                        (Math.random() - 0.5) * 4
                    );
                    cloudGroup.add(fbMesh);
                    fireballs.push({
                        mesh: fbMesh,
                        mat: fbMat,
                        initialScale: 1.0,
                        growRate: 6.5 + fi * 0.8,
                        riseSpeed: 8.0 + fi * 1.5,
                        rotSpeed: (Math.random() - 0.5) * 1.2
                    });
                }

                // --- Part B: Rising Vertical Stem Vortex Column ---
                const stemSegments = [];
                const stemTiers = 14;
                for (let si = 0; si < stemTiers; si++) {
                    const isLower = (si < 5);
                    const col = isLower ? (si < 2 ? 0xf97316 : 0xdc2626) : 0x27272a;
                    const stemMat = new THREE.MeshStandardMaterial({ 
                        color: col, 
                        roughness: 0.9, 
                        metalness: 0.1,
                        emissive: isLower ? 0xf97316 : 0x18181b,
                        emissiveIntensity: isLower ? 0.6 : 0.1,
                        transparent: true, 
                        opacity: 0.9 
                    });
                    const stemGeo = new THREE.SphereGeometry(2.8 + si * 0.35, 14, 14);
                    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
                    stemMesh.position.set(
                        (Math.random() - 0.5) * 2.5,
                        2.0 + si * 2.8,
                        (Math.random() - 0.5) * 2.5
                    );
                    stemMesh.visible = false;
                    cloudGroup.add(stemMesh);

                    stemSegments.push({
                        mesh: stemMesh,
                        mat: stemMat,
                        delay: 0.1 + si * 0.07,
                        baseScale: 1.0,
                        expandRate: 1.6 + si * 0.12,
                        targetY: 4.0 + si * 3.4,
                        riseSpeed: 16.0 + si * 1.8,
                        rotSpeed: (Math.random() - 0.5) * 1.8
                    });
                }

                // --- Part C: Expanding Toroidal Mushroom Cap / Anvil Top ---
                const capClouds = [];
                const capCount = 18;
                for (let ci = 0; ci < capCount; ci++) {
                    const angle = (ci / capCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
                    const isHot = (ci % 3 === 0);
                    const capMat = new THREE.MeshStandardMaterial({ 
                        color: isHot ? 0xe11d48 : 0x1f2937, 
                        roughness: 0.85, 
                        metalness: 0.15,
                        emissive: isHot ? 0xf97316 : 0x09090b,
                        emissiveIntensity: isHot ? 0.5 : 0.05,
                        transparent: true, 
                        opacity: 0.92 
                    });
                    const capGeo = new THREE.SphereGeometry(4.5 + Math.random() * 2.0, 14, 14);
                    const capMesh = new THREE.Mesh(capGeo, capMat);
                    capMesh.position.set(
                        Math.cos(angle) * 4.0,
                        40.0 + (Math.random() - 0.5) * 3.5,
                        Math.sin(angle) * 4.0
                    );
                    capMesh.visible = false;
                    cloudGroup.add(capMesh);

                    capClouds.push({
                        mesh: capMesh,
                        mat: capMat,
                        delay: 0.5 + Math.random() * 0.3,
                        angle: angle,
                        radius: 4.0,
                        expandSpeed: 7.5 + Math.random() * 4.5,
                        rotSpeed: 0.3 + (Math.random() - 0.5) * 0.2,
                        baseScale: 1.0
                    });
                }

                // --- Part D: Ground Blast Dust Skirt ---
                const dustSkirt = [];
                const dustCount = 12;
                for (let di = 0; di < dustCount; di++) {
                    const dAngle = (di / dustCount) * Math.PI * 2;
                    const dustMat = new THREE.MeshStandardMaterial({ 
                        color: 0x475569, 
                        roughness: 0.95, 
                        transparent: true, 
                        opacity: 0.75 
                    });
                    const dMesh = new THREE.Mesh(new THREE.SphereGeometry(3.0 + Math.random() * 1.5, 12, 12), dustMat);
                    dMesh.position.set(Math.cos(dAngle) * 6, 1.8, Math.sin(dAngle) * 6);
                    cloudGroup.add(dMesh);

                    dustSkirt.push({
                        mesh: dMesh,
                        mat: dustMat,
                        angle: dAngle,
                        radius: 6.0,
                        expandSpeed: 14.0 + Math.random() * 6.0,
                        baseScale: 1.0
                    });
                }

                // --- Part E: Supersonic Glowing Ground Shockwave Rings ---
                const shockwaveRings = [];
                const sColors = [0xffedd5, 0xfacc15, 0xf97316, 0xef4444];
                for (let ri = 0; ri < 4; ri++) {
                    const rMat = new THREE.MeshBasicMaterial({ 
                        color: sColors[ri], 
                        transparent: true, 
                        opacity: 0.95, 
                        side: THREE.DoubleSide 
                    });
                    const rGeo = new THREE.RingGeometry(2.0 + ri * 2.0, 5.5 + ri * 3.5, 48);
                    const rMesh = new THREE.Mesh(rGeo, rMat);
                    rMesh.rotation.x = -Math.PI / 2;
                    rMesh.position.set(0, 0.2 + ri * 0.08, 0);
                    cloudGroup.add(rMesh);

                    shockwaveRings.push({
                        mesh: rMesh,
                        mat: rMat,
                        scale: 1.0,
                        speed: 38.0 + ri * 14.0
                    });
                }

                // --- Part F: Arcing High-Speed Fiery Debris Ejecta ---
                const debris = [];
                for (let pi = 0; pi < 45; pi++) {
                    const debMat = new THREE.MeshBasicMaterial({ 
                        color: nukeColors[pi % 6], 
                        transparent: true, 
                        opacity: 1.0 
                    });
                    const debGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
                    const debMesh = new THREE.Mesh(debGeo, debMat);
                    debMesh.position.set(0, 3 + Math.random() * 4, 0);
                    cloudGroup.add(debMesh);

                    const pAngle = Math.random() * Math.PI * 2;
                    const pSpeed = 22 + Math.random() * 38;
                    debris.push({
                        mesh: debMesh,
                        mat: debMat,
                        vx: Math.cos(pAngle) * pSpeed,
                        vy: 20 + Math.random() * 32,
                        vz: Math.sin(pAngle) * pSpeed,
                        rx: (Math.random() - 0.5) * 12,
                        ry: (Math.random() - 0.5) * 12
                    });
                }

                // --- Part G: Drifting Radioactive Fallout Ash Particles ---
                const falloutParticles = [];
                for (let ai = 0; ai < 35; ai++) {
                    const ashMat = new THREE.MeshBasicMaterial({ 
                        color: ai % 2 === 0 ? 0xfacc15 : 0xf97316, 
                        transparent: true, 
                        opacity: 0.85 
                    });
                    const ashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), ashMat);
                    ashMesh.position.set(
                        (Math.random() - 0.5) * 60,
                        25 + Math.random() * 30,
                        (Math.random() - 0.5) * 60
                    );
                    cloudGroup.add(ashMesh);

                    falloutParticles.push({
                        mesh: ashMesh,
                        mat: ashMat,
                        fallSpeed: 4.5 + Math.random() * 4.0,
                        phase: Math.random() * Math.PI * 2
                    });
                }

                // Register active cloud simulation object
                this.activeMushroomClouds.push({
                    group: cloudGroup,
                    blastLight: blastLight,
                    fireballs: fireballs,
                    stemSegments: stemSegments,
                    capClouds: capClouds,
                    dustSkirt: dustSkirt,
                    shockwaveRings: shockwaveRings,
                    debris: debris,
                    falloutParticles: falloutParticles,
                    age: 0,
                    duration: 6.8
                });

                // End Nuke Active state after explosion finishes
                setTimeout(() => {
                    this.isNukeActive = false;
                }, 4000);
            }

            updateNuke(dt) {
                // Cooldown countdown & HUD update
                if (this.nukeCooldown > 0) {
                    this.nukeCooldown = Math.max(0, this.nukeCooldown - dt);
                    const cdSec = Math.ceil(this.nukeCooldown);

                    if (this._lastNukeCdSec !== cdSec) {
                        this._lastNukeCdSec = cdSec;
                        const statusText = document.getElementById('nuke-status-text');
                        const btnIcon = document.getElementById('nuke-icon');
                        const btn = document.getElementById('hud-nuke-btn');
                        const progressFill = document.getElementById('nuke-progress-fill');

                        const maxCd = 90.0;
                        const fillPct = Math.min(100, Math.max(0, Math.round(((maxCd - this.nukeCooldown) / maxCd) * 100)));

                        if (progressFill) {
                            progressFill.style.height = `${fillPct}%`;
                            progressFill.style.width = '100%';
                        }

                        if (this.nukeCooldown > 0) {
                            if (statusText) statusText.innerText = `${cdSec}s`;
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-slate-400 opacity-60 text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 border border-slate-700/60 text-slate-500 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center flex-shrink-0 pointer-events-auto";
                        } else {
                            if (statusText) statusText.innerText = "";
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-red-500 text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 hover:bg-slate-900 active:scale-95 border border-red-500/60 text-red-400 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg shadow backdrop-blur-sm transition flex items-center justify-center flex-shrink-0 pointer-events-auto cursor-pointer";
                        }
                        if (typeof Storage !== 'undefined' && Storage.data.extraNukeEnabled === false) {
                            if (btn && !btn.classList.contains('hidden')) btn.classList.add('hidden');
                        }
                    }
                } else if (this._lastNukeCdSec !== 0) {
                    this._lastNukeCdSec = 0;
                    const progressFill = document.getElementById('nuke-progress-fill');
                    if (progressFill) {
                        progressFill.style.height = "100%";
                        progressFill.style.width = "100%";
                    }
                }

                // Update Target Ground Ring animation
                if (this.nukeTargetRing) {
                    this.nukeTargetRing.time += dt;
                    const pulse = 0.6 + 0.4 * Math.sin(this.nukeTargetRing.time * 8);
                    this.nukeTargetRing.outerMat.opacity = pulse * 0.85;
                    this.nukeTargetRing.midMat.opacity = (1.0 - pulse * 0.4) * 0.9;
                    this.nukeTargetRing.group.rotation.y += dt * 0.6;
                }

                // Update Active Nuke Flight & Bomb Drop
                if (this.activeNukeStrike) {
                    const strike = this.activeNukeStrike;
                    strike.jetMesh.position.z += strike.speed * dt;

                    if (strike.beacons) {
                        const isBeaconOn = (Math.floor(performance.now() / 150) % 2 === 0);
                        strike.beacons.forEach(b => { if (b) b.visible = isBeaconOn; });
                    }

                    // Release Heavy Thermonuclear Warhead right over the center map (z >= -8)
                    if (!strike.bombDropped && strike.jetMesh.position.z >= -8) {
                        strike.bombDropped = true;

                        const warnSub = document.getElementById('nuke-warning-sub');
                        if (warnSub) warnSub.innerText = "SPRENGKOPF ABGEWORFEN - EINSCHLAG IN KÜRZE!";

                        // Build detailed Tactical Thermonuclear Warhead Mesh
                        const bombGroup = new THREE.Group();

                        // Main Bomb Body (Dark gunmetal with yellow hazard band)
                        const bombBodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });
                        const bombBody = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 3.4, 12), bombBodyMat);
                        bombBody.rotation.x = Math.PI / 2;
                        bombGroup.add(bombBody);

                        // Conical Nose Cone (Yellow Hazard Tip)
                        const noseMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 });
                        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.4, 12), noseMat);
                        nose.rotation.x = Math.PI / 2;
                        nose.position.set(0, 0, 2.4);
                        bombGroup.add(nose);

                        // Blinking Red Proximity Beacon on Nose
                        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                        const noseBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), beaconMat);
                        noseBeacon.position.set(0, 0, 3.1);
                        bombGroup.add(noseBeacon);

                        // 4 Tail Stabilizing Fins (Black & Yellow hazard stripes)
                        const finMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.7, roughness: 0.3 });
                        for (let fi = 0; fi < 4; fi++) {
                            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.0), finMat);
                            fin.position.set(0, 0, -1.8);
                            fin.rotation.z = (fi * Math.PI) / 2;
                            bombGroup.add(fin);
                        }

                        // Thruster plume at tail
                        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
                        const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), thrusterMat);
                        thruster.rotation.x = -Math.PI / 2;
                        thruster.position.set(0, 0, -2.4);
                        bombGroup.add(thruster);

                        bombGroup.position.set(0, 34, strike.jetMesh.position.z);
                        this.scene.add(bombGroup);
                        strike.nukeBombMesh = bombGroup;
                        strike.noseBeacon = noseBeacon;
                    }

                    // Warhead descent physics
                    if (strike.nukeBombMesh) {
                        strike.bombVelocityY += 75 * dt;
                        strike.nukeBombMesh.position.y -= strike.bombVelocityY * dt;
                        strike.nukeBombMesh.position.z += 12 * dt;
                        strike.nukeBombMesh.rotation.x = Math.min(Math.PI * 0.45, strike.nukeBombMesh.rotation.x + dt * 1.5);

                        if (strike.noseBeacon) {
                            strike.noseBeacon.visible = (Math.floor(performance.now() / 80) % 2 === 0);
                        }

                        // Ground Impact & Detonation!
                        if (strike.nukeBombMesh.position.y <= 0.8) {
                            const detonationPos = strike.nukeBombMesh.position.clone();
                            detonationPos.y = 0;

                            this.scene.remove(strike.nukeBombMesh);
                            strike.nukeBombMesh = null;

                            if (this.nukeTargetRing) {
                                this.scene.remove(this.nukeTargetRing.group);
                                this.nukeTargetRing = null;
                            }

                            this.detonateNuke(detonationPos);
                        }
                    }

                    // Remove Stealth Bomber after flying off-screen
                    if (strike.jetMesh.position.z > 240) {
                        this.scene.remove(strike.jetMesh);
                        this.activeNukeStrike = null;
                    }
                }

                // Update active Mushroom Cloud visual simulations
                if (this.activeMushroomClouds && this.activeMushroomClouds.length > 0) {
                    for (let m = this.activeMushroomClouds.length - 1; m >= 0; m--) {
                        const cloud = this.activeMushroomClouds[m];
                        cloud.age += dt;
                        const progress = cloud.age / cloud.duration;

                        if (progress >= 1.0) {
                            this.scene.remove(cloud.group);
                            this.activeMushroomClouds.splice(m, 1);
                            continue;
                        }

                        // Animate Dynamic Intense Nuclear Blast Light
                        if (cloud.blastLight) {
                            if (cloud.age < 0.6) {
                                cloud.blastLight.intensity = 35.0 * (1.0 - cloud.age / 0.6);
                            } else if (cloud.age < 2.5) {
                                cloud.blastLight.intensity = 8.0 * (1.0 - (cloud.age - 0.6) / 1.9);
                            } else {
                                cloud.blastLight.intensity = 0;
                            }
                        }

                        // Animate Core Expanding Fireball (Stage 1)
                        if (cloud.fireballs) {
                            cloud.fireballs.forEach(fb => {
                                const s = fb.initialScale + cloud.age * fb.growRate;
                                fb.mesh.scale.set(s, s * 1.1, s);
                                fb.mesh.position.y += fb.riseSpeed * dt;
                                fb.mesh.rotation.y += fb.rotSpeed * dt;
                                if (cloud.age > 0.8) {
                                    fb.mat.opacity = Math.max(0, 0.95 - (cloud.age - 0.8) * 0.4);
                                }
                            });
                        }

                        // Animate Rising Stem Vortex Column (Stage 2)
                        if (cloud.stemSegments) {
                            cloud.stemSegments.forEach(seg => {
                                if (cloud.age >= seg.delay) {
                                    seg.mesh.visible = true;
                                    const localAge = cloud.age - seg.delay;
                                    const s = seg.baseScale + localAge * seg.expandRate;
                                    seg.mesh.scale.set(s, s, s);
                                    seg.mesh.position.y = Math.min(seg.targetY, seg.mesh.position.y + seg.riseSpeed * dt);
                                    seg.mesh.rotation.y += seg.rotSpeed * dt;
                                    
                                    // Fade from incandescent orange to dark billowing smoke
                                    if (localAge > 1.8) {
                                        seg.mat.opacity = Math.max(0, 0.9 - (localAge - 1.8) * 0.28);
                                    }
                                }
                            });
                        }

                        // Animate Expanding Toroidal Mushroom Cap (Stage 3)
                        if (cloud.capClouds) {
                            cloud.capClouds.forEach(cap => {
                                if (cloud.age >= cap.delay) {
                                    cap.mesh.visible = true;
                                    const localAge = cloud.age - cap.delay;
                                    cap.radius += cap.expandSpeed * dt;
                                    cap.angle += cap.rotSpeed * dt;
                                    cap.mesh.position.x = Math.cos(cap.angle) * cap.radius;
                                    cap.mesh.position.z = Math.sin(cap.angle) * cap.radius;
                                    cap.mesh.position.y += Math.sin(localAge * 1.5) * 0.8 * dt;

                                    const s = cap.baseScale + localAge * 2.2;
                                    cap.mesh.scale.set(s, s * 0.75, s);

                                    if (localAge > 2.0) {
                                        cap.mat.opacity = Math.max(0, 0.9 - (localAge - 2.0) * 0.3);
                                    }
                                }
                            });
                        }

                        // Animate Ground Dust Skirt
                        if (cloud.dustSkirt) {
                            cloud.dustSkirt.forEach(dust => {
                                dust.radius += dust.expandSpeed * dt;
                                dust.mesh.position.x = Math.cos(dust.angle) * dust.radius;
                                dust.mesh.position.z = Math.sin(dust.angle) * dust.radius;
                                const s = dust.baseScale + cloud.age * 2.8;
                                dust.mesh.scale.set(s, s * 0.6, s);
                                dust.mat.opacity = Math.max(0, 0.75 - cloud.age * 0.16);
                            });
                        }

                        // Animate Supersonic Shockwave Rings
                        if (cloud.shockwaveRings) {
                            cloud.shockwaveRings.forEach(ring => {
                                ring.scale += ring.speed * dt;
                                ring.mesh.scale.set(ring.scale, ring.scale, 1);
                                ring.mat.opacity = Math.max(0, 0.9 - (ring.scale / 120.0));
                            });
                        }

                        // Animate Flying Fiery Debris Ejecta
                        if (cloud.debris) {
                            cloud.debris.forEach(deb => {
                                deb.mesh.position.x += deb.vx * dt;
                                deb.mesh.position.z += deb.vz * dt;
                                deb.vy -= 35 * dt; // gravity
                                deb.mesh.position.y = Math.max(0.2, deb.mesh.position.y + deb.vy * dt);
                                deb.mesh.rotation.x += deb.rx * dt;
                                deb.mesh.rotation.y += deb.ry * dt;
                                deb.mat.opacity = Math.max(0, 1.0 - cloud.age * 0.25);
                            });
                        }

                        // Animate Drifting Radioactive Fallout Ash
                        if (cloud.falloutParticles) {
                            cloud.falloutParticles.forEach(pt => {
                                pt.mesh.position.x += Math.sin(cloud.age * 1.5 + pt.phase) * 1.8 * dt;
                                pt.mesh.position.z += Math.cos(cloud.age * 1.2 + pt.phase) * 1.8 * dt;
                                pt.mesh.position.y = Math.max(0.1, pt.mesh.position.y - pt.fallSpeed * dt);
                                pt.mat.opacity = Math.max(0, 0.85 - cloud.age * 0.15);
                            });
                        }
                    }
                }
            }

            selectAc130Weapon(type) {
                if (!['25mm', '40mm', '105mm'].includes(type)) return;
                this.ac130SelectedWeapon = type;
                if (typeof audio !== 'undefined' && audio.playClick) {
                    audio.playClick();
                }

                // Update UI Button Highlights (3 Icon Buttons on Right Screen Edge)
                const btn25 = document.getElementById('ac130-weap-btn-25mm');
                const btn40 = document.getElementById('ac130-weap-btn-40mm');
                const btn105 = document.getElementById('ac130-weap-btn-105mm');

                const activeClass = "w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-2 border-white bg-white/25 text-white shadow-2xl flex items-center justify-center transition active:scale-90 ring-2 ring-white/40 scale-105";
                const inactiveClass = "w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border border-slate-700 bg-black/80 text-slate-400 hover:text-white transition flex items-center justify-center active:scale-95 shadow-xl";

                if (btn25) btn25.className = type === '25mm' ? activeClass : inactiveClass;
                if (btn40) btn40.className = type === '40mm' ? activeClass : inactiveClass;
                if (btn105) btn105.className = type === '105mm' ? "w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-2 border-red-400 bg-red-950/50 text-red-300 shadow-2xl flex items-center justify-center transition active:scale-90 ring-2 ring-red-400/40 scale-105" : inactiveClass;
            }

            fireAc130Current() {
                if (!this.isAc130Active) return;
                const wp = this.ac130SelectedWeapon || '40mm';
                if (wp === '25mm') this.fireAc130_25mm();
                else if (wp === '40mm') this.fireAc130_40mm();
                else if (wp === '105mm') this.fireAc130_105mm();
            }

            startAc130Firing() {
                this.isAc130TouchFiring = true;
                this.fireAc130Current();
            }

            stopAc130Firing() {
                this.isAc130TouchFiring = false;
            }

            triggerAc130() {
                if (typeof Storage !== 'undefined' && Storage.data.extraAc130Enabled === false) return;
                if (this.isPaused || this.isGameOver) return;
                if (this.isAc130Active) return;
                if (this.ac130Cooldown > 0) {
                    if (typeof showWarningToast === 'function') {
                        showWarningToast(`✈️ AC-130 lädt nach: noch ${Math.ceil(this.ac130Cooldown)}s!`);
                    }
                    return;
                }

                // Reset and hide mobile touch joystick completely in AC-130 mode
                this.touchJoystick.active = false;
                this.touchJoystick.touchId = null;
                this.touchJoystick.vectorX = 0;
                this.touchJoystick.vectorY = 0;
                const joystickContainer = document.getElementById('joystick-container');
                if (joystickContainer) joystickContainer.classList.add('hidden');
                const fireFeedback = document.getElementById('fire-touch-feedback');
                if (fireFeedback) fireFeedback.classList.add('hidden');

                this.isAc130Active = true;
                this.ac130MissionTimer = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.duration) || 40;
                this.ac130Cooldown = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cooldown) || 80;
                this.ac130OrbitAngle = 0;
                this.ac130SelectedWeapon = '40mm';
                this.ac130ScreenAim = {
                    x: window.innerWidth * 0.5,
                    y: window.innerHeight * 0.5
                };
                if (this.playerGroup) {
                    this.ac130AimPos.copy(this.playerGroup.position);
                }

                // 1. Authentic High-Altitude Gunship Flight Position
                this.camera.position.set(0, 48, 44);
                this.camera.lookAt(0, 0, 0);

                // 2. Authentic FLIR "White-Hot" Thermal Heat Signature Material Swap
                if (!this.whiteHotMat) {
                    this.whiteHotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                }

                // Turn all living zombies into glowing White-Hot silhouettes
                for (let z of this.zombies) {
                    z.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.userData.ac130OrigMat) child.userData.ac130OrigMat = child.material;
                            child.material = this.whiteHotMat;
                        }
                    });
                }
                if (this.playerGroup) {
                    this.playerGroup.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.userData.ac130OrigMat) child.userData.ac130OrigMat = child.material;
                            child.material = this.whiteHotMat;
                        }
                    });
                }
                if (this.dogGroup) {
                    this.dogGroup.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.userData.ac130OrigMat) child.userData.ac130OrigMat = child.material;
                            child.material = this.whiteHotMat;
                        }
                    });
                }

                // Cleanly Hide Normal Gameplay HUD to prevent overlapping
                const gameHud = document.getElementById('game-hud');
                if (gameHud) gameHud.classList.add('hidden');

                // Open AC-130 Modern Warfare Overlay & Enable Thermal Filter
                const overlay = document.getElementById('ac130-overlay');
                if (overlay) overlay.classList.remove('hidden');
                document.body.classList.add('thermal-active');

                // Start Continuous AC-130 Turboprop 4-Engine Drone Sound
                if (typeof audio !== 'undefined' && audio.startAc130EngineSound) {
                    audio.startAc130EngineSound();
                } else if (typeof audio !== 'undefined' && audio.playHeavyBomb) {
                    audio.playHeavyBomb();
                }

                this.selectAc130Weapon('40mm');

                if (typeof showWarningToast === 'function') {
                    showWarningToast('✈️ AC-130 GUNSHIP WSO THERMAL-MODUS AKTIV (40s)!');
                }
                this.syncHUD();
            }

            fireAc130_25mm() {
                if (!this.isAc130Active || this.isGameOver || this.isPaused) return;
                const now = performance.now();
                const rate = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon25mm && AC130_CONFIG.cannon25mm.firerate) || 35;
                if (now - this.ac130Last25mm < rate) return;
                this.ac130Last25mm = now;

                const targetPos = this.ac130AimPos.clone();
                targetPos.x += (Math.random() - 0.5) * 1.8;
                targetPos.z += (Math.random() - 0.5) * 1.8;

                // High-Velocity Minigun Rotary Vulcan Sound
                if (typeof audio !== 'undefined' && audio.playMinigunShot) {
                    audio.playMinigunShot();
                } else if (typeof audio !== 'undefined' && audio.playShoot) {
                    audio.playShoot(0.04);
                }

                // Spawn 25mm Tracers 26m down along ray towards ground so they NEVER blind or block the camera lens
                const dir = targetPos.clone().sub(this.camera.position).normalize();
                const startPos = this.camera.position.clone().add(dir.clone().multiplyScalar(26));
                startPos.x += (Math.random() - 0.5) * 1.2;
                startPos.z += (Math.random() - 0.5) * 1.2;

                const projMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.12, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                projMesh.position.copy(startPos);
                this.scene.add(projMesh);

                const dmg = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon25mm && AC130_CONFIG.cannon25mm.damage) || 110;
                const rad = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon25mm && AC130_CONFIG.cannon25mm.splashRadius) || 3.5;

                this.ac130Projectiles.push({
                    mesh: projMesh,
                    startPos: startPos,
                    targetPos: targetPos,
                    type: '25mm',
                    progress: 0,
                    speed: 8.5,
                    damage: dmg,
                    radius: rad
                });
            }

            fireAc130_40mm() {
                if (!this.isAc130Active || this.isGameOver || this.isPaused) return;
                const now = performance.now();
                const rate = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon40mm.firerate) || 280;
                if (now - this.ac130Last40mm < rate) return;
                this.ac130Last40mm = now;

                const targetPos = this.ac130AimPos.clone();
                targetPos.x += (Math.random() - 0.5) * 1.5;
                targetPos.z += (Math.random() - 0.5) * 1.5;

                if (typeof audio !== 'undefined' && audio.playShoot) {
                    audio.playShoot(0.12);
                }

                // Spawn 40mm Tracers 20m down along ray
                const dir = targetPos.clone().sub(this.camera.position).normalize();
                const startPos = this.camera.position.clone().add(dir.clone().multiplyScalar(20));

                const projMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.24, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                projMesh.position.copy(startPos);
                this.scene.add(projMesh);

                const dmg = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon40mm.damage) || 260;
                const rad = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cannon40mm.splashRadius) || 7.0;

                this.ac130Projectiles.push({
                    mesh: projMesh,
                    startPos: startPos,
                    targetPos: targetPos,
                    type: '40mm',
                    progress: 0,
                    speed: 5.5,
                    damage: dmg,
                    radius: rad
                });
            }

            fireAc130_105mm() {
                if (!this.isAc130Active || this.isGameOver || this.isPaused) return;
                const now = performance.now();
                const rate = (typeof AC130_CONFIG !== 'undefined' && (AC130_CONFIG.missile?.firerate || AC130_CONFIG.cannon105mm?.firerate)) || 2800;
                if (now - this.ac130Last105mm < rate) return;
                this.ac130Last105mm = now;

                const targetPos = this.ac130AimPos.clone();

                // Play Steady Rocket Motor Launch Sound
                if (typeof audio !== 'undefined' && audio.playMissileLaunch) {
                    audio.playMissileLaunch();
                } else if (typeof audio !== 'undefined' && audio.playHeavyBomb) {
                    audio.playHeavyBomb();
                }

                // Spawn Detailed AGM-114 Hellfire Air-to-Ground Missile
                const dir = targetPos.clone().sub(this.camera.position).normalize();
                const startPos = this.camera.position.clone().add(dir.clone().multiplyScalar(15)).add(new THREE.Vector3(-2.5, -2, 0));

                const missileGroup = new THREE.Group();

                // Rocket Fuselage (Long Sleek Body)
                const bodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 8);
                const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                bodyMesh.position.y = 0;
                missileGroup.add(bodyMesh);

                // Rocket Nose Cone
                const coneGeo = new THREE.ConeGeometry(0.22, 0.6, 8);
                const coneMesh = new THREE.Mesh(coneGeo, bodyMat);
                coneMesh.position.y = 1.2;
                missileGroup.add(coneMesh);

                // 4 Stabilizer Fins at Tail
                const finMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d8 });
                const finGeo = new THREE.BoxGeometry(0.04, 0.4, 0.35);
                const fin1 = new THREE.Mesh(finGeo, finMat);
                fin1.position.set(0, -0.7, 0.22);
                const fin2 = new THREE.Mesh(finGeo, finMat);
                fin2.position.set(0, -0.7, -0.22);
                const fin3 = new THREE.Mesh(finGeo, finMat);
                fin3.rotation.y = Math.PI / 2;
                fin3.position.set(0.22, -0.7, 0);
                const fin4 = new THREE.Mesh(finGeo, finMat);
                fin4.rotation.y = Math.PI / 2;
                fin4.position.set(-0.22, -0.7, 0);
                missileGroup.add(fin1, fin2, fin3, fin4);

                // Blazing Rocket Flame Thruster at Exhaust
                const flameGeo = new THREE.ConeGeometry(0.24, 0.9, 6);
                const flameMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
                const flameMesh = new THREE.Mesh(flameGeo, flameMat);
                flameMesh.rotation.x = Math.PI;
                flameMesh.position.y = -1.25;
                missileGroup.add(flameMesh);

                // Orient missile toward target
                missileGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                missileGroup.position.copy(startPos);
                this.scene.add(missileGroup);

                const dmg = (typeof AC130_CONFIG !== 'undefined' && (AC130_CONFIG.missile?.damage || AC130_CONFIG.cannon105mm?.damage)) || 1500;
                const rad = (typeof AC130_CONFIG !== 'undefined' && (AC130_CONFIG.missile?.splashRadius || AC130_CONFIG.cannon105mm?.splashRadius)) || 18.0;

                this.ac130Projectiles.push({
                    mesh: missileGroup,
                    startPos: startPos,
                    targetPos: targetPos,
                    type: 'missile',
                    progress: 0,
                    speed: 0.80, // Takes ~1.25s for a majestic, cinematic rocket dive
                    damage: dmg,
                    radius: rad
                });
            }

            updateAc130(dt) {
                // Cooldown countdown & HUD update
                if (this.ac130Cooldown > 0) {
                    this.ac130Cooldown = Math.max(0, this.ac130Cooldown - dt);
                    const cdSec = Math.ceil(this.ac130Cooldown);

                    if (this._lastAc130CdSec !== cdSec) {
                        this._lastAc130CdSec = cdSec;
                        const statusText = document.getElementById('ac130-status-text');
                        const btnIcon = document.getElementById('ac130-icon');
                        const btn = document.getElementById('hud-ac130-btn');
                        const progressFill = document.getElementById('ac130-progress-fill');

                        const maxCd = (typeof AC130_CONFIG !== 'undefined' && AC130_CONFIG.cooldown) || 80.0;
                        const fillPct = Math.min(100, Math.max(0, Math.round(((maxCd - this.ac130Cooldown) / maxCd) * 100)));

                        if (progressFill) {
                            progressFill.style.height = `${fillPct}%`;
                            progressFill.style.width = '100%';
                        }

                        if (this.ac130Cooldown > 0) {
                            if (statusText) statusText.innerText = `${cdSec}s`;
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-slate-400 opacity-60 text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 border border-slate-700/60 text-slate-500 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center flex-shrink-0 pointer-events-auto";
                        } else {
                            if (statusText) statusText.innerText = "";
                            if (btnIcon) btnIcon.className = "relative z-10 flex items-center justify-center text-cyan-400 text-[10px] sm:text-xs";
                            if (btn) btn.className = "relative overflow-hidden bg-slate-950/90 hover:bg-slate-900 active:scale-95 border border-cyan-500/60 text-cyan-400 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-md sm:rounded-lg shadow backdrop-blur-sm transition flex items-center justify-center flex-shrink-0 pointer-events-auto cursor-pointer";
                        }
                        if (typeof Storage !== 'undefined' && Storage.data.extraAc130Enabled === false) {
                            if (btn && !btn.classList.contains('hidden')) btn.classList.add('hidden');
                        }
                    }
                } else if (this._lastAc130CdSec !== 0) {
                    this._lastAc130CdSec = 0;
                    const progressFill = document.getElementById('ac130-progress-fill');
                    if (progressFill) {
                        progressFill.style.height = "100%";
                        progressFill.style.width = "100%";
                    }
                }

                // Update Flying Projectiles (25mm, 40mm and AGM-114 Missile)
                if (this.ac130Projectiles && this.ac130Projectiles.length > 0) {
                    for (let pIdx = this.ac130Projectiles.length - 1; pIdx >= 0; pIdx--) {
                        const proj = this.ac130Projectiles[pIdx];
                        proj.progress += dt * proj.speed;

                        if (proj.progress >= 1.0) {
                            // Hit Ground!
                            this.scene.remove(proj.mesh);
                            this.ac130Projectiles.splice(pIdx, 1);

                            const hitPos = proj.targetPos;

                            if (proj.type === 'missile' || proj.type === '105mm') {
                                // Huge AGM-114 Hellfire detonation with 18m kill radius
                                this.createExplosion(hitPos, proj.radius, proj.damage, proj.radius, true);
                                this.createBloodSparks(hitPos, 0xffffff);

                                // Impact screen shake
                                this.shakeScreen(0.4);

                                // Wipe zombies in 18m radius
                                for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                                    const z = this.zombies[zi];
                                    if (z.userData.isDead) continue;
                                    const dist = Math.hypot(z.position.x - hitPos.x, z.position.z - hitPos.z);
                                    if (dist <= proj.radius) {
                                        z.userData.hp -= proj.damage * (1 - (dist / proj.radius) * 0.35);
                                        this.createBloodSparks(z.position, 0xef4444);
                                        if (z.userData.hp <= 0) this.killZombie(z);
                                    }
                                }
                            } else if (proj.type === '25mm') {
                                // High-Velocity 25mm Minigun Bullet Impact (Kinetic hit & dust snap, NO bomb explosion!)
                                if (typeof audio !== 'undefined' && audio.playGatlingImpact) {
                                    audio.playGatlingImpact();
                                }
                                this.createBloodSparks(hitPos, 0xfacc15);

                                for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                                    const z = this.zombies[zi];
                                    if (z.userData.isDead) continue;
                                    const dist = Math.hypot(z.position.x - hitPos.x, z.position.z - hitPos.z);
                                    if (dist <= proj.radius) {
                                        z.userData.hp -= proj.damage * (1 - (dist / proj.radius) * 0.25);
                                        this.createBloodSparks(z.position, 0xf59e0b);
                                        if (z.userData.hp <= 0) this.killZombie(z);
                                    }
                                }
                            } else {
                                // 40mm Bofors Auto-Cannon Blast
                                this.createExplosion(hitPos, proj.radius, proj.damage, proj.radius, false);
                                this.createBloodSparks(hitPos, 0xffffff);

                                for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                                    const z = this.zombies[zi];
                                    if (z.userData.isDead) continue;
                                    const dist = Math.hypot(z.position.x - hitPos.x, z.position.z - hitPos.z);
                                    if (dist <= proj.radius) {
                                        z.userData.hp -= proj.damage * (1 - (dist / proj.radius) * 0.35);
                                        this.createBloodSparks(z.position, 0xf59e0b);
                                        if (z.userData.hp <= 0) this.killZombie(z);
                                    }
                                }
                            }
                        } else {
                            // Interpolate position along arc
                            proj.mesh.position.lerpVectors(proj.startPos, proj.targetPos, proj.progress);
                            if (proj.type === 'missile' && Math.random() < 0.35) {
                                this.createBloodSparks(proj.mesh.position, 0xffffff);
                            }
                        }
                    }
                }

                // Active Heavy Guided Missile (VLS Vertical Launch + Terminal Homing)
                if (this.ballisticRockets && this.ballisticRockets.length > 0) {
                    for (let bi = this.ballisticRockets.length - 1; bi >= 0; bi--) {
                        const r = this.ballisticRockets[bi];
                        r.elapsed += dt;
                        const p = Math.min(1.0, r.elapsed / r.duration);

                        // Dynamic Homing Tracking: follow locked zombie in real-time
                        if (r.targetZombie && r.targetZombie.userData && r.targetZombie.userData.hp > 0 && !r.targetZombie.userData.isDead) {
                            r.targetX = r.targetZombie.position.x;
                            r.targetZ = r.targetZombie.position.z;
                        }

                        // Cubic Bezier VLS trajectory:
                        // P0: (startX, startY, startZ)
                        // P1: Vertical climb top (startX, cruiseAltitude, startZ)
                        // P2: High approach waypoint above target
                        // P3: Target (targetX, 0.2, targetZ)
                        const evalPos = (t, out) => {
                            const omt = 1 - t;
                            const c0 = omt * omt * omt;
                            const c1 = 3 * omt * omt * t;
                            const c2 = 3 * omt * t * t;
                            const c3 = t * t * t;

                            const p1x = r.startX + (r.targetX - r.startX) * 0.08;
                            const p1y = r.cruiseAltitude;
                            const p1z = r.startZ + (r.targetZ - r.startZ) * 0.08;

                            const p2x = r.startX + (r.targetX - r.startX) * 0.65;
                            const p2y = r.cruiseAltitude * 0.92;
                            const p2z = r.startZ + (r.targetZ - r.startZ) * 0.65;

                            out.x = c0 * r.startX + c1 * p1x + c2 * p2x + c3 * r.targetX;
                            out.y = c0 * r.startY + c1 * p1y + c2 * p2y + c3 * 0.2;
                            out.z = c0 * r.startZ + c1 * p1z + c2 * p2z + c3 * r.targetZ;
                        };

                        if (!this._vRocketPos) this._vRocketPos = new THREE.Vector3();
                        if (!this._vRocketNext) this._vRocketNext = new THREE.Vector3();

                        evalPos(p, this._vRocketPos);
                        evalPos(Math.min(1.0, p + 0.02), this._vRocketNext);

                        r.mesh.position.copy(this._vRocketPos);
                        r.mesh.lookAt(this._vRocketNext.x, this._vRocketNext.y, this._vRocketNext.z);

                        // Fiery rocket thruster tail particle
                        if (Math.random() < 0.65) {
                            this.createBloodSparks(r.mesh.position, 0xf97316);
                        }

                        const distToTarget = Math.hypot(r.mesh.position.x - r.targetX, r.mesh.position.z - r.targetZ);
                        const isCloseToGround = r.mesh.position.y <= 0.8;

                        if (p >= 1.0 || (p > 0.65 && distToTarget < 1.2 && isCloseToGround)) {
                            // Heavy Guided Missile Impact Detonation with Knockback!
                            this.createExplosion(
                                new THREE.Vector3(r.targetX, 0.2, r.targetZ),
                                r.splashRadius,
                                r.damage,
                                r.splashRadius,
                                true, // isHeavyBomb
                                false, // damageFriendly
                                r.knockback // knockbackForce
                            );
                            this.createBloodSparks(new THREE.Vector3(r.targetX, 0.5, r.targetZ), 0xffffff);
                            r.mesh.visible = false;
                            if (!this.artilleryPool) this.artilleryPool = [];
                            this.artilleryPool.push(r.mesh);
                            this.ballisticRockets.splice(bi, 1);
                        }
                    }
                }

                // Update Turret Targeting & Firing in sync with frame loop
                this.updateTurrets();

                // Rotating Radar Scanner / EOS Sensor on Anti-Air Turrets
                if (this.turrets && this.turrets.length > 0) {
                    for (let ti = 0; ti < this.turrets.length; ti++) {
                        const t = this.turrets[ti];
                        if (t && t.userData && t.userData.radarDish) {
                            t.userData.radarDish.rotation.y += dt * 3.8;
                        }
                    }
                }

                // Active AC-130 Gunship State
                if (this.isAc130Active) {
                    this.ac130MissionTimer = Math.max(0, this.ac130MissionTimer - dt);

                    // Update UI Countdown (e.g. Red "40", "39", ...)
                    const timerEl = document.getElementById('ac130-mw-countdown');
                    if (timerEl) timerEl.innerText = Math.ceil(this.ac130MissionTimer).toString();

                    // Update Live Clock in HUD
                    const clockEl = document.getElementById('ac130-mw-clock');
                    if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });

                    if (!this.ac130ScreenAim) {
                        this.ac130ScreenAim = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
                    }

                    // 1:1 Joystick Screen-Space Aiming (Directly coupled to screen view, NEVER distorts or drifts with orbit!)
                    if (this.touchJoystick.active) {
                        const joyScreenSpeed = 520.0; // Responsive screen pixels/second
                        this.ac130ScreenAim.x += this.touchJoystick.vectorX * joyScreenSpeed * dt;
                        this.ac130ScreenAim.y += this.touchJoystick.vectorY * joyScreenSpeed * dt;
                    }

                    // Strict Screen-Boundary Clamping (Never leaves the visible screen area)
                    const padX = 35;
                    const padY = 45;
                    this.ac130ScreenAim.x = THREE.MathUtils.clamp(this.ac130ScreenAim.x, padX, window.innerWidth - padX);
                    this.ac130ScreenAim.y = THREE.MathUtils.clamp(this.ac130ScreenAim.y, padY, window.innerHeight - padY);

                    // Position Crosshair HUD in Screen Coordinates
                    const crosshairEl = document.getElementById('ac130-crosshair-hud');
                    if (crosshairEl) {
                        crosshairEl.style.left = `${this.ac130ScreenAim.x}px`;
                        crosshairEl.style.top = `${this.ac130ScreenAim.y}px`;
                    }

                    // Project from Screen Space directly to 3D Ground World Position
                    const ndcX = (this.ac130ScreenAim.x / window.innerWidth) * 2 - 1;
                    const ndcY = -(this.ac130ScreenAim.y / window.innerHeight) * 2 + 1;
                    this.mousePos.set(ndcX, ndcY);
                    this.raycaster.setFromCamera(this.mousePos, this.camera);
                    const intersects = this._v3;
                    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersects)) {
                        this.ac130AimPos.copy(intersects);
                        this.pointerWorldPos.copy(intersects);
                    }

                    // Continuous Mouse-Held or Mobile Touch-Held Rapid Firing (e.g. 25mm Gatling stream)
                    if ((this.isMouseDown || this.isAc130TouchFiring) && !this.isPaused && !this.isGameOver) {
                        if (this.mouseButton === 0 || this.isAc130TouchFiring) {
                            this.fireAc130Current();
                        } else if (this.mouseButton === 2) {
                            this.fireAc130_105mm();
                        }
                    }

                    // Update Live Flight Telemetry (Speed, Altitude, Bank, Heading, GPS, Hostiles)
                    const teleAlt = document.getElementById('ac130-tele-alt');
                    if (teleAlt) {
                        const curAltM = (58.0 + Math.sin(this.ac130OrbitAngle * 3) * 0.4).toFixed(1);
                        const curAltFt = Math.round(curAltM * 3.28084);
                        teleAlt.innerText = `${curAltM} M (${curAltFt} FT)`;
                    }

                    const teleSpd = document.getElementById('ac130-tele-spd');
                    if (teleSpd) {
                        const curSpd = 242 + Math.round(Math.sin(this.ac130OrbitAngle * 2) * 5);
                        teleSpd.innerText = `${curSpd} KTS`;
                    }

                    const teleBank = document.getElementById('ac130-tele-bank');
                    if (teleBank) {
                        const curBank = (8.5 + Math.sin(this.ac130OrbitAngle) * 1.4).toFixed(1);
                        teleBank.innerText = `+${curBank}°`;
                    }

                    const teleHdg = document.getElementById('ac130-tele-hdg');
                    if (teleHdg) {
                        const deg = Math.round(((this.ac130OrbitAngle % (Math.PI * 2)) / (Math.PI * 2)) * 360);
                        teleHdg.innerText = `${deg.toString().padStart(3, '0')}°`;
                    }

                    const telePos = document.getElementById('ac130-tele-pos');
                    if (telePos) {
                        const latSec = (30 + Math.sin(this.ac130OrbitAngle * 8).toFixed(0)).padStart(2, '0');
                        const lonSec = (15 + Math.cos(this.ac130OrbitAngle * 8).toFixed(0)).padStart(2, '0');
                        telePos.innerText = `34°12'${latSec}"N 118°28'${lonSec}"W`;
                    }

                    const teleHostiles = document.getElementById('ac130-tele-hostiles');
                    if (teleHostiles) {
                        const hostilesCount = this.zombies.filter(z => !z.userData.isDead).length;
                        teleHostiles.innerText = `${hostilesCount} DETECTED`;
                    }

                    // Update AGM-114 Missile Status
                    const now = performance.now();
                    const rate105 = (typeof AC130_CONFIG !== 'undefined' && (AC130_CONFIG.missile?.firerate || AC130_CONFIG.cannon105mm?.firerate)) || 2800;
                    const st105 = document.getElementById('ac130-status-105mm-mw');
                    if (st105) {
                        if (now - this.ac130Last105mm < rate105) {
                            const rem = ((rate105 - (now - this.ac130Last105mm)) / 1000).toFixed(1);
                            st105.innerText = `RAKETE RELOAD (${rem}s)`;
                            st105.className = "text-[11px] sm:text-xs text-red-400 font-bold";
                        } else {
                            st105.innerText = "RAKETE READY";
                            st105.className = "text-[11px] sm:text-xs text-emerald-400 font-bold";
                        }
                    }

                    // Continuous Majestic Wide Orbital Flight: 64m Radius, 58m Altitude, Panoramic Arena View
                    this.ac130OrbitAngle += dt * 0.09;
                    const camX = Math.sin(this.ac130OrbitAngle) * 64;
                    const camZ = Math.cos(this.ac130OrbitAngle) * 64;
                    const camY = 58;

                    this.camera.position.set(camX, camY, camZ);
                    this.camera.lookAt(0, 0, 0);

                    // Mission Over after 40 Seconds
                    if (this.ac130MissionTimer <= 0) {
                        this.exitAc130();
                    }
                }
            }

            exitAc130() {
                if (!this.isAc130Active) return;
                this.isAc130Active = false;

                // Completely reset touch, joystick, mouse and keys state
                this.touchJoystick.active = false;
                this.touchJoystick.touchId = null;
                this.touchJoystick.vectorX = 0;
                this.touchJoystick.vectorY = 0;
                this.isTouchFiring = false;
                this.fireTouchId = null;
                this.isAc130TouchFiring = false;
                this.isMouseDown = false;
                this.keys = {};
                this.lockedAimTarget = null;

                const joystickContainer = document.getElementById('joystick-container');
                if (joystickContainer) joystickContainer.classList.add('hidden');
                const fireFeedback = document.getElementById('fire-touch-feedback');
                if (fireFeedback) fireFeedback.classList.add('hidden');

                const overlay = document.getElementById('ac130-overlay');
                if (overlay) overlay.classList.add('hidden');
                document.body.classList.remove('thermal-active');

                // Restore Normal Gameplay HUD
                const gameHud = document.getElementById('game-hud');
                if (gameHud) gameHud.classList.remove('hidden');

                // Restore original materials to zombies, player & dog
                for (let z of this.zombies) {
                    z.traverse((child) => {
                        if (child.isMesh && child.userData.ac130OrigMat) {
                            child.material = child.userData.ac130OrigMat;
                        }
                    });
                }
                if (this.playerGroup) {
                    this.playerGroup.traverse((child) => {
                        if (child.isMesh && child.userData.ac130OrigMat) {
                            child.material = child.userData.ac130OrigMat;
                        }
                    });
                }
                if (this.dogGroup) {
                    this.dogGroup.traverse((child) => {
                        if (child.isMesh && child.userData.ac130OrigMat) {
                            child.material = child.userData.ac130OrigMat;
                        }
                    });
                }

                // Stop Continuous AC-130 Turboprop Sound
                if (typeof audio !== 'undefined' && audio.stopAc130EngineSound) {
                    audio.stopAc130EngineSound();
                }

                this.updateCameraSettings();
                if (typeof showPurchaseToast === 'function') {
                    showPurchaseToast('✈️ AC-130 Gunship: Treibstoff verbraucht, Rückkehr zur Basis!');
                }
                this.syncHUD();
            }

            showTacticalIntel(type) {
                if (!this.intelShown) this.intelShown = {};
                if (this.intelShown[type]) return;
                this.intelShown[type] = true;

                const INTEL_DATA = {
                    runner: {
                        title: '⚡ LÄUFER-ZOMBIES DETEKTIERT!',
                        subtitle: 'Schnelle agile Mutanten',
                        icon: 'fa-bolt text-amber-400',
                        body: 'Läufer bewegen sich <strong>70% schneller</strong> als normale Zombies. Bleibe in Bewegung und halte Abstand!'
                    },
                    crawler: {
                        title: '🕷️ KRABBLER-RUDEL DETEKTIERT!',
                        subtitle: 'Kleine, blitzschnelle Bodentruppen',
                        icon: 'fa-bug text-amber-600',
                        body: 'Krabbler sind klein und flitzend schnell. Durch ihre bodennahe Haltung sind sie schwer zu treffen!'
                    },
                    bat: {
                        title: '🦇 MUTANT-FLEDERMÄUSE DETEKTIERT!',
                        subtitle: 'Fliegende Untote – Ignorieren Barrikaden!',
                        icon: 'fa-crow text-purple-400 animate-pulse',
                        body: 'Mutierte Riesen-Fledermäuse greifen aus der Luft an! <strong>Sie überfliegen Mauern & Sandsäcke</strong>. Bodengeschütze können sie nicht erfassen – nutze <strong>Flugabwehrraketensysteme (FlaRak SAM)</strong>, um den Luftraum zu sichern!'
                    },
                    exploder: {
                        title: '💣 KAMIKAZE-BOMBER DETEKTIERT!',
                        subtitle: 'Explodieren bei Tod oder Kontakt!',
                        icon: 'fa-bomb text-orange-500 animate-pulse',
                        body: 'Kamikaze-Zombies tragen Napalm am Körper. Sie <strong>explodieren bei Tod oder Berührung</strong> in einem Feuerball!'
                    },
                    shield: {
                        title: '🛡️ SCHILD-ZOMBIES DETEKTIERT!',
                        subtitle: 'Kugelsicherer Ballistik-Schild',
                        icon: 'fa-shield-halved text-sky-400',
                        body: 'Schild-Zombies tragen kugelsichere Frontschilde. <strong>Automatische Türme richten 0 Schaden an!</strong> Schieße von hinten oder nutze Luftschläge!'
                    },
                    spitter: {
                        title: '☣️ SÄURE-SPUCKER DETEKTIERT!',
                        subtitle: 'Toxische Fernkämpfer',
                        icon: 'fa-biohazard text-lime-400',
                        body: 'Säure-Spucker bleiben auf Distanz und schießen <strong>ätzende Säure-Geschosse</strong> ab!'
                    },
                    tank: {
                        title: '🧱 PANZER-ZOMBIES DETEKTIERT!',
                        subtitle: 'Schwere Rüstung (32 Armor)',
                        icon: 'fa-cube text-purple-400',
                        body: 'Panzer-Zombies besitzen schwere Panzerplatten. Schwache Standardfeuer-Geschosse richten kaum Schaden an – upgrade deine Waffen!'
                    },
                    summoner: {
                        title: '🔮 BESCHWÖRER-ZOMBIES DETEKTIERT!',
                        subtitle: 'Beschwören kontinuierlich Krabbler-Minions',
                        icon: 'fa-wand-magic-sparkles text-purple-400',
                        body: 'Beschwörer-Zombies nutzen dunkle Magie und <strong>beschwören im Sekundentakt neue Krabbler</strong>. Eliminiere sie schnell!'
                    },
                    raider: {
                        title: '💰 TRESOR-RÄUBER DETEKTIERT!',
                        subtitle: 'Reichtums-Mutanten stehlen dein Vermögen!',
                        icon: 'fa-coins text-amber-400 animate-bounce',
                        body: 'Dein hohes Vermögen ($50.000+) hat <strong>Tresor-Räuber</strong> angelockt! Diese blitzschnellen Mutanten greifen dich & deine Basis an und <strong>stehlen pro Treffer 8% deines Geldes</strong>. Eliminiere sie sofort!'
                    },
                    boss: {
                        title: '👹 ENDBOSS-GIGANT DETEKTIERT!',
                        subtitle: 'Extremer Schaden & massive HP!',
                        icon: 'fa-skull-crossbones text-rose-500 animate-pulse',
                        body: 'Ein gewaltiger Mutant nähert sich der Basis! Konzentriere das gesamte Feuer deiner Geschütze!'
                    }
                };

                const data = INTEL_DATA[type];
                if (!data) return;

                // NO sound when wave intel modal opens

                const modal = document.getElementById('intel-modal');
                const titleEl = document.getElementById('intel-title');
                const subtitleEl = document.getElementById('intel-subtitle');
                const iconEl = document.getElementById('intel-icon');
                const bodyEl = document.getElementById('intel-body');

                if (modal && titleEl && subtitleEl && iconEl && bodyEl) {
                    titleEl.innerText = data.title;
                    subtitleEl.innerText = data.subtitle;
                    iconEl.className = `fa-solid ${data.icon} text-3xl sm:text-4xl`;
                    bodyEl.innerHTML = data.body;

                    modal.classList.remove('hidden');
                    this.isPaused = true;
                    if (typeof updateMusicDucking === 'function') updateMusicDucking();
                }
            }

            animate() {
                if (!this.isRunning) return;
                requestAnimationFrame(() => this.animate());

                if (document.hidden) return;

                const now = performance.now();

                // If in placement mode, continuously render the holographic preview and placement ghost in real time!
                if (this.isPlacementMode) {
                    this.renderer.render(this.scene, this.camera);
                    this.lastFrameTime = now;
                    return;
                }

                // If paused (e.g. in shop, pause menu, intel modal), render only ONCE to save GPU/battery
                if (this.isPaused) {
                    if (!this._pausedFrameRendered) {
                        this.renderer.render(this.scene, this.camera);
                        this._pausedFrameRendered = true;
                    }
                    this.lastFrameTime = now;
                    return;
                }
                // Adaptive FPS Cap: 60 FPS on Desktop for silky smoothness, 30 FPS on mobile to preserve battery
                const targetFPS = (this.isMobile || window.innerWidth < 768) ? 30 : 60;
                const minFrameTime = 1000 / targetFPS;
                const elapsedSinceLastRender = now - (this._lastRenderTime || 0);
                if (elapsedSinceLastRender < minFrameTime - 1.5) {
                    return;
                }
                this._lastRenderTime = now - (elapsedSinceLastRender % minFrameTime);

                const dt = Math.min((now - (this.lastFrameTime || now)) / 1000, 0.1) * (this.gameSpeed || 1);
                this.lastFrameTime = now;
                const nowSec = now * 0.001;
                this._frameCount++;

                if (this.baseRadarGroup) this.baseRadarGroup.rotation.y += (dt * 1.5);
                if (this.baseCoreCrystal) {
                    this.baseCoreCrystal.rotation.y += (dt * 1.2);
                    this.baseCoreCrystal.position.y = 5.4 + Math.sin(now * 0.003) * 0.15;
                }
                if (this.beaconLights && this.beaconLights.length > 0 && (this._frameCount % 10 === 0)) {
                    const isLit = (now % 1200 < 600);
                    for (let bi = 0; bi < this.beaconLights.length; bi++) {
                        this.beaconLights[bi].visible = isLit;
                    }
                }

                if (!this.isGameOver) {
                    if (this.nukeSpawnBlockTimer > 0) {
                        this.nukeSpawnBlockTimer = Math.max(0, this.nukeSpawnBlockTimer - dt);
                    }
                    this.updateDayNightCycle(dt);
                    this.updateDrone(dt);
                    this.updateDog(dt);
                    this.updateAirstrike(dt);
                    this.updateNuke(dt);
                    this.updateAc130(dt);
                    this.updateRepairDrones(dt);
                    let moveX = 0, moveZ = 0;

                    if (this.isAc130Active) {
                        // Autonomous Ground Combat AI while Player commands AC-130 from the sky
                        let nearestZombie = null;
                        let minDistSq = 900.0; // 30 meters search radius
                        for (let zi = 0; zi < this.zombies.length; zi++) {
                            const z = this.zombies[zi];
                            if (z.userData.hp <= 0 || z.userData.isDead) continue;
                            const distSq = this.playerGroup.position.distanceToSquared(z.position);
                            if (distSq < minDistSq) {
                                minDistSq = distSq;
                                nearestZombie = z;
                            }
                        }

                        if (nearestZombie) {
                            const dist = Math.sqrt(minDistSq);
                            const targetAimAngle = Math.atan2(
                                nearestZombie.position.x - this.playerGroup.position.x,
                                nearestZombie.position.z - this.playerGroup.position.z
                            );
                            
                            // Smooth aim rotation towards target
                            let diff = targetAimAngle - this.playerGroup.rotation.y;
                            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                            this.playerGroup.rotation.y += diff * 16.0 * dt;

                            // Shoot equipped weapon automatically
                            this.tryShoot();

                            // Natural tactical movement:
                            // If too close (< 6.5m), back away/kite
                            // If too far (> 14m), advance
                            // Otherwise strafe around the target
                            if (dist < 6.5) {
                                moveX = -Math.sin(targetAimAngle);
                                moveZ = -Math.cos(targetAimAngle);
                            } else if (dist > 14.0) {
                                moveX = Math.sin(targetAimAngle) * 0.75;
                                moveZ = Math.cos(targetAimAngle) * 0.75;
                            } else {
                                const strafeDir = Math.sin(now * 0.0025) > 0 ? 1 : -1;
                                moveX = Math.sin(targetAimAngle + (Math.PI / 2) * strafeDir) * 0.7;
                                moveZ = Math.cos(targetAimAngle + (Math.PI / 2) * strafeDir) * 0.7;
                            }
                        } else {
                            // No zombies: Patrol around the base smoothly
                            const patrolAngle = (now * 0.0008);
                            const targetPatrolX = Math.sin(patrolAngle) * 11.5;
                            const targetPatrolZ = Math.cos(patrolAngle) * 11.5;
                            const pdx = targetPatrolX - this.playerGroup.position.x;
                            const pdz = targetPatrolZ - this.playerGroup.position.z;
                            if (Math.hypot(pdx, pdz) > 1.5) {
                                moveX = pdx;
                                moveZ = pdz;
                                const pAimAngle = Math.atan2(pdx, pdz);
                                let pDiff = pAimAngle - this.playerGroup.rotation.y;
                                pDiff = Math.atan2(Math.sin(pDiff), Math.cos(pDiff));
                                this.playerGroup.rotation.y += pDiff * 8.0 * dt;
                            }
                        }
                    } else {
                        // Manual player controls when NOT in AC-130 mode
                        if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) moveZ -= 1;
                        if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) moveZ += 1;
                        if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) moveX -= 1;
                        if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) moveX += 1;

                        if (this.touchJoystick.active) {
                            moveX = this.touchJoystick.vectorX;
                            moveZ = this.touchJoystick.vectorY;
                        }

                        const shopActive = (typeof isShopOpen !== 'undefined' ? isShopOpen : (window.isShopOpen || false));
                        const isFiring = !shopActive && (this.keys['Space'] || this.isTouchFiring || (this.isMouseDown && !this.isHoldSelecting && !this.isPlacementMode));
                        const hasMovement = (moveX !== 0 || moveZ !== 0);
                        const moveAngle = hasMovement ? Math.atan2(moveX, moveZ) : this.playerGroup.rotation.y;

                        // Smart Aim Assist (Balanced lock-on range: 12 meters)
                        if (isFiring && this.zombies.length > 0) {
                            const AIM_LOCK_RANGE_SQ = 144.0;  // lock-on distance: 12.0 meters
                            const AIM_BREAK_RANGE_SQ = 225.0; // auto-break lock if zombie drifts beyond 15.0 meters

                            // Check if locked target is still valid & within break range
                            if (this.lockedAimTarget && this.lockedAimTarget.userData && this.lockedAimTarget.userData.hp > 0 && !this.lockedAimTarget.userData.isDead && !this.lockedAimTarget.userData.isFlying) {
                                const lockedDistSq = this.playerGroup.position.distanceToSquared(this.lockedAimTarget.position);
                                if (lockedDistSq > AIM_BREAK_RANGE_SQ) {
                                    this.lockedAimTarget = null;
                                }
                            } else {
                                this.lockedAimTarget = null;
                            }

                            // If no lock, find nearest close-threat zombie
                            if (!this.lockedAimTarget) {
                                let nearestZombie = null;
                                let minDistSq = AIM_LOCK_RANGE_SQ;
                                for (let zi = 0; zi < this.zombies.length; zi++) {
                                    const z = this.zombies[zi];
                                    if (z.userData.hp <= 0 || z.userData.isDead || z.userData.isFlying) continue;
                                    const distSq = this.playerGroup.position.distanceToSquared(z.position);
                                    if (distSq < minDistSq) {
                                        minDistSq = distSq;
                                        nearestZombie = z;
                                    }
                                }
                                this.lockedAimTarget = nearestZombie;
                            }

                            if (this.lockedAimTarget) {
                                const targetAimAngle = Math.atan2(
                                    this.lockedAimTarget.position.x - this.playerGroup.position.x,
                                    this.lockedAimTarget.position.z - this.playerGroup.position.z
                                );
                                let diff = targetAimAngle - this.playerGroup.rotation.y;
                                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                                this.playerGroup.rotation.y += diff * 35.0 * dt;
                            } else if (this.isMouseDown && this.pointerWorldPos && !this.isMobile) {
                                const mouseAimAngle = Math.atan2(
                                    this.pointerWorldPos.x - this.playerGroup.position.x,
                                    this.pointerWorldPos.z - this.playerGroup.position.z
                                );
                                let diff = mouseAimAngle - this.playerGroup.rotation.y;
                                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                                this.playerGroup.rotation.y += diff * 30.0 * dt;
                            } else if (hasMovement) {
                                let diff = moveAngle - this.playerGroup.rotation.y;
                                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                                this.playerGroup.rotation.y += diff * 22.0 * dt;
                            }
                        } else {
                            this.lockedAimTarget = null;
                            if (hasMovement) {
                                let diff = moveAngle - this.playerGroup.rotation.y;
                                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                                this.playerGroup.rotation.y += diff * 22.0 * dt;
                            }
                        }

                        if (isFiring) {
                            this.tryShoot();
                        }
                    }

                    if (moveX !== 0 || moveZ !== 0) {
                        const speedUpgradeBonus = 1 + ((this.upgrades.player_speed || 0) * 0.12);
                        const rawMag = Math.hypot(moveX, moveZ);

                        let inputMagnitude = 1.0;
                        if (this.touchJoystick.active && !this.isAc130Active) {
                            const deadzone = 0.15;
                            if (rawMag < deadzone) {
                                inputMagnitude = 0;
                            } else {
                                inputMagnitude = Math.min(1.0, (rawMag - deadzone) / (1.0 - deadzone));
                            }
                        }

                        if (inputMagnitude > 0) {
                            const baseSpeed = 9.0;
                            const moveSpeed = (baseSpeed * speedUpgradeBonus * inputMagnitude) * dt;

                            const moveLen = rawMag || 1;
                            const stepX = (moveX / moveLen) * moveSpeed;
                            const stepZ = (moveZ / moveLen) * moveSpeed;

                            const curX = this.playerGroup.position.x;
                            const curZ = this.playerGroup.position.z;

                            const checkBlocked = (x, z) => {
                                for (let w of this.walls) {
                                    if (checkWallCollision(x, z, 0.45, w)) {
                                        return true;
                                    }
                                }
                                if (this.environmentObstacles) {
                                    for (let i = 0; i < this.environmentObstacles.length; i++) {
                                        const obs = this.environmentObstacles[i];
                                        const odx = x - obs.x;
                                        const odz = z - obs.z;
                                        const minD = obs.radius + 0.5;
                                        if (Math.abs(odx) < minD && Math.abs(odz) < minD) {
                                            if (odx * odx + odz * odz < minD * minD) {
                                                return true;
                                            }
                                        }
                                    }
                                }
                                const dbx = x - this.baseGroup.position.x;
                                const dbz = z - this.baseGroup.position.z;
                                return (dbx * dbx + dbz * dbz) < 27.04;
                            };

                            const nextX = THREE.MathUtils.clamp(curX + stepX, -76, 76);
                            const nextZ = THREE.MathUtils.clamp(curZ + stepZ, -76, 76);

                            if (!checkBlocked(nextX, nextZ)) {
                                this.playerGroup.position.x = nextX;
                                this.playerGroup.position.z = nextZ;
                            } else {
                                // Sliding collision response: allow independent axis movement
                                if (stepX !== 0 && !checkBlocked(nextX, curZ)) {
                                    this.playerGroup.position.x = nextX;
                                }
                                if (stepZ !== 0 && !checkBlocked(this.playerGroup.position.x, nextZ)) {
                                    this.playerGroup.position.z = nextZ;
                                }
                            }
                            
                            this.playerWalkCycle += dt * 18 * inputMagnitude;
                            const legSwing = Math.sin(this.playerWalkCycle) * 0.6;
                            if (this.leftLegWrap) this.leftLegWrap.rotation.x = legSwing;
                            if (this.rightLegWrap) this.rightLegWrap.rotation.x = -legSwing;
                        } else {
                            if (this.leftLegWrap) this.leftLegWrap.rotation.x = THREE.MathUtils.lerp(this.leftLegWrap.rotation.x, 0, 0.1);
                            if (this.rightLegWrap) this.rightLegWrap.rotation.x = THREE.MathUtils.lerp(this.rightLegWrap.rotation.x, 0, 0.1);
                        }
                    } else {
                        if (this.leftLegWrap) this.leftLegWrap.rotation.x = THREE.MathUtils.lerp(this.leftLegWrap.rotation.x, 0, 0.1);
                        if (this.rightLegWrap) this.rightLegWrap.rotation.x = THREE.MathUtils.lerp(this.rightLegWrap.rotation.x, 0, 0.1);
                    }

                    if (!this.isAc130Active) {
                        // Framerate-independent exponential smoothing
                        const camAlpha = 1.0 - Math.exp(-15.0 * dt);
                        const targetX = this.playerGroup.position.x + this.cameraOffset.x;
                        const targetY = this.playerGroup.position.y + this.cameraOffset.y;
                        const targetZ = this.playerGroup.position.z + this.cameraOffset.z;

                        this.cameraBasePos.x += (targetX - this.cameraBasePos.x) * camAlpha;
                        this.cameraBasePos.y += (targetY - this.cameraBasePos.y) * camAlpha;
                        this.cameraBasePos.z += (targetZ - this.cameraBasePos.z) * camAlpha;

                        // Decoupled camera shake offset (does not corrupt base tracking)
                        if (this.cameraShake > 0) {
                            this.cameraShakeOffset.set(
                                (Math.random() - 0.5) * this.cameraShake * 2.2,
                                (Math.random() - 0.5) * this.cameraShake * 1.2,
                                (Math.random() - 0.5) * this.cameraShake * 2.2
                            );
                            this.cameraShake = Math.max(0, this.cameraShake - dt * 2.2);
                        } else {
                            this.cameraShakeOffset.set(0, 0, 0);
                        }

                        this.camera.position.copy(this.cameraBasePos).add(this.cameraShakeOffset);

                        // Smooth stable focal point for lookAt
                        this.cameraLookTarget.set(
                            this.cameraBasePos.x - this.cameraOffset.x,
                            this.playerGroup.position.y,
                            this.cameraBasePos.z - this.cameraOffset.z
                        );
                        this.camera.lookAt(this.cameraLookTarget);
                    }

                    if (this.playerShieldMesh) {
                        this.playerShieldMesh.visible = (this.playerShield > 0);
                        if (this.playerShield > 0) {
                            this.playerShieldMesh.rotation.y += dt * 1.5;
                        }
                    }
                    if (this.baseShieldMesh) {
                        this.baseShieldMesh.visible = (this.baseShield > 0);
                        if (this.baseShield > 0) {
                            this.baseShieldMesh.rotation.y += dt * 0.4;
                        }
                    }

                    if (this.baseCoreCrystal) this.baseCoreCrystal.rotation.y += 0.02;

                    // Update active explosion meshes smoothly
                    if (this.activeExplosions && this.activeExplosions.length > 0) {
                        for (let ei = this.activeExplosions.length - 1; ei >= 0; ei--) {
                            const exp = this.activeExplosions[ei];
                            exp.userData.scaleProgress += dt * 3.6;
                            const curScale = exp.userData.baseScale * exp.userData.scaleProgress;
                            exp.scale.set(curScale, curScale, curScale);
                            exp.material.opacity -= dt * 1.5;
                            if (exp.material.opacity <= 0) {
                                exp.visible = false;
                                if (this.explosionPool) this.explosionPool.push(exp);
                                const lastExp = this.activeExplosions.pop();
                                if (ei < this.activeExplosions.length) this.activeExplosions[ei] = lastExp;
                            }
                        }
                    }

                    // Bullet Update & Continuous Swept-Segment Collision (100% Tunnel-Free Precision)
                    for (let i = this.bullets.length - 1; i >= 0; i--) {
                        const b = this.bullets[i];
                        if (!b || !b.userData || !b.userData.dir) {
                            this.scene.remove(b);
                            const lastB = this.bullets.pop();
                            if (i < this.bullets.length) this.bullets[i] = lastB;
                            continue;
                        }

                        const prevX = b.position.x;
                        const prevZ = b.position.z;
                        const moveDist = b.userData.speed * dt;
                        b.position.x += b.userData.dir.x * moveDist;
                        b.position.z += b.userData.dir.z * moveDist;
                        const currX = b.position.x;
                        const currZ = b.position.z;
                        b.userData.life -= dt;

                        if (b.userData.isEnemy && Math.random() < 0.25) {
                            this.createBloodSparks(b.position, 0x84cc16);
                        }

                        let bulletHit = false;

                        if (b.userData.isEnemy) {
                            for (let wi = 0; wi < this.walls.length; wi++) {
                                const w = this.walls[wi];
                                const dwx = currX - w.position.x;
                                const dwz = currZ - w.position.z;
                                if (dwx * dwx + dwz * dwz < w.userData.radius * w.userData.radius) {
                                    bulletHit = true;
                                    this.createBloodSparks(b.position, 0x94a3b8);
                                    break;
                                }
                            }
                        }

                        if (!bulletHit) {
                            if (b.userData.isEnemy) {
                                // Enemy projectile hits player
                                const dpx = currX - this.playerGroup.position.x;
                                const dpz = currZ - this.playerGroup.position.z;
                                if (dpx * dpx + dpz * dpz < 1.69) {
                                    bulletHit = true;
                                    let pDmg = b.userData.damage;
                                    if (this.playerShield > 0) {
                                        const absorbed = Math.min(this.playerShield, pDmg);
                                        this.playerShield -= absorbed;
                                        pDmg -= absorbed;
                                        this.createBloodSparks(b.position, 0x38bdf8);
                                    }
                                    if (pDmg > 0) {
                                        this.playerHp = Math.max(0, this.playerHp - pDmg);
                                    }
                                    this.flashZombieHit(this.playerGroup);
                                    this.createBloodSparks(b.position, 0x84cc16);
                                    this.syncHUD();
                                    if (this.playerHp <= 0) this.handlePlayerDeath();
                                }
                                // Enemy projectile hits base
                                const dbx = currX - this.baseGroup.position.x;
                                const dbz = currZ - this.baseGroup.position.z;
                                if (!this.isBaseInvulnerable && !bulletHit && (dbx * dbx + dbz * dbz < 27.04)) {
                                    bulletHit = true;
                                    let bDmg = b.userData.damage;
                                    if (this.baseShield > 0) {
                                        const absorbed = Math.min(this.baseShield, bDmg);
                                        this.baseShield -= absorbed;
                                        bDmg -= absorbed;
                                        this.createBloodSparks(b.position, 0x06b6d4);
                                    }
                                    if (bDmg > 0) {
                                        this.baseHp = Math.max(0, this.baseHp - bDmg);
                                        this.triggerBaseAlarm();
                                    }
                                    this.syncHUD();
                                    if (this.baseHp <= 0) this.handleBaseDeath();
                                }
                            } else {
                                // Continuous swept-segment collision detection against all active zombies
                                const segVx = currX - prevX;
                                const segVz = currZ - prevZ;
                                const segLenSq = segVx * segVx + segVz * segVz;

                                for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                                    const z = this.zombies[zi];
                                    if (!z || !z.userData || z.userData.hp <= 0 || z.userData.isDead) continue;

                                    // Strict Anti-Air isolation: Only MANTIS 35mm AA bullets can hit flying zombies, and AA bullets ONLY hit flying zombies!
                                    if (z.userData.isFlying && !b.userData.isAntiAirBullet) continue;
                                    if (!z.userData.isFlying && b.userData.isAntiAirBullet) continue;

                                    const zx = z.position.x;
                                    const zz = z.position.z;
                                    const hitRad = 2.4 * z.userData.scale;
                                    const hitRadSq = hitRad * hitRad;

                                    // Fast bounding box cull
                                    const maxReach = hitRad + moveDist;
                                    if (Math.abs(zx - currX) > maxReach && Math.abs(zx - prevX) > maxReach) continue;
                                    if (Math.abs(zz - currZ) > maxReach && Math.abs(zz - prevZ) > maxReach) continue;

                                    // Point to continuous bullet trajectory segment distance
                                    let distSq;
                                    if (segLenSq < 0.0001) {
                                        const dx = zx - currX;
                                        const dz = zz - currZ;
                                        distSq = dx * dx + dz * dz;
                                    } else {
                                        const t = Math.max(0, Math.min(1, ((zx - prevX) * segVx + (zz - prevZ) * segVz) / segLenSq));
                                        const cx = prevX + t * segVx;
                                        const cz = prevZ + t * segVz;
                                        const dx = zx - cx;
                                        const dz = zz - cz;
                                        distSq = dx * dx + dz * dz;
                                    }

                                    if (distSq <= hitRadSq) {
                                        bulletHit = true;
                                        if (b.userData.isExplosive) {
                                            const visRad = b.userData.isTurretBullet ? 5.2 : b.userData.splashRadius;
                                            const effRad = b.userData.isTurretBullet ? Math.min(6.0, b.userData.splashRadius || 5.5) : b.userData.splashRadius;
                                            this.createExplosion(b.position, effRad, b.userData.damage, visRad);
                                        } else {
                                            let finalDamage = b.userData.damage;

                                            if (b.userData.isTurretBullet) {
                                                if (z.userData.isShield) {
                                                    this.createBloodSparks(b.position, 0x94a3b8);
                                                    finalDamage = 0;
                                                } else if (z.userData.armorThreshold > 0 && finalDamage < z.userData.armorThreshold) {
                                                    this.createBloodSparks(b.position, 0x38bdf8);
                                                    finalDamage = 0;
                                                }
                                            }

                                            if (finalDamage > 0) {
                                                z.userData.hp -= finalDamage;
                                                z.position.x += b.userData.dir.x * 0.4;
                                                z.position.z += b.userData.dir.z * 0.4;
                                                this.flashZombieHit(z);
                                                this._v2.set(z.position.x, 1.2 * z.userData.scale, z.position.z);
                                                this.createBloodSparks(this._v2, 0xef4444);
                                                if (typeof audio !== 'undefined' && audio.playZombieHit) audio.playZombieHit();
                                                if (z.userData.hp <= 0) this.killZombie(z);
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }

                        if (bulletHit || b.userData.life <= 0) {
                            b.visible = false;
                            b.quaternion.identity();
                            b.rotation.set(0, 0, 0);
                            this.bulletPool.push(b);
                            // Fast Swap-and-Pop O(1) removal
                            const lastB = this.bullets.pop();
                            if (i < this.bullets.length) this.bullets[i] = lastB;
                        }
                    }

                    const BASE_RADIUS = 8.5;
                    const BASE_RADIUS_SQ = BASE_RADIUS * BASE_RADIUS;
                    const basePos = this.baseGroup.position;
                    const playerPos = this.playerGroup.position;
                    const isMob = this.isMobile;
                    // Use fewer angle offsets on mobile (5 vs 9) to halve zombie AI cost
                    const angleOffsets = isMob ? this._angleOffsetsMob : this._angleOffsets;

                    // Active Light Masts (THW Flutlichtmasten verlangsamen Zombies bei Nacht im Lichtkegel auf Normal-Tempo)
                    const activeLightMasts = (this.nightSpeedMult > 1.0 && this.turrets.length > 0)
                        ? this.turrets.filter(t => t && t.userData && t.userData.isLightMast && t.userData.hp > 0)
                        : null;

                    for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
                        const z = this.zombies[zi];
                        if (!z || !z.userData || z.userData.hp <= 0 || z.userData.isDead) {
                            this.killZombie(z);
                            continue;
                        }
                        // Use squared distance to avoid sqrt — cheaper for target selection
                        const dxP = z.position.x - playerPos.x;
                        const dzP = z.position.z - playerPos.z;
                        const distToPlayerSq = dxP * dxP + dzP * dzP;

                        // When 1-3 zombies remain in the entire wave (no more left to spawn):
                        const isWaveEndEnraged = (this.zombiesLeftToSpawn === 0 && this.zombies.length <= 3);

                        // In wave end enraged mode, target closest entity (player or base) with higher aggression
                        let target;
                        if (isWaveEndEnraged) {
                            const dxB = z.position.x - basePos.x;
                            const dzB = z.position.z - basePos.z;
                            const distToBaseSq = dxB * dxB + dzB * dzB;
                            target = distToPlayerSq < distToBaseSq ? playerPos : basePos;
                        } else {
                            target = distToPlayerSq < 324 ? playerPos : basePos; // 18^2 = 324
                        }

                        const directAngle = Math.atan2(target.x - z.position.x, target.z - z.position.z);
                        
                        let zombieSpeedMult = this.nightSpeedMult || 1.0;
                        if (isWaveEndEnraged) {
                            // Enrage sprint boost so the last zombie rushes to action in seconds
                            zombieSpeedMult *= (this.zombies.length === 1 ? 2.4 : 1.8);
                        }
                        if (activeLightMasts && activeLightMasts.length > 0 && zombieSpeedMult > 1.0) {
                            for (let mi = 0; mi < activeLightMasts.length; mi++) {
                                const lm = activeLightMasts[mi];
                                const lmdx = z.position.x - lm.position.x;
                                const lmdz = z.position.z - lm.position.z;
                                const lmRange = lm.userData.range || 34;
                                if (lmdx * lmdx + lmdz * lmdz <= lmRange * lmRange) {
                                    // Zombie befindet sich im Flutlichtkegel: Geblendet und auf normales Tempo gedrosselt!
                                    zombieSpeedMult = 1.0;
                                    break;
                                }
                            }
                        }

                        // Taktischer Hochleistungs-Fluter des Spielers: Starker Blend- und Verlangsamungseffekt nachts
                        if (this.flashlight && this.flashlight.visible && this.flashlight.intensity > 1.0) {
                            const pDx = z.position.x - playerPos.x;
                            const pDz = z.position.z - playerPos.z;
                            const distToP = Math.sqrt(pDx * pDx + pDz * pDz);
                            const flashRange = 55.0; // Enorme Reichweite des Fluters

                            if (distToP > 0.5 && distToP <= flashRange) {
                                const pRot = this.playerGroup.rotation.y;
                                const facingX = Math.sin(pRot);
                                const facingZ = Math.cos(pRot);
                                const dot = (pDx * facingX + pDz * facingZ) / distToP;
                                const coneThreshold = Math.cos(this.flashlight.angle || (Math.PI / 3.4));

                                if (dot >= coneThreshold) {
                                    // Zombie gerät in den massiven Flutlichtkegel: Extrem geblendet und um 65% verlangsamt!
                                    zombieSpeedMult *= 0.35;
                                }
                            }
                        }

                        const stepSize = z.userData.speed * zombieSpeedMult * (dt * 60);
                        const zRadius = 0.4 * z.userData.scale;
                        const skipPathingThisFrame = (isMob || this.zombies.length > 25) && (this._frameCount + zi) % 2 !== 0 && z.userData.lastChosenAngle !== undefined;
                        let chosenAngle = null;
                        let hitWallTarget = null;

                        if (z.userData.isFlying) {
                            // Flying zombies fly in a straight aerial vector, bypassing ground walls and sandbags!
                            chosenAngle = directAngle;
                            z.userData.lastChosenAngle = directAngle;

                            const flap = Math.sin(nowSec * 18 + (z.userData.flySeed || 0));
                            if (z.userData.wingL) z.userData.wingL.rotation.z = flap * 0.55;
                            if (z.userData.wingR) z.userData.wingR.rotation.z = -flap * 0.55;

                            // Smooth aerial hovering altitude
                            const targetY = 3.2 + Math.sin(nowSec * 3.5 + (z.userData.flySeed || 0)) * 0.55;
                            z.position.y += (targetY - z.position.y) * 0.1;
                        } else if (skipPathingThisFrame) {
                            chosenAngle = z.userData.lastChosenAngle;
                        } else if (this.walls.length === 0) {
                            chosenAngle = directAngle;
                            z.userData.lastChosenAngle = chosenAngle;
                        } else {
                            // Fast AABB pre-filter: Find candidate walls within 6.5m
                            let candidateWalls = null;
                            const zx = z.position.x;
                            const zz = z.position.z;
                            for (let wi = 0; wi < this.walls.length; wi++) {
                                const w = this.walls[wi];
                                if (Math.abs(w.position.x - zx) < 6.5 && Math.abs(w.position.z - zz) < 6.5) {
                                    if (!candidateWalls) candidateWalls = [];
                                    candidateWalls.push(w);
                                }
                            }

                            if (!candidateWalls) {
                                chosenAngle = directAngle;
                            } else {
                                for (let ai = 0; ai < angleOffsets.length; ai++) {
                                    const testAngle = directAngle + angleOffsets[ai];
                                    const testX = zx + Math.sin(testAngle) * stepSize;
                                    const testZ = zz + Math.cos(testAngle) * stepSize;

                                    let blocked = false;
                                    for (let wi = 0; wi < candidateWalls.length; wi++) {
                                        const w = candidateWalls[wi];
                                        if (checkWallCollision(testX, testZ, zRadius, w)) {
                                            blocked = true;
                                            if (ai === 0) hitWallTarget = w;
                                            break;
                                        }
                                    }

                                    if (!blocked) {
                                        chosenAngle = testAngle;
                                        break;
                                    }
                                }
                            }
                            z.userData.lastChosenAngle = chosenAngle;
                        }

                        let distToBaseNextSq = 99999;

                        if (chosenAngle !== null) {
                            z.rotation.y = chosenAngle;
                            const nextX = z.position.x + Math.sin(chosenAngle) * stepSize;
                            const nextZ = z.position.z + Math.cos(chosenAngle) * stepSize;

                            const dbx = nextX - basePos.x;
                            const dbz = nextZ - basePos.z;
                            distToBaseNextSq = dbx * dbx + dbz * dbz;

                            if (distToBaseNextSq < BASE_RADIUS_SQ) {
                                const distToBaseNext = Math.sqrt(distToBaseNextSq);
                                const dirX = dbx / (distToBaseNext || 1);
                                const dirZ = dbz / (distToBaseNext || 1);

                                z.position.x = basePos.x + dirX * BASE_RADIUS;
                                z.position.z = basePos.z + dirZ * BASE_RADIUS;

                                if (!this.isBaseInvulnerable) {
                                    let dmg = (0.22 * z.userData.dmgMult) * dt * 60;

                                    if (this.baseShield > 0) {
                                        const absorbed = Math.min(this.baseShield, dmg);
                                        this.baseShield -= absorbed;
                                        dmg -= absorbed;
                                    }
                                    if (dmg > 0) {
                                        this.baseHp = Math.max(0, this.baseHp - dmg);
                                        this.triggerBaseAlarm();
                                    }

                                    if (this.upgrades.base_spikes > 0 && !z.userData.isFlying) {
                                        const spikeDmg = ((this.upgrades.base_spikes * 65) + (z.userData.maxHp * 0.03 * this.upgrades.base_spikes)) * dt;
                                        z.userData.hp -= spikeDmg;
                                        if (z.userData.hp <= 0) this.killZombie(z);
                                    }

                                    this._needHudSync = true;
                                    if (this.baseHp <= 0) this.handleBaseDeath();
                                }
                            } else {
                                z.position.x = nextX;
                                z.position.z = nextZ;

                                if (!z.userData.isFlying && this.environmentObstacles) {
                                    for (let oi = 0; oi < this.environmentObstacles.length; oi++) {
                                        const obs = this.environmentObstacles[oi];
                                        const ox = z.position.x - obs.x;
                                        const oz = z.position.z - obs.z;
                                        const minDist = obs.radius + zRadius;
                                        if (Math.abs(ox) < minDist && Math.abs(oz) < minDist) {
                                            const distSq = ox * ox + oz * oz;
                                            if (distSq < minDist * minDist && distSq > 0.001) {
                                                const d = Math.sqrt(distSq);
                                                const pushX = ox / d;
                                                const pushZ = oz / d;
                                                // Tangential sliding vector to prevent head-on jamming against obstacle centers
                                                const tanX = -pushZ;
                                                const tanZ = pushX;
                                                const dirX = Math.sin(directAngle);
                                                const dirZ = Math.cos(directAngle);
                                                const sign = (dirX * tanX + dirZ * tanZ) >= 0 ? 1 : -1;
                                                z.position.x = obs.x + pushX * minDist + tanX * sign * (stepSize * 0.6);
                                                z.position.z = obs.z + pushZ * minDist + tanZ * sign * (stepSize * 0.6);
                                            }
                                        }
                                    }
                                }

                                // Lone zombie watchdog: if 1 zombie remains for > 4s and is far away (>32m), pull it closer
                                if (isWaveEndEnraged && this.zombies.length === 1) {
                                    z.userData.loneZombieTimer = (z.userData.loneZombieTimer || 0) + dt;
                                    if (z.userData.loneZombieTimer > 4.0) {
                                        const distCenter = Math.hypot(z.position.x, z.position.z);
                                        if (distCenter > 32) {
                                            const scaleDown = 22 / distCenter;
                                            z.position.x *= scaleDown;
                                            z.position.z *= scaleDown;
                                            z.userData.loneZombieTimer = 0;
                                        }
                                    }
                                }
                            }
                        } else if (hitWallTarget) {
                            z.rotation.y = directAngle;
                            const isLaserWall = hitWallTarget.userData.typeId === 'laser_wall';
                            if (isLaserWall && z.userData.type !== 'boss') {
                                // Non-boss zombies cannot damage plasma barrier
                            } else {
                                const wallDmg = z.userData.type === 'boss' ? 300 * z.userData.dmgMult : 35 * z.userData.dmgMult;
                                hitWallTarget.userData.hp -= wallDmg * dt;
                                this.createBloodSparks(hitWallTarget.position, 0xeab308);
                                if (hitWallTarget.userData.hp <= 0) {
                                    this.destroyWall(hitWallTarget);
                                }
                            }
                        }

                        // Walk bob: skip on mobile when >25 zombies
                        if (!isMob || this.zombies.length <= 25) {
                            z.userData.walkCycle += 0.15 * zombieSpeedMult;
                            z.rotation.z = Math.sin(z.userData.walkCycle) * 0.08;
                        }

                        // Zombies attack nearby turrets! Bosses have larger attack range & smash power
                        const zCurX = z.position.x;
                        const zCurZ = z.position.z;
                        for (let k = this.turrets.length - 1; k >= 0; k--) {
                            const t = this.turrets[k];
                            if (t.userData.isIndestructible) continue; // Unzerstörbarer Hangar wird nicht von Zombies beschädigt
                            if (Math.abs(zCurX - t.position.x) > 3.0 || Math.abs(zCurZ - t.position.z) > 3.0) continue; // Fast AABB cull
                            const attackRange = 1.8 * (z.userData.type === 'boss' ? (z.userData.scale || 2.4) : 1.0);
                            const dtx = zCurX - t.position.x;
                            const dtz = zCurZ - t.position.z;
                            if (dtx * dtx + dtz * dtz < attackRange * attackRange) {
                                const turretDmg = z.userData.type === 'boss' ? 240 * z.userData.dmgMult : 28 * z.userData.dmgMult;
                                t.userData.hp -= turretDmg * dt;
                                this.createBloodSparks(t.position, z.userData.type === 'boss' ? 0xef4444 : 0xf59e0b);
                                if (t.userData.hp <= 0) {
                                    audio.playExplosion();
                                    this.createExplosion(t.position, 2.8, 0);
                                    this.scene.remove(t);
                                    this.turrets.splice(k, 1);
                                    if (z.userData.type === 'boss' && typeof showWarningToast === 'function') {
                                        showWarningToast('💥 ENDBOSS HAT DEINEN TURM ZERSTÖRT!');
                                    }
                                }
                                break;
                            }
                        }

                        // Special Zombie Behaviors
                        if (z.userData.type === 'exploder' && (distToPlayerSq < 3.24 || distToBaseNextSq < 81.0)) { // 1.8^2 = 3.24, 9.0^2 = 81
                            if (!z.userData.exploded) {
                                z.userData.exploded = true;
                                this.killZombie(z);
                            }
                        }

                        if (z.userData.type === 'summoner') {
                            z.userData.summonTimer = (z.userData.summonTimer || 0) + dt;
                            if (z.userData.summonTimer >= 5.5 && this.zombies.length < 45) {
                                z.userData.summonTimer = 0;
                                this.spawnMinionCrawler(z.position.x + 1.2, z.position.z + 1.2);
                                this.spawnMinionCrawler(z.position.x - 1.2, z.position.z - 1.2);
                                this.createBloodSparks(z.position, 0xc084fc);
                            }
                        }

                        if (z.userData.type === 'spitter') {
                            z.userData.spitTimer = (z.userData.spitTimer || 0) + dt;
                            if (z.userData.spitTimer >= 3.2 && distToPlayerSq > 25.0 && distToPlayerSq < 324.0) { // 5^2=25, 18^2=324
                                z.userData.spitTimer = 0;
                                if (!this._spitGeo) {
                                    this._spitGeo = new THREE.SphereGeometry(0.35, 8, 8);
                                    this._spitMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
                                }
                                const spitMesh = new THREE.Mesh(this._spitGeo, this._spitMat);
                                spitMesh.position.copy(z.position);
                                spitMesh.position.y = 1.3;
                                const dir = new THREE.Vector3().subVectors(this.playerGroup.position, z.position).normalize();
                                spitMesh.userData = {
                                    dir: dir,
                                    speed: 22,
                                    damage: 11 * z.userData.dmgMult,
                                    life: 1.8,
                                    isEnemy: true
                                };
                                this.scene.add(spitMesh);
                                this.bullets.push(spitMesh);
                            }
                        }

                        if (z.userData.type === 'raider' && (distToPlayerSq < 1.96 || distToBaseNextSq < 81.0)) { // 1.4^2 = 1.96
                            const nowMs = performance.now();
                            if (!z.userData.lastSteal || (nowMs - z.userData.lastSteal > 850)) {
                                z.userData.lastSteal = nowMs;
                                if (this.money > 0) {
                                    const stolen = Math.max(50, Math.round(this.money * 0.08));
                                    this.money = Math.max(0, this.money - stolen);
                                    if (typeof showWarningToast === 'function') {
                                        showWarningToast(`-$${stolen} GELD GESTOHLEN!`);
                                    }
                                    audio.playPistol();
                                    this._needHudSync = true;
                                }
                            }
                        }

                        if (distToPlayerSq < 1.96 && !this.isInvulnerable) { // 1.4^2 = 1.96
                            let pDmg = (0.3 * z.userData.dmgMult) * dt * 60;
                            if (this.playerShield > 0) {
                                const absorbed = Math.min(this.playerShield, pDmg);
                                this.playerShield -= absorbed;
                                pDmg -= absorbed;
                                if (Math.random() < 0.15) this.createBloodSparks(this.playerGroup.position, 0x38bdf8);
                            }
                            if (pDmg > 0) {
                                this.playerHp = Math.max(0, this.playerHp - pDmg);
                            }
                            this._needHudSync = true;
                            if (this.playerHp <= 0) this.handlePlayerDeath();
                        }
                    } // end zombie for-loop

                    for (let i = this.particles.length - 1; i >= 0; i--) {
                        const p = this.particles[i];
                        if (p.userData.velX !== undefined) {
                            p.position.x += p.userData.velX * dt;
                            p.position.y += p.userData.velY * dt;
                            p.position.z += p.userData.velZ * dt;
                            p.userData.velY -= 15 * dt; // gravity
                        } else if (p.userData.vel) {
                            p.position.addScaledVector(p.userData.vel, dt);
                            p.userData.vel.y -= 12 * dt;
                        }
                        p.userData.life -= dt;
                        if (p.userData.life <= 0) {
                            p.visible = false;
                            this.particlePool.push(p);
                            // Swap-and-pop fast O(1) array removal
                            const lastP = this.particles.pop();
                            if (i < this.particles.length) this.particles[i] = lastP;
                        }
                    }

                    // Process flash: restore colors on bodyMaterials directly
                    for (let fi = 0; fi < this.zombies.length; fi++) {
                        const fz = this.zombies[fi];
                        if (fz.userData && fz.userData.flashTimer > 0) {
                            fz.userData.flashTimer -= dt;
                            if (fz.userData.flashTimer <= 0) {
                                fz.userData.flashTimer = 0;
                                if (fz.userData.bodyMaterials) {
                                    for (let mi = 0; mi < fz.userData.bodyMaterials.length; mi++) {
                                        const mat = fz.userData.bodyMaterials[mi];
                                        if (mat && mat.userData.origColor !== undefined) {
                                            mat.color.setHex(mat.userData.origColor);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Throttle DOM syncHUD to max 10x per second (every 100ms)
                const now2 = performance.now();
                if (this._needHudSync || (now2 - (this._lastHudSync || 0)) > 100) {
                    this.syncHUD();
                    this._lastHudSync = now2;
                    this._needHudSync = false;
                }

                // Update turret 3D health bars (billboard towards camera & sync fill)
                for (let ti = 0; ti < this.turrets.length; ti++) {
                    const t = this.turrets[ti];
                    if (t && t.userData && t.userData.hpBarGroup) {
                        t.userData.hpBarGroup.quaternion.copy(this.camera.quaternion);
                        this.updateTurretHpBar(t);
                    }
                }

                this.renderer.render(this.scene, this.camera);
            }

            onSecondTick() {
                if (this.isPaused || this.isGameOver) return;
                this.gameSeconds++;

                if (this.upgrades.auto_repair > 0 && this.baseHp < this.maxBaseHp) {
                    const repairAmount = Math.round((this.upgrades.auto_repair * 15) + (this.maxBaseHp * 0.004 * this.upgrades.auto_repair));
                    this.baseHp = Math.min(this.maxBaseHp, this.baseHp + repairAmount);
                    this._needHudSync = true;
                }

                if (this.gameSeconds > Storage.data.highScoreSeconds) {
                    Storage.data.highScoreSeconds = this.gameSeconds;
                    Storage.save();
                    updateHighscoreUI();
                }

                if (this.gameSeconds % 5 === 0) {
                    this.saveGameSession();
                }

                if (this.gameSeconds % 15 === 0) {
                    this.updateStockPrices(false);
                }

                // Safety: trigger next wave if all zombies gone but nextWave() was missed
                // (e.g. due to spawn being skipped while paused)
                if (this.zombiesLeftToSpawn <= 0 && this.zombies.length === 0 && !this.isWaveTransitioning && !this.isGameOver) {
                    this.nextWave();
                }

                this.syncHUD();
            }

            handlePlayerDeath() {
                if (this.isInvulnerable) return;

                if (this.playerLives > 1) {
                    this.playerLives--;
                    this.playerHp = this.maxPlayerHp;
                    this.playerShield = this.maxPlayerShield;
                    this.isInvulnerable = true;

                    const playerPos = this.playerGroup.position;

                    // 1. Shockwave Blast: Kill all zombies around player in a 14-meter radius!
                    this.createExplosion(playerPos, 14.0, 99999, 14.0, true);

                    for (let i = this.zombies.length - 1; i >= 0; i--) {
                        const z = this.zombies[i];
                        const distToP = Math.hypot(z.position.x - playerPos.x, z.position.z - playerPos.z);
                        if (distToP < 14.0) {
                            this.createBloodSparks(z.position, 0xef4444);
                            this.killZombie(z);
                        }
                    }

                    // 2. Invulnerability Blinking Feedback (1.2 seconds)
                    let flashes = 0;
                    const invulnInterval = setInterval(() => {
                        flashes++;
                        if (this.playerGroup) {
                            this.playerGroup.visible = !this.playerGroup.visible;
                        }
                        if (flashes >= 10) {
                            clearInterval(invulnInterval);
                            if (this.playerGroup) this.playerGroup.visible = true;
                            this.isInvulnerable = false;
                        }
                    }, 120);

                    if (typeof audio !== 'undefined' && audio.playHeavyBomb) {
                        audio.playHeavyBomb();
                    }
                    this.syncHUD();
                } else {
                    this.playerLives = 0;
                    this.syncHUD();
                    this.triggerGameOver('player');
                }
            }

            handleBaseDeath() {
                if (this.isBaseInvulnerable) return;

                if (this.baseLives > 1) {
                    this.baseLives--;
                    this.baseHp = this.maxBaseHp;
                    this.baseShield = this.maxBaseShield;
                    this.isBaseInvulnerable = true;

                    const basePos = this.baseGroup.position;

                    // 1. Massive Core Shockwave Blast: Eliminate all zombies around base in 22-meter radius!
                    this.createExplosion(basePos, 22.0, 99999, 22.0, true);

                    for (let i = this.zombies.length - 1; i >= 0; i--) {
                        const z = this.zombies[i];
                        const distToBase = Math.hypot(z.position.x - basePos.x, z.position.z - basePos.z);
                        if (distToBase < 22.0) {
                            this.createBloodSparks(z.position, 0x38bdf8);
                            this.killZombie(z);
                        }
                    }

                    // 2. Base Core Overload Feedback & Forcefield Shield (2.4 seconds)
                    if (this.baseShieldMesh) {
                        this.baseShieldMesh.visible = true;
                        this.baseShieldMesh.scale.set(1.4, 1.4, 1.4);
                    }

                    let flashes = 0;
                    const invulnInterval = setInterval(() => {
                        flashes++;
                        if (this.baseGroup) {
                            this.baseGroup.visible = !this.baseGroup.visible;
                        }
                        if (flashes >= 12) {
                            clearInterval(invulnInterval);
                            if (this.baseGroup) this.baseGroup.visible = true;
                            if (this.baseShieldMesh) this.baseShieldMesh.scale.set(1, 1, 1);
                            this.isBaseInvulnerable = false;
                        }
                    }, 120);

                    if (typeof audio !== 'undefined' && audio.playHeavyBomb) {
                        audio.playHeavyBomb();
                    }
                    if (typeof showWarningToast === 'function') {
                        showWarningToast(`⚡ BASIS-KERN ÜBERLADUNG! ${this.baseLives} LEBEN VERBLEIBEND!`);
                    }
                    this.syncHUD();
                } else {
                    this.baseLives = 0;
                    this.syncHUD();
                    this.triggerGameOver('base');
                }
            }

            syncHUD() {
                this._needHudSync = false;
                this._lastHudSync = performance.now();

                // 1. Player HP & Shield
                const pText = this.playerShield > 0
                    ? `${Math.ceil(this.playerHp)}/${this.maxPlayerHp} (🛡️${Math.ceil(this.playerShield)})`
                    : `${Math.ceil(this.playerHp)}/${this.maxPlayerHp}`;
                if (this._cachePlayerHpText !== pText) {
                    this._cachePlayerHpText = pText;
                    const el = document.getElementById('hud-player-hp-text');
                    if (el) el.innerText = pText;
                }

                const pPct = `${Math.min(100, Math.max(0, (this.playerHp / this.maxPlayerHp) * 100))}%`;
                if (this._cachePlayerHpPct !== pPct) {
                    this._cachePlayerHpPct = pPct;
                    const el = document.getElementById('hud-player-hp-bar');
                    if (el) el.style.width = pPct;
                }

                const pShieldPct = this.maxPlayerShield > 0
                    ? `${Math.min(100, Math.max(0, (this.playerShield / this.maxPlayerShield) * 100))}%`
                    : '0%';
                if (this._cachePlayerShieldPct !== pShieldPct) {
                    this._cachePlayerShieldPct = pShieldPct;
                    const el = document.getElementById('hud-player-shield-bar');
                    if (el) el.style.width = pShieldPct;
                }

                // 2. Base HP & Shield
                const bText = this.baseShield > 0
                    ? `${Math.ceil(this.baseHp)}/${this.maxBaseHp} (🛡️${Math.ceil(this.baseShield)})`
                    : `${Math.ceil(this.baseHp)}/${this.maxBaseHp}`;
                if (this._cacheBaseHpText !== bText) {
                    this._cacheBaseHpText = bText;
                    const el = document.getElementById('hud-base-hp-text');
                    if (el) el.innerText = bText;
                }

                const bPct = `${Math.min(100, Math.max(0, (this.baseHp / this.maxBaseHp) * 100))}%`;
                if (this._cacheBaseHpPct !== bPct) {
                    this._cacheBaseHpPct = bPct;
                    const el = document.getElementById('hud-base-hp-bar');
                    if (el) el.style.width = bPct;
                }

                const bShieldPct = this.maxBaseShield > 0
                    ? `${Math.min(100, Math.max(0, (this.baseShield / this.maxBaseShield) * 100))}%`
                    : '0%';
                if (this._cacheBaseShieldPct !== bShieldPct) {
                    this._cacheBaseShieldPct = bShieldPct;
                    const el = document.getElementById('hud-base-shield-bar');
                    if (el) el.style.width = bShieldPct;
                }

                // 3. Render Player Lives
                const lives = this.playerLives !== undefined ? this.playerLives : 3;
                if (this._cachePlayerLives !== lives) {
                    this._cachePlayerLives = lives;
                    const heartsContainer = document.getElementById('hud-player-lives-hearts');
                    if (heartsContainer) {
                        heartsContainer.innerHTML = `
                            <div class="relative w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center text-red-500 flex-shrink-0">
                                <i class="fa-solid fa-heart text-[13px] sm:text-[15px]"></i>
                                <span class="absolute inset-0 flex items-center justify-center text-[7.5px] sm:text-[9px] font-mono font-black text-white drop-shadow-sm -translate-y-[0.75px] leading-none">${lives}</span>
                            </div>`;
                    }
                }

                // 4. Render Base Lives
                const bLives = this.baseLives !== undefined ? this.baseLives : 3;
                if (this._cacheBaseLives !== bLives) {
                    this._cacheBaseLives = bLives;
                    const baseHeartsContainer = document.getElementById('hud-base-lives-hearts');
                    if (baseHeartsContainer) {
                        baseHeartsContainer.innerHTML = `
                            <div class="relative w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center text-sky-400 flex-shrink-0">
                                <i class="fa-solid fa-heart text-[13px] sm:text-[15px]"></i>
                                <span class="absolute inset-0 flex items-center justify-center text-[7.5px] sm:text-[9px] font-mono font-black text-white drop-shadow-sm -translate-y-[0.75px] leading-none">${bLives}</span>
                            </div>`;
                    }
                }

                // 5. Money
                if (this._cacheMoney !== this.money) {
                    this._cacheMoney = this.money;
                    const formatted = formatMoney(this.money);
                    const el1 = document.getElementById('hud-money');
                    if (el1) el1.innerText = formatted;
                    const el2 = document.getElementById('shop-money-display');
                    if (el2) el2.innerText = formatted;
                }

                // 6. Wave Title & Zombies Left
                if (!this.isWaveTransitioning && this._cacheWave !== this.currentWave) {
                    this._cacheWave = this.currentWave;
                    const el = document.getElementById('hud-wave-title');
                    if (el) el.innerHTML = `<i class="fa-solid fa-skull mr-1"></i> WELLE ${this.currentWave}`;
                    const elMob = document.getElementById('hud-wave-title-mob');
                    if (elMob) elMob.innerText = `WELLE ${this.currentWave}`;
                }
                const zLeft = this.zombies.length + this.zombiesLeftToSpawn;
                if (this._cacheZombiesLeft !== zLeft) {
                    this._cacheZombiesLeft = zLeft;
                    const el = document.getElementById('hud-zombies-left');
                    if (el) el.innerText = `${zLeft} UNTOTE`;
                    const elMob = document.getElementById('hud-zombies-left-mob');
                    if (elMob) elMob.innerText = `${zLeft} UNTOTE`;
                }

                // 7. Timer
                const m = Math.floor(this.gameSeconds / 60).toString().padStart(2, '0');
                const s = (this.gameSeconds % 60).toString().padStart(2, '0');
                const timeStr = `${m}:${s}`;
                if (this._cacheTimer !== timeStr) {
                    this._cacheTimer = timeStr;
                    const el = document.getElementById('hud-timer');
                    if (el) el.innerText = timeStr;
                }

                // 8. Early Wave Badge
                const earlyWaveBadge = document.getElementById('early-wave-badge');
                const earlyWaveBtn = document.getElementById('early-wave-btn');
                if (earlyWaveBadge && earlyWaveBtn) {
                    const activeCount = this.activeSimultaneousWaves || 1;
                    if (activeCount >= 5) {
                        earlyWaveBadge.innerText = '5/5 MAX';
                        earlyWaveBadge.className = 'font-mono text-[8.5px] sm:text-[10.5px] md:text-xs font-bold text-red-400 leading-none';
                        earlyWaveBtn.classList.add('opacity-60', 'cursor-not-allowed');
                    } else {
                        earlyWaveBadge.innerText = `${activeCount}/5`;
                        earlyWaveBadge.className = 'font-mono text-[8.5px] sm:text-[10.5px] md:text-xs font-bold text-amber-300 leading-none';
                        earlyWaveBtn.classList.remove('opacity-60', 'cursor-not-allowed');
                    }
                }

                // 9. Game Speed Badge & Button
                const speedBadge = document.getElementById('game-speed-badge');
                const speedBtn = document.getElementById('game-speed-btn');
                if (speedBadge) {
                    const spd = this.gameSpeed || 1;
                    speedBadge.innerText = `${spd}x`;
                    if (speedBtn) {
                        if (spd === 2) {
                            speedBtn.className = "bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-300 rounded-md sm:rounded-lg border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] backdrop-blur-sm transition active:scale-95 flex items-center justify-center space-x-1 h-6 sm:h-7 md:h-8 px-1.5 sm:px-2 cursor-pointer flex-shrink-0";
                        } else {
                            speedBtn.className = "bg-slate-900/90 hover:bg-slate-800 active:bg-slate-950 text-amber-400 rounded-md sm:rounded-lg border border-amber-500/60 shadow backdrop-blur-sm transition active:scale-95 flex items-center justify-center space-x-1 h-6 sm:h-7 md:h-8 px-1.5 sm:px-2 cursor-pointer flex-shrink-0";
                        }
                    }
                }
            }

            saveGameSession() {
                if (!this.isRunning || this.isGameOver) return;
                try {
                    const sessionData = {
                        money: this.money,
                        playerHp: this.playerHp,
                        maxPlayerHp: this.maxPlayerHp,
                        playerShield: this.playerShield,
                        maxPlayerShield: this.maxPlayerShield,
                        playerLives: this.playerLives,
                        baseLives: this.baseLives !== undefined ? this.baseLives : 3,
                        ac130Cooldown: this.ac130Cooldown || 0,
                        baseHp: this.baseHp,
                        maxBaseHp: this.maxBaseHp,
                        baseShield: this.baseShield,
                        maxBaseShield: this.maxBaseShield,
                        currentWave: this.currentWave,
                        zombiesLeftToSpawn: this.zombiesLeftToSpawn,
                        gameSeconds: this.gameSeconds,
                        totalKills: this.totalKills,
                        unlockedWeapons: this.unlockedWeapons,
                        weaponLevels: this.weaponLevels,
                        currentWeapon: this.currentWeapon ? this.currentWeapon.id : 'pistol',
                        upgrades: this.upgrades,
                        intelShown: this.intelShown,
                        stockPrices: this.stockPrices || {},
                        prevStockPrices: this.prevStockPrices || {},
                        stockPriceHistory: this.stockPriceHistory || {},
                        stockPortfolio: this.stockPortfolio || {},
                        totalDividendsEarned: this.totalDividendsEarned || 0,
                        latestStockNews: this.latestStockNews || null,
                        playerPosition: { x: this.playerGroup.position.x, z: this.playerGroup.position.z },
                        dayNightTime: this.dayNightTime || 0,
                        turrets: this.turrets.map(t => ({
                            typeId: t.userData.typeId,
                            level: t.userData.level || 1,
                            totalInvested: t.userData.totalInvested || 0,
                            hp: t.userData.hp,
                            maxHp: t.userData.maxHp,
                            x: t.position.x,
                            z: t.position.z,
                            rot: t.rotation.y
                        })),
                        walls: this.walls.map(w => ({
                            typeId: w.userData.typeId,
                            level: w.userData.level || 1,
                            totalInvested: w.userData.totalInvested || 0,
                            hp: w.userData.hp,
                            maxHp: w.userData.maxHp,
                            x: w.position.x,
                            z: w.position.z,
                            rotY: w.rotation.y
                        })),
                        savedAtFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        savedAtTime: Date.now()
                    };
                    Storage.saveSession(sessionData);
                    if (typeof updateMainMenuResumeButton === 'function') updateMainMenuResumeButton();
                } catch(e) { console.warn("Failed to save session", e); }
            }

            restoreGameSession(data) {
                if (!data) return;
                try {
                    this.money = data.money !== undefined ? data.money : 450;
                    this.playerHp = data.playerHp !== undefined ? data.playerHp : 200;
                    this.maxPlayerHp = data.maxPlayerHp || 200;
                    this.playerShield = data.playerShield || 0;
                    this.maxPlayerShield = data.maxPlayerShield || 0;
                    this.playerLives = data.playerLives !== undefined ? data.playerLives : 3;
                    this.baseLives = data.baseLives !== undefined ? data.baseLives : 3;
                    this.ac130Cooldown = data.ac130Cooldown || 0;
                    this.baseHp = data.baseHp !== undefined ? data.baseHp : 2500;
                    this.maxBaseHp = data.maxBaseHp || 2500;
                    this.baseShield = data.baseShield || 0;
                    this.maxBaseShield = data.maxBaseShield || 0;
                    this.currentWave = data.currentWave || 1;
                    this.zombiesLeftToSpawn = data.zombiesLeftToSpawn !== undefined ? data.zombiesLeftToSpawn : 12;
                    this.gameSeconds = data.gameSeconds || 0;
                    this.totalKills = data.totalKills || 0;
                    this.unlockedWeapons = data.unlockedWeapons || ['pistol'];
                    this.weaponLevels = data.weaponLevels || { pistol: 1 };
                    if (data.currentWeapon && WEAPONS[data.currentWeapon]) {
                        this.currentWeapon = WEAPONS[data.currentWeapon];
                    }
                    if (data.upgrades) this.upgrades = { ...this.upgrades, ...data.upgrades };
                    if (data.intelShown) this.intelShown = { ...this.intelShown, ...data.intelShown };
                    if (data.stockPrices) this.stockPrices = data.stockPrices;
                    if (data.prevStockPrices) this.prevStockPrices = data.prevStockPrices;
                    if (data.stockPriceHistory) this.stockPriceHistory = data.stockPriceHistory;
                    if (data.stockPortfolio) this.stockPortfolio = data.stockPortfolio;
                    if (data.totalDividendsEarned !== undefined) this.totalDividendsEarned = data.totalDividendsEarned;
                    if (data.latestStockNews) this.latestStockNews = data.latestStockNews;
                    this.dayNightTime = data.dayNightTime !== undefined ? data.dayNightTime : 22;

                    if (data.playerPosition && this.playerGroup) {
                        this.playerGroup.position.set(data.playerPosition.x, 0, data.playerPosition.z);
                    }

                    // Restore Turrets
                    if (data.turrets && Array.isArray(data.turrets)) {
                        data.turrets.forEach(tData => {
                            const spec = TURRET_TYPES[tData.typeId];
                            if (spec) {
                                const turret = this.buildTurretAt(tData.typeId, tData.x, tData.z, tData.rot || 0);
                                if (turret) {
                                    turret.userData.totalInvested = tData.totalInvested || spec.cost;
                                    turret.userData.hp = tData.hp !== undefined ? tData.hp : spec.hp;
                                    turret.userData.maxHp = tData.maxHp || spec.maxHp;
                                    if (tData.level && tData.level > 1 && !turret.userData.isHangar) {
                                        applyTurretLevelUpgrades(turret, tData.level);
                                    }
                                }
                            }
                        });
                    }

                    // Restore Walls
                    if (data.walls && Array.isArray(data.walls)) {
                        data.walls.forEach(wData => {
                            const spec = WALL_TYPES[wData.typeId];
                            if (spec) {
                                const wall = this.buildWallAt(wData.typeId, wData.x, wData.z, wData.rotY || 0);
                                if (wall) {
                                    wall.userData.level = wData.level || 1;
                                    wall.userData.totalInvested = wData.totalInvested || spec.cost;
                                    wall.userData.hp = wData.hp !== undefined ? wData.hp : spec.hp;
                                    wall.userData.maxHp = wData.maxHp || spec.maxHp;
                                }
                            }
                        });
                    }

                    // Restore Drone mesh if combat_drone > 0
                    if (this.upgrades.combat_drone > 0 && !this.droneGroup) {
                        this.createDroneMesh();
                    }

                    // Restore Dog mesh
                    if (!this.dogGroup) {
                        this.createDogMesh();
                    }

                    this.syncHUD();
                } catch(e) {
                    console.error("Failed to restore game session", e);
                }
            }

            nextWave() {
                if (this.isWaveTransitioning) return;
                this.isWaveTransitioning = true;
                this.activeSimultaneousWaves = 1;

                const waveTitle = document.getElementById('hud-wave-title');
                if (waveTitle) {
                    waveTitle.innerHTML = `<i class="fa-solid fa-check text-emerald-400 mr-1"></i> <span class="text-emerald-400 font-bold">WELLE ${this.currentWave} ✓</span>`;
                }

                setTimeout(() => {
                    if (this.isGameOver) return;
                    this.currentWave++;
                    this.zombiesLeftToSpawn = Math.round(12 + (this.currentWave - 1) * 3.5);
                    this.money += 180 + (this.currentWave * 40);

                    // Automatic Survivor Max-HP Progression (+15 Max-HP per wave)
                    this.maxPlayerHp += 15;
                    this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + 30);
                    if (typeof showWarningToast === 'function') {
                        showWarningToast(`💚 ÜBERLEBENDEN-LEVEL: +15 MAX-HP! (${this.maxPlayerHp} HP)`);
                    }

                    // Dynamic Stock Market Fluctuation on Wave Completion
                    this.updateStockPrices(true);

                    this.isWaveTransitioning = false;
                    this.updateSpawnInterval();
                    this.syncHUD();
                    this.saveGameSession();
                }, 2200);
            }

            triggerEarlyWave() {
                if (!this.isRunning || this.isPaused || this.isGameOver) return;
                const activeCount = this.activeSimultaneousWaves || 1;
                if (activeCount >= 5) {
                    if (typeof showWarningToast === 'function') {
                        showWarningToast('❌ Max. 5 Wellen gleichzeitig!');
                    }
                    return;
                }

                this.activeSimultaneousWaves = activeCount + 1;
                this.currentWave++;

                // Automatic Survivor Max-HP Progression
                this.maxPlayerHp += 15;
                this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + 30);
                this.updateStockPrices(true);

                const newZombiesCount = Math.round(12 + (this.currentWave - 1) * 3.5);
                this.zombiesLeftToSpawn += newZombiesCount;

                const bonusMoney = 180 + (this.currentWave * 40);
                this.money += bonusMoney;

                audio.playCoin();
                if (typeof showWarningToast === 'function') {
                    showWarningToast(`⚠️ WELLE ${this.currentWave} GESTARTET! (+$${bonusMoney} • +15 Max-HP)`);
                }

                this.updateSpawnInterval();
                this.syncHUD();
            }

            toggleGameSpeed() {
                if (!this.isRunning || this.isGameOver) return;
                this.gameSpeed = (this.gameSpeed === 2) ? 1 : 2;
                this.updateGameSpeedTimer();
                this.syncHUD();
                audio.playPistol();
                if (typeof showWarningToast === 'function') {
                    showWarningToast(this.gameSpeed === 2 ? '⚡ TEMPO 2X AKTIVIERT' : '⏱️ NORMALES TEMPO (1X)');
                }
            }

            updateGameSpeedTimer() {
                if (this.secondTimer) clearInterval(this.secondTimer);
                if (this.turretTimer) clearInterval(this.turretTimer);
                const speedMult = Math.max(1, this.gameSpeed || 1);
                this.secondTimer = setInterval(() => this.onSecondTick(), Math.round(1000 / speedMult));
                this.turretTimer = setInterval(() => this.updateTurrets(), Math.round(400 / speedMult));
                this.updateSpawnInterval();
            }

            destroy() {
                this.isRunning = false;
                this.isGameOver = true;
                if (this.isAc130Active) this.exitAc130();
                if (this.secondTimer) clearInterval(this.secondTimer);
                if (this.spawnTimer) clearInterval(this.spawnTimer);
                if (this.turretTimer) clearInterval(this.turretTimer);
                if (this.dogGroup) {
                    try { this.scene.remove(this.dogGroup); } catch(e) {}
                    this.dogGroup = null;
                }
                if (this.renderer) {
                    try { this.renderer.dispose(); } catch(e) {}
                    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                    }
                }
            }

            triggerGameOver(reason = 'base') {
                this.isGameOver = true;
                this.isRunning = false;
                this.isPaused = true;
                if (this.isAc130Active) this.exitAc130();
                clearInterval(this.secondTimer);
                clearInterval(this.spawnTimer);
                clearInterval(this.turretTimer);

                Storage.clearSession();
                if (typeof updateMainMenuResumeButton === 'function') updateMainMenuResumeButton();

                audio.stopMusic();
                audio.stopJetFlyover();
                audio.playExplosion();

                if (this.activeAirstrikes) {
                    this.activeAirstrikes.forEach(strike => {
                        if (strike.jetMesh) this.scene.remove(strike.jetMesh);
                    });
                    this.activeAirstrikes = [];
                }
                if (this.targetMarkerGroup) {
                    this.scene.remove(this.targetMarkerGroup);
                    this.targetMarkerGroup = null;
                }

                const titleEl = document.getElementById('go-title');
                const descEl = document.getElementById('go-desc');

                if (reason === 'player') {
                    if (titleEl) titleEl.innerText = "SPIELER ELIMINIERT";
                    if (descEl) descEl.innerText = "Du wurdest von den Untoten überwältigt.";
                } else if (reason === 'surrender') {
                    if (titleEl) titleEl.innerText = "TAKTISCHE EVAKUIERUNG";
                    if (descEl) descEl.innerText = "Du hast die Operation beendet und deine Truppen erfolgreich evakuiert.";
                } else {
                    if (titleEl) titleEl.innerText = "BASIS ZERSTÖRT";
                    if (descEl) descEl.innerText = "Die Untoten haben die 3D-Verteidigung überrannt.";
                }

                const m = Math.floor(this.gameSeconds / 60).toString().padStart(2, '0');
                const s = (this.gameSeconds % 60).toString().padStart(2, '0');

                document.getElementById('go-time').innerText = `${m}:${s}`;
                document.getElementById('go-wave').innerText = `Welle ${this.currentWave}`;
                document.getElementById('go-kills').innerText = `${this.totalKills}`;

                window.lastRunStats = {
                    time: this.gameSeconds,
                    wave: this.currentWave,
                    kills: this.totalKills,
                    difficulty: Storage.data.difficulty
                };

                const currentPlayer = Storage.data.customPlayerName || Storage.data.lastPlayerName || '';
                const qualifies = checkHighscoreQualification(this.currentWave, this.totalKills, this.gameSeconds);
                const hsEntryEl = document.getElementById('highscore-entry');
                if (qualifies) {
                    if (typeof submitHighscore === 'function') {
                        submitHighscore(currentPlayer, false);
                    }
                    if (hsEntryEl) {
                        hsEntryEl.classList.remove('hidden');
                        const nameInput = document.getElementById('hs-player-name');
                        if (nameInput) {
                            nameInput.value = Storage.data.customPlayerName || '';
                        }
                    }
                } else if (hsEntryEl) {
                    hsEntryEl.classList.add('hidden');
                }

                document.getElementById('game-over-modal').classList.remove('hidden');
            }

            initScene() {
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x020617);
                this.scene.fog = new THREE.Fog(0x020617, 75, 185);

                const isMobile = this.isMobile;
                // Maximum energy saving: 0.85 DPR on mobile, 1.0 on desktop (drastically reduces pixel shader calculations)
                const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 0.85 : 1.0);

                this.renderer = new THREE.WebGLRenderer({ 
                    antialias: false,
                    precision: 'mediump',
                    powerPreference: 'low-power'
                });
                this.renderer.setPixelRatio(dpr);
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.15;
                this.renderer.shadowMap.enabled = false;

                this.container.appendChild(this.renderer.domElement);

                this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    console.warn('WebGL Context Lost. Preventing default crash.');
                }, false);
                this.renderer.domElement.addEventListener('webglcontextrestored', () => {
                    console.log('WebGL Context Restored.');
                    if (this.renderer && this.scene && this.camera) {
                        this.renderer.render(this.scene, this.camera);
                    }
                }, false);

                const aspect = window.innerWidth / window.innerHeight;
                this.camera = new THREE.PerspectiveCamera(isMobile ? 48 : 52, aspect, 0.5, 350);
                
                this.ambientLight = new THREE.AmbientLight(0x64748b, isMobile ? 1.9 : 1.6);
                this.scene.add(this.ambientLight);

                this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.7);
                this.dirLight.position.set(30, 50, 20);
                this.dirLight.castShadow = false;
                this.scene.add(this.dirLight);

                this.raycaster = new THREE.Raycaster();
                this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

                // Multi-Selection Visual Layers
                this.selectionRingsGroup = new THREE.Group();
                this.scene.add(this.selectionRingsGroup);

                this.multiSelectHoloGroup = new THREE.Group();
                this.scene.add(this.multiSelectHoloGroup);
            }

            initPools() {
                // Shared Unit Geometries for ultra-low GPU overhead & zero GC allocation
                this._unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
                this._unitSphereGeo = new THREE.SphereGeometry(1, 8, 8);

                // Bullet Pool (100 pre-created meshes)
                const bulletGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8);
                bulletGeo.rotateX(Math.PI / 2);
                const bulletMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                for (let i = 0; i < 100; i++) {
                    const m = new THREE.Mesh(bulletGeo, bulletMat);
                    m.visible = false;
                    m.userData = { dir: new THREE.Vector3() };
                    this.bulletPool.push(m);
                    this.scene.add(m);
                }

                // Particle Pool (120 pre-created box meshes)
                this._partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
                const partMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
                for (let i = 0; i < 120; i++) {
                    const p = new THREE.Mesh(this._partGeo, partMat);
                    p.visible = false;
                    p.userData = { velX: 0, velY: 0, velZ: 0, life: 0 };
                    this.particlePool.push(p);
                    this.scene.add(p);
                }

                // Explosion Mesh Pool (16 pre-created sphere meshes)
                this.activeExplosions = [];
                this.explosionPool = [];
                const expMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
                for (let i = 0; i < 16; i++) {
                    const expMesh = new THREE.Mesh(this._unitSphereGeo, expMat);
                    expMesh.visible = false;
                    expMesh.userData = { baseScale: 1, scaleProgress: 0.2 };
                    this.explosionPool.push(expMesh);
                    this.scene.add(expMesh);
                }
            }

            setEnvironmentTheme(theme) {
                this.environmentTheme = theme;
                this.buildEnvironment();
            }

            buildEnvironment() {
                // Deep clean disposal of previous environment hierarchy to prevent memory/VRAM leaks
                if (this.environmentGroup) {
                    this.scene.remove(this.environmentGroup);
                    this.environmentGroup.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    });
                }

                this.environmentGroup = new THREE.Group();
                this.scene.add(this.environmentGroup);

                this.beaconLights = [];
                this.environmentObstacles = [];

                const theme = this.environmentTheme || (typeof Storage !== 'undefined' && Storage.data && Storage.data.environmentTheme) || 'tactical';
                if (theme === 'classic') {
                    this.buildClassicEnvironment();
                } else {
                    this.buildTacticalEnvironment();
                }
            }

            buildClassicEnvironment() {
                // 1. Expansive Outer Wasteland Bed (eliminates any visible map edges)
                const outerGroundGeo = new THREE.PlaneGeometry(900, 900);
                const outerMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.95, metalness: 0.05 });
                const outerGround = new THREE.Mesh(outerGroundGeo, outerMat);
                outerGround.rotation.x = -Math.PI / 2;
                outerGround.position.y = -0.05;
                outerGround.receiveShadow = true;
                outerGround.matrixAutoUpdate = false;
                outerGround.updateMatrix();
                this.environmentGroup.add(outerGround);

                // 2. Central High-Res Classic Grid Ground
                const groundGeo = new THREE.PlaneGeometry(240, 240);
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                const ctx = canvas.getContext('2d');
                
                // Dark military tactical terrain background
                ctx.fillStyle = '#070b14';
                ctx.fillRect(0, 0, 1024, 1024);

                // Subtle grid tile background
                ctx.fillStyle = '#0d1527';
                for (let gx = 0; gx < 1024; gx += 64) {
                    for (let gy = 0; gy < 1024; gy += 64) {
                        ctx.fillRect(gx + 1, gy + 1, 62, 62);
                    }
                }

                // Primary Grid Lines
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, 1024, 1024);

                for (let x = 64; x < 1024; x += 64) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
                    ctx.stroke();
                }
                for (let y = 64; y < 1024; y += 64) {
                    ctx.beginPath();
                    ctx.moveTo(0, y); ctx.lineTo(1024, y);
                    ctx.stroke();
                }

                // Tech Accent Corner Dots
                ctx.fillStyle = '#38bdf8';
                for (let x = 64; x < 1024; x += 64) {
                    for (let y = 64; y < 1024; y += 64) {
                        ctx.fillRect(x - 2, y - 2, 4, 4);
                    }
                }

                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(24, 24);
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                if (this.renderer && this.renderer.capabilities) {
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                }

                const groundMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.05 });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.rotation.x = -Math.PI / 2;
                ground.position.y = 0;
                ground.receiveShadow = true;
                ground.matrixAutoUpdate = false;
                ground.updateMatrix();
                this.environmentGroup.add(ground);

                this.environmentGroup.traverse(child => {
                    child.matrixAutoUpdate = false;
                    child.updateMatrix();
                });
            }

            buildTacticalEnvironment() {
                // ==========================================
                // 1. EXPANSIVE HORIZON WASTELAND BED (900x900m)
                // Extends far past fog distance to guarantee ZERO hard edge at the horizon
                // ==========================================
                const outerGroundGeo = new THREE.PlaneGeometry(900, 900);
                const outerMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.95, metalness: 0.05 });
                const outerGround = new THREE.Mesh(outerGroundGeo, outerMat);
                outerGround.rotation.x = -Math.PI / 2;
                outerGround.position.y = -0.05;
                outerGround.receiveShadow = true;
                outerGround.matrixAutoUpdate = false;
                outerGround.updateMatrix();
                this.environmentGroup.add(outerGround);

                // ==========================================
                // 2. ULTRA-DETAILED 2K WASTELAND TERRAIN (240x240m)
                // Organic post-apocalyptic dark volcanic soil, fissures, ash patches,
                // and soft realistic charred impact burns (NO airport runways, NO grid lines)
                // ==========================================
                const groundGeo = new THREE.PlaneGeometry(240, 240);
                const canvas = document.createElement('canvas');
                canvas.width = 2048;
                canvas.height = 2048;
                const ctx = canvas.getContext('2d');

                const centerX = 1024;
                const centerY = 1024;

                // --- A. Deep Volcanic & Ash Wasteland Soil ---
                ctx.fillStyle = '#050811';
                ctx.fillRect(0, 0, 2048, 2048);

                // Multi-layered organic stone gravel & fine soil noise
                for (let i = 0; i < 7000; i++) {
                    const rx = (Math.random() * 2048) | 0;
                    const ry = (Math.random() * 2048) | 0;
                    const rw = Math.random() * 3.5 + 0.8;
                    const shade = Math.random();
                    ctx.fillStyle = shade > 0.65 ? '#111928' : (shade > 0.35 ? '#0c1320' : '#020409');
                    ctx.beginPath();
                    ctx.arc(rx, ry, rw, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Natural organic dark dirt, ash, and soil variation patches
                for (let i = 0; i < 55; i++) {
                    const px = Math.random() * 2048;
                    const py = Math.random() * 2048;
                    const pr = 45 + Math.random() * 140;
                    const pGrad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
                    pGrad.addColorStop(0, 'rgba(16, 24, 38, 0.50)');
                    pGrad.addColorStop(0.55, 'rgba(10, 15, 26, 0.28)');
                    pGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');
                    ctx.fillStyle = pGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- B. Natural Jagged Earth Fissures & Ground Cracks ---
                ctx.strokeStyle = '#020408';
                for (let i = 0; i < 50; i++) {
                    let fx = Math.random() * 2048;
                    let fy = Math.random() * 2048;
                    const distFromC = Math.hypot(fx - centerX, fy - centerY);
                    if (distFromC < 140) continue; // Keep base footprint clear
                    
                    ctx.lineWidth = Math.random() * 2.2 + 1.0;
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    const steps = Math.floor(Math.random() * 6 + 4);
                    for (let s = 0; s < steps; s++) {
                        fx += (Math.random() - 0.5) * 55;
                        fy += (Math.random() - 0.5) * 55;
                        ctx.lineTo(fx, fy);
                    }
                    ctx.stroke();
                }

                // --- C. Soft Organic Scorched Impact Craters (Charred Ground) ---
                const blastPositions = [
                    [620, 700, 110], [1440, 660, 125], [760, 1400, 130], [1360, 1420, 100],
                    [380, 1020, 150], [1700, 960, 140], [1020, 440, 130], [960, 1640, 120],
                    [480, 420, 95], [1600, 1580, 115], [320, 1580, 105], [1680, 390, 100],
                    [840, 880, 80], [1220, 1160, 85]
                ];
                for (let b of blastPositions) {
                    const [bx, by, br] = b;
                    const bGrad = ctx.createRadialGradient(bx, by, br * 0.08, bx, by, br);
                    bGrad.addColorStop(0, 'rgba(1, 2, 5, 0.95)');
                    bGrad.addColorStop(0.35, 'rgba(7, 11, 20, 0.72)');
                    bGrad.addColorStop(0.70, 'rgba(11, 17, 28, 0.32)');
                    bGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');
                    ctx.fillStyle = bGrad;
                    ctx.beginPath();
                    ctx.arc(bx, by, br, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- D. Natural Fluid & Mud Stains ---
                for (let i = 0; i < 20; i++) {
                    const ox = Math.random() * 2048;
                    const oy = Math.random() * 2048;
                    const distFromC = Math.hypot(ox - centerX, oy - centerY);
                    if (distFromC < 130) continue;

                    const or = 20 + Math.random() * 45;
                    const oGrad = ctx.createRadialGradient(ox, oy, 2, ox, oy, or);
                    oGrad.addColorStop(0, 'rgba(2, 4, 8, 0.88)');
                    oGrad.addColorStop(0.60, 'rgba(7, 12, 22, 0.40)');
                    oGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');
                    ctx.fillStyle = oGrad;
                    ctx.beginPath();
                    ctx.arc(ox, oy, or, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- E. Central Outpost Foundation Pad (Embedded into Wasteland) ---
                // Dark weathered outpost foundation plate
                const padGrad = ctx.createRadialGradient(centerX, centerY, 35, centerX, centerY, 132);
                padGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
                padGrad.addColorStop(0.65, 'rgba(11, 17, 30, 0.85)');
                padGrad.addColorStop(0.88, 'rgba(8, 12, 22, 0.40)');
                padGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');
                ctx.fillStyle = padGrad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 132, 0, Math.PI * 2);
                ctx.fill();

                // Subtle circular warning rim tightly around 8.5m base foundation
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, 110, 0, Math.PI * 2);
                ctx.arc(centerX, centerY, 84, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();

                ctx.fillStyle = '#080c14';
                ctx.fillRect(centerX - 120, centerY - 120, 240, 240);
                ctx.fillStyle = '#d97706';
                for (let s = -240; s < 240; s += 22) {
                    ctx.beginPath();
                    ctx.moveTo(centerX + s, centerY - 130);
                    ctx.lineTo(centerX + s + 10, centerY - 130);
                    ctx.lineTo(centerX + s - 120, centerY + 130);
                    ctx.lineTo(centerX + s - 130, centerY + 130);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // Weathered glowing border ring
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 82, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(2, 132, 199, 0.35)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 112, 0, Math.PI * 2);
                ctx.stroke();

                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                if (this.renderer && this.renderer.capabilities) {
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                }

                const groundMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.05 });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.rotation.x = -Math.PI / 2;
                ground.position.y = 0;
                ground.receiveShadow = true;
                ground.matrixAutoUpdate = false;
                ground.updateMatrix();
                this.environmentGroup.add(ground);

                // Build Optimized Props
                this.buildBattlefieldProps();
            }

            buildBattlefieldProps() {
                // High-Performance Materials (MeshLambertMaterial: zero PBR BRDF overhead)
                const rustMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
                const darkArmorMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
                const treadMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
                const concreteMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
                const barrelRedMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
                const barrelDarkMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
                const barrelYellowMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
                const containerOlive = new THREE.MeshLambertMaterial({ color: 0x3f4f24 });
                const containerRust = new THREE.MeshLambertMaterial({ color: 0x7c2d12 });
                const containerNavy = new THREE.MeshLambertMaterial({ color: 0x1e293b });
                const sandbagMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
                const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
                const siloMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

                // Shared Low-Poly Geometries
                const beamGeo = new THREE.BoxGeometry(0.2, 0.2, 2.2);
                const barrelGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.1, 8);
                const sandbagGeo = new THREE.BoxGeometry(0.75, 0.3, 0.45);

                // Helper: Low-poly Corrugated Cargo Container (3 meshes total)
                const createContainer = (mat) => {
                    const cGroup = new THREE.Group();
                    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 6.0), mat);
                    mainBody.position.y = 1.25;
                    cGroup.add(mainBody);

                    const postGeo = new THREE.BoxGeometry(0.16, 2.55, 0.16);
                    const p1 = new THREE.Mesh(postGeo, darkArmorMat); p1.position.set(-1.18, 1.25, 2.95); cGroup.add(p1);
                    const p2 = new THREE.Mesh(postGeo, darkArmorMat); p2.position.set(1.18, 1.25, 2.95); cGroup.add(p2);
                    return cGroup;
                };

                // Helper: Low-poly Wrecked Combat Tank (4 meshes total)
                const createTank = (isTank) => {
                    const tGroup = new THREE.Group();

                    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 5.6), darkArmorMat);
                    hull.position.y = 0.7;
                    tGroup.add(hull);

                    const tracks = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 5.8), treadMat);
                    tracks.position.y = 0.45;
                    tGroup.add(tracks);

                    if (isTank) {
                        const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.8, 8), darkArmorMat);
                        turret.position.set(0, 1.6, -0.2);
                        turret.rotation.y = 0.35;
                        tGroup.add(turret);

                        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 6), rustMat);
                        gun.rotation.x = Math.PI / 2;
                        gun.rotation.y = 0.35;
                        gun.position.set(0.6, 1.55, 1.5);
                        tGroup.add(gun);
                    } else {
                        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 3.4), darkArmorMat);
                        cabin.position.set(0, 1.5, -0.4);
                        tGroup.add(cabin);
                    }

                    return tGroup;
                };

                // --- 1. Czech Hedgehogs (6 clusters) ---
                const hedgehogClusters = [
                    [-38, 42], [42, 38], [-48, -32], [38, -46], [-40, 46], [40, -44]
                ];
                for (let pos of hedgehogClusters) {
                    const hGroup = new THREE.Group();
                    hGroup.position.set(pos[0], 0.7, pos[1]);

                    const b1 = new THREE.Mesh(beamGeo, rustMat); b1.rotation.set(0.65, 0.65, 0); hGroup.add(b1);
                    const b2 = new THREE.Mesh(beamGeo, rustMat); b2.rotation.set(-0.65, 0.65, 0); hGroup.add(b2);
                    const b3 = new THREE.Mesh(beamGeo, rustMat); b3.rotation.set(0, 0, 1.15); hGroup.add(b3);

                    hGroup.rotation.y = Math.random() * Math.PI;
                    hGroup.matrixAutoUpdate = false;
                    hGroup.updateMatrix();
                    this.environmentGroup.add(hGroup);
                    this.environmentObstacles.push({ x: pos[0], z: pos[1], radius: 1.4 });
                }

                // --- 2. Destroyed Tank Wrecks (4 tanks) ---
                const wreckConfigs = [
                    { x: -56, z: 36, rot: 0.45, isTank: true },
                    { x: 60, z: -34, rot: 2.1, isTank: true },
                    { x: -44, z: -56, rot: -1.2, isTank: false },
                    { x: 52, z: 50, rot: 3.6, isTank: false }
                ];
                for (let cfg of wreckConfigs) {
                    const wreck = createTank(cfg.isTank);
                    wreck.position.set(cfg.x, 0, cfg.z);
                    wreck.rotation.y = cfg.rot;
                    wreck.matrixAutoUpdate = false;
                    wreck.updateMatrix();
                    this.environmentGroup.add(wreck);
                    this.environmentObstacles.push({ x: cfg.x, z: cfg.z, radius: 3.6 });
                }

                // --- 3. Stacked Military Cargo Containers (4 clusters) ---
                const containerClusters = [
                    { x: -62, z: 12, rot: 0.2, mat: containerOlive },
                    { x: 60, z: 18, rot: -0.4, mat: containerNavy },
                    { x: -28, z: 64, rot: 1.4, mat: containerRust },
                    { x: 30, z: -62, rot: 2.8, mat: containerOlive }
                ];
                for (let cc of containerClusters) {
                    const hubGroup = new THREE.Group();
                    hubGroup.position.set(cc.x, 0, cc.z);
                    hubGroup.rotation.y = cc.rot;

                    const c1 = createContainer(cc.mat); c1.position.set(0, 0, 0); hubGroup.add(c1);
                    const c2 = createContainer(containerRust); c2.position.set(2.6, 0, 0.4); hubGroup.add(c2);

                    hubGroup.matrixAutoUpdate = false;
                    hubGroup.updateMatrix();
                    this.environmentGroup.add(hubGroup);
                    this.environmentObstacles.push({ x: cc.x, z: cc.z, radius: 4.0 });
                }

                // --- 4. Concrete Roadblock Jersey Barriers (4 clusters) ---
                const barrierPositions = [
                    { x: -52, z: 20, rot: 0.15 },
                    { x: 52, z: 23, rot: -0.25 },
                    { x: -20, z: 58, rot: 1.55 },
                    { x: 22, z: -56, rot: 1.35 }
                ];
                for (let bp of barrierPositions) {
                    const bGroup = new THREE.Group();
                    bGroup.position.set(bp.x, 0, bp.z);
                    bGroup.rotation.y = bp.rot;

                    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.8), concreteMat);
                    bar1.position.y = 0.45;
                    bGroup.add(bar1);

                    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.8), concreteMat);
                    bar2.position.set(0, 0.45, 2.5);
                    bGroup.add(bar2);

                    bGroup.matrixAutoUpdate = false;
                    bGroup.updateMatrix();
                    this.environmentGroup.add(bGroup);
                    this.environmentObstacles.push({ x: bp.x, z: bp.z, radius: 2.0 });
                }

                // --- 5. Industrial Oil & Fuel Drums (4 clusters) ---
                const drumClusters = [
                    [-58, 22], [56, 26], [-22, 60], [24, -58]
                ];
                for (let dc of drumClusters) {
                    const dGroup = new THREE.Group();
                    dGroup.position.set(dc[0], 0, dc[1]);

                    const d1 = new THREE.Mesh(barrelGeo, barrelRedMat); d1.position.set(0, 0.55, 0); dGroup.add(d1);
                    const d2 = new THREE.Mesh(barrelGeo, barrelDarkMat); d2.position.set(0.65, 0.55, 0.2); dGroup.add(d2);
                    const d3 = new THREE.Mesh(barrelGeo, barrelYellowMat); d3.position.set(-0.55, 0.55, 0.35); dGroup.add(d3);

                    dGroup.matrixAutoUpdate = false;
                    dGroup.updateMatrix();
                    this.environmentGroup.add(dGroup);
                    this.environmentObstacles.push({ x: dc[0], z: dc[1], radius: 1.5 });
                }

                // --- 6. Sandbag Fortification Bunkers (2 positions) ---
                const sandbagPositions = [
                    { x: -30, z: 28, rot: 0.6 },
                    { x: 32, z: -25, rot: 2.2 }
                ];
                for (let sp of sandbagPositions) {
                    const sbGroup = new THREE.Group();
                    sbGroup.position.set(sp.x, 0, sp.z);
                    sbGroup.rotation.y = sp.rot;

                    for (let a = -0.8; a <= 0.8; a += 0.4) {
                        const sb = new THREE.Mesh(sandbagGeo, sandbagMat);
                        sb.position.set(Math.sin(a) * 2.2, 0.22, Math.cos(a) * 1.5);
                        sb.rotation.y = a;
                        sbGroup.add(sb);

                        const sbTop = new THREE.Mesh(sandbagGeo, sandbagMat);
                        sbTop.position.set(Math.sin(a) * 2.2, 0.52, Math.cos(a) * 1.5);
                        sbTop.rotation.y = a + 0.08;
                        sbGroup.add(sbTop);
                    }

                    sbGroup.matrixAutoUpdate = false;
                    sbGroup.updateMatrix();
                    this.environmentGroup.add(sbGroup);
                    this.environmentObstacles.push({ x: sp.x, z: sp.z, radius: 2.2 });
                }

                // --- 7. Radio Towers with Red Flashing Beacons (4 towers) ---
                const towerPositions = [
                    [-95, -85], [95, -90], [-90, 95], [100, 90]
                ];
                for (let tp of towerPositions) {
                    const tGroup = new THREE.Group();
                    tGroup.position.set(tp[0], 0, tp[1]);

                    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.8, 30, 4), rustMat);
                    mast.position.y = 15;
                    tGroup.add(mast);

                    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), beaconMat);
                    beacon.position.set(0, 30.2, 0);
                    tGroup.add(beacon);
                    this.beaconLights.push(beacon);

                    tGroup.matrixAutoUpdate = false;
                    tGroup.updateMatrix();
                    this.environmentGroup.add(tGroup);
                    this.environmentObstacles.push({ x: tp[0], z: tp[1], radius: 2.2 });
                }

                // --- 8. Distant Industrial Silos (Far Horizon) ---
                const siloClusters = [
                    [-180, -160], [190, -170], [-175, 185], [185, 175]
                ];
                for (let sc of siloClusters) {
                    const sGroup = new THREE.Group();
                    sGroup.position.set(sc[0], 0, sc[1]);

                    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 24, 8), siloMat);
                    s1.position.set(0, 12, 0);
                    sGroup.add(s1);

                    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 20, 8), siloMat);
                    s2.position.set(12, 10, 4);
                    sGroup.add(s2);

                    sGroup.matrixAutoUpdate = false;
                    sGroup.updateMatrix();
                    this.environmentGroup.add(sGroup);
                }

                // Global Matrix Freeze: Completely prevent per-frame matrix recalculations on static scenery
                this.environmentGroup.traverse(child => {
                    child.matrixAutoUpdate = false;
                    child.updateMatrix();
                });
            }

            createBaseCore() {
                this.baseGroup = new THREE.Group();

                // 1. Octagonal Military Platform Foundation
                const fMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
                const foundation = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.5, 8), fMat);
                foundation.position.y = 0.25;
                foundation.receiveShadow = true;
                foundation.castShadow = true;
                foundation.matrixAutoUpdate = false;
                foundation.updateMatrix();
                this.baseGroup.add(foundation);

                // Cyan Holographic Perimeter Ring
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
                const borderRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.08, 12, 8), ringMat);
                borderRing.rotation.x = Math.PI / 2;
                borderRing.rotation.z = Math.PI / 8;
                borderRing.position.y = 0.52;
                borderRing.matrixAutoUpdate = false;
                borderRing.updateMatrix();
                this.baseGroup.add(borderRing);

                // Outer Armor Blast Ring
                const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.9 });
                const baseWall = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.2, 1.0, 8, 1, true), wallMat);
                baseWall.position.y = 1.0;
                baseWall.matrixAutoUpdate = false;
                baseWall.updateMatrix();
                this.baseGroup.add(baseWall);

                // 2. Main Octagonal Command Citadel (HQ Bunker)
                const hqMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 });
                const hqBuilding = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 2.0, 8), hqMat);
                hqBuilding.position.y = 1.8;
                hqBuilding.castShadow = true;
                hqBuilding.matrixAutoUpdate = false;
                hqBuilding.updateMatrix();
                this.baseGroup.add(hqBuilding);

                // HQ Roof Dome / Command Level
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
                const roofDome = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 0.8, 8), roofMat);
                roofDome.position.y = 3.1;
                roofDome.castShadow = true;
                roofDome.matrixAutoUpdate = false;
                roofDome.updateMatrix();
                this.baseGroup.add(roofDome);

                // 3. Rotating High-Tech Radar Array
                this.baseRadarGroup = new THREE.Group();
                this.baseRadarGroup.position.set(0, 3.5, 0);

                const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
                const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.0), mastMat);
                mast.position.y = 0.5;
                this.baseRadarGroup.add(mast);

                const dishMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
                const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.1, 0.35, 16, 1, true), dishMat);
                dish.rotation.x = Math.PI / 3;
                dish.position.set(0, 1.1, 0);
                this.baseRadarGroup.add(dish);

                this.baseGroup.add(this.baseRadarGroup);

                // 4. Floating Holographic Command Core Crystal
                const crystalMat = new THREE.MeshStandardMaterial({ 
                    color: 0x0284c7, 
                    emissive: 0x38bdf8, 
                    emissiveIntensity: 0.9,
                    roughness: 0.1
                });
                this.baseCoreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), crystalMat);
                this.baseCoreCrystal.position.set(0, 5.4, 0);
                this.baseGroup.add(this.baseCoreCrystal);

                const crystalGlow = new THREE.PointLight(0x38bdf8, 2.2, 16);
                crystalGlow.position.set(0, 5.4, 0);
                this.baseGroup.add(crystalGlow);

                // 5. Perimeter Strobe Beacons
                const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
                const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
                [[-3.2, 3.2], [3.2, 3.2], [-3.2, -3.2], [3.2, -3.2]].forEach(pt => {
                    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                    beacon.position.set(pt[0], 2.8, pt[1]);
                    this.baseGroup.add(beacon);
                });

                // 3D Base Plasma Shield Dome Mesh
                const bShieldMat = new THREE.MeshPhongMaterial({
                    color: 0x06b6d4,
                    emissive: 0x0891b2,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.32,
                    side: THREE.DoubleSide,
                    shininess: 90
                });
                this.baseShieldMesh = new THREE.Mesh(new THREE.SphereGeometry(8.8, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.8), bShieldMat);
                this.baseShieldMesh.position.set(0, 0, 0);
                this.baseShieldMesh.visible = false;
                this.baseGroup.add(this.baseShieldMesh);

                this.scene.add(this.baseGroup);
            }

            initStockMarket() {
                if (!this.stockPrices) this.stockPrices = {};
                if (!this.prevStockPrices) this.prevStockPrices = {};
                if (!this.stockPortfolio) this.stockPortfolio = {};
                if (!this.stockPriceHistory) this.stockPriceHistory = {};

                if (typeof STOCKS_DATA !== 'undefined') {
                    Object.keys(STOCKS_DATA).forEach(id => {
                        const base = STOCKS_DATA[id].basePrice;
                        if (!this.stockPrices[id]) {
                            this.stockPrices[id] = base;
                            this.prevStockPrices[id] = base;
                        }
                        if (!this.stockPriceHistory[id] || !Array.isArray(this.stockPriceHistory[id]) || this.stockPriceHistory[id].length < 3) {
                            this.stockPriceHistory[id] = [
                                Math.round(base * 0.94),
                                Math.round(base * 0.97),
                                Math.round(base * 0.95),
                                Math.round(base * 0.98),
                                Math.round(base * 0.99),
                                this.stockPrices[id]
                            ];
                        }
                    });
                }
            }

            updateStockPrices(isWaveEnd = false) {
                if (typeof STOCKS_DATA === 'undefined') return;
                this.initStockMarket();

                const stockKeys = Object.keys(STOCKS_DATA);
                if (stockKeys.length === 0) return;

                // Copy current prices to previous prices
                stockKeys.forEach(id => {
                    this.prevStockPrices[id] = this.stockPrices[id];
                });

                // Balanced Economic Model: Comparable to Plündererbonus (+10% scaling model)
                stockKeys.forEach(id => {
                    const def = STOCKS_DATA[id];
                    const curPrice = this.stockPrices[id] || def.basePrice;
                    const vol = def.volatility || 0.08;
                    
                    if (isWaveEnd) {
                        // Baseline growth per wave: moderate +2.5% drift with slight stock-specific volatility
                        // Yields ~ +2% to +8% per wave under normal conditions
                        const trendDrift = 0.025;
                        const randomFluctuation = (Math.random() - 0.45) * vol;
                        const factor = 1 + trendDrift + randomFluctuation;
                        let newPrice = Math.max(5, Math.round(curPrice * factor));
                        
                        // Soft damping towards mean to prevent runaway exponential inflation
                        if (newPrice > def.basePrice * 5.0) {
                            newPrice = Math.round(newPrice * 0.96);
                        } else if (newPrice < def.basePrice * 0.35) {
                            newPrice = Math.round(newPrice * 1.05);
                        }

                        this.stockPrices[id] = newPrice;
                    } else {
                        // Subtle 15-second ambient fluctuation (-1.5% to +1.5%)
                        const microFactor = 1 + (Math.random() - 0.50) * vol * 0.25;
                        let newPrice = Math.max(5, Math.round(curPrice * microFactor));
                        this.stockPrices[id] = newPrice;
                    }
                });

                // Balanced Breaking News Trigger (~30% chance on wave end): Noticeable boost but not overpowered
                let activeNewsStock = null;
                let isGoodNews = false;
                if (isWaveEnd && Math.random() < 0.32) {
                    const randomStockKey = stockKeys[Math.floor(Math.random() * stockKeys.length)];
                    const stockDef = STOCKS_DATA[randomStockKey];
                    if (stockDef && stockDef.news && stockDef.news.length > 0) {
                        const randomNews = stockDef.news[Math.floor(Math.random() * stockDef.news.length)];
                        this.latestStockNews = randomNews;
                        activeNewsStock = randomStockKey;

                        // Moderate news impact: +14% to +28% for good news, -8% to -14% for bad news
                        const lowerNews = randomNews.toLowerCase();
                        isGoodNews = !lowerNews.includes('skandal') && !lowerNews.includes('kritik') && !lowerNews.includes('leck') && !lowerNews.includes('crash') && !lowerNews.includes('chaos') && !lowerNews.includes('selbstzündung');
                        
                        const cur = this.stockPrices[randomStockKey];
                        const multiplier = isGoodNews ? (1.14 + Math.random() * 0.14) : (0.90 - Math.random() * 0.06);
                        this.stockPrices[randomStockKey] = Math.max(5, Math.round(cur * multiplier));

                        const newsEl = document.getElementById('stock-news-text');
                        if (newsEl) newsEl.innerText = randomNews;
                    }
                }

                // Record price history for charts
                stockKeys.forEach(id => {
                    if (!this.stockPriceHistory[id]) this.stockPriceHistory[id] = [];
                    this.stockPriceHistory[id].push(this.stockPrices[id]);
                    if (this.stockPriceHistory[id].length > 12) {
                        this.stockPriceHistory[id].shift();
                    }
                });

                // ================== WAVE DIVIDEND PAYOUT (~3.5% - 15%) ==================
                if (isWaveEnd && this.stockPortfolio) {
                    let totalDividends = 0;
                    const dividendItems = [];

                    stockKeys.forEach(id => {
                        const holding = this.stockPortfolio[id];
                        if (holding && holding.shares > 0) {
                            const def = STOCKS_DATA[id];
                            const curPrice = this.stockPrices[id] || def.basePrice;
                            const holdingVal = holding.shares * curPrice;

                            // Dividend rate per wave: base yield + small random fluctuation (+/- 0.8%)
                            let rate = (def && def.dividendYield) ? def.dividendYield : 0.075;
                            rate += (Math.random() - 0.48) * 0.016;

                            // If this stock had positive news, boost dividend by +2.5% for this wave
                            if (activeNewsStock === id) {
                                rate += isGoodNews ? 0.025 : -0.015;
                            }

                            // Strict clamp to 2.5% - 18.0% per wave
                            rate = Math.max(0.025, Math.min(0.180, rate));

                            const payout = Math.round(holdingVal * rate);
                            if (payout > 0) {
                                totalDividends += payout;
                                holding.totalDividendsEarned = (holding.totalDividendsEarned || 0) + payout;
                                dividendItems.push({
                                    id,
                                    ticker: def.ticker,
                                    shares: holding.shares,
                                    payout,
                                    ratePct: (rate * 100).toFixed(1)
                                });
                            }
                        }
                    });

                    if (totalDividends > 0) {
                        this.money += totalDividends;
                        this.totalDividendsEarned = (this.totalDividendsEarned || 0) + totalDividends;
                        if (typeof audio !== 'undefined' && typeof audio.playCoin === 'function') {
                            audio.playCoin();
                        }
                        if (typeof showWarningToast === 'function') {
                            const detailStr = dividendItems.length === 1
                                ? `${dividendItems[0].ticker} (${dividendItems[0].ratePct}%)`
                                : `${dividendItems.length} Aktien (~3-15%)`;
                            showWarningToast(`💰 AKTIEN-DIVIDENDE: +$${totalDividends.toLocaleString()} gutgeschrieben! (${detailStr})`);
                        }
                        this.syncHUD();
                    }
                }

                if (typeof isStockMarketOpen !== 'undefined' && isStockMarketOpen && typeof renderStockMarket === 'function') {
                    renderStockMarket();
                }
            }

            createPlayer() {
                this.playerGroup = new THREE.Group();

                const bootsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
                const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
                const vestMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
                const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
                const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });
                const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 });

                this.leftLegWrap = new THREE.Group();
                this.leftLegWrap.position.set(-0.28, 0.4, 0);
                const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.55), bootsMat);
                leftBoot.position.set(0, -0.2, 0.05);
                leftBoot.castShadow = true;
                this.leftLegWrap.add(leftBoot);
                this.playerGroup.add(this.leftLegWrap);

                this.rightLegWrap = new THREE.Group();
                this.rightLegWrap.position.set(0.28, 0.4, 0);
                const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.55), bootsMat);
                rightBoot.position.set(0, -0.2, 0.05);
                rightBoot.castShadow = true;
                this.rightLegWrap.add(rightBoot);
                this.playerGroup.add(this.rightLegWrap);

                const legs = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.45), pantsMat);
                legs.position.y = 0.7;
                legs.castShadow = true;
                this.playerGroup.add(legs);

                const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
                const leftPad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.15), padMat);
                leftPad.position.set(-0.26, 0.65, 0.25);
                const rightPad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.15), padMat);
                rightPad.position.set(0.26, 0.65, 0.25);
                this.playerGroup.add(leftPad);
                this.playerGroup.add(rightPad);

                const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.6), vestMat);
                torso.position.y = 1.55;
                torso.castShadow = true;
                this.playerGroup.add(torso);

                const pouchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
                const pouches = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.2), pouchMat);
                pouches.position.set(0, 1.4, 0.35);
                this.playerGroup.add(pouches);

                const leftPadS = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.45), vestMat);
                leftPadS.position.set(-0.55, 1.85, 0);
                const rightPadS = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.45), vestMat);
                rightPadS.position.set(0.55, 1.85, 0);
                this.playerGroup.add(leftPadS);
                this.playerGroup.add(rightPadS);

                const packMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
                const pack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.4), packMat);
                pack.position.set(0, 1.6, -0.45);
                pack.castShadow = true;
                this.playerGroup.add(pack);

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), skinMat);
                head.position.y = 2.25;
                head.castShadow = true;
                this.playerGroup.add(head);

                const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), helmetMat);
                helmet.position.y = 2.32;
                helmet.castShadow = true;
                this.playerGroup.add(helmet);

                const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.2), visorMat);
                visor.position.set(0, 2.28, 0.3);
                this.playerGroup.add(visor);

                // 3D Personal Energy Shield Mesh around Player Character
                const pShieldMat = new THREE.MeshPhongMaterial({
                    color: 0x38bdf8,
                    emissive: 0x0284c7,
                    emissiveIntensity: 0.6,
                    transparent: true,
                    opacity: 0.42,
                    side: THREE.DoubleSide,
                    shininess: 90
                });
                this.playerShieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 16), pShieldMat);
                this.playerShieldMesh.position.set(0, 1.3, 0);
                this.playerShieldMesh.visible = false;
                this.playerGroup.add(this.playerShieldMesh);

                const gunGroup = new THREE.Group();
                const gunMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

                const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 1.2), gunMetal);
                gunBody.position.set(0, 0, 0);
                gunGroup.add(gunBody);

                const magMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
                const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.25), magMat);
                mag.position.set(0, -0.28, 0.15);
                mag.rotation.x = -0.2;
                gunGroup.add(mag);

                const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), gunMetal);
                scope.rotation.x = Math.PI / 2;
                scope.position.set(0, 0.22, 0.0);
                gunGroup.add(scope);

                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), gunMetal);
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(0, 0.05, 0.85);
                gunGroup.add(barrel);

                const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 });
                const laserSight = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8.0), laserMat);
                laserSight.rotation.x = Math.PI / 2;
                laserSight.position.set(0.1, 0.0, 4.5);
                gunGroup.add(laserSight);

                const flashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 });
                this.muzzleFlashMesh = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), flashMat);
                this.muzzleFlashMesh.rotation.x = -Math.PI / 2;
                this.muzzleFlashMesh.position.set(0, 0.05, 1.45);
                this.muzzleFlashMesh.visible = false;
                gunGroup.add(this.muzzleFlashMesh);

                this.muzzleLight = new THREE.PointLight(0xfacc15, 0, 10);
                this.muzzleLight.position.set(0, 0.05, 1.45);
                gunGroup.add(this.muzzleLight);

                gunGroup.position.set(0.38, 1.45, 0.5);
                this.gunMesh = gunGroup;
                this.playerGroup.add(gunGroup);

                // 1. Massive Tactical Xenon / LED High-Power Spotlight (Richtiger Fluter)
                this.flashlight = new THREE.SpotLight(0xfffaed, 28.0, 75, Math.PI / 3.4, 0.35, 0.85);
                this.flashlight.position.set(0.38, 1.45, 0.8);
                this.flashlight.target.position.set(0.38, 1.45, 25);
                this.playerGroup.add(this.flashlight);
                this.playerGroup.add(this.flashlight.target);

                // 2. Wide Forward Floodlight Fill PointLight
                this.flashlightFill = new THREE.PointLight(0xfff8e7, 0, 24, 1.0);
                this.flashlightFill.position.set(0.38, 1.5, 4.0);
                this.playerGroup.add(this.flashlightFill);

                // 3. Ultra-Smooth Projected Flashlight Ground Beam (Atmospheric Cone)
                const beamCanvas = document.createElement('canvas');
                beamCanvas.width = 256;
                beamCanvas.height = 512;
                const bCtx = beamCanvas.getContext('2d');
                const bGrad = bCtx.createRadialGradient(128, 30, 8, 128, 280, 250);
                bGrad.addColorStop(0, 'rgba(255, 250, 230, 0.7)');
                bGrad.addColorStop(0.35, 'rgba(255, 242, 205, 0.4)');
                bGrad.addColorStop(0.7, 'rgba(220, 238, 255, 0.12)');
                bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                bCtx.fillStyle = bGrad;
                bCtx.beginPath();
                bCtx.moveTo(128, 10);
                bCtx.lineTo(245, 500);
                bCtx.quadraticCurveTo(128, 512, 11, 500);
                bCtx.closePath();
                bCtx.fill();

                const beamTexture = new THREE.CanvasTexture(beamCanvas);
                const beamMat = new THREE.MeshBasicMaterial({
                    map: beamTexture,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const beamGeo = new THREE.PlaneGeometry(18, 34);
                this.flashlightGroundBeam = new THREE.Mesh(beamGeo, beamMat);
                this.flashlightGroundBeam.rotation.x = -Math.PI / 2;
                this.flashlightGroundBeam.position.set(0.38, 0.04, 17);
                this.playerGroup.add(this.flashlightGroundBeam);

                this.playerGroup.position.set(12, 0, 0);
                this.scene.add(this.playerGroup);
            }

            updateSpawnInterval() {
                if (this.spawnTimer) clearInterval(this.spawnTimer);
                const waveMultiplier = Math.max(1, this.activeSimultaneousWaves || 1);
                const speedMult = Math.max(1, this.gameSpeed || 1);
                const baseInterval = Math.max(130, Math.round((850 - (this.currentWave - 1) * 35) / (Math.sqrt(waveMultiplier) * speedMult)));
                this.spawnTimer = setInterval(() => {
                    this.spawnZombie();
                    if (this.zombies.length === 0 && this.zombiesLeftToSpawn > 0) {
                        this.spawnZombie();
                    }
                }, baseInterval);
            }
        }