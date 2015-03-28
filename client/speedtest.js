require('babel/polyfill');

var LatencyModule = require('./modules/latency'),
    BandwidthModule = require('./modules/bandwidth');

export default class SpeedTest {

    constructor(options = {})
    {
        // Initialize the modules
        this._modules = {};
        this._setModule('latency', new LatencyModule(options))
            ._setModule('upload', new BandwidthModule('upload', options))
            ._setModule('download', new BandwidthModule('download', options));
    }

    module(name)
    {
        return this._modules[name] || null;
    }

    isRequesting()
    {
        var modules = this._modules,
            requesting = false;

        for (var i in modules) {
            if (modules.hasOwnProperty(i)) {
                requesting = requesting || modules[i].isRequesting();
            }
        }

        return requesting;
    }

    _setModule(name, object)
    {
        if (object) {
            this._modules[name] = object.on('_newRequest', () => !this.isRequesting());
        }

        return this;
    }

}
