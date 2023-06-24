export function retry<T>(fn: (...args: any) => Promise<T>, attempts = 3, delay = 2000) {
    return new Promise<T>((resolve, reject) => {
        fn().then(resolve).catch((err: any) => {
            if (attempts <= 1) {
                reject(err);
            } else {
                setTimeout(() => {
                    retry(fn, attempts - 1, delay).then(resolve).catch(reject);
                }, delay);
            }
        });
    });
}
