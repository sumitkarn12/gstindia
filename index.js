Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';

const db = new Dexie( "GST" );
db.version( 1 ).stores({
	"asked": "++objectId, name, email, question, createdAt, updatedAt",
	"question": "++objectId, name, email, question, answer, answeredBy, createdAt, updatedAt"
});
db.open().catch( console.info );

toastr.options = {
	"progressBar": true,
	"positionClass": "toast-bottom-left"
}

$.fn.serializeObject = function() {
	var o = Object.create(null),
	elementMapper = function(element) {
		element.name = $.camelCase(element.name);
		return element;
	},
	appendToResult = function(i, element) {
		var node = o[element.name];
		if ('undefined' != typeof node && node !== null) {
			o[element.name] = node.push ? node.push(element.value) : [node, element.value];
		} else {
			o[element.name] = element.value;
		}
	};
	$.each($.map(this.serializeArray(), elementMapper), appendToResult);
	return o;
};

const Spin = Backbone.View.extend({
	el: "#spin",
	initialize: function() {
		return this;
	},
	render: function( message ) {
		if( message )
			this.$el.find( "#spin-message" ).html( message );
		else
			this.$el.find( "#spin-message" ).html( "Loading..." );
		this.$el.show();
		return this;
	},
	show: function( message ) {
		return this.render( message );
	},
	hide: function() {
		this.$el.hide();
		return this;
	}
});
var spin = new Spin();
const Waiter = Backbone.View.extend({
	template: `<div style="display:none;"><div style="display:flex; justify-content:center; align-items:center; height: 150px; font-size: 48px;"><i class="fa fa-circle-o-notch w3-spin"></i></div></div>`,
	initialize: function() {
		this.$el = $( this.template );
		return this;
	},
	render: function() {
		this.$el.show();
		return this;
	},
	stop: function() {
		this.$el.hide();
		return this;
	}

});

var app = null, _index = null, _ask_expert = null, _myca = null;
var _auth = null;

const DataModel = Backbone.Model.extend({ idAttribute: "objectId" });

const IndexPage = Backbone.View.extend({
	el: "#index",
	initialize: function() {
		var user = Parse.User.current();
		if( user ) {
			var $e = this.$el.find( "#user-detail" );
			$e.find(".name").html( user.get("name") );
			$e.find(".email").html( user.get("email") );
		}
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .user": "userAction"
	},
	userAction: function( ev ) {
		ev.preventDefault();
		var $e = this.$el.find("#user-detail");
		if( Parse.User.current() )
			( $e.hasClass("w3-show") ) ? $e.removeClass("w3-show") : $e.addClass("w3-show")
		else
			location.href = "/auth";
	}
});

