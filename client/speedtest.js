(function() {

    'use strict';

    var SpeedTest = function(endpoint) {
        this._ping = new PingModule();
        this._upload = new BandwidthModule('upload');
        this._download = new BandwidthModule('download');
    };

    var fn = SpeedTest.prototype;

    fn.ping = function() {
        return this._ping;
    }

    fn.upload = function() {
        return this._upload;
    }

    fn.download = function() {
        return this._download;
    }

    // Class exposure.
    window.SpeedTest = SpeedTest;

})();