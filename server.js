const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "web")));
app.use("/graph", express.static(path.join(__dirname, "graph")));

app.listen(3000);