const AskExpertPage = Backbone.View.extend({
	el: "#ask-expert",
	collection: new Map(),
	skip: 0,
	limit: 20,
	waiter: new Waiter,
	template: `<div class="w3-accordion"><h4 style='cursor:pointer;' class="w3-container w3-theme-l4"><%= question %></h4><div style='display:none;' class="w3-border"><div class="w3-container w3-padding-16"><div><%= answer %></div></div><div class="w3-padding w3-border-top"><div class="w3-tiny"><%= answeredBy %></div><div class="w3-tiny"><%= answeredAt %></div></div></div></div>`,
	initialize: function() {
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.form = this.$el.find("#question").trumbowyg({
			 btns: [
				['formatting', 'bold', 'italic'],
				['insertImage','link'],
				'orderedList',
				['fullscreen']
			],
			svgPath: '/assets/trumbowyg/dist/ui/icons.svg'
		});
		if( Parse.User.current() )
			this.userEmail = Parse.User.current().get( "username" );
		else if ( localStorage.getItem( "userEmail" ) )
			this.userEmail = localStorage.getItem( "userEmail" );
		this.$el.find("#load-more-button").click();
		if( this.userEmail )
			this.$el.find("#email").val( this.userEmail );
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click .submit": "submit",
		"click #load-more-button": "load_more",
		"click .refresh": "refresh",
		"click .w3-accordion h4": "toggleAccordion"
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find("#recent-question").empty();
		this.$el.find("#load-more-button").click();
	},
	toggleAccordion: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		this.$el.find(".w3-accordion>div").hide();
		target.next().show();
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		if( !this.userEmail ){
			toastr.error( "Recent questions could not be loaded", "Email not found" );
			self.$el.find("#load-more-button").hide();
			return;
		}
		this.waiter.render();
		var q = new Parse.Query( Parse.Object.extend("asked") );
		q.equalTo( "user_email", this.userEmail );
		q.limit( self.limit );
		q.skip( self.skip );
		q.descending( "updatedAt" );
		q.find().then(res=>{
			self.skip += self.limit;
			$.each( res, ( i, e ) => {
				try {
					self.collection.set( e.id, e );
					var json = e.toJSON();
					json.createdAt = e.get("createdAt").toLocaleString();
					json.updatedAt = e.get("updatedAt").toLocaleString();
					if( !json.answer ) {
						json.answer = "Answer awaited";
						json.answeredAt = "";
						json.answeredBy = "";
					} else {
						json.answeredAt = e.get("answeredAt").toLocaleString();
						json.answeredAt = e.get("answeredBy").toString();
					}
					var card = self.template( json );
					self.$el.find("#recent-question").append( card );					
				} catch(e){
					console.log(e)
				}
			});
			if( res.length == 0 )
				self.$el.find("#load-more-button").hide();
			else
				self.$el.find("#load-more-button").show();
			self.waiter.stop();
		}).catch( err => {
			console.warn( err );
			self.waiter.stop();
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	submit: function( ev ) {
		ev.preventDefault();
		this.userEmail = $.trim(this.$el.find("#email").val());
		if( this.userEmail == "" ) {
			toastr.error( "Email required" );
			return;
		}
		localStorage.setItem( "userEmail", this.userEmail );
		var question = this.$el.find("#question").html();
		this.$el.find("#question").empty();
		var q = new Parse.Object( "asked" );
		q.set( "user_email", this.userEmail );
		q.set( "question", question.trim() );
		var acl = new Parse.ACL();
		if( Parse.User.current() ) {
			q.set( "user", Parse.User.current() );
			acl.setReadAccess( Parse.User.current(), true );
			acl.setWriteAccess( Parse.User.current(), true );
		} else {
			acl.setPublicReadAccess( true );
		}
		acl.setRoleReadAccess( "admin", true );
		acl.setRoleWriteAccess( "admin", true );
		q.setACL( acl );
		this.waiter.render();
		q.save().then(s=>{
			this.waiter.stop();
			console.log( s );
		}).catch( err=> {
			this.waiter.stop();
			console.log( s );
		});
	}
});

const CaPage = Backbone.View.extend({
	el: "#my-ca",
	skip: 0,
	limit: 20,
	collection: new Map(),
	waiter: new Waiter,
	inputs: {
		income_tax_return: [ "form_16", "pan", "bank_statement", "adhaar_card" ],
		gst: [ "gstin", "invoice_detail", "pan", "address_proof", "party_ledger" ],
		audit: [ "pan", "tally_account", "bank_statement", "previous_year_audit_report", "gst_return_copy", "party_ledger" ]
	},
	initialize: function() {
		this.$el.prepend( this.waiter.$el );
		var self = this;
		this.model = new Parse.Object("cawork");
		this.$el.find( "#load-more-button" ).click();
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		this.changeType( null, "income_tax_return" );
		this.$el.find("#type-changer").val("income_tax_return");
		if( id ) this.renderWorkStatus( id );
		else this.$el.find(".work-detail").hide();
		return this;
	},
	events: {
		"click .go-back" : "goBack",
		"click .add-more-document" : "openAddMoreDocumentDialog",
		"click #more-document-modal .close" : "closeAddMoreDocumentDialog",
		"click #more-document-modal .done" : "doneAddMoreDocumentDialog",
		"change #more-document-modal .file-object" : "changeFileObject",
		"change .new-work .w3-input" : "onChangeFile",
		"change #type-changer" : "changeType",
		"click #load-more-button" : "load_more",
		"click .refresh" : "refresh",
		"click .work-item" : "loadWorkItem",
		"click .submit" : "create"
	},
	create: function( ev ) {
		ev.preventDefault();
		var self = this;
		var acl = new Parse.ACL( Parse.User.current() );
		acl.setRoleWriteAccess( "admin", true );
		acl.setRoleReadAccess( "admin", true );
		this.model.setACL( acl );
		this.model.set( "user", Parse.User.current() );
		this.model.set( "status", "created" );
		this.model.set( "message", "Case created" );
		this.waiter.render();
		this.model.save(null, {
			success: function( res ) {
				self.waiter.stop();
				console.log( "saving cawork", res, res.toJSON() );
				toastr.info( "Great Work! We'll get back to you shortly. Thank you" );
				self.model = new Parse.Object( 'cawork' );
			},
			error: function( err ) {
				self.waiter.stop();
				console.log( "saving cawork", err, err.toJSON() );
				toastr.error( err.message, err.code );
			}
		});
	},
	changeType: function( ev, type ) {
		try {
			ev.preventDefault();
			type = $( ev.currentTarget ).val();
		} catch(e) {}
		this.$el.find( "#input-forms>div" ).hide();
		var self = this;
		$.each( this.inputs[ type ], ( idx, el )=>{
			self.$el.find( "#input-forms>."+el ).show();
		});
		this.model.set( "type", type );
	},
	onChangeFile: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var self = this;
		if (target[0].files.length > 0) {
			target.parent().next().show();
			var file = target[0].files[0];
			var name = target.attr( "name" );
			var parseFile = new Parse.File(name, file);
			parseFile.save().then(file=>{
				target.parent().next().hide();
				self.model.add( "files", { name: name, file:file, addedAt: new Date() });
			}, console.info );
		}
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find(".contents").empty();
		this.$el.find("#load-more-button").click();
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	loadWorkItem: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget ).data("id");
		app.navigate( "#my-ca/"+id );
		this.render( id );
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var template = `<li data-id="<%= objectId %>" style="cursor:pointer;" class="work-item"><div class="w3-large"><%= type %></div><div class="status w3-small"><%= status %></div><div class="updated-at w3-tiny"><%= updatedAt %></div></li>`;
		template = _.template( template );
		this.waiter.render();
		var self = this;
		var q = new Parse.Query( Parse.Object.extend("cawork") );
		q.skip( this.skip );
		q.limit( this.limit );
		q.descending( "updatedAt" );
		q.find().then( res => {
			self.waiter.stop();
			$.each( res, ( i, e ) => {
				self.collection.set( e.id, e );
				try {
					var json = e.toJSON();
					json.updatedAt = e.get( "updatedAt" ).toLocaleString();
					if( !json.status ) json.status = "PENDING";
					json.status = json.status.toUpperCase();
					json.type = json.type.toUpperCase().replace( /[\-\_]/g, " " );
					var card = template( json );
					self.$el.find( ".contents" ).append( card );					
				} catch( e1 ) {
					console.log( e1 );
				}
			});
			self.skip += self.limit;
			if( res.length == 0 ) self.$el.find("#load-more-button").hide();
			else self.$el.find("#load-more-button").show();
		}).catch((e)=>{
			self.waiter.stop();
			console.log( "Load error", e );
		});
	},
	renderWorkStatus: function( id ) {
		var template = `<li class="w3-display-container">
							<div>
								<div class="name"><%= name %></div>
								<div class="w3-tiny added-at"><%= addedAt %></div>
							</div>
							<div class="w3-display-right">
								<a target="_blank" class="w3-button w3-theme-l5"><i class="fa fa-download"></i></a>
							</div>
						</li>`;
		template = _.template( template );
		var self = this;
		var dummyModel = new Parse.Object( 'cawork' );
		dummyModel.set( "objectId", id );
		this.waiter.render();
		this.fetch( dummyModel ).then( r => {
			self.waiter.stop();
			self.editable = r;
			self.collection.set( r.id, r );
			self.$el.find(".work-detail").show();
			$(window).scrollTop( self.$el.find(".work-detail")[0].offsetTop );
			self.$el.find(".work-detail .type").html( r.get( "type" ).replace( /[_\-]/g, " " ).toUpperCase() );      
			self.$el.find(".work-detail .created-at").html( r.get( "createdAt" ).toLocaleString() );
			self.$el.find(".work-detail .status").html( r.get( "status" ).toUpperCase() );
			self.$el.find(".work-detail .message").html( r.get( "message" ) );
			self.$el.find(".work-detail .updated-at").html( r.get( "updatedAt" ).toLocaleString() );
			if(r.get("assignedTo"))
				self.$el.find(".work-detail .assigned-to").html( r.get( "assignedTo" ).id );
			else
				self.$el.find(".work-detail .assigned-to").html( "Not assigned yet" );
			self.$el.find(".work-detail .files").empty();
			$.each( r.get( "files" ), ( i,x )=>{
				try {
					var url = x.file.url();
					var card = template( x );
					card = $(card);
					card.find("a").attr("href", url);
					card.find(".added-at").html(x.addedAt.toLocaleString());
					self.$el.find(".work-detail .files").append( card );
				} catch(e) { console.log( e ); }
			});
		}).catch( e => {
			self.waiter.stop();
			console.log( e );
			toastr.error( e.message, e.code );
		});
	},
	fetch: function( dummyModel ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			if( dummyModel.get( "type" ) )
				resolve( dummyModel );
			else if( self.collection.get( dummyModel.id ) ) {
				dummyModel = self.collection.get( dummyModel.id );
				resolve( dummyModel );
			} else
				dummyModel.fetch().then( resolve ).catch( reject );
		});
	},
	changeFileObject: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var name = $.trim(this.$el.find("#more-document-modal #file-name").val());
		if( name == "" ) {
			toastr.info( "Enter file name" );
			return;
		}
		var self = this;
		if (target[0].files.length > 0) {
			var file = target[0].files[0];
			var parseFile = new Parse.File(name, file);
			parseFile.save().then(file=>{
				self.editable.add( "files", { name: name, file:file, addedAt: new Date() });
				self.$el.find("#more-document-modal .done").show();
			}, console.info );
		}
	},
	openAddMoreDocumentDialog: function( ev ) {
		ev.preventDefault();
		this.$el.find("#more-document-modal").show();
		this.$el.find("#more-document-modal .done").hide();
	},
	closeAddMoreDocumentDialog: function( ev ) {
		ev.preventDefault();
		this.$el.find("#more-document-modal").hide();
	},
	doneAddMoreDocumentDialog: function( ev ) {
		ev.preventDefault();
		this.$el.find("#more-document-modal").hide();
		this.waiter.render();
		var self = this;
		self.editable.save(null).then(r=>{
			self.waiter.stop();
			self.render( self.editable.id );
		}).catch( console.error );
	}
});

