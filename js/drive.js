/* Kid-friendly driving sandbox. Vehicle names are generic, with no brand marks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGDrive = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const VEHICLES = [
    { id: "town-car", name: "Town car", price: 0, max: 16, accel: 28, turn: 1.7, wide: 1.5, tall: 0.7, long: 2.6, color: 0x2f7dd1, photo: "assets/vehicles/town-car.svg", kind: "ground" },
    { id: "scooter", name: "Scooter", price: 0, max: 12, accel: 32, turn: 2.3, wide: 0.6, tall: 0.8, long: 1.4, color: 0xf0b429, photo: "assets/vehicles/scooter.svg", kind: "ground" },
    { id: "tractor", name: "Tractor", price: 0, max: 9, accel: 16, turn: 1.1, wide: 1.6, tall: 1.1, long: 2.4, color: 0x2e9b5b, photo: "assets/vehicles/tractor.svg", kind: "ground" },
    { id: "go-kart", name: "Go-kart", price: 20, max: 18, accel: 36, turn: 2.4, wide: 1.1, tall: 0.45, long: 1.8, color: 0xe15d3a, photo: "assets/vehicles/go-kart.svg", kind: "ground" },
    { id: "quad", name: "Quad bike", price: 30, max: 14, accel: 30, turn: 1.9, wide: 1.2, tall: 0.8, long: 1.8, color: 0x7d5cc6, photo: "assets/vehicles/quad.svg", kind: "ground" },
    { id: "taxi", name: "Taxi", price: 35, max: 16, accel: 26, turn: 1.6, wide: 1.5, tall: 0.8, long: 2.7, color: 0xf0b429, photo: "assets/vehicles/taxi.svg", kind: "ground" },
    { id: "motorbike", name: "Motorbike", price: 45, max: 22, accel: 40, turn: 2.2, wide: 0.5, tall: 0.8, long: 1.8, color: 0x1d2a24, photo: "assets/vehicles/motorbike.svg", kind: "ground" },
    { id: "truck", name: "Truck", price: 50, max: 12, accel: 18, turn: 1.05, wide: 1.8, tall: 1.3, long: 3.4, color: 0x8a5a32, photo: "assets/vehicles/truck.svg", kind: "ground" },
    { id: "bus", name: "Bus", price: 55, max: 11, accel: 16, turn: 0.9, wide: 1.8, tall: 1.4, long: 4.2, color: 0xf08a24, photo: "assets/vehicles/bus.svg", kind: "ground" },
    { id: "ice-cream", name: "Ice cream truck", price: 60, max: 10, accel: 15, turn: 1, wide: 1.7, tall: 1.3, long: 3.2, color: 0xf4b4c8, photo: "assets/vehicles/ice-cream.svg", kind: "ground" },
    { id: "dump", name: "Dump truck", price: 70, max: 9, accel: 14, turn: 0.85, wide: 1.9, tall: 1.4, long: 3.6, color: 0xc4a46a, photo: "assets/vehicles/dump.svg", kind: "ground" },
    { id: "digger", name: "Digger", price: 75, max: 8, accel: 14, turn: 0.8, wide: 1.6, tall: 1.3, long: 2.8, color: 0xf0b429, photo: "assets/vehicles/digger.svg", kind: "ground" },
    { id: "fire", name: "Fire engine", price: 80, max: 15, accel: 24, turn: 1.2, wide: 1.7, tall: 1.2, long: 3.6, color: 0xe15d3a, photo: "assets/vehicles/fire.svg", kind: "ground" },
    { id: "ambulance", name: "Ambulance", price: 90, max: 18, accel: 30, turn: 1.5, wide: 1.6, tall: 1.2, long: 3.1, color: 0xf4f1ea, photo: "assets/vehicles/ambulance.svg", kind: "ground" },
    { id: "police", name: "Police car", price: 100, max: 20, accel: 34, turn: 1.8, wide: 1.5, tall: 0.7, long: 2.7, color: 0x1d3d73, photo: "assets/vehicles/police.svg", kind: "ground" },
    { id: "boat", name: "Boat", price: 110, max: 14, accel: 20, turn: 1.1, wide: 1.4, tall: 0.6, long: 3, color: 0x14919b, photo: "assets/vehicles/boat.svg", kind: "water" },
    { id: "monster", name: "Monster truck", price: 130, max: 15, accel: 26, turn: 1.3, wide: 2.1, tall: 1.5, long: 3, color: 0x3d4d3a, photo: "assets/vehicles/monster.svg", kind: "ground" },
    { id: "sports", name: "Sports car", price: 150, max: 24, accel: 42, turn: 2, wide: 1.6, tall: 0.55, long: 2.8, color: 0xf08a24, photo: "assets/vehicles/sports.svg", kind: "ground" },
    { id: "plane", name: "Plane", price: 170, max: 26, accel: 30, turn: 1.2, wide: 2.4, tall: 0.5, long: 2.6, color: 0xd7eef8, photo: "assets/vehicles/plane.svg", kind: "air" },
    { id: "race", name: "Race car", price: 190, max: 28, accel: 48, turn: 2.3, wide: 1.5, tall: 0.45, long: 3, color: 0xf4f1ea, photo: "assets/vehicles/race.svg", kind: "ground" },
    { id: "limo", name: "Limousine", price: 210, max: 14, accel: 18, turn: 0.75, wide: 1.6, tall: 0.7, long: 4.8, color: 0x1d2a24, photo: "assets/vehicles/limo.svg", kind: "ground" },
    { id: "supercar", name: "Red supercar", price: 240, max: 30, accel: 50, turn: 2.1, wide: 1.7, tall: 0.48, long: 3.1, color: 0xc81e1e, photo: "assets/vehicles/supercar.svg", kind: "ground" }
  ];

  function byId(id) {
    return VEHICLES.find(function (item) { return item.id === id; }) || VEHICLES[0];
  }

  function freshCoins() {
    const coins = [];
    for (let n = -30; n <= 30; n += 12) {
      coins.push({ x: n, z: 3.2, taken: false });
      coins.push({ x: 3.2, z: n, taken: false });
    }
    return coins;
  }

  function mount(root, profile, go) {
    let world = null;
    let saveTimer = 0;
    const body = MGUi.shell(root, {
      title: "Vehicle Simulator",
      eyebrow: "Garage",
      profile: profile,
      back: function () { shutdown(); go("menu"); }
    });

    function shutdown() {
      window.clearInterval(saveTimer);
      if (world) world.destroy();
      world = null;
    }

    function garage() {
      shutdown();
      const current = MGStorage.get(profile.id);
      body.innerHTML = "<div class='coin-count'></div><p class='note'>Only a town car, a scooter and a tractor are free. Everything else is bought with coins from the shared wallet. Earn coins in the quiz, on deliveries, by collecting coins on the road, by keeping under speed signs, and by distance driven.</p><div class='row-actions'><button type='button' class='btn secondary quiz'>Quiz for coins</button></div><div class='garage'></div><div class='gate'></div>";
      body.querySelector(".coin-count").textContent = current.farm.coins + " coins";
      body.querySelector(".quiz").addEventListener("click", function () { quiz(current, garage); });
      const grid = body.querySelector(".garage");
      VEHICLES.forEach(function (vehicle) {
        const owned = current.drive.owned.indexOf(vehicle.id) >= 0;
        const card = document.createElement("article");
        card.className = "plot";
        if (vehicle.photo) card.innerHTML = "<img alt='' src='" + vehicle.photo + "'>";
        else card.innerHTML = "<div class='swatch vehicle-swatch' style='background:#" + vehicle.color.toString(16).padStart(6, "0") + "'></div>";
        const title = document.createElement("h3");
        title.textContent = vehicle.name;
        const detail = document.createElement("p");
        detail.textContent = "Speed " + vehicle.max + " · handling " + vehicle.turn.toFixed(1) + (vehicle.price ? " · " + vehicle.price + " coins" : " · Free");
        card.appendChild(title);
        card.appendChild(detail);
        const button = document.createElement("button");
        button.type = "button";
        button.className = owned ? "btn primary" : "btn secondary";
        if (owned) {
          button.textContent = current.drive.using === vehicle.id ? "Drive this one" : "Choose and drive";
          button.addEventListener("click", function () {
            MGStorage.update(profile.id, function (draft) { draft.drive.using = vehicle.id; });
            drive(vehicle);
          });
        } else {
          button.textContent = current.farm.coins >= vehicle.price ? "Buy for " + vehicle.price : "Need " + vehicle.price + " coins";
          button.disabled = current.farm.coins < vehicle.price;
          button.addEventListener("click", function () {
            const latest = MGStorage.get(profile.id);
            if (latest.farm.coins < vehicle.price) return;
            const gate = body.querySelector(".gate");
            const box = document.createElement("div");
            box.className = "modal";
            box.innerHTML = "<div class='panel'><div class='qbox'></div><p class='feedback'></p></div>";
            gate.appendChild(box);
            const item = MGQuestions.priceQuestion("change", {
              total: vehicle.price,
              pay: MGStorage.tenderFor(vehicle.price),
              price: vehicle.price,
              qty: 1,
              level: MGQuestions.playingLevel(latest.grade, latest.maths.adjust)
            }, Date.now());
            MGUi.fillQuestion(box.querySelector(".qbox"), item, function (result) {
              box.querySelector(".feedback").textContent = result.correct ? "Correct. " + item.worked : "Good try. " + item.worked;
              if (!result.correct) return;
              MGStorage.update(profile.id, function (draft) {
                if (!MGStorage.pay(draft, vehicle.price)) return;
                if (draft.drive.owned.indexOf(vehicle.id) < 0) draft.drive.owned.push(vehicle.id);
                draft.drive.using = vehicle.id;
              });
              setTimeout(garage, 500);
            });
          });
        }
        card.appendChild(button);
        grid.appendChild(card);
      });
    }

    function quiz(current, done) {
      const gate = body.querySelector(".gate") || body;
      const box = document.createElement("div");
      box.className = "modal";
      box.innerHTML = "<div class='panel'><p class='note'>Quiz station. A correct answer pays 5 coins.</p><div class='qbox'></div><p class='feedback'></p><button type='button' class='btn ghost close-gate'>Not now</button></div>";
      gate.appendChild(box);
      box.querySelector(".close-gate").addEventListener("click", function () { box.remove(); });
      const item = MGQuestions.generateRound(MGQuestions.playingLevel(current.grade, current.maths.adjust), Date.now() >>> 0, 1)[0];
      MGUi.fillQuestion(box.querySelector(".qbox"), item, function (result) {
        box.querySelector(".feedback").textContent = result.correct ? "Correct. You earned 5 coins. " + item.worked : "Good try. " + item.worked;
        if (result.correct) {
          MGStorage.update(profile.id, function (draft) {
            draft.drive.quizzes += 1;
            MGStorage.earn(draft, 5);
          });
          setTimeout(function () { box.remove(); if (done) done(); }, 600);
        }
      });
    }

    function drive(vehicle) {
      shutdown();
      const current = MGStorage.get(profile.id);
      body.innerHTML = "<div class='drive-hud'><span class='hud-speed'>0 km/h</span><span class='hud-fuel'></span><span class='hud-coins'></span></div><canvas class='stage-canvas' aria-label='Town roads'></canvas><p class='feedback' aria-live='polite'></p><div class='dash-controls'><button type='button' class='btn ghost' data-act='left'>Left</button><button type='button' class='btn secondary' data-act='forward'>Go</button><button type='button' class='btn secondary' data-act='back'>Back</button><button type='button' class='btn ghost' data-act='right'>Right</button><button type='button' class='btn primary' data-act='quiz'>Quiz</button><button type='button' class='btn ghost' data-act='job'>Delivery</button><button type='button' class='btn secondary' data-act='fuel'>Fill tank</button></div><div class='gate'></div>";
      body.querySelector(".hud-coins").textContent = current.farm.coins + " coins";
      body.querySelector(".hud-fuel").textContent = "Fuel " + Math.round(current.drive.fuel);
      const feedback = body.querySelector(".feedback");
      const state = {
        fuel: current.drive.fuel,
        distBank: 0,
        x: 0,
        z: 14,
        coins: freshCoins(),
        signs: [{ x: -18, z: 6, limit: 30, hot: false }, { x: 18, z: -6, limit: 50, hot: false }],
        nearPetrol: false
      };
      let job = null;
      const canvas = body.querySelector("canvas");
      function persist(extra) {
        MGStorage.update(profile.id, function (draft) {
          draft.drive.fuel = state.fuel;
          draft.drive.using = vehicle.id;
          if (extra) extra(draft);
        });
        const latest = MGStorage.get(profile.id);
        body.querySelector(".hud-coins").textContent = latest.farm.coins + " coins";
        body.querySelector(".hud-fuel").textContent = "Fuel " + Math.round(state.fuel);
      }
      MGUi.loadScript("vendor/three.min.js").then(function () {
        if (!window.THREE) return;
        world = boot(canvas, vehicle, state, {
          onCoin: function () {
            persist(function (draft) { MGStorage.earn(draft, 2); });
            feedback.textContent = "Coin collected. 2 coins.";
          },
          onSign: function (sign, kmh) {
            if (kmh <= sign.limit) {
              persist(function (draft) { MGStorage.earn(draft, 3); });
              feedback.textContent = "Under the " + sign.limit + " sign. 3 coins.";
            } else feedback.textContent = "The sign says " + sign.limit + ". You are on " + kmh + ". Slow down.";
          },
          onFrame: function (frame) {
            state.fuel = frame.fuel;
            state.x = frame.x;
            state.z = frame.z;
            state.distBank = frame.distBank;
            body.querySelector(".hud-speed").textContent = frame.kmh + " km/h";
            body.querySelector(".hud-fuel").textContent = "Fuel " + Math.round(frame.fuel);
            if (state.distBank >= 20) {
              const trips = Math.floor(state.distBank / 20);
              state.distBank -= trips * 20;
              persist(function (draft) {
                draft.drive.distance += trips * 20;
                MGStorage.earn(draft, trips);
              });
            }
            if (job === "beach" && frame.nearBeach) {
              job = null;
              persist(function (draft) {
                draft.drive.deliveries += 1;
                MGStorage.earn(draft, 8);
              });
              feedback.textContent = "Delivery done. 8 coins.";
            }
            state.nearPetrol = frame.nearPetrol;
            if (frame.nearPetrol && frame.fuel < 100) feedback.textContent = "Petrol station. Fill the tank costs 6 coins, after a change question.";
            if (frame.fuel <= 0) feedback.textContent = "The tank is empty. You can only creep. Drive to the red petrol station.";
          }
        });
        body.querySelectorAll("[data-act]").forEach(function (button) {
          const act = button.dataset.act;
          if (act === "quiz") {
            button.addEventListener("click", function () {
              quiz(MGStorage.get(profile.id), function () {
                const latest = MGStorage.get(profile.id);
                const coins = body.querySelector(".hud-coins");
                if (coins) coins.textContent = latest.farm.coins + " coins";
              });
            });
            return;
          }
          if (act === "fuel") {
            button.addEventListener("click", function () {
              if (!state.nearPetrol) { feedback.textContent = "Drive to the red petrol station first."; return; }
              if (state.fuel >= 99) { feedback.textContent = "The tank is already full."; return; }
              const price = 6;
              const pay = MGStorage.tenderFor(price);
              const latest = MGStorage.get(profile.id);
              const item = MGQuestions.priceQuestion("change", {
                total: price,
                pay: pay,
                price: price,
                qty: 1,
                level: MGQuestions.playingLevel(latest.grade, latest.maths.adjust)
              }, Date.now() >>> 0);
              const gate = body.querySelector(".gate");
              gate.innerHTML = "<div class='modal'><div class='panel'><p class='note'></p><div class='qbox'></div><p class='feedback'></p><button type='button' class='btn ghost close-gate'>Not now</button></div></div>";
              gate.querySelector(".note").textContent = "Petrol is " + price + " coins. You hand over " + pay + " coins.";
              gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; });
              MGUi.fillQuestion(gate.querySelector(".qbox"), item, function (result) {
                gate.querySelector(".feedback").textContent = result.correct ? "Correct. " + item.worked : "Good try. " + item.worked;
                if (!result.correct) return;
                const purse = MGStorage.get(profile.id);
                if (purse.farm.coins < price) {
                  feedback.textContent = "You need " + price + " coins. Try the quiz station.";
                  gate.innerHTML = "";
                  return;
                }
                state.fuel = 100;
                if (world && world.setFuel) world.setFuel(100);
                persist(function (draft) { MGStorage.pay(draft, price); });
                feedback.textContent = "Tank full. " + item.worked;
                gate.innerHTML = "";
              });
            });
            return;
          }
          if (act === "job") {
            button.addEventListener("click", function () {
              job = "beach";
              feedback.textContent = "Pick up is done. Drive to the sandy beach.";
            });
            return;
          }
          const start = function () { if (world) world.input[act] = true; };
          const stop = function () { if (world) world.input[act] = false; };
          button.addEventListener("pointerdown", start);
          button.addEventListener("pointerup", stop);
          button.addEventListener("pointerleave", stop);
        });
        saveTimer = window.setInterval(function () { persist(); }, 4000);
      }).catch(function () {
        feedback.textContent = "The 3D town could not be loaded on this device.";
      });
    }

    garage();
    return { destroy: shutdown };
  }

  function boot(canvas, vehicle, state, hooks) {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd4f0);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b8f71, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(30, 50, 10);
    scene.add(sun);
    function disc(w, h, x, z, y, color) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: color }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      scene.add(mesh);
    }
    disc(120, 120, 0, 0, 0, 0x7dba6a);
    disc(86, 8, 0, 0, 0.02, 0x4a4e57);
    disc(8, 86, 0, 0, 0.02, 0x4a4e57);
    disc(26, 26, 36, 36, 0.03, 0xe6d2a2);
    disc(18, 18, 46, 46, 0.04, 0x3aa0c8);
    disc(16, 16, -34, -34, 0.03, 0x8a5a32);
    function block(w, h, d, x, y, z, color) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: color }));
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }
    block(8, 5, 8, -16, 2.5, 16, 0xf4f1ea);
    block(8, 4, 8, 16, 2, -18, 0xe7d7c3);
    block(7, 4, 7, 0, 2, -28, 0xf0b429);
    block(8, 3, 6, 24, 1.5, -10, 0xe15d3a);
    const redL = block(0.45, 0.45, 0.45, 6, 3.2, 6, 0x552222);
    const greenL = block(0.45, 0.45, 0.45, 6, 2.4, 6, 0x225522);
    block(0.25, 3.4, 0.25, 6, 1.6, 6, 0x243044);
    state.signs.forEach(function (sign) {
      const board = document.createElement("canvas");
      board.width = 128;
      board.height = 128;
      const pen = board.getContext("2d");
      pen.fillStyle = "#ffffff";
      pen.beginPath();
      pen.arc(64, 64, 58, 0, Math.PI * 2);
      pen.fill();
      pen.lineWidth = 8;
      pen.strokeStyle = "#e15d3a";
      pen.stroke();
      pen.fillStyle = "#1d2a24";
      pen.font = "700 40px sans-serif";
      pen.textAlign = "center";
      pen.textBaseline = "middle";
      pen.fillText(String(sign.limit), 64, 64);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(board) }));
      mesh.position.set(sign.x, 2, sign.z);
      scene.add(mesh);
      block(0.2, 2, 0.2, sign.x, 1, sign.z, 0x888888);
    });
    const rig = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(vehicle.wide, vehicle.tall, vehicle.long), new THREE.MeshLambertMaterial({ color: vehicle.color }));
    bodyMesh.position.y = vehicle.tall / 2 + (vehicle.kind === "water" ? 0.35 : 0.35);
    rig.add(bodyMesh);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(vehicle.wide * 0.72, vehicle.tall * 0.45, vehicle.long * 0.35), new THREE.MeshLambertMaterial({ color: 0xd7eef8 }));
    cabin.position.set(0, vehicle.tall + 0.35, -vehicle.long * 0.08);
    rig.add(cabin);
    scene.add(rig);
    const coinMeshes = state.coins.map(function (coin) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xf0b429 }));
      mesh.position.set(coin.x, 0.45, coin.z);
      scene.add(mesh);
      return mesh;
    });
    let raf = 0;
    let heading = 0;
    let velocity = 0;
    let x = state.x;
    let z = state.z;
    let fuel = state.fuel;
    let distBank = state.distBank;
    const keys = {};
    function down(event) { keys[event.key.toLowerCase()] = true; }
    function up(event) { keys[event.key.toLowerCase()] = false; }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const input = { forward: false, back: false, left: false, right: false };
    function frame() {
      const dt = 0.016;
      const forward = input.forward || keys.arrowup || keys.w;
      const back = input.back || keys.arrowdown || keys.s;
      const left = input.left || keys.arrowleft || keys.a;
      const right = input.right || keys.arrowright || keys.d;
      const onWater = x > 32 && z > 32;
      let cap = vehicle.max * (fuel > 0 ? 1 : 0.12);
      if (vehicle.kind === "water" && !onWater) cap *= 0.25;
      if (vehicle.kind === "ground" && onWater) cap *= 0.2;
      if (forward) velocity += vehicle.accel * dt;
      else if (back) velocity -= vehicle.accel * 0.55 * dt;
      else velocity *= 0.94;
      velocity = Math.max(-cap * 0.35, Math.min(cap, velocity));
      const turn = vehicle.turn * (velocity >= 0 ? 1 : -1);
      if (Math.abs(velocity) > 0.4) {
        if (left) heading += turn * dt;
        if (right) heading -= turn * dt;
      }
      const step = velocity * dt;
      x += Math.sin(heading) * step;
      z += Math.cos(heading) * step;
      x = Math.max(-55, Math.min(55, x));
      z = Math.max(-55, Math.min(55, z));
      const moved = Math.abs(step);
      distBank += moved;
      if (fuel > 0) fuel = Math.max(0, fuel - moved * 0.03);
      const red = Math.floor(Date.now() / 4000) % 2 === 0;
      redL.material.color.setHex(red ? 0xe15d3a : 0x552222);
      greenL.material.color.setHex(red ? 0x225522 : 0x2e9b5b);
      if (red && Math.abs(x) < 4 && Math.abs(z) < 4 && Math.abs(velocity) > 3) velocity *= 0.85;
      const air = vehicle.kind === "air" ? 3.4 : 0;
      rig.position.set(x, air, z);
      rig.rotation.y = heading;
      camera.position.set(x - Math.sin(heading) * 11, air + 5.5, z - Math.cos(heading) * 11);
      camera.lookAt(x, air + 1, z);
      state.coins.forEach(function (coin, index) {
        if (coin.taken) return;
        const dx = coin.x - x;
        const dz = coin.z - z;
        if (dx * dx + dz * dz < 2.4) {
          coin.taken = true;
          coinMeshes[index].visible = false;
          if (hooks.onCoin) hooks.onCoin();
        }
      });
      const kmh = Math.round(Math.abs(velocity) * 8);
      state.signs.forEach(function (sign) {
        const dx = sign.x - x;
        const dz = sign.z - z;
        const near = dx * dx + dz * dz < 7;
        if (near && !sign.hot) {
          sign.hot = true;
          if (hooks.onSign) hooks.onSign(sign, kmh);
        }
        if (!near) sign.hot = false;
      });
      if (hooks.onFrame) {
        hooks.onFrame({
          x: x,
          z: z,
          fuel: fuel,
          kmh: kmh,
          distBank: distBank,
          nearBeach: Math.hypot(x - 36, z - 36) < 12,
          nearPetrol: Math.hypot(x - 24, z + 10) < 8
        });
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function resize() {
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 420;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();
    frame();
    return {
      input: input,
      setFuel: function (value) { fuel = value; },
      destroy: function () {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      }
    };
  }

  return { VEHICLES: VEHICLES, byId: byId, mount: mount };
});
