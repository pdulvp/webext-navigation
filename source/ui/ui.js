/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * @author: pdulvp@gmail.com
 */
 
  var expands = {};
  
  function createSeparator(kind) {
    var node = document.createElement("div");   
	node.setAttribute("class", "panel-section-separator");
	node.setAttribute("data-kind", kind);
	return node;
  }
  
  function createNode(kind, textValue, href, expandable, image) {
  
		var node = document.createElement("div");
		node.setAttribute("class", "my-list-item");
		if (href != null) {
			node.setAttribute("data-url", href);
		}
		node.setAttribute("data-kind", kind);
		var img = document.createElement("img");   
		img.setAttribute("class", "icon "+(image ? kind : ""));
		node.appendChild(img);
		var text = document.createElement("div");   
		text.setAttribute("class", "text");
		var textnode = document.createElement("a"); // Create a text node
		textnode.title = textValue;
		textnode.textContent = textValue;
		text.appendChild(textnode); 
		node.appendChild(text);
		
		if (expandable) {
			var style = expands[kind] == true ? "link-expanded" : "link-expand";
			var expand = document.createElement("img");
			expand.setAttribute("class", "right-icon "+style);
			expand.setAttribute("data-kind", kind);
			node.appendChild(expand);
		}
		
		//var cmd = document.createElement("div");   
		//cmd.setAttribute("class", "right-text");
		//var cmdText = document.createTextNode("ALT"); // Create a text node
		//cmd.appendChild(cmdText); 
		//node.appendChild(cmd);
		return node;
  }
  
  function createLinks(expandable, value, prefix, kind) {
	
    if (expandable) {
		var node = createNode(kind, prefix/* + " ("+value.length+") "*/, null, true, true);
		document.getElementById("download-entry").appendChild(node);
		
		var expanded = expands[kind] == true;
		if (expanded && value.length>0) {
			for (i in value) {
				var node = createNode(null, value[i].name, value[i].href, false, false);
				document.getElementById("download-entry").appendChild(node);
			}
		} else if (expanded) {
			var node = createNode(kind, "<no entry>", null, false, false);
			document.getElementById("download-entry").appendChild(node);
		}
		
		var separator = createSeparator(value.kind);
		document.getElementById("download-entry").appendChild(separator);
		
	} else if (value.length > 0) {
		var node = createNode(kind, prefix, value[0].href, false, true);
		document.getElementById("download-entry").appendChild(node);
		
		var separator = createSeparator(value.kind);
		document.getElementById("download-entry").appendChild(separator);
	}
	
  }
  
  function handleResponse(message) {
    //console.log(`Message from the popup script: ${message.action} - ${message.response}`);
	if (message != undefined) {
		if (message.expands != null && message.expands != undefined) {
			expands = message.expands;
		}
		if (message.status != null && message.status != undefined) {
			var node = document.getElementById("download-entry");
			while (node.firstChild) {
			  node.removeChild(node.firstChild);
			}
			var entries = Object.entries(message.status);
			for (const [key, value] of entries) {
			  createLinks(value.expandable, value.links, value.title, value.kind);
			}
		}
	}
  }
  function handleMessage(request, sender, sendResponse) {
    if (request.action == "callback") {
      console.log(`callback to refresh`);
	  handleResponse(request);
    }
  }
  
  function handleError(error) {
    console.log(`Error: ${error}`);
  }
  
  function getAttribute(obj, attr) {
	if (obj == null || obj == undefined) {
		return null;
	}
	try {
		var value = obj.getAttribute(attr);
		if (value == undefined) {
			if (obj.parentNode != null) {
				return getAttribute(obj.parentNode, attr);
			}
			return null;
		}
		return value;
	} catch (err) { 
	}
	return null;
  }
  
  function handleWait(message) {
    console.log(`Wait: ${message}`);
  }
  
  function init() {
	var activeTab = browser.tabs.query({active: true, currentWindow: true});
	
	activeTab.then((tabs) => {
		var sending = browser.runtime.sendMessage( { "action": "getLinks", "tabId" : tabs[0].id, "tabUrl" : tabs[0].url, "kind": null } );
		sending.then(handleWait, handleError);
	});
  }
  
  function updateOnSwitch(message) {
	var kind = message.kind;
	var value = message.value;
	var sending = browser.runtime.sendMessage( { "action": "getLinks", "tabId" : message.tabId, "tabUrl" : message.tabUrl, "kind": kind });
	sending.then(handleWait, handleError);
  }
  
  init();
  document.addEventListener("click", (e) => {

  if (e.target.classList.contains("link-expand") || e.target.classList.contains("link-expanded")) {
	var activeTab = browser.tabs.query({active: true, currentWindow: true});
	activeTab.then((tabs) => {
		var kind = e.target.getAttribute("data-kind");
		var sending = browser.runtime.sendMessage( { "action": "switchExpand", "tabId" : tabs[0].id, "tabUrl" : tabs[0].url, "kind": kind } );
		sending.then(updateOnSwitch, handleError);
	});
	return;
  }
  
  var url = getAttribute(e.target, "data-url");
  if (url != null) {
	//Open the tab in or aside the current tab according to mouse button
	var activeTab = browser.tabs.query({active: true, currentWindow: true});
	activeTab.then((tabs) => {
		console.log("Open url:"+url);
	    if (e.which == 2) { //middleClick
			browser.tabs.create({url: url, index: tabs[0].index+1 });
		} else {
			browser.tabs.update(tabs[0].id, {url: url });
		}
		window.close();
	});
	return;
  }
});


//Register on message sent from popup and contentScript
browser.runtime.onMessage.addListener(handleMessage);
