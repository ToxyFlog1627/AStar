//? Priority queue
class Heap {
	_arr;
	_compare;

	constructor(compare) {
		this._arr = [];
		this._compare = compare;
	}

	_heapify(currentIndex) {
		let largestIndex = currentIndex;
		const leftIndex = currentIndex * 2 + 1;
		const rightIndex = currentIndex * 2 + 2;

		if (leftIndex < this._arr.length && this._compare(this._arr[leftIndex], this._arr[largestIndex]) < 0) largestIndex = leftIndex;
		if (rightIndex < this._arr.length && this._compare(this._arr[rightIndex], this._arr[largestIndex]) < 0) largestIndex = rightIndex;

		if (largestIndex !== currentIndex) {
			const temp = this._arr[currentIndex];
			this._arr[currentIndex] = this._arr[largestIndex];
			this._arr[largestIndex] = temp;
			this._heapify(largestIndex);
		}
	}

	empty = () => this._arr.length === 0;

	push(value) {
		this._arr.push(value);

		let currentIndex = this._arr.length - 1;
		while (currentIndex) {
			const parentIndex = Math.floor((currentIndex - 1) / 2);
			if (this._compare(this._arr[parentIndex], this._arr[currentIndex]) >= 0) break;

			const temp = this._arr[currentIndex];
			this._arr[currentIndex] = this._arr[parentIndex];
			this._arr[parentIndex] = temp;

			currentIndex = parentIndex;
		}
	}

	pop() {
		if (this._arr.length === 1) return this._arr.pop();

		const value = this._arr[0];
		this._arr[0] = this._arr.pop();
		this._heapify(0);

		return value;
	}
}

//? Settings
//* Image
const IMAGE_URL = '/map.webp';
const IMAGE_OFFSET = [105, 57];
const IMAGE_SIZE = [542, 638];
const IMAGE_LEFT_UPPER_COORDINATE = [-124.61, 42.28];
const IMAGE_RIGHT_BOTTOM_COORDINATE = [-113.79, 32.28];

//* Coordinate to pixel
const COORDINATE_TO_PIXEL = [
	IMAGE_SIZE[0] / (IMAGE_LEFT_UPPER_COORDINATE[0] - IMAGE_RIGHT_BOTTOM_COORDINATE[0]),
	IMAGE_SIZE[1] / (IMAGE_LEFT_UPPER_COORDINATE[1] - IMAGE_RIGHT_BOTTOM_COORDINATE[1])
];

//* Graph data
const VERTICES_URL = '/graph/vertices';
const EDGES_URL = '/graph/edges';

//* Colors
const VERTEX_HIGHLIGHT = '#f0f020';
const EDGE_DEFAULT = '#2020f0';
const EDGE_HIGHLIGHT = '#f02020';
const EDGE_FINAL = '#20ff20';

//* Geometry
const VERTEX_RADIUS = 5;
const EDGE_WIDTH = 1;

//? Utils
const distance = ([x1, y1], [x2, y2]) => Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

const coordinatesToPixels = ([x, y]) => [(IMAGE_LEFT_UPPER_COORDINATE[0] - x) * COORDINATE_TO_PIXEL[0], (IMAGE_LEFT_UPPER_COORDINATE[1] - y) * COORDINATE_TO_PIXEL[1]];
const pixelsToCoordinates = ([x, y]) => [IMAGE_LEFT_UPPER_COORDINATE[0] - x / COORDINATE_TO_PIXEL[0], IMAGE_LEFT_UPPER_COORDINATE[1] - y / COORDINATE_TO_PIXEL[1]];

const findClosestVertex = ([x, y]) => {
	let closestVertex;
	let minDistance = Infinity;
	const clickCoordinates = pixelsToCoordinates([x, y]);

	V.forEach((_, v) => {
		const newDistance = distance(clickCoordinates, V[v]);
		if (newDistance > minDistance) return;

		minDistance = newDistance;
		closestVertex = v;
	});

	return closestVertex;
};

//? Setting up
//* Fetching vertices and edges
const fetchAndParse = async url => {
	const response = await fetch(url);
	const data = await response.text();
	//* Values are separated by " " in format of V = {id, x, y}, E = {id, v, u, w}
	return data.split("\n").map(element =>element.split(" ").slice(1).map(n => Number(n))); // prettier-ignore
};

