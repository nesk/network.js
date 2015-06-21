import EventDispatcher from './EventDispatcher';
import HttpModule from './Http/HttpModule';
import LatencyModule from './Http/LatencyModule';
import BandwidthModule from './Http/BandwidthModule';
import Timing from './Timing';
import {isObject, assign, except} from '../utils/helpers';

export default class SpeedTest {

    /**
     * Only for testing purposes! Exposes all the internal classes to the global scope.
     */
    static _exposeInternalClasses()
    {
        assign(window, {EventDispatcher, HttpModule, LatencyModule, BandwidthModule, Timing});
    }

    constructor(settings = {})
    {
        this._modules = {};
        this._modulesInitialized = false;
        this._pendingSettings = {};

        this._registerModule('latency', settings => new LatencyModule(settings))
            ._registerModule('upload', settings => new BandwidthModule('upload', settings))
            ._registerModule('download', settings => new BandwidthModule('download', settings));

        this._initModules(this.settings(settings));
    }

    settings(settings = null)
    {
        let moduleNames = Object.keys(this._modules);

        if (isObject(settings)) {
            // Extract the global settings
            let globalSettings = except(settings, moduleNames);

            // Extract the local settings
            let localSettings = except(settings, Object.keys(globalSettings));

            // Create new settings with the global ones nested in the local ones
            settings = moduleNames.reduce((settings, moduleName) => {
                return assign(settings, {[moduleName]: globalSettings});
            }, {});

            // Apply the local settings to the new settings
            settings = assign(settings, localSettings);

            // Apply the settings to the modules
            if (this._modulesInitialized) {
                Object.keys(this._modules).forEach(name => {
                    this._modules[name].settings(settings[name]);
                });
            }

            // If the modules aren't instanciated, store the settings.
            else {
                this._pendingSettings = settings;
            }

            return this;
        } else {
            return moduleNames.reduce((settings, moduleName) => {
                return assign(settings, {[moduleName]: this._modules[moduleName].settings()});
            }, {});
        }
    }

    isRequesting()
    {
        let requesting = false;

        for (let name in this._modules) {
            if (this._modules.hasOwnProperty(name)) {
                requesting = requesting || this._modules[name].isRequesting();
            }
        }

        return requesting;
    }

    _registerModule(name, moduleCallback)
    {
        this._modules[name] = moduleCallback;
        return this;
    }

    _initModules()
    {
        if (!this._modulesInitialized) {
            // Initialize the modules with their respective settings
            Object.keys(this._modules).forEach(name => {
                this._modules[name] = this._modules[name](this._pendingSettings[name]).on('_newRequest', () => {
                    return !this.isRequesting();
                });

                this[name] = this._modules[name];
            });

            this._modulesInitialized = true;
        }

        return this;
    }

}
