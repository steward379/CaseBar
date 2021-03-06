var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.set('port', process.env.PORT || 8000);

app.set("view engine", 'ejs');

app.use(require('body-parser')());

var fs = require('fs');

var cookieParser = require('cookie-parser');
app.use(cookieParser('my_cookie_secret'));

var session = require('express-session');
app.use(session({
	secret: 'my_session_secret',
	cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

var mongoose = require('mongoose');
var opts = {
	server: {
		socketOptions: { keepAlive: 1 }
	}
};

mongoose.connect('mongodb://demo:12345@ds127101.mlab.com:27101/snademo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
	console.log("Database Connected.");
});

mongoose.Promise = global.Promise;

var User = require('./models/user.js');
var Post = require('./models/post.js');
var Response = require('./models/response.js');

var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

    // =====================================
    // GOOGLE ROUTES =======================
    // =====================================
    // send to google to do the authentication
    // profile gets us their basic information including their name
    // email gets their emails
    app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] })

    	);

    // the callback after google has authenticated the user
    app.get('/auth/google/callback',
    	passport.authenticate('google', {
    		successRedirect : '/googlelogin',
    		failureRedirect : '/landingpage'
    	})


    	);

    app.get('/googlelogin', function(req, res,user){
    	req.session.login = true;
    	req.session.username = req.user.google.name;
	//console.log(req.session.login);
	//console.log(req.session.username);
	res.redirect(303, '/landingpage');

});
    app.get('/auth/facebook',
    	passport.authenticate('facebook', {session: false, scope : ['email'] })
    	);
// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
	passport.authenticate('facebook',  { session: false, failureRedirect : '/'}),
	
    // on succes
    function(req,res) {
        // return the token or you would wish otherwise give eg. a succes message
        res.render('json', {data: JSON.stringify(req.user.access_token)});
    },
    
    // on error; likely to be something FacebookTokenError token invalid or already used token,
    // these errors occur when the user logs in twice with the same token
    function(err,req,res,next) {
        // You could put your own behavior in here, fx: you could force auth again...
        // res.redirect('/auth/facebook/');
        if(err) {
        	res.status(400);
        	res.render('error', {message: err.message});
        }
    }
    );


        // route for facebook authentication and login
     //   app.get('/auth/facebook', passport.authenticate('facebook'));

        // handle the callback after facebook has authenticated the user
       // app.get('/auth/facebook/callback',
           // passport.authenticate('facebook', {
         //       successRedirect : '/facebooklogin',
             //   failureRedirect : '/landingpage'
           // }));

           app.get('/facebooklogin', function(req, res,user){
           	req.session.login = true;
           	req.session.username = req.user.google.name;
           	console.log(req.session.login);
           	console.log(req.session.username);
           	res.redirect(303, '/landingpage');

           });


        // route for logging out
        app.get('/logout', function(req, res) {
        	req.logout();
        	res.redirect('/landingpage');
        });



////////
app.get('/reviseReview', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	Post.find({ _id: req.session.postId }, function(err, posts){
		var thisPost = {
			login: login,
			username: req.session.username,
			posts: posts.map(function(Post){
				return {
					thisPosttitle: Post.posttitle,
					thisPostcontent: Post.postcontent,
				}
			})
		};
		res.render('reviseReview', thisPost);
	});
});
app.post('/reviseReview', function(req, res){
	Post.update(
		{ _id: req.session.postId },
		{ postdate: Date.now(),
			posttitle: req.body.posttitle,
			postcontent: req.body.postcontent },
			{ upsert: true },
			function(err){
				if (err){
					console.error(err.stack);
					return res.redirect(303, '/reviewDetail');
				}
				return res.redirect(303, '/reviewDetail');
			}
			);
});


app.get('/landingpage', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;

	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}
	var context = {
		login: login,
		username: req.session.username,
	};
	res.render('landingpage', context);

});

app.get('/login', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}
	res.render('login', context);
});
app.post('/login', function(req, res){
	username = req.body.username;
	password = req.body.password;
	User.find(function(err, user){
		user = user.map(function(User){
			if (username == User.username && password == User.password) {
				req.session.username = username;
				req.session.login = 'login';
			}
		});
		if (req.session.login == null) {
			var login = false;
			res.redirect(303, 'landingpage');
		}
		else {
			var login = true;
			res.redirect(303, 'landingpage');
		}
	});
});

