const test = require("node:test");
const assert = require("node:assert/strict");
const questions = require("../js/questions.js");
const storage = require("../js/storage.js");
const tictac = require("../js/tictac.js");
const drive = require("../js/drive.js");

test("the same seed makes the same round", function () {
  const first = questions.generateRound(2, 1234, 10);
  const second = questions.generateRound(2, 1234, 10);
  assert.equal(first.length, 10);
  assert.deepEqual(first, second);
});

test("every question accepts its own answer and has no empty prompt", function () {
  for (let level = 1; level <= 6; level += 1) {
    const round = questions.generateRound(level, 99 + level, 10);
    assert.equal(round.length, 10);
    round.forEach(function (question) {
      assert.ok(question.prompt.length > 3);
      assert.ok(questions.matches(question, question.answer));
      if (question.choices) {
        assert.ok(question.choices.some(function (choice) { return questions.matches(question, choice); }));
        assert.equal(new Set(question.choices).size, question.choices.length);
      }
      if (question.kind === "div" || question.kind === "mul" || question.kind === "add" || question.kind === "sub") {
        assert.match(question.worked, /=/);
      }
    });
  }
});

test("grade sets the starting level and step-up is gentle", function () {
  assert.equal(questions.levelForGrade("prep"), 1);
  assert.equal(questions.levelForGrade("2"), 2);
  assert.equal(questions.levelForGrade("6"), 6);
  assert.equal(questions.playingLevel("2", 0), 2);
  assert.equal(questions.playingLevel("2", 1), 3);
  assert.equal(questions.nextAdjust(0, 10), 1);
  assert.equal(questions.nextAdjust(1, 10), 1);
  assert.equal(questions.nextAdjust(0, 2), -1);
  assert.equal(questions.nextAdjust(-1, 0), -1);
  assert.equal(questions.starsFor(10), 3);
  assert.equal(questions.starsFor(7), 2);
  assert.equal(questions.starsFor(5), 1);
  assert.equal(questions.starsFor(3), 0);
});

test("younger levels only use 2, 5 and 10 times tables", function () {
  const round = questions.generateRound(2, 7, 10);
  round.filter(function (question) { return question.kind === "mul"; }).forEach(function (question) {
    assert.match(question.prompt, /[2510] ×/);
  });
  assert.deepEqual(questions.tablesForLevel(1), [2, 5, 10]);
  assert.ok(questions.tablesForLevel(6).indexOf(12) >= 0);
});

test("shared identity keeps only a first name and avatar", function () {
  const profile = storage.normalise({
    name: "Ava Chen",
    grade: "3",
    age: 8,
    maths: { stars: 4 }
  });
  const shared = storage.shareIdentity(profile);
  assert.equal(shared.name, "Ava");
  assert.equal(shared.grade, undefined);
  assert.equal(shared.age, undefined);
  assert.equal(shared.maths, undefined);
  assert.ok(shared.avatar.custom);
});

test("a carrot becomes ready after its grow time and rolls once", function () {
  const farm = storage.normalise(storage.blankProfile()).farm;
  const now = 1000000;
  assert.equal(storage.plantSeed(farm, 0, "carrot", now), true);
  const early = storage.advanceFarm(farm, now + 1000, function () { return 0.5; });
  assert.equal(early.plots[0].rolled, false);
  const ready = storage.advanceFarm(early, now + storage.CROPS.carrot.growMs, function () { return 0.01; });
  assert.equal(ready.plots[0].rolled, true);
  assert.equal(ready.plots[0].mutation, "rainbow");
  const again = storage.advanceFarm(ready, now + storage.CROPS.carrot.growMs + 5000, function () { return 0.5; });
  assert.equal(again.plots[0].mutation, "rainbow");
});

test("a strawberry keeps fruiting after a pick", function () {
  const farm = storage.normalise(storage.blankProfile()).farm;
  const now = 5000;
  assert.equal(storage.plantSeed(farm, 0, "strawberry", now), true);
  const grown = storage.advanceFarm(farm, now + storage.CROPS.strawberry.growMs, function () { return 0.9; });
  assert.equal(storage.isReady(grown.plots[0], now + storage.CROPS.strawberry.growMs, grown), true);
  assert.equal(storage.pickFruit(grown, 0, now + storage.CROPS.strawberry.growMs), true);
  assert.equal(grown.plots[0].crop, "strawberry");
  assert.equal(grown.plots[0].rolled, false);
  assert.equal(storage.isReady(grown.plots[0], now + storage.CROPS.strawberry.growMs + 1000, grown), false);
});

test("the shop restocks once after several cycles", function () {
  let calls = 0;
  const farm = storage.normalise(storage.blankProfile()).farm;
  const first = storage.advanceFarm(farm, 5000, function () { calls += 1; return 0.2; });
  assert.equal(first.shopAt, 5000);
  assert.equal(calls, 0);
  const later = storage.advanceFarm(first, 5000 + storage.RESTOCK_MS * 3 + 10, function () { calls += 1; return 0.99; });
  assert.equal(later.shopAt, 5000 + storage.RESTOCK_MS * 3);
  const used = calls;
  assert.ok(used > 0);
  storage.advanceFarm(later, later.shopAt + 1000, function () { calls += 1; return 0.1; });
  assert.equal(calls, used);
});

