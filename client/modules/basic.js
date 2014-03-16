define(function() {

    'use strict';

    /**
     * Creates a new basic SpeedTest module, providing an event dispatcher and basic networking management.
     * @constructor
     */
    var BasicModule = function(endpoint) {
        // Declare the properties.
        this._endpoint = endpoint;
        this._events = {}; // Contains all the event callbacks, organized by event types.
        this._xhr = null;
        this._lastURLToken = null;
        this._requesting = false;

        // Init the object.
        this._initBasicConfig();
    };

    var fn = BasicModule.prototype;

    fn.on = function(eventType, callback) {
        var events = this._events[eventType];

        // If inexistant, create the array used to store the callbacks.
        if (!events) {
            events = this._events[eventType] = [];
        }

        // If the callback isn't already registered, store it.
        if (!~events.indexOf(callback)) {
            events.push(callback);
        }

        return this;
    };

    fn.off = function(eventType, callback) {
        var events = this._events[eventType];
        
        // If there is no specified callback, simply delete all the callbacks binded to the provided event type.
        if (typeof callback == 'undefined' && events) {
            delete this._events[eventType];
        } else {
            var eventIndex = events ? events.indexOf(callback) : -1;

            // If the callback is registered, remove it from the array.
            if (~eventIndex) {
                events.splice(eventIndex, 1);
            }
        }

        return this;
    };

    fn.trigger = function(eventType, extraParameters, context) {
        var events = this._events[eventType] || [];
        extraParameters = extraParameters || [];

        // A callback can return a boolean value which will be logically compared to the other callbacks values before
        // being returned by the trigger() method. This allows a callback to send a "signal" to the caller, like
        // cancelling an action.
        var returnValue = true;

        events.forEach(function(callback) {
            // A callback must explicitly return false if it wants the trigger() method to return false, undefined will
            // not work. This avoids crappy callbacks to mess up with the triggering system.
            var value = callback.apply(this, extraParameters);
                value = value !== false ? true : false;

            returnValue = returnValue && value; // Compare the result of the callback to the actual return value.
        }, context);

        return returnValue;
    };

    fn.isRequesting = function() {
        return this._requesting;
    };

    fn._initBasicConfig = function() {
        var _this = this;

        this.on('xhr-loadstart', function() {
            _this._requesting = true;
        });

        this.on('xhr-loadend', function() {
            _this._requesting = false;
        });
    };

    fn._newRequest = function(httpMethod, path) {
        // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
        // creation.
        if (!this.trigger('_newRequest')) {
            console.warn('To ensure accurate measures, you can only make one request at a time.');
            return this;
        }

        var _this = this,
            xhr = new XMLHttpRequest(),
            validHttpMethods = ['GET', 'POST'];

        // Prepare the new request.
        if (!~validHttpMethods.indexOf(httpMethod)) {
            console.warn('The HTTP method must be GET or POST.');
            return this;
        }

        // Generate an URL token to avoid any caching issues. This token will also allow to identify the request in the
        // Resource Timing entries.
        this._lastURLToken = 'speedtest-'+ (new Date).getTime();

        var url = this._endpoint + (typeof path != 'undefined' ? path : '') +'?'+ this._lastURLToken;

        xhr.open(httpMethod, url);

        // Abort the previous request if it hasn't been sent.
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.abort();
        }

        // Replace the old request by the new one.
        this._xhr = xhr;

        // Bind all the XHR events.
        var eventTypes = ['loadstart', 'progress', 'abort', 'error', 'load', 'timeout', 'loadend', 'readystatechange'];

        eventTypes.forEach(function(eventType) {
            xhr.addEventListener(eventType, function() {
                _this.trigger('xhr-'+ eventType, arguments, xhr);
            });

            // The XMLHttpRequestUpload interface supports all the above event types except the "readystatechange" one.
            if (eventType != 'readystatechange') {
                xhr.upload.addEventListener(eventType, function() {
                    _this.trigger('xhr-upload-'+ eventType, arguments, xhr);
                });
            }
        });

        return this;
    };

    fn._sendRequest = function(data) {
        this._xhr.send(typeof data != 'undefined' ? data : null);
        return this;
    };

    fn._getTimingEntry = function(callback) {
        // The Resource Timing entries aren't immediately available once the 'load' event is triggered by an
        // XMLHttpRequest, we must wait for another process tick to check for a refreshed list.
        setTimeout((function(lastURLToken) {
            return function() {
                // Filter the timing entries to return only the one concerned by the last request made.
                var entries = performance.getEntriesByType('resource').filter(function(entry) {
                    return ~entry.name.indexOf(lastURLToken);
                });

                // Return the entry through the callback.
                typeof callback == 'function' && callback(entries.length ? entries[0] : null);
            };
        })(this._lastURLToken), 0);

        return this;
    };

    // Class exposure.
    return BasicModule;

});