const AuthPage = Backbone.View.extend({
	el: "#auth",
	initialize: function() {
		_.extend( this, Backbone.Events );
		this.closeAllPage();
		this.on( "login", user=>{
			console.log( user, user.toJSON());
			location.href="";
		});
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		this.$el.find(".page").show().first().click();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click .page": "openPage",
		"submit #login": "login",
		"submit #register": "register",
		"submit #reset-password": "resetPassword",
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	closeAllPage: function() {
		this.$el.find(".page").each((i,e)=>{
			$(e).next().hide();
		});
	},
	openPage: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		this.closeAllPage();
		target.next().show();
	},
	login: function( ev ) {
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		var self = this;
		spin.render();
		Parse.User.logIn( form.email, form.password, {
			success: function(user) {
				self.trigger( "login", user );
			},
			error: function(user, error) {
				spin.hide();
				self.$el.find("#message").html("Error: " + error.code + " " + error.message);
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
		spin.render();
		user.signUp(null, {
			success: function(user) {
				self.trigger( "login", user );
			},
			error: function(user, error) {
				spin.hide();
				self.$el.find("#message").html("Error: " + error.code + " " + error.message);
			}
		});
	},
	resetPassword: function( ev ) {
		ev.preventDefault();
		var form = $( ev.currentTarget ).serializeObject();
		spin.render();
		var self = this;
		Parse.User.requestPasswordReset( form.email, {
			success: function() {
				spin.hide();
				self.$el.find("#message").html("Please check your email to reset password");
			},
			error: function(error) {
				spin.hide();
				self.$el.find("#message").html("Error: " + error.code + " " + error.message);
			}
		});
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"index",
		"ask-expert": 							"ask_expert",
		"my-ca(/:id)": 							"myCa",
		"auth": 								"auth"
	},
	index: function() {
		if( !_index ) _index = new IndexPage();
		_index.render();
	},
	ask_expert: function() {
		if( !_ask_expert ) _ask_expert = new AskExpertPage();
		_ask_expert.render();
	},
	myCa: function( id ) {
		if( !_myca ) _myca = new CaPage();
		_myca.render( id );
	},
	auth: function( type ) {
		if( !_auth ) _auth = new AuthPage();
		_auth.render( type );
	},
	execute: function(callback, args, name) {
		if( ( name == "myCa" || name == "work_status" )&& !Parse.User.current() ) {
			app.navigate( "auth", { trigger:true });
			return;
		}
		args.push(args.pop());
		if (callback) callback.apply(this, args);
	}
});
app = new Routes();
Backbone.history.start();

