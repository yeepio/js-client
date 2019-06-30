import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import YeepClient from './YeepClient';

class CookieSession {
  constructor(client) {
    // validate input
    if (!(client instanceof YeepClient)) {
      throw new TypeError(
        `Invalid "client" param; expected instance of YeepClient, received ${typeof client}`
      );
    }

    this.client = client;
  }

  /**
   * Sets new cookie session.
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

    // retrieve api object
    const api = await this.client.api();

    // issue cookie session
    const response = await api.session.setCookie({ user, password });
    return response;
  }

  /**
   * Destroys an existing cookie session.
   * @returns {Promise}
   */
  async logout() {
    // retrieve api object
    const api = await this.client.api();

    // destroy bearer session token
    await api.session.destroyCookie();
  }

  /**
   * Refreshes an existing cookie session.
   * @returns {Promise}
   */
  async refresh() {
    // retrieve api object
    const api = await this.client.api();

    // refresh bearer session token
    const response = await api.session.refreshCookie();
    return response;
  }
}

export default CookieSession;
