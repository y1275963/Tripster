/*jslint node: true */
"use strict";

var express = require('express');
var router = express.Router();
var oracle = require('oracle');
global.User = require('./user');
var tripid;
//for dropdown things
var dropdown = [];

var connectData = {
	hostname: "tripsterdb.cmjcmauyxdtp.us-east-1.rds.amazonaws.com",
	port: 1521,
	database: "Wally",
	user: "masterusr",
	password: "CS450&frdS"
};


function create_dropdown() {
	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db:", err);
			return;
		}
		//friends current user has added
		var sql1 = 'SELECT FRIEND_ID2 FROM FRIENDS_WITH WHERE FRIEND_ID1 = ' + "'" + global.currUser.username + "'";
		sql1 = sql1 + "AND ACCEPTED = 1";
		//friends that have added current user
		var sql2 = "SELECT FRIEND_ID1 FROM FRIENDS_WITH WHERE FRIEND_ID2 = '" + global.currUser.username + "'";
		sql2 = sql2 + "AND ACCEPTED = 2";
		console.log('QUERY = ' + sql1);
		console.log(sql2);

		//Create dropdown menu
		connection.execute(sql2, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}
			for (var i = 0; i < results.length; i++) {
				var resul = results[i].FRIEND_ID1;
				console.log("Friend: " + resul);
				dropdown.push(resul);
			}
		});

		connection.execute(sql1, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}

			for (var i = 0; i < results.length; i++) {
				var resul = results[i].FRIEND_ID2;
				console.log("Friend: " + resul);
				dropdown.push(resul);

			}
			connection.close();
			console.log(dropdown);
		});
	});
}

router.get('/createtrip', function (req, res) {
	create_dropdown();
	console.log("createtrip:" + dropdown);
	if (global.currUser.signed_in) {
		//Render Createtrip page
		res.render('createtrip', {});
	} else {
		res.redirect('/login');
	}
});

//Create the trip
router.post('/createtrip', function (req, res) {
	if (global.currUser.signed_in) {
		//get information from html form submitted by user
		var userid = global.currUser.username;
		var planid = req.body.planid;
		var privacycontent = req.body.privacycontent;
		var locationname = req.body.locationname; //want to change location to country, if USA state + city, else city
		var locationtype = req.body.locationtype;

		//check if location exists, if not, create it in table
		oracle.connect(connectData, function (err, connection) {
			if (err) {
				console.log("Error connecting to db creating trip:", err);
				return;
			}
			//if location does not exist in location table, add it
			var exists;
			var loc_query = "SELECT * FROM LOCATION WHERE LOCATION_NAME='" + locationname + "'";
			connection.execute(loc_query, [], function (err, results) {
				if (err) {
					console.log('Error executing location query:', err);
					return;
				}
				//Case 1: Location does not exist
				if (results.length === 0) {
					if (!locationtype) {
						var create_query = "INSERT INTO LOCATION (LOCATION_NAME) VALUES";
						create_query = create_query + "('" + locationname + "')";
						console.log(create_query);
						connection.execute(create_query, [], function (err, results) {
							console.log('here2');
							if (err) {
								console.log('Error executing location query:::', err);
								return;
							}
							console.log(results);
							connection.close();
						});
					} else { //Case 2: Location does exist
						var create_query2 = "INSERT INTO LOCATION (LOCATION_NAME, LOCATION_TYPE) VALUES";
						create_query2 = create_query2 + " ('" + locationname + "', '" + locationtype + "')";
						console.log(create_query2);
						connection.execute(create_query2, [], function (err, results) {
							console.log('here2');
							if (err) {
								console.log('Error executing location query:', err);
								return;
							}
							console.log(results);
						});
					}
				}
			});
			//Creates a unique trip id
			var query = 'SELECT MAX(TRIP_ID) AS MAX FROM TRIPS';
			connection.execute(query, [], function (err, results) {
				if (err) {
					console.log("Error executing query:", err);
					return;
				}
				console.log("TRIP_ID: " + results[0].MAX); //testing
				console.log(results[0].MAX + 1);
				tripid = results[0].MAX + 1;

				//Insert new trip into database, tables TRIPS and PLANS
				var newtrip = "INSERT INTO TRIPS (TRIP_ID, LOCATION_ID, PRIVACY_CONTENT) VALUES('" + tripid + "', '" +
					locationname + "', '" + privacycontent + "')";
				console.log(newtrip);
				connection.execute(newtrip, [], function (err, results) {
					console.log('attempting query: ' + newtrip);
					if (err) {
						console.log("Error connecting to db:", err);
						return;
					}
					console.log(results);
				});
				var planquery = "INSERT INTO PLANS values( '" + userid + "', " +
					tripid + ", " + planid + ")";
				connection.execute(planquery, [], function (err, results) {
					console.log('attempting query: ' + planquery);
					if (err) {
						console.log("Error connecting to db:", err);
						return;
					}
					console.log(planquery + "EXECUTED");
					connection.close();

				});
			});
		});

		//render part II of create trip - invite yo' friends
		console.log(dropdown);
		res.redirect('/invitefriends');
	} else {
		res.redirect('/login');
	}
});


