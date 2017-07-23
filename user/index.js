
// USER PAGE
var app = null, _index = null, _ask_expert = null, _work = null, _auth = null, _users = null;
const AskExpertPage = Page.extend({
	el: "#ask-expert",
	pagename: "asked",
	db : db.asked,
	initialize: function() {
		this.renderWaiter();
		this.byStatus = new Option("status", this.$el.find("#by-status"));
		this.byUserEmail = new Option("user_email", this.$el.find("#by-user-email"));
		this.filterable.on("add", (model)=>{
			if( model.get("status") == "true" )
				this.byStatus.add({ id: model.get("status"), status: "Answered"});
			else if( model.get("status") == "false" )
				this.byStatus.add({ id: model.get("status"), status: "Not Answered"});
			this.byUserEmail.add({ id: model.get("user_email"), user_email: model.get("user_email") });
		});
		this.filterable.on("reset", (model)=>{
			this.byStatus.reset();
			this.byUserEmail.reset();
		});
		this.template = _.template( this.$el.find("#question-list-template").html() );
		this.form = this.$el.find("#question").trumbowyg({
			 btns: [
				['formatting', 'bold', 'italic'],
				['insertImage','link', 'orderedList'],
				['fullscreen']
			],
			svgPath: '/assets/trumbowyg/dist/ui/icons.svg'
		});
		this.form.on( "tbwchange",  ev => {
			var value = $( ev.currentTarget ).html();
			value = $.trim( value );
			if( value.length > 0 ) this.$el.find("#ask-modal .done").removeAttr( "disabled" );
			else this.$el.find("#ask-modal .done").attr( "disabled", "" );
		});
		if( Parse.User.current() ) this.userEmail = Parse.User.current().get( "username" );
		else if ( localStorage.getItem( "userEmail" ) ) this.userEmail = localStorage.getItem( "userEmail" );
		if( this.userEmail ) this.$el.find("#email").val( this.userEmail );
		this.$el.find("#contents").empty();
		this.renderFilterDate();
		this.sync();
		this.changeDay( new Date() );
		return this;
	},
	renderList: function( object ) {
		this.filterable.add({
			objectId: object.objectId,
			status: object.hasOwnProperty("answer").toString(),
			user_email: object.user_email
		});
		var ul = this.$el.find("#contents");
		object.updatedAt = object.updatedAt.toLocaleString();
		ul.append( this.template( object ) );
	},
	events: {
		"change #filter-panel select": "applyFilter",
		"click .go-back": "goBack",
		"click .go-home": "goHome",
		"click .question-list": "viewAnswer",
		"click .open-ask-modal": "openAskModal",
		"click #ask-modal .done": "doneAskModal",
		"click #ask-modal .close": "closeAskModal",
		"click #answer-modal .close": "closeAnswerModal"
	},
	hardRefresh: function() {
		var self = this;
		return new Promise( (resolve, reject )=>{
			this.waiter.render();
			if( !this.userEmail ) {
				reject({
					code: 404,
					message: "Email not found"
				});
				return;
			}
			var q = new Parse.Query( Parse.Object.extend("asked") );
			q.equalTo( "user_email", this.userEmail );
			q.limit( 1000 );
			q.descending( "updatedAt" );
			q.find().then(res=>{
				var arr = [];
				$.each( res, ( i, e ) => {
					arr.push( self.toDb( e ) );
				});
				self.db.bulkPut( arr );
				db.sync.put({ name: "asked", at: new Date() });
				self.waiter.stop();
				resolve( arr );
			}).catch( err => {
				self.waiter.stop();
				reject( err );
			});
		});
	},
	toDb: function( e ) {
		var json = e.toJSON();
		if( e.has("user") ) json.user = e.get("user").id;
		if( e.has("answeredBy") ) json.answeredBy = e.get("answeredBy").id;
		if( e.has("answeredAt") ) json.answeredAt = e.get("answeredAt");
		json.createdAt = e.get("createdAt");
		json.updatedAt = e.get("updatedAt");
		json.date = e.get("updatedAt").toDateString();
		return json;
	},
	find: function( date ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			self.db.where( "date" ).equalsIgnoreCase( date.toDateString() ).
			and((v)=>(v.user_email.localeCompare(this.user_email))).
			toArray(v=> resolve( v ));
		});
	},
	viewAnswer: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		this.db.get( id ).then( response => {
			console.log( response );
			var model = new Model( response );
			var answerPage = new AnswerPage({
				mode: "view",
				model: model
			});
		});
	},
	openAskModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#ask-modal").show();
		this.$el.find("#ask-modal .done").attr( "disabled", "" );
	},
	closeAskModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#ask-modal").hide();
	},
	doneAskModal: function( ev ) {
		ev.preventDefault();
		var self = this;
		var question = $.trim(this.$el.find("#question").html());
		this.userEmail = $.trim(this.$el.find("#email").val());
		if( this.userEmail == "" ) {
			toastr.error( "Email required" );
			return;
		}
		localStorage.setItem( "userEmail", this.userEmail );
		this.$el.find("#question").empty();
		var q = new Parse.Object( "asked" );
		q.set( "user_email", this.userEmail );
		q.set( "question", question.trim() );
		q.save().then(e=>{
			var json = e.toJSON();
			if( e.has("user") ) json.user = e.get("user").id;
			if( e.has("answeredBy") ) json.answeredBy = e.get("answeredBy").id;
			if( e.has("answeredAt") ) json.answeredAt = e.get("answeredAt");
			json.createdAt = e.get("createdAt");
			json.updatedAt = e.get("updatedAt");
			json.date = e.get("updatedAt").toDateString();
			db.asked.put( json ).then( r => {
				self.changeDay( e.get("createdAt") );
				db.asked.orderBy("date").uniqueKeys().then(keys => this.datefilter.updateSelectableDates(keys));
			});
			toastr.info( "Saved" );
		}).catch( err=> {
			console.log( err );
			toastr.error( err.message, err.code );
		});
		this.$el.find("#ask-modal").hide();
	}
});
const WorkPage = Page.extend({
	el: "#work",
	pagename: "cawork",
	db: db.cawork,
	collection: new Map(),
	initialize: function() {
		this.byType = new Option("type", this.$el.find("#by-type"));
		this.byUser = new Option("user", this.$el.find("#by-user"));
		this.filterable.on("add", (model)=>{
			this.byUser.add({ id: model.get("user"), user: model.get("user") });
			this.byType.add({ id: model.get("type"), type: model.get("type") });
		});
		this.filterable.on("reset", (model)=>{
			this.byUser.reset();
			this.byType.reset();
		});
		this.template = _.template(this.$el.find("#template").html());
		this.renderWaiter();
		this.renderFilterDate();
		this.sync();
		this.changeDay( new Date() );
		return this;
	},
	renderList: function( object ) {
		this.getUser(object.user).then(r=>{
			this.filterable.add({
				objectId: object.objectId,
				type: object.type,
				user: r.get("name")
			});
		});
		var ul = this.$el.find( "#contents" );
		var li = ul.find("#li-"+object.objectId);
		object.updatedAt = object.updatedAt.toLocaleString();
		object.type = object.type.replace(/[\W_]/g, " ").toUpperCase();
		if( li.length == 0 ) {
			var card = $(this.template( object ));
			ul.append( card );
		} else {
			li.find(".updated-at").html(object.updatedAt);
		}
	},
	events: {
		"change #filter-panel select": "applyFilter",
		"click .work-list": "view",
		"click .create": "create",
		"click .edit": "edit",
		"click .go-home": "goHome",
		"click .go-back": "goBack"
	},
	toDb: function( parseObject ) {
		var json = parseObject.toJSON();
		json.user = parseObject.get("user").id;
		json.createdAt = parseObject.get("createdAt");
		json.updatedAt = parseObject.get("updatedAt");
		json.date = parseObject.get("updatedAt").toDateString();
		return json;
	},
	view: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget ).data( "id" );
		db.cawork.get( id ).then( res => {
			var Model = Backbone.Model.extend();
			var model = new Model( res );
			var wf = new WorkForm({
				mode: "view",
				model: model
			});
		});
	},
	onSubmit: function( parseObject ) {
		var self = this;
		console.log( "Saving", parseObject );
		if( parseObject.dirty() ) {
			parseObject.save().then(r=> {
				this.collection.set( parseObject.id, parseObject );
				db.cawork.put( self.toDb( r ) )
				.then((k)=>{
					this.changeDay( r.get("createdAt") );
					console.log("Updated", k);
					toastr.info( "Saved" );
					db.cawork.orderBy("date").uniqueKeys().then(keys => this.datefilter.updateSelectableDates(keys));
				}).catch(console.error);
			}).catch(err=>{
				console.log( err )
				toastr.info( err.message, err.code );
			});
		} else {
			console.log( "No change found" );
		}
	},
	create: function( ev ) {
		ev.preventDefault();
		var self = this;
		var wf = new WorkForm({
			mode: "edit",
			onSubmit: function( model ) { self.onSubmit( model ); }
		});
	},
	edit: function( ev ) {
		ev.stopPropagation();
		var self = this;
		var id = $( ev.currentTarget ).data( "id" );
		var model = this.collection.get( id );
		if( model ) {
			var wf = new WorkForm({
				mode:"edit",
				model: model,
				onSubmit: function( model ) { self.onSubmit( model ); }
			});
		} else {
			this.waiter.render();
			var model = new Parse.Object( "cawork" );
			model.set( "objectId", id );
			model.fetch().then(r=>{
				this.waiter.stop();
				this.collection.set( id, model );
				var wf = new WorkForm({
					mode:"edit",
					model: model,
					onSubmit: function( model ) { self.onSubmit( model ); }
				});
			}).catch(err=>{
				console.log( err )
				toastr.info( err.message, err.code );
			});
		}
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 										"index",
		"user/index.html": 							"index",
		"user/ask-expert.html": 						"ask_expert",
		"user/work.html": 							"work"
	},
	index: function() {
		if( !_index ) _index = new IndexPage("user", ( ev )=>{
			var href = $(ev.currentTarget).attr("href");
			if ( this.routes.hasOwnProperty( href.substring(1) ) ) {
				ev.preventDefault();
				this.navigate( href,  { trigger:true });
			}
		});
		_index.render();
	},
	ask_expert: function() {
		if( !_ask_expert ) _ask_expert = new AskExpertPage();
		_ask_expert.render();
	},
	work: function( id ) {
		if( !_work ) _work = new WorkPage();
		_work.render( id );
	},
	execute: function(callback, args, name) {
		if( name == "work" && !Parse.User.current() ) {
			location.href="/auth";
			return;
		}
		args.push(args.pop());
		if (callback) callback.apply(this, args);
	}
});
app = new Routes();
Backbone.history.start({ pushState:true });
var currentLocation = location.href.substring( location.href.lastIndexOf("/") )
if( currentLocation == "/" )
	app.navigate( "user/index.html",  { trigger:true, replace:true });
else
	app.navigate( "user"+currentLocation,  { trigger:true, replace:true });

