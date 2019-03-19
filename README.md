# Yeep JavaScript Client

Yeep API client for Node.js and the browser.

[![Build Status](https://travis-ci.com/yeepio/js-client.svg?branch=master)](https://travis-ci.com/yeepio/js-client)
[![npm version](https://img.shields.io/npm/v/@yeep/client.svg?style=flat-square)](https://www.npmjs.com/package/@yeep/client)

#### Features

- Works with Node.js v.6+ or any modern browser (incl. ie11);
- Exposes promise-based API (supports async/await);
- Manages session renewal automatically;
- Implements [Yeep API methods](https://github.com/yeepio/yeep/blob/master/docs/index.md), exactly matching naming scheme.

## Installation

```
$ npm install @yeep/client
```

## Quick start

```javascript
const YeepClient = require('@yeep/client');

// create new yeep client
const yeep = new YeepClient({
  baseUrl: 'https://yeep.acme.com', // replace this with your own domain
});

yeep
  .api() // retrieve api object - this is async, i.e. returns promise
  .then((api) => {
    // make api call
    return api.session.create({
      user: 'coyote@acme.com',
      password: 'catch-the-b1rd$',
    });
  })
  .then((data) => {
    // do something with session data
  })
  .catch((err) => {
    // handle error
  });
```

### Session management

Session tokens expire and you need to refresh them manually. Having long expiration times is a bad security practice. Yeep exposes a _SessionManager_ to manage session tokens automatically.

```javascript
const YeepClient = require('@yeep/client');

// create new yeep client
const yeep = new YeepClient({
  baseUrl: 'https://yeep.acme.com', // replace this with your own domain
});

// subscribe to session create events
yeep.session.on('create', ({ accessToken, refreshToken }) => {
  console.log('session created');
});

// subscribe to session refresh events
yeep.session.on('refresh', ({ accessToken, refreshToken }) => {
  console.log('session updated');
});

// subscribe to session destroy events
yeep.session.on('destroy', () => {
  console.log('session destroyed');
});

// subscribe to session errors
yeep.session.on('error', (err) => {
  console.error("bummer, here's an error:", err);
});

// create new session and automatically refresh it before it expires
yeep.session.login({
  user: 'coyote@acme.com',
  password: 'catch-the-b1rd$',
});

// when you are done with your session simply call...
yeep.session.logout();
```

#### Notes

1. _SessionManager_ VS session API method;

   The two are quite different!

   ```javascript
   yeep.session; // stateful function renewing session tokens automatically before they expire
   ```

   ```javascript
   yeep.api().then((api) => {
     api.session.create(); // stateless API call
   });
   ```

2. _SessionManager_ is an event emitter;

   You may use `.on()`, `.once()`, `addListener()` and `removeListener()` as described at [https://nodejs.org/api/events.html](https://nodejs.org/api/events.html).

## License

Apache 2.0
