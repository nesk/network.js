import isPlainObject from 'lodash.isplainobject';

/**
 * Return the global object.
 * @private
 * @function getGlobalObject
 * @return {Object}
 * @see https://gist.github.com/rauschma/1bff02da66472f555c75
 */
export function getGlobalObject() {
    // Workers don’t have `window`, only `self`.
    if (typeof self !== 'undefined') {
        return self;
    }

    if (typeof global !== 'undefined') {
        return global;
    }

    // Not all environments allow `eval` and `Function`, use only as a last resort.
    return new Function('return this')();
}

/**
 * Make a deep copy of any value.
 * @private
 * @function copy
 * @param {*} value The value to copy.
 * @returns {*} The copied value.
 */
export function copy(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Get a copy of an object without some of its properties.
 * @private
 * @function except
 * @param {Object} obj The original object.
 * @param {string[]} properties The properties to exclude from the copied object.
 * @returns {Object} The copied object without the specified properties.
 */
export function except(obj, properties) {
    const objCopy = Object.assign({}, obj);
    properties.forEach(index => delete objCopy[index]);
    return objCopy;
}

/**
 * Defer the execution of a function.
 * @private
 * @function defer
 * @param {Function} func The function to defer.
 * @returns {Defer} The Defer object used to execute the function when needed.
 */
export function defer(func = () => {}) {
    /**
     * @private
     * @class Defer
     */
    return new class {
        constructor() {
            this.func = func;
        }

        /**
         * Execute the deferred function.
         * @public
         * @method Defer#run
         */
        run() {
            if (this.func) this.func();
            delete this.func;
        }
    };
}
