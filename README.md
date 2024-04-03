# TOKENIZED REAL ESTATE OWNERSHIP - ICP 101 PROJECT

The Tokenized Real Estate Ownership project is a blockchain-based platform that enables fractional ownership of real estate properties through tokenization. This project aims to democratize real estate investment by allowing investors to purchase tokenized shares of properties, thereby gaining exposure to the real estate market with lower entry barriers.

## Features

### 1. Property Management
   - Create, read, update, and delete real estate properties.
   - Each property includes details such as address, owner, tokenized shares, and transaction history.

### 2. Ownership Transfer
   - Facilitate ownership transfers between users.
   - Transfer tokenized ownership shares of properties securely and transparently.
   - Transfers occur automatically when a different shareholder gains the most shares.

### 3. Transaction History
   - Maintain a transaction history for each property.
   - Record details of ownership transfers, token transactions, and other relevant activities.

### 4. Tokenized Governance
   - Record important events related to property ownership.
   - Serve as a basic form of governance by providing transparency and accountability.

## Setup instructions

1. clone code from this repository.

2. Navigate into the directory with the package.json file using your terminal.

3. Enter this command in your terminal (If it doesn't work, it means that you don't have nvm installed. Just check the node version you are using and make sure it version 20 or any other version later than that like 21 etc.):

```bash
    nvm use 20 (Uses node version 20)
```

4. Ensure that you have installed podman. This depends on the kind of OS you are using so (Click here to go to the documentation site)[https://podman.io/docs/installation]

5. Ensure that you install dfx virtual machine. You can use this command in your terminal:

    - To install:
    
    ```bash
    DFX_VERSION=0.16.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
    ```

    - To add dfx into the path (If during installation, the path to dfx vm has been set then you can skip this part.):
    
    ```bash
    echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"
    ```

    - Restart the terminal and test whether dfx has been installed using this command:
    
    ```bash
    dfx --version
    ```

6. Use this command in your terminal to install the dependencies:

```bash
npm install
```

## Start the program

1. To start the local icp, use this command below (Use --clean flag to clean resources before restart):

```bash
dfx start --background --host 127.0.0.1:8000
```

2. To deploy the canister(s), use this command:

```bash
dfx deploy
```

3. To stop the application:

```bash
dfx stop
```

## Interact with the program

### API Endpoints

The project exposes the following API endpoints:

1. `POST /users`: Create a new user.
2. `POST /users/deposit`: Add funds to a user.
3. `POST /properties`: Create a new real estate property.
4. `GET /properties`: Get all real estate properties.
5. `GET /properties/:id`: Get details of a specific property by ID.
6. `PUT /properties/:id`: Update details of a specific property by ID.
7. `DELETE /properties/:id`: Delete a specific property by ID.
8. `POST /transfer/:id`: Transfer ownership of a property.

### Examples of interacting with the endpoints:
    - To create a new user:

    ```bash
    curl -X POST http://canister_id.localhost:8000/users -H "Content-type: application/json" -d '{"username": "name", "email": "name@mail.com", "password": "name123"}'
    ```

    - To deposit funds:

    ```bash
    curl -X POST http://canister_id.localhost:8000/users/deposit -H "Content-type: application/json" -d '{"username": "name", "amount": "1000"}'
    ```

    - create property:

    ```bash
    curl -X POST http://canister_id.localhost:8000/properties -H "Content-type: application/json" -d '{"address": "123 my street", "owner": "name", "deedURL": "/url/path/to/title/deed/photo", "shares": "1000000"}'
    ```

    - get all properties:

    ```bash
    curl http://canister_id.localhost:8000/properties
    ```

    - get a specific property:

    ```bash
    curl http://canister_id.localhost:8000/properties/property_id
    ```

    - update a property:

    ```bash
    curl -X PUT http://canister_id.localhost:8000/properties/property_id -H "Content-type: application/json" -d '{"owner": "name", "address": "updated address", "deedURL": "updated/url/path/to/title/deed/photo"}'
    ```

    - transfer shares:

    ```bash
    curl -X POST http://canister_id.localhost:8000/transfer/property_id -H "Content-type: application/json" -d '{"from": "name", "to": "name2", "shares": "1000"}'
    ```

    - delete property:

    ```bash
    curl -X DELETE http://canister_id.localhost:8000/properties/property_id -H "Content-type: application/json" -d '{"username": "name"}'
    ```

## Contributing

Contributions to the Tokenized Real Estate Ownership project are welcome! Feel free to fork the repository, make improvements, and submit pull requests. For major changes, please open an issue first to discuss the proposed changes.

## Common issues while running this project

This is a list of issues you may encounter and how to solve them. Some of them I experienced myself while setting up the project and others will be from other people. I'll update it as I receive more issues.

### Issue 1.0:

error while loading shared libraries: libunwind.so.8: cannot open shared object file: No such file or directory

#### Solution:

Install the libunwind8 library. You may use this terminal command if you're using Ubuntu/Debian based systems:

```bash
sudo apt-get update
sudo apt-get install libunwind8
```
