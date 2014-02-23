(function() {

    'use strict';

    var SpeedTest = function(endpoint) {
        var modules = this._modules = {};

        this._setModule('ping', new PingModule())
            ._setModule('upload', new BandwidthModule('upload'))
            ._setModule('download', new BandwidthModule('download'));
    };

    var fn = SpeedTest.prototype;

    fn.module = function(name) {
        return this._modules[name] || null;
    };

    fn.isRequesting = function() {
        var modules = this._modules,
            requesting = true;

        for (var i in modules) {
            if (modules.hasOwnProperty(i)) {
                requesting = requesting && modules[i].isRequesting();
            }
        }

        return requesting;
    };

    fn._setModule = function(name, object) {
        var _this = this;

        if (object) {
            this._modules[name] = object.on('newRequest', function() {
                return !_this.isRequesting();
            });
        }

        return this;
    };

    // Class exposure.
    window.SpeedTest = SpeedTest;

})();