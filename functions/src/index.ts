
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

app.post('./login', login);

exports.api = functions.https.onRequest(app);
