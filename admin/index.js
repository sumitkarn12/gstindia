//Admin Panel

Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';
Parse.Config.get().then( console.log );

var app = null, _index = null, _questionpage = null, _capage = null, _workpage = null;

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
				<button class="w3-col s8 w3-button w3-theme-l2 w3-tiny w3-block status-button" data-id="<%= objectId %>"><%= status %></button>
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
		this.fetch( caObject.get("ca").id ).then( ca=> {
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
	fetch: function( id ) {
		var self = this;
		var model = this.collection.get( id );
		return new Promise((resolve, reject)=>{
			if( !model ) {
				var q = new Parse.Query( Parse.User );
				q.get(id).then(r=>{
					self.collection.set( r.id, r );
					resolve( r );
				}).catch( reject );
			} else
				resolve( model );
		});
	},
	events: {
		"click .go-back":"goBack",
		"click #add-ca" : "openAddCaDialog",
		"click .status-button" : "toggleStatusButton",
		"click #remove-as-ca" : "removeAsCa",
		"click .refresh" : "refresh"
	},
	toggleStatusButton: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		var object = this.collection.get( id );
		if( object.get( "status" ).toLowerCase() == "inactive" ) {
			object.set( "status", "active" );
		} else {
			object.set( "status", "inactive" );
		}
		target.html( object.get( "status" ).toUpperCase() );
		object.save().then(()=>toastr.info( object.get( "status" ).toUpperCase(), "Updated"));
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
	addAsCa: function( cas ) {
		var self = this;
		var toBeSaved = [];
		$.each( cas, (i,e)=> {
			var newCA = new self.model();
			newCA.set( "expert", ["gst", "income tax return", 'audit'] );
			newCA.set( "ca", e );
			newCA.set( "addedBy", Parse.User.current() );
			newCA.set( "status", "inactive" );
			var acl = new Parse.ACL();
			acl.setRoleReadAccess( "admin", true );
			acl.setRoleWriteAccess( "admin", true );
			acl.setReadAccess( e, true );
			newCA.setACL( acl );
			toBeSaved.push( newCA );
		});
		self.waiter.render();
		Parse.Object.saveAll( toBeSaved ).then( response=> {
			$.each( response, ( i, userObject ) => {
				self.collection.set( userObject.id, userObject );
				self.renderList( userObject );
			});
			self.waiter.stop();
		}).catch(err=>{
			self.waiter.stop();
			toastr.error( err.message, err.code );
		});
	},
	openAddCaDialog: function( ev ) {
		ev.preventDefault();
		var self = this;
		var caSelector = new UserSelectorPage();
		caSelector.render( res => self.addAsCa( res ));
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	}
});
const QuestionPage = Backbone.View.extend({
	el: "#question",
	template: `
		<li data-id="<%= objectId %>" class="question-list <%= answered %> <%= ca_id %> <%= user_email %>" style="cursor: pointer;">
			<div><%= question %></div>
			<div class="w3-small user-email w3-text-red"></div>
			<div class="w3-tiny"><%= updatedAt %></div>
		</li>`,
	model: Parse.Object.extend("asked"),
	activeCA: new Map(),
	initialize: function() {
		this.skip = 0;
		this.limit = 100;
		this.collection = new Map();
		this.waiter = new Waiter();
		this.day = new Date(new Date().toDateString());
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.caSet = new Option( "name", this.$el.find("#by-ca") );
		this.userSet = new Option( "user_email", this.$el.find("#by-user") );
		this.$el.find("#load-more-button").click();
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click #prev-day": "prevDay",
		"click #to-day": "toDay",
		"click #next-day": "nextDay",
		"click .refresh": "refresh",
		"click .assign": "openAssign",
		"click #assign-modal .close": "closeAssign",
		"click #assign-modal .done": "doneAssign",
		"click #answer-modal .close": "closeAnswer",
		"click .question-list": "openAnswer",
		"click .submit": "submitAnswer",
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
		this.skip = 0;
		this.$el.find("#contents").empty();
		this.userSet.reset();
		this.caSet.reset();
		this.$el.find("#load-more-button").click();
	},
	applyFilter: function( ev ) {
		try {ev.preventDefault();}catch(e){}
		this.$el.find(".question-list" ).hide();
		var classList = "";
		if( this.$el.find("#by-answer").val() == "answered" )
			classList += ".true";
		else if( this.$el.find("#by-answer").val() == "not-answered" )
			classList += ".false";
		classList += "."+this.$el.find("#by-ca").val();
		classList += "."+this.$el.find("#by-user").val();
		classList = classList.replace( /\./g, " " ).replace(/ {2,}/g, " ").trim().replace( / /g, "." );
		if( classList.length > 0 )
			classList = "."+classList;
		this.$el.find(".question-list"+classList ).show();
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.changeDay( this.day );
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.waiter.render();
		var q = new Parse.Query( this.model );
		q.greaterThanOrEqualTo( "createdAt", this.day );
		q.lessThan( "createdAt", new Date( this.day.getTime() + 24*60*60*1000 ) );
		q.limit( this.limit );
		q.skip( this.skip );
		q.descending( "updatedAt" );
		q.find().then(res=>{
			$.each( res, ( i, e ) => {
				try {
					var json = e.toJSON();
					self.collection.set( e.id, e );
					json.user_email = e.get("user_email").replace(/\W+/g,"");
					self.userSet.add({ id: e.get("user_email").replace(/\W+/g,""), user_email: e.get("user_email") });
					if( e.has("assignedTo") ) {
						try {
							self.getCA( e.get("assignedTo").id ).then(r=>{
								self.caSet.add({ id: r.id, name: r.get("name") });
							});
						} catch(e) {
							console.log(e)
						}
						json.ca_id = e.get("assignedTo").id
					} else {
						json.ca_id = "";
					}
					json.answered = e.has("answer");
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
	},
	getActiveCa: function() {
		if( !_capage ) _capage = new CaPage();
		return new Promise((resolve, reject)=>{
			_capage.getAllCa().then((mapObject)=>{
				var arr = [];
				mapObject.forEach((v)=>{
					if( v.get("status") == "active" )
						arr.push( v.get("ca") );
				});
				resolve( arr );
			}).catch( reject );
		});
	},
	getCA: function( id ) {
		if( !_capage ) _capage = new CaPage();
		return _capage.fetch( id );
	},
	openAssign: function(ev) {
		ev.preventDefault();
		var self = this;
		var template = `<div><div class="w3-col s9 ca-name"></div><div class="w3-col s3"><input type="number" class="w3-input w3-tiny ca-allot" /></div></div>`;
		self.$el.find( "#assign-modal #area" ).empty();
		this.waiter.render();
		var q = new Parse.Query( this.model );
		q.doesNotExist( "assignedTo" );
		q.limit( 1000 );
		q.find().then(res=>{
			self.notAnswered = res;
			self.getActiveCa().then(cas=>{
				$.each( cas, (i,a)=>{
					console.log( a );
					var card = $( template );
					card.find(".ca-name").html( a.get("name") );
					card.find(".ca-allot").data( "ca", a.id );
					self.$el.find( "#assign-modal #area" ).append( card );
				});
				var card = $( template );
				card.find(".ca-name").html( "Total" );
				card.find(".ca-allot").val( self.notAnswered.length );
				card.find(".ca-allot").attr("readonly", "");
				self.$el.find( "#assign-modal #area" ).append( card );
				self.$el.find("#assign-modal").show();
				self.waiter.stop();
			});
		}).catch(err=>{
			console.log(err);
			self.$el.find("#assign-modal .close").click();
		});
	},
	closeAssign: function(ev) {
		this.waiter.stop();
		ev.preventDefault();
		this.$el.find("#assign-modal").hide();
	},
	doneAssign: function(ev) {
		this.waiter.stop();
		ev.preventDefault();
		var index = 0;
		var toBeSaved = [];
		var self = this;
		this.$el.find("#assign-modal .ca-allot").each((i,e)=>{
			e = $(e);
			var ca = e.data( "ca" );
			var val = parseInt(e.val());
			if( ca && !isNaN( val ) ) {
				self.assignTo( self.notAnswered.splice( 0, val ), ca );
			}
		});
		this.$el.find("#assign-modal").hide();
	},
	assignTo: function( objects, ca ) {
		var saveAll = [];
		this.getCA( ca ).then(c=>{
			$.each( objects, (i,v)=>{
				var acl = v.getACL();
				if( acl ) {
					acl.setReadAccess( c, true );
					acl.setWriteAccess( c, true );
					v.setACL( acl );
				}
				v.set( "assignedTo", c );
				v.set( "assignedAt", new Date() );
				v.set( "assignedBy", Parse.User.current() );
				saveAll.push( v );
			});
			Parse.Object.saveAll( saveAll );
		});
	},
	openAnswer: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		var obj = this.collection.get( id );
		this.$el.find("#answer-modal #answer").html( obj.get("answer") );
		if( obj.has( "assignedTo" ) ) {
			this.getCA( obj.get( "assignedTo" ).id ).then((r)=>{
				this.$el.find("#answer-modal .assigned-ca").html( r.get("name") ).show();
			});
			this.$el.find("#answer-modal .assigned-at").html( obj.get("assignedAt").toLocaleString() ).show();
		} else {
			this.$el.find("#answer-modal .assigned-ca").hide();
			this.$el.find("#answer-modal .assigned-at").html();
		}
		if( obj.has( "answer" ) ) {
			this.getCA( obj.get( "answeredBy" ).id ).then((r)=>{
				this.$el.find("#answer-modal .answered-by").html( r.get("name") ).show();
			});
			this.$el.find("#answer-modal .answered-at").html( obj.get("answeredAt").toLocaleString() ).show();
		} else {
			this.$el.find("#answer-modal .answered-by").hide();
			this.$el.find("#answer-modal .answered-at").html();
		}
		this.$el.find( "#answer-modal" ).show();
	},
	closeAnswer: function( ev ) {
		ev.preventDefault();
		this.$el.find( "#answer-modal" ).hide();
	}
});
const WorkPage = Backbone.View.extend({
	el: "#work",
	skip: 0,
	limit: 20,
	collection: new Map(),
	waiter: new Waiter(),
	template: `
		<li data-id="<%= objectId %>" class="work-list status assignedTo user" style="cursor: pointer;">
			<div><%= type %></div>
			<div class="w3-small">
				User: <span class="user"></span>, CA: <span class="ca"></span>
			</div>
			<div class="w3-tiny"><%= updatedAt %></div>
			<div class="w3-small"><%= status %></div>
			<div class="w3-tiny"><%= message %></div>
		</li>`,
	model: Parse.Object.extend("cawork"),
	initialize: function() {
		this.day = new Date( new Date().toDateString() );
		this.$el.prepend( this.waiter.$el );
		this.template = _.template( this.template );
		this.byStatus = new Option( "name", this.$el.find("#by-status") );
		this.byCa = new Option( "name", this.$el.find("#by-ca") );
		this.byUser = new Option( "name", this.$el.find("#by-user") );
		this.$el.find("#to-day").html( this.day.toDateString() );
		this.$el.find("#load-more-button").click();
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .go-back": "goBack",
		"click #work-modal .close": "closeWorkModal",
		"click #work-modal .assigned-to": "changeCA",
		"click .refresh": "refresh",
		"click .work-list": "detail",
		"click #prev-day": "prevDay",
		"click #next-day": "nextDay",
		"click #to-day": "toDay",
		"change .filter-panel select": "applyFilter",
		"click #load-more-button": "load_more"
	},
	closeWorkModal: function(e){
		e.preventDefault();
		this.$el.find("#work-modal").hide();
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
		this.byCa.reset();
		this.byUser.reset();
		this.byStatus.reset();
		this.skip = 0;
		this.$el.find("#contents").empty();
		this.$el.find("#load-more-button").click();
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		ev.preventDefault();
		this.$el.find("#contents").empty();
		this.collection.clear();
		this.$el.find("#load-more-button").click();
	},
	applyFilter: function( ev ) {
		ev.preventDefault();
		this.$el.find(".work-list").hide();
		var filter_class = "";
		filter_class += "."+this.$el.find("#by-status").val();
		filter_class += "."+this.$el.find("#by-ca").val();
		filter_class += "."+this.$el.find("#by-user").val();
		filter_class = filter_class.replace(/\./g, " ").replace(/ {2,}/g," ").trim().replace(/ /g,".");
		if( filter_class.length > 0) filter_class = "."+filter_class;
		filter_class = ".work-list"+filter_class.replace(/\.{2,}/g, "");
		this.$el.find(filter_class.trim()).show();
	},
	load_more: function( ev ) {
		ev.preventDefault();
		var self = this;
		this.waiter.render();
		var q = new Parse.Query( this.model );
		q.greaterThanOrEqualTo( "createdAt", this.day );
		q.lessThan( "createdAt", new Date( this.day.getTime() + 24*60*60*1000 ) );
		q.descending( "updatedAt" );
		q.limit( self.limit );
		q.skip( self.skip );
		q.find().then(res=>{
			$.each( res, ( i, e ) => {
				self.collection.set( e.id, e );
				var json = e.toJSON();
				json.updatedAt = e.get("updatedAt").toLocaleString();
				json.type = json.type.replace(/[\W_]/g, " ").toUpperCase();
				try {
					var card = $(self.template( json ));
					self.getUser(e.get("user").id).then(r=>{
						card.find(".user").html( r.get("name") );
						card.addClass( e.get("user").id );
						self.byUser.add({ id: r.id, name: r.get("name") });
					});
					if( e.has("assignedTo") ) {
						self.getUser(e.get("assignedTo").id).then(r=>{
							card.find(".ca").html( r.get("name") );
							card.addClass( r.id );
							self.byCa.add({ id: r.id, name: r.get("name") });
						});
					} else {
						card.addClass( "not-assigned" );
						self.byCa.add({ id: "not-assigned", name: "Not assigned" });
					}
					if( e.has("status") ) {
						card.find(".status").html( e.get("status").toUpperCase() );
						card.addClass( e.get("status") );
						self.byStatus.add({ id: e.get("status"), name: e.get("status").toUpperCase() });
					}
					self.$el.find("#contents").append( card );
				} catch(e){
					console.log(e)
				}
			});
			if( res.length == 0 ) self.$el.find("#load-more-button").hide();
			else self.$el.find("#load-more-button").show();
			self.skip += self.limit;
			self.waiter.stop();
		});
	},
	getUser: function( id ) {
		if( !_capage ) _capage = new CaPage();
		return _capage.fetch( id );
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	detail: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var id = target.data( "id" );
		var model = this.collection.get( id );
		var modal = this.$el.find("#work-modal");
		modal.find(".type").html( model.get("type") );
		modal.find(".created-at").html( model.get("createdAt").toLocaleString() );
		modal.find(".updated-at").html( model.get("updatedAt").toLocaleString() );
		modal.find(".status").html( model.get("status").toUpperCase() );
		modal.find(".message").html( model.get("message") );
		this.getUser( model.get("user").id ).then(r=> modal.find(".user").html( r.get("name") ) );
		if( model.has( "assignedTo" ) ) {
			this.getUser( model.get("assignedTo").id ).then(r=> modal.find(".assigned-to").html( r.get("name") ) );
			modal.find(".assigned-to").data( "ca", model.get("assignedTo").id );
		} else {
			modal.find(".assigned-to").html( "Assign CA" );
			modal.find(".assigned-to").data( "ca", "" );
		}
		modal.find(".assigned-to").data( "workid", model.id );
		var template = `<li class="w3-display-container"><div><div class="name"><%= name %></div><div class="w3-tiny added-at"><%= addedAt %></div></div><div class="w3-display-right"><a target="_blank" href="<%= url %>" class="w3-button w3-theme-l5"><i class="fa fa-download"></i></a></div></li>`;
		modal.find(".files").empty();
		template = _.template( template );
		$.each( model.get("files"), (i, fl)=>{
			var li = template({ name: fl.name, url: fl.file.url(), addedAt: fl.addedAt.toLocaleString()});
			modal.find(".files").append(li);
		});
		modal.show();
	},
	changeCA: function( ev ) {
		ev.preventDefault();
		var target = $( ev.currentTarget );
		var modal = this.$el.find("#work-modal");
		var model = this.collection.get( target.data("workid") );
		var ca = null;
		if( target.data("ca") != "" )
			this.getUser(target.data("ca")).then(r=> ca = r );
		var caSelector = new UserSelectorPage();
		caSelector.render(( selectedCa )=>{
			if( selectedCa.length == 0 ) return;
			$.each( selectedCa, (i,s)=>{
				model.getACL().setReadAccess( s, true );
				model.getACL().setWriteAccess( s, true );
			});
			if( ca != null ) {
				model.getACL().setReadAccess( ca, false );
				model.getACL().setWriteAccess( ca, false );
			}
			model.set( "assignedTo", selectedCa[0] );
			model.set( "assignedBy", Parse.User.current() );
			model.set( "assignedAt", new Date() );
			model.save();
			toastr.info( "Change will take effect after sometime", "Updated" );
		});
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
Backbone.history.start();


