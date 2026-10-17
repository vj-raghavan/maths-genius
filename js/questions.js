/* Question generator for Maths Genius, the farm, and the race games. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGQuestions = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const GRADE_LEVEL = { prep: 1, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6 };

  const FALLBACK_MONEY = [
    { id: "5c", name: "5 cent coin", cents: 5, kind: "coin", src: "assets/money/coin-5c.svg" },
    { id: "20c", name: "20 cent coin", cents: 20, kind: "coin", src: "assets/money/coin-20c.svg" },
    { id: "50c", name: "50 cent coin", cents: 50, kind: "coin", src: "assets/money/coin-50c.svg" },
    { id: "n5", name: "5 dollar note", cents: 500, kind: "note", src: "assets/money/note-5.svg" },
    { id: "n10", name: "10 dollar note", cents: 1000, kind: "note", src: "assets/money/note-10.svg" }
  ];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function int(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function shuffle(rng, list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function levelForGrade(grade) {
    return GRADE_LEVEL[grade] || 2;
  }

  function playingLevel(grade, adjust) {
    return clamp(levelForGrade(grade) + (adjust || 0), 1, 6);
  }

  function describeLevel(level) {
    if (level <= 1) return "Prep and Year 1";
    return "Year " + level;
  }

  function starsFor(correct) {
    if (correct >= 9) return 3;
    if (correct >= 7) return 2;
    if (correct >= 5) return 1;
    return 0;
  }

  function nextAdjust(adjust, correct) {
    const current = adjust || 0;
    if (correct >= 9) return Math.min(1, current + 1);
    if (correct <= 4) return Math.max(-1, current - 1);
    return current;
  }

  function norm(value) {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function matches(question, value) {
    const given = norm(value);
    return question.accept.some(function (option) {
      return norm(option) === given;
    });
  }

  function moneyList() {
    if (typeof window !== "undefined" && window.MG_LIBRARY && window.MG_LIBRARY.money && window.MG_LIBRARY.money.length) {
      return window.MG_LIBRARY.money;
    }
    return FALLBACK_MONEY;
  }

  function tablesForLevel(level) {
    if (level <= 2) return [2, 5, 10];
    if (level === 3) return [2, 3, 4, 5, 10];
    if (level === 4) return [2, 3, 4, 5, 6, 8, 10];
    if (level === 5) return [2, 3, 4, 5, 6, 7, 8, 9, 10];
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  function factorMax(level) {
    if (level <= 1) return 5;
    if (level >= 5) return 12;
    return 10;
  }

  function numericChoices(rng, answer) {
    const values = new Set([answer]);
    let guard = 0;
    while (values.size < 4 && guard < 40) {
      guard += 1;
      const delta = int(rng, 1, Math.max(3, Math.round(Math.abs(answer) * 0.3) || 3));
      const next = answer + delta * (rng() < 0.5 ? -1 : 1);
      if (next !== answer && next >= 0 && next < 5000) values.add(next);
    }
    while (values.size < 4) values.add(answer + values.size * 3 + 1);
    return shuffle(rng, Array.from(values).map(String));
  }

  function uniqueList(list) {
    const seen = new Set();
    return list.filter(function (item) {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }

  function phraseChoices(rng, answer, others) {
    const pool = uniqueList(others.filter(function (item) { return item !== answer; }));
    const picked = shuffle(rng, pool).slice(0, 3);
    let extra = 1;
    while (picked.length < 3) {
      const filler = answer + " option " + extra;
      extra += 1;
      if (filler !== answer && picked.indexOf(filler) === -1) picked.push(filler);
    }
    return shuffle(rng, [answer].concat(picked));
  }

  function addQuestion(level, rng) {
    const max = [0, 20, 100, 100, 200, 500, 999][level];
    const total = int(rng, 2, max);
    let a = int(rng, 0, total);
    let b = total - a;
    if (level >= 3 && total >= 20 && rng() < 0.7) {
      a = int(rng, 6, 9) + 10 * int(rng, 1, Math.max(1, Math.floor((max - 20) / 10)));
      b = int(rng, 4, 9) + 10 * int(rng, 0, 2);
      if (a + b > max) b = Math.max(0, max - a);
    }
    const answer = a + b;
    return {
      kind: "add",
      prompt: "What is " + a + " + " + b + "?",
      answer: String(answer),
      accept: [String(answer)],
      worked: a + " + " + b + " = " + answer,
      visual: null
    };
  }

  function subQuestion(level, rng) {
    const max = [0, 20, 100, 100, 200, 500, 999][level];
    const a = int(rng, 1, max);
    const b = int(rng, 0, a);
    const answer = a - b;
    return {
      kind: "sub",
      prompt: "What is " + a + " − " + b + "?",
      answer: String(answer),
      accept: [String(answer)],
      worked: a + " − " + b + " = " + answer,
      visual: null
    };
  }

  function mulQuestion(level, rng, tables) {
    const use = tables && tables.length ? tables : tablesForLevel(level);
    const left = pick(rng, use);
    const right = int(rng, 1, factorMax(level));
    const answer = left * right;
    return {
      kind: "mul",
      prompt: "What is " + left + " × " + right + "?",
      answer: String(answer),
      accept: [String(answer)],
      worked: left + " × " + right + " = " + answer,
      visual: null
    };
  }

  function divQuestion(level, rng) {
    const left = pick(rng, tablesForLevel(level));
    const right = int(rng, 1, factorMax(level));
    const product = left * right;
    return {
      kind: "div",
      prompt: "What is " + product + " ÷ " + left + "?",
      answer: String(right),
      accept: [String(right)],
      worked: product + " ÷ " + left + " = " + right,
      visual: null
    };
  }

  function skipQuestion(level, rng) {
    const step = pick(rng, level <= 1 ? [2, 10, 5] : [2, 5, 10]);
    const start = step * int(rng, 0, level <= 1 ? 3 : 5);
    const seq = [0, 1, 2, 3, 4].map(function (index) { return start + index * step; });
    const hide = int(rng, 1, 3);
    const answer = seq[hide];
    return {
      kind: "skip",
      prompt: "Which number is missing?",
      answer: String(answer),
      accept: [String(answer)],
      worked: "The numbers go up by " + step + ". The missing number is " + answer + ".",
      visual: {
        type: "skip",
        parts: seq.map(function (value, index) { return index === hide ? "?" : String(value); })
      }
    };
  }

  function clockVisual(hour, minute) {
    return { type: "clock", hour: hour, minute: minute };
  }

  function timeLabel(hour, minute) {
    const next = (hour % 12) + 1;
    if (minute === 0) return hour + " o'clock";
    if (minute === 30) return "half past " + hour;
    if (minute === 15) return "quarter past " + hour;
    if (minute === 45) return "quarter to " + next;
    return hour + ":" + String(minute).padStart(2, "0");
  }

  function timeQuestion(level, rng) {
    const hour = int(rng, 1, 12);
    if (level >= 3 && rng() < 0.45) {
      const add = int(rng, 1, level >= 5 ? 6 : 3);
      const result = ((hour - 1 + add) % 12) + 1;
      const correct = result + " o'clock";
      const others = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (value) {
        return value + " o'clock";
      });
      return {
        kind: "time",
        prompt: "It is " + hour + " o'clock. What time will it be in " + add + (add === 1 ? " hour?" : " hours?"),
        answer: correct,
        accept: [correct],
        choices: phraseChoices(rng, correct, others),
        worked: hour + " o'clock plus " + add + (add === 1 ? " hour" : " hours") + " is " + correct + ".",
        visual: clockVisual(hour, 0),
        typed: false
      };
    }
    let minute = 0;
    if (level >= 2 && rng() < 0.55) minute = 30;
    if (level >= 4 && rng() < 0.35) minute = rng() < 0.5 ? 15 : 45;
    const correct = timeLabel(hour, minute);
    const bank = [];
    for (let h = 1; h <= 12; h += 1) {
      bank.push(h + " o'clock");
      if (level >= 2) bank.push("half past " + h);
      if (level >= 4) {
        bank.push("quarter past " + h);
        bank.push("quarter to " + h);
      }
    }
    let worked = "The long hand shows the minutes and the short hand shows the hour.";
    if (minute === 0) worked = "The long hand is on 12, so it is " + correct + ".";
    if (minute === 30) worked = "The long hand is on 6, so it is " + correct + ".";
    if (minute === 15) worked = "The long hand is on 3, so it is " + correct + ".";
    if (minute === 45) worked = "The long hand is on 9, so it is " + correct + ".";
    return {
      kind: "time",
      prompt: "What time does the clock show?",
      answer: correct,
      accept: [correct],
      choices: phraseChoices(rng, correct, bank),
      worked: worked,
      visual: clockVisual(minute === 45 ? hour : hour, minute),
      typed: false
    };
  }

  function centsPhrase(cents) {
    if (cents % 100 === 0) return cents / 100 + (cents === 100 ? " dollar" : " dollars");
    if (cents > 100 && cents % 100 !== 0) {
      const dollars = Math.floor(cents / 100);
      const rest = cents % 100;
      return dollars + (dollars === 1 ? " dollar and " : " dollars and ") + rest + " cents";
    }
    return cents + " cents";
  }

  function moneyQuestion(level, rng) {
    const all = moneyList();
    const coins = all.filter(function (item) { return item.kind === "coin" && item.cents < 100; });
    const notes = all.filter(function (item) { return item.kind === "note" || item.cents >= 100; });
    const purse = coins.length ? coins : all;
    if (!purse.length) return null;

    if (level >= 3 && notes.length && rng() < 0.4) {
      const note = pick(rng, notes);
      const dollars = note.cents / 100;
      const cost = int(rng, 1, Math.max(1, dollars - 1));
      const change = dollars - cost;
      const correct = String(change);
      return {
        kind: "money",
        prompt: "You pay with a " + note.name + ". The toy costs " + cost + (cost === 1 ? " dollar." : " dollars.") + " How many dollars change do you get?",
        answer: correct,
        accept: [correct, correct + " dollars", "$" + correct],
        worked: dollars + " − " + cost + " = " + change,
        visual: { type: "money", items: [{ src: note.src, alt: note.name }] },
        typed: true
      };
    }

    if (level >= 2 && notes.length && rng() < 0.35) {
      const note = pick(rng, notes);
      const dollars = note.cents / 100;
      const correct = dollars + (dollars === 1 ? " dollar" : " dollars");
      const bank = notes.map(function (item) {
        const value = item.cents / 100;
        return value + (value === 1 ? " dollar" : " dollars");
      });
      [1, 2, 5, 10, 20].forEach(function (value) {
        bank.push(value + (value === 1 ? " dollar" : " dollars"));
      });
      return {
        kind: "money",
        prompt: "How many dollars is this Australian note?",
        answer: correct,
        accept: [correct, String(dollars), "$" + dollars, dollars + " dollars", dollars + " dollar"],
        choices: phraseChoices(rng, correct, bank),
        worked: "This is the " + note.name + ".",
        visual: { type: "money", items: [{ src: note.src, alt: note.name }] },
        typed: false
      };
    }

    const count = level <= 1 ? int(rng, 1, 2) : int(rng, 1, 3);
    const items = [];
    let total = 0;
    const cap = level <= 1 ? 50 : 200;
    for (let i = 0; i < count; i += 1) {
      const coin = pick(rng, purse);
      if (total + coin.cents > cap && items.length) break;
      items.push({ src: coin.src, alt: coin.name });
      total += coin.cents;
    }
    const phrase = centsPhrase(total);
    const amounts = new Set([total]);
    let guard = 0;
    while (amounts.size < 4 && guard < 20) {
      guard += 1;
      const delta = pick(rng, [5, 10, 20]);
      const next = total + delta * (rng() < 0.5 ? -1 : 1);
      if (next > 0 && next !== total) amounts.add(next);
    }
    return {
      kind: "money",
      prompt: items.length === 1 ? "How much is this coin?" : "How much money is this altogether?",
      answer: phrase,
      accept: [phrase, String(total), total + " cents", total + "c"],
      choices: phraseChoices(rng, phrase, Array.from(amounts).map(centsPhrase)),
      worked: "The total is " + phrase + ".",
      visual: { type: "money", items: items },
      typed: false
    };
  }

  function kindsFor(level) {
    const kinds = ["add", "sub", "skip", "money", "time", "mul"];
    if (level >= 3) kinds.push("div");
    return kinds;
  }

  function build(kind, level, rng, tables) {
    if (kind === "add") return addQuestion(level, rng);
    if (kind === "sub") return subQuestion(level, rng);
    if (kind === "mul") return mulQuestion(level, rng, tables);
    if (kind === "div") return divQuestion(level, rng);
    if (kind === "skip") return skipQuestion(level, rng);
    if (kind === "time") return timeQuestion(level, rng);
    if (kind === "money") return moneyQuestion(level, rng);
    return null;
  }

  function finish(question, level, rng) {
    if (!question) return null;
    const typed = question.typed != null ? question.typed : (question.kind === "add" || question.kind === "sub" || question.kind === "mul" || question.kind === "div") && (level <= 1 ? rng() < 0.2 : rng() < 0.5);
    if (!question.choices) {
      if (!typed) {
        if (question.kind === "money" || question.kind === "time" || question.kind === "skip") {
          const numeric = Number(question.answer);
          if (Number.isFinite(numeric) && String(numeric) === question.answer) {
            question.choices = numericChoices(rng, numeric);
          }
        } else {
          question.choices = numericChoices(rng, Number(question.answer));
        }
      }
    }
    if (question.choices && question.choices.indexOf(question.answer) === -1 && question.kind !== "money" && question.kind !== "time") {
      question.choices[0] = question.answer;
      question.choices = shuffle(rng, question.choices);
    }
    delete question.typed;
    return question;
  }

  function generateRound(level, seed, count, tables) {
    const safeLevel = clamp(level || 2, 1, 6);
    const rng = mulberry32(seed >>> 0);
    const kinds = kindsFor(safeLevel);
    const questions = [];
    let guard = 0;
    while (questions.length < (count || 10) && guard < 80) {
      guard += 1;
      const kind = kinds[questions.length % kinds.length];
      const question = finish(build(kind, safeLevel, rng, tables), safeLevel, rng);
      if (question) questions.push(question);
    }
    return questions;
  }

  function makeTimesQuestion(level, seed, tables) {
    const rng = mulberry32((seed || 1) >>> 0);
    const question = finish(mulQuestion(clamp(level || 2, 1, 6), rng, tables), clamp(level || 2, 1, 6), rng);
    question.choices = numericChoices(rng, Number(question.answer));
    return question;
  }

  function priceQuestion(kind, numbers, seed) {
    const rng = mulberry32((seed || 1) >>> 0);
    const level = clamp(Number(numbers.level) || 2, 1, 6);
    let prompt;
    let answer;
    let worked;
    if (kind === "change") {
      answer = numbers.pay - numbers.total;
      prompt = "The seeds cost " + numbers.total + " coins. You pay with " + numbers.pay + " coins. How much change?";
      worked = numbers.pay + " − " + numbers.total + " = " + answer;
    } else if (level <= 2 && numbers.qty > 1 && numbers.qty <= 6) {
      const parts = [];
      for (let i = 0; i < numbers.qty; i += 1) parts.push(String(numbers.price));
      answer = numbers.price * numbers.qty;
      prompt = "Add the prices: " + parts.join(" + ") + ". What is the total?";
      worked = parts.join(" + ") + " = " + answer;
    } else {
      answer = numbers.price * numbers.qty;
      prompt = numbers.price + " coins × " + numbers.qty + (numbers.qty === 1 ? " seed" : " seeds") + ". What is the total?";
      worked = numbers.price + " × " + numbers.qty + " = " + answer;
    }
    return {
      kind: "shop",
      prompt: prompt,
      answer: String(answer),
      accept: [String(answer)],
      choices: numericChoices(rng, answer),
      worked: worked,
      visual: null
    };
  }

  function dayKey(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
  }

  function searchCharacters(list, query) {
    const text = String(query || "").trim().toLowerCase();
    if (text.length < 2) return { status: "short", results: [] };
    const words = text.split(/\s+/);
    const results = (list || []).filter(function (item) {
      const hay = (item.title + " " + (item.tags || []).join(" ")).toLowerCase();
      return words.every(function (word) { return hay.indexOf(word) >= 0; });
    }).slice(0, 24);
    if (!results.length) return { status: "none", results: [] };
    return { status: "ok", results: results };
  }

  return {
    searchCharacters: searchCharacters,
    generateRound: generateRound,
    makeTimesQuestion: makeTimesQuestion,
    matches: matches,
    starsFor: starsFor,
    nextAdjust: nextAdjust,
    levelForGrade: levelForGrade,
    playingLevel: playingLevel,
    describeLevel: describeLevel,
    tablesForLevel: tablesForLevel,
    priceQuestion: priceQuestion,
    dayKey: dayKey,
    norm: norm,
    mulberry32: mulberry32
  };
});
