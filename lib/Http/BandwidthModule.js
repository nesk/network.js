import HttpModule from './HttpModule';
import Timing from '../Timing';
import {defer} from '../../utils/helpers';
import {enumerable} from '../../utils/decorators';

/**
 * @public
 * @typedef {Object} BandwidthModule~settingsObject
 * @extends HttpModule~settingsObject
 * @property {Object} data
 * @property {number} data.size The amount of data to initially use.
 * @property {number} [data.multiplier=2] If the measure period can't reach the delay defined in the settings, the data amount is multiplied by the following value.
 */

/**
 * Apply a new set of custom settings.
 * @public
 * @method BandwidthModule#settings
 * @param {BandwidthModule~settingsObject} settings A set of custom settings.
 * @returns {BandwidthModule}
 */
/**
 * Return the current set of settings.
 * @public
 * @method BandwidthModule#settings^2
 * @returns {BandwidthModule~settingsObject}
 */

/**
 * @class BandwidthModule
 * @extends HttpModule
 * @param {string} loadingType The loading type, `upload` or `download`.
 * @param {BandwidthModule~settingsObject} [settings={}] A set of custom settings.
 */
export default class BandwidthModule extends HttpModule {

    /**
     *
     * @private
     * @member {string} BandwidthModule#_loadingType
     */
    @enumerable(false)
    _loadingType = undefined;

    /**
     *
     * @private
     * @member {boolean} BandwidthModule#_intendedEnd
     */
    @enumerable(false)
    _intendedEnd = false;

    /**
     *
     * @private
     * @member {boolean} BandwidthModule#_isRestarting
     */
    @enumerable(false)
    _isRestarting = false;

    /**
     * Tracks the value of the `loaded` property for each progress event.
     * @private
     * @member {?number} BandwidthModule#_lastLoadedValue
     */
    @enumerable(false)
    _lastLoadedValue = null;

    /**
     * The recorded measures of speed.
     * @private
     * @member {number[]} BandwidthModule#_speedRecords
     */
    @enumerable(false)
    _speedRecords = [];

    /**
     * The average speed.
     * @private
     * @member {number} BandwidthModule#_avgSpeed
     */
    @enumerable(false)
    _avgSpeed = undefined;

    /**
     * The ID of the current request.
     * @private
     * @member {number} BandwidthModule#_requestID
     */
    @enumerable(false)
    _requestID = 0;

    /**
     * The ID of the current progress event.
     * @private
     * @member {number} BandwidthModule#_progressID
     */
    @enumerable(false)
    _progressID = 0;

    /**
     * Defines if measures have started.
     * @private
     * @member {boolean} BandwidthModule#_started
     */
    @enumerable(false)
    _started = false;

    /**
     * Defines if the current progress event is the first one triggered for the current request.
     * @private
     * @member {boolean} BandwidthModule#_firstProgress
     */
    @enumerable(false)
    _firstProgress = true;

    /**
     * @private
     * @member {Defer} BandwidthModule#_deferredProgress
     */
    @enumerable(false)
    _deferredProgress = undefined;

    /**
     * Unique labels for each request, exclusively used to make measures.
     * @private
     * @member {Object} BandwidthModule#_timingLabels
     * @property {?string} start
     * @property {?string} progress
     * @property {?string} end
     * @property {?string} measure
     */
    @enumerable(false)
    _timingLabels = {
        start: null,
        progress: null,
        end: null,
        measure: null
    };

    constructor(loadingType, settings = {}) {
        loadingType = (~['upload', 'download'].indexOf(loadingType)) ? loadingType : 'download';

        super(loadingType);

        this._extendDefaultSettings({
            data: {
                // 2 MB for upload, 10 MB for download
                size: loadingType == 'upload' ? (2 * 1024 * 1024) : (10 * 1024 * 1024),
                multiplier: 2
            }
        }).settings(settings);

        this._loadingType = loadingType;

        // Bind to XHR events
        this.on('xhr-upload-loadstart', () => Timing.mark(this._timingLabels.start));
        this.on('xhr-readystatechange', xhr => {
            if (!this._started && xhr.readyState == XMLHttpRequest.LOADING) {
                Timing.mark(this._timingLabels.start);
                this._started = true;
            }
        });

        var eventsPrefix = (loadingType == 'upload') ? 'xhr-upload' : 'xhr';

        this.on(`${eventsPrefix}-progress`, (xhr, event) => this._progress(event));
        this.on(`${eventsPrefix}-timeout`, () => this._timeout());
        this.on(`${eventsPrefix}-loadend`, () => this._end());
    }

