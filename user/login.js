var express = require('express');
var router = express.Router();
var oracle = require('oracle');

/* When user tries to log on, verify his information.
If it is correct, redirect him/her to his/her profile
If incorrect, stay on login page - alert user of error */

var connectData = {
  hostname: "tripsterdb.cmjcmauyxdtp.us-east-1.rds.amazonaws.com",
  port: 1521,
  database: "Wally",
  user: "masterusr",
  password: "CS450&frdS"
};

router.get('/login', function(req, res) {
  res.render('login', { title: 'Tripster:Login' });
});


router.post('/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

   	//Print for testing/building
   	console.log("LOGIN");
   	console.log(email);
   	console.log(password);

    //Connect to database
    oracle.connect(connectData, function(err, connection) {
        if (err) {console.log("Error connecting to db:", err); return; }

        //Query database for username's password
        //userid for testing
        connection.execute("SELECT PASSWORD, USERID FROM USERS", [], function(err, results) {
            if (err) {console.log("Error executing query:", err); return; }

            console.log(results);   //print for testing

            connection.close();     //close db connection after query
        });
    });
});


module.exports = router;