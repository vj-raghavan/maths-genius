#!/usr/bin/env python3
"""Download curated, kid-safe images and write js/library.js plus CREDITS.md."""

import io
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
UA = "MathsGeniusEducational/1.0 (offline kids maths game; local asset mirror)"
BAD = re.compile(
    r"\b(nude|naked|sex|sexy|porn|erotic|bikini|lingerie|gore|bloody|gun|rifle|"
    r"pistol|weapon|drug|cocaine|beer|wine|alcohol|cigarette|horror|zombie|skull|"
    r"demon|devil|kill|murder|nsfw|underwear|swimsuit|tattoo|violence|violent)\b",
    re.I,
)

credits = []


def strip_html(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def allowed_licence(name):
    text = (name or "").lower()
    if any(flag in text for flag in ("noncommercial", "non-commercial", "-nc", "nc ", "no deriv", "-nd")):
        return False
    keys = ("cc0", "public domain", "pdm", "cc by", "cc-by", "by-sa", "attribution")
    return any(key in text for key in keys)


def safe_text(*parts):
    blob = " ".join(p for p in parts if p)
    return not BAD.search(blob)


def fetch(url, limit=10_000_000):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read(limit)


def save_jpeg(data, dest, size):
    image = Image.open(io.BytesIO(data))
    if getattr(image, "n_frames", 1) > 1:
        image.seek(0)
    image = image.convert("RGB")
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    if min(image.size) < 180:
        raise ValueError("image too small")
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "JPEG", quality=78, optimize=True)


def add_credit(record):
    credits.append(record)


def wiki_search(query, limit=8):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": 900,
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    payload = json.loads(fetch(url, 2_000_000))
    pages = (payload.get("query") or {}).get("pages") or {}
    found = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        licence = strip_html((meta.get("LicenseShortName") or {}).get("value"))
        mime = info.get("mime") or ""
        title = page.get("title") or ""
        artist = strip_html((meta.get("Artist") or {}).get("value"))
        if not mime.startswith("image/"):
            continue
        if mime in ("image/svg+xml", "image/gif", "image/tiff"):
            continue
        if not allowed_licence(licence):
            continue
        description = strip_html((meta.get("ImageDescription") or {}).get("value"))
        if not safe_text(title, description, artist):
            continue
        thumb = info.get("thumburl") or info.get("url")
        if not thumb:
            continue
        found.append({
            "title": title.replace("File:", ""),
            "url": thumb,
            "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
            "creator": artist or "Wikimedia Commons contributor",
            "licence": licence or "See source",
            "licence_url": strip_html((meta.get("LicenseUrl") or {}).get("value")),
            "size": info.get("size") or 0,
        })
    found.sort(key=lambda item: item["size"], reverse=True)
    return found


def openverse_search(query, limit=6):
    params = {
        "q": query,
        "page_size": limit,
        "license": "cc0,pdm,by,by-sa",
        "mature": "false",
    }
    url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(params)
    payload = json.loads(fetch(url, 2_000_000))
    found = []
    for item in payload.get("results") or []:
        if item.get("mature"):
            continue
        licence = (item.get("license") or "").lower()
        if licence not in ("cc0", "pdm", "by", "by-sa"):
            continue
        title = item.get("title") or ""
        tags = " ".join((tag.get("name") or "") for tag in (item.get("tags") or [])[:12])
        if not safe_text(title, tags):
            continue
        image_url = item.get("url")
        if not image_url:
            continue
        licence_name = {
            "cc0": "CC0 1.0",
            "pdm": "Public domain",
            "by": "CC BY",
            "by-sa": "CC BY-SA",
        }[licence]
        version = item.get("license_version")
        if version and licence in ("by", "by-sa"):
            licence_name = f"{licence_name} {version}"
        found.append({
            "title": strip_html(title)[:140] or query,
            "url": image_url,
            "page": item.get("foreign_landing_url") or item.get("detail_url") or image_url,
            "creator": strip_html(item.get("creator") or "") or "Unknown creator",
            "licence": licence_name,
            "licence_url": item.get("license_url") or "",
            "size": item.get("width") or 0,
        })
    return found


def take_image(candidates, dest, size, used_urls):
    for candidate in candidates:
        if candidate["url"] in used_urls:
            continue
        try:
            data = fetch(candidate["url"])
            save_jpeg(data, dest, size)
        except Exception as error:
            print("  skip", candidate["title"][:60], type(error).__name__)
            continue
        used_urls.add(candidate["url"])
        add_credit({
            "file": str(dest.relative_to(ROOT)).replace("\\", "/"),
            "title": candidate["title"],
            "creator": candidate["creator"],
            "licence": candidate["licence"],
            "licence_url": candidate["licence_url"],
            "source": candidate["page"],
        })
        print("  saved", dest.name, "<-", candidate["title"][:70])
        return True
    return False


