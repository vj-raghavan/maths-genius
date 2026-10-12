(function () {
  const REACTIONS = [
    { id: "nice", label: "Nice work" },
    { id: "wow", label: "Wow" },
    { id: "go", label: "Go, go, go" },
    { id: "thanks", label: "Thanks" }
  ];

  function codeOk(value) {
    return /^[A-HJ-NP-Z2-9]{4,6}$/.test(String(value || "").toUpperCase());
  }

  function makeCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, function (byte) { return alphabet[byte % alphabet.length]; }).join("");
  }

  function cleanBlocks(blocks) {
    const probe = MGStorage.blankProfile();
    probe.builder.blocks = blocks || [];
    return MGStorage.normalise(probe).builder.blocks;
  }

  function mount(root, profile, go) {
    const body = MGUi.shell(root, {
      title: "Play Together",
      eyebrow: "Private room",
      profile: profile,
      back: function () { shutdown(); go("menu"); }
    });
    let room = null;
    let sendAction = null;
    let iAmHost = false;
    let hostId = "";
    let code = "";
    let people = {};
    let mode = "pick";
    let note = "";
    let toast = "";
    let board = {};
    let applyWorld = null;
    let builderDestroy = function () {};
    let waitTimer = 0;
    let relayTimer = 0;
    let closed = false;

    function me() {
      return MGNet && MGNet.selfId ? MGNet.selfId : "";
    }

    function shutdown() {
      closed = true;
      builderDestroy();
      window.clearTimeout(waitTimer);
      window.clearInterval(relayTimer);
      if (room) {
        const leaving = room;
        room = null;
        leaving.leave().catch(function () {});
      }
    }

    function end(message) {
      note = message;
      mode = "ended";
      shutdown();
      closed = true;
      render();
    }

    function rosterList() {
      const list = Object.keys(people).map(function (id) {
        return { id: id, name: people[id].name, avatar: people[id].avatar, host: id === hostId };
      });
      list.sort(function (a, b) { return (a.host === b.host) ? 0 : a.host ? -1 : 1; });
      return list;
    }

    function broadcastHello() {
      const identity = MGStorage.shareIdentity(profile);
      sendAction({ t: "hello", name: identity.name, avatar: identity.avatar, host: iAmHost });
    }

    function renderPeople(container) {
      const list = document.createElement("ul");
      list.className = "player-list";
      rosterList().forEach(function (person) {
        const item = document.createElement("li");
        const fake = { name: person.name, avatar: person.avatar || MGStorage.blankProfile().avatar };
        item.innerHTML = MGUi.portrait(fake, "portrait tiny") + "<span></span>";
        item.querySelector("span").textContent = person.name + (person.host ? " · host" : "") + (board[person.id] ? " · " + board[person.id] + " correct" : "");
        if (iAmHost && person.id !== me()) {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "btn danger";
          remove.textContent = "Remove";
          remove.addEventListener("click", function () {
            sendAction({ t: "kick" }, person.id);
            delete people[person.id];
            note = person.name + " was removed.";
            render();
          });
          item.appendChild(remove);
        }
        list.appendChild(item);
      });
      container.appendChild(list);
    }

    function render() {
      if (closed && mode !== "ended") return;
      builderDestroy();
      builderDestroy = function () {};
      body.innerHTML = "";
      if (mode === "pick") {
        body.innerHTML = '<div class="panel"><p>Make a private room and read the code to a friend. There is no public list of rooms, and there is no chat. Only a first name and an avatar are shared. Age and grade stay on this device.</p>' +
          '<div class="row-actions"><button type="button" class="btn primary create">Create a room</button></div>' +
          '<label class="field">Room code<input class="code-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' +
          '<button type="button" class="btn secondary join">Join with code</button><p class="note status"></p></div>';
        if (!navigator.onLine) body.querySelector(".status").textContent = "Play Together needs the internet so friends can join your room. Every other game still works offline.";
        body.querySelector(".create").addEventListener("click", function () { openRoom(makeCode(), true); });
        body.querySelector(".join").addEventListener("click", function () {
          const value = body.querySelector(".code-input").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (!codeOk(value)) {
            body.querySelector(".status").textContent = "Enter the 4 to 6 character code from your friend.";
            return;
          }
          openRoom(value, false);
        });
        return;
      }
      if (mode === "ended") {
        body.innerHTML = '<div class="summary"><h2>Room closed</h2><p></p><button type="button" class="btn primary again">Back to Play Together</button></div>';
        body.querySelector("p").textContent = note;
        body.querySelector(".again").addEventListener("click", function () {
          closed = false;
          mode = "pick";
          people = {};
          render();
        });
        return;
      }
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.innerHTML = '<p class="note">Room code</p><p class="room-code"></p><p class="note relay"></p><p class="toast"></p>';
      panel.querySelector(".room-code").textContent = code;
      panel.querySelector(".relay").textContent = note || "Share this code with a friend. Up to 4 players.";
      panel.querySelector(".toast").textContent = toast;
      renderPeople(panel);
      const actions = document.createElement("div");
      actions.className = "row-actions";
      if (mode === "lobby" && iAmHost) {
        const level = document.createElement("label");
        level.className = "field";
        level.innerHTML = "Question level for the race<select class=\"name-input level\"></select>";
        const select = level.querySelector("select");
        [1, 2, 3, 4, 5, 6].forEach(function (value) {
          const option = document.createElement("option");
          option.value = String(value);
          option.textContent = MGQuestions.describeLevel(value);
          if (value === MGQuestions.playingLevel(profile.grade, profile.maths.adjust)) option.selected = true;
          select.appendChild(option);
        });
        panel.appendChild(level);
        const race = document.createElement("button");
        race.type = "button";
        race.className = "btn primary";
        race.textContent = "Start maths race";
        race.addEventListener("click", function () {
          const seed = crypto.getRandomValues(new Uint32Array(1))[0];
          const chosen = Number(select.value) || 2;
          sendAction({ t: "race", seed: seed, level: chosen });
          startRace(seed, chosen);
        });
        actions.appendChild(race);
      }
      if (mode === "lobby") {
        const build = document.createElement("button");
        build.type = "button";
        build.className = "btn secondary";
        build.textContent = "Build together";
        build.addEventListener("click", function () { startBuild(); });
        actions.appendChild(build);
      }
      const reactions = document.createElement("div");
      reactions.className = "react-row";
      REACTIONS.forEach(function (reaction) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn ghost";
        button.textContent = reaction.label;
        button.addEventListener("click", function () { sendAction({ t: "react", kind: reaction.id }); });
        reactions.appendChild(button);
      });
      const leave = document.createElement("button");
      leave.type = "button";
      leave.className = "btn ghost";
      leave.textContent = "Leave room";
      leave.addEventListener("click", function () { end("You left the room."); });
      actions.appendChild(leave);
      panel.appendChild(actions);
      panel.appendChild(reactions);
      body.appendChild(panel);
      const stage = document.createElement("div");
      stage.className = "stage";
      body.appendChild(stage);
      if (mode === "race") renderRace(stage);
      if (mode === "build") renderBuild(stage);
    }

    function renderRace(stage) {
      stage.innerHTML = '<div class="qbox"></div><p class="feedback" aria-live="polite"></p><ol class="player-list board"></ol>';
      const questions = MGQuestions.generateRound(raceLevel, raceSeed, 10);
      let index = 0;
      let correct = 0;
      paintBoard(stage.querySelector(".board"));
      function step() {
        if (index >= questions.length) {
          stage.querySelector(".feedback").textContent = "You finished with " + correct + " out of 10.";
          sendAction({ t: "score", points: correct, answered: index, done: true });
          MGStorage.update(profile.id, function (draft) {
            draft.maths.stars += MGQuestions.starsFor(correct);
            draft.maths.rounds += 1;
          });
          return;
        }
        MGUi.fillQuestion(stage.querySelector(".qbox"), questions[index], function (result) {
          if (result.correct) correct += 1;
          index += 1;
          board[me()] = correct;
          sendAction({ t: "score", points: correct, answered: index, done: index >= questions.length });
          stage.querySelector(".feedback").textContent = result.correct ? "Nice." : questions[index - 1].worked;
          paintBoard(stage.querySelector(".board"));
          setTimeout(step, 500);
        });
      }
      step();
    }

    function paintBoard(list) {
      if (!list) return;
      list.innerHTML = "";
      rosterList().forEach(function (person) {
        const item = document.createElement("li");
        item.textContent = person.name + ": " + (board[person.id] || 0) + " correct";
        list.appendChild(item);
      });
    }

    let raceSeed = 1;
    let raceLevel = 2;
    function startRace(seed, level) {
      mode = "race";
      raceSeed = seed >>> 0;
      raceLevel = Math.max(1, Math.min(6, level || 2));
      board = {};
      render();
    }

    function startBuild() {
      mode = "build";
      render();
    }

    function renderBuild(stage) {
      const handle = MGBuilder.mount(stage, profile, function () { mode = "lobby"; render(); }, {
        shared: true,
        blocks: cleanBlocks(world),
        onLocal: function (blocks) {
          if (iAmHost) publishBlocks(blocks);
          else if (hostId) sendAction({ t: "wish", blocks: blocks }, hostId);
        },
        apply: function (setter) { applyWorld = setter; }
      });
      builderDestroy = handle.destroy;
    }

    let world = [];
    function publishBlocks(blocks) {
      world = cleanBlocks(blocks);
      MGStorage.update(profile.id, function (draft) { draft.builder.blocks = world; });
      sendAction({ t: "blocks", blocks: world });
      if (applyWorld) applyWorld(world);
    }

    function onData(data, peerId) {
      if (!data || typeof data !== "object" || closed) return;
      if (data.t === "hello") {
        const name = MGStorage.firstName(typeof data.name === "string" ? data.name : "Friend");
        const avatar = data.avatar && (data.avatar.mode === "animal" || data.avatar.mode === "custom") ? data.avatar : MGStorage.blankProfile().avatar;
        if (iAmHost && !people[peerId] && Object.keys(people).length >= 4) {
          sendAction({ t: "full" }, peerId);
          return;
        }
        people[peerId] = { name: name, avatar: MGStorage.normalise({ avatar: avatar }).avatar };
        if (data.host) hostId = peerId;
        note = name + " joined. Players: " + rosterList().map(function (person) { return person.name; }).join(", ");
        if (mode === "lobby") render();
        else {
          const relay = body.querySelector(".relay");
          if (relay) relay.textContent = note;
          const boardList = body.querySelector(".board");
          if (boardList) paintBoard(boardList);
        }
        if (iAmHost) broadcastHello();
        return;
      }
      if (data.t === "full") {
        end("That room is full. Rooms hold 4 players.");
        return;
      }
      if (data.t === "kick") {
        end("The host removed you from the room.");
        return;
      }
      if (data.t === "react") {
        const reaction = REACTIONS.find(function (item) { return item.id === data.kind; });
        const person = people[peerId];
        if (reaction && person) {
          toast = person.name + ": " + reaction.label;
          const toastEl = body.querySelector(".toast");
          if (toastEl) toastEl.textContent = toast;
        }
        return;
      }
      if (data.t === "score") {
        const points = Number(data.points);
        if (points >= 0 && points <= 10) board[peerId] = points;
        const list = body.querySelector(".board");
        if (list) paintBoard(list);
        return;
      }
      if (data.t === "race" && !iAmHost) {
        startRace(Number(data.seed) || 1, Number(data.level) || 2);
        return;
      }
      if (data.t === "wish" && iAmHost) {
        publishBlocks(data.blocks);
        return;
      }
      if (data.t === "blocks" && peerId === hostId && !iAmHost) {
        world = cleanBlocks(data.blocks);
        if (applyWorld) applyWorld(world);
      }
    }

    function openRoom(nextCode, host) {
      if (!navigator.onLine) {
        mode = "pick";
        render();
        const status = body.querySelector(".status");
        if (status) status.textContent = "Play Together needs the internet so friends can join your room. Every other game still works offline.";
        return;
      }
      MGUi.loadScript("vendor/trystero.min.js").then(function () {
        if (closed) return;
        iAmHost = host;
        code = nextCode;
        hostId = host ? MGNet.selfId : "";
        people = {};
        people[MGNet.selfId] = MGStorage.shareIdentity(profile);
        if (host) {
          people[MGNet.selfId].host = true;
          world = cleanBlocks(profile.builder.blocks);
        }
        room = MGNet.joinRoom({ appId: "maths-genius-play-v1", password: code, relayRedundancy: 5 }, code);
        const channel = room.makeAction("play");
        sendAction = channel[0];
        channel[1](onData);
        room.onPeerJoin(function () { broadcastHello(); });
        room.onPeerLeave(function (peerId) {
          const name = people[peerId] && people[peerId].name;
          if (peerId === hostId && !iAmHost) {
            end("The host left, so this room has ended.");
            return;
          }
          delete people[peerId];
          note = (name || "A player") + " left the room.";
          if (mode === "lobby") render();
          else if (mode !== "ended") {
            const relay = body.querySelector(".relay");
            if (relay) relay.textContent = note;
          }
        });
        mode = "lobby";
        note = host ? "Waiting for friends. Read them this code." : "Looking for the room...";
        render();
        broadcastHello();
        if (!host) {
          waitTimer = window.setTimeout(function () {
            if (!hostId && mode === "lobby") end("We could not find that room. Check the code and that you are both online.");
          }, 20000);
        }
        relayTimer = window.setInterval(function () {
          if (!MGNet.getRelaySockets) return;
          const sockets = MGNet.getRelaySockets();
          const open = Object.keys(sockets).some(function (url) { return sockets[url] && sockets[url].readyState === 1; });
          const relay = body.querySelector(".relay");
          if (relay && open && note.indexOf("Waiting") === 0) relay.textContent = note + " Connected.";
        }, 1500);
      }).catch(function () {
        end("Play Together needs the internet so friends can join your room. Every other game still works offline.");
      });
    }

    window.addEventListener("offline", function () {
      if (mode !== "pick" && mode !== "ended") end("The internet dropped out. The room has closed. Single-player games still work.");
    });
    render();
    return { destroy: shutdown };
  }

  window.MGTogether = { mount: mount, codeOk: codeOk };
})();