app.get('/signup', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}
	res.render('landingpage', context);
});
app.post('/signup', function(req, res){
	User.update(
		{ username: req.body.username },
		{ realname: req.body.realname,
			password: req.body.password,
			birthday: req.body.birthday,
			email: req.body.email
		},
		{ upsert: true },
		function(err){
			if (err){
				console.error(err.stack);
				return res.redirect(303, 'landingpage');
			}
			if(User.username!=null){
				req.session.username = req.body.username;
				req.session.login = 'login';
			}
			return res.redirect(303, 'landingpage');
		}
		);
});

app.get('/logout_l', function(req, res){
	delete req.session.username;
	delete req.session.login;
	delete req.session.postId;
	delete req.session.ownername;
	res.redirect(303, 'landingpage');
});

app.get('/logout', function(req, res){
	delete req.session.username;
	delete req.session.login;
	delete req.session.postId;
	delete req.session.ownername;
	res.redirect(303, 'surfReview');
});

app.get('/surfReview', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;

	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}

	User.find(function(err, users){
		signupContext = {
			users: users.map(function(User){
				return {
					user: User.username,
				}
			})
		};
	});

// if (req.session.postId != null) {
// 	Post.find({ _id: req.session.postId }, function(err, posts){
// 		thisPost = {
// 			posts: posts.map(function(Post){
// 				return {
// 					thisPosttitle: Post.posttitle,
// 					thisPostcontent: Post.postcontent,
// 					thisPostowner: Post.postowner,
// 					thisPostagree:Post.postagree,
// 					thisPostdisagree:Post.postdisagree,
// 					thisPosttype:Post.posttype
// 				}
// 			})
// 		};
// 	});
// 	thisPost: thisPost.posts;
// 	console.log("ttttt")
// }

//預設文章
var defaultPost = true;
	//點選文章
	if (req.session.postId != null)
		defaultPost = false;
	//所有文章

	setTimeout(function() {
		Post.find({ }, function(err, posts){
			var context = {
				user: signupContext.users,
			//thisPost: thisPost.posts,
			defaultPost: defaultPost,
			login: login,
			username: req.session.username,
			posts: posts.map(function(Post){
				return {
					posttitle: Post.posttitle,
					postcontent: Post.postcontent,
					postagree: Post.postagree,
					postdisagree: Post.postdisagree,
					postneutral: Post.postneutral,
					postresponsenum: Post.postresponsenum,
					postowner: Post.postowner,
					posttype:Post.posttype,
					poststar:Post.poststar,
					_id: Post._id,
				}
			})

//.sort({postresponsenum: -1})

};
res.render('surfReview', context);
}).sort({postdate: -1});
	}, 1500 );


});

app.post('/surfReview', function(req, res){

	if (req.body.postId != null) {
		req.session.postId = req.body.postId;
		return res.redirect(303, '/reviewDetail');
	}

});


app.get('/reviewDetail', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;

	var username = req.session.username;
	console.log(username);
	var context = {
		username: username,
		login: login,
	}

	User.find(function(err, users){
		signupContext = {
			users: users.map(function(User){
				return {
					user: User.username,
				}
			})
		};
	});
	setTimeout(function() {
		console.log("222")
		Post.find({ _id: req.session.postId }, function(err, posts){
			thisPost = {
				posts: posts.map(function(Post){
					return {
						thisPosttitle: Post.posttitle,
						thisPostcontent: Post.postcontent,
						thisPostowner: Post.postowner,
						thisPostagree:Post.postagree,
						thisPostdisagree:Post.postdisagree,
						thisPostresponsenum: Post.postresponsenum,
						thisPosttype:Post.posttype,
						thisPoststar:Post.poststar,
						thisPostneutral: Post.postneutral
					}
				})
			};
		});
	}, 2000 );

	setTimeout(function() {
	//留言
	Response.find({ responsePost: req.session.postId }, function(err,responses){
		console.log("111")
		responseContext = {
			responses: responses.map(function(Response){
				if (Response.responseWriter != req.session.username) {
					return {
						response: Response.response,
						responseTime: Response.responseDate,
						responseWriter: Response.responseWriter,
						responseWriterIsUser: false,
						_id: Response._id,
					}
				}
				else {
					return {
						response: Response.response,
						responseTime: Response.responseDate,
						responseWriter: Response.responseWriter,
						responseWriterIsUser: true,
						_id: Response._id,
					}
				}
			})
		};

	});
}, 2500 );
//預設文章
var defaultPost = true;
	//點選文章
	if (req.session.postId != null)
		defaultPost = false;
	//所有文章


	setTimeout(function() {
		console.log( "c" )

		var context = {
			//user: signupContext.users,
			thisPost: thisPost.posts,
			responses: responseContext.responses,
			defaultPost: defaultPost,
			login: login,
			username: req.session.username,
		};
		res.render('reviewDetail', context);
	}, 3000 );

});

