/* Original layered portrait avatars. No photos of the child and no emoji. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGAvatar = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const skins = ["#F6E2D3", "#F3D2BF", "#EDC0A3", "#E0B08A", "#C68642", "#A86B3C", "#8D5524", "#6B3A1F", "#4A2912", "#2C1810"];
  const faces = [
    { id: "round", name: "Round" },
    { id: "oval", name: "Oval" },
    { id: "wide", name: "Wide" },
    { id: "long", name: "Long" }
  ];
  const hairs = [
    { id: "none", name: "No hair" },
    { id: "short", name: "Short" },
    { id: "bob", name: "Bob" },
    { id: "long", name: "Long" },
    { id: "curly", name: "Curly" },
    { id: "afro", name: "Afro" },
    { id: "bun", name: "Bun" },
    { id: "ponytail", name: "Ponytail" },
    { id: "braids", name: "Braids" },
    { id: "fringe", name: "Fringe" }
  ];
  const hairColours = [
    { id: "black", name: "Black", hex: "#1c1c1c" },
    { id: "dark", name: "Dark brown", hex: "#3a2416" },
    { id: "brown", name: "Brown", hex: "#6b3e26" },
    { id: "auburn", name: "Auburn", hex: "#8a3d2f" },
    { id: "ginger", name: "Ginger", hex: "#c4622d" },
    { id: "blonde", name: "Blonde", hex: "#e0b15a" },
    { id: "platinum", name: "Platinum", hex: "#f3e2b8" },
    { id: "grey", name: "Grey", hex: "#9a9a9a" }
  ];
  const eyes = [
    { id: "brown", name: "Brown", hex: "#5a3a24" },
    { id: "hazel", name: "Hazel", hex: "#7a6232" },
    { id: "green", name: "Green", hex: "#3f7a45" },
    { id: "blue", name: "Blue", hex: "#3d6ea8" },
    { id: "grey", name: "Grey", hex: "#667077" },
    { id: "amber", name: "Amber", hex: "#b8860b" }
  ];
  const glasses = [
    { id: "none", name: "No glasses" },
    { id: "round", name: "Round" },
    { id: "square", name: "Square" }
  ];
  const freckles = [
    { id: "none", name: "No freckles" },
    { id: "some", name: "Some" },
    { id: "many", name: "Lots" }
  ];
  const hats = [
    { id: "none", name: "No hat" },
    { id: "cap", name: "Cap" },
    { id: "beanie", name: "Beanie" },
    { id: "hijab", name: "Hijab" },
    { id: "sunhat", name: "Sun hat" },
    { id: "headband", name: "Headband" }
  ];
  const clothes = ["#0e7c66", "#2f7dd1", "#e15d3a", "#f0b429", "#7d5cc6", "#14919b", "#d4537e", "#3d4d3a", "#f4f1ea", "#1d2a24"];

  function byId(list, id, fallback) {
    return list.find(function (item) { return item.id === id; }) || fallback;
  }

  function sanitise(custom) {
    const source = custom || {};
    const skin = Math.max(0, Math.min(skins.length - 1, Number(source.skin) || 0));
    const face = byId(faces, source.face, faces[0]).id;
    const hair = byId(hairs, source.hair, hairs[2]).id;
    const hairColour = byId(hairColours, source.hairColour, hairColours[2]).id;
    const eye = byId(eyes, source.eye, eyes[0]).id;
    const glass = byId(glasses, source.glasses, glasses[0]).id;
    const freckle = byId(freckles, source.freckles, freckles[0]).id;
    const hat = byId(hats, source.hat, hats[0]).id;
    const hatColour = clothes.indexOf(source.hatColour) >= 0 ? source.hatColour : clothes[1];
    const clothing = clothes.indexOf(source.clothing) >= 0 ? source.clothing : clothes[0];
    return {
      skin: skin,
      face: face,
      hair: hair,
      hairColour: hairColour,
      eye: eye,
      glasses: glass,
      freckles: freckle,
      hat: hat,
      hatColour: hatColour,
      clothing: clothing
    };
  }

  function faceBox(face) {
    if (face === "oval") return { rx: 50, ry: 66 };
    if (face === "wide") return { rx: 64, ry: 56 };
    if (face === "long") return { rx: 48, ry: 72 };
    return { rx: 58, ry: 62 };
  }

  function hairMarkup(style, colour, box) {
    const top = 108 - box.ry;
    if (style === "none") return "";
    if (style === "short") {
      return '<path d="M' + (100 - box.rx) + ' 108 Q100 ' + (top - 16) + ' ' + (100 + box.rx) + ' 108 Q100 ' + (top + 18) + ' ' + (100 - box.rx) + ' 108" fill="' + colour + '"/>';
    }
    if (style === "bob") {
      return '<path d="M' + (100 - box.rx - 4) + ' 120 Q100 ' + (top - 22) + ' ' + (100 + box.rx + 4) + ' 120 L' + (100 + box.rx) + ' 168 Q100 150 ' + (100 - box.rx) + ' 168 Z" fill="' + colour + '"/>';
    }
    if (style === "long") {
      return '<path d="M' + (100 - box.rx - 6) + ' 118 Q100 ' + (top - 24) + ' ' + (100 + box.rx + 6) + ' 118 L' + (100 + box.rx + 2) + ' 210 Q100 190 ' + (100 - box.rx - 2) + ' 210 Z" fill="' + colour + '"/>';
    }
    if (style === "curly") {
      return [0, 1, 2, 3, 4, 5, 6].map(function (index) {
        const x = 58 + index * 14;
        const y = top + 10 + (index % 2) * 12;
        return '<circle cx="' + x + '" cy="' + y + '" r="16" fill="' + colour + '"/>';
      }).join("") + '<circle cx="100" cy="' + (top + 4) + '" r="22" fill="' + colour + '"/>';
    }
    if (style === "afro") {
      return '<circle cx="100" cy="96" r="' + (box.rx + 22) + '" fill="' + colour + '"/>';
    }
    if (style === "bun") {
      return '<circle cx="100" cy="' + (top - 4) + '" r="22" fill="' + colour + '"/>' +
        '<path d="M' + (100 - box.rx) + ' 112 Q100 ' + (top - 8) + ' ' + (100 + box.rx) + ' 112 Q100 ' + (top + 24) + ' ' + (100 - box.rx) + ' 112" fill="' + colour + '"/>';
    }
    if (style === "ponytail") {
      return '<path d="M' + (100 - box.rx) + ' 110 Q100 ' + (top - 12) + ' ' + (100 + box.rx) + ' 110 Q100 ' + (top + 20) + ' ' + (100 - box.rx) + ' 110" fill="' + colour + '"/>' +
        '<ellipse cx="' + (100 + box.rx - 4) + '" cy="150" rx="16" ry="42" fill="' + colour + '"/>';
    }
    if (style === "braids") {
      return '<path d="M' + (100 - box.rx) + ' 112 Q100 ' + (top - 10) + ' ' + (100 + box.rx) + ' 112 Q100 ' + (top + 16) + ' ' + (100 - box.rx) + ' 112" fill="' + colour + '"/>' +
        '<rect x="' + (100 - box.rx + 2) + '" y="120" width="16" height="78" rx="8" fill="' + colour + '"/>' +
        '<rect x="' + (100 + box.rx - 18) + '" y="120" width="16" height="78" rx="8" fill="' + colour + '"/>';
    }
    return '<path d="M' + (100 - box.rx) + ' 112 Q100 ' + (top - 14) + ' ' + (100 + box.rx) + ' 112 L' + (100 + box.rx - 8) + ' 126 Q100 ' + (top + 28) + ' ' + (100 - box.rx + 8) + ' 126 Z" fill="' + colour + '"/>';
  }

  function hatMarkup(hat, colour, box) {
    const top = 108 - box.ry;
    if (hat === "cap") {
      return '<path d="M' + (100 - box.rx + 6) + ' 100 Q100 ' + (top - 18) + ' ' + (100 + box.rx - 6) + ' 100 Z" fill="' + colour + '"/>' +
        '<rect x="108" y="96" width="58" height="10" rx="4" fill="' + colour + '"/>';
    }
    if (hat === "beanie") {
      return '<path d="M' + (100 - box.rx + 2) + ' 108 Q100 ' + (top - 36) + ' ' + (100 + box.rx - 2) + ' 108 Z" fill="' + colour + '"/>' +
        '<circle cx="100" cy="' + (top - 18) + '" r="10" fill="' + colour + '"/>';
    }
    if (hat === "sunhat") {
      return '<ellipse cx="100" cy="108" rx="' + (box.rx + 28) + '" ry="12" fill="' + colour + '"/>' +
        '<path d="M' + (100 - box.rx + 16) + ' 108 Q100 ' + (top - 8) + ' ' + (100 + box.rx - 16) + ' 108 Z" fill="' + colour + '"/>';
    }
    if (hat === "headband") {
      return '<path d="M' + (100 - box.rx + 4) + ' 96 Q100 78 ' + (100 + box.rx - 4) + ' 96" fill="none" stroke="' + colour + '" stroke-width="10" stroke-linecap="round"/>';
    }
    if (hat === "hijab") {
      return '<path d="M28 168 Q40 70 100 58 Q160 70 172 168 L156 210 Q100 196 44 210 Z" fill="' + colour + '"/>' +
        '<ellipse cx="100" cy="112" rx="' + (box.rx - 6) + '" ry="' + (box.ry - 8) + '" fill="#000" opacity="0"/>';
    }
    return "";
  }

  function svg(custom) {
    const options = sanitise(custom);
    const skin = skins[options.skin];
    const box = faceBox(options.face);
    const hairHex = byId(hairColours, options.hairColour, hairColours[2]).hex;
    const eyeHex = byId(eyes, options.eye, eyes[0]).hex;
    const shade = "rgba(0,0,0,0.08)";
    const showHair = options.hat !== "hijab";
    const backHair = showHair && (options.hair === "long" || options.hair === "afro" || options.hair === "braids" || options.hair === "ponytail")
      ? hairMarkup(options.hair, hairHex, box) : "";
    const frontHair = showHair && options.hair !== "long" && options.hair !== "afro" && options.hair !== "braids" && options.hair !== "ponytail"
      ? hairMarkup(options.hair, hairHex, box) : "";
    const frontExtra = showHair && (options.hair === "long" || options.hair === "ponytail" || options.hair === "braids")
      ? '<path d="M' + (100 - box.rx + 2) + ' ' + (108 - box.ry + 8) + ' Q100 ' + (108 - box.ry - 16) + ' ' + (100 + box.rx - 2) + ' ' + (108 - box.ry + 8) + '" fill="' + hairHex + '"/>'
      : "";
    const freckleDots = options.freckles === "none" ? "" : [0, 1, 2, 3, 4, 5, 6, 7].slice(0, options.freckles === "many" ? 8 : 4).map(function (index) {
      const x = 78 + (index % 4) * 12;
      const y = 124 + Math.floor(index / 4) * 8;
      return '<circle cx="' + x + '" cy="' + y + '" r="1.7" fill="#8a4b2f" opacity="0.7"/>';
    }).join("");
    const glass = options.glasses === "none" ? "" : options.glasses === "round"
      ? '<g fill="none" stroke="#243044" stroke-width="3"><circle cx="78" cy="112" r="16"/><circle cx="122" cy="112" r="16"/><path d="M94 112 H106"/></g>'
      : '<g fill="none" stroke="#243044" stroke-width="3"><rect x="62" y="98" width="32" height="24" rx="4"/><rect x="106" y="98" width="32" height="24" rx="4"/><path d="M94 110 H106"/></g>';
    const earY = 112;
    const earX = box.rx - 2;
    return [
      '<svg class="avatar-svg" viewBox="0 0 200 230" role="img" aria-hidden="true">',
      '<ellipse cx="100" cy="196" rx="62" ry="18" fill="', shade, '"/>',
      backHair,
      options.hat === "hijab" ? hatMarkup("hijab", options.hatColour, box) : "",
      '<rect x="72" y="150" width="56" height="36" rx="16" fill="', skin, '"/>',
      '<path d="M48 230 L48 176 Q100 156 152 176 L152 230 Z" fill="', options.clothing, '"/>',
      '<path d="M70 168 Q100 188 130 168" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>',
      options.hat === "hijab" ? "" : '<ellipse cx="' + (100 - earX) + '" cy="' + earY + '" rx="10" ry="14" fill="' + skin + '"/><ellipse cx="' + (100 + earX) + '" cy="' + earY + '" rx="10" ry="14" fill="' + skin + '"/>',
      '<ellipse cx="100" cy="108" rx="', box.rx, '" ry="', box.ry, '" fill="', skin, '"/>',
      '<ellipse cx="100" cy="128" rx="', box.rx * 0.55, '" ry="', box.ry * 0.28, '" fill="rgba(255,255,255,0.18)"/>',
      '<ellipse cx="78" cy="128" rx="10" ry="5" fill="#e0898a" opacity="0.35"/>',
      '<ellipse cx="122" cy="128" rx="10" ry="5" fill="#e0898a" opacity="0.35"/>',
      freckleDots,
      '<ellipse cx="78" cy="112" rx="13" ry="15" fill="#fff"/>',
      '<ellipse cx="122" cy="112" rx="13" ry="15" fill="#fff"/>',
      '<circle cx="80" cy="114" r="7" fill="', eyeHex, '"/>',
      '<circle cx="124" cy="114" r="7" fill="', eyeHex, '"/>',
      '<circle cx="80" cy="114" r="3.2" fill="#1d2a24"/>',
      '<circle cx="124" cy="114" r="3.2" fill="#1d2a24"/>',
      '<circle cx="82" cy="112" r="1.4" fill="#fff"/>',
      '<circle cx="126" cy="112" r="1.4" fill="#fff"/>',
      '<path d="M66 100 Q78 94 90 100" fill="none" stroke="#3a2a22" stroke-width="2.4" stroke-linecap="round"/>',
      '<path d="M110 100 Q122 94 134 100" fill="none" stroke="#3a2a22" stroke-width="2.4" stroke-linecap="round"/>',
      '<path d="M100 116 Q104 128 100 132" fill="none" stroke="#c48b78" stroke-width="2.2" stroke-linecap="round"/>',
      '<path d="M84 146 Q100 158 116 146" fill="none" stroke="#a15c4a" stroke-width="2.6" stroke-linecap="round"/>',
      frontHair,
      frontExtra,
      glass,
      options.hat === "hijab" ? "" : hatMarkup(options.hat, options.hatColour, box),
      "</svg>"
    ].join("");
  }

  function randomCustom() {
    function one(list) { return list[Math.floor(Math.random() * list.length)]; }
    return sanitise({
      skin: Math.floor(Math.random() * skins.length),
      face: one(faces).id,
      hair: one(hairs).id,
      hairColour: one(hairColours).id,
      eye: one(eyes).id,
      glasses: one(glasses).id,
      freckles: one(freckles).id,
      hat: one(hats).id,
      hatColour: one(clothes),
      clothing: one(clothes)
    });
  }

  return {
    skins: skins,
    faces: faces,
    hairs: hairs,
    hairColours: hairColours,
    eyes: eyes,
    glasses: glasses,
    freckles: freckles,
    hats: hats,
    clothes: clothes,
    sanitise: sanitise,
    svg: svg,
    randomCustom: randomCustom
  };
});
