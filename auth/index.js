
var app = null, _login = null, _register = null, _reset_password = null, _login = null, _profile = null;

const LoginPage = Page.extend({
	el: "#login",
	initialize: function( onLinkClick ) {
		this.onLinkClick = onLinkClick;
		_.extend( this, Backbone.Events );
		this.$el.find("#waiter").html(this.waiter.$el );
		console.log( this );
		return this;
	},
	events: {
		"submit form": "done",
		"click .go-home": "goHome",
		"click a": "onLinkClick"
	},
	done: function( ev ) {
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		this.submit(form);
	},
	submit: function( form ) {
		var self = this;
		if( form.password.length < 4 ) {
			toastr.error( "Password should be more than 4 letter" );
			return;
		}
		this.waiter.render();
		Parse.User.logIn( form.email, form.password, {
			success: function(user) {
				self.trigger( "login", user );
				self.waiter.stop();
			},
			error: function(user, error) {
				self.error( error );
			}
		});
	},
	error: function( error ) {
		this.waiter.stop();
		toastr.error( error.message, error.code );
		console.log( error );
	}
});
const RegisterPage = LoginPage.extend({
	el: "#register",
	submit: function( form ) {
		var self = this;
		if( form.password.length < 4 ) {
			toastr.error( "Password should be more than 4 letter" );
			return;
		}
		var user = new Parse.User();
		user.set("username", form.email );
		user.set("name", form.name );
		user.set("password", form.password );
		user.set("email", form.email );
		this.waiter.render();
		user.signUp(null, {
			success: function(user) {
				self.trigger( "login", user );
			},
			error: function(user, error) {
				self.error( error );
			}
		});
	}
});
const ResetPasswordPage = LoginPage.extend({
	el: "#reset-password",
	submit: function( form ) {
		var self = this;
		Parse.User.requestPasswordReset( form.email, {
			success: function() {
				self.waiter.stop();
				toastr.info("Please check your email to reset password");
			},
			error: function(error) {
				self.error( error );
			}
		});
	}
});
const ProfilePage = LoginPage.extend({
	el: "#profile",
	render: function() {
		var user = Parse.User.current();
		this.$el.find("#name").val( user.get("name") );
		this.$el.find("#email").val( user.get("email") );
		this.$el.find("#mobile").val( user.get("mobile") );
		$(".page").hide();
		this.$el.show();
		return this;
	},
	submit: function( form ) {
		var self = this;
		var user = Parse.User.current();
		user.set("name", form.name );
		user.set("mobile", form.mobile );
		this.waiter.render();
		user.save(null, {
			success: function(user) {
				self.waiter.stop();
			},
			error: function(user, error) {
				self.error( error );
			}
		});
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"auth/index.html": 						"profile",
		"auth/logout.html": 						"logout",
		"auth/register.html": 						"register",
		"auth/login.html": 						"login",
		"auth/reset-password.html": 				"reset_password"
	},
	routeIt: function( ev ) {
		var href = $(ev.currentTarget).attr("href");
		if ( this.routes.hasOwnProperty( href.substring(1) ) ) {
			ev.preventDefault();
			this.navigate( href,  { trigger:true });
		}
	},
	profile: function() {
		if( !_profile ) _profile = new ProfilePage((e)=> this.routeIt( e ));
		_profile.render();
	},
	logout: function() {
		toastr.info( "Logging out" );
		db.delete().then(()=> console.log( "Database deleted" ))
		Parse.User.logOut().then(()=> {
			this.navigate("auth/register.html", { trigger: true, replace:true  })
		});
	},
	register: function() {
		if( !_register ) _register = new RegisterPage((e)=> this.routeIt( e ));
		_register.render();
		_register.on( "login", user=> this.navigate("auth/index.html", {trigger:true}) );
	},
	login: function() {
		if( !_login ) _login = new LoginPage((e)=> this.routeIt( e ));
		_login.render();
		_login.on( "login", user=> this.navigate("auth/index.html", {trigger:true}) );
	},
	reset_password: function() {
		if( !_reset_password ) _reset_password = new ResetPasswordPage((e)=> this.routeIt( e ));
		_reset_password.render();
	},
	execute: function(callback, args, name) {
		console.log( name );
		var user = Parse.User.current();
		if( user ) {
			if( " auth/login.html auth/register.html auth/reset_password.html".indexOf( name ) != -1 ) {
				this.navigate( "auth/index.html", { trigger:true, replace:true } );
				return;
			}
		} else {
			if( " auth/login.html auth/register.html auth/reset_password.html".indexOf( name ) == -1 ) {
				this.navigate( "auth/login.html", { trigger:true, replace:true } );
				return;
			}
		}
		args.push(args.pop());
		if (callback) callback.apply(this, args);
	}
});
app = new Routes();
Backbone.history.start({ pushState:true });
var currentLocation = location.href.substring( location.href.lastIndexOf("/") )
console.log( currentLocation );
if( currentLocation == "/" )
	app.navigate( "auth/index.html",  { trigger:true, replace:true });
else
	app.navigate( "auth"+currentLocation,  { trigger:true, replace:true });

