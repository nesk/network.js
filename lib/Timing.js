import {getGlobalObject} from '../utils/helpers';
import {enumerable} from '../utils/decorators';
import isFunction from 'lodash.isfunction';

/**
 * @private
 * @class Timing
 */
class Timing {

    /**
     * Defines if the current browser supports the Resource Timing API.
     * @public
     * @readonly
     * @member {boolean} Timing#supportsResourceTiming
     */
    get supportsResourceTiming() {
        return Boolean(this._support.resourceTiming);
    }

    /**
     * Defines if the current browser supports some specific Timing APIs.
     * @private
     * @member {Object} Timing#_support
     * @property {boolean} performance `true` if the Performance API is available.
     * @property {boolean} userTiming `true` if the User Timing API is available.
     * @property {boolean} resourceTiming `true` if the Resource Timing API is available.
     */
    @enumerable(false)
    _support = {};

    /**
     * All the marks created by the `mark` method.
     * @private
     * @member {Object} Timing#_marks
     */
    @enumerable(false)
    _marks = {};

    /**
     * All the measures created by the `measure` method.
     * @private
     * @member {Object} Timing#_measures
     */
    @enumerable(false)
    _measures = {};

    constructor() {
        const global = getGlobalObject();

        this._support = {
            performance: !!global.performance,
            userTiming: global.performance && performance.mark,
            resourceTiming: global.performance
                            && (isFunction(performance.getEntriesByType))
                            && performance.timing
        };
    }

    /**
     * Create a new timing mark.
     * @public
     * @method Timing#mark
     * @param {string} label A label associated to the mark.
     * @returns {Timing}
     */
    mark(label) {
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
    measure(measureLabel, markLabelA, markLabelB) {
        const support = this._support,
              marks = this._marks,
              measures = this._measures;

        if (measures[measureLabel] === undefined) {
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

}

export default new Timing();
