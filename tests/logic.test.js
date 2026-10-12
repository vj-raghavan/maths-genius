const test = require("node:test");
const assert = require("node:assert/strict");
const questions = require("../js/questions.js");
const storage = require("../js/storage.js");

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

test("a watered plot advances one stage and then waits", function () {
  const plot = { crop: "carrot", stage: 0, waterAt: 1000 };
  const next = storage.advancePlot(plot, 1000 + storage.STAGE_MS[0]);
  assert.equal(next.stage, 1);
  assert.equal(next.waterAt, 0);
  const held = storage.advancePlot(next, 1000 + storage.STAGE_MS[0] + 999999);
  assert.equal(held.stage, 1);
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
