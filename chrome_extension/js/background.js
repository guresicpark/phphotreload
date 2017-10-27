// Kindly provided by guresicpark.com

// Global variables
var log = console.log.bind(console),
    gloSocket = io.connect('http://localhost:1337'),
    glblServerConnection = false,
    gliTabReloadedBefore = void 0,
    glblTabWasReloaded = false;

gloSocket.on('connect', function() {
    // send current active tab
    chrome.tabs.getSelected(null, function(poActiveTab){
        gloSocket.send(JSON.stringify({
            sUrl: poActiveTab.url,
            iTabId: poActiveTab.id,
            sMessage: "initialized"
        }));
    });
    // change phphotreload icon
    glblServerConnection = true;
    chrome.browserAction.setIcon({path: "img/icon_green_16.png"});
});

gloSocket.on('message', function (jsonDataFromServer) {
    var aData = JSON.parse(jsonDataFromServer);
    var iTabId = aData.iTabId;
    chrome.browserAction.setIcon({path: "img/icon_red_16.png"});
    
    // remember tab id
    gliTabReloadedBefore = iTabId;
    chrome.tabs.reload(iTabId, {bypassCache: true}, function(){
        // check if tab was really reloaded
        if (glblTabWasReloaded) {
            glblTabWasReloaded = false;
        } else {
            // backup tab reload
            chrome.tabs.executeScript(iTabId, {code: 'window.location.reload()'});
            gliTabReloadedBefore = void 0;
        }
    });
});

gloSocket.on('disconnect', function () {
    // change phphotreload icon
    glblServerConnection = false;
    chrome.browserAction.setIcon({path: "img/icon_yellow_16.png"});
});


// After tab was reloaded or a link was clicked
 chrome.tabs.onUpdated.addListener(function (pTabId, poChangeInfo, poTab) {
    if ((typeof gliTabReloadedBefore !== 'undefined' && gliTabReloadedBefore)
            && gliTabReloadedBefore == poTab.id) {
        gliTabReloadedBefore = void 0;
        glblTabWasReloaded = true;
    }
    if(poChangeInfo.status == "complete"){
        if (glblServerConnection) {
            chrome.browserAction.setIcon({path: "img/icon_green_16.png"});
        } else {
            chrome.browserAction.setIcon({path: "img/icon_yellow_16.png"});
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
    chrome.tabs.get(poActiveInfo.tabId, function(pTab){
        gloSocket.send(JSON.stringify({
            sUrl: pTab.url,
            iTabId: poActiveInfo.tabId,
            sMessage: "switched"
        }));
    });
});
