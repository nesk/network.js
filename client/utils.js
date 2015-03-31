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
