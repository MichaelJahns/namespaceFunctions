
import * as express from 'express';

const app = express();
const cors = require('cors');
app.use(cors());


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

import validator = require("./util/validators");
const { firebase, functions } = require("./util/admin");

const login = (request: any, response: any) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validator.validateLoginData(user);
    console.log(user);
    if (!valid) return response
        .status(400)
        .json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data: any) => {
            return data.user.getIdToken();
        })
        .then((token: string) => {
            return response
                .status(200)
                .json({ token })
        })
        .catch((err: any) => {
            if (err.code === "auth/wrong-password") {
                response
                    .status(403)
                    .json({ general: "Invalid Credentials" })
            }
            return response
                .status(500)
                .json({ error: err.code })
        });
};

const createUser = (request: any, response: any) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        displayName: request.body.username
    };
    const { valid, errors } = validator.validateSignupData(newUser);

    if (!valid) return response.status(400).json(errors);
    let token: string, userId: string;

    firebase
        .database()
        .doc(`/users/${newUser.displayName}`)
        .get()
        .then((data: any) => {
            if (data.exists) {
                // TODO: I want names like Discord 'Todd@4975'
                return response
                    .status(400)
                    .json({ displayName: `this displayName is already taken` });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data: any) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken: any) => {
            token = idToken;
            const userCredentials = {
                email: newUser.email,
                displayName: newUser.displayName,
                createdAt: new Date().toISOString(),
                userId
            }
            return firebase.database.doc(`/users/${newUser.displayName}`).set(userCredentials);
        })
        .then(() => {
            return response
                .status(201)
                .json({ token });
        })
        .catch((err: any) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                return response
                    .status(400)
                    .json({ email: 'Email is already in use' });
            } else {
                return response
                    .status(500)
                    .json(err);
            }
        });
};

app.post('/login', login);
app.post('/createUser', createUser);

exports.api = functions.https.onRequest(app);
