'use strict';
var posthtml = require('posthtml');
var unescape = require('lodash.unescape');
var defaults = require('lodash.defaults');
var hijackresponse = require('hijackresponse');
var bl = require('bl');
var LRU = require('lru-cache');
var posthtmlPreload = require('./posthtml-preload');

function encodeRFC5987(str) {
  return encodeURI(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A')
    .replace(/%(?:7C|60|5E)/g, unescape);
}

module.exports = function netjet(options) {
  options = defaults(options, {
    images: true,
    scripts: true,
    styles: true,
    cache: {},
    attributes: [],
  });

  var cache = new LRU(options.cache);
  var attributes = [''].concat(options.attributes).join('; ');

  return function netjetMiddleware(req, res, next) {
    function appendHeader(field, value) {
      var prev = res.getHeader(field);

      if (prev) {
        value = [].concat(prev, value);
      }

      res.setHeader(field, value);
    }

    function insertLinkArray(entries) {
      var baseTag;
      entries.forEach(function(entry) {
        if (entry[1] === 'base') {
          baseTag = entry;
        }
      });

      entries
        .filter(function(entry) {
          return entry[1] !== 'base';
        })
        .forEach(function(entry) {
          var url = entry[0];
          var asType = entry[1];
          var addBaseHref =
            baseTag !== undefined &&
            !new RegExp('^([a-z]+://|/)', 'i').test(url);

          appendHeader(
            'Link',
            '<' +
              (addBaseHref ? baseTag[0] : '') +
              encodeRFC5987(unescape(url)) +
              '>; rel=preload; as=' +
              asType +
              attributes
          );
        });
    }

    function processBody(body) {
      var foundEntries = [];

      posthtml()
        .use(posthtmlPreload(options, foundEntries))
        .process(body, {sync: true});

      return foundEntries;
    }

    hijackresponse(res, function(err, res) {
      /* istanbul ignore next */
      // `err` from hijackresponse is currently hardcoded to "null"
      if (err) {
        res.unhijack();
        next(err);
        return;
      }

      // Only hijack HTML responses
      if (!/^text\/html(?:;|\s|$)/.test(res.getHeader('Content-Type'))) {
        res.unhijack();
        return;
      }

      var etag = res.getHeader('etag');
      var entries;

      // reuse previous parse if the etag already exists in cache
      if (etag) {
        entries = cache.get(etag);

        if (entries) {
          insertLinkArray(entries);
          res.pipe(res);
          return;
        }
      }

      res.pipe(
        bl(function(err, data) {
          if (err) {
            res.unhijack();
            next(err);
            return;
          }

          entries = processBody(data.toString());

          insertLinkArray(entries);
          cache.set(etag, entries);

          res.end(data);
        })
      );
    });

    next();
  };
};
