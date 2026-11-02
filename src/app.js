import config from '../config.js';
import {Game, MODIFIERS, OPTIONS, PLAY_MS} from './engine.js';
import {TwitchChat} from './twitch.js';
import {authorize, consumeCallback, savedToken, forgetToken} from './oauth.js';

const $ = id => document.getElementById(id);
const choices = [...document.querySelectorAll('[data-modifier]')];
let settings = {};
try { settings = JSON.parse(sessionStorage.getItem('chaos.public-settings') || '{}'); } catch { /* use defaults */ }
const redirectUri = config.redirectUri || location.origin + location.pathname;
$('client-id').value = config.clientId || settings.clientId || '';
$('channel').value = config.channel || settings.channel || '';
$('redirect').value = redirectUri;
let token = null, callbackError = '';
try { token = consumeCallback(location, history, sessionStorage) || savedToken(sessionStorage); }
catch (error) { callbackError = error.message; forgetToken(sessionStorage); }
const game = new Game(token ? 'live' : 'rehearsal');
let connection = {state:'disconnected',detail:'Twitch is not connected.'};
let lastVote = 'No votes yet.', sound = false, audio = null, bots = [], nextBot = 0;
let message = 'Rehearsal is ready. Local practice votes will be clearly labeled.';
let renderedPhase = '', lastSecond = null;
$('mode').value = game.mode;
$('manual').checked = matchMedia('(prefers-reduced-motion: reduce)').matches;

