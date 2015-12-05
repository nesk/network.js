import EventDispatcher from '../EventDispatcher';
import isPlainObject from 'lodash.isplainobject';
import merge from 'lodash.merge';
import {copy} from '../../utils/helpers';
import {enumerable} from '../../utils/decorators';

/**
 * @public
 * @typedef {Object} HttpModule~settingsObject
 * @property {string} [endpoint=./network.php] Where is located your `network.php` file.
 * @property {number} [delay=8000] The delay while you want to take measures.
 */

/**
 * @class HttpModule
 * @extends EventDispatcher
 * @param {string} moduleName The name of the instanciated module.
 * @param {HttpModule~settingsObject} [settings={}] A set of custom settings.
 */
export default class HttpModule extends EventDispatcher {

    /**
     * The default settings.
     * @private
     * @member {?Object} HttpModule#_defaultSettings
     */
    @enumerable(false)
    _defaultSettings = null;

    /**
     * The current settings.
     * @private
     * @member {?Object} HttpModule#_settings
     */
    @enumerable(false)
    _settings = null;

    /**
     * The module name, will be send to the server.
     * @private
     * @member {string} HttpModule#_moduleName
     */
    @enumerable(false)
    _moduleName = undefined;

    /**
     * The current XMLHttpRequest object.
     * @private
     * @member {?XMLHttpRequest} HttpModule#_xhr
     */
    @enumerable(false)
    _xhr = null;

    /**
     * An URL token to avoid any caching issues. Also allows to identify the request in the Resource Timing entries.
     * @private
     * @member {?string} HttpModule#_lastURLToken
     */
    @enumerable(false)
    _lastURLToken = null;

    /**
     * Defines if the module is currently running an HTTP request.
     * @private
     * @member {boolean} HttpModule#_requesting
     */
    @enumerable(false)
    _requesting = false;

    /**
     * Defines if the requesting status has been overridden by the `_setRequesting` method.
     * @private
     * @member {boolean} HttpModule#_requestingOverridden
     */
    @enumerable(false)
    _requestingOverridden = false;

    constructor(moduleName, settings = {}) {
        super();

        this._extendDefaultSettings({
            endpoint: './network.php',
            delay: 8000
        });

        this.settings(settings);

        this._moduleName = moduleName;

        // Each time a request starts or ends, set the requesting value unless it has been overridden with the
        // _setRequesting() method.
        this.on(['xhr-loadstart', 'xhr-upload-loadstart'], () => {
            if (!this._requestingOverridden) {
                this._requesting = true;
            }
        });

        this.on(['xhr-loadend', 'xhr-upload-loadend'], () => {
            if (!this._requestingOverridden) {
                this._requesting = false;
            }
        });
    }

    /**
     * Apply a new set of custom settings.
     * @public
     * @method HttpModule#settings
     * @param {HttpModule~settingsObject} settings A set of custom settings.
     * @returns {HttpModule}
     */
    /**
     * Return the current set of settings.
     * @public
     * @method HttpModule#settings^2
     * @returns {HttpModule~settingsObject}
     */
    settings(settings = null) {
        const finalSettings = merge({}, this._defaultSettings, this._settings, settings);

        if (isPlainObject(settings)) {
            this._settings = finalSettings;
            return this;
        } else {
            return finalSettings;
        }
    }

    /**
     * Return if the module is currently making a request.
     * @public
     * @method HttpModule#isRequesting
     * @returns {boolean} `true` if the module is requesting, otherwise `false`.
     */
    isRequesting() {
        return this._requesting;
    }

    /**
     * Extend the set of default settings.
     * @protected
     * @method HttpModule#_extendDefaultSettings
     * @param {Object} settings The new properties to add to the default settings.
     * @returns {HttpModule}
     */
    _extendDefaultSettings(settings) {
        this._defaultSettings = merge({}, this._defaultSettings, settings);
        return this;
    }

