/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * @author: pdulvp@gmail.com
 */
 var ENGINES = { 
  "default" : { toc: "h1, h2, h3", dynamicPrevious: false, dynamicNext: false },
  "google" : { search: "h3" },
  "duckduckgo" : { search: "h2" } ,
  "bing" : { search: "h2" },
  "yahoo" : { search: "h3" },
  "wikipedia" : { toc: "h2, h3" },
}

function getLinks(document, expands) {
	var urlString = document.URL;
	var previous = [];	
    var next = [];
	
    var toc = [];
    var search = [];
	
	var domain = url_domain(urlString);
	var isSearchEngine = "default";
	if (domain.indexOf("google")>=0){
		isSearchEngine = "google";
	}
	if (domain.indexOf("bing")>=0){
		isSearchEngine = "bing";
	}
	if (domain.indexOf("duckduckgo")>=0){
		isSearchEngine = "duckduckgo";
	}
	if (domain.indexOf("search.yahoo")>=0){
		isSearchEngine = "yahoo";
	}
	if (domain.indexOf("wikipedia")>=0){
		isSearchEngine = "wikipedia";
	}
	
	var result = {
		"previous" : { "dynamic": false, "links" : previous, "title" : "Previous", "kind" : "link-previous" },
		"next" : { "dynamic": false, "links" : next, "title" : "Next", "kind" : "link-next" },
		"search" : { "dynamic": true, "links" : search, "title" : "Search", "kind" : "link-search" },
		"toc" : { "dynamic": true, "links" : toc, "title" : "Table of Contents", "kind" : "link-library" },
	};
	
	isDynamic = false;
	
	//find the main element, based on HTML5 rules
	var main = document.body;
	if (document.body.getElementsByTagName("main").length == 1) {
		main=document.body.getElementsByTagName("main")[0];
		
	} else if (document.body.querySelector('[role="main"]') != null) {
		main=document.body.querySelector('[role="main"]');
	}
	
	
	//Add links inside role navigations
	var navigations = [].slice.call(document.body.querySelectorAll('[role="navigation"]'));
	for (i in navigations) {
		var navResult = { title: "Navigation", links: [], "kind" : "link-navigation"};
		var label = navigations[i].getAttribute("aria-labelledby");
		if (label != null) {
			navResult.title = navigations[i].querySelector("#"+label).textContent;
			navResult.kind = navResult.kind+navResult.title;
		}
		var locations = [].slice.call(navigations[i].querySelectorAll("a"));
		locations.forEach(function (heading, index) {
			var l = createLinkFromItem(heading);
			if (l != null) {
				navResult.links.push(l);
			}
		});
		navResult.expandable = navResult.links.length>0;
		result[navResult.title] = navResult;
	}
	
	
	//Add link for a dynamic previous if any
	if (ENGINES[isSearchEngine].dynamicPrevious === true) {
		var page = getDynamicPage(-1, urlString);
		if (page != null) {
			previous.push(page);
		}
	}
	
	//Add link for a dynamic previous if any
	if (ENGINES[isSearchEngine].dynamicNext === true) {
		page = getDynamicPage(1, urlString);
		if (page != null) {
			next.push(page);
		}
	}
	
	//Add links for search links if any
	if (ENGINES[isSearchEngine].search && expands[result["search"].kind]==true) {
		var headings = [].slice.call(main.querySelectorAll(ENGINES[isSearchEngine].search));
		headings.forEach(function (heading, index) {
			result["search"].links.push(createLinkFromHeading(heading, false));
		});
	}
	
	//Add links for table of content links if any
	if (ENGINES[isSearchEngine].toc && expands[result["toc"].kind]==true) {
		var headings = [].slice.call(main.querySelectorAll(ENGINES[isSearchEngine].toc));
		headings.forEach(function (heading, index) {
			result["toc"].links.push(createLinkFromHeading(heading, true));
		});
	}
	
	for (i in result) {
		if (result[i].links.length>0 || (ENGINES[isSearchEngine][i] != undefined && expands[result[i].kind]!=true && result[i].dynamic===true)) {
			result[i].expandable = true;
		} else {
			result[i].expandable = false;
		}
	}	
	return result;
  }
  
//From https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
  return 'xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

//This method extract the hostname from the given url
//From https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function url_domain(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.hostname;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function createLinkFromHeading(heading, toc) {
	var text = heading.textContent;
	var href = null;
	
	if (heading.getAttribute("id") == null) {
		heading.setAttribute("id", uuidv4());
	}
	if (heading.getAttribute("aria-label") != null) {
		text = heading.getAttribute("aria-label");
	}
	
	//If there is an 'a', choose it as the main link.
	var as = heading.tagName == "A" ? [heading] : heading.getElementsByTagName("a");
	if (as.length == 1) {
		if (!toc) {
			href = as[0].href;
		}
	}
	if (text == null || text == undefined) {
		text = "";
	}
	var fragment = document.URL.indexOf("#");
	if (href == null) {
		href=(fragment >=0 ? document.URL.substring(0,fragment) : document.URL)+"#"+heading.getAttribute("id");
	}
	return createLink(text, href, text);
}

function createLinkFromItem(heading) {
	var text = null;
	var href = null;
	
	if (heading.getAttribute("aria-label") != null) {
		text = heading.getAttribute("aria-label");
	}
	
	//If there is an 'a', choose it as the main link.
	var as = heading.tagName == "A" ? [heading] : heading.getElementsByTagName("a");
	if (as.length > 0) {
		text = as[0].textContent;
		href = as[0].href;
	}
	if (href == null || href == undefined || href.length == 0) {
		return null;
	}
	if (text == null || text == undefined) {
		text = "";
	}
	//var fragment = document.URL.indexOf("#");
	//if (href == null) {
	//	href=(fragment >=0 ? document.URL.substring(0,fragment) : document.URL)+"#"+heading.getAttribute("id");
	//}
	return createLink(text, href, text);
}
  
  
  function createLink(name, href, description) {
	return {"href" : href, "name" : name, "description": description};
  }
  
  //From original addon PN-Buttons
  function getDynamicPage(count, url) {
	console.log("From:"+url+" "+count);
	if(url==null) return null;
	url=decodeURI(url);
	var search=url.match(/[0-9]+/gi);

	if (search!=null) {
		var lena=url.lastIndexOf(search[search.length-1]);
		var prefix=url.substring(0, lena);
		var suffix=url.substring(lena+search[search.length-1].length);
		
		var curNumText=search[search.length-1];
		var curNum=parseFloat(curNumText, 10);
		var nextNum=parseFloat(curNum+count, 10);
		
		if (nextNum<0) nextNum=0;
		var nextNumText=""+nextNum;
		
		var txtZero="";
		for (var i=0; i<curNumText.length-nextNumText.length; i++) {
			txtZero+="0";
		}
		
		var res=prefix+txtZero+nextNumText+suffix;
		res= encodeURI(res);
		console.log("Result:"+res);
		
		if (url == res) {
			return null;
			}
		return createLink(txtZero+nextNumText , res) ;
		
	} else {
		return null;
	}
}
	
  
function handleMessage(request, sender, sendResponse) {
  if (request.action == "getStatus") {
	console.log("Message from the content script:" + request.action);
	return Promise.resolve({status: getLinks(document, request.expands), tabId : request.tabId, "tabUrl" : request.tabUrl });
  }
}

browser.runtime.onMessage.addListener(handleMessage);
