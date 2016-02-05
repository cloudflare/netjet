# netjet [![Travis-CI Status](https://img.shields.io/travis/cloudflare/netjet/master.svg?label=Travis%20CI&style=flat-square)](https://travis-ci.org/cloudflare/netjet)[![](https://img.shields.io/npm/dm/netjet.svg?style=flat-square)](http://browsenpm.org/package/netjet)[![](https://img.shields.io/npm/v/netjet.svg?style=flat-square)](http://browsenpm.org/package/netjet)[![](https://img.shields.io/coveralls/cloudflare/netjet/master.svg?style=flat-square)](https://coveralls.io/github/cloudflare/netjet)[![](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)](https://nodejs.org/api/documentation.html#documentation_stability_index)

netjet is a Node.js HTTP middleware to automatically insert [Preload][preload] link headers in HTML responses.
These Preload link headers allow for web browsers to initiate early resource fetching before being needed for execution.

## Example usage

```javascript
var express = require('express');
var netjet = require('netjet');
var root = '/path/to/static/folder';

express()
  .use(netjet())
  .use(express.static(root))
  .listen(1337);
```

## Options

* **images**, **scripts**, and **styles**: `Boolean`:

    If `true` the corresponding subresources are parsed and added as a Preload Link headers.

* **cache**: `Object`:

    Object passed straight to [`lru-cache`][lru-cache]. It is highly recommended to set `cache.max` to an integer.

## License
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://www.tldrlegal.com/l/mit) see `LICENSE.md`.

[preload]: https://www.w3.org/TR/preload/
[posthtml]: https://github.com/posthtml/posthtml#readme
[lru-cache]: https://github.com/isaacs/node-lru-cache#readme