//function to create the invites for a trip
function create_invite(stmt) {
	//Otherwise, add all of the people user invited to invitees list
	oracle.connect(connectData, function (err, connection) {
		connection.execute(stmt, [], function (err, results) {
			console.log('attempting query: ' + stmt);
			if (err) {
				console.log("Error connecting to db:", err);
				return;
			}
			console.log(results);
			connection.close();
		});
	});
	return;
}

//Invite friends onto our trip
router.post('/invitefriends', function (req, res) {
	console.log("here");
	tripid = 1506; //for now
	var invitees = req.body.invited;

	//if user did not invite anyone, go to items page
	if (!invitees) {
		res.render('tripitems', {
			tripid: tripid
		});
	}

	//invite each person in that stupid list.
	var invquery = "INSERT ALL";
	for (var i = 0; i < invitees.length; i++) {
		var invited = invitees[i];
		console.log("inviting person: " + invited);
		invquery = invquery + " INTO INVITES (USER_INVITER, USER_INVITEE, TRIP_ID)" + "values('" + global.currUser.username +
			"', '" + invited + "', " + tripid + ")";
	}
	invquery = invquery + " SELECT * FROM dual";

	create_invite(invquery);

	res.redirect('/myprofile');
	//res.render('tripitems', {
	//	tripid: tripid
	//});
});

//render invite friends page for trips
router.get('/invitefriends', function (req, res) {
	console.log(tripid); //make sure i have it
	res.render('invitefriends', {
		tripid: tripid,
		invitees: dropdown
	});
});

//update/create items list of a trip
router.post('/tripitems', function (req, res) {
	var items = req.body.items;

});

//Display clients invites to trips
router.get('/tripinvites', function (req, res) {
	//make sure user is signed in
	if (global.currUser.signed_in) {
		//get pending requests from the database
		oracle.connect(connectData, function (err, connection) {
			if (err) {
				console.log("Error connecting to db:", err);
				return;
			}
			var query = "SELECT * FROM INVITES WHERE USER_INVITEE='" + global.currUser.username + "'";
			connection.execute(query, [], function (err, results) {
				if (err) {
					console.log("Error executing query:", err);
					return;
				}
				console.log(results);
				connection.close();

				//Case 1: If user has no trip invites
				if (results.length === 0) {
					console.log("I am here");
					res.render('tripinvites', {
						requests: [],
						message: "You have no trip invites at the moment"
					});
				} else { //Case 2: User has trip invites
					var invites = [];
					for (var i = 0; i < results.length; i++) {
						invites[i] = results[i].TRIP_ID;
					}
					console.log(invites);
					console.log(invites.length);
					res.render('tripinvites', {
						requests: invites,
						message: "Here are your trip invites"
					});
				}
			});
		});
	} else {
		//if not logged in, redirect to login page
		res.redirect('/login');
	}
});


