import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import EventEmitter from 'eventemitter3';
import jwtDecode from 'jwt-decode';
import isNode from 'detect-node';

class SessionManager extends EventEmitter {
  constructor(client) {
    super();

    // validate input
    if (!(isObject(client) && client.api)) {
      // We could easily test for client being an instance of YeepClient, however this would result
      // in a large bundle since YeepClient needs to be imported as well.
      // Note that SessionManager comes with it's own bundle.
      throw new TypeError(
        `Invalid "client" param; expected instance of YeepClient, received ${typeof client}`
      );
    }

    this.client = client;
    this.state = {
      accessToken: null,
      refreshToken: null,
    };
    this.refreshTimeout = null;
  }

  async login(props) {
    // ensure accessToken does not already exist
    if (this.state.accessToken) {
      throw new Error(
        'Session token already exists; your must call logout() before logging-in again'
      );
    }

    // validate input
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { user, password } = props;
    if (!isString(user)) {
      throw new TypeError(
        `Invalid "user" property; expected string, received ${typeof user}`
      );
    }
    if (!isString(password)) {
      throw new TypeError(
        `Invalid "password" property; expected string, received ${typeof password}`
      );
    }

    // create session with API
    const api = await this.client.api();
    const response = await api.session.create(props);
    const { accessToken, refreshToken } = response;

    // update state
    this.state.accessToken = accessToken;
    this.state.refreshToken = refreshToken;

    // emit event
    this.emit('create', this.state);

    // schedule next refresh 10 seconds before the accessToken expires
    const decoded = jwtDecode(accessToken);
    this.scheduleNextRefresh(decoded.exp * 1000 - 10000 - Date.now());

    // add visibilitychange listener (browser-only)
    if (!isNode) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }
  }

  handleVisibilityChange = () => {
    if (!document.hasFocus) {
      this.cancelNextRefresh();
      return; // exit
    }

    if (this.refreshTimeout === null) {
      this.scheduleNextRefresh(0);
    }
  };

  async refresh() {
    // refresh session with API
    const api = await this.client.api();
    const response = await api.session.refresh(this.state);
    const { accessToken, refreshToken } = response;

    // update state
    this.state.accessToken = accessToken;
    this.state.refreshToken = refreshToken;

    // emit event
    this.emit('refresh', this.state);

    // schedule next refresh 10 seconds before the new accessToken expires
    const decoded = jwtDecode(accessToken);
    this.scheduleNextRefresh(decoded.exp * 1000 - 10000 - Date.now());
  }

  scheduleNextRefresh(ms) {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      this.refresh().catch((err) => {
        this.emit('error', err);
        this.scheduleNextRefresh(ms === 0 ? 3000 : ms); // call refresh again
      });
    }, ms);
  }

  cancelNextRefresh() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = null;
  }

  async logout() {
    // ensure accessToken exists
    if (!this.state.accessToken) {
      throw new Error(
        "Session token not found; it doesn't make sense to call logout() if you have not logged in first"
      );
    }

    // cancel next refresh
    this.cancelNextRefresh();

    // destroy session with API
    const api = await this.client.api();
    await api.session.destroy(this.state);

    // clear state
    this.state.accessToken = null;
    this.state.refreshToken = null;

    // emit event
    this.emit('destroy');

    // remove document visibilitychange listener (browser-only)
    if (!isNode) {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }
  }
}

export default SessionManager;
