const container = document.getElementById('container');
const selectionContainer = document.getElementById('selection');

let selectionImplications = [
    {   // blockade
        color: 'orange',
        value: 1
    },
    {   // player-spawn
        color: 'aqua',
        value: 2
    },
    {   // npc-spawn
        color: 'aquamarine',
        value: 3
    }
];

let selectionImplication;

function makeHTMLElm(type, attributes, styles){
    let elm = document.createElement(type);

    for (const attributesKey in attributes) {
        elm[attributesKey] = attributes[attributesKey];
    }
    for (const stylesKey in styles) {
        elm[stylesKey] = attributes[stylesKey];
    }

    return elm
}

function removeHTMLElement(elm){
    return elm.parentElement.removeChild(elm);
}

function removeChildren(elm){
    const children = Array.from(elm.childNodes);
    for (const child of children) {
        removeHTMLElement(child);
    }
}

class Node{
    constructor(point){
        this.x = point.x;
        this.y = point.y;
        this.right = null;
        this.left = null;
        this.up = null;
        this.down = null;
    }

    addRight(node){
        this.right = node;
        node.left = this;
    }

    addLeft(node){
        this.left = node;
        node.right = this;
    }

    addUp(node){
        this.up = node;
        node.down = this;
    }

    addBottom(node){
        this.bottom = node;
        node.top = this;
    }
}

function buildBlockadeGraph(arr){
    const root = new Node(arr[0]);
    let currentNode = root, rows = {}, node, obj;
    rows[root.y] = {};
    rows[root.y][root.x] = root;

    for (const arrElement of arr.slice(1)) {
        node = new Node(arrElement);

        if(rows[arrElement.y]){
            rows[arrElement.y][arrElement.x] = node
        }
        else{
            obj = {};
            obj[arrElement.x] = node;
            rows[arrElement.y] = obj;
        }

        if(arrElement.x > currentNode.x){
            currentNode.addRight(node);
            currentNode = node;
        }
        else{
            rows[arrElement.y - 1][arrElement.x].addBottom(node);
        }

        currentNode = node
    }

    return root;
}

class Blockade{
    constructor(){
        this.bounds = null;
    }

    static from(arr){
        arr.sort((x, y) => {
            if(x.x < y.x)
                return -1;
            if(x.x > y.x)
                return 1;
            if(x.y < y.y)
                return -1;
            if(x.y > y.y)
                return 1;
            return 0
        });

        return buildBlockadeGraph(arr);
    }
}

class MapGenerator{
    constructor(container){
        this.container = container;

        this.fillContainer(10, 20)
    }

    initSelectionStore(){
        this.selectionStore = [];

        for(let i = 0; i < this.height; i++){
            this.selectionStore.push(Array(this.width).fill(0));
        }
    }

    toggleSelection(box, position){
        box.style.background = (box.isTriggered ? '#eee' : selectionImplication.color);
        box.isTriggered = !box.isTriggered;
        const field = this.selectionStore[Math.floor(position / this.width)][position % this.width];
        this.selectionStore[Math.floor(position / this.width)][position % this.width] = field === 0 ? selectionImplication.value : 0;
    }

    fillContainer(width, height){
        removeChildren(this.container);

        this.width = width;
        this.height = height;

        this.initSelectionStore();

        this.container.style.gridTemplateColumns = Array(width).fill('auto').join(' ');
        this.container.style.width = this.width * 20 + 'px';

        const boxCount = this.width * this.height;
        for(let i = 0; i < boxCount; i++){
            let box = makeHTMLElm('box');
            box.isTriggered = false;
            box.addEventListener('click', (e) => {
                this.toggleSelection(box, i);
            });
            container.appendChild(box);
        }
    }

    identifyBlockade(arr, x, y){
        if(arr[y][x] === 1){
            arr[y][x] = false;
            return [{x: x, y: y}].concat(
                this.identifyBlockade(arr, x + 1, y    ),
                this.identifyBlockade(arr, x - 1, y    ),
                this.identifyBlockade(arr, x    , y + 1),
                this.identifyBlockade(arr, x    , y - 1))
        }
        else{
            return [];
        }
    }

    findBlockades(){
        let arr = this.selectionStore.map(x => x.slice()),
            blockades = [],
            blockade;

        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){
                if(this.selectionStore[y][x] === 1){
                    blockades.push({x: x, y: y});
                }
                /*blockade = this.identifyBlockade(arr, x, y);
                if(blockade[0]){
                    blockades.push(blockade);
                }*/
            }
        }

        return blockades;
    }

    findPlayerSpawns(){
        let spawns = [];
        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){
                if(this.selectionStore[y][x] === 2){
                    spawns.push({x: x, y: y});
                }
            }
        }

        return spawns;
    }

    findNPCSpawns(){
        let spawns = [];
        for(let y = 0; y < this.height; y++){
            for(let x = 0; x < this.width; x++){
                if(this.selectionStore[y][x] === 3){
                    spawns.push({x: x, y: y});
                }
            }
        }

        return spawns;
    }

    generateMap(){
        return JSON.stringify({
            width: this.width,
            height: this.height,
            blockades: this.findBlockades(),
            playerSpawns: this.findPlayerSpawns(),
            npcSpawns: this.findNPCSpawns()
        })
    }

    downloadMap(){
        const element = makeHTMLElm('a',
            {href: 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.generateMap()), download: 'map.json'},
            {display: 'none'});

        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

const generator = new MapGenerator(container);

document.getElementById('applyButton').addEventListener('click', function(){
    let widthValue  = document.getElementById('width').value,
        heightValue = document.getElementById('height').value;

    if(widthValue.match(/\D/) !== null || heightValue.match(/\D/) !== null){
        alert('Input must be an integer')
        return;
    }

    generator.fillContainer(+widthValue, +heightValue);
});

function selectElement(elm, i){
    for (const child of selectionContainer.children) {
        child.classList.remove('active');
    }

    elm.classList.add('active');
    console.log(i);
    selectionImplication = selectionImplications[i];
}

let i = 0;
for (const child of selectionContainer.children) {
    ((i) => child.addEventListener('click', function(e){
        selectElement(this, i);
    }))(i++);
}

selectElement(document.getElementById('selection-blockade'), 0);

document.getElementById('download').addEventListener('click', function(e){
    generator.downloadMap();
});
