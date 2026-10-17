#!/usr/bin/env python3
"""Original cartoon SVGs for Maths Genius. Not copied from any game."""
import json
import os
import re
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PRIORITY = [
    "unicorn", "dragon", "robot", "rocket", "dinosaur", "dino", "castle", "pirate",
    "wizard", "knight", "fairy", "alien", "astronaut", "snowman", "panda", "koala",
    "kangaroo", "penguin", "giraffe", "elephant", "lion", "zebra", "monkey", "fox",
    "rabbit", "bunny", "cat", "kitten", "kitty", "dog", "puppy", "horse", "pony",
    "owl", "parrot", "duck", "bird", "frog", "turtle", "tortoise", "fish", "whale",
    "dolphin", "crab", "starfish", "bee", "butterfly", "ladybug", "beetle", "car",
    "truck", "bus", "train", "plane", "airplane", "aeroplane", "boat", "ship",
    "bicycle", "bike", "tractor", "firetruck", "tree", "flower", "apple", "banana",
    "cake", "cupcake", "ball", "crown", "rainbow", "moon", "star", "kite",
    "mountain", "beach", "teddy", "bear",
]

PALETTE = ["#f08a24", "#2f7dd1", "#e15d3a", "#7d5cc6", "#2e9b5b", "#f0b429", "#14919b", "#f4b4c8"]


def delay_of(key):
    total = sum(ord(ch) for ch in key)
    return round((total % 9) * 0.12, 2)


def wrap(body, key):
    delay = delay_of(key)
    style = (
        "<style>"
        ".hop{transform-box:fill-box;transform-origin:50% 88%;animation:hop 1.7s ease-in-out " + str(delay) + "s infinite;}"
        ".lid{transform-box:fill-box;transform-origin:center;animation:blink 3.5s ease-in-out " + str(delay + 0.2) + "s infinite;}"
        "@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}"
        "@keyframes blink{0%,86%,100%{transform:scaleY(0.05)}93%{transform:scaleY(1)}}"
        "@media (prefers-reduced-motion:reduce){.hop,.lid{animation:none}.lid{opacity:0}}"
        "</style>"
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" role="img">'
        + style + '<g class="hop">' + body + "</g></svg>"
    )


def eyes(cx, cy, fill, gap=24, r=12):
    parts = []
    for side in (-1, 1):
        x = cx + side * gap
        parts.append(
            '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fff" stroke="#243044" stroke-width="3"/>'
            '<circle cx="%s" cy="%s" r="5.5" fill="#243044"/>'
            '<circle cx="%s" cy="%s" r="2" fill="#fff"/>'
            '<ellipse class="lid" cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>'
            % (x, cy, r, r + 2, x + 1, cy + 1, x + 3, cy - 2, x, cy, r, r + 2, fill)
        )
    return "".join(parts)


def smile(cx, cy):
    return (
        '<path d="M%s %s Q%s %s %s %s" fill="none" stroke="#243044" stroke-width="3" stroke-linecap="round"/>'
        % (cx - 16, cy, cx, cy + 14, cx + 16, cy)
    )


def ears(kind, color):
    if kind == "point":
        return (
            '<path d="M58 78 L78 28 L98 78 Z" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<path d="M102 78 L122 28 L142 78 Z" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<path d="M68 74 L78 42 L90 74 Z" fill="#f4b4c8"/>'
            '<path d="M112 74 L122 42 L134 74 Z" fill="#f4b4c8"/>'
        ) % (color, color)
    if kind == "long":
        return (
            '<ellipse cx="62" cy="48" rx="16" ry="40" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<ellipse cx="138" cy="48" rx="16" ry="40" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<ellipse cx="62" cy="52" rx="8" ry="24" fill="#f4b4c8"/>'
            '<ellipse cx="138" cy="52" rx="8" ry="24" fill="#f4b4c8"/>'
        ) % (color, color)
    if kind == "flop":
        return (
            '<ellipse cx="48" cy="108" rx="18" ry="28" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<ellipse cx="152" cy="108" rx="18" ry="28" fill="%s" stroke="#243044" stroke-width="3"/>'
        ) % (color, color)
    if kind == "none":
        return ""
    return (
        '<ellipse cx="62" cy="62" rx="22" ry="22" fill="%s" stroke="#243044" stroke-width="3"/>'
        '<ellipse cx="138" cy="62" rx="22" ry="22" fill="%s" stroke="#243044" stroke-width="3"/>'
    ) % (color, color)