//* Fetching the data and creating adjacency list
let V, E, adjList;
const setup = async () => {
	V = await fetchAndParse(VERTICES_URL);
	E = await fetchAndParse(EDGES_URL);

	adjList = [];
	E.forEach(([v, u, w]) => {
		if (!adjList[v]) adjList[v] = [];
		if (!adjList[u]) adjList[u] = [];
		adjList[v].push([u, w]);
		adjList[u].push([v, w]);
	});

	await setupCanvas();
};

//? Drawing
let canvas, ctxt;
const setupCanvas = async () => {
	canvas = document.getElementById('canvas');
	canvas.width = IMAGE_SIZE[0];
	canvas.height = IMAGE_SIZE[1];
	ctxt = canvas.getContext('2d');
	await redrawMap();
};

const drawVertex = (color, v) => {
	ctxt.fillStyle = color;
	ctxt.beginPath();

	ctxt.ellipse(...coordinatesToPixels(V[v]), VERTEX_RADIUS, VERTEX_RADIUS, 0, 0, 2 * Math.PI);
	ctxt.closePath();
	ctxt.fill();
};

const drawEdge = (color, [v, u]) => {
	ctxt.strokeStyle = color;
	ctxt.lineWidth = EDGE_WIDTH;
	ctxt.beginPath();
	ctxt.moveTo(...coordinatesToPixels(V[v]));
	ctxt.lineTo(...coordinatesToPixels(V[u]));
	ctxt.closePath();
	ctxt.stroke();
};

const redrawMap = () => {
	return new Promise(resolve => {
		const img = document.createElement('img');
		img.src = IMAGE_URL;

		img.onload = () => {
			ctxt.drawImage(img, ...IMAGE_OFFSET, ...IMAGE_SIZE, 0, 0, ...IMAGE_SIZE);
			E.forEach(e => drawEdge(EDGE_DEFAULT, e));
			resolve(null);
		};
	});
};

//? Dijkstra's / A*
let useAStar = false;
const findShortestPath = (src, dest) => {
	const compare = (a, b) => {
		let difference = a.distance - b.distance;
		if (useAStar) difference += distance(V[a.vertex], V[dest]) - distance(V[b.vertex], V[dest]);
		return difference;
	};

	const queue = new Heap(compare);
	const distances = Array(V.length).fill(Infinity);
	const paths = [];
	V.forEach(() => paths.push([]));

	queue.push({ vertex: src, distance: 0 });
	distances[src] = 0;

	let verticesVisited = 0;
	while (!queue.empty()) {
		const { vertex } = queue.pop();
		verticesVisited++;
		if (vertex === dest) break;

		adjList[vertex].forEach(([u, w]) => {
			drawEdge(EDGE_HIGHLIGHT, [vertex, u]);

			const newDistance = distances[vertex] + w;
			if (distances[u] <= newDistance) return;

			queue.push({ vertex: u, distance: newDistance });
			paths[u] = [...paths[vertex], [vertex, u, w]];
			distances[u] = newDistance;
		});
	}

	paths[dest].forEach(e => drawEdge(EDGE_FINAL, e));

	const text = `Vertices visited: ${verticesVisited}, distance: ${Math.round(paths[dest].reduce((distance, cur) => distance + cur[2], 0) * 100) / 100}`; // prettier-ignore
	document.getElementById('info').innerText = text;
};

//? Click handler
let lastPath = null,
	path = [];
const onClick = async event => {
	const x = event.pageX - canvas.offsetLeft;
	const y = event.pageY - canvas.offsetTop;
	if (x < 0 || y < 0 || x > IMAGE_SIZE[0] || y > IMAGE_SIZE[1]) return;

	if (path.length === 0) await redrawMap();

	const point = [x, y];
	const vertex = findClosestVertex(point);
	drawVertex(VERTEX_HIGHLIGHT, vertex);

	path.push(vertex);

	if (path.length < 2) return;

	findShortestPath(...path);
	lastPath = path;
	path = [];
};

//? Toggle algorithm
const onToggle = async event => {
	useAStar = !useAStar;
	event.target.innerText = useAStar ? 'A*' : "Dijkstra's";

	if (lastPath) {
		await redrawMap();
		drawVertex(VERTEX_HIGHLIGHT, lastPath[0]);
		drawVertex(VERTEX_HIGHLIGHT, lastPath[1]);
		findShortestPath(...lastPath);
	}
};

//? Setup
setup().then(() => {
	window.addEventListener('click', onClick);
	document.getElementById('toggleAlgorithm').addEventListener('click', onToggle);
});
