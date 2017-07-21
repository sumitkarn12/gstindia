
var app = null, _auth = null, _profile = null;

const AuthPage = Backbone.View.extend({
	el: "#auth",
	waiter: new Waiter,
	initialize: function() {
		_.extend( this, Backbone.Events );
		this.$el.prepend( this.waiter.$el );
		this.on( "login", user=> location.href = "/" );
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		this.$el.find(".page").hide();
		id = $.trim( id );
		if( id == "" ) id = "register";
		this.$el.find("#"+id).show();
		return this;
	},
	events: {
		"click .page": "openPage",
		"submit #login form": "login",
		"submit #register form": "register",
		"submit #reset-password form": "resetPassword",
	},
	login: function( ev ) {
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		var self = this;
		this.waiter.render();
		Parse.User.logIn( form.email, form.password, {
			success: function(user) {
				self.trigger( "login", user );
			},
			error: function(user, error) {
				self.error( user, error );
			}
		});
	},
	register: function( ev ) {
		var self = this;
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
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
				self.error( user, error );
			}
		});
	},
	resetPassword: function( ev ) {
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		this.waiter.render();
		var self = this;
		Parse.User.requestPasswordReset( form.email, {
			success: function() {
				self.waiter.stop();
				toastr.info("Please check your email to reset password");
			},
			error: function(error) {
				self.error( null, error );
			}
		});
	},
	error: function( u, e ) {
		this.waiter.stop();
		toastr.error( e.message, e.code );
	}
});

const ProfilePage = Backbone.View.extend({
	el: "#profile",
	waiter: new Waiter,
	initialize: function() {
		this.$el.find("form button").append( this.waiter.$el );
		var user = Parse.User.current();
		this.$el.find("#name").val( user.get("name") );
		this.$el.find("#email").val( user.get("email") );
		this.$el.find("#mobile").val( user.get("mobile") );
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"submit form": "update"
	},
	update: function( ev ) {
		var self = this;
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		var user = Parse.User.current();
		user.set("name", form.name );
		user.set("mobile", form.mobile );
		this.waiter.render();
		user.save(null, {
			success: function(user) {
				self.waiter.stop();
			},
			error: function(user, error) {
				self.error( user, error );
			}
		});
	},
	error: function( u, e ) {
		this.waiter.stop();
		toastr.error( e.message, e.code );
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"auth",
		"profile": 								"profile",
		"logout": 								"logout",
		"auth(/:type)": 						"auth"
	},
	profile: function() {
		if( !_profile ) _profile = new ProfilePage();
		_profile.render();
	},
	logout: function() {
		toastr.info( "Logging out" );
		db.delete().then( console.log )
		Parse.User.logOut().then(()=>{
			location.href = "/auth";
		}).catch(()=> {
			location.href = "/";
		});
	},
	auth: function( type ) {
		if( !_auth ) _auth = new AuthPage();
		_auth.render( type );
	},
	execute: function(callback, args, name) {
		var user = Parse.User.current();
		if( user && (name == "auth" || name == "") ) {
			this.navigate( "#profile", { trigger:true } );
			return;
		}
		args.push(args.pop());
		if (callback) callback.apply(this, args);
	}
});
app = new Routes();
Backbone.history.start();

