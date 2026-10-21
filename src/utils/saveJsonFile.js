// A browser may read the file after click() returns (Safari first asks whether to download it),
// so the link to it is kept for a minute rather than revoked at once.
const KEEP_FILE_MS = 60 * 1000;

/** Offers data as a JSON file to save: the browser's download of fileName. */
export const saveJsonFile = (fileName, data) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), KEEP_FILE_MS);
};
