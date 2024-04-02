---
title: 'Blog with VPS Hosting: A DIY Guide'
description: "Learn How to Create Your Own Blog: A Step-by-Step Guide to Hosting Your Blog's Source Code on GitHub and Your Website on Any VPS of Your Choice"
pubDate: 'Sept 25 2023'
updatedDate: 'April 2 2024'
heroImage: '/blog/blog-with-vps/blog-with-vps-hero.webp'
---

### Getting started

First, you will need a GitHub repository to host your source code. Next, install [astrojs](https://astro.build) or any other static website framework of your choice. Personally, I use GitHub Actions for automatic build and deployment whenever I push to the main branch. To set up these actions, create a `.github/workflows` directory at the root of your project. Then, create a file named `build-and-deploy.yml` and insert the following code:

```yml
name: Build and Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Add robots.txt
        run: echo 'User-agent:*' > ./dist/robots.txt && echo 'Disallow:' >> ./dist/robots.txt

      - name: Copy files via SCP
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSHKEY }}
          port: ${{ secrets.PORT }}
          source: ./dist/*
          target: ${{ secrets.SERVER_FOLDER }}
          strip_components: 1
          rm: true
```

The syntax of GitHub Actions is relatively straightforward. This action triggers on a push to the **main** branch. The job, named `deploy`, runs on Ubuntu. Each step includes a **name**, **uses** or **run**, and sometimes **with**:
- **name**: simply the identifier for the step in the logs
- **uses**: invokes a pre-existing action
- **run**: executes a command in the CLI
- **with**: specifies parameters for the step

For instance, the "Checkout code" step checks out the repository on the runner. The "Install Node.js" step installs Node.js, specifying version 20.

The "Copy files via SCP" step is particularly noteworthy. SCP, or Secure Copy Protocol, is a method for securely transferring files between a local host and a remote host or between two remote hosts. In this action, we use the repository's secrets to securely transfer the built files to the server. The `appleboy/scp-action@v0.1.4` action simplifies this process, allowing for easy and secure file transfer using SSH credentials.
