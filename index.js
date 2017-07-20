

Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';
Parse.Config.get();
var app = null, _index = null, _ask_expert = null, _work = null, _auth = null, _users = null;
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
const Collection = Backbone.Collection.extend({
	model: Backbone.Model.extend({
		idAttribute: "objectId"
	})
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
const AskExpertPage = Backbone.View.extend({
	el: "#ask-expert",
	collection: new Map(),
	skip: 0,
	limit: 20,
	waiter: new Waiter,
	template: `
		<li style="cursor:pointer;" class='question-list' id="li-<%= objectId %>" data-id="<%= objectId %>">
			<div class="question"><%= question %></div>
			<div class="w3-small"><%= user_email %></div>
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
		</li>
	`,
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
		this.form.on( "tbwchange",  ev => {
			var value = $( ev.currentTarget ).html();
			value = $.trim( value );
			if( value.length > 0 )
				this.$el.find("#ask-modal .done").removeAttr( "disabled" );
			else
				this.$el.find("#ask-modal .done").attr( "disabled", "" );
		});
		if( Parse.User.current() )
			this.userEmail = Parse.User.current().get( "username" );
		else if ( localStorage.getItem( "userEmail" ) )
			this.userEmail = localStorage.getItem( "userEmail" );
		if( this.userEmail )
			this.$el.find("#email").val( this.userEmail );
		this.$el.find("#contents").empty();
		this.$el.find("#load-more-button").click();
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	renderList: function( object ) {
		this.collection.set( object.id, object );
		var ul = this.$el.find("#contents");
		var li = ul.find( "#li-"+object.id );
		var json = object.toJSON();
		json.updatedAt = object.get("updatedAt").toLocaleString();
		if( li.length == 0) {
			var li = this.template( json );
			ul.append( li );
		} else {
			li.find(".updated-at").html( json.updatedAt );
		}
	},
	events: {
		"click .go-back": "goBack",
		"click #load-more-button": "load_more",
		"click .refresh": "refresh",
		"click .open-ask-modal": "openAskModal",
		"click #ask-modal .done": "doneAskModal",
		"click #ask-modal .close": "closeAskModal",
		"click #answer-modal .close": "closeAnswerModal",
		"click .question-list": "openAnswerModal"
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
		q.save().then(s=>{
			self.renderList( s );
			toastr.info( "Saved" );
		}).catch( err=> {
			console.log( err );
			toastr.error( err.message, err.code );
		});
		this.$el.find("#ask-modal").hide();
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.skip = 0;
		this.$el.find("#recent-question").empty();
		this.$el.find("#load-more-button").click();
	},
	openAnswerModal: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget ).data("id");
		var object = this.collection.get( id );
		if( object.has("answer") ) {
			this.$el.find("#answer-modal #answer").html( object.get("answer") );
			this.getUser(object.get("answeredBy").id).then( r => {
				this.$el.find("#answer-modal .answered-by").html( r.get("name") );
			});
			this.$el.find("#answer-modal .updated-at").html( object.get("updatedAt").toLocaleString() );
			this.$el.find("#answer-modal .answered-by").parent().show();
		} else {
			this.$el.find("#answer-modal #answer").html( "<p>This question has not been answered yet.</p><p>Please check back after sometime.</p>" );
			this.$el.find("#answer-modal .answered-by").parent().hide();
		}
		this.$el.find("#answer-modal").show();
	},
	closeAnswerModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#answer-modal").hide();
	},
	load_more: function( ev ) {
		try {ev.preventDefault();}catch(e){}
		this.waiter.render();
		var self = this;
		if( !this.userEmail ){
			self.$el.find("#load-more-button").hide();
			return;
		}
		var q = new Parse.Query( Parse.Object.extend("asked") );
		q.equalTo( "user_email", this.userEmail );
		q.limit( self.limit );
		q.skip( self.skip );
		q.descending( "updatedAt" );
		q.find().then(res=>{
			$.each( res, ( i, e ) => {
				self.renderList( e );
			});
			if( res.length == 0 )
				self.$el.find("#load-more-button").hide();
			else
				self.$el.find("#load-more-button").show();
			self.skip += self.limit;
			self.waiter.stop();
		}).catch( err => {
			console.warn( err );
			self.waiter.stop();
			toastr.infor( err.message, err.code );
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
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
		</li>`,
	model: Parse.Object.extend("cawork"),
	type: new Map(),
	initialize: function() {
		this.type.set( "income-tax-return", [ "form_16", "pan", "bank_statement", "adhaar_card" ] );
		this.type.set( "gst", [ "gstin", "invoice_detail", "pan", "address_proof", "party_ledger" ] );
		this.type.set( "audit", [ "pan", "tally_account", "bank_statement", "party_ledger", "gst_return_copy", "previous_year_audit_report" ] );
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
		"click .open-modal": "openAddModal",
		"change #add-modal #type": "changeFormType",
		"click #add-modal .close": "closeAddModal",
		"click #add-modal .done": "doneAddModal",
		"click #add-modal .files .upload": "openUploadModal",
		"click #add-modal .files .remove": "removeUploadFile",
		"change .filter-panel select": "applyFilter",
		"click #load-more-button": "load_more"
	},
	openUploadModal: function( ev ) {
		ev.preventDefault();
		var type = $( ev.currentTarget ).data("name");
		var fileWindow = new FileWindow( type );
		fileWindow.render(res=>{
			this.new_model.add( "files", res );
			this.$el.find("#add-modal .files").find(".upload."+type).hide()
			this.$el.find("#add-modal .files").find(".remove."+type).show()
		});
	},
	removeUploadFile: function( ev ) {
		ev.preventDefault();
		var name = $(ev.currentTarget).data("name");
		var files = this.new_model.get( "files" );
		files = files.filter( e => {
			return ( e.type != name );
		});
		this.new_model.set( "files", files );
		this.$el.find("#add-modal .files").find(".upload."+name).show()
		this.$el.find("#add-modal .files").find(".remove."+name).hide()
	},
	changeFormType : function( ev ) {
		ev.preventDefault();
		var val = $( ev.currentTarget ).val();
		var types = this.type.get( val );
		var form_temp = `
			<li class="w3-display-container <%= name %>">
				<div>
					<div><%= pretty_name %></div>
					<div class="w3-small file_name"></div>
				</div>
				<div class="w3-display-right"><button class="w3-button upload <%= name %>" data-name="<%= name %>"><i class="fa fa-upload"></i></button></div>
				<div class="w3-display-right"><button style="display:none;" class="w3-button remove <%= name %>" data-name="<%= name %>"><i class="fa fa-close"></i></button></div>
			</li>
		`;
		var form_temp = _.template( form_temp );
		this.$el.find("#add-modal .files").empty();
		$.each( types, ( i, e )=> {
			var li = form_temp({ name: e, pretty_name: e.replace( /[\W\_]+/g, " " ).toUpperCase() });
			this.$el.find("#add-modal .files").append( li );
		});
		this.new_model.set( "type", val ); 
	},
	openAddModal: function( ev ) {
		ev.preventDefault();
		this.new_model = new this.model();
		this.$el.find("#add-modal").show();
		this.$el.find("#add-modal #type").change();
	},
	closeAddModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#add-modal").hide();
		this.new_model = null;
	},
	doneAddModal: function( ev ) {
		ev.preventDefault();
		var message = $.trim(this.$el.find("#add-modal .message").val());
		if( message != "" )
			this.new_model.set( "message", message );
		this.waiter.render();
		this.new_model.save().then(r=>{
			this.remember( r );
			this.applyFilter();
			this.waiter.stop();
			toastr.info( r.get("type"), "Saved" );
		}).catch(err=>{
			this.waiter.stop();
			toastr.error( err.message, err.code );
		});
		this.$el.find("#add-modal").hide();
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
		var byDay = this.day.toDateString().trim();
		var filterObject = {};
		filterObject.updatedAt = byDay;
		var arr = this.table.where( filterObject );
		this.$el.find("#contents").empty();
		console.log( arr, filterObject );
		$.each( arr, ( i, o ) => {
			this.renderList( this.collection.get( o.id ) );
		});
		this.$el.find(".count").text( arr.length );
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
		}).catch(err=>{
			this.waiter.stop();
			toastr.error( err.message, err.code );
		});;
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
		modal.find(".status").html( this.model.get("status") );
		modal.find(".message").html( this.model.get("message") );
		if( this.model.has( "assignedTo" ) ) {
			this.getUser( this.model.get("assignedTo").id ).then(r=>{
				modal.find(".assigned-to").html( r.get("name") );
				modal.find(".assigned-to").data( "workid", id );
			});
		} else {
			modal.find(".assigned-to").html( "Assign CA" )
		}
		this.getUser( this.model.get("user").id ).then(r=> modal.find(".user").html( r.get("name") ) );
		var template = `<li class="w3-display-container"><div><div class="name"><%= name %></div><div class="w3-tiny added-at"><%= addedAt %></div></div><div class="w3-display-right"><a download="<%=downloadAs%>" target="_blank" href="<%= url %>" class="w3-button w3-theme-l5"><i class="fa fa-download"></i></a></div></li>`;
		modal.find(".files").empty();
		template = _.template( template );
		var downloadAs = this.model.get("user").id;
		downloadAs += "-"+this.model.get("type").replace(/[\W_]/g, "");
		$.each( this.model.get("files"), (i, fl)=>{
			var ext = fl.file.url().substring( fl.file.url().lastIndexOf(".") );
			ext = downloadAs+"-"+fl.name.replace(/[\W_]/g, "")+ext;
			var li = template({ downloadAs: ext, name: fl.name, url: fl.file.url(), addedAt: fl.addedAt.toLocaleString()});
			modal.find(".files").append(li);
		});
		modal.show();
	},
	closeWorkModal: function(e){
		e.preventDefault();
		this.$el.find("#work-modal").hide();
	}
});

const FileWindow = Backbone.View.extend({
	waiter: new Waiter,
	tagName: "div",
	className: "w3-modal",
	initialize: function( form_type ) {
		this.$el.append(`
			<div class="w3-modal-content w3-animate-zoom">
				<div class="w3-container w3-padding-16">
					<span class="w3-right w3-xlarge" id="close" style="cursor:pointer;"><i class="fa fa-close"></i></span>
					<input type="text" id="type" class="w3-input w3-border" placeholder="File Name" style="width:90%;" />
					<div class="w3-section"></div>
					<input type="file" id="file" class="w3-input w3-border" placeholder="File Name" />
				</div>
			</div>
		`);
		this.$el.find("#type").val( form_type );
		this.$el.find(".w3-modal-content").prepend( this.waiter.$el );
		$("body").append( this.$el );
		return this;
	},
	render: function( callback ) {
		this.callback = callback;
		this.$el.show();
		return this;
	},
	events: {
		"click #close": "close",
		"change #file": "upload"
	},
	upload: function( ev ) {
		ev.preventDefault();
		var name = this.$el.find("#type").val();
		if( $.trim( name ) == "" ) {
			toastr.error( "Enter file name" );
			return;
		}
		var target = $( ev.currentTarget )[0];
		if (target.files.length > 0) {
			var file = target.files[0];
			var parseFile = new Parse.File(name, file);
			this.waiter.render();
			parseFile.save().then(r=> {
				this.$el.find("#close").click();
				this.waiter.stop();
				this.callback({
					type: name,
					file: r,
					addedAt: new Date()
				});
				console.log( r );
			});
		}
	},
	close: function( ev ) {
		ev.preventDefault();
		this.$el.remove();
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"index",
		"ask-expert": 							"ask_expert",
		"work(/:id)": 							"work"
	},
	index: function() {
		if( !_index ) _index = new IndexPage();
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
Backbone.history.start();

