

$(".menu>li").on("click", ev=>{
	ev.preventDefault();
	var page = $(ev.currentTarget).text().replace(/\W+/g,"").toLowerCase();
	$(".questions .lists").hide();
	$(".questions ."+page).show().find(".question").first().click();
	$(".menu>li").removeClass( "w3-theme-d1" );
	$(ev.currentTarget).addClass("w3-theme-d1");
	$(window).scrollTop( $(".questions ."+page).find(".question")[0].offsetTop );
});
$(".questions .question").on("click", ev=>{
	ev.preventDefault();
	$(".questions .question").removeClass( 'w3-theme-d1' );
	$(ev.currentTarget).addClass("w3-theme-d1");
	var id = $(ev.currentTarget).data("id");
	$(".details .w3-card").hide();
	$(".details #"+id).show();
	$(window).scrollTop( $(".details #"+id)[0].offsetTop );
});
$(".details>.w3-card").hide();
$(".menu>li").get( 1 ).click();
$(".go-back").click( ev => {
	ev.preventDefault();
	history.back();
});

