// Kindly provided by guresicpark.com

var log = console.log.bind(console);
var socket = io.connect('http://localhost:1337');

socket.on('connect', function() {
    console.log("connected from the client side");

    // send current active tab
    chrome.tabs.getSelected(null, function(poTabActive){
        socket.send(JSON.stringify({
            sUrl: poTabActive.url,
            iTabId: poTabActive.id,
            sMessage: "initialized"
        }));
    });

    // change phphotreload icon
    chrome.browserAction.setIcon({path: "img/icon_active_16.png"});
});

socket.on('message', function (jsonData) {
    var aData = JSON.parse(jsonData);
    var iTabId = aData.iTabId;
    chrome.tabs.reload(iTabId);
});

socket.on('disconnect', function () {
    // change phphotreload icon
    chrome.browserAction.setIcon({path: "img/icon_trying_16.png"});
});


// After tab was reloaded or a link was clicked
 chrome.tabs.onUpdated.addListener(function (pTabId, poChangeInfo, poTab) {
    if(poChangeInfo.status == "complete"){
        chrome.tabs.getSelected(null, function(poTabActive){
            if (poTabActive.id == poTab.id) {
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
    chrome.tabs.get(poActiveInfo.tabId, function (poTab) {
        socket.send(JSON.stringify({
            sUrl: poTab.url,
            iTabId: poTab.id,
            sMessage: "switched"
        }));
    });
});