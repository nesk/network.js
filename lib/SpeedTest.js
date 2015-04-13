import EventDispatcher from './EventDispatcher';
import HttpModule from './Http/HttpModule';
import LatencyModule from './Http/LatencyModule';
import BandwidthModule from './Http/BandwidthModule';
import Timing from './Timing';
import {assign} from '../utils/helpers';

export default class SpeedTest {

    /**
     * Only for testing purposes! Exposes all the internal classes to the global scope.
     */
    static _exposeInternalClasses()
    {
        assign(window, {EventDispatcher, HttpModule, LatencyModule, BandwidthModule, Timing});
    }

    constructor(options = {})
    {
        // Initialize the modules
        this._modules = {};
        this._setModule('latency', new LatencyModule(options))
            ._setModule('upload', new BandwidthModule('upload', options))
            ._setModule('download', new BandwidthModule('download', options));
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
            this[name] = this._modules[name] = object.on('_newRequest', () => !this.isRequesting());
        }

        return this;
    }

}
