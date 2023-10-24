//? Priority queue
class Heap {
	constructor(compare) {
		this._arr = [];
		this._compare = compare;
	}

	empty = () => this._arr.length === 0;

	push(value) {
		this._arr.push(value);

		let currentIndex = this._arr.length - 1;
		while (currentIndex > 0) {
			const parentIndex = Math.floor((currentIndex - 1) / 2);
			if (!this._compare(this._arr[parentIndex], this._arr[currentIndex])) break;

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

		let index = 0;
		while (true) {
			let largestIndex = index;
			const leftIndex = index * 2 + 1;
			const rightIndex = index * 2 + 2;

			if (leftIndex < this._arr.length && this._compare(this._arr[leftIndex], this._arr[largestIndex])) largestIndex = leftIndex;
			if (rightIndex < this._arr.length && this._compare(this._arr[rightIndex], this._arr[largestIndex])) largestIndex = rightIndex;

			if (largestIndex === index) break;

			const temp = this._arr[index];
			this._arr[index] = this._arr[largestIndex];
			this._arr[largestIndex] = temp;
			index = largestIndex;
		}

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
const toRadians = degrees => (degrees / 180) * Math.PI;

const distance = (p1, p2) => {
	const lat1 = toRadians(p1[0]);
	const long1 = toRadians(p1[1]);
	const lat2 = toRadians(p2[0]);
	const long2 = toRadians(p2[1]);

	const dlong = long2 - long1;
	const dlat = lat2 - lat1;

	let ans = Math.pow(Math.sin(dlat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlong / 2), 2);
	ans = 12742 * Math.asin(Math.sqrt(ans));

	return ans;
};

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
	return data.split('\n').map(element =>
		element
			.split(' ')
			.slice(1)
			.map(n => Number(n))
	);
};

//* Fetching the data and creating adjacency list
let V, E, adjList;
const setup = async () => {
	V = await fetchAndParse(VERTICES_URL);
	E = await fetchAndParse(EDGES_URL);

	adjList = [];
	E.forEach(([v, u]) => {
		if (!adjList[v]) adjList[v] = [];
		if (!adjList[u]) adjList[u] = [];
		const w = distance(V[v], V[u]);
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
		return difference < 0;
	};

	const queue = new Heap(compare);
	const distances = Array(V.length).fill(Infinity);
	const previous = Array(V.length).fill(-1);

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
			previous[u] = vertex;
			distances[u] = newDistance;
		});
	}

	let totalDistance = 0;
	for (let prev = previous[previous[dest]], cur = previous[dest]; cur != -1; prev = cur, cur = previous[cur]) {
		totalDistance += distance(V[prev], V[cur]);
		drawEdge(EDGE_FINAL, [prev, cur]);
	}

	const text = `Vertices visited: ${verticesVisited}, distance: ${Math.round(totalDistance * 100) / 100}`; // prettier-ignore
	document.getElementById('info').innerText = text;
};

//? Click handler
let lastPath = null;
let path = [];
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
		document.getElementById('info').innerText = 'LOADING';
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
