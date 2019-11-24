import { Document, Schema, model, Model, ClientSession } from "mongoose";

interface INode extends Document {
    description: string;
    height: number;

    rootNode: string;
    parentNode: string;
    children: string[];

    setParent(nodeId: string | null): Promise<INode | null>;
    removeChild(id: string): void;
    calibrateHeightRoot(root?: string): Promise<void>;
}

interface INodeModel extends Model<INode> {
    createNode(description: string, parentNodeId?: string): Promise<INode>;
    deleteNode(nodeId: string): Promise<INode>;
    swapParent(childNodeId: string, parentNodeId: string | null): Promise<object>;
}

const NodeSchema: Schema = new Schema({
    description: { type: String, required: true },
    height: { type: Number },
    rootNode: { type: Schema.Types.ObjectId, ref: 'Node' },
    parentNode: { type: Schema.Types.ObjectId, ref: 'Node' },
    children: [{ type: Schema.Types.ObjectId, ref: 'Node' }]
});

NodeSchema.methods.setParent = function (nodeId: string | null): Promise<INode | null> {
    return new Promise(async (resolve, reject) => {

        let session: ClientSession = await Node.db.startSession();
        session.startTransaction();

        let previousRoot: INode | null = null;
        let parentNode: INode | null = null;
        let node: INode | null = null;

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
        if (!nodeId) {
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
            try {
                node = await Node.findById(nodeId);
                if (node) {
                    this.parentNode = node._id;
                    this.height = node.height + 1;
                    node.children.push(this._id);
                }
            } catch (err) {
                console.error('Failed to find new parent node\n', err);
                await session.abortTransaction();
                session.endSession();
                reject({
                    error: 'Failed to find!',
                    message: 'Failed to find node with id of nodeId'
                });
                return;
            }
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
            resolve(parentNode);
        } catch (err) {
            console.error('Error saving files\n', err);
            await session.abortTransaction(); // Rollback
            reject(err);
        }
        session.endSession();
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

NodeSchema.statics.createNode = async function (description: string, parentNodeId: string | null): Promise<INode> {
    return new Promise(async (resolve, reject) => {
        let session: ClientSession = await Node.db.startSession();
        session.startTransaction();

        let node: INode = new Node();
        node.description = description;
        
        try {
            await node.setParent(parentNodeId);
            let savedNode = await node.save();

            if (!parentNodeId) {
                let previousRoot: INode | null = await Node.findOne({parentNode: null});
                if (previousRoot) {
                    previousRoot.setParent(savedNode._id);
                }
            }
            await session.commitTransaction();
            resolve(savedNode);
        } catch (err) {
            console.error('Failed to save Node\n', err);
            await session.abortTransaction();
            reject({
                error: 'Failed to create Node!',
                message: 'parentId not found'
            });
        }
        session.endSession();
    });
}

NodeSchema.statics.deleteNode = async function (nodeId: string): Promise<INode> {
    return new Promise(async (resolve, reject) => {
        let session: ClientSession = await Node.db.startSession();
        session.startTransaction();

        try {
            let node: INode | null = await Node.findById(nodeId);
            let parentNode: INode | null = null;
            if (node) {
                if (node.rootNode === node._id) {
                    reject({
                        error: 'Illegal action!',
                        message: 'Can\'t delete root node, make another node root first'
                    });
                    return;
                }

                const parentParentNodeId: string = node.parentNode;
                if (parentParentNodeId) {
                    parentNode = await Node.findById(parentParentNodeId);
                    if (parentNode) {
                        parentNode.removeChild(nodeId);
                    }
                }

                node.children.forEach(async (childId: string) => {
                    let child: INode | null = await Node.findById(childId);
                    if (child) {
                        await child.setParent(parentParentNodeId);
                    }
                });
                
                await node.remove();
                if (parentNode) {
                    await parentNode.save();
                }
                await session.commitTransaction();
                resolve(node);
            } else {
                await session.abortTransaction();
                reject({
                    error: 'Failed to delete node!',
                    message: 'Node was not found'
                });
            }
        } catch (err) {
            await session.abortTransaction();
            console.warn('Failed to delete node\n', err);
            reject({
                error: 'Failed to delete node!',
                message: 'Node could not be deleted'
            });
        }
        session.endSession();
    });
}

NodeSchema.statics.swapParent = async function (childNodeId: string, parentNodeId: string | null): Promise<object> {
    return new Promise(async (resolve, reject) => {
        try {
            let main: INode | null = await Node.findById(childNodeId);
            if (main) {
                let result: any = {};
                let oldParent: INode | null = await main.setParent(parentNodeId);
                
                if (oldParent) {
                    result.oldParentNode = oldParent._id;
                }
                result.mainNode = main._id;
                result.parentNode = parentNodeId;
                resolve(result);
                return;
            }
            reject({
                error: 'Node not found!',
                message: 'childNodeId can\'t be found'
            });
        } catch (err) {
            console.warn('Error in swapping parent\n', err);
            reject({
                error: 'Failed to swap!',
                message: 'Child or parent node does not exist'
            });
        }
    });
}

export const Node = model<INode, INodeModel>("Node", NodeSchema);
