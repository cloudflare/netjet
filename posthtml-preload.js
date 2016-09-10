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

    if (options.html) {
      matchers.push({
        tag: 'link',
        attrs: {
          rel: 'import'
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
            switch (node.attrs.rel) {
              case 'stylesheet':
                foundEntries.push([node.attrs.href, 'style']);
                break;
              case 'import':
                foundEntries.push([node.attrs.href, 'document']);
              // no default
            }
            break;
          // no default
        }
        return node;
      });
    }

    return foundEntries;
  };
};
