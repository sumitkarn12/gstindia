
Parse.initialize("gZcENVmcvqfSSeiIomLKUxH8lLkWhhfPOy7Hml6N", "Oqk4oWh3lpBY7W5ewRGGB4REw4zflX3xzgATxXpk");
Parse.serverURL = 'https://parseapi.back4app.com/';
Parse.Config.get().then(()=> console.log("Config loaded")).catch(( err )=> console.info( "error loading config", err));

const db = new Dexie( "personal-ca" );
db.version( 1 ).stores({
	asked: "objectId, date, user_email",
	cawork: "objectId, date, user, type",
	user: "objectId, name, email, mobile",
	sync: "name, at"
});
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
$.fn.nox = function( settings ) {
	var panels = [];
	var current = 0;
	var base = this;
	var timeout = null;
	var defaults = {
		infoOn: base.find(".info"),
		delay: 3000
	};
	$.extend( defaults, settings );
	var indexen = function( i, el ) {
		el = $( el );
		panels[ parseInt( el.data("index") ) ] = el;
	};
	this.show = function( idx ) {
		if( idx == panels.length ) idx = 0;
		if( idx < 0 ) idx = panels.length - 1;
		hideAll();
		panels[ idx ].show();
		defaults.infoOn.html( panels[idx].data("message") );
		defaults.countOn.html( (idx+1)+"/"+panels.length );
		current = idx;
		clearTimeout( timeout );
		timeout = setTimeout(function() { base.next(); }, defaults.delay);
		return this;
	};
	this.next = function() {
		this.show( ++current );
		return this;
	};
	this.prev = function() {
		this.show( --current );
		return this;
	};
	var hideAll = function() {
		base.find(".nox-panel").hide();
	};
	this.find(".nox-panel").each( indexen );
	this.show( 0 );
	return this;
};
var Model = Backbone.Model.extend({ idAttribute: "objectId" });
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
const UserManagement = Backbone.View.extend({
	initialize: function() {
		this.users = new Map();
		return this;
	},
	toDb: function( parseObject ) {
		var json = parseObject.toJSON();
		json.createdAt = parseObject.get( "createdAt" );
		json.updatedAt = parseObject.get( "updatedAt" );
		return json;
	},
	fetch: function( id ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			db.user.get( id ).then( result => {
				if( result )  resolve( new Model(result) );
				else {
					var userQuery = new Parse.Query( Parse.User );
					userQuery.get( id ).then( res => {
						var json = self.toDb( res );
						db.user.put( json );
						resolve(new Model( json ))
					}).catch( reject );
				}
			});
		});
	}
});
const Waiter = Backbone.View.extend({
	template: `
		<div style="display:none;">
			<div style="padding: 16px 0;width: 100%; display:flex; justify-content:center; font-size: 56px;">
				<i class="fa fa-circle-o-notch w3-spin"></i>
			</div>
		</div>`,
	initialize: function( onStart, onStop ) {
		this.onStart = onStart;
		this.onStop = onStop;
		this.$el = $( this.template );
		return this;
	},
	render: function() {
		this.$el.show();
		try { this.onStart(); } catch ( e ) {}
		return this;
	},
	stop: function() {
		this.$el.hide();
		try { this.onStop(); } catch ( e ) {}
		return this;
	}
});
const Collection = Backbone.Collection.extend({
	model: Backbone.Model.extend({
		idAttribute: "objectId"
	})
});

