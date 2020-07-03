const functions = require('firebase-functions');

const firebaseConfig = {
    key: functions.config().namespace.key,
    authDomain: functions.config().namespace.auth_domain,
    databaseURL: functions.config().namespace.database_url,
    projectId: functions.config().namespace.project_id,
    storageBucket: functions.config().namespace.storage_bucket,
    messagingSenderId: functions.config().namespace.messaging_sender_id,
    appId: functions.config().namespace.app_id,
    measurementId: functions.config().namespace.measurement_id
};

export default { firebaseConfig };