def creature(key, color, belly, ear="round", extra="", cheek=True):
    body = (
        '<ellipse cx="100" cy="196" rx="54" ry="10" fill="#000" opacity="0.08"/>'
        + ears(ear, color)
        + '<ellipse cx="100" cy="124" rx="62" ry="58" fill="%s" stroke="#243044" stroke-width="4"/>' % color
        + '<ellipse cx="100" cy="142" rx="36" ry="28" fill="%s"/>' % belly
        + ( '<ellipse cx="70" cy="132" rx="10" ry="6" fill="#f4b4c8" opacity="0.8"/>'
            '<ellipse cx="130" cy="132" rx="10" ry="6" fill="#f4b4c8" opacity="0.8"/>' if cheek else "")
        + eyes(100, 112, color)
        + smile(100, 136)
        + extra
    )
    return wrap(body, key)


def vehicle(key, color, kind):
    cabin = "#d7eef8"
    if kind == "boat":
        shape = (
            '<path d="M28 130 Q100 168 172 130 L156 118 H44 Z" fill="%s" stroke="#243044" stroke-width="4"/>'
            '<rect x="78" y="86" width="44" height="32" rx="8" fill="%s" stroke="#243044" stroke-width="3"/>'
        ) % (color, cabin)
        wheels = ""
    elif kind == "plane":
        shape = (
            '<rect x="36" y="108" width="128" height="28" rx="14" fill="%s" stroke="#243044" stroke-width="4"/>'
            '<path d="M70 108 L40 78 H78 Z" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<path d="M150 112 L184 100 V128 Z" fill="%s" stroke="#243044" stroke-width="3"/>'
        ) % (color, color, color)
        wheels = ""
    else:
        shape = (
            '<rect x="36" y="96" width="128" height="52" rx="18" fill="%s" stroke="#243044" stroke-width="4"/>'
            '<path d="M78 96 L96 68 H150 L162 96 Z" fill="%s" stroke="#243044" stroke-width="3"/>'
            '<rect x="104" y="74" width="28" height="18" rx="4" fill="%s"/>'
        ) % (color, color, cabin)
        wheels = (
            '<circle cx="68" cy="156" r="16" fill="#243044"/>'
            '<circle cx="142" cy="156" r="16" fill="#243044"/>'
            '<circle cx="68" cy="156" r="7" fill="#f4f1ea"/>'
            '<circle cx="142" cy="156" r="7" fill="#f4f1ea"/>'
        )
    body = (
        '<ellipse cx="100" cy="186" rx="60" ry="10" fill="#000" opacity="0.08"/>'
        + shape + wheels
        + eyes(118, 112, color, gap=16, r=9)
        + smile(118, 128)
    )
    return wrap(body, key)


