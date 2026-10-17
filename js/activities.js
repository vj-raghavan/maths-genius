/* Pet shop, memory, treasure, daily puzzle, badges, bake shop, zoo, bingo, fishing and the boutique. */
(function () {
  function levelOf(profile) {
    return MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
  }

  function question(profile, salt) {
    return MGQuestions.generateRound(levelOf(profile), (salt || Date.now()) >>> 0, 1)[0];
  }

  function meter(then, now) {
    const minutes = Math.max(0, (now - (then || now)) / 60000);
    return Math.max(0, Math.min(100, Math.round(100 - minutes * 8)));
  }

  function ask(host, profile, item, onYes) {
    const gate = host.querySelector(".gate") || host;
    const box = document.createElement("div");
    box.className = "modal";
    box.innerHTML = "<div class='panel'><div class='qbox'></div><p class='feedback'></p><button type='button' class='btn ghost close-gate'>Not now</button></div>";
    gate.appendChild(box);
    box.querySelector(".close-gate").addEventListener("click", function () { box.remove(); });
    MGUi.fillQuestion(box.querySelector(".qbox"), item, function (result) {
      const feedback = box.querySelector(".feedback");
      if (result.correct) {
        feedback.textContent = "Correct. " + item.worked;
        feedback.className = "feedback good";
        onYes();
        setTimeout(function () { box.remove(); }, 500);
      } else {
        feedback.textContent = "Good try. " + item.worked;
        feedback.className = "feedback bad";
      }
    });
  }

  function petMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Pet Shop", eyebrow: "Care and coins", profile: profile, back: function () { go("menu"); } });
    body.innerHTML = "<div class='coin-count'></div><p class='note'>Answer a question to earn coins, then adopt a pet. Feed, play and clean to keep the meters up. They drop as time passes, even if you leave.</p><div class='row-actions'><button type='button' class='btn primary earn'>Answer to earn 4 coins</button></div><div class='pet-list'></div><div class='gate'></div>";
    const list = body.querySelector(".pet-list");
    function render() {
      const current = MGStorage.get(profile.id);
      const now = Date.now();
      body.querySelector(".coin-count").textContent = current.farm.coins + " coins";
      list.innerHTML = "";
      const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
      animals.forEach(function (animal, index) {
        const card = document.createElement("article");
        card.className = "plot";
        const owned = current.pets.owned[animal.id];
        card.innerHTML = "<img alt=''><h3></h3>";
        card.querySelector("img").src = animal.src;
        card.querySelector("img").alt = animal.name;
        card.querySelector("h3").textContent = animal.name;
        if (!owned) {
          const cost = 10 + index * 2;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn secondary";
          button.textContent = "Adopt for " + cost + " coins";
          button.addEventListener("click", function () {
            const latest = MGStorage.get(profile.id);
            if (latest.farm.coins < cost) return;
            const pay = MGStorage.tenderFor(cost);
            ask(body, profile, MGQuestions.priceQuestion("change", { total: cost, pay: pay, price: cost, qty: 1, level: levelOf(latest) }, Date.now()), function () {
              MGStorage.update(profile.id, function (draft) {
                if (!MGStorage.pay(draft, cost)) return;
                const stamp = Date.now();
                draft.pets.owned[animal.id] = { fed: stamp, played: stamp, cleaned: stamp };
              });
              render();
            });
          });
          card.appendChild(button);
        } else {
          [["fed", "Feed"], ["played", "Play"], ["cleaned", "Clean"]].forEach(function (pair) {
            const row = document.createElement("p");
            row.textContent = pair[1] + " " + meter(owned[pair[0]], now);
            card.appendChild(row);
            const bar = document.createElement("div");
            bar.className = "bar";
            bar.innerHTML = "<span style='width:" + meter(owned[pair[0]], now) + "%'></span>";
            card.appendChild(bar);
          });
          const care = document.createElement("div");
          care.className = "chip-row";
          [["fed", "Feed"], ["played", "Play"], ["cleaned", "Clean"]].forEach(function (pair) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn ghost";
            button.textContent = pair[1];
            button.addEventListener("click", function () {
              MGStorage.update(profile.id, function (draft) {
                if (draft.pets.owned[animal.id]) draft.pets.owned[animal.id][pair[0]] = Date.now();
                MGStorage.earn(draft, 1);
              });
              render();
            });
            care.appendChild(button);
          });
          card.appendChild(care);
        }
        list.appendChild(card);
      });
    }
    body.querySelector(".earn").addEventListener("click", function () {
      const current = MGStorage.get(profile.id);
      ask(body, current, question(current, Date.now()), function () {
        MGStorage.update(profile.id, function (draft) { MGStorage.earn(draft, 4); });
        render();
      });
    });
    render();
    return { destroy: function () {} };
  }

  function memoryMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Memory Match", eyebrow: "Pairs", profile: profile, back: function () { go("menu"); } });
    let lock = false;
    function deal() {
      const current = MGStorage.get(profile.id);
      const lvl = levelOf(current);
      const pairs = lvl <= 2 ? 4 : 6;
      const cards = [];
      const rng = MGQuestions.mulberry32((Date.now() ^ pairs) >>> 0);
      for (let i = 0; i < pairs; i += 1) {
        const item = MGQuestions.makeTimesQuestion(lvl, (Date.now() + i * 17) >>> 0);
        cards.push({ id: i, text: item.prompt.replace("What is ", "").replace("?", ""), kind: "q" });
        cards.push({ id: i, text: item.answer, kind: "a" });
      }
      for (let i = cards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const swap = cards[i];
        cards[i] = cards[j];
        cards[j] = swap;
      }
      let moves = 0;
      let open = [];
      let cleared = 0;
      body.innerHTML = "<p class='note'>Best clears " + current.memory.clears + ". Flip two cards. Match a sum or times fact with its answer.</p><p class='moves'>Moves 0</p><div class='memory-grid'></div>";
      const grid = body.querySelector(".memory-grid");
      cards.forEach(function (card, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-card";
        button.textContent = "Card";
        button.addEventListener("click", function () {
          if (lock || button.classList.contains("open") || button.classList.contains("gone")) return;
          button.classList.add("open");
          button.textContent = card.text;
          open.push({ button: button, card: card, index: index });
          if (open.length < 2) return;
          moves += 1;
          body.querySelector(".moves").textContent = "Moves " + moves;
          const first = open[0];
          const second = open[1];
          open = [];
          if (first.card.id === second.card.id && first.index !== second.index) {
            first.button.classList.add("gone");
            second.button.classList.add("gone");
            cleared += 1;
            if (cleared === pairs) {
              MGStorage.update(profile.id, function (draft) {
                draft.memory.clears += 1;
                if (!draft.memory.best || moves < draft.memory.best) draft.memory.best = moves;
                MGStorage.earn(draft, 5);
              });
              const done = document.createElement("p");
              done.textContent = "All pairs found in " + moves + " moves. You earned 5 coins.";
              body.appendChild(done);
              const again = document.createElement("button");
              again.type = "button";
              again.className = "btn primary";
              again.textContent = "New board";
              again.addEventListener("click", deal);
              body.appendChild(again);
            }
          } else {
            lock = true;
            setTimeout(function () {
              first.button.classList.remove("open");
              second.button.classList.remove("open");
              first.button.textContent = "Card";
              second.button.textContent = "Card";
              lock = false;
            }, 700);
          }
        });
        grid.appendChild(button);
      });
    }
    deal();
    return { destroy: function () {} };
  }

  function treasureMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Treasure Hunt", eyebrow: "Island", profile: profile, back: function () { go("menu"); } });
    const size = 6;
    const props = (window.MG_LIBRARY && MG_LIBRARY.props) || {};
    const coin = ((window.MG_LIBRARY && MG_LIBRARY.money) || []).find(function (item) { return item.kind === "coin"; });
    let spot = 0;
    let chest = size * size - 1;
    function render() {
      body.innerHTML = "<p class='note'>Move to a next square by answering a puzzle. The treasure is the coin on the far side. Found " + MGStorage.get(profile.id).treasure.found + " times.</p><div class='island'></div><div class='gate'></div>";
      const grid = body.querySelector(".island");
      for (let index = 0; index < size * size; index += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "island-cell";
        const near = Math.abs((index % size) - (spot % size)) + Math.abs(Math.floor(index / size) - Math.floor(spot / size));
        if (props.grass) {
          cell.style.backgroundImage = "url(" + (index === chest && coin ? coin.src : props.grass) + ")";
        }
        if (index === spot) cell.textContent = "You";
        else if (index === chest) cell.textContent = "Treasure";
        else cell.textContent = near === 1 ? "Go" : "";
        cell.disabled = near !== 1;
        cell.addEventListener("click", function () {
          const current = MGStorage.get(profile.id);
          ask(body, current, question(current, Date.now() ^ index), function () {
            spot = index;
            if (spot === chest) {
              MGStorage.update(profile.id, function (draft) {
                draft.treasure.found += 1;
                MGStorage.earn(draft, 8);
              });
              spot = 0;
              chest = size * size - 1 - (MGStorage.get(profile.id).treasure.found % (size - 1));
            }
            render();
          });
        });
        grid.appendChild(cell);
      }
    }
    render();
    return { destroy: function () {} };
  }

  function dayKey(date) {
    return MGQuestions.dayKey(date);
  }

  function yesterdayKey(date) {
    return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
  }

  function dailyMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Daily Challenge", eyebrow: "One puzzle a day", profile: profile, back: function () { go("menu"); } });
    const today = dayKey(new Date());
    const seed = today.split("").reduce(function (sum, char) { return sum + char.charCodeAt(0); }, 0) * 97;
    const current = MGStorage.get(profile.id);
    const done = current.daily.last === today;
    body.innerHTML = "<p class='note'></p><div class='qbox'></div><p class='feedback'></p><p class='count'></p>";
    body.querySelector(".note").textContent = "Streak " + current.daily.streak + ". This puzzle is the same all day on this device. It changes after midnight.";
    if (done) {
      body.querySelector(".feedback").textContent = "You have finished today's puzzle. Come back tomorrow to keep the streak.";
      return { destroy: function () {} };
    }
    const round = MGQuestions.generateRound(levelOf(current), seed >>> 0, 5);
    let index = 0;
    let correct = 0;
    const count = body.querySelector(".count");
    function step() {
      if (index >= round.length) {
        MGStorage.update(profile.id, function (draft) {
          const prior = draft.daily.last;
          draft.daily.streak = prior === yesterdayKey(new Date()) ? draft.daily.streak + 1 : 1;
          draft.daily.last = today;
          MGStorage.earn(draft, correct);
        });
        body.querySelector(".qbox").innerHTML = "";
        body.querySelector(".feedback").textContent = "Today's puzzle is done. " + correct + " of 5. Streak " + MGStorage.get(profile.id).daily.streak + ".";
        return;
      }
      count.textContent = "Question " + (index + 1) + " of 5";
      MGUi.fillQuestion(body.querySelector(".qbox"), round[index], function (result) {
        if (result.correct) correct += 1;
        body.querySelector(".feedback").textContent = result.correct ? "Correct." : round[index].worked;
        index += 1;
        setTimeout(step, 400);
      });
    }
    step();
    return { destroy: function () {} };
  }

  const BADGES = [
    { id: "star", game: "Maths Genius", name: "First stars", test: function (p) { return p.maths.stars >= 1; } },
    { id: "perfect", game: "Maths Genius", name: "Perfect round", test: function (p) { return p.maths.best >= 10; } },
    { id: "blocks", game: "3D Builder", name: "Builder", test: function (p) { return p.builder.blocks.length >= 1; } },
    { id: "tower", game: "3D Builder", name: "Tall build", test: function (p) { return p.builder.blocks.length >= 12; } },
    { id: "plant", game: "Grow a Farm", name: "Gardener", test: function (p) { return p.farm.planted >= 1; } },
    { id: "harvest", game: "Grow a Farm", name: "Harvest", test: function (p) { return p.farm.harvests >= 1; } },
    { id: "rare", game: "Grow a Farm", name: "Rare crop", test: function (p) { return p.farm.rare >= 1; } },
    { id: "escape", game: "Speed Escape", name: "Escaped", test: function (p) { return p.escape.bestScore >= 20; } },
    { id: "dash", game: "Animal Dash", name: "Runner", test: function (p) { return p.dash.highScore >= 10; } },
    { id: "blocky", game: "Blocky Multiplication", name: "Block star", test: function (p) { return p.blocky.highScore >= 20 || !!p.blocky.characterId; } },
    { id: "xo", game: "Tic Tac Toe", name: "Three in a row", test: function (p) { return p.tictactoe.wins >= 1; } },
    { id: "pet", game: "Pet Shop", name: "Adopted", test: function (p) { return Object.keys(p.pets.owned).length >= 1; } },
    { id: "memory", game: "Memory Match", name: "Matched", test: function (p) { return p.memory.clears >= 1; } },
    { id: "chest", game: "Treasure Hunt", name: "Treasure", test: function (p) { return p.treasure.found >= 1; } },
    { id: "streak", game: "Daily Challenge", name: "Three-day streak", test: function (p) { return p.daily.streak >= 3; } },
    { id: "bake", game: "Bake Shop", name: "Baker", test: function (p) { return p.bake.served >= 1; } },
    { id: "zoo", game: "Zoo Keeper", name: "Keeper", test: function (p) { return p.zoo.built >= 1; } },
    { id: "bingo", game: "Maths Bingo", name: "Bingo line", test: function (p) { return p.bingo.lines >= 1; } },
    { id: "fish", game: "Fishing", name: "Angler", test: function (p) { return p.fish.caught >= 3; } },
    { id: "outfit", game: "Dress-up Boutique", name: "Dressed up", test: function (p) { return p.outfit.owned.length >= 1; } },
    { id: "drive", game: "Vehicle Simulator", name: "Driver", test: function (p) { return p.drive.distance >= 20 || p.drive.deliveries >= 1; } },
    { id: "garage", game: "Vehicle Simulator", name: "Full garage", test: function (p) { return p.drive.owned.length >= 8; } }
  ];

  function badgeMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Badges and Trophies", eyebrow: "Everything you have earned", profile: profile, back: function () { go("menu"); } });
    const current = MGStorage.get(profile.id);
    body.innerHTML = "<p class='note'>Badges are worked out from what this player has done on this device.</p><div class='badge-grid'></div>";
    const grid = body.querySelector(".badge-grid");
    BADGES.forEach(function (badge) {
      const card = document.createElement("article");
      const earned = badge.test(current);
      card.className = "plot" + (earned ? "" : " locked");
      card.innerHTML = "<h3></h3><p></p><p class='note'></p>";
      card.querySelector("h3").textContent = badge.name;
      card.querySelector("p").textContent = badge.game;
      card.querySelector(".note").textContent = earned ? "Earned" : "Not yet";
      grid.appendChild(card);
    });
    return { destroy: function () {} };
  }

  function bakeMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Bake Shop", eyebrow: "Measure and change", profile: profile, back: function () { go("menu"); } });
    const crops = (window.MG_LIBRARY && MG_LIBRARY.crops) || [];
    const notes = ((window.MG_LIBRARY && MG_LIBRARY.money) || []).filter(function (item) { return item.kind === "note"; });
    function serve() {
      const current = MGStorage.get(profile.id);
      const lvl = levelOf(current);
      const whole = lvl <= 2 ? 4 + (lvl * 2) : 8 + lvl * 2;
      const half = whole / 2;
      const crop = crops[Math.floor(Math.random() * crops.length)] || { name: "strawberry", src: "" };
      const price = 4 + lvl;
      const note = notes.find(function (item) { return item.cents >= price * 100; }) || notes[notes.length - 1];
      const pay = note ? Math.round(note.cents / 100) : 10;
      body.innerHTML = "<p class='note'>Served " + current.bake.served + ".</p><div class='bake-row'></div><div class='qbox'></div><p class='feedback'></p><div class='gate'></div>";
      const row = body.querySelector(".bake-row");
      if (crop.src) row.innerHTML = "<img alt='' src='" + MGUi.esc(crop.src) + "'>";
      if (note) row.innerHTML += "<img alt='' src='" + MGUi.esc(note.src) + "'>";
      const steps = [
        {
          prompt: "The recipe needs half of " + whole + " " + crop.name.toLowerCase() + "s. How many is that?",
          answer: String(half),
          accept: [String(half)],
          choices: [String(half), String(half + 1), String(Math.max(1, half - 1)), String(whole)].filter(function (value, index, list) { return list.indexOf(value) === index; }),
          worked: "Half of " + whole + " is " + half + "."
        },
        MGQuestions.priceQuestion("change", { total: price, pay: pay, price: price, qty: 1, level: lvl }, Date.now())
      ];
      let index = 0;
      function step() {
        if (index >= steps.length) {
          MGStorage.update(profile.id, function (draft) {
            draft.bake.served += 1;
            MGStorage.earn(draft, 3);
          });
          body.querySelector(".feedback").textContent = "The customer is happy. You earned 3 coins.";
          const again = document.createElement("button");
          again.type = "button";
          again.className = "btn primary";
          again.textContent = "Next customer";
          again.addEventListener("click", serve);
          body.appendChild(again);
          return;
        }
        const item = steps[index];
        if (index === 1) item.prompt = "The cake costs " + price + " coins. They pay with " + pay + (note ? " (" + note.name + ")" : "") + ". How much change?";
        MGUi.fillQuestion(body.querySelector(".qbox"), item, function (result) {
          body.querySelector(".feedback").textContent = result.correct ? "Correct. " + item.worked : "Good try. " + item.worked;
          if (result.correct) {
            index += 1;
            setTimeout(step, 400);
          }
        });
      }
      step();
    }
    serve();
    return { destroy: function () {} };
  }

  function zooMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Zoo Keeper", eyebrow: "Area and counting", profile: profile, back: function () { go("menu"); } });
    const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
    function pen() {
      const current = MGStorage.get(profile.id);
      const lvl = levelOf(current);
      const rows = lvl <= 2 ? 2 : 2 + (lvl % 3);
      const cols = lvl <= 2 ? 3 : 3 + (lvl % 4);
      const area = rows * cols;
      const animal = animals[lvl % Math.max(1, animals.length)] || { name: "animal", src: "" };
      body.innerHTML = "<p class='note'>Pens built " + current.zoo.built + ".</p><div class='qbox'></div><p class='feedback'></p><div class='zoo-grid'></div>";
      const item = {
        prompt: "The pen has " + rows + " rows of " + cols + " squares. What is the area?",
        answer: String(area),
        accept: [String(area)],
        choices: [String(area), String(area + cols), String(rows + cols), String(Math.max(1, area - 1))],
        worked: rows + " × " + cols + " = " + area
      };
      MGUi.fillQuestion(body.querySelector(".qbox"), item, function (result) {
        body.querySelector(".feedback").textContent = result.correct ? "Correct. " + item.worked : "Good try. " + item.worked;
        if (!result.correct) return;
        const grid = body.querySelector(".zoo-grid");
        grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
        let placed = 0;
        const rng = MGQuestions.mulberry32((Date.now() ^ area) >>> 0);
        for (let i = 0; i < area; i += 1) {
          const cell = document.createElement("div");
          cell.className = "zoo-cell";
          if (rng() > 0.45) {
            placed += 1;
            if (animal.src) cell.innerHTML = "<img alt='" + MGUi.esc(animal.name) + "' src='" + MGUi.esc(animal.src) + "'>";
            else cell.textContent = animal.name;
          }
          grid.appendChild(cell);
        }
        const countQ = {
          prompt: "How many " + animal.name.toLowerCase() + "s are in the pen?",
          answer: String(placed),
          accept: [String(placed)],
          choices: [String(placed), String(placed + 1), String(Math.max(0, placed - 1)), String(area)],
          worked: "There are " + placed + "."
        };
        setTimeout(function () {
          MGUi.fillQuestion(body.querySelector(".qbox"), countQ, function (second) {
            body.querySelector(".feedback").textContent = second.correct ? "Correct. The pen is ready." : "Good try. " + countQ.worked;
            if (!second.correct) return;
            MGStorage.update(profile.id, function (draft) {
              draft.zoo.built += 1;
              MGStorage.earn(draft, 4);
            });
            const again = document.createElement("button");
            again.type = "button";
            again.className = "btn primary";
            again.textContent = "Build another pen";
            again.addEventListener("click", pen);
            body.appendChild(again);
          });
        }, 400);
      });
    }
    pen();
    return { destroy: function () {} };
  }

  function bingoMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Maths Bingo", eyebrow: "Mark the answers", profile: profile, back: function () { go("menu"); } });
    const current = MGStorage.get(profile.id);
    const lvl = levelOf(current);
    const pool = [];
    for (let i = 0; i < 16; i += 1) pool.push(MGQuestions.makeTimesQuestion(lvl, (100 + i * 13) >>> 0));
    const card = pool.slice(0, 9);
    const marked = {};
    body.innerHTML = "<p class='note'>Lines " + current.bingo.lines + ". Answer the call. If that answer is on your card, it is marked.</p><div class='bingo-grid'></div><div class='qbox'></div><p class='feedback'></p>";
    const grid = body.querySelector(".bingo-grid");
    card.forEach(function (item, index) {
      const cell = document.createElement("div");
      cell.className = "bingo-cell";
      cell.textContent = item.answer;
      cell.dataset.index = String(index);
      grid.appendChild(cell);
    });
    let call = 0;
    function next() {
      if (call >= pool.length) return;
      const item = pool[call];
      call += 1;
      MGUi.fillQuestion(body.querySelector(".qbox"), item, function (result) {
        body.querySelector(".feedback").textContent = result.correct ? "Correct. " + item.worked : "Good try. " + item.worked;
        if (result.correct) {
          card.forEach(function (cell, index) {
            if (cell.answer === item.answer) {
              marked[index] = true;
              grid.children[index].classList.add("on");
            }
          });
          const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
          ];
          const won = lines.some(function (line) { return line.every(function (index) { return marked[index]; }); });
          if (won) {
            MGStorage.update(profile.id, function (draft) {
              draft.bingo.lines += 1;
              MGStorage.earn(draft, 6);
            });
            body.querySelector(".feedback").textContent = "Bingo! You earned 6 coins.";
            return;
          }
        }
        setTimeout(next, 500);
      });
    }
    next();
    return { destroy: function () {} };
  }

  function fishMount(root, profile, go) {
    let timer = 0;
    const body = MGUi.shell(root, { title: "Fishing", eyebrow: "Catch the right answer", profile: profile, back: function () { window.clearTimeout(timer); go("menu"); } });
    const photos = ["assets/characters/fish-1.svg", "assets/characters/dolphin-1.svg", "assets/characters/whale-1.svg", "assets/characters/crab-1.svg"];
    function cast() {
      const current = MGStorage.get(profile.id);
      const item = MGQuestions.makeTimesQuestion(levelOf(current), Date.now() >>> 0);
      const answers = item.choices ? item.choices.slice(0, 4) : [item.answer, String(Number(item.answer) + 1), String(Math.max(0, Number(item.answer) - 1)), String(Number(item.answer) + 2)];
      body.innerHTML = "<p class='note'>Caught " + current.fish.caught + ".</p><h2 class='prompt'></h2><div class='pond'></div><p class='feedback'></p>";
      body.querySelector(".prompt").textContent = item.prompt;
      const pond = body.querySelector(".pond");
      answers.forEach(function (value, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fish";
        button.style.top = (12 + index * 18) + "%";
        button.innerHTML = "<img alt='' src='" + photos[index % photos.length] + "'><span></span>";
        button.querySelector("span").textContent = value;
        button.addEventListener("click", function () {
          const right = MGQuestions.matches(item, value);
          body.querySelector(".feedback").textContent = right ? "You caught it. " + item.worked : "That fish got away. " + item.worked;
          if (right) {
            MGStorage.update(profile.id, function (draft) {
              draft.fish.caught += 1;
              MGStorage.earn(draft, 2);
            });
          }
          window.clearTimeout(timer);
          timer = window.setTimeout(cast, 700);
        });
        pond.appendChild(button);
      });
    }
    cast();
    return { destroy: function () { window.clearTimeout(timer); } };
  }

  const OUTFITS = [
    { id: "scarf", name: "Scarf", cost: 8 },
    { id: "bow", name: "Bow", cost: 10 },
    { id: "band", name: "Head band", cost: 12 },
    { id: "specs", name: "Round specs", cost: 16 },
    { id: "flower", name: "Flower crown", cost: 18 },
    { id: "cape", name: "Cape", cost: 24 }
  ];

  function boutiqueMount(root, profile, go) {
    const body = MGUi.shell(root, { title: "Dress-up Boutique", eyebrow: "Outfits", profile: profile, back: function () { go("menu"); } });
    function render() {
      const current = MGStorage.get(profile.id);
      body.innerHTML = "<div class='coin-count'></div><div class='avatar-stage'></div><p class='note'>Coins from every game are in one wallet. What you wear shows on your portrait in every game.</p><div class='shop-list'></div>";
      body.querySelector(".coin-count").textContent = current.farm.coins + " coins";
      body.querySelector(".avatar-stage").innerHTML = MGUi.portrait(current, "portrait");
      const list = body.querySelector(".shop-list");
      OUTFITS.forEach(function (item) {
        const owned = current.outfit.owned.indexOf(item.id) >= 0;
        const wearing = current.outfit.wearing.indexOf(item.id) >= 0;
        const row = document.createElement("div");
        row.className = "shop-item";
        const info = document.createElement("div");
        info.innerHTML = "<strong></strong><div class='note'></div>";
        info.querySelector("strong").textContent = item.name;
        info.querySelector(".note").textContent = owned ? (wearing ? "Wearing" : "Owned") : item.cost + " coins";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn secondary";
        button.textContent = owned ? (wearing ? "Take off" : "Wear") : "Buy";
        button.addEventListener("click", function () {
          if (!owned) {
            const latest = MGStorage.get(profile.id);
            if (latest.farm.coins < item.cost) return;
            ask(body, latest, MGQuestions.priceQuestion("change", { total: item.cost, pay: MGStorage.tenderFor(item.cost), price: item.cost, qty: 1, level: levelOf(latest) }, Date.now()), function () {
              MGStorage.update(profile.id, function (draft) {
                if (!MGStorage.pay(draft, item.cost)) return;
                draft.outfit.owned.push(item.id);
                draft.outfit.wearing.push(item.id);
              });
              render();
            });
            return;
          }
          MGStorage.update(profile.id, function (draft) {
            const has = draft.outfit.wearing.indexOf(item.id) >= 0;
            draft.outfit.wearing = has ? draft.outfit.wearing.filter(function (id) { return id !== item.id; }) : draft.outfit.wearing.concat([item.id]);
          });
          render();
        });
        row.appendChild(info);
        row.appendChild(button);
        list.appendChild(row);
      });
    }
    render();
    return { destroy: function () {} };
  }

  window.MGPet = { mount: petMount };
  window.MGMemory = { mount: memoryMount };
  window.MGTreasure = { mount: treasureMount };
  window.MGDaily = { mount: dailyMount, dayKey: dayKey };
  window.MGBadges = { mount: badgeMount, BADGES: BADGES };
  window.MGBake = { mount: bakeMount };
  window.MGZoo = { mount: zooMount };
  window.MGBingo = { mount: bingoMount };
  window.MGFish = { mount: fishMount };
  window.MGBoutique = { mount: boutiqueMount, OUTFITS: OUTFITS };
})();
