import mongoose = require('mongoose');
import { ObjectId } from 'mongodb';
import { server } from '../app';
import { Node, INode } from '../model/node';
import { sessionalize } from '../helpers';
import { doesNotReject } from 'assert';

describe('Node', () => {

    beforeAll(async () => {
        const url = 'mongodb://mongo:27017/test';
        await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

        try {
            await Node.collection.drop();
        } catch (err) {
            // Ignore error as the collection might be just missing
        }
    });

    afterEach(async () => {
        try {
            await Node.collection.drop();
        } catch (err) {
            // Ignore error as the collection might be just missing
        }
    });

    afterAll(async () => {
        try {
            server.close();
            await mongoose.connection.close();
        } catch (err) {
            console.log(err);
        }
    });

    describe('Node', () => {

        describe('createNode', () => {

            test('should create a node', async (done) => {
                let description: string = 'Simple Node';
    
                try {
                    const {id} = await sessionalize(Node.createNode, description);
                    let node: INode | null = await Node.findById(id);
                    expect(node).not.toBeNull();
                    if (node) {
                        expect(node.id.toString()).toBe(id);
                        expect(node.description).toBe(description);
                        expect(node.rootNode.toString()).toBe(id);
                        expect(node.parentNode).toBeNull();
                        expect(node.height).toBe(0);
                    }
    
                } catch (err) {
                    fail(err);
                }
                done();
            });
    
            test('should create two nodes and make the second one as root', async (done) => {
                let description_1: string = 'Simple Node';
                let description_2: string = 'New Root Node';
    
                try {
                    const {id: id_1} = await sessionalize(Node.createNode, description_1);
                    const {id: id_2} = await sessionalize(Node.createNode, description_2);
    
                    let node_1: INode | null = await Node.findById(id_1);
                    let node_2: INode | null = await Node.findById(id_2);
    
                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
    
                    if (node_1 && node_2) {
                        expect(node_1.id.toString()).toBe(id_1);
                        expect(node_2.id.toString()).toBe(id_2);
    
                        expect(node_1.description).toBe(description_1);
                        expect(node_2.description).toBe(description_2);
    
                        expect(node_1.rootNode.toString()).toBe(id_2);
                        expect(node_2.rootNode.toString()).toBe(id_2);
    
                        expect(node_1.parentNode).not.toBeNull();
                        if (node_1.parentNode) {
                            expect(node_1.parentNode.toString()).toBe(id_2);
                        }
                        expect(node_2.parentNode).toBeNull();
    
                        expect(node_1.height).toBe(1);
                        expect(node_2.height).toBe(0);
                    }
    
                } catch (err) {
                    fail(err);
                }
                done();
            });
    
            test('should create two nodes and make the second one as root using a parentId parameter', async (done) => {
                let description_1: string = 'Simple Node';
                let description_2: string = 'New Root Node';
    
                try {
                    const {id: id_2} = await sessionalize(Node.createNode, description_2);
                    const {id: id_1} = await sessionalize(Node.createNode, description_1, id_2);
    
                    let node_1: INode | null = await Node.findById(id_1);
                    let node_2: INode | null = await Node.findById(id_2);
    
                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
    
                    if (node_1 && node_2) {
                        expect(node_1.id.toString()).toBe(id_1);
                        expect(node_2.id.toString()).toBe(id_2);
    
                        expect(node_1.description).toBe(description_1);
                        expect(node_2.description).toBe(description_2);
    
                        expect(node_1.rootNode.toString()).toBe(id_2);
                        expect(node_2.rootNode.toString()).toBe(id_2);
    
                        expect(node_1.parentNode).not.toBeNull();
                        if (node_1.parentNode) {
                            expect(node_1.parentNode.toString()).toBe(id_2);
                        }
                        expect(node_2.parentNode).toBeNull();
    
                        expect(node_1.height).toBe(1);
                        expect(node_2.height).toBe(0);
                    }
    
                } catch (err) {
                    fail(err);
                }
                done();
            });
        });
        
        describe('deleteNode', () => {

            test('should delete a node with a given id', async (done) => {
                const description_1: string = 'Simple Node';
                const description_2: string = 'Root Node';

                try {
                    const {id: id_2} = await sessionalize(Node.createNode, description_2)
                    const {id: id_1} = await sessionalize(Node.createNode, description_1, id_2);


                    let node = await sessionalize(Node.deleteNode, id_1);

                    let node_1 = await Node.findById(id_1);
                    let node_2 = await Node.findById(id_2);

                    expect(node.id.toString()).toBe(id_1);
                    expect(node_1).toBeNull();
                    expect(node_2).not.toBeNull();
                    if (node_2) {
                        expect(node_2.children.map((val) => val.toString())).not.toContain(id_1);
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on deleting a root node', async (done) => {
                let description: string = 'Simple Node';
                try {
                    const {id} = await sessionalize(Node.createNode, description);
                    let node: INode | null = await Node.findById(id);
    
                    expect(node).not.toBeNull();
    
                    try {
                        node = await sessionalize(Node.deleteNode, id);
                        fail('Didn\'t trigger error');
                    } catch (err) {
                        expect(err).not.toBeNull();
                        if (err) {
                            expect(err.error).toBe('Illegal action!');
                            expect(err.message).toBe('Can\'t delete root node, make another node root first');
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on deleting a non-existing node', async (done) => {
                const randomId: string = new ObjectId().toHexString();
                try {
                    await sessionalize(Node.createNode, 'Simple Node');
                    try {
                        await sessionalize(Node.deleteNode, randomId);
                        fail('Didn\'t trigger error');
                    } catch (err) {
                        expect(err).not.toBeNull();
                        if (err) {
                            expect(err.error).toBe('Failed to delete node!');
                            expect(err.message).toBe('Node was not found');
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on trying to delete a fake id', async (done) => {
                const randomId: string = 'e2e2fde';
                try {
                    await sessionalize(Node.createNode, 'Simple Node');
                    try {
                        await sessionalize(Node.deleteNode, randomId);
                        fail('Didn\'t trigger error');
                    } catch (err) {
                        expect(err).not.toBeNull();
                        if (err) {
                            expect(err.error).toBe('Failed to find Node!');
                            expect(err.message).toBe('Incorrect id format');
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });
        });

        describe('swapParent', () => {

            test('should swap a node with a new parent', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Root Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Child Node', node_1.id);
                    let node_3: INode | null = await sessionalize(Node.createNode, 'Lower Child Node', node_2.id);

                    await sessionalize(Node.swapParent, node_3.id, node_1.id);

                    node_1 = await Node.findById(node_1.id);
                    node_2 = await Node.findById(node_2.id);
                    node_3 = await Node.findById(node_3.id);
                    
                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
                    expect(node_3).not.toBeNull();

                    if (node_1 && node_2 && node_3) {

                        expect(node_1.height).toBe(0);
                        expect(node_2.height).toBe(1);
                        expect(node_3.height).toBe(1);

                        expect(node_1.children.map((val) => val.toString())).toContain(node_2.id);
                        expect(node_1.children.map((val) => val.toString())).toContain(node_3.id);
                        expect(node_2.children.map((val) => val.toString())).not.toContain(node_3.id);

                        expect(node_1.parentNode).toBeNull();
                        expect(node_2.parentNode).not.toBeNull();
                        expect(node_3.parentNode).not.toBeNull();

                        if (node_2.parentNode && node_3.parentNode) {
                            expect(node_2.parentNode.toString()).toBe(node_1.id);
                            expect(node_3.parentNode.toString()).toBe(node_1.id);
                        }

                        expect(node_1.rootNode).not.toBeNull();
                        expect(node_2.rootNode).not.toBeNull();
                        expect(node_3.rootNode).not.toBeNull();

                        if (node_1.rootNode && node_2.rootNode && node_3.rootNode) {
                            expect(node_1.rootNode.toString()).toBe(node_1.id);
                            expect(node_2.rootNode.toString()).toBe(node_1.id);
                            expect(node_3.rootNode.toString()).toBe(node_1.id);
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should swap the node with a new parent if node is root', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Root Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Child Node', node_1.id);

                    await sessionalize(Node.swapParent, node_1.id, node_2.id);

                    node_1 = await Node.findById(node_1.id);
                    node_2 = await Node.findById(node_2.id);
                    
                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();

                    if (node_1 && node_2) {

                        expect(node_1.height).toBe(1);
                        expect(node_2.height).toBe(0);

                        expect(node_1.children.map((val) => val.toString())).not.toContain(node_2.id);
                        expect(node_2.children.map((val) => val.toString())).toContain(node_1.id);

                        expect(node_1.parentNode).not.toBeNull();
                        expect(node_2.parentNode).toBeNull();

                        if (node_1.parentNode) {
                            expect(node_1.parentNode.toString()).toBe(node_2.id);
                        }

                        expect(node_1.rootNode).not.toBeNull();
                        expect(node_2.rootNode).not.toBeNull();

                        if (node_1.rootNode && node_2.rootNode) {
                            expect(node_1.rootNode.toString()).toBe(node_2.id);
                            expect(node_2.rootNode.toString()).toBe(node_2.id);
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should swap the node with a new parent if node is root and it\'s child is the new root', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Child Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Root Node', node_1.id);
                    let node_3: INode | null = await sessionalize(Node.createNode, 'Child Child Node', node_1.id);

                    await sessionalize(Node.swapParent, node_1.id, node_2.id);

                    node_1 = await Node.findById(node_1.id);
                    node_2 = await Node.findById(node_2.id);
                    node_3 = await Node.findById(node_3.id);
                    
                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
                    expect(node_3).not.toBeNull();

                    if (node_1 && node_2 && node_3) {

                        expect(node_1.height).toBe(1);
                        expect(node_2.height).toBe(0);
                        expect(node_3.height).toBe(2);

                        expect(node_1.children.map((val) => val.toString())).toContain(node_3.id);
                        expect(node_1.children.map((val) => val.toString())).not.toContain(node_2.id);
                        expect(node_2.children.map((val) => val.toString())).toContain(node_1.id);

                        expect(node_1.parentNode).not.toBeNull();
                        expect(node_2.parentNode).toBeNull();
                        expect(node_3.parentNode).not.toBeNull();

                        if (node_1.parentNode && node_3.parentNode) {
                            expect(node_1.parentNode.toString()).toBe(node_2.id);
                            expect(node_3.parentNode.toString()).toBe(node_1.id);
                        }

                        expect(node_1.rootNode).not.toBeNull();
                        expect(node_2.rootNode).not.toBeNull();
                        expect(node_3.rootNode).not.toBeNull();

                        if (node_1.rootNode && node_2.rootNode && node_3.rootNode) {
                            expect(node_1.rootNode.toString()).toBe(node_2.id);
                            expect(node_2.rootNode.toString()).toBe(node_2.id);
                            expect(node_3.rootNode.toString()).toBe(node_2.id);
                        }
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on a non-existing child id', async (done) => {
                const randomId: string = new ObjectId().toHexString();
                try {
                    await sessionalize(Node.swapParent, randomId, null);
                    fail('Did not trigger the non-existing child id error');
                } catch (err) {
                    expect(err.error).toBe('Node not found!');
                    expect(err.message).toBe('childNodeId can\'t be found');
                }
                done();
            });

            test('should fail on an incorrect id format', async (done) => {
                const randomId: string = 'gf234';
                try {
                    await sessionalize(Node.swapParent, randomId, null);
                    fail('Did not trigger the non-existing child id error');
                } catch (err) {
                    expect(err.error).toBe('Node not found!');
                    expect(err.message).toBe('Incorrect childId format');
                }
                done();
            });
        });

        // Because setParent is a subfunction of swapParent, there will be no tests on setting parents
        // rather tests checking for error triggers
        describe('setParent', () => {

            test('should throw an error when using a non-existing parent', async (done) => {
                const randomId: string = new ObjectId().toHexString();
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Root Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Child Node', node_1.id);

                    try {
                        await sessionalize(Node.swapParent, node_1.id, randomId);
                        fail('Did not trigger the non-existing parent error');
                    } catch (err) {
                        expect(err.error).toBe('Failed to find Node!');
                        expect(err.message).toBe('parentId not found');
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should throw an error when using an incorrect id format', async (done) => {
                const randomId: string = '5f43f';
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Root Node');
                    await sessionalize(Node.createNode, 'Child Node', node_1.id);

                    try {
                        await sessionalize(Node.swapParent, node_1.id, randomId);
                        fail('Did not trigger the non-existing parent error');
                    } catch (err) {
                        expect(err.error).toBe('Failed to find Node!');
                        expect(err.message).toBe('Incorrect parentId format');
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });
        });
    });
});