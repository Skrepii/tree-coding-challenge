import { Document, Schema, model, Model, ClientSession } from "mongoose";
import { rejects } from "assert";
import { resolve } from "dns";

export interface INode extends Document {
    description: string;
    height: number;

    rootNode: string;
    parentNode: string | null;
    children: string[];

    setParent(nodeId?: string): Promise<INode>;
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

NodeSchema.methods.setParent = function (parentId?: string): Promise<INode> {
    return new Promise(async (resolve, reject) => {

        let previousRoot: INode | null = null;
        let oldParentNode: INode | null = null;
        let newParentNode: INode | null = null;
        let parentParent: INode | null = null;

        if (this.parentNode) {
            try {
                oldParentNode = await Node.findById(this.parentNode);   
                if (oldParentNode) {
                    oldParentNode.removeChild(this._id);
                }
            } catch (err) {
                reject({
                    error: 'Failed to find parent node!',
                    message: 'parent node not found'
                });
                return;
            }        
        }

        // Check if the node we're changing to is null, if so then we set it as root
        // and add previous root as a child
        if (!parentId) {
            try {
                // Finding the previous root node
                previousRoot = await Node.findById(this.rootNode);
                if (previousRoot && previousRoot._id !== this._id) {
                    previousRoot.parentNode = this._id;
                    this.children.push(previousRoot._id);
                }
            } catch (err) {
                reject({
                    error: 'Failed to find!',
                    message: 'Something serious happened if you got here'
                });
                return;
            }

            this.parentNode = null;
            this.height = 0;
            this.rootNode = this._id;
        } else {
            try {
                newParentNode = await Node.findById(parentId);
                if (newParentNode) {
                    if (this.height >= 0 && this.height < newParentNode.height) {

                        parentParent = await findChildParent(this as INode, parentId);
                        if (parentParent) {
                            if (parentParent.id == newParentNode.id) {
                                parentParent = newParentNode;
                            }

                            parentParent.parentNode = this.parentNode;
                            if (oldParentNode) {
                                oldParentNode.children.push(parentParent.id);
                                parentParent.rootNode = oldParentNode.rootNode;
                            } else {
                                parentParent.rootNode = parentParent.id;
                            }

                            parentParent.height = this.height;
                            this.removeChild(parentParent.id);
                        }
                        
                        newParentNode.height = this.height;
                    }

                    newParentNode.children.push(this.id);
                    this.parentNode = newParentNode.id;
                    this.height = newParentNode.height + 1;
                    this.rootNode = newParentNode.rootNode;
                } else {
                    reject({
                        error: 'Failed to find Node!',
                        message: 'parentId not found'
                    });
                    return;
                }
            } catch (err) {
                reject({
                    error: 'Failed to find Node!',
                    message: 'Incorrect parentId format'
                });
                return;
            }
        }

        try {
            await this.save();

            if (parentParent) {
                parentParent = await parentParent.save();
            }
            if (newParentNode) {
                newParentNode = await newParentNode.save();
            }
            if (oldParentNode) {
                oldParentNode = await oldParentNode.save();
            }
            if (previousRoot) {
                previousRoot = await previousRoot.save();
            }
            (parentParent) ? await heightRoot(parentParent) : (newParentNode) ? await heightRoot(newParentNode) : await heightRoot(this as INode);
            resolve(this as INode);
        } catch (err) {
            reject(err);
        }
    });
}

NodeSchema.methods.removeChild = function (id: string) {
    const index = this.children.findIndex((childid: string) => childid == id);
    if (index > -1) {
        this.children.splice(index, 1);
    }
}

NodeSchema.statics.createNode = async function (description: string, parentNodeId?: string): Promise<INode> {
    return new Promise(async (resolve, reject) => {
        let newNode: INode = new Node();
        newNode.description = description;
        try {
            resolve(await newNode.setParent(parentNodeId));
        } catch (err) {
            reject(err);
        }
    });
}

NodeSchema.statics.deleteNode = async function (id: string): Promise<INode> {
    return new Promise(async (resolve, reject) => {
        let node: INode | null = null;
        let parentNode: INode | null = null;

        try {
            node = await Node.findById(id);
        } catch (err) {
            reject({
                error: 'Failed to find Node!',
                message: 'Incorrect id format'
            });
            return;
        }

        try {
            if (node) {
                if (node.rootNode === node._id) {
                    reject({
                        error: 'Illegal action!',
                        message: 'Can\'t delete root node, make another node root first'
                    });
                    return;
                }

                const parentParentNodeId: string | null = node.parentNode;
                if (parentParentNodeId) {
                    parentNode = await Node.findById(parentParentNodeId);
                    if (parentNode) {
                        parentNode.removeChild(id);
                    }

                    node.children.forEach(async (childId: string) => {
                        let child: INode | null = await Node.findById(childId);
                        if (child) {
                            await child.setParent(parentParentNodeId);
                        }
                    });
                }
                
                await node.remove();
                if (parentNode) {
                    await parentNode.save();
                }
                resolve(node);
            } else {
                reject({
                    error: 'Failed to delete node!',
                    message: 'Node was not found'
                });
            }
        } catch (err) {
            reject({
                error: 'Failed to delete node!',
                message: 'Node could not be deleted'
            });
        }
    });
}

NodeSchema.statics.swapParent = async function (childNodeId: string, parentNodeId?: string ): Promise<object> {
    return new Promise(async (resolve, reject) => {
        try {
            let childNode: INode | null = await Node.findById(childNodeId);
            if (childNode) {
                resolve(await childNode.setParent(parentNodeId));
                return;
            }
            reject({
                error: 'Node not found!',
                message: 'childNodeId can\'t be found'
            });
        } catch (err) {
            reject(err);
        }
    });
}

export const Node = model<INode, INodeModel>("Node", NodeSchema);

async function recursiveHeightRoot(nodeId: string, height: number, root: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            let node: INode | null = await Node.findById(nodeId);
            if (node) {
                node.rootNode = root;
                node.height = height;
                await node.save();
                
                if (node.children.length < 1) {
                    resolve();
                }
                await Promise.all(node.children.map(async (childId) => await recursiveHeightRoot(childId.toString(), height + 1, root))).then(() => {resolve()});
            }
        } catch (err) {
            reject(err);
        }
    });
}

export async function heightRoot(node: INode) {
    await recursiveHeightRoot(node.id, node.height, node.rootNode);
}

async function recursiveFindChildParent(currentNode: string, childNode: string): Promise<INode | null> {
    return new Promise(async (resolve, reject) => {
        try {
            let node: INode | null = await Node.findById(childNode);
            if (node) {
                // need to use toString() to 
                if (node.parentNode && node.parentNode.toString() == currentNode) {
                    resolve(node);
                    return;
                }

                if (!node.parentNode) {
                    resolve(null);
                    return;
                }

                resolve(await recursiveFindChildParent(currentNode, node.parentNode));
            }
        } catch (err) {
            reject(err);
        }
    });
}

export async function findChildParent(node: INode, childNode: string): Promise<INode | null> {
    return await recursiveFindChildParent(node.id, childNode);
}