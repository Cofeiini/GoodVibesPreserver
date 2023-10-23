/**
 * Optional wrapper class ported from C++ for handling possibly `null` values.
 */
export class Optional<T> {
    private data: Exclude<T, undefined> | null = null;

    /**
     * Constructs a new {@link Optional} object.
     *
     * @param input - The given value that might be `null`
     */
    constructor(input: Exclude<T, undefined> | null) {
        this.assign(input);
    }

    /**
     * Assigns `other` to the current object.
     *
     * @remarks
     * Gives a warning when assigning `null` and recommends to use the {@link reset} function instead.
     *
     * @throws
     * Throws an assignment error if `other` is `undefined`.
     *
     * @param other - The value to be assigned
     */
    assign = (other: Exclude<T, undefined> | null) => {
        if (other === undefined) {
            throw new Error("Cannot assign undefined to Optional");
        }

        if (other === null) {
            console.warn("Should not assign null to Optional. Use the reset member function instead");
        }

        this.data = other;
    }

    /**
     * Tests if the contained value is valid.
     *
     * @returns A boolean representing the validity of the value
     */
    has_value = (): Boolean => {
        return (this.data !== null && this.data !== undefined);
    }

    /**
     * Returns the contained value.
     *
     * @throws
     * Throws an access error if the contained value is `null`.
     *
     * @returns The contained value with a high confidence that it is not `null`
     */
    value = (): Exclude<T, undefined> => {
        if (this.data !== null) {
            return this.data;
        }

        throw new Error("Bad Optional access");
    }

    /**
     * Returns the contained value or the given default.
     *
     * @param default_value - The default value to be used when the contained value is `null`
     * @returns The contained value if it is not `null`, otherwise the `default_value`
     */
    value_or = (default_value: T): T => {
        if (this.data !== null) {
            return this.data;
        }

        return default_value;
    }

    /**
     * Returns the contained value after casting it to the given type.
     *
     * @throws
     * Throws an access error if the contained value is `null`.
     *
     * @returns The contained value after casting to given type
     */
    value_as = <U>(): Exclude<U, undefined> => {
        if (this.data !== null) {
            return this.data as Exclude<U, undefined>;
        }

        throw new Error("Bad Optional cast and access");
    }

    /**
     * Swaps the contained value with `other`.
     *
     * @param other - The {@link Optional} object to swap the contents with
     */
    swap = (other: Optional<T>) => {
        const temp = this.data;
        this.data = other.data;
        other.data = temp;
    }

    /**
     * If the object contains a value, destroy that value. Otherwise, there are no effects.
     */
    reset = () => {
        this.data = null;
    }
}
