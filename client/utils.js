export function isObject(obj)
{
    return obj != undefined && obj != null && typeof obj.valueOf() == 'object';
}

export function assign(target = {}, ...sources)
{
    sources.forEach(source => {
        Object.keys(source).forEach(key => {
            let value = source[key];
            target[key] = isObject(value) ? assign(target[key], value) : value;
        })
    });

    return target;
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
    }
}
