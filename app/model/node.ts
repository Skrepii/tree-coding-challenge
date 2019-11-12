import { Document, Schema, model, Model } from "mongoose";

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
    return new Promise(async (resolve) => {
        let parentNode: INode | null = null;
        if (node) {
            if (this.parentNode) {
                parentNode = await Node.findById(this.parentNode);
                if (parentNode) {
                    parentNode.removeChild(this._id);
                }
            }
            this.parentNode = node._id;
            node.children.push(this._id);
        }
        resolve(parentNode);
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

export let swapParent = async function (mainNodeID: string, parentNodeID: string): Promise<object> {
    return new Promise(async (resolve) => {
        let message: any = {
            description: 'Failed to swap'
        };
        let main: INode | null = await Node.findById(mainNodeID);
        let parent: INode | null = await Node.findById(parentNodeID);
        if (main && parent) {
            let oldParent: INode | null = await main.setParent(parent);
            if (oldParent) {
                oldParent.save();
                message.oldParentNode = oldParent._id;
            }
            main.height = parent.height + 1;
            await main.save();
            await parent.save();

            await main.calibrateHeightRoot();

            message.description = 'Swap successful'
            message.mainNode = main._id;
            message.parentNode = parent._id;
        }
        resolve(message);
    });
}