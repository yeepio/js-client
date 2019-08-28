# Yeep JavaScript Client

Yeep API client for Node.js and the browser.

[![Build Status](https://travis-ci.com/yeepio/js-client.svg?branch=master)](https://travis-ci.com/yeepio/js-client)
[![npm version](https://img.shields.io/npm/v/@yeep/client.svg?style=flat-square)](https://www.npmjs.com/package/@yeep/client) [![Greenkeeper badge](https://badges.greenkeeper.io/yeepio/js-client.svg)](https://greenkeeper.io/)

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

#### Create yeep client

```javascript
const YeepClient = require('@yeep/client');

const yeep = new YeepClient({
  baseURL: 'https://yeep.acme.com', // replace this with your own domain
});
```

#### Create session to use with authenticated API requests, a.k.a. login

```javascript
yeep
  .login({
    user: 'coyote@acme.com',
    password: 'catch-the-b1rd$',
  })
  .then((data) => {
    // do something with session data
  })
  .catch((err) => {
    // handle error
  });
```

#### Make an API call

```javascript
yeep
  .api() // retrieve api object - this is async, i.e. returns promise
  .then((api) => {
    // make api call
    return api.user.info({
      id: '507f191e810c19729de860ea',
      projection: {
        permissions: true,
        roles: true,
      },
    });
  })
  .then((data) => {
    // do something with user info data
  })
  .catch((err) => {
    // handle error
  });
```

#### Destroy an existing session, a.k.a. logout

```javascript
yeep
  .logout()
  .then(() => {
    // handle successful logout
  })
  .catch((err) => {
    // handle error
  });
```

## License

Apache 2.0