def search_both(query):
    found = []
    try:
        found.extend(openverse_search(query))
    except Exception as error:
        print("  openverse", query, type(error).__name__, error)
    try:
        found.extend(wiki_search(query))
    except Exception as error:
        print("  wiki", query, type(error).__name__, error)
    return found


def download_named(spec, used_urls):
    dest = ROOT / spec["dest"]
    print("GET", spec["dest"])
    candidates = []
    for filename in spec.get("files", []):
        try:
            candidates.extend(wiki_search("intitle:\"" + filename.rsplit(".", 1)[0] + "\"", 4))
        except Exception as error:
            print("  named search failed", filename, error)
        candidates.append({
            "title": filename,
            "url": "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename) + "?width=900",
            "page": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_")),
            "creator": spec.get("creator", "See Wikimedia Commons file page"),
            "licence": spec.get("licence", "See source"),
            "licence_url": spec.get("licence_url", ""),
            "size": 1,
        })
    # Prefer API metadata when the filename matches.
    precise = []
    for filename in spec.get("files", []):
        try:
            params = {
                "action": "query",
                "titles": "File:" + filename,
                "prop": "imageinfo",
                "iiprop": "url|mime|extmetadata",
                "iiurlwidth": 900,
                "format": "json",
            }
            url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
            payload = json.loads(fetch(url, 1_000_000))
            page = next(iter((payload.get("query") or {}).get("pages", {}).values()))
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata") or {}
            licence = strip_html((meta.get("LicenseShortName") or {}).get("value"))
            if info.get("thumburl") and allowed_licence(licence):
                precise.append({
                    "title": filename,
                    "url": info["thumburl"],
                    "page": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_")),
                    "creator": strip_html((meta.get("Artist") or {}).get("value")) or "Wikimedia Commons contributor",
                    "licence": licence,
                    "licence_url": strip_html((meta.get("LicenseUrl") or {}).get("value")),
                    "size": 9,
                })
        except Exception as error:
            print("  meta", filename, type(error).__name__)
    if spec.get("direct"):
        precise.append(spec["direct"])
    return take_image(precise + candidates, dest, spec.get("size", 800), used_urls)


HEROES = [
    {"dest": "assets/money/coin-5c.jpg", "files": ["Australian 5 cent piece Scan.jpg"], "size": 700},
    {"dest": "assets/money/coin-50c.jpg", "files": ["1966 australian 50 cent piece circular.jpg"], "size": 700},
    {"dest": "assets/money/coin-50c-reverse.jpg", "files": ["Australian fifty-cent coin reverse.jpg"], "size": 700},
    {"dest": "assets/money/note-1.jpg", "files": ["Australian $1 - original series - obverse.jpg"], "size": 900},
    {"dest": "assets/money/note-2.jpg", "files": ["Australian $2 - original series - obverse.jpg"], "size": 900},
    {"dest": "assets/money/note-5.jpg", "files": ["Australian $5 - original series - obverse.jpg"], "size": 900},
    {"dest": "assets/money/note-10.jpg", "files": ["Australian $10 - original series - obverse.png"], "size": 900},
    {"dest": "assets/money/note-20.jpg", "files": ["Australian $20 - original series - obverse.jpg"], "size": 900},
    {
        "dest": "assets/money/coin-20c.jpg",
        "size": 700,
        "direct": {
            "title": "Specimen Coin - 20 Cents, Australia, 1966",
            "url": "https://collections.museumsvictoria.com.au/content/media/38/216088-large.jpg",
            "page": "https://collections.museumsvictoria.com.au/items/68203",
            "creator": "Naomi Andrzejeski / Museums Victoria",
            "licence": "CC BY 4.0",
            "licence_url": "https://creativecommons.org/licenses/by/4.0/",
            "size": 9,
        },
    },
]

ANIMAL_QUERIES = [
    ("koala", "Koala", "koala animal"),
    ("kangaroo", "Kangaroo", "red kangaroo"),
    ("wombat", "Wombat", "wombat animal"),
    ("kookaburra", "Kookaburra", "kookaburra bird"),
    ("platypus", "Platypus", "platypus"),
    ("echidna", "Echidna", "short-beaked echidna"),
    ("dog", "Dog", "dog portrait pet"),
    ("cat", "Cat", "domestic cat portrait"),
    ("horse", "Horse", "horse portrait"),
    ("penguin", "Penguin", "penguin bird"),
    ("fox", "Fox", "red fox animal"),
    ("rabbit", "Rabbit", "rabbit animal"),
    ("owl", "Owl", "owl bird portrait"),
    ("frog", "Frog", "frog animal"),
    ("turtle", "Turtle", "turtle animal"),
    ("cockatoo", "Cockatoo", "sulphur-crested cockatoo"),
]

