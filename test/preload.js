'use strict';
require('core-js/shim');

var describe = require('mocha').describe;
var before = require('mocha').before;
var it = require('mocha').it;
var expect = require('assume');

var http = require('http');
var preload = require('../');
var request = require('supertest');

var detour = require('detour');
var router = detour();

describe('preload', function () {
  describe('requests', function () {
    var server;

    describe('skips non-HTML', function () {
      before(function () {
        server = createServer();
      });

      it('should not parse binary responses', function (done) {
        request(server)
          .get('/static/image.png')
          .expect('Content-Type', 'image/png')
          .expect(function (res) {
            expect(res.headers.link).to.not.exist();
          })
          .expect(200, done);
      });

      it('should not parse JSON responses', function (done) {
        request(server)
          .get('/api/whoami')
          .expect('Content-Type', 'application/json')
          .expect(function (res) {
            expect(res.headers.link).to.not.exist();
          })
          .expect(200, done);
      });
    });

    describe('should parse out images', function () {
      before(function () {
        server = createServer({
          images: true,
          scripts: false,
          styles: false
        });
      });

      it('should create Link header for single image', function (done) {
        request(server)
          .get('/blog/single-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
          .expect(200, done);
      });

      it('should create Link header for multiple images', function (done) {
        request(server)
          .get('/blog/mutli-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image, </images/2015/12/London.jpg>; rel=preload; as=image')
          .expect(200, done);
      });

      it('should not create Link header for scripts', function (done) {
        request(server)
          .get('/blog/single-image-and-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
          .expect(200, done);
      });
    });

    describe('should parse out scripts', function () {
      before(function () {
        server = createServer({
          images: false,
          scripts: true,
          styles: false
        });
      });

      it('should create Link header for single script', function (done) {
        request(server)
          .get('/blog/single-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });

      it('should create Link header for mutliple scripts', function (done) {
        request(server)
          .get('/blog/multi-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script, </bootstrap.min.js>; rel=preload; as=script')
          .expect(200, done);
      });

      it('should not create Link header for images', function (done) {
        request(server)
          .get('/blog/single-script-and-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });

      it('should not create Link header for inline scripts', function (done) {
        request(server)
          .get('/blog/including-inline-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });
    });

    describe('should parse out stylesheets', function () {
      before(function () {
        server = createServer({
          images: false,
          scripts: false,
          styles: true
        });
      });

      it('should create Link header for single style', function (done) {
        request(server)
          .get('/blog/single-style')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });

      it('should create Link header for mutliple styles', function (done) {
        request(server)
          .get('/blog/multi-style')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</bootstrap.min.css>; rel=preload; as=style, </app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });

      it('should not create Link header for scripts', function (done) {
        request(server)
          .get('/blog/single-style-and-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });

      it('should not create Link header for other <link> types', function (done) {
        request(server)
          .get('/blog/other-link-types')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });
    });

    describe('parses all types', function () {
      before(function () {
        server = createServer();
      });

      it('should create Link headers for all types', function (done) {
        request(server)
          .get('/blog/all')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image, </jquery.min.js>; rel=preload; as=script, </app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });
    });

    it('should parse on 404 HTML pages', function (done) {
      server = createServer();

      request(server)
        .get('/404')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/droids.png>; rel=preload; as=image')
        .expect(404, done);
    });
  });
});

function createServer(options) {
  var _preload = preload(options);

  router.route('/static/image.png', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.write('');
      res.end();
    }
  });

  router.route('/api/whoami', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify({result: 'awesome'}));
      res.end();
    }
  });

  router.route('/blog/single-image', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" />');
      res.end();
    }
  });

  router.route('/blog/mutli-image', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><img src="/images/2015/12/London.jpg" alt="London" />');
      res.end();
    }
  });

  router.route('/blog/single-image-and-script', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script>');
      res.end();
    }
  });

  router.route('/blog/single-script', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<script src="/jquery.min.js"></script>');
      res.end();
    }
  });

  router.route('/blog/multi-script', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<script src="/jquery.min.js"></script><script src="/bootstrap.min.js"></script>');
      res.end();
    }
  });

  router.route('/blog/single-script-and-image', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script>');
      res.end();
    }
  });

  router.route('/blog/including-inline-script', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<script src="/jquery.min.js"></script><script>console.log("foobar");</script>');
      res.end();
    }
  });

  router.route('/blog/single-style', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<link href="/app.min.css" rel="stylesheet" />');
      res.end();
    }
  });

  router.route('/blog/multi-style', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<link href="/bootstrap.min.css" rel="stylesheet" /><link href="/app.min.css" rel="stylesheet" />');
      res.end();
    }
  });

  router.route('/blog/single-style-and-script', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<link href="/app.min.css" rel="stylesheet" /><script src="/jquery.min.js"></script>');
      res.end();
    }
  });

  router.route('/blog/other-link-types', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<link href="/app.min.css" rel="stylesheet" /><link rel="apple-touch-icon" href="touch-icon-iphone.png" />');
      res.end();
    }
  });

  router.route('/blog/all', {
    GET: function (req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script><script>console.log("foobar");</script><link href="/app.min.css" rel="stylesheet" /><link rel="apple-touch-icon" href="touch-icon-iphone.png" />');
      res.end();
    }
  });

  router.on(404, function (req, res) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write('<img src="/images/droids.png" alt="This is not the page you\'re looking for!" />');
    res.end();
  });

  var server = http.createServer(function (req, res) {
    _preload(req, res, function () {
      router.middleware(req, res);
    });
  });

  return server;
}
