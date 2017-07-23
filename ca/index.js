
// Sun Jul 23 20:03:24 2017

//CA Panel
var app = null, _index = null, _ask_expert = null, _users = null, _workpage = null;
const AskExpertPage = Page.extend({
	el: "#ask-expert",
	pagename: "asked",
	db : db.asked,
	cols: new Map(),
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
		"click .question-list .edit": "editAnswer"
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
	getModel: function( id ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			var model = self.cols.get( id );
			if( model ) resolve( model );
			else {
				model = new Parse.Object( "asked" );
				model.set("objectId", id);
				self.waiter.render();
				model.fetch().then(r=>{
					self.cols.set( r.id, r );
					self.waiter.stop();
					resolve(r)
				}).catch(e=>{
					self.waiter.stop();
					console.log( e );
					toastr.error( e.message, e.code);
				});
			}
		});
	},
	editAnswer: function( ev ) {
		ev.preventDefault();
		ev.stopPropagation();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		var self = this;
		this.getModel( id ).then( model => {
			var answerPage = new AnswerPage({
				mode: "edit",
				model: model,
				callback: function( dirtyModel ) {
					if( dirtyModel.dirty() ) {
						dirtyModel.save().then(response=>{
							var json = self.toDb( response );
							self.db.put( json ).then(()=>self.changeDay( response.get("createdAt") ));
						}).catch(err=>{
							console.log( err );
							toastr.error(err.message, err.code);
						});
					}
				}
			});
		});
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
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"index",
		"ca/index.html":						"index",
		"ca/question.html":						"question",
		"ca/work.html":							"work"
	},
	execute: function(callback, args, name) {
		if( !Parse.User.current() ) {
			location.href = "/auth";
			return;
		}
		args.push(args.pop());
		if (callback) callback.apply(this, args);
	},
	index: function() {
		if( !_index ) _index = new IndexPage("ca", ( ev )=>{
			var href = $(ev.currentTarget).attr("href");
			if ( this.routes.hasOwnProperty( href.substring(1) ) ) {
				ev.preventDefault();
				this.navigate( href,  { trigger:true });
			}
		});
		_index.render();
	},
	question: function() {
		if( !_ask_expert ) _ask_expert = new AskExpertPage();
		_ask_expert.render();
	},
	work: function() {
		if( !_workpage ) _workpage = new WorkPage();
		_workpage.render();
	}
});
app = new Routes();
Backbone.history.start({ pushState:true });
var currentLocation = location.href.substring( location.href.lastIndexOf("/") );
if( currentLocation == "/" )
	app.navigate( "ca/index.html",  { trigger:true, replace:true });
else
	app.navigate( "ca"+currentLocation,  { trigger:true, replace:true });

$( document ).ready(()=>{
	if ( Parse.User.current() ) {
		var cas = new Parse.Query( Parse.Object.extend("ca") );
		cas.equalTo( "ca", Parse.User.current() );
		cas.equalTo( "status", "active" );
		cas.first().then( res => {
			if( !res ) {
				var el = $( "<div></div>" );
				el.addClass('w3-top w3-white w3-xlarge')
				el.css({
					"width": "100%", 
					"height": "100vh", 
					"padding": "16px",
					"display": "flex", 
					"justify-content": "center", 
					"align-items": "center",
					"z-index": "100"
				});
				el.html(`
					<div>
						<div class='w3-container w3-card-4 w3-padding-16' style='max-width: 480px;'>Looks like you are not a CA or your account has not been activated yet. Please contact web admin</div>
						<div class='w3-section'></div>
						<div class='w3-card' style='max-width: 480px;'>
							<a href='/auth' class='w3-button w3-theme w3-block w3-large'>Go To Profile</a>
						</div>
					`);
				$("body").html( el );
			}
		}).catch( err => {
			toastr.error( err.message, err.code );
			location.href="/auth";
		});
	} else {
		location.href="/auth";
	}
});

