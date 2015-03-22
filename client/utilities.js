'use strict';

function extend(destination, source) {
    // Deep clone the objects to avoid any module to modify options of another module.
    // See: http://stackoverflow.com/a/5344074/1513045
    destination = JSON.parse(JSON.stringify(destination || {}));
    source = JSON.parse(JSON.stringify(source || {}));

    // Apply source values on the destination object.
    Object.keys(source).forEach(function(key) {
        destination[key] = source[key];
    });

    return destination;
}

exports.extend = extend;