def crop_art(key, kind):
    if kind == "carrot":
        veg = '<path d="M100 70 C78 110 74 170 100 190 C126 170 122 110 100 70 Z" fill="#f08a24" stroke="#243044" stroke-width="4"/><path d="M100 74 L86 40 M100 70 L100 34 M100 74 L116 42" fill="none" stroke="#2e9b5b" stroke-width="6" stroke-linecap="round"/>'
    elif kind == "tomato":
        veg = '<circle cx="100" cy="124" r="52" fill="#e15d3a" stroke="#243044" stroke-width="4"/><path d="M78 78 Q100 96 122 78" fill="#2e9b5b" stroke="#243044" stroke-width="3"/>'
    elif kind == "strawberry":
        veg = '<path d="M100 64 C70 90 62 150 100 184 C138 150 130 90 100 64 Z" fill="#e15d3a" stroke="#243044" stroke-width="4"/><circle cx="86" cy="120" r="3" fill="#f4f1ea"/><circle cx="108" cy="132" r="3" fill="#f4f1ea"/><circle cx="96" cy="150" r="3" fill="#f4f1ea"/><path d="M78 78 Q100 58 122 78 L100 70 Z" fill="#2e9b5b" stroke="#243044" stroke-width="3"/>'
    elif kind == "sunflower":
        veg = '<circle cx="100" cy="96" r="46" fill="#f0b429" stroke="#243044" stroke-width="4"/><circle cx="100" cy="96" r="20" fill="#8a5a32"/><rect x="94" y="140" width="12" height="52" rx="6" fill="#2e9b5b"/>'
    elif kind == "corn":
        veg = '<ellipse cx="100" cy="120" rx="28" ry="58" fill="#f0b429" stroke="#243044" stroke-width="4"/><path d="M78 70 Q60 120 78 180" fill="#2e9b5b" stroke="#243044" stroke-width="3"/><path d="M122 70 Q140 120 122 180" fill="#3aaa68" stroke="#243044" stroke-width="3"/>'
    elif kind == "seed":
        veg = '<ellipse cx="100" cy="120" rx="28" ry="40" fill="#c4a46a" stroke="#243044" stroke-width="4"/><path d="M100 80 V160" stroke="#8a5a32" stroke-width="3"/>'
    elif kind == "sprout":
        veg = '<path d="M100 170 V90" stroke="#2e9b5b" stroke-width="6" stroke-linecap="round"/><ellipse cx="78" cy="96" rx="24" ry="14" fill="#7dce6a" stroke="#243044" stroke-width="3"/><ellipse cx="122" cy="90" rx="24" ry="14" fill="#2e9b5b" stroke="#243044" stroke-width="3"/>'
    else:
        veg = '<circle cx="100" cy="120" r="40" fill="#7dce6a" stroke="#243044" stroke-width="4"/>'
    face = eyes(100, 116, "#f4f1ea", gap=16, r=8) + smile(100, 136)
    if kind in ("seed", "sprout"):
        face = ""
    return wrap('<ellipse cx="100" cy="196" rx="40" ry="8" fill="#000" opacity="0.08"/>' + veg + face, key)


def coin(key, label, fill):
    body = (
        '<ellipse cx="100" cy="196" rx="40" ry="8" fill="#000" opacity="0.08"/>'
        '<circle cx="100" cy="108" r="72" fill="%s" stroke="#243044" stroke-width="6"/>'
        '<circle cx="100" cy="108" r="58" fill="none" stroke="#fff" stroke-width="4" opacity="0.7"/>'
        '<text x="100" y="128" text-anchor="middle" font-family="Nunito, sans-serif" font-size="36" font-weight="800" fill="#243044">%s</text>'
    ) % (fill, label)
    return wrap(body + eyes(100, 92, fill, gap=18, r=8), key)


def note(key, label, fill):
    body = (
        '<rect x="18" y="48" width="164" height="124" rx="16" fill="%s" stroke="#243044" stroke-width="4"/>'
        '<text x="100" y="128" text-anchor="middle" font-family="Nunito, sans-serif" font-size="42" font-weight="800" fill="#243044">%s</text>'
    ) % (fill, label)
    return wrap(body + eyes(64, 86, fill, gap=12, r=7), key)


def scene(key, kind):
    if kind == "grass":
        blades = "".join(
            '<path d="M%s 180 Q%s 80 %s 170" fill="none" stroke="%s" stroke-width="8" stroke-linecap="round"/>'
            % (20 + i * 22, 10 + i * 22, 30 + i * 22, "#2e9b5b" if i % 2 == 0 else "#7dce6a")
            for i in range(8)
        )
        inner = '<rect width="200" height="220" fill="#c6e7a4"/>' + blades
    elif kind == "path":
        inner = '<rect width="200" height="220" fill="#d7c4a3"/><path d="M70 0 Q90 110 60 220" fill="none" stroke="#c4a46a" stroke-width="36" stroke-linecap="round"/>'
    elif kind == "soil":
        inner = '<rect width="200" height="220" fill="#8a5a32"/><circle cx="40" cy="50" r="8" fill="#6b4423"/><circle cx="150" cy="90" r="10" fill="#6b4423"/><circle cx="90" cy="160" r="7" fill="#6b4423"/>'
    elif kind == "rock":
        inner = '<ellipse cx="100" cy="130" rx="70" ry="48" fill="#9aa3ad" stroke="#243044" stroke-width="4"/>' + eyes(100, 124, "#9aa3ad", gap=18, r=8)
    elif kind == "log":
        inner = '<rect x="24" y="90" width="152" height="56" rx="28" fill="#8a5a32" stroke="#243044" stroke-width="4"/><ellipse cx="24" cy="118" rx="18" ry="28" fill="#c4a46a" stroke="#243044" stroke-width="4"/>'
    else:
        inner = creature(key, "#7d5cc6", "#fff", "point")
        return inner
    return wrap(inner, key)


