// This would be the content of `chatbot-embed.js`
;(function () {
    var iframe = document.createElement('iframe')
    iframe.style.cssText =
        'position:fixed; bottom:20px; right:20px; width:50px; height:50px; border:none; border-radius:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index:1000;'
    iframe.src = 'http://localhost:8080/iframe'
    iframe.id = 'chatbotIframe'
    document.body.appendChild(iframe)

    window.addEventListener(
        'message',
        function (event) {
            // Always verify the origin
            // if (event.origin !== 'http://localhost:8080/iframe') return

            if (event.data.type === 'resizeIframe') {
                if (event.data.state === 'closed') {
                    // Minimize
                    iframe.style.width = '50px'
                    iframe.style.height = '50px'
                } else if (event.data.state === 'open') {
                    // Expand
                    iframe.style.width = '300px'
                    iframe.style.height = '400px'
                }
            }
        },
        false
    )
})()
