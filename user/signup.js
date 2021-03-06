var express = require('express');
var router = express.Router();
var oracle = require('oracle');
var bcrypt = require('bcrypt');
global.User = require('./user');
global.currUser = new User();

var connectData = {
	hostname: "tripsterdb.cmjcmauyxdtp.us-east-1.rds.amazonaws.com",
	port: 1521,
	database: "Wally",
	user: "masterusr",
	password: "CS450&frdS"
};

router.get('/signup', function (req, res) {
	res.render("signup", {
		title: "Tripster: Signup",
		errormsg: ""
	});
});

function create_user(name, username, email, password) {
	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db:", err);
			return;
		}
		var q = "INSERT INTO USERS (USER_ID, PASSWORD, NAME, PRIVACY_CONTENT, EMAIL) VALUES";
		q = q + "('" + username + "', '" + password + "', '" + name + "', " + "'private'" + ", '" + email + "')";

		connection.execute(q, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}

			console.log(results); //print for testing

			connection.close();
		});
	});
}

//Must handle successful and unsuccessful user creation
//e.g. user email already exists in system 
router.post('/signup', function (req, res) {
	var name = req.body.fname + " " + req.body.lname;
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;

	var hash = bcrypt.hashSync(password, 10);
	console.log("Hash is: " + hash);

	var query = 'SELECT USER_ID FROM USERS WHERE USER_ID =' + "'" + username + "'";

	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db:", err);
			return;
		}

		connection.execute(query, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}

			console.log(results); //print for testing

			connection.close();
			if (results.length === 0) {
				create_user(name, username, email, hash);
				global.currUser.username = username;
				global.currUser.signed_up = true;
				res.redirect('/signupcomplete');

			} else {
				var mess = "Sorry, the username " + username + " has already been taken. Please try again.";
				res.render("signup", {
					title: "Tripster: Signup Login Failed",
					errormsg: mess
				});
			}
		});
	});
});



router.get('/signupcomplete', function (req, res) {
	res.render("signupcomplete");
});

router.post('/signupcomplete', function (req, res) {
	var username = global.currUser.username;
	var affiliation = req.body.affiliation;
	var interests = req.body.interests;
	console.log(username);
	console.log(affiliation);
	console.log(interests);

	var query = "UPDATE USERS SET AFFILIATION='" + affiliation + "', INTERESTS='" + interests + "'";
	query = query + "WHERE USER_ID ='" + username + "'";

	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db:", err);
			return;
		}

		connection.execute(query, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}

			console.log(results); //print for testing

			connection.close();
			res.redirect('/myprofile');
		});
	});
});

module.exports = router;