function tone(frequency = 440, duration = .09) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.055, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio is optional. Gameplay continues. */ }
}
const twitch = new TwitchChat({
  onStatus(status) {
    connection = status;
    if (game.mode === 'live' && status.state !== 'connected' && game.cancelVote()) {
      message = 'Chat connection interrupted. This ballot was cleared; reconnect and open a fresh vote.';
      lastVote = 'Ballot cleared after connection loss.';
    }
    $('setup-message').textContent = status.detail;
    render();
  },
  onMessage(event) {
    if (game.vote(event, Date.now())) {
      const vote = game.votes.get(event.userId);
      lastVote = 'Latest accepted: !' + vote.choice + ' · Twitch chat';
      renderVotes();
    }
  }
});
function renderVotes() {
  const counts = game.counts(), total = game.votes.size;
  for (const choice of choices) {
    const key = choice.dataset.modifier;
    $('count-' + key).textContent = counts[key];
    $('bar-' + key).style.width = (total ? counts[key] / total * 100 : 0) + '%';
    choice.classList.toggle('selected', game.modifier === key && !['ready','voting'].includes(game.phase));
    choice.disabled = game.mode !== 'rehearsal' || game.phase !== 'voting';
    choice.setAttribute('aria-label', MODIFIERS[key].name + ', !' + key + ', ' + counts[key] + ' votes' + (game.mode === 'rehearsal' ? '. Cast practice vote.' : ''));
  }
  $('total-votes').textContent = total;
  $('votes-kind').textContent = game.mode === 'live' ? 'TWITCH VOTERS' : 'PRACTICE VOTERS';
  $('last-vote').textContent = lastVote;
}
function renderClock(now = Date.now()) {
  let value = '12', caption = 'SECONDS TO VOTE';
  if (game.phase === 'voting') value = String(Math.max(0, Math.ceil((game.voteEnd - now) / 1000)));
  else if (game.phase === 'locked') { value = '8.0'; caption = 'SECONDS TO STOP'; }
  else if (game.phase === 'playing') { value = game.manual ? 'STEP' : Math.max(0, (PLAY_MS - now + game.started) / 1000).toFixed(1); caption = game.manual ? 'MANUAL PRACTICE' : 'SECONDS TO STOP'; }
  else if (['result','complete'].includes(game.phase)) { value = game.result.win ? '+1' : '×'; caption = game.result.win ? 'POINT FOR YOU' : 'POINT FOR CHAT'; }
  $('timer').textContent = value; $('timer-caption').textContent = caption;
  $('needle').style.left = game.position + '%';
}
function render() {
  const phase = game.phase, live = game.mode === 'live', active = ['voting','playing'].includes(phase);
  const modifier = MODIFIERS[game.modifier];
  $('mode-badge').textContent = live ? (connection.state === 'connected' ? 'LIVE CHAT · #' + connection.login : 'LIVE MODE · NOT CONNECTED') : 'REHEARSAL · LOCAL ONLY';
  $('mode-badge').classList.toggle('live', live && connection.state === 'connected');
  $('streamer-score').textContent = game.streamer; $('chat-score').textContent = game.chat;
  $('round-number').textContent = String(game.round).padStart(2,'0');
  $('round-pips').replaceChildren(...Array.from({length:5}, (_, i) => {
    const pip = document.createElement('span'), result = game.history[i];
    pip.className = 'pip ' + (result ? result.win ? 'win' : 'loss' : i === game.round-1 ? 'current' : '');
    pip.title = 'Round ' + (i+1) + ': ' + (result ? result.win ? 'you won' : 'chat won' : 'not played');
    return pip;
  }));
  $('modifier-label').textContent = phase === 'ready' ? 'THE CALM BEFORE' : phase === 'voting' ? 'CHAT HAS CONTROL' : modifier.name;
  const headings = {ready:'LET CHAT\nCOOK.', voting:'PICK YOUR\nPOISON.', locked:'CHAOS\nLOCKED IN.', playing:'HIT THE\nHOT ZONE.', result:game.result?.win ? 'NAILED\nIT.' : 'CHAT GOT\nYOU.', complete:game.streamer > game.chat ? 'YOU BEAT\nTHE CHAOS.' : 'CHAT WINS.\nOF COURSE.'};
  $('headline').replaceChildren(...headings[phase].split('\n').flatMap((line,i) => i ? [document.createElement('br'),document.createTextNode(' ' + line)] : [document.createTextNode(line)]));
  const instructions = {
    ready:'They choose the twist. You stop the pink marker in the yellow zone.',
    voting: live ? 'Chat: type !tiny, !reverse, or !speed. Change your mind? Vote again.' : 'Local rehearsal: practice voters choose the chaos. Click a choice to join them.',
    locked:game.votes.size ? modifier.name + ' won. Take a breath. Then take your shot.' : 'No votes came in. Classic target, normal speed. No modifier was invented.',
    playing:game.manual ? 'Press Step to move. Stop when the marker is inside the yellow zone.' : 'Stop the pink marker inside the yellow target. Click STOP or press Space.',
    result:game.result?.timeout ? 'Time ran out. Chat takes this round.' : 'Stopped at ' + (game.result?.position || 0).toFixed(1) + '. The target was ' + modifier.lo + '–' + modifier.hi + '.',
    complete:'Final score: you ' + game.streamer + ' · chat ' + game.chat + '. Five rounds of glorious interference.'
  };
  $('instruction').textContent = instructions[phase];
  const labels = {ready:'OPEN THE VOTE',voting:'VOTING IS OPEN…',locked:'PLAY THIS ROUND',playing:'STOP!',result:'NEXT ROUND',complete:'RUN IT BACK'};
  $('play-button').replaceChildren(document.createTextNode(labels[phase]));
  const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden','true'); arrow.textContent = phase === 'playing' ? '■' : '↗'; $('play-button').append(arrow);
  $('play-button').disabled = phase === 'voting' || (live && phase === 'ready' && connection.state !== 'connected');
  $('play-button').classList.toggle('running',phase === 'playing');
  $('target').style.left = modifier.lo + '%'; $('target').style.width = modifier.hi - modifier.lo + '%';
  $('range-label').textContent = 'TARGET: ' + modifier.lo + '–' + modifier.hi;
  $('stage').className = 'stage' + (game.result ? game.result.win ? ' result-win' : ' result-loss' : '');
  $('status').textContent = message;
  $('step-button').hidden = !(phase === 'playing' && game.manual);
  $('vote-indicator').textContent = phase === 'voting' ? 'OPEN' : phase === 'ready' ? 'WAITING' : 'LOCKED';
  $('vote-indicator').classList.toggle('open', phase === 'voting');
  $('vote-hint').textContent = phase === 'voting' ? live ? 'TYPE A COMMAND IN TWITCH CHAT ↓' : 'LOCAL PRACTICE VOTES ONLY ↓' : phase === 'ready' ? 'When voting opens, choose your weapon.' : 'Voting closed. The next round gets a fresh ballot.';
  $('practice-settings').hidden = live;
  $('manual').disabled = active; $('bots').disabled = active;
  $('connection-title').textContent = !live ? 'LOCAL REHEARSAL' : connection.state === 'connected' ? 'TWITCH CONNECTED' : 'TWITCH ' + connection.state.toUpperCase();
  $('connection-detail').textContent = !live ? 'Practice votes only. Twitch is not connected.' : connection.detail;
  $('connection-dot').className = 'connection-dot ' + (live ? connection.state : '');
  $('disconnect').hidden = !token; $('reconnect').hidden = !token || connection.state === 'connected';
  $('connect').textContent = token ? 'Authorize again ↗' : 'Connect Twitch ↗';
  $('keyboard-hint').textContent = game.manual && phase === 'playing' ? 'SPACE TO STOP · → TO STEP' : 'SPACE TO PLAY · 12s VOTE · 8s CHALLENGE';
  renderVotes(); renderClock(); renderedPhase = phase;
}
function castPractice(key, userId = 'local-you', at = Date.now()) {
  if (game.vote({userId, messageId:crypto.randomUUID(), text:'!' + key, at, source:'rehearsal'}, Date.now())) {
    lastVote = 'Latest accepted: !' + key + ' · local practice'; renderVotes();
  }
}
function play() {
  const now = Date.now();
  if (game.phase === 'ready') {
    if (game.mode === 'live' && connection.state !== 'connected') return;
    game.openVote(now); lastVote = 'No votes yet.';
    message = game.mode === 'live' ? 'Twitch voting is open for 12 seconds. One ballot per viewer.' : 'Rehearsal ballot open. All votes in this mode are local practice.';
    bots = game.mode === 'rehearsal' && $('bots').checked ? Array.from({length:6}, (_,i) => ({at:now+700+i*900, user:'practice-'+i, key:OPTIONS[(i+(game.round-1))%3]})) : [];
    // Two practice viewers change their minds: shows real replacement semantics.
    if (bots.length) bots.push({at:now+7000,user:'practice-1',key:OPTIONS[(game.round-1)%3]}, {at:now+8000,user:'practice-2',key:OPTIONS[(game.round-1)%3]});
    nextBot = 0; lastSecond = null; tone(330);
  } else if (game.phase === 'locked') {
    game.start(now,game.mode === 'rehearsal' && $('manual').checked);
    message = game.manual ? 'Manual practice: move with Step or →, then stop with Space.' : 'Go! Stop inside the yellow zone. You have eight seconds.'; tone(660);
  } else if (game.phase === 'playing') { game.stop(now); finishMessage(); }
  else if (game.phase === 'result') { game.next(); lastVote='No votes yet.';message='New round, clean ballot. Give chat another chance to cause trouble.'; }
  else if (game.phase === 'complete') reset();
  render();
}
function finishMessage() {
  message = game.result.win ? 'Clean hit. One point for you.' : game.result.timeout ? 'Eight seconds expired. One point for chat.' : 'Outside the hot zone. One point for chat.';
  if (game.phase === 'complete') message += game.streamer > game.chat ? ' Match won!' : ' Chat wins the match!';
  tone(game.result.win ? 880 : 180,.22);
}
function reset() {
  game.reset(); bots=[]; nextBot=0; lastVote='No votes yet.';
  message = game.mode === 'live' ? 'Fresh match. Open voting when chat is connected.' : 'Fresh rehearsal. Practice votes stay local.'; render();
}
$('play-button').addEventListener('click',play);
$('step-button').addEventListener('click',() => {game.advance();renderClock();});
$('reset').addEventListener('click',reset);
choices.forEach(button => button.addEventListener('click',() => castPractice(button.dataset.modifier)));
$('mode').addEventListener('change',() => {
  twitch.disconnect(false); game.reset($('mode').value); reset();
  if (game.mode === 'live') {
    if (token) connectSaved();
    else {connection={state:'disconnected',detail:'Open setup and connect your Twitch channel to begin.'};$('setup').open=true;render();}
  }
});
function readSettings() {
  const result = {clientId:$('client-id').value.trim(),channel:$('channel').value.trim().replace(/^#/, '').toLowerCase()};
  sessionStorage.setItem('chaos.public-settings',JSON.stringify(result)); return result;
}
function connectSaved() {
  const publicSettings=readSettings(); game.reset('live');$('mode').value='live';
  message='Connecting Twitch. Live rounds start only after chat subscription is confirmed.';
  twitch.connect({token,...publicSettings});render();
}
$('connect').addEventListener('click',() => {
  try {
    const publicSettings = readSettings();
    const destination = authorize({...publicSettings,redirectUri}, sessionStorage, crypto);
    location.assign(destination);
  } catch(error) {$('setup-message').textContent=error.message;$('setup').open=true;}
});
$('reconnect').addEventListener('click',() => {if(token)connectSaved();});
$('disconnect').addEventListener('click',() => {
  twitch.disconnect();forgetToken(sessionStorage);token=null;game.reset('rehearsal');$('mode').value='rehearsal';reset();
  $('setup-message').textContent='Disconnected. This tab’s stored Twitch token has been cleared.';
});
$('show-setup').addEventListener('click',() => {document.body.classList.remove('presentation');$('present').setAttribute('aria-pressed','false');$('setup').open=!$('setup').open;if($('setup').open)$('setup').scrollIntoView({block:'nearest'});});
$('sound').addEventListener('click',() => {sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));tone(550);});
$('present').addEventListener('click',() => {const on=document.body.classList.toggle('presentation');$('present').setAttribute('aria-pressed',String(on));$('setup').open=false;});
$('exit-presentation').addEventListener('click',() => {document.body.classList.remove('presentation');$('present').setAttribute('aria-pressed','false');});
$('fullscreen').addEventListener('click',async () => {try {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('setup-message').textContent='Full screen is unavailable in this browser. Presentation mode is still available.';}});
document.addEventListener('keydown',event => {
  if (event.repeat || /^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space') {event.preventDefault();play();}
  if (event.code === 'ArrowRight' && game.manual) {event.preventDefault();game.advance();renderClock();}
  if (event.code === 'Escape') {document.body.classList.remove('presentation');$('present').setAttribute('aria-pressed','false');}
});
document.addEventListener('visibilitychange',() => {
  if (document.hidden && game.phase === 'playing' && !game.manual) {
    game.stop(Date.now(),true);finishMessage();message='The game window was hidden. This round ended; chat takes the point.';render();
  }
});
function frame() {
  const now=Date.now(), phase=game.phase;
  if (phase==='voting') {
    while(nextBot<bots.length && now>=bots[nextBot].at) {const b=bots[nextBot++];castPractice(b.key,b.user,b.at);}
    const second=Math.ceil((game.voteEnd-now)/1000);
    if(second!==lastSecond && second<=3 && second>0)tone(440,.05);
    lastSecond=second;
  }
  game.tick(now);
  if (game.phase!==renderedPhase) {
    if(game.phase==='locked') {message=game.votes.size ? MODIFIERS[game.modifier].name+' locked with '+game.counts()[game.modifier]+' of '+game.votes.size+' votes. Ready when you are.' : 'Zero votes. Playing a classic round with no modifier.';tone(740,.15);}
    if(['result','complete'].includes(game.phase))finishMessage();
    render();
  } else if(['voting','playing'].includes(game.phase))renderClock(now);
  requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
if(callbackError){$('setup-message').textContent=callbackError;$('setup').open=true;}
if(token)connectSaved();
