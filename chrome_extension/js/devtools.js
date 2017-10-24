/**
 * Global variables
 */
var gloUpdatingPort = void 0;

/**
* Handle background message
* @param string iTabId id of tab
*/
var fnHandleBackgroundMessages = function (psMessageFromBackground) {
    var aMessage = JSON.parse(psMessageFromBackground);
    var sCommand = aMessage.command;
    if (sCommand == "reload") {
        chrome.devtools.inspectedWindow.reload({ignoreCache: true});
    }
    /*
    var iTabId = chrome.devtools.inspectedWindow.tabId;
    var iTabIdToReload = aMessage.iTabId;
    if (iTabIdToReload == iTabId) {
        chrome.devtools.inspectedWindow.reload({ignoreCache: true});
    } */
};

/**
* Connect to tab
*/
chrome.devtools.inspectedWindow.eval('this.location', function (poLocation, isException) {
    var iTabId = chrome.devtools.inspectedWindow.tabId;
    // connecting port
    if (typeof gloUpdatingPort !== 'undefined' && gloUpdatingPort) {
        gloUpdatingPort.disconnect();
	}
    gloUpdatingPort = chrome.extension.connect({name: JSON.stringify({iTabId: iTabId})});
    gloUpdatingPort.onMessage.addListener(fnHandleBackgroundMessages);
    // gloUpdatingPort.postMessage({iTabId = iTabId});
    // glsCurrentUrl = poLocation.href.toString();
});