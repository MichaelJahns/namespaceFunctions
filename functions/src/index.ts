
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
function parceUserFromRequest(request:any , response:any , next: any){
    console.log("one");
    const newUser : NewUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        displayName: request.body.displayName
    };
    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return response.status(400).json(errors); 
    request.user = newUser;
    next();
}


const getUser = (request: any , response: any, next:any) => {
    console.log(request.body.displayName)
    db.collection("users").doc(`/${request.body.displayName}`).get()
    .then((data:any) => {
        console.log(data)
        return response.status(400).json(data).send();
    })
    .then(() => {
        next();
    })
    .catch((err: any) => {
        console.error(err);
    });

}
const createUser = (request: any, response: any, next:any) => {
    console.log("two");

    db
        .collection("users")
        .doc(`/${request.user.displayName}`)
        .get()
        .then((data: any) => {
            if (data.exists) {
                console.log(data);
                // TODO: I want names like Discord 'Todd@4975'
                return response
                    .status(500)
                    .json({ error: `Username already taken` })
                    .send();
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(request.user.email, request.user.password);
            }
        })
        .then((data: any) => {
            request.token = data.user.getIdToken();
            const userCredentials = {
                email: request.user.email,
                displayName: request.user.displayName,
                createdAt: new Date().toISOString(),
                userId: data.user.uid
            }
            return db.doc(`/users/${request.user.displayName}`).set(userCredentials);
        })
        .then(() => {
            next();
        })
        .catch((err: any) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                next(handleEmailAlreadyInUseError(request, response));
            } else {
                functions.logger.error("Uncaught firebase signup error", err);
                response.json({error: err.message})
                next(handleUnknownError(request, response));
            }
        });
};

function RespondSuccessfulCharacterCreation(request:any, response:any){
    console.log("4: Character successfully created");
    return response
    .status(201)
    .json({"token": request.token });
}

function handleEmailAlreadyInUseError(request:any, response:any){
    console.log("3A: handling email collison")
    return response
    .status(501)
    .write({error: "The email is already in use by another account"})
    .send();
}

function handleUnknownError(request:any, response:any){
    console.log("3Z: Unknown Firebase error")
    return response
    .status(502)
    .send()
}

app.get('/getUser', getUser)
app.post('/login', login);
app.post('/createUser', parceUserFromRequest, createUser, RespondSuccessfulCharacterCreation);

exports.api = functions.https.onRequest(app);
