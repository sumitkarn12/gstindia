
var app = null, _index = null, _ask_expert = null, _work = null, _auth = null, _users = null;
const AskExpertPage = Backbone.View.extend({
	el: "#ask-expert",
	collection: new Map(),
	skip: 0,
	limit: 20,
	template: `
		<li style="cursor:pointer;" class='question-list' id="li-<%= objectId %>" data-id="<%= objectId %>">
			<div class="question"><%= question %></div>
			<div class="w3-small"><%= user_email %></div>
			<div class="w3-tiny updated-at"><%= updatedAt %></div>
		</li>
	`,
	initialize: function() {
		this.waiter = new Waiter(()=> this.$el.find("#contents").hide(), ()=>this.$el.find("#contents").show()),
		this.$el.find( "#waiter" ).append( this.waiter.$el );
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
			if( value.length > 0 ) this.$el.find("#ask-modal .done").removeAttr( "disabled" );
			else this.$el.find("#ask-modal .done").attr( "disabled", "" );
		});
		if( Parse.User.current() ) this.userEmail = Parse.User.current().get( "username" );
		else if ( localStorage.getItem( "userEmail" ) ) this.userEmail = localStorage.getItem( "userEmail" );
		if( this.userEmail )
			this.$el.find("#email").val( this.userEmail );
		this.$el.find("#contents").empty();
		this.$el.find("#load-more-button").click();
		db.sync.get("asked").then( object => {
			if( object && new Date().getTime() < new Date(object.at.getTime()+12*60*60*1000).getTime() ) {
				console.log( "No need to sync" );
			} else {
				this.hardRefresh().then(response=>{
					console.log( "refreshed", response );
					this.$el.find(".refresh").click();
				}).catch(err=>{
					console.log( "refreshed", err );
					toastr.error( err.message, err.code );
				});
			}
		});
		this.day = new Date();
		this.changeDay( this.day );
		return this;
	},
	render: function( id ) {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	renderList: function( object ) {
		var ul = this.$el.find("#contents");
		object.updatedAt = object.updatedAt.toLocaleString();
		ul.append( this.template( object ) );
	},
	events: {
		"click .go-back": "goBack",
		"click .refresh": "refresh",
		"click #prev-day": "prevDay",
		"click #to-day": "toDay",
		"click #next-day": "nextDay",
		"click .question-list": "openAnswerModal",
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
					var json = e.toJSON();
					if( e.has("user") ) json.user = e.get("user").id;
					if( e.has("answeredBy") ) json.answeredBy = e.get("answeredBy").id;
					if( e.has("answeredAt") ) json.answeredAt = e.get("answeredAt");
					json.createdAt = e.get("createdAt");
					json.updatedAt = e.get("updatedAt");
					json.date = e.get("updatedAt").toDateString();
					arr.push( json );
				});
				db.asked.bulkPut( arr );
				db.sync.put({ name: "asked", at: new Date() });
				self.waiter.stop();
				resolve( arr );
			}).catch( err => {
				self.waiter.stop();
				reject( err );
			});
		});
	},
	find: function( date ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			db.asked.where( "date" ).equalsIgnoreCase( date.toDateString() ).
			and((v)=>(v.user_email.localeCompare(this.user_email))).
			toArray(v=> resolve( v ));
		});
	},
	toDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date();
		this.changeDay( this.day );
	},
	prevDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date(this.day.getTime() - 24*60*60*1000)
		this.changeDay( this.day );
	},
	nextDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date(this.day.getTime() + 24*60*60*1000)
		this.changeDay( this.day );
	},
	changeDay: function( day ) {
		this.$el.find( "#to-day" ).html( day.toDateString() );
		this.$el.find("#contents").empty();
		this.find( day ).then( response => {
			if( response.length > 0 )
				$.each( response, (index, el) => this.renderList( el ) );
			else
				this.$el.find("#contents").append( `<li>No question for now. You can ask question by click + button</li>` );
		});
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.changeDay( this.day );
	},
	openAnswerModal: function( ev ) {
		ev.preventDefault();
		var id = $( ev.currentTarget ).data("id");
		db.asked.get( id ).then( response => {
			if( response.answer ) {
				this.$el.find("#answer-modal #answer").html( response.answer );
				this.$el.find("#answer-modal .updated-at").html( response.updatedAt.toLocaleString() );
				this.$el.find("#answer-modal .answered-by").parent().show();
				this.getUser(response.answeredBy).then( r => {
					this.$el.find("#answer-modal .answered-by").html( r.get("name") );
				});
			} else {
				this.$el.find("#answer-modal #answer").html( "<p>This question has not been answered yet.</p><p>Please check back after sometime.</p>" );
				this.$el.find("#answer-modal .answered-by").parent().hide();
			}
		});
		this.$el.find("#answer-modal").show();
	},
	closeAnswerModal: function( ev ) {
		ev.preventDefault();
		this.$el.find("#answer-modal").hide();
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
			db.asked.put( json ).then( self.changeDay( self.day ) );
			toastr.info( "Saved" );
		}).catch( err=> {
			console.log( err );
			toastr.error( err.message, err.code );
		});
		this.$el.find("#ask-modal").hide();
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
	collection: new Map(),
	template: _.template($("#cawork-list-template").html()),
	initialize: function() {
		this.waiter = new Waiter(()=> this.$el.find("#contents").hide(), ()=>this.$el.find("#contents").show()),
		this.$el.find( "#waiter" ).append( this.waiter.$el );
		db.sync.get("cawork").then( object => {
			if( object && new Date().getTime() < new Date(object.at.getTime()+12*60*60*1000).getTime() ) {
				console.log( "No need to sync" );
			} else {
				this.hardRefresh().then(response=>{
					console.log( "refreshed", response );
					this.$el.find(".refresh").click();
				}).catch(err=>{
					console.log( "refreshed", err );
					toastr.error( err.message, err.code );
				});
			}
		});
		this.day = new Date( new Date().toDateString() );
		this.changeDay( this.day );
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	renderList: function( object ) {
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
		"click #prev-day": "prevDay",
		"click #next-day": "nextDay",
		"click #to-day": "toDay",
		"click .refresh": "refresh",
		"click .work-list": "view",
		"click .create": "create",
		"click .edit": "edit",
		"click .go-back": "goBack"
	},
	find: function( date ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			db.cawork.where( "date" ).equalsIgnoreCase( date.toDateString() ).
			toArray(v=> resolve( v ));
		});
	},
	toDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date();
		this.changeDay( this.day );
	},
	prevDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date(this.day.getTime() - 24*60*60*1000)
		this.changeDay( this.day );
	},
	nextDay: function( ev ) {
		ev.preventDefault();
		this.day = new Date(this.day.getTime() + 24*60*60*1000)
		this.changeDay( this.day );
	},
	changeDay: function( day ) {
		this.$el.find( "#to-day" ).html( day.toDateString() );
		this.$el.find("#contents").empty();
		this.find( day ).then( response => {
			if( response.length > 0 )
				$.each( response, (index, el) => this.renderList( el ) );
			else
				this.$el.find("#contents").append( `<li>No question for now. You can ask question by click + button</li>` );
		});
	},
	refresh: function( ev ) {
		ev.preventDefault();
		this.changeDay( this.day );
	},
	toDb: function( parseObject ) {
		var json = parseObject.toJSON();
		json.user = parseObject.get("user").id;
		json.createdAt = parseObject.get("createdAt");
		json.updatedAt = parseObject.get("updatedAt");
		json.date = parseObject.get("updatedAt").toDateString();
		return json;
	},
	hardRefresh: function() {
		var self = this;
		return new Promise( (resolve, reject )=>{
			this.waiter.render();
			var q = new Parse.Query( Parse.Object.extend("cawork") );
			q.limit( 1000 );
			q.descending( "updatedAt" );
			q.find().then(res=>{
				var arr = [];
				$.each( res, ( i, e ) => {
					arr.push( self.toDb( e ) );
				});
				db.cawork.bulkPut( arr );
				db.sync.put({ name: "cawork", at: new Date() });
				self.waiter.stop();
				resolve( arr );
			}).catch( err => {
				self.waiter.stop();
				reject( err );
			});
		});
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
					console.log("Updated", k);
					toastr.info( "Saved" );
					self.$el.find('.refresh').click();
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
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	}
});
const WorkForm = Backbone.View.extend({
	tagName: "div",
	className: "w3-modal",
	type: new Map(),
	fileListTemplate: _.template($("#file-list-template").html()),
	initialize: function( options ) {
		this.options = $.extend({ mode: "view" }, options);
		this.type.set( "income-tax-return", [ "form_16", "pan", "bank_statement", "adhaar_card" ] );
		this.type.set( "gst", [ "gstin", "invoice_detail", "pan", "address_proof", "party_ledger" ] );
		this.type.set( "audit", [ "pan", "tally_account", "bank_statement", "party_ledger", "gst_return_copy", "previous_year_audit_report" ] );
		this.$el.html( $("#add-modal-template").html() );
		$("body").append( this.$el );
		this.$el.show();
		this.$el.find("#type").change("");
		if( this.options.model ) {
			this.model = this.options.model;
			this.$el.find("#type").val( this.model.get("type")).change();
		} else {
			this.model = new Parse.Object("cawork");
			this.$el.find("#type").val( "income-tax-return" ).change();
		} 
		this.$el.find(".message").val(this.model.get( "message" ));
		if( this.options.mode == "view" ) {
			this.$el.find(".done, .remove, .upload").hide();
			this.$el.find("#type, .message").attr("disabled", "");
		} else {
			this.$el.find(".done").show();
			this.$el.find("#type, .message").removeAttr('disabled');
		}
		return this;
	},
	events: {
		"click .close": "close",
		"click .done": "done",
		"change #type": "updateFileList",
		"click .upload": "uploadFile",
		"click .files .remove": "removeFile"
	},
	uploadFile: function( ev ) {
		ev.preventDefault();
		var type = $( ev.currentTarget ).data("type");
		var fileWindow = new FileWindow( type );
		fileWindow.render( res => {
			this.model.add( "files", res );
			var li = $(this.fileListTemplate( res ));
			li.find( ".upload" ).hide();
			li.find( ".remove" ).show();
			li.find( ".download" ).show();
			li.find( ".download" ).attr("href", res.file.url());
			this.$el.find(".files").find( "."+res.type ).remove();
			this.$el.find(".files").append( li );
		});
	},
	updateFileList : function( ev ) {
		ev.preventDefault();
		var self = this;
		var val = $( ev.currentTarget ).val();
		this.model.set( "type", val );
		var types = this.type.get( val );
		this.$el.find(".files").empty();
		$.each( types, ( i, e )=> {
			var filesFromModel = this.model.get("files");
			var li = "";
			if( filesFromModel && filesFromModel.filter(v=>(v.type == e )).length ) {
				var fileObject = filesFromModel.filter(v=>(v.type == e ));
				fileObject = fileObject[0];
				li = $(self.fileListTemplate( fileObject ));
				li.find( ".upload" ).hide();
				li.find( ".download" ).attr("href", fileObject.file.url);
				li.find( ".remove, .download" ).show();
			} else {
				li = self.fileListTemplate({ type: e });
				li = $( li );
				li.find( ".upload" ).show();
				li.find( ".remove, .download" ).hide();
			}
			this.$el.find(".files").append( li );
		});
	},
	removeFile: function( ev ) {
		ev.preventDefault();
		var type = $(ev.currentTarget).data( "type" );
		var files = this.model.get("files");
		files = files.filter( v=>( v.type != type ));
		this.model.set("files", files);
		this.$el.find(".files>."+type).remove();
	},
	done: function( ev ) {
		ev.preventDefault();
		var message = $.trim(this.$el.find(".message").val());
		if( message != "" ) this.model.set( "message", message );
		try { this.options.onSubmit( this.model ); } catch(e){}
		this.$el.remove();
	},
	close: function( ev ) {
		ev.preventDefault();
		this.$el.remove();
		if( this.options.onCancel ) this.options.onCancel();
	}
});

const Routes = Backbone.Router.extend({
	routes: {
		"": 									"index",
		"ask-expert.html": 						"ask_expert",
		"ask-expert": 							"ask_expert",
		"work(/:id)": 							"work"
		"work(/:id).html": 						"work"
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
Backbone.history.start({ pushState:true });