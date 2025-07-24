// ==UserScript==
// @name         OnShape helper
// @namespace    V@no
// @version      25.7.24
// @description  Various tweaks for OnShape, such as remap F2 for rename (SHIFT + N)
// @author       V@no
// @license      MIT
// @match        https://cad.onshape.com/documents
// @match        https://cad.onshape.com/documents?*
// @match        https://cad.onshape.com/documents/*
// @match        https://cad.onshape.com/onshape-keyboard-shortcuts*
// @icon         https://onshape.com/favicon.png
// @grant        none
// ==/UserScript==

(CSS =>
{
// eslint-disable-next-line no-unused-expressions
"use strict";
/*
^ = CTRL
! = ALT
+ = SHIFT
*/
const VERSION = "25.7.24";
const CHANGES = `Merge commit 'fa2822ed1a891cfef98a2950693768c7c81afba1'`;
const map = {
	"F2": {key: "N", code: "KeyN", keyCode: 78, shiftKey: true}
};

const elStyle = document.createElement("style");
elStyle.id = "onShapeHelper";
elStyle.textContent = CSS;
document.head.append(elStyle);

let mouseEvent = {};
document.addEventListener("mousemove", evt =>
{
	mouseEvent = evt;
}, false);

const keyboardShortcuts = {
	header: null,
	list: new Map()
};

document.body.addEventListener("keydown", evt =>
{
	let modifier = "";
	modifier = evt.altKey ? "!" : "";
	modifier = evt.shiftKey ? "+" : "";
	modifier = evt.ctrlKey || evt.metaKey ? "^" : "";
	const key = modifier + evt.code;
	if (!evt.isTrusted || !(key in map) || evt.altKey || evt.shiftKey || evt.ctrlKey || evt.metaKey)
		return;// console.log(evt, mouseEvent);

	if (mouseEvent.target)
	{
		evt.target.dispatchEvent(new KeyboardEvent(evt.type, Object.assign({}, evt, {key: " ", code: "space", keyCode: 32}, {bubbles: true})));
		mouseEvent.target.dispatchEvent(new PointerEvent("click", mouseEvent));
	}

	evt.target.dispatchEvent(new KeyboardEvent(evt.type, Object.assign({}, evt, map[key], {bubbles: true})));
}, true);

const dataValue = (el, value) =>
{
	el.dataset.value = value;
};

const changeByRegex = /Change by (.+) at (.+)$/;

const getChildIndex = child =>
{
	let i = 0;
	while ((child = child.previousElementSibling) !== null)
		i++;
	return i;
};
// eslint-disable-next-line no-unused-vars
const observer = new MutationObserver((mutationList, _observer) =>
{
	const types = {};
	for (const mutation of mutationList)
	{
		for(const node of mutation.addedNodes)
		{
			if (node.nodeType !== 1)
				continue;

			/* ----------------------------- input boxes ----------------------------- */
			if (node.matches("input:not(.OSH)"))
			{
				node.classList.add("OSH");
				node.parentElement.classList.add("OSH", "input_box");
				const eventHandler = () => dataValue(node.parentElement, node.value);
				node.addEventListener("input", eventHandler);
				// inserted variables don't trigger input event, so we need to check for changes
				let previousValue = null;
				const loop = timestamp =>
				{
					if (previousValue !== node.value)
					{
						previousValue = node.value;
						eventHandler();
					}
					if (node.isConnected)
						return requestAnimationFrame(loop);
				};
				requestAnimationFrame(loop);
			}

			/* ------------------------- version and history ------------------------- */
			if (node.matches(".os-flex-table-row:not(.change, .OSH, .separator)"))
			{
				node.classList.add("OSH");
				const elDescription = document.createElement("div");
				elDescription.classList.add("os-flex-col", "os-item-description", "inside-document", "OSH_description");
				elDescription.textContent = node.dataset.bsExpandedContent || "";
				node.append(elDescription);
				if (node.dataset.bsExpandedContent)
					types.historyDescription = true;
			}
			/* --------------------- version and history changes --------------------- */
			if (node.matches(".os-flex-table-row.change:not(.OSH)"))
			{
				node.classList.add("OSH");
				const changeBy = node.dataset.bsOriginalTitle.match(changeByRegex);
				let parentChangeBy = "";
				for(let i = getChildIndex(node); i >= 0; --i)
				{
					const elSibling = node.parentElement.children[i].querySelector(".os-item-modified-by");
					if (elSibling)
					{
						parentChangeBy = elSibling.textContent.trim();
						break;
					}
				}
				const elModified = node.querySelector(".os-flex-col.os-item-modified-date.inside-document");
				elModified.innerHTML = (parentChangeBy === changeBy[1] ? `` : `${changeBy[1]}\n`) + changeBy[2];
				node.classList.toggle("OSH_single_line", parentChangeBy === changeBy[1]);
			}

			/* ---------------------------- version graph ---------------------------- */
			if (node.matches("line") && !types.versionGraph && node.closest(".os-version-graph"))
			{
				types.versionGraph = node.parentElement;
			}

			/* ---------------------------- configuration ---------------------------- */
			if (!node.classList.contains(".single-table-container.os-virtual-scroll-section:not(.OSH_conf)"))
			{
				const nlNodes = node.querySelectorAll(`a:not(.OSH_conf)[ng-click="configurationTable.moveParameterUp()"], a:not(.OSH_conf)[ng-click="configurationTable.moveParameterDown()"`);
				if (nlNodes.length > 0)
				{
					types.configuration = nlNodes.length;
					node.classList.add("OSH_conf");
				}
				for(let i = 0; i < nlNodes.length; i++)
				{
					const elA = nlNodes[i];
					elA.classList.add("OSH_conf");
					const elParent = elA.closest("div.os-table-header-responsive-last-row>div.d-flex");
					elParent.classList.add("OSH_conf_row");
					if (elParent.upDown === undefined)
						elParent.upDown = {};

					const type = elA.matches(`[ng-click="configurationTable.moveParameterUp()"]`);
					if (elParent.upDown[type])
						elParent.upDown[type].replaceWith(elA);
					else
						elParent.prepend(elA);

					elParent.upDown[type] = elA;
					elA.classList.add(type ? "UP" : "DOWN");
					elA.title = elA.textContent;
					elA.textContent = type ? "▲" : "▼";

					elA.addEventListener("click", () => moved(elA.parentElement.parentElement.parentElement));
				}
			}

			/* ---------------------------- message bubble --------------------------- */
			if (node.matches(`div[ng-include="'/project/web/woolsthorpe/app/partials/toolbarMessageBubble.html'"]`) && node.parentElement !== document.body)
			{
				document.body.append(node);
			}

			if (node.matches(".map-container"))
			{
				types.keyboardShortcutsTable = node;
			}
			// console.log(node);
			/* ----------------------- Keyboard Shortcuts panel ---------------------- */
			// if (node.matches("customize-shortcut-map"))
			// {
			// 	types.keyboardShortcutsHeader = node.querySelector(".shortcut-catagory-header-list");
			// }
			// if (node.matches("keyboard-shortcut"))
			// {
			// 	types.keyboardShortcuts = node.parentElement;
			// }

			if (node.matches(".d-flex.flex-column.ng-star-inserted:not(.OSH)"))
			{
				node.classList.add("OSH");
				types.documentList = node;
			}

		} // for added nodes
	} // for mutation list

	if (types.configuration)
	{
		if (!document.querySelector("div.single-table-container.os-virtual-scroll-section:first-child .UP"))
		{
			const elRow = document.querySelector("div.single-table-container.os-virtual-scroll-section:first-child div.OSH_conf_row");
			const elA = elRow.firstChild.cloneNode(true);
			elA.setAttribute("ng-click", "configurationTable.moveParameterUp()");
			elA.classList.remove("DOWN");
			elA.title = "Move UP";
			elA.classList.add("OSH_conf", "UP");
			elA.textContent = "▲";
			elRow.prepend(elA);
			const elParent = elA.closest("div.os-table-header-responsive-last-row>div.d-flex");
			elParent.upDown[true] = elA;

		}
		if (!document.querySelector("div.single-table-container.os-virtual-scroll-section:last-child .DOWN"))
		{
			const elRow = document.querySelector("div.single-table-container.os-virtual-scroll-section:last-child div.OSH_conf_row");
			const elA = elRow.firstChild.cloneNode(true);
			elA.setAttribute("ng-click", "configurationTable.moveParameterDown()");
			elA.classList.remove("UP");
			elA.title = "Move DOWN";
			elA.classList.add("OSH_conf", "DOWN");
			elA.textContent = "▼";
			elRow.append(elA);
			const elParent = elA.closest("div.os-table-header-responsive-last-row>div.d-flex");
			elParent.upDown[false] = elA;
		}
	}

	if (types.versionGraph)
	{
		const nlLines = types.versionGraph.querySelectorAll("line");
		let max = 0;
		let min = 1e10;
		for(let i = 0; i < nlLines.length; i++)
		{
			const elLine = nlLines[i];
			max = Math.max(max, Number.parseFloat(elLine.getAttribute("x1")));
			min = Math.min(min, Number.parseFloat(elLine.getAttribute("x1")));
		}
		const elGraph = types.versionGraph.closest(".document-panel-main-content");
		elGraph.style.setProperty("--os-version-graph-width", `${max - min + 28}px`);
		elGraph.style.setProperty("--os-version-graph-left", `-${min - 14}px`);
	}

	if (types.historyDescription)
	{
		document.querySelector(".versions-history-table-container").classList.add("OSH_description");
	}

	if (types.keyboardShortcutsTable)
	{
		const node = types.keyboardShortcutsTable;
		const nlEmpty = node.querySelectorAll(".map-container > div");
		const nlList = node.querySelectorAll(".map-container > div > div");
		for( const elItem of nlList)
		{
			// elItem.remove();
			elItem.parentElement.parentElement.append(elItem);
			console.log(elItem);
		}
		for(const elEmpty of nlEmpty)
			elEmpty.remove();
	}
	// if (types.keyboardShortcutsHeader)
	// {
	// 	keyboardShortcuts.header = types.keyboardShortcutsHeader.firstElementChild;
	// }

	// if (types.keyboardShortcuts && keyboardShortcuts.header)
	// {
	// 	const elHeader = keyboardShortcuts.header;
	// 	const type = elHeader.textContent.trim();
	// 	keyboardShortcuts.list.set(type, []);
	// 	const nlShortcuts = types.keyboardShortcuts.querySelectorAll("keyboard-shortcut");
	// 	for (const elShortcut of nlShortcuts)
	// 	{
	// 		const list = keyboardShortcuts.list.get(type);
	// 		list.push(elShortcut.cloneNode(true));
	// 	}
	// 	if (elHeader.nextElementSibling)
	// 	{
	// 		keyboardShortcuts.header = elHeader.nextElementSibling;
	// 		keyboardShortcuts.header.click();
	// 	}
	// 	else
	// 	{
	// 		keyboardShortcuts.header = null;
	// 		elHeader.parentNode.firstElementChild.click();
	// 		keyboardShortcutsShow();
	// 	}
	// }

	/* --------------- prevent document folder open in a new tab --------------- */
	const elFolder = document.querySelector("a.folder[target='_blank']");
	if (elFolder)
		elFolder.removeAttribute("target");

	// if (types.documentList)
	// {
	// 	const node = types.documentList;
	// 	const elSplitter = node.querySelector("osx-splitter");
	// 	const saveStyle = () => localStorage.setItem("OSH_splitterStyle", elSplitter.getAttribute("style"));
	// 	let timer = null;
	// 	const mutationObserver2 = new MutationObserver(mutationList2 =>
	// 	{
	// 		if (!elSplitter.classList.contains("OSH"))
	// 		{
	// 			elSplitter.classList.add("OSH");
	// 			const savedStyle = localStorage.getItem("OSH_splitterStyle");
	// 			if (savedStyle)
	// 			{
	// 				elSplitter.setAttribute("style", savedStyle);
	// 				elSplitter.querySelector(".cdk-drag.gutter-handle").dispatchEvent(new Event("dragstart", {bubbles: true}));
	// 				return;
	// 			}

	// 		}
	// 		clearTimeout(timer);
	// 		timer = setTimeout(saveStyle, 500);
	// 		console.log("OSH: MutationObserver2", mutationList2);
	// 	});
	// 	mutationObserver2.observe(elSplitter, { attributeFilter: ["style"], attributeOldValue: true });

	// }

});

const keyboardShortcutsShow = () =>
{
	const containerId = "OSH_keyboardShortcutsTable";
	let container = document.getElementById(containerId);
	if (!container)
	{
		container = document.createElement("div");
		container.id = containerId;
		document.body.append(container);
	}

    // Clear previous content
	container.innerHTML = "";

    // Create table
	const table = document.createElement("table");
	// table.style = "border-collapse:collapse;width:100%;";
	const thead = document.createElement("thead");
	const trHead = document.createElement("tr");

    // Collect all unique shortcut property names for columns
	const allKeys = [...keyboardShortcuts.list.keys()];
	for (const key of allKeys)
	{
		const th = document.createElement("th");
		th.textContent = key;
		th.colSpan = 2;
		// th.style = "border:1px solid #ccc;padding:0.5em;background:#eee;";
		trHead.append(th);
	}
	thead.append(trHead);
	table.append(thead);

    // Find the max number of shortcuts in any column
	const maxRows = Math.max(...Array.from(keyboardShortcuts.list.values(), v => v.length));

	const tbody = document.createElement("tbody");
	for (let row = 0; row < maxRows; row++)
	{
		const tr = document.createElement("tr");

		for (const key of allKeys)
		{
			// td.style = "border:1px solid #ccc;padding:0.5em;";
			const shortcut = keyboardShortcuts.list.get(key)[row];
			const td1 = document.createElement("td");
			const td2 = td1.cloneNode();
			if (shortcut)
			{
				td1.append(shortcut.querySelector(".shortcut-keys"));
				td2.append(shortcut.querySelector(".shortcut-label"));
			}
			tr.append(td1);
			tr.append(td2);
		}
		tbody.append(tr);
	}
	table.append(tbody);

    // Add close button
	const buttonClose = document.createElement("button");
	buttonClose.textContent = "Close";
	buttonClose.style = "position:absolute;top:0.5em;right:0.5em;";
	buttonClose.addEventListener("click", () => container.remove());

	container.append(table);
	container.append(buttonClose);
};

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

const moved = el =>
{
	moved.clear();
	el.classList.add("moved");
	moved.el = el;
	moved.timer = setTimeout(moved.clear, 2000);

};

moved.clear = () =>
{
	clearTimeout(moved.timer);
	if (moved.el)
	{
		moved.el.classList.remove("moved");
		moved.el = null;
	}
};
console.log(`OnShape helper v${VERSION} loaded`, "https://greasyfork.org/en/scripts/522636");
})(`
.dimension-edit-container .ns-feature-parameter .bti-numeric-text,
.dimension-edit-container os-quantity-parameter input,
.dimension-edit
{
	max-width: unset;
	z-index: 9999;
	text-align: center;
}

div.input_box.OSH::before,
div.input_box.OSH::after {
  box-sizing: border-box;
}

div.input_box.OSH {
  display: inline-grid;
  vertical-align: top;
  align-items: center;
  position: relative;
}

div.input_box.OSH::after,
div.input_box.OSH input
{
  width: auto;
  min-width: 1em;
  grid-area: 1/2;
  font: inherit;
  padding: 0 0.25em 0 0;
  margin: 0;
  resize: none;
  background: none;
  -webkit-appearance: none;
     -moz-appearance: none;
          appearance: none;
  border: none;
}

/* --- this will force to extend the width of the input to fit the content -- */
div.input_box.OSH::after {
  content: attr(data-value) " ";
  visibility: hidden;
  white-space: pre-wrap;
}

div.OSH_conf_row > .OSH_conf {
	font-size: x-large;
	padding: 0 0.2em;
	line-height: 1em;
}

div.OSH_conf_row > .OSH_conf:hover {
	background-color: var(--os-table-cell-fill--hover);
}

div.OSH_conf_row > .OSH_conf.UP {
  order: 1;
}

div.OSH_conf_row > .OSH_conf.DOWN {
  order: 2;
}

div.OSH_conf_row > :not(.OSH_conf) {
  order: 3;
}

div.moved {
  background-color: var(--os-alert-background-success);
}

div.single-table-container.os-virtual-scroll-section:first-child .UP,
div.single-table-container.os-virtual-scroll-section:last-child .DOWN {
	opacity: 0.5;
  	pointer-events: none;
}

/* --------------------- Message bubble move to the top --------------------- */
os-message-bubble .os-message-bubble-container.document-message-bubble {
	top: 5px;
}
.os-speech-bubble-container
{
	top: 0;
}

/* ----------------------------- version history ---------------------------- */
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-graph.inside-document {
	flex: initial !important;
}

/* -------------------------- version history graph ------------------------- */
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-graph.inside-document {
	min-width: var(--os-version-graph-width, 140px);
}
.os-version-graph > svg {
	margin-left: var(--os-version-graph-left, 0);
}

/* ------------ version history search result header modified by ------------ */
.versions-history-table-container .os-flex-col.history-search-results-header:last-child,
.versions-history-table-container .os-flex-table-row.history-search-result .os-flex-col:not(.os-item-workspace-or-version-actions).os-item-modified-date,
/* -------------------------- version history user -------------------------- */
.versions-history-table-container .os-flex-col.os-item-modified-by-and-date.inside-document,
/* ---------------------- version history modified date --------------------- */
.os-flex-col.os-item-modified-date.inside-document,
/* ----------------------- version history description ---------------------- */
.versions-history-table-container.OSH_description .os-flex-col.history-search-results-header,
.versions-history-table-container.OSH_description .os-flex-col.os-item-description{
 	flex: none;
}

/* ----------------------- version history description ---------------------- */
.versions-history-table-container .os-flex-col.os-item-modified-date.inside-document,
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-name.inside-document,
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-description.inside-document {
	max-width: unset;
}

/* ----------------------- version history change time ---------------------- */
.os-flex-col.os-item-modified-date.inside-document {
	font-size: 0.8em;
	white-space: pre;
	line-height: 1em;
	text-align: end;
	max-width: 10em !important;
	text-overflow: ellipsis;
 	overflow: hidden;
	padding-top: 0.3em;
}
.OSH_single_line > .os-flex-col.os-item-modified-date.inside-document {
	padding-top: 0.9em;
}

/* ------------------- version history description column ------------------- */
.versions-history-table-container:not(.OSH_description) .OSH_description {
	display: none !important;
}
.versions-history-table-container.OSH_description .os-flex-col.os-item-modified-by-and-date.inside-document + .ng-hide,
.versions-history-table-container.OSH_description .os-flex-col.os-item-description {
	display: block !important;
	order: 3;
}
.versions-history-table-container.OSH_description .os-item-modified-by-and-date {
	order: 4;
}

.versions-history-table-container.OSH_description .os-item-workspace-or-version-name {
	order: 2;
}
.versions-history-table-container.OSH_description .os-item-workspace-or-version-graph:not(.change-item) {
	order: 1;
}

/* --------------------------- Keyboard shortcuts --------------------------- */
#OSH_keyboardShortcutsTable {
	position:fixed;
	top:10%;
	left:10%;
	background:var(--background-color);
	z-index:9999;
	padding:1em;
	border:2px solid #888;
	max-height:80vh;
	overflow:auto;
}
#OSH_keyboardShortcutsTable th {
	text-align: center;
	border-bottom: 1px solid var(--text-color);
	padding: 0.5em 0;
}
#OSH_keyboardShortcutsTable > table {
	border: none;
	border-collapse: collapse;
}
#OSH_keyboardShortcutsTable > table th,
#OSH_keyboardShortcutsTable > table td:nth-child(odd) {
	border-left: 1px solid var(--text-color);
}
#OSH_keyboardShortcutsTable > table th:first-child,
#OSH_keyboardShortcutsTable > table td:first-child {
	border-left: none;
}
#OSH_keyboardShortcutsTable .keyboard-shortcut-container,
#OSH_keyboardShortcutsTable .keyboard-shortcut-container .shortcut-keys span {
	margin: 0;
}

#OSH_keyboardShortcutsTable .shortcut-keys {
	display: flex;
	flex-wrap: nowrap;
	justify-content: right;
}

/* just a visual indicator that script is running - a green dot on the logo */
osx-navbar-logo-component > a {
	position: relative;
}
osx-navbar-logo-component > a::before {
    content: "";
    position: absolute;
    background-color: green;
    left: 12px;
    top: 18px;
    font-size: 2em;
    width: 5px;
    height: 5px;
	border-radius: 100%;
}
`);