// Kindly provided by guresicpark.com

// importing libraries

var log = console.log.bind(console),
    gloConfig = {}; // logger

var fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml'),
    includes = require('array-includes'),
    io = require('socket.io')(1337),
    chokidar = require('chokidar-graceful-cross-platform'),
    request = require('request'),
    wildstring = require('wildstring'),
    debounce = require('throttle-debounce/debounce');

// global vars

var gloWatcherConfig = void 0,
    gloWatcherLocalFile = void 0,
    glaLocalPathsLast = [],
    glaIgnoredLast = [],
    gliTabIdLast = [],
    gloConfig = {};

// functions

/**
 * Compares two arrays
 * @param array paA first array
 * @param array paB second array
 * @return boolean
 */
function arraysEqual(paA, paB){
    if (paA.length !== paB.length) {
        return false;
    } 
    for (var i = 0, len = paA.length; i < len; i++){
        if (paA[i] !== paB[i]){
            return false;
        }
    }
    return true; 
}

/**
 * Checks if a string starts with a specific string
 * @return boolean
 */
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        return this.substring(0, str.length) === str;
    }
};

/**
 * Checks if a string ends with a specific string
 * @return boolean
 */
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str) {
        return this.substring(this.length - str.length, this.length) === str;
    }
};

/**
 * Extracts the domain of a url
 */