CROP_QUERIES = [
    ("carrot", "Carrot", "carrot vegetable"),
    ("tomato", "Tomato", "tomato vegetable"),
    ("strawberry", "Strawberry", "strawberry fruit"),
    ("sunflower", "Sunflower", "sunflower flower"),
    ("corn", "Corn", "corn cob maize"),
]

PROP_QUERIES = [
    ("assets/farm/seed.jpg", "seed pile", 640),
    ("assets/farm/sprout.jpg", "green seedling plant", 640),
    ("assets/farm/soil.jpg", "garden soil bed", 800),
    ("assets/scenes/path.jpg", "dirt path through trees", 900),
    ("assets/scenes/grass.jpg", "green grass field", 800),
    ("assets/dash/rock.jpg", "large rock boulder", 640),
    ("assets/dash/log.jpg", "wooden log", 640),
    ("assets/dash/bird.jpg", "lorikeet bird", 640),
]

CHARACTER_GROUPS = [
    ("dog", ["dog", "puppy", "pup", "canine", "pet"], "dog"),
    ("cat", ["cat", "kitten", "kitty", "pet"], "cat"),
    ("horse", ["horse", "pony"], "horse"),
    ("penguin", ["penguin", "bird"], "penguin"),
    ("fox", ["fox"], "red fox"),
    ("rabbit", ["rabbit", "bunny"], "rabbit"),
    ("duck", ["duck", "bird"], "duck bird"),
    ("frog", ["frog"], "frog"),
    ("owl", ["owl", "bird"], "owl"),
    ("turtle", ["turtle", "tortoise"], "turtle"),
    ("lion", ["lion"], "lion"),
    ("elephant", ["elephant"], "elephant"),
    ("fish", ["fish"], "goldfish"),
    ("bird", ["bird"], "songbird"),
    ("butterfly", ["butterfly"], "butterfly"),
    ("dolphin", ["dolphin"], "dolphin"),
    ("whale", ["whale"], "humpback whale"),
    ("teddy", ["teddy", "bear", "toy"], "teddy bear"),
    ("robot", ["robot"], "toy robot"),
    ("unicorn", ["unicorn"], "unicorn toy"),
    ("dragon", ["dragon"], "dragon toy"),
    ("dinosaur", ["dinosaur"], "toy dinosaur"),
    ("kite", ["kite"], "kite flying"),
    ("ball", ["ball", "sport"], "colourful ball"),
    ("train", ["train"], "steam train"),
    ("car", ["car"], "toy car"),
    ("bicycle", ["bicycle", "bike"], "bicycle"),
    ("boat", ["boat", "ship"], "sailing boat"),
    ("rocket", ["rocket", "space"], "model rocket"),
    ("plane", ["plane", "aeroplane", "airplane"], "aeroplane"),
    ("castle", ["castle"], "castle building"),
    ("flower", ["flower"], "garden flower"),
    ("tree", ["tree"], "tree"),
    ("apple", ["apple", "fruit"], "red apple"),
    ("banana", ["banana", "fruit"], "banana"),
    ("moon", ["moon", "night"], "full moon"),
    ("cake", ["cake"], "birthday cake"),
    ("koala", ["koala"], "koala"),
    ("kangaroo", ["kangaroo"], "kangaroo"),
    ("panda", ["panda", "bear"], "giant panda"),
    ("bear", ["bear"], "brown bear"),
    ("monkey", ["monkey"], "monkey"),
    ("zebra", ["zebra"], "zebra"),
    ("giraffe", ["giraffe"], "giraffe"),
    ("parrot", ["parrot", "bird"], "parrot"),
    ("bee", ["bee"], "honey bee"),
    ("crab", ["crab"], "crab"),
    ("starfish", ["starfish", "star"], "starfish"),
    ("ladybug", ["ladybug", "beetle"], "ladybug"),
    ("truck", ["truck"], "toy truck"),
    ("bus", ["bus"], "bus"),
    ("crown", ["crown"], "gold crown"),
    ("knight", ["knight"], "knight armour"),
    ("pirate", ["pirate", "ship"], "pirate ship"),
    ("wizard", ["wizard"], "wizard hat"),
    ("fairy", ["fairy"], "fairy tale illustration"),
    ("rainbow", ["rainbow"], "rainbow sky"),
    ("mountain", ["mountain"], "mountain landscape"),
    ("beach", ["beach", "sea"], "sandy beach landscape"),
    ("snowman", ["snowman", "snow"], "snowman"),
    ("cupcake", ["cupcake", "cake"], "cupcake"),
    ("tractor", ["tractor", "farm"], "farm tractor"),
    ("firetruck", ["firetruck", "truck"], "fire engine"),
    ("rocket2", ["rocket", "space", "astronaut"], "astronaut"),
    ("whale2", ["whale", "ocean"], "whale tail"),
    ("puppy2", ["puppy", "dog"], "puppy"),
    ("kitten2", ["kitten", "cat"], "kitten"),
]


