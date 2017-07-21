

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

const IndexPage = Backbone.View.extend({
	el: "#index",
	page_type: "user",
	initialize: function( name ) {
		this.$el.find(".banner").hide();
		if ( name )
			this.page_type = name;
		var user = Parse.User.current();
		if( user ) {
			var $e = this.$el.find( "#user-detail" );
			$e.find(".name").html( user.get("name") );
			$e.find(".email").html( user.get("email") );
		}
		var nox_panel_temp = `<a href="<%=redirectTo%>" data-message="<%=info%>" data-index="<%=index%>" class="nox-panel w3-animate-opacity"><img class="w3-image" src="<%= imageUrl %>" style="width:100%" /></a>`;
		nox_panel_temp = _.template( nox_panel_temp );
		var nox = this.$el.find("#nox").empty();
		Parse.Config.get().then(conf=>{
			var sliders = JSON.parse(conf.get( this.page_type+"_slider" ));
			if( sliders ) {
				$.each( sliders, ( i, e )=>{
					el = nox.append( nox_panel_temp( e ) );
				});
				this.nox = nox.nox({
					infoOn: nox.parent().find(".info"),
					delay: 6000,
					countOn: nox.parent().find(".count")
				});
				this.$el.find(".banner").show();
			}
		}).catch( er=> {
			console.log( err );
			toastr.error(er.message, er.code);
		});
		return this;
	},
	render: function() {
		$(".page").hide();
		this.$el.show();
		return this;
	},
	events: {
		"click .user": "userAction",
		"click .next-nox": "nextImage",
		"click .prev-nox": "prevImage"
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
