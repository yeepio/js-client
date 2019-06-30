import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import jwtDecode from 'jwt-decode';
import YeepClient from './YeepClient';

class BearerSession {
  constructor(client) {
    // validate input
    if (!(client instanceof YeepClient)) {
      throw new TypeError(
        `Invalid "client" param; expected instance of YeepClient, received ${typeof client}`
      );
    }

    this.client = client;
    this.state = {
      token: '',
      expiresAt: new Date(0),
    };
    this.refreshTimeout = null;
  }

  /**
   * Issues new bearer session.
   * @param {Object} props
   * @property {string} user the username or email address of the user
   * @property {string} password the user password
   * @returns {Promise<Object>}
   */
  async login(props) {
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    // retrieve api object
    const api = await this.client.api();

    // issue bearer session token
    const response = await api.session.issueToken(props);
    const { token, expiresAt } = response;

    // update session state
    this.state.token = token;
    this.state.expiresAt = new Date(expiresAt);

    // schedule next session refresh - 10 secs before expiration
    this.scheduleNextRefresh(
      this.state.expiresAt.getTime() - Date.now() - 10000
    );

    // return token payload
    const decoded = jwtDecode(token);
    return decoded.payload;
  }

  /**
   * Destroys an existing bearer session.
   * @returns {Promise}
   */
  async logout() {
    if (!this.state.token) {
      throw new Error(
        "Session token not found; it doesn't make sense to call logout() if you don't have an active session"
      );
    }

    // retrieve api object
    const api = await this.client.api();

    // destroy bearer session token
    await api.session.destroyToken({
      token: this.state.token,
    });

    // cancel next session refresh
    this.cancelNextRefresh();

    // clear session state
    this.state.token = '';
    this.state.expiresAt = new Date(0);
  }

  /**
   * Hydrates bearer session.
   * This method is NOT applicable when authType is "cookie".
   * @param {Object} props
   * @property {string} token the session token
   */
  hydrate(props) {
    // ensure session already exists
    if (this.state.token) {
      throw new Error(
        'Session token already exists; you cannot hydrate an existing session'
      );
    }

    // validate props
    if (!isObject(props)) {
      throw new TypeError(
        `Invalid "props" argument; expected object, received ${typeof props}`
      );
    }

    const { token } = props;
    if (!isString(token)) {
      throw new TypeError(
        `Invalid "token" property; expected string, received ${typeof token}`
      );
    }

    // decode supplied session token
    const decoded = jwtDecode(token);

    // update session state
    this.state.token = token;
    this.state.expiresAt = new Date(decoded.exp * 1000);

    // schedule next refresh
    const dt = this.state.expiresAt.getTime() - Date.now();
    this.scheduleNextRefresh(dt < 10000 ? dt : dt - 10000);
  }

  async refresh() {
    // ensure session already exists
    if (!this.state.token) {
      throw new Error(
        "Session token not found; it doesn't make sense to call refresh() if you don't have an active session"
      );
    }

    // retrieve api object
    const api = await this.client.api();

    // refresh bearer session token
    const response = await api.session.refreshToken({
      token: this.state.token,
    });

    // update session state
    const { token, expiresAt } = response;
    this.state.token = token;
    this.state.expiresAt = new Date(expiresAt);

    // schedule next session refresh
    const dt = this.state.expiresAt.getTime() - Date.now();
    this.scheduleNextRefresh(dt < 10000 ? dt : dt - 10000);
  }

  scheduleNextRefresh(ms, tries = 0) {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      this.refreshSession().catch((err) => {
        console.error(err);
        // retry up to 3 times in a row
        if (tries < 3) {
          this.scheduleNextRefresh(ms === 0 ? 3000 : ms, tries + 1);
        }
      });
    }, ms);
  }

  cancelNextRefresh() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = null;
  }
}

export default BearerSession;
