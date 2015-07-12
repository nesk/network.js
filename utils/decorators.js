/**
 * @callback propertyDecorator
 * @param target
 * @param key
 * @param descriptor
 */

/**
 * Set the enumerability of a property.
 * @private
 * @function enumerable
 * @param {boolean} isEnumerable Whether the property should be enumerable or not.
 * @returns {propertyDecorator}
 */
export function enumerable(isEnumerable) {
    return function(target, key, descriptor) {
        descriptor.enumerable = isEnumerable;
        return descriptor;
    };
}
