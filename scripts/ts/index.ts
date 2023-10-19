import {makeUniqueTagHue, tagColorMap} from "./shared";
import {Optional} from "./common";
import {ChipInput} from "./chip-input";

const tabs = new Optional(document.querySelector("#editorTabs"));
const hostsParseButton = new Optional(document.querySelector("#hostsParseButton"));
const filters = new Optional(document.querySelector("#filtersEditor"));
const filtersTable = new Optional(filters.value().querySelector("#filtersTable"));

[
	{
		text: "hosts",
		target: new Optional(document.querySelector("#hostsEditor")),
	},
	{
		text: "filters",
		target: new Optional(document.querySelector("#filtersEditor")),
	},
	{
		text: "tags",
		target: new Optional(document.querySelector("#tagsEditor")),
	},
].forEach((tab) => {
	// TODO: Consider adding images for the tabs
	// const image = document.createElement("img");
	// image.src = "icons/save_icon.png";
	// image.alt = "Floppy Disk";

	const text = document.createElement("div");
	text.innerText = tab.text;

	const button = document.createElement("button");
	button.onclick = (event) => {
		if (!tab.target) {
			throw new Error(`${tab.text} is missing its target!`);
		}

		document.querySelectorAll(".editors").forEach(editor => editor.classList.add("hidden"));
		document.querySelectorAll("#editorTabs > button").forEach(tab => tab.classList.remove("active"));

		(event.currentTarget as Element).classList.add("active");
		tab.target.value().classList.remove("hidden");
	};
	// button.appendChild(image);
	button.appendChild(text);

	tabs.value().appendChild(button);
});

// TODO: Consider moving this to a separate "definitions" file
type filterData = {
	regex: RegExp;
	tags: string[];
}
type filterType = {
	label?: string;
	data?: filterData;
}

const buildFilter = ({ label, data }: filterType = {}) => {
	const container = document.createElement("div");
	container.className = `table-row ${!data ? "table-spacer" : "filter"}`;

	const labelCell = document.createElement("div");
	labelCell.className = "table-label-cell";
	if (label) {
		const labelInput = document.createElement("p");
		labelInput.innerText = label;
		labelInput.contentEditable = "false";
		labelCell.appendChild(labelInput);
	}

	const regexCell = document.createElement("div");
	regexCell.className = "table-input-cell";
	if (data) {
		const regexInput = document.createElement("input");
		regexInput.type = "text";
		regexInput.value = data.regex.source;
		regexInput.placeholder = "example.com";
		regexCell.appendChild(regexInput);
	}

	const tagsCell = document.createElement("div");
	tagsCell.className = "table-tags-cell";
	if (data) {
		data.tags.forEach(tag => {
			if (!tagColorMap.has(tag)) {
				tagColorMap.set(tag, makeUniqueTagHue());
			}
		});

		const tagsField = new ChipInput();
		tagsField.push(...data.tags);
		tagsCell.appendChild(tagsField.container);
	}

	const deleteCell = document.createElement("div");
	deleteCell.className = "table-delete-cell";
	if (data) {
		const deleteButton = document.createElement("button");
		deleteButton.className = "closeButton";
		deleteButton.innerText = "Delete";
		deleteButton.onclick = (_event) => {
			let elementList: Element[] = [];
			for (const element of filtersTable.value().children) {
				if (element === container) {
					continue;
				}

				elementList.push(element);
			}

			filtersTable.value().replaceChildren(...elementList);
		};
		deleteCell.appendChild(deleteButton);
	}

	container.appendChild(labelCell);
	container.appendChild(regexCell);
	container.appendChild(tagsCell);
	container.appendChild(deleteCell);

	return container;
};

(hostsParseButton.value() as HTMLButtonElement).onclick = (_event) => {
	const hostsTextArea = new Optional(document.querySelector("#hostsTextArea"));

	const hostsMap : Map<string, filterData> = new Map();
	(hostsTextArea.value() as HTMLTextAreaElement).value.trim().split(/\r\n|\n/)
		.map(line => line.trim())
		.filter(line => (line.length > 0) && (line.match(/^(?:#|\/\/)/) === null))
		.forEach(line => {
			const matches = line.match(/(?:www\.)?((?:[\w\-.]+)+?\.\w{2,})/);
			if (matches) {
				const tags = [...new Set([...line.matchAll(/\[([^\]]+)]/g)].map(value => { return value[1]; }))];
				const hostname = matches[1];

				hostsMap.set(hostname, { regex: new RegExp(`${hostname}`), tags: tags });
			}
		});

	let filtersArray: HTMLDivElement[] = [];
	hostsMap.forEach((value, key) => {
		filtersArray.push(buildFilter({ label: key, data: value }));
	});

	filtersArray.push(buildFilter()); // Construct a spacer at the bottom
	filtersTable.value().replaceChildren(...filtersArray);
};

filtersTable.value().appendChild(buildFilter({ label: "example.com", data: { regex: new RegExp("example.com"), tags: ["test_1", "test_2", "test_3", "test_4", "test_5", "test_6", "test_7", "test_8", "test_9", "test_10"] } })); // TODO: Remove after testing is done
filtersTable.value().appendChild(buildFilter({})); // TODO: Remove after testing is done

(tabs.value().children[1] as HTMLElement).click();
