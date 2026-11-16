const express = require('express');
const Gun = require('gun');
const app = express();
const port = process.env.PORT || 8000;

app.use(Gun.serve);

const server = app.listen(port, () => {
    console.log(`VEXL Global Relay Server running on port ${port}`);
});

Gun({ web: server });``