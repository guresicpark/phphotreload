// Kindly provided by guresicpark.com

// importing libraries
var log = console.log.bind(console); // logger

var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    yaml = require('js-yaml'),
    includes = require('array-includes'),
    io = require('socket.io')(1337),
    chokidar = require('chokidar-graceful-cross-platform'),
    request = require('request'),
    wildstring = require('wildstring'),
    debounce = require('throttle-debounce/debounce');

// global vars
var glaWatcher = [],
    glsLocalPathRootLast,
    gliTabIdLast = [],
    gloEventEmitter = void 0,
    gloConfig = {};

// functions

/**
 * Checks if an array has a specific value
 * @param arr array haystack
 * @param obj object needle
 * @return boolean
 */
function inArray(arr, obj) {
    return (arr.indexOf(obj) != -1);
}

/**
 * Compares two arrays
 * @param paA first array
 * @param paB second array
 * @return boolean
 */
function arraysEqual(paA, paB) {
    if (paA.length !== paB.length) {
        return false;
    }
    for (var i = 0, len = paA.length; i < len; i++) {
        if (paA[i] !== paB[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Checks if a string starts with a specific string
 * @return boolean
 */
String.prototype.startsWith = function (str) {
    return this.substring(0, str.length) === str;
}

/**
 * Checks if a string ends with a specific string
 * @return boolean
 */
String.prototype.endsWith = function (str) {
    return this.substring(this.length - str.length, this.length) === str;
}

/**
 * Extracts the domain of a URL
 */
String.prototype.getDomain = function () {
    return this.replace(/^https?:\/\//, "").replace(/^www\./, "").split('/')[0];
};

/**
 * Extracts host from URL
 */
String.prototype.getHost = function () {
    return this.replace(/^(.*\/\/[^\/?#]*).*$/, "$1");
};

/**
 * Unifies slashes and removes trailing slash
 */
String.prototype.normalizePath = function () {
    return this.split('\\').join('/').replace(/\/(\*+)?\s*$/, '');
};

/**
 * Add prefix to the current path
 * @param psPrefix prefix to add
 */
String.prototype.setPathPrefix = function (psPrefix) {
    if (typeof psPrefix === 'undefined' || !psPrefix) {
        return this;
    }
    psPrefix = psPrefix.toString().trim().replace(/^\/+|\/+$/g, '');
    sCurrentPath = this.trim().replace(/^\/+|\/+$/g, '');
    return psPrefix + "/" + sCurrentPath;
};

/**
 * Get configuration entry by domain
 * @param psDomain the domain
 * @return object configuration entry
 */
var getConfigurationByDomain = function (psDomain) {
    if (typeof psDomain === 'undefined' || !psDomain) {
        return false;
    }
    for (var deltaConfig in gloConfig) {
        var oElement = gloConfig[deltaConfig];
        if (typeof oElement.domains === 'undefined' || !oElement.domains.length) {
            continue;
        }
        var aDomains = oElement.domains;
        if (includes(aDomains, psDomain)) {
            oElement['localpath'] = deltaConfig.normalizePath();
            return oElement;
        }
    }
    return false;
};

/**
 * Get configuration entry by local file
 * @param psLocalFile the domain
 * @return object configuration entry
 */
var getConfigurationByLocalFile = function (psLocalFile) {
    if (typeof psLocalFile === 'undefined' || !psLocalFile) {
        return false;
    }
    for (var deltaConfig in gloConfig) {
        var sPathFromConfig = deltaConfig.normalizePath();
        if (wildstring.match(sPathFromConfig + "*", psLocalFile)) {
            var oElement = gloConfig[deltaConfig];
            oElement['localpath'] = sPathFromConfig;
            return oElement;
        }
    }
    return false;
};

/**
 * Display current time
 * @return String current time in human readable form
 */
const displayTime = function () {
    var sRet = '';

    var currentTime = new Date(),
        iHours = currentTime.getHours(),
        iMinutes = currentTime.getMinutes(),
        iSeconds = currentTime.getSeconds();

    if (iMinutes < 10) {
        iMinutes = '0' + iMinutes;
    }
    if (iSeconds < 10) {
        iSeconds = '0' + iSeconds;
    }
    sRet += iHours + ':' + iMinutes + ':' + iSeconds;
    return sRet;
};

/**
 * Start phphotreload server
 */
const startServer = function () {

    const sConfigPath = "config";

    /**
     * Initialize file watcher
     * @param paLocalPaths what pathes to watch
     * @param paIgnorePaths what pathes to ignore
     */
    const initWatcher = function (paLocalPaths, paIgnorePaths) {
        // default values
        if (typeof paLocalPaths === 'undefined' || !paLocalPaths.length) {
            return;
        }
        paIgnorePaths = typeof paIgnorePaths !== 'undefined' && paIgnorePaths.length ? paIgnorePaths : [/[\/\\]\./];

        // pathes to watch
        if (typeof glaWatcher !== 'undefined' && glaWatcher.length) {
            for (var i = 0; i < glaWatcher.length; i++) {
                glaWatcher[i].unwatch();
                glaWatcher[i].close();
                glaWatcher[i] = void 0;
            }
        }

        glaWatcher = [];
        for (var i = 0; i < paLocalPaths.length; i++) {
            glaWatcher.push(
                chokidar.watch(paLocalPaths[i], {
                    ignored: paIgnorePaths,
                    persistent: true,
                    ignorePermissionErrors: false,
                    depth: 30,
                    usePolling: false,
                    atomic: true
                })
            );
        }
    }

    /**
     * Clear files in a tmp directory
     * @param psPath Temp directory
     */
    clearTemp = function (psPath) {
        if (typeof psPath === 'undefined' || !psPath) {
            return false;
        }

        psPath = psPath.replace(/\/$/, '');

        try {
            var files = fs.readdirSync(psPath);
        } catch (e) {
            return false;
        }
        for (var i = 0; i < files.length; i++) {
            var sFilePathFull = psPath + '/' + files[i];
            if (fs.statSync(sFilePathFull).isFile()) {
                try {
                    fs.unlinkSync(sFilePathFull);
                } catch (error) {
                    return false;
                }
            }
        }
        log('[%s phphotreload server] %s', displayTime(), "Local cache files in " + psPath + "/* successfully deleted!");
    };

    /**
     * Get a list of all configuration files
     */
    getConfigFiles = function () {
        aRet = [];

        try {
            var files = fs.readdirSync(sConfigPath);
        } catch (e) {
            return false;
        }

        for (var i = 0; i < files.length; i++) {
            var sFile = files[i];
            if (sFile == "config.yml.dist") {
                continue;
            }
            var sFilePathFull = sConfigPath + '/' + sFile;
            if (fs.statSync(sFilePathFull).isFile()) {
                aRet.push(sFilePathFull);
            }
        }

        // checks if array is empty
        if (aRet.length == 0) {
            return false;
        }

        return aRet;
    }

    /**
     * Load all configuration files
     * @param psFile what pathes to watch
     */
    loadConfig = function (psFile) {

        oRet = {};

        // default values
        if (typeof psFile !== 'undefined' || psFile) {
            var sFilePathFull = sConfigPath + '/' + psFile;
            oConfig = yaml.safeLoad(fs.readFileSync(sFilePathFull, 'utf8'));
            for (var deltaConfig in oConfig) {
                oRet[deltaConfig] = oConfig[deltaConfig];
            }
            // checks if object is empty
            if (Object.getOwnPropertyNames(oRet).length == 0) {
                return false;
            }
            return oRet;
        }

        try {
            var files = fs.readdirSync(sConfigPath);
        } catch (e) {
            return false;
        }

        for (var i = 0; i < files.length; i++) {
            var sFile = files[i];
            if (sFile == "config.yml.dist") {
                continue;
            }
            var sFilePathFull = sConfigPath + '/' + sFile;
            if (fs.statSync(sFilePathFull).isFile()) {
                try {
                    oConfig = yaml.safeLoad(fs.readFileSync(sFilePathFull, 'utf8'));
                    for (var deltaConfig in oConfig) {
                        oRet[deltaConfig] = oConfig[deltaConfig];
                    }
                } catch (error) { }
            }
        }

        // checks if object is empty
        if (Object.getOwnPropertyNames(oRet).length == 0) {
            return false;
        }
        return oRet;
    };

    /**
     * Reload browser tab
     * @param piTabIdLast tab id
     * @param piLatency latency in ms
     */
    const reloadTab = function (poSocket, piTabIdLast, piLatency) {
        if (typeof poSocket === 'undefined') {
            return;
        }
        if (typeof piTabIdLast === 'undefined' || !piTabIdLast) {
            return;
        }
        piLatency = typeof piLatency !== 'undefined' && piLatency ? piLatency : 0;
        setTimeout(function () {
            log('[%s phphotreload server] %s', displayTime(), "Reload request for TabId " + gliTabIdLast + " sent to Chrome!");
            poSocket.send(JSON.stringify({ iTabId: gliTabIdLast }));
        }, piLatency);
    }

    // get routing data from routing file
    try {
        // try to load some config files
        gloConfig = loadConfig();

        // is there no routing file exit server
        if (!gloConfig) {
            log('[%s phphotreload server] configuration file do not exist - please create a server configuration file under nodejs_server/config/your_config.yml!', displayTime());
            process.exit();
        }

        aConfigFiles = getConfigFiles();
        var aLocalPaths = [];
        aLocalPaths = aLocalPaths.concat(aConfigFiles);
        var aIgnorePaths = [/[\/\\]\./];

        // on connection with client
        if (io.server) {
            io.server.close();
        }

        if (typeof gloEventEmitter === 'undefined') {
            gloEventEmitter = new events.EventEmitter();
        }

        io.on('connection', function (poSocket) {

            if (typeof poSocket === 'undefined') {
                return;
            }

            // on connection
            initWatcher(aLocalPaths);

            // dispatch filewatcher events
            for (var i = 0; i < glaWatcher.length; i++) {
                glaWatcher[i].on('change', function (psChangedLocalFile, poStats) {
                    var sChangedLocalFile = psChangedLocalFile.normalizePath();
                    gloEventEmitter.emit('changed', sChangedLocalFile);
                });
            }

            log('[%s phphotreload server] %s', displayTime(), "Client is connected!");

            poSocket.on('message', debounce(300, function (pjsonData) {

                if (typeof pjsonData === 'undefined') {
                    return;
                }

                var oData = JSON.parse(pjsonData);
                var sUrl = oData.sUrl.normalizePath();

                // do not reload internal chrome tabs
                if (sUrl.startsWith("chrome")) {
                    return;
                }

                if (sUrl.startsWith("view-source")) {
                    return;
                }

                // extract domain
                var sDomain = sUrl.getDomain();
                var sHost = sUrl.getHost();

                // can not refresh when there is no config entry for this domain
                var oConfigEntry = getConfigurationByDomain(sDomain);
                if (!oConfigEntry) {
                    log('[%s phphotreload server] %s', displayTime(), "No config entry found for domain " + sDomain + "!");
                    return;
                }
                var sLocalPathRoot = oConfigEntry.localpath.normalizePath();

                // do not refresh for a ignored url
                if (typeof oConfigEntry.ignoreurls !== 'undefined' && oConfigEntry.ignoreurls.length) {
                    for (var i = 0; i < oConfigEntry.ignoreurls.length; i++) {
                        var sIgnoreUrl = oConfigEntry.ignoreurls[i];
                        sIgnoreUrl = sIgnoreUrl.setPathPrefix(sHost);
                        if (wildstring.match(sIgnoreUrl.normalizePath() + "*", sUrl)) {
                            log('[%s phphotreload server] %s', displayTime(), "Url " + oConfigEntry.ignoreurls[i] + " is ignored!");
                            return;
                        }
                    }
                }

                // can not refresh when there is no tabid
                if (typeof oData.iTabId === 'undefined' || !oData.iTabId) {
                    log('[%s phphotreload server] %s', displayTime(), "No tab id received from Chrome!");
                    return;
                }

                if (typeof oConfigEntry.extensions === 'undefined' || !oConfigEntry.extensions.length) {
                    log('[%s phphotreload server] %s', displayTime(), "No config entry defined for this domain!");
                    return;
                }

                gliTabIdLast = oData.iTabId;

                // latency time in ms, if not defined in config set to default of 100 ms
                var iLatency = typeof oConfigEntry.latency !== 'undefined' && oConfigEntry.latency ? oConfigEntry.latency : 100;

                // debounce time in ms, if not defined in config set to default of 200 ms
                var iDebounce = typeof oConfigEntry.debounce !== 'undefined' && oConfigEntry.debounce ? oConfigEntry.debounce : 200;

                log('[%s phphotreload server] %s', displayTime(), "Message from chrome: " + sDomain + ' ' + oData.sMessage);

                aLocalPaths = [];
                for (var i = 0; i < oConfigEntry.extensions.length; i++) {
                    var sLocalPathExtension = oConfigEntry.localpath.normalizePath() + '/**/*.' + oConfigEntry.extensions[i];
                    if (!includes(aLocalPaths, sLocalPathExtension)) {
                        aLocalPaths.push(sLocalPathExtension);
                    }
                }

                sIgnorepath = [];
                if (typeof oConfigEntry.ignorepaths !== 'undefined' && oConfigEntry.ignorepaths.length) {
                    for (var i = 0; i < oConfigEntry.ignorepaths.length; i++) {
                        var sIgnorepath = oConfigEntry.ignorepaths[i];
                        sIgnorepath = sIgnorepath.setPathPrefix(sLocalPathRoot);
                        aIgnorePaths.push(sIgnorepath);
                    }
                }

                if (sLocalPathRoot == glsLocalPathRootLast) {
                    // don't re-init new filewatcher of wathced local files haven't changed
                    return;
                }

                // re-init
                glsLocalPathRootLast = sLocalPathRoot;

                log('[%s phphotreload server] %s', displayTime(), "Latency time set to " + iLatency + "ms!");

                log('[%s phphotreload server] %s', displayTime(), "Debounce time set to " + iDebounce + "ms!");

                log('[%s phphotreload server] %s', displayTime(), "Starting initialization of all file watchers...");

                initWatcher(aLocalPaths, aIgnorePaths);

                // dispatch filewatcher events
                var iCounterWatcherInit = 0;
                for (var i = 0; i < glaWatcher.length; i++) {
                    glaWatcher[i].on('ready', function () {
                        iCounterWatcherInit++;
                        var sWatcherInitPath = aLocalPaths[iCounterWatcherInit - 1];
                        aWatcherInitPath = sWatcherInitPath.split("**/");
                        sWatcherInitPath = typeof aWatcherInitPath[1] !== 'undefined' && aWatcherInitPath[1] ? aWatcherInitPath[1] : sWatcherInitPath;
                        if (!inArray(aConfigFiles, sWatcherInitPath)) {
                            log('[%s phphotreload server] %s', displayTime(), "File watcher " + sWatcherInitPath + " initialized!");
                        }
                        if (iCounterWatcherInit >= glaWatcher.length) {
                            iCounterWatcherInit = 0;
                            log('[%s phphotreload server] %s', displayTime(), "Initialization of file watchers finished!");
                        }
                    }).on('change', function (psChangedLocalFile, poStats) {
                        var sChangedLocalFile = psChangedLocalFile.normalizePath();
                        gloEventEmitter.emit('changed', sChangedLocalFile);
                    });
                }
                if (typeof gloEventEmitter !== 'undefined') {
                    gloEventEmitter.removeAllListeners();
                    gloEventEmitter = void 0;
                }

                gloEventEmitter = new events.EventEmitter();
                gloEventEmitter.on('changed', debounce(iDebounce, function (psChangedLocalFile) {
                    if (inArray(aConfigFiles, psChangedLocalFile)) {
                        log('[%s phphotreload server] %s', displayTime(), "Configuration file was updated!");
                        log('[%s phphotreload server] %s', displayTime(), "Server restarted!");
                        startServer();
                        return;
                    }

                    log('[%s phphotreload server] %s', displayTime(), "Local file " + psChangedLocalFile + " changed!");

                    var oConfigEntry = getConfigurationByLocalFile(psChangedLocalFile);
                    if (!oConfigEntry) {
                        log('[%s phphotreload server] %s', displayTime(), "No config entry found for changed local file " + psChangedLocalFile + "!");
                        return;
                    }
                    var sLocalPathRoot = oConfigEntry.localpath.normalizePath();

                    // clear temporary files by deleting local tmp files
                    if (typeof oConfigEntry.clearpaths !== 'undefined' && oConfigEntry.clearpaths.length) {
                        for (var i = 0; i < oConfigEntry.clearpaths.length; i++) {
                            var sClearpaths = oConfigEntry.clearpaths[i];
                            sClearpaths = sClearpaths.setPathPrefix(sLocalPathRoot)
                            clearTemp(sClearpaths);
                        }
                    }

                    // clear temporary files by URL asynchronously
                    if (typeof oConfigEntry.clearurls === 'undefined' || !oConfigEntry.clearurls) {
                        reloadTab(poSocket, gliTabIdLast, iLatency);
                        return;
                    }

                    var aClearUrlsDomain = [];
                    for (var i = 0; i < oConfigEntry.clearurls.length; i++) {
                        var sClearUrl = oConfigEntry.clearurls[i];
                        sClearUrl = sClearUrl.setPathPrefix(sHost);
                        if (sDomain == sClearUrl.getDomain()) {
                            aClearUrlsDomain.push(sClearUrl);
                        }
                    }

                    if (!aClearUrlsDomain.length) {
                        reloadTab(poSocket, gliTabIdLast, iLatency);
                        return;
                    }

                    var iUrlRequestsProcessed = 0;
                    for (var i = 0; i < aClearUrlsDomain.length; i++) {
                        var sClearUrlDomain = aClearUrlsDomain[i];
                        // request options
                        var options = {
                            url: sClearUrlDomain,
                            headers: {
                                'User-Agent': 'request'
                            },
                            method: 'GET',
                            json: true
                        };

                        function handleResponse(poError, poResponse, poBody) {

                            iUrlRequestsProcessed++;

                            if (poError || typeof poBody === 'undefined' || !poBody) {
                                log('[%s phphotreload server] Cache task fail result: %s', displayTime(), poError);
                            }
                            else if (typeof poBody.message !== 'undefined' && poBody.message) {
                                log('[%s phphotreload server] %s', displayTime(), "Cache clearing php script success result: " + poBody.message);
                            } else {
                                log('[%s phphotreload server] %s', displayTime(), "Fail: cache clearing php script not found!");
                            }

                            if (iUrlRequestsProcessed >= aClearUrlsDomain.length) {
                                iUrlRequestsProcessed = 0;
                                // trigger reload
                                reloadTab(poSocket, gliTabIdLast, iLatency);
                            }
                        }
                        // init request
                        log('[%s phphotreload server] %s', displayTime(), "Cache task request " + sClearUrlDomain + " started!");
                        request(options, handleResponse);
                    }
                }));

            }));

            poSocket.on('disconnect', function () {
                log('[%s phphotreload server] %s', displayTime(), "Disconnected!");
            });

        });

        log('[%s phphotreload server] Watching local routing config files %s...', displayTime(), aConfigFiles.join(", "));

    } catch (err) {
        // Error
        log('[%s phphotreload server] %s', displayTime(), err);
    }
};

// starting phphotreload server
startServer();
