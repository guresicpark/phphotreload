// Kindly provided by guresicpark.com

var log = console.log.bind(console);
var socket = io.connect('http://localhost:1337');
var blServerConnection = false;

socket.on('connect', function() {

    // send current active tab
    chrome.tabs.getSelected(null, function(poTabActive){
        socket.send(JSON.stringify({
            sUrl: poTabActive.url,
            iTabId: poTabActive.id,
            sMessage: "initialized"
        }));
    });

    // change phphotreload icon
    blServerConnection = true;
    chrome.browserAction.setIcon({path: "img/icon_green_16.png"});
});

socket.on('message', function (jsonData) {
    var aData = JSON.parse(jsonData);
    var iTabId = aData.iTabId;
    chrome.browserAction.setIcon({path: "img/icon_red_16.png"});
    chrome.tabs.reload(iTabId, {bypassCache: true});
    /* chrome.tabs.update(iTabId, {active:true, highlighted:true}, function(tab) {
        chrome.tabs.reload();
    });
    chrome.tabs.executeScript(iTabId, {code: 'window.location.reload()'});
    chrome.tabs.reload(iTabId, {bypassCache: true})
	chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
		var code = 'window.location.reload();';
		chrome.tabs.executeScript(arrayOfTabs[0].id, {code: code});
	}); */
});

socket.on('disconnect', function () {
    // change phphotreload icon
    blServerConnection = false;
    chrome.browserAction.setIcon({path: "img/icon_yellow_16.png"});
});


// After tab was reloaded or a link was clicked
 chrome.tabs.onUpdated.addListener(function (pTabId, poChangeInfo, poTab) {
    if(poChangeInfo.status == "complete"){
        chrome.tabs.getSelected(null, function(poTabActive){
            if (poTabActive.id == poTab.id) {
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
    chrome.tabs.get(poActiveInfo.tabId, function (poTab) {
        socket.send(JSON.stringify({
            sUrl: poTab.url,
            iTabId: poTab.id,
            sMessage: "switched"
        }));
    });
});