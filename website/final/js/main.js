function newMessage() 
{
	message = $(".message-input input").val();
	if($.trim(message) == '') 
	{
		return false;
	}
	$('<li class="replies"><p>' + message + '</p></li>').appendTo($('.messages ul'));
	$('.contact.active .preview').html('<span>You: </span>' + message);
};

$('.submit').click(function() 
{
	newMessage();
});

$(window).on('keydown', function(e) 
{
	if (e.which == 13) 
	{
		newMessage();
		return false;
	}
});