SPECIAL = {
    "koala": lambda k: creature(k, "#8d8f98", "#f4f1ea", "round", '<ellipse cx="100" cy="128" rx="16" ry="12" fill="#243044"/>'),
    "panda": lambda k: creature(k, "#f4f1ea", "#f4f1ea", "round", '<ellipse cx="62" cy="100" rx="18" ry="16" fill="#243044"/><ellipse cx="138" cy="100" rx="18" ry="16" fill="#243044"/>', False),
    "penguin": lambda k: creature(k, "#243044", "#f4f1ea", "none", '<ellipse cx="100" cy="150" rx="28" ry="34" fill="#f4f1ea"/><path d="M92 128 L100 142 L108 128 Z" fill="#f08a24"/>'),
    "giraffe": lambda k: wrap(
        '<rect x="88" y="70" width="24" height="70" fill="#f0b429" stroke="#243044" stroke-width="3"/>'
        '<ellipse cx="100" cy="64" rx="28" ry="24" fill="#f0b429" stroke="#243044" stroke-width="4"/>'
        '<circle cx="80" cy="40" r="6" fill="#c4a46a"/><circle cx="112" cy="36" r="6" fill="#c4a46a"/>'
        + eyes(100, 62, "#f0b429", gap=12, r=7) + smile(100, 74), k),
    "elephant": lambda k: creature(k, "#9aa3ad", "#d5dde6", "flop", '<path d="M118 130 Q140 160 112 168" fill="none" stroke="#9aa3ad" stroke-width="10" stroke-linecap="round"/>'),
    "unicorn": lambda k: creature(k, "#f4f1ea", "#f4b4c8", "point", '<path d="M100 70 L108 28 L92 70 Z" fill="#f0b429" stroke="#243044" stroke-width="3"/>'),
    "dragon": lambda k: creature(k, "#2e9b5b", "#b7e4c7", "point", '<path d="M150 120 Q184 90 160 150" fill="#2e9b5b" stroke="#243044" stroke-width="3"/>'),
    "robot": lambda k: wrap(
        '<rect x="48" y="64" width="104" height="90" rx="16" fill="#d7eef8" stroke="#243044" stroke-width="4"/>'
        '<rect x="92" y="40" width="16" height="24" fill="#7d5cc6"/>'
        '<circle cx="100" cy="34" r="10" fill="#f0b429" stroke="#243044" stroke-width="3"/>'
        + eyes(100, 100, "#d7eef8") + '<rect x="78" y="128" width="44" height="8" rx="4" fill="#243044"/>', k),
    "rocket": lambda k: wrap(
        '<path d="M100 28 C140 70 140 130 100 180 C60 130 60 70 100 28 Z" fill="#e15d3a" stroke="#243044" stroke-width="4"/>'
        '<circle cx="100" cy="96" r="18" fill="#d7eef8" stroke="#243044" stroke-width="3"/>'
        '<path d="M70 150 L40 186 H78 Z" fill="#f08a24"/><path d="M130 150 L160 186 H122 Z" fill="#f08a24"/>', k),
    "dinosaur": lambda k: creature(k, "#7dce6a", "#e7f6df", "none", '<path d="M48 90 L28 48 L62 84 Z" fill="#7dce6a" stroke="#243044" stroke-width="3"/>'),
    "fox": lambda k: creature(k, "#e15d3a", "#f4f1ea", "point", '<ellipse cx="100" cy="130" rx="10" ry="7" fill="#243044"/>'),
    "rabbit": lambda k: creature(k, "#f4f1ea", "#f4b4c8", "long"),
    "bunny": lambda k: creature(k, "#f4f1ea", "#f4b4c8", "long"),
    "cat": lambda k: creature(k, "#f08a24", "#f4f1ea", "point", '<path d="M70 118 H86 M114 118 H132 M70 126 H84 M116 126 H132" stroke="#243044" stroke-width="2"/>'),
    "dog": lambda k: creature(k, "#c47a3a", "#f3d2a2", "flop", '<ellipse cx="100" cy="132" rx="14" ry="10" fill="#8a5a32"/>'),
    "horse": lambda k: creature(k, "#8a5a32", "#f3d2a2", "point", '<path d="M70 70 Q40 90 60 110" fill="none" stroke="#243044" stroke-width="4"/>'),
    "frog": lambda k: creature(k, "#7dce6a", "#e7f6df", "none", eyes(100, 96, "#7dce6a", gap=28, r=16)),
    "turtle": lambda k: wrap(
        '<ellipse cx="100" cy="130" rx="70" ry="40" fill="#2e9b5b" stroke="#243044" stroke-width="4"/>'
        '<ellipse cx="100" cy="124" rx="36" ry="18" fill="#c4a46a"/>'
        '<circle cx="46" cy="120" r="16" fill="#7dce6a" stroke="#243044" stroke-width="3"/>'
        + eyes(46, 118, "#7dce6a", gap=6, r=4), k),
    "fish": lambda k: wrap(
        '<ellipse cx="96" cy="116" rx="58" ry="32" fill="#2f7dd1" stroke="#243044" stroke-width="4"/>'
        '<path d="M150 116 L184 86 V146 Z" fill="#14919b" stroke="#243044" stroke-width="3"/>'
        + eyes(70, 110, "#2f7dd1", gap=0, r=8), k),
    "bird": lambda k: creature(k, "#f0b429", "#fff4d6", "none", '<path d="M118 124 L146 132 L118 140 Z" fill="#f08a24"/>'),
    "owl": lambda k: creature(k, "#8a5a32", "#f3d2a2", "none", eyes(100, 112, "#8a5a32", gap=22, r=16)),
    "lion": lambda k: creature(k, "#f0b429", "#fff4d6", "round", '<circle cx="100" cy="120" r="74" fill="none" stroke="#e15d3a" stroke-width="14"/>'),
    "monkey": lambda k: creature(k, "#c47a3a", "#f3d2a2", "round", '<ellipse cx="100" cy="132" rx="16" ry="12" fill="#f3d2a2" stroke="#243044" stroke-width="3"/>'),
    "zebra": lambda k: creature(k, "#f4f1ea", "#f4f1ea", "point", '<path d="M70 100 V150 M90 96 V156 M120 96 V156 M140 100 V150" stroke="#243044" stroke-width="4"/>'),
    "whale": lambda k: wrap('<ellipse cx="100" cy="124" rx="78" ry="40" fill="#2f7dd1" stroke="#243044" stroke-width="4"/>' + eyes(70, 116, "#2f7dd1", gap=0, r=8) + '<path d="M150 90 L168 60" stroke="#d7eef8" stroke-width="6"/>', k),
    "dolphin": lambda k: wrap('<path d="M30 130 Q80 60 160 110 Q120 150 40 150 Z" fill="#7dce6a" stroke="#243044" stroke-width="4"/>' + eyes(120, 108, "#7dce6a", gap=0, r=7), k),
    "bee": lambda k: wrap('<ellipse cx="100" cy="120" rx="36" ry="28" fill="#f0b429" stroke="#243044" stroke-width="4"/><path d="M80 110 H120 M80 124 H120 M80 138 H120" stroke="#243044" stroke-width="4"/><ellipse cx="70" cy="100" rx="16" ry="10" fill="#d7eef8"/><ellipse cx="130" cy="100" rx="16" ry="10" fill="#d7eef8"/>' + eyes(100, 112, "#f0b429", gap=12, r=6), k),
    "butterfly": lambda k: wrap('<ellipse cx="62" cy="110" rx="36" ry="28" fill="#f4b4c8" stroke="#243044" stroke-width="3"/><ellipse cx="138" cy="110" rx="36" ry="28" fill="#7d5cc6" stroke="#243044" stroke-width="3"/><rect x="94" y="84" width="12" height="60" rx="6" fill="#243044"/>' + eyes(100, 90, "#243044", gap=8, r=4), k),
    "crab": lambda k: wrap('<ellipse cx="100" cy="124" rx="50" ry="32" fill="#e15d3a" stroke="#243044" stroke-width="4"/><path d="M40 110 L16 86 M160 110 L184 86" stroke="#e15d3a" stroke-width="8" stroke-linecap="round"/>' + eyes(100, 100, "#e15d3a", gap=16, r=7), k),
    "teddy": lambda k: creature(k, "#c47a3a", "#f3d2a2", "round"),
    "bear": lambda k: creature(k, "#8a5a32", "#f3d2a2", "round"),
    "snowman": lambda k: wrap('<circle cx="100" cy="150" r="40" fill="#f4f1ea" stroke="#243044" stroke-width="4"/><circle cx="100" cy="92" r="28" fill="#f4f1ea" stroke="#243044" stroke-width="4"/>' + eyes(100, 88, "#f4f1ea", gap=10, r=5) + '<path d="M70 70 H130" stroke="#e15d3a" stroke-width="6"/>', k),
    "alien": lambda k: creature(k, "#7dce6a", "#e7f6df", "none", eyes(100, 112, "#7dce6a", gap=22, r=16)),
    "robotic": lambda k: SPECIAL["robot"](k),
}


