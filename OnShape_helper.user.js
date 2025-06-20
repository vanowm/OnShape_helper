// ==UserScript==
// @name         OnShape helper
// @namespace    V@no
// @version      25.6.20
// @description  Various tweaks for OnShape, such as remap F2 for rename (SHIFT + N)
// @author       V@no
// @license      MIT
// @match        https://cad.onshape.com/documents
// @match        https://cad.onshape.com/documents?*
// @match        https://cad.onshape.com/documents/*
// @icon         https://onshape.com/favicon.png
// @grant        none
// ==/UserScript==

{
	// eslint-disable-next-line no-unused-expressions
	"use strict";
/*
^ = CTRL
! = ALT
+ = SHIFT
*/
	const VERSION = "25.6.20";
	const CHANGES = `+ history resize animation
+ link to install from greasyfork website`;
	const map = {
		"F2": {key: "N", code: "KeyN", keyCode: 78, shiftKey: true}
	};

	let mouseEvent = {};
	document.addEventListener("mousemove", evt =>
	{
		mouseEvent = evt;
	}, false);

	document.body.addEventListener("keydown", evt =>
	{
		let modifier = "";
		modifier = evt.altKey ? "!" : "";
		modifier = evt.shiftKey ? "+" : "";
		modifier = evt.ctrlKey || evt.metaKey ? "^" : "";
		const key = modifier + evt.code;
		if (!evt.isTrusted || !(key in map) || evt.altKey || evt.shiftKey || evt.ctrlKey || evt.metaKey)
			return console.log(evt, mouseEvent);

		if (mouseEvent.target)
		{
			evt.target.dispatchEvent(new KeyboardEvent(evt.type, Object.assign({}, evt, {key: " ", code: "space", keyCode: 32}, {bubbles: true})));
			mouseEvent.target.dispatchEvent(new PointerEvent("click", mouseEvent));
		}

		evt.target.dispatchEvent(new KeyboardEvent(evt.type, Object.assign({}, evt, map[key], {bubbles: true})));
	}, true);
	const css = `
.dimension-edit-container .ns-feature-parameter .bti-numeric-text,
.dimension-edit-container os-quantity-parameter input,
.dimension-edit
{
	max-width: unset;
}

div.OSH::before,
div.OSH::after {
  box-sizing: border-box;
}

div.OSH {
  display: inline-grid;
  vertical-align: top;
  align-items: center;
  position: relative;
}

div.OSH::after,
div.OSH input
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

div.OSH::after {
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

/* Message bubble move to the top */
os-message-bubble .os-message-bubble-container.document-message-bubble {
	top: 5px;
}

/* version history */
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-graph.inside-document {
	flex: initial !important;
}

/* version history user */
.versions-history-table-container .os-flex-col.os-item-modified-by-and-date.inside-document,
/* version history modified date */
.os-flex-col.os-item-modified-date.inside-document {
 	flex: none;
}

/* version history description */
.versions-history-table-container .os-flex-col.os-item-modified-date.inside-document,
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-name.inside-document,
.versions-history-table-container .os-flex-col.os-item-workspace-or-version-description.inside-document {
	max-width: unset;
}

/* logo */
.btn.nav-item.navbar-logo-btn img {
	-webkit-filter: brightness(1) !important;
	filter: brightness(1) !important;
}
`;
	const elStyle = document.createElement("style");
	elStyle.id = "onShapeHelper";
	elStyle.textContent = css;
	document.head.append(elStyle);
	// const configKeys = [
	// 	"disableImprinting"
	// ];
	// const configValues = {};
	// const storedValues = (() =>
	// {
	// 	try
	// 	{
	// 		return JSON.parse(localStorage.getItem(`OSH_configValues`)) || {};
	// 	}
	// 	catch
	// 	{
	// 		return {};
	// 	}
	// })();
	// for(let i = 0; i < configKeys.length; i++)
	// {
	// 	const key = configKeys[i];
	// 	configValues[key] = key in storedValues ? storedValues[key] : null;
	// }
	// let timeoutValues;
	// const saveValues = () => localStorage.setItem(`OSH_configValues`, JSON.stringify(configValues));
	const dataValue = (el, value) =>
	{
		el.dataset.value = value;
		// if (el.dataset.parameterId in configValues)
		// {
		// 	configValues[el.dataset.parameterId] = value;
		// 	clearTimeout(timeoutValues);
		// 	timeoutValues = setTimeout(saveValues, 1000);
		// }
		// console.log("input", el, value, el.dataset.parameterId);
	};
	// console.log("configValues", configValues);
	const changeByRegex = /Change by (.+) at (.+)$/;
	// eslint-disable-next-line no-unused-vars
	const observer = new MutationObserver((mutationList, _observer) =>
	{
		for (const mutation of mutationList)
		{
			for(const node of mutation.addedNodes)
			{
				if (node.nodeType !== 1)
					continue;

				if (node.matches("input:not(.OSH)"))
				{
					node.classList.add("OSH");
					node.parentElement.classList.add("OSH");
					dataValue(node.parentElement, node.value);//node.dataset.bsOriginalTitle);
					node.addEventListener("input", evt => dataValue(evt.target.parentElement, evt.target.value));
				}
				// if (node.matches("os-boolean-parameter:not(.OSH"))
				// {
				// 	node.classList.add("OSH");
				// 	const elInput = node.querySelector("input[type=checkbox]");
				// 	const elWrapper = node.querySelector("[data-parameter-id]");
				// 	const id = elWrapper.dataset.parameterId;
				// 	console.log("os-boolean-parameter", {node, elInput, id, configValues: configValues[id], checked: elInput.checked});
				// 	if (configValues[id] !== undefined && configValues[id] !== null)
				// 	{
				// 		// elWrapper.value = configValues[id];
				// 		// elInput.dispatchEvent(new Event("click", { bubbles: true,  }));
				// 		// elInput.click();
				// 		// elInput.checked = configValues[id];
				// 		elInput.dispatchEvent(new Event("change", { bubbles: true }));
				// 		elInput.dispatchEvent(new Event("input", { bubbles: true }));
				// 		elInput.dispatchEvent(new Event("click", { bubbles: true }));

				// 		console.log("set value", elWrapper.value, id);
				// 	}
				// 	// dataValue(elWrapper, elInput.checked);
				// 	node.addEventListener("input", evt => dataValue(elWrapper, evt.target.checked));
				// }
				// console.log(node);
				if (node.matches(".os-flex-table-row.change:not(.OSH)"))
				{
					node.classList.add("OSH");
					const changeBy = node.dataset.bsOriginalTitle.match(changeByRegex);
					const elModified = node.querySelector(".os-flex-col.os-item-modified-date.inside-document");
					elModified.textContent = `${changeBy[2]}`;
				}
				if (!node.classList.contains("OSH_conf"))
				{
					const nlNodes = node.querySelectorAll(`a:not(.OSH_conf)[ng-click="configurationTable.moveParameterUp()"], a:not(.OSH_conf)[ng-click="configurationTable.moveParameterDown()"`);
					if (nlNodes.length === 0)
						continue;

					node.classList.add("OSH_conf");
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
			}
		}
	});
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
}