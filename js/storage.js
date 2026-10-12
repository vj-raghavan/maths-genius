/* Profiles live only in localStorage on this device. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGStorage = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const KEY = "maths-genius.v1";
  const GRADES = ["prep", "1", "2", "3", "4", "5", "6"];
  const CROP_IDS = ["carrot", "strawberry", "tomato", "sunflower", "corn"];
  const CROPS = {
    carrot: { name: "Carrot", cost: 5, sell: 8, growMs: 20000, regrowMs: 0, multi: false, rarity: "Common", stockMax: 5 },
    strawberry: { name: "Strawberry", cost: 10, sell: 6, growMs: 18000, regrowMs: 14000, multi: true, rarity: "Common", stockMax: 4 },
    tomato: { name: "Tomato", cost: 16, sell: 12, growMs: 28000, regrowMs: 18000, multi: true, rarity: "Uncommon", stockMax: 3 },
    sunflower: { name: "Sunflower", cost: 24, sell: 32, growMs: 36000, regrowMs: 0, multi: false, rarity: "Uncommon", stockMax: 2 },
    corn: { name: "Corn", cost: 40, sell: 55, growMs: 48000, regrowMs: 0, multi: false, rarity: "Rare", stockMax: 1 }
  };
  const MUTATIONS = {
    normal: { name: "Plain", mult: 1 },
    golden: { name: "Golden", mult: 3 },
    rainbow: { name: "Rainbow", mult: 5 }
  };
  const RESTOCK_MS = 60000;
  const CAN_USES = 4;
  const CAN_COST = 20;
  const CAN_SKIP_MS = 12000;
  const BOOST_MS = 10000;
  const SPRINKLER_COST = 50;
  const SPRINKLER_MS = 45000;
  const MAX_PLOTS = 12;

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

  function emptyPlot() {
    return { crop: null, plantedAt: 0, bonusMs: 0, rolled: false, mutation: "normal", harvests: 0 };
  }

  function defaultStock() {
    return { carrot: 4, strawberry: 2, tomato: 1, sunflower: 0, corn: 0 };
  }

  function defaultFarm() {
    const seeds = { carrot: 2, strawberry: 1, tomato: 0, sunflower: 0, corn: 0 };
    return {
      coins: 30,
      plotsOpen: 6,
      plots: [0, 1, 2, 3, 4, 5].map(emptyPlot),
      seeds: seeds,
      basket: [],
      shopAt: 0,
      stock: defaultStock(),
      canUses: 1,
      sprinklerStarted: 0,
      sprinklerUntil: 0,
      lastMaths: ""
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
      tictactoe: { wins: 0, losses: 0, draws: 0 },
      wallet: { coins: 30 },
      ratings: {},
      pets: { owned: {} },
      memory: { best: 0, clears: 0 },
      treasure: { found: 0 },
      daily: { last: "", streak: 0 },
      bake: { served: 0 },
      zoo: { built: 0 },
      bingo: { lines: 0 },
      fish: { caught: 0 },
      outfit: { owned: [], wearing: [] },
      drive: { owned: ["town-car", "scooter", "tractor"], using: "town-car", fuel: 80, distance: 0, deliveries: 0, quizzes: 0 },
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

  function normalisePlot(incoming) {
    const source = incoming || {};
    const crop = CROP_IDS.indexOf(source.crop) >= 0 ? source.crop : null;
    if (!crop) return emptyPlot();
    if (source.plantedAt || source.rolled || source.harvests) {
      return {
        crop: crop,
        plantedAt: Math.max(0, Number(source.plantedAt) || 0),
        bonusMs: clamp(Number(source.bonusMs) || 0, 0, 86400000),
        rolled: !!source.rolled,
        mutation: MUTATIONS[source.mutation] ? source.mutation : "normal",
        harvests: clamp(Number(source.harvests) || 0, 0, 999)
      };
    }
    const stage = clamp(Number(source.stage) || 0, 0, 3);
    if (stage >= 3) {
      return { crop: crop, plantedAt: 1, bonusMs: CROPS[crop].growMs, rolled: false, mutation: "normal", harvests: 0 };
    }
    return { crop: crop, plantedAt: Math.max(0, Number(source.waterAt) || 0), bonusMs: 0, rolled: false, mutation: "normal", harvests: 0 };
  }

  function normaliseFarm(farm) {
    const fresh = defaultFarm();
    const source = farm || {};
    const seeds = {};
    const stock = {};
    CROP_IDS.forEach(function (crop) {
      const owned = Number(source.seeds && source.seeds[crop]);
      const shelf = Number(source.stock && source.stock[crop]);
      seeds[crop] = clamp(Number.isFinite(owned) ? Math.floor(owned) : fresh.seeds[crop], 0, 99);
      stock[crop] = clamp(Number.isFinite(shelf) ? Math.floor(shelf) : fresh.stock[crop], 0, 20);
    });
    let plotsOpen = Number(source.plotsOpen);
    if (plotsOpen !== 6 && plotsOpen !== 9 && plotsOpen !== 12) plotsOpen = 6;
    const plots = [];
    for (let index = 0; index < plotsOpen; index += 1) {
      plots.push(normalisePlot((source.plots || [])[index]));
    }
    const basket = (Array.isArray(source.basket) ? source.basket : []).slice(0, 48).map(function (item) {
      const crop = item && CROP_IDS.indexOf(item.crop) >= 0 ? item.crop : null;
      if (!crop) return null;
      return { crop: crop, mutation: item && MUTATIONS[item.mutation] ? item.mutation : "normal" };
    }).filter(Boolean);
    return {
      coins: clamp(Number.isFinite(Number(source.coins)) ? Math.floor(Number(source.coins)) : fresh.coins, 0, 99999),
      plotsOpen: plotsOpen,
      plots: plots,
      seeds: seeds,
      basket: basket,
      shopAt: Math.max(0, Number(source.shopAt) || 0),
      stock: stock,
      canUses: clamp(source.canUses == null ? 1 : Math.floor(Number(source.canUses)) || 0, 0, 99),
      sprinklerStarted: Math.max(0, Number(source.sprinklerStarted) || 0),
      sprinklerUntil: Math.max(0, Number(source.sprinklerUntil) || 0),
      lastMaths: String(source.lastMaths || "").slice(0, 180),
      planted: clamp(Number(source.planted) || 0, 0, 99999),
      harvests: clamp(Number(source.harvests) || 0, 0, 99999),
      rare: clamp(Number(source.rare) || 0, 0, 99999)
    };
  }

  function needMs(plot) {
    const crop = CROPS[plot.crop];
    if (!crop) return 1;
    if (crop.multi && plot.harvests > 0) return crop.regrowMs;
    return crop.growMs;
  }

  function elapsedMs(plot, now, farm) {
    if (!plot.crop) return 0;
    const start = plot.plantedAt || 0;
    let extra = plot.bonusMs || 0;
    const until = farm.sprinklerUntil || 0;
    const from = farm.sprinklerStarted || 0;
    if (start && until > start && from > 0) {
      const overlapEnd = Math.min(now, until);
      const overlapStart = Math.max(start, from);
      if (overlapEnd > overlapStart) extra += overlapEnd - overlapStart;
    }
    if (!start) return extra;
    return Math.max(0, now - start) + extra;
  }

  function isReady(plot, now, farm) {
    return !!(plot && plot.crop && plot.plantedAt && elapsedMs(plot, now, farm) >= needMs(plot));
  }

  function fruitValue(cropId, mutation) {
    const crop = CROPS[cropId];
    if (!crop) return 0;
    const mult = (MUTATIONS[mutation] || MUTATIONS.normal).mult;
    return crop.sell * mult;
  }

  function rollMutation(rng) {
    const n = rng();
    if (n < 0.04) return "rainbow";
    if (n < 0.16) return "golden";
    return "normal";
  }

  function rollStock(rng) {
    const stock = {};
    CROP_IDS.forEach(function (id) {
      const chance = id === "corn" ? 0.45 : id === "sunflower" ? 0.75 : 1;
      if (rng() > chance) stock[id] = 0;
      else stock[id] = 1 + Math.floor(rng() * CROPS[id].stockMax);
    });
    if (!stock.carrot) stock.carrot = 2;
    return stock;
  }

  function syncShop(farm, now, rng) {
    if (!farm.shopAt) {
      farm.shopAt = now;
      return farm;
    }
    if (now < farm.shopAt + RESTOCK_MS) return farm;
    const steps = Math.floor((now - farm.shopAt) / RESTOCK_MS);
    farm.shopAt = farm.shopAt + steps * RESTOCK_MS;
    farm.stock = rollStock(rng);
    return farm;
  }

  function advanceFarm(farm, now, rng) {
    const random = typeof rng === "function" ? rng : Math.random;
    const next = normaliseFarm(farm);
    syncShop(next, now, random);
    next.plots = next.plots.map(function (plot) {
      if (!plot.crop) return plot;
      const copy = {
        crop: plot.crop,
        plantedAt: plot.plantedAt,
        bonusMs: plot.bonusMs,
        rolled: plot.rolled,
        mutation: plot.mutation,
        harvests: plot.harvests
      };
      if (!copy.plantedAt) copy.plantedAt = now;
      if (!copy.rolled && elapsedMs(copy, now, next) >= needMs(copy)) {
        copy.rolled = true;
        copy.mutation = rollMutation(random);
      }
      return copy;
    });
    return next;
  }

  function plantSeed(farm, index, cropId, now) {
    if (CROP_IDS.indexOf(cropId) < 0) return false;
    if (index < 0 || index >= farm.plots.length) return false;
    if (farm.plots[index].crop) return false;
    if ((farm.seeds[cropId] || 0) < 1) return false;
    farm.seeds[cropId] -= 1;
    farm.planted = (farm.planted || 0) + 1;
    farm.plots[index] = { crop: cropId, plantedAt: now, bonusMs: 0, rolled: false, mutation: "normal", harvests: 0 };
    return true;
  }

  function pickFruit(farm, index, now) {
    const plot = farm.plots[index];
    if (!plot || !isReady(plot, now, farm)) return false;
    farm.basket.push({ crop: plot.crop, mutation: plot.mutation || "normal" });
    if (farm.basket.length > 48) farm.basket.shift();
    farm.harvests = (farm.harvests || 0) + 1;
    if ((plot.mutation || "normal") !== "normal") farm.rare = (farm.rare || 0) + 1;
    if (CROPS[plot.crop].multi) {
      plot.harvests += 1;
      plot.plantedAt = now;
      plot.bonusMs = 0;
      plot.rolled = false;
      plot.mutation = "normal";
    } else farm.plots[index] = emptyPlot();
    return true;
  }

  function sellBasket(farm) {
    if (!farm.basket.length) return 0;
    const parts = farm.basket.map(function (item) { return fruitValue(item.crop, item.mutation); });
    const total = parts.reduce(function (sum, value) { return sum + value; }, 0);
    farm.coins = clamp(farm.coins + total, 0, 99999);
    farm.lastMaths = parts.join(" + ") + " = " + total;
    farm.basket = [];
    return total;
  }

  function buySeed(farm, cropId, qty) {
    const amount = clamp(Math.floor(Number(qty) || 0), 1, 12);
    const crop = CROPS[cropId];
    if (!crop) return false;
    const cost = crop.cost * amount;
    if ((farm.stock[cropId] || 0) < amount || farm.coins < cost) return false;
    farm.coins -= cost;
    farm.stock[cropId] -= amount;
    farm.seeds[cropId] += amount;
    farm.lastMaths = crop.cost + " × " + amount + " = " + cost;
    return true;
  }

  function grantBoost(farm, index, now) {
    const plot = farm.plots[index];
    if (!plot || !plot.crop || isReady(plot, now, farm)) return false;
    plot.bonusMs += BOOST_MS;
    return true;
  }

  function useCan(farm, index, now) {
    const plot = farm.plots[index];
    if (farm.canUses < 1 || !plot || !plot.crop || isReady(plot, now, farm)) return false;
    farm.canUses -= 1;
    plot.bonusMs += CAN_SKIP_MS;
    return true;
  }

  function buyCan(farm) {
    if (farm.coins < CAN_COST) return false;
    farm.coins -= CAN_COST;
    farm.canUses += CAN_USES;
    farm.lastMaths = "Watering can " + CAN_COST + " coins, " + CAN_USES + " uses.";
    return true;
  }

  function buySprinkler(farm, now) {
    if (farm.coins < SPRINKLER_COST) return false;
    farm.coins -= SPRINKLER_COST;
    if (farm.sprinklerUntil > now) farm.sprinklerUntil += SPRINKLER_MS;
    else {
      farm.sprinklerStarted = now;
      farm.sprinklerUntil = now + SPRINKLER_MS;
    }
    farm.lastMaths = "Sprinkler " + SPRINKLER_COST + " coins.";
    return true;
  }

  function expandCost(plotsOpen) {
    if (plotsOpen >= MAX_PLOTS) return 0;
    return plotsOpen >= 9 ? 90 : 40;
  }

  function expandGarden(farm) {
    const cost = expandCost(farm.plotsOpen);
    if (!cost || farm.coins < cost || farm.plotsOpen >= MAX_PLOTS) return false;
    farm.coins -= cost;
    farm.plotsOpen += 3;
    farm.plots.push(emptyPlot(), emptyPlot(), emptyPlot());
    farm.lastMaths = "Garden " + cost + " coins.";
    return true;
  }

  function tenderFor(total) {
    const step = total < 30 ? 10 : 20;
    let pay = Math.ceil((total + 1) / step) * step;
    if (pay <= total) pay += step;
    return pay;
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
    const profile = {
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
      tictactoe: {
        wins: clamp(Number(source.tictactoe && source.tictactoe.wins) || 0, 0, 99999),
        losses: clamp(Number(source.tictactoe && source.tictactoe.losses) || 0, 0, 99999),
        draws: clamp(Number(source.tictactoe && source.tictactoe.draws) || 0, 0, 99999)
      },
      wallet: { coins: 0 },
      ratings: normaliseRatings(source.ratings),
      pets: normalisePets(source.pets),
      memory: {
        best: clamp(Number(source.memory && source.memory.best) || 0, 0, 9999),
        clears: clamp(Number(source.memory && source.memory.clears) || 0, 0, 9999)
      },
      treasure: { found: clamp(Number(source.treasure && source.treasure.found) || 0, 0, 9999) },
      daily: {
        last: typeof (source.daily && source.daily.last) === "string" ? source.daily.last.slice(0, 10) : "",
        streak: clamp(Number(source.daily && source.daily.streak) || 0, 0, 9999)
      },
      bake: { served: clamp(Number(source.bake && source.bake.served) || 0, 0, 9999) },
      zoo: { built: clamp(Number(source.zoo && source.zoo.built) || 0, 0, 9999) },
      bingo: { lines: clamp(Number(source.bingo && source.bingo.lines) || 0, 0, 9999) },
      fish: { caught: clamp(Number(source.fish && source.fish.caught) || 0, 0, 9999) },
      outfit: normaliseOutfit(source.outfit),
      drive: normaliseDrive(source.drive),
      createdAt: Number(source.createdAt) || blank.createdAt
    };
    const purse = source.wallet && Number.isFinite(Number(source.wallet.coins))
      ? Math.floor(Number(source.wallet.coins))
      : profile.farm.coins;
    profile.wallet.coins = clamp(purse, 0, 99999);
    profile.farm.coins = profile.wallet.coins;
    return profile;
  }

  const GAME_IDS = ["maths", "builder", "farm", "escape", "dash", "blocky", "together", "tictac", "pet", "memory", "treasure", "daily", "badges", "bake", "zoo", "bingo", "fish", "boutique", "drive"];
  const RATE_TAGS = ["fun", "hard", "easy", "favourite"];
  const OUTFIT_IDS = ["scarf", "bow", "cape", "flower", "specs", "band"];
  const FREE_VEHICLES = ["town-car", "scooter", "tractor"];

  function idList(value, allowed, max) {
    const seen = {};
    (Array.isArray(value) ? value : []).forEach(function (item) {
      if (allowed.indexOf(item) >= 0) seen[item] = true;
    });
    return Object.keys(seen).slice(0, max);
  }

  function normaliseRatings(raw) {
    const source = raw || {};
    const ratings = {};
    GAME_IDS.forEach(function (id) {
      const item = source[id] || {};
      const stars = clamp(Math.round(Number(item.stars) || 0), 0, 5);
      const tags = idList(item.tags, RATE_TAGS, 4);
      ratings[id] = { stars: stars, tags: tags };
    });
    return ratings;
  }

  function normalisePets(raw) {
    const source = (raw && raw.owned) || {};
    const owned = {};
    Object.keys(source).slice(0, 16).forEach(function (id) {
      if (!/^[a-z0-9-]{1,24}$/.test(id)) return;
      const pet = source[id] || {};
      owned[id] = {
        fed: Math.max(0, Number(pet.fed) || 0),
        played: Math.max(0, Number(pet.played) || 0),
        cleaned: Math.max(0, Number(pet.cleaned) || 0)
      };
    });
    return { owned: owned };
  }

  function normaliseOutfit(raw) {
    const source = raw || {};
    const owned = idList(source.owned, OUTFIT_IDS, 6);
    const wearing = idList(source.wearing, owned, 6);
    return { owned: owned, wearing: wearing };
  }

  function normaliseDrive(raw) {
    const source = raw || {};
    const owned = FREE_VEHICLES.slice();
    (Array.isArray(source.owned) ? source.owned : []).forEach(function (id) {
      if (typeof id === "string" && /^[a-z0-9-]{1,24}$/.test(id) && owned.indexOf(id) < 0) owned.push(id);
    });
    const using = owned.indexOf(source.using) >= 0 ? source.using : "town-car";
    return {
      owned: owned.slice(0, 30),
      using: using,
      fuel: clamp(Number.isFinite(Number(source.fuel)) ? Number(source.fuel) : 80, 0, 100),
      distance: clamp(Number(source.distance) || 0, 0, 999999),
      deliveries: clamp(Number(source.deliveries) || 0, 0, 9999),
      quizzes: clamp(Number(source.quizzes) || 0, 0, 9999)
    };
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
    if (draft.farm) {
      draft.wallet = draft.wallet || { coins: draft.farm.coins };
      if (draft.farm.coins !== current.farm.coins) draft.wallet.coins = draft.farm.coins;
      else draft.farm.coins = draft.wallet.coins;
    }
    return save(draft);
  }

  function earn(draft, amount) {
    const add = Math.max(0, Math.floor(Number(amount) || 0));
    draft.farm.coins = clamp((draft.farm.coins || 0) + add, 0, 99999);
    draft.wallet = draft.wallet || { coins: 0 };
    draft.wallet.coins = draft.farm.coins;
    return draft.farm.coins;
  }

  function pay(draft, cost) {
    const price = Math.max(0, Math.floor(Number(cost) || 0));
    if ((draft.farm.coins || 0) < price) return false;
    draft.farm.coins -= price;
    draft.wallet.coins = draft.farm.coins;
    return true;
  }

  function setRating(profileId, gameId, stars, tags) {
    if (GAME_IDS.indexOf(gameId) < 0) return null;
    return update(profileId, function (draft) {
      draft.ratings[gameId] = {
        stars: clamp(Math.round(Number(stars) || 0), 1, 5),
        tags: idList(tags, RATE_TAGS, 4)
      };
    });
  }

  function averageRating(gameId, profiles) {
    const list = profiles || readAll();
    let total = 0;
    let count = 0;
    list.forEach(function (profile) {
      const stars = profile.ratings && profile.ratings[gameId] && profile.ratings[gameId].stars;
      if (stars >= 1) {
        total += stars;
        count += 1;
      }
    });
    return count ? total / count : 0;
  }

  return {
    GRADES: GRADES,
    CROP_IDS: CROP_IDS,
    CROPS: CROPS,
    MUTATIONS: MUTATIONS,
    RESTOCK_MS: RESTOCK_MS,
    CAN_COST: CAN_COST,
    CAN_USES: CAN_USES,
    CAN_SKIP_MS: CAN_SKIP_MS,
    BOOST_MS: BOOST_MS,
    SPRINKLER_COST: SPRINKLER_COST,
    SPRINKLER_MS: SPRINKLER_MS,
    MAX_PLOTS: MAX_PLOTS,
    gradeLabel: gradeLabel,
    firstName: firstName,
    blankProfile: blankProfile,
    normalise: normalise,
    advanceFarm: advanceFarm,
    isReady: isReady,
    elapsedMs: elapsedMs,
    needMs: needMs,
    fruitValue: fruitValue,
    plantSeed: plantSeed,
    pickFruit: pickFruit,
    sellBasket: sellBasket,
    buySeed: buySeed,
    grantBoost: grantBoost,
    useCan: useCan,
    buyCan: buyCan,
    buySprinkler: buySprinkler,
    expandCost: expandCost,
    expandGarden: expandGarden,
    tenderFor: tenderFor,
    GAME_IDS: GAME_IDS,
    RATE_TAGS: RATE_TAGS,
    OUTFIT_IDS: OUTFIT_IDS,
    FREE_VEHICLES: FREE_VEHICLES,
    earn: earn,
    pay: pay,
    setRating: setRating,
    averageRating: averageRating,
    shareIdentity: shareIdentity,
    all: all,
    get: get,
    save: save,
    remove: remove,
    update: update
  };
});
