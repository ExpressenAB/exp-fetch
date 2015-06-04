"use strict";

var chai = require("chai");
var should = chai.should();
//var Promise = require("bluebird");

var fetchBuilder = require("../../.");
var nock = require("nock");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);
//var util = require("util");

describe("Fetching redirected resources", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);

  function fakeRedirect(from, to) {
    fake
      .get(from)
      .reply(302, "", {
        Location: to,
        "cache-control": "no-cache"
      });
  }

  it("should cache redirects", function (done) {
    var fetch = fetchBuilder();
    fakeRedirect(path, "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fetch(host + path, function (err, content) {
      content.should.eql({some: "content"});
      done(err);
    });
  });

  it("should cache redirects on the destination url", function (done) {
    var fetch = fetchBuilder();
    fakeRedirect(path, host + "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fetch(host + path, function (err, content) {
      content.should.eql({some: "content"});
      fetch(host + "/otherPath", function (err, content) {
        content.should.eql({some: "content"});
        done(err);
      });
    });
  });

  it("should only cache the redirection on the fromUrl", function (done) {
    var fetch = fetchBuilder();
    fakeRedirect(path, host + "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fake.get("/otherPath2").reply(200, {some: "otherContent"});
    fetch(host + path, function (err, content) {
      content.should.eql({some: "content"});
      fakeRedirect(path, "/otherPath2");
      fetch(host + path, function (err, content) {
        content.should.eql({some: "otherContent"});
        done(err);
      });
    });
  });

  it("should not follow redirects if followRedirect is set to false", function (done) {
    var fetch = fetchBuilder({followRedirect: false});
    fakeRedirect(path, host + "/otherPath");
    fetch(host + path, function (err, content) {
      if (err) return done(err);
      should.exist(content);
      content.should.eql({
        statusCode: 302,
        location: host + "/otherPath",
        body: undefined
      });
      done(err);
    });
  });

  it("should only follow 10 redirects", function (done) {
    var fetch = fetchBuilder();
    fake.get("/20").reply(200, {some: "content"});
    fakeRedirect(path, host + "/1");
    for (var i = 1; i < 20; i++) {
      fakeRedirect("/" + i, host + "/" + (i + 1));
    }
    fetch(host + path, function (err, content) {
      should.exist(err);
      should.not.exist(content);
      done();
    });
  });
});