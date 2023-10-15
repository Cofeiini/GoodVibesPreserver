export class Optional<T> {
    data: T | undefined = undefined;

    constructor(input: T) {
        this.assign(input);
    }

    assign = (other: any) => {
        if (other === null) {
            throw new Error(`Cannot assign null to Optional`);
        }

        if (other === undefined) {
            throw new Error(`Should not assign undefined to Optional. Use the reset member function instead`);
        }

        this.data = other;
    }

    has_value = () => {
        return (this.data !== null && this.data !== undefined);
    }

    value = () => {
        if (this.data !== null && this.data !== undefined) {
            return this.data;
        }

        throw new Error("Bad Optional access");
    }

    value_or = (default_value: T) => {
        if (this.data !== null && this.data !== undefined) {
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
        this.data = undefined;
    }
}
