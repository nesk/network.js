'use strict';

var LatencyModule = require('./modules/latency'),
    BandwidthModule = require('./modules/bandwidth');

var SpeedTest = module.exports = function(options) {
    // Initialize the modules
    this._modules = {};
    this._setModule('latency', new LatencyModule(options))
        ._setModule('upload', new BandwidthModule('upload', options))
        ._setModule('download', new BandwidthModule('download', options));
};

var fn = SpeedTest.prototype;

fn.module = function(name) {
    return this._modules[name] || null;
};

fn.isRequesting = function() {
    var modules = this._modules,
        requesting = false;

    for (var i in modules) {
        if (modules.hasOwnProperty(i)) {
            requesting = requesting || modules[i].isRequesting();
        }
    }

    return requesting;
};

fn._setModule = function(name, object) {
    var _this = this;

    if (object) {
        this._modules[name] = object.on('_newRequest', function() {
            return !_this.isRequesting();
        });
    }

    return this;
};
