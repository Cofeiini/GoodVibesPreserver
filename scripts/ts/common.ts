export class Optional<T> {
    private data: Exclude<T, undefined> | null = null;

    constructor(input: Exclude<T, undefined> | null) {
        this.assign(input);
    }

    assign = (other: Exclude<T, undefined> | null) => {
        if (other === undefined) {
            throw new Error("Cannot assign undefined to Optional");
        }

        if (other === null) {
            console.warn("Should not assign null to Optional. Use the reset member function instead");
        }

        this.data = other;
    }

    has_value = (): Boolean => {
        return (this.data !== null && this.data !== undefined);
    }

    value = (): Exclude<T, undefined> => {
        if (this.data !== null) {
            return this.data;
        }

        throw new Error("Bad Optional access");
    }

    value_or = (default_value: T): T => {
        if (this.data !== null) {
            return this.data;
        }

        return default_value;
    }

    swap = (other: Optional<T>) => {
        const temp = this.data;
        this.data = other.data;
        other.data = temp;
    }

    reset = () => {
        this.data = null;
    }
}
