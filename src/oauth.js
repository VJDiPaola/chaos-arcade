const TOKEN_KEY = 'chaos.twitch.session';
const STATE_KEY = 'chaos.twitch.state';
export function callbackToken(hash, expectedState) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (!params.has('access_token')) return null;
  if (!expectedState || params.get('state') !== expectedState) throw new Error('Twitch sign-in state did not match. Please connect again.');
  if (params.get('token_type')?.toLowerCase() !== 'bearer') throw new Error('Twitch returned an unsupported token. Please connect again.');
  return params.get('access_token');
}
export function consumeCallback(location, history, storage) {
  const hash = location.hash, search = location.search;
  if (!hash.includes('access_token=') && !search.includes('error=')) return null;
  // Clear credentials from the address bar before any API call or UI work.
  history.replaceState(null, '', location.pathname);
  const expected = storage.getItem(STATE_KEY); storage.removeItem(STATE_KEY);
  if (search.includes('error=')) throw new Error('Twitch sign-in was declined. You can reconnect or rehearse.');
  const token = callbackToken(hash, expected);
  if (token) storage.setItem(TOKEN_KEY, token);
  return token;
}
export function authorize({clientId, redirectUri}, storage, crypto) {
  if (!/^[a-zA-Z0-9]{10,100}$/.test(clientId)) throw new Error('Add your public Twitch client ID in setup first.');
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2,'0')).join('');
  storage.setItem(STATE_KEY, state);
  const query = new URLSearchParams({client_id:clientId, redirect_uri:redirectUri, response_type:'token', scope:'user:read:chat', state});
  return 'https://id.twitch.tv/oauth2/authorize?' + query;
}
export function savedToken(storage) { return storage.getItem(TOKEN_KEY); }
export function forgetToken(storage) { storage.removeItem(TOKEN_KEY); storage.removeItem(STATE_KEY); }
