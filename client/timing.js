'use strict';

var Timing = module.exports = function() {};

var staticScope = Timing;

staticScope._marks = {};
staticScope._measures = {};

// Does the browser support the following APIs?
staticScope._support = {
    performance: !!window.performance,
    userTiming: window.performance && performance.mark,
    resourceTiming: window.performance && (typeof(performance.getEntriesByType) == "function") && performance.timing
};

staticScope.mark = function(label) {
    var support = this._support,
        marks = this._marks;

    if (support.userTiming) {
        performance.mark(label);
    } else if (support.performance) {
        marks[label] = performance.now();
    } else {
        marks[label] = (new Date).getTime();
    }

    return this;
};

staticScope.measure = function(measureLabel, markLabelA, markLabelB) {
    var support = this._support,
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
};

staticScope.supportsResourceTiming = function() {
    return this._support.resourceTiming;
};
