# Maths Genius

Maths games for Australian primary children, from Prep to Year 6. Everything single-player stays on the device: profiles, scores, farms and block builds are saved in the browser. There is no account and no server for the games themselves.

## Play it

You need a modern browser.

From this folder:

```bash
python3 -m http.server 4177
```

Then open http://127.0.0.1:4177

Opening `index.html` directly also runs the games. Installing the app, and Play Together, need a normal web address (a local server or GitHub Pages) because service workers and WebRTC do not run from a `file://` page.

## Add it to the home screen

The site is a progressive web app. The first visit downloads the pages, scripts, pictures and the local copies of Three.js and Trystero. After that, every single-player game, profile and avatar works with no internet. Play Together is the only part that needs a connection. If you are offline, that screen says so.

Paths are relative, so the app also works on a GitHub Pages project site such as `https://your-name.github.io/maths-genius/`. Publish this folder as the site root. Do not rename `sw.js` or move it out of the top folder; its scope is the folder it sits in.

## Players

On the start screen, pick a player or add one. A player has:

- a name
- a grade from Prep to Year 6
- an age from 5 to 12
- an avatar

The avatar can be a drawn portrait (skin tone, face shape, hair, eyes, glasses, freckles, headwear and clothing) or a photograph of an animal. The portrait is drawn in the browser. The camera is never used, and photos of the child are never uploaded.

Grade chooses the starting difficulty for Maths Genius and for the maths inside the other games. If a round goes very well, the next one steps up a little. If it is a struggle, the next one eases off. Age and grade never leave the device.

Remove or edit a player from the start screen. That only deletes data in this browser.

## Games

- **Maths Genius** — rounds of 10 questions: addition and subtraction, 2, 5 and 10 times tables (more tables for older grades), skip counting, Australian coins and notes, and telling the time. Answers are multiple choice or typed. Stars are saved.
- **3D Builder** — a grid floor, coloured blocks, tap to build or remove, and buttons plus dragging to turn and zoom. A line under the grid counts the blocks. The build is saved for that player.
- **Grow a Farm** — plant seeds, answer a question to water, and watch seed, sprout, plant and harvest. Harvest pays coins. Buying seeds takes a question too. Growth uses the clock, so it continues if you leave the page. Times are short so you can see a full grow in one visit.
- **Speed Escape** — a times-tables race. Correct answers keep you ahead of the fox, and the fox gets faster. Choose which tables to practise. Best score and longest escape are saved. The idea is in the same family as a speed chase, with original wording and pictures.
- **Animal Dash** — an endless run on three lanes. Arrows or swipes move, jump and duck. Coins are worth collecting. Some gates show a times-tables question: run through the lane with the right answer for bonus coins. High score and the chosen animal are saved.
- **Blocky Multiplication** — search the bundled picture library for someone to play as (try dragon, robot or unicorn). Answer times tables to grow a stack of blocks and clear walls, or shrink to fit through a gap. The search never uses the open web. If a word has no picture, the game asks you to try another word. High score and character are saved.

## Play Together

Create a private room and read the short code to a friend. They type the code to join. There is no room list and no matchmaking. Rooms hold 4 players. The host can remove someone. There is no chat: only the preset cheers Nice work, Wow, Go, go, go, and Thanks.

What other players see is a first name and an avatar. Age, grade and the rest of the profile stay in local storage.

Two activities:

- a maths race with the same questions and live scores (the host picks the year level)
- shared building in 3D Builder

### How the connection works

Play Together uses [Trystero](https://github.com/dmotz/trystero) 0.21, vendored in `vendor/trystero.min.js` (MIT). Trystero's default strategy is public [Nostr](https://nostr.com) relays. The library keeps a list of relays and uses five of them for redundancy. No account, no API key and no secret is shipped in the page. After the browsers find each other, game messages travel on a WebRTC data channel.

This is more redundant than the single public PeerJS broker, which has had outages and asks busy apps to run their own server. Nostr still is not a promise: a school filter can block the relays or WebRTC, and there is no TURN server here for the hardest NATs. If a room cannot be found, the screen says to check the code and the internet.

Other limits:

- If the host leaves or the connection drops, the room ends. It does not move to a new host.
- A removed player is told to leave. A modified browser could ignore that message.
- Short codes could theoretically clash. There is no directory of open rooms.
- The race is a friendly game. It is not a secure test.
- Shared blocks are stored on the host's profile. Guests see the live build.

## Pictures and licences

Photographs and the font licence are listed in [CREDITS.md](CREDITS.md). Pictures are files in this repository, not hotlinked. Clock faces and designed avatars are original SVG drawings. Obstacle shapes in Animal Dash are drawn on the canvas so they stay easy to read while running; the runner and the coins are photographs.

Three.js and Trystero are MIT licensed. Copies of those licences are in `vendor/`. Nunito is used under the SIL Open Font License (`assets/fonts/OFL.txt`).

## Tests

```bash
node --test tests/logic.test.js
```
