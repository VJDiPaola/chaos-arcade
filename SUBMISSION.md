# Chaos Arcade submission draft

Status: game built, publicly deployed, and connected to actual Twitch chat. The 75-second captioned demo contains a real `!speed` vote, Double Speed challenge, and scored result. The channel was offline. Video publication and final submission remain pending. Devpost draft 1279429 exists with the project name and pitch saved; the remaining content is prepared for the video link and owner confirmations.

Implementation checkpoint: `2a64840`. All 22 deterministic tests and the production build passed, including regressions for the browser fetch receiver and alignment between Twitch and browser clocks. The deployed clock fix was verified with an immediate real `!tiny` vote followed by `!reverse`: the choice changed while the voter count stayed at one. Browser checks also covered a full session, timeout, disconnected-live guard, 390px layout, and 1280x720 presentation. Actual tab capture, download, and MP4 decoding passed. The chosen captioned demo is silent; microphone capture was not used.

## Project name

Chaos Arcade

## Tagline

Chat picks the chaos. You stick the landing. A five-round Twitch game where viewers choose the obstacle and the streamer fights for the point.

## Description draft

### Inspiration

Chat Council started with a question: how can a small Twitch audience make a visible difference to what happens on screen? I compared five gameplay and visual directions with Codex, then chose a short arcade contest where chat becomes the streamer's opponent.

### What it does

Chaos Arcade is a short competitive game for Twitch streamers and their viewers. Viewers vote in chat for a modifier such as Tiny Target, Reverse, or Double Speed. The streamer then tries to stop a moving marker inside the target. Votes, the chosen obstacle, and the result stay visible so viewers can follow the effect of their decisions.

The match is designed for quick rounds and a small starting audience. One viewer can influence a challenge. Each viewer gets one ballot per voting window, with their latest valid choice replacing their previous vote.

The host opens a 12-second vote, then has eight seconds to stop the marker. Tiny Target halves the margin for error, Reverse changes direction, and Double Speed makes timing harder. Results award a point to the streamer or chat across five rounds. A separate, visibly labeled rehearsal mode lets people test the game before connecting a channel.

### How I built it with Codex

The implementation uses JavaScript, HTML, and CSS for the game, Twitch OAuth for read-only chat access, and an EventSub WebSocket for incoming messages. It runs as a static browser app on Vercel. The game does not send chat messages or require a client secret, paid LLM calls, or a second bot account.

I used OpenAI Codex to explore five gameplay and visual directions, choose the arcade concept, implement the game state and Twitch integration, and develop checks for voting and session behavior. The visual direction uses acid yellow, purple, and pink with large controls and short instructions intended to be legible in a recording or broadcast.

### Challenges and what I learned

Live integration exposed a browser-specific fetch binding error and a timing boundary between Twitch's clock and the browser's clock. Codex helped reproduce both, correct the receiver binding, align event timestamps, and add regression tests. That reinforced the need to test the actual authorization-to-chat path before calling an integration complete.

Voting also needs precise rules: duplicate messages must not count twice, viewers can change their choice, late votes must not leak into a new round, and losing the chat connection must not silently introduce practice voters. The implementation makes those boundaries explicit.

### What works today

Twenty-two deterministic tests and the production build pass. Browser checks covered a full match, restart, timeouts, disconnected live mode, narrow screens, and a 720p presentation. In real Twitch tests on team_vince, actual commands became votes and changed the selected challenge. The recorded round shows !speed selecting Double Speed and producing a scored result. An additional live test verified that changing from !tiny to !reverse replaces the ballot without adding a voter. The channel was offline during these tests; this is a hackathon prototype, with no claim of streamer adoption or an active broadcast.

### What's next

Test the pacing with streamers and viewers, tune voting windows for stream delay, and add new challenges if playtests show that the core loop is fun.

## Required links and evidence

- Game URL: https://chaos-arcade-teamvince.vercel.app/ (public page, rehearsal, and an actual Twitch-selected round verified).
- Source repository: https://github.com/VJDiPaola/chaos-arcade (public, main branch).
- YouTube demo: 75.033-second captioned MP4 prepared and decoded successfully; upload approval, publication, and logged-out playback pending.
- Main Codex session ID: `01a18078-9a23-7320-bc0f-0df82dca7f6b`.
- Real Twitch proof: read-only authorization and enabled EventSub subscription for team_vince; `!tiny` accepted as one vote, Tiny Target selected, challenge completed with chat score 1. Channel offline; no active broadcast claimed.
- Devpost draft: https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions/1279429-chaos-arcade/project_details/edit (Draft, 2/5 steps; not submitted).

## Built with

OpenAI Codex, JavaScript, HTML, CSS, Twitch EventSub, Twitch OAuth, Node.js test runner, Vercel.

## Known limits to preserve in the final entry

This is a hackathon prototype, not a proven streamer business or adoption claim. Rehearsal votes are synthetic. A real chat connection is distinct from an active livestream. Final implemented features and tests must be checked before describing them as complete.
