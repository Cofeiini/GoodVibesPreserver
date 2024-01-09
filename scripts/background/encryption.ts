export const encryptData = (data: string, key: CryptoKey): Promise<ArrayBuffer> => {
    const encodedData: Uint8Array = new TextEncoder().encode(data);
    return crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encodedData);
};

export const stringToArrayBuffer = (str: string): ArrayBuffer => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

export const clearPEMFormat = (pkPEM: string): string => {
    const removedPEM = /^-----BEGIN PUBLIC KEY-----\n(.*)\n-----END PUBLIC KEY-----/.exec(pkPEM);
    return removedPEM!.at(1)!;
};