def kind_for(tags, name):
    blob = " ".join(tags + [name]).lower()
    for word in PRIORITY:
        if word in blob.split() or word in blob:
            if word in ("kitten", "kitty"):
                return "cat"
            if word in ("puppy", "pup"):
                return "dog"
            if word in ("bunny",):
                return "rabbit"
            if word in ("pony",):
                return "horse"
            if word in ("dino",):
                return "dinosaur"
            if word in ("airplane", "aeroplane"):
                return "plane"
            if word in ("ship",):
                return "boat"
            if word in ("bike",):
                return "bicycle"
            if word in ("tortoise",):
                return "turtle"
            return word
    return "friend"


def friend(key, n):
    color = PALETTE[n % len(PALETTE)]
    ear = ["round", "point", "flop", "long"][n % 4]
    return creature(key, color, "#fff", ear)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def png(path, size):
    def pixel(x, y, n):
        cx, cy, r = n / 2, n / 2, n * 0.42
        dx, dy = x - cx, y - cy
        if dx * dx + dy * dy > r * r:
            return (255, 246, 234, 0)
        # eyes
        for ex in (cx - n * 0.12, cx + n * 0.12):
            if (x - ex) ** 2 + (y - cy * 0.92) ** 2 < (n * 0.06) ** 2:
                return (36, 48, 68, 255)
        return (240, 138, 36, 255)

    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            row.extend(pixel(x, y, size))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    blob = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as handle:
        handle.write(blob)


