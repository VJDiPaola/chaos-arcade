import test from 'node:test';
import assert from 'node:assert/strict';
import {TwitchChat} from '../src/twitch.js';
function harness({scope=true, subscribeStatus=202}={}) {
  const requests=[], statuses=[], messages=[], sockets=[], timers=new Map();let id=0;
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
  const chat=new TwitchChat({onStatus:s=>statuses.push(s),onMessage:m=>messages.push(m),fetchFn,Socket,clock});
  const connect=()=>chat.connect({token:'test-only-token',clientId:'client123456',channel:'channel'});
  const welcome=socket=>socket.emit('session_welcome',{session:{id:'session',keepalive_timeout_seconds:30}});
  return {chat,connect,welcome,requests,statuses,messages,sockets,timers,clock};
}
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
