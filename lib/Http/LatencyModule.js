import HttpModule from './HttpModule';
import Timing from '../Timing';
import isPlainObject from 'lodash.isplainobject';
import isBoolean from 'lodash.isboolean';
import merge from 'lodash.merge';
import {except} from '../../utils/helpers';
import {enumerable} from '../../utils/decorators';

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

    /**
     * Defines if the module supports the Resource Timing API.
     * @private
     * @member {number} LatencyModule#_requestsLeft
     */
    @enumerable(false)
    _supportsResourceTiming = undefined;

    /**
     * The total number of requests left.
     * @private
     * @member {number} LatencyModule#_requestsLeft
     */
    @enumerable(false)
    _requestsLeft = undefined;

    /**
     * The total number of attempts left.
     * @private
     * @member {number} LatencyModule#_attemptsLeft
     */
    @enumerable(false)
    _attemptsLeft = undefined;

    /**
     * The measured latencies.
     * @private
     * @member {number[]} LatencyModule#_latencies
     */
    @enumerable(false)
    _latencies = undefined;

    /**
     * The ID of the current request.
     * @private
     * @member {number} LatencyModule#_requestID
     */
    @enumerable(false)
    _requestID = 0;

    /**
     * Unique labels for each request, exclusively used to make measures.
     * @private
     * @member {Object} LatencyModule#_requestID
     * @property {?string} start
     * @property {?string} end
     * @property {?string} measure
     */
    @enumerable(false)
    _timingLabels = {
        start: null,
        end: null,
        measure: null
    };

    constructor(settings = {}) {
        super('latency');

        this._extendDefaultSettings({
            measures: 5,
            attempts: 3
        }).settings(settings);

        this._defineResourceTimingSupport();
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
    settings(settings = null) {
        if (isPlainObject(settings)) {
            return super.settings(merge({}, settings, {
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
    start() {
        let {measures, attempts} = this.settings();

        // Set the number of requests required to establish the network latency.
        this._requestsLeft = measures;
        this._attemptsLeft = attempts * measures;

        // If the browser doesn't support the Resource Timing API, add a request that will be ignored to avoid a longer
        // request due to a possible DNS/whatever fetch.
        if (!this._supportsResourceTiming) {
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
     * Define if the module should support the Resource Timing API.
     * @private
     * @method LatencyModule#_defineResourceTimingSupport
     * @param {boolean} supportsResourceTiming If `undefined`, the support will be determined by feature detection.
     * @returns {LatencyModule}
     */
    _defineResourceTimingSupport(supportsResourceTiming) {
        if (!isBoolean(supportsResourceTiming)) supportsResourceTiming = Timing.supportsResourceTiming;
        this._supportsResourceTiming = supportsResourceTiming;

        // Unregisters all the previously registered events, since this method can be called multiple times.
        this.off(['xhr-load', 'xhr-loadstart', 'xhr-readystatechange']);

        // Measure the latency with the Resource Timing API once the request is finished
        if (supportsResourceTiming) {
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
     * Initiate the next request used for latency measures.
     * @private
     * @method LatencyModule#_nextRequest
     * @param {boolean} [retry=false] Defines if the next request is a retry due to a failing request or not.
     * @returns {LatencyModule}
     */
    _nextRequest(retry = false) {
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
    _measure(xhr = null) {
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
    _end() {
        let latencies = this._latencies;

        // Get the average latency
        let avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
        avgLatency = avgLatency || null;

        // If there is no measures, restart with the polyfill.
        if (!latencies.length) {
            this._defineResourceTimingSupport(false);
            this.start();
            return this;
        }

        // If there is not enough measures, display a warning.
        if (latencies.length < this.settings().measures) {
            let {measures, attempts} = this.settings();

            console.warn(`
                An insufficient number of measures have been processed, this could be due to your web server using
                persistant connections or to your client settings (measures: ${measures}, attempts: ${attempts}).
            `);
        }

        // Trigger the "end" event with the average latency and the latency list as parameters
        this.trigger('end', avgLatency, latencies);

        return this;
    }

}
