#!/bin/bash

if npm run test --silent; then
    npm run serve
else
    echo "Tests failed, exiting..."
    exit 1
fi