def main():
    lib_path = os.path.join(ROOT, "js", "library.js")
    raw = open(lib_path, encoding="utf-8").read()
    data = json.loads(raw.split("=", 1)[1].strip().rstrip(";"))
    made = 0

    for animal in data["animals"]:
        key = animal["id"]
        art = SPECIAL.get(key, lambda k, key=key: friend(k, sum(ord(c) for c in key)))(key)
        dest = os.path.join(ROOT, "assets", "animals", key + ".svg")
        write(dest, art)
        animal["src"] = "assets/animals/%s.svg" % key
        made += 1

    for crop in data["crops"]:
        dest = os.path.join(ROOT, "assets", "crops", crop["id"] + ".svg")
        write(dest, crop_art(crop["id"], crop["id"]))
        crop["src"] = "assets/crops/%s.svg" % crop["id"]
        made += 1

    for name in ("seed", "sprout", "soil", "path", "grass", "rock", "log", "bird"):
        folder = {"seed": "farm", "sprout": "farm", "soil": "farm", "path": "scenes", "grass": "scenes", "rock": "dash", "log": "dash", "bird": "dash"}[name]
        if name == "bird":
            art = SPECIAL["bird"](name)
        elif name in ("grass", "path", "soil", "rock", "log"):
            art = scene(name, name)
        else:
            art = crop_art(name, name)
        write(os.path.join(ROOT, "assets", folder, name + ".svg"), art)
        data["props"][name] = "assets/%s/%s.svg" % (folder, name)
        made += 1

    money_art = {
        "5c": ("5c", "#c0c6ce", True),
        "20c": ("20c", "#d7dde6", True),
        "50c": ("50c", "#e7d7a8", True),
        "1d": ("$1", "#f0b429", True),
        "n1": ("$1", "#f4b4c8", False),
        "n2": ("$2", "#f4f1ea", False),
        "n5": ("$5", "#d7eef8", False),
        "n10": ("$10", "#f4b4c8", False),
        "n20": ("$20", "#f0b429", False),
    }
    for item in data["money"]:
        label, fill, is_coin = money_art[item["id"]]
        art = coin(item["id"], label, fill) if is_coin else note(item["id"], label, fill)
        filename = os.path.basename(item["src"]).rsplit(".", 1)[0] + ".svg"
        write(os.path.join(ROOT, "assets", "money", filename), art)
        item["src"] = "assets/money/" + filename
        made += 1

    for index, character in enumerate(data["characters"]):
        kind = kind_for(character.get("tags") or [], character.get("title") or character["id"])
        if kind in ("car", "truck", "bus", "train", "plane", "boat", "bicycle", "tractor", "firetruck"):
            color = PALETTE[index % len(PALETTE)]
            art = vehicle(character["id"], color, "plane" if kind == "plane" else "boat" if kind == "boat" else "ground")
        elif kind in SPECIAL:
            art = SPECIAL[kind](character["id"])
        elif kind == "friend":
            art = friend(character["id"], index)
        else:
            art = friend(character["id"], index)
        filename = os.path.basename(character["src"]).rsplit(".", 1)[0] + ".svg"
        write(os.path.join(ROOT, "assets", "characters", filename), art)
        character["src"] = "assets/characters/" + filename
        made += 1

    vehicles = [
        ("town-car", "#2f7dd1", "ground"), ("scooter", "#f0b429", "ground"), ("tractor", "#2e9b5b", "ground"),
        ("go-kart", "#e15d3a", "ground"), ("quad", "#7d5cc6", "ground"), ("taxi", "#f0b429", "ground"),
        ("motorbike", "#1d2a24", "ground"), ("truck", "#8a5a32", "ground"), ("bus", "#f08a24", "ground"),
        ("ice-cream", "#f4b4c8", "ground"), ("dump", "#c4a46a", "ground"), ("digger", "#f0b429", "ground"),
        ("fire", "#e15d3a", "ground"), ("ambulance", "#f4f1ea", "ground"), ("police", "#1d3d73", "ground"),
        ("boat", "#14919b", "boat"), ("monster", "#3d4d3a", "ground"), ("sports", "#f08a24", "ground"),
        ("plane", "#7aa7c7", "plane"), ("race", "#f4f1ea", "ground"), ("limo", "#1d2a24", "ground"),
        ("supercar", "#c81e1e", "ground"),
    ]
    drive_path = os.path.join(ROOT, "js", "drive.js")
    drive = open(drive_path, encoding="utf-8").read()
    for vid, color, kind in vehicles:
        write(os.path.join(ROOT, "assets", "vehicles", vid + ".svg"), vehicle(vid, color, kind))
        photo = "assets/vehicles/%s.svg" % vid
        if re.search(r'id: "%s"' % vid, drive):
            if re.search(r'id: "%s".*?photo: "[^"]*"' % vid, drive):
                drive = re.sub(r'(id: "%s".*?photo: ")[^"]*"' % vid, r'\1%s"' % photo, drive, count=1)
            else:
                drive = re.sub(r'(id: "%s".*?color: 0x[0-9a-fA-F]+)' % vid, r'\1, photo: "%s"' % photo, drive, count=1)
        made += 1
    open(drive_path, "w", encoding="utf-8").write(drive)

    header = "/* Original cartoon art. Search still uses the bundled titles and tags. */\nwindow.MG_LIBRARY = "
    open(lib_path, "w", encoding="utf-8").write(header + json.dumps(data, indent=2) + ";\n")

    for name, size in (("favicon.png", 64), ("icon-192.png", 192), ("icon-512.png", 512)):
        png(os.path.join(ROOT, "assets", name), size)

    removed = 0
    for folder, _, files in os.walk(os.path.join(ROOT, "assets")):
        for name in files:
            if name.lower().endswith((".jpg", ".jpeg")):
                os.remove(os.path.join(folder, name))
                removed += 1
    print("drew", made, "removed photos", removed)


if __name__ == "__main__":
    main()
