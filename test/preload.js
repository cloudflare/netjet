'use strict';
var http = require('http');
var describe = require('mocha').describe;
var before = require('mocha').before;
var beforeEach = require('mocha').beforeEach;
var it = require('mocha').it;
var expect = require('assume');
var request = require('supertest-as-promised');
var td = require('testdouble');
var detour = require('detour');
var preload = require('../');

describe('preload', function() {
  describe('requests', function() {
    describe('skips non-HTML', function() {
      before(function() {
        this.server = createServer();
      });

      it('should not parse binary responses', function(done) {
        request(this.server)
          .get('/static/image.png')
          .expect('Content-Type', 'image/png')
          .expect(function(res) {
            expect(res.headers.link).to.not.exist(); // eslint-disable-line security/detect-non-literal-fs-filename
          })
          .expect(200, done);
      });

      it('should not parse JSON responses', function(done) {
        request(this.server)
          .get('/api/whoami')
          .expect('Content-Type', 'application/json')
          .expect(function(res) {
            expect(res.headers.link).to.not.exist(); // eslint-disable-line security/detect-non-literal-fs-filename
          })
          .expect(200, done);
      });
    });

    describe('should include base href', function() {
      before(function() {
        this.server = createServer({
          images: true,
          scripts: false,
          styles: false,
        });
      });

      it('should include for all affected URLs', function(done) {
        request(this.server)
          .get('/base-href/all')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(
            'Link',
            '</images/craig-david.jpg>; rel=preload; as=image, </craig-david.jpg>; rel=preload; as=image, <//cdnjs.com/jquery.js>; rel=preload; as=image, <http://cdnjs.com/jquery.js>; rel=preload; as=image, <https://cdnjs.com/jquery.js>; rel=preload; as=image'
          )
          .expect(200, done);
      });
    });

    describe('should parse out images', function() {
      before(function() {
        this.server = createServer({
          images: true,
          scripts: false,
          styles: false,
        });
      });

      it('should create Link header for single image', function(done) {
        request(this.server)
          .get('/blog/single-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
          .expect(200, done);
      });

      it('should create Link header for multiple images', function(done) {
        request(this.server)
          .get('/blog/mutli-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(
            'Link',
            '</images/2015/12/Cairo.jpg>; rel=preload; as=image, </images/2015/12/London.jpg>; rel=preload; as=image'
          )
          .expect(200, done);
      });

      it('should not create Link header for scripts', function(done) {
        request(this.server)
          .get('/blog/single-image-and-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
          .expect(200, done);
      });

      it('should not create Link header for inline images', function(done) {
        request(this.server)
          .get('/blog/inline-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
          .expect(200, done);
      });
    });

    describe('should parse out scripts', function() {
      before(function() {
        this.server = createServer({
          images: false,
          scripts: true,
          styles: false,
        });
      });

      it('should create Link header for single script', function(done) {
        request(this.server)
          .get('/blog/single-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });

      it('should create Link header for mutliple scripts', function(done) {
        request(this.server)
          .get('/blog/multi-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(
            'Link',
            '</jquery.min.js>; rel=preload; as=script, </bootstrap.min.js>; rel=preload; as=script'
          )
          .expect(200, done);
      });

      it('should not create Link header for images', function(done) {
        request(this.server)
          .get('/blog/single-script-and-image')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });

      it('should not create Link header for inline scripts', function(done) {
        request(this.server)
          .get('/blog/including-inline-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</jquery.min.js>; rel=preload; as=script')
          .expect(200, done);
      });
    });

    describe('should parse out stylesheets', function() {
      before(function() {
        this.server = createServer({
          images: false,
          scripts: false,
          styles: true,
        });
      });

      it('should create Link header for single style', function(done) {
        request(this.server)
          .get('/blog/single-style')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });

      it('should create Link header for mutliple styles', function(done) {
        request(this.server)
          .get('/blog/multi-style')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(
            'Link',
            '</bootstrap.min.css>; rel=preload; as=style, </app.min.css>; rel=preload; as=style'
          )
          .expect(200, done);
      });

      it('should not create Link header for scripts', function(done) {
        request(this.server)
          .get('/blog/single-style-and-script')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });

      it('should not create Link header for other <link> types', function(done) {
        request(this.server)
          .get('/blog/other-link-types')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('Link', '</app.min.css>; rel=preload; as=style')
          .expect(200, done);
      });
    });

    describe('parses all types', function() {
      before(function() {
        this.server = createServer();
      });

      it('should create Link headers for all types', function(done) {
        request(this.server)
          .get('/blog/all')
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect(
            'Link',
            '</images/2015/12/Cairo.jpg>; rel=preload; as=image, </jquery.min.js>; rel=preload; as=script, </app.min.css>; rel=preload; as=style'
          )
          .expect(200, done);
      });
    });

    it('should parse on 404 HTML pages', function(done) {
      var server = createServer();

      request(server)
        .get('/404')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/droids.png>; rel=preload; as=image')
        .expect(404, done);
    });

    it('should URL encode link headers', function(done) {
      var server = createServer();

      request(server)
        .get('/encoded')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/reykjav%C3%ADk.jpg>; rel=preload; as=image')
        .expect(200, done);
    });
  });

  describe('cache', function() {
    beforeEach(function() {
      this.disposer = td.function();

      this.server = createEtagServer({
        cache: {
          max: 2,
          dispose: this.disposer,
        },
      });
    });

    it('should use the values from cache if etags', function() {
      var server = this.server;

      return request(server)
        .get('/etag/setEtag100')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/2015/12/Cairo.jpg>; rel=preload; as=image')
        .expect(200)
        .then(function() {
          return request(server)
            .get('/etag/alsoServeEtag100')
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(
              'Link',
              '</images/2015/12/Cairo.jpg>; rel=preload; as=image'
            )
            .expect(function(res) {
              expect(res.headers.link).to.not.contain('droids'); // eslint-disable-line security/detect-non-literal-fs-filename
            })
            .expect(200);
        });
    });

    it('should evict items from cache', function() {
      var server = this.server;
      var disposer = this.disposer;

      return request(server)
        .get('/etag/etag1/1')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/etag1.png?count=1>; rel=preload; as=image')
        .expect(200)
        .then(function() {
          // add a second item to the cache
          return request(server)
            .get('/etag/etag2/2')
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(
              'Link',
              '</images/etag2.png?count=2>; rel=preload; as=image'
            )
            .expect(200);
        })
        .then(function() {
          return td.verify(disposer(), {
            times: 0,
            ignoreExtraArgs: true,
          });
        })
        .then(function() {
          // add a third item to the cache (should evict the first request)
          return request(server)
            .get('/etag/etag3/3')
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(
              'Link',
              '</images/etag3.png?count=3>; rel=preload; as=image'
            )
            .expect(200);
        })
        .then(function() {
          return td.verify(
            disposer('1', [['/images/etag1.png?count=1', 'image']])
          );
        })
        .then(function() {
          return request(server)
            .get('/etag/etag1/4')
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(
              'Link',
              '</images/etag1.png?count=4>; rel=preload; as=image'
            )
            .expect(200);
        });
    });
  });

  describe('attributes', function() {
    it('should add a custom attribute', function(done) {
      var server = createServer({
        attributes: ['nopush'],
      });

      request(server)
        .get('/404')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Link', '</images/droids.png>; rel=preload; as=image; nopush')
        .expect(404, done);
    });

    it('should add the custom attributes', function(done) {
      var server = createServer({
        attributes: ['nopush', 'x-http2-push-only'],
      });

      request(server)
        .get('/404')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(
          'Link',
          '</images/droids.png>; rel=preload; as=image; nopush; x-http2-push-only'
        )
        .expect(404, done);
    });
  });
});

function createServer(options) {
  var preloader = preload(options);
  var router = detour();

  router.route('/static/image.png', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.write('');
      res.end();
    },
  });

  router.route('/api/whoami', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify({result: 'awesome'}));
      res.end();
    },
  });

  router.route('/blog/single-image', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" />');
      res.end();
    },
  });

  router.route('/blog/mutli-image', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><img src="/images/2015/12/London.jpg" alt="London" />'
      );
      res.end();
    },
  });

  router.route('/blog/single-image-and-script', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script>'
      );
      res.end();
    },
  });

  router.route('/blog/inline-image', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="transparent" /><img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script>'
      );
      res.end();
    },
  });

  router.route('/blog/single-script', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<script src="/jquery.min.js"></script>');
      res.end();
    },
  });

  router.route('/blog/multi-script', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<script src="/jquery.min.js"></script><script src="/bootstrap.min.js"></script>'
      );
      res.end();
    },
  });

  router.route('/blog/single-script-and-image', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script>'
      );
      res.end();
    },
  });

  router.route('/blog/including-inline-script', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<script src="/jquery.min.js"></script><script>console.log("foobar");</script>'
      );
      res.end();
    },
  });

  router.route('/blog/single-style', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<link href="/app.min.css" rel="stylesheet" />');
      res.end();
    },
  });

  router.route('/blog/multi-style', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<link href="/bootstrap.min.css" rel="stylesheet" /><link href="/app.min.css" rel="stylesheet" />'
      );
      res.end();
    },
  });

  router.route('/blog/single-style-and-script', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<link href="/app.min.css" rel="stylesheet" /><script src="/jquery.min.js"></script>'
      );
      res.end();
    },
  });

  router.route('/blog/other-link-types', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<link href="/app.min.css" rel="stylesheet" /><link rel="apple-touch-icon" href="touch-icon-iphone.png" />'
      );
      res.end();
    },
  });

  router.route('/blog/all', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<img src="/images/2015/12/Cairo.jpg" alt="Cairo" /><script src="/jquery.min.js"></script><script>console.log("foobar");</script><link href="/app.min.css" rel="stylesheet" /><link rel="apple-touch-icon" href="touch-icon-iphone.png" />'
      );
      res.end();
    },
  });

  router.route('/encoded', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<img src="/images/reykjavík.jpg" alt="Reykjavík" />');
      res.end();
    },
  });

  router.route('/base-href/all', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(
        '<base href="/"><img src="images/craig-david.jpg" /><img src="/craig-david.jpg" /><img src="//cdnjs.com/jquery.js" /><img src="http://cdnjs.com/jquery.js" /><img src="https://cdnjs.com/jquery.js" />'
      );
      res.end();
    },
  });

  router.on(404, function(req, res) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(
      '<img src="/images/droids.png" alt="This is not the page you\'re looking for!" />'
    );
    res.end();
  });

  var server = http.createServer(function(req, res) {
    preloader(req, res, function() {
      router.middleware(req, res);
    });
  });

  return server;
}

