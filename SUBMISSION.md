# Chaos Arcade submission

Status: **Submitted to the Codex x TwitchCon Hackathon on November 2, 2026, at approximately 3:57pm Eastern**, before the 4pm target. Devpost displayed "Project submitted!" and the project page lists the hackathon under "SUBMITTED TO." Entry: https://devpost.com/software/chaos-arcade. Submission ID: `1279429`.

The game is publicly deployed and connected to actual Twitch chat. The corrected 85-second captioned demo contains a real `!tiny` to `!reverse` revote, a Reverse challenge, a `!speed` vote and Double Speed timeout, and the resulting scores. It also shows the actual earlier Codex build conversation. The channel was offline. The owner approved the final submission and rules/terms agreement, then authorized the corrected upload and Devpost update. The corrected video is Unlisted and not made for kids, as explicitly confirmed by the owner.

The corrected video and matching public description were saved at approximately **4:41pm Eastern on November 2**, before the official 5pm deadline. Devpost retained **SUBMITTED, 5/5 steps done**, and the public page was verified with the new YouTube embed.

Implementation checkpoint: `2a64840`. All 22 deterministic tests and the production build passed, including regressions for the browser fetch receiver and alignment between Twitch and browser clocks. The deployed clock fix was verified with an immediate real `!tiny` vote followed by `!reverse`: the choice changed while the voter count stayed at one. Browser checks also covered a full session, timeout, disconnected-live guard, 390px layout, and 1280x720 presentation. Actual tab capture, download, and MP4 decoding passed. The chosen captioned demo is silent; microphone capture was not used.

## Project name

Chaos Arcade

## Tagline

Chat picks the chaos. You stick the landing. A five-round Twitch game where viewers choose the obstacle and the streamer fights for the point.

## Project description

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

Twenty-two deterministic tests and the production build pass. Browser checks covered a full match, restart, timeouts, disconnected live mode, narrow screens, and a 720p presentation. The corrected 1080p demo shows actual Twitch commands in team_vince's chat: !reverse replaces a prior !tiny vote while the voter count stays at one, then !speed selects Double Speed in the next round. Both rounds show the resulting score; the second also demonstrates the timeout rule. The channel was offline during these tests; this is a hackathon prototype, with no claim of streamer adoption or an active broadcast.

### What's next

Test the pacing with streamers and viewers, tune voting windows for stream delay, and add new challenges if playtests show that the core loop is fun.

## Required links and evidence

- Game URL: https://chaos-arcade-teamvince.vercel.app/ (public page, rehearsal, and an actual Twitch-selected round verified).
- Source repository: https://github.com/VJDiPaola/chaos-arcade (public, main branch).
- YouTube demo: https://youtu.be/jvNdcUcGnvA — Unlisted, 85.033 seconds, 1920×1080 at 30 fps, captioned and silent. The final MP4 decoded successfully; actual YouTube playback reported 1920×1080; metadata was retrieved without authentication; Devpost saved and publicly embedded the new link. The browser playback check used an existing signed-in session, so it is not described as logged-out playback proof.
- Main Codex session ID: `01a18078-9a23-7320-bc0f-0df82dca7f6b`.
- Real Twitch proof: read-only authorization and enabled EventSub subscription for team_vince; `!tiny` accepted as one vote, Tiny Target selected, challenge completed with chat score 1. Channel offline; no active broadcast claimed.
- Submitted entry: https://devpost.com/software/chaos-arcade (explicit submission confirmation observed at approximately 3:57pm Eastern on November 2, 2026).

## Built with

OpenAI Codex, JavaScript, HTML, CSS, Twitch EventSub, Twitch OAuth, Node.js test runner, Vercel.

## Known limits to preserve in the final entry

This is a hackathon prototype, not a proven streamer business or adoption claim. Rehearsal votes are synthetic. A real chat connection is distinct from an active livestream. Final implemented features and tests must be checked before describing them as complete.
