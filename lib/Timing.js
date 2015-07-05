import {getGlobalObject} from '../utils/helpers';

/**
 * @private
 * @class Timing
 */
class Timing {

    constructor()
    {
        const global = getGlobalObject();

        /**
         * Defines if the current browser supports some specific Timing APIs.
         * @private
         * @member {Object} _support
         * @property {boolean} performance `true` if the Performance API is available.
         * @property {boolean} userTiming `true` if the User Timing API is available.
         * @property {boolean} resourceTiming `true` if the Resource Timing API is available.
         */
        this._support = {
            performance: !!global.performance,
            userTiming: global.performance && performance.mark,
            resourceTiming: global.performance
                            && (typeof performance.getEntriesByType == "function")
                            && performance.timing
        };

        /**
         * Contains all the marks created by the `mark` method.
         * @private
         * @member {Object} _marks
         */
        this._marks = {};

        /**
         * Contains all the measures created by the `measure` method.
         * @private
         * @member {Object} _measures
         */
        this._measures = {};
    }

    /**
     * Create a new timing mark.
     * @public
     * @method Timing#mark
     * @param {string} label A label associated to the mark.
     * @returns {Timing}
     */
    mark(label)
    {
        const support = this._support,
              marks = this._marks;

        if (support.userTiming) {
            performance.mark(label);
        }

        if (support.performance) {
            marks[label] = performance.now();
        } else {
            marks[label] = (new Date).getTime();
        }

        return this;
    }

    /**
     * Measure the delay between two marks.
     * @public
     * @method Timing#measure
     * @param {string} measureLabel A label associated to the measure.
     * @param {string} markLabelA The label of the first mark.
     * @param {string} markLabelB The label of the second mark.
     * @returns {number} The measured value.
     */
    measure(measureLabel, markLabelA, markLabelB)
    {
        const support = this._support,
              marks = this._marks,
              measures = this._measures;

        if (typeof measures[measureLabel] == 'undefined') {
            const measureWithoutUserTiming = marks[markLabelB] - marks[markLabelA];

            if (support.userTiming) {
                performance.measure(measureLabel, markLabelA, markLabelB);
                const entriesByName = performance.getEntriesByName(measureLabel);

                // The performance API could return no corresponding entries in Firefox so we must use a fallback.
                // See: https://github.com/nesk/network.js/issues/32#issuecomment-118434305
                measures[measureLabel] = entriesByName.length ? entriesByName[0].duration : measureWithoutUserTiming;
            } else {
                measures[measureLabel] = measureWithoutUserTiming;
            }
        }

        return measures[measureLabel];
    }

    /**
     * Determine if the current browser supports the Resource Timing API.
     * @public
     * @method Timing#supportsResourceTiming
     * @returns {boolean} `true` if the Resource Timing API is supported, otherwise `false`.
     */
    supportsResourceTiming()
    {
        return this._support.resourceTiming;
    }

}

export default new Timing();
