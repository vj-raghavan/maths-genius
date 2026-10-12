/* Profiles live only in localStorage on this device. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGStorage = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const KEY = "maths-genius.v1";
  const GRADES = ["prep", "1", "2", "3", "4", "5", "6"];
  const STAGE_MS = [20000, 28000, 36000];
  const CROP_IDS = ["carrot", "tomato", "strawberry", "sunflower", "corn"];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function id() {
    return "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function gradeLabel(grade) {
    if (grade === "prep") return "Prep";
    return "Year " + grade;
  }

  function firstName(name) {
    const cleaned = String(name || "").replace(/\s+/g, " ").trim();
    const token = cleaned.split(" ")[0] || "Friend";
    return token.slice(0, 12);
  }

  function defaultAvatar() {
    return {
      mode: "custom",
      animal: "koala",
      custom: {
        skin: 2,
        face: "round",
        hair: "bob",
        hairColour: "brown",
        eye: "brown",
        glasses: "none",
        freckles: "none",
        hat: "none",
        hatColour: "#2f7dd1",
        clothing: "#0e7c66"
      }
    };
  }

  function defaultFarm() {
    return {
      coins: 20,
      seeds: { carrot: 2, tomato: 1, strawberry: 0, sunflower: 0, corn: 0 },
      plots: [0, 1, 2, 3, 4, 5].map(function () {
        return { crop: null, stage: 0, waterAt: 0 };
      })
    };
  }

  function blankProfile(partial) {
    const source = partial || {};
    return {
      id: source.id || id(),
      name: "",
      grade: "2",
      age: 7,
      avatar: defaultAvatar(),
      maths: { stars: 0, best: 0, rounds: 0, adjust: 0, correct: 0, answered: 0 },
      builder: { blocks: [] },
      farm: defaultFarm(),
      escape: { bestScore: 0, bestTime: 0 },
      dash: { highScore: 0, animal: "kangaroo" },
      blocky: { highScore: 0, characterId: "" },
      createdAt: Date.now()
    };
  }

  function normaliseAvatar(avatar) {
    const base = defaultAvatar();
    const source = avatar || {};
    const custom = source.custom || {};
    const fallback = base.custom;
    return {
      mode: source.mode === "animal" ? "animal" : "custom",
      animal: typeof source.animal === "string" ? source.animal.slice(0, 40) : base.animal,
      custom: {
        skin: clamp(Number(custom.skin) || 0, 0, 9),
        face: custom.face || fallback.face,
        hair: custom.hair || fallback.hair,
        hairColour: custom.hairColour || fallback.hairColour,
        eye: custom.eye || fallback.eye,
        glasses: custom.glasses || "none",
        freckles: custom.freckles || "none",
        hat: custom.hat || "none",
        hatColour: typeof custom.hatColour === "string" ? custom.hatColour : fallback.hatColour,
        clothing: typeof custom.clothing === "string" ? custom.clothing : fallback.clothing
      }
    };
  }

  function normaliseFarm(farm) {
    const fresh = defaultFarm();
    const source = farm || {};
    const seeds = fresh.seeds;
    CROP_IDS.forEach(function (crop) {
      const amount = Number(source.seeds && source.seeds[crop]);
      seeds[crop] = clamp(Number.isFinite(amount) ? Math.floor(amount) : seeds[crop], 0, 99);
    });
    const plots = fresh.plots.map(function (plot, index) {
      const incoming = (source.plots || [])[index] || {};
      const crop = CROP_IDS.indexOf(incoming.crop) >= 0 ? incoming.crop : null;
      return {
        crop: crop,
        stage: crop ? clamp(Number(incoming.stage) || 0, 0, 3) : 0,
        waterAt: crop ? Number(incoming.waterAt) || 0 : 0
      };
    });
    return {
      coins: clamp(Number(source.coins) || fresh.coins, 0, 9999),
      seeds: seeds,
      plots: plots
    };
  }

  function normaliseBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    return blocks.filter(function (block) {
      return block && [block.x, block.y, block.z, block.c].every(function (value) {
        return Number.isInteger(value);
      });
    }).slice(0, 80).map(function (block) {
      return {
        x: clamp(block.x, 0, 7),
        y: clamp(block.y, 0, 5),
        z: clamp(block.z, 0, 7),
        c: clamp(block.c, 0, 7)
      };
    });
  }

  function normalise(raw) {
    const source = raw || {};
    const blank = blankProfile(source);
    const age = Number(source.age);
    const grade = GRADES.indexOf(source.grade) >= 0 ? source.grade : "2";
    const name = String(source.name || "").replace(/\s+/g, " ").trim().slice(0, 24);
    return {
      id: typeof source.id === "string" && source.id ? source.id.slice(0, 40) : blank.id,
      name: name || "Friend",
      grade: grade,
      age: clamp(Number.isFinite(age) ? Math.round(age) : 7, 5, 12),
      avatar: normaliseAvatar(source.avatar),
      maths: {
        stars: clamp(Number(source.maths && source.maths.stars) || 0, 0, 9999),
        best: clamp(Number(source.maths && source.maths.best) || 0, 0, 10),
        rounds: clamp(Number(source.maths && source.maths.rounds) || 0, 0, 9999),
        adjust: clamp(Number(source.maths && source.maths.adjust) || 0, -1, 1),
        correct: clamp(Number(source.maths && source.maths.correct) || 0, 0, 99999),
        answered: clamp(Number(source.maths && source.maths.answered) || 0, 0, 99999)
      },
      builder: { blocks: normaliseBlocks(source.builder && source.builder.blocks) },
      farm: normaliseFarm(source.farm),
      escape: {
        bestScore: clamp(Number(source.escape && source.escape.bestScore) || 0, 0, 999999),
        bestTime: clamp(Number(source.escape && source.escape.bestTime) || 0, 0, 86400)
      },
      dash: {
        highScore: clamp(Number(source.dash && source.dash.highScore) || 0, 0, 999999),
        animal: typeof (source.dash && source.dash.animal) === "string" ? source.dash.animal.slice(0, 40) : "kangaroo"
      },
      blocky: {
        highScore: clamp(Number(source.blocky && source.blocky.highScore) || 0, 0, 999999),
        characterId: typeof (source.blocky && source.blocky.characterId) === "string" ? source.blocky.characterId.slice(0, 80) : ""
      },
      createdAt: Number(source.createdAt) || blank.createdAt
    };
  }

  function advancePlot(plot, now) {
    if (!plot.crop || plot.stage >= 3 || !plot.waterAt) return plot;
    const need = STAGE_MS[plot.stage] || STAGE_MS[STAGE_MS.length - 1];
    if (now - plot.waterAt >= need) {
      return { crop: plot.crop, stage: plot.stage + 1, waterAt: 0 };
    }
    return plot;
  }

  function advanceFarm(farm, now) {
    const next = normaliseFarm(farm);
    next.plots = next.plots.map(function (plot) { return advancePlot(plot, now); });
    return next;
  }

  function shareIdentity(profile) {
    const safe = normalise(profile);
    return {
      name: firstName(safe.name),
      avatar: {
        mode: safe.avatar.mode,
        animal: safe.avatar.animal,
        custom: safe.avatar.custom
      }
    };
  }

  function readAll() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalise);
    } catch (error) {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list.map(normalise)));
  }

  function all() {
    return readAll();
  }

  function get(profileId) {
    return readAll().find(function (profile) { return profile.id === profileId; }) || null;
  }

  function save(profile) {
    const next = normalise(profile);
    const list = readAll();
    const index = list.findIndex(function (item) { return item.id === next.id; });
    if (index >= 0) list[index] = next;
    else list.push(next);
    writeAll(list);
    return next;
  }

  function remove(profileId) {
    writeAll(readAll().filter(function (profile) { return profile.id !== profileId; }));
  }

  function update(profileId, mutator) {
    const current = get(profileId);
    if (!current) return null;
    const draft = JSON.parse(JSON.stringify(current));
    mutator(draft);
    return save(draft);
  }

  return {
    GRADES: GRADES,
    CROP_IDS: CROP_IDS,
    STAGE_MS: STAGE_MS,
    gradeLabel: gradeLabel,
    firstName: firstName,
    blankProfile: blankProfile,
    normalise: normalise,
    advancePlot: advancePlot,
    advanceFarm: advanceFarm,
    shareIdentity: shareIdentity,
    all: all,
    get: get,
    save: save,
    remove: remove,
    update: update
  };
});
