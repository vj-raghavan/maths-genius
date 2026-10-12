(function () {
  const COLOURS = [
    { name: "Red", hex: 0xe15d3a },
    { name: "Blue", hex: 0x2f7dd1 },
    { name: "Yellow", hex: 0xf0b429 },
    { name: "Green", hex: 0x2e9b5b },
    { name: "Orange", hex: 0xf08a24 },
    { name: "Purple", hex: 0x7d5cc6 },
    { name: "Teal", hex: 0x14919b },
    { name: "White", hex: 0xfff6ea }
  ];

  function sentence(count, level) {
    if (!count) return "No blocks yet. Choose a colour and tap the grid.";
    const word = count === 1 ? "block" : "blocks";
    if (level <= 2) return count + " " + word + ". " + count + " = " + Math.max(0, count - 1) + " + 1.";
    const tens = Math.floor(count / 10);
    const ones = count % 10;
    if (count >= 10) return count + " " + word + ". That is " + tens + " tens and " + ones + " ones.";
    return count + " " + word + ". Double " + count + " is " + count * 2 + ".";
  }

  function mount(root, profile, go, options) {
    const settings = options || {};
    let colour = 2;
    let mode = "place";
    let blocks = (settings.blocks || profile.builder.blocks || []).map(function (block) {
      return { x: block.x, y: block.y, z: block.z, c: block.c };
    });
    let raf = 0;
    let renderer = null;
    let cancelled = false;
    let rebuild = function () {};
    const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
    const body = MGUi.shell(root, {
      title: settings.shared ? "Build together" : "3D Builder",
      eyebrow: "Blocks",
      profile: profile,
      back: function () { go(settings.shared ? "together" : "menu"); }
    });
    body.innerHTML = '<div class="builder-layout"><div><canvas class="stage-canvas" aria-label="Block world"></canvas>' +
      '<div class="toolbar turn"></div></div><aside class="panel"><p class="count-line"></p><div class="chip-row colours"></div>' +
      '<div class="row-actions"><button type="button" class="btn secondary mode-btn">Mode: build</button>' +
      '<button type="button" class="btn ghost clear-btn">Clear</button></div><p class="note">Drag to turn. Scroll or use the buttons to zoom. Tap a square to build.</p><p class="confirm hidden"></p></aside></div>';
    const canvas = body.querySelector("canvas");
    const countLine = body.querySelector(".count-line");
    const turn = body.querySelector(".turn");
    const confirm = body.querySelector(".confirm");
    const colours = body.querySelector(".colours");

    function paintCount() {
      countLine.textContent = sentence(blocks.length, level);
    }

    COLOURS.forEach(function (item, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip" + (index === colour ? " on" : "");
      button.innerHTML = '<span class="colour-dot" style="background:#' + item.hex.toString(16).padStart(6, "0") + '"></span>' + item.name;
      button.addEventListener("click", function () {
        colour = index;
        colours.querySelectorAll(".chip").forEach(function (chip, chipIndex) {
          chip.classList.toggle("on", chipIndex === colour);
        });
      });
      colours.appendChild(button);
    });

    function persist() {
      if (!settings.shared) {
        MGStorage.update(profile.id, function (draft) { draft.builder.blocks = blocks.map(function (block) { return { x: block.x, y: block.y, z: block.z, c: block.c }; }); });
      }
      if (settings.onLocal) settings.onLocal(blocks.map(function (block) { return { x: block.x, y: block.y, z: block.z, c: block.c }; }));
      paintCount();
    }

    function topAt(x, z) {
      return blocks.reduce(function (max, block) {
        return block.x === x && block.z === z ? Math.max(max, block.y + 1) : max;
      }, 0);
    }

    body.querySelector(".mode-btn").addEventListener("click", function (event) {
      mode = mode === "place" ? "remove" : "place";
      event.currentTarget.textContent = mode === "place" ? "Mode: build" : "Mode: remove";
    });
    body.querySelector(".clear-btn").addEventListener("click", function () {
      confirm.classList.remove("hidden");
      confirm.innerHTML = 'Clear every block? <button type="button" class="btn danger yes">Yes, clear</button> <button type="button" class="btn ghost no">Keep them</button>';
      confirm.querySelector(".yes").addEventListener("click", function () {
        blocks = [];
        rebuild();
        persist();
        confirm.classList.add("hidden");
      });
      confirm.querySelector(".no").addEventListener("click", function () { confirm.classList.add("hidden"); });
    });

    paintCount();
    const view = { yaw: 0.8, pitch: 0.85, dist: 12 };

    function boot() {
      if (cancelled || !window.THREE) return;
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setClearColor(0xc6e7f5);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b8f71, 1.15));
      const sun = new THREE.DirectionalLight(0xffffff, 0.9);
      sun.position.set(5, 12, 6);
      scene.add(sun);
      const grid = new THREE.GridHelper(8, 8, 0x0e7c66, 0xd9c7aa);
      scene.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      ground.rotation.x = -Math.PI / 2;
      ground.name = "ground";
      scene.add(ground);
      const blockRoot = new THREE.Group();
      scene.add(blockRoot);
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      function updateCamera() {
        camera.position.set(
          Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist,
          Math.sin(view.pitch) * view.dist + 0.4,
          Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist
        );
        camera.lookAt(0, 0.5, 0);
      }

      function resize() {
        const width = canvas.clientWidth || 640;
        const height = canvas.clientHeight || 480;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      rebuild = function () {
        while (blockRoot.children.length) {
          const child = blockRoot.children.pop();
          child.geometry.dispose();
          child.material.dispose();
        }
        blocks.forEach(function (block) {
          const material = new THREE.MeshLambertMaterial({ color: COLOURS[block.c].hex });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), material);
          mesh.position.set(block.x - 3.5, block.y + 0.5, block.z - 3.5);
          mesh.userData = { x: block.x, y: block.y, z: block.z };
          blockRoot.add(mesh);
        });
      }

      function applyBlocks(next) {
        blocks = next.map(function (block) { return { x: block.x, y: block.y, z: block.z, c: block.c }; });
        rebuild();
        paintCount();
      }
      if (settings.apply) settings.apply(applyBlocks);

      function onPick(event) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(blockRoot.children.concat([ground]), false);
        if (!hits.length) return;
        const hit = hits[0];
        if (mode === "remove" && hit.object.userData && Number.isInteger(hit.object.userData.y)) {
          const spot = hit.object.userData;
          blocks = blocks.filter(function (block) { return !(block.x === spot.x && block.y === spot.y && block.z === spot.z); });
          blocks.forEach(function (block) {
            if (block.x === spot.x && block.z === spot.z && block.y > spot.y) block.y -= 1;
          });
          rebuild();
          persist();
          return;
        }
        let x;
        let z;
        if (hit.object === ground) {
          x = Math.floor(hit.point.x + 4);
          z = Math.floor(hit.point.z + 4);
        } else if (hit.object.userData) {
          x = hit.object.userData.x;
          z = hit.object.userData.z;
        } else return;
        if (x < 0 || z < 0 || x > 7 || z > 7) return;
        const y = topAt(x, z);
        if (y > 5 || blocks.length >= 80) return;
        blocks.push({ x: x, y: y, z: z, c: colour });
        rebuild();
        persist();
      }

      let dragging = false;
      let moved = false;
      let lastX = 0;
      let lastY = 0;
      canvas.addEventListener("pointerdown", function (event) {
        dragging = true;
        moved = false;
        lastX = event.clientX;
        lastY = event.clientY;
      });
      canvas.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        view.yaw += dx * 0.01;
        view.pitch = Math.max(0.35, Math.min(1.15, view.pitch + dy * 0.008));
        lastX = event.clientX;
        lastY = event.clientY;
        updateCamera();
      });
      canvas.addEventListener("pointerup", function (event) {
        dragging = false;
        if (!moved) onPick(event);
      });
      canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        view.dist = Math.max(7, Math.min(22, view.dist + event.deltaY * 0.01));
        updateCamera();
      }, { passive: false });

      function nudge(label, fn) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn ghost";
        button.textContent = label;
        button.addEventListener("click", function () { fn(); updateCamera(); });
        turn.appendChild(button);
      }
      nudge("Turn left", function () { view.yaw -= 0.35; });
      nudge("Turn right", function () { view.yaw += 0.35; });
      nudge("Zoom in", function () { view.dist = Math.max(7, view.dist - 1.5); });
      nudge("Zoom out", function () { view.dist = Math.min(22, view.dist + 1.5); });

      window.addEventListener("resize", resize);
      updateCamera();
      resize();
      rebuild();
      function loop() {
        if (cancelled) return;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      }
      loop();
      let disposed = false;
      const teardown = function () {
        if (disposed) return;
        disposed = true;
        cancelled = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        scene.traverse(function (object) {
          if (object.geometry) object.geometry.dispose();
          const materials = object.material ? [].concat(object.material) : [];
          materials.forEach(function (material) { material.dispose(); });
        });
        renderer.dispose();
      };
      return teardown;
    }

    let teardown = function () { cancelled = true; };
    MGUi.loadScript("vendor/three.min.js").then(function () {
      if (!cancelled) teardown = boot() || teardown;
    }).catch(function () {
      countLine.textContent = "The 3D blocks could not be loaded on this device.";
    });

    return {
      destroy: function () {
        cancelled = true;
        cancelAnimationFrame(raf);
        teardown();
      }
    };
  }

  window.MGBuilder = { mount: mount, COLOURS: COLOURS };
})();