    /**
     * Create a new XHR request.
     * @protected
     * @method HttpModule#_newRequest
     * @param {string} httpMethod The HTTP method to use with the request, GET or POST.
     * @param {Object} queryParams The query parameters to use with the request.
     * @returns {HttpModule}
     */
    _newRequest(httpMethod, queryParams) {
        // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
        // creation. If the requesting status has been overridden, there's no need to cancel the request since the user
        // should know what he's doing.
        if (!this.trigger('_newRequest') && !this._requestingOverridden) {
            console.warn('To ensure accurate measures, you can only make one request at a time.');
            return this;
        }

        let settings = this.settings(),
            xhr = new XMLHttpRequest(),
            validHttpMethods = ['GET', 'POST'];

        // Prepare the new request.
        if (!~validHttpMethods.indexOf(httpMethod)) {
            console.warn('The HTTP method must be GET or POST.');
            return this;
        }

        queryParams = queryParams || {};

        let tokenSuffix = (new Date).getTime();
        this._lastURLToken = `network-${tokenSuffix}`;

        // Append the query parameters
        let url = settings.endpoint;
        url += ~url.indexOf('?') ? '&' : '?';
        url += `module=${this._moduleName}`;

        Object.keys(queryParams).forEach(param => {
            let value = encodeURIComponent(queryParams[param]);
            url += `&${param}=${value}`;
        });

        url += `&${this._lastURLToken}`;

        xhr.open(httpMethod, url);

        // Abort the previous request if it hasn't been sent
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.abort();
        }

        // Replace the old request by the new one
        this._xhr = xhr;

        // Bind all the XHR events
        const events = [
            'loadstart', 'progress', 'abort', 'error', 'load', 'timeout', 'loadend', 'readystatechange'
        ];

        events.forEach(eventType => {
            xhr.addEventListener(eventType, (...args) => {
                // A last progress event can be triggered once a request has timed out, ignore it.
                if (eventType == 'progress' && !this._requesting) return;

                this.trigger(`xhr-${eventType}`, xhr, ...args);
            });

            // The XMLHttpRequestUpload interface supports all the above event types except the "readystatechange" one
            if (eventType != 'readystatechange') {
                xhr.upload.addEventListener(eventType, (...args) => {
                    this.trigger(`xhr-upload-${eventType}`, xhr, ...args);
                });
            }
        });

        // Define the timeout of the request. We don't use the native `timeout` property since it can distort the
        // measures.
        // See: https://github.com/nesk/network.js/issues/26
        const startTimeout = xhr => {
            setTimeout(() => {
                if (xhr.readyState != XMLHttpRequest.UNSENT && xhr.readyState != XMLHttpRequest.DONE) {
                    this.trigger('xhr-timeout');
                    this.trigger('xhr-upload-timeout');
                    xhr.abort()
                }
            }, settings.delay);
        };

        this.on('xhr-upload-loadstart', startTimeout)
            .on('xhr-readystatechange', (timeoutStarted => {
                return xhr => {
                    if (!timeoutStarted && xhr.readyState == XMLHttpRequest.LOADING) {
                        timeoutStarted = true;
                        startTimeout(xhr);
                    }
                };
            })(false));

        return this;
    }

    /**
     * Send a newly created XHR request.
     * @protected
     * @method HttpModule#_sendRequest
     * @param {?*} [data=null] The data to send with the request.
     * @returns {HttpModule}
     */
    _sendRequest(data = null) {
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.send(data);
        } else {
            console.warn('A request must have been created before sending any data.');
        }

        return this;
    }

    /**
     * Abort the current request.
     * @protected
     * @method HttpModule#_abort
     * @returns {HttpModule}
     */
    _abort() {
        if (this._xhr) {
            this._xhr.abort();
        }

        return this;
    }

    /**
     * Get the Resource Timing entry associated to the current request.
     * @protected
     * @method HttpModule#_getTimingEntry
     * @param {HttpModule~timingCallback} callback A callback used to send back the timing entry.
     * @returns {HttpModule}
     */
    _getTimingEntry(callback) {
        // The Resource Timing entries aren't immediately available once the 'load' event is triggered by an
        // XMLHttpRequest, we must wait for another process tick to check for a refreshed list.
        setTimeout((lastURLToken => {
            return () => {
                // Filter the timing entries to return only the one concerned by the last request made
                let entries = performance.getEntriesByType('resource').filter(function(entry) {
                    return ~entry.name.indexOf(lastURLToken);
                });

                /**
                 * A callback used to send back the timing entry.
                 * @private
                 * @callback HttpModule~timingCallback
                 * @param {PerformanceResourceTiming} entry The Resource Timing entry associated to the current request.
                 */
                callback(entries.length ? entries[0] : null);
            };
        })(this._lastURLToken), 0);

        return this;
    }

    /**
     * Override the requesting status of the module.
     * @protected
     * @method HttpModule#_setRequesting
     * @param {boolean} isRequesting The requesting status.
     * @returns {HttpModule}
     */
    _setRequesting(isRequesting) {
        this._requestingOverridden = true;
        this._requesting = isRequesting;
        return this;
    }

}
