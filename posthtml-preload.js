'use strict';
var assign = require('lodash.assign');

module.exports = function (options, found) {
  return function (tree) {
    assign(found, {
      images: [],
      scripts: [],
      styles: []
    });

    var matchers = [];

    if (options.images) {
      matchers.push({tag: 'img', attrs: {src: true}});
    }

    if (options.scripts) {
      matchers.push({tag: 'script', attrs: {src: true}});
    }

    if (options.styles) {
      matchers.push({tag: 'link', attrs: {rel: 'stylesheet'}});
    }

    if (matchers) {
      tree.match(matchers, function (node) {
        switch (node.tag) {
          case 'img':
            found.images.push(node.attrs.src);
            break;
          case 'script':
            found.scripts.push(node.attrs.src);
            break;
          case 'link':
            found.styles.push(node.attrs.href);
            break;
          // no default
        }
        return node;
      });
    }

    return found;
  };
};
