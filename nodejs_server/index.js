// Kindly provided by guresicpark.com

// importing libraries
var log = console.log.bind(console),
    gloConfig = {}; // logger

var fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml'),
    io = require('socket.io')(1337),
    chokidar = require('chokidar'),
    request = require('request'),
    debounce = require('throttle-debounce/debounce');

// global vars
var gloWatcherConfig = void 0,
    gloWatcherLocalFile = void 0;
    gloConfig = {};

// functions
String.prototype.getDomain = function() {
    return this.replace(/^https?:\/\//, "").replace(/^www\./, "").split('/')[0];
};

// functions
String.prototype.normalizePath = function() {
    return this.split('\\').join('/').replace(/\/$/, '');
};

/**
 * Get configuration entry for domain
 *
 * @param String psDomain the domain
 *
 * @return object configuration entry
 */
var getConfigurationByDomain = function(psDomain) {
    if (typeof psDomain === 'undefined' || psDomain == '') {
        return false;
    }
    for (var deltaConfig in gloConfig) {
        var oElement = gloConfig[deltaConfig];
        var aDomains = oElement.domains;
        if (aDomains.includes(psDomain)) {
            oElement['local'] = deltaConfig.normalizePath();
            return oElement;
        }
    }
    return false;
};

var getConfigurationByLocalFile = function(psLocalFile) {
    if (typeof psLocalFile === 'undefined' || psLocalFile == '') {
        return false;
    }
    for (var deltaConfig in gloConfig) {
        var sNeedle = deltaConfig.normalizePath();
        if (psLocalFile.includes(sNeedle)) {
            var oElement = gloConfig[deltaConfig];
            oElement['local'] = sNeedle;
            return oElement;
        }
    }
    return false;
};

/**
 * Display current time
 *
 * Returns current time in human readable form
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
 *
 * @param String psPath Temp directory
 */
clearTemp = function(psPath) {
    if (typeof psPath === 'undefined' || !psPath ) {
        return false;
    }
    var psPath = psPath.replace(/\/$/, '');
    try {
        var files = fs.readdirSync(psPath);
    }
    catch (e) {
        return false;
    }
    for (var i = 0; i < files.length; i++) {
        var sFilePathFull = psPath + '/' + files[i];
        if (fs.statSync(sFilePathFull).isFile()) {
            fs.unlinkSync(sFilePathFull);
        }
    }
};

const startServer = function () {
    const sConfigFile = 'config.yml';

    // exit if there is no routing file
    if (!fs.existsSync(sConfigFile)) {
        log('%s Resync server: %s does not exist - please create it a server configuration file in server root path!', displayTime(), sConfigFile);
        return;
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

            socket.on('message', debounce(300, function (jsonData) {
                var oData = JSON.parse(jsonData);
                var sDomain = oData.sUrl.getDomain();

                log('[%s phphotreload server] %s', displayTime(), "Message from chrome: " + sDomain + ' ' + oData.sMessage);

                if (oConfigEntry = getConfigurationByDomain(sDomain)) {

                    var aLocalPaths = [];

                    for (var i = 0; i < oConfigEntry.extensions.length; i++) {
                        var sNewLocalPath = oConfigEntry.local.normalizePath() + '/**/*.' + oConfigEntry.extensions[i];
                        if (!aLocalPaths.includes(sNewLocalPath)) {
                            aLocalPaths.push(sNewLocalPath);
                        }
                    }

                    // pathes to watch
                    if (gloWatcherLocalFile) {
                        gloWatcherLocalFile.close();
                    }

                    // ignored folder
                    var aIgnored = [/[\/\\]\./];
                    for (var i = 0; i < oConfigEntry.ignored.length; i++) {
                        aIgnored.push(oConfigEntry.ignored[i]);
                    }

                    gloWatcherLocalFile = chokidar.watch(aLocalPaths, {
                        ignored: aIgnored,
                        persistent: true,
                        awaitWriteFinish: {
                            stabilityThreshold: 2000,
                            pollInterval: 200
                        }
                    });

                    gloWatcherLocalFile.on('change', function (psChangedLocalFile, poStats) {
                        if (oConfigEntry = getConfigurationByLocalFile(psChangedLocalFile.normalizePath())) {
                            
                            // clear temporary files by deleting local tmp files
                            for (var i = 0; i < oConfigEntry.clearpath.length; i++) {
                                clearTemp(oConfigEntry.clearpath[i]);
                            }

                            if (oConfigEntry.clearurl.length) {
                                // clear temporary files by URL
                                for (var i = 0; i < oConfigEntry.clearurl.length; i++) {
                                    // request options
                                    var options = {
                                        url: oConfigEntry.clearurl[i],
                                        headers: {
                                            'User-Agent': 'request'
                                        },
                                        method: 'GET',
                                        json: true
                                    };
                                    
                                    function handleResponse(error, response, body) {
                                        if (error || typeof body === 'undefined') {
                                            log('[%s phphotreload server] Cache task fail result: %s', displayTime(), error);
                                            return;
                                        }
                                        log('[%s phphotreload server] %s', displayTime(), "Cache task success result: " + body.message);
                                        
                                        // trigger reload
                                        setTimeout(function() {
                                            socket.send(JSON.stringify(oData.iTabId));
                                        }, oConfigEntry.latency);
                                    }

                                   // init request
                                   log('[%s phphotreload server] %s', displayTime(), "Request startet for " + oConfigEntry.clearurl[i]);
                                   request(options, handleResponse);
                                }

                            } else {
                                // without cache handle
                                // trigger reload
                                setTimeout(function() {
                                    socket.send(JSON.stringify(oData.iTabId));
                                }, oConfigEntry.latency);
                            }
                        }
                    });
                }
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
