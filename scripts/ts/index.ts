const tabs = document.querySelector("#editorTabs");
if (!tabs) {
	throw new Error("editorTabs elements is missing!");
}

const hostsParseButton = document.querySelector("#hostsParseButton");
if (!hostsParseButton) {
	throw new Error("hostsParseButton element is missing!");
}

const filters = document.querySelector("#filtersEditor");
if (!filters) {
	throw new Error("filtersEditor element is missing!");
}

const filtersTable = filters.querySelector("#filtersTable");
if (!filtersTable) {
	throw new Error("filtersTable element is missing!");
}

[
	{
		text: "hosts",
		target: document.querySelector("#hostsEditor"),
	},
	{
		text: "filters",
		target: document.querySelector("#filtersEditor"),
	},
	{
		text: "tags",
		target: document.querySelector("#tagsEditor"),
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
		tab.target.classList.remove("hidden");
	};
	// button.appendChild(image);
	button.appendChild(text);

	tabs.appendChild(button);
});

// TODO: Consider moving this to a separate "definitions" file
type filterType = {
	label?: string;
	regex?: RegExp;
	tags?: string[];
}

const getFilter = ({ label = "example.com", regex = new RegExp("(?:www\\.)?example\\.[a-z]{2,}$"), tags = [ "test_1", "test_2" ] }: filterType = {}) => {
	const container = document.createElement("div");
	container.className = "filter table-row";

	const labelCell = document.createElement("div");
	labelCell.className = "table-vertical-header";
	const labelInput = document.createElement("p");
	labelInput.innerText = label;
	labelInput.contentEditable = "false";
	labelCell.appendChild(labelInput);

	const regexCell = document.createElement("div");
	regexCell.className = "table-cell";
	const regexInput = document.createElement("input");
	regexInput.type = "text";
	regexInput.value = regex.toString();
	regexInput.placeholder = "(?:www\\.)?example\\.[a-z]{2,}$";
	regexCell.appendChild(regexInput);

	// TODO: Add custom "chip" inputs
	const tagsCell = document.createElement("div");
	tagsCell.className = "table-cell";
	const tagsField = document.createElement("input");
	tagsField.type = "text";
	tagsField.value = tags.join(", ");
	tagsField.placeholder = "tag_1, tag_2";
	tagsCell.appendChild(tagsField);

	const deleteCell = document.createElement("div");
	deleteCell.className = "table-cell";
	const deleteButton = document.createElement("button");
	deleteButton.className = "closeButton";
	deleteButton.innerText = "Delete";
	deleteButton.onclick = (_event) => {
		// TODO: Add proper functionality for deleting entries
		console.log(`Element with "${regexInput.value}" value was removed`);
	};
	deleteCell.appendChild(deleteButton);

	container.appendChild(labelCell);
	container.appendChild(regexCell);
	container.appendChild(tagsCell);
	container.appendChild(deleteCell);

	return container;
};

(hostsParseButton as HTMLButtonElement).onclick = (_event) => {
	const hostsTextArea = document.querySelector("#hostsTextArea");
	if (!hostsTextArea) {
		throw new Error("hostsTextArea element is missing!");
	}

	// TODO: Add map for tags
	let hostsMap : Map<string, RegExp> = new Map();
	(hostsTextArea as HTMLTextAreaElement).value.trim().split(/\r\n|\n/)
		.filter((line) => line.trim().length > 0)
		.filter((line) => line.trim().match(/^(?:#|\/\/)/) === null)
		.forEach((line) => {
			const matches = line.match(/(?:www\.)?((?:[\w\-.]+\.)+?\w{2,})/);
			if (matches) {
				let match = matches[0];
				if ((matches.length > 1) && (match === "127.0.0.1" || match === "0.0.0.0")) {
					match = matches[1];
				}

				const hostname = match.slice(0, match.lastIndexOf("."));
				hostsMap.set(match, new RegExp(`(?:www\\.)?${hostname}\\.[a-z]{2,}$`));

				// TODO: Add tag parsing
				// const tags = line.match(/\[([^\]]+)]/);
			}
		});

	let filtersArray: HTMLDivElement[] = [];
	hostsMap.forEach((value, key, _map) => {
		filtersArray.push(getFilter({ label: key, regex: value, tags: [] })); // TODO: Implement tags
	});

	filtersTable.replaceChildren(...filtersArray);
};

filtersTable.appendChild(getFilter());

(tabs.children[1] as HTMLElement).click();