//CA Panel

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
var app = null, _index = null, _questionpage = null, _questiondetailpage = null, _worklistpage = null, _workdetailpage = null;

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

const QuestionPage = Backbone.View.extend({
	el: "#question",
	skip: 0,
	limit: 100,
	collection: new Map(),
	waiter: new Waiter,
	template: `
		<li data-id="<%= objectId %>" class="question-list" style="cursor: pointer;">
			<div><%= question %></div>
			<div class="w3-small user-email w3-text-red"></div>
			<div class="w3-tiny"><%= updatedAt %></div>
		</li>
	`,
	initialize: function() {
		var self = this;
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.$el.find("#load-more-button").click();
		this.$el.find("#answer").trumbowyg({
			autogrow: true,
			btns: [
				['formatting','bold','italic' ],
				['link','insertImage'],
				['orderedList'],
				['fullscreen']
			]
		});
		this.$el.find(".trumbowyg-box").css({"margin": 0});
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click .refresh": "refresh",
		"click .question-list": "answerQuestion",
		"click .submit": "submitAnswer",
		"change #filter-by": "changeFilterBy",
		"change #sort-by": "changeSortBy",
		"click #load-more-button": "load_more"
	},
	answerQuestion: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget ).data( "id" );
		var question = this.collection.get( id );
		this.model = question;
		this.$el.find("#answer").html( question.get( "answer" ) );
		this.$el.find(".question-list").removeClass( "w3-theme" );
		this.$el.find(".submit").removeAttr( "disabled" );
		$( ev.currentTarget ).addClass( "w3-theme" );
	},
	submitAnswer: function( ev ) {
		ev.preventDefault();
		var self = this;
		var answer = $.trim(this.$el.find("#answer").html());
		if( answer == "" ){
			toastr.info( "Answer can't be null" );
			return;
		}
		if( !this.model ) {
			toastr.error( "Question not found" );
			return;
		}
		if( Parse.User.current().get( "username" ) == this.model.get( "user_email" ) ) {
			toastr.error( "You can't answer this question" );
			return;
		}
		this.model.set( "answer", answer );
		this.model.set( "answeredBy", Parse.User.current() );
		this.model.set( "answeredAt", new Date() );
		this.waiter.render();
		this.$el.find(".submit").attr( "disabled", "" );
		this.model.save( null ).then(r=>{
			self.waiter.stop();
			toastr.info( "Answered" );
		}).catch(err=>{
			self.waiter.stop();
			console.log( err );
			toastr.info( err.message, "Error" );
		});
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		ev.preventDefault();
		this.$el.find("#contents").empty();
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	changeFilterBy: function( ev ) {
		ev.preventDefault();
		var self = this;
		var value = $.trim($( ev.currentTarget ).val());
		if ( value == "answered" ) {
			self.query = new Parse.Query( Parse.Object.extend('asked') );
			self.query.exists( "answer" );
			this.skip = 0;
			this.$el.find("#contents").empty();
			this.collection.clear();
			this.$el.find("#load-more-button").click();			
		} else if ( value == "not-answered" ) {
			self.query = new Parse.Query( Parse.Object.extend('asked') );
			self.query.doesNotExist( "answer" );
			this.skip = 0;
			this.$el.find("#contents").empty();
			this.collection.clear();
			this.$el.find("#load-more-button").click();			
		}
	},
	changeSortBy: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find("#contents").empty();
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.waiter.render();
		var sortBy = this.$el.find("#sort-by").val();
		if( !self.query ) {
			self.query = new Parse.Query( Parse.Object.extend("asked") );
			self.query.doesNotExist( "answer" );
		}
		self.query.limit( self.limit );
		self.query.skip( self.skip );
		self.query.descending( sortBy );
		self.query.find().then(res=>{
			$.each( res, ( i, e ) => {
				try {
					self.collection.set( e.id, e );
					var json = e.toJSON();
					json.updatedAt = e.get("updatedAt").toLocaleString();
					var card = $(self.template( json ));
					card.find(".user-email").html( e.get( "user_email" ) );
					self.$el.find("#contents").append( card );
				} catch(e){
					console.log(e)
				}
			});
			if( res.length == 0 )
				self.$el.find("#load-more-button").hide();
			else
				self.$el.find("#load-more-button").show();
			self.skip += self.limit;
			self.waiter.stop();
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	}
});

