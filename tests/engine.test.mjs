import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, parseVote, positionAt, VOTE_MS, PLAY_MS, MODIFIERS} from '../src/engine.js';
const ballot = (userId, text, at=1001, messageId=userId+at, source='live') => ({userId,text,at,messageId,source});
test('exact chat commands only, aliases and case supported', () => {
  assert.equal(parseVote(' !TiNy '),'tiny');assert.equal(parseVote('!2'),'reverse');assert.equal(parseVote('!3'),'speed');
  for(const text of ['hello !tiny','!tiny <script>','!tiny !speed','constructor','__proto__'])assert.equal(parseVote(text),null);
});
test('one latest vote per viewer, duplicate and out-of-order events ignored', () => {
  const game=new Game('live');game.openVote(1000);
  assert.equal(game.vote(ballot('u','!tiny'),1001),true);
  assert.equal(game.vote(ballot('u','!speed',1002),1002),true);
  assert.equal(game.vote(ballot('u','!reverse',1002,'u1002'),1002),false);
  assert.equal(game.vote(ballot('u','!reverse',1001,'late'),1002),false);
  assert.deepEqual(game.counts(),{tiny:0,reverse:0,speed:1});assert.equal(game.votes.size,1);
});
test('live and rehearsal are isolated; stale, late and future votes rejected', () => {
  const game=new Game('live');game.openVote(1000);
  assert.equal(game.vote(ballot('bot','!tiny',1001,'bot','rehearsal'),1001),false);
  assert.equal(game.vote(ballot('u','!tiny',999),1001),false);
  assert.equal(game.vote(ballot('u','!tiny',13000),13000),false);
  assert.equal(game.vote(ballot('u','!tiny',12000),13000),false);
  assert.equal(game.vote(ballot('u','!tiny',9999),1001),false);
});
test('tie uses visible order and empty ballot picks no modifier', () => {
  const g=new Game('live');g.openVote(1000);g.vote(ballot('1','!reverse'),1001);g.vote(ballot('2','!tiny'),1001);
  assert.equal(g.lock(12999),false);assert.equal(g.lock(13000),true);assert.equal(g.modifier,'tiny');
  assert.equal(g.vote(ballot('3','!speed',13001),13001),false);
  g.reset();g.openVote(20000);g.lock(32000);assert.equal(g.modifier,'none');
});
test('disconnect cancellation clears partial ballot; old events cannot enter replacement', () => {
  const g=new Game('live');g.openVote(1000);g.vote(ballot('1','!tiny'),1001);assert.equal(g.cancelVote(),true);
  assert.equal(g.phase,'ready');assert.equal(g.votes.size,0);g.openVote(5000);
  assert.equal(g.vote(ballot('1','!tiny'),5001),false);assert.equal(g.round,1);
});
test('five full rounds score, next and reset consistently', () => {
  const g=new Game('rehearsal');let time=1000;
  for(let round=1;round<=5;round++) {
    assert.equal(g.round,round);g.openVote(time);g.lock(time+VOTE_MS);g.start(time+VOTE_MS);
    // Classic marker starts 6, advances 48/s: 1.25s reaches 66 inside 58..76.
    g.stop(time+VOTE_MS+1250);assert.equal(g.result.win,true);assert.equal(g.stop(time+VOTE_MS+1300),false);
    if(round<5){assert.equal(g.phase,'result');g.next();}time+=30000;
  }
  assert.equal(g.phase,'complete');assert.equal(g.streamer,5);assert.equal(g.chat,0);assert.equal(g.next(),false);
  g.reset('live');assert.equal(g.history.length,0);assert.equal(g.streamer,0);assert.equal(g.phase,'ready');assert.equal(g.mode,'live');
});
test('deadline and hidden-window timeout give chat a point; double stops do not', () => {
  const g=new Game();g.openVote(1);g.lock(12001);g.start(12001);g.tick(12001+PLAY_MS);
  assert.equal(g.result.timeout,true);assert.equal(g.chat,1);assert.equal(g.stop(21000),false);
});
test('modifiers change deterministic motion/target, manual mode has no timeout', () => {
  assert.equal(positionAt('none',1250),66);assert.equal(positionAt('reverse',1250),34);assert.equal(positionAt('speed',1250),74);
  assert.equal(MODIFIERS.tiny.hi-MODIFIERS.tiny.lo,8);
  for(const key of Object.keys(MODIFIERS))for(const elapsed of [0,200,8000,20000])assert.ok(positionAt(key,elapsed)>=0&&positionAt(key,elapsed)<=100);
  const g=new Game();g.openVote(1);g.lock(12001);g.start(12001,true);g.tick(1000000);assert.equal(g.phase,'playing');g.advance();assert.notEqual(g.position,6);
});
