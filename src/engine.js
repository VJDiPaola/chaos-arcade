export const MODIFIERS = Object.freeze({
  none: {name: 'CLASSIC ROUND', lo: 58, hi: 76, speed: 48, start: 6, dir: 1},
  tiny: {name: 'TINY TARGET', lo: 63, hi: 71, speed: 48, start: 6, dir: 1},
  reverse: {name: 'REVERSE', lo: 58, hi: 76, speed: 48, start: 94, dir: -1},
  speed: {name: 'DOUBLE SPEED', lo: 58, hi: 76, speed: 96, start: 6, dir: 1}
});
export const OPTIONS = ['tiny', 'reverse', 'speed'];
export const VOTE_MS = 12000;
export const PLAY_MS = 8000;
export function parseVote(text) {
  const key = String(text || '').trim().toLowerCase();
  const commands = {'!tiny':'tiny','!1':'tiny','!reverse':'reverse','!2':'reverse','!speed':'speed','!3':'speed'};
  return Object.hasOwn(commands, key) ? commands[key] : null;
}
export function positionAt(modifier, elapsedMs) {
  const m = MODIFIERS[modifier] || MODIFIERS.none;
  const raw = m.start + m.dir * Math.max(0, elapsedMs) / 1000 * m.speed;
  const wrapped = ((raw % 200) + 200) % 200;
  return wrapped <= 100 ? wrapped : 200 - wrapped;
}
export class Game {
  constructor(mode = 'rehearsal') { this.reset(mode); }
  reset(mode = this.mode) {
    this.mode = mode; this.phase = 'ready'; this.round = 1;
    this.streamer = 0; this.chat = 0; this.history = [];
    this.clearBallot(); this.modifier = 'none'; this.result = null; this.position = 6;
  }
  clearBallot() { this.votes = new Map(); this.seen = new Set(); this.voteStart = 0; this.voteEnd = 0; }
  openVote(now) {
    if (this.phase !== 'ready') return false;
    this.clearBallot(); this.modifier = 'none'; this.result = null;
    this.voteStart = now; this.voteEnd = now + VOTE_MS; this.phase = 'voting'; return true;
  }
  vote({userId, messageId, text, at, orderAt = at, source}, now) {
    const choice = parseVote(text);
    if (this.phase !== 'voting' || source !== this.mode || !choice || !userId || !messageId ||
        !Number.isFinite(at) || !Number.isFinite(orderAt) || at < this.voteStart || at >= this.voteEnd || now >= this.voteEnd ||
        at > now + 2000 || this.seen.has(messageId)) return false;
    this.seen.add(messageId);
    // Bounded memory even in a very active channel; latest user ballot remains authoritative.
    if (this.seen.size > 20000) this.seen.delete(this.seen.values().next().value);
    const old = this.votes.get(userId);
    // Keep ordering in the source clock even when transport clock alignment improves.
    if (old && orderAt < old.orderAt) return false;
    this.votes.set(userId, {choice, at, orderAt}); return true;
  }
  counts() {
    const counts = {tiny:0, reverse:0, speed:0};
    for (const vote of this.votes.values()) counts[vote.choice]++;
    return counts;
  }
  lock(now) {
    if (this.phase !== 'voting' || now < this.voteEnd) return false;
    const counts = this.counts();
    // Displayed order breaks ties. An empty ballot never invents a winner.
    this.modifier = this.votes.size ? OPTIONS.reduce((a,b) => counts[b] > counts[a] ? b : a) : 'none';
    this.phase = 'locked'; this.position = MODIFIERS[this.modifier].start; return true;
  }
  cancelVote() {
    if (this.phase !== 'voting') return false;
    this.clearBallot(); this.phase = 'ready'; return true;
  }
  start(now, manual = false) {
    if (this.phase !== 'locked') return false;
    this.started = now; this.manual = manual; this.phase = 'playing';
    this.manualElapsed = 0; this.position = MODIFIERS[this.modifier].start; return true;
  }
  advance() {
    if (this.phase !== 'playing' || !this.manual) return false;
    this.manualElapsed += 140; this.position = positionAt(this.modifier, this.manualElapsed); return true;
  }
  tick(now) {
    if (this.phase === 'voting') return this.lock(now);
    if (this.phase !== 'playing' || this.manual) return false;
    this.position = positionAt(this.modifier, Math.min(PLAY_MS, now - this.started));
    if (now - this.started >= PLAY_MS) return this.stop(now, true);
    return false;
  }
  stop(now, timeout = false) {
    if (this.phase !== 'playing') return false;
    if (!this.manual) this.position = positionAt(this.modifier, Math.min(PLAY_MS, now - this.started));
    timeout ||= !this.manual && now - this.started >= PLAY_MS;
    const m = MODIFIERS[this.modifier];
    const win = !timeout && this.position >= m.lo && this.position <= m.hi;
    win ? this.streamer++ : this.chat++;
    this.result = {round:this.round, modifier:this.modifier, position:this.position, win, timeout,
      votes:this.votes.size, counts:this.counts()};
    this.history.push(this.result); this.phase = this.round === 5 ? 'complete' : 'result'; return true;
  }
  next() {
    if (this.phase !== 'result') return false;
    this.round++; this.phase = 'ready'; this.clearBallot(); this.modifier = 'none'; this.result = null;
    this.position = 6; return true;
  }
}