app.post('/reviewDetail', function(req, res){

	var state = 0;
// 1 2 3

//文章同意
if (req.body.postAgree != null) {

	setTimeout(function() {

		User.find(function(err, user){
			user = user.map(function(User){
				if(req.session.username == User.username){

					if(User.agreeposts!=null){
						for (var i = User.agreeposts.length - 1; i >= 0; i--) {
							if (User.agreeposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log(User.agreeposts[i]);
								console.log("has");
								state = 1;
							}
						}
						for (var i = User.disagreeposts.length - 1; i >= 0; i--) {
							if (User.disagreeposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log("hasdis");
								state = 2;
							}
						}
						for (var i = User.neutralposts.length - 1; i >= 0; i--) {
							if (User.neutralposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log("hasnnnn");
								state = 3;
							}
						}
					}
				}
				//console.log("aaaa");
			});
			//console.log("bbbb");

		})
	}, 500 );

	setTimeout(function() {

		console.log("-------");
		console.log(state);
		if(state==1){

			User.update({ username: req.session.username},
				{ "$pull": { "agreeposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==2){
			User.update({ username: req.session.username},
				{ "$push": { "agreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$pull": { "disagreeposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==3){
			User.update({ username: req.session.username},
				{ "$push": { "agreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$pull": { "neutralposts": req.session.postId } },
				{multi: true},  
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}
		else{
			User.update({ username: req.session.username},
				{ "$push": { "agreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
		}




	}, 1000 );

	setTimeout(function() {


////////////////////////
if(state==1){

	Post.update({_id: req.session.postId},
		{ $inc : { postagree : -1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
		}

		);

}

else if(state==2){
	Post.update({_id: req.session.postId},
		{ $inc : { postagree : 1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
				//res.redirect(303, '/reviewDetail');
			}

			);
	Post.update({_id: req.session.postId},
		{ $inc : { postdisagree : -1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
				//res.redirect(303, '/reviewDetail');
			}

			);

}

else if(state==3){
	Post.update({_id: req.session.postId},
		{ $inc : { postagree : 1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
				//res.redirect(303, '/reviewDetail');
			}

			);
	Post.update({_id: req.session.postId},
		{ $inc : { postneutral : -1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
				//res.redirect(303, '/reviewDetail');
			}

			);

}
else{

	Post.update({_id: req.session.postId},
		{ $inc : { postagree : 1 }},
		{ upsert: true },
		function(err,Post){
			if (err){
				console.error(err.stack);
				return res.redirect(303, '/reviewDetail');
			}
				//res.redirect(303, '/reviewDetail');
			}

			);
}



/////////////////////



}, 1500 );

	return res.redirect(303, '/reviewDetail');

}

//文章不同意+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
else if (req.body.postDisagree != null) {
	var state= 0;
	setTimeout(function() {

		User.find(function(err, user){
			user = user.map(function(User){
				if(req.session.username == User.username){

					if(User.disagreeposts!=null){
						for (var i = User.agreeposts.length - 1; i >= 0; i--) {
							if (User.agreeposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log(User.agreeposts[i]);
								console.log("has");
								state = 1;
							}
						}
						for (var i = User.disagreeposts.length - 1; i >= 0; i--) {
							if (User.disagreeposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log("hasdis");
								state = 2;
							}
						}
						for (var i = User.neutralposts.length - 1; i >= 0; i--) {
							if (User.neutralposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log("hasnnnn");
								state = 3;
							}
						}
					}
				}

			});
		})
	}, 500 );

	setTimeout(function() {
		


		console.log("-------");
		console.log(state);
		if(state==1){

			User.update({ username: req.session.username},
				{ "$pull": { "agreeposts": req.session.postId } },
				{multi: true},  
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$push": { "disagreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==2){

			User.update({ username: req.session.username},
				{ "$pull": { "disagreeposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==3){
			User.update({ username: req.session.username},
				{ "$push": { "disagreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$pull": { "neutralposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}


		else{


			User.update({ username: req.session.username},
				{ "$push": { "disagreeposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			});
		}



	}, 1000 );

	setTimeout(function() {
		



		if(state==1){

			Post.update({_id: req.session.postId},
				{ $inc : { postagree : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				}

				);

			Post.update({_id: req.session.postId},
				{ $inc : { postdisagree : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);

		}

		else if(state==2){
			Post.update({_id: req.session.postId},
				{ $inc : { postdisagree : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);

		}

		else if(state==3){
			Post.update({_id: req.session.postId},
				{ $inc : { postdisagree : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				}

				);
			Post.update({_id: req.session.postId},
				{ $inc : { postneutral : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				}

				);

		}


		else{
			Post.update({_id: req.session.postId},
				{ $inc : { postdisagree : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			});
		}

	}, 1500 );

	return res.redirect(303, '/reviewDetail');

}


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//文章圍觀
else if (req.body.postNeutral != null) {
	var state=0;
	setTimeout(function() {

		User.find(function(err, user){
			user = user.map(function(User){
				if(req.session.username == User.username){

					if(User.neutralposts!=null){

						for (var i = User.agreeposts.length - 1; i >= 0; i--) {
							if (User.agreeposts[i] == req.session.postId) {

								console.log(req.session.postId);
								console.log(User.agreeposts[i]);
								console.log("has");
								state = 1;
							}
						}
						for (var i = User.disagreeposts.length - 1; i >= 0; i--) {
							if (User.disagreeposts[i] == req.session.postId) {
								console.log(req.session.postId);
								console.log("hasdis");
								state = 2;
							}
						}

						for (var i = User.neutralposts.length - 1; i >= 0; i--) {
							if (User.neutralposts[i] == req.session.postId) {
								console.log(req.session.postId);
								console.log("hasnnnn");
								state = 3;
							}
						}

					}
				}
			});


		});
	}, 500 );

	setTimeout(function() {


		console.log("-------");
		console.log(state);
		if(state==1){

			User.update({ username: req.session.username},
				{ "$pull": { "agreeposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$push": { "neutralposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==2){

			User.update({ username: req.session.username},
				{ "$pull": { "disagreeposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});
			User.update({ username: req.session.username},
				{ "$push": { "neutralposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else if(state==3){
			User.update({ username: req.session.username},
				{ "$pull": { "neutralposts": req.session.postId } },
				{multi: true}, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				});

		}

		else {

			User.update({ username: req.session.username},
				{ "$push": { "neutralposts": req.session.postId } },
				{ new: true, upsert: true }, 
				function(err,User){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			});

		}
		



		
	}, 1000 );





	setTimeout(function() {

		if(state==1){

			Post.update({_id: req.session.postId},
				{ $inc : { postagree : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				}

				);

			Post.update({_id: req.session.postId},
				{ $inc : { postneutral : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);

		}

		else if(state==2){
			Post.update({_id: req.session.postId},
				{ $inc : { postdisagree : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);
			Post.update({_id: req.session.postId},
				{ $inc : { postneutral : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);

		}

		else if(state==3){
			Post.update({_id: req.session.postId},
				{ $inc : { postneutral : -1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				}

				);

		}


		else{
			Post.update({_id: req.session.postId},
				{ $inc : { postneutral : 1 }},
				{ upsert: true },
				function(err,Post){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
				//res.redirect(303, '/reviewDetail');
			}

			);

		}
	}, 1500 );

	return res.redirect(303, '/reviewDetail');

}


//刪除文章
else if (req.body.postDelete != null) {
	setTimeout(function() {
		Response.remove({responsePost: req.session.postId},function(err){
			if (err){
				console.error(err.stack);
			}
		}
		);
	}, 1000 );

	setTimeout(function() {
		Post.remove({_id: req.session.postId},function(err){
			if (err){
				console.error(err.stack);
				req.session.postId = null;
				return res.redirect(303, '/surfReview');
			}
			req.session.postId = null;
			//return res.redirect(303, '/reviewDetail');
		}
		);
	}, 500 );
	return res.redirect(303, '/surfReview');
}

//刪除留言
else if (req.body.responseDelete != null) {
	setTimeout(function() {
		Response.remove(
			{_id: req.body.responseDelete},
			function(err){
				if (err){
					console.error(err.stack);
					return res.redirect(303, '/reviewDetail');
				}
				//return res.redirect(303, '/reviewDetail');
			}
			);
	}, 500 );

	setTimeout(function() {

		Post.update({_id: req.session.postId},
			{ $inc : { postresponsenum : -1 }},
			{ upsert: true },
			function(err,Post){
				if (err){
					console.error(err.stack);
					return res.redirect(303, '/reviewDetail');
				}
				//res.redirect(303, '/reviewDetail');
			}

			);
	}, 1000 );
	return res.redirect(303, '/reviewDetail');
}

//留言
else if (req.body.response != null) {
	setTimeout(function() {
		Response.update(
			{ responseDate: Date.now() },
			{ response: req.body.response,
				responseWriter: req.session.username,
				responsePost: req.session.postId },
				{ upsert: true },
				function(err){
					if (err){
						console.error(err.stack);
						return res.redirect(303, '/reviewDetail');
					}
					//return res.redirect(303, '/reviewDetail');
				}
				);
	}, 500 );

	setTimeout(function() {
		Post.update({_id: req.session.postId},
			{ $inc : { postresponsenum : 1 }},
			{ upsert: true },
			function(err,Post){
				if (err){
					console.error(err.stack);
					return res.redirect(303, '/reviewDetail');
				}
				//res.redirect(303, '/reviewDetail');
			}

			);
	}, 1000 );
	return res.redirect(303, '/reviewDetail');
}

//儲存點選文章
// else if (req.body.postId != null) {
// 	req.session.postId = req.body.postId;
// 	return res.redirect(303, '/reviewDetail');
// }

});

app.get('/reviewPost', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var context = {
		login: login,
		username: req.session.username,
	};
	res.render('reviewPost', context);
});
app.post('/reviewPost', function(req, res){
	Post.update(
		{ postdate: Date.now() },
		{ posttitle: req.body.posttitle,
			postcontent: req.body.postcontent,
			postagree: 0,
			postdisagree: 0,
			postneutral: 0,
			postresponsenum: 0,
			posttype: req.body.posttype,
			poststar: req.body.starnum,
			postowner:req.session.username},
			{ upsert: true },
			function(err){
				if (err){
					console.error(err.stack);
					delete req.session.postId;
					return res.redirect(303, '/surfReview');
				}
				delete req.session.postId;
				return res.redirect(303, '/surfReview');
			}
			);
});






app.get('/rule', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}
	res.render('rule', context);
});

app.get('/aboutUs', function(req, res){
	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}
	res.render('aboutUs', context);
});


app.get('/search', function (req, res) {


	if (req.session.login == null)
		var login = false;
	else
		var login = true;
	var username = req.session.username;
	var context = {
		username: username,
		login: login,
	}

	User.find(function(err, users){
		signupContext = {
			users: users.map(function(User){
				return {
					user: User.username,
				}
			})
		};
	});

//預設文章
var defaultPost = true;
	//點選文章
	if (req.session.postId != null)
		defaultPost = false;

	var word = req.query.keyword;


	Post.find(
		{ $or:[
			{"postcontent": { "$regex": word, "$options": "i" } },
			{"posttitle": { "$regex": word, "$options": "i" } }
			]
		}  ,

		function(err, posts){
			var context = {
				user: signupContext.users,
				defaultPost: defaultPost,
				login: login,
				username: req.session.username,
				posts: posts.map(function(Post){
					return {
						posttitle: Post.posttitle,
						postcontent: Post.postcontent,
						postagree: Post.postagree,
						postdisagree: Post.postdisagree,
						postneutral: Post.postneutral,
						postresponsenum: Post.postresponsenum,
						postowner: Post.postowner,
						posttype:Post.posttype,
						poststar:Post.poststar,

						_id: Post._id,
					}
				})
			};
			res.render('surfReview', context);
		}

		);

});









app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});

app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
	console.log("Server started on", app.get('port'));
});



