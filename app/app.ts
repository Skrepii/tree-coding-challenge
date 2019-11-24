import express, { Request, Response, Application } from 'express';
import { Node } from './model/node';
import mongoose = require('mongoose');

const app: Application = express();
const PORT = process.env.PORT || 8080;
const mongoURL = process.env.MONGOURL || 'mongodb://mongo:27017/mongo';

// Parses incoming request bodies as JSON
app.use(express.json());

// Gives all available Nodes from the database
app.get('/', async (_, res: Response) => {
    try {
        res.json(await Node.find({}));
    } catch (err) {
        res.status(500).json({
            error: 'Nodes not found!',
            message: 'Make sure that the database is running'
        });
    }
});

/* 
    Searches for a node with a query id
    
    Example request:
    localhost:8080/node?id=5dd83a9fc308c0001f893d83

    - If found returns an JSON object with Node properties
    - If a node with a given 'id' is not found 'null' is returned
    - If an 'id' format is incorrect then error message is returned
*/
app.get('/node', async (req: Request, res: Response) => {
    const { id } = req.query;

    if (!id) {
        res.status(400).json({
            error: 'Missing parameters!',
            message: 'Make sure that key \'id\' is specified'
        });
        return;
    }

    try {
        res.json(await Node.findById(id).populate('children'));
    } catch (err) {
        res.status(400).json({
            error: 'Failed to find!',
            message: 'Incorrect id format'
        });
    }
});

/* 
    Creates a new node
    Requires POST JSON body with parameters description
        parentId is optional
    
    Example request:
    localhost:8080/node
    {
        'description': 'newest node',
	    'parentId': '5dd8381726fbce001e0ce3b5'
    }

    - If swap was successful then created node will be returned as JSON
    - If one 'parentId' will not be found or incorrect id format will be given 
        during a create an error message will be returned
*/
app.post('/node', async (req: Request, res: Response) => {
    const { description, parentId } = req.body;
    if (!description) {
        res.status(400).json({
            error: 'Missing parameters!',
            message: 'Make sure that key \'description\' is specified'
        });
        return;
    }

    try {
        res.json(await Node.createNode(description, parentId));
    } catch (err) {
        res.status(400).json(err);
    }
});

/* 
    Deletes a node
    Requires DELETE JSON body with parameters description
        parentId is optional
    
    Example request:
    localhost:8080/node
    {
	    'nodeId': '5dd8381726fbce001e0ce3b5'
    }

    - If delete was successful then deleted node will be returned as JSON
    - If one 'nodeId' will not be found or incorrect id format will be given 
        during a delete an error message will be returned
*/
app.delete('/node', async (req: Request, res: Response) => {
    const { nodeId } = req.body;
    if (!nodeId) {
        res.status(400).json({
            error: 'Missing parameters!',
            message: 'Make sure that key \'nodeId\' is specified'
        });
        return;
    }

    try {
        res.json(await Node.deleteNode(nodeId));
    } catch (err) {
        res.status(400).json(err);
    }
});

/* 
    Swaps parentNode for a node
    Requires POST JSON body with parameters childId
        parentId is optional
    
    Example search:
    localhost:8080/node/swap
    {
        'childId': '5dd8381726fbce001e0ce3b7',
	    'parentId': '5dd8381726fbce001e0ce3b5'
    }

    - If swap was successful then 'mainNodeId', 'parentNode', 'oldParentNodeId' (if exists) 
        will be returned as JSON object
    - If one of the nodes will not be found or incorrect id format will be given 
        during a swap an error message will be returned
*/
app.post('/node/swap', async (req: Request, res: Response) => {
    const { childId, parentId } = req.body;
    if (!childId) {
        res.status(400).json({
            error: 'Missing parameters!',
            message: 'Make sure that key \'childId\' is specified'
        });
        return;
    }

    try {
        res.json(await Node.swapParent(childId, parentId));
    } catch (err) {
        res.status(400).json(err);
    }
});

app.listen(PORT, async () => {
    try {
        await mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
        if (process.env.POPULATE_DB === 'true') {
            await populateDatabase();
        }
    } catch (err) {
        console.error('Failed to connect to mongoDB server\n', err);
    }
    console.log('Listening on port:', PORT)
});

async function populateDatabase () {
    try {
        await Node.collection.drop();
    } catch (err) {
        console.warn('Collection doesn\'t exist. Not dropping database.');
    }

    let root = new Node();
    root.description = 'root';
    root.height = 0;
    await root.save();

    let node_1 = new Node();
    node_1.description = 'a';

    let node_2 = new Node();
    node_2.description = 'c';

    let node_3 = new Node();
    node_3.description = 'd';

    await node_1.setParent(root._id);
    await node_2.setParent(node_1._id);
    await node_3.setParent(node_2._id);
    
    await root.calibrateHeightRoot(root._id);

    console.log('Database populated...');
}