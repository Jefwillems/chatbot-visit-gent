const mongoose = require('mongoose');
const connectionString = process.env.COSMOSDB_CONNECTION_STRING
const dbName = process.env.COSMOSDB_DBNAME


/* const hostname = process.env.COSMOSDB_HOST_NAME
const masterKey = process.env.COSMOSDB_PRIMARY_PASSWORD */






const testDBconnection = () => {
    console.log(connectionString);
    console.log(dbName)
    mongoose.connect(connectionString); //Creates a new DB, if it doesn't already exist

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("Connected to DB");
    });
}

/* const getAllEventsFromNow = () => {
    //current datetime
    const currentDateTime = new Date(); 
    
    client.queryDocuments(collectionDefinition, "SELECT * FROM inventory").toArray(function(err, results) {
        if (err) {
            console.log(err)
        } else {
            console.log("it works :)")
            console.log(results);
        }
    });
}

const getEventsSelectedStageAndDate = (dateTime,stage) => {
    client.queryDocuments(collectionDefinition, "SELECT * FROM inventory").toArray(function(err, results) {
        if (err) {
            console.log(err)
        } else {
            console.log("it works :)")
            console.log(results);
        }
    });
}
 */

module.exports = {
    testDBconnection
}