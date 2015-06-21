export function isObject(obj)
{
    return obj != undefined && obj != null && typeof obj.valueOf() == 'object';
}

export function copy(value)
{
    return JSON.parse(JSON.stringify(value));
}

function _assign(strict = false, target = {}, ...sources)
{
    sources.forEach(source => {
        Object.keys(source).forEach(key => {
            if (!strict || target.hasOwnProperty(key)) {
                let value = source[key];
                target[key] = isObject(value) ? assign(target[key], value) : value;
            }
        })
    });

    return target;
}

export function assign(target = {}, ...sources)
{
    return _assign(false, target, ...sources);
}

export function assignStrict(target = {}, ...sources)
{
    return _assign(true, target, ...sources);
}

export function except(obj, indexes)
{
    let objCopy = copy(obj);

    indexes.forEach(index => delete objCopy[index]);

    return objCopy;
}

export function defer(cb = () => {})
{
    return new class {
        constructor()
        {
            this.cb = cb;
        }

        run()
        {
            if (this.cb) this.cb();
            delete this.cb;
        }
    };
}
