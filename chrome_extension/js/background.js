// Kindly provided by guresicpark.com

// Global variables
var log = console.log.bind(console),
    gloSocket = io.connect('http://localhost:1337'),
    glblServerConnection = false,
    gliTabReloadedBefore = false,
    glblTabWasReloaded = false;

gloSocket.on('connect', function () {

    // send current active tab
    chrome.tabs.getSelected(null, function (poActiveTab) {

        if (typeof poActiveTab === 'undefined') {
            return;
        }

        gloSocket.send(JSON.stringify({
            sUrl: poActiveTab.url,
            iTabId: poActiveTab.id,
            sMessage: "initialized"
        }));

    });

    // change phphotreload icon
    glblServerConnection = true;
    chrome.browserAction.setIcon({ path: "img/icon_green_16.png" });

});

gloSocket.on('message', function (pjsonDataFromServer) {

    if (typeof pjsonDataFromServer === 'undefined') {
        return;
    }

    var aData = JSON.parse(pjsonDataFromServer);
    var iTabId = aData.iTabId;

    chrome.browserAction.setIcon({ path: "img/icon_red_16.png" });

    // remember tab id
    gliTabReloadedBefore = iTabId;

    chrome.tabs.reload(iTabId, { bypassCache: true }, function () {

        // check if tab was really reloaded
        if (glblTabWasReloaded) {
            glblTabWasReloaded = false;
        } else {
            // backup tab reload
            chrome.tabs.executeScript(iTabId, { code: 'window.location.reload()' });
            gliTabReloadedBefore = false;
        }

    });

});

gloSocket.on('disconnect', function () {
    // change phphotreload icon
    glblServerConnection = false;
    chrome.browserAction.setIcon({ path: "img/icon_yellow_16.png" });
});

gloSocket.on('connect_error', function (err) {
    log('No connection to server ', err);
});

gloSocket.on('reconnect_failed', function () {
    log('Reconnect failed');
});

gloSocket.on('reconnect_error', function (err) {
    log('Reconnect Error ', err);
});

gloSocket.on('disconnect', function () {
    log('Disconnect from server');
});

gloSocket.on('error', function (err) {
    log('Error connecting to server ', err)
});

// After tab was reloaded or a link was clicked
chrome.tabs.onUpdated.addListener(function (piTabId, poChangeInfo, poTab) {

    if (typeof piTabId === 'undefined'
        || typeof poChangeInfo === 'undefined'
        || typeof poTab === 'undefined') {
        return;
    }

    if ((typeof gliTabReloadedBefore !== 'undefined') && gliTabReloadedBefore === poTab.id) {
        gliTabReloadedBefore = false;
        glblTabWasReloaded = true;
    }

    if (poChangeInfo.status == "complete") {

        if (glblServerConnection) {
            chrome.browserAction.setIcon({ path: "img/icon_green_16.png" });
        } else {
            chrome.browserAction.setIcon({ path: "img/icon_yellow_16.png" });
        }

        gloSocket.send(JSON.stringify({
            sUrl: poTab.url,
            iTabId: poTab.id,
            sMessage: "reloaded"
        }));

    }

});

// Tab was switched
chrome.tabs.onActivated.addListener(function (poActiveInfo) {

    if (typeof poActiveInfo === 'undefined') {
        return;
    }

    chrome.tabs.get(poActiveInfo.tabId, function (poTab) {

        if (typeof poTab === 'undefined') {
            return;
        }

        gloSocket.send(JSON.stringify({
            sUrl: poTab.url,
            iTabId: poActiveInfo.tabId,
            sMessage: "switched"
        }));

    });

});
