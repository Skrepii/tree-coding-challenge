import mongoose = require('mongoose');
import { ObjectId, IndexOptions } from 'mongodb';
import request from 'supertest';
import { server } from '../app';
import { Node, INode } from '../model/node';
import { sessionalize } from '../helpers';

describe('API', () => {

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

    describe('/node', () => {

        describe('GET', () => {
    
            test('should find a node with an id', async (done) => {
                let description: string = 'Simple Node';

                try {
                    const {id} = await sessionalize(Node.createNode, description);

                    const res = await request(server)
                    .get(`/node?id=${id}`);

                    expect(res.status).toBe(200);
                    expect(res.body.description).toBe(description);
                    expect(res.body._id).toBe(id);

                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should return null if a node with id was not found', async (done) => {
                const randomid = new ObjectId().toHexString();
                
                try {
                    const res = await request(server)
                    .get(`/node?id=${randomid}`);

                    expect(res.status).toBe(200);
                    expect(res.body).toBeNull();
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on incorrect id format', async (done) => {
                let description: string = 'Simple Node';
                let badId: string = 'h2hs5';

                try {
                    await sessionalize(Node.createNode, description);

                    const res = await request(server)
                    .get(`/node?id=${badId}`);

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Failed to find!');
                    expect(res.body.message).toBe('Incorrect id format');

                } catch (err) {
                    fail(err);
                }
                done();
            });
            
            test('should fail on missing id', async (done) => {
                let description: string = 'Simple Node';

                try {
                    await sessionalize(Node.createNode, description);
                    const res = await request(server)
                    .get(`/node`);

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Missing parameters!');
                    expect(res.body.message).toBe('Make sure that key \'id\' is specified');

                } catch (err) {
                    fail(err);
                }
                done();
            });
        });

        describe('POST', () => {
    
            test('should create a node with description', async (done) => {
                const value: string = 'Simple Node';
                try {
                    const res = await request(server)
                    .post('/node')
                    .send({
                        description: value
                    });
    
                    expect(res.status).toBe(200);
                    expect(res.body.description).toBe(value);
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });
    
            test('should fail on a incorrect parentId format', async (done) => {
                const value: string = 'Simple Node';
                const randomId: string = new ObjectId().toHexString().slice(0, 5);
                
                try {
                    const res = await request(server)
                    .post('/node')
                    .send({
                        description: value,
                        parentId: randomId
                    });

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Failed to find Node!');
                    expect(res.body.message).toBe('Incorrect parentId format');
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on a non-existing parent id', async (done) => {
                const value: string = 'Simple Node';
                const randomId: string = new ObjectId().toHexString();
                
                try {
                    const res = await request(server)
                    .post('/node')
                    .send({
                        description: value,
                        parentId: randomId
                    });

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Failed to find Node!');
                    expect(res.body.message).toBe('parentId not found');
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on missing description', async (done) => {
                try {
                    const res = await request(server).post('/node');
    
                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Missing parameters!');

                } catch (err) {
                    fail(err);
                }
                done();
            });
    
        });
    
        describe('DELETE', () => {
    
            test('should delete a node with id', async (done) => {
                const description: string = 'Simple Node';
                try {
                    const {id} = await sessionalize(Node.createNode, description);

                    const res = await request(server)
                    .delete('/node')
                    .send({
                        id
                    });
    
                    expect(res.status).toBe(200);
                    expect(res.body.description).toBe(description);
                    expect(res.body._id).toBe(id);
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on a incorrect id format', async (done) => {
                try {
                    const id: string = new ObjectId().toHexString().slice(0, 5);

                    const res = await request(server)
                    .delete('/node')
                    .send({
                        id
                    });
    
                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Failed to find Node!');
                    expect(res.body.message).toBe('Incorrect id format');
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on non-existant node id', async (done) => {
                try {
                    const id: string = new ObjectId().toHexString();

                    const res = await request(server)
                    .delete('/node')
                    .send({
                        id
                    });

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Failed to delete node!');
                    expect(res.body.message).toBe('Node was not found');
                    
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on missing id', async (done) => {
                try {
                    const res = await request(server).delete('/node');
    
                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Missing parameters!');

                } catch (err) {
                    fail(err);
                }
                done();
            });
    
        });

        describe('PUT', () => {

            test('should swap the node with a new parent', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Root Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Child Node', node_1.id);
                    let node_3: INode | null = await sessionalize(Node.createNode, 'Lower Child Node', node_2.id);

                    node_1 = await Node.findById(node_1.id);
                    node_2 = await Node.findById(node_2.id);

                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
                    expect(node_3).not.toBeNull();

                    if (node_1 && node_2 && node_3 
                        && node_1.children && node_2.children
                        && node_2.parentNode && node_3.parentNode) {
                        expect(node_1.parentNode).toBeNull();
                        expect(node_2.parentNode.toString()).toBe(node_1.id);
                        expect(node_3.parentNode.toString()).toBe(node_2.id);

                        expect(node_1.height).toBe(0);
                        expect(node_2.height).toBe(1);
                        expect(node_3.height).toBe(2);

                        // Need to specify toString() to not trigger 'serializes to the same string error'
                        expect(node_1.children.map((val) => val.toString())).toContain(node_2.id);
                        expect(node_2.children.map((val) => val.toString())).toContain(node_3.id);

                        const res = await request(server)
                        .put('/node')
                        .send({
                            childId: node_3.id,
                            parentId: node_1.id
                        });

                        expect(res.status).toBe(200);
                        expect(res.body._id.toString()).toBe(node_3.id);
                        expect(res.body.height).toBe(1);
                        expect(res.body.parentNode.toString()).toBe(node_1.id);
                        expect(res.body.rootNode.toString()).toBe(node_1.id);
                    } else {
                        fail('Node not found');
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should swap the node with a new parent if node is root', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Child Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Root Node', node_1.id);

                    node_1 = await Node.findById(node_1.id);

                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();

                    if (node_1 && node_2 && node_2.parentNode) {
                        expect(node_1.height).toBe(0);
                        expect(node_2.height).toBe(1);

                        // Need to specify toString() to not trigger 'serializes to the same string error'
                        expect(node_1.children.map((val) => val.toString())).toContain(node_2.id);
                        expect(node_2.parentNode.toString()).toBe(node_1.id);

                        const res = await request(server)
                        .put('/node')
                        .send({
                            childId: node_1.id,
                            parentId: node_2.id
                        });

                        expect(res.status).toBe(200);
                        expect(res.body._id.toString()).toBe(node_1.id);
                        expect(res.body.height).toBe(1);
                        expect(res.body.parentNode.toString()).toBe(node_2.id);
                        expect(res.body.rootNode.toString()).toBe(node_2.id);
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should swap the node with a new parent if node is root', async (done) => {
                try {
                    let node_1: INode | null = await sessionalize(Node.createNode, 'Child Node');
                    let node_2: INode | null = await sessionalize(Node.createNode, 'Root Node', node_1.id);
                    let node_3: INode | null = await sessionalize(Node.createNode, 'Child Child Node', node_1.id);

                    node_1 = await Node.findById(node_1.id);

                    expect(node_1).not.toBeNull();
                    expect(node_2).not.toBeNull();
                    expect(node_3).not.toBeNull();

                    if (node_1 && node_2 && node_3 
                        && node_2.parentNode && node_3.parentNode) {
                        expect(node_1.height).toBe(0);
                        expect(node_2.height).toBe(1);
                        expect(node_3.height).toBe(1);

                        // Need to specify toString() to not trigger 'serializes to the same string error'
                        expect(node_1.children.map((val) => val.toString())).toContain(node_2.id);
                        expect(node_1.children.map((val) => val.toString())).toContain(node_3.id);
                        expect(node_2.parentNode.toString()).toBe(node_1.id);
                        expect(node_3.parentNode.toString()).toBe(node_1.id);

                        const res = await request(server)
                        .put('/node')
                        .send({
                            childId: node_1.id,
                            parentId: node_2.id
                        });
                        
                        expect(res.status).toBe(200);
                        expect(res.body._id.toString()).toBe(node_1.id);
                        expect(res.body.height).toBe(1);
                        expect(res.body.parentNode.toString()).toBe(node_2.id);
                        expect(res.body.rootNode.toString()).toBe(node_2.id);
                    }
                } catch (err) {
                    fail(err);
                }
                done();
            });

            test('should fail on missing childId', async (done) => {
                try {
                    const node = await sessionalize(Node.createNode, 'Child Node');
                    expect(node).not.toBeNull();

                    const res = await request(server)
                    .put('/node')
                    .send({
                        parentId: node.id
                    });

                    expect(res.status).toBe(400);
                    expect(res.body.error).toBe('Missing parameters!');
                    expect(res.body.message).toBe('Make sure that key \'childId\' is specified');
                } catch (err) {
                    fail(err);
                }
                done();
            });
        });

    });
});