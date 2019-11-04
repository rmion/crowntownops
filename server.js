const express = require('express');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 5000
const path = require('path');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));