function createEtagServer(options) {
  var preloader = preload(options);
  var router = detour();

  router.route('/etag/setEtag100', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Etag', '100');
      res.write('<img src="/images/2015/12/Cairo.jpg" alt="Cairo" />');
      res.end();
    },
  });

  router.route('/etag/alsoServeEtag100', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Etag', '100');
      res.write(
        '<img src="/images/droids.png" alt="This is not the page you\'re looking for!" />'
      );
      res.end();
    },
  });

  router.route('/etag/etag1/:count', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Etag', '1');
      res.write(
        '<img src="/images/etag1.png?count=' +
          req.pathVar.count +
          '" alt="This is not the page you\'re looking for!" />'
      );
      res.end();
    },
  });

  router.route('/etag/etag2/:count', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Etag', '2');
      res.write(
        '<img src="/images/etag2.png?count=' +
          req.pathVar.count +
          '"  alt="This is not the page you\'re looking for!" />'
      );
      res.end();
    },
  });

  router.route('/etag/etag3/:count', {
    GET: function(req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Etag', '3');
      res.write(
        '<img src="/images/etag3.png?count=' +
          req.pathVar.count +
          '" alt="This is not the page you\'re looking for!" />'
      );
      res.end();
    },
  });

  var server = http.createServer(function(req, res) {
    preloader(req, res, function() {
      router.middleware(req, res);
    });
  });

  return server;
}
