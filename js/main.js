(function () {
  const app = document.getElementById("app");
  const sessionKey = "mg-player";
  let destroy = function () {};

  function current() {
    const id = sessionStorage.getItem(sessionKey);
    return id ? MGStorage.get(id) : null;
  }

  function remember(id) {
    if (id) sessionStorage.setItem(sessionKey, id);
    else sessionStorage.removeItem(sessionKey);
  }

  function show(build) {
    destroy();
    destroy = function () {};
    app.innerHTML = "";
    const handle = build(app) || {};
    destroy = handle.destroy || function () {};
    window.scrollTo(0, 0);
  }

  function home() {
    show(function (root) {
      const body = MGUi.shell(root, { title: "Who is playing?", eyebrow: "Maths Genius" });
      const people = MGStorage.all();
      body.innerHTML = '<p class="lede">A handful of games for Australian primary years. Names, ages and scores stay on this device.</p><div class="profile-grid"></div><div class="row-actions"><button type="button" class="btn primary add">Add a player</button></div>';
      const grid = body.querySelector(".profile-grid");
      if (!people.length) {
        grid.innerHTML = '<div class="empty"><h2>No players yet</h2><p>Add your name, year and an avatar to begin.</p></div>';
      }
      people.forEach(function (profile) {
        const card = document.createElement("article");
        card.className = "profile-card";
        card.innerHTML = MGUi.portrait(profile) + "<h2></h2><p></p><p></p>";
        card.querySelector("h2").textContent = profile.name;
        card.querySelectorAll("p")[0].textContent = MGStorage.gradeLabel(profile.grade) + " · age " + profile.age;
        card.querySelectorAll("p")[1].innerHTML = MGUi.starRow(Math.min(3, profile.maths.stars), 3) + " " + profile.maths.stars + " stars";
        const play = document.createElement("button");
        play.type = "button";
        play.className = "btn primary wide";
        play.textContent = "Play";
        play.addEventListener("click", function () { remember(profile.id); menu(); });
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "btn ghost wide";
        edit.textContent = "Edit";
        edit.addEventListener("click", function () { editor(profile.id); });
        card.appendChild(play);
        card.appendChild(edit);
        grid.appendChild(card);
      });
      body.querySelector(".add").addEventListener("click", function () { editor(null); });
    });
  }

  function editor(profileId) {
    show(function (root) {
      const existing = profileId ? MGStorage.get(profileId) : null;
      const draft = existing ? JSON.parse(JSON.stringify(existing)) : MGStorage.blankProfile();
      if (!existing) {
        draft.name = "";
        draft.grade = "";
        draft.age = 0;
      }
      const body = MGUi.shell(root, {
        title: existing ? "Edit player" : "New player",
        eyebrow: "Your profile stays on this device",
        back: home
      });
      body.innerHTML = '<form class="creator-form"><div class="creator"><div class="avatar-stage"></div><div><label class="field">Name<input class="name-input" maxlength="24" autocomplete="nickname" required></label>' +
        '<div class="field"><span>Grade</span><div class="chip-row grades"></div></div>' +
        '<div class="field"><span>Age</span><div class="chip-row ages"></div></div>' +
        '<div class="chip-row"><button type="button" class="chip tab on" data-tab="draw">Design an avatar</button><button type="button" class="chip tab" data-tab="animal">Animal photo</button></div>' +
        '<div class="draw-box"></div><div class="animal-box hidden"></div>' +
        '<p class="note">Age and grade are used only to choose a starting maths level. They are never sent anywhere.</p>' +
        '<p class="warn note"></p><div class="row-actions"><button class="btn primary" type="submit">Save player</button>' +
        (existing ? '<button class="btn danger remove" type="button">Remove this player</button>' : "") +
        "</div></div></div></form>";
      const stage = body.querySelector(".avatar-stage");
      const warn = body.querySelector(".warn");
      body.querySelector(".name-input").value = existing ? existing.name : "";

      function paint() {
        if (draft.avatar.mode === "animal") {
          const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
          const found = animals.find(function (animal) { return animal.id === draft.avatar.animal; }) || animals[0];
          stage.innerHTML = found ? '<img class="portrait" style="width:180px;height:180px" src="' + MGUi.esc(found.src) + '" alt="' + MGUi.esc(found.name) + '">' : "";
        } else stage.innerHTML = MGAvatar.svg(draft.avatar.custom);
      }

      function chips(container, items, selected, onPick) {
        container.innerHTML = "";
        items.forEach(function (item) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "chip" + (item.value === selected ? " on" : "");
          button.textContent = item.label;
          button.addEventListener("click", function () { onPick(item.value); });
          container.appendChild(button);
        });
      }

      const grades = [{ value: "prep", label: "Prep" }].concat(["1", "2", "3", "4", "5", "6"].map(function (year) {
        return { value: year, label: "Year " + year };
      }));
      const ages = [];
      for (let age = 5; age <= 12; age += 1) ages.push({ value: age, label: String(age) });

      function paintChoices() {
        chips(body.querySelector(".grades"), grades, draft.grade, function (value) { draft.grade = value; paintChoices(); });
        chips(body.querySelector(".ages"), ages, draft.age, function (value) { draft.age = value; paintChoices(); });
      }
      paintChoices();

      function group(title, items, selected, onPick, swatch) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const label = document.createElement("span");
        label.textContent = title;
        const row = document.createElement("div");
        row.className = "chip-row";
        items.forEach(function (item) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = (swatch ? "swatch" : "chip") + (item.value === selected ? " on" : "");
          if (swatch) {
            button.style.background = item.hex;
            button.setAttribute("aria-label", item.label);
          } else button.textContent = item.label;
          button.addEventListener("click", function () { onPick(item.value); });
          row.appendChild(button);
        });
        wrap.appendChild(label);
        wrap.appendChild(row);
        return wrap;
      }

      function paintDraw() {
        const box = body.querySelector(".draw-box");
        const custom = draft.avatar.custom;
        box.innerHTML = "";
        box.appendChild(group("Skin tone", MGAvatar.skins.map(function (hex, index) {
          return { value: index, label: "Skin tone " + (index + 1), hex: hex };
        }), custom.skin, function (value) { custom.skin = value; paint(); paintDraw(); }, true));
        box.appendChild(group("Face shape", MGAvatar.faces.map(function (item) { return { value: item.id, label: item.name }; }), custom.face, function (value) { custom.face = value; paint(); paintDraw(); }));
        box.appendChild(group("Hairstyle", MGAvatar.hairs.map(function (item) { return { value: item.id, label: item.name }; }), custom.hair, function (value) { custom.hair = value; paint(); paintDraw(); }));
        box.appendChild(group("Hair colour", MGAvatar.hairColours.map(function (item) { return { value: item.id, label: item.name, hex: item.hex }; }), custom.hairColour, function (value) { custom.hairColour = value; paint(); paintDraw(); }, true));
        box.appendChild(group("Eyes", MGAvatar.eyes.map(function (item) { return { value: item.id, label: item.name, hex: item.hex }; }), custom.eye, function (value) { custom.eye = value; paint(); paintDraw(); }, true));
        box.appendChild(group("Glasses", MGAvatar.glasses.map(function (item) { return { value: item.id, label: item.name }; }), custom.glasses, function (value) { custom.glasses = value; paint(); paintDraw(); }));
        box.appendChild(group("Freckles", MGAvatar.freckles.map(function (item) { return { value: item.id, label: item.name }; }), custom.freckles, function (value) { custom.freckles = value; paint(); paintDraw(); }));
        box.appendChild(group("Headwear", MGAvatar.hats.map(function (item) { return { value: item.id, label: item.name }; }), custom.hat, function (value) { custom.hat = value; paint(); paintDraw(); }));
        box.appendChild(group("Headwear colour", MGAvatar.clothes.map(function (hex) { return { value: hex, label: "Headwear colour", hex: hex }; }), custom.hatColour, function (value) { custom.hatColour = value; paint(); paintDraw(); }, true));
        box.appendChild(group("Clothing colour", MGAvatar.clothes.map(function (hex) { return { value: hex, label: "Clothing colour", hex: hex }; }), custom.clothing, function (value) { custom.clothing = value; paint(); paintDraw(); }, true));
        const random = document.createElement("button");
        random.type = "button";
        random.className = "btn secondary";
        random.textContent = "Surprise me";
        random.addEventListener("click", function () {
          draft.avatar.mode = "custom";
          draft.avatar.custom = MGAvatar.randomCustom();
          paint();
          paintDraw();
        });
        box.appendChild(random);
      }

      function paintAnimals() {
        const box = body.querySelector(".animal-box");
        const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
        box.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "animal-grid";
        animals.forEach(function (animal) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "animal-pick" + (draft.avatar.animal === animal.id ? " on" : "");
          button.innerHTML = '<img src="' + MGUi.esc(animal.src) + '" alt=""><span>' + MGUi.esc(animal.name) + "</span>";
          button.addEventListener("click", function () {
            draft.avatar.mode = "animal";
            draft.avatar.animal = animal.id;
            paint();
            paintAnimals();
          });
          grid.appendChild(button);
        });
        box.appendChild(grid);
      }

      body.querySelectorAll(".tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          const draw = tab.dataset.tab === "draw";
          draft.avatar.mode = draw ? "custom" : "animal";
          body.querySelectorAll(".tab").forEach(function (item) { item.classList.toggle("on", item === tab); });
          body.querySelector(".draw-box").classList.toggle("hidden", !draw);
          body.querySelector(".animal-box").classList.toggle("hidden", draw);
          paint();
        });
      });
      if (draft.avatar.mode === "animal") {
        body.querySelector('[data-tab="animal"]').click();
      }
      paintDraw();
      paintAnimals();
      paint();

      body.querySelector(".creator-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const name = body.querySelector(".name-input").value.replace(/\s+/g, " ").trim();
        if (name.length < 2) { warn.textContent = "Type a name with at least 2 letters."; return; }
        if (!draft.grade) { warn.textContent = "Choose a grade."; return; }
        if (!draft.age) { warn.textContent = "Choose an age."; return; }
        draft.name = name;
        if (!existing) draft.maths.adjust = 0;
        const saved = MGStorage.save(draft);
        remember(saved.id);
        menu();
      });
      const remove = body.querySelector(".remove");
      if (remove) remove.addEventListener("click", function () {
        warn.innerHTML = 'Remove this player from this device? <button type="button" class="btn danger yes">Yes, remove</button>';
        warn.querySelector(".yes").addEventListener("click", function () {
          MGStorage.remove(draft.id);
          if (sessionStorage.getItem(sessionKey) === draft.id) remember("");
          home();
        });
      });
    });
  }

  function menu() {
    const profile = current();
    if (!profile) { home(); return; }
    show(function (root) {
      const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
      const body = MGUi.shell(root, { title: "Choose a game", eyebrow: MGStorage.gradeLabel(profile.grade), profile: profile });
      const games = [
        ["maths", "Maths Genius", "Ten questions, stars, and a gentle step up."],
        ["builder", "3D Builder", "Place colourful blocks and turn the camera."],
        ["farm", "Grow a Farm", "Plant seeds, water them, and harvest coins."],
        ["escape", "Speed Escape", "Answer fast and stay ahead of the fox."],
        ["dash", "Animal Dash", "Three lanes, jumps, ducks and bonus gates."],
        ["blocky", "Blocky Multiplication", "Grow your blocks and clear the course."],
        ["together", "Play Together", "A private room for a race or shared building."]
      ];
      body.innerHTML = '<p class="note">Hello <strong></strong>. Maths starts at <span class="level"></span>. Stars: ' + profile.maths.stars + '.</p><div class="card-grid"></div><div class="row-actions"><button type="button" class="btn ghost edit">Edit player</button><button type="button" class="btn ghost switch">Switch player</button></div><p class="note">After the first visit with an internet connection, the single-player games work offline. You can add Maths Genius to your home screen.</p>';
      body.querySelector("strong").textContent = profile.name;
      body.querySelector(".level").textContent = MGQuestions.describeLevel(level);
      const grid = body.querySelector(".card-grid");
      games.forEach(function (game) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "game-card";
        button.innerHTML = "<strong></strong><span></span>";
        button.querySelector("strong").textContent = game[1];
        button.querySelector("span").textContent = game[2];
        button.addEventListener("click", function () { launch(game[0]); });
        grid.appendChild(button);
      });
      body.querySelector(".edit").addEventListener("click", function () { editor(profile.id); });
      body.querySelector(".switch").addEventListener("click", function () { remember(""); home(); });
    });
  }

  function launch(name) {
    const profile = current();
    if (!profile) { home(); return; }
    const map = {
      maths: MGMaths,
      builder: MGBuilder,
      farm: MGFarm,
      escape: MGEscape,
      dash: MGDash,
      blocky: MGBlocky,
      together: MGTogether
    };
    show(function (root) {
      return map[name].mount(root, MGStorage.get(profile.id), function (screen) {
        if (screen === "home") home();
        else if (screen === "together") launch("together");
        else menu();
      });
    });
  }

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  if (current()) menu();
  else home();
})();
