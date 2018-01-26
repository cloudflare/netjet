'use strict';

module.exports = function(options, foundEntries) {
  return function(tree) {
    var matchers = [];

    matchers.push({
      tag: 'base',
      attrs: {
        href: true,
      },
    });

    if (options.images) {
      matchers.push({
        tag: 'img',
        attrs: {
          src: true,
        },
      });
    }

    if (options.scripts) {
      matchers.push({
        tag: 'script',
        attrs: {
          src: true,
        },
      });
    }

    if (options.styles) {
      matchers.push({
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
        },
      });
    }

    if (matchers.length) {
      tree.match(matchers, function(node) {
        switch (node.tag) {
          case 'base':
            foundEntries.push([node.attrs.href, 'base']);
            break;
          case 'img':
            // Ensure we're not preloading an inline image
            if (node.attrs.src.indexOf('data:') !== 0) {
              foundEntries.push([node.attrs.src, 'image']);
            }
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
