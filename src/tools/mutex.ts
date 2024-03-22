/**
 * Promise based Mutex class for handling asynchronous access to shared resources.
 */
export class Mutex {
    private locking = Promise.resolve();

    /**
     * Tries to acquire the lock, otherwise wait for the lock to be released.
     * @returns Callback for releasing the current lock.
     */
    lock = () => {
        let unlockNext: () => void;
        const willLock = new Promise<void>(resolve => {
            unlockNext = () => {
                resolve();
            };
        });

        const willUnlock = this.locking.then(() => unlockNext);
        this.locking = this.locking.then(() => willLock);

        return willUnlock;
    };
}
