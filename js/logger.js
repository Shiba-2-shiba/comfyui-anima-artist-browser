const PREFIX = "[AnimaArtistBrowser]";

function log(level, message, details) {
    const text = `${PREFIX} ${message}`;
    if (details === undefined) {
        console[level](text);
        return;
    }
    console[level](text, details);
}

export function logInfo(message, details) {
    log("info", message, details);
}

export function logWarn(message, details) {
    log("warn", message, details);
}

export function logError(message, details) {
    log("error", message, details);
}
