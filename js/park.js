/* Sunny Steps Park: walk a cartoon playground and answer as you explore. */
(function () {
  const WORLD_W = 1680;
  const WORLD_H = 1100;
  const SPEED = 220;

  const TREES = [
    { x: 150, y: 150, r: 48 },
    { x: 520, y: 120, r: 40 },
    { x: 1500, y: 160, r: 52 },
    { x: 1540, y: 920, r: 46 },
    { x: 90, y: 520, r: 38 },
    { x: 980, y: 980, r: 42 }
  ];

  function spots() {
    return [
      { id: "picnic", name: "Picnic rug", x: 430, y: 250, r: 54, colour: "#f4b4c8" },
      { id: "balloons", name: "Balloon stall", x: 1040, y: 210, r: 54, colour: "#f0b429" },
      { id: "bridge", name: "Willow bridge", x: 620, y: 530, r: 52, colour: "#8a5a32", gate: true },
      { id: "fountain", name: "Coin fountain", x: 1360, y: 500, r: 54, colour: "#7ec8e3" },
      { id: "steps", name: "Garden steps", x: 280, y: 780, r: 54, colour: "#c4a46a" },
      { id: "flowers", name: "Flower ring", x: 1180, y: 860, r: 54, colour: "#e15d3a" }
    ];
  }

  function inPond(x, y) {
    const dx = (x - 820) / 170;
    const dy = (y - 540) / 100;
    return dx * dx + dy * dy < 1;
  }

  function onBridge(x, y) {
    return x > 600 && x < 1040 && y > 500 && y < 580;
  }

  function blocked(x, y, gateOpen) {
    if (x < 46 || y < 46 || x > WORLD_W - 46 || y > WORLD_H - 46) return true;
    for (let i = 0; i < TREES.length; i += 1) {
      const tree = TREES[i];
      const dx = x - tree.x;
      const dy = y - tree.y;
      if (dx * dx + dy * dy < (tree.r + 8) * (tree.r + 8)) return true;
    }
    if (inPond(x, y) && !(gateOpen && onBridge(x, y))) return true;
    return false;
  }

  function animalById(id) {
    const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
    return animals.find(function (animal) { return animal.id === id; }) || null;
  }

  function mount(root, profile, go) {
    let raf = 0;
    let alive = true;
    const keys = {};
    const body = MGUi.shell(root, {
      title: "Sunny Steps Park",
      eyebrow: "Walk and answer",
      profile: profile,
      back: function () { stop(); go("menu"); }
    });

    function stop() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    }

    function onKey(event) {
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down" };
      if (!map[event.key]) return;
      keys[map[event.key]] = event.type === "keydown";
      event.preventDefault();
    }

    function choose() {
      const roster = [
        { id: "me", name: "My avatar", me: true },
        { id: "koala", name: "Koala" },
        { id: "fox", name: "Fox" },
        { id: "penguin", name: "Penguin" },
        { id: "rabbit", name: "Rabbit" },
        { id: "dog", name: "Dog" }
      ];
      body.innerHTML = "<p>Pick who walks the park. Drag the joystick, or use the arrow keys. Step onto a coloured stop and answer to earn coins.</p><div class='animal-grid'></div>";
      const grid = body.querySelector(".animal-grid");
      roster.forEach(function (choice) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "animal-pick";
        if (choice.me) {
          button.innerHTML = MGUi.portrait(profile, "portrait") + "<span>" + MGUi.esc(choice.name) + "</span>";
        } else {
          const animal = animalById(choice.id);
          button.innerHTML = "<img src='" + MGUi.esc(animal ? animal.src : "assets/animals/koala.svg") + "' alt=''><span>" + MGUi.esc(choice.name) + "</span>";
          choice.src = animal ? animal.src : "assets/animals/koala.svg";
        }
        button.addEventListener("click", function () { play(choice); });
        grid.appendChild(button);
      });
    }

    function play(choice) {
      const places = spots();
      const player = { x: 220, y: 900, face: 1 };
      const joy = { x: 0, y: 0, id: null };
      let paused = false;
      let hold = null;
      let retryTimer = 0;
      let seed = (Date.now() % 100000) + 17;
      let camX = 0;
      let camY = 0;
      let last = 0;
      const level = Math.min(3, Math.max(2, MGQuestions.playingLevel(profile.grade, profile.maths.adjust)));

      body.innerHTML = '<div class="park-hud"><span class="coin-line"></span><span class="found-line"></span></div>' +
        '<p class="note park-hint">Drag the yellow joystick. Arrow keys and WASD work too. Walk onto a coloured stop.</p>' +
        '<div class="park-stage">' +
        '<canvas class="park-canvas" aria-label="Sunny Steps Park"></canvas>' +
        '<div class="park-hero"></div>' +
        '<div class="joystick" role="slider" aria-label="Move" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="joystick-knob"></div></div>' +
        '<div class="park-quiz" hidden><p class="park-spot"></p><div class="park-q"></div><p class="note park-note"></p><button type="button" class="btn ghost walk-away">Walk away</button></div>' +
        "</div>";

      const canvas = body.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      const stage = body.querySelector(".park-stage");
      const hero = body.querySelector(".park-hero");
      const stick = body.querySelector(".joystick");
      const knob = body.querySelector(".joystick-knob");
      const quiz = body.querySelector(".park-quiz");
      const coinLine = body.querySelector(".coin-line");
      const foundLine = body.querySelector(".found-line");
      const view = { w: 640, h: 420 };

      if (choice.me && profile.avatar && profile.avatar.mode !== "animal") {
        hero.innerHTML = MGAvatar.svg(profile.avatar.custom);
      } else if (choice.me) {
        const animal = animalById(profile.avatar && profile.avatar.animal) || animalById("koala");
        hero.innerHTML = "<img alt='' src='" + MGUi.esc(animal ? animal.src : "assets/animals/koala.svg") + "'>";
      } else {
        hero.innerHTML = "<img alt='' src='" + MGUi.esc(choice.src) + "'>";
      }

      function purse() {
        return (profile.wallet && profile.wallet.coins) || 0;
      }

      function paintHud() {
        const done = places.filter(function (spot) { return spot.done; }).length;
        coinLine.textContent = purse() + " coins";
        foundLine.textContent = done + " of " + places.length + " stops";
      }

      function resize() {
        const rect = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        view.w = rect.width;
        view.h = rect.height;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function question() {
        seed += 1;
        const round = MGQuestions.generateRound(level, seed, 1);
        return round[0];
      }

      function closeQuiz(leave) {
        window.clearTimeout(retryTimer);
        quiz.hidden = true;
        paused = false;
        hold = leave || null;
      }

      function openQuiz(spot) {
        window.clearTimeout(retryTimer);
        paused = true;
        hold = spot;
        quiz.hidden = false;
        quiz.querySelector(".park-spot").textContent = spot.name;
        quiz.querySelector(".park-note").textContent = "";
        const asked = question();
        MGUi.fillQuestion(quiz.querySelector(".park-q"), asked, function (result) {
          if (!alive) return;
          if (result.correct) {
            spot.done = true;
            const saved = MGStorage.update(profile.id, function (draft) { MGStorage.earn(draft, 5); });
            if (saved) {
              profile.wallet.coins = saved.wallet.coins;
              profile.farm.coins = saved.farm.coins;
            }
            quiz.querySelector(".park-note").textContent = "Lovely. 5 coins for your wallet.";
            paintHud();
            retryTimer = window.setTimeout(function () { closeQuiz(spot); }, 700);
          } else {
            quiz.querySelector(".park-note").textContent = "Not quite. Have another go.";
            retryTimer = window.setTimeout(function () {
              if (alive && !quiz.hidden) openQuiz(spot);
            }, 900);
          }
        });
      }

      quiz.querySelector(".walk-away").addEventListener("click", function () { closeQuiz(hold); });

      function setJoy(clientX, clientY) {
        const rect = stick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const max = rect.width * 0.36;
        const len = Math.hypot(dx, dy) || 1;
        const scale = Math.min(max, len) / len;
        dx *= scale;
        dy *= scale;
        joy.x = dx / max;
        joy.y = dy / max;
        knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      }

      function resetJoy() {
        joy.x = 0;
        joy.y = 0;
        joy.id = null;
        knob.style.transform = "translate(0,0)";
      }

      stick.addEventListener("pointerdown", function (event) {
        stick.setPointerCapture(event.pointerId);
        joy.id = event.pointerId;
        setJoy(event.clientX, event.clientY);
      });
      stick.addEventListener("pointermove", function (event) {
        if (joy.id !== event.pointerId) return;
        setJoy(event.clientX, event.clientY);
      });
      function endJoy(event) {
        if (joy.id !== event.pointerId) return;
        resetJoy();
      }
      stick.addEventListener("pointerup", endJoy);
      stick.addEventListener("pointercancel", endJoy);

      function inputVector() {
        let x = joy.x;
        let y = joy.y;
        if (keys.left) x -= 1;
        if (keys.right) x += 1;
        if (keys.up) y -= 1;
        if (keys.down) y += 1;
        const len = Math.hypot(x, y);
        if (len > 1) { x /= len; y /= len; }
        return { x: x, y: y, moving: len > 0.12 };
      }

      function tryMove(dt) {
        if (paused) return;
        const dir = inputVector();
        hero.classList.toggle("walking", dir.moving);
        if (dir.x < -0.15) player.face = -1;
        else if (dir.x > 0.15) player.face = 1;
        hero.classList.toggle("face-left", player.face < 0);
        const stepX = dir.x * SPEED * dt;
        const stepY = dir.y * SPEED * dt;
        const gate = places.some(function (spot) { return spot.gate && spot.done; });
        if (!blocked(player.x + stepX, player.y, gate)) player.x += stepX;
        if (!blocked(player.x, player.y + stepY, gate)) player.y += stepY;
        let near = null;
        places.forEach(function (spot) {
          if (spot.done) return;
          const dx = player.x - spot.x;
          const dy = player.y - spot.y;
          if (dx * dx + dy * dy < (spot.r + 18) * (spot.r + 18)) near = spot;
        });
        if (hold && near !== hold) {
          const dx = player.x - hold.x;
          const dy = player.y - hold.y;
          if (dx * dx + dy * dy > (hold.r + 36) * (hold.r + 36)) hold = null;
        }
        if (near && near !== hold && !paused) openQuiz(near);
      }

      function draw() {
        ctx.clearRect(0, 0, view.w, view.h);
        ctx.save();
        ctx.translate(-camX, -camY);
        ctx.fillStyle = "#8ed48a";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        ctx.fillStyle = "#b7e38a";
        [[200, 300, 180, 80], [700, 160, 220, 70], [1200, 700, 200, 90], [400, 900, 160, 60]].forEach(function (blob) {
          ctx.beginPath();
          ctx.ellipse(blob[0], blob[1], blob[2], blob[3], 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = "#f3d7a2";
        ctx.lineWidth = 64;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(180, 980);
        ctx.quadraticCurveTo(260, 700, 430, 250);
        ctx.quadraticCurveTo(700, 160, 1040, 210);
        ctx.quadraticCurveTo(1280, 280, 1360, 500);
        ctx.quadraticCurveTo(1100, 700, 1180, 860);
        ctx.stroke();
        ctx.fillStyle = "#7ec8e3";
        ctx.beginPath();
        ctx.ellipse(820, 540, 170, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2f7dd1";
        ctx.lineWidth = 6;
        ctx.stroke();
        if (places.some(function (spot) { return spot.gate && spot.done; })) {
          ctx.strokeStyle = "#c4a46a";
          ctx.lineWidth = 28;
          ctx.beginPath();
          ctx.moveTo(640, 540);
          ctx.lineTo(1000, 540);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#8a5a32";
          ctx.fillRect(700, 500, 16, 80);
          ctx.fillRect(900, 500, 16, 80);
          ctx.fillRect(700, 520, 216, 12);
        }
        ctx.fillStyle = "#f4b4c8";
        ctx.fillRect(390, 210, 90, 54);
        ctx.fillStyle = "#f0b429";
        ctx.beginPath();
        ctx.arc(1000, 170, 16, 0, Math.PI * 2);
        ctx.arc(1040, 150, 18, 0, Math.PI * 2);
        ctx.arc(1080, 172, 14, 0, Math.PI * 2);
        ctx.fill();
        TREES.forEach(function (tree) {
          ctx.fillStyle = "#6b4423";
          ctx.fillRect(tree.x - 6, tree.y - 8, 12, 28);
          ctx.fillStyle = "#2e9b5b";
          ctx.beginPath();
          ctx.arc(tree.x, tree.y - 18, tree.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#243044";
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        places.forEach(function (spot) {
          ctx.beginPath();
          ctx.arc(spot.x, spot.y, spot.done ? 18 : 28, 0, Math.PI * 2);
          ctx.fillStyle = spot.done ? "#fff" : spot.colour;
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#243044";
          ctx.stroke();
          ctx.fillStyle = "#243044";
          ctx.font = "700 16px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(spot.done ? "Done" : spot.name, spot.x, spot.y + 48);
        });
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 4, 26, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function frame(now) {
        if (!alive) return;
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
        last = now;
        tryMove(dt);
        const targetX = Math.max(0, Math.min(WORLD_W - view.w, player.x - view.w / 2));
        const targetY = Math.max(0, Math.min(WORLD_H - view.h, player.y - view.h * 0.62));
        camX += (targetX - camX) * Math.min(1, dt * 6);
        camY += (targetY - camY) * Math.min(1, dt * 6);
        draw();
        hero.style.left = (player.x - camX) + "px";
        hero.style.top = (player.y - camY) + "px";
        raf = requestAnimationFrame(frame);
      }

      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      window.addEventListener("resize", resize);
      const oldStop = stop;
      stop = function () {
        window.removeEventListener("resize", resize);
        window.clearTimeout(retryTimer);
        oldStop();
      };
      resize();
      paintHud();
      raf = requestAnimationFrame(frame);
    }

    choose();
  }

  const api = { mount: mount, blocked: blocked, inPond: inPond };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.MGPark = api;
})();
