const SOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
export class TwitchChat {
  // Keep the browser host-method receiver; a copied fetch called on this is invalid.
  constructor({onStatus = () => {}, onMessage = () => {}, fetchFn = (...args) => globalThis.fetch(...args),
    Socket = globalThis.WebSocket, clock = globalThis} = {}) {
    Object.assign(this, {onStatus, onMessage, fetchFn, Socket, clock});
    this.sockets = new Set(); this.generation = 0; this.active = null; this.stopped = true;
  }
  status(state, detail) { this.state = state; this.onStatus({state, detail, login:this.identity?.login || ''}); }
  async validate(token, clientId) {
    const response = await this.fetchFn('https://id.twitch.tv/oauth2/validate', {headers:{Authorization:'OAuth ' + token}});
    if (!response.ok) throw new Error('Twitch session expired. Disconnect, then connect again.');
    const identity = await response.json();
    if (identity.client_id !== clientId || !identity.user_id || !identity.scopes?.includes('user:read:chat'))
      throw new Error('Twitch authorization does not match this app or is missing read-chat permission. Connect again.');
    return identity;
  }
  async connect({token, clientId, channel = ''}) {
    this.disconnect(false); this.stopped = false; this.retries = 0;
    const generation = this.generation;
    this.status('connecting', 'Checking Twitch authorization…');
    try {
      const identity = await this.validate(token, clientId);
      if (generation !== this.generation) return;
      if (channel && channel.replace(/^#/, '').toLowerCase() !== identity.login.toLowerCase())
        throw new Error('Sign in as the channel owner. This version connects only your own channel.');
      this.token = token; this.clientId = clientId; this.identity = identity;
      this.open(SOCKET_URL, false);
      this.validationTimer = this.clock.setInterval(async () => {
        try { await this.validate(this.token, this.clientId); }
        catch (error) { if (!this.stopped) this.fail(error.message); }
      }, 3600000);
    } catch (error) { if (generation === this.generation) this.fail(error.message); }
  }
  async subscribe(sessionId) {
    const response = await this.fetchFn('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method:'POST', headers:{Authorization:'Bearer ' + this.token, 'Client-Id':this.clientId, 'Content-Type':'application/json'},
      body:JSON.stringify({type:'channel.chat.message', version:'1', condition:{
        broadcaster_user_id:this.identity.user_id, user_id:this.identity.user_id
      }, transport:{method:'websocket', session_id:sessionId}})
    });
    if (response.status !== 202) throw new Error(response.status === 401 || response.status === 403
      ? 'Twitch rejected chat authorization. Disconnect, then connect again.'
      : 'Twitch could not subscribe to chat (HTTP ' + response.status + '). Reconnect to retry.');
    const body = await response.json();
    if (!body.data?.some(s => s.type === 'channel.chat.message' && s.status === 'enabled'))
      throw new Error('Twitch did not confirm an enabled chat subscription. Reconnect to retry.');
  }
  open(url, migrating) {
    if (this.stopped) return;
    const generation = this.generation;
    const previous = this.active;
    const socket = new this.Socket(url); this.sockets.add(socket);
    if (!migrating) this.active = socket;
    let welcomed = false;
    const welcomeTimer = this.clock.setTimeout(() => {
      if (!welcomed && generation === this.generation) { socket.close(); this.retry(); }
    }, 15000);
    socket.welcomeTimer = welcomeTimer;
    socket.onmessage = async ({data}) => {
      if (generation !== this.generation || this.stopped || !this.sockets.has(socket)) return;
      let envelope;
      try { envelope = JSON.parse(data); } catch { return; }
      const type = envelope.metadata?.message_type;
      if (type === 'session_welcome') {
        welcomed = true; this.clock.clearTimeout(welcomeTimer);
        this.active = socket;
        this.keepalive = (envelope.payload.session.keepalive_timeout_seconds || 30) * 1000;
        this.armWatchdog();
        try {
          if (!migrating) await this.subscribe(envelope.payload.session.id);
          if (generation !== this.generation || socket !== this.active || this.stopped) return;
          if (previous && previous !== socket) { previous.onclose = null; previous.close(); this.sockets.delete(previous); }
          this.retries = 0; this.status('connected', 'Listening to #' + this.identity.login);
        } catch (error) { if (generation === this.generation) this.fail(error.message); }
      } else if (type === 'session_keepalive' || type === 'notification') {
        if (socket === this.active) this.armWatchdog();
        if (type === 'notification' && envelope.payload.subscription?.type === 'channel.chat.message') {
          const event = envelope.payload.event;
          if (event?.broadcaster_user_id !== this.identity.user_id) return;
          // Shared-chat audiences do not alter this channel's ballot.
          if (event.source_broadcaster_user_id && event.source_broadcaster_user_id !== this.identity.user_id) return;
          this.onMessage({userId:event.chatter_user_id, messageId:event.message_id,
            text:event.message?.text || '', at:Date.parse(envelope.metadata.message_timestamp), source:'live'});
        }
      } else if (type === 'session_reconnect') {
        const reconnectUrl = envelope.payload.session?.reconnect_url;
        try {
          const parsed = new URL(reconnectUrl);
          if (parsed.protocol !== 'wss:' || !/^(?:[a-z0-9-]+\.)*twitch\.tv$/.test(parsed.hostname)) throw new Error();
          this.status('reconnecting', 'Twitch is moving the chat connection…');
          this.open(reconnectUrl, true);
        } catch { this.fail('Twitch sent an invalid reconnect address. Reconnect to retry.'); }
      } else if (type === 'revocation') {
        this.fail('Twitch revoked the chat subscription. Disconnect, then connect again.');
      }
    };
    socket.onclose = () => {
      this.clock.clearTimeout(welcomeTimer); this.sockets.delete(socket);
      if (generation !== this.generation || this.stopped || socket !== this.active) return;
      this.retry();
    };
    socket.onerror = () => { /* onclose handles retry; never expose socket URLs or credentials. */ };
  }
  armWatchdog() {
    this.clock.clearTimeout(this.watchdog);
    this.watchdog = this.clock.setTimeout(() => this.retry(), this.keepalive + 2000);
  }
  retry() {
    if (this.stopped || this.retryTimer) return;
    this.clock.clearTimeout(this.watchdog);
    for (const socket of this.sockets) { this.clock.clearTimeout(socket.welcomeTimer); socket.onclose = null; socket.close(); }
    this.sockets.clear(); this.active = null;
    if (++this.retries > 5) { this.fail('Chat connection was lost. Reconnect when your network is ready.'); return; }
    this.status('reconnecting', 'Connection interrupted. Retrying ' + this.retries + '/5…');
    this.retryTimer = this.clock.setTimeout(() => {
      this.retryTimer = null; this.open(SOCKET_URL, false);
    }, Math.min(1000 * 2 ** (this.retries - 1), 16000));
  }
  fail(message) { this.disconnect(false); this.status('error', message); }
  disconnect(announce = true) {
    this.stopped = true; this.generation++;
    this.clock.clearTimeout(this.watchdog); this.clock.clearTimeout(this.retryTimer);
    this.clock.clearInterval(this.validationTimer); this.retryTimer = null;
    for (const socket of this.sockets) { this.clock.clearTimeout(socket.welcomeTimer); socket.onclose = null; socket.close(); }
    this.sockets.clear(); this.active = null; this.token = null;
    if (announce) this.status('disconnected', 'Twitch disconnected.');
  }
}
