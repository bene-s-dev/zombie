const SUPABASE_URL = 'https://jyoxxkngxxfmiskfxndp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b3h4a25neHhmbWlza2Z4bmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjg4NTQsImV4cCI6MjEwMTUwNDg1NH0.g6iDSYtD9rCU8SMKdpqg8OTIK8VYueYbbXvQe2ouwXg';
const SUPABASE_TABLE = 'zombie_highscores';

const WEAPONS = {
    pistol: { id: 'pistol', name: 'Pistole', cost: 0, level: 1, maxLevel: Infinity, damage: 38, firerate: 200, speed: 52, spread: 0.03, count: 1, isExplosive: false, color: 0xfacc15 },
    smg: { id: 'smg', name: 'Maschinenpistole MP5', cost: 200, level: 1, maxLevel: Infinity, damage: 25, firerate: 100, speed: 54, spread: 0.07, count: 1, isExplosive: false, color: 0xeab308 },
    shotgun: { id: 'shotgun', name: 'Schrotflinte', cost: 350, level: 1, maxLevel: Infinity, damage: 26, firerate: 600, speed: 46, spread: 0.25, count: 7, isExplosive: false, color: 0xf97316 },
    rifle: { id: 'rifle', name: 'Sturmgewehr AK-47', cost: 650, level: 1, maxLevel: Infinity, damage: 52, firerate: 125, speed: 60, spread: 0.04, count: 1, isExplosive: false, color: 0xef4444 },
    sniper: { id: 'sniper', name: 'Scharfschützengewehr', cost: 900, level: 1, maxLevel: Infinity, damage: 280, firerate: 800, speed: 85, spread: 0.005, count: 1, isExplosive: false, color: 0x38bdf8 },
    rpg: { id: 'rpg', name: 'RPG Raketenwerfer', cost: 1300, level: 1, maxLevel: Infinity, damage: 360, firerate: 1100, speed: 35, spread: 0.02, count: 1, isExplosive: true, splashRadius: 7.5, color: 0xd97706 },
    minigun: { id: 'minigun', name: 'Schwere Minigun', cost: 1800, level: 1, maxLevel: Infinity, damage: 78, firerate: 65, speed: 66, spread: 0.08, count: 1, isExplosive: false, color: 0xa855f7 },
    plasma: { id: 'plasma', name: 'Plasma-Disruptor', cost: 2500, level: 1, maxLevel: Infinity, damage: 250, firerate: 380, speed: 50, spread: 0.02, count: 1, isExplosive: true, splashRadius: 5.5, color: 0x06b6d4 }
};