const WorkListPage = Backbone.View.extend({
	el: "#work-list",
	skip: 0,
	limit: 100,
	collection: new Map(),
	waiter: new Waiter,
	template: `<a href="#work-detail/<%= objectId %>" class="w3-bar-item w3-hover-gray"><%= type %></a>`,
	initialize: function() {
		this.$el.append( this.waiter.$el );
		var self = this;
		this.template = _.template( this.template );
		this.$el.find("#load-more-button").click();
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click .refresh": "refresh",
		"change #filter-by": "changeFilterBy",
		"change #sort-by": "changeSortBy",
		"click #load-more-button": "load_more"
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find("#contents").empty();					
		this.collection.clear();
		this.$el.find("#load-more-button>button").click();
	},
	changeFilterBy: function( ev ) {
		ev.preventDefault();
		var self = this;
		var value = $.trim($( ev.currentTarget ).val());
		if( value == "asked-by" ) {
			var userSelector = new UserSelectorPage();
			userSelector.render(function( users ) {
				self.query = new Parse.Query( Parse.Object.extend('cawork') );
				self.query.containedIn( "user", users );
				self.skip = 0;
				self.$el.find("#contents").empty();
				self.collection.clear();
				self.$el.find("#load-more-button").click();			
			});
		} else {
			self.query = new Parse.Query( Parse.Object.extend('cawork') );
			self.query.equalTo( "status", value );
			this.skip = 0;
			this.$el.find("#contents").empty();
			this.collection.clear();
			this.$el.find("#load-more-button").click();			
		}
	},
	changeSortBy: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find("#contents").empty();					
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.waiter.render();
		var sortBy = this.$el.find("#sort-by").val();
		var queryType = this.$el.find("#query-type").val();
		if( !self.query ) {
			self.query = new Parse.Query( Parse.Object.extend("cawork") );
			self.query.equalTo( "status", "pending" );
		}
		self.query.limit( self.limit );
		self.query.skip( self.skip );
		self.query.descending( sortBy );
		self.query.find().then(res=>{
			self.waiter.stop();
			$.each( res, ( i, e ) => {
				self.collection.set( e.id, e );
				var json = e.toJSON();
				json.type = json.type.toUpperCase().replace( /[_\-]/g, " " );
				var card = self.template( json );
				self.$el.find("#contents").append( card );
			});
			if( res.length == 0 )
				self.$el.find("#load-more-button").hide();
			else
				self.$el.find("#load-more-button").show();
			self.skip += self.limit;
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	}
});

const WorkDetailPage = Backbone.View.extend({
	el: "#work-detail",
	waiter: new Waiter,
	template: `
		<li class="w3-display-container">
			<div><%=filename%></div>
			<div class="w3-display-right">
				<a target="_blank" href="<%= url %>" class="w3-button w3-theme-l4"><i class="fa fa-download"></i></a>
			</div>
		</li>
	`,
	initialize: function() {
		this.$el.append( this.waiter.$el );
		var self = this;
		this.template = _.template( this.template );
		return this;
	},
	render: function( id, model ) {
		var self = this;
		if( !model ) {
			this.model = new Parse.Object( "cawork" );
			this.model.set("objectId", id );
		} else
			this.model = model;
		this.waiter.render();
		this.fetch().then( r => {
			self.waiter.stop();
			var json = r.toJSON();
			self.$el.find(".type").text( json.type.toUpperCase().replace( /[_\-]/g, " " ) );
			self.$el.find(".created-at").html( r.get("createdAt").toLocaleString() );
			var keys = _.keys( json );
			keys = _.difference( keys, [ "ACL", "message", "createdAt", "updatedAt", "objectId", "type", "status", "assignedTo" ] );
			self.$el.find("#files").empty();
			$.each( keys, ( idx, el ) => {
				var fileJSON = json[ el ];
				fileJSON.filename = el.toUpperCase().replace( /[_\-]/g, " " );
				var li = self.template( fileJSON );
				self.$el.find("#files").append( li );
			});
			self.$el.find(".status").val( json.status );
			self.$el.find(".message").val( json.message );
		}).catch( console.warn );
		$(".page").hide();
		this.$el.show();
		return this;
	},
	fetch: function() {
		var self = this;
		return new Promise(( resolve, reject ) => {
			if( self.model.get( "type" ) ) {
				resolve( self.model );
			} else {
				if( _worklistpage && _worklistpage.collection.get( self.model.id ) ) {
					self.model = _worklistpage.collection.get( self.model.id );
					resolve( self.model );
				} else {
					self.model.fetch().then( resolve ).catch( reject );
				}
			}
		});
	},
	events: {
		"click .go-back": "goBack",
		"submit #status-form": "update_status"
	},
	update_status: function( ev ) {
		ev.preventDefault();
		var self = this;
		var form = $( ev.currentTarget ).serializeObject();
		this.model.set( "status", form.status );
		this.model.set( "message", form.message );
		this.waiter.render();
		this.model.save( null ).then(r=> this.waiter.stop() ).catch( console.warn );
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	}
});

const UserSelectorPage = Backbone.View.extend({
	waiter: new Waiter,
	tagName: "div",
	className: "w3-modal",
	template: `
			<li>
				<input type="checkbox" class="w3-check" data-id="<%= objectId %>" style="position: relative; top: -8px;" />
				<div style="display: inline-block;">
					<div class="w3-text-teal"><%= name %></div>
					<div class="w3-tiny w3-text-blue"><%= username %></div>
					<div class="w3-tiny w3-text-blue"><%= mobile %></div>
				</div>
			</li>
	`,
	initialize: function() {
		_.extend( this, Backbone.Events );
		this.selected = new Map();
		this.collection = new Map();
		this.$el.append(`
				<div class="w3-modal-content w3-animate-zoom">
	<div class="w3-container w3-padding-16">
		<div class="w3-display-container w3-card">
			<form id="search">
			<div>
				<input type="search" id="q" name="q" class="w3-input w3-border" placeholder="Enter name, email or mobile..." />
			</div>
			<div class="w3-display-right">
				<button class="w3-button w3-border-left"><i class="fa fa-search"></i></button>
			</div>
			</form>
		</div>
		<div class="w3-section"></div>
		<ul class="w3-ul w3-card contents"></ul>
		<div class="w3-section"></div>
		<div class="w3-row">
			<div class="w3-col s2 w3-center">
				<button id="close" class="w3-button w3-block w3-theme-l3"><i class="fa fa-close"></i></button>
			</div>
			<div class="w3-col s10">
				<button id="done" class="w3-button w3-block w3-theme">Submit</button>
			</div>
		</div>
	</div>	
				</div>
		`);
		this.$el.find(".w3-modal-content").append( this.waiter.$el );
		$("body").append( this.$el );
		var self = this;
		this.template = _.template( this.template );
		return this;
	},
	render: function( callback ) {
		this.onSelected = callback;
		this.$el.show();
		return this;
	},
	events: {
		"click #close": "close",
		"click #done": "done",
		"submit #search": "search",
		"change .w3-ul input": "toggle"
	},
	toggle: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var uid = target.data("id");
		if( !ev.currentTarget.checked ) {
			this.selected.delete( uid );
		} else {
			this.selected.set( uid, this.collection.get( uid ) );
		}
	},
	search: function( ev ) {
		ev.preventDefault();
		var q = $( ev.currentTarget ).serializeObject().q;
		var self = this;
		self.waiter.render();
		var nameQ = new Parse.Query( Parse.User );
		nameQ.startsWith( "name", q );
		var emailQ = new Parse.Query( Parse.User );
		emailQ.startsWith( "username", q );
		var mobileQ = new Parse.Query( Parse.User );
		mobileQ.startsWith( "mobile", q );
		var mainQ =  Parse.Query.or( nameQ, emailQ, mobileQ );
		mainQ.find().then( response => {
			self.waiter.stop();
			$.each( response, (i,e)=>{
				var json = e.toJSON();
				if( !json.mobile ) json.mobile = "xxxxx xxxxx";
				var li = self.template( json );
				self.$el.find(".contents").append( li );
				self.collection.set( e.id, e );
			});
		}).catch(err=>{
			self.waiter.stop();
			console.log( err );
			toastr.error( err.message, err.code );
		});
	},
	done: function( ev ) {
		ev.preventDefault();
		this.$el.find("#close").click();
		var asArray = [];
		this.selected.forEach( v => asArray.push( v ) );
		this.onSelected( asArray );
	},
	close: function( ev ) {
		ev.preventDefault();
		this.$el.remove();
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"index",
		"question":								"question",
		"work-list":							"work_list",
		"work-detail/:id":						"work_detail",
		"auth": 								"auth"
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
		if( !_index ) _index = new IndexPage();
		_index.render();
	},
	question: function() {
		if( !_questionpage ) _questionpage = new QuestionPage();
		_questionpage.render();
	},
	work_list: function() {
		if( !_worklistpage ) _worklistpage = new WorkListPage();
		_worklistpage.render();
	},
	work_detail: function( id ) {
		if( !_workdetailpage ) _workdetailpage = new WorkDetailPage();
		_workdetailpage.render( id );
	}
});
app = new Routes();
Backbone.history.start();


