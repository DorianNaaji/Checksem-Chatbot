The folder /proxy is made to redirect XMLHTTP REQUESTS

see the nginx config file :


    # Redirection des adresses /chatbotproject/proxy vers l'adresse :
    # http://127.0.0.1:8080/parse?q=;
    # (permet d'éviter des problèmes de CORS, cross-origin ressource sharing)
    location /chatbotproject/proxy/ {
        proxy_set_header    X-Real-IP           $remote_addr;
        proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_set_header    X-NginX-Proxy       true;

        proxy_pass                  http://127.0.0.1:8080/parse?q=;
        proxy_ssl_session_reuse     off;
        proxy_set_header            Host    $http_host;
        proxy_redirect              off;
    }