//Accept/Reject User friend requests
router.post('/tripinvites', function (req, res) {
	var invitee = global.currUser.username;
	var trip = req.body.trip;
	var response = req.body.response;

	if (response == "accept") {
		//Delete the invite
		var inquery = "DELETE FROM INVITES WHERE USER_INVITEE='" + invitee + "' AND TRIP_ID =" + trip;
		console.log(inquery);
		oracle.connect(connectData, function (err, connection) {
			if (err) {
				console.log("Error connecting to db:", err);
				return;
			}

			connection.execute(inquery, [], function (err, results) {
				if (err) {
					console.log("Error executing query:", err);
					return;
				}
				console.log(results);
			});

			var attendsq = "INSERT INTO PLANS values('" + invitee + "', " +
				trip + ", " + 4 + ")";
			console.log(attendsq);
			connection.execute(attendsq, [], function (err, results) {
				if (err) {
					console.log("Error executing query:", err);
					return;
				}
				console.log(results);
				connection.close();
			});
			res.redirect('/tripinvites');
		});
	} else if (response == "reject") {
		//Validate that person you are trying to friend exists
		var query = "DELETE FROM INVITES WHERE USER_INVITEE='" + invitee + "' AND TRIP_ID=" + trip;
		console.log(query);
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
				res.redirect('/tripinvites');
			});
		});
	}
});


//Request to be on your friends trip
router.get('/friendstrips', function (req, res) {
	//display your friends trips if they are public
	//Create query
	var gettripsa =
		"(SELECT U.USER_ID, T.TRIP_ID FROM TRIPS T INNER JOIN PLANS P ON T.TRIP_ID = P.TRIP_ID INNER JOIN USERS U ON P.USER_ID = U.USER_ID ";
	gettripsa = gettripsa +
		"INNER JOIN FRIENDS_WITH F ON  U.USER_ID = F.FRIEND_ID1 WHERE F.ACCEPTED = 1 AND P.PLAN_ID = 1 AND F.FRIEND_ID2 ='";
	gettripsa = gettripsa + global.currUser.username + "') ";
	var gettripsb =
		"UNION (SELECT U.USER_ID, T.TRIP_ID FROM TRIPS T INNER JOIN PLANS P ON T.TRIP_ID = P.TRIP_ID INNER JOIN USERS U ON P.USER_ID = U.USER_ID INNER JOIN FRIENDS_WITH F ON  U.USER_ID = F.FRIEND_ID2 WHERE";
	gettripsb = gettripsb + " F.ACCEPTED = 1 AND P.PLAN_ID = 1 AND F.FRIEND_ID1 ='" + global.currUser.username + "')";
	gettripsa = gettripsa + gettripsb;
	console.log(gettripsa);
	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db", err);
			return;
		}

		connection.execute(gettripsa, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}
			console.log(results);
			connection.close();

			var trips = [];
			var friends = [];
			if (results === 0) {
				//None of persons friends have trips
				res.render('friendstrips', {
					trips: trips,
					friends: friends
				});
			}

			//else put them into friends array and trips array
			for (var i = 0; i < results.length; i++) {
				trips[i] = results[i].TRIP_ID;
				friends[i] = results[i].USER_ID;
				console.log(friends[i]);
			}
			res.render('friendstrips', {
				trips: trips,
				friends: friends
			});
		});

	});
});

//for post, handle if already on trip
router.post('/friendstrips', function (req, res) {
	//Check if user accidentally requested trip he is already on
	var trip = req.body.trip;
	var owner = req.body.owner;

	var exists = "SELECT * FROM PLANS WHERE TRIP_ID = '" + trip + "' AND USER_ID='" + global.currUser.username + "'";
	var invited = "SELECT * FROM INVITES WHERE TRIP_ID='" + trip + "' AND INVITEE='" + global.currUser.username + "'";
	oracle.connect(connectData, function (err, connection) {
		if (err) {
			console.log("Error connecting to db:", err);
			return;
		}

		connection.execute(exists, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}
			if (results.length !== 0) {
				res.redirect('/friendstrips');
			}
		});

		connection.execute(invited, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}
			if (results.length !== 0) {
				res.redirect('/friendstrips');
			}
		});

		//If not already invited or attending or requested to attend trip create request
		var request = "INSERT INTO PLAN (USER_ID, TRIP_ID, PLAN_ID) VALUES ('" + global.currUser.username + "'";
		request = request + "," + trip + ", " + 5 + ")";
		connection.execute(request, [], function (err, results) {
			if (err) {
				console.log("Error executing query:", err);
				return;
			}

			res.redirect('/friendstrips');
		});
	});
});

//respond to trip requests
router.get('/respondtripreq', function (req, res) {

});

router.post('/respondtripreq', function (req, res) {

});


module.exports = router;