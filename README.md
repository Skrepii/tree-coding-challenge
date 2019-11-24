# Tree coding challenge

## Setup guide

1. Install [Docker](https://docs.docker.com/v17.09/engine/installation/#desktop)
2. Install [docker-compose](https://docs.docker.com/compose/install/)
3. Clone this repository
4. Under cloned repositories directory run
    ```
        docker-compose up -d --build
    ```
5. Now it's up and running!
   
    5.1. If you're using Mac or Linux then you can access it under localhost


    5.2. If you're using Windows then you need to use a dedicated IP from docker, it can be found using
    ```
    docker-machine ip
    ```

---

## Available Enpoints

## Get all nodes : `GET /`

### Success Response

**Code** : `200 OK`

```json
[
    {
        "children": [
            "5ddaada5d6f7c9001edde932"
        ],
        "_id": "5ddaada5d6f7c9001edde931",
        "description": "root",
        "height": 0,
        "__v": 1,
        "rootNode": "5ddaada5d6f7c9001edde931"
    },
    {
        "children": [],
        "_id": "5ddaada5d6f7c9001edde932",
        "description": "a",
        "parentNode": "5ddaada5d6f7c9001edde931",
        "height": 1,
        "__v": 1,
        "rootNode": "5ddaada5d6f7c9001edde931"
    }
]
```

---

## Get a node with its descendants : `GET /node?id=nodeId`

### Success Response

**Code** : `200 OK`

```json
{
    "children": [
        {
            "children": [
                "5ddaada5d6f7c9001edde933"
            ],
            "_id": "5ddaada5d6f7c9001edde932",
            "description": "a",
            "parentNode": "5ddaada5d6f7c9001edde931",
            "height": 1,
            "__v": 1,
            "rootNode": "5ddaada5d6f7c9001edde931"
        }
    ],
    "_id": "5ddaada5d6f7c9001edde931",
    "description": "root",
    "height": 0,
    "__v": 1,
    "rootNode": "5ddaada5d6f7c9001edde931"
}
```

### Error Resonse

**Code** : `400 Bad Request`

If `id` is missing then an error JSON will be sent back with

```json
{
    "error": "Missing parameters!",
    "message": "Make sure that key 'id' is specified"
}
```

If `id` is in incorrect format then an error JSON will be sent back with

```json
{
    "error": "Failed to find!",
    "message": "Incorrect id format"
}
```

---



## Create a node : `POST /node`

### Example request

```json
{
	"description": "new node",
	"parentId": "5ddaada5d6f7c9001edde931"
}
```
- It is possible to create a new root node by not specifying a parentId

### Success Response

**Code** : `200 OK`

```json
{
    "children": [],
    "_id": "5ddab135d6f7c9001edde936",
    "description": "new node",
    "parentNode": "5ddaada5d6f7c9001edde931",
    "height": 2,
    "__v": 0
}
```

### Error Resonse

**Code** : `400 Bad Request`

If `description` is missing then an error JSON will be sent back with

```json
{
    "error": "Missing parameters!",
    "message": "Make sure that key 'description' is specified"
}
```

If `parentId` is in incorrect format or doesn't exist then an error JSON will be sent back with

```json
{
    "error": "Failed to create Node!",
    "message": "parentId not found"
}
```

---

## Delete a node : `DELETE /node`

### Example request

```json
{
	"nodeId": "5ddab2894d6d1d002344fce3"
}
```

### Success Response

**Code** : `200 OK`

```json
{
    "children": [],
    "_id": "5ddab2894d6d1d002344fce3",
    "description": "d",
    "parentNode": "5ddab2894d6d1d002344fce2",
    "height": 3,
    "__v": 0,
    "rootNode": "5ddab2894d6d1d002344fce0"
}
```

### Error Resonse

**Code** : `400 Bad Request`

If `nodeId` is missing then an error JSON will be sent back with

```json
{
    "error": "Missing parameters!",
    "message": "Make sure that key 'nodeId' is specified"
}
```

If `nodeId` is in incorrect format then an error JSON will be sent back with

```json
{
    "error": "Failed to delete node!",
    "message": "Node could not be deleted"
}
```

If `nodeId` is not found then an error JSON will be sent back with

```json
{
    "error": "Failed to delete node!",
    "message": "Node was not found"
}
```

---

## Change nodes parent : `POST /node/swap`

### Example request

```json
{
	"childId": "5ddab7f3e75f4c002386c5c4",
	"parentId": "5ddab7f3e75f4c002386c5c1"
}
```
- It is possible to swap as the new root node by not specifying a parentId
  
### Success Response

**Code** : `200 OK`

```json
{
    "oldParentNode": "5ddab7f3e75f4c002386c5c3",
    "mainNode": "5ddab7f3e75f4c002386c5c4",
    "parentNode": "5ddab7f3e75f4c002386c5c1"
}
```

### Error Resonse

**Code** : `400 Bad Request`

If `childId` is missing then an error JSON will be sent back with

```json
{
    "error": "Missing parameters!",
    "message": "Make sure that key 'childId' is specified"
}
```

If node with `childId` is not found then an error JSON will be sent back with
```json
{
    "error": "Node not found!",
    "message": "childNodeId can't be found"
}
```

If `childId` or `parentId` is in incorrect format then an error JSON will be sent back with

```json
{
    "error": "Failed to swap!",
    "message": "Child or parent node does not exist"
}
```
---
## Tree node structure recreated using following technologies

- [Node.js](https://nodejs.org/en/) - Server-side scripting
- [MongoDB](https://www.mongodb.com/) - General purpose database
- [Docker / Docker-compose](https://www.docker.com/) - Containerized development
- [TypeScript](https://www.typescriptlang.org/) - Programming language (superset of JavaScript)