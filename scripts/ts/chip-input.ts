export class ChipInput {
    container = document.createElement("div");
    list = document.createElement("ul");
    text = document.createElement("input");
    items: string[] = [];

    constructor() {
        this.text.onkeydown = (event) => {
            if (event.key === "Enter") {
                const value = this.text.value.trim();
                if (value !== "" && !this.items.includes(value)) {
                    this.push(value);
                }

                this.list.children.item(this.items.indexOf(value))?.scrollIntoView(true);
            }
        };
        this.text.placeholder = "Type a tag and press Enter";

        this.container.appendChild(this.list);
        this.container.appendChild(this.text);

        this.container.className = "chip-input";
        this.list.onwheel = (event) => {
            // noinspection JSSuspiciousNameCombination
            this.list.scrollLeft += event.deltaY;
            event.preventDefault();
        };
    }

    push = (...item: string[]) => {
        this.items.push(...item);
        this.text.value = "";
        this.text.focus();
        this.render();
    };

    render = () => {
        this.list.replaceChildren(...this.items.map((item, index) => {
            const listItem = document.createElement("li");

            const itemText= document.createElement("div");
            itemText.innerText = item;

            const deleteButton = document.createElement("button");
            deleteButton.innerText = "X";
            deleteButton.onclick = (_event) => {
                this.items = this.items.filter((item) => this.items.indexOf(item) !== index);
                this.render();
            };

            listItem.appendChild(itemText);
            listItem.appendChild(deleteButton);
            return listItem;
        }));
    };
}