String.prototype.getDomain = function() {
    return this.replace(/^https?:\/\//, "").replace(/^www\./, "").split('/')[0];
};

/**
 * Unifies slashes and removes trailing slash
 */
String.prototype.normalizePath = function() {
    return this.split('\\').join('/').replace(/\/(\*+)?\s*$/, '');
};

/**
 * Get configuration entry by domain
 * @param String psDomain the domain
 * @return object configuration entry
 */
var getConfigurationByDomain = function(psDomain) {
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
 * @param String psLocalFile the domain
 * @return object configuration entry
 */
var getConfigurationByLocalFile = function(psLocalFile) {
    if (typeof psLocalFile === 'undefined' || !psLocalFile) {
        return false;
    }
    for (var deltaConfig in gloConfig) {
        var sPathFromConfig = deltaConfig.normalizePath() + "*";        
        if (wildstring.match(sPathFromConfig, psLocalFile)) {
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
 * Clear files in a tmp directory
 * @param String psPath Temp directory
 */
clearTemp = function(psPath) {
    if (typeof psPath === 'undefined' || !psPath ) {
        return false;
    }
    var psPath = psPath.replace(/\/$/, '');
    try {
        var files = fs.readdirSync(psPath);
    } catch (e) {
        return false;
    }
    for (var i = 0; i < files.length; i++) {
        var sFilePathFull = psPath + '/' + files[i];
        if (fs.statSync(sFilePathFull).isFile()) {
            fs.unlinkSync(sFilePathFull);
        }
    }
    log('[%s phphotreload server] %s', displayTime(), "Local cache files in " + sFilePathFull + " successfully deleted!");
};

/**
 * Start phphotreload server
 */
const startServer = function () {
    const sConfigFile = 'config.yml';

    // exit if there is no routing file
    if (!fs.existsSync(sConfigFile)) {
        log('[%s phphotreload server] %s does not exist - please create it a server configuration file in server root path!', displayTime(), sConfigFile);
        process.exit();
    }

    // get routing data from routing file
    try {
        // initial config file load
        gloConfig = yaml.safeLoad(fs.readFileSync(sConfigFile, 'utf8'));

        // on connection with client
        if (io.server) {
            io.server.close();
        }
        io.on('connection', function (socket) {

            log('[%s phphotreload server] %s', displayTime(), "Client is connected!");

            socket.on('message', debounce(200, function (jsonData) {

                var oData = JSON.parse(jsonData);
                var sUrl = oData.sUrl.normalizePath();
                
                // do not reload internal chrome tabs
                if (sUrl.startsWith("chrome://")) {
                    return;
                }

                // extract domain
                var sDomain = sUrl.getDomain();

                // can not refresh when there is no config entry for this domain
                var oConfigEntryByDomain = getConfigurationByDomain(sDomain);
                if (!oConfigEntryByDomain) {
                    log('[%s phphotreload server] %s', displayTime(), "No entry found in config.yml for domain " + sDomain + "!");
                    return;
                }

                // do not refresh for a ignored url
                if (typeof oConfigEntryByDomain.ignoreurls !== 'undefined' && oConfigEntryByDomain.ignoreurls.length) {
                    for (var i = 0; i < oConfigEntryByDomain.ignoreurls.length; i++) {
                        var sIgnoreUrl = oConfigEntryByDomain.ignoreurls[i];
                        if (wildstring.match(sIgnoreUrl.normalizePath()+"*", sUrl)) {
                            log('[%s phphotreload server] %s', displayTime(), "Url"+oConfigEntryByDomain.ignoreurls[i]+" is ignored!");
                            return;
                        }
					}
                }

                // can not refresh when there is no tabid
                if (typeof oData.iTabId === 'undefined' || !oData.iTabId) {
                    log('[%s phphotreload server] %s', displayTime(), "No tab id received from Chrome!");
                    return;
                }
                
                gliTabIdLast = oData.iTabId;
                log('[%s phphotreload server] %s', displayTime(), "Message from chrome: " + sDomain + ' ' + oData.sMessage);

                var aLocalPaths = [];

                if (typeof oConfigEntryByDomain.extensions !== 'undefined' && oConfigEntryByDomain.extensions.length) {
                    for (var i = 0; i < oConfigEntryByDomain.extensions.length; i++) {
                        var sNewLocalPath = oConfigEntryByDomain.localpath.normalizePath() + '/**/*.' + oConfigEntryByDomain.extensions[i];
                        if (!includes(aLocalPaths, sNewLocalPath)) {
                            aLocalPaths.push(sNewLocalPath);
                        }
                    }					    
                } else {
                    log('[%s phphotreload server] %s', displayTime(), "No extensions defined in config.yml for this domain!");
                }

                // pathes to watch
                if (gloWatcherLocalFile) {
                    gloWatcherLocalFile.close();
                }

                // ignored folder
                var aIgnorePaths = [/[\/\\]\./];

                if (typeof oConfigEntryByDomain.ignorepaths !== 'undefined' && oConfigEntryByDomain.ignorepaths.length) {
                    for (var i = 0; i < oConfigEntryByDomain.ignorepaths.length; i++) {
                        aIgnorePaths.push(oConfigEntryByDomain.ignorepaths[i]);
                    }
                }

                if (aLocalPaths && arraysEqual(aLocalPaths, glaLocalPathsLast)) {
                    if (typeof oConfigEntryByDomain.ignorepaths !== 'undefined' && oConfigEntryByDomain.ignorepaths.length
                        && arraysEqual(oConfigEntryByDomain.ignorepaths, glaIgnoredLast)) {
                        // don't init new filewatcher if there is no entry in config
                        return;	
                    }
                } else {
                    glaLocalPathsLast = aLocalPaths;
                    glaIgnoredLast = aIgnorePaths;
                    log('[%s phphotreload server] %s', displayTime(), "New file watcher was initialized!");
                }

                gloWatcherLocalFile = chokidar.watch(aLocalPaths, {
                    ignored: aIgnorePaths,
                    persistent: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 2000,
                        pollInterval: 200
                    }
                });


                gloWatcherLocalFile.on('change', debounce(200, function (psChangedLocalFile, poStats) {

                    var sChangedLocalFile = psChangedLocalFile.normalizePath();

                    log('[%s phphotreload server] %s', displayTime(), "Local file " + sChangedLocalFile + " changed!");

                    var oConfigEntryByLocalFile = getConfigurationByLocalFile(sChangedLocalFile);
                    if (!oConfigEntryByLocalFile) {
                        log('[%s phphotreload server] %s', displayTime(), "No entry found in config.yml for changed local file " + sChangedLocalFile + "!");
                        return;
                    }
                        
                    // clear temporary files by deleting local tmp files
                    if (typeof oConfigEntryByLocalFile.clearpaths !== 'undefined' && oConfigEntryByLocalFile.clearpaths.length) {
                        for (var i = 0; i < oConfigEntryByLocalFile.clearpaths.length; i++) {
                            clearTemp(oConfigEntryByLocalFile.clearpaths[i]);
                        }
                    }
                                                
                    // clear temporary files by URL asynchronously
                    if (typeof oConfigEntryByLocalFile.clearurls !== 'undefined' && oConfigEntryByLocalFile.clearurls.length) {
                        var iUrlRequestsProcessed = 0;
                        for (var i = 0; i < oConfigEntryByLocalFile.clearurls.length; i++) {
                            // request options
                            var options = {
                                url: oConfigEntryByLocalFile.clearurls[i],
                                headers: {
                                    'User-Agent': 'request'
                                },
                                method: 'GET',
                                json: true
                            };

                            function handleResponse(error, response, body) {
                                if (error || typeof body === 'undefined' || !body) {
                                    log('[%s phphotreload server] Cache task fail result: %s', displayTime(), error);
                                    return;
                                }
                                log('[%s phphotreload server] %s', displayTime(), "Cache task success result: " + body.message);
                                iUrlRequestsProcessed++;
                                if (iUrlRequestsProcessed == oConfigEntryByLocalFile.clearurls.length) {
                                    // trigger reload
                                    setTimeout(function() {
                                        log('[%s phphotreload server] %s', displayTime(), "Reload request for TabId " + gliTabIdLast + " sent to Chrome!");
                                        socket.send(JSON.stringify({iTabId: gliTabIdLast}));
                                    }, oConfigEntryByLocalFile.latency);
                                }
                            }
                            // init request
                            log('[%s phphotreload server] %s', displayTime(), "Request startet for " + oConfigEntryByLocalFile.clearurls[i]);
                            request(options, handleResponse);
                        }

                    } else {
                        // just trigger reload without cache clear action
                        setTimeout(function() {
                            log('[%s phphotreload server] %s', displayTime(), "Reload request for TabId " + gliTabIdLast + " sent to Chrome!");
                            socket.send(JSON.stringify({iTabId: gliTabIdLast}));
                        }, oConfigEntryByLocalFile.latency);
                    }
                }));
            }));

            socket.on('disconnect', function () {
                log('[%s phphotreload server] %s', displayTime(), "Disconnected!");
            });
        });

        // start config file watcher
        if (gloWatcherConfig) {
            gloWatcherConfig.close();
        }
        gloWatcherConfig = chokidar.watch(sConfigFile, {
            ignored: /[\/\\]\./,
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 200
            }
        });

        gloWatcherConfig.on('change', function (psChangedLocalFile, poStats) {
            log('[%s phphotreload server] %s', displayTime(), "Configuration file was updated!");
            log('[%s phphotreload server] %s', displayTime(), "Server restarted!");
            startServer();
        });

        log('[%s phphotreload server] Watching local routing file %s...', displayTime(), sConfigFile);
    } catch (err) {
        // Error
        log('[%s phphotreload server] %s', displayTime(), err);
    }
};

// starting phphotreload server
startServer();
