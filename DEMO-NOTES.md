# Chaos Arcade demo runbook

Final corrected demo: https://youtu.be/jvNdcUcGnvA — 85.033 seconds, 1920×1080 at 30 fps, captioned and silent. Saved into the submitted Devpost entry at approximately 4:41pm Eastern on November 2, before the official 5pm deadline.

The first export was rejected after owner review because its source was scrolled down and the 720p export reduced the app further. The replacement uses a fresh native 1920×1080 capture with the whole header, scoreboard, arena, voting panel, and connection strip visible. Captions occupy verified empty space below the app. It preserves actual revoting, a missed Reverse stop, and a Double Speed timeout. A 12-second recording of the original build conversation is explicitly labeled "EARLIER CODEX BUILD SESSION."

Final decoding, representative exported frames, caption timing, actual YouTube 1920×1080 playback, public metadata, and the saved Devpost embed passed verification. The corrected upload is Unlisted and not made for kids, per the owner's confirmation. The only remaining minor UI polish observed was singular wording for "1 Twitch voters."

For future recordings, target under three minutes. Do not record a claimed live demo until a real Twitch message has been verified in the game. Rehearsal footage must be described as rehearsal.

## Before recording

1. Open the deployed game, connect the demo channel, and confirm the live connection indicator.
2. Open Twitch chat alongside the game. An offline channel's actual chat can be used for the integration demonstration; do not describe it as a livestream unless broadcasting is independently established.
3. Run one real vote through Twitch and confirm it appears in the game. Close settings, tokens, authorization pages, email, and private windows before capture.
4. Open `record.html` on the same deployment, or use an existing screen recorder. Choose the game window/screen. Enable microphone only if narrating. Record a short test, inspect its actual dimensions, and play it back. Require native 1920×1080 and the entire header, score, voting panel, arena, and connection strip; do not infer framing from the browser window size.
5. Keep this Codex chat ready on a separate window for the short build segment. Show the project request and useful build/test output, not private account information.

## Recording sequence and narration draft

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Title, arena and command prompts | “This is Chaos Arcade. Twitch chat chooses the obstacle, and the streamer has to beat it. It turns spectators into the opposing team.” |
| 0:15–0:45 | Open voting; send a real `!tiny`, `!reverse`, or `!speed` message in the connected channel; vote counter changes | “These are real Twitch chat messages arriving through EventSub. Each viewer gets one vote, and changing your mind replaces your previous choice.” |
| 0:45–1:15 | Lock the result, start the challenge, press Stop, reveal outcome | “Chat chose this modifier. I now have eight seconds to stop inside the hot zone. The result awards the point and carries into the match.” |
| 1:15–1:45 | Another real modifier and round, or the final session result | “Different modifiers change timing and precision. The short rounds make it easy to join between other stream segments, even with a small audience.” |
| 1:45–2:10 | Codex chat, source and verified tests | “I used Codex to compare five game directions, build this version, implement Twitch authorization and event handling, and test the game rules. We checked revotes, duplicate messages, voting deadlines, and session reset.” |
| 2:10–2:30 | Game and concise closing | “The app runs in a browser. Streamers connect their channel, viewers use simple chat commands, and everyone sees the effect. The source includes setup instructions and a labeled practice mode.” |

Adjust narration to the implemented and verified behavior. Do not claim audience adoption, a live broadcast, or tests that have not passed.

## Submission closeout

- Download and replay the recording; confirm duration below 3:00, complete app framing, readable captions, and audible narration only if narration was chosen.
- Verify 1080p is available after YouTube processing; select it and confirm actual playback dimensions. Auto quality may start at a lower resolution.
- Upload to YouTube; use public or unlisted visibility according to the event's written clarification. Private is unsuitable.
- Test the actual watch URL without signing in after processing finishes.
- Enter the direct source repository and game URL, description, video link, and primary Codex session ID.
- Vince reviews eligibility, rights, and rule attestations. Confirm actual Submitted status before claiming completion.
