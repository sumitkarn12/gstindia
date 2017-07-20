//CA Panel

Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';
Parse.Config.get();

var app = null, _index = null, _questionpage = null, _users = null, _workpage = null;

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
const UserManagement = Backbone.View.extend({
	initialize: function() {
		this.users = new Map();
		return this;
	},
	fetch: function( id ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			var user = self.users.get( id );
			if( user ) {
				resolve( user );
			} else {
				var userQuery = new Parse.Query( Parse.User );
				userQuery.get( id ).then( res => {
					self.users.set( res.id, res );
					resolve( res );
				}).catch( reject );
			}
		});
	}
});
const Collection = Backbone.Collection.extend({
	model: Backbone.Model.extend({
		idAttribute: "objectId"
	})
});
const Option = Backbone.Collection.extend({
	initialize: function( attribute, el ) {
		el.append( "<option value=''>All</option>" );
		this.on("add", ( mdl )=>{
			var val = mdl.get( attribute );
			el.append(`<option value="${mdl.id}">${val}</option>`);
		});
		this.on("remove", ( mdl )=> el.find("[value=${mdl.id}]").remove() );
		this.on("reset", ( mdl )=> {
			el.empty();
			el.append( "<option value=''>All</option>" );
		});
	}
});
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
	template: `
		<li id="li-<%= objectId %>" data-id="<%= objectId %>" class="question-list <%= answered %> <%= user_email %>" style="cursor: pointer;">
			<div><%= question %></div>
			<div class="w3-small user-email w3-text-red"><%= user_email %></div>
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
		</li>`,
	model: Parse.Object.extend("asked"),
	initialize: function() {
		this.skip = 0;
		this.limit = 100;
		this.collection = new Map();
		this.table = new Collection();
		this.waiter = new Waiter();
		this.day = new Date(new Date().toDateString());
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.userSet = new Option( "user_email", this.$el.find("#by-user") );
		this.$el.find("#load-more-button").click();
		this.tbw = this.$el.find("#answer-modal #answer").trumbowyg({
			btns: [
				['formatting',"bold", "italic"],
				['link', 'insertImage', 'orderedList'],
				['fullscreen']
			]
		});
		this.tbw.on( "tbwchange", (ev)=>{
			ev.preventDefault();
			var text = $.trim($( ev.currentTarget ).text());
			if( text == "" )
				this.$el.find("#answer-modal .done").attr( "disabled", "" );
			else
				this.$el.find("#answer-modal .done").removeAttr( "disabled" );
		});
		this.tbw.on( "tbwpaste", (ev)=>{
			ev.preventDefault();
			var text = $.trim($( ev.currentTarget ).text());
			if( text == "" )
				this.$el.find("#answer-modal .done").attr( "disabled", "" );
			else
				this.$el.find("#answer-modal .done").removeAttr( "disabled" );
		});
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	remember: function( object ) {
		var acl = object.getACL();
		if( !acl || acl.getPublicWriteAccess() || acl.getWriteAccess( Parse.User.current() ) ) {
			this.collection.set( object.id, object );
			var json = object.toJSON();
			json.answered = object.has( "answer" );
			json.user_email = $.trim(object.get( "user_email" ));
			json.createdAt = new Date( json.createdAt ).toDateString();
			json.updatedAt = new Date( json.updatedAt ).toDateString();
			this.table.add( json );
		}
		return this;
	},
	renderList: function( object ) {
		var ul = this.$el.find("#contents");
		var li = ul.find("#li-"+object.id);
		var json = object.toJSON();
		json.answered = object.has("answer");
		json.updatedAt = object.get("updatedAt").toLocaleString();
		if( li.length == 0 ) {
			json.user_email = object.get("user_email");
			this.userSet.add({
				id: $.trim(object.get("user_email")),
				user_email: $.trim(object.get("user_email"))
			});
			try {
				var card = $(this.template( json ));
				card.find(".user-email").html( object.get("user_email") );
				ul.append( card );
			} catch(e){ console.log(e) }
		} else {
			var opp = !json.answered;
			li.addClass( json.answered.toString() );
			li.removeClass( opp.toString() );
			li.find(".updated-at").html( json.updatedAt );
			this.applyFilter( null );
		}
	},
	events: {
		"click .go-back": "goBack",
		"click #prev-day": "prevDay",
		"click #to-day": "toDay",
		"click #next-day": "nextDay",
		"click .refresh": "refresh",
		"click #answer-modal .close": "closeAnswer",
		"click #answer-modal .done": "doneAnswer",
		"click .question-list": "openAnswer",
		"change .filter-panel": "applyFilter",
		"click #load-more-button": "load_more"
	},
	toDay: function( ev ) {
		ev.preventDefault();
		let day = new Date( new Date().toDateString() );
		this.changeDay( day );
	},
	prevDay: function( ev ) {
		ev.preventDefault();
		let day = new Date( this.day.getTime() - 24*60*60*1000 );
		this.changeDay( day );
	},
	nextDay: function( ev ) {
		ev.preventDefault();
		let day = new Date( this.day.getTime() + 24*60*60*1000 );
		this.changeDay( day );
	},
	changeDay: function( day ) {
		this.day = day;
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.applyFilter();
	},
	applyFilter: function( ev ) {
		try {ev.preventDefault();}catch(e){}
		var byAnswer = this.$el.find("#by-answer").val().trim();
		var byUser = this.$el.find("#by-user").val().trim();
		var byDay = this.day.toDateString().trim();
		var filterObject = {};
		if( byAnswer != "" ) filterObject.answered = ( byAnswer == "answered" );
		if( byUser != "" ) filterObject.user_email = byUser;
		filterObject.updatedAt = byDay;
		var arr = this.table.where( filterObject );
		this.userSet.reset();
		this.$el.find("#contents").empty();
		$.each( arr, ( i, o ) => {
			this.renderList( this.collection.get( o.id ) );
		});
		this.$el.find(".count").text( arr.length );
		setTimeout(()=>{
			this.$el.find("#by-user").val( byUser );
		}, 100);
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.table.reset();
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	load_more: function( ev ) {
		ev.preventDefault();
		$(window).scrollTop(0);
		var self = this;
		this.waiter.render();
		var q = new Parse.Query( this.model );
		q.limit( this.limit );
		q.skip( this.skip );
		q.descending( "updatedAt" );
		q.find().then(res=>{
			$.each( res, ( i, e ) => {
				self.remember( e );
			});
			if( res.length == 0 )
				self.$el.find("#load-more-button").hide();
			else
				self.$el.find("#load-more-button").show();
			self.skip += self.limit;
			self.waiter.stop();
			self.applyFilter( null );
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	},
	openAnswer: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		this.editable = this.collection.get( id );
		this.$el.find("#answer-modal .done").attr( "disabled","" );
		this.$el.find("#answer-modal #question").html( this.editable.get("question") );
		this.$el.find("#answer-modal .user-email").html( this.editable.get("user_email") );
		this.$el.find("#answer-modal .created-at").html( this.editable.get("createdAt").toLocaleString() );
		if( this.editable.has( "answer" ) ) {
			this.getUser( this.editable.get( "answeredBy" ).id ).then((r)=>{
				this.$el.find("#answer-modal .answered-by").html( r.get("name") );
			});
			this.$el.find("#answer-modal .answered-at").html( this.editable.get("answeredAt").toLocaleString() );
			this.$el.find("#answer-modal #answer").html( this.editable.get("answer") );
			this.$el.find("#answer-modal .answered-at").parent().show();
		} else {
			this.$el.find("#answer-modal #answer").html( "" );
			this.$el.find("#answer-modal .answered-at").parent().hide();
		}
		this.$el.find( "#answer-modal" ).show();
	},
	closeAnswer: function( ev ) {
		ev.preventDefault();
		this.$el.find( "#answer-modal" ).hide();
		this.editable = null;
	},
	doneAnswer: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.$el.find( "#answer-modal" ).hide();
		var answer = this.$el.find( "#answer-modal #answer" ).html();
		this.editable.set( "answer", answer );
		this.editable.set( "answeredBy", Parse.User.current() );
		this.editable.set( "answeredAt", new Date() );
		this.editable.save().then(res=>{
			self.renderList( res );
			toastr.info( "Saved" );
		}).catch(err=>{
			toastr.error( error.message, error.code );
		});
	}
});
const WorkPage = Backbone.View.extend({
	el: "#work",
	skip: 0,
	limit: 100,
	collection: new Map(),
	waiter: new Waiter(),
	template: `
		<li id="li-<%= objectId %>" data-status="<%= status %>" data-id="<%= objectId %>" class="work-list <%=status%>" style="cursor: pointer;">
			<div><%= type %></div>
			<div class="w3-small">
				<span class="user"></span>
			</div>
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
			<div class="w3-tiny message"></div>
		</li>`,
	model: Parse.Object.extend("cawork"),
	initialize: function() {
		this.day = new Date( new Date().toDateString() );
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.userSet = new Option( "name", this.$el.find("#by-user") );
		this.table = new Collection();
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.$el.find("#load-more-button").click();
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	remember: function( object ) {
		this.collection.set( object.id, object );
		var json = object.toJSON();
		json.user = object.get("user").id;
		json.createdAt = new Date( json.createdAt ).toDateString();
		json.updatedAt = new Date( json.updatedAt ).toDateString();
		this.table.add( json, { merge:true });
		return this;
	},
	renderList: function( object ) {
		var ul = this.$el.find( "#contents" );
		var li = ul.find("#li-"+object.id);
		var json = object.toJSON();
		json.updatedAt = object.get("updatedAt").toLocaleString();
		json.type = json.type.replace(/[\W_]/g, " ").toUpperCase();
		if( li.length == 0 ) {
			try {
				var card = $(this.template( json ));
				this.getUser(object.get("user").id).then(r=>{
					card.find(".user").html( r.get("name") );
					this.userSet.add({
						id: r.id,
						name: r.get("name")
					});
				});
				ul.append( card );
			} catch(e){
				console.log(e)
			}
		} else {
			li.find(".updated-at").html(json.updatedAt);
		}
	},
	events: {
		"click .go-back": "goBack",
		"click #work-modal .close": "closeWorkModal",
		"click .refresh": "refresh",
		"click .work-list": "openWorkModal",
		"click #prev-day": "prevDay",
		"click #next-day": "nextDay",
		"click #to-day": "toDay",
		"change .filter-panel select": "applyFilter",
		"submit #status-change-form": "changeStatus",
		"click #load-more-button": "load_more"
	},
	prevDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date( this.day.getTime() - 24*60*60*1000 );
		this.changeDay( this.day );
	},
	nextDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date( this.day.getTime() + 24*60*60*1000 );
		this.changeDay( this.day );
	},
	toDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date();
		this.changeDay( this.day );
	},
	changeDay: function( day ) {
		this.day = day;
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.applyFilter();
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.table.reset();
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	applyFilter: function( ev ) {
		try {ev.preventDefault();}catch(e){}
		var byUser = $.trim(this.$el.find("#by-user").val());
		var byDay = this.day.toDateString().trim();
		var filterObject = {};
		if( byUser != "" )
			filterObject.user = byUser;
		this.userSet.reset();
		filterObject.updatedAt = byDay;
		var arr = this.table.where( filterObject );
		this.$el.find("#contents").empty();
		$.each( arr, ( i, o ) => {
			this.renderList( this.collection.get( o.id ) );
		});
		this.$el.find(".count").text( arr.length );
		setTimeout(()=>{
			this.$el.find("#by-user").val(byUser);
		}, 100);
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.waiter.render();
		var q = new Parse.Query( this.model );
		q.descending( "updatedAt" );
		q.limit( self.limit );
		q.skip( self.skip );
		q.find().then(res=>{
			$.each( res, ( i, e ) => {
				self.remember( e );
			});
			self.applyFilter();
			if( res.length == 0 ) self.$el.find("#load-more-button").hide();
			else self.$el.find("#load-more-button").show();
			self.skip += self.limit;
			self.waiter.stop();
		});
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	openWorkModal: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		this.model = this.collection.get( id );
		var modal = this.$el.find("#work-modal");
		modal.find(".type").html( this.model.get("type") );
		modal.find(".created-at").html( this.model.get("createdAt").toLocaleString() );
		modal.find(".updated-at").html( this.model.get("updatedAt").toLocaleString() );
		if( this.model.has("message") ) modal.find(".message").html( this.model.get("message") );
		else modal.find(".message").html( "No comment" );
		this.getUser( this.model.get("user").id ).then(r=> modal.find(".user").html( r.get("name") ) );
		var template = `<li class="w3-display-container"><div><div class="name"><%= name %></div><div class="w3-tiny added-at"><%= addedAt %></div></div><div class="w3-display-right"><a download="<%=downloadAs%>" target="_blank" href="<%= url %>" class="w3-button w3-theme-l5"><i class="fa fa-download"></i></a></div></li>`;
		modal.find(".files").empty();
		template = _.template( template );
		var downloadAs = this.model.get("user").id;
		downloadAs += "-"+this.model.get("type").replace(/[\W_]/g, "");
		$.each( this.model.get("files"), (i, fl)=>{
			var ext = fl.file.url().substring( fl.file.url().lastIndexOf(".") );
			ext = downloadAs+"-"+fl.type.replace(/[\W_]/g, "")+ext;
			var li = template({ downloadAs: ext, name: fl.type, url: fl.file.url(), addedAt: fl.addedAt.toLocaleString()});
			modal.find(".files").append(li);
		});
		modal.show();
	},
	closeWorkModal: function(e){
		e.preventDefault();
		this.$el.find("#work-modal").hide();
	},
	changeStatus: function( ev ) {
		ev.preventDefault();
		var self = this;
		var form = $( ev.currentTarget ).serializeObject();
		this.model.set("status", form.status.toLowerCase());
		this.model.set("message", form.message);
		this.model.save().then( response => {
			self.remember( response );
			self.renderList( response );
			toastr.info( "Updated" );
			self.applyFilter();
		}).catch(err=>{
			console.log( err );
			toastr.error( err.message, err.code );
		});
		this.$el.find("#work-modal .close").click();
	}
});
const UserSelectorPage = Backbone.View.extend({
	waiter: new Waiter,
	tagName: "div",
	className: "w3-modal",
	template: `
			<li data-id="<%= objectId %>" class="user-li" style="cursor:pointer;">
				<div class="w3-text-teal"><%= name %></div>
				<div class="w3-tiny w3-text-blue"><%= username %></div>
				<div class="w3-tiny w3-text-blue"><%= mobile %></div>
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
			<ul class="w3-ul w3-card">
				<li class="w3-large">Searched</li>
				<div class="contents"></div>
			</ul>
			<div class="w3-section"></div>
			<ul class="w3-ul w3-card">
				<li class="w3-large">Selected</li>
				<div class="selected"></div>
			</ul>
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
		this.$el.find(".w3-modal-content").prepend( this.waiter.$el );
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
		"click .user-li": "toggle"
	},
	toggle: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var uid = target.data("id");
		if( target.hasClass( "selected-li" ) ) {
			this.selected.delete( uid );
			target.removeClass( "selected-li" );
			this.$el.find(".contents").append( target );
		} else {
			this.selected.set( uid, this.collection.get( uid ) );
			target.addClass( "selected-li" );
			this.$el.find(".selected").append( target );
		}
	},
	search: function( ev ) {
		ev.preventDefault();
		var q = $( ev.currentTarget ).serializeObject().q;
		var self = this;
		self.$el.find(".contents").empty();
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
		"ca": 									"ca",
		"question":								"question",
		"work":									"work"
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
	ca: function() {
		if( !_capage ) _capage = new CaPage();
		_capage.render();
	},
	question: function() {
		if( !_questionpage ) _questionpage = new QuestionPage();
		_questionpage.render();
	},
	work: function() {
		if( !_workpage ) _workpage = new WorkPage();
		_workpage.render();
	}
});
app = new Routes();

$( document ).ready(()=>{
	$(".page").hide();
	var el = $(`<div style="height: 100vh; width: 100%; display: flex; justify-content: center; align-items:center;"><i class="fa fa-circle-o-notch fa-4x w3-spin"></i></div>`);
	$("body").append( el );
	if ( Parse.User.current() ) {
		var cas = new Parse.Query( Parse.Object.extend("ca") );
		cas.equalTo( "ca", Parse.User.current() );
		cas.equalTo( "status", "active" );
		cas.first().then( res => {
			if( res ) {
				el.remove();
				Backbone.history.start();
			} else {
				el.find("i").remove();
				el.html( "<h3 class='w3-center w3-container w3-padding-16'>Looks like you are not a CA or your account has not been activated yet. Please contact web admin</h3>" );
			}
		}).catch( err => {
			toastr.error( err.message, err.code );
			location.href="/auth";
		});
	} else {
		location.href="/auth";
	}
});