def illustrate(kind, dest):
    """Original picture-book scenes so fantasy words always have a match."""
    palettes = {
        "dragon": ("#8ec8f5", "#7dba6a", "#2f8f55", "#e7c56a"),
        "unicorn": ("#d9e6ff", "#c6e2a5", "#f4f1ff", "#e7b3d8"),
        "robot": ("#d7ecff", "#cfd8e3", "#4aa3d8", "#f0b429"),
        "dinosaur": ("#c8e7c0", "#8fbf6a", "#3e8f4a", "#e6a15c"),
        "rocket": ("#1d2a55", "#f2f6ff", "#e15d3a", "#f0b429"),
        "castle": ("#bfe3ff", "#8fbf6a", "#d9d3ea", "#c4b8e0"),
        "wizard": ("#c9d4f5", "#87b86a", "#3d4d8f", "#f0b429"),
        "train": ("#d7f0ff", "#8dba6b", "#c4473a", "#f2d36b"),
        "boat": ("#b7e0f7", "#3d8ec4", "#f4e2b0", "#e07a3d"),
        "butterfly": ("#e7f6ff", "#b7e39a", "#e15d8a", "#7b6ad6"),
        "knight": ("#d5e4f7", "#7eaa62", "#8d97a8", "#d9dee6"),
        "pirate": ("#bfe7f8", "#3f8fba", "#8a5a32", "#f0f3f4"),
        "fairy": ("#efe4ff", "#b7d98a", "#f2c1e0", "#7d5cc6"),
        "visitor": ("#d9ecff", "#9ccc78", "#6fbf73", "#f7f3ea"),
        "fish": ("#b7e4f8", "#2f7dd1", "#f08a24", "#ffe08a"),
        "castle2": ("#d5ecff", "#6ea85a", "#e7dcc4", "#b4533a"),
    }
    sky, ground, main, accent = palettes[kind]
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img">
  <rect width="480" height="480" fill="{sky}"/>
  <circle cx="400" cy="72" r="34" fill="#ffe08a"/>
  <ellipse cx="240" cy="410" rx="230" ry="78" fill="{ground}"/>
  {SCENE[kind]}