const Page = Backbone.View.extend({
	waiter: new Waiter(),
	pagename: "pagename",
	sync_interval : 1000*60*60*12,
	db: db.asked,
	filterable: new Collection(),
	render: function() {
		$(".page").hide();
		this.$el.show();
		console.log( this, "From render" );
		return this;
	},
	renderWaiter: function() {
		this.waiter = new Waiter(()=> this.$el.find("#contents").hide(), ()=>this.$el.find("#contents").show()),
		this.$el.find( "#waiter" ).append( this.waiter.$el );
	},
	renderFilterDate: function() {
		var self = this;
		this.datefilter = new DateFilter({
			pagename: this.pagename,
			callback: function( date ) { self.changeDay( date ) }
		});
		this.$el.find("#day-panel").html( this.datefilter.$el );
		this.datefilter.render();
	},
	sync: function() {
		db.sync.get( this.pagename ).then( object => {
			if( object && new Date().getTime() < new Date(object.at.getTime()+this.sync_interval).getTime() ) {
				console.log( "No need to sync", this.pagename );
				this.db.orderBy("date").uniqueKeys().then(keys => this.datefilter.updateSelectableDates(keys));
			} else {
				this.hardRefresh().then(response=>{
					console.log( "refreshed", this.pagename, response );
					this.changeDay( new Date() );
					this.db.orderBy("date").uniqueKeys().then(keys => this.datefilter.updateSelectableDates(keys));
				}).catch(err=>{
					console.log( "refreshed", err );
					toastr.error( err.message, err.code );
				});
			}
		});
	},
	find: function( date ) {
		var self = this;
		return new Promise(( resolve, reject )=>{
			self.db.where( "date" ).equalsIgnoreCase( date.toDateString() )
			.toArray(v=>{
				resolve( v );
			});
		});
	},
	changeDay: function( day ) {
		this.$el.find("#contents").empty();
		this.filterable.reset();
		this.find( day ).then( response => {
			if( response.length > 0 )
				$.each( response, (index, el) => this.renderList( el ) );
			else
				this.$el.find("#contents").append( `<li>No question for now. You can ask question by click + button</li>` );
			this.applyFilter( null );
		});
	},
	hardRefresh: function() {
		var self = this;
		return new Promise( (resolve, reject )=>{
			this.waiter.render();
			var q = new Parse.Query( Parse.Object.extend( this.pagename ) );
			q.limit( 1000 );
			q.descending( "updatedAt" );
			q.find().then(res=>{
				var arr = [];
				$.each( res, ( i, e ) => {
					arr.push( self.toDb( e ) );
				});
				self.db.bulkPut( arr );
				db.sync.put({ name: this.pagename, at: new Date() });
				self.waiter.stop();
				resolve( arr );
			}).catch( err => {
				self.waiter.stop();
				reject( err );
			});
		});
	},
	goBack: function( ev ) {
		ev.preventDefault();
		history.back();
	},
	goHome: function( ev ) {
		ev.preventDefault();
		var loc = location.href;
		loc = loc.substring( 0, loc.lastIndexOf("/") );
		loc = loc.substring( loc.lastIndexOf("/")+1 );
		app.navigate( loc+"/index.html", {trigger:true});
		console.log( "Getting back to home of", loc );
	},
	onLinkClick: function( ev ) {
		try { this.onLinkClick(ev); } catch(e) {}
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	},
	applyFilter: function( ev ) {
		var filterObject = new Model();
		this.$el.find("#filter-panel select").each((i,el)=>{
			el = $(el);
			if( $.trim( el.val() ) != "" ) {
				filterObject.set( el.data("id"), el.val() );
			}
		});
		filterObject = filterObject.toJSON();
		var items = this.filterable.where( filterObject );
		if( items.length ) {
			this.$el.find("#contents li").hide();
			items.forEach((v)=> this.$el.find("#li-"+v.id).show());
		}
		console.log( filterObject, items );
	}
});
const IndexPage = Backbone.View.extend({
	el: "#index",
	page_type: "user",
	initialize: function( name, navigate ) {
		this.navigate = navigate;
		this.$el.find(".banner").hide();
		if ( name )
			this.page_type = name;
		var user = Parse.User.current();
		if( user ) {
			var $e = this.$el.find( "#user-detail" );
			$e.find(".name").html( user.get("name") );
			$e.find(".email").html( user.get("email") );
		}
		db.sync.get("config").then(response=>{
			if ( response && ( new Date().getTime() <  (response.at.getTime() + 24*60*60*1000) ) ) {
				var json = Parse.Config.current().get( this.page_type+"_slider" );
				if( json ) {
					var slider = JSON.parse( json );
					this.createSlider( slider );
				}
			} else {
				Parse.Config.get().then(conf=>{
					var sliders = JSON.parse(conf.get( this.page_type+"_slider" ));
					this.createSlider( sliders );
					db.sync.put({name: "config", at: new Date() });
				}).catch( er=> {
					console.log( err );
					toastr.error(er.message, er.code);
				});
			}
		});
		return this;
	},
	createSlider: function( sliderObject ) {
		this.bxslider = $("<ul></ul>");
		this.bxslider.addClass('bxslider');
		sliderObject.forEach(slide=>{
			let img = $("<img>");
			img.attr( "title", `<a href="${slide.redirectTo}">${slide.info}</a>` );
			img.addClass('w3-image');
			img.attr('src', slide.imageUrl);
			let li = $("<li></li>");
			li.html( img );
			this.bxslider.append( li );
		});
		this.$el.find(".banner").html( this.bxslider );
		this.bxslider.bxSlider({
			auto: true,
			captions: true
		});
		this.$el.find(".banner").show();
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .user": "userAction",
		"click .next-nox": "nextImage",
		"click .prev-nox": "prevImage",
		"click a": "route"
	},
	route: function( ev ) {
		try { this.navigate( ev ); } catch(e){ console.log( e );}
	},
	prevImage: function( ev ) {
		ev.preventDefault();
		this.nox.prev();
	},
	nextImage: function( ev ) {
		ev.preventDefault();
		this.nox.next();
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
const FileWindow = Backbone.View.extend({
	tagName: "div",
	className: "w3-modal",
	initialize: function( form_type ) {
		this.$el.append(`
			<div class="w3-modal-content w3-animate-zoom">
				<div id="waiter"></div>
				<div class="w3-container w3-padding-16" id="contents">
					<span class="w3-right w3-xlarge" id="close" style="cursor:pointer;"><i class="fa fa-close"></i></span>
					<input type="text" id="type" class="w3-input w3-border" placeholder="File Name" style="width:90%;" />
					<div class="w3-section"></div>
					<input type="file" id="file" class="w3-input w3-border" placeholder="File Name" />
				</div>
			</div>
		`);
		this.$el.find("#type").val( form_type );
		$("body").append( this.$el );
		this.waiter = new Waiter(()=> this.$el.find("#contents").hide(), ()=>this.$el.find("#contents").show()),
		this.$el.find(".w3-modal-content").prepend( this.waiter.$el );
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
		name = name.replace(/\W+/g, "_").toLowerCase();
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
const DateFilter = Backbone.View.extend({
	template: `
		<div>
			<button class="w3-button w3-block w3-theme-l2" id="to-day" gldp-id="<%= pagename %>-datepicker"></button>
			<div gldp-el="<%= pagename %>-datepicker" style="width:300px; height: 300px;"></div>
		</div>
	`,
	options : {
		name: "default",
		callback: function(date) {}
	},
	initialize: function( options ) {
		this.template = _.template(this.template);
		$.extend( this.options, options );
		this.$el.html( this.template({ pagename: this.options.pagename }) );
		this.day = new Date();
		this.$el.find("#to-day").html( this.day.toDateString() );
		return this;
	},
	render: function() {
		var self = this;
		this.datepicker = this.$el.find("#to-day").glDatePicker({
			onClick: function( el,cell, date, data ) {
				self.$el.find("#to-day").html( date.toDateString() );
				self.options.callback( date );
			}
		}).glDatePicker( true );
		return this;
	},
	updateSelectableDates: function( dates ) {
		var datesAsDate = dates.map(v=>{ return { date:new Date(v) }; });
		$.extend(this.datepicker.options, {
			selectableDates: datesAsDate
		});
		this.datepicker.render();
	}
});
const WorkForm = Backbone.View.extend({
	tagName: "div",
	className: "w3-modal",
	type: new Map(),
	initialize: function( options ) {
		this.fileListTemplate = _.template($("#file-list-template").html());
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
const AnswerPage = Backbone.View.extend({
	tagName: "div",
	className: "w3-modal",
	options: {
		mode: "view",
		model: new Model(),
		callback: function( mdl ) {}
	},
	template: `
			<div class="w3-modal-content w3-animate-zoom">
				<div class="w3-row">
					<div class="w3-col s12 m6 question-area">
						<div class="w3-card">
							<span class="w3-xlarge w3-right w3-container close" style="cursor: pointer;"><i class="fa fa-close"></i></span>
							<div id="question" class="w3-padding w3-theme-light"></div>
							<ul class="w3-ul w3-border-top w3-tiny">
								<li class="user-email"></li>
								<li class="created-at"></li>
							</il>
						</div>
						<div class="w3-section"></div>
						<ul class="w3-card w3-ul">
							<li>Answered by</li>
							<li class="answered-by w3-tiny"></li>
							<li class="answered-at w3-tiny"></li>
						</ul>
					</div>
					<div class="w3-col s12 m6 w3-container answer-area">
						<div class="w3-padding-16" id="answer-view">
							<div id="answer"  class="w3-card w3-padding"></div>
						</div>
						<div id="answer-edit">
							<div id="answer-form"></div>
						</div>
					</div>
				</div>
				<button class="w3-button w3-block w3-theme done"><i class="fa fa-check"></i></button>
			</div>
	`,
	initialize: function( options ) {
		$.extend( this.options, options );
		this.$el.html( this.template );
		this.tbw = this.$el.find("#answer-form").trumbowyg({
			btns: [
				['formatting',"bold", "italic"],
				['link', 'insertImage', 'orderedList'],
				['fullscreen']
			],
			svgPath: '/assets/trumbowyg/dist/ui/icons.svg'
		});
		this.tbw.on( "tbwchange", (ev)=> this.changeDoneState( ev )  );
		this.tbw.on( "tbwpaste", (ev)=> this.changeDoneState( ev ) );
		$("body").append( this.$el );
		this.$el.show();
		this.renderAnswer();
		if( this.options.mode == "edit" ) {
			this.$el.find("#answer-edit").show();
			this.$el.find("#answer-view, .done").hide();
		} else {
			this.$el.find("#answer-edit").hide();
			this.$el.find("#answer-view").show();
		}
		return this;
	},
	changeDoneState: function( ev ) {
		ev.preventDefault();
		var text = $.trim($( ev.currentTarget ).text());
		if( text == "" )
			this.$el.find(".done").hide();
		else
			this.$el.find(".done").show();
	},
	events: {
		"click .close": "close",
		"click .done": "done"
	},
	getUser: function( id ) {
		if( !_users ) _users = new UserManagement();
		return _users.fetch( id );
	},
	renderAnswer: function() {
		this.$el.find(".done").hide();
		this.$el.find("#question").html( this.options.model.get("question") );
		this.$el.find(".user-email").html( this.options.model.get("user_email") );
		this.$el.find(".created-at").html( this.options.model.get("createdAt").toLocaleString() );
		if( this.options.model.has( "answer" ) ) {
			var answeredById = null;
			if( this.options.model.get( "answeredBy" ).id ) {
				answeredById = this.options.model.get( "answeredBy" ).id;
			} else {
				answeredById = this.options.model.get( "answeredBy" );
			}
			this.getUser( answeredById ).then((r)=>{
				this.$el.find(".answered-by").html( r.get("name") );
			});
			this.$el.find(".answered-at").html( this.options.model.get("answeredAt").toLocaleString() );
			this.$el.find("#answer").html( this.options.model.get("answer") );
			this.$el.find("#answer-form").html( this.options.model.get("answer") );
			this.$el.find(".answered-at").parent().show();
		} else {
			this.$el.find("#answer").html( "Not answered yet" );
			this.$el.find("#answer-form").html( "" );
			this.$el.find(".answered-at").parent().hide();
		}
	},
	close: function( ev ) {
		ev.preventDefault();
		this.$el.remove();
	},
	done: function( ev ) {
		ev.preventDefault();
		this.$el.find(".close").click();
		var answer = this.$el.find( "#answer-form" ).html();
		this.options.model.set( "answer", answer );
		this.options.model.set( "answeredBy", Parse.User.current() );
		this.options.model.set( "answeredAt", new Date() );
		this.options.callback( this.options.model );
	}
});
