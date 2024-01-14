export const encryptData = (data: string, key: CryptoKey): Promise<ArrayBuffer> => {
    const encodedData: Uint8Array = new TextEncoder().encode(data);
    return crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encodedData);
};

export const stringToArrayBuffer = (str: string): ArrayBuffer => {
    return Uint8Array.from(str.split("").map(char => char.charCodeAt(0)));
};

export const clearPEMFormat = (pkPEM: string): string => {
    const removedPEM = /^-----BEGIN PUBLIC KEY-----\n(.*)\n-----END PUBLIC KEY-----/.exec(pkPEM);
    return removedPEM!.at(1)!;
};
