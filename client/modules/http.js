define(['event-dispatcher'], function(EventDispatcher) {

    'use strict';

    var HttpModule = function(endpoint, moduleName) {
        EventDispatcher.call(this);

        this._endpoint = endpoint;
        this._moduleName = moduleName;
        this._xhr = null;
        this._lastURLToken = null;

        this._requestingOverridden = false;
        this._requesting = false;

        this._initHttpConfig();
    };

    var fn = HttpModule.prototype = Object.create(EventDispatcher.prototype);

    fn.isRequesting = function() {
        return this._requesting;
    };

    fn._initHttpConfig = function() {
        var _this = this;

        // Set the requesting value unless it has been overridden with the _setRequesting() method.
        this.on('xhr-loadstart', function() {
            if (!_this._requestingOverridden) {
                _this._requesting = true;
            }
        });

        this.on('xhr-loadend', function() {
            if (!_this._requestingOverridden) {
                _this._requesting = false;
            }
        });
    };

    fn._newRequest = function(httpMethod, path) {
        // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
        // creation. If the requesting status has been overridden, there's no need to cancel the request since the user
        // should know what he's doing.
        if (!this.trigger('_newRequest') && !this._requestingOverridden) {
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

        // TODO: We must handle the endpoints that already contains the "?" character.
        var url = this._endpoint + (typeof path != 'undefined' ? path : '')
                    +'?module='+ this._moduleName
                    +'&'+ this._lastURLToken;

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
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.send(typeof data != 'undefined' ? data : null);
        } else {
            console.warn('A request must have been created before it can be sent.');
        }

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

    fn._setRequesting = function(value) {
        this._requestingOverridden = true;
        this._requesting = value;
    };

    // Class exposure.
    return HttpModule;

});