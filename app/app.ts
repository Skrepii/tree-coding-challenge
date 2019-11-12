import express = require('express');
import { Node, swapParent } from './model/node';
import mongoose = require('mongoose');

const app: express.Application = express();
const PORT: number = 8080;

app.get('/', async (_, res) => {
    res.json(await Node.find({}));
});

app.get('/:id', async (req, res) => {
    res.json(await Node.findById(req.params['id']).populate('children'));
});

app.get('/:id1/toparent/:id2', async (req, res) => {
    res.json(await swapParent(req.params['id1'], req.params['id2']));
})

app.listen(PORT, async () => {
    await mongoose.connect('mongodb://mongo:27017/mongo', { useNewUrlParser: true, useUnifiedTopology: true });
    if (process.env.POPULATE_DB === 'true') {
        await populateDatabase();
    }
    console.log('Listening on port:', PORT)
});

async function populateDatabase () {
    Node.collection.drop();

    let root = new Node();
    root.description = 'root';
    root.height = 0;

    let node_1 = new Node();
    node_1.description = 'a';

    let node_2 = new Node();
    node_2.description = 'c';

    let node_3 = new Node();
    node_3.description = 'd';

    await node_1.setParent(root);
    await node_2.setParent(node_1);
    await node_3.setParent(node_2);

    await root.save();
    await node_1.save();
    await node_2.save();
    await node_3.save();
    
    await root.calibrateHeightRoot(root._id);

    console.log('Database populated...');
}