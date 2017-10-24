// Kindly provided by guresicpark.com

// Global variables
var log = console.log.bind(console);
var socket = io.connect('http://localhost:1337');
var blServerConnection = false,
    gliCurrentTabId = void 0;

socket.on('connect', function() {

    // send current active tab
    chrome.tabs.getSelected(null, function(poActiveTab){
        socket.send(JSON.stringify({
            sUrl: poActiveTab.url,
            iTabId: poActiveTab.id,
            sMessage: "initialized"
        }));
    });

    // change phphotreload icon
    blServerConnection = true;
    chrome.browserAction.setIcon({path: "img/icon_green_16.png"});
});

socket.on('message', function (jsonDataFromServer) {
    var aData = JSON.parse(jsonDataFromServer);
    var iTabId = aData.iTabId;
    if (typeof iTabId === 'undefined' || !iTabId) {
		return;
    }
    chrome.browserAction.setIcon({path: "img/icon_red_16.png"});
    chrome.tabs.reload(iTabId, {bypassCache: true});
});

socket.on('disconnect', function () {
    // change phphotreload icon
    blServerConnection = false;
    chrome.browserAction.setIcon({path: "img/icon_yellow_16.png"});
});


// After tab was reloaded or a link was clicked
 chrome.tabs.onUpdated.addListener(function (pTabId, poChangeInfo, poTab) {
    if(poChangeInfo.status == "complete"){
        chrome.tabs.getSelected(null, function(poActiveTab){
            if (poActiveTab.id == poTab.id) {
                if (blServerConnection) {
                    chrome.browserAction.setIcon({path: "img/icon_green_16.png"});
                } else {
                    chrome.browserAction.setIcon({path: "img/icon_yellow_16.png"});
                }
                socket.send(JSON.stringify({
                    sUrl: poTab.url,
                    iTabId: poTab.id,
                    sMessage: "reloaded"
                }));
            }
        });
    }
});

// Tab was switched
chrome.tabs.onActivated.addListener(function (poActiveInfo) {
    chrome.tabs.get(poActiveInfo.tabId, function(pTab){
        socket.send(JSON.stringify({
            sUrl: pTab.url,
            iTabId: poActiveInfo.tabId,
            sMessage: "switched"
        }));
    });
});
