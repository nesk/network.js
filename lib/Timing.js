import {getGlobalObject} from '../utils/helpers';

/**
 * @private
 * @class Timing
 */
class Timing {

    constructor()
    {
        let global = getGlobalObject();

        this._marks = {};
        this._measures = {};

        // Does the browser support the following APIs?
        this._support = {
            performance: !!global.performance,
            userTiming: global.performance && performance.mark,
            resourceTiming: global.performance
                            && (typeof performance.getEntriesByType == "function")
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
    mark(label)
    {
        let support = this._support,
            marks = this._marks;

        if (support.userTiming) {
            performance.mark(label);
        } else if (support.performance) {
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
        let support = this._support,
            marks = this._marks,
            measures = this._measures;

        if (typeof measures[measureLabel] == 'undefined') {
            if (support.userTiming) {
                performance.measure(measureLabel, markLabelA, markLabelB);
                measures[measureLabel] = performance.getEntriesByName(measureLabel)[0].duration;
            } else {
                measures[measureLabel] = marks[markLabelB] - marks[markLabelA];
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
