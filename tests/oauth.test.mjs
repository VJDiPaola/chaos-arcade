import test from 'node:test';
import assert from 'node:assert/strict';
import {callbackToken, consumeCallback, authorize} from '../src/oauth.js';
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('OAuth callback requires matching state and bearer token',()=>{
  assert.equal(callbackToken('#access_token=example&token_type=bearer&state=ok','ok'),'example');
  assert.throws(()=>callbackToken('#access_token=example&token_type=bearer&state=bad','ok'),/state/);
  assert.throws(()=>callbackToken('#access_token=example&token_type=bearer&state=ok',null),/state/);
  assert.equal(callbackToken('#unrelated','ok'),null);
});
test('fragment is removed even on bad state; denial never stores a token',()=>{
  const store=storage();let cleared=false;
  assert.throws(()=>consumeCallback({hash:'#access_token=example&state=bad',search:'',pathname:'/'},{replaceState:()=>{cleared=true;}},store),/state/);
  assert.equal(cleared,true);assert.equal(store.getItem('chaos.twitch.session'),null);
  assert.throws(()=>consumeCallback({hash:'',search:'?error=access_denied',pathname:'/'},{replaceState(){}},store),/declined/);
});
test('authorization requests only read-chat and stores random CSRF state',()=>{
  const store=storage();const url=new URL(authorize({clientId:'publicclientid123',redirectUri:'http://localhost:4173/'},store,globalThis.crypto));
  assert.equal(url.searchParams.get('scope'),'user:read:chat');assert.equal(url.searchParams.get('response_type'),'token');
  assert.equal(url.searchParams.get('state'),store.getItem('chaos.twitch.state'));assert.equal(url.searchParams.get('state').length,48);
});
