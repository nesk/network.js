import EventDispatcher from '../event-dispatcher';

export default class HttpModule extends EventDispatcher {

    constructor(moduleName, options = {})
    {
        super.constructor();

        options = Object.assign({
            endpoint: './speedtest.php',
            delay: 8000
        }, options);

        // Define the object properties
        this._options = options;
        this._moduleName = moduleName;
        this._xhr = null;
        this._lastURLToken = null;

        this._requestingOverridden = false;
        this._requesting = false;

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

    isRequesting()
    {
        return this._requesting;
    }

    _newRequest(httpMethod, queryParams)
    {
        // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
        // creation. If the requesting status has been overridden, there's no need to cancel the request since the user
        // should know what he's doing.
        if (!this.trigger('_newRequest') && !this._requestingOverridden) {
            console.warn('To ensure accurate measures, you can only make one request at a time.');
            return this;
        }

        var options = this._options,
            xhr = new XMLHttpRequest(),
            validHttpMethods = ['GET', 'POST'];

        // Prepare the new request.
        if (!~validHttpMethods.indexOf(httpMethod)) {
            console.warn('The HTTP method must be GET or POST.');
            return this;
        }

        queryParams = queryParams || {};

        // Generate an URL token to avoid any caching issues. This token will also allow to identify the request in the
        // Resource Timing entries.
        this._lastURLToken = 'speedtest-'+ (new Date).getTime();

        // Append the query parameters
        var url = options.endpoint;
            url += (~url.indexOf('?') ? '&' : '?') + 'module=' + this._moduleName;

        Object.keys(queryParams).forEach(param => {
            url += '&' + param + '=' + encodeURIComponent(queryParams[param]);
        });

        url += '&' + this._lastURLToken;

        xhr.open(httpMethod, url);

        // Define the timeout of the request
        xhr.timeout = options.delay;

        // Abort the previous request if it hasn't been sent
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.abort();
        }

        // Replace the old request by the new one
        this._xhr = xhr;

        // Bind all the XHR events
        var self = this,
            eventTypes = ['loadstart', 'progress', 'abort', 'error', 'load', 'timeout', 'loadend', 'readystatechange'];

        eventTypes.forEach(eventType => {
            xhr.addEventListener(eventType, function() {
                // A last progress event can be triggered once a request has timed out, ignore it.
                if (eventType == 'progress' && !self._requesting) {
                    return;
                }

                self.trigger('xhr-'+ eventType, xhr, ...arguments);
            });

            // The XMLHttpRequestUpload interface supports all the above event types except the "readystatechange" one
            if (eventType != 'readystatechange') {
                xhr.upload.addEventListener(eventType, function() {
                    self.trigger('xhr-upload-'+ eventType, xhr, ...arguments);
                });
            }
        });

        return this;
    }

    _sendRequest(data)
    {
        if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
            this._xhr.send(typeof data != 'undefined' ? data : null);
        } else {
            console.warn('A request must have been created before it can be sent.');
        }

        return this;
    }

    _abort()
    {
        if (this._xhr) {
            this._xhr.abort();
        }

        return this;
    }

    _getTimingEntry(callback)
    {
        // The Resource Timing entries aren't immediately available once the 'load' event is triggered by an
        // XMLHttpRequest, we must wait for another process tick to check for a refreshed list.
        setTimeout((lastURLToken => {
            return () => {
                // Filter the timing entries to return only the one concerned by the last request made
                var entries = performance.getEntriesByType('resource').filter(function(entry) {
                    return ~entry.name.indexOf(lastURLToken);
                });

                // Return the entry through the callback
                typeof callback == 'function' && callback(entries.length ? entries[0] : null);
            };
        })(this._lastURLToken), 0);

        return this;
    }

    _setRequesting(value)
    {
        this._requestingOverridden = true;
        this._requesting = value;
    }

}
