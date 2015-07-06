import HttpModule from './HttpModule';
import Timing from '../Timing';
import {isObject, assignStrict, except} from '../../utils/helpers';

/**
 * @public
 * @typedef {Object} LatencyModule~settingsObject
 * @property {string} [endpoint=./network.php] Where is located your `network.php` file.
 * @property {number} [measures=5] How many measures should be returned.
 * @property {number} [attempts=3] How much attempts to get a valid value should be done for each measure.
 */

/**
 * @class LatencyModule
 * @extends HttpModule
 * @param {LatencyModule~settingsObject} [settings={}] A set of custom settings.
 */
export default class LatencyModule extends HttpModule {

    constructor(settings = {})
    {
        super('latency');

        this._extendDefaultSettings({
            measures: 5,
            attempts: 3
        }).settings(settings);

        // Define the object properties
        this._requestsLeft = 0;
        this._attemptsLeft = 0;

        this._latencies = [];
        this._requestID = 0;

        // Unique labels for each request, exclusively used to make measures.
        this._timingLabels = {
            start: null,
            end: null,
            measure: null
        };

        // Measure the latency with the Resource Timing API once the request is finished
        if (Timing.supportsResourceTiming()) {
            this.on('xhr-load', () => this._measure());
        }

        // If the browser doesn't support the Resource Timing API, we fallback on a Datetime solution.
        else {
            // Set a mark when the request starts
            this.on('xhr-loadstart', () => Timing.mark(this._timingLabels.start));

            // Then make a measure with the previous mark
            this.on('xhr-readystatechange', xhr => this._measure(xhr));
        }
    }

    /**
     * Apply a new set of custom settings.
     * @public
     * @method LatencyModule#settings
     * @param {LatencyModule~settingsObject} settings A set of custom settings.
     * @returns {LatencyModule}
     */
    /**
     * Return the current set of settings.
     * @public
     * @method LatencyModule#settings^2
     * @returns {LatencyModule~settingsObject}
     */
    settings(settings = null)
    {
        if (isObject(settings)) {
            return super.settings(assignStrict(settings, {
                delay: 0 // We dont want any timeout during a latency calculation
            }));
        } else {
            return except(super.settings(), ['delay']);
        }
    }

    /**
     * Start requesting the server to make measures.
     * @public
     * @method LatencyModule#start
     * @returns {LatencyModule}
     */
    start()
    {
        // Set the number of requests required to establish the network latency. If the browser doesn't support the
        // Resource Timing API, add a request that will be ignored to avoid a longer request due to a possible
        // DNS/whatever fetch.
        let {measures, attempts} = this.settings();

        this._requestsLeft = measures;
        this._attemptsLeft = attempts * measures;

        if (!Timing.supportsResourceTiming()) {
            this._requestsLeft++;
            this._attemptsLeft++;
        }

        // Override the requesting value since a complete latency request consists off multiple ones
        this._setRequesting(true);

        this._latencies = [];
        this._nextRequest();

        return this;
    }

    /**
     * Initiate the next request used for latency measures.
     * @private
     * @method LatencyModule#_nextRequest
     * @param {boolean} [retry=false] Defines if the next request is a retry due to a failing request or not.
     * @returns {LatencyModule}
     */
    _nextRequest(retry = false)
    {
        const reqID = this._requestID++;
        let requestsLeft = retry ? this._requestsLeft : this._requestsLeft--;

        if (this._attemptsLeft-- && (requestsLeft || retry)) {
            // Create unique timing labels for the new request
            var labels = this._timingLabels;
            labels.start = `latency-${reqID}-start`;
            labels.end = `latency-${reqID}-end`;
            labels.measure = `latency-${reqID}-measure`;

            // Create the new request and send it
            this._newRequest('GET')._sendRequest();
        } else {
            // All the requests are finished, set the requesting status to false.
            this._setRequesting(false);

            // If all the requests have been executed, calculate the average latency. Since the _getTimingEntry() method
            // is asynchronous, wait for the next process tick to execute the _end() method, to be sure that all the
            // latencies have been retrieved.
            setTimeout(() => this._end(), 0);
        }

        return this;
    }

    /**
     * Make latency measures for the last request.
     * @private
     * @method LatencyModule#_measure
     * @param {?XMLHttpRequest} [xhr=null] The concerned XMLHttpRequest if the browser doesn't support the Resource Timing API.
     * @returns {LatencyModule}
     */
    _measure(xhr = null)
    {
        // With Resource Timing API
        if (!xhr) {
            this._getTimingEntry(entry => {
                // The latency calculation differs between an HTTP and an HTTPS connection
                // See: http://www.w3.org/TR/resource-timing/#processing-model
                let latency = !entry.secureConnectionStart
                        ? entry.connectEnd - entry.connectStart
                        : entry.secureConnectionStart - entry.connectStart;

                if (latency) this._latencies.push(latency);
                this._nextRequest(!latency);
            });
        }

        // Without Resource Timing API
        else if (this._requestsLeft < this.settings().measures) {

            // Measure and save the latency if the headers have been received
            if (xhr.readyState == XMLHttpRequest.HEADERS_RECEIVED) {
                let labels = this._timingLabels;

                Timing.mark(labels.end);
                let latency = Timing.measure(labels.measure, labels.start, labels.end);

                if (latency) this._latencies.push(latency);

                // Abort the current request before we run a new one
                this._abort();
                this._nextRequest(!latency);
            }

        }

        // Ignore the first request when using the XHR states. See the comments in the start() method for explanations.
        else {
            this._nextRequest();
        }

        return this;
    }

    /**
     * End the measures.
     * @private
     * @method LatencyModule#_end
     * @returns {LatencyModule}
     */
    _end()
    {
        let latencies = this._latencies;

        // Get the average latency
        let avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
        avgLatency = avgLatency || null;

        // If there is not enough measures, display a warning.
        if (latencies.length < this.settings().measures) {
            let {measures, attempts} = this.settings();

            console.warn([
                'An insufficient number of measures have been processed, this could be due to your web server using',
                `persistant connections or to your client settings (measures: ${measures}, attempts: ${attempts})`
            ].join(' '));
        }

        // Trigger the "end" event with the average latency and the latency list as parameters
        this.trigger('end', avgLatency, latencies);

        return this;
    }

}
