'use strict';
var posthtml = require('posthtml');
var posthtmlPreload = require('./posthtml-preload');

var unescape = require('lodash.unescape');
var defaults = require('lodash.defaults');
var hijackresponse = require('hijackresponse');
var bl = require('bl');

module.exports = function netjet(options) {
  options = defaults(options, {
    images: true,
    scripts: true,
    styles: true
  });

  return function (req, res, next) {
    function appendHeader(field, value) {
      var prev = res.getHeader(field);

      if (prev) {
        value = [].concat(prev, value);
      }

      res.setHeader(field, value);
    }

    function insertLinks(urls, asType) {
      urls.forEach(function (url) {
        appendHeader('Link', '<' + unescape(url) + '>; rel=preload; as=' + asType);
      });
    }

    function processBody(body) {
      var found = {};

      posthtml().use(posthtmlPreload(options, found)).process(body);

      if (options.images) {
        insertLinks(found.images, 'image');
      }

      if (options.scripts) {
        insertLinks(found.scripts, 'script');
      }

      if (options.styles) {
        insertLinks(found.styles, 'style');
      }
    }

    hijackresponse(res, function (err, res) {
      /* istanbul ignore next */
      // `err` from hijackresponse is currently hardcoded to "null"
      if (err) {
        res.unhijack();
        return next(err);
      }

      // Only hijack HTML responses
      if (!/^text\/html(?:;|\s|$)/.test(res.getHeader('Content-Type'))) {
        return res.unhijack();
      }

      res.pipe(bl(function (err, data) {
        if (err) {
          res.unhijack();
          return next(err);
        }

        processBody(data.toString());

        res.end(data);
      }));
    });

    next();
  };
};