test("the shared wallet refuses a short payment and stays in step", function () {
  const bag = {};
  const previous = global.localStorage;
  global.localStorage = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null; },
    setItem: function (key, value) { bag[key] = String(value); },
    removeItem: function (key) { delete bag[key]; }
  };
  try {
    const draft = storage.blankProfile();
    assert.equal(storage.pay(draft, 31), false);
    assert.equal(draft.farm.coins, 30);
    storage.earn(draft, 3);
    assert.equal(draft.wallet.coins, 33);
    assert.equal(draft.farm.coins, 33);
    const saved = storage.save(draft);
    const sold = storage.update(saved.id, function (next) { next.farm.coins += 7; });
    assert.equal(sold.wallet.coins, 40);
    assert.equal(sold.farm.coins, 40);
    storage.remove(saved.id);
  } finally {
    if (previous === undefined) delete global.localStorage;
    else global.localStorage = previous;
  }
});

test("a shop question accepts its own change", function () {
  const question = questions.priceQuestion("change", { pay: 20, total: 8, price: 8, qty: 1, level: 2 }, 3);
  assert.equal(question.answer, "12");
  assert.equal(questions.matches(question, question.answer), true);
  assert.ok(question.choices.indexOf("12") >= 0);
});

test("tic tac toe takes a winning square", function () {
  const open = ["X", "X", "", "", "", "", "", "", ""];
  assert.equal(tictac.winner(open), null);
  open[2] = "X";
  assert.equal(tictac.winner(open).mark, "X");
  const almost = ["O", "O", "", "X", "", "", "", "", ""];
  assert.equal(tictac.chooseMove(almost.slice(), "O", "hard", function () { return 0; }), 2);
  assert.equal(tictac.chooseMove(almost.slice(), "O", "medium", function () { return 0.5; }), 2);
});

test("the daily key follows the calendar date", function () {
  assert.equal(questions.dayKey(new Date(2026, 9, 12)), "2026-10-12");
  assert.equal(questions.dayKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("ratings average the stars on this device and drop unknown tags", function () {
  const profiles = [
    { ratings: { maths: { stars: 5, tags: ["fun"] } } },
    { ratings: { maths: { stars: 0, tags: [] } } },
    { ratings: { maths: { stars: 3, tags: ["favourite"] } } }
  ];
  assert.equal(storage.averageRating("maths", profiles), 4);
  assert.equal(storage.averageRating("drive", profiles), 0);
  const bag = {};
  const previous = global.localStorage;
  global.localStorage = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null; },
    setItem: function (key, value) { bag[key] = String(value); },
    removeItem: function (key) { delete bag[key]; }
  };
  try {
    const profile = storage.save(storage.blankProfile());
    const rated = storage.setRating(profile.id, "memory", 4, ["easy", "secret", "fun"]);
    assert.equal(rated.ratings.memory.stars, 4);
    assert.deepEqual(rated.ratings.memory.tags, ["easy", "fun"]);
    assert.equal(storage.setRating(profile.id, "nope", 3, ["fun"]), null);
    assert.equal(storage.averageRating("memory"), 4);
    storage.remove(profile.id);
  } finally {
    if (previous === undefined) delete global.localStorage;
    else global.localStorage = previous;
  }
});

test("only three vehicles are free and the red supercar costs the most", function () {
  const free = drive.VEHICLES.filter(function (vehicle) { return vehicle.price === 0; }).map(function (vehicle) { return vehicle.id; });
  assert.deepEqual(free, ["town-car", "scooter", "tractor"]);
  assert.deepEqual(storage.FREE_VEHICLES, free);
  const dearest = drive.VEHICLES.reduce(function (best, vehicle) { return vehicle.price > best.price ? vehicle : best; });
  assert.equal(dearest.id, "supercar");
  assert.ok(drive.byId("limo").price > drive.byId("race").price);
  assert.ok(drive.byId("race").price > drive.byId("sports").price);
  const profile = storage.normalise({ drive: { owned: ["boat"], using: "missing" } });
  ["town-car", "scooter", "tractor", "boat"].forEach(function (id) {
    assert.ok(profile.drive.owned.indexOf(id) >= 0);
  });
  assert.equal(profile.drive.using, "town-car");
});

test("character search stays on the local list", function () {
  const list = [
    { id: "1", title: "Toy dragon", tags: ["dragon"] },
    { id: "2", title: "Helpful robot", tags: ["robot"] },
    { id: "3", title: "Storybook unicorn", tags: ["unicorn", "horse"] }
  ];
  assert.equal(questions.searchCharacters(list, "d").status, "short");
  assert.equal(questions.searchCharacters(list, "dragon").results[0].id, "1");
  assert.equal(questions.searchCharacters(list, "spaceship").status, "none");
  assert.equal(questions.searchCharacters(list, "unicorn").results.length, 1);
});

test("room codes are short and unambiguous", function () {
  assert.equal(/^[A-HJ-NP-Z2-9]{4,6}$/.test("AB23K"), true);
  assert.equal(/^[A-HJ-NP-Z2-9]{4,6}$/.test("HELLO"), false);
  assert.equal(/^[A-HJ-NP-Z2-9]{4,6}$/.test("ABC"), false);
});
