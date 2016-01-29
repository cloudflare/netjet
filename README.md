# netjet

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

## License
[MIT](https://www.tldrlegal.com/l/mit), see `LICENSE.md`.

[preload]: https://www.w3.org/TR/preload/
