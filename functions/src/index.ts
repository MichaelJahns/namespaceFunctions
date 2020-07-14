
import * as express from 'express';
import { NewUser } from './interfaces';

import * as firebase from 'firebase';
require("firebase/firestore");
const functions = require('firebase-functions');

const firebaseConfig = {
    apiKey: functions.config().namespace.key,
    authDomain: functions.config().namespace.auth_domain,
    databaseURL: functions.config().namespace.database_url,
    projectId: functions.config().namespace.project_id,
    storageBucket: functions.config().namespace.storage_bucket,
    messagingSenderId: functions.config().namespace.messaging_sender_id,
    appId: functions.config().namespace.app_id,
    measurementId: functions.config().namespace.measurement_id
};

try{
firebase.initializeApp(firebaseConfig);
}catch(error){
    // What can be done
}

const db = firebase.firestore();
const app = express();
const cors = require('cors');
app.use(cors());


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
const { validateLoginData, validateSignupData }= require("./util/validators");


const login = (request: any, response: any) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLoginData(user);
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

    const newUser : NewUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        displayName: request.body.displayName
    };
    functions.logger.log("Hello from createUser", newUser);
    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return response.status(400).json(errors);
    let token: string, userId: string;

    db
        .collection("users")
        .doc(`/${newUser.displayName}`)
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
            return db.doc(`/users/${newUser.displayName}`).set(userCredentials);
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
