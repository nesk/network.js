function checkApiIntegrity(object, api, path) {
    if (Array.isArray(api)) {
        if (!window[api[0]] || !(object instanceof window[api[0]])) {
            throw new Error(path + ' should be an instance of ' + api[0]);
        }

        checkApiIntegrity(object, api[1], path);
    }

    else if (api.toString() == '[object Object]') {
        Object.keys(api).forEach(function(key) {
            checkApiIntegrity(object[key], api[key], path + '.' + key);
        });
    }

    else {
        if (typeof object !== api) {
            throw new Error(path + ' should be of type "' + api + '"');
        }
    }
}
