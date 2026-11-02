# Chaos Arcade

Decision locked November 2, 2026: build direction B from Chat Council. Chat chooses the obstacle; the streamer plays a short timing challenge.

## Delivery target

Submit by **4:00pm Eastern, November 2, 2026**. The verified official cutoff is 5:00pm Eastern. Protect recording and upload time: working game and Twitch connection first, feature freeze by 2:15pm, record by 2:45pm, upload and submission checks afterward.

## Smallest complete experience

- Five short rounds with a visible score and a final result.
- During each voting window, viewers send `!tiny`, `!reverse`, or `!speed` in Twitch chat. Each viewer has one ballot; the latest valid command replaces their earlier vote.
- The winning modifier changes the upcoming timing challenge. The host starts the challenge and presses Stop or Space inside the target.
- The audience can see the votes, the selected modifier, and the consequence. A single viewer is sufficient to demonstrate the connection.
- A clearly labeled rehearsal mode works without Twitch. It cannot supply evidence of live integration.

## Technical boundary

Static browser app hosted on Vercel. Browser OAuth implicit grant and Twitch EventSub WebSocket, read-only `user:read:chat`. No client secret, chat posting, paid services, LLM runtime, database, or Twitch Extension review in the critical path. The browser game window is the capture surface; no claim of a separate synchronized OBS overlay.

Original concept gallery and Last Shuttle prototype remain separate. This app is newly built for this event. Interface layout references from the concept stage are credited in the README; game mechanics, visual treatment, and code are this project's work.

## Current checkpoint

November 2: implementation commit `2a64840` passes 22 deterministic checks and the production build. Browser verification covers a full match, timeout, disconnected live mode, phone-width layout, and 720p presentation. The app and recorder are deployed at https://chaos-arcade-teamvince.vercel.app/ with public source at https://github.com/VJDiPaola/chaos-arcade. A public rehearsal round and the deployed security headers passed verification.

Live integration is verified in signed-in Chrome. Real Twitch commands selected Tiny Target and Double Speed and produced scored rounds. Live testing exposed an unbound browser fetch receiver, fixed in `f447079`, and a Twitch/browser clock mismatch, fixed in `2a64840`. A fresh deployed test accepted an immediate !tiny vote and replaced it with !reverse while keeping one voter. The channel was offline; this is real chat integration, not a broadcast claim.

A 75-second captioned MP4 is published as an Unlisted [YouTube demo](https://youtu.be/SDbK55K7JN8). Playback works, unauthenticated YouTube metadata resolves, and Devpost accepted the embedded video. The owner selected the made-for-kids audience setting.

The [Devpost entry](https://devpost.com/software/chaos-arcade) was submitted on November 2 at approximately **3:57pm Eastern**, before the 4pm target. The owner confirmed eligibility, survey answers, and the final rules/terms agreement. Devpost displayed "Project submitted!" and "SUBMITTED TO Codex x TwitchCon Hackathon." Submission ID: `1279429`.

## Acceptance and submission evidence

| Requirement | Acceptance evidence |
|---|---|
| Playable game | Complete a session, see results, restart; desktop and narrow-screen controls work. |
| Twitch connection | Fresh real channel message appears as a valid vote and changes the selected modifier. |
| Reliable votes | Repeated message IDs do not count twice; revotes replace; closed rounds ignore incoming ballots. |
| Honest modes | Rehearsal is visibly labeled; connection loss does not silently introduce simulated votes. |
| Runnable source | Direct repository URL, assets, setup and run instructions, final tested revision. |
| Demo | YouTube video under three minutes, accessible without signing in, showing live Twitch behavior and Codex use. |
| Codex | Primary session ID: `01a18078-9a23-7320-bc0f-0df82dca7f6b`. Build agents work under this parent chat. |
| Submission | Required fields reviewed, personal attestations confirmed by Vince, final Devpost status explicitly Submitted. |

Official sources: [rules](https://twitchcon-codex.devpost.com/rules), [event](https://twitchcon-codex.devpost.com/), [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [EventSub](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).
