'use strict';

module.exports = function (options, foundEntries) {
  return function (tree) {
    var matchers = [];

    if (options.images) {
      matchers.push({
        tag: 'img',
        attrs: {
          src: true
        }
      });
    }

    if (options.scripts) {
      matchers.push({
        tag: 'script',
        attrs: {
          src: true
        }
      });
    }

    if (options.styles) {
      matchers.push({
        tag: 'link',
        attrs: {
          rel: 'stylesheet'
        }
      });
    }

    if (matchers.length) {
      tree.match(matchers, function (node) {
        switch (node.tag) {
          case 'img':
            foundEntries.push([node.attrs.src, 'image']);
            break;
          case 'script':
            foundEntries.push([node.attrs.src, 'script']);
            break;
          case 'link':
            foundEntries.push([node.attrs.href, 'style']);
            break;
          // no default
        }
        return node;
      });
    }

    return foundEntries;
  };
};
