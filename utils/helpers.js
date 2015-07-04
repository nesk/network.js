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
 * Determine if the provided value is an object.
 * @private
 * @function isObject
 * @param {*} obj The value to check.
 * @returns {boolean} `true` if the value is an object, otherwise `false`.
 */
export function isObject(obj)
{
    return obj != undefined && obj != null && typeof obj.valueOf() == 'object';
}

/**
 * Make a deep copy of any value.
 * @private
 * @function copy
 * @param {*} value The value to copy.
 * @returns {*} The copied value.
 */
export function copy(value)
{
    return JSON.parse(JSON.stringify(value));
}

/**
 * Copy the properties in the source objects over to the destination object.
 * @private
 * @function _assign
 * @param {boolean} strict Given `true`, new properties will not be copied.
 * @param {Object} [target={}] The destination object.
 * @param {...Object} sources The source objects.
 * @returns {Object} The destination object once the properties are copied.
 */
function _assign(strict, target = {}, ...sources)
{
    target = copy(target);

    sources.forEach(source => {
        Object.keys(source).forEach(key => {
            if (!strict || target.hasOwnProperty(key)) {
                let value = source[key];
                target[key] = isObject(value) ? _assign(strict, target[key], value) : value;
            }
        })
    });

    return target;
}

/**
 * Copy all the properties in the source objects over to the destination object.
 * @private
 * @function assign
 * @param {Object} [target={}] The destination object.
 * @param {...Object} sources The source objects.
 * @returns {Object} The destination object once the properties are copied.
 */
export function assign(target = {}, ...sources)
{
    return _assign(false, target, ...sources);
}

/**
 * Copy the properties (but no new ones) in the source objects over to the destination object.
 * @private
 * @function assignStrict
 * @param {Object} [target={}] The destination object.
 * @param {...Object} sources The source objects.
 * @returns {Object} The destination object once the properties are copied.
 */
export function assignStrict(target = {}, ...sources)
{
    return _assign(true, target, ...sources);
}

/**
 * Get a copy of an object without some of its properties.
 * @private
 * @function except
 * @param {Object} obj The original object.
 * @param {string[]} properties The properties to exclude from the copied object.
 * @returns {Object} The copied object without the specified properties.
 */
export function except(obj, properties)
{
    let objCopy = copy(obj);

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
export function defer(func = () => {})
{
    /**
     * @private
     * @class Defer
     */
    return new class {
        constructor()
        {
            this.func = func;
        }

        /**
         * Execute the deferred function.
         * @public
         * @method Defer#run
         */
        run()
        {
            if (this.func) this.func();
            delete this.func;
        }
    };
}
