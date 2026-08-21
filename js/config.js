const ONLINE_API_URL = 'https://api.restful-api.dev/objects/ff8081819ff5b110019ffbe8f30513b0';

const WEAPONS = {
    pistol: { id: 'pistol', name: 'Pistole', cost: 0, level: 1, maxLevel: Infinity, damage: 40, firerate: 200, speed: 52, spread: 0.03, count: 1, isExplosive: false, color: 0xfacc15 },
    smg: { id: 'smg', name: 'Maschinenpistole MP5', cost: 200, level: 1, maxLevel: Infinity, damage: 24, firerate: 105, speed: 54, spread: 0.07, count: 1, isExplosive: false, color: 0xeab308 },
    shotgun: { id: 'shotgun', name: 'Schrotflinte', cost: 350, level: 1, maxLevel: Infinity, damage: 26, firerate: 620, speed: 45, spread: 0.26, count: 7, isExplosive: false, color: 0xf97316 },
    rifle: { id: 'rifle', name: 'Sturmgewehr AK-47', cost: 650, level: 1, maxLevel: Infinity, damage: 48, firerate: 125, speed: 60, spread: 0.04, count: 1, isExplosive: false, color: 0xef4444 },
    sniper: { id: 'sniper', name: 'Scharfschützengewehr', cost: 900, level: 1, maxLevel: Infinity, damage: 260, firerate: 850, speed: 85, spread: 0.005, count: 1, isExplosive: false, color: 0x38bdf8 },
    rpg: { id: 'rpg', name: 'RPG Raketenwerfer', cost: 1300, level: 1, maxLevel: Infinity, damage: 340, firerate: 1150, speed: 34, spread: 0.02, count: 1, isExplosive: true, splashRadius: 7.5, color: 0xd97706 },
    minigun: { id: 'minigun', name: 'Schwere Minigun', cost: 1800, level: 1, maxLevel: Infinity, damage: 42, firerate: 60, speed: 64, spread: 0.09, count: 1, isExplosive: false, color: 0xa855f7 },
    plasma: { id: 'plasma', name: 'Plasma-Disruptor', cost: 2500, level: 1, maxLevel: Infinity, damage: 240, firerate: 420, speed: 48, spread: 0.02, count: 1, isExplosive: true, splashRadius: 5.5, color: 0x06b6d4 }
};

const TURRET_TYPES = {
    mg: { id: 'mg', name: 'Maschinengewehr-Turm', cost: 450, range: 27, damage: 26, firerate: 280, hp: 450, maxHp: 450, desc: 'Schnellfeuer-Turm. Feuert kontinuierlich auf nahe Feinde!' },
    rocket: { id: 'rocket', name: 'Raketen-Flak-Turm', cost: 1750, range: 36, damage: 185, firerate: 1400, isExplosive: true, splashRadius: 6.2, hp: 550, maxHp: 550, desc: 'Fernkampf-Flak. Verheerender Flächenschaden!' },
    drone_hangar: {
        id: 'drone_hangar',
        name: 'Reparatur-Drohnen-Hangar',
        cost: 2400,
        range: 60,
        damage: 0,
        firerate: 0,
        hp: 99999,
        maxHp: 99999,
        isIndestructible: true,
        isHangar: true,
        desc: 'Unzerstörbare High-Tech Drohnenstation. Sendet permanent ein Geschwader autonomer Reparatur-Drohnen aus, die kontinuierlich alle beschädigten Geschütztürme im Feld reparieren!'
    }
};

function getTurretCost(turretTypeId) {
    const spec = TURRET_TYPES[turretTypeId];
    return spec ? spec.cost : 0;
}

const WALL_TYPES = {
    sandbag: { id: 'sandbag', name: 'Sandsack-Barrikade', cost: 60, hp: 300, radius: 1.8, desc: 'Günstige Barrikade. Stoppt normale Zombies & Schüsse.' },
    concrete: { id: 'concrete', name: 'Beton-Schutzwall', cost: 160, hp: 850, radius: 2.1, desc: 'Schwerer Schutzwall mit sehr hoher Widerstandskraft.' },
    laser_wall: { id: 'laser_wall', name: 'Plasma-Barriere', cost: 320, hp: 1600, radius: 2.25, desc: 'High-Tech Kraftfeld. Nur Endbosse können sie beschädigen!' }
};

const UPGRADES = {
    // CATEGORY: PLAYER
    player_hp: { category: 'player', name: 'Kampfweste & Max HP', level: 0, maxLevel: Infinity, costBase: 200, desc: 'Erhöht maximale Spieler-Gesundheit um +30 HP' },
    player_speed: { category: 'player', name: 'Sprint-Geschwindigkeit', level: 0, maxLevel: 5, costBase: 150, desc: 'Erhöht die Laufgeschwindigkeit des Überlebenden um +12%' },
    scavenger: { category: 'player', name: 'Plünderer-Bonus', level: 0, maxLevel: Infinity, costBase: 300, desc: 'Erhöht erbeutetes Geld pro Zombie um +3.5% multiplikativ pro Stufe (Kein Stufenlimit)' },

    // CATEGORY: HQ / BASE
    base_hp: { category: 'hq', name: 'Basis-Panzerung', level: 0, maxLevel: Infinity, costBase: 250, desc: 'Erhöht maximale Basis-Gesundheit massiv um +500 HP' },
    auto_repair: { category: 'hq', name: 'Nano-Reparatur-Drohnen', level: 0, maxLevel: 5, costBase: 500, desc: 'Repariert die Basis kontinuierlich im Kampf (+5 HP/Sek)' },
    base_spikes: { category: 'hq', name: 'Dornen-Perimeter', level: 0, maxLevel: 5, costBase: 350, desc: 'Fügt Zombies Schaden zu, die die Basis-Grenze angreifen' },

    // CATEGORY: COMPANIONS
    companion_dog: { category: 'companion', name: 'Hundeschule', level: 1, maxLevel: 5, costBase: 350, desc: 'Verbessert deinen aktiven K9-Begleiter! Erhöht Angriffsschaden, Sprintgeschwindigkeit, Angriffstempo und Verlangsamungseffekte.' },
    combat_drone: { category: 'companion', name: 'Begleit-Kampfdrohne', level: 0, maxLevel: 5, costBase: 750, desc: 'Schaltet eine schwebende 3D-Drohne frei, die über dir fliegt und automatisch Zombies beschießt!' }
};

const AC130_CONFIG = {
    duration: 40,
    cooldown: 80,
    cannon25mm: {
        damage: 110,
        firerate: 35,
        splashRadius: 4.0,
        name: '25mm GATLING'
    },
    cannon40mm: {
        damage: 260,
        firerate: 280,
        splashRadius: 7.0,
        name: '40mm BOFORS'
    },
    missile: {
        damage: 1500,
        firerate: 2800,
        splashRadius: 18.0,
        name: 'AGM-114 RAKETE'
    },
    cannon105mm: {
        damage: 1500,
        firerate: 2800,
        splashRadius: 18.0,
        name: 'AGM-114 RAKETE'
    }
};