    /**
     * Start requesting the server to make measures.
     * @public
     * @method BandwidthModule#start
     * @returns {BandwidthModule}
     */
    start() {
        var loadingType = this._loadingType,
            dataSettings = this.settings().data,
            reqID = this._requestID++;

        this._intendedEnd = false;
        this._lastLoadedValue = null;
        this._speedRecords = [];
        this._started = false;
        this._firstProgress = true;
        this._deferredProgress = defer();

        // Trigger the start event
        if (!this._isRestarting) {
            this.trigger('start', dataSettings.size);
        }

        // Create unique timing labels for the new request
        var labels = this._timingLabels;
        labels.start = `${loadingType}-${reqID}-start`;
        labels.progress = `${loadingType}-${reqID}-progress`;
        labels.end = `${loadingType}-${reqID}-end`;
        labels.measure = `${loadingType}-${reqID}-measure`;

        // Generate some random data to upload to the server. Here we're using a Blob instead of an ArrayBuffer because
        // of a bug in Chrome (tested in v33.0.1750.146), causing a freeze of the page while trying to directly upload
        // an ArrayBuffer (through an ArrayBufferView). The freeze lasts nearly 4.5s for 10MB of data. Using a Blob
        // seems to solve the problem.
        var blob = (loadingType == 'upload') ? new Blob([new ArrayBuffer(dataSettings.size)]) : null;

        var type = (loadingType == 'download') ? 'GET' : 'POST';

        // Initiate and send a new request
        this._newRequest(type, {
            size: dataSettings.size
        })._sendRequest(blob);

        return this;
    }

    /**
     * Abort the measures.
     * @public
     * @method BandwidthModule#abort
     * @returns {BandwidthModule}
     */
    abort() {
        this._intendedEnd = true;
        return this._abort();
    }

    /**
     * Make bandwidth measures for the current request.
     * @private
     * @method BandwidthModule#_progress
     * @param {ProgressEvent} event The event associated with the progress event of the current request.
     * @returns {BandwidthModule}
     */
    _progress(event) {
        // Ignore the first progress event, it generally contributes to get incoherent values.
        if (this._firstProgress) return this._firstProgress = false;

        // Execute the previous progress trigger
        this._deferredProgress.run();

        var labels = this._timingLabels,
            progressID = this._progressID++,
            markLabel = `${labels.progress}-${progressID}`,
            loaded = event.loaded;

        Timing.mark(markLabel);

        // Measure the average speed (B/s) since the request started
        var avgMeasure = Timing.measure(
                `${labels.measure}-avg-${progressID}`,
                labels.start,
                markLabel
            ),
            avgSpeed = loaded / avgMeasure * 1000;

        var instantSpeed;

        if (this._lastLoadedValue === null) { // We are executing the first progress event of the current request
            instantSpeed = avgSpeed; // The instant speed of the first progress event is equal to the average one
        } else {
            // Measure the instant speed (B/s), which defines the speed between two progress events.
            var instantMeasure = Timing.measure(
                `${labels.measure}-instant-${progressID}`,
                // Set the mark of the previous progress event as the starting point
                `${labels.progress}-${progressID - 1}`,
                markLabel
            );
            instantSpeed = (loaded - this._lastLoadedValue) / instantMeasure * 1000;
        }

        // Save the `loaded` property of the event for the next progress event
        this._lastLoadedValue = loaded;

        // Defer measures saving and event triggering, this allows to cancel the last progress event, which can generate
        // incoherent values.
        this._deferredProgress = defer(() => {
            this._avgSpeed = avgSpeed;
            this._speedRecords.push(instantSpeed);

            this.trigger('progress', avgSpeed, instantSpeed);
        });

        return this;
    }

    /**
     * Mark the current request as entirely finished (this means it ended after a time out).
     * @private
     * @method BandwidthModule#_timeout
     * @returns {BandwidthModule}
     */
    _timeout() {
        this._intendedEnd = true;
        return this;
    }

    /**
     * End the measures.
     * @private
     * @method BandwidthModule#_end
     * @returns {BandwidthModule}
     */
    _end() {
        // A timeout or an abort occured, bypass the further requests and trigger the "end" event.
        if (this._intendedEnd) {
            this._isRestarting = false;
            this.trigger('end', this._avgSpeed, this._speedRecords);
        }

        // The request ended to early, restart it with an increased data size.
        else {
            var dataSettings = this.settings().data,
                size = dataSettings.size * dataSettings.multiplier;

            this.settings({data: {size}});
            this.trigger('restart', size);

            this._isRestarting = true;
            this.start();
        }

        return this;
    }


}
