require(['modules/latency', 'modules/bandwidth'], function(LatencyModule, BandwidthModule) {

    'use strict';

    var SpeedTest = function(endpoint) {
        if (typeof endpoint == 'undefined') {
            console.warn('An endpoint should be provided when a new SpeedTest object is instanciated.');
        }

        this._modules = {};
        this._setModule('latency', new LatencyModule(endpoint))
            ._setModule('upload', new BandwidthModule(endpoint, 'upload'))
            ._setModule('download', new BandwidthModule(endpoint, 'download'));
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

    // Class exposure.
    window.SpeedTest = SpeedTest;

});