</svg>'''
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(svg, encoding="utf-8")
    add_credit({
        "file": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "title": f"Original illustration: {kind}",
        "creator": "Maths Genius (original artwork for this project)",
        "licence": "Original work, released with this project for use in the game",
        "licence_url": "",
        "source": "Drawn for Maths Genius. Not copied from another game.",
    })


SCENE = {}


def scenes():
    SCENE["dragon"] = '''
  <ellipse cx="230" cy="300" rx="120" ry="62" fill="#2f8f55"/>
  <ellipse cx="230" cy="312" rx="86" ry="36" fill="#57b57a"/>
  <path d="M120 300 C70 270 50 340 100 360 C130 340 140 330 150 320" fill="#2f8f55"/>
  <path d="M200 250 C150 150 250 160 250 230" fill="#257446"/>
  <path d="M250 240 C300 150 360 190 300 250" fill="#257446"/>
  <ellipse cx="330" cy="250" rx="58" ry="40" fill="#2f8f55"/>
  <ellipse cx="378" cy="262" rx="30" ry="18" fill="#57b57a"/>
  <path d="M320 214 L338 150 L354 214" fill="#e7c56a"/>
  <ellipse cx="348" cy="242" rx="11" ry="13" fill="#fff"/>
  <circle cx="351" cy="244" r="5" fill="#1d2a24"/>
  <rect x="170" y="340" width="18" height="48" rx="8" fill="#257446"/>
  <rect x="214" y="348" width="18" height="44" rx="8" fill="#257446"/>
  <rect x="270" y="348" width="18" height="44" rx="8" fill="#257446"/>
  <rect x="314" y="338" width="18" height="50" rx="8" fill="#257446"/>'''
    SCENE["unicorn"] = '''
  <ellipse cx="250" cy="300" rx="110" ry="58" fill="#f7f4ff"/>
  <ellipse cx="250" cy="312" rx="78" ry="32" fill="#e7e0f8"/>
  <path d="M150 290 C100 250 90 330 140 340" fill="#f7f4ff" stroke="#e7e0f8" stroke-width="8"/>
  <ellipse cx="345" cy="250" rx="48" ry="36" fill="#f7f4ff"/>
  <path d="M330 220 L348 150 L360 222" fill="#e7b3d8"/>
  <path d="M300 230 Q280 160 330 190" fill="#7d5cc6"/>
  <ellipse cx="360" cy="246" rx="9" ry="11" fill="#243044"/>
  <rect x="190" y="340" width="16" height="50" rx="7" fill="#d9d0ee"/>
  <rect x="230" y="346" width="16" height="46" rx="7" fill="#d9d0ee"/>
  <rect x="280" y="346" width="16" height="46" rx="7" fill="#d9d0ee"/>
  <rect x="320" y="338" width="16" height="52" rx="7" fill="#d9d0ee"/>
  <path d="M360 300 Q390 280 400 300" fill="none" stroke="#e7b3d8" stroke-width="6"/>'''
    SCENE["robot"] = '''
  <rect x="150" y="210" width="180" height="140" rx="24" fill="#4aa3d8"/>
  <rect x="168" y="228" width="144" height="70" rx="12" fill="#e8f6ff"/>
  <circle cx="210" cy="262" r="12" fill="#1d2a24"/>
  <circle cx="270" cy="262" r="12" fill="#1d2a24"/>
  <rect x="206" y="292" width="70" height="10" rx="5" fill="#f0b429"/>
  <rect x="120" y="240" width="30" height="70" rx="12" fill="#2f7ea8"/>
  <rect x="330" y="240" width="30" height="70" rx="12" fill="#2f7ea8"/>
  <rect x="180" y="350" width="36" height="50" rx="12" fill="#2f7ea8"/>
  <rect x="264" y="350" width="36" height="50" rx="12" fill="#2f7ea8"/>
  <rect x="214" y="160" width="52" height="28" rx="10" fill="#f0b429"/>
  <circle cx="240" cy="150" r="14" fill="#e15d3a"/>'''
    SCENE["dinosaur"] = '''
  <path d="M120 320 C140 230 220 210 280 240 C340 200 390 230 400 280 C360 300 330 290 300 310 C260 360 180 360 120 320Z" fill="#3e8f4a"/>
  <path d="M300 250 C340 180 390 190 380 250" fill="#3e8f4a"/>
  <circle cx="360" cy="230" r="28" fill="#3e8f4a"/>
  <circle cx="370" cy="224" r="5" fill="#1d2a24"/>
  <rect x="160" y="330" width="18" height="46" rx="8" fill="#2f6e38"/>
  <rect x="210" y="340" width="18" height="42" rx="8" fill="#2f6e38"/>
  <rect x="270" y="336" width="18" height="44" rx="8" fill="#2f6e38"/>
  <path d="M140 280 C90 250 80 210 120 200" fill="none" stroke="#3e8f4a" stroke-width="16" stroke-linecap="round"/>'''
    SCENE["rocket"] = '''
  <rect width="480" height="480" fill="#1d2a55"/>
  <circle cx="90" cy="80" r="2" fill="#fff"/><circle cx="140" cy="140" r="2" fill="#fff"/>
  <circle cx="200" cy="60" r="2" fill="#fff"/><circle cx="320" cy="110" r="2" fill="#fff"/>
  <circle cx="70" cy="200" r="2" fill="#fff"/><circle cx="400" cy="180" r="2" fill="#fff"/>
  <path d="M240 90 L290 250 L190 250 Z" fill="#f2f6ff"/>
  <circle cx="240" cy="180" r="18" fill="#7ec8f0"/>
  <path d="M190 250 L160 310 L210 270" fill="#e15d3a"/>
  <path d="M290 250 L320 310 L270 270" fill="#e15d3a"/>
  <path d="M220 250 L240 330 L260 250" fill="#f0b429"/>
  <ellipse cx="240" cy="400" rx="160" ry="30" fill="#31406e"/>'''
    SCENE["castle"] = '''
  <rect x="120" y="210" width="240" height="160" fill="#e7dcc4"/>
  <rect x="100" y="170" width="50" height="200" fill="#efe6d2"/>
  <rect x="330" y="170" width="50" height="200" fill="#efe6d2"/>
  <rect x="200" y="150" width="80" height="220" fill="#f4ecda"/>
  <rect x="228" y="250" width="28" height="70" fill="#6b4a32"/>
  <rect x="112" y="150" width="14" height="28" fill="#c4473a"/>
  <rect x="146" y="150" width="14" height="28" fill="#c4473a"/>
  <rect x="214" y="128" width="16" height="30" fill="#c4473a"/>
  <rect x="250" y="128" width="16" height="30" fill="#c4473a"/>
  <rect x="342" y="150" width="14" height="28" fill="#c4473a"/>
  <rect x="376" y="150" width="14" height="28" fill="#c4473a"/>'''
    SCENE["wizard"] = '''
  <path d="M240 120 L300 280 L180 280 Z" fill="#3d4d8f"/>
  <ellipse cx="240" cy="286" rx="78" ry="16" fill="#f0b429"/>
  <circle cx="240" cy="300" r="36" fill="#f3d2bf"/>
  <circle cx="228" cy="298" r="4" fill="#1d2a24"/>
  <circle cx="252" cy="298" r="4" fill="#1d2a24"/>
  <path d="M224 312 Q240 320 256 312" fill="none" stroke="#a15c38" stroke-width="3"/>
  <path d="M160 340 Q240 300 320 360 L300 400 L180 400 Z" fill="#3d4d8f"/>
  <rect x="300" y="250" width="10" height="90" rx="4" fill="#6b3e26"/>
  <circle cx="305" cy="242" r="12" fill="#7ec8f0"/>'''
    SCENE["train"] = '''
  <rect x="150" y="230" width="150" height="90" rx="12" fill="#c4473a"/>
  <rect x="250" y="200" width="90" height="70" rx="10" fill="#d46558"/>
  <rect x="265" y="214" width="50" height="30" rx="4" fill="#d7f0ff"/>
  <circle cx="190" cy="330" r="24" fill="#2c3330"/>
  <circle cx="250" cy="330" r="24" fill="#2c3330"/>
  <circle cx="310" cy="330" r="24" fill="#2c3330"/>
  <rect x="70" y="250" width="90" height="70" rx="8" fill="#f2d36b"/>
  <rect x="360" y="250" width="70" height="70" rx="8" fill="#6aa84f"/>
  <circle cx="100" cy="330" r="18" fill="#2c3330"/>
  <circle cx="390" cy="330" r="18" fill="#2c3330"/>'''
    SCENE["boat"] = '''
  <path d="M70 280 Q240 360 410 280 L360 300 Q240 340 120 300 Z" fill="#8a5a32"/>
  <rect x="228" y="150" width="10" height="140" fill="#6b4423"/>
  <path d="M238 160 L340 230 L238 250 Z" fill="#f4f7f8"/>
  <path d="M80 300 Q240 250 400 300" fill="none" stroke="#3d8ec4" stroke-width="16"/>
  <circle cx="250" cy="250" r="8" fill="#e07a3d"/>'''
    SCENE["butterfly"] = '''
  <ellipse cx="190" cy="230" rx="70" ry="90" fill="#e15d8a"/>
  <ellipse cx="290" cy="230" rx="70" ry="90" fill="#7b6ad6"/>
  <ellipse cx="180" cy="320" rx="40" ry="50" fill="#f0b429"/>
  <ellipse cx="300" cy="320" rx="40" ry="50" fill="#2f8f55"/>
  <rect x="232" y="180" width="16" height="150" rx="8" fill="#3a332c"/>
  <circle cx="240" cy="170" r="14" fill="#3a332c"/>
  <path d="M240 160 Q220 120 200 130" fill="none" stroke="#3a332c" stroke-width="3"/>
  <path d="M240 160 Q260 120 280 130" fill="none" stroke="#3a332c" stroke-width="3"/>'''
    SCENE["knight"] = '''
  <rect x="190" y="150" width="100" height="90" rx="16" fill="#d9dee6"/>
  <rect x="205" y="185" width="70" height="18" fill="#8ec8f5"/>
  <rect x="175" y="230" width="130" height="110" rx="16" fill="#8d97a8"/>
  <rect x="150" y="240" width="30" height="80" rx="10" fill="#7e8796"/>
  <rect x="300" y="240" width="30" height="80" rx="10" fill="#7e8796"/>
  <rect x="200" y="340" width="28" height="50" rx="8" fill="#6e7684"/>
  <rect x="252" y="340" width="28" height="50" rx="8" fill="#6e7684"/>
  <rect x="300" y="200" width="12" height="120" fill="#c0c6d0"/>'''
    SCENE["pirate"] = '''
  <path d="M80 300 Q240 380 400 300 L350 320 Q240 360 130 320 Z" fill="#8a5a32"/>
  <rect x="230" y="140" width="12" height="170" fill="#5c3b22"/>
  <path d="M242 150 L340 210 L242 250 Z" fill="#f7f7f7"/>
  <circle cx="300" cy="200" r="16" fill="#1d2a24"/>
  <rect x="292" y="188" width="16" height="8" fill="#f7f7f7"/>
  <path d="M40 330 Q240 300 440 340" fill="none" stroke="#3f8fba" stroke-width="18"/>'''
    SCENE["fairy"] = '''
  <ellipse cx="180" cy="210" rx="40" ry="70" fill="#f2c1e0" opacity="0.9"/>
  <ellipse cx="300" cy="210" rx="40" ry="70" fill="#c7b6f0" opacity="0.9"/>
  <circle cx="240" cy="200" r="28" fill="#f3d2bf"/>
  <path d="M210 250 Q240 230 270 270 L250 360 L210 340 Z" fill="#7d5cc6"/>
  <circle cx="230" cy="198" r="3" fill="#1d2a24"/>
  <circle cx="250" cy="198" r="3" fill="#1d2a24"/>
  <path d="M200 190 Q180 150 220 160" fill="#e7b3d8"/>
  <rect x="300" y="250" width="8" height="70" fill="#e7c56a"/>
  <circle cx="304" cy="242" r="10" fill="#fff6ea"/>'''
    SCENE["visitor"] = '''
  <ellipse cx="240" cy="250" rx="70" ry="90" fill="#6fbf73"/>
  <ellipse cx="240" cy="230" rx="46" ry="40" fill="#b7e6b4"/>
  <circle cx="224" cy="226" r="6" fill="#1d2a24"/>
  <circle cx="256" cy="226" r="6" fill="#1d2a24"/>
  <path d="M226 246 Q240 256 254 246" fill="none" stroke="#1d2a24" stroke-width="3"/>
  <ellipse cx="160" cy="250" rx="28" ry="16" fill="#57a85d"/>
  <ellipse cx="320" cy="250" rx="28" ry="16" fill="#57a85d"/>
  <ellipse cx="210" cy="340" rx="16" ry="22" fill="#57a85d"/>
  <ellipse cx="270" cy="340" rx="16" ry="22" fill="#57a85d"/>
  <ellipse cx="240" cy="150" rx="34" ry="10" fill="#d9dee6"/>'''
    SCENE["fish"] = '''
  <ellipse cx="250" cy="250" rx="110" ry="60" fill="#f08a24"/>
  <polygon points="340,250 410,200 410,300" fill="#e07a3d"/>
  <circle cx="190" cy="240" r="10" fill="#1d2a24"/>
  <circle cx="186" cy="238" r="3" fill="#fff"/>
  <path d="M220 210 Q250 170 280 210" fill="#ffe08a"/>
  <path d="M150 300 Q240 340 330 300" fill="none" stroke="#2f7dd1" stroke-width="10"/>'''


ILLUSTRATIONS = [
    ("dragon", ["dragon", "drake", "fantasy"], "Storybook dragon"),
    ("unicorn", ["unicorn", "fantasy", "horse"], "Storybook unicorn"),
    ("robot", ["robot", "machine"], "Helpful robot"),
    ("dinosaur", ["dinosaur", "dino"], "Storybook dinosaur"),
    ("rocket", ["rocket", "space"], "Rocket ship"),
    ("castle", ["castle", "palace"], "Stone castle"),
    ("wizard", ["wizard", "magic"], "Wizard with a wand"),
    ("train", ["train", "engine"], "Steam train"),
    ("boat", ["boat", "ship", "sail"], "Sailing boat"),
    ("butterfly", ["butterfly", "insect"], "Garden butterfly"),
    ("knight", ["knight", "armour", "armor"], "Knight in armour"),
    ("pirate", ["pirate", "ship", "boat"], "Pirate ship"),
    ("fairy", ["fairy", "magic"], "Garden fairy"),
    ("visitor", ["alien", "space", "visitor"], "Friendly space visitor"),
    ("fish", ["fish", "ocean"], "Orange fish"),
]


def make_icons():
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (32, "favicon.png")):
        image = Image.new("RGB", (size, size), "#0e7c66")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=max(4, size // 6), fill="#0e7c66")
        margin = size // 7
        draw.ellipse((margin, margin, size - margin, size - margin), fill="#f0b429")
        arm = size // 4
        thick = max(4, size // 10)
        centre = size // 2
        draw.rectangle((centre - thick // 2, centre - arm, centre + thick // 2, centre + arm), fill="#0e7c66")
        draw.rectangle((centre - arm, centre - thick // 2, centre + arm, centre + thick // 2), fill="#0e7c66")
        path = ROOT / "assets" / name
        image.save(path, "PNG")
        add_credit({
            "file": f"assets/{name}",
            "title": "Maths Genius app icon",
            "creator": "Maths Genius (original artwork for this project)",
            "licence": "Original work, released with this project for use in the game",
            "licence_url": "",
            "source": "Drawn for Maths Genius.",
        })


def write_credits():
    lines = [
        "# Image and font credits",
        "",
        "Maths Genius keeps every picture inside this repository so the game works on GitHub Pages and offline.",
        "Ages, grades and scores are not part of these files. Nothing here is loaded from a CDN when the game runs.",
        "",
        "Clock faces in the maths questions are original SVG drawings (so the hands can show each question). They are not photographs and they are not emoji.",
        "",
        "Profile avatars that children design are original SVG drawings. Animal pictures are photographs listed below.",
        "",
        "The Nunito font (assets/fonts) is by Vernon Adams and contributors, licensed under the SIL Open Font License 1.1. See assets/fonts/OFL.txt.",
        "",
        "Three.js (vendor/three.min.js) is MIT licensed. See vendor/three.LICENSE.",
        "Trystero (vendor/trystero.min.js) is MIT licensed. See vendor/trystero.LICENSE. Play Together uses it only while a room is open.",
        "",
        "## Pictures",
        "",
    ]
    for item in credits:
        lines.append(f"### {item['file']}")
        lines.append(f"- Title: {item['title']}")
        lines.append(f"- Creator: {item['creator']}")
        lines.append(f"- Licence: {item['licence']}")
        if item["licence_url"]:
            lines.append(f"- Licence URL: {item['licence_url']}")
        lines.append(f"- Source: {item['source']}")
        lines.append("")
    (ROOT / "CREDITS.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    used = set()
    scenes()
    animals = []
    for animal_id, name, query in ANIMAL_QUERIES:
        dest = ROOT / "assets" / "animals" / f"{animal_id}.jpg"
        print("ANIMAL", animal_id)
        ok = take_image(search_both(query), dest, 720, used)
        if ok:
            animals.append({"id": animal_id, "name": name, "src": f"assets/animals/{animal_id}.jpg"})
        time.sleep(0.15)

    crops = []
    for crop_id, name, query in CROP_QUERIES:
        dest = ROOT / "assets" / "crops" / f"{crop_id}.jpg"
        print("CROP", crop_id)
        ok = take_image(search_both(query), dest, 720, used)
        if ok:
            crops.append({"id": crop_id, "name": name, "src": f"assets/crops/{crop_id}.jpg"})
        time.sleep(0.15)

    props = {}
    for dest_rel, query, size in PROP_QUERIES:
        dest = ROOT / dest_rel
        print("PROP", dest_rel)
        if take_image(search_both(query), dest, size, used):
            props[Path(dest_rel).stem] = dest_rel
        time.sleep(0.15)

    for spec in HEROES:
        download_named(spec, used)
        time.sleep(0.1)

    # Extra modern-coin attempts. Kept only if the download is a real photo we can inspect.
    extra_money = [
        ("assets/money/coin-10c.jpg", "Australian 10 cent coin lyrebird"),
        ("assets/money/coin-1d.jpg", "Australian one dollar coin kangaroos"),
        ("assets/money/coin-2d.jpg", "Australian two dollar coin"),
    ]
    for dest_rel, query in extra_money:
        print("MONEY SEARCH", query)
        take_image(search_both(query), ROOT / dest_rel, 700, used)
        time.sleep(0.15)

    characters = []
    for group_id, tags, query in CHARACTER_GROUPS:
        print("CHAR", group_id)
        found = search_both(query)
        saved = 0
        for candidate in found:
            if saved >= 2:
                break
            dest = ROOT / "assets" / "characters" / f"{group_id}-{saved + 1}.jpg"
            if take_image([candidate], dest, 560, used):
                saved += 1
                characters.append({
                    "id": f"{group_id}-{saved}",
                    "title": candidate["title"][:80],
                    "tags": tags,
                    "src": f"assets/characters/{group_id}-{saved}.jpg",
                })
        time.sleep(0.12)

    for kind, tags, title in ILLUSTRATIONS:
        dest = ROOT / "assets" / "characters" / f"draw-{kind}.svg"
        print("DRAW", kind)
        illustrate(kind, dest)
        characters.append({
            "id": f"draw-{kind}",
            "title": title,
            "tags": tags,
            "src": f"assets/characters/draw-{kind}.svg",
        })

    make_icons()

    money = []
    money_meta = [
        ("5c", "5 cent coin", 5, "coin", "assets/money/coin-5c.jpg"),
        ("10c", "10 cent coin", 10, "coin", "assets/money/coin-10c.jpg"),
        ("20c", "20 cent coin", 20, "coin", "assets/money/coin-20c.jpg"),
        ("50c", "50 cent coin", 50, "coin", "assets/money/coin-50c.jpg"),
        ("1d", "1 dollar coin", 100, "coin", "assets/money/coin-1d.jpg"),
        ("2d", "2 dollar coin", 200, "coin", "assets/money/coin-2d.jpg"),
        ("n1", "1 dollar note", 100, "note", "assets/money/note-1.jpg"),
        ("n2", "2 dollar note", 200, "note", "assets/money/note-2.jpg"),
        ("n5", "5 dollar note", 500, "note", "assets/money/note-5.jpg"),
        ("n10", "10 dollar note", 1000, "note", "assets/money/note-10.jpg"),
        ("n20", "20 dollar note", 2000, "note", "assets/money/note-20.jpg"),
    ]
    for item_id, name, cents, kind, src in money_meta:
        if (ROOT / src).exists():
            money.append({"id": item_id, "name": name, "cents": cents, "kind": kind, "src": src})

    library = {
        "animals": animals,
        "crops": crops,
        "props": props,
        "money": money,
        "characters": characters,
    }
    lib_path = ROOT / "js" / "library.js"
    lib_path.write_text(
        "/* Generated by tools/fetch_assets.py. Local picture library. */\n"
        "window.MG_LIBRARY = " + json.dumps(library, indent=2) + ";\n",
        encoding="utf-8",
    )
    write_credits()
    print("ANIMALS", len(animals), "CROPS", len(crops), "MONEY", len(money), "CHARS", len(characters), "PROPS", len(props))


if __name__ == "__main__":
    main()
