/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * @author: pdulvp@gmail.com
 */
var POPUP_URL = "ui/popup.html";
var ICON_ENABLED = "icons/navigation.svg";
var ICON_DISABLED = "icons/navigation.svg";

var currentTab;
var statuses = { };
var expands = { };

//Update the browserAction according to the status
function updateBrowseAction(status) {
  if (status == null) status = undefined;
  var icon = ICON_ENABLED;
  
  if (status == undefined || Object.entries(status).length == 0) {
	icon=ICON_DISABLED;
	browser.browserAction.setPopup( {tabId: currentTab.id, popup: "" });
	
  } else {
	browser.browserAction.setPopup( {tabId: currentTab.id, popup: POPUP_URL });
  }
  
  //browser.browserAction.setIcon({
  //  path: icon,
  //  tabId: currentTab.id
  //});
  
  /*browser.browserAction.setTitle({
    title: 'Unbookmark it!',
    tabId: currentTab.id
  })*/;
}


  function handleResponse(message) {
	console.log("handleResponse");
	//statuses[message.tabId] = message.status;
	updateBrowseAction(message.status);
  }
  
//This method asks to the content-script registered on the active tab, which links are related to it.
//When retrieved, we update the browse_action (becoming clickable or not) and store the status in the shared map that will be used when user click
//on the browse_action.
function updateActiveTab(tabs) {
  function handleWait(message) {
	//statuses[message.tabId] = message.status;
	console.log("wait");
  }
  
  function updateTab(tabs) {
    if (tabs[0]) {
	  currentTab = tabs[0];
	  statuses[tabs[0].id] = null;
	  //var sending = browser.runtime.sendMessage({ "action": "getLinks", "tabId" : tabs[0].id, "tabUrl" : tabs[0].url });
	  //sending.then(handleResponse, handleError);
	  handleMessage({ "action": "getLinks", "tabId" : tabs[0].id, "tabUrl" : tabs[0].url }, null, handleWait);
    }
  }

  var activeTab = browser.tabs.query({active: true, currentWindow: true});
  activeTab.then(updateTab);
}

//This method extract the hostname from the given url
//From https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function url_domain(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.hostname;
}

//When getLinks is asked, we ask to contentScript about it and throw a "callback runtime message" to tell that links are available.

var currentErrorId = null;

//When a switch is clicked, we update the expands information from the current domain
function handleMessage(request, sender, sendResponse) {
  if (request.action == "callback") {
	handleResponse(request);
	return;
  }
  
  if (request.action == "getLinks") {
	console.log("Message from the background script: " + request.action);
	
	var expandId = url_domain(request.tabUrl);
	if (expands[expandId] == null || expands[expandId] == undefined) {
		expands[expandId] = {};
	}
		
	function callback(message) {
		//here, we have the result of the "getStatus" action, or of the original "getLinks" result if already computed
		var status = statuses[message.tabId];
		if (status != null && status != undefined) {
			var result = { "action": "callback", "tabId" : message.tabId, "tabUrl" : message.tabUrl, "status": status, "expands": expands[expandId] };
			handleMessage(result);
			//Send to popups a callback action. (it can raise an error if there is no popup though)
			browser.runtime.sendMessage(result);
		}
	};
	
	function storeNewStatus(message) {
		//here, we have the result of the "getStatus" action.
		statuses[message.tabId] = message.status;
		callback(message);
	};
	
	function handleError(error) {
		//console.log(`Error: ${error}`);
		storeNewStatus( { "tabId" : request.tabId, "status": [] } );
	}
	  
	var status = statuses[request.tabId];
	if (status == null || status == undefined) {
		var sending = browser.tabs.sendMessage(request.tabId, { "action": "getStatus", "tabId" : request.tabId, "tabUrl" : request.tabUrl, "expands": expands[expandId] } );
		sending.then(storeNewStatus, handleError);
		sendResponse({"response": "wait", "action" : request.action }); 
		
	} else if (request.kind != undefined && request.kind != null && status[kind] == undefined) {
		var sending = browser.tabs.sendMessage(request.tabId, { "action": "getStatus", "tabId" : request.tabId, "tabUrl" : request.tabUrl, "expands": expands[expandId] } );
		sending.then(storeNewStatus, handleError);
		sendResponse({"response": "wait", "action" : request.action });
		
	} else {
		callback(request);
		sendResponse({"response": "wait", "action" : request.action }); 
	}
	
  } else if (request.action == "switchExpand") {
  
	var status = statuses[request.tabId];
	var expandId = url_domain(request.tabUrl);
	if (expands[expandId] == null || expands[expandId] == undefined) {
		expands[expandId] = {};
	}
	var kind = request.kind;
	if (expands[expandId][kind] == null || expands[expandId][kind] == undefined) {
		expands[expandId][kind] = false;
	}
	expands[expandId][kind] = !expands[expandId][kind];
	
	sendResponse({"response": "switched", "action" : request.action, "tabId": request.tabId, "tabUrl" : request.tabUrl,  "kind": request.kind, "value": expands[expandId][kind] });
  }
}

//Register on message sent from popup and contentScript
browser.runtime.onMessage.addListener(handleMessage);

// listen to tab URL changes
browser.tabs.onUpdated.addListener(updateActiveTab);

// listen to tab switching
browser.tabs.onActivated.addListener(updateActiveTab);

//browser.tabs.executeScript(null, { file: "/content_scripts/beastify.js" });

// listen for window switching
browser.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
updateActiveTab();
