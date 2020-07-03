import * as firebase from 'firebase';
import * as functions from 'firebase-functions';
import firebaseConfig from './config';

firebase.initializeApp(firebaseConfig);

export { firebase, functions };