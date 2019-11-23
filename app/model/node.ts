import { Document, Schema, model, Model, ClientSession } from "mongoose";

interface INode extends Document {
    description: string;
    height: number;

    rootNode: string;
    parentNode: string;
    children: string[];

    setParent(node: INode | null): Promise<INode | null>;
    removeChild(id: string): void;
    calibrateHeightRoot(root?: string): Promise<void>;
}

const NodeSchema: Schema = new Schema({
    description: { type: String, required: true },
    height: { type: Number },
    rootNode: { type: Schema.Types.ObjectId, ref: 'Node' },
    parentNode: { type: Schema.Types.ObjectId, ref: 'Node' },
    children: [{ type: Schema.Types.ObjectId, ref: 'Node' }]
});

NodeSchema.methods.setParent = function (node: INode | null): Promise<INode | null> {
    return new Promise(async (resolve, reject) => {

        let session: ClientSession = await Node.db.startSession();
        session.startTransaction();

        let previousRoot: INode | null = null;
        let parentNode: INode | null = null;

        if (this.parentNode) {
            try {
                parentNode = await Node.findById(this.parentNode);   
                if (parentNode) {
                    parentNode.removeChild(this._id);
                }
            } catch (err) {
                console.warn('Failed to find parent node\n', err);
            }        
        }

        // Check if the node we're changing to is null, if so then we set it as root
        // and add previous root as a child
        if (!node) {
            try {
                // Finding the previous root node
                previousRoot = await Node.findById(this.rootNode);
                if (previousRoot) {
                    previousRoot.parentNode = this._id;
                    this.children.push(previousRoot._id);
                }
            } catch (err) {
                console.warn('Failed to find previous root node\n', err);
            }

            this.parentNode = null;
            this.height = 0;
            this.rootNode = this._id;
        } else {
            this.parentNode = node._id;
            this.height = node.height + 1;
            node.children.push(this._id);
        }

        try {
            await this.save();
            if (node) {
                await node.save();
            }
            if (parentNode) {
                await parentNode.save();
            }
            if (previousRoot) {
                await previousRoot.save();
            }
            (this.rootNode === this._id) ? await this.calibrateHeightRoot(this._id) : await this.calibrateHeightRoot();
            await session.commitTransaction();
            session.endSession();
            resolve(parentNode);
        } catch (err) {
            console.error('Error saving files\n', err);
            await session.abortTransaction(); // Rollback
            session.endSession();
            reject(err);
        }
    });
}

NodeSchema.methods.removeChild = function (id: string) {
    const index = this.children.findIndex((childid: string) => childid === id);
    this.children.splice(index, 1);
}

NodeSchema.methods.calibrateHeightRoot = function (root?: string): Promise<void> {
    let recursiveSearch = async function (nodeID: string, height: number, root?: string): Promise<number> {
        return new Promise(async (resolve) => {
            let node: INode | null = await Node.findById(nodeID);
            if (node) {
                if (root) {
                    node.rootNode = root;
                }
                node.height = height;
                node.children.forEach(async (childID) => {
                    await recursiveSearch(childID, height + 1, root); 
                });
                await node.save();
                resolve();
            }
        });
    }
    
    return new Promise(async (resolve) => {
        await recursiveSearch(this._id, this.height, root);
        resolve();
    });
}

export const Node: Model<INode> = model<INode>("Node", NodeSchema);

export let swapParent = async function (childNodeId: string, parentNodeID: string | null): Promise<object> {
    return new Promise(async (resolve, reject) => {
        try {
            let main: INode | null = await Node.findById(childNodeId);
            if (main) {
                let result: any = {};

                let parent: INode | null = (parentNodeID) ? await Node.findById(parentNodeID) : null;
                let oldParent: INode | null = await main.setParent(parent);
                
                if (oldParent) {
                    result.oldParentNode = oldParent._id;
                }
                result.mainNode = main._id;
                result.parentNode = (parent) ? parent._id : null;
                resolve(result);
            }
            reject({
                error: 'Node not found!',
                message: 'childNodeId can\'t be found'
            });
        } catch (err) {
            reject({
                error: 'Failed to swap!',
                message: 'Child or parent node does not exist'
            });
        }
    });
}