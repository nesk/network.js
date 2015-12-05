// ES6 polyfills
require('core-js/modules/es6.object.assign.js');

import EventDispatcher from './EventDispatcher';
import HttpModule from './Http/HttpModule';
import LatencyModule from './Http/LatencyModule';
import BandwidthModule from './Http/BandwidthModule';
import Timing from './Timing';
import isPlainObject from 'lodash.isplainobject';
import merge from 'lodash.merge';
import {getGlobalObject, except} from '../utils/helpers';
import {enumerable} from '../utils/decorators';

/**
 * @public
 * @typedef {Object} Network~settingsObject
 * @property {LatencyModule~settingsObject} latency
 * @property {BandwidthModule~settingsObject} upload
 * @property {BandwidthModule~settingsObject} download
 * @example
 * {
 *     // Top-level properties are applied to all the modules
 *     endpoint: './my-new-endpoint/',
 *
 *     // Top-level properties will be overridden by the ones specified in each module
 *     latency: {
 *         endpoint: './my-new-latency-endpoint/'
 *     }
 * }
 */

/**
 * @class Network
 * @param {Network~settingsObject} [settings={}] A set of custom settings.
 * @member {LatencyModule} latency The latency module.
 * @member {BandwidthModule} upload The upload module.
 * @member {BandwidthModule} download The download module.
 */
export default class Network {

    /**
     * Defines if the current browser supports the Resource Timing API.
     * @public
     * @readonly
     * @member {boolean} Network#supportsResourceTiming
     */
    static get supportsResourceTiming() {
        return Timing.supportsResourceTiming;
    }

    /**
     * The registered modules.
     * @private
     * @member {Object} Network#_modules
     */
    @enumerable(false)
    _modules = {};

    /**
     * Defines if the registered modules have been initialized.
     * @private
     * @member {boolean} Network#_modulesInitialized
     */
    @enumerable(false)
    _modulesInitialized = false;

    /**
     * The settings defined via the constructor, they will be applied once the modules are initialized.
     * @private
     * @member {Network~settingsObject} Network#_pendingSettings
     */
    @enumerable(false)
    _pendingSettings = {};

    /**
     * Expose all the internal classes to the global scope. Only for testing purposes!
     * @private
     * @method Network._exposeInternalClasses
     * @returns {Network}
     */
    @enumerable(false)
    static _exposeInternalClasses() {
        let global = getGlobalObject(),
            classes = {EventDispatcher, HttpModule, LatencyModule, BandwidthModule, Timing};

        Object.keys(classes).forEach(name => {
            global[name] = classes[name];
        });

        return this;
    }

    constructor(settings = {}) {
        this._registerModule('latency', settings => new LatencyModule(settings))
            ._registerModule('upload', settings => new BandwidthModule('upload', settings))
            ._registerModule('download', settings => new BandwidthModule('download', settings));

        this._initModules(this.settings(settings));
    }

    /**
     * Apply a new set of custom settings.
     * @public
     * @method Network#settings
     * @param {Network~settingsObject} settings A set of custom settings.
     * @returns {Network}
     */
    /**
     * Return the current set of settings.
     * @public
     * @method Network#settings^2
     * @returns {Network~settingsObject}
     */
    settings(settings = null) {
        let moduleNames = Object.keys(this._modules);

        if (isPlainObject(settings)) {
            // Extract the global settings
            let globalSettings = except(settings, moduleNames);

            // Extract the local settings
            let localSettings = except(settings, Object.keys(globalSettings));

            // Create new settings with the global ones nested in the local ones
            settings = moduleNames.reduce((settings, moduleName) => {
                return merge({}, settings, {[moduleName]: globalSettings});
            }, {});

            // Apply the local settings to the new settings
            settings = merge({}, settings, localSettings);

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
                return merge({}, settings, {[moduleName]: this._modules[moduleName].settings()});
            }, {});
        }
    }

    /**
     * Return if a module is currently making a request.
     * @public
     * @method Network#isRequesting
     * @returns {boolean} `true` if a module is requesting, otherwise `false`.
     */
    isRequesting() {
        let requesting = false;

        for (let name in this._modules) {
            if (this._modules.hasOwnProperty(name)) {
                requesting = requesting || this._modules[name].isRequesting();
            }
        }

        return requesting;
    }

    /**
     * Register a new module for the current `Network` instance.
     * @private
     * @method Network#registerModule
     * @param {string} name The name of the module. Will be used to create the property `Network.<name>`.
     * @param {Network~moduleCallback} moduleCallback A callback used to initialize a module with a set of settings.
     * @returns {Network}
     */
    _registerModule(name, moduleCallback) {
        /**
         * A callback used to initialize a module with a set of settings.
         * @private
         * @callback Network~moduleCallback
         * @param {Object} settings A set of custom settings.
         * @returns {HttpModule} An instanciated subclass of `HttpModule`.
         */
        this._modules[name] = moduleCallback;
        return this;
    }

    /**
     * Initialize all the registered modules with the settings passed to the constructor.
     * @private
     * @method Network#_initModules
     * @returns {Network}
     */
    _initModules() {
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
