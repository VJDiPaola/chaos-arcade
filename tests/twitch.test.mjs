import test from 'node:test';
import assert from 'node:assert/strict';
import {TwitchChat} from '../src/twitch.js';
import {Game} from '../src/engine.js';
test('default fetch preserves the global browser receiver for validation and subscription',async(t)=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async function(url) {
    // Model a browser host method: the old this.fetchFn(...) binding must fail.
    if(this!==globalThis) throw new TypeError('Illegal invocation');
    requests.push(url);
    return url.includes('/validate')
      ? {ok:true,json:async()=>({client_id:'client123456',user_id:'owner',login:'channel',scopes:['user:read:chat']})}
      : {status:202,json:async()=>({data:[{type:'channel.chat.message',status:'enabled'}]})};
  });
  const chat=new TwitchChat();
  chat.identity=await chat.validate('test-only-token','client123456');
  chat.token='test-only-token';chat.clientId='client123456';
  await chat.subscribe('session');
  assert.deepEqual(requests,[
    'https://id.twitch.tv/oauth2/validate',
    'https://api.twitch.tv/helix/eventsub/subscriptions'
  ]);
});
function harness({scope=true, subscribeStatus=202}={}) {
  const requests=[], statuses=[], messages=[], sockets=[], timers=new Map();let id=0;
  const time={now:100000};
  const clock={setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(i){timers.delete(i);},setInterval(fn,ms){timers.set(++id,{fn,ms});return id;},clearInterval(i){timers.delete(i);}};
  class Socket {
    constructor(url){this.url=url;this.closed=false;sockets.push(this);}
    close(){this.closed=true;this.onclose?.();}
    emit(type,payload={},metadata={}){return this.onmessage?.({data:JSON.stringify({metadata:{message_type:type,...metadata},payload})});}
  }
  const fetchFn=async(url,options)=>{
    requests.push({url,options});
    return url.includes('/validate') ? {ok:true,json:async()=>({client_id:'client123456',user_id:'owner',login:'channel',scopes:scope?['user:read:chat']:[]})}
      : {status:subscribeStatus,json:async()=>({data:[{type:'channel.chat.message',status:'enabled'}]})};
  };
  const chat=new TwitchChat({onStatus:s=>statuses.push(s),onMessage:m=>messages.push(m),fetchFn,Socket,clock,now:()=>time.now});
  const connect=()=>chat.connect({token:'test-only-token',clientId:'client123456',channel:'channel'});
  const welcome=(socket,serverAt=time.now)=>socket.emit('session_welcome',{session:{id:'session',keepalive_timeout_seconds:30}},{message_timestamp:new Date(serverAt).toISOString()});
  const send=(serverAt,text='!tiny',messageId='m',userId='viewer')=>sockets.at(-1).emit('notification',{
    subscription:{type:'channel.chat.message'},event:{broadcaster_user_id:'owner',chatter_user_id:userId,message_id:messageId,message:{text}}
  },{message_timestamp:new Date(serverAt).toISOString()});
  return {chat,connect,welcome,send,time,requests,statuses,messages,sockets,timers,clock};
}
test('server clock behind or ahead is normalized before the strict local ballot gate',async()=>{
  for(const offset of [2000,-5000]) {
    const h=harness();await h.connect();await h.welcome(h.sockets[0],100000-offset);
    const game=new Game('live');game.openVote(100500);
    let accepted=false;
    h.chat.onMessage=message=>{h.messages.push(message);accepted=game.vote(message,h.time.now);};
    h.time.now=101000;await h.send(100900-offset,'!speed');
    assert.equal(accepted,true);assert.equal(h.messages[0].at,100900);
    assert.equal(h.messages[0].orderAt,100900-offset);assert.deepEqual(game.counts(),{tiny:0,reverse:0,speed:1});
    h.chat.disconnect();
  }
});
test('minimum clock samples ignore delayed keepalives and raw server time preserves revote ordering',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0],97500); // Initial offset 2500ms.
  const game=new Game('live');game.openVote(100000);const outcomes=[];
  h.chat.onMessage=message=>{h.messages.push(message);outcomes.push(game.vote(message,h.time.now));};
  h.time.now=103100;await h.send(100500,'!tiny','first');
  h.time.now=103200;await h.sockets[0].emit('session_keepalive',{}, {message_timestamp:new Date(101200).toISOString()}); // Better offset 2000ms.
  h.time.now=103300;await h.send(100600,'!reverse','newer');
  assert.ok(h.messages[1].at<h.messages[0].at); // Clock estimate changed, event order did not.
  h.time.now=103400;await h.send(100550,'!speed','out-of-order');
  h.time.now=104000;await h.sockets[0].emit('session_keepalive',{}, {message_timestamp:new Date(99000).toISOString()}); // Delayed sample must not inflate offset.
  h.time.now=104100;await h.send(101000,'!speed','latest');
  assert.deepEqual(outcomes,[true,true,false,true]);assert.equal(h.messages.at(-1).at,103000);
  assert.deepEqual(game.counts(),{tiny:0,reverse:0,speed:1});h.chat.disconnect();
});
test('clock alignment still rejects pre-window, duplicate, out-of-order and closed-window delivery',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0],98000);
  const game=new Game('live');game.openVote(100500);const outcomes=[];
  h.chat.onMessage=message=>outcomes.push(game.vote(message,h.time.now));
  h.time.now=101100;await h.send(98400,'!tiny','stale'); // Corrected time 100400: before this vote.
  h.time.now=101200;await h.send(98900,'!reverse','current');
  h.time.now=101300;await h.send(99000,'!speed','current'); // Duplicate message ID.
  h.time.now=101400;await h.send(98800,'!speed','older');
  h.time.now=112500;await h.send(100000,'!speed','delayed'); // Old event delivered at the local deadline.
  h.time.now=112600;await h.send(110600,'!tiny','after-close');
  assert.deepEqual(outcomes,[false,true,false,false,false,false]);
  assert.deepEqual(game.counts(),{tiny:0,reverse:1,speed:0});h.chat.disconnect();
});
test('live status waits for enabled subscription; subscription is own-channel read-only',async()=>{
  const h=harness();await h.connect();assert.equal(h.chat.state,'connecting');await h.welcome(h.sockets[0]);assert.equal(h.chat.state,'connected');
  const body=JSON.parse(h.requests[1].options.body);
  assert.deepEqual(body.condition,{broadcaster_user_id:'owner',user_id:'owner'});assert.equal(body.type,'channel.chat.message');assert.equal(body.transport.method,'websocket');
  h.chat.disconnect();assert.equal(h.timers.size,0);assert.equal(h.chat.token,null);
});
test('missing scope and failed subscription never become connected',async()=>{
  const missing=harness({scope:false});await missing.connect();assert.equal(missing.chat.state,'error');assert.equal(missing.sockets.length,0);
  const failed=harness({subscribeStatus:403});await failed.connect();await failed.welcome(failed.sockets[0]);assert.equal(failed.chat.state,'error');assert.equal(failed.sockets[0].closed,true);
});
test('Twitch reconnect keeps old socket until welcome and transfers subscription without POST',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0]);const old=h.sockets[0];
  await old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/reconnect?id=opaque'}});
  assert.equal(old.closed,false);assert.equal(h.sockets.length,2);await h.welcome(h.sockets[1]);
  assert.equal(old.closed,true);assert.equal(h.requests.length,2);assert.equal(h.chat.state,'connected');h.chat.disconnect();
});
test('unexpected disconnect reconnects and resubscribes; explicit disconnect clears timers',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0]);h.sockets[0].close();assert.equal(h.chat.state,'reconnecting');
  const scheduled=h.timers.get(h.chat.retryTimer);assert.equal(scheduled.ms,1000);scheduled.fn();await h.welcome(h.sockets[1]);
  assert.equal(h.requests.length,3);assert.equal(h.chat.state,'connected');h.chat.disconnect();
  // A real timer removes itself when fired; the fake still holds its completed entry.
  assert.equal([...h.timers.values()].filter(t=>t.ms!==1000).length,0);
});
test('keepalive watchdog recovers and revocation disconnects',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0]);const watchdog=h.chat.watchdog;
  await h.sockets[0].emit('session_keepalive');assert.equal(h.timers.has(watchdog),false);
  h.timers.get(h.chat.watchdog).fn();assert.equal(h.chat.state,'reconnecting');h.chat.disconnect();
  const r=harness();await r.connect();await r.welcome(r.sockets[0]);await r.sockets[0].emit('revocation');assert.equal(r.chat.state,'error');assert.equal(r.chat.token,null);
});
test('only channel chat notifications accepted; shared-channel messages ignored',async()=>{
  const h=harness();await h.connect();await h.welcome(h.sockets[0]);
  const event={broadcaster_user_id:'owner',chatter_user_id:'viewer',message_id:'m',message:{text:'!tiny'}};
  const send=e=>h.sockets[0].emit('notification',{subscription:{type:'channel.chat.message'},event:e},{message_timestamp:'2026-11-02T17:00:00Z'});
  await send(event);await send({...event,broadcaster_user_id:'elsewhere'});await send({...event,source_broadcaster_user_id:'shared'});
  assert.equal(h.messages.length,1);assert.equal(h.messages[0].source,'live');assert.equal(h.messages[0].userId,'viewer');h.chat.disconnect();
});
test('sign-in for another channel fails before opening a socket',async()=>{
  const h=harness();await h.chat.connect({token:'test-only-token',clientId:'client123456',channel:'someoneelse'});assert.equal(h.chat.state,'error');assert.equal(h.sockets.length,0);
});
