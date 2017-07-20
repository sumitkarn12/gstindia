//Admin Panel

Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';

var app = null, _index = null, _questionpage = null, _capage = null, _workpage = null, _users = null;

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
const CaPage = Backbone.View.extend({
	el: "#ca",
	template : `
		<li id="ca-<%= objectId %>">
			<div class="w3-large"><%= name %></div>
			<div class="w3-small"><%= username %></div>
			<div class="w3-small">Expert in <%= expert %></div>
			<div class="w3-small">Since <%= since %></div>
			<div class="w3-row">
				<button class="w3-col s8 w3-button w3-theme-l2 w3-tiny w3-block edit-button" data-id="<%= objectId %>">Edit</button>
				<button id="remove-as-ca" data-id="<%= objectId %>" class="w3-col s4 w3-tiny w3-button"><i class="fa fa-close"></i></button>
			</div>
		</li>
	`,
	model: Parse.Object.extend( 'ca' ),
	collection: new Map(),
	waiter: new Waiter,
	initialize: function() {
		this.$el.prepend( this.waiter.$el );
		var self = this;
		this.template = _.template( this.template );
		this.waiter.render();
		this.getAllCa().then(( cols )=>{
			self.waiter.stop();
			cols.forEach(( e )=> this.renderList( e ) );
		}).catch(err=>{
			self.waiter.stop();
			toastr.error( err.message, err.code );
		});
		return this;
	},
	renderList: function( caObject ) {
		var self = this;
		this.getUser( caObject.get("ca").id ).then( ca=> {
			var caAsJson = ca.toJSON();
			caAsJson.objectId = caObject.id;
			caAsJson.expert = caObject.get("expert").toString().bold();
			caAsJson.since = caObject.get("createdAt").toDateString().bold();
			caAsJson.status = caObject.get("status").toUpperCase().bold();
			self.$el.find("#container .contents").append( self.template( caAsJson ) );
		});
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	getAllCa: function() {
		var self = this;
		return new Promise(( resolve, reject )=>{
			if( self.collection.size != 0 ) {
				resolve( self.collection );
			} else {
				var q = new Parse.Query( this.model );
				q.limit( 500 );
				q.find().then( r=> {
					if( r.length > 0 ) {
						$.each( r, ( i, e )=> self.collection.set( e.id, e ) );
						resolve( self.collection );
					} else {
						reject({code:404, message: "No CA found"});
					}
				}).catch( reject );				
			}
		});
	},
	events: {
		"click .go-back":"goBack",
		"click #add-ca" : "openModal",
		"click #ca-modal .done" : "doneModal",
		"click #ca-modal .close" : "closeModal",
		"click .select-ca" : "selectCA",
		"click .edit-button" : "editCa",
		"click #remove-as-ca" : "removeAsCa",
		"click .refresh" : "refresh"
	},
	openModal: function( ev ) {
		ev.preventDefault();
		var modal = this.$el.find("#ca-modal");
		modal.show();
		modal.find(".select-ca").show();
		modal.find(".ca-detail").hide();
	},
	selectCA: function( ev ) {
		ev.preventDefault();
		var caSelector = new UserSelectorPage();
		caSelector.render( res => {
			if( res.length>0 ) {
				var modal = this.$el.find("#ca-modal");
				this.selectedCA = res[0];
				modal.find(".select-ca").hide();
				modal.find(".ca-detail").show();
				modal.find(".name").html( res[0].get( "name" ) );
				modal.find(".mobile").html( res[0].get( "mobile" ) );
				modal.find(".email").html( res[0].get( "username" ) );
			}
		});
	},
	closeModal: function(ev) {
		ev.preventDefault();
		this.toBeAdd = null;
		this.$el.find("#ca-modal").hide();
	},
	doneModal: function(ev) {
		ev.preventDefault();
		if( !this.selectedCA ) {
			toastr.error( "CA not found" );
			retrun;
		}
		var modal = this.$el.find("#ca-modal");
		modal.hide();
		this.waiter.render();
		var expertIn = [];
		modal.find(".expert-in").each((i,e)=>{
			if( e.checked ) expertIn.push( e.getAttribute("id") );
		});
		var newCA = null;
		if( this.toBeAdd ) {
			newCA = this.toBeAdd;
			this.selectedCA = this.toBeAdd.get( "ca" );
		} else
			newCA = new this.model();
		newCA.set( "expert", expertIn );
		newCA.set( "ca", this.selectedCA );
		newCA.set( "addedBy", Parse.User.current() );
		newCA.set( "status", "inactive" );
		if (modal.find("#status")[0].checked)
			newCA.set( "status", "active" );
		newCA.save().then( response => {
			this.collection.set( response.id, response );
			this.$el.find(".refresh").click();
			this.waiter.stop();
		}).catch( err => {
			self.waiter.stop();
			toastr.error( err.message, err.code );
		});
		this.toBeAdd = null;
	},
	editCa: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		var modal = this.$el.find("#ca-modal");
		this.toBeAdd = this.collection.get( id );
		modal.find(".select-ca").hide();
		modal.find(".ca-detail").show();
		modal.find(".expert-in").each((i,e)=>{
			if( e.checked ) $(e).click();
		});
		$.each( this.toBeAdd.get("expert"), (i, e) => {
			modal.find("#"+e).click();
		});
		if( modal.find("#status")[0].checked ) modal.find("#status").click();
		if( this.toBeAdd.get("status") == "active" ) modal.find("#status").click();
		this.getUser( this.toBeAdd.get("ca").id ).then(r=>{
			modal.find(".name").html( r.get( "name" ) );
			modal.find(".mobile").html( r.get( "mobile" ) );
			modal.find(".email").html( r.get( "username" ) );
		}).catch(err=>{
			toastr.error( err.message, err.code );
		});
		modal.show();
	},
	removeAsCa: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data("id");
		var user = this.collection.get( id );
		if( user ) {
			this.$el.find("#ca-"+id).remove();
			user.destroy().then(()=> toastr.info("Removed")).catch(err=>toastr.error(err.message, err.code));			
			this.collection.delete( id );
		} else{
			toastr.error("Not found");
		}
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.$el.find(".contents").empty();
		try {
			this.collection.forEach( v=> this.renderList(v) );
		} catch(e) {console.log}
	}
});
const QuestionPage = Backbone.View.extend({
	el: "#question",
	template: `
		<tr>
			<td><%= name %></td>
			<td class="w3-center"><%= count %></td>
		</tr>`,
	model: Parse.Object.extend("asked"),
	collection: new Map(),
	initialize: function() {
		this.end_date = new Date();
		this.start_date = new Date( new Date(this.end_date.getTime() - 30*24*60*60*1000).toDateString() );
		this.waiter = new Waiter();
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.$el.find("#start_date").val( this.start_date.toJSON().substring( 0, 10 ) )
		this.$el.find("#end_date").val( this.end_date.toJSON().substring( 0, 10 ) )
		this.$el.find("#filter").click();
		return this;
	},
	remember: function( object ) {
		var ca = object.get( "answeredBy" );
		var ob = this.collection.get( ca.id );
		if( !ob ) ob = { count: 0, ca: ca };
		++ob.count;
		this.collection.set( ca.id, ob );
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	renderList: function( object ) {
		var table = this.$el.find("#contents");
		this.getUser( object.ca.id ).then(r=>{
			var json = {};
			json.count = object.count;
			json.name = r.get( "name" );
			var card = this.template( json );
			table.prepend( card );
		}).catch(err=>{
			toastr.error( err.message, err.code );
		});
	},
	events: {
		"click .go-back": "goBack",
		"change #start_date": "onDateChange",
		"change #end_date": "onDateChange",
		"click .refresh": "filter",
		"click #filter": "filter"
	},
	onDateChange: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget );
		var date = new Date( id.val() );
		if( id.attr( "id" ) == "start_date" ) {
			if( date > this.end_date ) {
				toastr.error( "Start date can't be greater than end date" );
				return;
			} 
			this.start_date = date;
		} else {
			if( this.start_date > date ) {
				toastr.error( "Start date can't be greater than end date" );
				return;
			} 
			this.end_date = new Date(date.getTime()+24*60*60*1000);
		}
	},
	filter: function( ev ) {
		ev.preventDefault();
		this.collection.clear();
		var q = new Parse.Query( this.model );
		q.exists( "answeredBy" );
		q.select( "answeredBy" );
		q.greaterThanOrEqualTo( "updatedAt", this.start_date );
		q.lessThanOrEqualTo( "updatedAt", this.end_date );
		this.waiter.render();
		q.find().then( res => {
			$.each( res, (i,e)=>{
				this.remember( e );
			});
			var total = 0;
			this.$el.find("#contents").empty();
			this.collection.forEach( v=>{
				total += v.count;
				this.renderList( v );
			});
			var card = $(this.template({ count: total, name: "Total" }));
			card.addClass( "w3-border-top" );
			this.$el.find("#contents").append( card );
			this.waiter.stop();
		}).catch( err => {
			this.waiter.stop();
			console.info( err );
			toastr.info( err.message, err.code );
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	}
});
const WorkPage = Backbone.View.extend({
	el: "#work",
	skip: 0,
	limit: 100,
	collection: new Map(),
	waiter: new Waiter(),
	template: `
		<li id="li-<%= objectId %>" data-id="<%= objectId %>" class="work-list" style="cursor: pointer;">
			<div><%= type %></div>
			<div class="w3-small">
				<span class="user"></span>
			</div>
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
		</li>`,
	model: Parse.Object.extend("cawork"),
	initialize: function() {
		this.day = new Date( new Date().toDateString() );
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.table = new Collection();
		this.userSet = new Option( "name", this.$el.find(".filter-panel #by-user") );
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
		$(window).scrollTop(0);
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
		} else if ( Parse.User.current().id != Parse.Config.current().get("ADMIN") ) {
			toastr.info( "Unauthorized access" );
			location.href = "/";
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
		Parse.Config.get().then( config => {
			if( config.get( "ADMIN" ) == Parse.User.current().id ) {
				el.remove();
				Backbone.history.start();
			} else {
				el.find("i").remove();
				el.html( "<h3 class='w3-center w3-container w3-padding-16'>Looks like you are not an ADMIN. Please contact <a href='mailto:sumitkarn12@gmail.com'>WEB DEVELOPER</a></h3>" );
			}
		}).catch( err => {
			toastr.error( err.message, err.code );
			location.href="/auth";
		});
	} else {
		location.href="/auth";
	}
});