const TURRET_TYPES = {
    mg: { id: 'mg', name: 'Maschinengewehr-Turm', cost: 450, range: 27, damage: 26, firerate: 260, hp: 500, maxHp: 500, desc: 'Schnellfeuer-Turm. Feuert kontinuierlich auf nahe Feinde!' },
    rocket: { id: 'rocket', name: 'Raketen-Flak-Turm', cost: 1600, range: 36, damage: 260, firerate: 1300, isExplosive: true, splashRadius: 5.5, hp: 650, maxHp: 650, desc: 'Fernkampf-Flak. Massiver punktueller Explosionsschaden!' },
    light_mast: {
        id: 'light_mast',
        name: 'Katastrophenschutz-Lichtmast',
        cost: 120,
        range: 34,
        damage: 0,
        firerate: 0,
        hp: 450,
        maxHp: 450,
        isLightMast: true,
        desc: 'Mobiler Katastrophen-Lichtmast mit 360° Hochleistungs-LED-Flutlicht. Erleuchtet nachts das Umfeld taghell!'
    },
    drone_hangar: {
        id: 'drone_hangar',
        name: 'Reparatur-Drohnen-Hangar',
        cost: 8000,
        range: Infinity,
        damage: 0,
        firerate: 0,
        hp: 99999,
        maxHp: 99999,
        isIndestructible: true,
        isHangar: true,
        desc: 'Unzerstörbare High-Tech Drohnenstation. Sendet permanent ein Geschwader autonomer Reparatur-Drohnen aus, die kontinuierlich alle beschädigten Verteidigungsanlagen auf der gesamten Karte ohne Reichweitenbegrenzung reparieren!'
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
    player_hp: { category: 'player', name: 'Kampfweste & Max HP', level: 0, maxLevel: Infinity, costBase: 180, desc: 'Erhöht maximale Spieler-Gesundheit um +35 HP' },
    player_speed: { category: 'player', name: 'Sprint-Geschwindigkeit', level: 0, maxLevel: 5, costBase: 140, desc: 'Erhöht die Laufgeschwindigkeit des Überlebenden um +12%' },
    scavenger: { category: 'player', name: 'Plünderer-Bonus', level: 0, maxLevel: Infinity, costBase: 1000, desc: 'Erhöht erbeutetes Geld pro Zombie um +1% multiplikativ pro Stufe (Kein Stufenlimit)' },

    // CATEGORY: HQ / BASE
    base_hp: { category: 'hq', name: 'Basis & Turm-Panzerung', level: 0, maxLevel: Infinity, costBase: 220, desc: 'Erhöht maximale Basis-HP um +600 HP und verstärkt Panzerung aller Türme um +15% pro Stufe' },
    auto_repair: { category: 'hq', name: 'Nano-Reparatur-Drohnen', level: 0, maxLevel: 5, costBase: 450, desc: 'Repariert die Basis kontinuierlich im Kampf (+6 HP/Sek)' },
    base_spikes: { category: 'hq', name: 'Dornen-Perimeter', level: 0, maxLevel: 5, costBase: 300, desc: 'Fügt Zombies Schaden zu, die die Basis-Grenze angreifen' },

    // CATEGORY: COMPANIONS
    companion_dog: { category: 'companion', name: 'Hundeschule', level: 1, maxLevel: 5, costBase: 320, desc: 'Verbessert deinen aktiven K9-Begleiter! Erhöht Angriffsschaden, Sprintgeschwindigkeit, Angriffstempo und Verlangsamungseffekte.' },
    combat_drone: { category: 'companion', name: 'Begleit-Kampfdrohne', level: 0, maxLevel: 5, costBase: 650, desc: 'Schaltet eine schwebende 3D-Drohne frei, die über dir fliegt und automatisch Zombies beschießt!' }
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

const STOCKS_DATA = {
    BRAIN: {
        id: 'BRAIN',
        name: 'BrainCorp Industries',
        ticker: 'BRAIN',
        category: 'Biotech & Gehirn-Farming',
        icon: 'fa-brain text-pink-400',
        basePrice: 120,
        volatility: 0.12,
        desc: 'Marktführer für frische, unverbrauchte Gehirne. Immer hungrig auf exponentielles Wachstum!',
        news: [
            'BrainCorp meldet Rekordernte frischer Großhirne: Analysten im Freudentaumel!',
            'Gehirnmangel in Sektor 4 treibt Nachfrage nach Zerebral-Konzentrat an!',
            'Skandal: BrainCorp lieferte versehentlich schimmlige Kleinhirne aus.'
        ]
    },
    FLEISCH: {
        id: 'FLEISCH',
        name: 'Gammel & Söhne Delikatessen',
        ticker: 'GLMM',
        category: 'Lebensmittel & Biomasse',
        icon: 'fa-drumstick-bite text-amber-500',
        basePrice: 45,
        volatility: 0.08,
        desc: 'Garantiert 100% zähes Gammelfleisch. Die verlässliche Notration seit Tag 1.',
        news: [
            'Gammel & Söhne expandiert mit neuer Kadaver-Verarbeitungsanlage!',
            'Verkaufsschlager: Neue Knochenmark-Pastete bricht alle Umsatzrekorde!',
            'Kritik an Fleischkonsistenz bei Gammel & Söhne sorgt für kurzen Kursdämpfer.'
        ]
    },
    TOXIC: {
        id: 'TOXIC',
        name: 'Spucker Cola AG',
        ticker: 'SPCK',
        category: 'Konsumgüter & Säure-Chemie',
        icon: 'fa-flask text-lime-400',
        basePrice: 85,
        volatility: 0.16,
        desc: 'Ätzend prickelnder Erfrischungsgenuss aus 100% echtem Spucker-Säureextrakt.',
        news: [
            'Spucker Cola Zero-Acid erobert den Untoten-Markt im Sturm!',
            'Säure-Pipeline leckgeschlagen: Spucker Cola verliert Millionen Liter Konzentrat!',
            'Spucker-Gewerkschaft streikt: Cola-Vorräte werden knapp – Kurs klettert!'
        ]
    },
    STREAM: {
        id: 'STREAM',
        name: 'NecroFlix & Chill',
        ticker: 'NFLX',
        category: 'Unterhaltung & Grab-Medien',
        icon: 'fa-tv text-purple-400',
        basePrice: 210,
        volatility: 0.11,
        desc: 'Endloses Streaming für die ewige Grabesruhe. 24/7 Blockbuster für Untote.',
        news: [
            'NecroFlix-Erfolgsserie "The Walking Alive" bricht weltweite Streaming-Rekorde!',
            'Abo-Zahlen bei NecroFlix steigen rasant – wer stirbt, braucht Unterhaltung!',
            'Server-Crash bei NecroFlix: Millionen Zombies starren frustriert ins Leere.'
        ]
    },
    BOOM: {
        id: 'BOOM',
        name: 'Kamikaze Fireworks & Napalm',
        ticker: 'BOOM',
        category: 'Rüstung & Pyrotechnik',
        icon: 'fa-bomb text-orange-500',
        basePrice: 320,
        volatility: 0.24,
        desc: 'Explosive Renditen garantiert! Unser Napalm brennt garantiert noch im Jenseits.',
        news: [
            'Großauftrag: Kamikaze Inc. liefert 50.000 Sprengstoff-Westen an die Front!',
            'Unerwartete Selbstzündung im Zentrallager: BOOM-Aktie erleidet Kursknall!',
            'BOOM stellt neue Super-Napalm-Formel vor: Anleger reißen sich um Anteile!'
        ]
    },
    CRAB: {
        id: 'CRAB',
        name: 'Krabbler Express Logistik',
        ticker: 'CRAB',
        category: 'Transport & Blitz-Logistik',
        icon: 'fa-truck-fast text-emerald-400',
        basePrice: 65,
        volatility: 0.09,
        desc: 'Lieferungen auf allen Vieren in Rekordzeit. Schneller als jeder Überlebende.',
        news: [
            'Krabbler Express schließt Kooperation mit Schnell-Lieferdienst ab!',
            'Verkehrschaos auf Highway 66: Krabbler-Schwärme blockieren Lieferkette.',
            'Quartalszahlen übertreffen Erwartungen: Krabbler Logistik wächst zweistellig!'
        ]
    },
    SARG: {
        id: 'SARG',
        name: 'Rost & Sarg Bestattungs-Fonds',
        ticker: 'SARG',
        category: 'Finanzen & Ewigkeits-Immobilien',
        icon: 'fa-skull-crossbones text-rose-500',
        basePrice: 500,
        volatility: 0.06,
        desc: 'Krisensicheres Wachstumsgeschäft – unsere Kundschaft stirbt garantiert niemals aus.',
        news: [
            'Rost & Sarg schüttet Rekord-Dividende an Anteilseigner aus!',
            'Überbelegung auf Friedhöfen eröffnet neue Geschäftsfelder im Luxus-Mausoleum-Sektor!',
            'Holzmangel verteuert Sargproduktion – Margen steigen trotz Krise!'
        ]
    }
};


