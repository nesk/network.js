import {enumerable} from '../utils/decorators';

/**
 * A callback used as an event handler.
 * @public
 * @callback EventDispatcher~eventHandler
 * @param {...*} args The extra parameters provided to the `trigger` method.
 * @returns {?boolean} If `false` is explicitly returned, the `trigger` method will return `false`.
 */

/**
 * @class EventDispatcher
 */
export default class EventDispatcher {

    /**
     * All the registered event callbacks, organized by events.
     * @private
     * @member {Object} EventDispatcher#_eventCallbacks
     */
    @enumerable(false)
    _eventCallbacks = {};

    /**
     * Attach a callback to one or more events.
     * @public
     * @method EventDispatcher#on
     * @param {string|string[]} events One or multiple event names.
     * @param {EventDispatcher~eventHandler} callback An event handler.
     * @returns {EventDispatcher}
     */
    on(events, callback) {
        events = Array.isArray(events) ? events : [events];

        events.forEach(event => {
            var eventCallbacks = this._eventCallbacks[event] = this._eventCallbacks[event] || [];

            // If the callback isn't already registered, store it.
            if (!~eventCallbacks.indexOf(callback)) {
                eventCallbacks.push(callback);
            }
        });

        return this;
    }

    /**
     * Detach a callback from one or more events.
     * @public
     * @method EventDispatcher#off
     * @param {string|string[]} events One or multiple event names.
     * @param {EventDispatcher~eventHandler} [callback=null] An event handler.
     * @returns {EventDispatcher}
     */
    off(events, callback = null) {
        events = Array.isArray(events) ? events : [events];

        events.forEach(event => {
            var eventCallbacks = this._eventCallbacks[event];

            // If there is no specified callback, simply delete all the callbacks binded to the provided event.
            if (!callback && eventCallbacks) {
                delete this._eventCallbacks[event];
            } else {
                var callbackIndex = eventCallbacks ? eventCallbacks.indexOf(callback) : -1;

                // If the callback is registered, remove it from the array.
                if (callbackIndex != -1) {
                    eventCallbacks.splice(callbackIndex, 1);
                }
            }
        });

        return this;
    }

    /**
     * Trigger an event.
     * @public
     * @method EventDispatcher#trigger
     * @param {string} event An event name.
     * @param {...*} extraParameters Some extra parameters to pass to the event handlers.
     * @returns {boolean} Returns `false` if one of the event handlers explicitly returned `false`.
     */
    trigger(event, ...extraParameters) {
        var eventCallbacks = this._eventCallbacks[event] || [];

        // A callback can return a boolean value which will be logically compared to the other callbacks values before
        // being returned by the trigger() method. This allows a callback to send a "signal" to the caller, like
        // cancelling an action.
        var returnValue = true;

        eventCallbacks.forEach(eventCallback => {
            // A callback must explicitly return false if it wants the trigger() method to return false, undefined will
            // not work. This avoids crappy callbacks to mess up with the triggering system.
            var value = eventCallback(...extraParameters);
            value = value !== false ? true : false;

            returnValue = returnValue && value; // Compare the result of the callback to the actual return value
        });

        return returnValue;
    }

}
